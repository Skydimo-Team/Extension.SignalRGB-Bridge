export function Name() { return "CoolerMaster SK620"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return [0x0087, 0x0159, 0x0149, 0x014B]; }
export function Publisher() { return "WhirlwindFX && saxXxekaf"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [17, 7]; }
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
	"L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12", "L13", "L14", "L15", //15

	"L41", 		"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "+", "Backspace",  									"L16", // 16
	"L40",		"Tab", "Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "[", "]", 													"L17", // 15
	"L39", 		"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "#", "Enter", 									"L18", // 16
	"L38",		"Left Shift", "<>", "Y", "X", "C", "V", "B", "N", "M", ",", ".", "-", "Right Shift", "Up Arrow", "Entf", 			"L19", // 17
	"L37",		"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Switch", "Left Arrow", "Down Arrow", "Right Arrow",		"L20", // 11

	"L36",	    "L35", "L34", "L33", "L32", "L31", "L30", "L29", "L28", "L27", "L26", "L25", "L24", "L23", "L22", 					"L21"  // 16
];

const vLedPositions = [
	[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],

	[0, 1], 		[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], 			[16, 1],
	[0, 2], 		[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], 					[16, 2],
	[0, 3], 		[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 			[16, 3],
	[0, 4], 		[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 3], 	[16, 4],
	[0, 5], 		[1, 5], [2, 5], [3, 5], 						[7, 5], 						 [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], 	[16, 5],

	[0, 6], 		[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],			[16, 6]
];

const vKeys = [
	7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105,

	0, 		8, 15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 106, 			112,
	1,		9, 23, 30, 37, 44, 51, 58, 65, 72, 79, 86, 93, 100, 				113,
	2,		10, 24, 31, 38, 45, 52, 59, 66, 73, 80, 87, 94, 101, 108, 			114,
	3,		11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 88, 95, 102, 109, 		115,
	4,		12, 19, 26, 54, 82, 89, 96, 103, 110, 								116,

	6, 		20, 27, 34, 41, 48, 55, 62, 69, 76, 83, 90, 97, 104, 111,			118
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	switch (device.productId()) {
	case 0x0159:
		device.setName("CoolerMaster SK620");
		break;
	case 0x0087:
		device.setName("CoolerMaster SK621");
		break;
	default:
		device.setName("CoolerMaster SK622");
		break;
	}

	MagicStartupPacket();
	device.write([0x00, 0x56, 0x81, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x09, 0x00, 0x00, 0x00, 0xBB, 0xBB, 0xBB, 0xBB], 65);
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
	packet[13] = 0xFF;
	packet[19] = 0xFF;
	packet[20] = 0xFF;

	const colors = new Array(560);

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

		colors[vKeys[iIdx] * 3] = mxPxColor[0];
		colors[vKeys[iIdx] * 3+1] = mxPxColor[1];
		colors[vKeys[iIdx] * 3+2] = mxPxColor[2];
	}

	// first block
	const offset = 25;
	const firstcol = colors.splice(0, 40); // package size(65) - offset

	for(let iIdx = 0; iIdx <= 40; iIdx++){
		packet[iIdx+offset] = firstcol[iIdx];
	}

	device.write(packet, 65);

	// other blocks
	for(let iIdx = 1; iIdx <= 6; iIdx++){ // 6 blocks needed
		SendPacket(iIdx, colors.splice(0, 60));
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
	return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/sk622.png";
}