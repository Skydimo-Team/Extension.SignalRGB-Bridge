use std::collections::{HashMap, HashSet};

use serde_json::{json, Map, Value};

use crate::abi::{ffi_str, SkydimoOutputFrameV1};
use crate::hid::{HidHandle, HidInfo, SharedHid};
use crate::host::Host;
use crate::types::{DeviceState, Matrix, OutputSpec, OutputTarget, Registration};
use crate::CONTROLLER_ID;

pub(crate) fn sync_topology(host: Host, state: &mut DeviceState, force: bool) -> Result<bool, String> {
    if !force {
        let dirty = state
            .runtime
            .call_global_json("__srgb_is_topology_dirty", &[])
            .ok()
            .and_then(|value| value.as_bool())
            .unwrap_or(true);
        if !dirty {
            return Ok(false);
        }
    }

    let raw = state
        .runtime
        .call_global_json("__srgb_take_topology_update", &[Value::Bool(force)])?;
    if raw == Value::Bool(false) && !force {
        return Ok(false);
    }
    let registration = build_registration(state, &raw)?;

    match state.registered.as_ref() {
        None => {
            host.call("register_device", registration.device_info.clone())?;
        }
        Some(current) if !registration_shape_equals(current, &registration) => {
            host.call("remove_extension_device", json!({ "port": state.controller_port }))?;
            host.call("register_device", registration.device_info.clone())?;
        }
        Some(current) if !registration_runtime_equals(current, &registration) => {
            for (prev, next) in current.outputs.iter().zip(&registration.outputs) {
                if !output_runtime_equals(prev, next) {
                    let mut opts = Map::new();
                    opts.insert("port".into(), Value::String(state.controller_port.clone()));
                    opts.insert("output_id".into(), Value::String(next.id.clone()));
                    opts.insert("leds_count".into(), Value::from(next.leds_count));
                    if let Some(matrix) = &next.matrix {
                        opts.insert("matrix".into(), matrix_json(matrix));
                    }
                    host.call("update_output", Value::Object(opts))?;
                }
            }
        }
        Some(_) => {}
    }

    apply_registration_state(state, registration);
    Ok(true)
}

pub(crate) fn build_registration(state: &DeviceState, raw: &Value) -> Result<Registration, String> {
    let main = raw.get("main").unwrap_or(&Value::Null);
    let width = usize_field(main, "width").unwrap_or(state.meta.width).max(1);
    let height = usize_field(main, "height").unwrap_or(state.meta.height).max(1);
    let led_positions = clone_positions(main.get("led_positions"));
    let channels = raw
        .get("channels")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let subdevices = raw
        .get("subdevices")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let device_name = string_or(raw.get("name"), &state.meta.name);
    let image_url = raw
        .get("image_url")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| state.meta.image_url.clone());
    let has_dynamic = !channels.is_empty() || !subdevices.is_empty();
    let mut outputs = Vec::new();
    let mut output_targets = HashMap::new();
    let mut used_ids = HashSet::from(["main".to_string()]);
    let mut main_output_id = None;
    let mut main_matrix = None;
    let mut main_width = width;

    let main_led_count = usize_field(main, "led_count").unwrap_or(0);
    let mut main_output_leds = main_led_count;
    if main_led_count > 0 {
        main_matrix = build_matrix_from_positions(width, height, &led_positions);
    } else if !has_dynamic {
        main_output_leds = usize_field(main, "canvas_led_count").unwrap_or(width.saturating_mul(height));
        if main_output_leds == 0 {
            main_output_leds = 1;
        }
        main_matrix = build_sequential_matrix(width, height);
    }

    if main_output_leds > 0 {
        let output_id = "main".to_string();
        outputs.push(OutputSpec {
            id: output_id.clone(),
            name: if has_dynamic {
                "Main".to_string()
            } else {
                device_name.clone()
            },
            output_type: if main_matrix.is_some() {
                "matrix".to_string()
            } else if main_output_leds <= 1 {
                "single".to_string()
            } else {
                "linear".to_string()
            },
            leds_count: main_output_leds,
            matrix: main_matrix.clone(),
            editable: false,
            min_total_leds: main_output_leds,
            max_total_leds: main_output_leds,
            allowed_total_leds: None,
        });
        output_targets.insert(output_id.clone(), OutputTarget::Main);
        main_output_id = Some(output_id);
        if let Some(matrix) = &main_matrix {
            main_width = matrix.width;
        }
    }

    for channel in channels {
        let name = string_or(channel.get("name"), "Channel");
        let led_count = usize_field(&channel, "led_count").unwrap_or(0);
        let led_limit = usize_field(&channel, "led_limit").unwrap_or(0);
        let max_leds = led_limit.max(led_count);
        let output_id = next_output_id(&format!("channel-{name}"), &mut used_ids);
        outputs.push(OutputSpec {
            id: output_id.clone(),
            name: name.clone(),
            output_type: if max_leds <= 1 { "single" } else { "linear" }.to_string(),
            leds_count: led_count,
            matrix: None,
            editable: true,
            min_total_leds: 0,
            max_total_leds: max_leds,
            allowed_total_leds: None,
        });
        output_targets.insert(output_id, OutputTarget::Channel(name));
    }

    for subdevice in subdevices {
        let name = string_or(subdevice.get("name"), "Subdevice");
        let display_name = string_or(subdevice.get("display_name"), &name);
        let sub_width = usize_field(&subdevice, "width").unwrap_or(1).max(1);
        let sub_height = usize_field(&subdevice, "height").unwrap_or(1).max(1);
        let positions = clone_positions(subdevice.get("led_positions"));
        let led_count = usize_field(&subdevice, "led_count").unwrap_or(positions.len());
        let matrix = build_matrix_from_positions(sub_width, sub_height, &positions);
        let output_id = next_output_id(&format!("subdevice-{name}"), &mut used_ids);
        outputs.push(OutputSpec {
            id: output_id.clone(),
            name: display_name,
            output_type: if matrix.is_some() {
                "matrix"
            } else if led_count <= 1 {
                "single"
            } else {
                "linear"
            }
            .to_string(),
            leds_count: led_count,
            matrix,
            editable: false,
            min_total_leds: led_count,
            max_total_leds: led_count,
            allowed_total_leds: None,
        });
        output_targets.insert(output_id, OutputTarget::Subdevice(name));
    }

    if outputs.is_empty() {
        outputs.push(OutputSpec {
            id: "main".to_string(),
            name: device_name.clone(),
            output_type: "single".to_string(),
            leds_count: 1,
            matrix: None,
            editable: false,
            min_total_leds: 1,
            max_total_leds: 1,
            allowed_total_leds: None,
        });
        output_targets.insert("main".to_string(), OutputTarget::Main);
        main_output_id = Some("main".to_string());
        main_width = 1;
    }

    let device_path = if state.hid_info.path.is_empty() {
        format!("SignalRGB/{device_name}")
    } else {
        state.hid_info.path.clone()
    };
    let device_info = json!({
        "controller_port": state.controller_port,
        "device_path": device_path,
        "controller_id": CONTROLLER_ID,
        "manufacturer": derive_manufacturer_from_name(&device_name),
        "model": device_name,
        "serial_id": state.hid_info.serial.clone().unwrap_or_default(),
        "description": format!("SignalRGB Bridge: {device_name}"),
        "device_type": resolve_category(state.meta.device_type.as_deref()),
        "image_url": image_url,
        "outputs": outputs.iter().map(output_json).collect::<Vec<_>>(),
    });

    Ok(Registration {
        device_name,
        image_url,
        outputs,
        output_targets,
        main_output_id,
        main_matrix,
        main_width,
        device_info,
    })
}

fn apply_registration_state(state: &mut DeviceState, registration: Registration) {
    state.output_targets = registration.output_targets.clone();
    state.main_output_id = registration.main_output_id.clone();
    state.main_matrix = registration.main_matrix.clone();
    state.main_width = registration.main_width;
    state.rt_name = Some(registration.device_name.clone());
    state.rt_width = registration
        .device_info
        .get("outputs")
        .and_then(Value::as_array)
        .and_then(|_| registration.main_matrix.as_ref().map(|matrix| matrix.width))
        .unwrap_or(state.meta.width);
    state.rt_height = registration
        .main_matrix
        .as_ref()
        .map(|matrix| matrix.height)
        .unwrap_or(state.meta.height);
    state.registered = Some(registration);
}

pub(crate) fn push_frames(state: &mut DeviceState, outputs: &HashMap<String, Vec<u8>>) -> Result<(), String> {
    let mut main_frame = Value::Null;
    let mut channel_frames = Map::new();
    let mut subdevice_frames = Map::new();

    let targets = state.output_targets.clone();
    for (output_id, target) in targets {
        let colors = outputs.get(&output_id).cloned().unwrap_or_default();
        match target {
            OutputTarget::Main => {
                if !colors.is_empty() {
                    main_frame = build_main_frame(state, &colors);
                }
            }
            OutputTarget::Channel(name) => {
                channel_frames.insert(
                    name,
                    json!({ "colors": colors, "led_count": colors.len() / 3 }),
                );
            }
            OutputTarget::Subdevice(name) => {
                subdevice_frames.insert(
                    name,
                    json!({ "colors": colors, "led_count": colors.len() / 3 }),
                );
            }
        }
    }

    state.runtime.set_global_json("__srgb_main_frame", &main_frame)?;
    state
        .runtime
        .set_global_json("__srgb_channel_frames", &Value::Object(channel_frames))?;
    state
        .runtime
        .set_global_json("__srgb_subdevice_frames", &Value::Object(subdevice_frames))?;
    state
        .runtime
        .call_global_json("__srgb_apply_pending_frames", &[])
        .map(|_| ())
}

fn build_main_frame(state: &mut DeviceState, colors: &[u8]) -> Value {
    let mut width = state.main_width.max(state.rt_width).max(1);
    let mut frame_colors = colors.to_vec();
    if let Some(matrix) = state.main_matrix.clone() {
        frame_colors = remap_to_spatial(colors, &matrix, &mut state.spatial_cache);
        width = matrix.width.max(1);
    }
    json!({
        "colors": frame_colors,
        "width": width,
        "led_count": frame_colors.len() / 3,
    })
}

fn remap_to_spatial(colors: &[u8], matrix: &Matrix, cache: &mut Vec<u8>) -> Vec<u8> {
    let total = matrix.width.saturating_mul(matrix.height);
    let needed = total.saturating_mul(3);
    cache.resize(needed, 0);
    for pos in 0..total {
        let dst = pos * 3;
        let led = matrix.map.get(pos).copied().unwrap_or(-1);
        if led >= 0 {
            let src = led as usize * 3;
            cache[dst] = colors.get(src).copied().unwrap_or(0);
            cache[dst + 1] = colors.get(src + 1).copied().unwrap_or(0);
            cache[dst + 2] = colors.get(src + 2).copied().unwrap_or(0);
        } else {
            cache[dst] = 0;
            cache[dst + 1] = 0;
            cache[dst + 2] = 0;
        }
    }
    cache.clone()
}

pub(crate) unsafe fn frames_to_output_map(frames: &[SkydimoOutputFrameV1]) -> HashMap<String, Vec<u8>> {
    let mut map = HashMap::new();
    for frame in frames {
        let output_id = unsafe { ffi_str(frame.output_id.ptr, frame.output_id.len) };
        if output_id.is_empty() || (frame.colors.is_null() && frame.colors_len > 0) {
            continue;
        }
        let colors = if frame.colors_len == 0 {
            &[][..]
        } else {
            unsafe { std::slice::from_raw_parts(frame.colors, frame.colors_len) }
        };
        let mut bytes = Vec::with_capacity(colors.len().saturating_mul(3));
        for color in colors {
            bytes.push(color.r);
            bytes.push(color.g);
            bytes.push(color.b);
        }
        map.insert(output_id, bytes);
    }
    map
}

pub(crate) fn shutdown_device(_host: Host, hid: &SharedHid, state: &mut DeviceState) {
    if state.runtime.has_global("Shutdown") {
        let _ = state.runtime.call_global_json("Shutdown", &[Value::Bool(false)]);
    }
    close_handles(hid, &state.ep_handles);
}

pub(crate) fn close_handles(hid: &SharedHid, handles: &HashMap<String, HidHandle>) {
    let mut unique = handles.values().copied().collect::<HashSet<_>>();
    let mut hid = hid.borrow_mut();
    for handle in unique.drain() {
        hid.close(handle);
    }
}

pub(crate) fn collect_endpoints(hid: &SharedHid, primary_hid: &HidInfo) -> HashMap<String, HidInfo> {
    let group = normalize_path(&primary_hid.path);
    let mut endpoints = HashMap::from([(endpoint_key(primary_hid), primary_hid.clone())]);
    let Ok(all_hid) = hid.borrow_mut().enumerate(Some(primary_hid.vid), Some(primary_hid.pid)) else {
        return endpoints;
    };
    for hid in all_hid {
        if !group.is_empty() && normalize_path(&hid.path) == group {
            endpoints.entry(endpoint_key(&hid)).or_insert(hid);
        }
    }
    endpoints
}

pub(crate) fn endpoint_key(hid: &HidInfo) -> String {
    make_endpoint_key(
        hid.interface_number.unwrap_or(0),
        hid.usage.unwrap_or(0),
        hid.usage_page.unwrap_or(0),
    )
}

fn make_endpoint_key(iface: i32, usage: u16, usage_page: u16) -> String {
    format!("{iface}:{usage}:{usage_page}")
}

pub(crate) fn normalize_path(path: &str) -> String {
    let upper = path.to_ascii_uppercase();
    if let Some(start) = upper.find("VID_") {
        if let Some(pid_pos) = upper[start..].find("&PID_") {
            let tail = &upper[start + pid_pos + 5..];
            let pid_end = tail
                .find(|ch: char| !ch.is_ascii_hexdigit())
                .unwrap_or(tail.len());
            let vid_pid_end = start + pid_pos + 5 + pid_end;
            let vid_pid = &upper[start..vid_pid_end];
            if let Some(instance) = instance_key(path) {
                return format!("{vid_pid}#{instance}");
            }
            return vid_pid.to_string();
        }
    }
    path.to_string()
}

fn instance_key(path: &str) -> Option<String> {
    let parts = path.split('#').collect::<Vec<_>>();
    parts.get(2).map(|part| part.to_ascii_uppercase())
}

pub(crate) fn make_controller_port(hid: &HidInfo) -> String {
    let id = hid
        .serial
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or(&hid.path);
    format!("srgb:{:04x}:{:04x}:{}", hid.vid, hid.pid, id)
}

fn build_matrix_from_positions(width: usize, height: usize, positions: &[(i64, i64)]) -> Option<Matrix> {
    if width <= 1 || height <= 1 {
        return None;
    }
    if positions.is_empty() {
        return build_sequential_matrix(width, height);
    }
    let mut map = vec![-1; width.saturating_mul(height)];
    for (idx, (x, y)) in positions.iter().enumerate() {
        if *x >= 0 && *y >= 0 && (*x as usize) < width && (*y as usize) < height {
            map[*y as usize * width + *x as usize] = idx as i64;
        }
    }
    Some(Matrix { width, height, map })
}

fn build_sequential_matrix(width: usize, height: usize) -> Option<Matrix> {
    if width <= 1 || height <= 1 {
        return None;
    }
    let map = (0..width.saturating_mul(height))
        .map(|idx| idx as i64)
        .collect();
    Some(Matrix { width, height, map })
}

fn clone_positions(value: Option<&Value>) -> Vec<(i64, i64)> {
    value
        .and_then(Value::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(|value| {
                    if let Some(arr) = value.as_array() {
                        Some((
                            arr.first().and_then(Value::as_i64)?,
                            arr.get(1).and_then(Value::as_i64)?,
                        ))
                    } else {
                        Some((
                            value.get("x").and_then(Value::as_i64)?,
                            value.get("y").and_then(Value::as_i64)?,
                        ))
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

fn output_json(output: &OutputSpec) -> Value {
    let mut value = Map::new();
    value.insert("id".into(), Value::String(output.id.clone()));
    value.insert("name".into(), Value::String(output.name.clone()));
    value.insert("output_type".into(), Value::String(output.output_type.clone()));
    value.insert("leds_count".into(), Value::from(output.leds_count));
    value.insert("editable".into(), Value::Bool(output.editable));
    value.insert("min_total_leds".into(), Value::from(output.min_total_leds));
    value.insert("max_total_leds".into(), Value::from(output.max_total_leds));
    if let Some(allowed) = &output.allowed_total_leds {
        value.insert("allowed_total_leds".into(), json!(allowed));
    }
    if let Some(matrix) = &output.matrix {
        value.insert("matrix".into(), matrix_json(matrix));
    }
    Value::Object(value)
}

fn matrix_json(matrix: &Matrix) -> Value {
    json!({
        "width": matrix.width,
        "height": matrix.height,
        "map": matrix.map,
    })
}

fn output_shape_equals(lhs: &OutputSpec, rhs: &OutputSpec) -> bool {
    lhs.id == rhs.id
        && lhs.name == rhs.name
        && lhs.output_type == rhs.output_type
        && lhs.editable == rhs.editable
        && lhs.min_total_leds == rhs.min_total_leds
        && lhs.max_total_leds == rhs.max_total_leds
        && lhs.allowed_total_leds == rhs.allowed_total_leds
}

fn output_runtime_equals(lhs: &OutputSpec, rhs: &OutputSpec) -> bool {
    lhs.id == rhs.id && lhs.leds_count == rhs.leds_count && matrix_equals(&lhs.matrix, &rhs.matrix)
}

fn registration_shape_equals(lhs: &Registration, rhs: &Registration) -> bool {
    lhs.device_name == rhs.device_name
        && lhs.image_url == rhs.image_url
        && lhs.outputs.len() == rhs.outputs.len()
        && lhs
            .outputs
            .iter()
            .zip(&rhs.outputs)
            .all(|(lhs, rhs)| output_shape_equals(lhs, rhs))
}

fn registration_runtime_equals(lhs: &Registration, rhs: &Registration) -> bool {
    lhs.outputs.len() == rhs.outputs.len()
        && lhs
            .outputs
            .iter()
            .zip(&rhs.outputs)
            .all(|(lhs, rhs)| output_runtime_equals(lhs, rhs))
}

fn matrix_equals(lhs: &Option<Matrix>, rhs: &Option<Matrix>) -> bool {
    match (lhs, rhs) {
        (None, None) => true,
        (Some(lhs), Some(rhs)) => lhs.width == rhs.width && lhs.height == rhs.height && lhs.map == rhs.map,
        _ => false,
    }
}

fn next_output_id(base: &str, used_ids: &mut HashSet<String>) -> String {
    let slug = slugify(base);
    let mut candidate = slug.clone();
    let mut suffix = 2usize;
    while used_ids.contains(&candidate) {
        candidate = format!("{slug}-{suffix}");
        suffix += 1;
    }
    used_ids.insert(candidate.clone());
    candidate
}

fn slugify(value: &str) -> String {
    let mut out = String::new();
    let mut last_dash = false;
    for ch in value.to_ascii_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
            last_dash = false;
        } else if !last_dash {
            out.push('-');
            last_dash = true;
        }
    }
    let out = out.trim_matches('-').to_string();
    if out.is_empty() {
        "output".to_string()
    } else {
        out
    }
}

fn derive_manufacturer_from_name(device_name: &str) -> String {
    device_name
        .split_whitespace()
        .next()
        .filter(|value| !value.is_empty())
        .unwrap_or("SignalRGB")
        .to_string()
}

fn resolve_category(device_type: Option<&str>) -> &'static str {
    match device_type.unwrap_or("unknown").to_ascii_lowercase().as_str() {
        "keyboard" => "keyboard",
        "mouse" => "mouse",
        "mousepad" => "mousepad",
        "headphones" | "headset" => "headset",
        "microphone" => "microphone",
        "monitor" => "monitor",
        "gpu" => "gpu",
        "motherboard" => "motherboard",
        "ram" => "ram",
        "cooler" | "aio" => "cooler",
        "fan" => "fan",
        "ledstrip" => "ledstrip",
        "speaker" => "speaker",
        "chair" | "accessory" => "accessory",
        _ => "other",
    }
}

fn usize_field(value: &Value, key: &str) -> Option<usize> {
    value.get(key).and_then(usize_from_json_number)
}

pub(crate) fn usize_from_json_number(value: &Value) -> Option<usize> {
    if let Some(raw) = value.as_u64() {
        return usize::try_from(raw).ok();
    }
    if let Some(raw) = value.as_i64() {
        return usize::try_from(raw).ok();
    }
    let raw = value.as_f64()?;
    if !raw.is_finite() || raw < 0.0 || raw > usize::MAX as f64 {
        return None;
    }
    Some(raw.floor() as usize)
}

fn string_or(value: Option<&Value>, fallback: &str) -> String {
    value
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_string()
}

pub(crate) fn state_label(state: &DeviceState) -> &str {
    state.rt_name.as_deref().unwrap_or(state.meta.name.as_str())
}

pub(crate) fn format_hex16(value: u16) -> String {
    format!("0x{value:04X}")
}

pub(crate) fn classify_perf_state(fps: f64) -> &'static str {
    if fps <= 0.0 {
        "idle"
    } else if fps >= 45.0 {
        "running"
    } else if fps >= 15.0 {
        "slow"
    } else {
        "blocked"
    }
}

pub(crate) fn perf_rank(value: &str) -> u8 {
    match value {
        "running" => 0,
        "slow" => 1,
        "blocked" => 2,
        "idle" => 3,
        _ => 9,
    }
}

pub(crate) fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}
