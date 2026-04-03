export function Name() { return "Asus Aura Terminal"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return 0x1889; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/asus"; }
export function Size() { return [5, 5]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function SubdeviceController(){ return true; }
export function ConflictingProcesses() { return ["LightingService.exe"]; }
export function DeviceType(){return "lightingcontroller"}

/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
RGBconfig0:readonly
RGBconfig1:readonly
RGBconfig2:readonly
RGBconfig3:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"RGBconfig0", "group":"lighting", "label":"RGB Header Channel 1", description: "Sets the RGB color order for Channel 1. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox", "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"RGBconfig1", "group":"lighting", "label":"RGB Header Channel 2", description: "Sets the RGB color order for Channel 2. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox", "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"RGBconfig2", "group":"lighting", "label":"RGB Header Channel 3", description: "Sets the RGB color order for Channel 3. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox", "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
		{"property":"RGBconfig3", "group":"lighting", "label":"RGB Header Channel 4", description: "Sets the RGB color order for Channel 4. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox", "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"RGB"},
	];
}

const DeviceLedLimit = 210;

const ChannelArray = [
	["Channel 1", 90],
	["Channel 2", 90],
	["Channel 3", 90],
	["Channel 4", 90],
];

const RGBConfigs = {
	"RGB" : [0, 1, 2],
	"RBG" : [0, 2, 1],
	"BGR" : [2, 1, 0],
	"BRG" : [2, 0, 1],
	"GBR" : [1, 2, 0],
	"GRB" : [1, 0, 2]
};

const vLedNames = ["Logo"];
const vLedPositions = [[2, 2]];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	SetupChannels();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function SetupChannels(){

	// Set 4 channels and Logo to direct mode
	for(let i = 0; i < 5; i++){
		device.write([0xEC, 0x3B, i, 0x00, 0xFF], 65);
	}

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}

	device.SetLedLimit(DeviceLedLimit);
}

function sendColors(overrideColor) {

	// Get channels RGB
	for(let i = 0; i < ChannelArray.length; i++) {
		const RGBData = grabRGBData(i, overrideColor);
		const LedCountChannel = device.channel(ChannelArray[i][0]).LedCount();
		let LedCount = Math.min(LedCountChannel, DeviceLedLimit);
		let ledsSent = 0;

		// No led on this channel, skip
		if(!RGBData.length) {continue;}

		while(LedCount > 0){
			// Gate Led count to max per packet size
			const ledsToSend = Math.min(LedCount, 20);
			LedCount -= ledsToSend;
			device.write([0xEC, 0x40, i, ledsSent, ledsToSend].concat(RGBData.splice(0, ledsToSend*3)), 65);
			ledsSent += ledsToSend;
		}

		device.write([0xEC, 0x40, (128 + i)], 65);
	}

	// Logo LED
	const iX = vLedPositions[0][0];
	const iY = vLedPositions[0][1];
	let color;

	if(overrideColor) {
		color = hexToRgb(overrideColor);
	} else if (LightingMode == "Forced") {
		color = hexToRgb(forcedColor);
	} else {
		color = device.color(iX, iY);
	}

	device.write([0xEC, 0x40, 0x04, 0x00, 0x01, color[0], color[1], color[2]], 65);
	device.write([0xEC, 0x40, 0x84], 65);
}

function grabRGBData(Channel, overrideColor) {

	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);
	let RGBData = [];

	if(overrideColor) {
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", RGBConfigs["RGBconfig" + Channel]);
	} else if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", RGBConfigs["RGBconfig" + Channel]);
	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = ChannelArray[Channel][1];

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", RGBConfigs["RGBconfig" + Channel]);
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", RGBConfigs["RGBconfig" + Channel]);
	}

	return RGBData;
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/asus/lighting-controllers/rog-terminal-controller.png";
}
