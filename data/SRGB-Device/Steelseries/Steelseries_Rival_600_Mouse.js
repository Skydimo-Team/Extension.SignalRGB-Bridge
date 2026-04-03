export function Name() { return "SteelSeries Rival 600"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x1724; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [7, 7]; }
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
	"Scroll", "Logo",
	"Left1", "Right1",
	"Left2", "Right2",
	"Left3", "Right3"
];

//Zones go 0 through 7
const vLedPositions = [
	[3, 0], [3, 6],
	[2, 2], [4, 2],
	[1, 3], [5, 3],
	[0, 4], [6, 4],
];

let savedDpi1;

export function Initialize() {
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x33;
	packet[0x02] = 0x00;
	packet[0x03] = 0x31;
	packet[0x04] = 0x00;
	packet[0x05] = 0x00;
	packet[0x06] = 0x00;
	packet[0x07] = 0x00;
	packet[0x08] = 0x32;
	device.write(packet, 33);


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
	for(let i = 0 ;i < vLedPositions.length;i++){
		SendColorPacket(vLedPositions[i], true);

	}

}

export function Validate(endpoint) {
	return endpoint.interface === 0;
}

function SendColorPacket(zoneid, shutdown = false) {
	const packet = [];
	const iPxX = vLedPositions[zoneid][0];
	const iPxY = vLedPositions[zoneid][1];

	let color;

	if(shutdown){
		color = hexToRgb(shutdownColor);
	}else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	}else{
		color = device.color(iPxX, iPxY);
	}

	packet[0x00] = 0x00;
	packet[0x01] = 0x05;
	packet[0x02] = 0x00;
	packet[0x03] = zoneid;
	packet[0x04] = 0x55;//zoneToken;
	packet[0x05] = 0x00;
	packet[0x06] = 0x91;//secondToken
	packet[0x07] = 0x00;
	packet[0x08] = zoneid;
	packet[0x09] = 0x10;
	packet[10] = 0x27;
	packet[25] = 0x01;
	packet[30] = 0x04;
	packet[31] = color[0];
	packet[32] = color[1];
	packet[33] = color[2];
	packet[34] = 0xFF;
	packet[39] = 0xFF;
	packet[41] = 0x54;
	packet[44] = 0xFF;
	packet[45] = 0x54;
	packet[46] = color[0];
	packet[47] = color[1];
	packet[48] = color[2];
	packet[49] = 0x56;

	device.send_report(packet, 579);
	device.pause(1);
}

export function Render() {
	for(let i = 0 ;i < 8;i++){
		SendColorPacket(i);
	}

	if(savedDpi1 != dpi1 && DpiControl){
		setDpi(1, dpi1);
	}

	device.pause(1);
}

function setDpi(channel, dpi){
	savedDpi1 = dpi1;

	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x03;
	packet[2] = 0x00;
	packet[3] = channel;
	packet[4] = (dpi/100) -1;
	packet[6] = 0x42;
	device.write(packet, 33);
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
	return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-600.png";
}