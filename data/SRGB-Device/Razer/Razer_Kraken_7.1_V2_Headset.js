export function Name() { return "Razer Kraken 7.1 V2"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return [0x0510, 0x0504]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [2, 2]; }
export function Type() { return "Hid"; }
export function DefaultPosition() {return [75, 70]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "headphones"}
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

const vLedNames = [
	"Both Cans"
];

const vLedPositions = [
	[0, 0]
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x40, 0x01, 0x00, 0x00, 0x08], 9);//software control packet
}

export function Render() {
	SendPacket();
}

export function Shutdown(){
	SendPacket(true);
}

function SendPacket(shutdown = false) {
	const packet = [];
	packet[0] = 0x04;
	packet[1] = 0x40;
	packet[2] = 0x03;
	packet[3] = 0x11;
	packet[4] = 0x89;


	let color;
	const iPxX = vLedPositions[0][0];
	const iPxY = vLedPositions[0][1];

	if(shutdown){
		color = hexToRgb(shutdownColor);
	}else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	}else{
		color = device.color(iPxX, iPxY);
	}

	packet[5] = color[0];
	packet[6] = color[1];
	packet[7] = color[2];

	device.write(packet, 37);
	device.pause(1); // We need a pause here (between packets), otherwise the ornata can't keep up.

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
	return endpoint.interface === 3 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000c;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/audio/kraken-7-1-v2.png";
}