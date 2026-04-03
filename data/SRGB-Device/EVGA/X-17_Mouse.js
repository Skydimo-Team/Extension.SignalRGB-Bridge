export function Name() { return "EVGA X17 Mouse"; }
export function VendorId() { return 0x3842; }
export function ProductId() { return 0x240D; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/evga"; }
export function Size() { return [4, 4]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mouse"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = ["Front Left", "Front Right", "Scroll Wheel", "Logo", ];
const vLedPositions = [ [1, 0], [3, 0], [2, 1], [2, 3] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

}

export function Render() {
	sendColors(1);
	sendColors(2);
	Apply(1);
	Apply(2);
}

export function Shutdown(SystemSuspending) {

	const color = SystemSuspending ? "#000000" : shutdownColor;

	sendColors(1, color);
	sendColors(2, color);
	Apply(1);
	Apply(2);

}

function sendColors(zone, overrideColor) {
	const packet = [0x07, 0xEA, zone, 0x02];

	for(let iIdx = 0; iIdx < 4; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode == "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = 4 + iIdx * 4;
		packet[iLedIdx] = 0xff;
		packet[iLedIdx+1] = color[0];
		packet[iLedIdx+2] = color[1];
		packet[iLedIdx+3] = color[2];
	}

	packet[20] = 0x01;
	packet[21] = 0x01;
	packet[22] = 0x01;
	packet[23] = 0x01;

	device.send_report(packet, 40);
	device.get_report(packet, 40);
}

function Apply(zone) {
	const packet = [0x07, 0xEA, zone, 0x01, 0x01, 0x01, 0x01, 0x01];
	device.send_report(packet, 40);
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
	return endpoint.interface === 1 && endpoint.usage === 0x004b && endpoint.usage_page === 0x0008;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/evga/mice/x-17.png";
}