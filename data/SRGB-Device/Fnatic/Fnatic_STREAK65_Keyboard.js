export function Name() { return "Fnatic STREAK65"; }
export function VendorId() { return 0x2F0E; }
export function ProductId() { return 0x0105; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [10, 3]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

export function DeviceMessages() {
	return [
		{property: "Limited Functionality", message:"Limited Functionality", tooltip: "Due to firmware limitations this device is limited to Solid Colors only"},
	];
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

const basePacket = '00 0F 3B 00 00 00 00 00 0F 0C FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF';
const gradientZones = ['00', '0C', '17', '22', '2D', '38', '43', '4E', '59'];

export function Initialize() {
}

function sendPacketString(string, size) {
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[i] = parseInt(data[i], 16);
	}

	device.write(packet, size);
}

export function Shutdown() {

}

const vKeys = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const vKeyNames = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9', 'Zone 10'];
const vKeyPositions = [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1]];


export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Render() {
	if (LightingMode === "Forced") {
		sendPacketString(`${basePacket} 01 ${forcedColor.toString(16).substring(1, 3) + ' ' + forcedColor.toString(16).substring(3, 5) + ' ' + forcedColor.toString(16).substring(5, 7)} 64`, 65);
		sendPacketString('00 0F 3B 00 00 39', 65);
	} else {
		let packet = basePacket + ' 0A ';

		for (let i = 0; i < 9; i++) {
			packet = packet + colorString(device.color(i, 1)) + ' ' + gradientZones[i] + ' ';
		}

		packet = packet + colorString(device.color(9, 1)).substring(0, 6);
		sendPacketString(packet, 65);
		sendPacketString(`00 0F 3B 00 00 39 00 00 ${colorString(device.color(9, 1)).split(' ')[2]} 64`, 65);
	}

}

function colorString(color) {
	let string = '';
	string = string + (color[0].toString(16).length > 1 ? color[0].toString(16) : '0' + color[0].toString(16)) + ' ';
	string = string + (color[0].toString(16).length > 1 ? color[1].toString(16) : '0' + color[1].toString(16)) + ' ';
	string = string + (color[0].toString(16).length > 1 ? color[2].toString(16) : '0' + color[2].toString(16));

	return string;

}

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/fnatic/keyboards/streak65.png";
}
