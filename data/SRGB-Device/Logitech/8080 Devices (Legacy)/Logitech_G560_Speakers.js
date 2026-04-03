export function Name() { return "Logitech G560 Gaming Speakers"; }
export function VendorId() { return 0x046d;}
export function ProductId() { return 0x0A78;}
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function Size() { return [4, 4]; }
export function DeviceType(){return "speakers";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 0x0202; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/logitech/audio/g560.png"; }
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

const G560_Speaker_Right =
{
	mapping : [ 0, 1 ],
	positioning : [ [0, 2], [2, 0] ],
	LedNames : [ "Led 1", "Led 2" ],
	displayName: "Right Speaker",
	ledCount : 2,
	width: 3,
	height: 3,
	image: "https://assets.signalrgb.com/devices/default/audio/speaker-no-sub-right-render.png"

};
const G560_Speaker_Left =
{
	mapping : [ 0, 1 ],
	positioning : [ [2, 2], [0, 0] ],
	LedNames : [ "Led 1", "Led 2" ],
	displayName: "Left Speaker",
	ledCount : 2,
	width: 3,
	height: 3,
	image: "https://assets.signalrgb.com/devices/default/audio/speaker-no-sub-left-render.png"
};

const vLedNames = [];
const vLedPositions = [];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
//Left Speaker
	device.createSubdevice("Left Speaker");
	// Parent Device + Sub device Name + Ports
	device.setSubdeviceName("Left Speaker", `Logitech G560 - ${G560_Speaker_Left.displayName}`);
	device.setSubdeviceImageUrl("Left Speaker", G560_Speaker_Left.image);
	device.setSubdeviceSize("Left Speaker", G560_Speaker_Left.width, G560_Speaker_Left.height);
	device.setSubdeviceLeds("Left Speaker",
		G560_Speaker_Left.LedNames,
		G560_Speaker_Left.positioning);
	//Right Speaker
	device.createSubdevice("Right Speaker");
	// Parent Device + Sub device Name + Ports
	device.setSubdeviceName("Right Speaker", `Logitech G560 - ${G560_Speaker_Right.displayName}`);
	device.setSubdeviceImageUrl("Right Speaker", G560_Speaker_Right.image);
	device.setSubdeviceSize("Right Speaker", G560_Speaker_Right.width, G560_Speaker_Right.height);
	device.setSubdeviceLeds("Right Speaker",
		G560_Speaker_Right.LedNames,
		G560_Speaker_Right.positioning);
}

export function Render() {
	sendZone(0);
	sendZone(1);
	sendZone(2);
	sendZone(3);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendZone(0, color);
	sendZone(1, color);
	sendZone(2, color);
	sendZone(3, color);
	device.removeSubdevice("Left Speaker");
	device.removeSubdevice("Right Speaker");
}

function sendZone(zone, overrideColor) //TODO Come back and fix this. It would benefit from a class. Looks to be 8070? Possibly 8071. Also Should support EQ.
{
	const packet = [];
	packet[0x00] = 0x11;
	packet[0x01] = 0xFF;
	packet[0x02] = 0x04;
	packet[0x03] = 0x3E;
	packet[0x04] = zone;
	packet[0x05] = 0x01;

	const deviceSelected = (zone %2 === 0) ? G560_Speaker_Left : G560_Speaker_Right;

	const iPxX = deviceSelected.positioning[Math.floor(zone/2)][0];
	const iPxY = deviceSelected.positioning[Math.floor(zone/2)][1];

	let color;

	if(overrideColor){
		color = hexToRgb(overrideColor);
	}else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	}else{
		color = device.subdeviceColor(deviceSelected.displayName, iPxX, iPxY);
	}

	packet[0x06] = color[0];
	packet[0x07] = color[1];
	packet[0x08] = color[2];

	packet[0x09] = 0x02;

	device.write(packet, 20);
	device.pause(15);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}


