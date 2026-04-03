export function Name() { return "Razer Mamba TE"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return [0x0044, 0x0046]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [5, 7]; }
export function Type() { return "Hid"; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mouse"}
export function Validate(endpoint) { return endpoint.interface === 0 && endpoint.usage === 0x0002; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/razer/mice/mamba-tournament-edition.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
DpiControl:readonly
dpi1:readonly
mousePolling:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"200", "max":"16000", "default":"1500"},
		{"property":"mousePolling", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125", "500", "1000"], "default":"1000"},
	];
}

let savedDpi1;
let SavedmousePolling;
const MousePollingDict = {
	"125": 8,
	"500": 2,
	"1000": 1,
};

const vLedNames =  [
	"Left Side Bar 1",                 "Right Side Bar 1",
	"Left Side Bar 2", "ScrollWheel",  "Right Side Bar 2",
	"Left Side Bar 3",                 "Right Side Bar 3",
	"Left Side Bar 4",                 "Right Side Bar 4",
	"Left Side Bar 5",                 "Right Side Bar 5",
	"Left Side Bar 6", "Logo",         "Right Side Bar 6",
	"Left Side Bar 7",                 "Right Side Bar 7",
];
const vLedMap = [
	0,         7,
	1,   15,   8,
	2,         9,
	3,         10,
	4,         11,
	5,  14,    12,
	6,         13
];

const vLedPositions = [
	[0, 0],          [4, 0],
	[0, 1], [2, 0],   [4, 1],
	[0, 2],          [4, 2],
	[0, 3],          [4, 3],
	[0, 4],          [4, 4],
	[0, 5], [2, 5],   [4, 5],
	[0, 6],          [4, 6],
];

export function LedNames() {
	const MappedPositions = [];

	for(let i = 0; i < vLedNames.length; i++){
		MappedPositions[vLedMap[i]] = vLedNames[i];
	}

	return MappedPositions;
}

export function LedPositions() {
	const MappedPositions = [];

	for(let i = 0; i < vLedPositions.length; i++){
		MappedPositions[vLedMap[i]] = vLedPositions[i];
	}

	return MappedPositions;
}


const STARTUP = 0;
const HARDWARE = 1;

function ChangeControlMode(Mode) {
	var packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x02;
	packet[7] = 0x00;
	packet[8] = 0x84;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	if(Mode == STARTUP){
		var packet = [];
		packet[0] = 0x00;
		packet[1] = 0x00;
		packet[2] = 0x1F;
		packet[3] = 0x00;
		packet[4] = 0x00;
		packet[5] = 0x00;
		packet[6] = 0x02;
		packet[7] = 0x03;
		packet[8] = 0x0A;
		packet[9] = 0x05;
	}else{
		var packet = [];
		packet[0] = 0x00;
		packet[1] = 0x00;
		packet[2] = 0x1F;
		packet[3] = 0x00;
		packet[4] = 0x00;
		packet[5] = 0x00;
		packet[6] = 0x02;
		packet[7] = 0x03;
		packet[8] = 0x0A;
		packet[9] = 0x01;
		packet[10] = 0x02;
	}

	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
	//Apply();

}

function Apply() {
	const packet = []; //new Array(91).fill(0);
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x02;
	packet[7] = 0x03;
	packet[8] = 0x0A;
	packet[9] = 0x05;

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	device.pause(1); // We need a pause here (between packets), otherwise the ornata can't keep up.
}

export function Initialize() {
	ChangeControlMode(STARTUP);


	if(DpiControl) {
		setDPIRazer(dpi1);
	}

	setPollingRazer(mousePolling);
}

function setPollingRazer(mousePolling){
	SavedmousePolling = mousePolling;

	const packet = [];
	packet[2] = 0xF1;
	packet[6] = 0x01;
	packet[8] = 0x05;
	packet[9] = MousePollingDict[mousePolling];
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
}

function setDPIRazer(dpi){
	savedDpi1 = dpi;

	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x07;
	packet[7] = 0x04;
	packet[8] = 0x05;
	packet[9] = 0x01;
	packet[10] = Math.floor(dpi/256);
	packet[11] = dpi%256;
	packet[12] = Math.floor(dpi/256);
	packet[13] = dpi%256;
	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
}

function SendPacket(shutdown = false){


	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x32;
	packet[7] = 0x03;
	packet[8] = 0x0C;
	packet[10] = 0x0F;

	for(let iIdx = 0; iIdx < vLedMap.length; iIdx++){

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

		packet[vLedMap[iIdx]*3+11] = col[0];
		packet[vLedMap[iIdx]*3+12] = col[1];
		packet[vLedMap[iIdx]*3+13] = col[2];
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	Apply();
}

export function Render() {
	SendPacket();

	if(DpiControl && savedDpi1 != dpi1) {
		setDPIRazer(dpi1);
	}

	if(SavedmousePolling != mousePolling) {
		setPollingRazer(mousePolling);
	}
}

export function Shutdown() {
	ChangeControlMode(HARDWARE);
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}