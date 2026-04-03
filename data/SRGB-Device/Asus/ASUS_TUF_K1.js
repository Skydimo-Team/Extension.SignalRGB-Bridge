export function Name() { return "Asus TUF K1"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return 0x1945; }
export function Publisher() { return "Delid4ve"; }
export function Documentation(){ return "troubleshooting/asus"; }
export function Size() { return [5, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
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

export function Initialize() {
}

const vLedNames = [ "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5" ];
const vLedPositions = [ [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {

	const packet = [];
	const packetLength = 65;
	const startingPacket = 6;
	packet[0] = 0x00;
	packet[1] = 0xC0;
	packet[2] = 0x81;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		let color;
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = (startingPacket + (iIdx * 4));
		packet[iLedIdx] = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] = color[2];
	}

	device.write(packet, packetLength);
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
	return endpoint.interface === 2 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/asus/keyboards/tuf-k1.png";
}
