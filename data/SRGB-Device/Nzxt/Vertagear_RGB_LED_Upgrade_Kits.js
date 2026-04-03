export function Name() { return "Vertagear RGB LED Upgrade Kits"; }
export function VendorId() { return   0x1E71; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function ProductId() { return   0x2004; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lightingcontroller"}
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
const ParentDeviceName = "Vertagear RGB Chair Upgrade";

const vKeyNames = [];
const vKeyPositions = [];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "Vertagear";}

const DeviceMaxLedLimit = 80;

//Channel Name, Led Limit
const ChannelArray =
[
	["Top Kit", 40],
	["Bottom Kit", 40]
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}
export function Initialize() {
	SetupChannels();
}

export function Render() {
	SendChannel(0);
	SendChannel(1);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		SendChannel(0, "#000000"); // Go Dark on System Sleep/Shutdown
		SendChannel(1, "#000000");
	}else{
		SendChannel(0, shutdownColor);
		SendChannel(1, shutdownColor);
	}

}

function StreamLightingPacketChanneled(packetNumber, count, data, channel) {
	const packet = [0x22, 0x10 | packetNumber, 0x01 << channel, 0x00];
	packet.push(...data);
	device.write(packet, 64);
	device.read(packet, 64);
}

function SubmitLightingColors(channel) {
	const packet = [0x22, 0xA0, 1 << channel, 0x00, 0x01, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x80, 0x00, 0x32, 0x00, 0x00, 0x01];
	device.write(packet, 64);
	device.read(packet, 64);
}

function SendChannel(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(overrideColor){
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", "GRB");
	}else if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");

	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");

	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	let packetNumber = 0;
	ChannelLedCount = ChannelLedCount >= 120 ? 120 : ChannelLedCount;

	while(ChannelLedCount > 0) {
		const ledsToSend = ChannelLedCount >= 20 ? 20 : ChannelLedCount;
		StreamLightingPacketChanneled(packetNumber, ledsToSend, RGBData.splice(0, ledsToSend * 3), Channel);

		packetNumber += 1;
		ChannelLedCount -= ledsToSend;
	}

	SubmitLightingColors(Channel);

}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}


export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/vertagear/misc/rgb-gaming-chair-led-kit.png";
}
