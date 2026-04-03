export function Name() { return "Razer Ornata V3 X"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return [0x0294, 0x02A2]; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "keyboard"}
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
	"Keyboard"
];

const vLedPositions = [
	[1, 1]
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.send_report([0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x06, 0x0F, 0x02, 0x00, 0x00, 0x08, 0x00, 0x01], 91); // Software mode
}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function sendColors(overrideColor) {

	const packet = [];
	packet[0] = 0x00; //Zero Padding
	packet[2] = 0x1F;
	packet[6] = 0x08;
	packet[7] = 0x0F;
	packet[8] = 0x03;

	const iX = vLedPositions[0][0];
	const iY = vLedPositions[0][1];

	let color;

	if(overrideColor){
		color = hexToRgb(overrideColor);
	}else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	}else{
		color = device.color(iX, iY);
	}

	packet[14] = color[0];
	packet[15] = color[1];
	packet[16] = color[2];

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	device.pause(1);
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
	//return endpoint.interface === 0 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001;
	// return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000c && endpoint.collection === 0x0002;
	// return endpoint.interface === 1 && endpoint.usage === 0x0080 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0003;
	// return endpoint.interface === 1 && endpoint.usage === 0x0000 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0004;
	// return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000c && endpoint.collection === 0x0003;
	// return endpoint.interface === 1 && endpoint.usage === 0x0000 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0005;
	return endpoint.interface === 2 && endpoint.usage === 0x0002 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0000;
	// return endpoint.interface === 1 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0001;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/ornata-v3-x.png";
}