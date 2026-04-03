export function Name() { return "SteelSeries Apex M750 RGB"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x0616; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [21, 6]; }
export function DeviceType(){return "keyboard"}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
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
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],           [14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                             [17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                 [13, 4],           [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [18, 5] // 13
];

const vKeymap = [
	110, 111, 112, 113, 114, 116, 117, 118, 119, 121, 122, 123, 124, 125, 126, 127, // <<- up through prtscrn
	88, 89, 90, 91, 92, 93, 94, 95, 96,  97, 98, 99, 100,  102,           103, 104, 105,     106, 107, 108, 109,
	66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,  80,             81,  82, 83,     84, 85, 86, 87,
	44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,    57,                                     62, 63, 64,
	22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,     34,                       38,           40, 41, 42, 43,
	0, 1, 2,             4,               9, 10, 11, 12,                 15, 16, 17,        19, 21
];

export function Initialize() {
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x00;
	packet[0x02] = 0x00;
	packet[0x03] = 0x00;
	packet[0x04] = 0x01;
	packet[0x05] = 0x00;
	packet[0x06] = 0x85;
	device.send_report(packet, 513);
	packet[0x00] = 0x00;
	packet[0x01] = 0x00;
	packet[0x02] = 0x00;
	packet[0x03] = 0x00;
	packet[0x04] = 0x03;
	packet[0x05] = 0x01;
	packet[0x06] = 0x00;
	packet[0x07] = 0xff;
	device.send_report(packet, 513);
	packet[0x00] = 0x00;
	packet[0x01] = 0x00;
	packet[0x02] = 0x00;
	packet[0x03] = 0x00;
	packet[0x04] = 0x01;
	packet[0x05] = 0x00;
	packet[0x06] = 0x85;
	device.send_report(packet, 513);
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Shutdown() {
	// Most of this is grabbed using usblyzer.  Usblyzer sent 524 byte packets followed
	// by 64 byte commit packets.  Here, we sent the bytes we'll use and the engine will
	// pad the rest with zeroes.  Important to note that we add 1 to the send and write functions
	// because hid firstbyte is (almost) always zero.  Use usblyzer to verify the packets sent.
	sendColor(true);


}

export function Validate(endpoint) {
	// Qck has two interfaces - return 'true' if the endpoint is at interface
	// zero.
	return endpoint.interface === 2;
}

function sendColor(shutdown = false){
	const packet = [];

	packet[0x00] = 0x00;
	packet[0x01] = 0x00;
	packet[0x02] = 0x00;
	packet[0x03] = 0x01;
	packet[0x04] = 0x8e;
	packet[0x05] = 0x01;
	packet[0x06] = 0x03;
	packet[0x07] = 0x06;
	packet[0x08] = 0x16;

	for (let i = 0; i <= 103; i++) {
		const idx = vKeymap[i];
		const iPxX = vLedPositions[i][0];
		const iPxY = vLedPositions[i][1];
		var color;

		if(shutdown){
			color = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		packet[(idx * 3) + 9] = color[0];
		packet[(idx * 3) + 10] = color[1];
		packet[(idx * 3) + 11] = color[2];
	}

	device.send_report(packet, 513);
}
export function Render() {
	sendColor();
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-m750.png";
}