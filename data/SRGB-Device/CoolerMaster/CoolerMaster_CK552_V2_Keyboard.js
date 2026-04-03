export function Name() { return "CoolerMaster CK552 V2"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x007f; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [21, 6]; }
export function DefaultPosition() {return [75, 70]; }
export function DefaultScale(){return 8.0; }
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
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",               "Print Screen", "Scroll Lock",  "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                 "Insert", "Home", "Page Up",                    "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                        "Del", "End", "Page Down",                      "Num 7", "Num 8", "Num 9", "Num +",    //21
	"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                                     "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                             "Up Arrow",                          "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",        "Num 0", "Num ."                       //13
];

const vLedPositions = [
	[0, 0],    [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],          [14, 0], [15, 0], [16, 0],    //[17,1], [18,1], [19,1],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],     [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],     [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                               [17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                 [13, 4],             [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],     [14, 5], [15, 5], [16, 5],   [17, 5],         [19, 5] // 13
];
const vKeys = [
	0,     18, 24, 30, 36, 48, 54, 60, 66, 72,  78, 84, 90,  96, 102, 108,    //132,//126,132,
	1,  13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,  91,  97, 103, 109,  115, 121, 127, 133,
	2,  14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92,  98, 104, 110,  116, 122, 128, 134,
	3,  15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75,    93,               117, 123, 129,
	4,  16, 22, 28, 34, 40, 46, 52, 58, 64, 70,       94,    106,       118, 124, 130, 136,
	5, 11, 17,         41,             65, 71, 77,   95, 101, 107, 113,      125, 131
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
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/ck552-v2.png";
}