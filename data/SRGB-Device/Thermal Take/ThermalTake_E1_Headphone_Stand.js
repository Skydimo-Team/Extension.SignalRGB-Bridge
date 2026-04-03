export function Name() { return "ThermalTake Argent E1 Headphone Stand"; }
export function VendorId() { return 0x264A; }
export function ProductId() { return 0x8002; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [9, 11]; }
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

const vKeymap = [ 0x00, 0x08, 0x10, 0x18, 0x01, 0x09, 0x11, 0x19, 0x21, 0x02, 0x0A, 0x12, 0x1A, 0x20, 0x22, 0x03, 0x0b, 0x13, 0x1b, 0x23, 0x04, 0x0C, 0x14, 0x1C, 0x24  ];
const vLedNames =
[
	"Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10", "Zone 11", "Zone 12", "Zone 13", "Logo", "Zone 15", "Zone 16", "Zone 17", "Zone 18", "Zone 19", "Zone 20", "Zone 21", "Zone 22", "Zone 23", "Zone 24", "Zone 25"
];
const vLedPositions =
 [
 	[3, 0], [2, 0], [1, 0], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6], [1, 7], [2, 8],
 	[2, 9], [3, 10], [5, 10], [4, 7], [6, 9], [6, 8], [7, 7], [7, 6], [7, 5], [8, 4],
 	[8, 3], [8, 2], [7, 0], [6, 0], [5, 0],
 ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x41, 0x03], 64);
	device.write([0x12, 0x22], 64);
}

export function Render() {
	sendColors(0, 0x0f);
	sendColors(0x0f, 0x0a);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors(0, 0x0f, "#000000");
		sendColors(0x0f, 0x0a, "#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(0, 0x0f, shutdownColor);
		sendColors(0x0f, 0x0a, shutdownColor);
	}

}

function sendColors(startIdx, count, overrideColor) {
	const ColorPacket = [0x00, 0xC0, 0x01];
	ColorPacket[3] = count;

	for(let iIdx = 0; iIdx < count; iIdx++) {
		const iLedIdx = (iIdx * 4) + 5;
		const iKeyIdx = startIdx + iIdx;
		const iKeyPosX = vLedPositions[iKeyIdx][0];
		const iKeyPosY = vLedPositions[iKeyIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iKeyPosX, iKeyPosY);
		}

		ColorPacket[iLedIdx] = vKeymap[iKeyIdx];
		ColorPacket[iLedIdx+1] = color[0];
		ColorPacket[iLedIdx+2] = color[1];
		ColorPacket[iLedIdx+3] = color[2];
	}

	device.write(ColorPacket, 65);
	device.pause(1);
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
	return endpoint.interface === 1;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/thermaltake/misc/e1.png";
}