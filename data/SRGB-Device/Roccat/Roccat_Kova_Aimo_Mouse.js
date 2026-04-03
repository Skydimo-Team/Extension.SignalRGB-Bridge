export function Name() { return "Roccat Kova Aimo"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2CF1; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 4]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
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
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"250", "max":"7000", "default":"800"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"250", "max":"7000", "default":"1200"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"250", "max":"7000", "default":"1600"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"250", "max":"7000", "default":"2000"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"250", "max":"7000", "default":"3200"},
		{"property":"pollingrate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"},
	];
}

const vKeys = [ 1, 0 ];
const vLedNames = [ "Scroll Wheel", "Back" ];
const vLedPositions = [ [1, 0], [1, 3] ];

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

export function ondpi1Changed() {
	setDpi();
}

export function ondpi2Changed() {
	setDpi();
}

export function ondpi3Changed() {
	setDpi();
}

export function ondpi4Changed() {
	setDpi();
}

export function ondpi5Changed() {
	setDpi();
}

export function onPollingRateChanged() {
	setDpi();
}

const PollingDict =
{
	"125Hz": 0x00,
	"250Hz": 0x01,
	"500Hz": 0x02,
	"1000Hz": 0x03,
};

function setDpi() {
	const packet = [];
	packet[0] = 0x06;
	packet[1] = 0x3f;
	packet[3] = 0x06;
	packet[4] = 0x06;
	packet[5] = 0x1f;
	packet[6] = 0x1f;
	packet[7] = (dpi1/50)%256;
	packet[8] = (dpi2/50)%256;
	packet[9] = (dpi3/50)%256;
	packet[10] = (dpi4/50)%256;
	packet[11] = (dpi5/50)%256;
	packet[12] = 0x00;
	packet[13] = PollingDict[pollingrate];
	packet[14] = 0x00;
	packet[15] = 0x8c;
	packet[16] = 0x00;
	//Set y dpi 1-5
	packet[17] = 0x10;
	packet[18] = 0x00;
	packet[19] = 0x32;
	packet[20] = 0x00;
	packet[21] = 0x50;
	packet[22] = 0x00;
	packet[23] = 0x64;
	packet[24] = 0x00;
	packet[25] = 0x8c;
	packet[26] = 0x00;
	packet[29] = 0x03;
	packet[30] = 0x09;
	packet[31] = 0x06;
	packet[32] = 0xff;
	packet[33] = 0x0f;
	packet[35] = 0xe1;
	packet[36] = 0x06;

	device.send_report(packet, 37);
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

function sendZone(shutdown = false){

	const packet = [];
	packet[0] = 0x0a;
	packet[1] = 0x08;

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

	device.send_report(packet, 8);
	device.pause(1);

}

export function Render() {
	sendZone();
}


export function Shutdown() {
	// Lighting IF
	sendZone(true);
	sendReportString("0E 06 00 00 00 FF", 6);

}


export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0000;
}


export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kova-aimo.png";
}