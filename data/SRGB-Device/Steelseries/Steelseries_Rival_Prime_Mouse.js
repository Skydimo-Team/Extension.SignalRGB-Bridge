export function Name() { return "SteelSeries Rival Prime"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x182E; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [4, 4]; }
export function DeviceType(){return "mouse"}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
DpiControl:readonly
dpi1:readonly
pollingrate1:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"50", "max":"12400", "default":"800"},
		{"property":"pollingrate1", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "step":"125", "type":"number", "min":"125", "max":"100", "default":"1000"},
	];
}

const vLedNames = [ "Scroll Wheel" ];

const vLedPositions = [ [2, 0] ];

let savedDpi1;
let savedPollingRate1;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	//packet[0x00] = 0x00;
	//packet[0x01] = 0x09;
	//device.write(packet, 69)

	if(DpiControl) {
		setDpi(dpi1);
		setPollingRate(pollingrate1);
	}
}

export function Render() {
	SendColorPacket();

	if(savedDpi1 != dpi1 && DpiControl) {
		setDpi(dpi1);
	}

	device.pause(1);
}

export function Shutdown() {
	SendColorPacket(true);
}

function SendColorPacket(shutdown = false) {
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x62;
	packet[0x02] = 0x01;


	for(let iIdx = 0; iIdx < 1; iIdx++){
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var color;

		if(shutdown) {
			color = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else {
			color = device.color(iPxX, iPxY);
		}

		packet[0x03] = color[0];
		packet[0x04] = color[1];
		packet[0x05] = color[2];

		packet[18] = color[0];
		packet[19] = color[1];
		packet[20] = color[2];
	}

	device.write(packet, 643);

	device.pause(1);
}

function setDpi(dpi) {
	savedDpi1 = dpi1;

	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x61;
	packet[0x02] = 0x01;
	packet[0x03] = 0x00;
	packet[0x04] = (dpi/50);

	device.write(packet, 65);
	device.pause(1);
}

function setPollingRate(pollingrate) {
	savedPollingRate1 = pollingrate1;

	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x5D;
	packet[0x02] = (pollingrate);

	device.write(packet, 65);
	device.pause(1);

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
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-prime.png";
}