export function Name() { return "Roccat Kone Remastered"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2e2c; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [7, 7]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 7.0;}
export function DeviceType(){return "mouse"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
DpiControl:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
pollingrate:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"200", "max":"16000", "default":"800"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"200", "max":"16000", "default":"1200"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"200", "max":"16000", "default":"1600"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"200", "max":"16000", "default":"2000"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"200", "max":"16000", "default":"3200"},
		{"property":"pollingrate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"},


	];
}
let savedDpi1;
let savedDpi2;
let savedDpi3;
let savedDpi4;
let savedDpi5;
let savedPollingRate;

const vKeys = [
	0,
	1, 2, 3, 4,
	5, 6, 7, 8,
	9, 10
];
const vLedNames = [
	"Scroll Wheel",
	"Left Led 1", "Left Led 2", "Left Led 3", "Left Led 4", "Right Led 1", "Right Led 2", "Right Led 3", "Right Led 4", "Left Led 5", "Right Led 5"
];
const vLedPositions = [
	[3, 0],
	[1, 1], [2, 2], [1, 3], [2, 4],
	[5, 1], [4, 2], [5, 3], [4, 4],
	[0, 2], [6, 2]
];

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {
	sendReportString("0E 06 01 01 00 FF", 6);

	if(DpiControl){
		setDpi();
	}
}
const SettingReport = [
	0x06, 0x7E, 0x00, 0x06, 0x1F, 0x00, 0x9E, 0x00, 0x5C, 0x00, 0x39, 0x00, 0x52, 0x00, 0x5E, 0x00, 0x9E, 0x00, 0x5C,
	0x00, 0x39, 0x00, 0x52, 0x00, 0x5E, 0x00, 0x03, 0x00, 0x00, 0x08, 0xFF, 0x07, 0x00, 0x09, 0x06, 0xFF, 0x1D, 0x13,
	0xFF, 0x00, 0xFF, 0x59, 0xFF, 0x00, 0x00, 0xFF, 0xFD, 0xFD, 0x00, 0x00, 0xFF, 0xF4, 0x64, 0x00, 0x00, 0xFF, 0xF4,
	0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x50, 0x00, 0x00,
	0xFF, 0xFF, 0x50, 0x00, 0x00, 0xFF, 0xE6, 0x8C, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x50, 0x00,
	0x00, 0xFF, 0xFF, 0x50, 0x00, 0x00, 0xFF, 0xE6, 0x8C, 0x00, 0x00, 0xFF, 0xE6, 0x8C, 0x00, 0x00, 0xFF, 0xE6, 0x8C,
	0x00, 0x00, 0x80, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xD1, 0x2B
];
const PollingDict = {
	"125Hz": 0xB6,
	"250Hz": 0xB7,
	"500Hz": 0xB8,
	"1000Hz": 0xB9,

};


function setDpi(){
	savedDpi1 = dpi1;
	savedDpi2 = dpi2;
	savedDpi3 = dpi3;
	savedDpi4 = dpi4;
	savedDpi5 = dpi5;
	savedPollingRate = PollingDict[pollingrate];
	//Set X dpi 1-5
	SettingReport[6] =    (dpi1/50)%256;
	SettingReport[7] =   Math.floor(dpi1/50/256);
	SettingReport[8] =    (dpi2/50)%256;
	SettingReport[9] =   Math.floor(dpi2/50/256);
	SettingReport[10] =    (dpi3/50)%256;
	SettingReport[11] =   Math.floor(dpi3/50/256);
	SettingReport[12] =    (dpi4/50)%256;
	SettingReport[13] =   Math.floor(dpi4/50/256);
	SettingReport[14] =    (dpi5/50)%256;
	SettingReport[15] =   Math.floor(dpi5/50/256);
	//Set y dpi 1-5
	SettingReport[16] =    (dpi1/50)%256;
	SettingReport[17] =   Math.floor(dpi1/50/256);
	SettingReport[18] =    (dpi2/50)%256;
	SettingReport[19] =   Math.floor(dpi2/50/256);
	SettingReport[20] =    (dpi3/50)%256;
	SettingReport[21] =   Math.floor(dpi3/50/256);
	SettingReport[22] =    (dpi4/50)%256;
	SettingReport[23] =   Math.floor(dpi4/50/256);
	SettingReport[24] =    (dpi5/50)%256;
	SettingReport[25] =   Math.floor(dpi5/50/256);

	SettingReport[124] = savedPollingRate;

	device.send_report(SettingReport, 126);
	sendReportString("0E 06 01 01 00 FF", 6);
}

function sendReportString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.send_report(packet, size);
}

function Apply() {

}

function sendZone(shutdown = false){

	const packet = [];
	packet[0] = 0x0D;
	packet[1] = 0x2E;

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

		packet[vKeys[iIdx]*4+2] = col[0];
		packet[vKeys[iIdx]*4+3] = col[1];
		packet[vKeys[iIdx]*4+4] = col[2];
		packet[vKeys[iIdx]*4+5] = 0x00;

	}

	device.send_report(packet, 46);
	device.pause(1);

}

export function Render() {
	sendZone();

	if((savedDpi1 != dpi1 ||
        savedDpi2 != dpi2 ||
        savedDpi3 != dpi3 ||
        savedDpi4 != dpi4 ||
        savedDpi5 != dpi5 ||
        savedPollingRate != PollingDict[pollingrate]) &&
        DpiControl){
		setDpi();
	}
}


export function Shutdown() {
	// Lighting IF
	sendZone(true);
	sendReportString("0E 06 00 00 00 FF", 6);

}


export function Validate(endpoint) {
	return endpoint.interface === 0  && endpoint.usage_page === 0x000b;
}


export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kone-remastered.png";
}