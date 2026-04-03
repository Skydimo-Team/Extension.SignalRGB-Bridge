export function Name() { return "Sony Dualsense Controller"; }
export function VendorId() { return 0x054C; }
export function ProductId() { return 0x0CE6;}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [7, 7]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 7.0;}
export function DeviceType(){return "other";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
LIntensity:readonly
RIntensity:readonly
HapticsControl:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"LIntensity", "group":"", "label":"Left Trigger Intensity", description: "Sets the Left Trigger intensity", "step":"1", "type":"number", "min":"0", "max":"100", "default":"0"},
		{"property":"RIntensity", "group":"", "label":"Right Trigger Intensity", description: "Sets the Right Trigger intensity", "step":"1", "type":"number", "min":"0", "max":"100", "default":"0"},
		{"property":"HapticsControl", "group":"", "label":"Haptics Control", description: "Enables Haptic feedback", "type":"boolean", "default": "false"},
	];
}

const vKeys = [ 0 ];
const vLedNames = [ "LED" ];
const vLedPositions = [ [1, 0] ];

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
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}


function sendColors(overrideColor) {
	const packet = [0x02, 0xfc, 0xd7, 0x44, 0x40, 0x7c, 0x02, 0x00];

	packet[11] = HapticsControl;//0x00 turns it off 0x01 is linear, 0x02 clicks
	packet[13] = RIntensity;//Right Trigger Toughness //13-18 There's 7 force vectors
	packet[14] = RIntensity;
	packet[15] = RIntensity;
	packet[16] = RIntensity;
	packet[17] = RIntensity;
	packet[18] = RIntensity;
	packet[21] = RIntensity;//So many force vectors
	packet[22] = HapticsControl; //0x00 turns it off 0x01 is linear, 0x02 clicks

	packet[24] = LIntensity;//Left Trigger 24-29
	packet[25] = LIntensity;
	packet[26] = LIntensity;
	packet[27] = LIntensity;
	packet[28] = LIntensity;
	packet[29] = LIntensity;
	packet[32] = LIntensity;
	packet[38] = 0x05;
	packet[39] = 0x03;
	packet[42] = 0x02;
	packet[44] = 0x00;//21

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode == "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[45] = col[0];
		packet[46] = col[1];
		packet[47] = col[2];

	}

	device.write(packet, 48);

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
	return endpoint.interface === 3;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/sony/dualsense-controller.png";
}