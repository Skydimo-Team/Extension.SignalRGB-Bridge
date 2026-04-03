export function Name() { return "CoolerMaster CK721"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x016D; } // TODO: 0x01C3 Wireless
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [15, 5]; }
export function DefaultPosition() {return [75, 70]; }
export function DefaultScale(){return 8.0; }
export function ConflictingProcesses() { return ["MasterPlusApp.exe"]; }
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
	"Esc", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace", //14
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", //15
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			"Enter", "PgUp", //15
	"Left Shift", "<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PgDn", //15
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Menu", "Right Ctrl", "Left Arrow",  "Down Arrow", "Right Arrow" //10
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], 		//14
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], //15
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], 		   [13, 2], [14, 2], //15
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],	[14, 3], //15
	[0, 4], [1, 4], [2, 4],			  		[6, 4],			  				[9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4] //10
];

const vLeds = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 				//14
	15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,	28, 29, //15
	30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 	42,	43, //15
	44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 57,	56, 58, //15
	59, 60, 61,      	63, 			66, 68, 69, 70, 64, 67	//10
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x80, 0x01, 0x01, 0x02, 0x02], 65); //Software mode
	device.write([0x00, 0x01, 0x81, 0xC8, 0x00, 0x01, 0x00, 0x12], 65); //CPU Effect mode

	// TODO: Wireless support
	//device.write([0x00, 0x01, 0x81, 0x91, 0x01, 0x01, 0x00, 0x12], 33); //CPU Effect mode Wireless ?
	//device.write([0x00, 0x01, 0x81, 0x87, 0x01, 0x0A], 33); // ??
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor){
	const RGBData = [];

	for(let iIdx = 0; iIdx < vLeds.length; iIdx++) {
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

		RGBData[vLeds[iIdx]*4] 		= mxPxColor[0];
		RGBData[vLeds[iIdx]*4 + 1 ] = mxPxColor[1];
		RGBData[vLeds[iIdx]*4 + 2 ] = mxPxColor[2];
		RGBData[vLeds[iIdx]*4 + 3 ] = 0xFF;
	}

	// First packet
	device.write([0x00, 0x0C, 0x85, 0x00, 0x00, 0x1C, 0x01].concat(RGBData.splice(0, 58)), 65);

	for(let i = 1; i < 5; i++){
		device.write([0x00, 0x0C, i].concat(RGBData.splice(0, 62)), 65);
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

export function Validate(endpoint) {
	return endpoint.interface === 3 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xff00 && endpoint.collection === 0x0000;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/coolermaster/keyboards/ck721.png";
}