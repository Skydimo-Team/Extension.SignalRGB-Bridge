import { Assert, globalContext } from "@SignalRGB/Errors.js";
import systeminfo from "@SignalRGB/systeminfo";
export function Name() { return "GIGABYTE Motherboard LED Controller"; }
export function VendorId() { return  0x048D; }
export function ProductId() { return 0x5711;}
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/gigabyte"; }
export function Size() { return [10, 10]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "motherboard";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
Mainboardconfig:readonly
Headerconfig:readonly
RGBconfig:readonly
ForceAllZonesActive:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas", "tooltip":"This toggles the device between displaying its canvas position, or being locked to its Forced Color"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"Mainboardconfig", "group":"lighting", "label":"Mainboard Configuration", description: "Sets the RGB color order for the Motherboards RGB. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox",   "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"BGR"},
		{"property":"Headerconfig", "group":"lighting",  "label":"12v Header Configuration", description: "Sets the RGB color order for the Motherboards 12v RGB Headers. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox", "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"RGBconfig", "group":"lighting", "label":"ARGB Channel Configuration", description: "Sets the RGB color order for the Motherboards 5v ARGB Headers. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox",   "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"GRB"},
		{"property":"ForceAllZonesActive", "group":"", "label":"Force Enable All Zones", description: "Sets all LED zones to be active. This will override any Motherboard specific LED configurations.", "type":"boolean",  "default":"0"},
	];
}

export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function SubdeviceController(){ return true; }
export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 0x00CC;
}

const ParentDeviceName = "Gigabyte Motherboard";
let CurrentLedCount;
const vLedNames = [];
const vLedPositions = [];
let ActiveZones = [];

const DeviceMaxLedLimit = 360;
const DevicePerChannelLedLimit = 120;

let MotherboardName = "";

//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray = [];

function SetupChannels(){
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++){
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

function MainboardConfiguration(){
	return Mainboardconfig;
}

function HeaderConfiguration(){
	return Headerconfig;
}

let vDLED_Zones = [];

const MotherboardConfigs = {
	'Auto': {
		ARGB:{
			"5v ARGB Header 1": 0x58,
			"5v ARGB Header 2": 0x59,
			"5v ARGB Header 3": 0x62,
		},
		Mainboard:{
			0x20: ["Led 1", MainboardConfiguration],
			0x22: ["Led 2", MainboardConfiguration],
			0x23: ["Led 3", MainboardConfiguration],
			0x24: ["12v Header", HeaderConfiguration],
			0x25: ["Led 4", MainboardConfiguration],
			0x26: ["Led 5", MainboardConfiguration],
			0x27: ["Led 6", MainboardConfiguration],
			0x91: ["Led 7", MainboardConfiguration],
			0x92: ["Led 8", MainboardConfiguration]
		}
	},

	"X870E AORUS PRO ICE": {
		ARGB:{
			"5v ARGB Header 1": 0x58,
			"5v ARGB Header 2": 0x59,
			"5v ARGB Header 3": 0x62,
		},
		Mainboard:{
			0x91: ["Back IO", MainboardConfiguration],
			0x24: ["12v Header Bottom", HeaderConfiguration],
			0x92: ["South Bridge", MainboardConfiguration]
		}
	},

	'Z890 GAMING X WIFI7': {
		ARGB:{
			"5v ARGB Header 1": 0x58,
			"5v ARGB Header 2": 0x59,
			"5v ARGB Header 3": 0x62,
		},
		Mainboard:{
			0x20: ["PCB", MainboardConfiguration],
			0x22: ["Southbridge", MainboardConfiguration],
			0x24: ["12v Header", HeaderConfiguration],
			0x91: ["IO Shield", MainboardConfiguration],
		}
	},
};

function CreateZone(ZoneId, ZoneName, ZoneConfig){
	//"Ch1 | Port 1"
	device.createSubdevice(ZoneName);
	// Parent Device + Sub device Name + Ports
	device.setSubdeviceName(ZoneName, `${ParentDeviceName} - ${ZoneName}`);
	device.setSubdeviceSize(ZoneName, 3, 3);
	device.setSubdeviceLeds(ZoneName, ["Led 1"], [[1, 1]]);
	ActiveZones.push({id:ZoneId, name:ZoneName, config: ZoneConfig});
}

function InitializeZones(){
	let configuration = MotherboardConfigs['Auto'];


	// Blow away current zones
	for(let i = 0; i < ActiveZones.length;i++){
		device.removeSubdevice(ActiveZones[i].name);
	}

	ActiveZones = [];

	if(!ForceAllZonesActive && MotherboardName in MotherboardConfigs ){
		configuration = MotherboardConfigs[MotherboardName];
	}

	globalContext.set("Motherboard Config", configuration);

	for(const zone in configuration.Mainboard){
		device.log(`Adding zone [${configuration.Mainboard[zone][0]}], Id: ${zone}`, {toFile: true});
		CreateZone(zone, ...configuration.Mainboard[zone]);
	}

	vDLED_Zones = [];

	for(const header in configuration.ARGB){
		const argbDevice = configuration.ARGB[header];

		let argbDeviceId = 0;
		const ledCount = DevicePerChannelLedLimit;

		argbDeviceId = argbDevice;

		device.log(`Adding ARGB Header [${header}], Id: ${argbDeviceId}`, {toFile: true});
		ChannelArray.push([header, ledCount]);
		vDLED_Zones.push(argbDeviceId);
	}
}


export function Initialize() {
	SetMotherboardName();

	RequestConfig();

	InitializeRGB();

	SetDirectHeaderMode();

	InitializeZones();

	SetupChannels();

	device.pause(30);
}

function InitializeRGB() {
	for (let i = 0x20; i <= 0x27; i++) {
		device.send_report([GIGABYTE_COMMAND, i], 64);
	}

	for (let i = 0x90; i <= 0x92; i++) {
		device.send_report([GIGABYTE_COMMAND, i], 64);
	}

	sendCommit();
}

export function onForceAllZonesActiveChanged(){
	InitializeZones();
}

export function Render() {
	UpdateActiveZones();

	for(let channel = 0; channel < vDLED_Zones.length; channel++){
		UpdateARGBChannels(channel);
	}

}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;

	UpdateActiveZones(color);

	for(let channel = 0; channel < vDLED_Zones.length; channel++){
		UpdateARGBChannels(channel, color);
	}
}

function UpdateActiveZones(overrideColor){

	for(let iIdx = 0 ; iIdx < ActiveZones.length; iIdx++){
		const zone = ActiveZones[iIdx];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.subdeviceColor(zone.name, 1, 1);
		}

		sendColorPacket(zone.id, [
			col[RGBConfigs[zone.config()][0]],
			col[RGBConfigs[zone.config()][1]],
			col[RGBConfigs[zone.config()][2]]]);
		sendCommit();

	}
}

const GIGABYTE_COMMAND = 0xCC;

const GIGABYTE_COMMAND_COMMIT = 0x28;
const GIGABYTE_COMMAND_SOFTWAREMODE = 0x32;
const GIGABYTE_COMMAND_ARGBLEDCOUNTS = 0x34;
const GIGABYTE_COMMAND_CONFIGTABLE = 0x60;

const GIGABYTE_COMMIT_VALUE = 0xFF;

const RGBConfigs = {
	"RGB" : [0, 1, 2],
	"RBG" : [0, 2, 1],
	"BGR" : [2, 1, 0],
	"BRG" : [2, 0, 1],
	"GBR" : [1, 2, 0],
	"GRB" : [1, 0, 2]
};
const Led_Count_32 = 0;
const Led_Count_64 = 1;
const Led_Count_256 = 2;
const Led_Count_512 = 3;
const Led_Count_1024 = 4;

const ledCountReverseTable = {
	0 : 32,
	1 : 64,
	2 : 256,
	3 : 512,
	4 : 1024
};

function Get_Led_Def(count){

	if(count <= 32){
		return Led_Count_32;
	} else if(count <= 64){
		return Led_Count_64;
	} else if(count <= 256){
		return Led_Count_256;
	} else if(count <= 512){
		return Led_Count_512;
	} else if(count <= 1024){
		return Led_Count_1024;
	}

	Assert.unreachable("Invalid Led Count", {leds: count});

	return Led_Count_32;
}

function SetDirectHeaderMode(){

	const packet = [GIGABYTE_COMMAND, GIGABYTE_COMMAND_SOFTWAREMODE, 0x0b]; // ARGB Header idx
	device.send_report(packet, 64);
	device.log('Sending ARGB direct header mode');
}

function SetMotherboardName(){

	fetchWmiInfo();

	if(MotherboardName !== "Unknown"){
		device.setName(`Gigabyte ${MotherboardName} Controller`);
	}
}


function UpdateARGBChannels(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();


	if(device.getLedCount() !== CurrentLedCount){
		CurrentLedCount = device.getLedCount();
		SetLedCounts();
	}

	let RGBData = [];
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	if(LightingMode  === "Forced"){
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", RGBconfig);

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 80;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);

		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", RGBconfig);

	}else if(overrideColor){
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", RGBconfig);
	}else{
		RGBData = componentChannel.getColors("Inline", RGBconfig);
	}

	StreamDirectColors(RGBData, ChannelLedCount, vDLED_Zones[Channel]);

}

function StreamDirectColors(RGBData, LedCount, ChannelIdx){
	let ledsSent = 0;
	const Packet_Max_LED_Count = 19;

	while(LedCount > 0){
		const ledsToSend = Math.min(Packet_Max_LED_Count, LedCount);
		LedCount -= ledsToSend;
		sendDirectPacket(ChannelIdx, ledsSent*3, ledsToSend*3, RGBData.splice(0, ledsToSend*3));
		ledsSent += ledsToSend;
	}
}

function SetLedCounts(){
	let LedMask = 0; // Initialize LedMask
	let LedMask2 = 0;
	const GIGABYTE_SHIFT = 4; // Number of bits for each channel's shift
	const logs = []; // Array to store log messages

	// Iterate through each channel in the ChannelArray
	for (let i = 0; i < ChannelArray.length; i++) {
		const channelLeds = device.channel(ChannelArray[i][0]).LedCount();
		const channelEnum = Get_Led_Def(channelLeds);

		// Shift the channelEnum and OR it into LedMask
		if(i < 2) {
			LedMask |= (channelEnum << (i * GIGABYTE_SHIFT));
		} else {
			LedMask2 |= (channelEnum << ( (i - 2) * GIGABYTE_SHIFT));
		}


		// Log each channel's details
		logs.push(`Channel ${i + 1} Led Counts: ${channelLeds} [${channelEnum}]`);
	}

	// Log all channel messages
	logs.forEach(log => device.log(log, { toFile: true }));

	// Log the final LedMask
	device.log(`Led Enum Mask: ${LedMask}`, { toFile: true });
	device.log(`Led Enum Mask2: ${LedMask2}`, { toFile: true });

	// Create the packet
	const packet = [GIGABYTE_COMMAND, GIGABYTE_COMMAND_ARGBLEDCOUNTS, LedMask, LedMask2];
	device.send_report(packet, 64);
}

function sendDirectPacket(channel, start, count, data){
	let packet = [];
	packet[0] = GIGABYTE_COMMAND;
	packet[1] = channel;
	packet[2] = start & 0xFF;
	packet[3] = (start >> 8);
	packet[4] = count;
	packet = packet.concat(data);

	device.send_report(packet, 64);
}

function sendColorPacket(zone, data){
	const Mode = 1; //Static mode

	let packet = [];

	packet[0x00] = GIGABYTE_COMMAND;
	packet[0x01] = zone;
	packet[0x02] = 2 ** Math.abs((0x20 - zone));

	let end = 0;

	switch(parseInt(zone)) {
	case 0x91:
		end = 0x02;
		break;
	case 0x92:
		end = 0x04;
		break;
	}

	packet[0x03] = end;
	packet[0x04] = 0;
	packet[0x0B] = Mode;
	packet[0x0C] = 0x5A; //We Always hardcode brightness to Max in plugins, its handled in the backend
	packet[0x0D] = 0x00; //Min Brightness for effect - Not needed for us
	packet = packet.concat(data);

	//We ignore everything else involing timers and color shift effect info.
	device.send_report(packet, 64);
}


function sendCommit(){
	device.send_report([GIGABYTE_COMMAND, GIGABYTE_COMMAND_COMMIT, GIGABYTE_COMMIT_VALUE, 0x07], 64);
}

let config = [GIGABYTE_COMMAND];

function RequestConfig(){
	device.log('Requesting config');

	const packet = [GIGABYTE_COMMAND, GIGABYTE_COMMAND_CONFIGTABLE];

	try {
		device.send_report(packet, 64);
		config = device.get_report(config, 64);
		device.log(config);

		device.log(`D_Led1 Led Count: ${ledCountReverseTable[config[8] << 4]}`);
		device.log(`D_Led2 Led Count: ${ledCountReverseTable[config[8] << 8]}`);
		device.log(`D_Led3 Led Count: ${ledCountReverseTable[config[9] << 4]}`);

		const Firmware = `${config[4]}.${config[5]}.${config[6]}.${config[7]}`;
		device.log(`Firmware Version ${Firmware}`, {toFile: true});
		device.log(`Developed on Firmware ${"2.0.10.0"}`);

		let description = "";

		for(let i = 0; i < 28; i++){
			description += String.fromCharCode(config[i + 12]);
		}

		device.log(`Device Description: ${description}`, {toFile: true});
		device.log(`Config Table`, {toFile: true});

		for (let i = 0; i < config.length; i += 8) {
			const hexChunk = config.slice(i, i + 8).map(number => number.toString(16));
			device.log(hexChunk, { toFile: true });
		}

	} catch(ex) {
		device.log('Could not send packet');
		device.log(ex.message);
	}
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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/gigabyte/motherboard/motherboard.png";
}