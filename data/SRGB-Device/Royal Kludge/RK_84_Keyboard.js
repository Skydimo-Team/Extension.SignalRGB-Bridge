export function Name() { return "Royal Kludge RK84"; }
export function Publisher() { return "Mizzen"; }
export function VendorId() { return  0x258a;}  //Device's USB Vendor Id in Hex
export function ProductId() { return [0x005d, 0x0059, 0x00c8, 0x010D, 0x00F4, 0x00F3];} // 0x00F3 RK84 Pro
export function Size() { return [31, 11]; }
export function DefaultPosition(){return [0, 5];}
export function DefaultScale(){return 1.5;}
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

const vKeyNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Print Screen", "Pause Break", "Del",
	"`",   "1",  "2",  "3",  "4",  "5",  "6",  "7",  "8",  "9",  "0",   "-_",  "+=",         "Backspace",          "Home",
	"Tab",    "Q",  "W",  "E",  "R",  "T",  "Y",  "U",  "I",  "O",   "P",   "[",    "]",       "\\",              "End",
	"CapsLock", "A",  "S",  "D",  "F",  "G",  "H",  "J",  "K",  "L",   ";",   "'",            "Enter",             "Page Up",
	"Left Shift", "Z",  "X",  "C",  "V",  "B",  "N",  "M",  ",",  ".",  "/",   "Right Shift",  "Up Arrow",         "Page DoWN",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow",       "Right Arrow"
];

const vKeys =
[
	1,  19, 37, 55, 73, 91,  109, 127, 145, 163, 181, 199, 217, 235, 253, 271,
	4,  22, 40, 58, 76, 94,  112, 130, 148, 166, 184, 202, 220, 238,      274,
	7,  25, 43, 61, 79, 97,  115, 133, 151, 169, 187, 205, 223, 241,      277,
	10, 28, 46, 64, 82, 100, 118, 136, 154, 172, 190, 208,      244,      280,
	13, 31, 49, 67, 85, 103, 121, 139, 157, 175, 193, 211,           265, 283,
	16, 34, 52,         106,           160, 178, 196,           250, 268, 286
];

const vKeyPositions = [
	[ 0, 0], [ 2, 0], [ 4, 0], [ 6, 0], [ 8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0], [24, 0], [26, 0], [28, 0], [30, 0],
	[ 0, 2], [ 2, 2], [ 4, 2], [ 6, 2], [ 8, 2], [10, 2], [12, 2], [14, 2], [16, 2], [18, 2], [20, 2], [22, 2], [24, 2],      [27, 2],     [30, 2],
	[ 0, 4],     [ 3, 4], [ 5, 4], [ 7, 4], [ 9, 4], [11, 4], [13, 4], [15, 4], [17, 4], [19, 4], [21, 4], [23, 4], [25, 4],   [ 28, 4],  [30, 4],
	[ 1, 6],     [ 3, 6], [ 5, 6], [ 7, 6], [ 9, 6], [11, 6], [13, 6], [15, 6], [17, 6], [19, 6], [21, 6], [23, 6],        [27, 6],      [30, 6],
	[ 1, 8],      [ 4, 8], [ 6, 8], [ 8, 8], [10, 8], [12, 8], [14, 8], [16, 8], [18, 8], [20, 8], [22, 8],     [25, 8],     [28, 8], [30, 8],
	[ 0, 10],   [ 2, 10],   [ 4, 10],                           [13, 10],                        [20, 10], [22, 10], [24, 10], [26, 10], [28, 10], [30, 10]
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
	sendZonefake(6);
	sendZonefake(7);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		//Do nothing. Keeb reverts to hardware mode when streaming is stopped.
	}

}

function sendZonefake(zone) {
	const packet = [];
	packet[0x00] = 0x0a;
	packet[0x01] = 0x07;
	packet[0x02] = zone;

	device.pause(1);
	device.send_report(packet, 65);
}

function sendInitalPacket(data) {
	let packet = [];

	packet[0x00] = 0x0A;
	packet[0x01] = 0x07;
	packet[0x02] = 0x01;
	packet[0x03] = 0x06;

	packet = packet.concat(data);

	device.send_report(packet, 65);
}

function StreamPacket(zone, data) {
	let packet = [];

	packet[0x00] = 0x0a;
	packet[0x01] = 0x07;
	packet[0x02] = zone;
	packet = packet.concat(data);

	device.pause(1);
	device.send_report(packet, 65);
}

function sendColors(overrideColor) {
	const RGBData = new Array(425).fill(0);

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		var col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		RGBData[vKeys[iIdx] ] = col[0];
		RGBData[vKeys[iIdx] +  1] = col[1];
		RGBData[vKeys[iIdx] +  2] = col[2];
	}

	sendInitalPacket(RGBData.splice(0, 61));
	StreamPacket(2, RGBData.splice(0, 62));
	StreamPacket(3, RGBData.splice(0, 62));
	StreamPacket(4, RGBData.splice(0, 62));
	StreamPacket(5, RGBData.splice(0, 62));
	device.pause(1);
}

export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00 && endpoint.collection === 0x0005;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/royal-kludge/keyboards/rk84.png";
}