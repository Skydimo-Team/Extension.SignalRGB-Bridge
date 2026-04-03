export function Name() { return "Glorious Model O Wireless"; }
export function VendorId() { return 0x258A; }
export function ProductId() { return [0x2022, 0x2024, 0x2026]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse";}
/* global
LightingMode:readonly
forcedColor:readonly
SettingControl:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
mousePolling:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Grid", "Forced"], "default":"Grid"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"SettingControl", "group":"mouse", "label":"Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"400", "max":"12000", "default":"800"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"400", "max":"12000", "default":"1200"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"400", "max":"12000", "default":"1500"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"400", "max":"12000", "default":"2000"},
		{"property":"mousePolling", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"},

	];
}
const pollingDict = {
	"125Hz" : 8,
	"250Hz" : 4,
	"500Hz" : 2,
	"1000Hz": 1
};
const config = [
	0x04, 0x11
];

const vLedNames = [
	"Sides", "Logo"
];

const vLedPositions = [
	[1, 1], [1, 1]
];

export function Initialize() {

	if(SettingControl){
		setDpi();
	}
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendReportString("00 00 00 02 05 02 00 01 FF 01 00 09", 65);
		sendReportString("00 00 00 02 02 02 02 01 FF", 65);
		sendReportString("00 00 00 02 02 02 02 00 FF", 65);
	}

}


function sendReportString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[i] = parseInt(data[i], 16);
	}

	device.send_report(packet, size);
}
export function Validate(endpoint) {
	return endpoint.interface === 2;
}


export function Render() {

	sendColors();

	if((savedDpi1 != dpi1 ||
        savedDpi2 != dpi2 ||
        savedDpi3 != dpi3 ||
        savedDpi4 != dpi4 ||
        savedPollingRate != pollingDict[mousePolling]) &&
        SettingControl){
		setDpi();
	}
}
let savedPollingRate;
let savedDpi1;
let savedDpi2;
let savedDpi3;
let savedDpi4;

function setDpi(){
	savedDpi1 = dpi1;
	savedDpi2 = dpi2;
	savedDpi3 = dpi3;
	savedDpi4 = dpi4;
	savedPollingRate = pollingDict[mousePolling];

	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x00;
	packet[3] = 0x02;
	packet[4] = 0x12;
	packet[5] = 0x01;
	packet[6] = 0x01;
	packet[7] = 0x01;
	packet[8] = 0x04;

	packet[9] = Math.floor(savedDpi1/256);
	packet[10] = savedDpi1 % 256;
	packet[11] = Math.floor(savedDpi1/256);
	packet[12] = savedDpi1 % 256;

	packet[13] = Math.floor(savedDpi2/256);
	packet[14] = savedDpi2 % 256;
	packet[15] = Math.floor(savedDpi2/256);
	packet[16] = savedDpi2 % 256;

	packet[17] = Math.floor(savedDpi3/256);
	packet[18] = savedDpi3 % 256;
	packet[19] = Math.floor(savedDpi3/256);
	packet[20] = savedDpi3 % 256;

	packet[21] = Math.floor(savedDpi4/256);
	packet[22] = savedDpi4 % 256;
	packet[23] = Math.floor(savedDpi4/256);
	packet[24] = savedDpi4 % 256;

	device.send_report(packet, 65);

	sendReportString(`00 00 00 02 01 01 00 ${(pollingDict[mousePolling]).toString(16)}`, 65);
	device.pause(30);

}

function sendColors(overrideColor){

	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x00;
	packet[3] = 0x02;
	packet[4] = 0x08;
	packet[5] = 0x02;
	packet[6] = 0x00;
	packet[7] = 0x01;
	packet[8] = 0xFF;
	packet[9] = 0x04;
	packet[10] = 0x00;
	packet[11] = 0x09;


	for(let iIdx = 0; iIdx < 1; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var mxPxColor;

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		}else{
			mxPxColor = device.color(iPxX, iPxY);
		}

		packet[12+iIdx*4] = mxPxColor[0];
		packet[13+iIdx*4] = mxPxColor[1];
		packet[14+iIdx*4] = mxPxColor[2];

	}

	device.send_report(packet, 65);
	//sendReportString("00 00 00 02 02 02 02 01 FF",65)
	//sendReportString("00 00 00 02 02 02 02 00 FF",65)


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
	return "https://assets.signalrgb.com/devices/brands/glorious/mice/model-o-wireless.png";
}