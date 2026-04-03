import serial from "@SignalRGB/serial";
export function Name() { return "HYTE CNVS"; }
export function VendorId() { return 0x3402; }
export function ProductId() { return [0x0B00, 0x0B01]; }
export function Publisher() { return "0xGoldstar"; }
export function Documentation(){ return "troubleshooting/hyte"; }
export function Size() { return [22, 7]; }
export function Type() { return "serial"; }
export function DeviceType(){return "mousepad";}
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/hyte/mousepads/cnvs.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

const vLedPositions = [
    [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], [7,0], [8,0], [9,0], [10,0], [11,0], [12,0], [13,0], [14,0], [15,0], [16,0], [17,0], [18,0], [19,0], [20,0],
    [21,1],[21,2],[21,3],[21,4],[21,5],
    [20,6], [19,6], [18,6], [17,6], [16,6], [15,6], [14,6], [13,6], [12,6], [11,6], [10,6], [9,6], [8,6], [7,6], [6,6], [5,6], [4,6], [3,6], [2,6], [1,6],
    [0,5], [0,4], [0,3], [0,2], [0,1]
];

const vLedNames = [
    "LED 1","LED 2","LED 3","LED 4","LED 5","LED 6","LED 7","LED 8","LED 9","LED 10","LED 11","LED 12","LED 13","LED 14","LED 15","LED 16","LED 17","LED 18","LED 19","LED 20",
    "LED 21","LED 22","LED 23","LED 24",
    "LED 25","LED 26","LED 27","LED 28","LED 29","LED 30","LED 31","LED 32","LED 33","LED 34","LED 35","LED 36","LED 37","LED 38","LED 39","LED 40","LED 41","LED 42","LED 43","LED 44","LED 45",
    "LED 46","LED 47","LED 48","LED 49","LED 50"
];

export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }

// color header
const COLOR_HEADER = [0xFF, 0xEE, 0x02, 0x01, 0x00, 0x32, 0x00];
let cnvsPortName = null;

// init serial connection
export function Initialize() {
    const ports = serial.availablePorts();
    if (!ports.length) {
        console.log("No serial ports detected.");
        return;
    }

    cnvsPortName = ports.find(p =>
        p.vendorId === 0x3402 && (p.productId === 0x0B00 || p.productId === 0x0B01)
    )?.portName;

    if (!cnvsPortName) {
        console.log("CNVS device not found.");
        return;
    }

    // attempt to connect to cnvs
    connectToCNVS();
}

// renders colors
export function Render() {
    // automatic reconnect if disconnected
    if (!serial.isConnected()) {
        console.log("Serial port not connected, attempting reconnect...");
        connectToCNVS();
    }

    sendColors();
}

// shut down colors
export function Shutdown(SystemSuspending) {
    if (!cnvsPortName) return;

    const color = SystemSuspending ? "#000000" : shutdownColor;

    serial.write([0xFF, 0xDC, 0x08]);
    sendColors(color);

    disconnect();
}

function connectToCNVS() {
    if (!cnvsPortName) return false;

    if (serial.isConnected()) return true;

    const connected = serial.connect({
        portName: cnvsPortName,
        baudRate: 115200,
        parity: "None",
        dataBits: 8,
        stopBits: "One"
    });

    if (!connected) {
        console.log("Failed to connect to CNVS.");
        return false;
    }

    console.log("Connected to CNVS on port", cnvsPortName);
    const info = serial.getDeviceInfo(cnvsPortName);
    console.log("Device Info:", info);

    // handshake
    serial.write([0xFF, 0xDC, 0x05, 0x00]);

    return true;
}

function disconnect() {
    if (serial.isConnected()) {
        serial.disconnect();
        console.log("Disconnected from serial port");
    }
}

// grabs colors and sends
function sendColors(overrideColor) {
    if (!cnvsPortName) return;
    if (!serial.isConnected()) {
        console.warn("Serial port not connected, skipping color write");
        return;
    }

    const RGBData = [];

    for (let i = 0; i < vLedPositions.length; i++) {
        const [x, y] = vLedPositions[i];
        let color;

        if (overrideColor) color = hexToRgb(shutdownColor);
        else if (LightingMode === "Forced") color = hexToRgb(forcedColor);
        else color = device.color(x, y);

        // CNVS needs it in GRB, not RGB
        RGBData.push(Math.floor(color[1] * 0.70));
        RGBData.push(Math.floor(color[0] * 0.70));
        RGBData.push(Math.floor(color[2] * 0.70));
    }

    const packet = [...COLOR_HEADER, ...RGBData];
    const success = serial.write(packet);

    if (!success) console.error("Failed to write LED colors");
}

// Convert hex string to RGB array
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ];
}
