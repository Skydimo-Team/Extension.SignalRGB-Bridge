export function Name() { return "Speedlink ORIOS RGB Opto-Mech KB"; }
export function VendorId() { return 0x0c45; }
export function ProductId() { return 0x763E; }
export function Publisher() { return "FeuerSturm"; }
export function Size() { return [22, 6]; }
export function DefaultPosition(){return [20, 20];}
export function DefaultScale(){return 10.0;}
export function DeviceType(){return "keyboard"}
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
export function ConflictingProcesses() {
	return ["ORIOS.exe"];
}

const vKeyPositions =
[
	[0, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1], [21, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2], [20, 2], [21, 2],
	[0, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [18, 3], [19, 3], [20, 3],
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [13, 4], [16, 4], [18, 4], [19, 4], [20, 4], [21, 4],
	[0, 5], [1, 5], [2, 5], [6, 5], [10, 5], [11, 5], [12, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [20, 5]
];

const vKeyNames =
[
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Print Screen", "Scroll Lock", "Pause Break",
	"^", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "ß", "´", "Backspace", "Insert", "Home", "Page Up", "NumLock", "Num /", "Num *", "Num -",
	"Tab", "Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü", "+", "Enter", "Del", "End", "Page Down", "Num 7", "Num 8", "Num 9", "Num +",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä", "#", "Num 4", "Num 5", "Num 6",
	"Left Shift", "<", "Y", "X", "C", "V", "B", "N", "M", ",", ".", "-", "Right Shift", "Up Arrow", "Num 1", "Num 2", "Num 3", "Num Enter",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "AltGr", "Fn", "Menu", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ,"
];

const vKeyIndexes =
[
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16,
	21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
	42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 76, 56, 57, 58, 59, 60, 61, 62,
	63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 80, 81, 82, 84,
	85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 97, 99, 101, 102, 103, 104, 105,
	106, 107, 108, 109, 110, 111, 113, 119, 120, 121, 123, 124, 126
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

const row_packet_four = [ 0x38, 0x38, 0x38, 0x38, 0x38, 0x38, 0x2a ];
const row_packet_five = [ 0x00, 0x38, 0x70, 0xa8, 0xe0, 0x18, 0x50 ];
const row_packet_six  = [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01 ];

function sendColors(overrideColor) {
	let mxPxColor;
	const RGBData = new Array(392).fill(0x00);

	for(let iIdx = 0; iIdx < vKeyPositions.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		} else {
			mxPxColor = device.color(iPxX, iPxY);
		}

		RGBData[(vKeyIndexes[iIdx]*3)] = mxPxColor[0];
		RGBData[(vKeyIndexes[iIdx]*3)+1] = mxPxColor[1];
		RGBData[(vKeyIndexes[iIdx]*3)+2] = mxPxColor[2];
	}

	for(let row = 0; row <= 6; row++) {
		const packet = [0x04, 0x00, 0x00, 0x12, row_packet_four[row], row_packet_five[row], row_packet_six[row], 0x00];
		packet.push(...RGBData.splice(0, 56));
		device.write(packet, 64);
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
	return endpoint.interface === 1 && endpoint.usage === 0x0092 && endpoint.usage_page == 0xFF1C && endpoint.collection == 4;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/speedlink/keyboards/orios-rgb-optomechanical.png";
}