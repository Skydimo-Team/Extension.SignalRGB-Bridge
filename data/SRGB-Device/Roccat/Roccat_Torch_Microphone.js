export function Name() { return "Roccat Torch"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x3a56; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "microphone"}
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


const vLedNames = [ "Led 1" ];

const vLedPositions = [ [0, 0] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {
	device.write([0x00, 0x80, 0x80], 6);
	device.pause(100);
	device.write([0x00, 0x80, 0x02, 0x00, 0x00, 0x00], 6);
	device.pause(100);
	device.write([0x00, 0x80, 0x02, 0x00, 0x00, 0x00], 6);
	device.pause(100);
	device.write([0x00], 6);
	device.pause(100);
}

export function Render() {
	sendZone();
	device.pause(7);
	device.write([0x00], 6);
}

export function Shutdown() {
	sendZone(true);
}

function sendZone(shutdown = false){

	const packet = [0x00, 0x80];

	const iPxX = vLedPositions[0][0];
	const iPxY = vLedPositions[0][1];
	let col;

	if(shutdown){
		col = hexToRgb(shutdownColor);
	}else if (LightingMode === "Forced") {
		col = hexToRgb(forcedColor);
	}else{
		col = device.color(iPxX, iPxY);
	}

	packet[0x02] = ((col[0]) >> 3);
	packet[0x03] = (col[0] >> 6) | ((col[1]) >> 2);
	packet[0x04] = (col[1] >> 7) | ((col[2]) >> 2);

	device.write(packet, 6);
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
	return "https://assets.signalrgb.com/devices/brands/roccat/audio/torch.png";
}