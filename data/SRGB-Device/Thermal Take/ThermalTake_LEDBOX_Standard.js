export function Name() { return "ThermalTake LedBox"; }
export function VendorId() { return 0x264A; }
export function ProductId() { return [0x2260, 0x2261, 0x2262, 0x2263, 0x2264, 0x2265, 0x2266, 0x2267, 0x2268, 0x226F, 0x232B, 0x232C, 0x232D, 0x232E, 0x233A, 0x2332, 0x2339]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "lightingcontroller";}
export function Validate(endpoint) { return endpoint.interface === -1 || endpoint.interface === 0; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/thermaltake/lighting-controllers/led-box.png"; }
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

export function SubdeviceController(){ return true; }
export function SupportsFanControl(){ return true; }

const DeviceMaxLedLimit = 54 * 5 ;

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

const ConnectedFans = [];

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
	//Device Reverts to Hardware Mode.
}

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		const channelInfo = ChannelArray[i];

		if(channelInfo){
			device.addChannel(...channelInfo);
		}
	}
}

function Sendchannel(Channel) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");

	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 54;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");

	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	sendDirectPacket(Channel, RGBData);
}

function sendDirectPacket(Channel, data) {

	const packet = [0x00, 0x32, 0x52, Channel + 1, 0x24];
	packet.push(...data);

	device.write(packet, 193);
	device.read(packet, 64, 10);
	device.pause(1);
}
let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function PollFans(){
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if(device.fanControlDisabled()) {
		return;
	}

	device.clearReadBuffer();

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
	device.write(packet, 193);
	device.read(packet, 64, 10);
}

function readFanRPM(channel) {
	const FanData = [];

	const packet = [0x00, 0x33, 0x51, channel + 1];
	device.write(packet, 193);

	const returnpacket = device.read(packet, 64, 10);

	const RPM = (returnpacket[7] << 8) + returnpacket[6];
	FanData.push(`Fan ${channel} ${RPM}`);

	return RPM;
}
