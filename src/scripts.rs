use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use regex::Regex;
use serde_json::{json, Value};

use crate::js_runtime::RuntimeJs;
use crate::topology::usize_from_json_number;
use crate::types::{ScanResult, ScriptCatalog, ScriptMeta, ScriptSource};
include!(concat!(env!("OUT_DIR"), "/srgb_scripts.rs"));

impl ScriptCatalog {
    pub(crate) fn from_sources(sources: &[ScriptSource]) -> Self {
        let mut by_lookup_path = HashMap::new();
        for source in sources {
            by_lookup_path.insert(source.lookup_path.clone(), source.clone());
        }
        Self { by_lookup_path }
    }

    fn resolve_relative(&self, base_lookup_path: &str, specifier: &str) -> Option<&ScriptSource> {
        if !specifier.starts_with("./") && !specifier.starts_with("../") {
            return None;
        }
        let base_dir = lookup_dir(base_lookup_path);
        let candidate = normalize_lookup_path(&format!("{base_dir}/{specifier}"));
        if let Some(source) = self.by_lookup_path.get(&candidate) {
            return Some(source);
        }
        let with_js = if candidate.ends_with(".js") {
            None
        } else {
            Some(format!("{candidate}.js"))
        };
        if let Some(source) = with_js
            .as_deref()
            .and_then(|candidate| self.by_lookup_path.get(candidate))
        {
            return Some(source);
        }
        self.by_lookup_path
            .iter()
            .find(|(path, _)| {
                path.eq_ignore_ascii_case(&candidate)
                    || with_js
                        .as_ref()
                        .map(|with_js| path.eq_ignore_ascii_case(with_js))
                        .unwrap_or(false)
            })
            .map(|(_, source)| source)
    }
}

pub(crate) fn scan_script(script: &ScriptSource, catalog: &ScriptCatalog) -> ScanResult {
    if !script.source.contains("function Name") {
        return ScanResult::Err {
            path: script.source_path.clone(),
            error: "no Name() function found".to_string(),
        };
    }
    let js_source = match bundle_js_source(script, catalog) {
        Ok(source) => source,
        Err(err) => {
            return ScanResult::Err {
                path: script.source_path.clone(),
                error: err,
            }
        }
    };
    let mut runtime = match RuntimeJs::create_scan() {
        Ok(runtime) => runtime,
        Err(err) => {
            return ScanResult::Err {
                path: script.source_path.clone(),
                error: format!("scan context error: {err}"),
            }
        }
    };
    if let Err(err) = runtime.eval(&js_source, &script.source_path) {
        return ScanResult::Err {
            path: script.source_path.clone(),
            error: format!("eval error: {err}"),
        };
    }

    let Some(name) = runtime
        .call_global_json("Name", &[])
        .ok()
        .and_then(|value| value.as_str().map(str::to_string))
        .filter(|name| !name.is_empty())
    else {
        return ScanResult::Err {
            path: script.source_path.clone(),
            error: "Name() did not return a string".to_string(),
        };
    };

    let vid = runtime
        .call_global_json("VendorId", &[])
        .ok()
        .and_then(|value| value.as_u64())
        .and_then(|value| u16::try_from(value).ok());
    let pids = runtime
        .call_global_json("ProductId", &[])
        .ok()
        .map(extract_pid_list)
        .unwrap_or_default();
    let (width, height) = runtime
        .call_global_json("Size", &[])
        .ok()
        .and_then(|value| {
            value.as_array().map(|values| {
                (
                    values.first().and_then(usize_from_json_number).unwrap_or(1),
                    values.get(1).and_then(usize_from_json_number).unwrap_or(1),
                )
            })
        })
        .unwrap_or((1, 1));
    let device_type = runtime
        .call_global_json("DeviceType", &[])
        .ok()
        .and_then(|value| value.as_str().map(str::to_string));
    let publisher = runtime
        .call_global_json("Publisher", &[])
        .ok()
        .and_then(|value| value.as_str().map(str::to_string));
    let image_url = runtime
        .call_global_json("ImageUrl", &[])
        .ok()
        .and_then(|value| value.as_str().map(str::to_string));
    let led_names = runtime
        .call_global_json("LedNames", &[])
        .ok()
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| value.as_str().map(str::to_string))
        .collect::<Vec<_>>();
    let led_positions = runtime
        .call_global_json("LedPositions", &[])
        .ok()
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default();
    let controllable_params = runtime.call_global_json("ControllableParameters", &[]).ok();
    let has_validate = runtime.has_global("Validate");

    ScanResult::Ok(Box::new(ScriptMeta {
        source_path: script.source_path.clone(),
        name,
        vid,
        pids,
        width: width.max(1),
        height: height.max(1),
        device_type,
        publisher,
        image_url,
        led_names,
        led_positions,
        has_validate,
        controllable_params,
        js_source,
    }))
}

#[derive(Clone, Debug, Default)]
struct ImportDecl {
    specifier: String,
    default_alias: Option<String>,
    namespace_alias: Option<String>,
    named_aliases: Vec<(String, String)>,
}

#[derive(Clone, Debug, Default)]
struct ExportBindings {
    named: Vec<String>,
    default: Option<String>,
}

fn bundle_js_source(script: &ScriptSource, catalog: &ScriptCatalog) -> Result<String, String> {
    let mut visited = HashSet::new();
    let mut out = String::new();
    append_relative_import_modules(script, catalog, &mut visited, &mut out)?;
    out.push_str(&preprocess_js(&script.source));
    Ok(out)
}

fn append_relative_import_modules(
    script: &ScriptSource,
    catalog: &ScriptCatalog,
    visited: &mut HashSet<String>,
    out: &mut String,
) -> Result<(), String> {
    for import in parse_import_declarations(&script.source) {
        if !import.specifier.starts_with("./") && !import.specifier.starts_with("../") {
            continue;
        }
        let dependency = catalog
            .resolve_relative(&script.lookup_path, &import.specifier)
            .ok_or_else(|| {
                format!(
                    "relative import not found: {} from {}",
                    import.specifier, script.source_path
                )
            })?;
        if visited.insert(dependency.lookup_path.clone()) {
            append_relative_import_modules(dependency, catalog, visited, out)?;
            out.push_str(&wrap_dependency_module(dependency));
        }
        out.push_str(&import_alias_assignments(&import, dependency));
    }
    Ok(())
}

fn wrap_dependency_module(script: &ScriptSource) -> String {
    let exports = collect_export_bindings(&script.source);
    let mut out = String::new();
    out.push_str("\n(function() {\n");
    out.push_str(&preprocess_js(&script.source));
    out.push('\n');
    for name in &exports.named {
        out.push_str("try { globalThis[");
        out.push_str(&json!(name).to_string());
        out.push_str("] = ");
        out.push_str(name);
        out.push_str("; } catch (_) {}\n");
    }
    if let Some(default_name) = exports.default.as_deref() {
        out.push_str("try { globalThis.__srgb_default_export = ");
        out.push_str(default_name);
        out.push_str("; } catch (_) {}\n");
    }
    out.push_str("})();\n");
    out
}

fn import_alias_assignments(import: &ImportDecl, dependency: &ScriptSource) -> String {
    let exports = collect_export_bindings(&dependency.source);
    let mut out = String::new();
    if let Some(default_alias) = import.default_alias.as_deref() {
        if let Some(default_name) = exports.default.as_deref() {
            out.push_str("try { globalThis[");
            out.push_str(&json!(default_alias).to_string());
            out.push_str("] = globalThis[");
            out.push_str(&json!(default_name).to_string());
            out.push_str("] || globalThis.__srgb_default_export; } catch (_) {}\n");
        }
    }
    if let Some(namespace_alias) = import.namespace_alias.as_deref() {
        out.push_str("try { globalThis[");
        out.push_str(&json!(namespace_alias).to_string());
        out.push_str("] = globalThis; } catch (_) {}\n");
    }
    for (imported, local) in &import.named_aliases {
        if imported != local {
            out.push_str("try { globalThis[");
            out.push_str(&json!(local).to_string());
            out.push_str("] = globalThis[");
            out.push_str(&json!(imported).to_string());
            out.push_str("]; } catch (_) {}\n");
        }
    }
    out
}

fn preprocess_js(source: &str) -> String {
    static IMPORT_PATTERNS: std::sync::OnceLock<Vec<Regex>> = std::sync::OnceLock::new();
    let mut out = source.to_string();
    for regex in IMPORT_PATTERNS.get_or_init(|| {
        vec![
            Regex::new(r#"(?m)^\s*import\s+.+?\s+from\s+["'][^"']*["']\s*;?\s*$"#).unwrap(),
            Regex::new(r#"(?m)^\s*import\s+\{[^}]*\}\s+from\s+["'][^"']*["']\s*;?\s*$"#).unwrap(),
            Regex::new(r#"(?m)^\s*import\s+\S+\s+from\s+["'][^"']*["']\s*;?\s*$"#).unwrap(),
            Regex::new(r#"(?m)^\s*import\s+["'][^"']*["']\s*;?\s*$"#).unwrap(),
            Regex::new(r#"\bexport\s+function\s+"#).unwrap(),
            Regex::new(r#"\bexport\s+class\s+"#).unwrap(),
            Regex::new(r#"\bexport\s+const\s+"#).unwrap(),
            Regex::new(r#"\bexport\s+let\s+"#).unwrap(),
            Regex::new(r#"\bexport\s+var\s+"#).unwrap(),
            Regex::new(r#"\bexport\s+default\s+"#).unwrap(),
            Regex::new(r#"(?m)^\s*export\s+\{[^}]*\}\s*;?\s*$"#).unwrap(),
        ]
    }) {
        out = match regex.as_str() {
            r#"\bexport\s+function\s+"# => regex.replace_all(&out, "function ").to_string(),
            r#"\bexport\s+class\s+"# => regex.replace_all(&out, "class ").to_string(),
            r#"\bexport\s+const\s+"# => regex.replace_all(&out, "const ").to_string(),
            r#"\bexport\s+let\s+"# => regex.replace_all(&out, "let ").to_string(),
            r#"\bexport\s+var\s+"# => regex.replace_all(&out, "var ").to_string(),
            r#"\bexport\s+default\s+"# => regex.replace_all(&out, "").to_string(),
            _ => regex.replace_all(&out, "").to_string(),
        };
    }
    out
}

fn parse_import_declarations(source: &str) -> Vec<ImportDecl> {
    static FROM_IMPORT_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static SIDE_EFFECT_IMPORT_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let from_import_re = FROM_IMPORT_RE.get_or_init(|| {
        Regex::new(r#"(?m)^\s*import\s+(.+?)\s+from\s+["']([^"']+)["']\s*;?\s*$"#).unwrap()
    });
    let side_effect_import_re = SIDE_EFFECT_IMPORT_RE.get_or_init(|| {
        Regex::new(r#"(?m)^\s*import\s+["']([^"']+)["']\s*;?\s*$"#).unwrap()
    });

    let mut imports = Vec::new();
    for captures in from_import_re.captures_iter(source) {
        let mut import = parse_import_clause(
            captures.get(1).map(|item| item.as_str()).unwrap_or_default(),
        );
        import.specifier = captures
            .get(2)
            .map(|item| item.as_str().to_string())
            .unwrap_or_default();
        imports.push(import);
    }
    for captures in side_effect_import_re.captures_iter(source) {
        imports.push(ImportDecl {
            specifier: captures
                .get(1)
                .map(|item| item.as_str().to_string())
                .unwrap_or_default(),
            ..ImportDecl::default()
        });
    }
    imports
}

fn parse_import_clause(clause: &str) -> ImportDecl {
    let mut import = ImportDecl::default();
    let clause = clause.trim();
    if clause.starts_with('{') {
        parse_named_imports(clause, &mut import);
        return import;
    }
    if let Some((default_alias, rest)) = clause.split_once(',') {
        let default_alias = default_alias.trim();
        if is_js_identifier(default_alias) {
            import.default_alias = Some(default_alias.to_string());
        }
        let rest = rest.trim();
        if rest.starts_with('{') {
            parse_named_imports(rest, &mut import);
        } else if let Some(namespace_alias) = rest.strip_prefix("* as ") {
            let namespace_alias = namespace_alias.trim();
            if is_js_identifier(namespace_alias) {
                import.namespace_alias = Some(namespace_alias.to_string());
            }
        }
        return import;
    }
    if let Some(namespace_alias) = clause.strip_prefix("* as ") {
        let namespace_alias = namespace_alias.trim();
        if is_js_identifier(namespace_alias) {
            import.namespace_alias = Some(namespace_alias.to_string());
        }
    } else if is_js_identifier(clause) {
        import.default_alias = Some(clause.to_string());
    }
    import
}

fn parse_named_imports(clause: &str, import: &mut ImportDecl) {
    let Some(start) = clause.find('{') else {
        return;
    };
    let Some(end) = clause.rfind('}') else {
        return;
    };
    for item in clause[start + 1..end].split(',') {
        let item = item.trim();
        if item.is_empty() {
            continue;
        }
        let (imported, local) = item
            .split_once(" as ")
            .map(|(imported, local)| (imported.trim(), local.trim()))
            .unwrap_or((item, item));
        if is_js_identifier(imported) && is_js_identifier(local) {
            import
                .named_aliases
                .push((imported.to_string(), local.to_string()));
        }
    }
}

fn collect_export_bindings(source: &str) -> ExportBindings {
    static EXPORT_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static DEFAULT_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static NAMED_BLOCK_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let export_re = EXPORT_RE.get_or_init(|| {
        Regex::new(
            r#"\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)"#,
        )
        .unwrap()
    });
    let default_re = DEFAULT_RE.get_or_init(|| {
        Regex::new(r#"\bexport\s+default\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)"#)
            .unwrap()
    });
    let named_block_re = NAMED_BLOCK_RE.get_or_init(|| {
        Regex::new(r#"(?m)^\s*export\s+\{([^}]*)\}\s*;?\s*$"#).unwrap()
    });

    let mut exports = ExportBindings::default();
    for captures in export_re.captures_iter(source) {
        if let Some(name) = captures.get(1).map(|item| item.as_str()) {
            if is_js_identifier(name) && !exports.named.iter().any(|item| item == name) {
                exports.named.push(name.to_string());
            }
        }
    }
    for captures in default_re.captures_iter(source) {
        if let Some(name) = captures.get(1).map(|item| item.as_str()) {
            if is_js_identifier(name) {
                exports.default = Some(name.to_string());
                if !exports.named.iter().any(|item| item == name) {
                    exports.named.push(name.to_string());
                }
            }
        }
    }
    for captures in named_block_re.captures_iter(source) {
        let Some(block) = captures.get(1).map(|item| item.as_str()) else {
            continue;
        };
        for item in block.split(',') {
            let item = item.trim();
            if item.is_empty() {
                continue;
            }
            let local = item
                .split_once(" as ")
                .map(|(_, exported)| exported.trim())
                .unwrap_or(item);
            if is_js_identifier(local) && !exports.named.iter().any(|item| item == local) {
                exports.named.push(local.to_string());
            }
        }
    }
    exports
}

fn is_js_identifier(value: &str) -> bool {
    let mut chars = value.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !(first == '_' || first == '$' || first.is_ascii_alphabetic()) {
        return false;
    }
    chars.all(|ch| ch == '_' || ch == '$' || ch.is_ascii_alphanumeric())
}

fn extract_pid_list(value: Value) -> Vec<u16> {
    if let Some(pid) = value_to_u16(&value) {
        return vec![pid];
    }
    value
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| value_to_u16(&value))
        .collect()
}

fn value_to_u16(value: &Value) -> Option<u16> {
    if let Some(raw) = value.as_u64() {
        return u16::try_from(raw).ok();
    }
    let raw = value.as_str()?.trim();
    if raw.is_empty() {
        return None;
    }
    let parsed = raw
        .strip_prefix("0x")
        .or_else(|| raw.strip_prefix("0X"))
        .map(|hex| u64::from_str_radix(hex, 16))
        .unwrap_or_else(|| raw.parse::<u64>())
        .ok()?;
    u16::try_from(parsed).ok()
}

pub(crate) fn collect_script_sources(external_dir: &Path) -> (Vec<ScriptSource>, Vec<ScanResult>) {
    let mut by_lookup_path = BTreeMap::new();
    let mut read_errors = Vec::new();

    for (path, source) in BUNDLED_SCRIPTS {
        let lookup_path = builtin_lookup_path(path);
        by_lookup_path.insert(
            lookup_path.clone(),
            ScriptSource {
                source_path: (*path).to_string(),
                lookup_path,
                source: (*source).to_string(),
            },
        );
    }

    let mut external = Vec::new();
    collect_external_scripts(external_dir, &mut external);
    external.sort();
    for path in external {
        let source_path = path.to_string_lossy().to_string();
        let lookup_path = external_lookup_path(external_dir, &path);
        match fs::read_to_string(&path) {
            Ok(source) => {
                by_lookup_path.insert(
                    lookup_path.clone(),
                    ScriptSource {
                        source_path,
                        lookup_path,
                        source,
                    },
                );
            }
            Err(err) => read_errors.push(ScanResult::Err {
                path: source_path,
                error: format!("read error: {err}"),
            }),
        }
    }

    (by_lookup_path.into_values().collect(), read_errors)
}

fn builtin_lookup_path(source_path: &str) -> String {
    normalize_lookup_path(source_path.strip_prefix("builtin:").unwrap_or(source_path))
}

fn external_lookup_path(root: &Path, path: &Path) -> String {
    let rel = path.strip_prefix(root).unwrap_or(path);
    normalize_lookup_path(&rel.to_string_lossy())
}

fn lookup_dir(path: &str) -> String {
    let path = normalize_lookup_path(path);
    path.rsplit_once('/')
        .map(|(dir, _)| dir.to_string())
        .unwrap_or_default()
}

fn normalize_lookup_path(path: &str) -> String {
    let path = path.replace('\\', "/");
    let mut parts = Vec::new();
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            _ => parts.push(part),
        }
    }
    parts.join("/")
}

fn collect_external_scripts(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_external_scripts(&path, out);
        } else if path.extension().and_then(|ext| ext.to_str()) == Some("js") {
            out.push(path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hid::{HidBackend, HidInfo};
    use crate::host::Host;
    use crate::topology::build_registration;
    use crate::types::DeviceState;

    fn bundled_sources() -> (Vec<ScriptSource>, ScriptCatalog) {
        let (sources, read_errors) = collect_script_sources(Path::new("__missing_srgb_external__"));
        assert!(read_errors.is_empty());
        let catalog = ScriptCatalog::from_sources(&sources);
        (sources, catalog)
    }

    fn find_source<'a>(sources: &'a [ScriptSource], lookup_path: &str) -> &'a ScriptSource {
        sources
            .iter()
            .find(|source| source.lookup_path.eq_ignore_ascii_case(lookup_path))
            .unwrap_or_else(|| panic!("missing bundled script {lookup_path}"))
    }

    #[test]
    fn pid_list_matches_lua_tonumber_behavior() {
        let pids = extract_pid_list(json!(["6837", "0x1934", 0x184d, "invalid", null]));
        assert_eq!(pids, vec![0x1ab5, 0x1934, 0x184d]);
    }

    #[test]
    fn asus_keyboard_object_keys_product_ids_include_scope_ii_rx() {
        let (sources, catalog) = bundled_sources();
        let script = find_source(&sources, "Asus/ASUS_Keyboard.js");
        let result = scan_script(script, &catalog);
        let ScanResult::Ok(meta) = result else {
            panic!("ASUS keyboard scan failed: {result:?}");
        };
        assert!(meta.pids.contains(&0x1ab5), "pids={:?}", meta.pids);
    }

    #[test]
    fn asus_omni_relative_imports_are_available_to_scan_context() {
        let (sources, catalog) = bundled_sources();
        let script = find_source(&sources, "Asus/Omni Controller/ASUS_Omni_Device.js");
        let result = scan_script(script, &catalog);
        let ScanResult::Ok(meta) = result else {
            panic!("ASUS Omni scan failed: {result:?}");
        };
        assert_eq!(meta.name, "ASUS Omni Device");
        assert_eq!(meta.pids, vec![0x1ace]);
    }

    #[test]
    fn asus_scope_ii_rx_runtime_topology_registers_matrix_output() {
        let (sources, catalog) = bundled_sources();
        let script = find_source(&sources, "Asus/ASUS_Keyboard.js");
        let result = scan_script(script, &catalog);
        let ScanResult::Ok(meta) = result else {
            panic!("ASUS keyboard scan failed: {result:?}");
        };
        let meta = *meta;

        let host = unsafe { Host::from_raw(std::ptr::null()) };
        let hid_backend = HidBackend::new_shared().expect("hid backend should initialize");
        let hid = HidInfo {
            path: "probe".to_string(),
            vid: 0x0b05,
            pid: 0x1ab5,
            interface_number: Some(1),
            usage: Some(0x0001),
            usage_page: Some(0xff00),
            ..HidInfo::default()
        };
        let ep_handles = HashMap::from([("1:1:65280".to_string(), 0)]);
        let endpoints = vec![json!({
            "interface": 1,
            "usage": 0x0001,
            "usage_page": 0xff00,
            "collection": 0,
        })];
        let mut runtime = RuntimeJs::create_runtime(
            host,
            hid_backend,
            &meta,
            0,
            &hid,
            ep_handles.clone(),
            endpoints,
        )
        .expect("runtime should be created");
        runtime
            .call_global_json("Initialize", &[])
            .expect("Initialize should run");
        let raw = runtime
            .call_global_json("__srgb_take_topology_update", &[Value::Bool(true)])
            .expect("topology should export");

        let state = DeviceState {
            meta,
            hid_info: hid,
            ep_handles,
            runtime,
            controller_port: "srgb:0b05:1ab5:probe".to_string(),
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
        let registration = build_registration(&state, &raw).expect("registration should build");

        assert_eq!(registration.outputs.len(), 1);
        let output = &registration.outputs[0];
        assert_eq!(output.output_type, "matrix");
        assert_eq!(output.leds_count, 109);
        let matrix = output.matrix.as_ref().expect("matrix output should include map");
        assert_eq!((matrix.width, matrix.height), (21, 6));
        assert_eq!(matrix.map.len(), 126);
        assert_eq!(matrix.map[0], 0);
        assert_eq!(matrix.map[5], -1);
        assert_eq!(matrix.map[6], 5);
    }
}
