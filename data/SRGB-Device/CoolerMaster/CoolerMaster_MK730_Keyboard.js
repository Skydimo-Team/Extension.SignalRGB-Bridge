export function Name() { return "CoolerMaster MK730"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x008F; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [19, 7]; }
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
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",                            "Print Screen",  "Pause Break",
	"Left Bar 1", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                       "Insert", "Home", "Page Up",       "Right Bar 1",
	"Left Bar 2", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                              "Del", "End", "Page Down",         "Right Bar 2",
	"Left Bar 3", 		 "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                                   "Right Bar 3",
	"Left Bar 4", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                             "Up Arrow",                   "Right Bar 4",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
	"Bottom Bar 1", "Bottom Bar 2", "Bottom Bar 3", "Bottom Bar 4", "Bottom Bar 5", "Bottom Bar 6", "Bottom Logo", "Bottom Bar 7", "Bottom Bar 8", "Bottom Bar 9", "Bottom Bar 10", "Bottom Bar 11", "Bottom Bar 12",
];

const vLedPositions = [
	[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],        [13, 0],         [15, 0], 	       [17, 0],
	[0, 1],   [1, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],  [12, 1],   [13, 1],   [15, 1], [16, 1], [17, 1],   [18, 1],
	[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   [15, 2], [16, 2], [17, 2],   [18, 2],
	[0, 3],          [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],         [14, 3],                             [18, 3],
	[0, 4],   [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],                 [14, 4],           [16, 4],           [18, 4],
	[1, 5], [2, 5], [3, 5],                      [6, 5],                       [11, 5], [12, 5], [13, 5], [14, 5],   [15, 5], [16, 5], [17, 5],

	[2, 6],     [3, 6], [4, 6],     [5, 6],     [6, 6],     [7, 6],      [9, 6],      [10, 6],        [11, 6], [12, 6], [13, 6],              [15, 6],       [16, 6],
];

const vKeys = [
	6,       21, 27, 34, 41,      55, 62, 69, 76,   83, 90, 97, 104,   111,     125,
	0, 7,   15, 22, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91,      105,   112, 119, 126, 133,
	1, 8,   16, 23, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92,       106,   113, 120, 127, 134,
	2,      17, 24, 30, 37, 44, 51, 58, 65, 72,  79, 86,          107,                 135,
	3, 10,   18, 25, 31, 38, 45, 52, 59, 66, 73, 80,              108,       122,      136,
	11, 12, 19,            46,           74, 81, 88,          109,   116, 123, 130,
	13, 20, 26,  33,     47,     54, 61,   68,   82, 96,  103,   110,    117
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x51, 0x00, 0x00, 0x00, 0x05], 65); //Set Profile
}

export function Render() {
	sendColors();
	SendCommits();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
		SendCommits();
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

	device.write([0x00, 0x56, 0x81, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x00, 0xBB, 0xBB, 0xBB, 0xBB], 65);

	//Send the left light bar and first column
	let InitColorPacket = [0x00, 0x56, 0x83, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x80, 0x01, 0x00, 0xC1, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
	InitColorPacket = InitColorPacket.concat(RGBData.splice(0, 36));
	device.write(InitColorPacket, 65);

	var packet = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
	packet = packet.concat(RGBData.splice(0, 60-18));
	StreamPacket(1, packet);

	var packet = [0x00, 0x00];
	packet = packet.concat(RGBData.splice(0, 60-2));
	StreamPacket(2, packet);

	for(let packetCount = 3; packetCount < 10; packetCount++){
		StreamPacket(packetCount,
			RGBData.splice(0, 60)
		);
	}

}

function StreamPacket(packetId, RGBData){
	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0x56;
	packet[2] = 0x83;
	packet[3] = packetId;
	packet[4] = 0x00;
	packet = packet.concat(RGBData);
	device.write(packet, 65);
	device.read(packet, 65);
}

function SendCommits(){
	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0xFF], 65);
	device.pause(3);
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
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/mk730.png";
}