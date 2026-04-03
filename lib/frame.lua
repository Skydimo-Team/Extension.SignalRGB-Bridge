--- lib/frame.lua
--- Frame buffer delivery: remap LED colours and push to JS context.

local M = {}

local function ensure_spatial_cache(state)
    local cache = state._spatial_cache
    if cache then return cache end

    cache = {
        buf = {},
        len = 0,
    }
    state._spatial_cache = cache
    return cache
end

--- Remap a flat LED-indexed colour table into a 2D spatial buffer
--- using the matrix map, so that `device.color(x, y)` returns the
--- correct colour for each pixel position.
---
--- Matrix map:  map[spatial_pos] = led_sequential_index (-1 = empty).
--- Input:       flat {r,g,b,...} indexed by sequential LED index.
--- Output:      flat {r,g,b,...} indexed by spatial position (y*w+x).
---
---@param colors table   flat { r,g,b, ... } from Core
---@param matrix table   { width, height, map }
---@param cache table    per-device remap buffer cache
---@return table         spatial colour buffer
function M.remap_to_spatial(colors, matrix, cache)
    local map = matrix.map
    local total = matrix.width * matrix.height
    local needed = total * 3
    local buf = cache.buf
    local idx = 0
    for pos = 1, total do
        local led = map[pos]
        if led and led >= 0 then
            local src = led * 3 + 1
            buf[idx + 1] = colors[src] or 0
            buf[idx + 2] = colors[src + 1] or 0
            buf[idx + 3] = colors[src + 2] or 0
        else
            buf[idx + 1] = 0
            buf[idx + 2] = 0
            buf[idx + 3] = 0
        end
        idx = idx + 3
    end

    if cache.len > needed then
        for i = needed + 1, cache.len do
            buf[i] = nil
        end
    end
    cache.len = needed
    return buf
end

local function colors_led_count(colors)
    return math.floor((type(colors) == "table" and #colors or 0) / 3)
end

local function build_main_frame(colors, state)
    if type(colors) ~= "table" then return nil end
    local buf = colors
    local width = state.main_width or state.rt_width or 1
    if state.main_matrix then
        buf = M.remap_to_spatial(colors, state.main_matrix, ensure_spatial_cache(state))
        width = state.main_matrix.width or width
    end
    return {
        colors = buf,
        width = width,
        led_count = colors_led_count(buf),
    }
end

--- Push all output frames into the JS context before each Render().
---
---@param ctx userdata
---@param outputs table<string, table>
---@param state table
---@return boolean|nil
---@return string|nil
function M.push(ctx, outputs, state)
    local main_frame = nil
    local channel_frames = {}
    local subdevice_frames = {}

    outputs = outputs or {}

    for output_id, target in pairs(state.output_targets or {}) do
        local colors = outputs[output_id]
        if target.kind == "main" then
            if colors then
                main_frame = build_main_frame(colors, state)
            end
        elseif target.kind == "channel" and target.name then
            channel_frames[target.name] = {
                colors = colors or {},
                led_count = colors_led_count(colors or {}),
            }
        elseif target.kind == "subdevice" and target.name then
            subdevice_frames[target.name] = {
                colors = colors or {},
                led_count = colors_led_count(colors or {}),
            }
        end
    end

    ctx:set("__srgb_main_frame", main_frame)
    ctx:set("__srgb_channel_frames", channel_frames)
    ctx:set("__srgb_subdevice_frames", subdevice_frames)

    local ok, err = pcall(ctx.call, ctx, "__srgb_apply_pending_frames")
    if not ok then
        return nil, tostring(err)
    end
    return true
end

return M
