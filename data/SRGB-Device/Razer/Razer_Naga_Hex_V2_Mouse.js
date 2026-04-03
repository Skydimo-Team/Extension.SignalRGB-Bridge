export function Name() { return "Razer Naga Hex V2"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return 0x0050; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [3, 5]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "mouse"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
SettingControl:readonly
dpi:readonly
pollingRate:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"SettingControl", "group": "mouse", "label": "Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type": "boolean", "default": "false" },
		{"property":"dpi", "group": "mouse", "label": "DPI 1", "step": "50", "type": "number", "min": "200", "max": "16000", "default": "800", "live" : "false" },
		{"property":"pollingRate", "group": "mouse", "label": "Polling Rate", description: "Sets the Polling Rate of this device", "type": "combobox", "values": ["1000", "500", "125"], "default": "1000", "live" : "false" },
	];
}

const vLeds = [
	0, 1, 2
];

const vLedNames = [
	"ScrollWheel", "Logo", "Macro Dial"
];

const vLedPositions = [
	[1, 2], [1, 4], [0, 2]
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

	if (SettingControl) {
		setDpi();
		setDevicePollingRate();
	}
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {

	// example header packet
	const packet	= [];
	const RGBData	= [];

	packet[0] = 0x00; //Zero Padding
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x0B;
	packet[7] = 0x03;
	packet[8] = 0x0C;
	packet[9] = 0x00;
	packet[10] = 0x02;

	for (let idx = 0; idx < vLedPositions.length; idx++) {
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

	packet.push(...RGBData);

	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91); // Send commands
	console.log(packet);

	apply();
}

function apply(){
	const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x02, 0x03, 0x0A, 0x05];
	packet[89] = CalculateCrc(packet);

	device.send_report(packet,  91);
}

function setSoftwareMode() {
	const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x02, 0x00, 0x04, 0x03];

	packet[89] = CalculateCrc(packet);

	device.send_report(packet,  91);
	console.log("Software mode set");
}

function setModernMatrix() {
	const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x06, 0x0f, 0x02, 0x00, 0x00, 0x08, 0x00, 0x01];

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	console.log("Modern Matrix set!");
}

export function onSettingControlChanged() {
	if (SettingControl) {
		setDpi();
		setDevicePollingRate();
	}
}

export function ondpiChanged() {
	if (SettingControl) {
		setDpi(dpi);
	}
}

export function onpollingRateChanged() {
	if (SettingControl) {
		setDevicePollingRate();
	}
}

export function setDpi(dpi) {
	const packet = [0x00, 0x00, 0x3F, 0x00, 0x00, 0x00, 0x07, 0x04, 0x05, 0x00, dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff];

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	console.log("DPI set!");
}

export function setDevicePollingRate() {
	const packet = [0x00, 0x00, 0x3F, 0x00, 0x00, 0x00, 0x01, 0x00, 0x05, 1000 / pollingRate];

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	console.log("PollingRate set!");
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
	//return endpoint.interface === 1 && endpoint.usage === 0x0000 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0004;
	//return endpoint.interface === 1 && endpoint.usage === 0x0000 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0005;
	//return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000C && endpoint.collection === 0x0002;
	//return endpoint.interface === 2 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0000;
	//return endpoint.interface === 1 && endpoint.usage === 0x0080 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0003;
	return endpoint.interface === 0 && endpoint.usage === 0x0002 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0000;
	//return endpoint.interface === 1 && endpoint.usage === 0x0006 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0001;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/mice/naga-hex-v2.png";
}