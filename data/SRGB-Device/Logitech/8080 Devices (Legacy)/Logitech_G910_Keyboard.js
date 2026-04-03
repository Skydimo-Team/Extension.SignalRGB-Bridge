export function Name() { return "Logitech G910"; }
export function VendorId() { return 0x046d; }
export function ProductId() { return [0xc335, 0xc32B]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function Size() { return [24, 9]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return (endpoint.interface === 1 && endpoint.usage === 0x0602) || (endpoint.interface === 1 && endpoint.usage === 0x0604); }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/logitech/keyboards/g910.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

const vLedNames = [
	"G Logo", "Bottom Logo",

	"G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9",

	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_/", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "ISO_Y", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
];

const vKeymap = [
	// Logo
	1, 2,

	// G Keys
	1, 2, 3, 4, 5, 6, 7, 8, 9,

	// Keyboard
	41,   58, 59, 60, 61,   62, 63, 64, 65,   66, 67, 68, 69,	70, 71, 72,
	53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,		73, 74, 75,		83, 84, 85, 86,
	43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,		76, 77, 78,		95, 96, 97, 87,
	57,   4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 50, 40,						92, 93, 94,
	225,  100,  29, 27, 6, 25, 5, 17, 16, 54, 55, 56,	229,		82,			89, 90, 91, 88,
	224, 227, 226,			44,		230, 231, 101,    228,		80, 81, 79,		98, 99,
];

const vLedPositions = [
	[0, 1], [3, 7],

	[0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [2, 0], [3, 0], [4, 0], [5, 0],

	[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],           [15, 1], [16, 1], [17, 1],            //20
	[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   [15, 2], [16, 2], [17, 2],   [18, 2], [19, 2], [20, 2], [21, 2], //21
	[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],   [15, 3], [16, 3], [17, 3],   [18, 3], [19, 3], [20, 3], [21, 3], //20
	[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],                             [18, 4], [19, 4], [20, 4], //17
	[1, 5], [2, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],  [11, 5],         [14, 5],           [16, 5],           [18, 5], [19, 5], [20, 5], [21, 5], // 17
	[1, 6], [2, 6], [3, 6],                      [7, 6],                       [11, 6], [12, 6], [13, 6], [14, 6],   [15, 6], [16, 6], [17, 6],   [18, 6], [19, 6], // 13
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	GKeySetup();
	MKeySetup();
}

export function Render() {
	sendColors();
	Apply();
	detectinputs();
	device.pause(2);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
	Apply();
}

function sendColors(overrideColor) {

	const RGBData	= [];

	for(let i = 0; i < vLedPositions.length; i++){
		const iKeyPosX = vLedPositions[i][0];
		const iKeyPosY = vLedPositions[i][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iKeyPosX, iKeyPosY);
		}

		RGBData[(i*4)]		= vKeymap[i];
		RGBData[(i*4)+1]	= color[0];
		RGBData[(i*4)+2]	= color[1];
		RGBData[(i*4)+3]	= color[2];
	}

	// Logo
	device.set_endpoint(1, 0x0602, 0xff43); // System IF

	const LogoHeader = [0x11, 0xFF, 0x0F, 0x3D, 0x00, 0x10, 0x00, 0x02];
	const LogoData = LogoHeader.concat(RGBData.splice(0, 2*4));
	device.write(LogoData, 20);
	device.pause(2);

	// GKeys
	device.set_endpoint(1, 0x0604, 0xff43); // Lighting IF

	const GKeysHeader = [0x12, 0xFF, 0x0F, 0x3F, 0x00, 0x04, 0x00, 0x09];
	const GKeysData = GKeysHeader.concat(RGBData.splice(0, 9*4));
	device.write(GKeysData, 64);
	device.pause(2);

	// Keyboard
	while(RGBData.length > 0) {
		const ledsToSend = Math.min(14, RGBData.length/4);

		const header = [0x12, 0xFF, 0x0F, 0x3B, 0x00, 0x01, 0x00, ledsToSend];
		const data = header.concat(RGBData.splice(0, ledsToSend*4));

		device.write(data, 64);
		device.pause(2);
	}

}

function Apply() {
	const packet = [];

	packet[0] = 0x11;
	packet[1] = 0xFF;
	packet[2] = 0x0F;
	packet[3] = 0x5B;

	device.set_endpoint(1, 0x0602, 0xff43); // System IF
	device.write(packet, 20);
	device.pause(1);
}

function GKeySetup() {//Controls software modes for the G and M keys
	device.set_endpoint(1, 0x0602, 0xff43); // System IF

	let packet = [0x11, 0xFF, 0x08, 0x00]; //Info
	device.write(packet, 20);

	packet = [0x11, 0xFF, 0x08, 0x20, 0x01]; //Software Enable Flag for GKeys and Mkeys
	device.write(packet, 20);
}

function MKeySetup() {//LED Control for the Mkey lights
	let packet = [0x11, 0xFF, 0x09, 0x00]; //Probably Info
	device.write(packet, 20);

	packet = [0x11, 0xFF, 0x09, 0x10, 0x00]; //Led Number Flag in binary
	device.write(packet, 20);
}

function detectinputs() {
	do {
		let packet = [];
		packet = device.read([0x00], 9, 2);

		const input = processinputs(packet);
	}
	while(device.getLastReadSize() > 0);
}

function processinputs(packet) {
	if(packet[0] == 0x11 && packet[1] == 0xff && packet[2] == 0x08)//G-Key Packet
	{
		if(packet[4] == 0x01) {
			device.log("G1 Pressed");

			return "G1";
		}

		if(packet[4] == 0x02) {
			device.log("G2 Pressed");

			return "G2";
		}

		if(packet[4] == 0x04) {
			device.log("G3 Pressed");

			return "G3";
		}

		if(packet[4] == 0x08) {
			device.log("G4 Pressed");

			return "G4";
		}

		if(packet[4] == 0x10) {
			device.log("G5 Pressed");

			return "G5";
		}

		if(packet[4] == 0x20) {
			device.log("G6 Pressed");

			return "G6";
		}

		if(packet[4] == 0x40) {
			device.log("G7 Pressed");

			return "G7";
		}

		if(packet[4] == 0x80) {
			device.log("G8 Pressed");

			return "G8";
		}

		if(packet[5] == 0x01) {
			device.log("G9 Pressed");

			return "G9";
		}
	}

	if(packet[0] == 0x11 && packet[1] == 0xff && packet[2] == 0x09)//G-Key Packet
	{
		if(packet[4] == 0x01) {
			device.log("M1 Pressed");

			return "M1";
		}

		if(packet[4] == 0x02) {
			device.log("M2 Pressed");

			return "M2";
		}

		if(packet[4] == 0x04) {
			device.log("M3 Pressed");

			return "M3";
		}
	}

	if(packet[0] == 0x11 && packet[1] == 0xff && packet[2] == 0x0a && packet[4] == 0x01)//G-Key Packet
	{
		device.log("MR Pressed");

		return "MR";
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
