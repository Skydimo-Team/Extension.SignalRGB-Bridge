export function Name() { return "Roccat Vulcan Pro"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x30F7; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [24, 8]; }
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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

}

export function Initialize() {
	device.set_endpoint(1, 1, 0xff01);


	sendReportString("0D 10 00 00 02 0B 45 00 00 00 00 00 00 00 00 00", 16);
	device.pause(10);
	sendReportString("0E 05 01 00 00", 5);
	device.pause(10);
}


export function Shutdown() {
	device.set_endpoint(1, 1, 0xff01);

	sendReportString("0E 05 00 00 00", 5);

}


// This is an array of key indexes for setting colors in our render array, indexed left to right, row top to bottom.
const vKeys = [

	2,   13, 20, 25, 30,    40, 47, 53, 59, 65, 71, 77, 79, 83, 87, 92,
	3, 8, 14, 21, 26, 31, 36, 41, 48, 54, 60, 66, 72, 80,  84, 88, 93,  97, 103, 108, 114,
	4, 9, 15, 22, 27, 32, 37, 42, 49, 55, 61, 67, 73, 81,  85, 89, 94,  98, 104, 109, 115,
	5, 10, 16, 23, 28, 33, 38, 43, 50, 56, 62, 68,    82,             99, 105, 110,
	0,  11, 17, 24, 29, 34, 39, 44, 51, 57, 63,       75,     90,     100, 106, 111, 117,
	1, 7, 12,           35,        58, 64, 70,  76,  86, 91, 95,  101,    112,

];


// This array must be the same length as vKeys[], and represents the pixel color position in our pixel matrix that we reference.  For example,
// item at index 3 [9,0] represents the corsair logo, and the render routine will grab its color from [9,0].
const vKeyPositions = [
	[0, 1],    [1, 1], [2, 1], [3, 1], [4, 1],    [6, 1], [7, 1], [8, 1], [9, 1],  [10, 1], [11, 1], [12, 1], [13, 1],      [14, 1], [15, 1], [16, 1],
	[0, 2],  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],     [14, 2], [15, 2], [16, 2],   [17, 1], [18, 2], [19, 2], [20, 2],
	[0, 3],    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3],
	[0, 4],    [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],                             [17, 4], [18, 4], [19, 4],
	[0, 5],      [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],               [13, 5],           [15, 5],           [17, 5], [18, 5], [19, 5], [20, 5],
	[0, 6], [1, 6], [2, 6],                      [6, 6],                       [10, 6],   [11, 6], [12, 6], [13, 6],    [14, 6], [15, 6], [16, 6],   [17, 6],         [19, 6],
];
const vKeyNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

function sendReportString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.send_report(packet, size);
}

export function Render() {
	sendColors();
}

function sendColors(shutdown = false){

	device.set_endpoint(3, 1, 0xff00);

	const RGBData = new Array(144*3).fill(0);

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		var col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}
		const index = (Math.floor(vKeys[iIdx] / 12) * 36) + (vKeys[iIdx] % 12);

		RGBData[index + 0] = col[0];
		RGBData[index + 12] = col[1];
		RGBData[index + 24] = col[2];
	}

	for(let packetCount = 1; packetCount < 7; packetCount++){
		let packet = [];
		packet[0x00]   = 0x00;
		packet[0x01]   = 0xA1;
		packet[0x02]   = packetCount;
		packet[0x03]   = packetCount == 1 ? 0x80 : 0x00;
		packet[0x04]   = packetCount == 1 ? 0x01 : 0x00;
		packet = packet.concat(RGBData.splice(0, 60));
		device.write(packet, 65);
	}


}

export function Validate(endpoint) {
	return endpoint.interface === 3 || endpoint.interface === 1  && endpoint.usage_page === 0xff01;
}


export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/keyboards/vulcan-pro.png";
}