export function Name() { return "Intel Arc 770"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x01b5; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/intel"; }
export function Size() { return [21, 11]; }
export function DefaultPosition(){return [10, 100];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "gpu";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
LogoMode:readonly
BreathingSpd:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"LogoMode", "group":"lighting", "label":"Logo Mode", description: "Changes the Logo RGB lightning behavior", "type":"combobox", "values":["On", "Off", "Breathing"], "default":"On"},
		{"property":"BreathingSpd", "group":"lighting", "label":"Breathing Speed", description: "Changes the breathing speed if 'Logo Mode' is set to 'Breathing'", "type":"number", "min":"1", "max":"10", "default":"3"},
	];
}
export function ConflictingProcesses() {
	return ["HID.exe"];
}

const vLeds = [
	46, 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, // zone 0x0f
	43, 67, 64, 61, 58, 55, 52, 49, 94, 91, 88, 85, 82, 79, 76, // zone 0x0f
	0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, // zone 0x0f
	45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, // zone 0x0f
	90, 93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, // zone 0x0f
	73, 70, // zone 0x02
	135, 138, 141, 144, 147, // zone 0x05
	2, 5, 8, 11, 14, 17, 20, 23, // zone 0x08
];

const vLedNames = [
	"Left Fan 1", "Left Fan 2", "Left Fan 3", "Left Fan 4", "Left Fan 5", "Left Fan 6", "Left Fan 7", "Left Fan 8", "Left Fan 9", "Left Fan 10", "Left Fan 11", "Left Fan 12", "Left Fan 13", "Left Fan 14", "Left Fan 15", // zone 0x0f
	"Left Fan 16", "Right Fan 1", "Right Fan 2", "Right Fan 3", "Right Fan 4", "Right Fan 5", "Right Fan 6", "Right Fan 7", "Right Fan 8", "Right Fan 9", "Right Fan 10", "Right Fan 11", "Right Fan 12", "Right Fan 13", "Right Fan 14", // zone 0x0f
	"Back 1", "Back 2", "Back 3", "Back 4", "Back 5", "Back 6", "Back 7", "Back 8", "Back 9", "Back 10", "Back 11", "Back 12", "Back 13", "Back 14", "Back 15", // zone 0x0f
	"Back 16", "Back 17", "Back 18", "Back 19", "Back 20", "Side 1", "Side 2", "Side 3", "Side 4", "Side 5", "Side 6", "Side 7", "Side 8", "Side 9", "Side 10", // zone 0x0f
	"Front 1", "Front 2", "Front 3", "Front 4", "Front 5", "Front 6", "Front 7", "Front 8", "Front 9", "Front 10", "Front 11", "Front 12", "Front 13", "Front 14", "Front 15", // zone 0x0f
	"Right Fan 15", "Right Fan 16",  // zone 0x02
	"Front 16", "Front 17", "Front 18", "Front 19", "Front 20", // zone 0x05
	"Inner 1", "Inner 2", "Inner 3", "Inner 4", "Inner 5", "Inner 6", "Inner 7", "Inner 8", // zone 0x08
];

const vLedPositions = [
	[8, 4], [7, 3], [6, 2], [5, 1], [4, 1], [3, 2], [2, 3], [1, 4], [1, 5], [2, 6], [3, 7], [4, 8], [5, 8], [6, 7], [7, 6], // zone 0x0f
	[8, 5], [10, 3], [11, 2], [12, 1], [13, 1], [14, 2], [15, 3], [16, 4], [16, 5], [15, 6], [14, 7], [13, 8], [12, 8], [11, 7], [10, 6], // zone 0x0f
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], // zone 0x0f
	[15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [20, 1], [20, 2], [20, 3], [20, 4], [20, 5], [20, 6], [20, 7], [20, 8], [20, 9], // zone 0x0f
	[19, 9], [18, 9], [17, 9], [16, 9], [15, 9], [14, 9], [13, 9], [12, 9], [11, 9], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], // zone 0x0f
	[9, 5], [9, 4], // zone 0x02
	[4, 9], [3, 9], [2, 9], [1, 9], [0, 9], // zone 0x05
	[18, 1], [19, 1], [19, 3], [19, 4], [19, 5], [19, 6], [19, 8], [18, 8], // zone 0x08
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

let Breathing_idx = 0;
let Breathing_dir = 0;

export function Initialize() {
	device.write([0x00, 0x41, 0x03], 65);
	device.write([0x00, 0x51, 0x28], 65);
}

export function Render() {
	sendColors(0x0f, 0, 14);
	sendColors(0x0f, 15, 29);
	sendColors(0x0f, 30, 44);
	sendColors(0x0f, 45, 59);
	sendColors(0x0f, 60, 74);
	sendColors(0x02, 75, 76);
	sendColors(0x05, 77, 81);
	sendColors(0x08, 82, 89);

	if(LogoMode === "On"){
		device.write([0x00, 0xc0, 0x01, 0x01, 0x00, 0x96, 0x99, 0x99, 0x99], 65);
	}else if (LogoMode === "Breathing") {
		if (Breathing_dir === 0){
			if ((Breathing_idx + BreathingSpd) < 99){
				Breathing_idx += BreathingSpd;
			}else {
				Breathing_dir = 1;
				Breathing_idx -= BreathingSpd;
			}
		}else {
			if ((Breathing_idx - BreathingSpd) > 0){
				Breathing_idx -= BreathingSpd;
			}else {
				Breathing_dir = 0;
				Breathing_idx += BreathingSpd;
			}
		}

		device.write([0x00, 0xc0, 0x01, 0x01, 0x00, 0x96, Breathing_idx, Breathing_idx, Breathing_idx], 65);
	}else {
		device.write([0x00, 0xc0, 0x01, 0x01, 0x00, 0x96, 0x00, 0x00, 0x00], 65);
	}

	device.pause(1);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors(0x0f, 0, 14, "#000000");
		sendColors(0x0f, 15, 29, "#000000");
		sendColors(0x0f, 30, 44, "#000000");
		sendColors(0x0f, 45, 59, "#000000");
		sendColors(0x0f, 60, 74, "#000000");
		sendColors(0x02, 75, 76, "#000000");
		sendColors(0x05, 77, 81, "#000000");
		sendColors(0x08, 82, 89, "#000000");
	}else{
		sendColors(0x0f, 0, 14, shutdownColor);
		sendColors(0x0f, 15, 29, shutdownColor);
		sendColors(0x0f, 30, 44, shutdownColor);
		sendColors(0x0f, 45, 59, shutdownColor);
		sendColors(0x0f, 60, 74, shutdownColor);
		sendColors(0x02, 75, 76, shutdownColor);
		sendColors(0x05, 77, 81, shutdownColor);
		sendColors(0x08, 82, 89, shutdownColor);
	}

}

function sendColors(zone, start, end, overrideColor) {

	const packet = [];
	packet[0] = 0x00; //Zero Padding
	packet[1] = 0xc0;
	packet[2] = 0x01;
	packet[3] = zone; //zone
	packet[4] = 0x00;

	const loop = end - start;

	for (let idx = 0; idx <= loop; idx++) {
		const iPxX = vLedPositions[start+idx][0];
		const iPxY = vLedPositions[start+idx][1];
		const iLed = vLeds[start+idx];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = (idx*4) + 5;
		packet[iLedIdx]	= iLed;
		packet[iLedIdx+1] = color[0]*0.6;
		packet[iLedIdx+2] = color[1]*0.6;
		packet[iLedIdx+3] = color[2]*0.6;

	}

	device.write(packet, 65);

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
	return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/intel/gpus/arc-a770-limited-edition.png";
}