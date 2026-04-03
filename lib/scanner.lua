--- lib/scanner.lua
--- Scans and parses SignalRGB JS device scripts to extract metadata.
--- Strips ES module syntax and evaluates via QuickJS to read metadata.

local qjs   = require("quickjs")
local utils = require("lib.utils")

local M = {}

--- Load scan stubs JS from file (once, at require time).
local scan_stubs_js, device_js
do
    local path = utils.PLUGIN_DIR .. "/js/scan_stubs.js"
    local src, err = utils.read_file(path)
    if not src then
        error("Failed to load scan stubs: " .. (err or path))
    end
    scan_stubs_js = src

    local device_path = utils.PLUGIN_DIR .. "/js/device.js"
    local device_src, device_err = utils.read_file(device_path)
    if not device_src then
        error("Failed to load device bridge: " .. (device_err or device_path))
    end
    device_js = device_src
end

--- Preprocess a JS source string: strip import/export statements and
--- convert them to plain declarations so the script can be eval'd as a
--- global (non-module) script.
---@param src string  raw JS source
---@return string     preprocessed source
function M.preprocess(src)
    -- Remove import declarations
    src = src:gsub('import%s+%b{}%s+from%s+"[^"]*"%s*;?', "")
    src = src:gsub("import%s+%b{}%s+from%s+'[^']*'%s*;?", "")
    src = src:gsub('import%s+%S+%s+from%s+"[^"]*"%s*;?', "")
    src = src:gsub("import%s+%S+%s+from%s+'[^']*'%s*;?", "")

    -- Strip "export" prefix from declarations
    src = src:gsub("export%s+function%s+",  "function ")
    src = src:gsub("export%s+class%s+",     "class ")
    src = src:gsub("export%s+const%s+",     "const ")
    src = src:gsub("export%s+let%s+",       "let ")
    src = src:gsub("export%s+var%s+",       "var ")
    src = src:gsub("export%s+default%s+",   "")

    return src
end

--- Read a JS file, preprocess it, and extract device metadata via QuickJS.
---@param path string  filesystem path to the .js file
---@return table|nil   metadata table, or nil on error
---@return string|nil  error message
function M.scan_file(path)
    local src, read_err = utils.read_file(path)
    if not src then return nil, read_err end

    -- Must define a Name function
    if not src:find("function%s+Name") then
        return nil, "no Name() function found"
    end

    local js_src = M.preprocess(src)
    local ctx = qjs.new({ memory_limit = 8 * 1024 * 1024 })

    -- Inject scan stubs so top-level globals and callback hooks exist.
    local ok_stubs, stubs_err = pcall(ctx.eval, ctx, scan_stubs_js, "<scan-stubs>")
    if not ok_stubs then
        ctx:close()
        return nil, "stubs eval error: " .. tostring(stubs_err)
    end

    -- Reuse the canonical runtime device model during scan so metadata
    -- extraction stays aligned with the actual bridge behavior.
    local ok_device, device_err = pcall(ctx.eval, ctx, device_js, "<scan-device>")
    if not ok_device then
        ctx:close()
        return nil, "device eval error: " .. tostring(device_err)
    end

    local ok, eval_err = pcall(ctx.eval, ctx, js_src, path)
    if not ok then
        ctx:close()
        return nil, "eval error: " .. tostring(eval_err)
    end

    -- ── Extract metadata via global function calls ──────────

    local function try_call(fn_name)
        local cok, val = pcall(ctx.call, ctx, fn_name)
        return cok and val or nil
    end

    local meta = { source_path = path }

    meta.name = try_call("Name")
    if type(meta.name) ~= "string" or meta.name == "" then
        ctx:close()
        return nil, "Name() did not return a string"
    end

    local vid = try_call("VendorId")
    if type(vid) == "number" then
        meta.vid = math.floor(vid)
    end

    local pid_raw = try_call("ProductId")
    if type(pid_raw) == "number" then
        meta.pids = { math.floor(pid_raw) }
    elseif type(pid_raw) == "table" then
        meta.pids = {}
        for _, v in pairs(pid_raw) do
            local n = tonumber(v)
            if n then meta.pids[#meta.pids + 1] = math.floor(n) end
        end
    end

    local size = try_call("Size")
    if type(size) == "table" then
        meta.width  = size[1] or 1
        meta.height = size[2] or 1
    else
        meta.width, meta.height = 1, 1
    end

    meta.device_type = try_call("DeviceType") or "unknown"
    meta.publisher   = try_call("Publisher")
    meta.image_url   = try_call("ImageUrl")

    local led_names = try_call("LedNames")
    if type(led_names) == "table" then meta.led_names = led_names end

    local led_positions = try_call("LedPositions")
    if type(led_positions) == "table" then meta.led_positions = led_positions end

    meta.has_validate = (ctx:get("Validate") ~= nil)

    local params = try_call("ControllableParameters")
    if type(params) == "table" then meta.controllable_params = params end

    -- Store preprocessed source for runtime
    meta.js_source = js_src

    ctx:close()
    return meta
end

--- Scan all .js files in a directory tree.
---@param base_dir string  root scan directory
---@param log_fn function  logging callback(msg)
---@return table  array of { meta=... } or { error=... }
function M.scan_directory(base_dir, log_fn)
    log_fn = log_fn or function() end
    local results = {}

    local cmd
    if package.config:sub(1, 1) == "\\" then
        cmd = 'dir /s /b "' .. base_dir .. '\\*.js" 2>nul'
    else
        cmd = 'find "' .. base_dir .. '" -name "*.js" -type f 2>/dev/null'
    end

    local handle = io.popen(cmd)
    if not handle then
        log_fn("Failed to list directory: " .. base_dir)
        return results
    end

    for line in handle:lines() do
        local path = line:match("^%s*(.-)%s*$")
        if path and #path > 0 then
            local meta, err = M.scan_file(path)
            if meta then
                results[#results + 1] = { meta = meta }
                log_fn("  scanned: " .. meta.name .. " (VID="
                    .. string.format("0x%04X", meta.vid or 0) .. ")")
            else
                results[#results + 1] = { error = path .. ": " .. (err or "?") }
            end
        end
    end
    handle:close()

    return results
end

return M
