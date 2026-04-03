export function Name() { return "SteelSeries Arctis 5"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x1250; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 2]; }
export function DeviceType(){return "headphones"}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
NoiseCancelling:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"NoiseCancelling", "group":"", "label":"Noise Canceling", description: "Sets the Noise Canceling level", "type":"combobox", "values":["None", "Low", "Medium", "High"], "default":"None"},
	];
}


const vLedNames = [
	"Left Can", "Right Can", "Mic Led", "Muted Mic Led"
];

const vLedPositions = [
	[0, 0], [2, 0], [2, 0], [1, 1]
];

const vKeymap = [
	0, 2, 3, 1
];

export function Initialize() {

}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] = parseInt(data[i], 16);//.toString(16)
	}

	device.write(packet, size);
}

function sendReportString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.send_report(packet, size);
}

export function Shutdown() {
	sendColors(true);

}

export function Validate(endpoint) {
	//endpoint = 1 1 ffc0
	//Takes both a size 64 'system' WRITE, and size 643 RGB data REPORT
	return endpoint.interface === 5;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

const NoiseCancellingDict = {
	"None": "FF 7F",
	"Low" : "FF 4F",
	"Medium":"00 20",
	"High": "00 00"
};
let SavedNoiseCancellingLevel;

function setNoiseCancelling(){
	if(SavedNoiseCancellingLevel != NoiseCancelling){
		SavedNoiseCancellingLevel = NoiseCancelling;
		sendPacketString(`04 40 06 10 F6 60 09 2C 01` +  NoiseCancellingDict[NoiseCancelling], 39);
		sendPacketString("04 40 01 11 54 9B", 39);
		sendPacketString("06 8A 42 00 20 05", 37);
		sendPacketString("06 81 43 01 23", 37);
	}
}

export function Render() {

	setNoiseCancelling();
	sendColors();

}

// 0 is left, 1 is right.
function sendColors(shutdown = false){
	for (let index = 0;index < vKeymap.length; index++) {
		const packet = [];
		sendPacketString("06 81 43 01 22", 37);
		//sendPacketString("06 8A 42 00 20 40",37)
		sendPacketString("06 81 43 01 23", 37);

		//packet[0x00]   = 0x00;
		packet[0x00]   = 0x06;
		packet[0x01]   = 0x8A;
		packet[0x02]   = 0x42;
		packet[0x03]   = 0x00;
		packet[0x04]   = 0x20;
		packet[0x05]   = 0x41;
		packet[0x06]   = 0x00;


		const iPxX = vLedPositions[index][0];
		const iPxY = vLedPositions[index][1];
		var color;

		if(shutdown){
			color = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		packet[7] = color[0];
		packet[8] = color[1];
		packet[9] = color[2];

		packet[10] = 0xFF;
		packet[11] = 0x32;
		packet[12] = 0xC8;
		packet[13] = 0xC8;

		device.write(packet, 37);
		//sendPacketString("06 81 43 01 23", 37);
		sendPacketString(`06 8A 42 00 20 41 08 ${index} 01`, 37);
		//sendPacketString("06 81 43 01 23", 37);
		sendPacketString(`06 8A 42 00 20 60 ${index}`, 37);
		//sendPacketString("06 81 43 01 23", 37);
		//sendPacketString("06 8A 42 00 20 40",37)

		sendPacketString("06 8A 42 20 05", 37);

	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/audio/arctis-5.png";
}