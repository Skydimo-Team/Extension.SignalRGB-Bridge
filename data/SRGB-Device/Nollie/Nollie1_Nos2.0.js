export function Name() { return "Nollie1"; }
export function VendorId() { return 0x16D5; }
export function ProductId() { return 0x1F11; }
export function Publisher() { return "Nollie"; }
export function Type() { return "Hid"; }
export function DeviceType(){return "lightingcontroller";}
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



export function SubdeviceController() { return true; }

const ChannelLedNum =  630;
const ChannelNum =  1;
const DeviceMaxLedLimit = ChannelLedNum * ChannelNum;
const MaxLedsInPacket = 21;
let FrameRateTargetFlag = false;
const ChannelArray =
[
	["Channel 1", ChannelLedNum]
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
	for(let i = 0; i < ChannelArray.length; i++) {
		SendChannel(i);
	}
    if(!FrameRateTargetFlag)
	{
		device.setFrameRateTarget(60);
		FrameRateTargetFlag = true;
	}	
}

export function Shutdown(SystemSuspending) 
{

}

function SendChannel(Channel) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount > ChannelArray[Channel][1] ? ChannelArray[Channel][1] : device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);
	let RGBData = [];

	if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");
	} 
	else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = ChannelLedNum;
		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0], ChannelLedCount);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");
	} 
	else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	const NumPackets = Math.ceil(ChannelLedCount / MaxLedsInPacket);

	for(let CurrPacket = 0; CurrPacket < NumPackets; CurrPacket++) {
		const packet = [0x00, CurrPacket];
		packet.push(...RGBData.splice(0, 63));
		device.write(packet, 65);
	}   
}

export function Validate(endpoint) {
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://gitlab.com/nollie/nolliecontroller/-/raw/master/Image/Nollie1_2.1.png";
}