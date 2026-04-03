export function Name() { return "SteelSeries Rival 110"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return 0x1729; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Publisher() { return "Lisq"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "mouse";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
export function Validate(endpoint) { return endpoint.interface === 0; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-110.png"; }
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

const vLedNames = [ "Main Color" ];

const vLedPositions = [ [0, 0] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x05;
	packet[2] = 0x00;

	for(let iIdx = 0; iIdx < 1; iIdx++){
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else {
			color = device.color(iPxX, iPxY);
		}

		packet[3] = color[0];
		packet[4] = color[1];
		packet[5] = color[2];

		packet[18] = color[0];
		packet[19] = color[1];
		packet[20] = color[2];
	}

	device.write(packet, 65);

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
