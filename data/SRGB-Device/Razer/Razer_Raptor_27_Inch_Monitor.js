export function Name() { return "Razer Raptor 27 Inch"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return [0x0F12, 0x0F28]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [15, 8]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [50, 100];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "other";}
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

const vLeds = [
	0, 1, 2, 3, 4, 5, 8, 6, 9, 7, 10, 11
];

const vLedNames = [
	"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12"
];
const vLedPositions = [
	[0, 1], [0, 4], [0, 7], [2, 7], [4, 7], [6, 7], [8, 7], [10, 7], [12, 7], [14, 7], [14, 4], [14, 1]
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
	let packet = [];
	const RGBData	= [];

	packet[2] = 0x1F;
	packet[6] = 0x29;
	packet[7] = 0x0F;
	packet[8] = 0x03;
	packet[13] = 0x0B;

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++){

		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		RGBData[(vLeds[iIdx]*3)] 	= color[0];
		RGBData[(vLeds[iIdx]*3)+1]	= color[1];
		RGBData[(vLeds[iIdx]*3)+2]	= color[2];
	}

	packet = packet.concat(RGBData);

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);

}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
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
	return (endpoint.interface === -1 || endpoint.interface === 0) && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000C;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/misc/raptor-27-inch-monitor.png";
}
