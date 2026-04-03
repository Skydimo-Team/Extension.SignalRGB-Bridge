export function Name() { return "EVGA Z20 Keyboard"; }
export function VendorId() { return 0x3842; }
export function ProductId() { return 0x260A; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/evga"; }
export function Size() { return [24, 9]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
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
	160,																							    176,
	161, 0,	1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13,			14, 15, 16,	   18, 19, 20, 118,	177,
	162, 21,	22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,		36, 37, 38,    39, 40, 41, 42,  178,
	163, 43,	44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57,		58, 59, 60,    61, 62, 63, 64,	179,
	164, 65,	66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,						   79, 80, 81,		180,
	165, 82,	83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 		        96,		   98, 99, 100, 101, 181,
	166, 102, 103, 104, 105,           106,         107, 108, 109, 110,	    111, 112, 113,   114, 115,			182,
	167,																								183,
	168,																								184,

];

const vKeyNames =
[
	"UnderGlow1",																																														"UnderGlow10",
	"UnderGlow2", "Game",	"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",  "Print Screen", "Scroll Lock", "Pause Break",   "Rewind", "Pause", "Skip", "Mute", 	"UnderGlow11",
	"UnderGlow3", "E1",    "`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",        "Insert",        "Home",     "Page Up",   "NumLock", "Num /", "Num *", "Num -",	"UnderGlow12",
	"UnderGlow4", "E2",  "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                       "Del",         "End",   "Page Down",   "Num 7", "Num 8", "Num 9", "Num +",		"UnderGlow13",
	"UnderGlow5", "E3",   "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                    		  "Num 4", "Num 5", "Num 6",			"UnderGlow14",
	"UnderGlow6", "E4",  "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                   	   "Up Arrow",                    "Num 1", "Num 2", "Num 3", "Num Enter",	"Underglow15",
	"UnderGlow7", "E5",   "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow",  "Down Arrow", "Right Arrow",   "Num 0", "Num .",						"UnderGlow16",
	"UnderGlow8",																																														"UnderGlow17",
	"UnderGlow9",																																														"UnderGlow18",
];

const vKeyPositions =
[
	[0, 0],																																							                                       [23, 0],
	[0, 1],	[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],  		   [16, 1], [17, 1], [18, 1],  [19, 1], [20, 1], [21, 1], [22, 1], [23, 1],
	[0, 2],	[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2],  [16, 2], [17, 2], [18, 2],  [19, 2], [20, 2], [21, 2], [22, 2], [23, 2],
	[0, 3],	[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3],  [16, 3], [17, 3], [18, 3],  [19, 3], [20, 3], [21, 3], [22, 3], [23, 3],
	[0, 4],	[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], 			                           [19, 4], [20, 4], [21, 4],		   [23, 4],
	[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], 		                    [17, 5],           [19, 5], [20, 5], [21, 5], [22, 5], [23, 5],
	[0, 6],	[1, 6], [2, 6], [3, 6], [4, 6],				            [8, 6],				              [12, 6], [13, 6], [14, 6], [15, 6],  [16, 6], [17, 6], [18, 6],  [19, 6], [20, 6],				   [23, 6],
	[0, 7],																																							                                       [23, 7],
	[0, 8],																																																   [23, 8],
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
	const packet = [0x06, 0xEA, 0x02, 0x01, 0x00, 0x00, 0x00, 0x02];

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		packet[vKeys[iIdx]*4 + 8] = 0xff;
		packet[vKeys[iIdx]*4 + 9] = color[0];
		packet[vKeys[iIdx]*4 + 10] = color[1];
		packet[vKeys[iIdx]*4 + 11] = color[2];
	}

	device.send_report(packet, 792);
	device.pause(2);
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
	return endpoint.interface === 1 && endpoint.usage === 0x004b && endpoint.usage_page === 0x0008;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/evga/keyboards/z20.png";
}
