export function Name() { return "Logitech Pro TKL"; }
export function VendorId() { return 0x046d; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function ProductId() { return 0xc339; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [18, 7]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
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
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_/", "Enter",
	"Left Shift", "ISO_Y", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
];

const vKeymap = [
	0x29,   0x3A, 0x3B, 0x3C, 0x3D,   0x3E, 0x3F, 0x40, 0x41,   0x42, 0x43, 0x44, 0x45,      0x46, 0x47, 0x48,
	0x35, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2D, 0x2E, 0x2A,      0x49, 0x4A, 0x4B,
	0x2B, 0x14, 0x1A, 0x08, 0x15, 0x17, 0x1C, 0x18, 0x0C, 0x12, 0x13, 0x2F, 0x30, 0x31,      0x4C, 0x4D, 0x4E,
	0x39,   0x04, 0x16, 0x07, 0x09, 0x0A, 0x0B, 0x0D, 0x0E, 0x0F, 0x33, 0x34, 0x32, 0x28,
	0xE1, 0x64, 0x1D, 0x1B, 0x06, 0x19, 0x05, 0x11, 0x10, 0x36, 0x37, 0x38,       0xE5,            0x52,
	0xE0, 0xE3, 0xE2,                 0x2C,                  0xE6, 0xE7, 0x65,    0xE4,      0x50, 0x51, 0x4F,
];

const vLedPositions = [

	[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],           [15, 1], [16, 1], [17, 1],
	[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   [15, 2], [16, 2], [17, 2],
	[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],   [15, 3], [16, 3], [17, 3],
	[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
	[1, 5], [2, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],                 [14, 5],           [16, 5],
	[1, 6], [2, 6], [3, 6],                      [7, 6],                       [11, 6], [12, 6], [13, 6], [14, 6],   [15, 6], [16, 6], [17, 6],

];
const vMediaPositions = [
	[17, 0], [15, 0]
];
const vLogoPositions = [
	[0, 0]
];
export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {

}


function Apply() {
	const packet = [];

	packet[0] = 0x11;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x5C;

	device.set_endpoint(1, 0x0602, 0xff43); // System IF
	device.write(packet, 20);
}


function SendLogoZones(overrideColor){

	const packet = [];
	packet[0] = 0x11;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x3E;
	packet[4] = 0x00;
	packet[5] = 0x10;
	packet[6] = 0x00;
	packet[7] = 0x01;

	for(let iIdx = 0; iIdx < vLogoPositions.length; iIdx++){
		const iLedIdx = (iIdx * 4) + 8;
		const iKeyPosX = vLogoPositions[iIdx][0];
		const iKeyPosY = vLogoPositions[iIdx][1];

		if(overrideColor){
			var col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			var col = hexToRgb(forcedColor);
		}else{
			var col = device.color(iKeyPosX, iKeyPosY);
		}

		packet[iLedIdx] = iIdx+1;
		packet[iLedIdx+1] = col[0];
		packet[iLedIdx+2] = col[1];
		packet[iLedIdx+3] = col[2];
	}

	device.set_endpoint(1, 0x0602, 0xff43); // System IF
	device.write(packet, 20);
	device.pause(1);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function SendMediaPacket(startIdx, count, overrideColor) {
	const packet = [];
	packet[0] = 0x11;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x3D;
	packet[4] = 0x00;
	packet[5] = 0x40;
	packet[6] = 0x00;
	packet[7] = count;

	for(let iIdx = 0; iIdx < count; iIdx++){
		const iLedIdx = (iIdx * 4) + 8;
		const iKeyPosX = vMediaPositions[iIdx][0];
		const iKeyPosY = vMediaPositions[iIdx][1];

		if(overrideColor){
			var col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			var col = hexToRgb(forcedColor);
		}else{
			var col = device.color(iKeyPosX, iKeyPosY);
		}

		packet[iLedIdx] = iIdx+1;
		packet[iLedIdx+1] = col[0];
		packet[iLedIdx+2] = col[1];
		packet[iLedIdx+3] = col[2];
	}

	device.set_endpoint(1, 0x0602, 0xff43); // System IF
	device.write(packet, 20);
	device.pause(1);
}

function SendPacket(startIdx, count, overrideColor) {
	const packet = [];
	packet[0] = 0x12;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x3C;
	packet[4] = 0x00;
	packet[5] = 0x01; // zone?
	packet[6] = 0x00;
	packet[7] = count; // led count

	for(let iIdx = 0; iIdx < count; iIdx++){
		const iLedIdx = (iIdx * 4) + 8;
		const iKeyIdx = startIdx + iIdx;
		const iKeyPosX = vLedPositions[iKeyIdx][0];
		const iKeyPosY = vLedPositions[iKeyIdx][1];

		if(overrideColor){
			var col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			var col = hexToRgb(forcedColor);
		}else{
			var col = device.color(iKeyPosX, iKeyPosY);
		}

		packet[iLedIdx] = vKeymap[iKeyIdx];
		packet[iLedIdx+1] = col[0];
		packet[iLedIdx+2] = col[1];
		packet[iLedIdx+3] = col[2];
	}

	device.set_endpoint(1, 0x0604, 0xff43); // Lighting IF
	device.write(packet, 64);
	device.pause(1);
}

export function Render() {
	SendPacket(0, 14);
	SendPacket(14, 14);
	SendPacket(28, 14);
	SendPacket(42, 14);
	SendPacket(56, 14);
	SendPacket(70, 14);
	SendPacket(84, 5);
	SendMediaPacket(0, 2);
	SendLogoZones();
	Apply();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	SendPacket(0, 14, color);
	SendPacket(14, 14, color);
	SendPacket(28, 14, color);
	SendPacket(42, 14, color);
	SendPacket(56, 14, color);
	SendPacket(70, 14, color);
	SendPacket(84, 5, color);
	SendMediaPacket(0, 2, color);
	SendLogoZones(color);
	Apply();
}


export function Validate(endpoint) {
	return (endpoint.interface === 1 && endpoint.usage === 0x0602) ||
           (endpoint.interface === 1 && endpoint.usage === 0x0604);
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/logitech/keyboards/pro-tkl.png";
}