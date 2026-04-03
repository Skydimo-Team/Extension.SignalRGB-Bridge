
export function Name() { return "ASUS ROG Strix LC"; }
export function VendorId() { return  0x0B05; }
export function Documentation(){ return "troubleshooting/asus"; }
export function ProductId() { return 0x879E;}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [4, 4]; }
export function DefaultPosition(){return [165, 60];}
export function DefaultScale(){return 7.0;}
export function Type() { return "Hid"; }
export function DeviceType(){return "aio"}

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

const vLedNames = [ "Led 1", "Led 2", "Led 3", "Led 4" ];
const vLedPositions = [ [0, 2], [1, 2], [2, 2], [3, 2] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	setDirectMode();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	let TotalLedCount = 0;
	const RGBdata = [];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		RGBdata[iIdx*3]   = col[0];
		RGBdata[iIdx*3+1] = col[1];
		RGBdata[iIdx*3+2] = col[2];
		TotalLedCount += 1;
	}

	sendDirectPacket(0, 0, TotalLedCount, RGBdata.splice(0, TotalLedCount*3), false);
}

function sendDirectPacket(channel, start, count, data, apply){
	device.write([0xEC, 0x40, apply ? 0x80 | channel : channel, start, count].concat(data), 65);
}

function setDirectMode(){
	device.write([0xEC, 0x3B, 0x00, 0xFF], 65);
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
	return (endpoint.interface === -1 || endpoint.interface === 0) && endpoint.usage === 0x0001;

}

export function ImageUrl() { // TODO
	return "https://assets.signalrgb.com/devices/brands/asus/aios/strix-lc.png";
}