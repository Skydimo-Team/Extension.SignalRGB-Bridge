export function Name() { return "ThermalTake LedBox Pacific"; }
export function VendorId() { return 0x264A; }
export function ProductId() { return [0x219A, 0x219B, 0x219C, 0x219D, 0x219E, 0x219F]; }
export function Publisher() { return "Wisey"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "lightingcontroller"}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
const vLedNames = [];
const vLedPositions = [];

export function SubdeviceController(){ return true; }
const DeviceMaxLedLimit = 180 ;

//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray = [
	["Channel 1", 36],
	["Channel 2", 36],
	["Channel 3", 36],
	["Channel 4", 36],
	["Channel 5", 36],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function Sendchannel(Channel) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();

	let RGBData = [];

	if(LightingMode === "Forced"){
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");
	}else if(device.getLedCount() === 0){
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");

	}else{
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "GRB");
	}

	sendDirectPacket(Channel, RGBData);
}

export function Initialize() {
	SetupChannels();

	device.send_report([0x00, 0xFE, 0x33], 65);
	device.read([0x00, 0xFE, 0x33], 65);           // Not sure if this is needed or not
	device.send_report([0x00, 0xFE, 0x50], 65); // Not sure if this is needed or not

}

export function Render() {
	for(let channel = 0; channel < 5; channel++){
		Sendchannel(channel);
	}
}

export function Shutdown(SystemSuspending) {
	device.pause(2000);
}

function SetupChannels(){
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++){
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

function sendDirectPacket(Channel, data){


	for(let Packets = 0; Packets <= 1; Packets++) {
		let packet = [];
		packet[0] = 0x00;

		if(Packets == 0) {
			packet[1] = 0x32;
			packet[2] = 0x52;
			packet[3] = Channel + 1;
			packet[4] = 0x18;
			packet[5] = 0x03;
			packet[6] = 0x01;
			packet[7] = 0x00;
			packet = packet.concat(data.splice(0, 57));
		} else {
			packet[1] = 0x32;
			packet[2] = 0x52;
			packet[3] = Channel + 1;
			packet[4] = 0x18;
			packet[5] = 0x03;
			packet[6] = 0x02;
			packet[7] = 0x00;
			packet = packet.concat(data.splice(0, 57));
		}


		device.write(packet, 65);
	}
}

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/thermaltake/lighting-controllers/led-box.png";
}