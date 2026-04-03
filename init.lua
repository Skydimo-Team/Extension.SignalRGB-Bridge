-------------------------------------------------------------------
-- SignalRGB Bridge Extension
--
-- Bridges SignalRGB JS device scripts to the Skydimo lighting
-- engine. Thin entry point — all logic lives in lib/ modules.
-------------------------------------------------------------------

local utils     = require("lib.utils")
local scanner   = require("lib.scanner")
local discovery = require("lib.discovery")
local device    = require("lib.device")
local frame     = require("lib.frame")
local endpoint  = require("lib.endpoint")

-------------------------------------------------------------------
-- State
-------------------------------------------------------------------
local script_db = {}   -- array of { meta = {…} }

local function scripts_dir()
    return ext.data_dir .. "/" .. utils.SCRIPTS_SUBDIR
end

-------------------------------------------------------------------
-- Extension callbacks
-------------------------------------------------------------------

local P = {}

function P.on_start()
    ext.log("[SRGB] SignalRGB Bridge starting")

    ext.notify_persistent("srgb-scan", "SignalRGB Bridge",
        "Scanning device scripts...")
    local results = scanner.scan_directory(scripts_dir(), function(msg)
        ext.log(msg)
    end)
    ext.dismiss_persistent("srgb-scan")

    script_db = {}
    local total, errors = 0, 0
    for _, r in ipairs(results) do
        if r.meta then
            script_db[#script_db + 1] = r
            total = total + 1
        else
            errors = errors + 1
        end
    end

    ext.log("[SRGB] Scanned " .. total .. " script(s), "
        .. errors .. " error(s)")

    local matched = discovery.discover_and_register(script_db)
    ext.notify("SignalRGB Bridge",
        total .. " scripts loaded, " .. matched .. " device(s) matched",
        matched > 0 and "success" or "info")
end

function P.on_stop()
    ext.log("[SRGB] SignalRGB Bridge stopping")
    device.remove_all()
    script_db = {}
end

function P.on_scan_devices()
    ext.notify_persistent("srgb-scan", "SignalRGB Bridge", "Rescanning...")
    local results = scanner.scan_directory(scripts_dir(), function(msg)
        ext.log(msg)
    end)
    ext.dismiss_persistent("srgb-scan")

    script_db = {}
    for _, r in ipairs(results) do
        if r.meta then script_db[#script_db + 1] = r end
    end

    -- Remove stale devices whose HID path is no longer present
    local ok_enum, curr_hid = pcall(ext.hid_enumerate, nil, nil)
    if ok_enum then
        local curr_groups = {}
        for _, hid in ipairs(curr_hid) do
            curr_groups[endpoint.normalize_path(hid.path)] = true
        end
        local stale = {}
        for port, state in pairs(device.all()) do
            if not curr_groups[endpoint.normalize_path(state.hid_info.path)] then
                stale[#stale + 1] = port
            end
        end
        for _, port in ipairs(stale) do
            ext.log("[SRGB] Removing stale: " .. port)
            device.remove(port)
        end
    end

    local matched = discovery.discover_and_register(script_db)
    ext.notify("SignalRGB Bridge",
        #script_db .. " scripts, " .. matched .. " new device(s)",
        matched > 0 and "success" or "info")
end

function P.on_devices_changed(_devices)
    -- No action needed
end

function P.on_device_frame(port, outputs)
    local state = device.get(port)
    if not state or not state.js_ctx then return end

    local pushed, push_err = frame.push(state.js_ctx, outputs or {}, state)
    if not pushed then
        ext.log("[SRGB] Frame push failed for " .. (state.rt_name or "?")
            .. ": " .. tostring(push_err))
        return
    end

    local ok, err = pcall(state.js_ctx.call, state.js_ctx, "Render")
    if not ok then
        ext.log("[SRGB] Render() failed for " .. (state.rt_name or "?")
            .. ": " .. tostring(err))
    end

    local synced, sync_err = device.sync_topology(state)
    if not synced then
        ext.log("[SRGB] Topology sync failed for "
            .. (state.rt_name or state.meta.name or "?") .. ": "
            .. tostring(sync_err))
    end
end

return P
