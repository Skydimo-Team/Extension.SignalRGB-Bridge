export function Name() { return "YICO"; }
export function VendorId() { return 0x1368; }
export function ProductId() { return [0x6077, 0x6078, 0x6079]; }
export function Publisher() { return "YICO"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "lightingcontroller";}
export function DefaultComponentBrand() { return "CompGen"; }
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === 2 || endpoint.interface === -1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-elite.png"; }
export function SubdeviceController() { return true; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
seek:readonly
Turbo:readonly
ColorCompression_enable:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"seek", group:"lighting", label:"Breathing color localization", description:"The interface breathing color without added devices is convenient for finding devices", type:"boolean", default:"true"},
		{property:"Turbo", group:"lighting", label:"High FPS mode", description:"Improve FPS refresh rate but consume more system resources", type:"boolean", default:"true"},
		{property:"ColorCompression_enable", group:"lighting", label:"ColorCompression", description:"Enable color compression and discard low brightness color values", type:"boolean", default:"true"},
	];
}

// Device var
const MaxLedsInPacket = 21;
let ChannelMaxLed =  256;
const d8 = 24697;
const MChannel = 8;
const ProductNames = {
	0x6077: "YICO 8 ELITE",
	0x6078: "YICO 08 ELITE",
	0x6079: "YICO 08 ELITE",
};

// Channels var
const ChannelALed = 256;
const ChannelBLed = 240;
const DeviceMaxLedLimit = 1024;
const ChannelArray =
[
	["Channel 1", ChannelALed],
	["Channel 2", ChannelALed],
	["Channel 3", ChannelALed],
	["Channel 4", ChannelALed],
	["Channel 5", ChannelBLed],
	["Channel 6", ChannelBLed],
	["Channel 7", ChannelBLed],
	["Channel 8", ChannelBLed],
	["Channel 9", ChannelBLed],
	["Channel 10", ChannelBLed],
	["Channel 11", ChannelBLed],
	["Channel 12", ChannelBLed],
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < MChannel; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

function compareFirmwareVersion() {
	const firmwarePacket = device.read([0x00],  6 );
	const FirmwareVersion = firmwarePacket[2] + "." + firmwarePacket[3] + "." + firmwarePacket[4]+ "." + firmwarePacket[5];
	device.log("YICO Firmware version: " + FirmwareVersion);
}

function requestFirmwareVersion() {
	const packet = [ 0x00, 0x02 ];
	device.write(packet, 65);
	compareFirmwareVersion();
}

export function Initialize() {
	device.setName(ProductNames[device.productId()]);

	if(device.productId() === d8) {ChannelMaxLed = 132;}

	SetupChannels();
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

function SendChannel(overrideColor) {
	const RGBData = [];
	const ArrayData = [];
	const multiplier = ColorCompression_enable ? 2 : 1;
	const compressedRGB = [];

	for(let Channel = 0; Channel < MChannel; Channel++) {
		let ChannelData = [];
		const componentChannel = device.channel(ChannelArray[Channel][0]);
		let ChannelLedCount = componentChannel.ledCount > ChannelMaxLed ? ChannelMaxLed : componentChannel.ledCount;

		if(overrideColor) {
			ChannelData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
		} else if(LightingMode === "Forced") {
			ChannelData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
		} else if(componentChannel.shouldPulseColors()) {
			if(seek){
				ChannelLedCount = 120;
			}else{
				ChannelLedCount = 5;
			}
			const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
			ChannelData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
		} else {
			ChannelData = componentChannel.getColors("Inline");
		}

		const QLedCount = (ChannelLedCount & 0xFFFF) >> 8;
		const PLedCount = ChannelLedCount & 0xFF;
		ArrayData.push(QLedCount, PLedCount);
		RGBData.push(...ChannelData.slice(0, ChannelLedCount*3));
	}

	const RGBLedCount = RGBData.length / 3 ;

	if(ColorCompression_enable) {
		for(let runCount = 0; runCount < RGBLedCount / multiplier; runCount++) {
			compressedRGB[(runCount*3)] = (((RGBData[(runCount*6)] & 0xFF) >> 4) | ((((RGBData[(runCount*6)+1] & 0xFF) >> 4) & 0xFF) << 4));
			compressedRGB[(runCount*3)+1] = (((RGBData[(runCount*6)+2] & 0xFF) >> 4) | ((((RGBData[(runCount*6)+3] & 0xFF) >> 4) & 0xFF) << 4));
			compressedRGB[(runCount*3)+2] = (((RGBData[(runCount*6)+4] & 0xFF) >> 4) | ((((RGBData[(runCount*6)+5] & 0xFF) >> 4) & 0xFF) << 4));
		}
	}

	const NumPackets = Math.ceil(RGBLedCount / MaxLedsInPacket / multiplier) + 100;
	const compressionenable = ColorCompression_enable == true ? 0xAA : 0xBB;
	let Arraypacket = [0x00, 0x60, compressionenable];
	Arraypacket = Arraypacket.concat(ArrayData);
	device.write(Arraypacket, 65);

	for(let CurrPacket = 100; CurrPacket < NumPackets; CurrPacket++) {
		CurrPacket = CurrPacket == (NumPackets-1) ? CurrPacket+100 : CurrPacket;

		let packet = [0x00, CurrPacket];
		packet = packet.concat(ColorCompression_enable ? compressedRGB.splice(0, 63) : RGBData.splice(0, 63));
		device.write(packet, 65);
	}
}

export function onTurboChanged(){
	if(Turbo){
		device.setFrameRateTarget(60);
	}else{
		device.setFrameRateTarget(30);
	}
}
