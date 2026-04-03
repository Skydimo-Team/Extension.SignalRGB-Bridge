import systeminfo from "@SignalRGB/systeminfo";
export function Name() { return "ASUS Aura Motherboard Controller"; }
export function VendorId() { return  0x0B05; }
export function ProductId() { return [0x18F3, 0x19AF, 0x1939, 0x1bed];}
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
Mainboardconfig:readonly
Headerconfig:readonly
RGBconfig:readonly
disableRGBHeaders:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"Mainboardconfig", "group":"lighting", "label":"Mainboard Configuration", description: "Sets the RGB color order for the Motherboards RGB. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox",   "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"Headerconfig", "group":"lighting", "label":"12v Header Configuration", description: "Sets the RGB color order for the Motherboards 12v RGB Headers. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox",   "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"RGBconfig", "group":"lighting", "label":"ARGB Channel Configuration", description: "Sets the RGB color order for the Motherboards 5v ARGB Headers. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox",   "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"disableRGBHeaders",  "group":"", "label":"Disable 12v Headers", description: "Disables and removes 12V RGB headers in SignalRGB.", "type":"boolean", "default":"0"},
	];
}
export function LedNames(){ return vLedNames; }
export function LedPositions(){ return vLedPositions; }

export function Documentation(){ return "troubleshooting/asus"; }

export function Validate(endpoint) {
	return endpoint.interface === 2;
}

export function ondisableRGBHeadersChanged(){
	if(disableRGBHeaders){
		for(let i = 0; i < HeaderArray.length; i++){
			device.removeSubdevice(HeaderArray[i]);
		}

		HeaderArray  = [];
	}else{
		Create12vHeaders();
	}
}

function SetupChannels() {
	device.SetLedLimit(Device_ChannelLedLimit * DeviceInfo.ARGBChannelCount);

	for(let i = 0; i < DeviceInfo.ARGBChannelCount; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

// Global Variables
const ParentDeviceName = "ASUS AURA LED Controller";

const RGBConfigs = {
	"RGB" : [0, 1, 2],
	"RBG" : [0, 2, 1],
	"BGR" : [2, 1, 0],
	"BRG" : [2, 0, 1],
	"GBR" : [1, 2, 0],
	"GRB" : [1, 0, 2]
};

const ChannelArray = [];
let HeaderArray = [];
let vLedNames = [];
let vLedPositions = [];

// Device Constants
const Device_ChannelLedLimit = 120;
const Device_PacketLedLimit = 20;
const Device_PulseLedCount = 40;

const Device_Write_Length = 65;
const Device_Read_Length = 65;

const motherboardInfo = systeminfo.GetMotherboardInfo();
const MotherboardName = motherboardInfo.model;

// Protocol Constants
const ASUS_COMMAND = 0xEC;
const ASUS_COMMAND_SETMODE = 0x35;
const ASUS_COMMAND_CONFIG = 0xB0;
const ASUS_COMMAND_DIRECTCONTROL = 0x40;
const ASUS_COMMAND_FIRMWARE = 0x82;

const ASUS_RESPONSE_FIRMWARE = 0x02;
const ASUS_RESPONSE_CONFIGTABLE = 0x30;

const ASUS_CONFIG_ARGB_CHANNELS = 0x06;
const ASUS_CONFIG_MAINBOARD_LEDS = 31;
const ASUS_CONFIG_12V_HEADERS = 33;
//31, B1, 31 01, 31 02, 31 03, 31 04
const ASUS_MAINBOARD_DIRECTIDX = 4;
const ASUS_MODE_DIRECT = 0xFF;
// AULA3-AR32-0207 - 3 mainboard, 3 ARGB, 1 12V - ROG STRIX Z690 GAMING WIFI
// AULA3-AR42-0207 - 3 Mainboard, 1 ARGB, 2 12V - TUF GAMING X570-PRO (WI-FI)
// AULA3-AR42-0207 - 3 Mainboard, 2 ARGB, 2 12V - TUF GAMING B550-PLUS WIFI II
// AULA3-6K75-0207 - 3 Mainboard, 1 ARGB, 2 12V - TUF GAMING X570-PLUS

// TODO: We should replace those controllers ID by motherboard firmware fetched names
// Asus sometimes change this on BIOS updates and it's causing overlapping configurations on boards with same controller
const ConfigurationOverrides = {
	"AULA3-AR32-0207":{MainboardCount: 3, ARGBChannelCount:3, RGBHeaderCount: 1}, // THIS HAS A SPACE AT THE END?!?!?!
	"AULA3-AR32-0213":{MainboardCount: 2, ARGBChannelCount:3, RGBHeaderCount: 1},
	"AULA3-AR32-0218":{MainboardCount: 5, ARGBChannelCount:3, RGBHeaderCount: 1}, //Z790 Apex
	//"AULA3-AR32-0214":{MainboardCount: 2, ARGBChannelCount:3, RGBHeaderCount: 1}, // Asus TUF GAMING Z790-PLUS WIFI D4
	//"AULA3-6K75-0206":{MainboardCount: 7, ARGBChannelCount:3, RGBHeaderCount: 1},
	//"AULA3-AR42-0207":{MainboardCount: 3, ARGBChannelCount:1, RGBHeaderCount: 2},

	// Just making sure we catch even if 'Asus' isnt present in the naming from firmware
	"ROG CROSSHAIR VIII HERO": {MainboardCount: 8, ARGBChannelCount: 2, RGBHeaderCount: 2},
	"Asus ROG MAXIMUS Z690 EXTREME":{MainboardCount: 7, ARGBChannelCount:3, RGBHeaderCount: 1},
	"ROG MAXIMUS Z690 EXTREME":{MainboardCount: 7, ARGBChannelCount:3, RGBHeaderCount: 1},
	"Asus ROG MAXIMUS Z690 EXTREME GLACIAL":{MainboardCount: 7, ARGBChannelCount:4, RGBHeaderCount: 1, polymoOverride : true}, //The naming for this is a bit backwards. It forces polymo off.
	"ROG MAXIMUS Z690 EXTREME GLACIAL":{MainboardCount: 7, ARGBChannelCount:4, RGBHeaderCount: 1, polymoOverride : true}, //The naming for this is a bit backwards. It forces polymo off.
	"TUF GAMING X570-PRO (WI-FI)": {MainboardCount: 3, ARGBChannelCount:1, RGBHeaderCount: 2},
	"PRIME Z790-A WIFI" : {MainboardCount: 4, ARGBChannelCount:3, RGBHeaderCount: 1},
	"ROG STRIX B650-A GAMING WIFI" : {MainboardCount: 3, ARGBChannelCount:3, RGBHeaderCount: 1},
	"ROG STRIX B650E-F GAMING WIFI" : {MainboardCount: 3, ARGBChannelCount:3, RGBHeaderCount: 1},
	"ROG MAXIMUS Z790 APEX ENCORE": {MainboardCount: 2, ARGBChannelCount:3, RGBHeaderCount: 1},
	"ROG STRIX B760-F GAMING WIFI": {MainboardCount: 2, ARGBChannelCount:3, RGBHeaderCount: 1},
	"ROG STRIX Z890-E GAMING WIFI": {MainboardCount: 3, ARGBChannelCount: 3, RGBHeaderCount: 1}, //With current logic has 1 too few mainboard leds due to 12v.
	"TUF GAMING Z890-PLUS WIFI":{MainboardCount: 1, ARGBChannelCount: 3, RGBHeaderCount: 0}, //With current logic has 4 12V and -3 mainboard
	"ROG STRIX Z890-A GAMING WIFI":{MainboardCount: 2, ARGBChannelCount: 3, RGBHeaderCount: 0}, //Claims 2 onboard, 3 argb, and 3 12V
	"PRIME Z890-P WIFI":{MainboardCount: 0, ARGBChannelCount: 3, RGBHeaderCount: 1},
	"ROG STRIX B850-F GAMING WIFI": {MainboardCount: 2, ARGBChannelCount: 3, RGBHeaderCount: 2}
};

const DeviceInfo = {
	Model: "Unknown",
	ConfigTable: [ASUS_COMMAND, ASUS_COMMAND_CONFIG],
	MainChannelLedCount: 0,
	ARGBChannelCount: 0,
	MainBoardLedCount: 0,
	RGBHeaderCount: 0,
	PolymoSupport : 0
};


export function Initialize() {

	SetMotherboardName();
	FetchFirmwareVersion();

	// Read and parse the device's config table
	const ValidConfig = FetchConfigTable();

	if(ValidConfig){
		ParseConfigTable();
	}

	//this is updated after loading so it won't display in the editor
	CreatePolymoSubdevice();
	CreateMainBoardLeds();

	if(!disableRGBHeaders){
		Create12vHeaders();
	}

	device.write([0xec, 0x52, 0x53, 0x00, 0x01], 65); //Stop using gen 2 :bonk:
	// Set Mainboard to direct Mode
	SetChannelModeDirect(0);

	if(DeviceInfo.PolymoSupport) {
		//set all ARGB channels to direct mode
		for(let channel = 1; channel < DeviceInfo.ARGBChannelCount + 2; channel++){ //I offset the total count to account for polymo.
			SetChannelModeDirect(channel);
			ChannelArray.push([`Channel ${channel}`, Device_ChannelLedLimit]);
		}
	} else {
		//set all ARGB channels to direct mode
		for(let channel = 1; channel < DeviceInfo.ARGBChannelCount + 1; channel++){
			SetChannelModeDirect(channel);
			ChannelArray.push([`Channel ${channel}`, Device_ChannelLedLimit]);
		}
	}


	// For Component Backend
	SetupChannels();

}

export function Shutdown(SystemSuspending) {

	const color = SystemSuspending ? "#000000" : shutdownColor;

	SendMainBoardLeds(color); // Go Dark on System Sleep/Shutdown

	if(DeviceInfo.PolymoSupport) {
		sendPolymoColors(color);
	}

	for(let channel = 0; channel < DeviceInfo.ARGBChannelCount; channel++){
		SendARGBChannel(channel, Boolean(DeviceInfo.PolymoSupport), color);
	}

}

export function Render() {
	SendMainBoardLeds();

	if(DeviceInfo.PolymoSupport) {
		sendPolymoColors();

		for(let channel = 0; channel < DeviceInfo.ARGBChannelCount; channel++){
			SendARGBChannel(channel, true);
		}
	} else {
		for(let channel = 0; channel < DeviceInfo.ARGBChannelCount; channel++){
			SendARGBChannel(channel);
		}
	}

}

const polymoDevice =
{
	Names : [ "ROG Logo LED 1", "ROG Logo LED 2", "ROG Logo LED 3", "ROG Logo LED 4", "ROG Logo LED 5", "ROG Logo LED 6", "ROG Logo LED 7", "ROG Logo LED 8", "ROG Logo LED 9", "ROG Logo LED 10", "ROG Logo LED 11", "Hero LED 1", "Hero LED 2", "Hero LED 3", "Hero LED 4", "Hero LED 5", "Hero LED 6", "Hero LED 7", "Hero LED 8" ],
	Positions : [ [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11] ]
};

function CreatePolymoSubdevice() {
	if(DeviceInfo.PolymoSupport) {
		device.createSubdevice("Polymo");
		device.setSubdeviceName("Polymo", `${MotherboardName} - Polymo Panel`);
		device.setSubdeviceSize("Polymo", 8, 12);
		device.setSubdeviceLeds("Polymo", polymoDevice.Names, polymoDevice.Positions);
	}
}

function sendPolymoColors(overrideColor) {
	const RGBData = [];

	for(let polymoLEDs = 0; polymoLEDs < polymoDevice.Positions.length; polymoLEDs++) {
		const iX = polymoDevice.Positions[polymoLEDs][0];
		const iY = polymoDevice.Positions[polymoLEDs][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode == "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("Polymo", iX, iY);
		}
		const ledIdx = polymoLEDs * 3;
		RGBData[ledIdx] = color[0];
		RGBData[ledIdx + 1] = color[1];
		RGBData[ledIdx + 2] = color[2];
	}

	StreamDirectColors(0, RGBData, polymoDevice.Positions.length);
}

function SetMotherboardName(){

	if(MotherboardName != "Unknown"){
		device.setName(`Asus ${MotherboardName} Controller`);
	}
}

function CreateMainBoardLeds(){
	// Blow Away and recreate
	vLedNames = [];
	vLedPositions = [];

	for(let i = 0; i < DeviceInfo.MainChannelLedCount; i++){
		vLedNames.push(`Led ${i}`);
		vLedPositions.push([i, 0]);
	}

	device.setSize([DeviceInfo.MainChannelLedCount === 0 ? 1 : DeviceInfo.MainChannelLedCount, 1]);
	device.setControllableLeds(vLedNames, vLedPositions);
}


function Create12vHeaders(){

	//Blow away and recreate 12v Headers
	for(let i = 0; i < HeaderArray.length; i++){
		device.removeSubdevice(HeaderArray[i]);
	}

	HeaderArray = [];

	for(let headerIdx = 0; headerIdx < DeviceInfo.RGBHeaderCount ;headerIdx++){
		const HeaderName = `12V Header ${headerIdx + 1}`;
		HeaderArray.push(HeaderName);

		device.createSubdevice(HeaderName);
		// Parent Device + Sub device Name + Ports
		device.setSubdeviceName(HeaderName, `${ParentDeviceName} - ${HeaderName}`);
		device.setSubdeviceSize(HeaderName, 3, 3);
		device.setSubdeviceLeds(HeaderName, ["12v RGB Header"], [[1, 1]]);

	}
}


function SendMainBoardLeds(overrideColor) {
	//Fetch Mainboard RGB Info
	let [RGBData, TotalLedCount] = FetchMainBoardColors(overrideColor);

	//Fetch 12v Header RGB Info
	const [HeaderRGBData, HeaderLedCount] = Fetch12VHeaderColors(overrideColor);

	// Append 12v Header Info, Both are sent together with 12v Headers always at the end of the Mainboard LEDS
	RGBData.push(...HeaderRGBData);
	TotalLedCount += HeaderLedCount;

	//Mainboard is channel 0 normally, but channel 4 in direct mode
	StreamDirectColors(ASUS_MAINBOARD_DIRECTIDX, RGBData, TotalLedCount);
}


function FetchMainBoardColors(overrideColor){
	const RGBData = [];
	let TotalLedCount = 0;

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		RGBData[iIdx*3] = col[RGBConfigs[Mainboardconfig][0]];
		RGBData[iIdx*3+1] = col[RGBConfigs[Mainboardconfig][1]];
		RGBData[iIdx*3+2] = col[RGBConfigs[Mainboardconfig][2]];
		TotalLedCount += 1;
	}

	return [RGBData, TotalLedCount];

}


function Fetch12VHeaderColors(overrideColor){
	const RGBData = [];
	let TotalLedCount = 0;

	for(let iIdx = 0; iIdx < DeviceInfo.RGBHeaderCount; iIdx++) {
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.subdeviceColor(HeaderArray[iIdx], 1, 1);
		}

		RGBData[iIdx*3] = col[RGBConfigs[Headerconfig][0]];
		RGBData[iIdx*3+1] = col[RGBConfigs[Headerconfig][1]];
		RGBData[iIdx*3+2] = col[RGBConfigs[Headerconfig][2]];
		TotalLedCount += 1;
	}

	return [RGBData, TotalLedCount];
}

function SendARGBChannel(ChannelIdx, polymo = false, overrideColor) {
	//Fetch Colors
	let ChannelLedCount = device.channel(ChannelArray[ChannelIdx][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[ChannelIdx][0]);

	let RGBData = [];

	if(LightingMode === "Forced"){
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", RGBconfig);

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = Device_PulseLedCount;

		const pulseColor = device.getChannelPulseColor(ChannelArray[ChannelIdx][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", RGBconfig);

	}else if(overrideColor){
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", RGBconfig);
	}else{
		RGBData = device.channel(ChannelArray[ChannelIdx][0]).getColors("Inline", RGBconfig);
	}

	if(polymo) {
		StreamDirectColors(ChannelIdx + 1, RGBData, ChannelLedCount);
	} else {
		StreamDirectColors(ChannelIdx, RGBData, ChannelLedCount);
	}

}


function SetChannelModeDirect(ChannelIdx){
	if(ChannelIdx == 0){
		device.log(`Setting Mainboard to Direct Mode`);
	}else{
		device.log(`Setting Channel ${ChannelIdx} to Direct Mode`);
	}

	const packet = [ASUS_COMMAND, ASUS_COMMAND_SETMODE, ChannelIdx, 0x00, 0x00, ASUS_MODE_DIRECT];
	device.write(packet, Device_Write_Length);
}

function StreamDirectColors(ChannelIdx, RGBData, LedCount){
	let ledsSent = 0;
	let isApplyPacket = false;
	LedCount = Math.min(LedCount, Device_ChannelLedLimit);

	while(LedCount > 0){
		// Gate Led count to max per packet size
		const ledsToSend = Math.min(LedCount, Device_PacketLedLimit);
		LedCount -= ledsToSend;
		//Set apply falg when we're out of LED's
		isApplyPacket = LedCount == 0;
		SendDirectPacket(ChannelIdx, ledsSent, ledsToSend, RGBData.splice(0, ledsToSend*3), isApplyPacket);
		ledsSent += ledsToSend;
	}
}

function SendDirectPacket(channel, start, count, data, apply){

	const packet = [];
	packet[0] = ASUS_COMMAND;
	packet[1] = ASUS_COMMAND_DIRECTCONTROL;
	packet[2] = apply ? 0x80 | channel : channel;
	packet[3] = start;
	packet[4] = count;
	packet.push(...data);

	device.write(packet, Device_Write_Length);
}


function FetchConfigTable(){
	ClearReadBuffer();

	const packet = [ASUS_COMMAND, ASUS_COMMAND_CONFIG];
	device.write(packet, Device_Write_Length);

	const data = device.read([0x00], Device_Read_Length);

	if(data[1] === ASUS_RESPONSE_CONFIGTABLE){
		DeviceInfo.ConfigTable = data;
		device.log("Config Table", {toFile: true});

		for(let i = 0; i < DeviceInfo.ConfigTable.length; i += 8){
			device.log(DeviceInfo.ConfigTable.slice(i, i+8), {toFile: true});
		}

		return true;
	}

	device.log("Failed to Read Config Table", {toFile: true});

	return false;
}

function ParseConfigTable(){

	let polymoOverride = false;

	for(const config in ConfigurationOverrides){
		// If modelId matches, or if mobo name does
		if(DeviceInfo.Model.localeCompare(config) == 0 || MotherboardName == config){
			polymoOverride = LoadOverrideConfiguration(config);

			return;
		}
	}

	if(DeviceInfo.ConfigTable[ASUS_CONFIG_ARGB_CHANNELS] === 4 && polymoOverride === false) {
		DeviceInfo.ARGBChannelCount = DeviceInfo.ConfigTable[ASUS_CONFIG_ARGB_CHANNELS] - 1;
		device.log(`ARGB channel Count ${DeviceInfo.ARGBChannelCount} `, {toFile: true});
		DeviceInfo.PolymoSupport = 1;
		device.log("Motherboard has a Polymo Panel.");
	} else {
		DeviceInfo.ARGBChannelCount = DeviceInfo.ConfigTable[ASUS_CONFIG_ARGB_CHANNELS];
		device.log(`ARGB channel Count ${DeviceInfo.ARGBChannelCount} `, {toFile: true});
	}

	if(DeviceInfo.ConfigTable[ASUS_CONFIG_12V_HEADERS] === 3) //Weird offset edge case.
	{
		device.log("Config Table Returned 3 12 Volt Headers. Board most likely does not have 3 12 Volt Headers. Adjusting counts.");

		if(DeviceInfo.ConfigTable[ASUS_CONFIG_MAINBOARD_LEDS] !== 0) {
			DeviceInfo.MainChannelLedCount = DeviceInfo.ConfigTable[ASUS_CONFIG_MAINBOARD_LEDS] - 1;
		}

		device.log(`MainBoard Led Count ${DeviceInfo.MainChannelLedCount} `, {toFile: true});

		DeviceInfo.RGBHeaderCount = 1;
		device.log(`12V Header Count ${DeviceInfo.RGBHeaderCount} `, {toFile: true});
	} else {
		DeviceInfo.MainChannelLedCount = DeviceInfo.ConfigTable[ASUS_CONFIG_MAINBOARD_LEDS] - DeviceInfo.ConfigTable[ASUS_CONFIG_12V_HEADERS];
		device.log(`MainBoard Led Count ${DeviceInfo.MainChannelLedCount} `, {toFile: true});

		DeviceInfo.RGBHeaderCount = DeviceInfo.ConfigTable[ASUS_CONFIG_12V_HEADERS];
		device.log(`12V Header Count ${DeviceInfo.RGBHeaderCount} `, {toFile: true});
	}

	// This should deal with most cases. Some device report really out of wack values.
	if(DeviceInfo.MainChannelLedCount >= DeviceInfo.RGBHeaderCount){
		DeviceInfo.MainBoardLedCount = DeviceInfo.MainChannelLedCount - DeviceInfo.RGBHeaderCount;
	}
}


function LoadOverrideConfiguration(DeviceName){
	const configuration = ConfigurationOverrides[DeviceName];
	device.log(`Using Config Override for Model: ${DeviceName}`, {toFile: true});

	DeviceInfo.ARGBChannelCount = configuration.ARGBChannelCount;
	device.log(`ARGB channel Count ${DeviceInfo.ARGBChannelCount} `, {toFile: true});

	DeviceInfo.MainChannelLedCount = configuration.MainboardCount;
	device.log(`MainBoard Led Count ${DeviceInfo.MainChannelLedCount} `, {toFile: true});

	DeviceInfo.RGBHeaderCount = configuration.RGBHeaderCount;
	device.log(`12V Header Count ${DeviceInfo.RGBHeaderCount} `, {toFile: true});

	if(configuration.polymoOverride) { return configuration.polymoOverride; }

	return false;
}


function FetchFirmwareVersion(){
	ClearReadBuffer();

	const packet = [ASUS_COMMAND, ASUS_COMMAND_FIRMWARE];
	device.write(packet, Device_Write_Length);

	const data = device.read([0x00], Device_Read_Length);

	if(data[1] == ASUS_RESPONSE_FIRMWARE){
		DeviceInfo.Model = "";

		for(let i = 2; i < 18; i++){
			DeviceInfo.Model += String.fromCharCode(data[i]);
		}

		device.log(`Found Device Model: ${DeviceInfo.Model}`, {toFile: true});

		return true;
	}

	device.log("Failed to Fetch Firmware Version", {toFile: true});

	return false;

}


// Helper Functions
function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function ClearReadBuffer(timeout = 10){
	let count = 0;
	const readCounts = [];
	device.flush();

	while(device.getLastReadSize() > 0){
		device.read([0x00], Device_Read_Length, timeout);
		count++;
		readCounts.push(device.getLastReadSize());
	}
	//device.log(`Read Count ${count}: ${readCounts} Bytes`)
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/asus/motherboards/motherboard.png";
}
