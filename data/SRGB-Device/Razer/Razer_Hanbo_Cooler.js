export function Name() { return "Razer Hanbo AIO"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0f35; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [8, 10]; }
export function Type() { return "Hid"; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "aio"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = ["LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10", "LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16"];
const vLedPositions = [[2, 6], [4, 6], [1, 5], [2, 1], [1, 2], [0, 3], [1, 4], [2, 7], [3, 7], [4, 9], [5, 8], [6, 7], [6, 5], [7, 3], [6, 2], [5, 1], ];

const DeviceMaxLedLimit = 18*3;

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 18, 18],
	["Channel 2", 18, 18],
	["Channel 3", 18, 18],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x80, 0x01, 0x00, 0x01], 64);
	device.write([0x00, 0x80, 0x01, 0x01, 0x01], 64);
	device.write([0x00, 0x70, 0x01, 0x01, 0x64], 64);
	device.write([0x00, 0x70, 0x01, 0x00, 0x64], 64);
	SetupChannels();
}

export function Render() {
	grabColors();
	SendChannel(0);
	SendChannel(1);
	SendChannel(2);
}

export function Shutdown() {

}

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

function grabColors(shutdown = false) {
	let packet = [0x00, 0x32, 0x01, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00];
	const RGBData = [];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}
		const iLedIdx = (iIdx*3);
		RGBData[iLedIdx] = col[1];
		RGBData[iLedIdx+1] = col[0];
		RGBData[iLedIdx+2] = col[2];
	}

	packet = packet.concat(RGBData);
	device.write(packet, 64);
}

function SendChannel(Channel) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");

	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 18;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");

	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	//Stream RGB Data
	let packet = [0x00, 0x40, 0x01, 0x07, 0x00, 0x00, 0x00, 0x00, Channel+1];
	packet = packet.concat(RGBData);
	device.write(packet, 64);

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
	return (endpoint.interface === -1 || endpoint.interface === 0) && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/aios/hanbo.png";
}