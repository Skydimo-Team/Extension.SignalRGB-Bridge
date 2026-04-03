export function Name() { return "Cooler Master MM711 Gaming Mouse"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x0101; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
SettingControl:readonly
mousePolling:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
dpi6:readonly
dpi7:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"SettingControl", "group":"mouse", "label":"Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"mousePolling", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"},
		{"property":"dpi1", "group":"dpi", "label":"DPI 1", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"800"},
		{"property":"dpi2", "group":"dpi", "label":"DPI 2", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"1200"},
		{"property":"dpi3", "group":"dpi", "label":"DPI 3", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"1500"},
		{"property":"dpi4", "group":"dpi", "label":"DPI 4", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"2000"},
		{"property":"dpi5", "group":"dpi", "label":"DPI 5", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"3200"},
		{"property":"dpi6", "group":"dpi", "label":"DPI 6", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"4800"},
		{"property":"dpi7", "group":"dpi", "label":"DPI 7", "step":"100", "type":"number", "min":"400", "max":"32000", "default":"4800"},

	];
}
let savedPollingRate;
let savedDpi1;
let savedDpi2;
let savedDpi3;
let savedDpi4;
let savedDpi5;
let savedDpi6;
let savedDpi7;

const pollingDict = {
	"125Hz" : 8,
	"250Hz" : 4,
	"500Hz" : 2,
	"1000Hz": 1
};
const vLedNames = [
	"Scroll Wheel", "Logo Area"

];
const vLedPositions = [
	[1, 0],
	[1, 2],
];

const vKeymap = [
	0, 1
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	if(SettingControl){
		sendDpi();
	}
}

export function Render() {
	sendColors();

	if((savedDpi1 != dpi1 ||
        savedDpi2 != dpi2 ||
        savedDpi3 != dpi3 ||
        savedDpi4 != dpi4 ||
        savedDpi5 != dpi5 ||
        savedDpi6 != dpi6 ||
        savedDpi7 != dpi7 ||
        savedPollingRate != pollingDict[mousePolling]) &&
        SettingControl){
		sendDpi();
	}
}
export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendDpi(){
	savedDpi1 = dpi1;
	savedDpi2 = dpi2;
	savedDpi3 = dpi3;
	savedDpi4 = dpi4;
	savedDpi5 = dpi5;
	savedDpi6 = dpi6;
	savedDpi7 = dpi7;
	savedPollingRate = pollingDict[mousePolling];

	device.write([0x00, 0x51, 0x9B, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06], 65);
	device.write([0x00, 0x51, 0x9C, 0x00, 0x00, 0xE7, 0xCC, 0x00, 0x00, 0x00, 0xFF, 0xF0, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0xE0, 0xFF, 0xFF, 0x75, 0x00, 0xFF], 65);

	const DpiPacket = [0x00, 0x51, 0x40, 0x00, 0x00, 0x07, 0x11, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x00, 0x00, 0x02, 0x0A, 0x10];
	// X Dpi
	DpiPacket[7] = dpi1;
	DpiPacket[8] = dpi2;
	DpiPacket[9] = dpi3;
	DpiPacket[10] = dpi4;
	DpiPacket[11] = dpi5;
	DpiPacket[12] = dpi6;
	DpiPacket[13] = dpi7;
	// Y Dpi
	DpiPacket[14] = dpi1;
	DpiPacket[15] = dpi2;
	DpiPacket[16] = dpi3;
	DpiPacket[17] = dpi4;
	DpiPacket[18] = dpi5;
	DpiPacket[19] = dpi6;
	DpiPacket[20] = dpi7;

	device.write(DpiPacket, 65);
	device.write([0x00, 0x51, 0xF0, 0x00, 0x00, pollingDict[mousePolling]], 65);
	device.write([0x00, 0x51, 0x10], 65);
	device.write([0x00, 0x51, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x01], 65);
}

function sendColors(overrideColor){
	const RGBData = [];

	for(let iIdx = 0; iIdx < vKeymap.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let mxPxColor;

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		}else{
			mxPxColor = device.color(iPxX, iPxY);
		}

		RGBData[vKeymap[iIdx]*3] = mxPxColor[0];
		RGBData[vKeymap[iIdx]*3 +1 ] = mxPxColor[1];
		RGBData[vKeymap[iIdx]*3 +2 ] = mxPxColor[2];
	}

	device.write([0x00, 0x41, 0x80], 65);

	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0x51;
	packet[2] = 0xA8;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet = packet.concat(RGBData.splice(0, 6));

	device.write(packet, 65);
	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0xB0], 65);
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
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/coolermaster/mice/mm711.png";
}