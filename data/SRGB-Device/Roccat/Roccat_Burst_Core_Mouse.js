export function Name() { return "Roccat Burst Core"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2DE6; }
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mouse";}
export function Validate(endpoint) { return endpoint.interface === 3; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/roccat/mice/burst-core.png"; }
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
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"200", "max":"8500", "default":"800"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"200", "max":"8500", "default":"1200"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"200", "max":"8500", "default":"1600"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"200", "max":"8500", "default":"2000"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"200", "max":"8500", "default":"3200"},
		{"property":"pollingrate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"},
		{"property":"angleSnapping", "group":"mouse", "label":"Angle Snapping", description: "Enables Angle Snapping on the mouse. This will result in the cursor moving only in straight lines", "type":"boolean", "default":"false", "tooltip":"This toggles smoothing of the cursor. Increases smoothness of mouse movement, but decreases accuracy."},
		{"property":"timeout", "group":"", "label":"LED Timeout", description: "This enables the LEDs to shut off after a certain amount of time", "type":"boolean", "default":"true", "tooltip":"This toggles whether the leds will shut off after the Led Timeout Length"},
		{"property":"timeoutlength", "group":"", "label":"LED Timeout Length (Minutes)", description: "Sets the amount of time before turning off the LEDs", "step":"1", "type":"number", "min":"0", "max":"30", "default":"15", "tooltip":"This sets the amount of time in minutes that the mouse is idle before the leds turn off"},
	];
}

const vKeys = [ 0 ];
const vLedNames = [ "Scroll Wheel" ];
const vLedPositions = [ [1, 0], ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.send_report([0x0E, 0x06, 0x01, 0x01, 0x00, 0xFF], 6);

	if(DpiControl){
		setDpi();
	}
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		device.send_report([0x0E, 0x06, 0x00, 0x00, 0x00, 0xFF], 6);
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

const SettingReport = [
	0x06, 0x3F, 0x00, 0x06, 0x06, 0x1F, 0x04, 0x0A, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, 0x40,
	0x01, 0x0A, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, 0x40, 0x01, 0x00, 0x00, 0x03, 0x01, 0x06,
	0xFF, 0x0F, 0x00, 0x00, 0x14, 0xFF, 0xFF, 0x00, 0x00, 0x14, 0xFF, 0xE6, 0x8C, 0x00, 0x14, 0xFF,
	0x00, 0x48, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2B, 0x0A
];

const PollingDict =
{
	"125Hz": 0x00,
	"250Hz": 0x01,
	"500Hz": 0x02,
	"1000Hz": 0x03,
};

function setDpi() {
	//Set X dpi 1-5
	SettingReport[7] =    (dpi1/50)%256;
	SettingReport[8] =   0x00;
	SettingReport[9] =    (dpi2/50)%256;
	SettingReport[10] =   0x00;
	SettingReport[11] =    (dpi3/50)%256;
	SettingReport[12] =   0x00;
	SettingReport[13] =    (dpi4/50)%256;
	SettingReport[14] =   0x00;
	SettingReport[15] =    (dpi5/50)%256;
	SettingReport[16] =   0x00;
	//Set y dpi 1-5
	SettingReport[17] =    (dpi1/50)%256;
	SettingReport[18] =   0x00;
	SettingReport[19] =    (dpi2/50)%256;
	SettingReport[20] =   0x00;
	SettingReport[21] =    (dpi3/50)%256;
	SettingReport[22] =   0x00;
	SettingReport[23] =    (dpi4/50)%256;
	SettingReport[24] =   0x00;
	SettingReport[25] =    (dpi5/50)%256;
	SettingReport[26] =   0x00;
	SettingReport[27] = angleSnapping;
	SettingReport[29] = PollingDict[pollingrate];
	SettingReport[33] = timeoutlength;
	SettingReport[34] = timeout ? 0x00 : 0xff;
	device.send_report(SettingReport, 63);
	device.send_report([0x0E, 0x06, 0x01, 0x00, 0x00, 0xFF], 6);
	device.send_report([0x0E, 0x06, 0x01, 0x01, 0x00, 0xFF], 6);
}

function sendColors(overrideColor){

	const packet = [];
	packet[0] = 0x0D;
	packet[1] = 0x0B;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
