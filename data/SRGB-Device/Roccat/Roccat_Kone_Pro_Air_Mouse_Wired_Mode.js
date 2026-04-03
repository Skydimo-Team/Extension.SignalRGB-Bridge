export function Name() { return "Roccat Kone Pro Air Wired Mode"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2c92; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
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
angleSnapping:readonly
lod:readonly
debounce:readonly
timeoutlength:readonly
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
		{"property":"lod", "group":"mouse", "label":"Lift Off Distance",  description: "Sets the lift off distance so the device can stop detecting inputs", "type":"combobox", "values":["Low", "High"], "default":"Low", "tooltip":"Determines how high the mouse is off of your table before it stops registering movement."},
		{"property":"debounce", "group":"mouse", "label":"Debounce (ms)", description: "Sets the debounce interval between key activations", "step":"1", "type":"number", "min":"0", "max":"10", "default":"10", "tooltip":"This sets how long the mouse waits before it responds to a double click in milliseconds."},
		{"property":"timeoutlength", "group":"", "label":"LED Timeout Length (Minutes)", description: "Sets the amount of time before turning off the LEDs", "step":"1", "type":"number", "min":"0", "max":"30", "default":"15", "tooltip":"This sets the amount of time in minutes that the mouse is idle before the leds turn off"},
	];
}

const vKeys = [ 0, 1 ];
const vLedNames = [ "Left", "Right" ];
const vLedPositions = [ [1, 0], [2, 0] ];

const PollingDict =
{
	"125Hz": 0x03,
	"250Hz": 0x02,
	"500Hz": 0x01,
	"1000Hz": 0x00,
};

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
	if(DpiControl) {
		Setup();
	}
}


export function ondpi1Changed() {
	Setup();
}

export function ondpi2Changed() {
	Setup();
}

export function ondpi3Changed() {
	Setup();
}

export function ondpi4Changed() {
	Setup();
}

export function ondpi5Changed() {
	Setup();
}

export function onPollingRateChanged() {
	Setup();
}

export function onanglesnappingChanged() {
	Setup();
}

export function ontimeoutlengthChanged() {
	Setup();
}

export function ondebounceChanged() {
	Setup();
}

export function onlodChanged() {
	Setup();
}

function Setup() {
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x10;
	packet[2] = 0x50;
	packet[3] = 0x14;
	packet[4] = 0x00;
	packet[5] = 0x01;
	packet[6] = PollingDict[pollingrate];
	packet[7] = angleSnapping;
	packet[8] = 0x00;
	packet[9] = (dpi1/50)%256;
	packet[10] = Math.floor(dpi1/50/256);
	packet[11] = (dpi2/50)%256;
	packet[12] = Math.floor(dpi2/50/256);
	packet[13] = (dpi3/50)%256;
	packet[14] = Math.floor(dpi3/50/256);
	packet[15] = (dpi4/50)%256;
	packet[16] = Math.floor(dpi4/50/256);
	packet[17] = (dpi5/50)%256;
	packet[18] = Math.floor(dpi5/50/256);

	if(lod == "Low") {
		packet[19] = 0x06;
	}

	if(lod == "High") {
		packet[19] = 0x07;
	}

	packet[20] = 0x00;
	packet[21] = 0x80;
	packet[22] = timeoutlength;
	packet[23] = 0x00;
	packet[24] = debounce;

	device.write(packet, 64);
	sendPacketString("00 10 50 18 04", 64);
	sendPacketString("00 90 0a", 64); //My guess is that this is status. Batt/Signal Strength.
}


function sendZone(shutdown = false) {
	const packet = [];
	packet[0] = 0x0;
	packet[1] = 0x10;
	packet[2] = 0x10;
	packet[3] = 0x0b;
	packet[4] = 0x00;
	packet[5] = 0x09;
	packet[6] = 0x64;
	packet[7] = 0x64;
	packet[8] = 0x64;
	packet[9] = 0x06;

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

		packet[vKeys[iIdx]*3+10] = col[0];
		packet[vKeys[iIdx]*3+11] = col[1];
		packet[vKeys[iIdx]*3+12] = col[2];

	}

	device.write(packet, 65);
	device.pause(5);
}

export function Render() {
	sendZone();
}


export function Shutdown() {
	sendZone(true);
}


export function Validate(endpoint) {
	return endpoint.interface === 1;
}

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[i] = parseInt(data[i], 16);
	}

	device.write(packet, size);

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kone-pro-air.png";
}