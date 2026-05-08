export interface ScriptInfo {
  name: string
  path: string
  status: 'ok' | 'error'
  disabled: boolean
  vid?: string
  device_type?: string
  publisher?: string
  has_devices?: boolean
  error_message?: string
}

export interface ScriptsSnapshotPayload {
  scripts: ScriptInfo[]
}

export interface BridgeDevice {
  port: string
  name: string
  script_name: string
  script_path: string
  device_path: string
  publisher?: string
  vid?: string
  pid?: string
  device_type?: string
  output_count: number
  total_leds: number
  fps: number
  input_fps: number
  route_fps: number
  render_ms: number
  max_render_ms: number
  errors: number
}

export interface DevicesSnapshotPayload {
  devices: BridgeDevice[]
}
