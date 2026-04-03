
export function Name() { return "Corsair Lighting Node Core "; }
export function VendorId() { return    0x1b1c; }
export function ProductId() { return   0x0C1A; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lightingcontroller"}

/* global
LightingMode:readonly
forcedColor:readonly
EndpointMode:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"EndpointMode", "group":"", "label":"Arduino Compatibility Mode", description: "Sets the endpoint between an official Corsair device or a Arduino based to handle minor Firmware differences Corsair Node core", "type":"combobox", "values":["Corsair", "Arduino"], "default":"Corsair"},
	];
}

const vKeyNames = [];
const vKeyPositions = [];

const CORSAIR_LIGHTING_CONTROLLER_STREAM    = 0x32;
const CORSAIR_LIGHTING_CONTROLLER_COMMIT    = 0x33;
const CORSAIR_LIGHTING_CONTROLLER_START     = 0x34;
const CORSAIR_LIGHTING_CONTROLLER_RESET     = 0x37;
const CORSAIR_LIGHTING_CONTROLLER_MODE      = 0x38;

const CORSAIR_HARDWARE_MODE = 0x01;
const CORSAIR_SOFTWARE_MODE = 0x02;

export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "Corsair";}
export function Documentation(){ return "troubleshooting/corsair"; }

const DeviceMaxLedLimit = 204;
//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray = [
	["Channel 1", 204, 204],
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

export function Initialize() {
	SetupChannels();
	device.log(device.getChannelNames());
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		SendChannel(0, "#000000");
		device.pause(1);
		SubmitLightingColors();
	}else{
		const packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_MODE, 0x00, CORSAIR_HARDWARE_MODE];
		device.write(packet, 65);
	}
}

export function LedNames() {
	return vKeyNames;
}


export function LedPositions() {
	return vKeyPositions;
}

function SendChannel(Channel, overrideColor) {

	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let ColorData = [];

	if(overrideColor) {
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	}else if(LightingMode === "Forced"){
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Separate");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 204;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		ColorData = device.createColorArray(pulseColor, ChannelLedCount, "Separate");

	}else{
		ColorData = device.channel(ChannelArray[Channel][0]).getColors("Separate");
	}
	const RedChannelData = ColorData[0];
	const GreenChannelData = ColorData[1];
	const BlueChannelData = ColorData[2];

	//Set up for update
	InitChannel(Channel);

	if(EndpointMode == "Arduino"){
		channelStart(Channel);
	}

	//Stream RGB Data
	let ledsSent = 0;
	ChannelLedCount = ChannelLedCount >= 204 ? 204 : ChannelLedCount;

	while(ChannelLedCount > 0){
		const ledsToSend = ChannelLedCount >= 50 ? 50 : ChannelLedCount;

		StreamLightingPacketChanneled(ledsSent, ledsToSend, 0, RedChannelData.splice(0, ledsToSend), Channel);

		StreamLightingPacketChanneled(ledsSent, ledsToSend, 1, GreenChannelData.splice(0, ledsToSend), Channel);

		StreamLightingPacketChanneled(ledsSent, ledsToSend, 2, BlueChannelData.splice(0, ledsToSend), Channel);

		ledsSent += ledsToSend;
		ChannelLedCount -= ledsToSend;
	}
}

export function Render() {

	SendChannel(0);
	device.pause(1);

	SubmitLightingColors();

}


function InitChannel(channel){
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

function channelStart(channel){
	//start packet == 34 00 channel (len 64)
	const packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_START, channel];

	device.write(packet, 65);
	device.read(packet, 17);
}

function channelReset(channel){
	const packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_RESET, channel];

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


export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/controllers/lighting-node-core.png";
}