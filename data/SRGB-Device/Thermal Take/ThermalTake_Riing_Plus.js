export function Name() { return "TT Floe Riing Controller"; }
export function VendorId() { return 0x264A; }
export function ProductId() { return [0x1fa4, 0x1fa5, 0x1fa6, 0x1fa7 ]; }
export function Publisher() { return "ChrisAdkins/WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "lightingcontroller"}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
const vLedNames = [];
const vLedPositions = [];
const ConnectedFans = [];

export function SubdeviceController(){ return true; }
export function SupportsFanControl(){ return true; }

const DeviceMaxLedLimit = 270;

//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray =
[
	["Channel 1", 54, 54],
	["Channel 2", 54, 54],
	["Channel 3", 54, 54],
	["Channel 4", 54, 54],
	["Channel 5", 54, 54],
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

	device.write([0x00, 0xFE, 0x33], 193);
	device.read([0x00, 0xFE, 0x33], 193);

	BurstFans();
}

export function Render() {
	for(let channel = 0; channel < 5; channel++) {
		Sendchannel(channel);
	}

	PollFans();
}

export function Shutdown(SystemSuspending) {
	device.pause(2000);
}

function Sendchannel(Channel) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");

	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");

	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	sendDirectPacket(Channel, RGBData);
}

function sendDirectPacket(Channel, data) {

	const packet = [0x00, 0x32, 0x52, Channel + 1, 0x18];
	packet.push(...data);

	device.write(packet, 64);
	device.read(packet, 64);
}

function clearReadBuffer() {
	device.read([0x00], 65, 5);

	while(device.getLastReadSize() > 0) {
		device.read([0x00], 65, 5);
	}
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function PollFans() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if(device.fanControlDisabled()) {
		return;
	}

	clearReadBuffer();

	for(let fan = 0; fan < 5; fan++) {
		const rpm = readFanRPM(fan);
		device.log(`Fan ${fan}: ${rpm}rpm`);

		if(rpm > 0  && !ConnectedFans.includes(`Fan ${fan}`)) {
			ConnectedFans.push(`Fan ${fan}`);
			device.createFanControl(`Fan ${fan}`);
		}

		if(ConnectedFans.includes(`Fan ${fan}`)) {
			device.setRPM(`Fan ${fan}`, rpm);

			const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
			SetFanPercent(fan, newSpeed);
		}
	}
}


function BurstFans() {
	if(device.fanControlDisabled()) {
		return;
	}

	device.log("Bursting Fans for RPM based Detection");

	for(let Channel = 0; Channel < 5; Channel++) {
		SetFanPercent(Channel, 75);
	}
}


function SetFanPercent(channel, FanSpeedPercent) {
	const packet = [0x00, 0x32, 0x51, channel + 1, 0x01, FanSpeedPercent];
	device.write(packet, 65);
	device.read(packet, 64);
}

function readFanRPM(channel) {
	const FanData = [];

	let packet = [0x00, 0x33, 0x51, channel + 1];
	device.write(packet, 65);
	packet = device.read(packet, 64);

	const RPM = (packet[7] << 8) + packet[6];
	FanData.push(`Fan ${channel} ${RPM}`);

	return RPM;
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/thermaltake/lighting-controllers/led-box.png";
}