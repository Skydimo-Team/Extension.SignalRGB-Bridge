export function Name() { return "Patriot Viper V380 Headset"; }
export function VendorId() { return 0x260D; }
export function ProductId() { return 0x2002; }
export function Documentation(){ return ""; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function Type() { return "Hid"; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
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

const vLedNames = [ "Main Zone" ];
const vLedPositions = [ [0, 0] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0xff, 0x02, 0x00, 0x00, 0x01, 0x00, 0x01], 16);
	device.write([0xff, 0x03, 0x01, 0x01, 0x00, 0x0a, 0x00], 16);
	device.write([0xff, 0x04, 0x00, 0x00, 0xff, 0x00, 0xff], 16);
	device.write([0xff, 0x01], 16);
}

export function Render() {
	device.write([0xff, 0x03, 0x01, 0x01, 0x00, 0x0a, 0x00], 16);
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		device.write([0xff, 0x03, 0x01, 0x01, 0x00, 0x0a, 0x00], 16);
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		device.write([0xff, 0x03, 0x01, 0x01, 0x00, 0x0a, 0x00], 16);
		sendColors(shutdownColor);
	}

}

function sendColors(overrideColor) {
	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}
		const packet = [0xff, 0x04, 0x00, 0x00, col[1], col[2], col[0]];
		device.write(packet, 16);
	}
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
	return endpoint.interface === 3 && endpoint.usage === 0x0001;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/patriot/audio/viper-v380.png";
}