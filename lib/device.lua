--- lib/device.lua
--- Device lifecycle management: registration, topology sync, shutdown.

local utils = require("lib.utils")
local endpoint = require("lib.endpoint")
local context = require("lib.context")
local dtypes = require("lib.device_types")

local M = {}

local devices = {}
local registered_ports = {}
local change_listener = nil

local function notify_change(kind, state)
    if type(change_listener) ~= "function" then
        return
    end

    local ok, err = pcall(change_listener, kind, state)
    if not ok then
        ext.log("[SRGB] Device change listener failed: " .. tostring(err))
    end
end

function M.set_change_listener(listener)
    change_listener = listener
end

function M.get(port)
    return devices[port]
end

function M.all()
    return devices
end

function M.open_groups()
    local groups = {}
    for _, state in pairs(devices) do
        groups[endpoint.normalize_path(state.hid_info.path)] = true
    end
    return groups
end

local function as_string(value, fallback)
    if type(value) == "string" and value ~= "" then
        return value
    end
    return fallback
end

local function as_number(value, fallback)
    local num = tonumber(value)
    if not num then return fallback end
    return num
end

local function derive_manufacturer_from_name(device_name)
    if type(device_name) ~= "string" then
        return "SignalRGB"
    end

    local trimmed = device_name:match("^%s*(.-)%s*$") or ""
    if trimmed == "" then
        return "SignalRGB"
    end

    return trimmed:match("^(%S+)") or trimmed
end

local function clone_allowed_total_leds(values)
    if type(values) ~= "table" or #values == 0 then return nil end
    local cloned = {}
    for i, value in ipairs(values) do
        local num = tonumber(value)
        if num and num >= 0 then
            cloned[#cloned + 1] = math.floor(num)
        end
    end
    if #cloned == 0 then return nil end
    return cloned
end

local function clone_positions(values)
    if type(values) ~= "table" then return {} end
    local positions = {}
    for _, pos in ipairs(values) do
        if type(pos) == "table" then
            local x = tonumber(pos[1] or pos.x)
            local y = tonumber(pos[2] or pos.y)
            if x and y then
                positions[#positions + 1] = { x = math.floor(x), y = math.floor(y) }
            end
        end
    end
    return positions
end

local function build_matrix_from_positions(width, height, positions)
    width = math.max(1, math.floor(as_number(width, 1)))
    height = math.max(1, math.floor(as_number(height, 1)))

    if width <= 1 or height <= 1 then
        return nil
    end

    if type(positions) ~= "table" or #positions == 0 then
        return dtypes.build_matrix({ width = width, height = height })
    end

    local map = {}
    for i = 1, width * height do
        map[i] = -1
    end

    for led_index, pos in ipairs(positions) do
        local x = tonumber(pos.x or pos[1])
        local y = tonumber(pos.y or pos[2])
        if x and y and x >= 0 and x < width and y >= 0 and y < height then
            map[y * width + x + 1] = led_index - 1
        end
    end

    return {
        width = width,
        height = height,
        map = map,
    }
end

local function matrix_equals(lhs, rhs)
    if lhs == nil and rhs == nil then return true end
    if lhs == nil or rhs == nil then return false end
    if lhs.width ~= rhs.width or lhs.height ~= rhs.height then return false end

    local lhs_map = lhs.map or {}
    local rhs_map = rhs.map or {}
    if #lhs_map ~= #rhs_map then return false end
    for i = 1, #lhs_map do
        if lhs_map[i] ~= rhs_map[i] then
            return false
        end
    end
    return true
end

local function list_equals(lhs, rhs)
    lhs = lhs or {}
    rhs = rhs or {}
    if #lhs ~= #rhs then return false end
    for i = 1, #lhs do
        if lhs[i] ~= rhs[i] then
            return false
        end
    end
    return true
end

local function slugify(value)
    value = tostring(value or ""):lower()
    value = value:gsub("[^%w]+", "-")
    value = value:gsub("%-+", "-")
    value = value:gsub("^%-+", "")
    value = value:gsub("%-+$", "")
    if value == "" then
        return "output"
    end
    return value
end

local function next_output_id(base, used_ids)
    local slug = slugify(base)
    local candidate = slug
    local suffix = 2
    while used_ids[candidate] do
        candidate = string.format("%s-%d", slug, suffix)
        suffix = suffix + 1
    end
    used_ids[candidate] = true
    return candidate
end

local function capture_runtime_topology(ctx, meta, force)
    local ok, raw = pcall(ctx.call, ctx, "__srgb_take_topology_update", force == true)
    if not ok then
        return nil, tostring(raw)
    end

    if raw == false and not force then
        return false
    end

    if type(raw) ~= "table" then
        return nil, "topology export returned " .. type(raw)
    end

    local main = type(raw.main) == "table" and raw.main or {}
    local width = math.max(1, math.floor(as_number(main.width, meta.width or 1)))
    local height = math.max(1, math.floor(as_number(main.height, meta.height or 1)))

    local topology = {
        name = as_string(raw.name, meta.name),
        image_url = as_string(raw.image_url, meta.image_url),
        total_led_limit = math.max(0, math.floor(as_number(raw.total_led_limit, 0))),
        main = {
            width = width,
            height = height,
            led_count = math.max(0, math.floor(as_number(main.led_count, 0))),
            canvas_led_count = math.max(0, math.floor(as_number(main.canvas_led_count, width * height))),
            led_positions = clone_positions(main.led_positions),
        },
        channels = {},
        subdevices = {},
    }

    if type(raw.channels) == "table" then
        for _, channel in ipairs(raw.channels) do
            if type(channel) == "table" then
                topology.channels[#topology.channels + 1] = {
                    name = as_string(channel.name, "Channel"),
                    led_count = math.max(0, math.floor(as_number(channel.led_count, 0))),
                    led_limit = math.max(0, math.floor(as_number(channel.led_limit, 0))),
                }
            end
        end
    end

    if type(raw.subdevices) == "table" then
        for _, subdevice in ipairs(raw.subdevices) do
            if type(subdevice) == "table" then
                local sub_width = math.max(1, math.floor(as_number(subdevice.width, 1)))
                local sub_height = math.max(1, math.floor(as_number(subdevice.height, 1)))
                local positions = clone_positions(subdevice.led_positions)
                local inferred_led_count = #positions
                if inferred_led_count == 0 and type(subdevice.led_names) == "table" then
                    inferred_led_count = #subdevice.led_names
                end
                topology.subdevices[#topology.subdevices + 1] = {
                    name = as_string(subdevice.name, "Subdevice"),
                    display_name = as_string(subdevice.display_name, as_string(subdevice.name, "Subdevice")),
                    width = sub_width,
                    height = sub_height,
                    led_count = math.max(0, math.floor(as_number(subdevice.led_count, inferred_led_count))),
                    led_positions = positions,
                }
            end
        end
    end

    return topology
end

local function is_runtime_topology_dirty(ctx)
    local ok, dirty = pcall(ctx.call, ctx, "__srgb_is_topology_dirty")
    if not ok then
        return nil, tostring(dirty)
    end
    return dirty ~= false
end

local function build_registration(state, topology)
    local used_ids = { main = true }
    local outputs = {}
    local output_targets = {}
    local has_dynamic = (#topology.channels > 0) or (#topology.subdevices > 0)

    local function add_output(spec, target)
        outputs[#outputs + 1] = spec
        output_targets[spec.id] = target
    end

    local device_name = as_string(topology.name, state.meta.name or "SignalRGB Device")
    local image_url = as_string(topology.image_url, state.meta.image_url)

    local main_output_id = nil
    local main_matrix = nil
    local main_width = topology.main.width

    local main_led_count = topology.main.led_count
    local main_output_leds = main_led_count

    if main_led_count > 0 then
        main_matrix = build_matrix_from_positions(
            topology.main.width,
            topology.main.height,
            topology.main.led_positions
        )
    elseif not has_dynamic then
        main_output_leds = topology.main.canvas_led_count
        if main_output_leds <= 0 then main_output_leds = 1 end
        main_matrix = dtypes.build_matrix({
            width = topology.main.width,
            height = topology.main.height,
        })
    end

    if main_output_leds > 0 then
        main_output_id = "main"
        add_output({
            id = main_output_id,
            name = has_dynamic and "Main" or device_name,
            output_type = main_matrix and "matrix"
                or (main_output_leds <= 1 and "single" or "linear"),
            leds_count = main_output_leds,
            matrix = main_matrix,
            editable = false,
            min_total_leds = main_output_leds,
            max_total_leds = main_output_leds,
        }, {
            kind = "main",
        })
        main_width = main_matrix and main_matrix.width or topology.main.width
    end

    for _, channel in ipairs(topology.channels) do
        local max_leds = math.max(channel.led_limit, channel.led_count)
        local output_id = next_output_id("channel-" .. channel.name, used_ids)
        add_output({
            id = output_id,
            name = channel.name,
            output_type = max_leds <= 1 and "single" or "linear",
            leds_count = channel.led_count,
            editable = true,
            min_total_leds = 0,
            max_total_leds = max_leds,
        }, {
            kind = "channel",
            name = channel.name,
        })
    end

    for _, subdevice in ipairs(topology.subdevices) do
        local matrix = build_matrix_from_positions(
            subdevice.width,
            subdevice.height,
            subdevice.led_positions
        )
        local output_id = next_output_id("subdevice-" .. subdevice.name, used_ids)
        add_output({
            id = output_id,
            name = subdevice.display_name,
            output_type = matrix and "matrix"
                or (subdevice.led_count <= 1 and "single" or "linear"),
            leds_count = subdevice.led_count,
            matrix = matrix,
            editable = false,
            min_total_leds = subdevice.led_count,
            max_total_leds = subdevice.led_count,
        }, {
            kind = "subdevice",
            name = subdevice.name,
        })
    end

    if #outputs == 0 then
        main_output_id = "main"
        add_output({
            id = "main",
            name = device_name,
            output_type = "single",
            leds_count = 1,
            editable = false,
            min_total_leds = 1,
            max_total_leds = 1,
        }, {
            kind = "main",
        })
        main_width = 1
        main_matrix = nil
    end

    local device_path = state.hid_info.path
    if type(device_path) ~= "string" or device_path == "" then
        device_path = "SignalRGB/" .. device_name
    end

    local device_info = {
        controller_port = state.controller_port,
        device_path = device_path,
        controller_id = utils.CONTROLLER_ID,
        manufacturer = derive_manufacturer_from_name(device_name),
        model = device_name,
        serial_id = state.hid_info.serial or "",
        description = "SignalRGB Bridge: " .. device_name,
        device_type = dtypes.resolve_category(state.meta.device_type),
        image_url = image_url,
        outputs = outputs,
    }

    return {
        topology = topology,
        device_name = device_name,
        image_url = image_url,
        outputs = outputs,
        output_targets = output_targets,
        main_output_id = main_output_id,
        main_matrix = main_matrix,
        main_width = main_width,
        device_info = device_info,
    }
end

local function output_shape_equals(lhs, rhs)
    return lhs.id == rhs.id
        and lhs.name == rhs.name
        and lhs.output_type == rhs.output_type
        and lhs.editable == rhs.editable
        and lhs.min_total_leds == rhs.min_total_leds
        and lhs.max_total_leds == rhs.max_total_leds
        and list_equals(lhs.allowed_total_leds, rhs.allowed_total_leds)
end

local function output_runtime_equals(lhs, rhs)
    return lhs.id == rhs.id
        and lhs.leds_count == rhs.leds_count
        and matrix_equals(lhs.matrix, rhs.matrix)
end

local function registration_shape_equals(lhs, rhs)
    if lhs.device_name ~= rhs.device_name or lhs.image_url ~= rhs.image_url then
        return false
    end
    if #lhs.outputs ~= #rhs.outputs then return false end
    for i = 1, #lhs.outputs do
        if not output_shape_equals(lhs.outputs[i], rhs.outputs[i]) then
            return false
        end
    end
    return true
end

local function registration_runtime_equals(lhs, rhs)
    if #lhs.outputs ~= #rhs.outputs then return false end
    for i = 1, #lhs.outputs do
        if not output_runtime_equals(lhs.outputs[i], rhs.outputs[i]) then
            return false
        end
    end
    return true
end

local function apply_registration_state(state, registration)
    state.registered = registration
    state.output_targets = registration.output_targets
    state.main_output_id = registration.main_output_id
    state.main_matrix = registration.main_matrix
    state.main_width = registration.main_width
    state.rt_name = registration.device_name
    state.rt_width = registration.topology.main.width
    state.rt_height = registration.topology.main.height
end

local function remove_from_core(state)
    local ok, err = pcall(ext.remove_extension_device, state.controller_port)
    if not ok then
        return nil, tostring(err)
    end
    return true
end

local function register_with_core(state, registration)
    local ok, err = pcall(ext.register_device, registration.device_info)
    if not ok then
        return nil, tostring(err)
    end
    apply_registration_state(state, registration)
    return true
end

local function update_output_in_core(state, output)
    local opts = {
        leds_count = output.leds_count,
    }
    if output.matrix then
        opts.matrix = output.matrix
    end

    local ok, err = pcall(ext.update_output, state.controller_port, output.id, opts)
    if not ok then
        return nil, tostring(err)
    end
    return true
end

function M.sync_topology(state, force)
    if not state or not state.js_ctx then
        return nil, "device state is not active"
    end

    if not force then
        local dirty, dirty_err = is_runtime_topology_dirty(state.js_ctx)
        if dirty == nil then
            return nil, dirty_err
        end
        if not dirty then
            return true, false
        end
    end

    local topology, topo_err = capture_runtime_topology(state.js_ctx, state.meta, force)
    if topology == false then
        return true, false
    end
    if not topology then
        return nil, topo_err
    end

    local registration = build_registration(state, topology)
    local current = state.registered

    if not current then
        local ok, err = register_with_core(state, registration)
        if not ok then
            return nil, err
        end
        return true, true
    end

    if not registration_shape_equals(current, registration) then
        local removed, remove_err = remove_from_core(state)
        if not removed then
            return nil, remove_err
        end

        state.registered = nil

        local ok, err = register_with_core(state, registration)
        if not ok then
            return nil, err
        end
        return true, true
    end

    if not registration_runtime_equals(current, registration) then
        for i = 1, #registration.outputs do
            local next_output = registration.outputs[i]
            local prev_output = current.outputs[i]
            if not output_runtime_equals(prev_output, next_output) then
                local updated, update_err = update_output_in_core(state, next_output)
                if not updated then
                    return nil, update_err
                end
            end
        end
    end

    apply_registration_state(state, registration)
    notify_change("updated", state)
    return true, true
end

function M.register(meta, primary_handle, primary_hid)
    local controller_port = utils.make_controller_port(primary_hid)
    local ep_handles, all_eps = endpoint.open_all(primary_handle, primary_hid)

    local ctx, ctx_err = context.create_runtime(
        meta,
        primary_handle,
        primary_hid,
        ep_handles,
        all_eps
    )
    if not ctx then
        ext.log("[SRGB] JS context failed for " .. (meta.name or "?")
            .. ": " .. (ctx_err or ""))
        for _, h in pairs(ep_handles) do
            pcall(ext.hid_close, h)
        end
        return nil
    end

    local init_ok, init_err = pcall(ctx.call, ctx, "Initialize")
    if not init_ok then
        ext.log("[SRGB] Initialize() failed for "
            .. (meta.name or "?") .. ": " .. tostring(init_err))
    end

    local state = {
        meta = meta,
        primary_handle = primary_handle,
        hid_info = primary_hid,
        ep_handles = ep_handles,
        js_ctx = ctx,
        controller_port = controller_port,
        output_targets = {},
        main_output_id = nil,
        main_matrix = nil,
        main_width = 1,
        registered = nil,
    }

    local ok, err = M.sync_topology(state, true)
    if not ok then
        ext.log("[SRGB] Topology export failed for "
            .. (meta.name or "?") .. ": " .. tostring(err))
        pcall(ctx.close, ctx)
        for _, h in pairs(ep_handles) do
            pcall(ext.hid_close, h)
        end
        return nil
    end

    devices[controller_port] = state
    registered_ports[#registered_ports + 1] = controller_port
    notify_change("registered", state)

    ext.log(string.format(
        "[SRGB] Registered: %s (%s) outputs=%d",
        state.rt_name or "?",
        controller_port,
        state.registered and #state.registered.outputs or 0
    ))

    return state
end

local function shutdown(state)
    if state.js_ctx then
        pcall(state.js_ctx.call, state.js_ctx, "Shutdown", false)
        pcall(state.js_ctx.close, state.js_ctx)
        state.js_ctx = nil
    end
    if state.ep_handles then
        for _, h in pairs(state.ep_handles) do
            pcall(ext.hid_close, h)
        end
        state.ep_handles = nil
    end
end

function M.remove(port)
    local state = devices[port]
    if not state then return end
    shutdown(state)
    pcall(ext.remove_extension_device, port)
    devices[port] = nil
    for idx, p in ipairs(registered_ports) do
        if p == port then
            table.remove(registered_ports, idx)
            break
        end
    end
    notify_change("removed", state)
end

function M.remove_all()
    local ports = {}
    for i, p in ipairs(registered_ports) do
        ports[i] = p
    end
    for _, port in ipairs(ports) do
        M.remove(port)
    end
    devices = {}
    registered_ports = {}
end

return M
