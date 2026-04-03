export function Name() { return "Corsair MM800 RGB Polaris"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x1B3B; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [8, 8]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mousepad"}
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

export function Documentation(){ return "troubleshooting/corsair"; }

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
const CORSAIR_COMMAND_WRITE       = 0x07;
const CORSAIR_COMMAND_READ        = 0x0E;
const CORSAIR_COMMAND_STREAM      = 0x7F;
const CORSAIR_PROPERTY_LIGHTING_CONTROL           = 0x05;
const CORSAIR_LIGHTING_CONTROL_HARDWARE           = 0x01;
const CORSAIR_LIGHTING_CONTROL_SOFTWARE           = 0x02;
const CORSAIR_PROPERTY_SUBMIT_KEYBOARD_COLOR_24   = 0x28;
const CORSAIR_PROPERTY_SPECIAL_FUNCTION = 0x04;
const CORSAIR_PROPERTY_SUBMIT_MOUSE_COLOR         = 0x22;


export function Initialize() {
	const packet2 = [];
	packet2[0x00]           = 0x00;
	packet2[0x01]           = CORSAIR_COMMAND_WRITE;
	packet2[0x02]           = CORSAIR_PROPERTY_LIGHTING_CONTROL;
	packet2[0x03]           = CORSAIR_LIGHTING_CONTROL_SOFTWARE;

	packet2[0x05]   = 0x01;

	device.write(packet2, 65);

	const packet = [];
	packet[0x00]           = 0x00;
	packet[0x01]           = CORSAIR_COMMAND_WRITE;
	packet[0x02]           = CORSAIR_PROPERTY_SPECIAL_FUNCTION;
	packet[0x03]           = CORSAIR_LIGHTING_CONTROL_SOFTWARE;
	packet[0x05]   = 0x00;
	device.write(packet, 65);

	const packet1 = [];
	packet1[0x00]   = 0x00;
	packet1[0x01]   = 0x07;
	packet1[0x02]   = 0x22;
	packet1[0x03]   = 0x14;
	//device.write(packet1, 65);


}


export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}


const vKeyNames = [
	"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15"
];

const vKeyPositions = [

	[7, 0], [7, 2], [7, 4], [7, 6], [7, 7], [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7], [1, 5], [1, 3], [1, 2], [1, 0]

];


export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Render() {
	sendColors();
}

function sendColors(overrideColor){


	const packet = [];
	packet[0x00]   = 0x00;
	packet[0x01]   = 0x07;
	packet[0x02]   = 0x22;
	packet[0x03]   = 0x14;
	packet[0x04]   = 0x00;


	//vKeys.length
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

		packet[0x05+iIdx*3] = mxPxColor[0];
		packet[0x06+iIdx*3 ] = mxPxColor[1];
		packet[0x07+iIdx*3 ] = mxPxColor[2];

	}

	device.write(packet, 65);
}


export function Validate(endpoint) {
	return endpoint.interface === 0;
}


export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/mousepads/mm800.png";
}