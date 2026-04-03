--- lib/endpoint.lua
--- HID endpoint path normalisation, collection, opening, and matching.

local M = {}

--- Format an endpoint key from interface/usage/usage_page.
---@return string  e.g. "0:1:65281"
function M.make_key(iface, usage, usage_page)
    return string.format("%d:%d:%d", iface or 0, usage or 0, usage_page or 0)
end

--- Make a key from a HID info table.
---@param hid table  { interface_number, usage, usage_page }
---@return string
function M.key_of(hid)
    return M.make_key(
        hid.interface_number or 0,
        hid.usage or 0,
        hid.usage_page or 0)
end

--- Normalise a Windows HID path so that all interfaces of the same
--- physical device map to the same group key.
---@param path string|nil
---@return string
function M.normalize_path(path)
    if not path or path == "" then return "" end
    local vid_pid = path:upper():match("VID_%x+&PID_%x+")
    if not vid_pid then return path end
    local instance = path:match("#(%x+&%x+)#")
    return instance and (vid_pid .. "#" .. instance) or vid_pid
end

--- Collect all HID endpoints belonging to the same physical device.
---@param primary_hid table  primary HID device info
---@return table<string, table>  key → hid info
function M.collect(primary_hid)
    local group = M.normalize_path(primary_hid.path)
    local endpoints = {}
    endpoints[M.key_of(primary_hid)] = primary_hid

    local ok, all_hid = pcall(ext.hid_enumerate, primary_hid.vid, primary_hid.pid)
    if not ok then return endpoints end

    for _, hid in ipairs(all_hid) do
        if group ~= "" and M.normalize_path(hid.path) == group then
            local key = M.key_of(hid)
            if not endpoints[key] then
                endpoints[key] = hid
            end
        end
    end

    return endpoints
end

--- Open all endpoints for the same physical device.
--- Returns a handle map (key → handle) and an array of endpoint descriptors.
---@param primary_handle userdata  already-opened HID handle
---@param primary_hid table       primary HID device info
---@return table<string, userdata> handles
---@return table[]                 descriptors
function M.open_all(primary_handle, primary_hid)
    local ep_infos = M.collect(primary_hid)
    local primary_key = M.key_of(primary_hid)
    local handles = { [primary_key] = primary_handle }
    local descriptors = {}

    for key, ep in pairs(ep_infos) do
        descriptors[#descriptors + 1] = {
            interface  = ep.interface_number or 0,
            usage      = ep.usage or 0,
            usage_page = ep.usage_page or 0,
            collection = 0,
        }
        if key ~= primary_key then
            local ok, handle = pcall(ext.hid_open_path, ep.path)
            if ok and handle then
                handles[key] = handle
                ext.log("[SRGB] Opened endpoint " .. key .. "  path=" .. ep.path)
            end
        end
    end

    return handles, descriptors
end

--- Find a matching endpoint handle using 3-pass decreasing strictness.
---
--- Pass 1: exact match on (interface, usage, usage_page).
--- Pass 2: same interface + same usage, vendor-defined pages treated as equal.
--- Pass 3: ignore interface, match on usage + page only.
---
---@param ep_handles table<string, userdata>
---@param iface number
---@param usage number
---@param usage_page number
---@return userdata|nil
function M.find(ep_handles, iface, usage, usage_page)
    local exact_key = M.make_key(iface, usage, usage_page)
    if ep_handles[exact_key] then return ep_handles[exact_key] end

    local function pages_compatible(a, b)
        return a == b or (a >= 0xFF00 and b >= 0xFF00)
    end

    -- Pass 2: same interface + usage, flexible page
    local match, count = nil, 0
    for k, h in pairs(ep_handles) do
        local ki, ku, kp = k:match("^(-?%d+):(-?%d+):(-?%d+)$")
        ki, ku, kp = tonumber(ki), tonumber(ku), tonumber(kp)
        if ki == iface and ku == usage and pages_compatible(kp, usage_page) then
            match, count = h, count + 1
        end
    end
    if count == 1 then return match end

    -- Pass 3: ignore interface
    match, count = nil, 0
    for k, h in pairs(ep_handles) do
        local _, ku, kp = k:match("^(-?%d+):(-?%d+):(-?%d+)$")
        ku, kp = tonumber(ku), tonumber(kp)
        if ku == usage and pages_compatible(kp, usage_page) then
            match, count = h, count + 1
        end
    end
    if count == 1 then return match end

    return nil
end

return M
