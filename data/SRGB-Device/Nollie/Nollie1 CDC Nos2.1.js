import Serial from "@SignalRGB/serial";


export function Name() { return "Nollie1 CDC Nos2.1";}
export function VendorId() { return 0x16D5; }
export function ProductId() { return 0x2A01; }
export function Publisher() { return "Nollie"; }
export function Type() { return "serial"; }
export function DeviceType() { return "lightingcontroller"; }
export function ImageUrl() {
	return "https://gitlab.com/nollie/nolliecontroller/-/raw/master/Image/Nollie1_2.1.png";
}
export function SubdeviceController() { return true; }

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
RGBconfig:readonly
*/
export function ControllableParameters() {
	return [
		{ "property": "shutdownColor", "group": "lighting", "label": "Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min": "0", "max": "360", "type": "color", "default": "#000000" },
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default": "#009bde" },
		{ "property": "RGBconfig", "group": "lighting", "label": "ARGB Configuration", description: "Sets the RGB color order for the ARGB Headers. If you are experiencing issues, try switching to each one of these options until you find one which works", "type": "combobox", "values": ["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default": "GRB" },
	];
}

const ChannelLedNum = 630;
const DeviceMaxLedLimit = ChannelLedNum;
const MaxLedsInPacket = 21;
let FrameRateTargetFlag = false;
let All_NumPackets = 0;
const ChannelArray = [
	["Channel 1", ChannelLedNum],
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);
	for (let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

const SERIAL_OPTIONS = { baudRate: 115200, dataBits: 8, stopBits: "One", parity: "None" };

function ensureSerialConnection() {
	if (Serial.isConnected()) {
		return true;
	}
	Serial.disconnect();
	Serial.connect(SERIAL_OPTIONS);
	return Serial.isConnected();
}

export function Initialize() {
	const deviceInfo = Serial.getDeviceInfo();

	if (!ensureSerialConnection()) {
		console.log("Nollie1 CDC: serial connect failed");
		return false;
	}

	SetupChannels();
	device.setFrameRateTarget(60);
	return true;
}

export function Render() {
	if (!ensureSerialConnection()) {
		return;
	}
	All_NumPackets = 0;
	for (let i = 0; i < ChannelArray.length; i++) {
		SendChannel(i);
	}
    writeCdcShowLed();
	if(All_NumPackets<25){
		// device.pause(10-(All_NumPackets*0.6));
	}
	if (!FrameRateTargetFlag) {
		device.setFrameRateTarget(60);
		FrameRateTargetFlag = true;
	}
}

export function Shutdown(SystemSuspending) {
	if (Serial.isConnected()) {
		for (let i = 0; i < ChannelArray.length; i++) {
			SendChannel(i, true);
		}
        writeCdcShowLed();
		Serial.disconnect();
	}
}

function writeCdcShowLed() {
	const flush = new Uint8Array(64);
	flush[0] = 0xff;
	Serial.write(Array.from(flush));
}

function SendChannel(Channel, overrideColor) {
	let channelLedCount = device.channel(ChannelArray[Channel][0]).ledCount > ChannelArray[Channel][1]
		? ChannelArray[Channel][1]
		: device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);
	let RGBData = [];

	if (overrideColor) {
		RGBData = device.createColorArray(shutdownColor, channelLedCount, "Inline", RGBconfig);
	} else if (LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, channelLedCount, "Inline", RGBconfig);
	} else if (componentChannel.shouldPulseColors()) {
		channelLedCount = ChannelLedNum;
		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0], channelLedCount);
		RGBData = device.createColorArray(pulseColor, channelLedCount, "Inline", RGBconfig);
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", RGBconfig);
	}

	const numPackets = Math.ceil(channelLedCount / MaxLedsInPacket);
	All_NumPackets += numPackets;
	for (let currPacket = 0; currPacket < numPackets; currPacket++) {
		const blockIndex = currPacket + Channel * 6;
		const chunk = RGBData.splice(0, 63);
		while (chunk.length < 63) {
			chunk.push(0);
		}
		Serial.write([blockIndex].concat(chunk));
	}

}
