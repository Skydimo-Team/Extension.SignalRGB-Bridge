export function Name() { return "Razer Chroma Light Strip Set"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0F2C; }
export function Publisher() { return "FeuerSturm"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
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

const vLedNames = [];
const vLedPositions = [];
export function SubdeviceController(){ return true; }

const DeviceMaxLedLimit = 240;

const ChannelArray = [
	["Channel 1", 120],
	["Channel 2", 120],
	["Channel 3", 120],
];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.set_endpoint(0, 1, 0x000C, 0);

	const packet = new Array(91).fill(0);

	packet[2] = 0x1F;
	packet[6] = 0x01;
	packet[8] = 0x37;
	packet[9] = 0x01;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	packet[2] = 0x9F;
	packet[6] = 0x02;
	packet[8] = 0x47;
	packet[10] = 0x01;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	packet[2] = 0x1F;
	packet[8] = 0x84;
	packet[9] = 0x00;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	packet[8] = 0x04;
	packet[9] = 0x03;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	device.set_endpoint(1, 1, 0x000C, 0);

	SetupChannels();
}

export function Shutdown() {
	device.set_endpoint(0, 1, 0x000C, 0);

	const packet = new Array(91).fill(0);

	packet[2] = 0x1F;
	packet[6] = 0x01;
	packet[8] = 0x37;
	packet[9] = 0x00;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
}

function SendChannel(Channel, shutdown = false) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).ledCount;
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(shutdown) {
		RGBData = device.createColorArray(shutdownColor, ChannelLedCount, "Inline");
	} else if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
	} else if(componentChannel.shouldPulseColors()) {
		ChannelLedCount = 80;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline");
	}

	let packet = [];
	packet[0] = 0x00;
	packet[1] = Channel == 2 ? 0x84 : 0x04;
	packet[2] = Channel;
	packet[3] = Channel;
	packet[4] = 0x00;
	packet[5] = ChannelLedCount-1;
	packet = packet.concat(RGBData);
	device.send_report(packet, 381);
	device.pause(10);
}

function CalculateCrc(packet) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= packet[iIdx];
	}

	return iCrc;
}

export function Render() {
	for(let i = 0; i < ChannelArray.length; i++) {
		SendChannel(i);
	}
}

export function Validate(endpoint) {
	return endpoint.interface === 1 || endpoint.interface === 0;

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/lighting-controllers/chroma-light-strip-set.png";
}