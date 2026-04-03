export function Name() { return "Roccat Burst Pro Air"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2ca6; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 4]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mouse";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 0xff00; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/roccat/mice/burst-pro-air.png"; }
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
angleSnapping:readonly
debounce:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"50", "max":"19000", "default":"800"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"50", "max":"19000", "default":"1200"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"50", "max":"19000", "default":"1600"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"50", "max":"19000", "default":"2000"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"50", "max":"19000", "default":"3200"},
		{"property":"pollingrate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"},
		{"property":"angleSnapping", "group":"mouse", "label":"Angle Snapping", description: "Enables Angle Snapping on the mouse. This will result in the cursor moving only in straight lines", "type":"boolean", "default":"false", "tooltip":"This toggles smoothing of the cursor. Increases smoothness of mouse movement, but decreases accuracy."},
		{"property":"debounce", "group":"mouse", "label":"Debounce (ms)", description: "Sets the debounce interval between key activations", "step":"1", "type":"number", "min":"0", "max":"10", "default":"10", "tooltip":"This sets how long the mouse waits before it responds to a double click in milliseconds."},
	];
}

const vLedNames = [ "Scroll Wheel", "Left Click", "Right Click", "Back" ];
const vLedPositions = [ [1, 0], [0, 1], [2, 1], [1, 3] ];

const PollingDict =
{
	"125Hz": 0x00,
	"250Hz": 0x01,
	"500Hz": 0x02,
	"1000Hz": 0x03,
};

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {
	initpackets();

	if(DpiControl) {
		dpiset();
	}

	initpackets();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function ondpi1Changed() {
	dpiset();
}

export function ondpi2Changed() {
	dpiset();
}

export function ondpi3Changed() {
	dpiset();
}

export function ondpi4Changed() {
	dpiset();
}

export function ondpi5Changed() {
	dpiset();
}

export function onpollingrateChanged() {
	dpiset();
}

export function onanglesnappingChanged() {
	dpiset();
}

export function ondebounceChanged() {
	dpiset();
}

function initpackets() {
	let packet = [0x06, 0x00, 0x35, 0x07];
	device.send_report(packet, 30);
	device.pause(70);


	packet = [0x06, 0x01, 0x43, 0x07, 0x0c, 0x11, 0x0d, 0x00, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a];
	device.send_report(packet, 30);
	device.pause(70);

	packet = [0x06, 0x01, 0x4e, 0x06, 0x04, 0x01, 0x01, 0x01, 0xff];
	device.send_report(packet, 30);
	device.pause(70);

	packet = [0x06, 0x00, 0x00, 0x04];
	device.send_report(packet, 30);
	device.pause(70);

	packet = [0x06, 0x00, 0x00, 0x05];
	device.send_report(packet, 30);
	device.pause(70);
}


function dpiset() {
	let packet = [0x06, 0x00, 0x00, 0x04];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x00, 0x00, 0x05];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x00, 0x25, 0x07, 0x02];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x46, 0x06, 0x02];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x44, 0x07];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [];
	packet[0] = 0x06;
	packet[1] = 0x01;
	packet[2] = 0x46;
	packet[3] = 0x06;
	packet[4] = 0x19;
	packet[5] = 0x80;
	packet[6] = 0x0c;
	packet[7] = 0x00;
	packet[8] = 0x00;
	packet[9] = 0x03;
	packet[10] = 0x1f;//0x01
	packet[11] = 0x04;//0x04 or 0x01
	packet[12] = dpi1%256;//50 for 50 dpi
	packet[13] = Math.floor(dpi1/256);//0 for 50
	packet[14] = dpi2%256;//100 for 100
	packet[15] = Math.floor(dpi2/256);//0 for 100
	packet[16] = dpi3%256;//200
	packet[17] = Math.floor(dpi3/256);//0
	packet[18] = dpi4%256;//144 for 400
	packet[19] = Math.floor(dpi4/256);//1 to add 256 to dpi
	packet[20] = dpi5%256;// 64 for 1600
	packet[21] = Math.floor(dpi5/256); //6 to add 256 6 times to dpi
	packet[22] = 0xff;
	packet[23] = 0x00;
	packet[24] = 0x48;
	packet[25] = 0xff;
	packet[26] = 0x14;
	packet[27] = 0xff;
	packet[28] = 0x00;
	packet[29] = 0x48;

	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x44, 0x07];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x46, 0x06, 0x02, 0x01];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x44, 0x07];
	device.send_report(packet, 30);
	device.pause(70);

	varioussettings();
}

function varioussettings() {
	let packet = [];
	packet[0] = 0x06;
	packet[1] = 0x01;
	packet[2] = 0x46;
	packet[3] = 0x06;
	packet[4] = 0x19;
	packet[5] = 0x80;
	packet[6] = 0x0c;
	packet[7] = angleSnapping ? 0x00 : 0x01;//Angle Snapping
	packet[8] = 0x00;
	packet[9] = PollingDict[pollingrate];
	packet[10] = 0x01;
	packet[11] = 0x06;
	packet[12] = 0xff;
	packet[13] = 0x00; //15 in decimal, probably time identifier
	packet[14] = 0x00;//ff for no effect
	packet[15] = 0x00;
	packet[16] = 0x01;
	packet[17] = 0xff;
	packet[18] = 0xff;
	packet[19] = 0xff;
	packet[20] = 0xff;
	packet[21] = 0x02;
	packet[22] = 0xff;
	packet[23] = 0xff;
	packet[24] = 0xff;
	packet[25] = 0xff;
	packet[26] = 0x03;
	packet[27] = 0xff;
	packet[28] = 0xff;
	packet[29] = 0xff;
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x44, 0x07];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x46, 0x06, 0x02, 0x02];
	device.send_report(packet, 30);
	device.pause(70);
	packet = [0x06, 0x01, 0x44, 0x07];
	device.send_report(packet, 30);
	device.pause(70);

	fillerpacket();

}

function fillerpacket()//I don't know what this does yet
{
	let packet = [];
	packet[0] = 0x06;
	packet[1] = 0x01;
	packet[2] = 0x46;
	packet[3] = 0x06;
	packet[4] = 0x0d;
	packet[5] = 0xff;
	packet[6] = 0x04;
	packet[7] = 0xff;
	packet[8] = 0xff;
	packet[9] = 0xff;
	packet[10] = 0xff;
	packet[11] = 0x01;
	packet[12] = 0x64;
	packet[13] = 0xc5;
	packet[14] = 0x0b;
	packet[15] = 0xdc;
	packet[16] = 0x7d;
	packet[17] = 0x1d;

	device.send_report(packet, 30);
	device.pause(70);

	packet = [0x06, 0x01, 0x44, 0x07];
	device.send_report(packet, 30);
	device.pause(70);

	debounceadjust();
}

function debounceadjust() {
	const packet = [];
	packet[0] = 0x06;
	packet[1] = 0x01;
	packet[2] = 0x43;
	packet[3] = 0x06;
	packet[4] = 0x0c;
	packet[5] = 0x11;
	packet[6] = 0x0d;
	packet[7] = 0x01;
	packet[8] = debounce;
	packet[9] = debounce;
	packet[10] = 0x0a;
	packet[11] = 0x0a;
	packet[12] = 0x0a;
	packet[13] = 0x0a;
	packet[14] = 0x0a;
	packet[15] = 0x61;//CRC that we'll ignore for now
	packet[22] = 0x7e;

	device.send_report(packet, 30);
	device.pause(70);

}

function sendColors(overrideColor) {
	const packet = [];
	packet[0] = 0x06;
	packet[1] = 0x01;//Possible wireless flag
	packet[2] = 0x4d;//Possible CRC
	packet[3] = 0x06;
	packet[4] = 0x0c;


	for(let iIdx = 0; iIdx < 4; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[iIdx*3 + 5] = col[0];
		packet[iIdx*3 + 6] = col[1];
		packet[iIdx*3 + 7] = col[2];

	}

	device.send_report(packet, 30);
	device.pause(10);

	const spacket = [0x06, 0x01, 0x44, 0x07];
	device.send_report(spacket, 30);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}