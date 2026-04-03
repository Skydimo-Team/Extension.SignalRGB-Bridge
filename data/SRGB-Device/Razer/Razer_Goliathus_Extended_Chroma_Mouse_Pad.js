export function Name() { return "Razer Goliathus Extended Chroma"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return 0x0c02; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [8, 3]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [120, 80];}
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

const vLedNames = ["MousePad"];
const vLedPositions = [	[4, 2] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

}

export function Render() {
	SendPacket();
}

export function Shutdown() {
	SendPacket(true);
}

function SendPacket(shutdown = false) {
	const packet = [];

	packet[2] = 0x1F;
	packet[6] = 0x08;
	packet[7] = 0x0F;
	packet[8] = 0x03;

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++){

		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}
		const iLedIdx = (iIdx*3) + 14;
		packet[iLedIdx] = col[0];
		packet[iLedIdx+1] = col[1];
		packet[iLedIdx+2] = col[2];
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	device.pause(1); // We need a pause here (between packets), otherwise the ornata can't keep up.

}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
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
	return endpoint.interface === 0&& endpoint.usage === 0x0002;

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/mousepads/goliathus-extended-chroma.png";
}