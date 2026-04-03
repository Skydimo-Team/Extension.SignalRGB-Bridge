export function Name() { return "Roccat Kain 200"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2d60; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse"}
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

const vKeys =
[
	0,
	1
];

const vLedNames =
[
	"Scroll Wheel", "Logo 1"
];

const vLedPositions =
[
	[1, 0],
	[1, 2],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	Batterylevel();
}

export function Render() {
	sendZone();
}

export function Shutdown() {
	sendZone(true);
}

const BatteryDict =
{
	"71" : 100,
	"64" : 80,
	"65" : 60,
	"66" : 40,
	"67" : 20,
	"68" : 0
};

function Batterylevel() {

	let packet = [];

	packet[0] = 0x08;
	packet[1] = 0x03;
	packet[2] = 0x40;
	packet[3] = 0x00;
	packet[4] = 0x4b;

	device.send_report(packet, 22);
	device.pause(1000);
	device.set_endpoint(2, 0x0000, 0xff00); // System IF
	packet = device.read(packet, 22); //Device status
	packet = device.read(packet, 22);
	device.log(packet);

	const Batt = packet[5];
	const Batterylevel = BatteryDict[Batt];
	device.log("Battery Percentage is : " + Batterylevel + " %");
	device.set_endpoint(2, 0x0001, 0xff01); // System I
}

function sendZone(shutdown = false){

	const packet = [];
	packet[0] = 0x08;
	packet[1] = 0x09;
	packet[2] = 0x33;
	packet[3] = 0x00;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[vKeys[iIdx]*3+4] = col[0];
		packet[vKeys[iIdx]*3+5] = col[1];
		packet[vKeys[iIdx]*3+6] = col[2];

	}

	packet[10] = Math.abs( packet[4] - packet[5]  + packet[6] - packet[7] + packet[8] - packet[9] - (0x32));

	device.send_report(packet, 22);
}

function sendReportString(string, size) {
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.send_report(packet, size);
}

export function Validate(endpoint) {
	return endpoint.interface === 2 || endpoint.interface === 1;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kain-200.png";
}