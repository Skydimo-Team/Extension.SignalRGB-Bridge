export function Name() { return "Roccat Vulcan II Mini"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2f09; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [21, 8]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
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

const vKeys =
[
	0, 6, 12, 13, 18, 24, 30, 31, 36, 42, 48, 54, 60, 66, 72,
	1, 7, 14, 19, 20, 25, 32, 38, 37, 43, 49, 55, 61, 67, 73,
	2, 8, 15, 21, 26, 27, 33, 39, 45, 50, 51, 56, 68,     74,
	3, 9, 16, 23, 28, 29, 34, 40, 46, 52, 57, 64,     70, 75,
	4, 10, 11,         35,             53, 58, 59, 65, 71, 76,
];

const vKeyPositions =
[
	[0, 0],  [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],     [14, 0], //15
	[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],     [14, 1], //15
	[0, 2],  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],  	    [13, 2],	 [14, 2],  //14
	[0, 3],  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],	 [14, 3],  //14
	[0, 4],  [1, 4], [2, 4],                         [6, 4],                 [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],     [14, 4], //10
];

const vKeyNames =
[
	"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",   "Del",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",            "Home",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",    "Page Up",
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Page Down", //14
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn",  "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow"                   //10
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {

	device.set_endpoint(1, 1, 0xff01);
	device.send_report([ 0x0d, 0x10, 0x00, 0x00, 0x02, 0x0f, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ], 16);
	device.pause(30);
	device.send_report([0x0e, 0x05, 0x01, 0x00, 0x00], 5);
}

export function Render() {
	sendColors();
}

export function Shutdown() {
	device.set_endpoint(1, 1, 0xff01);

	device.send_report([0x0e, 0x05, 0x00, 0x00, 0x00], 5);

}

function sendColors(shutdown = false) {

	device.set_endpoint(3, 1, 0xff00);

	const RGBData = new Array(144*3).fill(0);

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		RGBData[vKeys[iIdx] * 3 + 0] = col[0];
		RGBData[vKeys[iIdx] * 3 + 1] = col[1];
		RGBData[vKeys[iIdx] * 3 + 2] = col[2];
	}

	for(let packetCount = 1; packetCount < 10; packetCount++) {
		let packet = [];
		packet[0x00]   = 0x00;
		packet[0x01]   = 0xA1;
		packet[0x02]   = packetCount;
		packet[0x03]   = packetCount === 1 ? 0x37 : 0x00;
		packet[0x04]   = packetCount === 1 ? 0x02 : 0x00;
		packet = packet.concat(RGBData.splice(0, 60));
		device.write(packet, 65);
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
	return endpoint.interface === 3 || endpoint.interface === 1  && endpoint.usage_page === 0xff01;
}


export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/roccat/keyboards/vulcan-ii-mini.png";
}