export function Name() { return "Mountain Everest Max Keyboard"; }
export function VendorId() { return 0x3282; }//
export function ProductId() { return 0x0001; }//0x0001
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [22, 6]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
layout:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"layout", "group":"lighting", "label":"Numpad Location", description: "Sets the Numpad LED location for the device mapping in Layouts section", "type":"combobox", "values":["Left", "Right"], "default":"Left"},
	];
}

const vKeys =
[
	0, 9,  18, 27, 36, 45, 54, 63, 72, 81, 90,  99, 108,	      117, 114, 123,
	1, 10, 19, 28, 37, 46, 55, 64, 73, 82, 91, 100, 109, 87,      96, 105, 115,   6,  24, 16, 15,
	2, 11, 20, 29, 38, 47, 56, 65, 74, 83, 92, 101, 110, 119,     88, 97, 106,   61, 69, 70, 7,
	3, 12, 21, 30, 39, 48, 57, 66, 75, 84, 93, 102, 111, 120,                        51, 52, 60,
	4, 13, 22, 31, 40, 49, 58, 67, 76, 85, 94, 103, 121,              124,       34, 42, 43, 33,
	5, 14, 23, 32, 41, 50, 59, 68, 77, 86, 95,                   104, 113, 122,    78, 79,
];

//8,13,17,25,26,35,42,45,54,63,72,81,90,99 is null
const vKeyNames =
[
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21 //ISO are 111 and 13
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "L-Space", "Space", "R-Space", "R-Underglow", "Right Alt", "Right Win", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];


const vKeyPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 3], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],                                [17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],            [15, 4],            [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5], [3, 5],                 [6, 5],         [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5],          [19, 5],               // 13
];

const vKeyPositionsRight =
[
	[4, 0], [5, 0], [6, 0], [7, 0], [8, 0],         [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0],   [18, 0], [19, 0], [20, 0],
	[4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],   [18, 1], [19, 1], [20, 1], 		[0, 1], [1, 1], [2, 1], [3, 1],
	[4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],   [18, 2], [19, 2], [20, 2], 		[0, 2], [1, 2], [2, 2], [3, 3],
	[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3],								 		[0, 3], [1, 3], [2, 3],
	[4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4],          [17, 4],            [19, 4],					[0, 4], [1, 4], [2, 4], [3, 4],
	[4, 5], [5, 5], [6, 5], [7, 5],                 [10, 5],          [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5],   [18, 5], [19, 5], [20, 5],		[0, 5],         [2, 5],
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	device.write([0x00, 0x14, 0x00, 0x00, 0x00, 0x01, 0x06], 65); //Mode go brrr
	device.read([0x00], 65);
	device.write([0x00, 0x14, 0x2c, 0x0a, 0x00, 0xff, 0x64, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff], 65);
	device.read([0x00], 65);
	setNumpadLocation(layout);

	oldRGBData = grabColors();
}

export function Render() {
	resetKeyboard();
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

export function onlayoutChanged() {
	setNumpadLocation(layout);
}

let savedResetTimer = Date.now();
const PollModeInternal = 300000;

function resetKeyboard() {

	if (Date.now() - savedResetTimer < PollModeInternal) {
		return;
	}

	savedResetTimer = Date.now();

	device.write([0x00, 0x14, 0x00, 0x00, 0x00, 0x01, 0x06], 65); //Mode go brrr
	device.read([0x00], 65);
	device.write([0x00, 0x14, 0x2c, 0x0a, 0x00, 0xff, 0x64, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff], 65);
	device.read([0x00], 65);
}

function setNumpadLocation(location) {
	if(location === "Left") {
		device.setControllableLeds(vKeyNames, vKeyPositions);
	} else {
		device.setControllableLeds(vKeyNames, vKeyPositionsRight);
	}
}

function grabColors(overrideColor) {
	const rgbdata = new Array(300);
	rgbdata.fill(0xff);

	let keyPositions;

	if(layout === "Left") {
		keyPositions = vKeyPositions;
	} else {
		keyPositions = vKeyPositionsRight;
	}

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = keyPositions[iIdx][0];
		const iPxY = keyPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = vKeys[iIdx] * 3;
		rgbdata[iLedIdx] = color[0];
		rgbdata[iLedIdx+1] = color[1];
		rgbdata[iLedIdx+2] = color[2];
	}

	return rgbdata;
}

let oldRGBData = [];

function CompareArrays(array1, array2) {
	return array1.length === array2.length &&
	array1.every(function(value, index) { return value === array2[index];});
}

function sendColors(overrideColor) {

	const rgbdata = grabColors(overrideColor);

	if(!CompareArrays(rgbdata, oldRGBData)) {
		oldRGBData = rgbdata;

		const LedsPerPacket = 19;
		let PacketsSent = 0;
		let BytesLeft = rgbdata.length;

		while(PacketsSent < 7) {
			const BytesToSend = Math.min(LedsPerPacket * 3, BytesLeft);
			StreamLightingData(PacketsSent, rgbdata.splice(0, BytesToSend));

			BytesLeft -= BytesToSend;
			PacketsSent ++;
		}

		device.pause(5);
	}

}

function StreamLightingData(packetIdx, RGBData) {

	device.write([0x00, 0x14, 0x2c, 0x00, 0x01, packetIdx, 0x4b, 0x00].concat(RGBData), 65);

	device.pause(5);
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
	return endpoint.interface === 3;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/mountain/keyboards/everest-max.png";
}