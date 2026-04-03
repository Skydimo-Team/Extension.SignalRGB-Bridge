export function Name() { return "SteelSeries Apex M750 TKL"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return [0x0617, 0x0619]; } // 0x0619 PUBG Edition
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [17, 6]; }
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
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow"
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],            [14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      		[10, 5], [11, 5], [12, 5], [13, 5],	  [14, 5], [15, 5], [16, 5],
];

const vKeymap = [
	90, 91, 92, 93, 94, 	96, 97, 98, 99, 	101, 102, 103, 104,		105, 106, 107, // <<- up through prtscrn
	72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84,  86,           87, 88, 89,
	54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,  68,           69, 70, 71,
	36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49,
	18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30,                       	34,
	0, 1, 2,             4,              9, 10, 11, 12,                 15, 16, 17,
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x81], 513);
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x04, 0x01], 513);
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x05, 0x01, 0x01, 0x01, 0x00, 0xeb, 0x0c, 0x0c], 513);
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00, 0x00, 0x00, 0x01], 513);
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x04, 0x00, 0x2d, 0x01], 513);
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00, 0xfe, 0x00, 0x06], 513);

	//device.send_report([0x00, 0x00, 0x00, 0x00, 0x05, 0x01, 0x05, 0x01, 0x00, 0x00, 0xcd, 0xff], 513)
	//device.send_report([0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x04, 0x01, 0x0a], 513)
	//device.send_report([0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00, 0x04, 0x00, 0x06], 513)
	//device.send_report([0x00, 0x00, 0x00, 0x00, 0x02, 0x01, 0x06, 0x01, 0xff], 513)
	//device.send_report([0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x02, 0x01, 0x00, 0xb7], 513)
}

export function Render() {
	sendColor();
}

export function Shutdown() {
	sendColor(true);
}

function sendColor(shutdown = false){
	const packet = [];
	packet[4] = 0xff;
	packet[5] = 0x01;
	packet[6] = 0x03;
	packet[7] = 0x06;
	packet[8] = 0x12;

	for (let i = 0; i < vLedPositions.length; i++) {
		const iPxX = vLedPositions[i][0];
		const iPxY = vLedPositions[i][1];
		const idx = vKeymap[i];
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
	device.send_report([0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x04, 0x00, 0x2d, 0x01], 513); //Apply
	device.pause(2);
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
	return endpoint.interface === 2;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-m750-tkl.png";
}