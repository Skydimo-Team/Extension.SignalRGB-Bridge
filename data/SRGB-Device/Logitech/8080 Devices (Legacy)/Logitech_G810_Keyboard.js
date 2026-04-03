export function Name() { return "Logitech G810"; }
export function VendorId() { return 0x046d; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function ProductId() { return [0xc331, 0xc337]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [24, 9]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) {
	return (endpoint.interface === 1 && endpoint.usage === 0x0602) ||
           (endpoint.interface === 1 && endpoint.usage === 0x0604);
}
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/logitech/keyboards/g810.png"; }
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
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_/", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "ISO_Y", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
	"G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G logo", "Bottom Logo"
];

const vKeymap = [

	0x29,   0x3A, 0x3B, 0x3C, 0x3D,   0x3E, 0x3F, 0x40, 0x41,   0x42, 0x43, 0x44, 0x45,      0x46, 0x47, 0x48,
	0x35, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2D, 0x2E, 0x2A,      0x49, 0x4A, 0x4B,    0x53, 0x54, 0x55, 0x56,
	0x2B, 0x14, 0x1A, 0x08, 0x15, 0x17, 0x1C, 0x18, 0x0C, 0x12, 0x13, 0x2F, 0x30, 0x31,      0x4C, 0x4D, 0x4E,    0x5F, 0x60, 0x61, 0x57,
	0x39,   0x04, 0x16, 0x07, 0x09, 0x0A, 0x0B, 0x0D, 0x0E, 0x0F, 0x33, 0x34, 0x32, 0x28,                           0x5C, 0x5D, 0x5E,
	0xE1,  0x64,  0x1D, 0x1B, 0x06, 0x19, 0x05, 0x11, 0x10, 0x36, 0x37, 0x38,       0xE5,            0x52,          0x59, 0x5A, 0x5B, 0x58,
	0xE0, 0xE3, 0xE2,                 0x2C,                  0xE6, 0xE7, 0x65,    0xE4,      0x50, 0x51, 0x4F,    0x62, 0x63,

	0xD2, 0x9B, 0x9D, 0x9C, 0x9E, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8
];

const vLedPositions = [

	[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],           [15, 1], [16, 1], [17, 1],            //20
	[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   [15, 2], [16, 2], [17, 2],   [18, 2], [19, 2], [20, 2], [21, 2], //21
	[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],   [15, 3], [16, 3], [17, 3],   [18, 3], [19, 3], [20, 3], [21, 3], //20
	[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],                             [18, 4], [19, 4], [20, 4], //17
	[1, 5], [2, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],  [11, 5],         [14, 5],           [16, 5],           [18, 5], [19, 5], [20, 5], [21, 5], // 17
	[1, 6], [2, 6], [3, 6],                      [7, 6],                       [11, 6], [12, 6], [13, 6], [14, 6],   [15, 6], [16, 6], [17, 6],   [18, 6], [19, 6], // 13
	[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]
];
const vGkeyPositions = [
	[0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [2, 0], [3, 0], [4, 0], [5, 0]
];
const vLogoPositions = [
	[0, 1], [3, 7]
];
export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {

}

export function Render() {
	SendPacket(0, 14);
	SendPacket(14, 14);
	SendPacket(28, 14);
	SendPacket(42, 14);
	SendPacket(56, 14);
	SendPacket(70, 14);
	SendPacket(84, 14);
	SendPacket(98, 9);
	SendGkeys();
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
	SendPacket(84, 14, color);
	SendPacket(98, 9, color);
	SendGkeys(color);
	SendLogoZones(color);
	Apply();
}

function Apply() {
	const packet = [];

	packet[0] = 0x11;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x5D;

	device.set_endpoint(1, 0x0602, 0xff43); // System IF
	device.write(packet, 20);
}

function SendGkeys(overrideColor) {
	const packet = [];
	packet[0] = 0x12;
	packet[1] = 0xFF;
	packet[2] = 0x0c;
	packet[3] = 0x3d;
	packet[4] = 0x00;
	packet[5] = 4;
	packet[6] = 0x00;
	packet[7] = 9; // led count

	for(let iIdx = 0; iIdx < vGkeyPositions.length; iIdx++){
		const iLedIdx = (iIdx * 4) + 8;
		const iKeyPosX = vGkeyPositions[iIdx][0];
		const iKeyPosY = vGkeyPositions[iIdx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iKeyPosX, iKeyPosY);
		}

		packet[iLedIdx] = iIdx;
		packet[iLedIdx+1] = color[0];
		packet[iLedIdx+2] = color[1];
		packet[iLedIdx+3] = color[2];
	}


	device.set_endpoint(1, 0x0604, 0xff43); // Lighting IF
	device.write(packet, 64);
	device.pause(1);
}

function SendLogoZones(overrideColor){
	const packet = [];
	packet[0] = 0x11;
	packet[1] = 0xFF;
	packet[2] = 0x0c;
	packet[3] = 0x3d;
	packet[4] = 0x00;
	packet[5] = 0x10;
	packet[6] = 0x00;
	packet[7] = 0x02;

	for(let iIdx = 0; iIdx < vLogoPositions.length; iIdx++){
		const iLedIdx = (iIdx * 4) + 8;
		const iKeyPosX = vLogoPositions[iIdx][0];
		const iKeyPosY = vLogoPositions[iIdx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iKeyPosX, iKeyPosY);
		}

		packet[iLedIdx] = iIdx+1;
		packet[iLedIdx+1] = color[0];
		packet[iLedIdx+2] = color[1];
		packet[iLedIdx+3] = color[2];
	}

	//device.set_endpoint(1, 0x0604, 0xff43); // Lighting IF
	device.set_endpoint(1, 0x0602, 0xff43); // System IF

	device.write(packet, 20);
	device.pause(1);
}

function SendPacket(startIdx, count, overrideColor) {
	const packet = [];
	packet[0] = 0x12;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x3D;
	packet[4] = 0x00;
	packet[5] = 0x01; // zone?
	packet[6] = 0x00;
	packet[7] = count; // led count

	for(let iIdx = 0; iIdx < count; iIdx++){
		const iLedIdx = (iIdx * 4) + 8;
		const iKeyIdx = startIdx + iIdx;
		const iKeyPosX = vLedPositions[iKeyIdx][0];
		const iKeyPosY = vLedPositions[iKeyIdx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iKeyPosX, iKeyPosY);
		}

		packet[iLedIdx] = vKeymap[iKeyIdx];
		packet[iLedIdx+1] = color[0];
		packet[iLedIdx+2] = color[1];
		packet[iLedIdx+3] = color[2];
	}

	device.set_endpoint(1, 0x0604, 0xff43); // Lighting IF
	device.write(packet, 64);
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
