export function Name() { return "SteelSeries Aerox Mouse Wired"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return Object.keys(Aerox.deviceDictionary); }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse"}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
settingControl:readonly
dpi1:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"settingControl", "group":"mouse", "label":"Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"200", "max":"12400", "default":"800", "live" : "false"},
	];
}

const vLedNames = [ "Front Zone", "Mid Zone", "Rear Zone" ];

const vLedPositions = [ [1, 0], [1, 1], [1, 2] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	const config = Aerox.deviceDictionary[device.productId()];

	device.setName(config.name);
	device.setImageFromUrl(config.image);

	if(settingControl) {
		Aerox.setDPI(dpi1);
	}

}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function onsettingControlChanged() {
	if(settingControl) {
		Aerox.setDPI(dpi1);
	}
}

export function ondpi1Changed() {
	if(settingControl) {
		Aerox.setDPI(dpi1);
	}
}

function sendColors(overrideColor) {
	const zones = [1, 2, 4];

	for(let iIdx = 0; iIdx < 3; iIdx++){
		const packet = [];
		packet[0x00]  = 0x00;
		packet[0x01]  = 0x21;

		packet[0x02] = zones[iIdx];

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

		const iLedIdx =  3 + iIdx * 3;
		packet[iLedIdx] = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] = color[2];

		device.write(packet, 65);
		device.pause(1);
	}
}

class AeroxMouse {
	constructor() {
		this.deviceDictionary = {
			0x1836 : {
				name: "Steelseries Aerox 3",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-3.png"
			},
			0x1850 : {
				name: "Steelseries Aerox 5",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5.png"
			}
		};
	}

	setDPI(dpi) {
		const packet = [];
		packet[0] = 0x00;
		packet[1] = 0x2D;
		packet[2] = 0x01;
		packet[3] = 0;
		packet[4] = (dpi/50);
		device.write(packet, 65);
	}
}

const Aerox = new AeroxMouse();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 3 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xffC0 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/mice/mouse.png";
}