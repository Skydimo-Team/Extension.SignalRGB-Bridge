--- lib/utils.lua
--- Shared utility functions for the SignalRGB Bridge.

local M = {}

--- Detect the plugin root directory from the current file path.
--- Works because this file lives at `<plugin_root>/lib/utils.lua`.
local function detect_plugin_dir()
    local info = debug.getinfo(1, "S")
    local src = info.source
    if src:sub(1, 1) == "@" then src = src:sub(2) end
    -- Go up from lib/ to plugin root
    local lib_dir = src:match("(.+)[/\\]")
    if lib_dir then
        return lib_dir:match("(.+)[/\\]") or lib_dir
    end
    return "."
end

M.PLUGIN_DIR     = detect_plugin_dir()
M.CONTROLLER_ID  = "extension.signalrgb_bridge"
M.SCRIPTS_SUBDIR = "SRGB-Device"

--- Read a file and return its full contents as a string.
---@param path string
---@return string|nil content
---@return string|nil error
function M.read_file(path)
    local fh, err = io.open(path, "r")
    if not fh then return nil, err end
    local content = fh:read("*a")
    fh:close()
    return content
end

--- Convert a Lua table of byte values to a binary string.
---@param arr table  array of numbers (0-255)
---@return string
function M.bytes_to_string(arr)
    local t = {}
    for i = 1, #arr do
        t[i] = string.char(math.floor(tonumber(arr[i]) or 0) % 256)
    end
    return table.concat(t)
end

--- Convert a binary string to a Lua table of byte values.
---@param data string|nil
---@return table  array of numbers (0-255)
function M.string_to_bytes(data)
    if not data then return {} end
    local t = {}
    for i = 1, #data do
        t[i] = string.byte(data, i)
    end
    return t
end

--- Build a unique controller port string from HID device info.
---@param hid_info table  { vid, pid, serial, path }
---@return string
function M.make_controller_port(hid_info)
    local id = (hid_info.serial and hid_info.serial ~= "")
        and hid_info.serial
        or  hid_info.path
    return string.format("srgb:%04x:%04x:%s", hid_info.vid, hid_info.pid, id)
end

return M
