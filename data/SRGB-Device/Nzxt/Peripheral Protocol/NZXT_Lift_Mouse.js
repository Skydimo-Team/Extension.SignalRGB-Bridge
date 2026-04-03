export function Name() { return "NZXT Lift"; }
export function VendorId() { return 0x1E71; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function ProductId() { return 0x2100; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 4]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mouse"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
LOD:readonly
pollingrate:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"100", "max":"16000", "default":"800"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"100", "max":"16000", "default":"1200"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"100", "max":"16000", "default":"1600"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"100", "max":"16000", "default":"2000"},
		{"property":"LOD", "group":"mouse", "label":"High Lift Off Distance", description: "Sets the lift off distance to be higher than the default", "type":"boolean", "default":"false", "tooltip":"This setting determines how high off the table the mouse is before it stops registering inputs. Low is 2mm, High is 3mm."},
		{"property":"pollingrate", "group":"mouse", "label":"High Polling Rate", description: "This setting determines how high off the desk the mouse is before it stops registering inputs. Low is 500Hz, High is 1000Hz", "type":"boolean", "default":"true", "tooltip":"This setting determines how high off the table the mouse is before it stops registering inputs. Low is 500Hz, High is 1000Hz."},
	];
}

const vLedNames = ["Zone"];

const vLedPositions = [ [0, 0] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	Header();
	Header2();
	SetDpi();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

export function ondpi1Changed() {
	Header();
	Header2();
	SetDpi();
}

export function ondpi2Changed() {
	Header();
	Header2();
	SetDpi();
}

export function ondpi3Changed() {
	Header();
	Header2();
	SetDpi();
}

export function ondpi4Changed() {
	Header();
	Header2();
	SetDpi();
}

function SaveDPIToFlash() {
	var packet = [];
	packet[0x00]   = 0x43;
	packet[0x01]   = 0x8C;
	packet[0x02]   = 0x00;
	packet[0x03]   = 0x93;
	packet[0x04]   = (pollingrate ? 0x01 : 0x00);
	packet[0x05] = (LOD ? 0x00 : 0x01);
	packet[0x06] = 0x04;
	packet[0x07] = 0x02;
	packet[0x08] = dpi1/100;
	packet[0x09] = dpi2/100;
	packet[0x0A] = dpi3/100;
	packet[0x0B] = dpi4/100;
	packet[0x0C] = 0x00;
	packet[0x0D] = 0x32;

	device.write(packet, 64);

	var packet = [];
	packet[0x00]   = 0x43;
	packet[0x01]   = 0x82;
	packet[0x02]   = 0x00;
	packet[0x03]   = 0x92;

	var packet = [];
	packet[0x00]   = 0x43;
	packet[0x01]   = 0x81;
	packet[0x02]   = 0x00;
	packet[0x03]   = 0x9a;

	device.write(packet, 64);
}

function SetDpi() {
	const packet = [0x43, 0x8B, 0x00, 0x96, (pollingrate ? 0x01 : 0x00), (LOD ? 0x00 : 0x01), 0x04, 0x02, dpi1/100, dpi2/100, dpi3/100, dpi4/100, 0x00, 0x32];
	device.write(packet, 64);

	const applyPacket = [0x43, 0x81, 0x00, 0x9A];
	device.write(applyPacket, 64);
}

function Header() {
	const packet = [0x43, 0x81, 0x00, 0x84];
	device.write(packet, 10);
}

function Header2() {
	const packet = [0x43, 0x81, 0x00, 0x86];
	device.write(packet, 10);
}

function Header3()//Hidden function that changes lighting as dpi is changed
{
	const packet = [];

	packet[0x00]           = 0x43;
	packet[0x01]           = 0x91;
	packet[0x02]           = 0x00;
	packet[0x03]           = 0x82;
	packet[0x04]           = 0x0B;
	packet[0x05]           = 0x05;
	packet[0x07]           = 0x01;
	packet[0x08]           = 0xff;
	packet[0x0B]           = 0xff;
	packet[0x0D]           = 0xff;
	packet[0x0E]           = 0xff;
	packet[0x0F]           = 0xff;
	packet[0x10]           = 0xff;
	packet[0x13]           = 0xff;

	device.write(packet, 20);
}

function sendColors(overrideColor) {

	const packet = [0x43, 0x97, 0x00, 0x10, 0x01, 0x3f];

	const iX = vLedPositions[0][0];
	const iY = vLedPositions[0][1];
	let col;

	if(overrideColor) {
		col = hexToRgb(overrideColor);
	} else if (LightingMode == "Forced") {
		col = hexToRgb(forcedColor);
	} else {
		col = device.color(iX, iY);
	}

	packet[0x17] = col[0];
	packet[0x18] = col[1];
	packet[0x19] = col[2];

	device.write(packet, 30);
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
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/nzxt/mice/lift.png";
}