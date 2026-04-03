export function Name() { return "XPG Summoner"; }
export function VendorId() { return 0x125F; }
export function ProductId() { return 0x9418; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [21, 6]; }
export function DefaultPosition(){return [10, 100]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "keyboard";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
export function ConflictingProcesses() {
	return ["XPG-Prime.exe" ];
}

const vKeys = [
	11,		22, 30, 25, 27,  7, 51, 57, 62, 86, 87, 83, 85,		 79, 72, 0, //16
	14, 15, 23, 31, 39, 38, 46, 47, 55, 63, 71, 70, 54, 81,		102, 118, 110,	92, 100, 108, 109, //21
	 9,  8, 16, 24, 32, 33, 41, 40, 48, 56, 64, 65, 49, 82,		 94, 119, 111,	88, 96, 104, 112, //21
	17, 10, 18, 26, 34, 35, 43, 42, 50, 58, 66, 67,		84,						89, 97, 105, //16
	121, 12, 20, 28, 36, 37, 45, 44, 52, 60, 69,	   122,			115,		90, 98, 106, 114, //17
	6, 124, 75,			 91,				77, 125, 61, 4,		117, 93, 101,	99, 107 //13
];

const vKeyNames = [
	"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",  "Print Screen", "Scroll Lock", "Pause Break", //16
	"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",			"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -", //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",					"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +", //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			"Enter",														"Num 4", "Num 5", "Num 6", //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",						"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",		"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0", "Num ." //13
];

const vKeyPositions = [
	[0, 0],			[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], //16
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1],	[17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],	[17, 2], [18, 2], [19, 2], [20, 2], //21
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],								[17, 3], [18, 3], [19, 3], //16
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],				   [13, 4],			 [15, 4],			[17, 4], [18, 4], [19, 4], [20, 4], //17
	[0, 5], [1, 5], [2, 5],					[5, 5],									[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],	[17, 5], [18, 5] //13
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	console.log("Device developed on Firmware v1012");
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		//sendColors(shutdownColor);
		device.send_report([0x07, 0xa6, 0x00, 0x4D], 265); // Hardware
	}
}

function sendColors(overrideColor) {

	const RGBData	= [];
	const packet	= [];

	packet[0] = 0x07;
	packet[1] = 0xA3;
	packet[2] = 0x08;
	packet[3] = 0x00;
	packet[5] = 0x00;

	for (let idx = 0; idx < vKeys.length; idx++) {
		const iPxX = vKeyPositions[idx][0];
		const iPxY = vKeyPositions[idx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx		= vKeys[idx]*4;
		RGBData[iLedIdx]	= 0x64;
		RGBData[iLedIdx+1]	= color[0];
		RGBData[iLedIdx+2]	= color[1];
		RGBData[iLedIdx+3]	= color[2];
	}

	for (let idx = 0; idx < 2; idx++) {
		packet[4] = idx; // Zone 00 or 01

		const data = packet.concat(RGBData.splice(0, 256));
		device.send_report(data, 265);
	}

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

export function Validate(endpoint) {
	//return endpoint.interface === 1 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0001;
	//return endpoint.interface === 2 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00 && endpoint.collection === 0x0001;
	return endpoint.interface === 2 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff01 && endpoint.collection === 0x0002;
	//return endpoint.interface === 0 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0000;
	//return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000c && endpoint.collection === 0x0002;
	//return endpoint.interface === 1 && endpoint.usage === 0x0002 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0003;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/xpg/keyboards/summoner.png";
}
