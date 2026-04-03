export function Name() { return "SteelSeries Arctis Pro GameDAC"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return 0x1280; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [3, 2]; }
export function DeviceType(){return "headphones";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
OLEDTimeout:readonly
OLEDBrightness:readonly
Sidetone:readonly
MicVolume:readonly
Surround:readonly
EQ:readonly
Gain:readonly
Mode:readonly
VolumeGame:readonly
VolumeChat:readonly
VolumeAux:readonly
VolumeMic:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"OLEDTimeout", "group":"", "label":"Screen Timeout (Minutes)", description: "The screen shuts off after this amount of time", "type":"combobox", "values":["1", "5", "10", "15", "30", "60", "Never"], "default":"30"},
		{"property":"OLEDBrightness", "group":"", "label":"OLED Brightness", description: "Sets the OLED brightness level", "step":"1", "type":"number", "min":"1", "max":"10", "default":"8"},
		{"property":"Sidetone", description: "Enables the microphone feedback. can hear yourself in the mic slider to adjust volume", "group":"", "label":"Sidetone Amount", "type":"combobox", "values":["None", "Low", "Medium", "High"], "default":"None"},
		{"property":"MicVolume", "group":"", "label":"Microphone Volume", description: "Sets the microphone volume input level", "step":"10", "type":"number", "min":"0", "max":"100", "default":"100"},
		{"property":"Surround", "group":"", "label":"Surround Sound", description:"Enables Surround Sound", "type":"boolean", "default":"false"},
		{"property":"EQ", "group":"", "label":"EQ Type", description: "Sets the EQ Profile type", "type":"combobox", "values":["Flat", "Bass Boost", "Reference", "Smiley", "Custom"], "default":"Flat"},
		{"property":"Gain", "group":"", "label":"Extra Gain", description: "Enables extra audio gain", "type":"boolean", "default":"true"},
		{"property":"Mode", "group":"", "label":"Line Out Mix Mode", description: "Sets the mode for Line Out Mix", "type":"combobox", "values":["Standard", "Custom"], "default":"Standard"},
		{"property":"VolumeGame", "group":"", "label":"Game Mix Volume", description: "Sets the Game Mix Channel volume", "step":"1", "type":"number", "min":"0", "max":"20", "default":"10"},
		{"property":"VolumeChat", "group":"", "label":"Chat Mix Volume", description: "Sets the Chat Mix Channel volume", "step":"1", "type":"number", "min":"0", "max":"20", "default":"10"},
		{"property":"VolumeAux", "group":"", "label":"Aux Mix Volume", description: "Sets the Aux Mix Channel volume", "step":"1", "type":"number", "min":"0", "max":"20", "default":"10"},
		{"property":"VolumeMic", "group":"", "label":"Mic Mix Volume", description: "Sets the Mic Mix Channel volume", "step":"1", "type":"number", "min":"0", "max":"20", "default":"10"},
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

const OLEDBrightnessDict =
{
	1 :  0x18,
	2 :  0x30,
	3 :  0x48,
	4 :  0x60,
	5 :  0x78,
	6 :  0x90,
	7 :  0xA8,
	8 :  0xC0,
	9 :  0xD8,
	10 : 0xF0
};

const OLEDTimeoutDict =
{
	"1"    :  0xea,
	"5"    :  0xe0,
	"10"   :  0xC0,
	"15"   :  0xA0,
	"30"   :  0x40,
	"60"   :  0x80,
	"Never":  0x00
};

const OLEDTimeoutDict2 =
{
	"1"    :  0x60,
	"5"    :  0x93,
	"10"   :  0x27,
	"15"   :  0xBB,
	"30"   :  0x77,
	"60"   :  0xEE,
	"Never":  0x00
};

const OLEDTimeoutDict3 =
{
	"1"    :  0x00,
	"5"    :  0x04,
	"10"   :  0x09,
	"15"   :  0x0D,
	"30"   :  0x1B,
	"60"   :  0x36,
	"Never":  0x00
};

const MicVolumeDict =
{
	0 : "80",
	10 : "0",
	20 : "80",
	30 : "0",
	40 : "80",
	50 : "0",
	60 : "80",
	70 : "0",
	80 : "0",
	90 : "0",
	100 :"0"
};

const MicVolumeDict2 =
{
	0  : "f5",
	10 : "f7",
	20 : "f8",
	30 : "fa",
	40 : "fb",
	50 : "fd",
	60 : "fe",
	70 : "0",
	80 : "1",
	90 : "2",
	100 :"3"
};

const SidetoneDict =
{
	"None" : 	"0",
	"Low"  :  "1",
	"Medium" :"2",
	"High" :  "3"
};

const EQDict = //flat = 0 Bass boost = 1 reference = 2 smiley = 3 custom = 4
{
	"Flat" : "0",
	"Bass Boost" : "1",
	"Reference" : "2",
	"Smiley" : "3",
	"Custom" : "4"
};

const ModeDict =
{
	"Standard" : "1",
	"Custom" : "2"
};

const VolumeMixDict =
{
	0  : "0x14",
	1 :  "0x13",
	2 :  "0x12",
	3 :  "0x11",
	4 :  "0x10",
	5 :  "0x0F",
	6 :  "0x0E",
	7 :  "0x0D",
	8 :  "0x0C",
	9 :  "0x0B",
	10 : "0x0A",
	11 : "0x09",
	12 : "0x08",
	13 : "0x07",
	14 : "0x06",
	15 : "0x05",
	16 : "0x04",
	17 : "0x03",
	18 : "0x02",
	19 : "0x01",
	20 : "0x00"
};

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	grabFirmware();
	device.write([0x00, 0x2c, 0x01, 0x00], 4);
	grabSettings();
	grabUnknown();
	grabScreenSettings();
	device.write([0x00, 0x85, 0x18, 0x00], 3);
	setCustomEQ();
}

export function Render() {
	sendColors();
}

export function Shutdown() {
	device.write([0x00, 0x2c, 0x00, 0x00], 4);
}

export function onOLEDTimeoutChanged() {
	setOLEDTimeout();
}

export function onOLEDBrightnessChanged() {
	setOLEDBrightness();
}

export function onSidetoneChanged() {
	setSidetone();
}

export function onMicVolumeChanged() {
	setVolume();
}

export function onSurroundChanged() {
	setSurround();
}

export function onEQChanged() {
	setEQ();
}

export function onGainChanged() {
	setGain();
}

export function onModeChanged() {
	setMode();
}

export function onVolumeGameChanged() {
	setMix();
}

export function onVolumeChatChanged() {
	setMix();
}

export function onVolumeAuxChanged() {
	setMix();
}

export function onVolumeMicChanged() {
	setMix();
}

function grabFirmware() {
	let packet = [];
	packet[0]   = 0x00;
	packet[1]   = 0x10;
	device.write(packet, 4);

	packet=device.read(packet, 64);

	const DSPByte1 = packet[2];
	const DSPByte2 = packet[6];
	const DSPByte3 = packet[10];
	const DSPByte4 = packet[14];
	device.log("DSP Firmware Version: " + DSPByte1 + "." + DSPByte2 + "." + DSPByte3 + "." + DSPByte4);

	const MCUByte1 = packet[18];
	const MCUByte2 = packet[22];
	const MCUByte3 = packet[26];

	device.log("MCU Firmware Version: " + MCUByte1 + "." + MCUByte2 + "." + MCUByte3);

	const HeadsetByte1 = packet[35];
	const HeadsetByte2 = packet[36];

	device.log("Headset Firmware Version: " + HeadsetByte1 + "." + HeadsetByte2);

}

function grabSettings()//Settings I think
{
	let packet = [];
	packet[0]   = 0x00;
	packet[1]   = 0x20;
	device.write(packet, 4);

	packet=device.read(packet, 64);

	const GainSet = packet[5];
	const DTSSet = packet[7];
	const EqualizerSet = packet[9];
	const MicSetByte1 = packet[51];
	const MicSetByte2 = packet[52];
	const SidetoneSet = packet[53];
	const LineoutSet = packet[57];

}

function grabUnknown() {
	let packet = [];
	packet[0]   = 0x00;
	packet[1]   = 0xA0;
	device.write(packet, 4);

	packet=device.read(packet, 64);
}

function grabScreenSettings()//These functions are going on the backburner until the backend can actually do something with them.
{
	let packet = [];
	packet[0]   = 0x00;
	packet[1]   = 0x80;
	device.write(packet, 4);

	packet=device.read(packet, 64);

	const OLEDBrightnessSet = packet[6];
	const OLEDTimeoutSetByte1 = packet[2];
	const OLEDTimeoutSetByte2 = packet[3];
	const OLEDTimeoutSetByte3 = packet[4];
}

function setOLEDBrightness() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x85;
	packet[2]   = OLEDBrightnessDict[OLEDBrightness];

	device.pause(100);
	device.write(packet, 4);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setOLEDTimeout() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x83;
	packet[2]   = OLEDTimeoutDict[OLEDTimeout];
	packet[3] 	= OLEDTimeoutDict2[OLEDTimeout];
	packet[4]   = OLEDTimeoutDict3[OLEDTimeout];

	device.pause(100);
	device.write(packet, 6);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setSidetone() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x39;
	packet[2]   = SidetoneDict[Sidetone];

	device.pause(100);
	device.write(packet, 4);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setVolume() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x37;
	packet[4] 	= MicVolumeDict[MicVolume];
	packet[5]   = MicVolumeDict2[MicVolume];

	//device.pause(100);
	device.write(packet, 7);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setSurround() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x2a;
	packet[2] 	= Surround;

	device.pause(100);
	device.write(packet, 4);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setEQ() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x2e;
	packet[2] 	= EQDict[EQ];

	device.pause(100);
	device.write(packet, 4);
	device.write([0x00, 0xa3, 0x00], 3);
}

//-10 is 00 fb, -9.5 is 40 fb, -9 is 80 fb, -8.5 = C0 FB, -8 is 00 fc, -7.5 is 40 fc, - 7 is 80 fc, - 6.5 is C0 fc, -6 is 00 fd, -5.5 is 40 fd, -5 is 80 fd, -4.5 is 00 00 c0 fd, -4 is 00 00 00 fe, -3.5 is 00 00 40 fe, -3 is 00 00 80 fe, - 2.5 is 00 00 c0 fe, -2 is ff, -1.5 is 40 ff, -1 is 80 ff, -0.5 is  = c0 ff, 0 is 00 00, 0.5 is 00 40, 1 is 00 80, 1.5 is C0 00, 2 is 00 01, 2.5 is 40 01, 3 is 80 01, 3.5 is c0 01, 4 is 00 02, 4.5 is 40 02, 5 is 80 02, 5.5 is c0 02, 6 is 00 03, 6.5 is 40 03, 7 is 80 03, 7.5 is c0 03, 8 is 00 04, 8.5 is 40 04, 9 is 80 04, 9.5 is c0 04, 10 is 00 05.

//Lovely Giant Dict or math for that needs done.

const band1 = 0x05;
const band2 = 0x05;
const band3 = 0x05; //fb is -10 05 is 10
const band4 = 0x05;
const band5 = 0x05;
const band6 = 0x05;
const band7 = 0x05;
const band8 = 0x05;
const band9 = 0x05;
const band10 = 0x05;

function setCustomEQ() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x33;
	packet[5] 	= band1;
	packet[9] 	= band2;
	packet[13] 	= band3;
	packet[17] 	= band4;
	packet[21] 	= band5;
	packet[25] 	= band6;
	packet[29] 	= band7;
	packet[33] 	= band8;
	packet[37] 	= band9;
	packet[41] 	= band10;

	device.pause(100);
	device.write(packet, 64);
	device.write([0x00, 0xa3, 0x00], 3);

}

function setGain() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x27;
	packet[2] 	= (Gain ? 0x02 : 0x01);

	device.pause(100);
	device.write(packet, 4);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setMode() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x43;
	packet[2] 	= ModeDict[Mode];

	device.pause(100);
	device.write(packet, 4);
	device.write([0x00, 0xa3, 0x00], 3);
}

function setMix() {
	const packet = [];

	packet[0]   = 0x00;
	packet[1]   = 0x47;
	packet[2] 	= VolumeMixDict[VolumeGame];
	packet[3] 	= VolumeMixDict[VolumeChat];
	packet[4] 	= VolumeMixDict[VolumeAux];
	packet[5] 	= VolumeMixDict[VolumeMic];

	device.pause(100);
	device.write(packet, 7);
	device.write([0x00, 0xa3, 0x00], 3);
}

function sendColors(shutdown = false) {
	for (let index = 0;index < 4; index++) {
		const packet = [];

		packet[0]   = 0x00;
		packet[1]   = 0xaa;
		packet[2]   = index;//Zone!

		const iPxX = vLedPositions[index][0];
		const iPxY = vLedPositions[index][1];
		let color;

		if(shutdown){
			color = hexToRgb(shutdownColor);
		}else if (LightingMode == "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		packet[3]   = color[0];
		packet[4]   = color[1];
		packet[5]   = color[2];

		packet[6]   = 0xff;
		packet[7]   = 0x32;
		packet[8] = 0xc8;
		packet[9] = 0xc8;
		packet[10] = 0x00;

		packet[11] = index;//Zone!
		packet[12] = 0x01;

		device.write(packet, 14);
		device.pause(20);
	}

	device.write([0x00, 0xa5, 0x08, 0x0a, 0x00], 5);
	device.write([0x00, 0xa5, 0x03, 0x0a, 0x00], 5);
	device.write([0x00, 0xa5, 0x04, 0x0a, 0x00], 5);
	device.write([0x00, 0xa3, 0x00], 3);
	device.pause(150);
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
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/audio/arctis-pro.png";
}