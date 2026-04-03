export function Name() { return "Roccat Vulcan II Mini Air"; }
export function VendorId() { return 0x1E7D; }
export function ProductId() { return [0x6978, 0x3AA9]; } // 3AA9 Wireless
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [15, 5]; }
export function DeviceType(){return "keyboard";}
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

const vLeds = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
	15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
	30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
	45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
	60, 61, 62,				66,			69, 70, 71, 72, 73, 74,

	75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
	88, 89, 90, 91, 92,
	93,
	100, 101, 102, 94, 95, 96, 97, 98, 99,
];

const vLedsPositions = [
	[0, 0],  [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],     [14, 0], //15
	[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],     [14, 1], //15
	[0, 2],  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],	 [14, 2], //14
	[0, 3],  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],	 [14, 3], //14
	[0, 4],  [1, 4], [2, 4],                         [6, 4],                 [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],     [14, 4], //10

	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],
	[0, 1], [5, 1], [6, 1], [7, 1], [8, 1],
	[0, 2],
	[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
];

const vLedsNames = [
	"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",   "Del",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",            "Home",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",    "Page Up",
	"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Page Down",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn",  "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",

	// Double leds
	"2nd Esc", "2nd 1", "2nd 2", "2nd 3", "2nd 4", "2nd 5", "2nd 6", "2nd 7", "2nd 8", "2nd 9", "2nd 0", "2nd -_", "2nd =+",
	"2nd Tab", "2nd T", "2nd Y", "2nd U", "2nd I",
	"2nd CapsLock",
	"2nd Z", "2nd X", "2nd C", "2nd V", "2nd B", "2nd N", "2nd M", "2nd ,", "2nd .",
];

export function LedNames() {
	return vLedsNames;
}

export function LedPositions() {
	return vLedsPositions;
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

	const RGBData = [];

	for(let iIdx = 0; iIdx < vLeds.length; iIdx++) {
		const iPxX = vLedsPositions[iIdx][0];
		const iPxY = vLedsPositions[iIdx][1];
		let col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		RGBData[(vLeds[iIdx]*3)]	= col[0];
		RGBData[(vLeds[iIdx]*3)+1]	= col[1];
		RGBData[(vLeds[iIdx]*3)+2]	= col[2];
	}

	for (let zone = 1; zone < 3; zone++) { // looks like theres a zone 0x02, but doesnt seem necessary
		for(let packetCount = 0; packetCount < (zone === 2 ? 2 : 5); packetCount++) {

			let packet = [];

			packet = [0x00, 0x07, 0x31, 0x33, zone, packetCount].concat(RGBData.splice(0, 15*3));
			device.write(packet, 65);
			device.pause(5); // Wireless lags with too much data
		}
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
	return endpoint.interface === 1  && endpoint.usage === 0x0001 && endpoint.usage_page === 0x00FF;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/roccat/keyboards/vulcan-ii-mini-air.png";
}