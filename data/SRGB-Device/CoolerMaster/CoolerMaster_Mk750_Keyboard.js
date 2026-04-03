export function Name() { return "CoolerMaster MK750"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x0067; }
export function Publisher() { return "KillerCode PT"; }
export function Size() { return [25, 7]; }
export function DefaultPosition() {return [75, 70]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "keyboard";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
/* eslint-disable indent */
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",                            "Print Screen",  "Pause Break", 			"Mute",	"Play", "Back", "Forward",
	"Left Bar 1", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                "Insert", "Home", "Page Up",       				"/", "*", "-",		   	"Right Bar 1",
	"Left Bar 2", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                       "Del", "End", "Page Down",					"Num 7", "Num 8", "Num 9", "+", "Right Bar 2",
	"Left Bar 3", 		 "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç", "ºª", "^~", "Enter",																"Num 4", "Num 5", "num 6",	   	"Right Bar 3",
	"Left Bar 4", "Left Shift", "<>", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "-", "Right Shift",						"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter", "Right Bar 4",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  				"Left Arrow", "Down Arrow", "Right Arrow",	"Num 0", "Num .",
	"Bottom Bar 1", "Bottom Bar 2", "Bottom Bar 3", "Bottom Bar 4", "Bottom Bar 5", "Bottom Bar 6", "Bottom Logo", "Bottom Bar 7", "Bottom Bar 8", "Bottom Bar 9", "Bottom Bar 10", "Bottom Bar 11", "Bottom Bar 12",
	"Bottom Bar 13", "Bottom Bar 14", "Bottom Bar 15", "Bottom Bar 16", "Bottom Bar 17", "Bottom Bar 18"
];

const vLedPositions = [
            [1, 0], 		[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], 	[15, 0], 		  [17, 0], 		[18, 0], [19, 0], [20, 0], [21, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], 	[15, 1], [16, 1], [17, 1],				 [19, 1], [20, 1], [21, 1], [22, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   	[15, 2], [16, 2], [17, 2], 		[18, 2], [19, 2], [20, 2], [21, 2], [22, 2],
    [0, 3],         [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],									[18, 3], [19, 3], [20, 3],			[22, 3],
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],          [14, 4],			 [16, 4],				[18, 4], [19, 4], [20, 4], [21, 4], [22, 4],
            [1, 5], [2, 5], [3, 5],                 [6, 5],                       			 [11, 5], [12, 5], [13, 5], [14, 5],	[15, 5], [16, 5], [17, 5],		[18, 5],		  [20, 5],
                    [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6],	[8, 6],	[9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],	[15, 6], [16, 6], [17, 6], 		[18, 6], [19, 6], [20, 6]
];

const vKeys = [
	    7,      28, 35, 42, 49, 63, 70, 77, 84, 91, 98, 105, 112,   119,      133,      140, 147, 154, 161,
	1,  8,  22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 113,    120, 127, 134,           148, 155, 162, 170,
	2,  9,  23, 30, 37, 44, 51, 58, 65, 72, 79, 86, 93, 100,        121, 128, 135,      142, 149, 156, 163, 171,
	3,      24, 31, 38, 45, 52, 59, 66, 73, 80, 87, 94, 108, 115,                       143, 150, 157,      172,
	4, 11,  18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 88,      116,        130,           144, 151, 158, 165, 173,
	   12,  19, 26,             54,             82, 89, 96, 117,    124, 131, 138,      152,      159,
	        20, 27, 34, 41, 55, 62,     69, 76, 83, 90, 104, 111,   118, 125, 132,      146, 153, 160
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	//41 02: Set manual control
	//This is a completely manual mode. Once enabled, the device goes black and simply waits for control commands to set LEDs. The relevant packets are described at the end of this documents.
	//This is also the mode used by the official SDK to set effects. The official control software only goes into this mode for the "System Status" pseudo-effect.
	device.write([0x00, 0x41, 0x02, 0x00, 0x00, 0x00], 65);
	device.pause(1);
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

	for(let packetCount = 0; packetCount < 25; packetCount+=2){
		StreamPacket(packetCount, RGBData.splice(0, 42));
	}

	device.pause(3);
}

function StreamPacket(packetId, RGBData){
	// For the big multi-packet LED setting packets c0 02 and 51 a8 the keys are passed in ascending order from id 0 to N.
	// No ordering or topography can be discerned from this linear list so the conversion between the convenient matrix and inconvenient but
	// protocol friendly linear representations is done through lookup tables generated from the manually created layouts.
	//
	// Request and response payload: <packetid> 00 [<rN> <gN> <bN>]x16
	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0xc0;
	packet[2] = 0x02;
	packet[3] = packetId;
	packet[4] = 0x00;
	packet = packet.concat(RGBData);
	device.write(packet, 65);
	device.pause(1);
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
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/mk850.png";
}