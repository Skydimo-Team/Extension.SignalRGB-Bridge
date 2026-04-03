export function Name() { return "Fnatic STREAK"; }
export function VendorId() { return 0x2F0E; }
export function ProductId() { return 0x0101; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [22, 8]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard"}
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

const vKeys =
[
	120,
	1, 0,  7, 13, 19, 25,  31, 37, 43, 49, 55, 67, 73, 79,  90, 93, 98,    91, 97, 92, 118,
	2,    8, 14, 20, 26, 32, 38, 44, 50, 56, 61, 62, 68, 80,   89, 94, 99,   100, 108, 109, 116,
	3,    9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81,   88, 95, 96,  101, 107, 110, 115,
	4,   10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82,                 102, 106, 111,
	5,    11, 17, 23, 29, 35, 41, 47, 53, 59, 65, 66, 77,          87,      103, 105, 112, 114,
	6,   12, 18,     36,         60, 72, 78, 83,      84, 85, 86,   104,    113,
	// 11 for iso? 82 for ISO?
];

const vKeyNames =
[
	"Logo 1",
	"Esc", "FN Lock", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "Mute Mic", "Game Mode", "Media Mute", "Audio Wheel",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",                          "NumLock", "Num /", "Num *", "Num -",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",                             "Num 7", "Num 8", "Num 9", "Num +",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO /", "Enter",                                                                                  "Num 4", "Num 5", "Num 6",
	"Left Shift", "ISO #", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",                                   "Num 1", "Num 2", "Num 3", "Num Enter",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",        "Left Arrow", "Down Arrow", "Right Arrow",                "Num 0", "Num .",
];

const vKeyPositions =
[
	[8, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],  [10, 1], [11, 1], [12, 1], [13, 1],    [14, 1], [15, 1], [16, 1],  [17, 1], [18, 1], [19, 1], [20, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],  [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],  [17, 2], [18, 2], [19, 2], [20, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],  [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],  [17, 3], [18, 3], [19, 3], [20, 3],
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],  [10, 4], [11, 4], [12, 4],  [13, 4],                            [17, 4], [18, 4], [19, 4],
	[0, 5], [1, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],  [10, 5],                 [13, 5],           [15, 5],           [17, 5], [18, 5], [19, 5], [20, 5],
	[0, 6], [1, 6], [2, 6],                      [6, 6],                       [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],  [17, 6], [18, 6],
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
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
	const RGBData = new Array(144*3).fill(255);
	let TotalLedCount = 0;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let mxPxColor;

		if(overrideColor) {
			mxPxColor = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		} else {
			mxPxColor = device.color(iPxX, iPxY);
		}

		RGBData[vKeys[iIdx]*3] = mxPxColor[0];
		RGBData[vKeys[iIdx]*3 +1] = mxPxColor[1];
		RGBData[vKeys[iIdx]*3 +2] = mxPxColor[2];
		TotalLedCount += 1;
	}

	let sentLeds = 0;
	TotalLedCount = 106 + 48;

	while(TotalLedCount > 0) {
		const Leds = TotalLedCount >= 19 ? 19 : TotalLedCount;

		const packet = [0x00, 0x0F, 0x73, 0x01, 0x00, sentLeds, sentLeds >> 8, 0x00];

		if(sentLeds == 0) {
			packet[8] = 0x0F;
			packet[9] = 0x03;
			packet.push(...RGBData.splice(0, Leds*3-2));
		} else {
			packet.push(...RGBData.splice(0, Leds*3));
		}

		TotalLedCount -= Leds;
		sentLeds += Leds*3;
		device.write(packet, 65);

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
	return endpoint.interface === 1;
}


export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/fnatic/keyboards/streak.png";
}