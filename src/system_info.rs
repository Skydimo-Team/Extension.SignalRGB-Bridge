use serde::Serialize;

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemInfo {
    pub(crate) motherboard: MotherboardInfo,
    pub(crate) bios: BiosInfo,
    pub(crate) ram: RamInfo,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MotherboardInfo {
    pub(crate) manufacturer: String,
    pub(crate) model: String,
    pub(crate) product: String,
    pub(crate) vendor: String,
    pub(crate) serial_number: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BiosInfo {
    pub(crate) vendor: String,
    pub(crate) version: String,
    pub(crate) date: String,
    pub(crate) release_date: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RamInfo {
    pub(crate) total_memory_mb: u64,
    pub(crate) total_memory: u64,
    pub(crate) modules: Vec<RamModuleInfo>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RamModuleInfo {
    pub(crate) manufacturer: String,
    pub(crate) part_number: String,
    pub(crate) capacity_mb: u64,
    pub(crate) speed_mhz: u32,
    pub(crate) form_factor: String,
}

pub(crate) fn collect() -> SystemInfo {
    platform::collect()
}

#[cfg(target_os = "windows")]
mod platform {
    use serde::Deserialize as WmiDeserialize;

    use super::{BiosInfo, MotherboardInfo, RamInfo, RamModuleInfo, SystemInfo};

    #[derive(WmiDeserialize, Debug)]
    #[allow(non_snake_case)]
    struct Win32BaseBoard {
        Manufacturer: Option<String>,
        Product: Option<String>,
        SerialNumber: Option<String>,
    }

    #[derive(WmiDeserialize, Debug)]
    #[allow(non_snake_case)]
    struct Win32Bios {
        Manufacturer: Option<String>,
        SMBIOSBIOSVersion: Option<String>,
        ReleaseDate: Option<String>,
    }

    #[derive(WmiDeserialize, Debug)]
    #[allow(non_snake_case)]
    struct Win32PhysicalMemory {
        Manufacturer: Option<String>,
        PartNumber: Option<String>,
        Capacity: Option<u64>,
        Speed: Option<u32>,
        FormFactor: Option<u16>,
    }

    pub(super) fn collect() -> SystemInfo {
        let mut info = SystemInfo::default();
        let Ok(wmi) = wmi::WMIConnection::new() else {
            return info;
        };

        collect_motherboard(&wmi, &mut info.motherboard);
        collect_bios(&wmi, &mut info.bios);
        collect_ram(&wmi, &mut info.ram);
        info
    }

    fn collect_motherboard(wmi: &wmi::WMIConnection, motherboard: &mut MotherboardInfo) {
        let Some(board) = wmi
            .raw_query::<Win32BaseBoard>(
                "SELECT Manufacturer, Product, SerialNumber FROM Win32_BaseBoard",
            )
            .unwrap_or_default()
            .into_iter()
            .next()
        else {
            return;
        };

        motherboard.manufacturer =
            normalize_firmware_string(board.Manufacturer.as_deref()).unwrap_or_default();
        motherboard.vendor = motherboard.manufacturer.clone();
        motherboard.product =
            normalize_firmware_string(board.Product.as_deref()).unwrap_or_default();
        motherboard.model = motherboard.product.clone();
        motherboard.serial_number =
            normalize_firmware_string(board.SerialNumber.as_deref()).unwrap_or_default();
    }

    fn collect_bios(wmi: &wmi::WMIConnection, bios: &mut BiosInfo) {
        let Some(raw) = wmi
            .raw_query::<Win32Bios>(
                "SELECT Manufacturer, SMBIOSBIOSVersion, ReleaseDate FROM Win32_BIOS",
            )
            .unwrap_or_default()
            .into_iter()
            .next()
        else {
            return;
        };

        bios.vendor = normalize_firmware_string(raw.Manufacturer.as_deref()).unwrap_or_default();
        bios.version =
            normalize_firmware_string(raw.SMBIOSBIOSVersion.as_deref()).unwrap_or_default();
        bios.date = raw
            .ReleaseDate
            .as_deref()
            .map(format_wmi_date)
            .unwrap_or_default();
        bios.release_date = bios.date.clone();
    }

    fn collect_ram(wmi: &wmi::WMIConnection, ram: &mut RamInfo) {
        let modules = wmi
            .raw_query::<Win32PhysicalMemory>(
                "SELECT Manufacturer, PartNumber, Capacity, Speed, FormFactor FROM Win32_PhysicalMemory",
            )
            .unwrap_or_default();
        let mut total = 0u64;
        for module in modules {
            let capacity_bytes = module.Capacity.unwrap_or(0);
            total = total.saturating_add(capacity_bytes);
            ram.modules.push(RamModuleInfo {
                manufacturer: normalize_firmware_string(module.Manufacturer.as_deref())
                    .unwrap_or_default(),
                part_number: normalize_firmware_string(module.PartNumber.as_deref())
                    .unwrap_or_default(),
                capacity_mb: capacity_bytes / (1024 * 1024),
                speed_mhz: module.Speed.unwrap_or(0),
                form_factor: format_form_factor(module.FormFactor.unwrap_or(0)),
            });
        }
        ram.total_memory_mb = total / (1024 * 1024);
        ram.total_memory = ram.total_memory_mb;
    }

    fn format_wmi_date(raw: &str) -> String {
        if raw.len() >= 8 {
            format!("{}/{}/{}", &raw[4..6], &raw[6..8], &raw[0..4])
        } else {
            raw.to_string()
        }
    }

    fn format_form_factor(code: u16) -> String {
        match code {
            8 => "DIMM".to_string(),
            12 => "SO-DIMM".to_string(),
            _ => format!("Other({code})"),
        }
    }

    fn normalize_firmware_string(raw: Option<&str>) -> Option<String> {
        let value = raw?.trim_matches(|ch: char| ch.is_whitespace() || ch == '\0');
        if value.is_empty() {
            return None;
        }

        let normalized = value.to_ascii_lowercase();
        let is_placeholder = matches!(
            normalized.as_str(),
            "unknown"
                | "default string"
                | "to be filled by o.e.m."
                | "to be filled by oem"
                | "system product name"
                | "system manufacturer"
                | "not applicable"
                | "none"
                | "null"
        );

        (!is_placeholder).then(|| value.to_string())
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::SystemInfo;

    pub(super) fn collect() -> SystemInfo {
        SystemInfo::default()
    }
}
