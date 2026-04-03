export function Name() { return "Logitech G513"; }
export function VendorId() { return 0x046d; }
export function ProductId() { return 0xC33C; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function Size() { return [21, 6]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 1 && endpoint.usage === 0x0602 || endpoint.usage === 0x0604; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/logitech/keyboards/g513.png"; }
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
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                 "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                        "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",                                               "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",               "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];

const vLeds = [
	41,		58, 59, 60, 61,		62, 63, 64, 65,   66, 67, 68, 69,		70, 71, 72,
	53,	30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 	42,		73, 74, 75,		83, 84, 85, 86,
	43,	20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 		49,		76, 77, 78,		95, 96, 97, 87,
	57,	4,	22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 50, 		40,						92, 93, 94,
	225,	100, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 135, 229,			82,			89, 90, 91, 88,
	224, 227, 226,           44,				230, 231, 101, 228,		80, 81, 79,		98, 99
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], 				[14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], 	[14, 1], [15, 1], [16, 1], 	[17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], 	[14, 2], [15, 2], [16, 2], 	[17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],                            		[17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],  [10, 4], [12, 4], [13, 4],				 [15, 4],          	[17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      	[6, 5],                      	[10, 5], [11, 5], [12, 5], [13, 5], 	[14, 5], [15, 5], [16, 5],  [17, 5], [18, 5] // 13
];

export function LedNames(){
	return vLedNames;
}

export function LedPositions(){
	return vLedPositions;
}

export function Initialize(){

}

export function Render(){
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {

	const RGBData	= [];

	for (let idx = 0; idx < vLeds.length; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		RGBData[(idx*4)]	= vLeds[idx];
		RGBData[(idx*4)+1] 	= color[0];
		RGBData[(idx*4)+2]	= color[1];
		RGBData[(idx*4)+3]	= color[2];
	}

	while(RGBData.length > 0) {
		device.set_endpoint(1, 0x0604, 0xff43); // Lighting IF

		const ledsToSend = Math.min(14, RGBData.length/4);

		const header	= [0x12, 0xFF, 0x0C, 0x3E, 0x00, 0x01, 0x00, ledsToSend];
		const data		= RGBData.splice(0, ledsToSend*4);
		const packet	= header.concat(data);

		device.write(packet, 64);
		device.pause(1);
	}

	apply();
}

function apply() {
	device.set_endpoint(1, 0x0602, 0xff43); // System IF

	const packet = [0x11, 0xFF, 0x0C, 0x5E];
	device.write(packet, 20);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
