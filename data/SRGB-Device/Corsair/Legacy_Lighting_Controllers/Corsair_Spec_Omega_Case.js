export function Name() { return "Corsair Spec Omega Case"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x1D04; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [40, 3]; }
export function DeviceType(){return "lightingcontroller";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
const vKeyNames = [
	"Led 0", "Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10",
	"Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20",
	"Led 21", "Led 22", "Led 23", "Led 24", "Led 25", "Led 26", "Led 27", "Led 28", "Led 29", "Led 30",
	"Led 31", "Led 32"
];


const vKeyPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0],
	[11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0],
	[21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0], [27, 0], [28, 0], [29, 0], [30, 0],
	[31, 0], [32, 0]
];
export function DefaultComponentBrand() { return "Corsair";}
export function Documentation(){ return "troubleshooting/corsair"; }

const CORSAIR_LIGHTING_CONTROLLER_STREAM    = 0x32;
const CORSAIR_LIGHTING_CONTROLLER_COMMIT    = 0x33;
const CORSAIR_LIGHTING_CONTROLLER_START     = 0x34;
const CORSAIR_LIGHTING_CONTROLLER_RESET     = 0x37;
const CORSAIR_LIGHTING_CONTROLLER_MODE      = 0x38;

const CORSAIR_HARDWARE_MODE = 0x01;
const CORSAIR_SOFTWARE_MODE = 0x02;
const DeviceMaxLedLimit = 204;

//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray = [
	["Channel 1", 204, 174],
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

}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		Send30(0, "#000000");

		SendChannel(0, "#000000");

		SubmitLightingColors();
	}else{
		let packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_MODE, 0x00, CORSAIR_HARDWARE_MODE];
		device.write(packet, 65);
		//channel 1
		packet = [0x00, CORSAIR_LIGHTING_CONTROLLER_MODE, 0x01, CORSAIR_HARDWARE_MODE];
		device.write(packet, 65);
	}
}

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

function Send30(channel, overrideColor) {
	const red = [210];
	const green = [210];
	const blue = [210];

	for(let iIdx = 0; iIdx < 30; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let mxPxColor;

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		}else{
			mxPxColor = device.color(iPxX, iPxY);
		}

		red[iIdx] = mxPxColor[0];
		green[iIdx] = mxPxColor[1];
		blue[iIdx] = mxPxColor[2];
	}

	InitChannel(channel);

	//red
	StreamLightingPacketChanneled(0, 30, 0, red.splice(0, 30), channel);


	//green
	StreamLightingPacketChanneled(0, 30, 1, green.splice(0, 30), channel);


	//blue
	StreamLightingPacketChanneled(0, 30, 2, blue.splice(0, 30), channel);
}

function SendChannel(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let ColorData = [];

	if(overrideColor) {
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	}else if(LightingMode === "Forced"){
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Separate");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 120;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		ColorData = device.createColorArray(pulseColor, ChannelLedCount, "Separate");

	}else{
		ColorData = device.channel(ChannelArray[Channel][0]).getColors("Separate");
	}

	const RedChannelData = ColorData[0];
	const GreenChannelData = ColorData[1];
	const BlueChannelData = ColorData[2];

	Channel += 1;
	//Set up for update
	InitChannel(Channel);

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
	Send30(0);

	SendChannel(0);

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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/cases/spec-omega.png";
}
