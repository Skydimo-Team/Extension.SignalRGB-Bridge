export function Name() { return "Logitech X56 H.O.T.A.S. Stick"; }
export function VendorId() { return 0x0738; }
export function ProductId() { return 0x2221; }
export function Publisher() { return "Franco Roura"; }
export function Size() { return [1, 1]; }
export function Type() { return "HID"; }
export function ConflictingProcesses() {
	return ["HUD.exe"];
}
export function DeviceType(){return "other";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default": "#009bde" },
	];
}

const vLeds = [
	0
];

const vLedNames = [
	"Led 1"
];

const vLedPositions = [
	[0, 0]
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	device.set_endpoint(0x02, 0x0001, 0xff00);

	const packet = [0x09, 0x00, 0x03];

	let color;

	if(overrideColor){
		color = hexToRgb(overrideColor);
	}else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	}else{
		color = device.color(0, 0);
	}

	packet.push(...color);
	device.send_report(packet, 64);

	device.set_endpoint(0x00, 0x0004, 0x0001);
	device.send_report([0x01, 0x01], 64);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return (endpoint.interface === 2 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00) ||
            (endpoint.interface === 0 && endpoint.usage === 0x0004 && endpoint.usage_page === 0x0001);
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/logitech/misc/x56-joystick.png";
}