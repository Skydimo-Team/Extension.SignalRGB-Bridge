export function Name() { return "Logitech G815 Lightsync"; }
export function VendorId() { return 0x046D; }
export function ProductId() { return 0xC33F; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function Size() { return [22, 7]; }
export function DefaultPosition() {return [75, 70]; }
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

const vLedNames = [
	"Logo",                         "Brightness",
		  "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",			"Print Screen", "Scroll Lock", "Pause Break",	"MediaRewind", "MediaPlayPause", "MediaFastForward", "Mute",
	"G1", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",			"Insert", "Home", "Page Up",					"NumLock", "Num /", "Num *", "Num -",
	"G2", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",					"Del", "End", "Page Down",						"Num 7", "Num 8", "Num 9", "Num +",
	"G3", "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",																"Num 4", "Num 5", "Num 6",
	"G4", "Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",						  "Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
	"G5", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",	"Left Arrow", "Down Arrow", "Right Arrow",		"Num 0", "Num .",
];

const vLeds = [
	210, 						153,
		 38, 55, 56, 57, 58,   59, 60, 61, 62,   63, 64, 65, 66,	67, 68, 69,		158, 155, 157, 156,
	180, 50, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 42, 43, 39,	70, 71, 72,		 80,  81,  82,  83,
	181, 40, 17, 23, 5, 18, 20, 25, 21, 9, 15, 16, 44, 45, 46,		73, 74, 75,		 92,  93,  94,  84,
	182, 54, 1, 19, 4, 6, 7, 8, 10, 11, 12, 48, 49, 47, 37,							 89,  90,  91,
	183, 105, 97, 26, 24, 3, 22, 2, 14, 13, 51, 52, 53,       109,		79,			 86,  87,  88,  85,
	184, 104, 107, 106,         41,	          110,  111, 98, 108,	77, 78, 76,		 95,	   96,

];

const vLedPositions = [
	[0, 0],															[8, 0],
 			[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],   [15, 1], [16, 1], [17, 1],  [18, 1], [19, 1], [20, 1], [21, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   [15, 2], [16, 2], [17, 2],  [18, 2], [19, 2], [20, 2], [21, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],   [15, 3], [16, 3], [17, 3],  [18, 3], [19, 3], [20, 3], [21, 3],
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],   						       [18, 4], [19, 4], [20, 4],
	[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],			[14, 5],            [16, 5],           [18, 5], [19, 5], [20, 5], [21, 5],
	[0, 6], [1, 6], [2, 6], [3, 6],                         [7, 6],                          [11, 6], [12, 6], [13, 6], [14, 6],   [15, 6], [16, 6], [17, 6],  [18, 6], 		 [20, 6],
];

export function LedNames(){
	return vLedNames;
}

export function LedPositions(){
	return vLedPositions;
}

export function Initialize(){
	console.log("Developed on firmware 131.2.18");
}

export function Render(){
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

		RGBData[(idx*4)]	= vLeds[idx];
		RGBData[(idx*4)+1]	= color[0];
		RGBData[(idx*4)+2]	= color[1];
		RGBData[(idx*4)+3]	= color[2];

	}

	while(RGBData.length > 0) {
		const ledsToSend = Math.min(4, RGBData.length/4);

		device.write([0x11, 0xFF, 0x10, 0x1A].concat(RGBData.splice(0, ledsToSend*4)), 20);
		device.pause(1);
	}

	device.write([0x11, 0xFF, 0x10, 0x7A], 20); // Apply
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
	return endpoint.interface === 1 && endpoint.usage === 0x0602 && endpoint.usage_page === 0xFF43;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/logitech/keyboards/g815.png";
}