export function Name() { return "DRGB Controller"; }
export function VendorId() { return 0x2486; }
export function ProductId() { return Object.keys(DRGBdeviceLibrary.PIDLibrary); }
export function Publisher() { return "DRGB"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "lightingcontroller";}
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === -1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"; }
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

export function Initialize() {
	DRGB.InitializeDRGB();
	DRGB.SetupChannels();
}

export function Render() {
	DRGB.SendChannel(0);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	DRGB.SendChannel(color);
}

// Device var
const ChannelLedNum =  256;
const MaxLedsInPacket = 0x0154;
const MaxPacket = 0x0100;
const MaxOneLeds = 0x013C;
const ALeds = [0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20];
const AOLeds = [0, 21, 0, 21, 0, 21, 0, 21, 0, 21, 0, 21];
const GDLeds = [0, 27, 0, 27, 0, 27, 0, 27];
const GTLeds = [0, 27, 0, 27, 0, 27, 0, 27, 0, 27, 0, 27];
const FZLeds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const ALed = 120;
const AOLed = 126;
const GDLed = 108;
const GTLed = 162;

// Channels var
const ChannelALed = 256;
const ChannelBLed = 256;
const ChannelCLed = 60;
const ChannelDLed = 60;
const ChannelELed = 60;
const DeviceMaxLedLimit = 8192;
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

	["Channel C1 LIANLI ATX", 240],
	["Channel C2", ChannelCLed],
	["Channel C3", ChannelCLed],
	["Channel C4", ChannelCLed],
	["Channel C5", ChannelCLed],
	["Channel C6", ChannelCLed],


	["Channel D1 LIANLI GPU*3", 324],
	["Channel D2", ChannelDLed],
	["Channel D3", ChannelDLed],
	["Channel D4", ChannelDLed],
	["Channel D5", ChannelDLed],
	["Channel D6", ChannelDLed],

	["Channel E1 LIANLI GPU*2", 216],
	["Channel E2", ChannelELed],
	["Channel E3", ChannelELed],
	["Channel E4", ChannelELed],
	["Channel E5", ChannelELed],
	["Channel E6", ChannelELed],
	["Channel E7", ChannelELed],
	["Channel E8", ChannelELed],

];

export class DRGB_controller_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "DRGB Controller",
			MaxChLeds: 256,
			MAXCHs: 16,
		};
	}

	getDeviceProperties(deviceName) { return DRGBdeviceLibrary.LEDLibrary[deviceName];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getLedsPerPacket() {return this.Config.ledsPerPacket; }
	setLedsPerPacket(ledsperpacket) { this.Config.ledsPerPacket = ledsperpacket; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	getDeviceMAXCHs() { return this.Config.MAXCHs; }
	setDeviceMAXCHs(MAXCHs) { this.Config.MAXCHs = MAXCHs; }

	getDeviceMaxChLeds() { return this.Config.MaxChLeds; }
	setDeviceMaxChLeds(MaxChLeds) { this.Config.MaxChLeds = MaxChLeds; }

	getFirmwareVersion() {
		const firmwarePacket = device.read([0x00],  6 );
		const FirmwareVersion = firmwarePacket[2] + "." + firmwarePacket[3] + "." + firmwarePacket[4]+ "." + firmwarePacket[5];

		return FirmwareVersion;
	}
	setFirmwareVersion() {
		const packet = [ 0x00, 0x02 ];
		device.write(packet, 65);
	}

	InitializeDRGB() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(DRGBdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceImage(DeviceProperties.image);
		this.setDeviceMAXCHs(DeviceProperties.SupportedChannel[0]);
		this.setDeviceMaxChLeds(DeviceProperties.SupportedChannel[1]);
		console.log("Initializing device...");

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName(this.getDeviceName());
		device.setImageFromUrl(this.getDeviceImage());

		this.setFirmwareVersion();
		device.log(`DRGB Firmware version: ` + this.getFirmwareVersion());

		if(Turbo) {device.setFrameRateTarget(60);}
	}

	SetupChannels() {
		device.SetLedLimit(DeviceMaxLedLimit);

		if(this.getDeviceMAXCHs() === 29){
			for(let i = 0; i < 16; i++) {
				device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
			}

			device.addChannel(ChannelArray[16][0], ChannelArray[16][1]);
			device.addChannel(ChannelArray[22][0], ChannelArray[22][1]);
			device.addChannel(ChannelArray[28][0], ChannelArray[28][1]);
		}else{
			for(let i = 0; i < this.getDeviceMAXCHs(); i++) {
				device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
			}
		}
	}

	SendChannel(overrideColor) {
		const ArrayData = [];
		const RGBData = [];
		let LedCount = 0;

		for(let Channel = 0; Channel < DRGB.getDeviceMAXCHs(); Channel++) {
			let ChannelData = [];
			const componentChannel = device.channel(ChannelArray[Channel][0]);
			let ChannelLedCount = componentChannel.ledCount > DRGB.getDeviceMaxChLeds() ? DRGB.getDeviceMaxChLeds() : componentChannel.ledCount;

			if(overrideColor) {
				ChannelData = device.createColorArray(shutdownColor, ChannelLedCount, "Inline");
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

			if(Channel == 16 || Channel == 22){
				const lmap = this.sch_Ledmap(ChannelLedCount);
				ArrayData.push(...lmap);

				if(lmap.length == 2){
					if (DRGB.getDeviceMAXCHs() == 29){
						ArrayData.push(...FZLeds);
						Channel += 5;
					}
				}else {Channel += 5;}
			}else if(Channel == 28 && ChannelLedCount == GDLed){
				ArrayData.push(...GDLeds);
				Channel += 3;
			}else{
				const QLedCount = (ChannelLedCount & 0xFFFF) >> 8;
				const PLedCount = ChannelLedCount & 0xFF;
				ArrayData.push(QLedCount, PLedCount);
			}

			RGBData.push(...ChannelData.slice(0, ChannelLedCount*3));

	   	}

	   	if (DRGB.getDeviceMAXCHs()<36) {ArrayData[71] = 0;}

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

	sch_Ledmap(led) {
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
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x3636: "DRGB SIG V4F",
			0x3628: "DRGB CORE V4F",
			0x3616: "DRGB ULTRA V4F",
			0x3608: "DRGB LED V4",
			0x3232: "DRGB SIG V5F",
			0x3229: "DRGB CORE V5F",
			0x3228: "DRGB CORE V5",
			0x3217: "DRGB ULTRA V5F",
			0x3215: "DRGB ULTRA V5",
			0x3208: "DRGB LED V5",

		};

		this.LEDLibrary	=	{
			"DRGB SIG V4F":
			{
				SupportedChannel:[36, 1024],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB CORE V4F":
			{
				SupportedChannel:[29, 1024],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB ULTRA V4F":
			{
				SupportedChannel:[16, 1024],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB LED V4":
			{
				SupportedChannel:[8, 1024],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-led.png"
			},
			"DRGB SIG V5F":
			{
				SupportedChannel:[32, 256],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB CORE V5F":
			{
				SupportedChannel:[29, 256],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB CORE V5":
			{
				SupportedChannel:[29, 256],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB ULTRA V5F":
			{
				SupportedChannel:[16, 256],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB ULTRA V5":
			{
				SupportedChannel:[16, 256],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-v4.png"
			},
			"DRGB LED V5":
			{
				SupportedChannel:[8, 512],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-led.png"
			},

		};
	}
}

const DRGBdeviceLibrary = new deviceLibrary();
const DRGB = new DRGB_controller_Protocol();

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
