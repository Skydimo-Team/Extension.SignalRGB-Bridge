export function Name() { return "Corsair HS80 RGB Wired Gaming Headset"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x0a88; }
export function Publisher() { return "FeuerSturm"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [10, 100]; }
export function DefaultScale(){return 25.0;}
export function Type() { return "Hid"; }
export function DeviceType(){return "headphones"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
export function Documentation(){ return "troubleshooting/corsair"; }

const vLedNames = ["Logo"];
const vLedPositions = [ [0, 0] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function sendColors(overrideColor) {
	let mxPxColor;
	const packet = new Array(16).fill(0x00);

	const iPxX = vLedPositions[0][0];
	const iPxY = vLedPositions[0][1];

	if(overrideColor) {
		mxPxColor = hexToRgb(overrideColor);
	} else if (LightingMode === "Forced") {
		mxPxColor = hexToRgb(forcedColor);
	} else {
		mxPxColor = device.color(iPxX, iPxY);
	}

	packet[0] = 0xcb;
	packet[1] = 0x03;
	packet[2] = 0x1c;
	packet[3] = mxPxColor[0];
	packet[4] = 0x16;
	packet[5] = mxPxColor[1];
	packet[6] = 0x17;
	packet[7] = mxPxColor[2];
	device.write(packet, 16);
}

export function Initialize() {
}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function Validate(endpoint) {
	return endpoint.interface === 3 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFFC5;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/audio/headset-render.png";
}