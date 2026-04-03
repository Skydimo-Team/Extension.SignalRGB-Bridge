export function Name() { return "SteelSeries Rival 3 Wireless"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return 0x1830; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "mouse";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
export function Validate(endpoint) { return endpoint.interface === 3; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-3.png"; }
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
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		/*
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"100", "type":"number", "min":"200", "max":"18000", "default":"800", live:"false"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"100", "type":"number", "min":"200", "max":"18000", "default":"1600", live:"false"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"100", "type":"number", "min":"200", "max":"18000", "default":"2400", live:"false"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"100", "type":"number", "min":"200", "max":"18000", "default":"4800", live:"false"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"100", "type":"number", "min":"200", "max":"18000", "default":"6400", live:"false"},
		*/
	];
}

const vLedNames = [
	"Scroll Zone",
];

const vLedPositions = [
	[0, 0],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

let savedDpi1;
let savedDpi2;
let savedDpi3;
let savedDpi4;
let savedDpi5;

export function Initialize() {
	device.write([0x00, 0x09], 65);
}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

/*
export function onDpiControlChanged() {
	if(DpiControl) {
		setDpi(1);
	}
}

export function ondpi1Changed() {
	if(savedDpi1 !== dpi1 && DpiControl) {
		setDpi(1);
	}
}

export function ondpi2Changed() {
	if(savedDpi2 !== dpi2 && DpiControl) {
		setDpi(2);
	}
}

export function ondpi3Changed() {
	if(savedDpi3 !== dpi3 && DpiControl) {
		setDpi(3);
	}
}

export function ondpi4Changed() {
	if(savedDpi4 !== dpi4 && DpiControl) {
		setDpi(4);
	}
}

export function ondpi5Changed() {
	if(savedDpi5 !== dpi5 && DpiControl) {
		setDpi(5);
	}
}
*/
function sendColors(overrideColor) {

	const RGBData = [];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++){
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		RGBData[iIdx]	= color[0];
		RGBData[iIdx+1]	= color[1];
		RGBData[iIdx+2]	= color[2];

	}

	device.write([0x00, 0x13, 0x01].concat(RGBData), 65);
}

/*

// Disable disabled, doing 1:1 commands and the device still doesn't apply it
function setDpi(currentStage = 1){

	savedDpi1 = dpi1;
	savedDpi2 = dpi2;
	savedDpi3 = dpi3;
	savedDpi4 = dpi4;
	savedDpi5 = dpi5;

	device.write([0x00, 0x20, 0x05, currentStage, Math.floor(dpi1/100), 0x00, Math.floor(dpi2/100), 0x00, Math.floor(dpi3/100), 0x00, Math.floor(dpi4/100), 0x00, Math.floor(dpi5/100)], 65);

	device.write([0x00, 0xA0], 65);
	device.pause(1);

	device.write([0x00, 0xE8], 65);
	device.pause(1);

	device.write([0x00, 0xAA, 0x01], 65);
	device.pause(1);

	device.write([0x00, 0xE8], 65);
	device.pause(1);

	device.log("DPI levels set to: " + dpi1 + ", " + dpi2 + ", " + dpi3 + ", " + dpi4 + ", " + dpi5);
}
*/

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
