export function Name() { return "Cooler Master A-RGB LED Small Controller"; }
export function VendorId() { return 0x2516; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function ProductId() { return 0x1000;}
export function Publisher() { return "FeuerSturm"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [1, 1];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lightingcontroller"}

/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
export function SubdeviceController(){ return true; }

const DeviceMaxLedLimit = 48;
const ChannelArray = [
	["Channel 1", 48],
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

const vKeyNames = [];
const vKeyPositions = [];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	device.write([0x00, 0x80, 0x01, 0x01, 0x02, 0x02], 65);
	SetupChannels();
}

export function Render() {
	sendColors(0);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(0, color);
}

function sendColors(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(overrideColor) {
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	} else if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 48;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline");
	}

	for(let Packets = 0; Packets <= 4; Packets++) {
		let packet = [];
		packet[0] = 0x00;

		if(Packets == 0) {
			packet[1] = Packets;
			packet[2] = 0x07;
			packet[3] = 0x00;
			packet[4] = 0x60;
			packet = packet.concat(RGBData.splice(0, 60));
		} else {
			packet[1] = (Packets == 4 ? 0x84 : Packets);
			packet = packet.concat(RGBData.splice(0, 63));
		}

		device.write(packet, 65);
	}

	device.pause(10);
}

export function Validate(endpoint) {
	return endpoint.interface === 0;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/coolermaster/lighting-controllers/argb-small-led-controller.png";
}