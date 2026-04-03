const ParentDeviceName = "Razer Chroma HDK";
const vLeds = [];
const LedsPerChannel = 16;
//Channel Name, Led Limit
const ChannelArray = [
	{ Name:"Channel 1", LedLimit:LedsPerChannel },
	{ Name:"Channel 2", LedLimit:LedsPerChannel },
	{ Name:"Channel 3", LedLimit:LedsPerChannel },
	{ Name:"Channel 4", LedLimit:LedsPerChannel }
];

export function Name() { return "Razer Chroma HDK"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0F09; }
export function Publisher() { return "Kratheus"; }
export function Size() { return [20, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0]; }
export function DefaultScale(){return 8.0; }
export function SubdeviceController(){return true;}
export function DeviceType(){return "lightingcontroller"}

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

export function LedNames(){
	const return_value = [];

	for(let i=0; i < vLeds.length; i++){
		return_value.push(vLeds[i].Name);
	}

	return return_value;
}

export function LedPositions(){
	const return_value = [];

	for(let i=0; i < vLeds.length; i++){
		return_value.push(vLeds[i].Position);
	}

	return return_value;
}

function GetReport(cmd_class, cmd_id, size){
	const report = new Array(91).fill(0);
	report[0] = 0;
	report[1] = 0x00; // Status.
	report[2] = 0xFF; // Transaction ID.
	report[3] = 0x00; // Remaining packets.
	report[4] = 0x00;
	report[5] = 0x00; // Protocol type.
	report[6] = size; // Data size.
	report[7] = cmd_class; // Command class.
	report[8] = cmd_id; // Command id.
	//report[8-87] = data;
	//report[89] = crc;
	//report[89] = reserved;

	return report;
}

function CalculateCrc(report){
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function hexToRgb(hex){
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function EnableSoftwareControl(){
	const report = GetReport(0x0F, 0x03, 0x47);
	report[2] = 0x3F; // transaction id.
	report[11] = 0; // row index.
	report[13] = LedsPerChannel; // led count.
	report[89] = CalculateCrc(report);

	device.send_report(report, 91);
}

function SetupChannels(){
	device.SetLedLimit((LedsPerChannel*(ChannelArray.length + 1)));

	for(let i = 0; i < ChannelArray.length; i++){
		device.addChannel(ChannelArray[i].Name, ChannelArray[i].LedLimit);
	}
}

function ReturnToHardwareControl(){
}

function SendChannel(Channel, shutdown=false){
	let ChannelLedCount = device.channel(ChannelArray[Channel].Name).ledCount;
	let RGBData = [];
	const componentChannel = device.channel(ChannelArray[Channel].Name);

	if(shutdown){
		RGBData = device.createColorArray(shutdownColor, ChannelLedCount, "Inline");
	}else if(LightingMode === "Forced"){
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = LedsPerChannel;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel].Name);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
	}else{
		RGBData = device.channel(ChannelArray[Channel].Name).getColors("Inline");
	}
	//Stream RGB Data
	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x35;
	packet[7] = 0x0F;
	packet[8] = 0x03;
	packet[9] = 0x00;
	packet[10] = 0x00;
	packet[11] = Channel;
	packet[12] = 0x00;
	packet[13] = 0x0F;
	packet = packet.concat(RGBData);
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
	//device.pause(1); // We need a pause here (between packets), otherwise the ornata can't keep up.
}

export function Initialize(){
	SetupChannels();
}

export function Render(){
	for(let i=0; i < 4; i++){
		SendChannel(i);
	}
}

export function Shutdown(){
	for(let i=0; i < 4; i++){
		SendChannel(i, true);
	}
}

export function Validate(endpoint){
	return endpoint.interface === 2 && endpoint.usage === 0x0002;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/lighting-controllers/chroma-hdk.png";
}