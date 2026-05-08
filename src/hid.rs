use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::CString;
use std::rc::Rc;

use hidapi::{HidApi, HidDevice};
use serde::{Deserialize, Serialize};

pub(crate) type HidHandle = u64;
pub(crate) type SharedHid = Rc<RefCell<HidBackend>>;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub(crate) struct HidInfo {
    pub(crate) path: String,
    #[serde(alias = "vendor_id", alias = "vendorId")]
    pub(crate) vid: u16,
    #[serde(alias = "product_id", alias = "productId")]
    pub(crate) pid: u16,
    #[serde(alias = "serial_number")]
    pub(crate) serial: Option<String>,
    pub(crate) manufacturer: Option<String>,
    pub(crate) product: Option<String>,
    pub(crate) interface_number: Option<i32>,
    pub(crate) usage: Option<u16>,
    pub(crate) usage_page: Option<u16>,
}

pub(crate) struct HidBackend {
    api: HidApi,
    devices: HashMap<HidHandle, HidDevice>,
    next_id: HidHandle,
}

impl HidBackend {
    pub(crate) fn new_shared() -> Result<SharedHid, String> {
        Ok(Rc::new(RefCell::new(Self::new()?)))
    }

    fn new() -> Result<Self, String> {
        let api = HidApi::new().map_err(|err| format!("Failed to initialise HID API: {err}"))?;
        Ok(Self {
            api,
            devices: HashMap::new(),
            next_id: 1,
        })
    }

    pub(crate) fn enumerate(
        &mut self,
        vid: Option<u16>,
        pid: Option<u16>,
    ) -> Result<Vec<HidInfo>, String> {
        self.api
            .refresh_devices()
            .map_err(|err| format!("Failed to refresh HID device list: {err}"))?;
        let vid_filter = vid.unwrap_or(0);
        let pid_filter = pid.unwrap_or(0);

        Ok(self
            .api
            .device_list()
            .filter(|device| {
                (vid_filter == 0 || device.vendor_id() == vid_filter)
                    && (pid_filter == 0 || device.product_id() == pid_filter)
            })
            .map(|device| HidInfo {
                path: device.path().to_string_lossy().into_owned(),
                vid: device.vendor_id(),
                pid: device.product_id(),
                serial: optional_hid_string(device.serial_number()),
                manufacturer: optional_hid_string(device.manufacturer_string()),
                product: optional_hid_string(device.product_string()),
                interface_number: Some(device.interface_number()),
                usage: Some(device.usage()),
                usage_page: Some(device.usage_page()),
            })
            .collect())
    }

    pub(crate) fn open_path(&mut self, path: &str) -> Result<HidHandle, String> {
        let c_path = CString::new(path).map_err(|err| format!("Invalid HID path: {err}"))?;
        let device = self
            .api
            .open_path(&c_path)
            .map_err(|err| format!("Failed to open HID device at '{path}': {err}"))?;
        self.store_device(device)
    }

    pub(crate) fn write(&self, handle: HidHandle, data: &[u8]) -> Result<usize, String> {
        self.device(handle)?
            .write(data)
            .map_err(|err| format!("HID write failed: {err}"))
    }

    pub(crate) fn read(
        &self,
        handle: HidHandle,
        length: usize,
        timeout_ms: i32,
    ) -> Result<Vec<u8>, String> {
        let mut buffer = vec![0u8; length];
        let read = if timeout_ms < 0 {
            self.device(handle)?.read(&mut buffer)
        } else {
            self.device(handle)?.read_timeout(&mut buffer, timeout_ms)
        }
        .map_err(|err| format!("HID read failed: {err}"))?;
        buffer.truncate(read);
        Ok(buffer)
    }

    pub(crate) fn send_feature_report(
        &self,
        handle: HidHandle,
        data: &[u8],
    ) -> Result<usize, String> {
        self.device(handle)?
            .send_feature_report(data)
            .map_err(|err| format!("HID send_feature_report failed: {err}"))?;
        Ok(data.len())
    }

    pub(crate) fn get_feature_report(
        &self,
        handle: HidHandle,
        report_id: u8,
        length: usize,
    ) -> Result<Vec<u8>, String> {
        let mut buffer = vec![0u8; length];
        if let Some(first) = buffer.first_mut() {
            *first = report_id;
        }
        let read = self
            .device(handle)?
            .get_feature_report(&mut buffer)
            .map_err(|err| format!("HID get_feature_report failed: {err}"))?;
        buffer.truncate(read);
        Ok(buffer)
    }

    pub(crate) fn close(&mut self, handle: HidHandle) {
        self.devices.remove(&handle);
    }

    fn store_device(&mut self, device: HidDevice) -> Result<HidHandle, String> {
        let handle = self.next_id;
        self.next_id = self
            .next_id
            .checked_add(1)
            .ok_or_else(|| "HID handle counter overflowed".to_string())?;
        self.devices.insert(handle, device);
        Ok(handle)
    }

    fn device(&self, handle: HidHandle) -> Result<&HidDevice, String> {
        self.devices
            .get(&handle)
            .ok_or_else(|| format!("Invalid HID handle {handle}"))
    }
}

fn optional_hid_string(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}
