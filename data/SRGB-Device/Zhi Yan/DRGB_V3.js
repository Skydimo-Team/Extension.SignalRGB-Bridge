export function Name() { return "DRGB V3"; }
export function VendorId() { return 0x2023; }
export function ProductId() { return [0x1226, 0x1221, 0x1209]; }
export function Publisher() { return "DRGB"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "lightingcontroller";}
export function DefaultComponentBrand() { return "CompGen"; }
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === 2 || endpoint.interface === -1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v3.png"; }
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
const ChannelLedNum =  80;
const ALeds = [0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20];
const AOLeds = [0, 21, 0, 21, 0, 21, 0, 21, 0, 21, 0, 21];
const GDLeds = [0, 27, 0, 27, 0, 27, 0, 27];
const GTLeds = [0, 27, 0, 27, 0, 27, 0, 27, 0, 27, 0, 27];
const ALed = 120;
const AOLed = 126;
const GDLed = 108;
const GTLed = 162;
const d30 = 4646;
const d8 = 4617;
let MChannel = 16;

const ProductNames = {
	0x1226: "DRGB CORE V3",
	0x1221: "DRGB ULTRA V3F",
	0x1209: "DRGB LED V3",
};

// Channels var
const ChannelALed = 120;
const ChannelBLed = 60;
const ChannelCLed = 60;
const DeviceMaxLedLimit = 1800;
const ChannelArray =
[
	["Channel A1", ChannelALed],
	["Channel A2", ChannelALed],
	["Channel A3", ChannelALed],
	["Channel A4", ChannelALed],
	["Channel A5", ChannelALed],
	["Channel A6", ChannelALed],
	["Channel A7", ChannelALed],
	["Channel A8", ChannelALed],

	["Channel B1", ChannelBLed],
	["Channel B2", ChannelBLed],
	["Channel B3", ChannelBLed],
	["Channel B4", ChannelBLed],
	["Channel B5", ChannelBLed],
	["Channel B6", ChannelBLed],
	["Channel B7", ChannelBLed],
	["Channel B8", ChannelBLed],

	["Channel C1", ChannelCLed],
	["Channel C2", ChannelCLed],
	["Channel C3 Strimer GPU*3", 324],
	["Channel C4", ChannelCLed],
	["Channel C5 Strimer GPU*2", 216],
	["Channel C6", ChannelCLed],
	["Channel C7", ChannelCLed],
	["Channel C8", ChannelCLed],

	["Strimer ATX 24Pin", 240],

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
	device.log("DRGB Firmware version: " + FirmwareVersion);
}

function requestFirmwareVersion() {
	const packet = [ 0x00, 0x02 ];
	device.write(packet, 65);
	compareFirmwareVersion();
}

export function Initialize() {
	device.setName(ProductNames[device.productId()]);

	if(device.productId() === d30) {MChannel = 25;} else if(device.productId() === d8) {MChannel = 8;}

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
		let ChannelLedCount = componentChannel.ledCount > 800 ? 800 : componentChannel.ledCount;

		if(overrideColor) {
			ChannelData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
		} else if(LightingMode === "Forced") {
			ChannelData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
		} else if(componentChannel.shouldPulseColors()) {
			if(seek){
				ChannelLedCount = ChannelLedNum/2;
			}else{
				ChannelLedCount = 5;
			}
			const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
			ChannelData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
		} else {
			ChannelData = componentChannel.getColors("Inline");
		}

		if(Channel == 18 || Channel == 24){
			const lmap = sch_Ledmap(ChannelLedCount);
			ArrayData.push(...lmap);

			if(lmap.length != 2){
				Channel += 5;
			}
		}else if(Channel == 20 && ChannelLedCount == GDLed){
			ArrayData.push(...GDLeds);
			Channel += 3;
		}else{
			const QLedCount = (ChannelLedCount & 0xFFFF) >> 8;
			const PLedCount = ChannelLedCount & 0xFF;
			ArrayData.push(QLedCount, PLedCount);
		}

		RGBData.push(...ChannelData);
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

function sch_Ledmap(led) {
	const ledmap = [];

	if(led == GTLed){
		return GTLeds;
	}else if(led == ALed){
		return ALeds;
	}else if(led == AOLed){
		return AOLeds;
	}

	ledmap[0] = (led & 0xFFFF) >> 8;
	ledmap[1] = led & 0xFF;

	return ledmap;

}

export function onTurboChanged(){
	if(Turbo){
		device.setFrameRateTarget(60);
	}else{
		device.setFrameRateTarget(30);
	}
}
