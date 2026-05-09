use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc::{self, Receiver, Sender};
use std::time::{Duration, Instant};

use serde_json::{json, Value};

use crate::abi::{SkydimoHostApiV1, SkydimoOutputFrameV1};
use crate::device_worker::{DeviceWorker, DeviceWorkerEvent};
use crate::hid::{HidBackend, HidInfo, SharedHid};
use crate::host::Host;
use crate::js_runtime::RuntimeJs;
use crate::scripts::{collect_script_sources, scan_script};
use crate::topology::{
    classify_perf_state, format_hex16, frames_to_output_map, make_controller_port, normalize_path,
    perf_rank, round1,
};
use crate::types::{
    DeviceRuntimeSnapshot, PortStats, RuntimeStatsSnapshot, ScanResult, ScriptCatalog, ScriptMeta,
};
use crate::{DISABLED_FILE, EXTERNAL_SCRIPTS_SUBDIR, STATS_INTERVAL};

pub(crate) struct SignalRgbBridge {
    host: Host,
    hid: SharedHid,
    data_dir: PathBuf,
    scan_results: Vec<ScanResult>,
    script_db: Vec<ScriptMeta>,
    disabled_set: HashSet<String>,
    devices: HashMap<String, DeviceRecord>,
    registered_ports: Vec<String>,
    worker_events_tx: Sender<DeviceWorkerEvent>,
    worker_events_rx: Receiver<DeviceWorkerEvent>,
    last_stats_emit: Instant,
    started: bool,
}

struct DeviceRecord {
    meta: ScriptMeta,
    hid_info: HidInfo,
    controller_port: String,
    worker: DeviceWorker,
    snapshot: DeviceRuntimeSnapshot,
    input_stats: PortStats,
    route_stats: RuntimeStatsSnapshot,
}

impl SignalRgbBridge {
    pub(crate) unsafe fn new(host: *const SkydimoHostApiV1) -> Result<Self, String> {
        let host = unsafe { Host::from_raw(host) };
        let hid = HidBackend::new_shared()?;
        let (worker_events_tx, worker_events_rx) = mpsc::channel();
        Ok(Self {
            host,
            hid,
            data_dir: PathBuf::new(),
            scan_results: Vec::new(),
            script_db: Vec::new(),
            disabled_set: HashSet::new(),
            devices: HashMap::new(),
            registered_ports: Vec::new(),
            worker_events_tx,
            worker_events_rx,
            last_stats_emit: Instant::now(),
            started: false,
        })
    }

    pub(crate) fn start(&mut self) -> Result<(), String> {
        if self.started {
            self.stop()?;
        }
        self.host
            .log_info("[SRGB] SignalRGB native Boa bridge starting");
        self.data_dir = PathBuf::from(self.host.data_dir()?);
        self.started = true;
        let _ = fs::create_dir_all(self.scripts_dir());
        self.disabled_set = self.load_disabled_set();
        self.rescan_and_discover("Scanning device scripts...", true);
        Ok(())
    }

    pub(crate) fn stop(&mut self) -> Result<(), String> {
        if !self.started {
            return Ok(());
        }
        self.started = false;
        self.host
            .log_info("[SRGB] SignalRGB native Boa bridge stopping");
        self.remove_all_devices();
        self.script_db.clear();
        self.scan_results.clear();
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
                    if self.register_device(meta.clone(), hid.clone()).is_some() {
                        open_groups.insert(group);
                        matched += 1;
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

    fn register_device(&mut self, meta: ScriptMeta, primary_hid: HidInfo) -> Option<()> {
        let controller_port = make_controller_port(&primary_hid);
        if self.devices.contains_key(&controller_port) {
            return None;
        }
        let worker = match DeviceWorker::spawn(
            self.host,
            meta.clone(),
            primary_hid.clone(),
            self.worker_events_tx.clone(),
        ) {
            Ok(worker) => worker,
            Err(err) => {
                self.host
                    .log_warn(&format!("[SRGB] Failed to start worker for {}: {err}", meta.name));
                return None;
            }
        };

        self.host.log_info(&format!(
            "[SRGB] Worker started: {} ({controller_port})",
            meta.name
        ));
        self.devices.insert(
            controller_port.clone(),
            DeviceRecord {
                snapshot: DeviceRuntimeSnapshot {
                    name: meta.name.clone(),
                    output_count: 0,
                    total_leds: 0,
                },
                meta,
                hid_info: primary_hid,
                controller_port: controller_port.clone(),
                worker,
                input_stats: PortStats::default(),
                route_stats: RuntimeStatsSnapshot::default(),
            },
        );
        self.registered_ports.push(controller_port);
        self.emit_devices_snapshot();
        Some(())
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
        let Some(mut record) = self.devices.remove(port) else {
            return;
        };
        record.worker.stop();
        let _ = self
            .host
            .call("remove_extension_device", json!({ "port": record.controller_port }));
        self.registered_ports.retain(|candidate| candidate != port);
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
                self.drain_worker_events();
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
        let mut changed = self.drain_worker_events();
        let Some(record) = self.devices.get_mut(&port) else {
            if changed {
                self.emit_devices_snapshot();
            }
            return;
        };
        let outputs = unsafe { frames_to_output_map(frames) };
        record.input_stats.record(Duration::ZERO, true);
        record.worker.submit_frame(outputs);
        changed |= self.refresh_input_stats();
        if changed {
            self.emit_devices_snapshot();
        }
    }

    fn drain_worker_events(&mut self) -> bool {
        let mut changed = false;
        while let Ok(event) = self.worker_events_rx.try_recv() {
            match event {
                DeviceWorkerEvent::Topology { port, snapshot } => {
                    if let Some(record) = self.devices.get_mut(&port) {
                        let output_count = snapshot.output_count;
                        let name = snapshot.name.clone();
                        record.snapshot = snapshot;
                        self.host.log_info(&format!(
                            "[SRGB] Registered: {name} ({port}) outputs={output_count}"
                        ));
                        changed = true;
                    }
                }
                DeviceWorkerEvent::Stats { port, stats } => {
                    if let Some(record) = self.devices.get_mut(&port) {
                        record.route_stats = stats;
                        changed = true;
                    }
                }
                DeviceWorkerEvent::Failed { port, error } => {
                    self.host
                        .log_warn(&format!("[SRGB] Removing failed worker {port}: {error}"));
                    if let Some(mut record) = self.devices.remove(&port) {
                        record.worker.stop();
                        self.registered_ports.retain(|candidate| candidate != &port);
                        changed = true;
                    }
                }
            }
        }
        changed
    }

    fn refresh_input_stats(&mut self) -> bool {
        let now = Instant::now();
        if now.duration_since(self.last_stats_emit) < STATS_INTERVAL {
            return false;
        }

        let mut changed = false;
        for record in self.devices.values_mut() {
            if record.input_stats.snapshot_and_reset(now).is_some() {
                changed = true;
            }
        }
        self.last_stats_emit = now;
        changed
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
            .map(|record| {
                let input_fps = record.input_stats.fps;
                let route_fps = record.route_stats.fps;
                let perf_state = classify_perf_state(route_fps);
                json!({
                    "port": record.controller_port,
                    "name": record.snapshot.name,
                    "script_name": record.meta.name,
                    "script_path": record.meta.source_path,
                    "device_path": record.hid_info.path,
                    "publisher": record.meta.publisher,
                    "vid": format_hex16(record.hid_info.vid),
                    "pid": format_hex16(record.hid_info.pid),
                    "device_type": record.meta.device_type,
                    "output_count": record.snapshot.output_count,
                    "total_leds": record.snapshot.total_leds,
                    "fps": round1(route_fps),
                    "input_fps": round1(input_fps),
                    "route_fps": round1(route_fps),
                    "render_ms": round1(record.route_stats.avg_ms),
                    "max_render_ms": round1(record.route_stats.max_ms),
                    "errors": record.route_stats.errors,
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

impl Drop for SignalRgbBridge {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

