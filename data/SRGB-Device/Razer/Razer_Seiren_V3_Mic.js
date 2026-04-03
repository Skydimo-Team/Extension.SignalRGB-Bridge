export function Name() { return "Razer Seiren V3"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return 0x056F; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [6, 2]; }
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

const vLeds = [
	7, 6, 8, 9,
	2, 1, 3, 0, 4, 5
];

const vLedNames = [
	"Top 1", "Top 2", "Top 3", "Top 4",
	"Bottom 1", "Bottom 2", "Bottom 3", "Bottom 4", "Bottom 5", "Bottom 6",
];

const vLedPositions = [
		    [1, 0], [2, 0], [3, 0], [4, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	setSoftwareMode();
	setModernMatrix();
}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {

	const TotalLEDs = vLedPositions.length;
	const RGBData	= [];
	let packet		= [];

	for (let idx = 0; idx < TotalLEDs; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		RGBData[(vLeds[idx]*3)] 	= color[0];
		RGBData[(vLeds[idx]*3)+1]	= color[1];
		RGBData[(vLeds[idx]*3)+2]	= color[2];
	}

	packet = [0x07, 0x00, 0x1F, 0x00, 0x00, 0x00, (TotalLEDs *3) + 5, 0x0F, 0x03, 0x00, 0x00, 0x00, 0x00, TotalLEDs -1];
	packet = packet.concat(RGBData);
	packet[62] = CalculateCrc(packet);

	device.send_report(packet, 64); // Send commands
}

function setSoftwareMode() {
	const packet = [0x07, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x02, 0x00, 0x04, 0x03];

	packet[62] = CalculateCrc(packet);

	device.send_report(packet,  64);
	console.log("Software mode set!");
}

function setModernMatrix() {
	const packet = [0x07, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x06, 0x0f, 0x02, 0x00, 0x00, 0x08, 0x00, 0x01];

	packet[62] = CalculateCrc(packet);

	device.send_report(packet, 64);
	console.log("Modern Matrix set!");
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 2; iIdx < 64; iIdx++) {
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
	//return endpoint.interface === 3 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000C && endpoint.collection === 0x0001;
	return endpoint.interface === 3 && endpoint.usage === 0x0004 && endpoint.usage_page === 0xFF53 && endpoint.collection === 0x0002;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/audio/seiren-v3.png";
}
