export function Name() { return "YICO 16"; }
export function VendorId() { return 0x2486; }
export function ProductId() { return [0x1616]; }
export function Publisher() { return "YICO"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){ return "lightingcontroller"; }
export function DefaultComponentBrand() { return "Brand"; }
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === -1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/yico-16.png"; }
export function SubdeviceController() { return true; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
seek:readonly
Turbo:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"seek", group:"lighting", label:"Breathing color localization", description:"The interface breathing color without added devices is convenient for finding devices", type:"boolean", default:"true"},
		{property:"Turbo", group:"lighting", label:"High FPS mode", description:"Improve FPS refresh rate but consume more system resources", type:"boolean", default:"true"},
	];
}
// Device var
const ChannelLedNum =  256;
const MaxLedsInPacket = 0x0154;
const MaxPacket = 0x0100;
const MaxOneLeds = 0x013C;
const MaxLeds = 256;
const MChannel = 16;
const ProductNames = {
	0x1616: "YICO 16 ELITE",
};

// Channels var
const ChannelALed = 256;
const ChannelBLed = 256;
const DeviceMaxLedLimit = 4096;
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
	const ArrayData = [];
	const RGBData = [];
	let LedCount = 0;

	for(let Channel = 0; Channel < MChannel; Channel++) {
		let ChannelData = [];
		const componentChannel = device.channel(ChannelArray[Channel][0]);
		let ChannelLedCount = componentChannel.ledCount > MaxLeds ? MaxLeds : componentChannel.ledCount;

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

		LedCount += ChannelLedCount;

		const QLedCount = (ChannelLedCount & 0xFFFF) >> 8;
		const PLedCount = ChannelLedCount & 0xFF;
		ArrayData.push(QLedCount, PLedCount);
		RGBData.push(...ChannelData.slice(0, ChannelLedCount*3));
	}

   	if (MChannel<36) {ArrayData[71] = 0;}

   	ArrayData.push(...RGBData);

   	const RGBLedCount = ArrayData.length;
   	const NumPackets = Math.ceil(RGBLedCount / 1020) + 99;
	let HigCount = LedCount/MaxPacket >= 1 ? 1 : 0;
	let LowCount = LedCount >= MaxOneLeds ? 60 : LedCount%MaxPacket;
	LedCount = LedCount <= MaxOneLeds ? 0 : LedCount-MaxOneLeds;

	for(let CurrPacket = 100; CurrPacket <= NumPackets; CurrPacket++) {
		let packet = [0x00, CurrPacket, NumPackets, HigCount, LowCount];
		packet = packet.concat(ArrayData.splice(0, 1020));
		device.write(packet, 1025);

		if(LedCount){
			HigCount = LedCount / MaxPacket >= 1 ? 1 : 0;
			LowCount = LedCount >= MaxLedsInPacket ? 84 : LedCount%MaxPacket;
			LedCount = LedCount <= MaxLedsInPacket ? 0 : LedCount-MaxLedsInPacket;
		}
	}
}

export function onTurboChanged(){
	if(Turbo){
		device.setFrameRateTarget(60);
	}else{
		device.setFrameRateTarget(30);
	}
}
