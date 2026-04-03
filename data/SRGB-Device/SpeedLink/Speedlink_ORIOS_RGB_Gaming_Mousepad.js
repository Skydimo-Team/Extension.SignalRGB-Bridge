export function Name() { return "Speedlink ORIOS RGB Gaming Mousepad"; }
export function VendorId() { return 0x0c45; }
export function ProductId() { return 0x763D; }
export function Publisher() { return "FeuerSturm"; }
export function Size() { return [4, 3]; }
export function DefaultPosition(){return [50, 50];}
export function DefaultScale(){return 28.0;}
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
export function ConflictingProcesses() { return ["ORIOS.exe"]; }

const vLedNames = [ "Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10" ];

const vLedPositions = [ [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0], [2, 0] ];

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
	device.pause(1);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function sendColors(overrideColor) {
	let color;
	const packet = [0x04, 0x00, 0x00, 0x12, 0x21];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}
		const mxPxColor = color;
		packet[8+(iIdx*3)] = mxPxColor[0];
		packet[8+(iIdx*3)+2] = mxPxColor[2];
		packet[8+(iIdx*3)+4] = mxPxColor[1];
	}

	device.write([0x04, 0x01, 0x00, 0x01], 64);
	device.write(packet, 64);
	device.write([0x04, 0x02, 0x00, 0x02], 64);
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
	return endpoint.interface === 1 && endpoint.usage === 0x0092 && endpoint.usage_page === 0xFF1C && endpoint.collection === 4;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/speedlink/mousepads/orios-rgb-gaming-mousepad.png";
}
