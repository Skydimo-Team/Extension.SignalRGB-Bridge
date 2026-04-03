export function Name() { return "Corsair MM700 RGB"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return [0x1B9B, 0X1BC9]; }
export function Documentation(){ return "troubleshooting/corsair"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [10, 3]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mousepad";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vKeyNames = [
	"Left Zone", "Right Zone", "Logo Zone"
];

const vKeyPositions = [
	[0, 0], [9, 2], [9, 0]
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}
export function Initialize() {
	device.write([0x00, 0x08, 0x01, 0x03, 0x00, 0x02], 65);
	device.write([0x00, 0x08, 0x01, 0x02, 0x00, 0xE8, 0x03], 65);
	device.write([0x00, 0x08, 0x0D, 0x00, 0x01], 65);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		device.write([0x00, 0x08, 0x01, 0x03, 0x00, 0x01], 65);
	}
}

function sendColors(overrideColor){
	const packet = [];
	packet[0x00]   = 0x00;
	packet[0x01]   = 0x08;
	packet[0x02]   = 0x06;
	packet[0x03]   = 0x00;
	packet[0x04]   = 0x09;
	packet[0x05]   = 0x00;
	packet[0x06]   = 0x00;
	packet[0x07]   = 0x00;

	for(let iIdx = 0; iIdx < vKeyPositions.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let mxPxColor;

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		}else{
			mxPxColor = device.color(iPxX, iPxY);
		}

		packet[iIdx+8] = mxPxColor[0];
		packet[iIdx+11] = mxPxColor[1];
		packet[iIdx+14] = mxPxColor[2];

	}

	device.write(packet, 65);
	device.pause(2);
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
	return endpoint.interface === 1;
}


export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/mousepads/mm700.png";
}