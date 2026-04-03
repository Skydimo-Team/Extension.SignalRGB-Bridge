export function Name() { return "Corsair ST100 HeadSet Stand"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x0A34; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [8, 8]; }
export function DefaultPosition(){return [40, 120];}
export function DefaultScale(){return 8.0;}
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
	var packet = [];
	packet[0x00]   = 0x0E;
	packet[0x01]   = 0x01;
	device.write(packet, 65);

	var packet = [];
	packet[0x00]   = 0x0E;
	packet[0x01]   = 0x05;
	device.write(packet, 65);

	var packet = [];
	packet[0x00]   = 0x00;
	packet[0x01]   = 0x07;
	packet[0x02]   = 0x04;
	packet[0x03]   = 0x02;
	device.write(packet, 65);

}


export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

const vKeyNames = [
	"Base Led 1", "Base Led 2", "Base Led 3", "Base Led 4", "Logo", "Base Led 5", "Base Led 6", "Base Led 7", "Base Led 8",
];

const vKeyPositions = [

	[6, 0], [7, 2], [7, 5], [7, 7], [5, 5], [5, 7], [0, 7], [0, 4], [0, 0]

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
	return endpoint.interface === -1 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/misc/st100.png";
}