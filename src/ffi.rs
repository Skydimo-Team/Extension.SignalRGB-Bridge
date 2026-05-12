use std::ffi::{c_char, c_void};

use serde_json::{json, Value};

use crate::abi::{
    ffi_str, SkydimoControllerApiV1, SkydimoEffectApiV1, SkydimoExtensionApiV1,
    SkydimoHostApiV1, SkydimoOutputFrameV1, SkydimoPluginApiV1, SKYDIMO_NATIVE_C_ABI_VERSION,
    SKYDIMO_PLUGIN_KIND_EXTENSION,
};
use crate::bridge::SignalRgbBridge;

unsafe extern "C" fn signalrgb_create(
    host: *const SkydimoHostApiV1,
    out_instance: *mut *mut c_void,
) -> i32 {
    if out_instance.is_null() {
        return -1;
    }
    let extension = match unsafe { SignalRgbBridge::new(host) } {
        Ok(extension) => Box::new(extension),
        Err(_) => return -2,
    };
    unsafe {
        *out_instance = Box::into_raw(extension).cast::<c_void>();
    }
    0
}

unsafe extern "C" fn signalrgb_destroy(instance: *mut c_void) {
    if !instance.is_null() {
        unsafe {
            drop(Box::from_raw(instance.cast::<SignalRgbBridge>()));
        }
    }
}

unsafe extern "C" fn signalrgb_start(instance: *mut c_void) -> i32 {
    let Some(extension) = extension_mut(instance) else {
        return -1;
    };
    status(extension.start())
}

unsafe extern "C" fn signalrgb_stop(instance: *mut c_void) -> i32 {
    let Some(extension) = extension_mut(instance) else {
        return -1;
    };
    status(extension.stop())
}

unsafe extern "C" fn signalrgb_on_scan_devices(instance: *mut c_void) -> i32 {
    let Some(extension) = extension_mut(instance) else {
        return -1;
    };
    extension.rescan_and_discover(json!({ "key": "notifications.rescanning" }), false);
    0
}

unsafe extern "C" fn signalrgb_on_event_json(
    _instance: *mut c_void,
    _event_ptr: *const c_char,
    _event_len: usize,
    _data_ptr: *const c_char,
    _data_len: usize,
) -> i32 {
    0
}

unsafe extern "C" fn signalrgb_on_page_message_json(
    instance: *mut c_void,
    ptr: *const c_char,
    len: usize,
) -> i32 {
    let Some(extension) = extension_mut(instance) else {
        return -1;
    };
    extension.on_page_message(json_from_raw(ptr, len));
    0
}

unsafe extern "C" fn signalrgb_on_device_frame(
    instance: *mut c_void,
    port_ptr: *const c_char,
    port_len: usize,
    frames: *const SkydimoOutputFrameV1,
    frame_count: usize,
) -> i32 {
    let Some(extension) = extension_mut(instance) else {
        return -1;
    };
    if frames.is_null() && frame_count > 0 {
        return -1;
    }
    let port = unsafe { ffi_str(port_ptr, port_len) };
    let frames = if frame_count == 0 {
        &[][..]
    } else {
        unsafe { std::slice::from_raw_parts(frames, frame_count) }
    };
    extension.on_device_frame(port, frames);
    0
}

#[no_mangle]
/// # Safety
///
/// `out_api` must be a valid writable pointer supplied by the Skydimo host.
/// The host must pass the ABI version declared in manifest.json.
pub unsafe extern "C" fn skydimo_plugin_get_api(
    requested_abi_version: u32,
    _host: *const SkydimoHostApiV1,
    out_api: *mut SkydimoPluginApiV1,
) -> i32 {
    if out_api.is_null() || requested_abi_version != SKYDIMO_NATIVE_C_ABI_VERSION {
        return -1;
    }

    unsafe {
        *out_api = SkydimoPluginApiV1 {
            size: std::mem::size_of::<SkydimoPluginApiV1>() as u32,
            abi_version: SKYDIMO_NATIVE_C_ABI_VERSION,
            kind_mask: SKYDIMO_PLUGIN_KIND_EXTENSION,
            effect: SkydimoEffectApiV1 {
                size: std::mem::size_of::<SkydimoEffectApiV1>() as u32,
                ..SkydimoEffectApiV1::default()
            },
            controller: SkydimoControllerApiV1 {
                size: std::mem::size_of::<SkydimoControllerApiV1>() as u32,
                ..SkydimoControllerApiV1::default()
            },
            extension: SkydimoExtensionApiV1 {
                size: std::mem::size_of::<SkydimoExtensionApiV1>() as u32,
                create: Some(signalrgb_create),
                destroy: Some(signalrgb_destroy),
                start: Some(signalrgb_start),
                stop: Some(signalrgb_stop),
                on_scan_devices: Some(signalrgb_on_scan_devices),
                on_event_json: Some(signalrgb_on_event_json),
                on_page_message_json: Some(signalrgb_on_page_message_json),
                on_device_frame: Some(signalrgb_on_device_frame),
            },
            shutdown_plugin: None,
        };
    }
    0
}

unsafe fn extension_mut(instance: *mut c_void) -> Option<&'static mut SignalRgbBridge> {
    if instance.is_null() {
        None
    } else {
        Some(unsafe { &mut *instance.cast::<SignalRgbBridge>() })
    }
}

fn status(result: Result<(), String>) -> i32 {
    match result {
        Ok(()) => 0,
        Err(_) => -1,
    }
}

fn json_from_raw(ptr: *const c_char, len: usize) -> Value {
    if ptr.is_null() || len == 0 {
        return Value::Null;
    }
    let bytes = unsafe { std::slice::from_raw_parts(ptr.cast::<u8>(), len) };
    serde_json::from_slice(bytes).unwrap_or(Value::Null)
}
