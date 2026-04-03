export function Name() { return "ASUS ROG Claymore"; }
export function VendorId() { return 0x0B05; }
export function Documentation(){ return "troubleshooting/asus"; }
export function ProductId() { return [0x184d]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [21, 8]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
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

const vKeysLeft =
[
	93, 101,
	32,      48, 56, 64, 72,     88, 96, 104, 112, 128, 136, 144, 152,	160, 168, 176,
	33,  41, 49, 57, 65, 73, 81, 89, 97, 105, 113, 121, 129,    137,   161, 169, 177,   1, 9, 17, 25,
	34,  42, 50, 58, 66, 74, 82, 90, 98, 106, 114, 122, 130,    138,   162, 170, 178,   2, 10, 18, 26,
	35,  43, 51, 59, 67, 75, 83, 91, 99, 107, 115, 123, 131,    139,                  	3, 11, 19,
	36,  44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124,        140,       172,       	4, 12, 20, 28,
	37,  45,  53,      69,           109, 117, 125,				141, 	165, 173, 181,	5, 21,
];

const vKeysRight =
[
	61, 69,
	0,  	    16, 24, 32, 40, 56, 64, 72, 80, 96, 104, 112,  120,	128, 136, 144,
	1,  9,  17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97,    105,  	129, 137, 145,   153, 161, 169, 177,
	2,  10, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98,    106,   	130, 138, 146,   154, 162, 170, 178,
	3,  11, 19, 27, 35, 43, 51, 59, 67, 75, 83, 91, 99,     107,					155, 163, 171,
	4,  12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92,         108,       140,			156, 164, 172, 180,
	5,  13, 21,      37,            77, 85, 93,				109,   133, 141, 149,   157, 173,
];

const vKeyNames =
[
	"Logo ", "Logo ISO",
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "/", "Enter",                                                              "Num 4", "Num 5", "Num 6",
	"Left Shift", "<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
];
/** @type {LedPosition[]} */
const vKeyPositionsRight =
[
	[10, 7], [10, 7],
	[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1],        [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
	[0, 2],  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 1], [15, 1], [16, 1],   [17, 2], [18, 2], [19, 2], [20, 2],
	[0, 3],  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 2], [15, 2], [16, 2],   [17, 3], [18, 3], [19, 3], [20, 3],
	[0, 4],  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],                             [17, 4], [18, 4], [19, 4],
	[0, 5],  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],          [13, 5],           [15, 4],           [17, 5], [18, 5], [19, 5], [20, 5],
	[0, 6],  [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],    [14, 6], [15, 6], [16, 6],   [17, 6],         [19, 6],
];

/** @type {LedPosition[]} */
const vKeyPositionsLeft =
[
	[15, 7], [15, 7],
	[4, 1],  [5, 1], [6, 1], [7, 1], [8, 1],        [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],   [18, 1], [19, 1], [20, 1],
	[4, 2],  [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],   [18, 2], [19, 2], [20, 2],   [0, 2], [1, 2], [2, 2], [3, 2],
	[4, 3],  [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3],   [18, 3], [19, 3], [20, 3],   [0, 3], [1, 3], [2, 3], [3, 3],
	[4, 4],  [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4],                             [0, 4], [1, 4], [2, 4],
	[4, 5],  [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],  [15, 5],         [17, 5],           [19, 5],           [0, 5], [1, 5], [2, 5], [3, 5],
	[4, 6],  [5, 6], [6, 6],                      [10, 6],                         [14, 6], [15, 6], [16, 6], [17, 6],   [18, 6], [19, 6], [20, 6],   [0, 6],        [2, 6],
];


export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

let vKeys = vKeysRight;
let vKeyPositions = vKeyPositionsRight;

export function Initialize() {
	device.set_endpoint(1, 0x0001, 0xff00);
	device.write([0x00, 0x41, 0x02], 65);
	getNumpadLocation();
}

export function Render() {
	getNumpadLocation();
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		// revert to rainbow mode
		device.write([0x00, 0x51, 0x2C, 0x04, 0x00, 0x48, 0x64, 0x00, 0x00, 0x02, 0x07, 0x0E, 0xF5, 0x00, 0xFF, 0x1D, 0x00, 0x06, 0xFF, 0x2B, 0x00, 0xFA, 0xFF, 0x39, 0x01, 0xFF, 0x00, 0x48, 0xFF, 0xF6, 0x00, 0x56, 0xFF, 0x78, 0x07, 0x64, 0xFF, 0x00, 0x0D], 65);
		device.write([0x00, 0x50, 0x55], 65);
	}
}

let layout = 2;
let savedPollTimer = Date.now() - 15000;
const PollModeInternal = 15000;

function getNumpadLocation() {

	if (Date.now() - savedPollTimer < PollModeInternal) {
		return;
	}

	savedPollTimer = Date.now();

	device.clearReadBuffer();

	device.write([0x00, 0x40, 0x60], 65);

	const returnPacket = device.read([0x00, 0x40, 0x60], 65);

	if(returnPacket[5] !== layout && returnPacket[5] !== undefined) {
		device.log(`Layout Changed to ${returnPacket[5] ? "Left" : "Right"}`);
		layout = returnPacket[5];
		setLEDLayout(returnPacket[5] ? "Left" : "Right");
	}


}

function setLEDLayout(numpadLocation) {
	if(numpadLocation === "Right") {
		vKeys = vKeysRight;
		vKeyPositions = vKeyPositionsRight;
	} else {
		vKeys = vKeysLeft;
		vKeyPositions = vKeyPositionsLeft;
	}

	device.setControllableLeds(vKeyNames, vKeyPositions);
}

function sendColors(overrideColor) {
	const RGBData = new Array(600).fill(255);
	let TotalLedCount = 120;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		RGBData[iIdx * 4 + 0] = vKeys[iIdx];
		RGBData[iIdx * 4 + 1] = col[0];
		RGBData[iIdx * 4 + 2] = col[1];
		RGBData[iIdx * 4 + 3] = col[2];
	}

	while(TotalLedCount > 0){
		const ledsToSend = TotalLedCount >= 15 ? 15 : TotalLedCount;

		device.write([0x00, 0xC0, 0x81, 0x0F, 0x00].concat(RGBData.splice(0, ledsToSend*4)), 65);

		TotalLedCount -= ledsToSend;
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
	return endpoint.interface === 1 || endpoint.interface === 2;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/asus/keyboards/claymore-i.png";
}