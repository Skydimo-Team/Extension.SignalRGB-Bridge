export function Name() { return "SteelSeries Apex 3 TKL"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return 0x1622; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [8, 3]; }
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

const vLedNames = [ "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8" ];

const vLedPositions = [ [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x90], 65);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor){
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x21;
	packet[0x02] = 0xff;

	for (let idx = 0; idx < vLedPositions.length; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];

		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[idx * 3 + 3] = col[0];
		packet[idx * 3 + 4] = col[1];
		packet[idx * 3 + 5] = col[2];
	}

	device.write(packet, 65);
}

export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 1;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-3-tkl.png";
}