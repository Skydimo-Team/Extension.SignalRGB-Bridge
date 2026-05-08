use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::Sender;
use std::sync::{Arc, Condvar, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Instant;

use serde_json::Value;

use crate::hid::{HidBackend, HidHandle, HidInfo, SharedHid};
use crate::host::Host;
use crate::js_runtime::RuntimeJs;
use crate::topology::{
    close_handles, collect_endpoints, endpoint_key, make_controller_port, push_frames,
    shutdown_device, state_label, sync_topology,
};
use crate::types::{
    DeviceRuntimeSnapshot, DeviceState, FrameBatch, PortStats, RuntimeStatsSnapshot, ScriptMeta,
};
use crate::STATS_INTERVAL;

pub(crate) enum DeviceWorkerEvent {
    Topology {
        port: String,
        snapshot: DeviceRuntimeSnapshot,
    },
    Stats {
        port: String,
        stats: RuntimeStatsSnapshot,
    },
    Failed {
        port: String,
        error: String,
    },
}

pub(crate) struct DeviceWorker {
    shared: Arc<DeviceWorkerShared>,
    join: Option<JoinHandle<()>>,
}

struct DeviceWorkerShared {
    pending_frame: Mutex<Option<FrameBatch>>,
    wake: Condvar,
    stopping: AtomicBool,
}

impl DeviceWorker {
    pub(crate) fn spawn(
        host: Host,
        meta: ScriptMeta,
        primary_hid: HidInfo,
        event_tx: Sender<DeviceWorkerEvent>,
    ) -> Result<Self, String> {
        let shared = Arc::new(DeviceWorkerShared {
            pending_frame: Mutex::new(None),
            wake: Condvar::new(),
            stopping: AtomicBool::new(false),
        });
        let thread_shared = Arc::clone(&shared);
        let thread_name = worker_thread_name(&meta.name);
        let join = thread::Builder::new()
            .name(thread_name)
            .spawn(move || run_device_worker(host, meta, primary_hid, thread_shared, event_tx))
            .map_err(|err| format!("failed to spawn device worker: {err}"))?;

        Ok(Self {
            shared,
            join: Some(join),
        })
    }

    pub(crate) fn submit_frame(&self, frame: FrameBatch) {
        if self.shared.stopping.load(Ordering::Acquire) {
            return;
        }
        let Ok(mut pending) = self.shared.pending_frame.lock() else {
            return;
        };
        *pending = Some(frame);
        self.shared.wake.notify_one();
    }

    pub(crate) fn stop(&mut self) {
        self.shared.stopping.store(true, Ordering::Release);
        self.shared.wake.notify_one();
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

impl Drop for DeviceWorker {
    fn drop(&mut self) {
        self.stop();
    }
}

fn run_device_worker(
    host: Host,
    meta: ScriptMeta,
    primary_hid: HidInfo,
    shared: Arc<DeviceWorkerShared>,
    event_tx: Sender<DeviceWorkerEvent>,
) {
    let port = make_controller_port(&primary_hid);
    match create_device_state(host, meta, primary_hid) {
        Ok((hid, mut state)) => {
            let snapshot = snapshot_from_state(&state);
            let _ = event_tx.send(DeviceWorkerEvent::Topology {
                port: port.clone(),
                snapshot,
            });
            run_frame_loop(host, &mut state, shared, event_tx);
            shutdown_device(host, &hid, &mut state);
        }
        Err(error) => {
            host.log_warn(&format!("[SRGB] Device worker failed for {port}: {error}"));
            let _ = event_tx.send(DeviceWorkerEvent::Failed { port, error });
        }
    }
}

fn create_device_state(
    host: Host,
    meta: ScriptMeta,
    primary_hid: HidInfo,
) -> Result<(SharedHid, DeviceState), String> {
    let hid = HidBackend::new_shared()?;
    let primary_handle = { hid.borrow_mut().open_path(&primary_hid.path)? };
    let (ep_handles, endpoints) = open_all_endpoints(host, &hid, primary_handle, &primary_hid);
    let mut runtime = match RuntimeJs::create_runtime(
        host,
        hid.clone(),
        &meta,
        primary_handle,
        &primary_hid,
        ep_handles.clone(),
        endpoints,
    ) {
        Ok(runtime) => runtime,
        Err(err) => {
            close_handles(&hid, &ep_handles);
            return Err(err);
        }
    };

    if runtime.has_global("Initialize") {
        if let Err(err) = runtime.call_global_json("Initialize", &[]) {
            host.log_warn(&format!("[SRGB] Initialize() failed for {}: {err}", meta.name));
        }
    }

    let controller_port = make_controller_port(&primary_hid);
    let mut state = DeviceState {
        meta,
        hid_info: primary_hid,
        ep_handles,
        runtime,
        controller_port,
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

    if let Err(err) = sync_topology(host, &mut state, true) {
        shutdown_device(host, &hid, &mut state);
        return Err(err);
    }

    Ok((hid, state))
}

fn open_all_endpoints(
    host: Host,
    hid: &SharedHid,
    primary_handle: HidHandle,
    primary_hid: &HidInfo,
) -> (HashMap<String, HidHandle>, Vec<Value>) {
    let endpoints = collect_endpoints(hid, primary_hid);
    let primary_key = endpoint_key(primary_hid);
    let mut handles = HashMap::from([(primary_key.clone(), primary_handle)]);
    let mut descriptors = Vec::new();

    for (key, ep) in endpoints {
        descriptors.push(serde_json::json!({
            "interface": ep.interface_number.unwrap_or(0),
            "usage": ep.usage.unwrap_or(0),
            "usage_page": ep.usage_page.unwrap_or(0),
            "collection": 0,
        }));
        if key != primary_key {
            match hid.borrow_mut().open_path(&ep.path) {
                Ok(handle) => {
                    handles.insert(key.clone(), handle);
                    host.log_info(&format!("[SRGB] Opened endpoint {key} path={}", ep.path));
                }
                Err(err) => {
                    host.log_warn(&format!("[SRGB] Failed to open endpoint {key}: {err}"));
                }
            }
        }
    }

    (handles, descriptors)
}

fn run_frame_loop(
    host: Host,
    state: &mut DeviceState,
    shared: Arc<DeviceWorkerShared>,
    event_tx: Sender<DeviceWorkerEvent>,
) {
    let port = state.controller_port.clone();
    let mut stats = PortStats::default();
    let mut last_stats_emit = Instant::now();

    while let Some(outputs) = wait_for_frame(&shared) {
        let start = Instant::now();
        let mut render_ok = true;

        if let Err(err) = push_frames(state, &outputs) {
            render_ok = false;
            host.log_warn(&format!(
                "[SRGB] Frame push failed for {}: {err}",
                state_label(state)
            ));
        } else {
            if state.runtime.has_global("Render") {
                if let Err(err) = state.runtime.call_global_json("Render", &[]) {
                    render_ok = false;
                    host.log_warn(&format!(
                        "[SRGB] Render() failed for {}: {err}",
                        state_label(state)
                    ));
                }
            }

            match sync_topology(host, state, false) {
                Ok(true) => {
                    let _ = event_tx.send(DeviceWorkerEvent::Topology {
                        port: port.clone(),
                        snapshot: snapshot_from_state(state),
                    });
                }
                Ok(false) => {}
                Err(err) => {
                    render_ok = false;
                    host.log_warn(&format!(
                        "[SRGB] Topology sync failed for {}: {err}",
                        state_label(state)
                    ));
                }
            }
        }

        stats.record(start.elapsed(), render_ok);
        let now = Instant::now();
        if now.duration_since(last_stats_emit) >= STATS_INTERVAL {
            if let Some(snapshot) = stats.snapshot_and_reset(now) {
                let _ = event_tx.send(DeviceWorkerEvent::Stats {
                    port: port.clone(),
                    stats: snapshot,
                });
            }
            last_stats_emit = now;
        }
    }

}

fn wait_for_frame(shared: &DeviceWorkerShared) -> Option<FrameBatch> {
    let mut pending = shared.pending_frame.lock().ok()?;
    loop {
        if shared.stopping.load(Ordering::Acquire) {
            return None;
        }
        if let Some(frame) = pending.take() {
            return Some(frame);
        }
        pending = shared.wake.wait(pending).ok()?;
    }
}

fn snapshot_from_state(state: &DeviceState) -> DeviceRuntimeSnapshot {
    let outputs = state
        .registered
        .as_ref()
        .map(|registration| registration.outputs.as_slice())
        .unwrap_or(&[]);
    DeviceRuntimeSnapshot {
        name: state
            .rt_name
            .as_deref()
            .unwrap_or(state.meta.name.as_str())
            .to_string(),
        output_count: outputs.len(),
        total_leds: outputs.iter().map(|output| output.leds_count).sum(),
    }
}

fn worker_thread_name(name: &str) -> String {
    let mut clean = name
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>();
    clean.truncate(32);
    if clean.is_empty() {
        "srgb-device".to_string()
    } else {
        format!("srgb-device-{clean}")
    }
}
