--- lib/device_types.lua
--- Maps SignalRGB DeviceType strings to Skydimo categories and
--- determines output geometry (single / linear / matrix).

local M = {}

--- SignalRGB DeviceType → Skydimo device category.
---@type table<string, string>
M.category = {
    keyboard    = "keyboard",
    mouse       = "mouse",
    mousepad    = "mousepad",
    headphones  = "headset",
    headset     = "headset",
    microphone  = "microphone",
    monitor     = "monitor",
    gpu         = "gpu",
    motherboard = "motherboard",
    ram         = "ram",
    cooler      = "cooler",
    aio         = "cooler",
    fan         = "fan",
    ledstrip    = "ledstrip",
    speaker     = "speaker",
    chair       = "accessory",
    accessory   = "accessory",
    other       = "other",
    unknown     = "other",
}

--- Determine the output type from width/height metadata.
---@param meta table  { width, height }
---@return string  "single" | "linear" | "matrix"
function M.output_type(meta)
    local w = meta.width or 1
    local h = meta.height or 1
    local total = w * h
    if total <= 1 then
        return "single"
    elseif w > 1 and h > 1 then
        return "matrix"
    else
        return "linear"
    end
end

--- Build a sequential row-major matrix map from dimensions.
--- Returns nil when the geometry is not 2D.
---@param meta table  { width, height }
---@return table|nil  { width, height, map }
function M.build_matrix(meta)
    local w = meta.width or 1
    local h = meta.height or 1
    if w <= 1 or h <= 1 then return nil end

    local map = {}
    for i = 0, w * h - 1 do
        map[#map + 1] = i
    end
    return { width = w, height = h, map = map }
end

--- Resolve the Skydimo category for a raw DeviceType string.
---@param device_type string
---@return string
function M.resolve_category(device_type)
    local lower = (device_type or "unknown"):lower()
    return M.category[lower] or "other"
end

return M
