export function Name() { return "JPU ELITE"; }
export function VendorId() { return 0x2023; }
export function ProductId() { return [0x1412]; }
export function Publisher() { return "JPU CABLE"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "lightingcontroller";}
export function DefaultComponentBrand() { return "Brand"; }
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === 2 || endpoint.interface === -1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/jpu-elite.png"; }
export function SubdeviceController() { return true; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
Turbo:readonly
ColorCompression_enable:readonly
Strimer1:readonly
Strimer2:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"Turbo", group:"lighting", label:"High FPS mode", description:"Improve FPS refresh rate but consume more system resources", type:"boolean", default:"true"},
		{property:"ColorCompression_enable", group:"lighting", label:"ColorCompression", description:"Enable color compression and discard low brightness color values", type:"boolean", default:"true"},
		{property:"Strimer1", group:"", label:"Strimer 1", description: "Select device", type:"combobox", values:["Strimer 120LED", "Strimer 162LED", "no"], default:"Strimer 162LED"},
		{property:"Strimer2", group:"", label:"Strimer 2", description: "Select device", type:"combobox", values:["Strimer 120LED", "Strimer 108LED", "Strimer 162LED", "no"], default:"Strimer 162LED"},
	];
}

// Device var
const MaxLedsInPacket = 21;
const ALeds = [0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20];
const AOLeds = [0, 21, 0, 21, 0, 21, 0, 21, 0, 21, 0, 21];
const GDLeds = [0, 27, 0, 27, 0, 27, 0, 27, 0, 0, 0, 0];
const GTLeds = [0, 27, 0, 27, 0, 27, 0, 27, 0, 27, 0, 27];
const FZLeds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const ALed = 120;
const AOLed = 126;
const GDLed = 108;
const GTLed = 162;
const array_head = 0x46;
const buf_head = 0x47;
const buf_end = 92;

const ProductNames = {
	0x1412: "JPU ELITE",
};

function compareFirmwareVersion() {
	const firmwarePacket = device.read([0x00],  6 );
	const FirmwareVersion = firmwarePacket[2] + "." + firmwarePacket[3] + "." + firmwarePacket[4]+ "." + firmwarePacket[5];
	device.log("JPU Firmware version: " + FirmwareVersion);
}

function requestFirmwareVersion() {
	const packet = [ 0x00, 0x02 ];
	device.write(packet, 65);
	compareFirmwareVersion();
}

export function Initialize() {
	device.setName(ProductNames[device.productId()]);

	addChannels();
	requestFirmwareVersion();

	if(Turbo) {device.setFrameRateTarget(60);}
}

export function Render() {
	SendChannel();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	SendChannel(color);
}

export function onStrimer1Changed() {
	addChannels();
}

export function onStrimer2Changed() {
	addChannels();
}

const vDual8PinLedNames =
[
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
	"LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20",
	"LED 21", "LED 22", "LED 23", "LED 24", "LED 25", "LED 26", "LED 27", "LED 28", "LED 29", "LED 30",

	"LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37", "LED 38", "LED 39", "LED 40",
	"LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50",
	"LED 51", "LED 52", "LED 53", "LED 54", "LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60",

	"LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68", "LED 69", "LED 70",
	"LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80",
	"LED 81", "LED 82", "LED 83", "LED 84", "LED 85", "LED 86", "LED 87", "LED 88", "LED 89", "LED 90",

	"LED 91", "LED 92", "LED 93", "LED 94", "LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100",
	"LED 101", "LED 102", "LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108"
];

const vDual8PinLedPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
	[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
	[20, 0], [21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0],

	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
	[10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1],
	[20, 1], [21, 1], [22, 1], [23, 1], [24, 1], [25, 1], [26, 1],

	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
	[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],
	[20, 2], [21, 2], [22, 2], [23, 2], [24, 2], [25, 2], [26, 2],

	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
	[10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],
	[20, 3], [21, 3], [22, 3], [23, 3], [24, 3], [25, 3], [26, 3]
];

const vTriple8PinLedNames =
[
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
	"LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20",
	"LED 21", "LED 22", "LED 23", "LED 24", "LED 25", "LED 26", "LED 27",

	"LED 28", "LED 29", "LED 30", "LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37", "LED 38", "LED 39", "LED 40",
	"LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50",
	"LED 51", "LED 52", "LED 53", "LED 54",

	"LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60", "LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68", "LED 69", "LED 70",
	"LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80",
	"LED 81",

	"LED 82", "LED 83", "LED 84", "LED 85", "LED 86", "LED 87", "LED 88", "LED 89", "LED 90", "LED 91", "LED 92", "LED 93", "LED 94",
	"LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100", "LED 101", "LED 102", "LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108",

	"LED 109", "LED 110", "LED 111", "LED 112", "LED 113", "LED 114", "LED 115", "LED 116", "LED 117", "LED 118", "LED 119", "LED 120", "LED 121", "LED 122",
	"LED 123", "LED 124", "LED 125", "LED 126", "LED 127", "LED 128", "LED 129", "LED 130", "LED 131", "LED 132", "LED 133", "LED 134", "LED 135",

	"LED 136", "LED 137", "LED 138", "LED 139", "LED 140", "LED 141", "LED 142", "LED 143", "LED 144", "LED 145", "LED 146", "LED 147", "LED 148", "LED 149", "LED 150", "LED 151",
	"LED 152", "LED 153", "LED 154", "LED 155", "LED 156", "LED 157", "LED 158", "LED 159", "LED 160", "LED 161", "LED 162"

];

const vTriple8PinLedPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
	[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
	[20, 0], [21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0],

	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
	[10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1],
	[20, 1], [21, 1], [22, 1], [23, 1], [24, 1], [25, 1], [26, 1],

	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
	[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],
	[20, 2], [21, 2], [22, 2], [23, 2], [24, 2], [25, 2], [26, 2],

	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
	[10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],
	[20, 3], [21, 3], [22, 3], [23, 3], [24, 3], [25, 3], [26, 3],

	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
	[10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 4], [19, 4],
	[20, 4], [21, 4], [22, 4], [23, 4], [24, 4], [25, 4], [26, 4],

	[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
	[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5],
	[20, 5], [21, 5], [22, 5], [23, 5], [24, 5], [25, 5], [26, 5]
];

const v24PinLedNames =
[
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
	"LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20",
	"LED 21", "LED 22", "LED 23", "LED 24", "LED 25", "LED 26", "LED 27",

	"LED 28", "LED 29", "LED 30", "LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37", "LED 38", "LED 39", "LED 40",
	"LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50",
	"LED 51", "LED 52", "LED 53", "LED 54",

	"LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60", "LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68", "LED 69", "LED 70",
	"LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80",
	"LED 81",

	"LED 82", "LED 83", "LED 84", "LED 85", "LED 86", "LED 87", "LED 88", "LED 89", "LED 90", "LED 91", "LED 92", "LED 93", "LED 94",
	"LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100", "LED 101", "LED 102", "LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108",

	"LED 109", "LED 110", "LED 111", "LED 112", "LED 113", "LED 114", "LED 115", "LED 116", "LED 117", "LED 118", "LED 119", "LED 120"

];

const v24PinLedPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
	[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],

	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
	[10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1],

	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
	[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],

	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
	[10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],

	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
	[10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 4], [19, 4],

	[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
	[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5]
];

function addChannels() {
	device.removeSubdevice("Strimer1_120LED");
	device.removeSubdevice("Strimer1_162LED");
	device.removeSubdevice("Strimer2_120LED");
	device.removeSubdevice("Strimer2_108LED");
	device.removeSubdevice("Strimer2_162LED");

	if(Strimer1 == "Strimer 120LED") {
		device.createSubdevice("Strimer1_120LED");
		device.setSubdeviceName("Strimer1_120LED", `Strimer1 120LED`);
		device.setSubdeviceSize("Strimer1_120LED", 20, 6);
		device.setSubdeviceLeds("Strimer1_120LED", v24PinLedNames, v24PinLedPositions);
		device.setSubdeviceImageUrl("Strimer1_120LED", "https://assets.signalrgb.com/devices/brands/lian-li/led-strips/strimmer-plus-v2.png");
	}else if(Strimer1 == "Strimer 162LED"){
		device.createSubdevice("Strimer1_162LED");
		device.setSubdeviceName("Strimer1_162LED", `Strimer1 162LED`);
		device.setSubdeviceSize("Strimer1_162LED", 27, 6);
		device.setSubdeviceLeds("Strimer1_162LED", vTriple8PinLedNames, vTriple8PinLedPositions);
		device.setSubdeviceImageUrl("Strimer1_162LED", "https://assets.signalrgb.com/devices/brands/lian-li/led-strips/strimmer-plus-v2.png");
	}

	if(Strimer2 == "Strimer 120LED") {
		device.createSubdevice("Strimer2_120LED");
		device.setSubdeviceName("Strimer2_120LED", `Strimer2 120LED`);
		device.setSubdeviceSize("Strimer2_120LED", 20, 6);
		device.setSubdeviceLeds("Strimer2_120LED", v24PinLedNames, v24PinLedPositions);
		device.setSubdeviceImageUrl("Strimer2_120LED", "https://assets.signalrgb.com/devices/brands/lian-li/led-strips/strimmer-plus-v2.png");
	}else if(Strimer2 == "Strimer 162LED"){
		device.createSubdevice("Strimer2_162LED");
		device.setSubdeviceName("Strimer2_162LED", `Strimer2 162LED`);
		device.setSubdeviceSize("Strimer2_162LED", 27, 6);
		device.setSubdeviceLeds("Strimer2_162LED", vTriple8PinLedNames, vTriple8PinLedPositions);
		device.setSubdeviceImageUrl("Strimer2_162LED", "https://assets.signalrgb.com/devices/brands/lian-li/led-strips/strimmer-plus-v2.png");
	}else if(Strimer2 == "Strimer 108LED"){
		device.createSubdevice("Strimer2_108LED");
		device.setSubdeviceName("Strimer2_108LED", `Strimer2 108LED`);
		device.setSubdeviceSize("Strimer2_108LED", 27, 4);
		device.setSubdeviceLeds("Strimer2_108LED", vDual8PinLedNames, vDual8PinLedPositions);
		device.setSubdeviceImageUrl("Strimer2_108LED", "https://assets.signalrgb.com/devices/brands/lian-li/led-strips/strimmer-plus-v2.png");
	}
}

function SendChannel(overrideColor) {
	const RGBData = [];
	const ArrayData = [];
	const multiplier = ColorCompression_enable ? 2 : 1;
	const compressedRGB = [];

	if(Strimer1 == "Strimer 120LED"){
		const ChannelData = getStrimer120Colors(1, overrideColor);
		ArrayData.push(...ALeds);
		RGBData.push(...ChannelData);
	}else if (Strimer1 == "Strimer 162LED") {
		const ChannelData = getStrimer162Colors(1, overrideColor);
		ArrayData.push(...GTLeds);
		RGBData.push(...ChannelData);
	}else{
		ArrayData.push(...FZLeds);
	}

	if(Strimer2 == "Strimer 120LED"){
		const ChannelData = getStrimer120Colors(2, overrideColor);
		ArrayData.push(...ALeds);
		RGBData.push(...ChannelData);
	}else if (Strimer2 == "Strimer 162LED") {
		const ChannelData = getStrimer162Colors(2, overrideColor);
		ArrayData.push(...GTLeds);
		RGBData.push(...ChannelData);
	}else if(Strimer2 == "Strimer 108LED"){
		const ChannelData = getStrimer108Colors(2, overrideColor);
		ArrayData.push(...GDLeds);
		RGBData.push(...ChannelData);
	}else{
		ArrayData.push(...FZLeds);
	}

	const RGBLedCount = RGBData.length / 3 ;

	if(ColorCompression_enable) {
		for(let runCount = 0; runCount < RGBLedCount / multiplier; runCount++) {
			compressedRGB[(runCount*3)] = (((RGBData[(runCount*6)] & 0xFF) >> 4) | ((((RGBData[(runCount*6)+1] & 0xFF) >> 4) & 0xFF) << 4));
			compressedRGB[(runCount*3)+1] = (((RGBData[(runCount*6)+2] & 0xFF) >> 4) | ((((RGBData[(runCount*6)+3] & 0xFF) >> 4) & 0xFF) << 4));
			compressedRGB[(runCount*3)+2] = (((RGBData[(runCount*6)+4] & 0xFF) >> 4) | ((((RGBData[(runCount*6)+5] & 0xFF) >> 4) & 0xFF) << 4));
		}
	}

	const NumPackets = Math.ceil(RGBLedCount / MaxLedsInPacket / multiplier) + buf_head;
	const compressionenable = ColorCompression_enable == true ? 0xAA : 0xBB;
	let Arraypacket = [0x00, array_head, compressionenable];
	Arraypacket = Arraypacket.concat(ArrayData);
	device.write(Arraypacket, 65);

	for(let CurrPacket = buf_head; CurrPacket < NumPackets; CurrPacket++) {
		CurrPacket = CurrPacket == (NumPackets-1) ? CurrPacket+buf_end : CurrPacket;

		let packet = [0x00, CurrPacket];
		packet = packet.concat(ColorCompression_enable ? compressedRGB.splice(0, 63) : RGBData.splice(0, 63));
		device.write(packet, 65);
	}
}

function sch_Ledmap(led) {
	const ledmap = [];

	if(led == GTLed){
		return GTLeds;
	}else if(led == ALed){
		return ALeds;
	}else if(led == AOLed){
		return AOLeds;
	}else if(led == GDLed){
		return GDLeds;
	}

	ledmap[0] = (led & 0xFFFF) >> 8;
	ledmap[1] = led & 0xFF;

	return ledmap;
}

function getStrimer120Colors(ch, overrideColor) {
	const RGBData = [];

	for(let iIdx = 0; iIdx < v24PinLedPositions.length; iIdx++) {
		const iPxX = v24PinLedPositions[iIdx][0];
		const iPxY = v24PinLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			if (ch == 1) {
				color = device.subdeviceColor("Strimer1_120LED", iPxX, iPxY);
			}else if (ch == 2) {
				color = device.subdeviceColor("Strimer2_120LED", iPxX, iPxY);
			}
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];;
		RGBData[iLedIdx+1] = color[1];
		RGBData[iLedIdx+2] = color[2];
	}

	return RGBData;
}

function getStrimer162Colors(ch, overrideColor) {
	const RGBData = [];

	for(let iIdx = 0; iIdx < vTriple8PinLedPositions.length; iIdx++) {
		const iPxX = vTriple8PinLedPositions[iIdx][0];
		const iPxY = vTriple8PinLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			if (ch == 1) {
				color = device.subdeviceColor("Strimer1_162LED", iPxX, iPxY);
			}else if (ch == 2) {
				color = device.subdeviceColor("Strimer2_162LED", iPxX, iPxY);
			}
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];;
		RGBData[iLedIdx+1] = color[1];
		RGBData[iLedIdx+2] = color[2];
	}

	return RGBData;
}

function getStrimer108Colors(ch, overrideColor) {
	const RGBData = [];

	for(let iIdx = 0; iIdx < vDual8PinLedPositions.length; iIdx++) {
		const iPxX = vDual8PinLedPositions[iIdx][0];
		const iPxY = vDual8PinLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			if (ch == 1) {
				color = device.subdeviceColor("Strimer1_108LED", iPxX, iPxY);
			}else if (ch == 2) {
				color = device.subdeviceColor("Strimer2_108LED", iPxX, iPxY);
			}
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];;
		RGBData[iLedIdx+1] = color[1];
		RGBData[iLedIdx+2] = color[2];
	}

	return RGBData;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function onTurboChanged(){
	if(Turbo){
		device.setFrameRateTarget(60);
	}else{
		device.setFrameRateTarget(30);
	}
}