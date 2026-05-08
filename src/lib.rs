mod abi;
mod bridge;
mod device_worker;
mod ffi;
mod hid;
mod host;
mod js_runtime;
mod scripts;
mod system_info;
mod topology;
mod types;

use std::time::Duration;

pub(crate) const CONTROLLER_ID: &str = "extension.signalrgb_bridge";
pub(crate) const EXTERNAL_SCRIPTS_SUBDIR: &str = "SRGB-Device";
pub(crate) const DISABLED_FILE: &str = "disabled_scripts.json";
pub(crate) const STATS_INTERVAL: Duration = Duration::from_secs(2);

pub(crate) const SCAN_STUBS_JS: &str = include_str!("../js/scan_stubs.js");
pub(crate) const POLYFILLS_JS: &str = include_str!("../js/polyfills.js");
pub(crate) const DEVICE_JS: &str = include_str!("../js/device.js");

pub(crate) const SETUP_PARAMS_JS: &str = r#"
(function() {
    var g = (typeof globalThis !== 'undefined') ? globalThis : this;
    try {
        var params = (typeof ControllableParameters === 'function')
            ? ControllableParameters() : [];
        if (!Array.isArray(params)) params = [];
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (!p || !p.property) continue;
            if (typeof g[p.property] !== 'undefined') continue;
            var def = p['default'];
            if (p.type === 'boolean')      g[p.property] = (def === 'true' || def === true);
            else if (p.type === 'number')  g[p.property] = Number(def) || 0;
            else                            g[p.property] = (def != null) ? String(def) : '';
        }
    } catch(e) {}
    g['LightingMode'] = 'Canvas';
})();
"#;

pub(crate) const APPLY_STATIC_METADATA_JS: &str = r#"
(function() {
    if (typeof device === 'undefined') return;

    var size = (typeof __srgb_static_size !== 'undefined') ? __srgb_static_size : null;
    if (Array.isArray(size) && size.length >= 2) {
        device.setSize(size);
    }

    var names = (typeof __srgb_static_led_names !== 'undefined') ? __srgb_static_led_names : null;
    var positions = (typeof __srgb_static_led_positions !== 'undefined') ? __srgb_static_led_positions : null;
    if ((Array.isArray(names) && names.length > 0) || (Array.isArray(positions) && positions.length > 0)) {
        device.setControllableLeds(
            Array.isArray(names) ? names : [],
            Array.isArray(positions) ? positions : []
        );
    }
})();
"#;
