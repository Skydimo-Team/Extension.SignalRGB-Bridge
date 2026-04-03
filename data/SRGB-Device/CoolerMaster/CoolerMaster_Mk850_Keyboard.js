export function Name() { return "CoolerMaster MK850"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x0069; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [21, 6]; }
export function DefaultPosition(){return [10, 100];}
export function DefaultScale(){return 8.0;}
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

const vLedNames = [
	//"Scroll wheel", "NumLock", "Caps Lock",

	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", 		 "Pause Break",  "Aimpad", "AimPad Sensitivity Down",  "AimPad Sensitivity Up",
	"M1", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       		 "Num /", "Num *", "Num -",  //21
	"M2", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"M3", 		 "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"M4", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"M5", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],           [14, 0], 	  [16, 0],           [18, 0], [19, 0], [20, 0],
	[0, 1],   [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   	  [18, 1], [19, 1], [20, 1], //21
	[0, 2],   [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3],   	 [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                             [17, 3], [18, 3], [19, 3], // 17
	[0, 4],   [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                 [13, 4],           [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5],   [0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [19, 5] // 13
];
const vKeys = [
	// 125, 140, 9
	6,   27, 34, 41, 48,    62, 69, 76, 83,   90, 97, 104, 111,     118,      132,       146, 153, 160,
	0,  7, 21, 28, 35, 42, 49, 56, 63, 70, 77,  84, 91, 98,  112,     119, 126, 133,       147, 154, 161,
	1,  8, 22, 29, 36, 43, 50,  57, 64, 71, 78, 85, 92, 99,  113,     120, 127, 134,   141, 148, 155, 162,
	2,     23,  30, 37, 44, 51, 58, 65, 72, 79, 86, 93,       114,                      142, 149, 156,
	3,  10, 24, 31, 38, 45, 52, 59, 66, 73, 80, 87,          115,          129,        143, 150, 157, 164,
	4,  11, 18, 25,            53,               81, 88, 95, 116,     123, 130, 137,   144,    158,
];


export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x51, 0x00, 0x00, 0x00, 0x05], 65); //Set Profile
	SendCommits();
}

export function Render() {
	sendColors();
	SendCommits();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
		SendCommits();
	}else{
		device.write([0x00, 0x41, 0x80], 65);
		device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0x01], 65);
	}

}

function sendColors(overrideColor){
	const RGBData = [];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
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

		RGBData[vKeys[iIdx]*3] = mxPxColor[0];
		RGBData[vKeys[iIdx]*3 +1 ] = mxPxColor[1];
		RGBData[vKeys[iIdx]*3 +2 ] = mxPxColor[2];
	}

	//Send the first 4 Macro Keys
	//var InitColorPacket = [0x00, 0x56, 0x21, 0x03, 0x00, 0x23, 0x00, 0x00, 0x00, 0x27, 0x00, 0x01, 0x00, 0x80, 0x01, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, //0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
	//InitColorPacket = InitColorPacket.concat(RGBData.splice(0,12));
	//device.write(InitColorPacket,65);
	for(let packetCount = 1; packetCount < 9; packetCount++){

		StreamPacket(packetCount,
			RGBData.splice(0, 60)
		);
	}


	//var FinalColorPacket = [0x00, 0x56, 0x21, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00,0x00,0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3B, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x2F, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0xC1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x80, 0x08, 0x10, 0x00, 0x00]

	//FinalColorPacket[8] = RGBData[0]
	//FinalColorPacket[9] = RGBData[1]
	//FinalColorPacket[10] = RGBData[2]

	//device.write(FinalColorPacket,65);


}

function StreamPacket(packetId, RGBData){
	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0x56;
	packet[2] = 0x83;
	packet[3] = packetId;
	packet[4] = 0x00;
	packet = packet.concat(RGBData);
	device.write(packet, 65);
	device.read(packet, 65);
}

function SendCommits(){
	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0xFF], 65);
	device.pause(3);
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
	return endpoint.interface === 1;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/mk850.png";
}