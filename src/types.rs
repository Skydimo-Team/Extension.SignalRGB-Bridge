use std::collections::HashMap;
use std::time::Instant;

use serde_json::Value;

use crate::hid::{HidHandle, HidInfo};
use crate::js_runtime::RuntimeJs;

#[derive(Clone, Debug)]
pub(crate) struct ScriptMeta {
    pub(crate) source_path: String,
    pub(crate) name: String,
    pub(crate) vid: Option<u16>,
    pub(crate) pids: Vec<u16>,
    pub(crate) width: usize,
    pub(crate) height: usize,
    pub(crate) device_type: Option<String>,
    pub(crate) publisher: Option<String>,
    pub(crate) image_url: Option<String>,
    pub(crate) led_names: Vec<String>,
    pub(crate) led_positions: Vec<Value>,
    pub(crate) has_validate: bool,
    pub(crate) controllable_params: Option<Value>,
    pub(crate) js_source: String,
}

#[derive(Clone, Debug)]
pub(crate) struct ScriptSource {
    pub(crate) source_path: String,
    pub(crate) lookup_path: String,
    pub(crate) source: String,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct ScriptCatalog {
    pub(crate) by_lookup_path: HashMap<String, ScriptSource>,
}

#[derive(Clone, Debug)]
pub(crate) enum ScanResult {
    Ok(Box<ScriptMeta>),
    Err { path: String, error: String },
}

#[derive(Clone, Debug, Default)]
pub(crate) struct Matrix {
    pub(crate) width: usize,
    pub(crate) height: usize,
    pub(crate) map: Vec<i64>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct OutputSpec {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) output_type: String,
    pub(crate) leds_count: usize,
    pub(crate) matrix: Option<Matrix>,
    pub(crate) editable: bool,
    pub(crate) min_total_leds: usize,
    pub(crate) max_total_leds: usize,
    pub(crate) allowed_total_leds: Option<Vec<usize>>,
}

#[derive(Clone, Debug)]
pub(crate) enum OutputTarget {
    Main,
    Channel(String),
    Subdevice(String),
}

#[derive(Clone, Debug)]
pub(crate) struct Registration {
    pub(crate) device_name: String,
    pub(crate) image_url: Option<String>,
    pub(crate) outputs: Vec<OutputSpec>,
    pub(crate) output_targets: HashMap<String, OutputTarget>,
    pub(crate) main_output_id: Option<String>,
    pub(crate) main_matrix: Option<Matrix>,
    pub(crate) main_width: usize,
    pub(crate) device_info: Value,
}

pub(crate) struct DeviceState {
    pub(crate) meta: ScriptMeta,
    pub(crate) hid_info: HidInfo,
    pub(crate) ep_handles: HashMap<String, HidHandle>,
    pub(crate) runtime: RuntimeJs,
    pub(crate) controller_port: String,
    pub(crate) output_targets: HashMap<String, OutputTarget>,
    pub(crate) main_output_id: Option<String>,
    pub(crate) main_matrix: Option<Matrix>,
    pub(crate) main_width: usize,
    pub(crate) rt_name: Option<String>,
    pub(crate) rt_width: usize,
    pub(crate) rt_height: usize,
    pub(crate) registered: Option<Registration>,
    pub(crate) spatial_cache: Vec<u8>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct PortStats {
    pub(crate) count: usize,
    pub(crate) t0: Option<Instant>,
    pub(crate) render_sum_ms: f64,
    pub(crate) render_max_ms: f64,
    pub(crate) errors: usize,
    pub(crate) errors_snapshot: usize,
    pub(crate) fps: f64,
    pub(crate) avg_ms: f64,
    pub(crate) max_ms: f64,
}

