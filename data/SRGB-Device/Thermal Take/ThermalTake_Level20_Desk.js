export function Name() { return "ThermalTake Level 20 Desk"; }
export function VendorId() { return 0x264A; }
export function ProductId() { return 0x07D1; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/thermaltake"; }
export function Size() { return [100, 43]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function ConflictingProcesses() { return ["TT iTAKE Engine.exe"]; }
export function DeviceType(){return "other";}
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

const vLeds = [
	140, 139, 138, 137, 136, 135, 134, 133, 132, 131, 130, 129, 128, 127, 126, 125, 124, 123, 122, 121, 120, 119, 118, 117,	116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 41,
	 	 40,
	141, 39,
	142, 38,
	143, 37,
	144, 36,
	145, 35,
	146, 34,
	147, 33,
	148, 32,
	149, 31,
	150, 30,
	151, 29,
	152, 28,
	153, 27,
	154, 26,
	155, 25,
	156, 24,
	157, 23,
	158, 22,
	159, 21,
	160, 20,
	161, 19,
	162, 18,
	163, 17,
	164, 16,
	165, 15,
	166, 14,
	167, 13,
	168, 12,
	169, 11,
	170, 10,
	171, 9,
	172, 8,
	173, 7,
	174, 6,
	175, 5,
	176, 4,
	177, 3,
	178, 2,
	179, 1,
		 0,
	277, 276, 275, 274, 273, 272, 271, 270, 269, 268, 267, 266, 265, 264, 263, 262, 261, 260, 259, 258, 257, 256, 255, 254, 253, 252, 251, 250, 249, 248, 247, 246, 245, 244, 243, 242, 241, 240, 239, 238, 237, 236, 235, 234, 233, 232, 231, 230, 229, 228, 227, 226, 225, 224, 223, 222, 221, 220, 219, 218, 217, 216, 215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205, 204, 203, 202, 201, 200, 199, 198, 197, 196, 195, 194, 193, 192, 191, 190, 189, 188, 187, 186, 185, 184, 183, 182, 181, 180,
];

const vLedNames = [
	"Top led 1", "Top led 2", "Top led 3", "Top led 4", "Top led 5", "Top led 6", "Top led 7", "Top led 8", "Top led 9", "Top led 10", "Top led 11", "Top led 12", "Top led 13", "Top led 14", "Top led 15", "Top led 16", "Top led 17", "Top led 18", "Top led 19", "Top led 20", "Top led 21", "Top led 22", "Top led 23", "Top led 24", "Top led 25", "Top led 26", "Top led 27", "Top led 28", "Top led 29", "Top led 30",
	"Top led 31", "Top led 32", "Top led 33", "Top led 34", "Top led 35", "Top led 36", "Top led 37", "Top led 38", "Top led 39", "Top led 40", "Top led 41", "Top led 42", "Top led 43", "Top led 44", "Top led 45", "Top led 46", "Top led 47", "Top led 48", "Top led 49", "Top led 50", "Top led 51", "Top led 52", "Top led 53", "Top led 54", "Top led 55", "Top led 56", "Top led 57", "Top led 58", "Top led 59",
	"Top led 60", "Top led 61", "Top led 62", "Top led 63", "Top led 64", "Top led 65", "Top led 66", "Top led 67", "Top led 68", "Top led 69", "Top led 70", "Top led 71", "Top led 72", "Top led 73", "Top led 74", "Top led 75", "Top led 76", "Top led 77", "Top led 78", "Top led 79", "Top led 80", "Top led 81", "Top led 82", "Top led 83", "Top led 84", "Top led 85", "Top led 86", "Top led 87", "Top led 88",
	"Top led 89", "Top led 90", "Top led 91", "Top led 92", "Top led 93", "Top led 94", "Top led 95", "Top led 96", "Top led 97", "Top led 98", "Top led 99", "Top led 100",

	"Right led 1",
	"Left led 1", "Right led 2",
	"Left led 2", "Right led 3",
	"Left led 3", "Right led 4",
	"Left led 4", "Right led 5",
	"Left led 5", "Right led 6",
	"Left led 6", "Right led 7",
	"Left led 7", "Right led 8",
	"Left led 8", "Right led 9",
	"Left led 9", "Right led 10",
	"Left led 10", "Right led 11",
	"Left led 11", "Right led 12",
	"Left led 12", "Right led 13",
	"Left led 13", "Right led 14",
	"Left led 14", "Right led 15",
	"Left led 15", "Right led 16",
	"Left led 16", "Right led 17",
	"Left led 17", "Right led 18",
	"Left led 18", "Right led 19",
	"Left led 19", "Right led 20",
	"Left led 20", "Right led 21",
	"Left led 21", "Right led 22",
	"Left led 22", "Right led 23",
	"Left led 23", "Right led 24",
	"Left led 24", "Right led 25",
	"Left led 25", "Right led 26",
	"Left led 26", "Right led 27",
	"Left led 27", "Right led 28",
	"Left led 28", "Right led 29",
	"Left led 29", "Right led 30",
	"Left led 30", "Right led 31",
	"Left led 31", "Right led 32",
	"Left led 32", "Right led 33",
	"Left led 33", "Right led 34",
	"Left led 34", "Right led 35",
	"Left led 35", "Right led 36",
	"Left led 36", "Right led 37",
	"Left led 37", "Right led 38",
	"Left led 38", "Right led 39",
	"Left led 39", "Right led 40",
	"Right led 41",

	"Bottom led 1", "Bottom 2", "Bottom led 3", "Bottom led 4", "Bottom led 5", "Bottom led 6", "Bottom led 7", "Bottom led 8", "Bottom led 9", "Bottom led 10", "Bottom led 11", "Bottom led 12", "Bottom led 13",
	"Bottom led 14", "Bottom led 15", "Bottom led 16", "Bottom led 17", "Bottom led 18", "Bottom led 19", "Bottom led 20", "Bottom led 21", "Bottom led 22", "Bottom led 23", "Bottom led 24", "Bottom led 25", "Bottom led 26", "Bottom led 27", "Bottom led 28", "Bottom led 29", "Bottom led 30", "Bottom led 31", "Bottom led 32", "Bottom led 33", "Bottom led 34", "Bottom 35", "Bottom led 36", "Bottom led 37", "Bottom led 38", "Bottom led 39",
	"Bottom led 40", "Bottom led 41", "Bottom led 42", "Bottom led 43", "Bottom led 44", "Bottom led 45", "Bottom led 46", "Bottom led 47", "Bottom led 48", "Bottom led 49", "Bottom led 40", "Bottom led 41", "Bottom led 42", "Bottom led 43", "Bottom led 44", "Bottom led 45", "Bottom led 46", "Bottom led 47", "Bottom led 48", "Bottom led 49", "Bottom led 50", "Bottom led 51", "Bottom led 52", "Bottom led 53", "Bottom led 54", "Bottom led 55",
	"Bottom led 56", "Bottom led 57", "Bottom led 58", "Bottom led 59", "Bottom led 60", "Bottom led 61", "Bottom led 62", "Bottom led 63", "Bottom led 64", "Bottom led 65", "Bottom led 66", "Bottom led 67", "Bottom led 68", "Bottom led 69", "Bottom led 70", "Bottom led 71", "Bottom led 72", "Bottom led 73", "Bottom led 74", "Bottom led 75", "Bottom led 76", "Bottom led 77", "Bottom led 78", "Bottom led 79", "Bottom led 80", "Bottom led 81",
	"Bottom led 82", "Bottom led 83", "Bottom led 84", "Bottom led 85", "Bottom led 86", "Bottom led 87", "Bottom led 88",
];

const vLedPositions = [
	[0, 0],	[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0], [27, 0], [28, 0], [29, 0], [30, 0], [31, 0], [32, 0], [33, 0], [34, 0], [35, 0], [36, 0], [37, 0], [38, 0], [39, 0], [40, 0], [41, 0], [42, 0], [43, 0], [44, 0], [45, 0], [46, 0], [47, 0], [48, 0], [49, 0], [50, 0], [51, 0], [52, 0], [53, 0], [54, 0], [55, 0], [56, 0], [57, 0], [58, 0], [59, 0], [60, 0], [61, 0], [62, 0], [63, 0], [64, 0], [65, 0], [66, 0], [67, 0], [68, 0], [69, 0], [70, 0], [71, 0], [72, 0], [73, 0], [74, 0], [75, 0], [76, 0], [77, 0], [78, 0], [79, 0], [80, 0], [81, 0], [82, 0], [83, 0], [84, 0], [85, 0], [86, 0], [87, 0], [88, 0], [89, 0], [90, 0], [91, 0], [92, 0], [93, 0], [94, 0], [95, 0], [96, 0], [97, 0], [98, 0], [99, 0],
	[99, 1],
	[0, 2], [99, 2],
	[0, 3], [99, 3],
	[0, 4], [99, 4],
	[0, 5], [99, 5],
	[0, 6], [99, 6],
	[0, 7], [99, 7],
	[0, 8], [99, 8],
	[0, 9], [99, 9],
	[0, 10], [99, 10],
	[0, 11], [99, 11],
	[0, 12], [99, 12],
	[0, 13], [99, 13],
	[0, 14], [99, 14],
	[0, 15], [99, 15],
	[0, 16], [99, 16],
	[0, 17], [99, 17],
	[0, 18], [99, 18],
	[0, 19], [99, 19],
	[0, 20], [99, 20],
	[0, 21], [99, 21],
	[0, 22], [99, 22],
	[0, 23], [99, 23],
	[0, 24], [99, 24],
	[0, 25], [99, 25],
	[0, 26], [99, 26],
	[0, 27], [99, 27],
	[0, 28], [99, 28],
	[0, 29], [99, 29],
	[0, 30], [99, 30],
	[0, 31], [99, 31],
	[0, 32], [99, 32],
	[0, 33], [99, 33],
	[0, 34], [99, 34],
	[0, 35], [99, 35],
	[0, 36], [99, 36],
	[0, 37], [99, 37],
	[0, 38], [99, 38],
	[0, 39], [99, 39],
	[0, 40], [99, 40],
	[99, 41],
			 [1, 42], [2, 42], [3, 42], [4, 42], [5, 42], [6, 42], [7, 42], [8, 42], [9, 42], [10, 42], [11, 42], [12, 42], [13, 42], [14, 42], [15, 42], [16, 42], [17, 42], [18, 42], [19, 42], [20, 42], [21, 42], [22, 42], [23, 42], [24, 42], [25, 42], [26, 42], [27, 42], [28, 42], [29, 42], [30, 42], [31, 42], [32, 42], [33, 42], [34, 42], [35, 42], [36, 42], [37, 42], [38, 42], [39, 42], [40, 42], [41, 42], [42, 42], [43, 42], [44, 42], [45, 42], [46, 42], [47, 42], [48, 42], [49, 42], [50, 42], [51, 42], [52, 42], [53, 42], [54, 42], [55, 42], [56, 42], [57, 42], [58, 42], [59, 42], [60, 42], [61, 42], [62, 42], [63, 42], [64, 42], [65, 42], [66, 42], [67, 42], [68, 42], [69, 42], [70, 42], [71, 42], [72, 42], [73, 42], [74, 42], [75, 42], [76, 42], [77, 42], [78, 42], [79, 42], [80, 42], [81, 42], [82, 42], [83, 42], [84, 42], [85, 42], [86, 42], [87, 42], [88, 42], [89, 42], [90, 42], [91, 42], [92, 42], [93, 42], [94, 42], [95, 42], [96, 42], [97, 42], [98, 42],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0xFE, 0x33], 839); // Software mode
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}
}

function sendColors(overrideColor) {

	// example header packet
	const packet = [];
	const RGBData = [];

	packet[0] = 0x00; //Zero Padding
	packet[1] = 0x32;
	packet[2] = 0x52;
	packet[3] = 0x04;
	packet[4] = 0x24;

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

		const iIdx				= vLeds[idx];
		RGBData[iIdx * 3] 		= color[1];
		RGBData[iIdx * 3 + 1] 	= color[0];
		RGBData[iIdx * 3 + 2] 	= color[2];
	}

	device.write(packet.concat(RGBData), 839); // Send commands

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
	return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/thermaltake/misc/level-20-rgb-battlestation-gaming-desk.png";
}