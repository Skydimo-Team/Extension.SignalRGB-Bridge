export function Name() { return "NZXT Kraken X2/M2"; }
export function VendorId() { return 0x1E71; }
export function ProductId() { return [0x170E, 0x1715]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function Size() { return [5, 5]; }
export function DeviceType(){return "aio";}
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

export function DeviceMessages() {
	return [
		{
			property:	"Limited Frame Rate",
			message:	"Limited Frame Rate",
			tooltip: 	"This device's firmware is limited to a slower refresh rate."
		},
	];
}

const vLeds = [
	9, 8, 1, 2, 3, 4, 5, 6, 7
];

const vLedNames = [
	"Logo", "Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8",
];

const vLedPositions = [
	[2, 2], [1, 0], [3, 0], [4, 1], [4, 3], [3, 4], [1, 4], [0, 3], [0, 1]
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
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	const RGBData	= [];

	for (let idx = 0; idx < vLeds.length; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		if (vLeds[idx] === 9) { // Logo GRB order
			RGBData[(vLeds[idx]*3)] 	= color[1];
			RGBData[(vLeds[idx]*3)+1]	= color[0];
			RGBData[(vLeds[idx]*3)+2]	= color[2];
		} else {
			RGBData[(vLeds[idx]*3)] 	= color[0];
			RGBData[(vLeds[idx]*3)+1]	= color[1];
			RGBData[(vLeds[idx]*3)+2]	= color[2];
		}
	}

	device.write([0x02, 0x4C, 0x02, 0x00, 0x00].concat(RGBData.splice(0, 9*3)), 65); // Pump
	device.pause(1);
	device.write([0x02, 0x4C, 0x01, 0x00, 0x00].concat(RGBData), 65); // Logo
	device.pause(500);
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
	return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00 && endpoint.collection === 0x0000;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/nzxt/aio/kraken-x72.png";
}