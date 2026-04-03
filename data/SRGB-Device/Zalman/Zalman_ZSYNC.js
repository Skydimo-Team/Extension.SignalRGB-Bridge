export function Name() { return "Zalman ZSYNC"; }
export function VendorId() { return  0x1c57;}
export function ProductId() { return 0x7ed0;}
export function Publisher() { return "Vermis"; } // Based on Lighting Node Pro plugin Modded by vermis
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
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

const vKeyNames = [];
const vKeyPositions = [];

const CORSAIR_LIGHTING_CONTROLLER_STREAM    = 0x32;
const CORSAIR_LIGHTING_CONTROLLER_COMMIT    = 0x33;
const CORSAIR_LIGHTING_CONTROLLER_MODE      = 0x38;

const CORSAIR_HARDWARE_MODE = 0x01;
const CORSAIR_SOFTWARE_MODE = 0x02;
export function SubdeviceController(){ return true; }
const DeviceMaxLedLimit = 192;

//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray =
[
	["Channel 1", 40, 24],
	["Channel 2", 40, 24],
	["Channel 3", 40, 24],
	["Channel 4", 40, 24],
	["Channel 5", 40, 24],
	["Channel 6", 40, 24],
	["Channel 7", 40, 24],
	["Channel 8", 40, 24]
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
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	SetupChannels();
}

export function Render() {
	for(let Channel = 0; Channel < 8; Channel++) {
		SendChannel(Channel);
	}

	SubmitLightingColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		for(let Channel = 0; Channel < 8; Channel++) {
			SendChannel(Channel, "#000000"); // Go Dark on System Sleep/Shutdown
		}

		SubmitLightingColors();
	}else{
		for(let Channel = 0; Channel < 8; Channel++) {
			device.write([0x00, CORSAIR_LIGHTING_CONTROLLER_MODE, Channel, CORSAIR_HARDWARE_MODE], 65);
		}
	}
}

function SendChannel(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let ColorData = [];

	if(overrideColor){
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Seperate");
	}else if(LightingMode === "Forced") {
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Seperate");
	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		ColorData = device.createColorArray(pulseColor, ChannelLedCount, "Seperate");

	} else {
		ColorData = device.channel(ChannelArray[Channel][0]).getColors("Seperate");
	}

	const RedChannelData = ColorData[0];
	const GreenChannelData = ColorData[1];
	const BlueChannelData = ColorData[2];


	//Set up for update
	InitChannel(Channel);

	//Stream RGB Data
	let ledsSent = 0;
	ChannelLedCount = ChannelLedCount >= 40 ? 40 : ChannelLedCount;

	while(ChannelLedCount > 0) {
		const ledsToSend = ChannelLedCount >= 50 ? 50 : ChannelLedCount;

		StreamLightingPacketChanneled(ledsSent, ledsToSend, 0, RedChannelData.splice(0, ledsToSend), Channel);

		StreamLightingPacketChanneled(ledsSent, ledsToSend, 1, GreenChannelData.splice(0, ledsToSend), Channel);

		StreamLightingPacketChanneled(ledsSent, ledsToSend, 2, BlueChannelData.splice(0, ledsToSend), Channel);

		ledsSent += ledsToSend;
		ChannelLedCount -= ledsToSend;
	}
}


function InitChannel(channel) {
	const packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_MODE, channel, CORSAIR_SOFTWARE_MODE];

	device.write(packet, 65);
	device.read(packet, 17);

}

function StreamLightingPacketChanneled(start, count, colorChannel, data, channel) {
	//channel selection == 32 0/1 Start Count Channel LEDS
	//(Start, Count, Color, Data)
	let packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_STREAM, channel, start, count, colorChannel];
	packet = packet.concat(data);

	device.write(packet, 65);
	device.read(packet, 17);
}

function SubmitLightingColors() {
	const packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_COMMIT, 0xFF];

	device.write(packet, 65);
	device.read(packet, 17);
}


export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0 || endpoint.interface === 2;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/zalman/lighting-controllers/zsync.png";
}
