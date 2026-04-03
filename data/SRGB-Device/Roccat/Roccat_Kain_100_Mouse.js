export function Name() { return "Roccat Kain 100"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2D00; }
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
const vKeys = [ 0 ];
const vLedNames = [ "Scroll Wheel" ];
const vLedPositions = [ [1, 0], ];

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
	0x06, 0x3F, 0x00, 0x06, 0x06, 0x1F, 0x04, 0x0A, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, 0x40,
	0x01, 0x0A, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, 0x40, 0x01, 0x00, 0x00, 0x03, 0x09, 0x06,
	0xFF, 0x0F, 0x00, 0x00, 0x14, 0xFF, 0xFF, 0x00, 0x00, 0x14, 0xFF, 0xE6, 0x8C, 0x00, 0x14, 0xFF,
	0x00, 0x48, 0xFF, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2B, 0x0A
];
const PollingDict = {
	"125Hz": 0x2B,
	"250Hz": 0x2C,
	"500Hz": 0x2D,
	"1000Hz": 0x2E,
};


function setDpi(){
	savedDpi1 = dpi1;
	savedDpi2 = dpi2;
	savedDpi3 = dpi3;
	savedDpi4 = dpi4;
	savedDpi5 = dpi5;
	savedPollingRate = PollingDict[pollingrate];
	//Set X dpi 1-5
	SettingReport[7] =    (dpi1/50)%256;
	SettingReport[8] =   Math.floor(dpi1/50/256);
	SettingReport[9] =    (dpi2/50)%256;
	SettingReport[10] =   Math.floor(dpi2/50/256);
	SettingReport[11] =    (dpi3/50)%256;
	SettingReport[12] =   Math.floor(dpi3/50/256);
	SettingReport[13] =    (dpi4/50)%256;
	SettingReport[14] =   Math.floor(dpi4/50/256);
	SettingReport[15] =    (dpi5/50)%256;
	SettingReport[16] =   Math.floor(dpi5/50/256);
	//Set y dpi 1-5
	SettingReport[17] =    (dpi1/50)%256;
	SettingReport[18] =   Math.floor(dpi1/50/256);
	SettingReport[19] =    (dpi2/50)%256;
	SettingReport[20] =   Math.floor(dpi2/50/256);
	SettingReport[21] =    (dpi3/50)%256;
	SettingReport[22] =   Math.floor(dpi3/50/256);
	SettingReport[23] =    (dpi4/50)%256;
	SettingReport[24] =   Math.floor(dpi4/50/256);
	SettingReport[25] =    (dpi5/50)%256;
	SettingReport[26] =   Math.floor(dpi5/50/256);

	SettingReport[61] = savedPollingRate;

	device.send_report(SettingReport, 63);
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
	packet[1] = 0x0B;

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

		packet[vKeys[iIdx]*3+2] = col[0];
		packet[vKeys[iIdx]*3+3] = col[1];
		packet[vKeys[iIdx]*3+4] = col[2];

	}

	device.send_report(packet, 11);
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
	return endpoint.interface === 3;
}


export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kain-100.png";
}