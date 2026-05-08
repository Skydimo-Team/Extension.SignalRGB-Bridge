use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, Instant};

use serde_json::{json, Value};

use crate::abi::{SkydimoHostApiV1, SkydimoOutputFrameV1};
use crate::hid::{HidBackend, HidHandle, HidInfo, SharedHid};
use crate::host::Host;
use crate::js_runtime::RuntimeJs;
use crate::scripts::{collect_script_sources, scan_script};
use crate::topology::{
    classify_perf_state, close_handles, collect_endpoints, endpoint_key, format_hex16,
    frames_to_output_map, make_controller_port, normalize_path, perf_rank, push_frames, round1,
    shutdown_device, state_label, sync_topology,
};
use crate::types::{DeviceState, PortStats, ScanResult, ScriptCatalog, ScriptMeta};
use crate::{DISABLED_FILE, EXTERNAL_SCRIPTS_SUBDIR, STATS_INTERVAL};

pub(crate) struct SignalRgbBridge {
    host: Host,
    hid: SharedHid,
    data_dir: PathBuf,
    scan_results: Vec<ScanResult>,
    script_db: Vec<ScriptMeta>,
    disabled_set: HashSet<String>,
    devices: HashMap<String, DeviceState>,
    registered_ports: Vec<String>,
    port_stats: HashMap<String, PortStats>,
    last_stats_emit: Instant,
}

impl SignalRgbBridge {
    pub(crate) unsafe fn new(host: *const SkydimoHostApiV1) -> Result<Self, String> {
        let host = unsafe { Host::from_raw(host) };
        let hid = HidBackend::new_shared()?;
        Ok(Self {
            host,
            hid,
            data_dir: PathBuf::new(),
            scan_results: Vec::new(),
            script_db: Vec::new(),
            disabled_set: HashSet::new(),
            devices: HashMap::new(),
            registered_ports: Vec::new(),
            port_stats: HashMap::new(),
            last_stats_emit: Instant::now(),
        })
    }

    pub(crate) fn start(&mut self) -> Result<(), String> {
        self.host
            .log_info("[SRGB] SignalRGB native Boa bridge starting");
        self.data_dir = PathBuf::from(self.host.data_dir()?);
        let _ = fs::create_dir_all(self.scripts_dir());
        self.disabled_set = self.load_disabled_set();
        self.rescan_and_discover("Scanning device scripts...", true);
        Ok(())
    }

    pub(crate) fn stop(&mut self) -> Result<(), String> {
        self.host
            .log_info("[SRGB] SignalRGB native Boa bridge stopping");
        self.remove_all_devices();
        self.script_db.clear();
        self.scan_results.clear();
        self.port_stats.clear();
        self.emit_scripts_snapshot();
        self.emit_devices_snapshot();
        Ok(())
    }

    fn scripts_dir(&self) -> PathBuf {
        self.data_dir.join(EXTERNAL_SCRIPTS_SUBDIR)
    }

    fn load_disabled_set(&self) -> HashSet<String> {
        let path = self.data_dir.join(DISABLED_FILE);
        let Ok(content) = fs::read_to_string(path) else {
            return HashSet::new();
        };
        serde_json::from_str::<Vec<String>>(&content)
            .unwrap_or_default()
            .into_iter()
            .collect()
    }

    fn save_disabled_set(&self) {
        let mut items = self.disabled_set.iter().cloned().collect::<Vec<_>>();
        items.sort();
        if let Ok(encoded) = serde_json::to_string_pretty(&items) {
            let _ = fs::create_dir_all(&self.data_dir);
            let _ = fs::write(self.data_dir.join(DISABLED_FILE), encoded);
        }
    }

    fn active_script_db(&self) -> Vec<ScriptMeta> {
        self.scan_results
            .iter()
            .filter_map(|result| match result {
                ScanResult::Ok(meta) if !self.disabled_set.contains(&meta.source_path) => {
                    Some((**meta).clone())
                }
                _ => None,
            })
            .collect()
    }

    pub(crate) fn rescan_and_discover(&mut self, message: &str, startup: bool) {
        self.host
            .notify_persistent("srgb-scan", "SignalRGB Script Driver (native)", message);
        let results = self.scan_scripts();
        self.host.dismiss_persistent("srgb-scan");

        self.scan_results = results;
        self.script_db = self.active_script_db();

        if !startup {
            self.remove_stale_devices();
        }
        let matched = self.discover_and_register();
        let total = self
            .scan_results
            .iter()
            .filter(|result| matches!(result, ScanResult::Ok(_)))
            .count();
        let errors = self.scan_results.len().saturating_sub(total);
        let skipped = self
            .scan_results
            .iter()
            .filter(|result| match result {
                ScanResult::Ok(meta) => self.disabled_set.contains(&meta.source_path),
                ScanResult::Err { .. } => false,
            })
            .count();
        self.host.log_info(&format!(
            "[SRGB] Scanned {total} script(s), {errors} error(s), {skipped} disabled"
        ));
        self.host.notify(
            "SignalRGB Script Driver (native)",
            &format!("{} scripts loaded, {} device(s) matched", self.script_db.len(), matched),
            if matched > 0 { "success" } else { "info" },
        );
        self.emit_scripts_snapshot();
        self.emit_devices_snapshot();
    }

    fn scan_scripts(&self) -> Vec<ScanResult> {
        let (sources, read_errors) = collect_script_sources(&self.scripts_dir());
        let catalog = ScriptCatalog::from_sources(&sources);
        let mut results = sources
            .iter()
            .map(|source| scan_script(source, &catalog))
            .collect::<Vec<_>>();
        results.extend(read_errors);
        results
    }

    fn discover_and_register(&mut self) -> usize {
        self.host.log_info("[SRGB] Enumerating HID devices...");
        let all_hid = match self.hid.borrow_mut().enumerate(None, None) {
            Ok(devices) => devices,
            Err(err) => {
                self.host.log_warn(&format!("[SRGB] HID enumerate failed: {err}"));
                return 0;
            }
        };
        self.host
            .log_info(&format!("[SRGB] Found {} HID device(s) on system", all_hid.len()));

        let mut by_vid_pid: HashMap<(u16, u16), Vec<HidInfo>> = HashMap::new();
        for hid in all_hid {
            by_vid_pid.entry((hid.vid, hid.pid)).or_default().push(hid);
        }

        let mut open_groups = self.open_groups();
        let mut matched = 0usize;

        for meta in self.script_db.clone() {
            let Some(vid) = meta.vid else {
                continue;
            };
            for pid in &meta.pids {
                let Some(candidates) = by_vid_pid.get(&(vid, *pid)) else {
                    continue;
                };
                for hid in candidates {
                    let group = normalize_path(&hid.path);
                    if open_groups.contains(&group) {
                        continue;
                    }
                    if !self.validate_endpoint(&meta, hid) {
                        continue;
                    }
                    let open_result = { self.hid.borrow_mut().open_path(&hid.path) };
                    match open_result {
                        Ok(handle) => {
                            if self.register_device(meta.clone(), handle, hid.clone()).is_some() {
                                open_groups.insert(group);
                                matched += 1;
                            }
                        }
                        Err(err) => {
                            self.host
                                .log_warn(&format!("[SRGB] Failed to open {}: {err}", hid.path));
                        }
                    }
                }
            }
        }

        matched
    }

    fn validate_endpoint(&self, meta: &ScriptMeta, hid: &HidInfo) -> bool {
        if !meta.has_validate {
            return true;
        }
        let mut runtime = match RuntimeJs::create_validation(meta) {
            Ok(runtime) => runtime,
            Err(err) => {
                self.host
                    .log_warn(&format!("[SRGB] Validate context error: {err}"));
                return false;
            }
        };
        let endpoint = json!({
            "interface": hid.interface_number.unwrap_or(-1),
            "usage": hid.usage.unwrap_or(0),
            "usage_page": hid.usage_page.unwrap_or(0),
            "collection": 0,
        });
        runtime
            .set_global_json("__srgb_validate_endpoint", &endpoint)
            .and_then(|_| runtime.call_global_json("Validate", &[endpoint]))
            .ok()
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
    }

    fn register_device(&mut self, meta: ScriptMeta, primary_handle: HidHandle, primary_hid: HidInfo) -> Option<()> {
        let controller_port = make_controller_port(&primary_hid);
        let (ep_handles, endpoints) = self.open_all_endpoints(primary_handle, &primary_hid);
        let mut runtime = match RuntimeJs::create_runtime(
            self.host,
            self.hid.clone(),
            &meta,
            primary_handle,
            &primary_hid,
            ep_handles.clone(),
            endpoints,
        ) {
            Ok(runtime) => runtime,
            Err(err) => {
                self.host
                    .log_warn(&format!("[SRGB] JS context failed for {}: {err}", meta.name));
                close_handles(&self.hid, &ep_handles);
                return None;
            }
        };

        if runtime.has_global("Initialize") {
            if let Err(err) = runtime.call_global_json("Initialize", &[]) {
                self.host
                    .log_warn(&format!("[SRGB] Initialize() failed for {}: {err}", meta.name));
            }
        }

        let mut state = DeviceState {
            meta,
            hid_info: primary_hid,
            ep_handles,
            runtime,
            controller_port: controller_port.clone(),
            output_targets: HashMap::new(),
            main_output_id: None,
            main_matrix: None,
            main_width: 1,
            rt_name: None,
            rt_width: 1,
            rt_height: 1,
            registered: None,
            spatial_cache: Vec::new(),
        };

        if let Err(err) = sync_topology(self.host, &mut state, true) {
            self.host.log_warn(&format!(
                "[SRGB] Topology export failed for {}: {err}",
                state.meta.name
            ));
            shutdown_device(self.host, &self.hid, &mut state);
            return None;
        }

        let output_count = state
            .registered
            .as_ref()
            .map(|registration| registration.outputs.len())
            .unwrap_or(0);
        self.host.log_info(&format!(
            "[SRGB] Registered: {} ({}) outputs={output_count}",
            state.rt_name.as_deref().unwrap_or("?"),
            state.controller_port
        ));

        self.devices.insert(controller_port.clone(), state);
        self.registered_ports.push(controller_port);
        self.emit_devices_snapshot();
        Some(())
    }

    fn open_all_endpoints(
        &self,
        primary_handle: HidHandle,
        primary_hid: &HidInfo,
    ) -> (HashMap<String, HidHandle>, Vec<Value>) {
        let endpoints = collect_endpoints(&self.hid, primary_hid);
        let primary_key = endpoint_key(primary_hid);
        let mut handles = HashMap::from([(primary_key.clone(), primary_handle)]);
        let mut descriptors = Vec::new();

        for (key, ep) in endpoints {
            descriptors.push(json!({
                "interface": ep.interface_number.unwrap_or(0),
                "usage": ep.usage.unwrap_or(0),
                "usage_page": ep.usage_page.unwrap_or(0),
                "collection": 0,
            }));
            if key != primary_key {
                match self.hid.borrow_mut().open_path(&ep.path) {
                    Ok(handle) => {
                        handles.insert(key.clone(), handle);
                        self.host
                            .log_info(&format!("[SRGB] Opened endpoint {key} path={}", ep.path));
                    }
                    Err(err) => {
                        self.host
                            .log_warn(&format!("[SRGB] Failed to open endpoint {key}: {err}"));
                    }
                }
            }
        }

        (handles, descriptors)
    }

    fn open_groups(&self) -> HashSet<String> {
        self.devices
            .values()
            .map(|state| normalize_path(&state.hid_info.path))
            .collect()
    }

    fn remove_stale_devices(&mut self) {
        let all_hid = match self.hid.borrow_mut().enumerate(None, None) {
            Ok(devices) => devices,
            Err(_) => return,
        };
        let current = all_hid
            .iter()
            .map(|hid| normalize_path(&hid.path))
            .collect::<HashSet<_>>();
        let stale = self
            .devices
            .iter()
            .filter(|(_, state)| !current.contains(&normalize_path(&state.hid_info.path)))
            .map(|(port, _)| port.clone())
            .collect::<Vec<_>>();
        for port in stale {
            self.host.log_info(&format!("[SRGB] Removing stale: {port}"));
            self.remove_device(&port);
        }
    }

    fn remove_devices_for_script(&mut self, source_path: &str) -> usize {
        let ports = self
            .devices
            .iter()
            .filter(|(_, state)| state.meta.source_path == source_path)
            .map(|(port, _)| port.clone())
            .collect::<Vec<_>>();
        let count = ports.len();
        for port in ports {
            self.remove_device(&port);
        }
        count
    }

    fn remove_device(&mut self, port: &str) {
        let Some(mut state) = self.devices.remove(port) else {
            return;
        };
        shutdown_device(self.host, &self.hid, &mut state);
        let _ = self
            .host
            .call("remove_extension_device", json!({ "port": state.controller_port }));
        self.registered_ports.retain(|candidate| candidate != port);
        self.port_stats.remove(port);
        self.emit_devices_snapshot();
    }

    fn remove_all_devices(&mut self) {
        let ports = self.registered_ports.clone();
        for port in ports {
            self.remove_device(&port);
        }
        self.devices.clear();
        self.registered_ports.clear();
    }

    pub(crate) fn on_page_message(&mut self, msg: Value) {
        let Some(message_type) = msg.get("type").and_then(Value::as_str) else {
            return;
        };
        match message_type {
            "bootstrap" | "refresh" => {
                self.emit_scripts_snapshot();
                self.emit_devices_snapshot();
            }
            "toggle_script" => {
                let Some(path) = msg.get("path").and_then(Value::as_str).filter(|path| !path.is_empty()) else {
                    return;
                };
                let path = path.to_string();
                if msg.get("disabled").and_then(Value::as_bool).unwrap_or(false) {
                    self.disabled_set.insert(path.clone());
                    self.save_disabled_set();
                    let removed = self.remove_devices_for_script(&path);
                    self.script_db = self.active_script_db();
                    self.host
                        .log_info(&format!("[SRGB] Disabled script: {path} (removed {removed} device(s))"));
                } else {
                    self.disabled_set.remove(&path);
                    self.save_disabled_set();
                    self.script_db = self.active_script_db();
                    let matched = self.discover_and_register();
                    self.host
                        .log_info(&format!("[SRGB] Enabled script: {path} (matched {matched} device(s))"));
                }
                self.emit_scripts_snapshot();
                self.emit_devices_snapshot();
            }
            "rescan" => self.rescan_and_discover("Rescanning...", false),
            _ => {}
        }
    }

    pub(crate) fn on_device_frame(&mut self, port: String, frames: &[SkydimoOutputFrameV1]) {
        let Some(state) = self.devices.get_mut(&port) else {
            return;
        };
        let outputs = unsafe { frames_to_output_map(frames) };
        let start = Instant::now();
        let mut render_ok = true;

        if let Err(err) = push_frames(state, &outputs) {
            self.host
                .log_warn(&format!("[SRGB] Frame push failed for {}: {err}", state_label(state)));
            return;
        }
        if state.runtime.has_global("Render") {
            if let Err(err) = state.runtime.call_global_json("Render", &[]) {
                render_ok = false;
                self.host
                    .log_warn(&format!("[SRGB] Render() failed for {}: {err}", state_label(state)));
            }
        }
        if let Err(err) = sync_topology(self.host, state, false) {
            self.host.log_warn(&format!(
                "[SRGB] Topology sync failed for {}: {err}",
                state_label(state)
            ));
        }

        self.update_stats(&port, start.elapsed(), render_ok);
    }

    fn update_stats(&mut self, port: &str, elapsed: Duration, render_ok: bool) {
        let stats = self.port_stats.entry(port.to_string()).or_default();
        let now = Instant::now();
        stats.t0.get_or_insert(now);
        let render_ms = elapsed.as_secs_f64() * 1000.0;
        stats.count += 1;
        stats.render_sum_ms += render_ms;
        stats.render_max_ms = stats.render_max_ms.max(render_ms);
        if !render_ok {
            stats.errors += 1;
        }

        if now.duration_since(self.last_stats_emit) >= STATS_INTERVAL {
            for stats in self.port_stats.values_mut() {
                let elapsed = stats
                    .t0
                    .map(|t0| now.duration_since(t0).as_secs_f64())
                    .unwrap_or_default();
                if elapsed > 0.0 && stats.count > 0 {
                    stats.fps = stats.count as f64 / elapsed;
                    stats.avg_ms = stats.render_sum_ms / stats.count as f64;
                    stats.max_ms = stats.render_max_ms;
                }
                stats.errors_snapshot = stats.errors;
                stats.count = 0;
                stats.t0 = Some(now);
                stats.render_sum_ms = 0.0;
                stats.render_max_ms = 0.0;
                stats.errors = 0;
            }
            if !self.devices.is_empty() {
                self.emit_devices_snapshot();
            }
            self.last_stats_emit = now;
        }
    }

    fn emit_scripts_snapshot(&self) {
        self.host.page_emit(json!({
            "type": "scripts_snapshot",
            "scripts": self.build_scripts_snapshot(),
        }));
    }

    fn build_scripts_snapshot(&self) -> Vec<Value> {
        self.scan_results
            .iter()
            .map(|result| match result {
                ScanResult::Ok(meta) => {
                    let has_devices = self
                        .devices
                        .values()
                        .any(|state| state.meta.source_path == meta.source_path);
                    json!({
                        "name": meta.name,
                        "path": meta.source_path,
                        "vid": meta.vid,
                        "pids": meta.pids,
                        "device_type": meta.device_type,
                        "publisher": meta.publisher,
                        "controllable_params": meta.controllable_params,
                        "status": "ok",
                        "disabled": self.disabled_set.contains(&meta.source_path),
                        "has_devices": has_devices,
                    })
                }
                ScanResult::Err { path, error } => json!({
                    "path": path,
                    "error_message": error,
                    "status": "error",
                    "disabled": false,
                    "has_devices": false,
                }),
            })
            .collect()
    }

    fn emit_devices_snapshot(&self) {
        self.host.page_emit(json!({
            "type": "devices_snapshot",
            "devices": self.build_devices_snapshot(),
        }));
    }

    fn build_devices_snapshot(&self) -> Vec<Value> {
        let mut devices = self
            .devices
            .values()
            .map(|state| {
                let stats = self.port_stats.get(&state.controller_port);
                let outputs = state
                    .registered
                    .as_ref()
                    .map(|registration| registration.outputs.as_slice())
                    .unwrap_or(&[]);
                let total_leds = outputs.iter().map(|output| output.leds_count).sum::<usize>();
                let fps = stats.map(|stats| stats.fps).unwrap_or_default();
                let perf_state = classify_perf_state(fps);
                json!({
                    "port": state.controller_port,
                    "name": state.rt_name.as_deref().unwrap_or(state.meta.name.as_str()),
                    "script_name": state.meta.name,
                    "script_path": state.meta.source_path,
                    "device_path": state.hid_info.path,
                    "publisher": state.meta.publisher,
                    "vid": format_hex16(state.hid_info.vid),
                    "pid": format_hex16(state.hid_info.pid),
                    "device_type": state.meta.device_type,
                    "output_count": outputs.len(),
                    "total_leds": total_leds,
                    "fps": round1(fps),
                    "render_ms": round1(stats.map(|stats| stats.avg_ms).unwrap_or_default()),
                    "max_render_ms": round1(stats.map(|stats| stats.max_ms).unwrap_or_default()),
                    "errors": stats.map(|stats| stats.errors_snapshot).unwrap_or_default(),
                    "perf_state": perf_state,
                })
            })
            .collect::<Vec<_>>();

        devices.sort_by(|a, b| {
            let ar = perf_rank(a.get("perf_state").and_then(Value::as_str).unwrap_or("idle"));
            let br = perf_rank(b.get("perf_state").and_then(Value::as_str).unwrap_or("idle"));
            ar.cmp(&br).then_with(|| {
                let an = a.get("name").and_then(Value::as_str).unwrap_or("");
                let bn = b.get("name").and_then(Value::as_str).unwrap_or("");
                an.to_ascii_lowercase().cmp(&bn.to_ascii_lowercase())
            })
        });
        devices
    }
}

