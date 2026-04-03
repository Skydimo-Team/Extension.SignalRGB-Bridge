export function Name() { return "Roccat Kone XP Air Dock"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2cb8; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [2, 2]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "other";}
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

const vLedNames = [ "Front Left", "Back Left", "Back Right", "Front Right" ];
const vLedPositions = [ [0, 0], [0, 1], [1, 1], [1, 0] ];


export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

	device.send_report([ 0x02, 0x00, 0x09, 0x12, 0xfa, 0x00, 0xff, 0x00, 0x00, 0xff, 0x09, 0x12, 0xfa, 0x00, 0xff, 0x7d, 0x00, 0xff, 0x09, 0x12, 0xfa, 0x00, 0xff, 0xff, 0x00, 0xff, 0x09, 0x12, 0xfa, 0x00, 0x7d, 0xff, 0x00, 0xff, 0x00, 0x00, 0x01, 0xff, 0x00 ], 39);
	device.send_report([0x01, 0xff, 0xff], 5);
}

export function Render() {
	sendZone();

}

export function Shutdown() {
	sendZone(true);
}

function sendZone(shutdown = false) {
	const packet = [0x03];

	for(let iIdx = 0; iIdx < 4; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}
		const ledIdx = iIdx * 4 + 1;
		packet[ledIdx] = col[0];
		packet[ledIdx + 1] = col[1];
		packet[ledIdx + 2] = col[2];
		packet[ledIdx + 3] = 0xff;

	}

	device.send_report(packet, 17);
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
	return endpoint.interface === 0 && endpoint.usage === 0x0001;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/roccat/misc/kone-xp-air-dock.png";
}