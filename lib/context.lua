--- lib/context.lua
--- QuickJS context factory.
--- Creates pre-configured JS contexts for runtime (device operation)
--- and validation (lightweight Validate() probe).

local qjs      = require("quickjs")
local utils    = require("lib.utils")
local endpoint = require("lib.endpoint")

local M = {}

--- Load JS bridge sources once at require time.
local polyfills_js, device_js

do
    local base = utils.PLUGIN_DIR .. "/js/"
    local function must_read(name)
        local src, err = utils.read_file(base .. name)
        if not src then error("Failed to load " .. name .. ": " .. (err or "")) end
        return src
    end
    polyfills_js = must_read("polyfills.js")
    device_js    = must_read("device.js")
end

--- JS snippet that reads ControllableParameters() and applies defaults.
local SETUP_PARAMS_JS = [[
(function() {
    var g = (typeof globalThis !== 'undefined') ? globalThis : this;
    try {
        var params = (typeof ControllableParameters === 'function')
            ? ControllableParameters() : [];
        if (!Array.isArray(params)) params = [];
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (!p || !p.property) continue;
            if (typeof g[p.property] !== 'undefined') continue;
            var def = p['default'];
            if (p.type === 'boolean')      g[p.property] = (def === 'true' || def === true);
            else if (p.type === 'number')  g[p.property] = Number(def) || 0;
            else                            g[p.property] = (def != null) ? String(def) : '';
        }
    } catch(e) {}
    g['LightingMode'] = 'Canvas';
})();
]]

-------------------------------------------------------------------
-- Runtime context (full HID I/O, frame buffer, etc.)
-------------------------------------------------------------------

--- Create a fully-configured QuickJS context for device operation.
---
---@param meta           table     scanned script metadata
---@param primary_handle userdata  already-opened primary HID handle
---@param primary_hid    table     primary HID info
---@param ep_handles     table     key → handle map (from endpoint.open_all)
---@param all_eps        table     array of endpoint descriptors
---@return userdata|nil  ctx       QuickJS context
---@return string|nil    error
function M.create_runtime(meta, primary_handle, primary_hid, ep_handles, all_eps)
    local ctx = qjs.new({ memory_limit = 32 * 1024 * 1024 })
    local HID_FLUSH_READ_LEN = 1024
    local HID_FLUSH_MAX_READS = 256

    -- Active handle (switched by set_endpoint)
    local active_handle = primary_handle
    local last_read_size = { n = 0 }

    -- ── Lua callbacks exposed to JS ─────────────────────────

    ctx:set("_hid_write", function(arr)
        if type(arr) ~= "table" then return 0 end
        local ok, n = pcall(ext.hid_write, active_handle, utils.bytes_to_string(arr))
        if not ok then
            ext.log("[SRGB] HID write error: " .. tostring(n))
            return -1
        end
        return n or 0
    end)

    ctx:set("_hid_read", function(length, timeout)
        local len  = math.floor(tonumber(length) or 64)
        local tout = math.floor(tonumber(timeout) or 0)
        local ok, data = pcall(ext.hid_read, active_handle, len, tout)
        if not ok or not data then
            last_read_size.n = 0
            return {}
        end
        local result = utils.string_to_bytes(data)
        last_read_size.n = #result
        return result
    end)

    ctx:set("_hid_send_report", function(arr)
        if type(arr) ~= "table" then return 0 end
        local ok, n = pcall(ext.hid_send_feature_report, active_handle,
                            utils.bytes_to_string(arr))
        if not ok then return -1 end
        return n or 0
    end)

    ctx:set("_hid_get_report", function(report_id, length)
        local rid = math.floor(tonumber(report_id) or 0)
        local len = math.floor(tonumber(length) or 64)
        local ok, data = pcall(ext.hid_get_feature_report, active_handle, len, rid)
        if not ok or not data then
            last_read_size.n = 0
            return {}
        end
        local result = utils.string_to_bytes(data)
        last_read_size.n = #result
        return result
    end)

    ctx:set("_hid_set_endpoint", function(iface, usage, usage_page)
        local i  = math.floor(tonumber(iface) or -1)
        local u  = math.floor(tonumber(usage) or -1)
        local up = math.floor(tonumber(usage_page) or -1)
        local h = endpoint.find(ep_handles, i, u, up)
        if h then
            active_handle = h
            return true
        end
        ext.log(string.format(
            "[SRGB] Endpoint not found: I=%d U=0x%04X P=0x%04X", i, u, up))
        return false
    end)

    ctx:set("_hid_get_endpoints", function()
        return all_eps
    end)

    ctx:set("_hid_flush", function()
        local flushed = 0
        -- Preserve clearReadBuffer()/flush() compatibility for scripts that
        -- expect the queue to be drained before issuing the next request.
        for _ = 1, HID_FLUSH_MAX_READS do
            local ok, data = pcall(ext.hid_read, active_handle, HID_FLUSH_READ_LEN, 0)
            if not ok or not data or #data == 0 then break end
            flushed = flushed + 1
        end
        last_read_size.n = 0
        return flushed
    end)

    ctx:set("_hid_get_last_read_size", function()
        return last_read_size.n
    end)

    ctx:set("_log", function(msg)
        ext.log("[SRGB:" .. (meta.name or "?") .. "] " .. tostring(msg))
    end)

    ctx:set("_pause", function(ms)
        local t = math.floor(tonumber(ms) or 0)
        if t > 0 and ext.sleep then ext.sleep(t) end
    end)

    -- ── Eval bridge JS ──────────────────────────────────────

    local ok1, err1 = pcall(ctx.eval, ctx, polyfills_js, "<polyfills>")
    if not ok1 then ctx:close(); return nil, "polyfills eval: " .. tostring(err1) end

    -- ── Inject real system info into the systeminfo polyfill ──
    M.inject_system_info(ctx)

    local ok2, err2 = pcall(ctx.eval, ctx, device_js, "<device>")
    if not ok2 then ctx:close(); return nil, "device eval: " .. tostring(err2) end

    -- Set VID/PID
    ctx:eval(string.format("device._vid = %d; device._pid = %d;",
        primary_hid.vid or 0, primary_hid.pid or 0))

    -- Eval user script
    local ok3, err3 = pcall(ctx.eval, ctx, meta.js_source, meta.source_path or "<script>")
    if not ok3 then ctx:close(); return nil, "script eval: " .. tostring(err3) end

    -- Apply ControllableParameters and force Canvas mode
    pcall(ctx.eval, ctx, SETUP_PARAMS_JS, "<setup-params>")

    return ctx
end

-------------------------------------------------------------------
-- Validation context (lightweight, no real HID I/O)
-------------------------------------------------------------------

--- Create a minimal QuickJS context for calling Validate().
---
---@param meta table  scanned script metadata
---@return userdata|nil  ctx
---@return string|nil    error
function M.create_validation(meta)
    local ctx = qjs.new({ memory_limit = 4 * 1024 * 1024 })

    -- Stub callbacks so bridge JS evals without errors
    ctx:set("_log",                    function() end)
    ctx:set("_pause",                  function() end)
    ctx:set("_hid_write",             function() return 0 end)
    ctx:set("_hid_read",              function() return {} end)
    ctx:set("_hid_send_report",       function() return 0 end)
    ctx:set("_hid_get_report",        function() return {} end)
    ctx:set("_hid_set_endpoint",      function() return false end)
    ctx:set("_hid_get_endpoints",     function() return {} end)
    ctx:set("_hid_flush",             function() return 0 end)
    ctx:set("_hid_get_last_read_size",function() return 0 end)

    local ok1, err1 = pcall(ctx.eval, ctx, polyfills_js, "<polyfills-validate>")
    if not ok1 then ctx:close(); return nil, tostring(err1) end

    local ok2, err2 = pcall(ctx.eval, ctx, device_js, "<device-validate>")
    if not ok2 then ctx:close(); return nil, tostring(err2) end

    local ok3, err3 = pcall(ctx.eval, ctx, meta.js_source, "<validate>")
    if not ok3 then ctx:close(); return nil, tostring(err3) end

    return ctx
end

-- ---------------------------------------------------------------------------
-- System info injection: replace polyfill stubs with real data from ext.system
-- ---------------------------------------------------------------------------

local _sysinfo_js_cache = nil

--- Build a JS string literal, escaping backslashes and quotes.
local function js_str(s)
    if type(s) ~= "string" then return '""' end
    return '"' .. s:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', '\\n') .. '"'
end

local function clean_sysinfo_string(value)
    if type(value) ~= "string" then return "" end
    return value:gsub("%z", ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function build_sysinfo_js()
    if _sysinfo_js_cache then return _sysinfo_js_cache end

    local sys = ext and ext.system
    if not sys then
        _sysinfo_js_cache = ""
        return ""
    end

    local mb = sys.motherboard or {}
    local bios = sys.bios or {}
    local ram = sys.ram or {}
    local modules_parts = {}
    local motherboard_manufacturer = clean_sysinfo_string(mb.manufacturer)
    local motherboard_model = clean_sysinfo_string(mb.model)
    local motherboard_product = clean_sysinfo_string(mb.product)
    local bios_vendor = clean_sysinfo_string(bios.vendor)
    local bios_version = clean_sysinfo_string(bios.version)
    local bios_date = clean_sysinfo_string(bios.date)

    if ram.modules then
        for i = 1, #ram.modules do
            local m = ram.modules[i]
            modules_parts[#modules_parts + 1] = string.format(
                '{manufacturer:%s,partNumber:%s,capacityMb:%d,speedMhz:%d,formFactor:%s}',
                js_str(m.manufacturer), js_str(m.part_number),
                m.capacity_mb or 0, m.speed_mhz or 0, js_str(m.form_factor)
            )
        end
    end

    _sysinfo_js_cache = string.format([[
systeminfo = {
    GetMotherboardInfo: function() { return {manufacturer:%s, model:%s, product:%s, vendor:%s}; },
    GetBiosInfo:        function() { return {vendor:%s, version:%s, date:%s, releaseDate:%s}; },
    GetRamInfo:         function() { return {totalMemory:%d, modules:[%s]}; }
};
]],
        js_str(motherboard_manufacturer),
        js_str(motherboard_model),
        js_str(motherboard_product),
        js_str(motherboard_manufacturer),
        js_str(bios_vendor),
        js_str(bios_version),
        js_str(bios_date),
        js_str(bios_date),
        ram.total_memory_mb or 0, table.concat(modules_parts, ",")
    )

    return _sysinfo_js_cache
end

--- Inject real system info into a QuickJS context (overrides polyfill stubs).
function M.inject_system_info(ctx)
    local js = build_sysinfo_js()
    if js ~= "" then
        pcall(ctx.eval, ctx, js, "<systeminfo>")
    end
end

return M
