export function Name() { return "SteelSeries Apex Pro Mini"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return [0x1626, 0x161e]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [14, 5]; }
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
	"< ISO", "# ISO", //ISO
	"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",
];

const vLedPositions = [
	[1, 4], [12, 3], //ISO
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],         [13, 2],
	[0, 3],        [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],
	[0, 4], [1, 4], [2, 4],                      [6, 4],                      [10, 4], [11, 4], [12, 4], [13, 4],
];

const vKeymap = [
	100, 50, //ISO
	41, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,
	43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,
	57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40,
	225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229,
	224, 227, 226, 44, 230, 231, 240, 228,
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

}

export function Render() {
	sendColorPacket();
}

export function Shutdown() {
	sendColorPacket(true);
}

function sendColorPacket(shutdown = false){
	const packet = [];
	const red = [];
	const green = [];
	const blue = [];
	packet[0x00]   = 0x00;

	if(device.productId() === 0x1626){
		packet[0x01]   = 0x21;
	}else{
		packet[0x01]   = 0x40;
	}

	packet[0x02]   = vKeymap.length;

	for (let idx = 0; idx < vKeymap.length; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];
		let col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		red[vKeymap[idx]] = col[0];
		green[vKeymap[idx]] = col[1];
		blue[vKeymap[idx]] = col[2];
	}

	for(let idx = 0; idx < vKeymap.length; idx++){
		packet[(idx * 4) + 3] = vKeymap[idx];
		packet[(idx * 4) + 4] = red[vKeymap[idx]];
		packet[(idx * 4) + 5] = green[vKeymap[idx]];
		packet[(idx * 4) + 6] = blue[vKeymap[idx]];
	}

	device.send_report(packet, 642);

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
	if(device.productId() === 0x1626){
		return endpoint.interface === 3;
	}

	return endpoint.interface === 1;

}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-pro-mini.png";
}