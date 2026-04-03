export function Name() { return "Roccat Kone XP"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2C8B; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [11, 5]; }
export function DefaultPosition() {return [50, 50]; }
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
angleSnapping:readonly
timeout:readonly
timeoutlength:readonly
debounce:readonly
lod:readonly
*/
export function ControllableParameters() {
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
		{"property":"timeout", "group":"", "label":"LED Timeout", description: "This enables the LEDs to shut off after a certain amount of time", "type":"boolean", "default":"true", "tooltip":"This toggles whether the leds will shut off after the Led Timeout Length"},
		{"property":"timeoutlength", "group":"", "label":"LED Timeout Length (Minutes)", description: "Sets the amount of time before turning off the LEDs", "step":"1", "type":"number", "min":"0", "max":"30", "default":"15", "tooltip":"This sets the amount of time in minutes that the mouse is idle before the leds turn off"},
		{"property":"debounce", "group":"mouse", "label":"Debounce (ms)", description: "Sets the debounce interval between key activations", "step":"1", "type":"number", "min":"0", "max":"10", "default":"10", "tooltip":"This sets how long the mouse waits before it responds to a double click in milliseconds."},
		{"property":"lod", "group":"mouse", "label":"Lift Off Distance",  description: "Sets the lift off distance so the device can stop detecting inputs", "type":"combobox", "values":["Low", "High"], "default":"Low", "tooltip":"Determines how high the mouse is off of your table before it stops registering movement."},
	];
}

const SettingReport =
[
	0x06, 0xae, 0x00, 0x06, 0x06, 0x1f, 0x04, 0x08, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, 0x48, 0x00, 0x08, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, 0x40, 0x00, 0x00,
	0x00, 0x03, 0x0a, 0x06, 0xff, 0x0f, 0x00, 0x00, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff,
	0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64,
	0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48,
	0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff,
	0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x14, 0xff, 0x00, 0x48, 0xff, 0x64, 0x01, 0x64, 0xff, 0xc5, 0x0b, 0xdc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x14, 0x3d
];

const PollingDict =
{
	"125Hz": 0x00,
	"250Hz": 0x01,
	"500Hz": 0x02,
	"1000Hz": 0x03,
};

const vLedNames =
[
	"Left Bar Top", "Left Bar Bottom", "Second Left Bar Top", "Second Left Bar Bottom", "Third Left Bar Top", "Third Left Bar Bottom", "Center Left Bar Top", "Center Left Bar Bottom", "Center Left General", "Center Right General", "Center Right Top Bar", "Center Right Bottom Bar", "Third Right Bar Top", "Third Right Bar Bottom", "Second Right Bar Top", "Second Right Bar Bottom", "Right Bar Top", "Right Bar Bottom", "Scroll Wheel", "Profile Button"
];

const vLedPositions =
[
	[0, 0], [0, 4], [1, 0], [1, 4], [2, 0], [2, 4], [3, 0], [3, 4], [4, 2], [6, 2], [7, 0], [7, 4], [8, 0], [8, 4], [9, 0], [9, 4], [10, 0], [10, 4], [5, 0], [5, 2],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {
	sendReportString("0E 06 01 01 00 FF", 6);//Software mode
}

export function Render() {
	sendZone();
}

export function Shutdown() {
	sendReportString("0E 06 00 00 00 FF", 6);//Return to hardware mode
}

export function ondpi1Changed() {
	if(DpiControl) {
		Setup();
	}
}

export function ondpi2Changed() {
	if(DpiControl) {
		Setup();
	}
}

export function ondpi3Changed() {
	if(DpiControl) {
		Setup();
	}
}

export function ondpi4Changed() {
	if(DpiControl) {
		Setup();
	}
}

export function ondpi5Changed() {
	if(DpiControl) {
		Setup();
	}
}

export function onPollingRateChanged() {
	if(DpiControl) {
		Setup();
	}
}

export function onanglesnappingChanged() {
	if(DpiControl) {
		Setup();
	}
}

export function ontimeoutChanged() {
	if(DpiControl) {
		Setup();
	}
}

export function ontimeoutlengthChanged() {
	if(DpiControl) {
		Setup();
	}
}

export function ondebounceChanged() {
	SetDebounce();
}

export function onlodChanged() {
	SetLiftOffDistance();
}

function sendReportString(string, size) {
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++) {
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.send_report(packet, size);
}

function SetDebounce() //for some reason this has its own function?
{
	const packet = [];
	packet[0] = 0x11;
	packet[1] = 0x14;
	packet[2] = debounce;

	packet[19] = debounce+25;

	device.send_report(packet, 20);
	sendReportString("0E 06 01 01 00 FF", 6);

}

function SetLiftOffDistance() //also has its own function?
{
	const packet = [0x0f, 0x06];

	if(lod === "Low") {
	 packet[2] = 0x00;
	}

	if(lod === "High") {
		packet[2] = 0x01;
	}

	device.send_report(packet, 6);
	sendReportString("0E 06 01 00 00 FF", 6);//Software mode

}

function Setup() {
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

	SettingReport[27] = angleSnapping;
	SettingReport[29] = PollingDict[pollingrate];
	SettingReport[34] = (timeout ? 0x00 : 0xff);
	SettingReport[33] = timeoutlength;
	SettingReport[32] = 0xff;

	device.send_report(SettingReport, 174);
	sendReportString("0E 06 00 00 00 FF", 6);
	sendReportString("0E 06 01 01 00 FF", 6);
}

function sendZone(shutdown = false) {
	const packet = [];
	packet[0] = 0x0D;
	packet[1] = 0x7a;

	for(let iIdx = 0; iIdx < 20; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		packet[iIdx*6+5] = 0xff;//Why are there brightness bytes for each color?!?!?
		packet[iIdx*6+6] = 0xff;
		packet[iIdx*6+7] = 0xff;
		packet[iIdx*6+2] = col[0];
		packet[iIdx*6+3] = col[1];
		packet[iIdx*6+4] = col[2];

	}

	device.send_report(packet, 122);
	device.pause(1);
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
	return endpoint.interface === 3;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kone-xp.png";
}