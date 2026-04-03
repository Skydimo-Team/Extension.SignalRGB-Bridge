export function Name() { return "SteelSeries Rival 3"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x1824; }
export function Publisher() { return "Rafee"; }
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
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"200", "max":"12400", "default":"800"},
	];
}

const vLedNames = [
	"Front Zone", "Mid Zone", "Rear Zone", "Logo"
];

const vLedPositions = [
	[2, 0], [2, 1], [2, 2], [2, 3]
];

let savedDpi1;

export function Initialize() {
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x09;
	device.write(packet, 69);


	if(DpiControl) {
		setDpi(dpi1);
	}
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Shutdown() {
	SendColorPacket(true);
}

export function Validate(endpoint) {
	return endpoint.interface === 3;
}

function SendColorPacket(shutdown = false) {


	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x0a;
	packet[0x02] = 0x00;
	packet[0x03] = 0x0f;

	for(let iIdx = 0; iIdx < 4; iIdx++){
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var color;

		if(shutdown){
			color = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = 4 + iIdx * 3;
		packet[iLedIdx] = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] = color[2];

	}

	device.write(packet, 69);

	device.pause(1);
}

export function Render() {

	SendColorPacket();

	if(savedDpi1 != dpi1 && DpiControl){
		setDpi(dpi1);
	}

	device.pause(1);
}

function setDpi(dpi){
	savedDpi1 = dpi1;

	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x0b;
	packet[0x02] = 0x00;
	packet[0x03] = 0x04;
	packet[0x04] = 0x01;
	packet[0x05] = (dpi/50);
	device.write(packet, 69);

}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-3.png";
}