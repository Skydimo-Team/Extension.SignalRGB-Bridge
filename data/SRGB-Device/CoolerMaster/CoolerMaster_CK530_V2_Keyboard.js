export function Name() { return "CoolerMaster CK530 V2"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x0147; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [18, 6]; }
export function DefaultPosition(){return [10, 100];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "keyboard";}

/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",             "Print Screen", "Scroll Lock",  "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=+", "Backspace",                       "Insert", "Home", "Page Up",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                              "Del", "End", "Page Down",
	"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",
	"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                             "Up Arrow",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
];

const vLedPositions = [
	[0, 0],			[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],			[15, 0], [16, 0], [17, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],			[15, 1], [16, 1], [17, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],			[15, 2], [16, 2], [17, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],					 [16, 4],
	[0, 5], [1, 5], [2, 5],                      	[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],			[15, 5], [16, 5], [17, 5],
];

const vKeys = [
	7,       28, 35, 42, 49,      63, 70, 77, 84,   91, 98, 105, 112,   119, 132, 133,
	8,   22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99,      113,   120, 127, 134,
	9,   23, 30, 37, 44, 51, 58, 65, 72, 79, 86, 93, 100,       126,   121, 128, 135,
	10, 24, 31, 38, 45, 52, 59, 66, 73, 80, 87,  94,   108,     115,
	11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 88,              116,       130,
	12, 19, 26,            54,           82, 89, 96,          117,   124, 131, 138,
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x41, 0x80], 65);
	device.pause(1);
	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0x01], 65);
	device.pause(1);
	device.write([0x00, 0x56, 0x81, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0xbb, 0xbb, 0xbb, 0xbb], 65);
	device.pause(1);
	device.write([0x00, 0x56, 0x83, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0xf0, 0x00, 0xc1], 65);
	device.pause(1);
	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0xff], 65);
	device.pause(1);
}

export function Render() {
	sendColors();
	device.clearReadBuffer();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
		device.clearReadBuffer();
	}else{
		device.write([0x00, 0x41, 0x80], 65);
		device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0x01], 65);
	}

}

function sendColors(overrideColor){
	const RGBData = [];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let mxPxColor;

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		}else{
			mxPxColor = device.color(iPxX, iPxY);
		}

		RGBData[vKeys[iIdx]*3] = mxPxColor[0];
		RGBData[vKeys[iIdx]*3 +1 ] = mxPxColor[1];
		RGBData[vKeys[iIdx]*3 +2 ] = mxPxColor[2];
	}


	let keysSent = 0;

	while(RGBData.length > 0) {
		const keysToSend = Math.min(18, RGBData.length/3);
		device.write([0x00, 0x56, 0x42, 0x00, 0x00, 0x02, keysToSend, keysSent, 0x00].concat(RGBData.splice(0, keysToSend*3)), 65);
		device.pause(1);
		keysSent += keysToSend;
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

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/ck530-v2.png";
}