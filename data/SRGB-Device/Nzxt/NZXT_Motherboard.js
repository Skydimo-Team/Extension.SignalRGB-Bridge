export function Name() { return "NZXT Motherboard"; }
export function VendorId() { return 0x1E71; }
export function ProductId() { return Object.keys(NZXT.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "motherboard"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
RGBconfig:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"RGBconfig", "group":"lighting", "label":"12V RGB Channel Configuration", description: "Sets the RGB color order for the Motherboards 12v RGB Headers. If you are experiencing issues, try switching to each one of these options until you find one which works", "type":"combobox", "values":["RGB", "RBG", "BGR", "BRG", "GBR", "GRB"], "default":"GRB"},
	];
}
export function SubdeviceController(){ return true; }

const RGBConfigs = {
	"RGB" : [0, 1, 2],
	"RBG" : [0, 2, 1],
	"BGR" : [2, 1, 0],
	"BRG" : [2, 0, 1],
	"GBR" : [1, 2, 0],
	"GRB" : [1, 0, 2]
};

const vKeyNames = [];
const vKeyPositions = [];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	NZXT.InitializeNZXT();
}

export function Render() {
	NZXT.sendRGB();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		NZXT.sendRGB("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		NZXT.sendRGB(shutdownColor);
	}

}

export class NZXTProtocol {
	constructor() {
		this.PIDLibrary	=	{
			0x2005: "N7 Z390",
			0x200A: "N7 Z490",
			0x200B: "N7 B550",
			0x200C: "N7 Z590",
			0x201B: "N7 B650E",
			0x2017: "N5 Z690",
			0x2016: "N7 Z690",
			0x201D: "N7 Z790",
		};

		this.ChannelLibrary	=	{
			0x2005: {
				nzxtchannels: 3,
				argbchannels: 0,
				rgbchannels : 0,
			},
			0x200A: {
				nzxtchannels: 2,
				argbchannels: 1,
				rgbchannels : 1,
			},
			0x200B: {
				nzxtchannels: 2,
				argbchannels: 1,
				rgbchannels : 1,
			},
			0x200C: {
				nzxtchannels: 2,
				argbchannels: 1,
				rgbchannels : 1,
			},
			0x201B: {
				nzxtchannels: 4,
				argbchannels: 2,
				rgbchannels : 0,
			},
			0x2017: {
				nzxtchannels: 2,
				argbchannels: 1,
				rgbchannels : 1,
			},
			0x2016: {
				nzxtchannels: 2,
				argbchannels: 1,
				rgbchannels : 1,
			},
			0x201D: {
				nzxtchannels: 4,
				argbchannels: 2,
				rgbchannels : 0,
			},
		};

	}

	InitializeNZXT() {
		//Initializing vars
		this.NZXTPID = this.PIDLibrary[device.productId()];
		this.CHANLIB = this.ChannelLibrary[device.productId()];
		this.ARGBCHL = this.CHANLIB.argbchannels;
		this.NZXTCHL = this.CHANLIB.nzxtchannels;
		this.RGBCHL	 = this.CHANLIB.rgbchannels;

		device.setName("NZXT " + this.NZXTPID);
		device.log(`Device model found: ` + this.NZXTPID);

		for(let RGB = 0; RGB < this.RGBCHL; RGB++) {
			const RGB_count = RGB + 1;
			device.createSubdevice(`12v RGB Header ${RGB_count}`);
			device.setSubdeviceName(`12v RGB Header ${RGB_count}`, this.NZXTPID + ` - 12v RGB Header ${RGB_count}`);
			device.setSubdeviceSize(`12v RGB Header ${RGB_count}`, 3, 3);
		}

		device.log(`Device has: ` + this.RGBCHL + " 12v RGB Channels");

		const totalchannels = this.NZXTCHL + this.ARGBCHL;
		device.SetLedLimit(totalchannels * 40);
		device.log(`Device has: ` + this.ARGBCHL + " ARGB Channels");
		device.log(`Device has: ` + this.NZXTCHL + " NZXT Channels");
		device.log(`LED Limit set to: ` + totalchannels * 40);

		for(let i = 0; i < this.NZXTCHL; i++) {
			const NZXT_count = i + 1;
			device.addChannel(`NZXT Header ${NZXT_count}`, 40);
		}

		for(let i = 0; i < this.ARGBCHL; i++) {
			const ARGB_count = i + 1;
			device.addChannel(`ARGB Header ${ARGB_count}`, 40);
		}
	}

	sendRGB(overrideColor) {
		const totalchannels = this.NZXTCHL + this.ARGBCHL;

		for(let i = 0; i < totalchannels; i++) {
			const RGBData = this.grabRGBData(i, overrideColor);

			// no led on this channel, skip
			if(!RGBData.length) {continue;}

			this.StreamLightingPacketChannel(0, RGBData.splice(0, 60), i);
			this.StreamLightingPacketChannel(1, RGBData.splice(0, 60), i);

			this.SubmitLightingColors(i);
		}

		for(let i = 0; i < this.RGBCHL; i++){
			this.SendRGBHeader(i, overrideColor);
		}
	}

	grabRGBData(Channel, overrideColor) {
		let ChannelID = Channel + 1;
		let ChannelName = "ARGB Header";

		if(Channel < this.NZXTCHL){
			ChannelName = `NZXT Header ${ChannelID}`;
		}else{
			ChannelID = Channel - this.NZXTCHL + 1;
			ChannelName = `ARGB Header ${ChannelID}`;
		}

		let ChannelLedCount = device.channel(ChannelName).LedCount();
		const componentChannel = device.channel(ChannelName);
		let RGBData = [];

		if(overrideColor){
			RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", "GRB");
		}else if(LightingMode === "Forced") {
			RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");
		} else if(componentChannel.shouldPulseColors()) {
			ChannelLedCount = 40;

			const pulseColor = device.getChannelPulseColor(ChannelName);
			RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");
		} else {
			RGBData = device.channel(ChannelName).getColors("Inline", "GRB");
		}

		return RGBData;
	}

	StreamLightingPacketChannel(packetNumber, RGBData, channel) {
		if(!RGBData.length) {return;}
		const packet = [0x22, 0x10 | packetNumber, 0x01 << channel, 0x00];
		packet.push(...RGBData);
		device.write(packet, 64);
	}

	SubmitLightingColors(channel) {
		const packet = [0x22, 0xA0, 1 << channel, 0x00, 0x01, 0x00, 0x00, 0x28, 0x00, 0x00, 0x80, 0x00, 0x32, 0x00, 0x00, 0x01];
		device.write(packet, 64);
	}

	SendRGBHeader(channel, overrideColor) {
		const ChannelID = channel + 1;

		const packet =
		[
			0x2A, 0x04, 0x08, 0x08, 0x00, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x03, 0x00, 0x00, 0x00, 0x00
		];
		let col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.subdeviceColor(`12v RGB Header ${ChannelID}`, 1, 1);
		}

		packet[7] = col[RGBConfigs[RGBconfig][0]];
		packet[8] = col[RGBConfigs[RGBconfig][1]];
		packet[9] = col[RGBConfigs[RGBconfig][2]];

		device.write(packet, 64);
	}
}

const NZXT = new NZXTProtocol();

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
	return "https://assets.signalrgb.com/devices/brands/nzxt/motherboards/motherboard.png";
}
