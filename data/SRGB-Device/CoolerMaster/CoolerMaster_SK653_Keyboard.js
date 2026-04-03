export function Name() { return "CoolerMaster SK653"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return [0x01ab]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [21, 6]; }
export function DefaultPosition(){return [10, 100];}
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
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],           [14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                             [17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                 [13, 4],           [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [19, 5] // 13
];

const vKeymap = [
	0,   24, 32, 40, 48,    64, 72, 80, 88,    96, 104, 112, 120,    128, 136, 144,
	1, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105,      121,    129, 137, 145,    153, 161, 169, 177,
	2, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98, 106,      122,    130, 138, 146,    154, 162, 170, 178,
	3, 19, 27, 35, 43, 51, 59, 67, 75, 83, 91, 99,           123,                      155, 163, 171,
	4, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92,               124,         140,         156, 164, 172, 180,
	5, 13, 21,         53,             85, 93, 101,          125,    133, 141, 149,         165, 173
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	MagicStartupPacket();
	device.write([0x00, 0x56, 0x81, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x0C, 0x00, 0x00, 0x00, 0xBB, 0xBB, 0xBB, 0xBB], 65);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function MagicStartupPacket() {
	device.write([0x00, 0x41, 0x80], 65);
	device.write([0x00, 0x12], 65);
	device.write([0x00, 0x12, 0x20], 65);
	device.write([0x00, 0x12, 0x01], 65);
	device.write([0x00, 0x12, 0x22], 65);
	device.write([0x00, 0x42, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x01], 65);
	device.write([0x00, 0x43, 0x00, 0x00, 0x00, 0x01], 65);
}

function sendColors(overrideColor){
	const packet = [];
	packet[1] = 0x56;
	packet[2] = 0x83;
	packet[5] = 0x01;
	packet[9] = 0x80;
	packet[10] = 0x01;
	packet[12] = 0xC1;
	packet[17] = 0xFF;
	packet[18] = 0xFF;
	packet[19] = 0xFF;
	packet[20] = 0xFF;

	const colors = new Array(560).fill(0);

	for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
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

		colors[vKeymap[iIdx] * 3] = mxPxColor[0];
		colors[vKeymap[iIdx] * 3+1] = mxPxColor[1];
		colors[vKeymap[iIdx] * 3+2] = mxPxColor[2];
	}

	const firstcol = colors.splice(0, 13);
	const offset = 52;

	for(let iIdx = 0; iIdx < 14; iIdx++){
		packet[iIdx+offset] = firstcol[iIdx];
	}

	device.write(packet, 65);

	for(let packets = 1; packets < 10; packets++){
		SendPacket(packets, colors.splice(0, 60));
	}

	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0xFF], 65);
}

function SendPacket(packetIdx, data) {
	const packet = [];

	packet[0] = 0x00;
	packet[1] = 0x56;
	packet[2] = 0x83;
	packet[3] = packetIdx;
	packet[4] = 0x00;

	for (let iIdx = 0; iIdx <= 60; iIdx++){
		packet[iIdx+5] = data[iIdx];
	}

	device.write(packet, 65);
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
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/sk653.png";
}