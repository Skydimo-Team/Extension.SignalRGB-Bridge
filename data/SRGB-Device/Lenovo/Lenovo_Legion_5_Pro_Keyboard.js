export function Name() { return "Lenovo Legion 5 Pro Keyboard"; }
export function VendorId() { return 0x048d; }
export function ProductId() { return [0xC975, 0xc965, 0xc955]; }
export function Version() { return "1.0.0"; }
export function Publisher() { return "RickOfficial"; }
export function Size() { return [4, 1]; }
export function DefaultPosition(){return [0, 0]; }
export function DefaultScale(){return 29.9; }
export function DeviceType(){return "keyboard"}
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

const vLedNames = [
	"LED1",
	"LED2",
	"LED3",
	"LED4"
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0]
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

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function sendColors(overrideColor) {
	let packet = [0xcc, 0x16, 0x01, 0x01, 0x02];

	for(let iIdx = 0; iIdx < 4; iIdx++){
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		packet = packet.concat(color);
	}

	device.send_report(packet, 33);
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
	return endpoint.usage_page === 0xff89;
}

export function ImageUrl() {
	return "https://marketplace.signalrgb.com/devices/brands/lenovo/misc/legion_5.png";
}