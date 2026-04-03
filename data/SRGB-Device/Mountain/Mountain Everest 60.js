export function Name() { return "Mountain Everest 60 Keyboard"; }
export function VendorId() { return 0x3282; }//
export function ProductId() { return 0x0005; }//0x0001
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [21, 7]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
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

const vKeys = [
	126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 170, 171, 172, 173, 174, 175,
	169, 0,  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 					143, 191, 38,  39,  40,  41,  176,
	168, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 					144, 190, 59,  60,  61,  62,  177,
	167, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 76, 						145, 189, 80,  81,  82,		  178,
	166, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 97, 99, 56, 					146, 188, 101, 102, 103, 125, 179,
	165, 105, 106, 107,         110,     113, 115, 119, 120, 121,   				147, 187, 122, 124,		      180,
	164, 163, 162, 161, 160, 159, 158, 157, 156, 155, 154, 153, 152, 151, 150, 149, 148, 186, 185, 184, 183, 182, 181
];

const vKeyNames = [
	"Top 1", "Top 2", "Top 3", "Top 4", "Top 5", "Top 6", "Top 7", "Top 8", "Top 9", "Top 10", "Top 11", "Top 12", "Top 13", "Top 14", "Top 15", "Top 16", "Top 17",  "Numpad Top 1", "Numpad Top 2", "Numpad Top 3", "Numpad Top 4", "Numpad Top 5", "Numpad Top 6",
	"Left 1", "Esc", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",  											 "Right 1", "Numpad L 1",   "NumLock",     "Num /",         "Num *",        "Num -",        "Numpad R 1",
	"Left 2", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", 															 "Right 2", "Numpad L 2",   "Num 7",       "Num 8",         "Num 9",        "Num +",        "Numpad R 2",
	"Left 3", "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", 														 "Right 3", "Numpad L 3",   "Num 4",       "Num 5", 	       "Num 6",					       "Numpad R 3",
	"Left 4", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Delete", 								 "Right 4", "Numpad L 4",   "Num 1",       "Num 2",         "Num 3",        "Num Enter",    "Numpad R 4",
	"Left 5", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Left Arrow", "Down Arrow", "Right Arrow", 						 "Right 5", "Numpad L 5",   "Num 0",       "Num .",										   "Numpad R 5",
	"Bot 1", "Bot 2", "Bot 3", "Bot 4", "Bot 5", "Bot 6", "Bot 7", "Bot 8", "Bot 9", "Bot 10", "Bot 11", "Bot 12", "Bot 13", "Bot 14", "Bot 15", "Bot 16",  "Bot 17", "Numpad Bot 1", "Numpad Bot 2", "Numpad Bot 3", "Numpad Bot 4", "Numpad Bot 5", "Numpad Bot 6",
];

const vKeyPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [14, 0], [15, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0],
	[0, 1],	[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1],
	[0, 2],	[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2], [20, 2],
	[0, 3],	[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],		    [14, 3], [15, 3], [15, 3], [16, 3], [17, 3], [18, 3],          [20, 3],
	[0, 4],	[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [15, 4], [16, 4], [17, 4], [18, 4], [19, 4], [20, 4],
	[0, 5],	[1, 5], [2, 5], [3, 5],			  		        [7, 5],			  		[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [15, 5], [16, 5],          [18, 5],          [20, 5],
	[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 6], [15, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6], [20, 6],
];


export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	device.send_report([0x00, 0x07, 0x46, 0x23, 0xEA], 65); //Mode go brrr
	device.send_report([0x00, 0x16, 0x46, 0x23, 0xEA, 0x01, 0x00, 0x00, 0x00, 0x07], 65); //Mode go brrr
	device.send_report([0x00, 0x34, 0x46, 0x23, 0xEA, 0x64, 0xC0], 65); //Probably brightness.
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

function grabColors(overrideColor) {
	const rgbdata = [];

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

		const iLedIdx = iIdx * 4;

		rgbdata[iLedIdx] = vKeys[iIdx];
		rgbdata[iLedIdx+1] = color[0];
		rgbdata[iLedIdx+2] = color[1];
		rgbdata[iLedIdx+3] = color[2];
	}

	return rgbdata;
}

function sendColors(overrideColor) {

	const rgbdata = grabColors(overrideColor);

	device.send_report([0x00, 0x34, 0x46, 0x23, 0xEA, 0x64, 0xC0], 65); //Probably brightness.
	device.get_report([0x00], 65);

	while(rgbdata.length > 0) {
		const ledsToSend = Math.min(0x0E, rgbdata.length/4);

		StreamLightingData(ledsToSend, rgbdata.splice(0, ledsToSend*4));
	}
}

function StreamLightingData(ledsToSend, RGBData) {

	device.send_report([0x00, 0x35, 0x46, 0x23, 0xEA, ledsToSend, 0x00, 0x00, 0x00].concat(RGBData), 65);
	device.get_report([0x00], 65);
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
	return endpoint.interface === 0 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/mountain/keyboards/everest-60.png";
}