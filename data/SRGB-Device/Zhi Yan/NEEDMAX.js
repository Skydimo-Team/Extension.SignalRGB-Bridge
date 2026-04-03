export function Name() { return "NEEDMAX ELITE"; }
export function VendorId() { return 0x2023; }
export function ProductId() { return [0x1410]; }
export function Publisher() { return "NEEDMAX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "lightingcontroller";}
export function DefaultComponentBrand() { return "Brand"; }
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === 2 || endpoint.interface === -1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/needmax-elite.png"; }
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
const ChannelMaxLed =  132;
const d10 = 5136;
let MChannel = 10;
const version = 0;
const array_head = 0x46;
const buf_head = 0x47;
const buf_end = 92;

// Channels var
const ChannelALed = 256;
const ChannelBLed = 256;
const DeviceMaxLedLimit = 1320;
const ChannelArray =
[
	["Channel 01", ChannelALed],
	["Channel 02", ChannelALed],
	["Channel 03", ChannelALed],
	["Channel 04", ChannelALed],
	["Channel 05", ChannelALed],
	["Channel 06", ChannelALed],
	["Channel 07", ChannelALed],
	["Channel 08", ChannelALed],
	["Channel 09", ChannelBLed],
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
	device.log("NEEDMAX Firmware version: " + FirmwareVersion);
}

function requestFirmwareVersion() {
	const packet = [ 0x00, 0x02 ];
	device.write(packet, 65);
	compareFirmwareVersion();
}

const ProductNames = {
	0x1410: "NEEDMAX 10 ELITE",
};

export function Initialize() {
	device.setName(ProductNames[device.productId()]);

	if(device.productId() === d10) {MChannel = 10;}

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
				ChannelLedCount = ChannelALed/2;
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

export function onTurboChanged(){
	if(Turbo){
		device.setFrameRateTarget(60);
	}else{
		device.setFrameRateTarget(30);
	}
}
