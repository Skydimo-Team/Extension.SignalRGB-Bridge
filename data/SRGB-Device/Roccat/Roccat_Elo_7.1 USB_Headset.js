export function Name() { return "Roccat Elo 7.1 USB"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x3a34;}
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [7, 7]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 7.0;}
export function DeviceType(){return "headphones";}
export function Validate(endpoint) { return endpoint.interface === 3; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/roccat/audio/elo-7-1-usb.png"; }
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

const vKeys = [ 0 ];
const vLedNames = [ "Cans" ];
const vLedPositions = [ [1, 0], ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0xff, 0x01], 16);

	device.write([0xff, 0x02], 16);
	device.pause(10);
	device.write([0xff, 0x03, 0x00, 0x01], 16);
	device.pause(10);
	device.write([0xff, 0x04, 0x00, 0x00, 0xf4], 16);
	device.pause(10);
	device.write([0xff, 0x01], 16);
	device.pause(10);
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
	packet[0] = 0xFF;
	packet[1] = 0x04;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[vKeys[iIdx]*3+4] = col[0];
		packet[vKeys[iIdx]*3+5] = col[1];
		packet[vKeys[iIdx]*3+6] = col[2];

	}

	device.write(packet, 17);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
