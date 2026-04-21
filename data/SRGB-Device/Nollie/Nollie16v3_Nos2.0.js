export function Name() {
	return "Nollie16v3";
}
export function VendorId() {
	return 0x16D5;
}
export function ProductId() {
    return [0x4716,0x2A16];
}
export function Publisher() {
	return "Nollie";
}
export function Type() {
	return "Hid";
}
export function DeviceType() {
	return "lightingcontroller";
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

export function SubdeviceController() {
	return true;
}

const ChannelLed = 256;
const MaxLedsInPacket = 256;
const DeviceMaxLedLimit = ChannelLed * 16;
let SendData = [];
let FrameRateTargetFlag = false;
const ChannelArray = [
	["Channel 01", ChannelLed],
	["Channel 02", ChannelLed],
	["Channel 03", ChannelLed],
	["Channel 04", ChannelLed],
	["Channel 05", ChannelLed],
	["Channel 06", ChannelLed],
	["Channel 07", ChannelLed],
	["Channel 08", ChannelLed],
	["Channel 09", ChannelLed],
	["Channel 10", ChannelLed],
	["Channel 11", ChannelLed],
	["Channel 12", ChannelLed],
	["Channel 13", ChannelLed],
	["Channel 14", ChannelLed],
	["Channel 15", ChannelLed],
	["Channel 16", ChannelLed],
];

const ChannelIndex = [
	3, 2, 1, 0, 8, 9, 10, 11, 4, 5, 6, 7, 15, 14, 13, 12,
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for (let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

export function Initialize() {
	SetupChannels();
}

export function Render() {
	SendData = [];

	for (let i = 0; i < ChannelArray.length; i++) {
		SendChannel(i);
	}

	SendData.sort((a, b) => a[0] - b[0]);

	let maxGroup1 = -1;

	for (let i = 0; i < SendData.length; i++) {
	    const channel = SendData[i][1];
	    if (channel >= 0 && channel <= 15) {
	        if (channel > maxGroup1) maxGroup1 = channel;
	    }
	}

	for (let i = 0; i < SendData.length; i++) {
	    const ch = SendData[i][1];
	    if(ch == maxGroup1)
	    {
	    	SendData[i][2] = 1;
	    	device.write(SendData[i], 1024);
	    }	
	    else
	    {
	    	device.write(SendData[i], 1024);
	    }	  
	}
    if(!FrameRateTargetFlag)
	{
		device.setFrameRateTarget(60);
		FrameRateTargetFlag = true;
	}

}

function SendChannel(Channel, overrideColor) {
	// device.log(Channel);
	let ChannelLedCount =
		device.channel(ChannelArray[Channel][0]).ledCount >
		ChannelArray[Channel][1]
			? ChannelArray[Channel][1]
			: device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

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
		ChannelLedCount = ChannelLed;

		const pulseColor = device.getChannelPulseColor(
			ChannelArray[Channel][0],
			ChannelLedCount
		);
		RGBData = device.createColorArray(
			pulseColor,
			ChannelLedCount,
			"Inline",
			"GRB"
		);
	} else {
		RGBData = device
			.channel(ChannelArray[Channel][0])
			.getColors("Inline", "GRB");
	}

	let NumPackets = Math.ceil(ChannelLedCount/ MaxLedsInPacket);

	if (RGBData.length != 0 ) {

		for(let CurrPacket = 0; CurrPacket < NumPackets; CurrPacket++) {
			const packet = [0,ChannelIndex[Channel], 0, 0, 0];
			packet.push(...RGBData.splice(0, RGBData.length));
			SendData.push(packet);
		}
	}
}

export function Shutdown(SystemSuspending) {

}

export function Validate(endpoint) {
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://gitlab.com/nollie/nolliecontroller/-/raw/master/Image/Nollie16_2.1.png";
}
