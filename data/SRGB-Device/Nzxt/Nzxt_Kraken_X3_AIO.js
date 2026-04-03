export function Name() { return "NZXT Kraken X3"; }
export function VendorId() { return 0x1E71; }
export function ProductId() { return [0x2007, 0x2014]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function DefaultComponentBrand() { return "NZXT";}
export function Size() { return [4, 4]; }
export function DefaultPosition(){return [165, 60];}
export function DefaultScale(){return 7.0;}
export function DeviceType(){return "aio"}
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
export function SupportsFanControl(){ return true; }

let Liquid_Temp;
let Pump_Speed;
let Pump_RPM;

const vLedPositions = [
	    [1, 0], [2, 0],
	[0, 1],          [3, 1],
	[0, 2],          [3, 2],
	[1, 3], [2, 3],

	[1, 2]
];

const vLedMap =[
	7, 0,
	6,        1,
	5,        2,
	4, 3
];

const vLedNames = [ "Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Logo" ];
const DeviceMaxLedLimit = 80;
const MinimumSpeed = 25;

//Channel Name, Led Limit
const ChannelArray = [ ["Channel 1", 40] ];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
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
	BurstFans();//This acts as a primer. If we don't have an rpm value to begin with, it trips the fanpolling function.
}

export function Render() {
	PollFans();
	sendchannel1Colors(0);
	sendchannelPumpColors(1);
	sendLogo();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendchannelPumpColors(1, "#000000"); // Go Dark on System Sleep/Shutdown
		sendchannel1Colors(0, "#000000");
		sendLogo("#000000");
	}else{

		sendchannelPumpColors(1, shutdownColor);
		sendchannel1Colors(0, shutdownColor);
		sendLogo(shutdownColor);
	}

}

function StreamLightingPacketChanneled(count, data, channel) {

	const packetNumber = 0;
	let totalLedCount = count;

	for(let packetNumber = 0; packetNumber < 2; packetNumber++ ) {
		const ledsToSend = totalLedCount >= 60 ? 60 : totalLedCount;
		totalLedCount -= ledsToSend;

		const packet = [0x22, 0x10 | packetNumber, 0x01 << channel, 0x00];
		packet.push(...data.splice(0, ledsToSend));

		device.write(packet, 64);
	}
}

function sendchannelPumpColors(channel, overrideColor) {
	const RGBdata = [];
	let TotalLedCount = 0;

	for(let iIdx = 0; iIdx < vLedMap.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode == "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		RGBdata[vLedMap[iIdx]*3] = col[1];
		RGBdata[vLedMap[iIdx]*3 + 1] = col[0];
		RGBdata[vLedMap[iIdx]*3 + 2] = col[2];
		TotalLedCount += 3;
	}

	StreamLightingPacketChanneled(TotalLedCount, RGBdata, channel);
	SubmitLightingColors(channel);
}

function sendchannel1Colors(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	if(!ChannelLedCount) {
		return;
	}
	let RGBData = [];

	if(overrideColor){
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", "GRB");
	}else if(LightingMode == "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");
	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	StreamLightingPacketChanneled(ChannelLedCount*3, RGBData, Channel);
	SubmitLightingColors(Channel);
}

function sendLogo(overrideColor) {
	const iPxX = vLedPositions[8][0];
	const iPxY = vLedPositions[8][1];

	let col;

	if(overrideColor) {
		col = hexToRgb(overrideColor);
	} else if (LightingMode == "Forced") {
		col = hexToRgb(forcedColor);
	} else {
		col = device.color(iPxX, iPxY);
	}

	//let packet = [0x21, 0x04, 0x04, 0x04, 0x00, 0x32, 0x00, col[1], col[0], col[2]] // 0x2007

	const packet = [0x2A, 0x04, 0x04, 0x04, 0x00, 0x32, 0x00, col[1], col[0], col[2]]; // 0x2014

	packet[56]   = 0x01;
	packet[57]   = 0x00;
	packet[58]   = 0x01;
	packet[59]   = 0x03;

	device.write(packet, 64);
}

function SubmitLightingColors(channel) {
	const packet = [0x22, 0xA0, 1 << channel, 0x00, 0x01, 0x00, 0x00, 0x28, 0x00, 0x00, 0x80, 0x00, 0x32, 0x00, 0x00, 0x01];
	device.write(packet, 64);
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
	const pump = 1;
	const pumprpm = Pump_RPM;
	device.log(`Pump RPM: ${pumprpm}`);

	if(pumprpm > 0) {
		device.createFanControl(`Pump ${pump}`);
	}

	device.setRPM(`Pump ${pump}`, pumprpm);

	const newSpeed = device.getNormalizedFanlevel(`Pump ${pump}`) * 100;
	PumpSetup(newSpeed);
}

function BurstFans() {

	const BurstSpeed = 50;

	if(device.fanControlDisabled()) {
		return;
	}

	device.log("Bursting Fans for RPM based Detection");

	PumpSetup(BurstSpeed);
}

function PumpSetup(speed) {

	const packet = [0x72, 0x01, 0x00, 0x00];

	for(let RPMBytes = 0; RPMBytes < 40; RPMBytes++) {
		const Offset = RPMBytes + 4;
		packet[Offset] = Math.max(speed, MinimumSpeed);
	}

	device.log(`Setting Kraken Pump to ${Math.round(speed)}% `);
	device.write(packet, 64);

	do {
		const packet = device.read([0x0], 64, 10);

		if(packet[0] == 0x75 && packet[1] == 0x02) {
			Liquid_Temp = packet[15] + packet[16]/10;
			Pump_RPM = packet[18] << 8 | packet[17];
			Pump_Speed = packet[19];
			device.log("Reported Pump Speed: " + Pump_Speed + " %");
			device.log("Liquid Temperature: " + Liquid_Temp + " °C");
		}
	}
	while(device.getLastReadSize() > 0);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

/** @param {HidEndpoint} endpoint */
export function Validate(endpoint) {
	return endpoint.interface === 0;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/nzxt/aio/kraken-x3-aio.png";
}