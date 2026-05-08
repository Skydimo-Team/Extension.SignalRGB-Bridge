use std::ffi::OsStr;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

fn main() {
    println!("cargo:rerun-if-changed=data/SRGB-Device");
    println!("cargo:rerun-if-changed=js/polyfills.js");
    println!("cargo:rerun-if-changed=js/device.js");
    println!("cargo:rerun-if-changed=js/scan_stubs.js");

    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR is set by cargo");
    let mut out = fs::File::create(Path::new(&out_dir).join("srgb_scripts.rs"))
        .expect("create generated script catalog");

    let root = PathBuf::from("data").join("SRGB-Device");
    let mut files = Vec::new();
    collect_js_files(&root, &mut files).expect("scan bundled SignalRGB scripts");
    files.sort();

    writeln!(out, "pub const BUNDLED_SCRIPTS: &[(&str, &str)] = &[").unwrap();
    for path in files {
        let rel = path.strip_prefix(&root).unwrap_or(path.as_path());
        let rel = rel.to_string_lossy().replace('\\', "/");
        let abs = fs::canonicalize(&path).unwrap_or(path);
        let abs = abs.to_string_lossy().replace('\\', "/");
        writeln!(
            out,
            "    ({:?}, include_str!({:?})),",
            format!("builtin:{rel}"),
            abs,
        )
        .unwrap();
    }
    writeln!(out, "];").unwrap();
}

fn collect_js_files(dir: &Path, out: &mut Vec<PathBuf>) -> io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_js_files(&path, out)?;
        } else if path.extension() == Some(OsStr::new("js")) {
            out.push(path);
        }
    }
    Ok(())
}
