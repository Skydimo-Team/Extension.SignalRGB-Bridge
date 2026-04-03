export function Name() { return "Razer Ornata V3 TKL"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return 0x02A3; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [17, 6]; }
export function DefaultPosition(){return [240, 120];}
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
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break", //15
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",           "Insert", "Home", "Page Up",  //17
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                  "Del", "End", "Page Down", //17
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", 										//13
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                          "Up Arrow", //13
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",    "Left Arrow", "Down Arrow", "Right Arrow", //11
];

const vLedPositions = [
	[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0], //15
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1], //17
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2], //17
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],								 //13
	[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],            [15, 4],			 //13
	[0, 5], [1, 5], [2, 5],                 		[6, 5],                       	[10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5], //11
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	Init();
}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function Init() { //Lighting Config
	const packet = [];
	packet[2] = 0x1f;
	packet[6] = 0x06;
	packet[7] = 0x0f;
	packet[8] = 0x02;
	packet[11] = 0x08;
	packet[12] = 0x03;
	packet[13] = 0x88;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
}

function sendColors(overrideColor) {

	const packet = [];
	packet[2] = 0x1f;
	packet[6] = 0x23; //35 bytes
	packet[7] = 0x0f;
	packet[8] = 0x03;
	packet[13] = 0x09; //9 LEDs? though we're writing 10

	for (let idx = 0; idx < 10; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];
		var color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}
		const iLedIdx = (idx*3) + 14;
		packet[iLedIdx]   = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] =	color[2];
	}

	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
	device.pause(1);

}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
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
	return endpoint.interface === 2 && endpoint.usage === 0x0002 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/ornata-v3-tkl.png";
}
