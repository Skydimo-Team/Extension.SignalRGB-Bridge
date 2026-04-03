--- lib/discovery.lua
--- HID device enumeration, VID/PID matching, and Validate() probing.

local endpoint = require("lib.endpoint")
local context  = require("lib.context")
local device   = require("lib.device")

local M = {}

--- Try calling Validate(endpoint) for a matched script + HID info.
--- Returns true if the script has no Validate() function or if
--- Validate() returns true for the given endpoint descriptor.
---
---@param meta table  scanned metadata (must contain has_validate, js_source)
---@param hid  table  HID device info
---@return boolean
function M.validate_endpoint(meta, hid)
    if not meta.has_validate then return true end

    local ctx, err = context.create_validation(meta)
    if not ctx then
        ext.log("[SRGB] Validate ctx error: " .. (err or ""))
        return false
    end

    local ep = {
        interface  = hid.interface_number or -1,
        usage      = hid.usage or 0,
        usage_page = hid.usage_page or 0,
        collection = 0,
    }
    ctx:set("_validate_endpoint", ep)

    local ok, result = pcall(ctx.eval, ctx, "Validate(_validate_endpoint)")
    ctx:close()

    return ok and result == true
end

--- Enumerate HID devices, match against script_db, validate, and
--- register matched devices via device.register().
---
---@param script_db table  array of { meta = { vid, pids, ... } }
---@return number          count of newly matched devices
function M.discover_and_register(script_db)
    ext.log("[SRGB] Enumerating HID devices...")
    local ok, all_hid = pcall(ext.hid_enumerate, nil, nil)
    if not ok then
        ext.log("[SRGB] HID enumerate failed: " .. tostring(all_hid))
        return 0
    end
    ext.log("[SRGB] Found " .. #all_hid .. " HID device(s) on system")

    -- Index by VID:PID
    local by_vid_pid = {}
    for _, hid in ipairs(all_hid) do
        local key = string.format("%04x:%04x", hid.vid, hid.pid)
        if not by_vid_pid[key] then by_vid_pid[key] = {} end
        by_vid_pid[key][#by_vid_pid[key] + 1] = hid
    end

    -- Already-opened groups
    local open_groups = device.open_groups()
    local matched = 0

    for _, entry in ipairs(script_db) do
        local meta = entry.meta
        if meta and meta.vid and meta.pids then
            for _, pid in ipairs(meta.pids) do
                local key = string.format("%04x:%04x", meta.vid, pid)
                local candidates = by_vid_pid[key]
                if candidates then
                    for _, hid in ipairs(candidates) do
                        local group = endpoint.normalize_path(hid.path)
                        if not open_groups[group] then
                            if M.validate_endpoint(meta, hid) then
                                local h_ok, handle = pcall(ext.hid_open_path, hid.path)
                                if h_ok and handle then
                                    local state = device.register(meta, handle, hid)
                                    if state then
                                        open_groups[group] = true
                                        matched = matched + 1
                                    end
                                else
                                    ext.log("[SRGB] Failed to open: " .. hid.path
                                        .. " " .. tostring(handle))
                                end
                            end
                        end
                    end
                end
            end
        end
    end

    return matched
end

return M
