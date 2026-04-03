export function Name() { return "Roccat Magma"; }
export function VendorId() { return 0x1e7d;}
export function ProductId() { return 0x3124;}
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "FeuerSturm"; }
export function Size() { return [10, 2]; }
export function DefaultPosition(){return [48, 100];}
export function DefaultScale(){return 28.0;}
export function DeviceType(){return "keyboard";}
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

export function Initialize() {
	device.set_endpoint(1, 1, 0xFF01, 5);
	sendReportString("0d 10 00 00 02 0f 45", 16);
	sendReportString("05 04 00 05", 4);
	sendReportString("07 0b 00 00 00 0b 0a 00 00 27 00", 11);
	sendReportString("0c 55 00 00 00 1e 0c 00 00 1f 0c 00 00 20 0c 00 00 21 0c 00 00 22 0c 00 00 14 0c 00 00 1a 0c 00 00 08 0c 00 00 15 0c 00 00 17 0c 00 00 04 0c 00 00 16 0c 00 00 07 0c 00 00 09 0c 00 00 0a 0c 00 00 1d 0c 00 00 1b 0c 00 00 06 0c 00 00 19 0c 00 00 05 0c e3 02", 85);
	sendReportString("0a 9d 00 00 00 3a 0c 00 00 3b 0c 00 00 3c 0c 00 00 3d 0c 00 00 3e 0c 00 00 3f 0c 00 00 40 0c 00 00 41 0c 00 00 42 0c 00 00 43 0c 00 00 44 0c 00 00 45 0c 00 00 46 0c 00 00 47 0c 00 00 48 0c 00 00 52 0c 00 00 50 0c 00 00 51 0c 00 00 4f 0c 00 00 3a 0c 00 00 3b 0c 00 00 3c 0c 00 00 3d 0c 00 00 08 03 00 00 07 03 00 00 40 0c 00 00 06 03 00 00 02 03 00 00 05 03 00 00 04 03 00 00 03 03 00 00 46 0c 00 00 0b 08 00 00 48 0c 00 00 09 08 00 00 50 0c 00 00 0a 08 00 00 4f 0c d1 09", 157);
	sendReportString("06 96 00 01 90 62 1a 26 2c 00 00 91 00 5d e5 00 e0 00 00 24 47 00 00 59 e1 e6 42 1f 57 5c 58 00 55 23 4a 4d 61 00 32 63 00 56 4b 22 12 40 04 34 37 65 41 00 60 44 16 00 54 21 49 00 18 1c 07 0b 10 11 50 00 31 2a 89 5a 28 45 00 20 39 00 0e 64 1b 8a 3a 46 13 2f 33 00 5b 38 2d 27 00 5e 00 00 00 00 25 4f 0c 30 00 3f 36 87 2e 52 15 17 09 0a 19 05 4e 00 08 3c 0f 3d 06 88 3b 43 14 2b 0d 29 1d 8b 35 3e 5f 85 e2 00 53 51 4c 00 48 00 00 00 f1 00 e4 1e 4c 1f", 150);
	sendReportString("11 1a 00 09 06 45 00 00 00 ff 00 00 ff 00 00 00 ff 00 00 ff ff ff ff ff 77 08", 26);
	sendReportString("0e 05 01 00 00", 5);
}

export function Shutdown() {
	device.set_endpoint(1, 1, 0xFF01, 5);
	sendReportString("0e 05 00 00 00", 5);
}

const vKeyNames = [
	"Zone1", "Zone2", "Zone3", "Zone4", "Zone5"
];

const vKeyPositions = [
	[0, 0], [2, 0], [4, 0], [6, 0], [9, 0]
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

function ColorZones() {
	device.set_endpoint(3, 1, 0xFF00, 0);

	let color;
	const packet = [];
	packet[0x00] = 0x00;
	packet[0x01] = 0xa1;
	packet[0x02] = 0x01;
	packet[0x03] = 0x40;

	for(let iIdx = 0; iIdx < vKeyPositions.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];

		if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}
		const mxPxColor = color;
		packet[0x04+iIdx] = mxPxColor[0];
		packet[0x04+iIdx+5] = mxPxColor[1];
		packet[0x04+iIdx+10] = mxPxColor[2];
	}

	device.write(packet, 65);
}

export function Render() {
	ColorZones();
	device.pause(1);
}

function sendPacketString(string, size) {
	const packet = [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++) {
		packet[i] = parseInt(data[i], 16);
	}

	device.write(packet, size);
}

function sendReportString(string, size) {
	const packet = [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++) {
		packet[i] = parseInt(data[i], 16);
	}

	device.send_report(packet, size);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 1 || endpoint.interface === 3;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/keyboards/magma.png";
}