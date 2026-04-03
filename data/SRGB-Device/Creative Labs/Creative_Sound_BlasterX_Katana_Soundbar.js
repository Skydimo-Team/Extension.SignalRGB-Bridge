export function Name() { return "Sound BlasterX Katana"; }
export function VendorId() { return 0x041E; }
export function ProductId() { return 0x3247; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation() { return "troubleshooting/creative-labs"; }
export function Size() { return [7, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [10, 100];}
export function DefaultScale(){return 2.0;}
export function DeviceType(){return "speakers";}
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
const vKeyNames = ["Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7"];


const vKeyPositions = [ [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0] ];

export function Initialize() {
	/*
	Remote LED button - any mode on remote when SignalRGB is running if no reaction hardware mode is active, switch to another LED mode (push the button again).
	Using Sound Blaster Connect 2 to set lighting to Mood, or Single (Mood recommended) all other modes will block SignalRGB.
	*/
}

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
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
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x5a;
	packet[0x02] = 0x3a;
	packet[0x03] = 0x21;
	packet[0x04] = 0x0a;
	packet[0x05] = 0x00;
	packet[0x06] = 0x03;
	packet[0x07] = 0x01;
	packet[0x08] = 0x02;

	 for(let iIdx = 0; iIdx < vKeyPositions.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let col;
		const offset = 9 + iIdx * 4;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		packet[offset] = 0xFF; //Le magic brightness byte.
		packet[offset + 1] = col[2];
		packet[offset + 2] = col[1];
		packet[offset + 3] = col[0];
	}

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
	return endpoint.interface === 4;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/creative-labs/audio/sound-blaster-x-katana.png";
}