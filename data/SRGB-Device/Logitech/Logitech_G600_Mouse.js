

const G600_RGB_WRITE = 0xF1;
const G600_DPI_WRITE = 0xF2;

const G600_FIXED_MODE = 0x00;
const G600_BRETHING_MODE = 0x01;
const G600_CYCLE_MODE = 0x02;

export function Name() { return "Logitech G600 Mouse"; }
export function VendorId() { return  0x046D; } //
export function ProductId() { return 0xC24A; } //
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/logitech"; }
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
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Grid", "Forced"], "default":"Grid"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"200", "max":"12400", "default":"800"},
	];
}

let savedDpi1;
const vLedNames = ["MouseWide"];

const vLedPositions = [[1, 1]];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	if(DpiControl) {
		setDpi(dpi1);
	}

}

function sendColors(overrideColor){

	const packet = [];
	//packet[0x00] = 0x00;
	packet[0x00]   = G600_RGB_WRITE;

	// Fetch color at 1,1
	const iX = vLedPositions[0][0];
	const iY = vLedPositions[0][1];

	let col;

	if(overrideColor){
		col = hexToRgb(overrideColor);
	}else if (LightingMode === "Forced") {
		col = hexToRgb(forcedColor);
	}else{
		col = device.color(iX, iY);
	}

	//assign to packets 2-4
	packet[0x01] = col[0];
	packet[0x02] = col[1];
	packet[0x03] = col[2];
	//packet 5 is mode
	packet[0x04] = G600_FIXED_MODE;
	//packet 6 is effect duration, default 4
	packet[0x05] = 0x04;
	//both 0
	packet[0x06] = 0x00;
	packet[0x07] = 0x00;

	device.send_report(packet, 8);

}
export function Render() {
	sendColors();

	if(savedDpi1 != dpi1 && DpiControl){
		setDpi(dpi1);
	}

}

function setDpi(dpi){

	savedDpi1 = dpi;

	const packet = [];
	packet[0] = 0xF2;
	packet[1] = 0x02;
	packet[2] = 0x00;
	packet[3] = Math.round(dpi/50);
	packet[4] = 0x00;
	device.send_report(packet, 8);


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
	return  endpoint.interface === 1 && endpoint.usage === 0x0080;
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/logitech/mice/g600.png";
}