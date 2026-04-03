export function Name() {
	return "NZXT Smart Device V2";
}
export function VendorId() {
	return 0x1e71;
}
export function ProductId() {
	return Object.keys(NZXTSmartDevice2ProductNames);
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Documentation() {
	return "troubleshooting/nzxt";
}
export function Size() {
	return [1, 1];
}
export function DefaultPosition() {
	return [0, 0];
}
export function DefaultScale() {
	return 1.0;
}
export function DeviceType() {
	return "lightingcontroller";
}
export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}
export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/nzxt/fan-controllers/rgb-fan-controller.png";
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{
			property: "shutdownColor",
			group: "lighting",
			label: "Shutdown Color",
			description:
				"This color is applied to the device when the System, or SignalRGB is shutting down",
			min: "0",
			max: "360",
			type: "color",
			default: "#000000",
		},
		{
			property: "LightingMode",
			group: "lighting",
			label: "Lighting Mode",
			description:
				"Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color",
			type: "combobox",
			values: ["Canvas", "Forced"],
			default: "Canvas",
		},
		{
			property: "forcedColor",
			group: "lighting",
			label: "Forced Color",
			description:
				"The color used when 'Forced' Lighting Mode is enabled",
			min: "0",
			max: "360",
			type: "color",
			default: "#009bde",
		},
	];
}

const vKeyNames = [];
const vKeyPositions = [];

export function SubdeviceController() {
	return true;
}
export function DefaultComponentBrand() {
	return "NZXT";
}
export function SupportsFanControl() {
	return true;
}

const NZXTSmartDevice2ProductNames = {
	0x2001: "NZXT Hue 2",
	0x2002: "NZXT Hue 2 Ambient",
	0x2006: "NZXT Smart Device V2",
	0x200d: "NZXT Smart Device V2 Case Controller",
	0x200f: "NZXT Smart Device V2 Case Controller",
	0x2009: "NZXT RGB and Fan Controller",
	0x200e: "NZXT RGB and Fan Controller",
	0x2010: "NZXT RGB and Fan Controller",
	0x2011: "NZXT RGB and Fan Controller",
	0x2012: "NZXT RGB and Fan Controller",
	0x2019: "NZXT RGB and Fan Controller",
	0x201f: "NZXT RGB and Fan Controller",
	0x2020: "NZXT RGB and Fan Controller",
	0x2021: "NZXT RGB and Fan Controller",
	0x2022: "NZXT Control Hub"
};

//Channel Name, Led Limit
// This is now set during runtime.
let ChannelArray = [];
let lastFanSetTimeStamp = Date.now();
const FAN_INTERVAL = 1000;
let fanIndex = 0;

const ConnectedFans = [];

function SetupFans() {
	if (device.fanControlDisabled()) {
		return;
	}

	SmartDevice2.SetFanPollRate(3);
}

export function Initialize() {
	const DeviceName =
		NZXTSmartDevice2ProductNames[device.productId()] ||
		"NZXT Smart Device V2";
	device.setName(DeviceName);

	SmartDevice2.RequestFirmware();
	SmartDevice2.RequestGen2LedInfo();

	ReadAllPackets();
	SetupFans();
}

export function Render() {
	ReadAllPackets();

	for (let i = 0; i < ChannelArray.length; i++) {
		SendChannel(i);
	}

	if (device.fanControlDisabled()) {
		return;
	}

	if (Date.now() - lastFanSetTimeStamp < FAN_INTERVAL) {
		return;
	}

	lastFanSetTimeStamp = Date.now();

	const fanId = fanIndex++ % 3;

	if (ConnectedFans.includes(`Fan ${fanId + 1}`)) {
		const newSpeed = device.getNormalizedFanlevel(`Fan ${fanId + 1}`) * 100;
		SmartDevice2.SetFanState(fanId, newSpeed);
	}
}

export function Shutdown(SystemSuspending) {
	if (SystemSuspending) {
		for (let i = 0; i < ChannelArray.length; i++) {
			SendChannel(i, "#000000"); // Go Dark on System Sleep/Shutdown
		}
	} else {
		for (let i = 0; i < ChannelArray.length; i++) {
			SendChannel(i, shutdownColor);
		}
	}
}

function SubmitLightingColors(channel) {
	const packet = [];
	packet[0] = 0x22;
	packet[1] = 0xa0;
	packet[2] = 1 << channel;
	packet[3] = 0x00;
	packet[4] = 0x01;
	packet[5] = 0x00;
	packet[6] = 0x00;
	packet[7] = 0x28;
	packet[8] = 0x00;
	packet[9] = 0x00;
	packet[10] = 0x80;
	packet[11] = 0x00;
	packet[12] = 0x32;
	packet[13] = 0x00;
	packet[14] = 0x00;
	packet[15] = 0x01;
	device.write(packet, 64);
}

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

function SendChannel(Channel, overrideColor) {
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	if (componentChannel == null) {
		return;
	}

	let ChannelLedCount = componentChannel.LedCount();
	let RGBData = [];

	if (overrideColor) {
		RGBData = device.createColorArray(
			overrideColor,
			ChannelLedCount,
			"Inline",
			"GRB"
		);
	} else if (LightingMode === "Forced") {
		RGBData = device.createColorArray(
			forcedColor,
			ChannelLedCount,
			"Inline",
			"GRB"
		);
	} else if (componentChannel.shouldPulseColors()) {
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(
			ChannelArray[Channel][0]
		);
		RGBData = device.createColorArray(
			pulseColor,
			ChannelLedCount,
			"Inline",
			"GRB"
		);
	} else {
		RGBData = componentChannel.getColors("Inline", "GRB");
	}

	if (!RGBData.length) {
		return;
	}

	let packetNumber = 0;
	ChannelLedCount = ChannelLedCount >= 120 ? 120 : ChannelLedCount;

	while (ChannelLedCount > 0) {
		const ledsToSend = ChannelLedCount >= 20 ? 20 : ChannelLedCount;
		SmartDevice2.StreamLightingPacketChanneled(
			packetNumber,
			ledsToSend,
			RGBData.splice(0, ledsToSend * 3),
			Channel
		);

		packetNumber += 1;
		ChannelLedCount -= ledsToSend;
	}

	SubmitLightingColors(Channel);
}

function ReadAllPackets() {
	do {
		const packet = device.read([0x00], 64, 2);

		//device.log(packet)

		if (packet[0] === 0x11 && packet[1] === 0x01) {
			const Firmware = `${packet[0x11]}.${packet[0x12]}.${packet[0x13]}`;
			device.log(`Firmware Version: ${Firmware}`, { toFile: true });
			device.log(`Developed On Firmware: 1.13.0`);
		}

		if (packet[0] == 0x21 && packet[1] == 0x03) {
			device.log("Led Info Packet");
			device.log(packet);
			SmartDevice2.SetChannelCount(packet[14]);
		}

		if (packet[0] === 0x67 && packet[1] === 0x02) {
			HandleFanPacket(packet);
		}
	} while (device.getLastReadSize() > 0);
}

function HandleFanPacket(data) {
	if (device.fanControlDisabled()) {
		return;
	}

	for (let fanId = 0; fanId < 3; fanId++) {
		const rpm =
			data[SmartDevice2.offsetFanRPM + fanId * 2] |
			(data[SmartDevice2.offsetFanRPM + fanId * 2 + 1] << 8);
		const mode =
			SmartDevice2.FanModes[data[SmartDevice2.offsetFanMode + fanId]];
		const duty = data[SmartDevice2.offsetFanDuty + fanId];

		device.log(`Fan ${fanId}, Mode: ${mode}, ${duty}% Duty, ${rpm} rpm`);

		if (rpm > 0 && !ConnectedFans.includes(`Fan ${fanId + 1}`)) {
			ConnectedFans.push(`Fan ${fanId + 1}`);
			device.createFanControl(`Fan ${fanId + 1}`);
		}

		if (ConnectedFans.includes(`Fan ${fanId + 1}`)) {
			device.setRPM(`Fan ${fanId + 1}`, rpm);
		}
	}
}

class NZXTSmartDevice2 {
	constructor() {
		this.offsetFanMode = 16;
		this.offsetFanRPM = 24;
		this.offsetFanDuty = 40;
		this.MaxChannelLeds = 40;
		this.MaxDeviceLeds = 160;

		this.FanModes = {
			0: "Not Connected",
			1: "DC",
			2: "PWM",
		};
		this.config = {
			channelCount: 0,
		};
	}

	RequestFirmware() {
		const packet = [0x10, 0x01];
		device.write(packet, 64);
	}

	RequestGen2LedInfo() {
		const packet = [0x20, 0x03];
		device.write(packet, 64);
	}

	SetChannelCount(count) {
		device.log(`Setting Channel Count: ${count}`);

		// Do nothing if the count is the same.
		if (this.config.channelCount === count) {
			return;
		}

		this.config.channelCount = count;

		// Bash Existing Channels
		for (const ChannelName of device.getChannelNames()) {
			device.removeChannel(ChannelName);
		}

		ChannelArray = [];

		for (let i = 0; i < count; i++) {
			ChannelArray.push([`Channel ${i + 1}`, this.MaxChannelLeds]);
			device.addChannel(`Channel ${i + 1}`, this.MaxChannelLeds);
		}

		device.SetLedLimit(
			Math.min(this.MaxDeviceLeds, this.MaxChannelLeds * count)
		);
	}

	SetFanPollRate(seconds) {
		// Smart Device v2 Seems to 'tick' 3 times per second.
		// This sets the device to report the fan speeds every 9 ticks, or 3 seconds
		const pollRate = Math.round(seconds * 3);

		let packet = [0x60, 0x03];
		device.write(packet, 64);

		packet = [0x60, 0x02, 0x01, 0xe8, pollRate, 0x01, 0xe8, pollRate];
		device.write(packet, 64);
	}
	SetFanState(FanId, PercentDuty) {
		const packet = [0x62, 0x01, 0x01 << FanId];
		packet[FanId + 3] = Math.round(PercentDuty);
		device.write(packet, 64);
	}

	StreamLightingPacketChanneled(packetNumber, count, data, channel) {
		let packet = [];
		packet[0] = 0x22;
		packet[1] = 0x10 | packetNumber;
		packet[2] = 0x01 << channel;
		packet[3] = 0x00;
		packet = packet.concat(data);

		device.write(packet, 64);
	}
}
const SmartDevice2 = new NZXTSmartDevice2();
