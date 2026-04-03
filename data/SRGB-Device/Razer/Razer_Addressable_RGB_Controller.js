
export function Name() { return "Razer Addressable RGB Controller"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return 0x0F1F; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "lightingcontroller";}
export function Validate(endpoint) { return endpoint.interface === 0  || endpoint.interface === 1; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/razer/lighting-controllers/chroma-argb-controller.png"; }
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

const vLedNames = [];
const vLedPositions = [];
export function SubdeviceController(){ return true; }
export function LacksOnBoardLeds() {return true;}
const DeviceMaxLedLimit = 240;

const transactionID = 0x1f;

//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray = [
	["Channel 1", 80, 40],
	["Channel 2", 80, 40],
	["Channel 3", 80, 40],
	["Channel 4", 80, 40],
	["Channel 5", 80, 40],
	["Channel 6", 80, 40],
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		const channelInfo = ChannelArray[i];

		if(channelInfo){
			device.addChannel(...channelInfo);
		}
	}
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	SetupChannels();
	getDeviceMode();
	channelInit();
}

export function Render() {
	for(let i = 0; i < 6; i++) {
		SendChannel(i);
	}
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;

	for(let i = 0; i < 6; i++) {
		SendChannel(i, color);
	}
}

function packetSend(packet, length) //Wrapper for always including our CRC
{
	const packetToSend = packet;
	packetToSend[89] = CalculateCrc(packet);
	device.send_report(packetToSend, length);
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function getDeviceMode() {
	device.set_endpoint(0, 0x0001, 0x000c);

	let packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x00, 0x84];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);

	const deviceMode = returnpacket[9];
	device.log("Current Device Mode: " + deviceMode);

	if(deviceMode !== 3) {
		setDeviceMode(3);
	}

	packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x06, 0x0f, 0x02, 0x00, 0x00, 0x08, 0x03, 0x88];
	packetSend(packet, 91);
}

function setDeviceMode(mode) {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x00, 0x04, mode];
	packetSend(packet, 91);
}

function channelInit() {
	for(let channel = 0; channel < 6; channel ++) {
		setChannelBrightness(channel);
	}
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x0d, 0x0f, 0x08, 0x06, 0x01, 0x50, 0x19, 0x50, 0x19, 0x50, 0x19, 0x50, 0x19, 0x50, 0x19, 0x50, 0x19];
	packetSend(packet, 91);

	const packet2 = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x0d, 0x0f, 0x88, 0x06];
	packetSend(packet2, 91);
	device.set_endpoint(1, 0x0001, 0x000c);
}

function setChannelBrightness(channel) {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x03, 0x0f, 0x04, 0x01, 0x1a+channel, 0xff]; //Set max brightness for each channel in case they aren't already
	packetSend(packet, 91);
}

function SendChannel(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if (overrideColor) {
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");

	} else if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");

	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 80;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline");
	}

	//Stream RGB Data
	let packet = [];
	packet[0] = 0x00;
	packet[1] = Channel === 5 ? 0x84 : 0x04;
	packet[2] = Channel;
	packet[3] = Channel;
	packet[4] = 0x00;
	packet[5] = ChannelLedCount;
	packet = packet.concat(RGBData);
	device.send_report(packet, 321);
	//device.pause(1); // We need a pause here (between packets), otherwise the ornata can't keep up.
}
