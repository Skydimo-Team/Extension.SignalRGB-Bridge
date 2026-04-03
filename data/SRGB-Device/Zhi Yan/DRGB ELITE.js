export function Name() { return "DRGB Controller"; }
export function VendorId() { return 0x2023; }
export function ProductId() { return Object.keys(DRGBdeviceLibrary.PIDLibrary); }
export function Publisher() { return "DRGB"; }
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
const MaxLedsInPacket = 21;
const array_head = 0x46;
const buf_head = 0x47;
const buf_end = 92;

// Channels var
const ChannelALed = 256;
const ChannelBLed = 60;
const DeviceMaxLedLimit = 1024;
const ChannelArray =
[
	["Channel 1", ChannelALed],
	["Channel 2", ChannelALed],
	["Channel 3", ChannelALed],
	["Channel 4", ChannelALed],
	["Channel 5", ChannelALed],
	["Channel 6", ChannelALed],
	["Channel 7", ChannelALed],
	["Channel 8", ChannelALed],
	["Channel 9", ChannelBLed],
	["Channel 10", ChannelBLed],
	["Channel 11", ChannelBLed],
	["Channel 12", ChannelBLed],
];

export class DRGB_controller_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "DRGB Controller",
			MaxChLeds: 132,
			MAXCHs: 8,
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

		for(let i = 0; i < this.getDeviceMAXCHs(); i++) {
			device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
		}
	}

	SendChannel(overrideColor) {
		const RGBData = [];
		const ArrayData = [];
		const multiplier = ColorCompression_enable ? 2 : 1;
		const compressedRGB = [];

		for(let Channel = 0; Channel < this.getDeviceMAXCHs(); Channel++) {
			let ChannelData = [];
			const componentChannel = device.channel(ChannelArray[Channel][0]);
			let ChannelLedCount = componentChannel.ledCount > DRGB.getDeviceMaxChLeds() ? DRGB.getDeviceMaxChLeds() : componentChannel.ledCount;

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
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x1408: "DeepRGB E8F",
			0x1407: "DeepRGB E8",
		};

		this.LEDLibrary	=	{
			"DeepRGB E8F":
			{
				SupportedChannel:[8, 132],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-elite.png"
			},
			"DeepRGB E8":
			{
				SupportedChannel:[8, 132],
				image: "https://assets.signalrgb.com/devices/brands/zhiyan/controllers/drgb-led.png"
			},
		};
	}
}

const DRGBdeviceLibrary = new deviceLibrary();
const DRGB = new DRGB_controller_Protocol();

export function onTurboChanged(){
	if(Turbo){
		device.setFrameRateTarget(60);
	}else{
		device.setFrameRateTarget(30);
	}
}
