use std::collections::HashMap;
use std::time::Duration;

use boa_engine::native_function::NativeFunction;
use boa_engine::{Context, JsArgs, JsNativeError, JsResult, JsString, JsValue, Source};
use boa_gc::{custom_trace, Finalize, Trace};
use serde_json::{json, Value};

use crate::hid::{HidHandle, HidInfo, SharedHid};
use crate::host::Host;
use crate::system_info;
use crate::types::ScriptMeta;
use crate::{
    APPLY_STATIC_METADATA_JS, DEVICE_JS, POLYFILLS_JS, SCAN_STUBS_JS, SETUP_PARAMS_JS,
};

pub(crate) struct RuntimeJs {
    context: Context,
    callback_state: Option<Box<JsCallbackState>>,
}

struct JsCallbackState {
    host: Host,
    hid: SharedHid,
    active_handle: HidHandle,
    endpoint_handles: HashMap<String, HidHandle>,
    endpoints: Vec<Value>,
    last_read_size: usize,
    script_name: String,
}

#[derive(Clone, Copy)]
struct CallbackPtr {
    ptr: *mut JsCallbackState,
}

impl Finalize for CallbackPtr {}

unsafe impl Trace for CallbackPtr {
    custom_trace!(_this, _mark, {});
}

impl RuntimeJs {
    pub(crate) fn create_scan() -> Result<Self, String> {
        let mut runtime = Self {
            context: Context::default(),
            callback_state: None,
        };
        runtime.eval(SCAN_STUBS_JS, "<scan-stubs>")?;
        runtime.eval(DEVICE_JS, "<scan-device>")?;
        Ok(runtime)
    }

    pub(crate) fn create_validation(meta: &ScriptMeta) -> Result<Self, String> {
        let mut runtime = Self {
            context: Context::default(),
            callback_state: None,
        };
        runtime.eval(SCAN_STUBS_JS, "<validate-stubs>")?;
        runtime.eval(DEVICE_JS, "<validate-device>")?;
        runtime.eval(&meta.js_source, "<validate>")?;
        Ok(runtime)
    }

    pub(crate) fn create_runtime(
        host: Host,
        hid: SharedHid,
        meta: &ScriptMeta,
        primary_handle: HidHandle,
        primary_hid: &HidInfo,
        endpoint_handles: HashMap<String, HidHandle>,
        endpoints: Vec<Value>,
    ) -> Result<Self, String> {
        let callback_state = Box::new(JsCallbackState {
            host,
            hid,
            active_handle: primary_handle,
            endpoint_handles,
            endpoints,
            last_read_size: 0,
            script_name: meta.name.clone(),
        });
        let mut runtime = Self {
            context: Context::default(),
            callback_state: Some(callback_state),
        };
        runtime.register_callbacks()?;
        runtime.eval(POLYFILLS_JS, "<polyfills>")?;
        runtime.inject_system_info();
        runtime.eval(DEVICE_JS, "<device>")?;
        runtime.eval(
            &format!(
                "device._vid = {}; device._pid = {};",
                primary_hid.vid, primary_hid.pid
            ),
            "<hid-info>",
        )?;
        runtime.apply_static_metadata(meta)?;
        runtime.eval(&meta.js_source, meta.source_path.as_str())?;
        runtime.eval(SETUP_PARAMS_JS, "<setup-params>")?;
        Ok(runtime)
    }

    fn register_callbacks(&mut self) -> Result<(), String> {
        let ptr = CallbackPtr {
            ptr: self
                .callback_state
                .as_deref_mut()
                .map(|state| state as *mut JsCallbackState)
                .ok_or_else(|| "missing JS callback state".to_string())?,
        };
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_write"),
                1,
                NativeFunction::from_copy_closure_with_captures(hid_write_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_read"),
                2,
                NativeFunction::from_copy_closure_with_captures(hid_read_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_send_report"),
                1,
                NativeFunction::from_copy_closure_with_captures(hid_send_report_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_get_report"),
                2,
                NativeFunction::from_copy_closure_with_captures(hid_get_report_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_set_endpoint"),
                3,
                NativeFunction::from_copy_closure_with_captures(hid_set_endpoint_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_get_endpoints"),
                0,
                NativeFunction::from_copy_closure_with_captures(hid_get_endpoints_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_flush"),
                0,
                NativeFunction::from_copy_closure_with_captures(hid_flush_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_hid_get_last_read_size"),
                0,
                NativeFunction::from_copy_closure_with_captures(hid_last_read_size_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_log"),
                1,
                NativeFunction::from_copy_closure_with_captures(log_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .register_global_builtin_callable(
                JsString::from("_pause"),
                1,
                NativeFunction::from_copy_closure_with_captures(pause_js, ptr),
            )
            .map_err(|err| format_js_error(err, &mut self.context))?;
        Ok(())
    }

    pub(crate) fn eval(&mut self, source: &str, _name: &str) -> Result<JsValue, String> {
        self.context
            .eval(Source::from_bytes(source))
            .map_err(|err| format_js_error(err, &mut self.context))
    }

    pub(crate) fn has_global(&mut self, name: &str) -> bool {
        let global = self.context.global_object().clone();
        global
            .get(JsString::from(name), &mut self.context)
            .map(|value| !value.is_undefined())
            .unwrap_or(false)
    }

    pub(crate) fn call_global_json(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        let global = self.context.global_object().clone();
        let func = global
            .get(JsString::from(name), &mut self.context)
            .map_err(|err| format_js_error(err, &mut self.context))?;
        if func.is_undefined() {
            return Ok(Value::Null);
        }
        let callable = func
            .as_callable()
            .ok_or_else(|| format!("global '{name}' is not callable"))?;
        let mut js_args = Vec::with_capacity(args.len());
        for arg in args {
            js_args.push(
                JsValue::from_json(arg, &mut self.context)
                    .map_err(|err| format_js_error(err, &mut self.context))?,
            );
        }
        let result = callable
            .call(&JsValue::undefined(), js_args.as_slice(), &mut self.context)
            .map_err(|err| format_js_error(err, &mut self.context))?;
        result
            .to_json(&mut self.context)
            .map_err(|err| format_js_error(err, &mut self.context))
            .map(|value| value.unwrap_or(Value::Null))
    }

    pub(crate) fn set_global_json(&mut self, name: &str, value: &Value) -> Result<(), String> {
        let js_value = JsValue::from_json(value, &mut self.context)
            .map_err(|err| format_js_error(err, &mut self.context))?;
        self.context
            .global_object()
            .set(JsString::from(name), js_value, true, &mut self.context)
            .map_err(|err| format_js_error(err, &mut self.context))?;
        Ok(())
    }

    fn apply_static_metadata(&mut self, meta: &ScriptMeta) -> Result<(), String> {
        self.set_global_json("__srgb_static_size", &json!([meta.width, meta.height]))?;
        self.set_global_json("__srgb_static_led_names", &json!(meta.led_names))?;
        self.set_global_json("__srgb_static_led_positions", &Value::Array(meta.led_positions.clone()))?;
        self.eval(APPLY_STATIC_METADATA_JS, "<static-metadata>")?;
        Ok(())
    }

    fn inject_system_info(&mut self) {
        if self.callback_state.is_none() {
            return;
        }
        let payload = serde_json::to_value(system_info::collect()).unwrap_or(Value::Null);
        let _ = self.set_global_json("__srgb_system", &payload);
        let _ = self.eval(
            r#"
(function() {
    var sys = (typeof __srgb_system !== 'undefined') ? __srgb_system : {};
    var mb = sys.motherboard || {};
    var bios = sys.bios || {};
    var ram = sys.ram || {};
    systeminfo = {
        GetMotherboardInfo: function() { return {
            manufacturer: mb.manufacturer || "",
            model: mb.model || "",
            product: mb.product || "",
            vendor: mb.manufacturer || mb.vendor || ""
        }; },
        GetBiosInfo: function() { return {
            vendor: bios.vendor || "",
            version: bios.version || "",
            date: bios.date || "",
            releaseDate: bios.date || bios.releaseDate || ""
        }; },
        GetRamInfo: function() { return {
            totalMemory: ram.total_memory_mb || ram.totalMemory || 0,
            modules: ram.modules || []
        }; }
    };
})();
"#,
            "<systeminfo>",
        );
    }
}


fn js_to_i32(value: &JsValue, fallback: i32, context: &mut Context) -> i32 {
    value.to_i32(context).unwrap_or(fallback)
}

fn js_to_usize(value: &JsValue, fallback: usize, context: &mut Context) -> usize {
    value.to_u32(context).map(|value| value as usize).unwrap_or(fallback)
}

fn js_to_bytes(value: &JsValue, context: &mut Context) -> JsResult<Vec<u8>> {
    let json = value.to_json(context)?.unwrap_or(Value::Null);
    Ok(match json {
        Value::Array(values) => values
            .into_iter()
            .map(|value| value.as_u64().unwrap_or(0).min(255) as u8)
            .collect(),
        _ => Vec::new(),
    })
}

fn js_array_from_bytes(bytes: Vec<u8>, context: &mut Context) -> JsResult<JsValue> {
    JsValue::from_json(&json!(bytes), context)
}

fn callback_state<'a>(captures: &CallbackPtr) -> JsResult<&'a mut JsCallbackState> {
    if captures.ptr.is_null() {
        Err(JsNativeError::typ()
            .with_message("SignalRGB callback state is null")
            .into())
    } else {
        Ok(unsafe { &mut *captures.ptr })
    }
}

fn hid_write_js(
    _this: &JsValue,
    args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let bytes = js_to_bytes(args.get_or_undefined(0), context)?;
    let written = state
        .hid
        .borrow()
        .write(state.active_handle, &bytes)
        .unwrap_or(0);
    Ok(JsValue::from(written as i32))
}

fn hid_read_js(
    _this: &JsValue,
    args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let len = js_to_usize(args.get_or_undefined(0), 64, context);
    let timeout = js_to_i32(args.get_or_undefined(1), 0, context);
    let bytes = state
        .hid
        .borrow()
        .read(state.active_handle, len, timeout)
        .unwrap_or_default();
    state.last_read_size = bytes.len();
    js_array_from_bytes(bytes, context)
}

fn hid_send_report_js(
    _this: &JsValue,
    args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let bytes = js_to_bytes(args.get_or_undefined(0), context)?;
    let written = state
        .hid
        .borrow()
        .send_feature_report(state.active_handle, &bytes)
        .unwrap_or(0);
    Ok(JsValue::from(written as i32))
}

fn hid_get_report_js(
    _this: &JsValue,
    args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let report_id = js_to_i32(args.get_or_undefined(0), 0, context).clamp(0, 255) as u8;
    let len = js_to_usize(args.get_or_undefined(1), 64, context);
    let bytes = state
        .hid
        .borrow()
        .get_feature_report(state.active_handle, report_id, len)
        .unwrap_or_default();
    state.last_read_size = bytes.len();
    js_array_from_bytes(bytes, context)
}

fn hid_set_endpoint_js(
    _this: &JsValue,
    args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let iface = js_to_i32(args.get_or_undefined(0), -1, context);
    let usage = js_to_i32(args.get_or_undefined(1), -1, context);
    let usage_page = js_to_i32(args.get_or_undefined(2), -1, context);
    if let Some(handle) = find_endpoint_handle(&state.endpoint_handles, iface, usage, usage_page) {
        state.active_handle = handle;
        Ok(JsValue::from(true))
    } else {
        state.host.log_warn(&format!(
            "[SRGB:{}] Endpoint not found: I={} U=0x{:04X} P=0x{:04X}",
            state.script_name, iface, usage, usage_page
        ));
        Ok(JsValue::from(false))
    }
}

fn hid_get_endpoints_js(
    _this: &JsValue,
    _args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    JsValue::from_json(&Value::Array(state.endpoints.clone()), context)
}

fn hid_flush_js(
    _this: &JsValue,
    _args: &[JsValue],
    captures: &CallbackPtr,
    _context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let mut flushed = 0i32;
    for _ in 0..256 {
        let data = state
            .hid
            .borrow()
            .read(state.active_handle, 1024, 0)
            .unwrap_or_default();
        if data.is_empty() {
            break;
        }
        flushed += 1;
    }
    state.last_read_size = 0;
    Ok(JsValue::from(flushed))
}

fn hid_last_read_size_js(
    _this: &JsValue,
    _args: &[JsValue],
    captures: &CallbackPtr,
    _context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    Ok(JsValue::from(state.last_read_size as i32))
}

fn log_js(
    _this: &JsValue,
    args: &[JsValue],
    captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let state = callback_state(captures)?;
    let msg = args
        .get_or_undefined(0)
        .to_string(context)
        .map(|value| value.to_std_string_escaped())
        .unwrap_or_default();
    state
        .host
        .log_info(&format!("[SRGB:{}] {msg}", state.script_name));
    Ok(JsValue::undefined())
}

fn pause_js(
    _this: &JsValue,
    args: &[JsValue],
    _captures: &CallbackPtr,
    context: &mut Context,
) -> JsResult<JsValue> {
    let ms = js_to_i32(args.get_or_undefined(0), 0, context).max(0) as u64;
    if ms > 0 {
        std::thread::sleep(Duration::from_millis(ms));
    }
    Ok(JsValue::undefined())
}

fn find_endpoint_handle(
    handles: &HashMap<String, u64>,
    iface: i32,
    usage: i32,
    usage_page: i32,
) -> Option<u64> {
    if usage < 0 || usage_page < 0 {
        return None;
    }
    let exact = format!("{iface}:{usage}:{usage_page}");
    if let Some(handle) = handles.get(&exact) {
        return Some(*handle);
    }
    let pages_compatible = |a: i32, b: i32| a == b || (a >= 0xFF00 && b >= 0xFF00);
    let mut matched = Vec::new();
    for (key, handle) in handles {
        let parts = key
            .split(':')
            .filter_map(|value| value.parse::<i32>().ok())
            .collect::<Vec<_>>();
        if parts.len() == 3
            && parts[0] == iface
            && parts[1] == usage
            && pages_compatible(parts[2], usage_page)
        {
            matched.push(*handle);
        }
    }
    if matched.len() == 1 {
        return matched.first().copied();
    }
    matched.clear();
    for (key, handle) in handles {
        let parts = key
            .split(':')
            .filter_map(|value| value.parse::<i32>().ok())
            .collect::<Vec<_>>();
        if parts.len() == 3 && parts[1] == usage && pages_compatible(parts[2], usage_page) {
            matched.push(*handle);
        }
    }
    (matched.len() == 1).then(|| matched[0])
}

fn format_js_error(err: boa_engine::JsError, context: &mut Context) -> String {
    let opaque = err.to_opaque(context);
    opaque
        .to_string(context)
        .map(|value| value.to_std_string_escaped())
        .unwrap_or_else(|_| "JavaScript error".to_string())
}
