import { Assert } from "@SignalRGB/Errors";
import systeminfo from "@SignalRGB/systeminfo";
export function Name() { return "ASUS Aura ARGB Header Controller"; }
export function VendorId() { return  0x0B05; }
export function ProductId() { return [0x18A3, 0x18A5, 0x1867, 0x1872];}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [15, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [120, 80];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "motherboard";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
export function Documentation(){ return "troubleshooting/asus"; }

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 120],
	["Channel 2", 120],
	["Channel 3", 120],
	["Channel 4", 120],
	["Channel 5", 120],
];

let channelCount = 0;

const vLedNames = [];
const vLedPositions = [];
export function LedNames() {
	return vLedNames;
}
export function SubdeviceController(){ return true; }

let MotherboardName = "";

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	SetMotherboardName();

	//this needs to read the response packets and set the number of chanels and mainboard leds.
	RequestConfig();

	for(let channel = 0; channel < channelCount; channel++){
		device.addChannel(ChannelArray[channel][0], ChannelArray[channel][1]);
	}

	//set all channels to direct mode
	for(let channel = 0; channel < channelCount + 1; channel++){
		sendChannelStart(channel);
	}

	device.SetLedLimit(120 * channelCount);
}

function SetMotherboardName(){

	fetchWmiInfo()

	if(MotherboardName !== "Unknown"){
		device.setName(`Asus ${MotherboardName} ARGB Headers`);
	}
}

function Sendchannel(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(LightingMode === "Forced"){
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");

	}else if(overrideColor){
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	}else{
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline");
	}

	//This is the effect mode setting packets
	// sendChannelStart(channel)
	// var ledsSent = 0;
	// var TotalLedCount = TotalLedCount >= 120 ? 120 : TotalLedCount;
	//  while(TotalLedCount > 0){
	//      var ledsToSend = TotalLedCount >= 20 ? 20 : TotalLedCount;
	//      sendColorPacket(ledsSent, ledsToSend, RGBdata.splice(0,ledsToSend*3))

	//      ledsSent += ledsToSend;
	//      TotalLedCount -= ledsToSend;
	//  }
	// sendCommit();

	let ledsSent = 0;
	ChannelLedCount = ChannelLedCount >= 120 ? 120 : ChannelLedCount;

	while(ChannelLedCount > 0){
		const ledsToSend = ChannelLedCount >= 20 ? 20 : ChannelLedCount;
		ChannelLedCount -= ledsToSend;
		sendDirectPacket(Channel, ledsSent, ledsToSend, RGBData.splice(0, ledsToSend*3));
		ledsSent += ledsToSend;
	}

	sendDirectApply(Channel);
}

export function Render() {
	for(let channel = 0; channel < channelCount; channel++){
		Sendchannel(channel);
	}
}

export function Shutdown(SystemSuspending) {

	const color = SystemSuspending ? "#000000" : shutdownColor;

	for(let channel = 0; channel < channelCount; channel++){
		Sendchannel(channel, color); // Go Dark on System Sleep/Shutdown
	}

}

function sendDirectPacket(channel, start, count, data){

	let packet = [];
	packet[0] = 0xEC;
	packet[1] = 0x40;
	packet[2] = channel;
	packet[3] = start;
	packet[4] = count;
	packet = packet.concat(data);

	device.write(packet, 65);
}

function sendDirectApply(channel){

	const packet = [];
	packet[0] = 0xEC;
	packet[1] = 0x40;
	packet[2] = 0x80 | channel;
	device.write(packet, 65);
}

function sendChannelStart(channel){
	const packet = [0xEC, 0x3B, channel, 0x00, 0xFF];
	device.log(packet);
	device.write(packet, 65);
}

//first is channels, second is mainboard led count
//1E 9F [01] 01 00 00
//78 3C 00 00 00 00
//00 00 00 00 00 00
//00 00 00 00 00 00
//00 00 00 [08] 09 02
//00 00 00 00 00 00
//00 00 00 00 00 00
//00 00 00 00 00 00
//00 00 00 00 00 00
//00 00 00 00 00 00

let config = [0xEC, 0xB0];

function RequestConfig(){
	sendPacketString(`EC B0`, 65);

	config = device.read(config, 65);
	device.log("Config Table", {toFile: true});

	for(let i = 0; i < config.length; i += 8){
		device.log(config.slice(i, i+8), {toFile: true});
	}

	channelCount = 2;//config[6];
	device.log(`ARGB channel Count ${channelCount} `);
}

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[i] = parseInt(data[i], 16);
	}

	device.write(packet, size);
}

function fetchWmiInfo() {
	let motherboardInfo;
	let attempts = 0;

	while((!motherboardInfo) && attempts < 10) {
		motherboardInfo = systeminfo.GetMotherboardInfo();
		device.pause(500);
		attempts++;
	}

	if(!motherboardInfo) {
		device.notify("Failed to fetch motherboard name from WMI!", "Please reach out to official SignalRGB support for help.", 1);
		Assert.fail("Failed to fetch motherboard name from WMI after 10 attempts!");

		return;
	}

	MotherboardName = motherboardInfo.model;
}

export function Validate(endpoint) {
	return endpoint.interface === 2 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/asus/motherboards/motherboard.png";
}
