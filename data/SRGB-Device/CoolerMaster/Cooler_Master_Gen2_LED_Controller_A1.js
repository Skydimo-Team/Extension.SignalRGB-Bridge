export function Name() { return "Cooler Master Gen2 LED Controller A1"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return [0x0173, 0x01C9, 0x01CB]; }
export function Publisher() { return "FeuerSturm"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [1, 1];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lightingcontroller";}

/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
GenCh1:readonly
GenCh2:readonly
GenCh3:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"GenCh1", "label":"Channel 1 Mode", description: "Sets the channel to 'Gen 1' or 'Gen 2'. Devices need to be compatible with 'Gen 2' to work properly in that mode", "type":"combobox", "values":["GEN1", "GEN2"], "default":"GEN1", "tooltip":"GEN2 will ONLY work with daisy-chained Cooler Master GEN2 devices!"},
		{"property":"GenCh2", "label":"Channel 2 Mode", description: "Sets the channel to 'Gen 1' or 'Gen 2'. Devices need to be compatible with 'Gen 2' to work properly in that mode", "type":"combobox", "values":["GEN1", "GEN2"], "default":"GEN1", "tooltip":"GEN2 will ONLY work with daisy-chained Cooler Master GEN2 devices!"},
		{"property":"GenCh3", "label":"Channel 3 Mode", description: "Sets the channel to 'Gen 1' or 'Gen 2'. Devices need to be compatible with 'Gen 2' to work properly in that mode", "type":"combobox", "values":["GEN1", "GEN2"], "default":"GEN1", "tooltip":"GEN2 will ONLY work with daisy-chained Cooler Master GEN2 devices!"},
	];
}
export function ConflictingProcesses() { return ["MasterPlusApp.exe"]; }
export function SubdeviceController(){ return true; }

const Gen1ChLedLimit = 60;
const Gen2ChLedLimit = 80;
const ChannelArray = [ "Channel 1", "Channel 2", "Channel 3" ];

const vKeyNames = [];
const vKeyPositions = [];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	device.write([0x00, 0x80, 0x01, 0x02, 0x01], 65);
	device.write([0x00, 0x00, 0x09, 0xff, 0xff, 0x90], 65);
	device.write([0x00, 0x01, 0x09], 65);
	device.write([0x00, 0x82, 0x09], 65);
	SetupChannels();
	setLEDCounts();
}

export function Render() {
	SendChannel(0, GenCh1 == 'GEN1' ? false : true);
	SendChannel(1, GenCh2 == 'GEN1' ? false : true);
	SendChannel(2, GenCh3 == 'GEN1' ? false : true);
}

export function Shutdown(SystemSuspending) {

	const color = SystemSuspending ? "#000000" : shutdownColor;
	SendChannel(0, GenCh1 == 'GEN1' ? false : true, color);
	SendChannel(1, GenCh2 == 'GEN1' ? false : true, color);
	SendChannel(2, GenCh3 == 'GEN1' ? false : true, color);

}

function SetupChannels() {
	let DeviceLedLimit = 0;

	for(let i = 0; i < ChannelArray.length; i++) {
		const ChannelGen = i == 0 ? GenCh1 : i == 1 ? GenCh2 : GenCh3;
		const ChMaxLeds = ChannelGen == "GEN1" ? Gen1ChLedLimit : Gen2ChLedLimit;

		device.addChannel(ChannelArray[i], ChMaxLeds, ChMaxLeds);
		DeviceLedLimit += ChMaxLeds;

		const packet = [];
		packet[0] = 0x00;
		packet[1] = 0x80;

		if(ChannelGen == "GEN2") {
			for(let Packets = 0; Packets <= 3; Packets++) {
				packet[2] = (Packets == 2 ? 0xb2 : Packets == 3 ? 0x07 : 0x0b);
				packet[3] = (Packets == 1 ? 0x02 : Packets == 2 ? 0x02 : 0x01);
				packet[4] = 1 << i;
				device.write(packet, 65);
			}
		} else {
			packet[2] = 0x0b;
			packet[3] = 0x01;
			packet[4] = 1 << i;
			device.write(packet, 65);

			packet[2] = 0x06;
			device.write(packet, 65);
		}
	}

	device.SetLedLimit(DeviceLedLimit);
}

function setLEDCounts() {
	for(let Channel = 0; Channel <ChannelArray.length; Channel++) {
		const initPacket = [0x00, 0x80, 0x06, 0x02, Channel+1, 0x08, 0x07];
		const LEDCountPacket = [0x00, 0x80, 0x06, 0x02, Channel+1, 0x01, 0x3c];
		device.write(initPacket, 65);
		device.write(LEDCountPacket, 65);
	}
}

function SendChannel(Channel, GEN2 = false, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel]);

	let RGBData = [];

	if(overrideColor) {
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	} else if(LightingMode == "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = GEN2 ? Gen2ChLedLimit : Gen1ChLedLimit;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
	} else {
		RGBData = componentChannel.getColors("Inline");
	}

	if(!GEN2 || device.getLedCount() === 0) {
		for(var Packets = 0; Packets <= 2; Packets++) {
			var packet = [];
			packet[0] = 0x00;

			if(Packets == 0) {
				packet[1] = 0x00;
				packet[2] = 0x09;
				packet[3] = 1 << Channel;
				packet[4] = 0x00;
				packet[5] = 0x90;
				packet = packet.concat(RGBData.splice(0, 59));
			} else {
				packet[1] = (Packets == 1 ? 0x01 : 0x82);
				packet[2] = 0x09;
				packet = packet.concat(RGBData.splice(0, 62));
			}

			device.write(packet, 65);
		}

		device.pause(4);
	} else {
		const components = device.channel(ChannelArray[Channel]).getComponentNames();
		const componentCount = components.length;

		for(let currComp = 0; currComp < componentCount; currComp++) {
			const DeviceRGBData = RGBData.splice(0, ((device.channel(ChannelArray[Channel]).getComponentData(components[currComp]).LedCount)*3));

			for(var Packets = 0; Packets <= 2; Packets++) {
				var packet = [];
				packet[0] = 0x00;

				if(Packets == 0) {
					packet[1] = 0x00;
					packet[2] = 0x09;
					packet[3] = 1 << Channel;
					packet[4] = 1 << currComp;
					packet[5] = 0x90;
					packet = packet.concat(DeviceRGBData.splice(0, 59));
				} else {
					packet[1] = (Packets == 1 ? 0x01 : 0x82);
					packet[2] = 0x09;
					packet = packet.concat(DeviceRGBData.splice(0, 62));
				}

				device.write(packet, 65);
			}

			device.pause(4);
		}
	}
}

export function onGenCh1Changed() {
	const ChLimit = GenCh1 == "GEN1" ? Gen1ChLedLimit : Gen2ChLedLimit;
	UpdateLedLimit(0, ChLimit);
}

export function onGenCh2Changed() {
	const ChLimit = GenCh2 == "GEN1" ? Gen1ChLedLimit : Gen2ChLedLimit;
	UpdateLedLimit(1, ChLimit);
}

export function onGenCh3Changed() {
	const ChLimit = GenCh3 == "GEN1" ? Gen1ChLedLimit : Gen2ChLedLimit;
	UpdateLedLimit(2, ChLimit);
}

export function UpdateLedLimit(channel, limit) {
	let DeviceLedLimitUpdate = 0;

	device.channel(ChannelArray[channel]).SetLedLimit(limit);

	for(let i = 0; i < ChannelArray.length; i++){
		DeviceLedLimitUpdate += device.channel(ChannelArray[i]).LedLimit();
	}

	device.SetLedLimit(DeviceLedLimitUpdate);
}

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/coolermaster/lighting-controllers/led-controller-gen2.png";
}