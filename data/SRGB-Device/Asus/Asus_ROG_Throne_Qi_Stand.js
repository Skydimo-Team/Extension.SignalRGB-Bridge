export function Name() { return "Asus ROG Throne"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return [0x18C5, 0x18D9]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [5, 7]; }
export function DefaultPosition(){return [10, 100]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mousepad"}

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

export function Initialize() {

}

const vLedNames = [ "Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18" ];
const vLedPositions = [ [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [3, 0]  ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function grabColors(overrideColor) {
	const rgbdata = [];

	for(let iIdx = 0; iIdx < 18; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = iIdx * 4;
		rgbdata[iLedIdx] = 0x00;
		rgbdata[iLedIdx+1] = color[0];
		rgbdata[iLedIdx+2] = color[1];
		rgbdata[iLedIdx+3] = color[2];
	}

	return rgbdata;
}

function sendColors(overrideColor) {
	const rgbdata = grabColors(overrideColor);

	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0xC0;
	packet[2] = 0x81;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet = packet.concat(rgbdata.splice(0, 60));
	device.write(packet, 65);

	packet = [];
	packet[0] = 0x00;
	packet[1] = 0xC0;
	packet[2] = 0x81;
	packet[3] = 0x01;
	packet[4] = 0x00;
	packet = packet.concat(rgbdata.splice(0, 12));
	device.write(packet, 65);

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
	return endpoint.interface === 0;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/asus/misc/throne-qi.png";
}