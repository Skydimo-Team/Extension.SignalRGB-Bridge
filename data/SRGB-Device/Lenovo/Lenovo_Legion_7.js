export function Name() { return "Lenovo Legion 7"; }
export function VendorId() { return 0x048D; }
export function ProductId() { return 0xC968; }
export function Version() { return "1.0.0"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [37, 51]; }
export function DefaultPosition(){return [0, 0]; }
export function DefaultScale(){return 29.9; }
export function DeviceType(){return "keyboard"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLeds = {
	0xA1: [ // Keyboard
		1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,			//20 done
		22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 58, 38, 59, 39, 40, 41,		//19
		43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 79, 80, 81, 103, 104,		//18
		64, 66,	67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 100, 101, 102,		//17
		97, 98,							//2
		85, 86, 87, 109, 110, 88, 89, 90, 113, 114, 91, 92, 93, 95, 119, 121, 123, 124,		//18
		94, 96, 120,																		//3
		106, 108, 130, 131, 111, 112, 135, 136, 115, 116, 117, 118, 141, 162, 122, 125,		//16
		129, 137, 138, 139,																	//4
		127, 128, 150, 151, 152, 153, 154, 155, 157, 142, 144, 146, 167, 168,				//14
										   158, 143, 145, 147,									//4
		156, 159, 161, 163, 164, 165,								//6
											 160, 166,										//2
	], // 143 leds
	0xA2: [ // Logo
		1, 2, 3, 4,
		5, 6, 7, 8,
		9, 10, 11, 12, 13
	], // 13 leds
	0xA3: [ // Vents
		1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,	//Vent Left

		28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,	54, //Vent Right

		55, 56, 57, 58,	59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, //Vent Back Right

		81, 82, 83, 84,	85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103,	104, 105, 106 //Vent Back Left
	], // 106 leds
	0xA4: [ // Underglow
		1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, //Neon Left

		22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, //Neon Front
	 	54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,

		79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99 //Neon Right
	]  // 99 leds

	// Total 361 LEDs, who hurt Lenovo? 💀
};

const vLedNames = [
	// Keyboard
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Insert", "PrsScr", "Del", 			"Home", "End", "PgUp", "PgDn",									//20
	"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0", "-", "+", "Backspace", 									"Num", "Lock", "Num /", "Num *", "Num -",						//19
	"2nd `", "2nd 1", "2nd 2", "2nd 3", "2nd 4", "2nd 5", "2nd 6", "2nd 7", "2nd 8", "2nd 9", "2nd 0", "2nd -", "2nd +", 	"Num 7", "Num 8", "Num 9", "Num +", "2nd Num +",				//18
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "Enter", 											"2nd Num 7 (Home)", "2nd Num 8 (Up)", "2nd Num 9 (PgUp)",		//17
	"[", "]",																														//2
	"CapsLock 1", "CapsLock 2", "CapsLock 3", "A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "@", "~",				 	"Num 4", "Num 5", "Num 6",										//18
																					       ";", "'", "ISO_#",																				//3
	"Left Shift 1", "|", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", "Right Shift 1", "Right Shift 2",					"2nd Num 4 (Left)",	  "2nd Num 6 (Right)",					//16
	"Backslash", ",", ".", "/",																																									//4
	"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space Left", "Space Right", "Right Alt", "Right Ctrl", "Up Arrow", 			"Num 1", "Num 2", "Num 3", "Num Enter",	"2nd Num Enter",			//14
																									 "2nd Up Arrow (Bright+)", "2nd Num 1 (End)", "2nd Num 2 (Down)", "2nd Num 3 (PgDn)",								//4
																				 "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num 0 (Ins)", "Num .",									//6
																						 			 "2nd Down Arrow (Bright-)",							"2nd Num . (Del)",								//2
	// Logo

	'Logo Bottom Left', 'Logo LED 2', 'Logo LED 3', 'Logo LED 4',
	'Logo LED Top Left', 'Logo LED 6', 'Logo LED 7', 'Logo LED 8',
	'Logo LED Top Right', 'Logo LED 10', 'Logo LED 11', 'Logo LED 12',
	'Logo Bottom Right',

	// Vents

	"Vent Left 1 (Front)", "Vent Left 2", "Vent Left 3", "Vent Left 4", "Vent Left 5", "Vent Left 6", "Vent Left 7", "Vent Left 8", "Vent Left 9", "Vent Left 10", "Vent Left 11", "Vent Left 12", "Vent Left 13", "Vent Left 14",
	"Vent Left 15", "Vent Left 16", "Vent Left 17", "Vent Left 18", "Vent Left 19", "Vent Left 20", "Vent Left 21", "Vent Left 22", "Vent Left 23", "Vent Left 24", "Vent Left 25", "Vent Left 26", "Vent Left 27 (Back)",

	"Vent Right 1 (Front)", "Vent Right 2", "Vent Right 3", "Vent Right 4", "Vent Right 5", "Vent Right 6", "Vent Right 7", "Vent Right 8", "Vent Right 9", "Vent Right 10", "Vent Right 11", "Vent Right 12", "Vent Right 13", "Vent Right 14",
	"Vent Right 15", "Vent Right 16", "Vent Right 17", "Vent Right 18", "Vent Right 19", "Vent Right 20", "Vent Right 21", "Vent Right 22", "Vent Right 23", "Vent Right 24", "Vent Right 25", "Vent Right 26", "Vent Right 27 (Back)",

	"Vent Back Right 1 (Left)", "Vent Back Right 2", "Vent Back Right 3", "Vent Back Right 4", "Vent Back Right 5", "Vent Back Right 6", "Vent Back Right 7", "Vent Back Right 8", "Vent Back Right 9", "Vent Back Right 10", "Vent Back Right 11", "Vent Back Right 12",
	"Vent Back Right 13", "Vent Back Right 14",	"Vent Back Right 15", "Vent Back Right 16", "Vent Back Right 17", "Vent Back Right 18", "Vent Back Right 19", "Vent Back Right 20", "Vent Back Right 21", "Vent Back Right 22", "Vent Back Right 23",
	"Vent Back Right 24", "Vent Back Right 25", "Vent Back Right 26 (Right)",

	"Vent Back Left 1 (Right)", "Vent Back Left 2", "Vent Back Left 3", "Vent Back Left 4", "Vent Back Left 5", "Vent Back Left 6", "Vent Back Left 7", "Vent Back Left 8", "Vent Back Left 9", "Vent Back Left 10", "Vent Back Left 11", "Vent Back Left 12",
	"Vent Back Left 13", "Vent Back Left 14", "Vent Back Left 15", "Vent Back Left 16", "Vent Back Left 17", "Vent Back Left 18", "Vent Back Left 19", "Vent Back Left 20", "Vent Back Left 21", "Vent Back Left 22", "Vent Back Left 23",
	"Vent Back Left 24", "Vent Back Left 25", "Vent Back Left 26 (Left)",

	// Underglow
	"Underglow 1 (Top Left)", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6", "Underglow 7", "Underglow 8", "Underglow 9", "Underglow 10", "Underglow 11", //Neon Left
	"Underglow 12", "Underglow 13", "Underglow 14", "Underglow 15", "Underglow 16", "Underglow 17", "Underglow 18", "Underglow 19", "Underglow 20", "Underglow 21 (Left Corner)",

	"Underglow 22 (Left Corner)", "Underglow 23", "Underglow 24", "Underglow 25", "Underglow 26", "Underglow 27", "Underglow 28", "Underglow 29", "Underglow 30", "Underglow 31", "Underglow 32", "Underglow 33", "Underglow 34", "Underglow 35",  // Neon Front
	"Underglow 36", "Underglow 37", "Underglow 38", "Underglow 39", "Underglow 40", "Underglow 41", "Underglow 42", "Underglow 43", "Underglow 44", "Underglow 45", "Underglow 46", "Underglow 47", "Underglow 48", "Underglow 49",
	"Underglow 50", "Underglow 51", "Underglow 52", "Underglow 53", "Underglow 54", "Underglow 55", "Underglow 56", "Underglow 57", "Underglow 58", "Underglow 59", "Underglow 60", "Underglow 61", "Underglow 62", "Underglow 63",
	"Underglow 64", "Underglow 65", "Underglow 66", "Underglow 67", "Underglow 68", "Underglow 69", "Underglow 70", "Underglow 71", "Underglow 72", "Underglow 73", "Underglow 74", "Underglow 75", "Underglow 76", "Underglow 77", "Underglow 78 (Right Corner)",

	"Underglow 79 (Top Right)", "Underglow 80", "Underglow 81", "Underglow 82", "Underglow 83", "Underglow 84", "Underglow 85", "Underglow 86", "Underglow 87", "Underglow 88", "Underglow 89", //Neon Right
	"Underglow 90", "Underglow 91", "Underglow 92", "Underglow 93", "Underglow 94", "Underglow 95", "Underglow 96", "Underglow 97", "Underglow 98", "Underglow 99 (Right Corner)",
];

const vLedPositions = [
	// Keyboard
	[2, 16], [3, 16], [4, 16], [5, 16], [7, 16], [9, 16], [11, 16], [13, 16], [15, 16], [17, 16], [19, 16], [21, 16], [23, 16], [25, 16], [27, 16], [29, 16], [31, 16], [32, 16], [33, 16], [34, 16],	//20
	[2, 18], [3, 18], [4, 18], [5, 18], [7, 18], [9, 18], [11, 18], [13, 18], [15, 18], [17, 18], [19, 18], [21, 18], [23, 18], [25, 18], [31, 18], [31, 19], [32, 18], [33, 18], [34, 18],	//19
	[2, 20], [3, 20], [4, 20], [5, 20], [7, 20], [9, 20], [11, 20], [13, 20], [15, 20], [17, 20], [19, 20], [21, 20], [23, 20], [31, 20], [32, 20], [33, 20], [34, 20], [35, 20],	//18
	[2, 22], [4, 22], [5, 22], [7, 22], [9, 22], [11, 22], [13, 22], [15, 22], [19, 22], [21, 22], [23, 22], [25, 22], [27, 22], [29, 22], [31, 22], [32, 22], [33, 22],	//17
	[25, 23], [27, 23],	//2
	[2, 24], [3, 24], [4, 24], [5, 24], [6, 24], [7, 24], [9, 24], [11, 24], [13, 24], [15, 24], [17, 24], [19, 24], [21, 24], [23, 24], [25, 24], [31, 24], [32, 24], [33, 24],	//18
	[21, 25], [23, 25], [25, 25],	//3
	[2, 26], [3, 26], [5, 26], [7, 26], [9, 26], [11, 26], [13, 26], [15, 26], [17, 26], [19, 26], [21, 26], [23, 26], [28, 26], [29, 26], [31, 26], [33, 26],	//16
	[3, 27], [19, 27], [21, 27], [23, 27],	//4
	[2, 28], [3, 28], [4, 28], [5, 28], [7, 28], [17, 28], [19, 28], [21, 28], [25, 28], [31, 28], [32, 28], [33, 28], [34, 28], [35, 28],				//14
	[25, 30], [31, 30], [32, 30], [33, 30],	//4
	[23, 32], [25, 32], [27, 32], [31, 32], [32, 32], [33, 32],	//6
	[25, 34], [33, 34],	//2

	// Logo
	[29, 7], [30, 7], [31, 7], [33, 9], [34, 10], [32, 8], [32, 5], [32, 7], [34, 3], [33, 4], [31, 6], [30, 6], [29, 6],
	// Vents
	[0, 27], [0, 26], [0, 25], [0, 24], [0, 23], [0, 22], [0, 21], [0, 20], [0, 19], [0, 18], [0, 17], [0, 16], [0, 15], //Vent Left
	[0, 14], [0, 13], [0, 12], [0, 11], [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1],

	[36, 27], [36, 26], [36, 25], [36, 24], [36, 23], [36, 22], [36, 21], [36, 20], [36, 19], [36, 18], [36, 17], [36, 16], [36, 15], //Vent Right
	[36, 14], [36, 13], [36, 12], [36, 11], [36, 10], [36, 9], [36, 8], [36, 7], [36, 6], [36, 5], [36, 4], [36, 3], [36, 2], [36, 1],

	[35, 1], [34, 1], [33, 1], [33, 0], [32, 1], [32, 0], [31, 1], [31, 0], [30, 1], [30, 0], [29, 1], [29, 0], [28, 1], [28, 0], // Vent Back Right
	[27, 1], [27, 0], [26, 1], [26, 0], [25, 1], [25, 0], [24, 1], [24, 0], [23, 1], [23, 0], [22, 1], [21, 1],

	[15, 0], [14, 0], [13, 1], [13, 0], [12, 1], [12, 0], [11, 1], [11, 0], [10, 1], [10, 0], [9, 1], [9, 0], //Vent Back Left
	[8, 1], [8, 0], [7, 1], [7, 0], [6, 1], [6, 0], [5, 1], [5, 0], [4, 1], [4, 0], [3, 1], [3, 0], [2, 1], [1, 1],

	// Underglow
	[0, 28], [0, 29], [0, 30], [0, 31], [0, 32], [0, 33], [0, 34], [0, 35], [0, 36], [0, 37], [0, 38], //Neon Left
	[0, 39], [0, 40], [0, 41], [0, 42], [0, 43], [0, 44], [0, 45], [0, 46], [0, 47], [0, 48],

	[1, 49], [2, 49], [3, 49], [4, 50], [4, 49], [5, 50], [5, 49], [6, 50], [6, 49], [7, 50], [7, 49], [8, 50],  //Neon Front
	[8, 49], [9, 50], [9, 49], [10, 50], [10, 49], [11, 50], [11, 49], [12, 50], [12, 49], [13, 50], [13, 49], [14, 50], [14, 49],
	[15, 50], [16, 50], [17, 50], [18, 50], [19, 50], [20, 50], [21, 50],
	[22, 50], [22, 49], [23, 50], [23, 49], [24, 50], [24, 49], [25, 50], [25, 49], [26, 50], [26, 49], [27, 50], [27, 49], [28, 50], [28, 49],
	[29, 50], [29, 49], [30, 50], [30, 49], [31, 50], [31, 49], [32, 50], [32, 49], [33, 49], [34, 49], [35, 49],

	[36, 48], [36, 47], [36, 46], [36, 45], [36, 44], [36, 43], [36, 42], [36, 41], [36, 40], [36, 39], //Neon Right
	[36, 38], [36, 37], [36, 36], [36, 35], [36, 34], [36, 33], [36, 32], [36, 31], [36, 30], [36, 29], [36, 28],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.send_report([0x07, 0xB2, 0x01], 192);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {

	for (const [zone, leds] of Object.entries(vLeds)) {

		const RGBData = [];
		let Offset = 0;
		let TotalLedCount = leds.length;

		switch (zone) {
		case "162":
			Offset = 143;
			break;
		case "163":
			Offset = 156;
			break;
		case "164":
			Offset = 262;
			break;
		default:
			Offset = 0;
			break;
		}

		for(let iIdx = 0; iIdx < leds.length; iIdx++){
			const iPxX = vLedPositions[iIdx + Offset][0];
			const iPxY = vLedPositions[iIdx + Offset][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}


			RGBData[iIdx * 4] 		= leds[iIdx];
			RGBData[iIdx * 4 + 1]	= color[0];
			RGBData[iIdx * 4 + 2] 	= color[1];
			RGBData[iIdx * 4 + 3] 	= color[2];


		}

		while(TotalLedCount > 0){
			const ledsToSend = TotalLedCount >= 47 ? 47 : TotalLedCount;


			device.send_report([0x07, zone, ledsToSend, 0x00].concat(RGBData.splice(0, ledsToSend*4)), 192);
			TotalLedCount -= ledsToSend;
		}
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

	//return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000c && endpoint.collection === 0x0005;
	//return endpoint.interface === 0 && endpoint.usage === 0x000c && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0006;
	//return endpoint.interface === 0 && endpoint.usage === 0x0080 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0007;
	//return endpoint.interface === 0 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0004;
	//return endpoint.interface === 0 && endpoint.usage === 0x0010 && endpoint.usage_page === 0xff89 && endpoint.collection === 0x0001;
	return endpoint.interface === 0 && endpoint.usage === 0x0007 && endpoint.usage_page === 0xff89 && endpoint.collection === 0x0002;
	//return endpoint.interface === 0 && endpoint.usage === 0x00cc && endpoint.usage_page === 0xff89 && endpoint.collection === 0x0003;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/lenovo/misc/legion_7.png";
}