export function Name() { return "Mountain Makalu 67"; }
export function VendorId() { return 0x3282; }//
export function ProductId() { return 0x0003; }//0x0001
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 5]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
SettingControl:readonly
dpiStages:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
pollingRate:readonly
debounce:readonly
liftOffDistance:readonly
angleSnapping:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"SettingControl", "group":"mouse", "label":"Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpiStages", "group":"mouse", "label":"Number of DPI Stages", description: "Sets the number of active DPI stages to cycle though", "step":"1", "type":"number", "min":"1", "max":"5", "default":"5"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"200", "max":"19000", "default":"400"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"200", "max":"19000", "default":"800"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"200", "max":"19000", "default":"1200"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"200", "max":"19000", "default":"1600"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"200", "max":"19000", "default":"2000"},
		{"property":"pollingRate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":[ "1000", "500", "250", "125" ], "default":"1000"},
		{"property":"debounce", "group":"mouse", "label":"Debounce (ms)", description: "Sets the debounce interval between key activations", "step":"1", "type":"number", "min":"0", "max":"12", "default":"2"},
		{"property":"liftOffDistance", "group":"mouse", "label":"High Lift Off Distance", description: "Sets the lift off distance to be higher than the default", "type":"boolean", "default":"false"},
		{"property":"angleSnapping", "group":"mouse", "label":"Angle Snapping", description: "Enables Angle Snapping on the mouse. This will result in the cursor moving only in straight lines", "type":"boolean", "default":"false"},

	];
}

const vLedNames = [ "LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8"];
const vLedPositions = [ [0, 0], [0, 1], [0, 2], [0, 3], [2, 3], [2, 2], [2, 1], [2, 0] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.send_report([0xa1, 0x3c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ], 64);

	if(SettingControl) {
		setPollingRate(pollingRate);
		setDebounce(debounce);
		setAngleSnap(angleSnapping);
		setLiftOffDistance(liftOffDistance);
		setDPIStages(dpiStages);
	}
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

export function onSettingControlChanged() {
	if(SettingControl) {

		setPollingRate(pollingRate);
		setDebounce(debounce);
		setAngleSnap(angleSnapping);
		setLiftOffDistance(liftOffDistance);
		setDPIStages(dpiStages);
	}
}

export function ondpiStagesChanged() {
	if(SettingControl) {
		setDPIStages(dpiStages);
	}
}

export function ondpi1Changed() {
	if(SettingControl) {
		setDPIStages(dpiStages, 1);
	}
}

export function ondpi2Changed() {
	if(SettingControl) {
		setDPIStages(dpiStages, 2);
	}
}

export function ondpi3Changed() {
	if(SettingControl) {
		setDPIStages(dpiStages, 3);
	}
}

export function ondpi4Changed() {
	if(SettingControl) {
		setDPIStages(dpiStages, 4);
	}
}

export function ondpi5Changed() {
	if(SettingControl) {
		setDPIStages(dpiStages, 5);
	}
}

function sendColors(overrideColor) {
	const packet = [0xa1, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f];
	packet[41] = 0x64;

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3 + 17;
		packet[iLedIdx] = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] = color[2];
	}

	device.send_report(packet, 64);
}

function setPollingRate(pollingRate) {
	const packet = [0xA1, 0x0D, 0x01, 0x00, 0x00, 0x01, 1000/pollingRate];
	device.send_report(packet, 64);
}

function setDebounce(debounce) {
	const packet = [0xA1, 0x0D, 0x02, 0x00, 0x00, 0x01, debounce];
	device.send_report(packet, 64);
}

function setAngleSnap(angleSnap) {
	const packet = [0xA1, 0x0D, 0x03, 0x00, 0x00, 0x01, angleSnap];
	device.send_report(packet, 64);
}

function setLiftOffDistance(liftOffDistance) {
	const packet = [0xA1, 0x0D, 0x04, 0x00, 0x00, 0x01, liftOffDistance? 0x01 : 0x00];
	device.send_report(packet, 64);
}

function setDPIStages(DPIStages, currentStage = 1) {
	const packet = [0xA1, 0x0D, 0x0a, 0x00, 0x00, 0x01, DPIStages, currentStage];

	packet[16] = (dpi1 & 0xFF);
	packet[17] = (dpi1 >> 8 & 0xFF);
	packet[18] = (dpi1 & 0xFF);
	packet[19] = (dpi1 >> 8 & 0xFF);
	packet[20] = (dpi2 & 0xFF);
	packet[21] = (dpi2 >> 8 & 0xFF);
	packet[22] = (dpi2 & 0xFF);
	packet[23] = (dpi2 >> 8 & 0xFF);
	packet[24] = (dpi3 & 0xFF);
	packet[25] = (dpi3 >> 8 & 0xFF);
	packet[26] = (dpi3 & 0xFF);
	packet[27] = (dpi3 >> 8 & 0xFF);
	packet[28] = (dpi4 & 0xFF);
	packet[29] = (dpi4 >> 8 & 0xFF);
	packet[30] = (dpi4 & 0xFF);
	packet[31] = (dpi4 >> 8 & 0xFF);
	packet[32] = (dpi5 & 0xFF);
	packet[33] = (dpi5 >> 8 & 0xFF);
	packet[34] = (dpi5 & 0xFF);
	packet[35] = (dpi5 >> 8 & 0xFF);
	device.send_report(packet, 64);
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
	return endpoint.interface === 1 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xff01;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/mountain/mice/makulu-67.png";
}