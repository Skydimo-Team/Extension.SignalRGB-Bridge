export function Name() { return "SteelSeries Rival 650"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return [0x172B, 0x1726]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
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
send_delay1:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"200", "max":"12400", "default":"800"},
		{"property":"send_delay1", "label":"RGB Packet Delay", description: "Time in milliseconds in between rgb updates. Lower delay increases smoothness, but also increases the chance of Mouse RGB freezing", "step":"1", "type":"number", "min":"0", "max":"200", "default":"60", "tooltip":"Time in milliseconds in between rgb updates. Lower delay increases smoothness, but also increases chance of mouse locking up."}
	];
}
export function DeviceMessages() {
	return [
		{property: "Limited Frame Rate", message:"Limited Frame Rate", tooltip: "This device's firmware is limited to a slower refresh rate than other devices. Adjusting RGB Packet Delay may help, but may also increase instability"},
	];
}

const vLedNames =
[
	"Scroll", "Logo",
	"Left1", "Right1",
	"Left2", "Right2",
	"Left3", "Right3"
];

//Zones go 0 through 7
const vLedPositions =
[
	[3, 0], [3, 6],
	[2, 2], [4, 2],
	[1, 3], [5, 3],
	[0, 4], [6, 4],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	if(DpiControl) {
		setDpi(1, dpi1);
	}
}

export function Render() {
	for(let i = 0 ;i < vLedPositions.length;i++) {
		SendColorPacket(vLedPositions[i]);
		sendZoneIdPacket(i);

		device.pause(3);
	}
}

export function Shutdown() {
	for(let i = 0 ;i < vLedPositions.length;i++) {
		SendColorPacket(vLedPositions[i], true);
		sendZoneIdPacket(i);
	}
}

export function ondpi1Changed() {
	setDpi(1, dpi1);
}

function SendColorPacket(Position, shutdown = false) {
	const packet = [];
	const iPxX = Position[0];
	const iPxY = Position[1];
	let color;

	if(shutdown){
		color = hexToRgb(shutdownColor);
	}else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	}else{
		color = device.color(iPxX, iPxY);
	}

	packet[0x00] = 0x00;
	packet[0x01] = 0x03;
	packet[0x05] = 0x30;
	packet[0x07] = 0x10;
	packet[0x08] = 0x27;
	packet[23] = 0x01;
	packet[31] = 0x04;
	packet[32] = color[0];
	packet[33] = color[1];
	packet[34] = color[2];
	packet[35] = 0x00;
	packet[40] = 0x00;
	packet[42] = 0x00;
	packet[45] = 0x00;
	packet[46] = 0x00;
	packet[47] = color[0];
	packet[48] = color[1];
	packet[49] = color[2];
	packet[50] = 0x00;

	device.write(packet, 65);
	device.pause(send_delay1);
}

function sendZoneIdPacket(zoneId) {
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0x05;
	packet[0x03] = 16 + zoneId;
	packet[0x04] = 0xFF;
	packet[0x09] = 0x5C;
	device.write(packet, 65);
	device.pause(1);
}

function setDpi(channel, dpi) {
	const packet = [];

	packet[0] = 0x00;
	packet[1] = 0x15;
	packet[2] = channel;
	packet[3] = (dpi/100) -1;
	device.write(packet, 65);
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
	return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-650.png";
}