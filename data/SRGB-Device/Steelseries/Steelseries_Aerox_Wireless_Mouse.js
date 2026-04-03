export function Name() { return "SteelSeries Aerox Mouse"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return Object.keys(Aerox.deviceDictionary); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
export function Validate(endpoint) { return endpoint.interface === 3; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/mouse.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
smartIllumination:readonly
highEfficiencyMode:readonly
settingControl:readonly
dpiStages:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
sleepTimeout:readonly
dimTimeout:readonly
pollingRate:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"settingControl", "group":"mouse", "label":"Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpiStages", "group":"mouse", "label":"Number of DPI Stages", description: "Sets the number of active DPI stages to cycle though", "step":"1", "type":"number", "min":"1", "max":"5", "default":"5"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"200", "max":"18000", "default":"800", "live" : "false"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"200", "max":"18000", "default":"1200", "live" : "false"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"200", "max":"18000", "default":"2400", "live" : "false"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"200", "max":"18000", "default":"3200", "live" : "false"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"200", "max":"18000", "default":"4800", "live" : "false"},
		{"property":"smartIllumination", "group":"lighting", "label":"Enable Smart Illumination", description: "This setting will turn-off LEDs while the mouse is being moved to conserve battery life", "type":"boolean", "default":"false", "tooltip":"Smart Illumination Turns Off Lighting When the Mouse is in Motion to Preserve Battery."},
		{"property":"highEfficiencyMode", "group":"lighting", "label":"Enable High Efficiency Mode", description: "This settings will force enable 'Smart Illumination' and lower the polling rate and LEDs dimmer time", "type":"boolean", "default":"false", "tooltip":"High Efficiency Mode lowers Polling Rate, Enables Smart Illumination, and lowers the Light Dim Timer to Preserve Battery."},
		{"property":"sleepTimeout", "group":"mouse", "label":"Sleep Timeout (Minutes)", description: "Enables the device to enter sleep mode", "step":"1", "type":"number", "min":"0", "max":"20", "default":"10"},
		{"property":"dimTimeout", "group":"mouse", "label":"Dim Timeout (Minutes)", description: "Sets the amount of time in minutes on idle before the device enters the dim mode", "step":"1", "type":"number", "min":"0", "max":"20", "default":"10"},
		{"property":"pollingRate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":[ "1000", "500", "250", "125" ], "default":"1000"},
	]; //This mouse does really unreliable things and needs some more love/investigation.
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
	device.set_endpoint(3, 0x0001, 0xffc0);
	device.addFeature("battery");

	const config = Aerox.deviceDictionary[device.productId()];
	device.setName(config.name);
	device.setImageFromUrl(config.image);

	getDeviceBatteryStatus();

	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}

}

export function Render() {
	sendColors();
	getDeviceBatteryStatus();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function onsettingControlChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function ondpiStagesChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function ondpi1Changed() {
	if(settingControl) {
		Aerox.setDPI(dpiStages, 1);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function ondpi2Changed() {
	if(settingControl) {
		Aerox.setDPI(dpiStages, 2);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function ondpi3Changed() {
	if(settingControl) {
		Aerox.setDPI(dpiStages, 3);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}
export function ondpi4Changed() {
	if(settingControl) {
		Aerox.setDPI(dpiStages, 4);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function ondpi5Changed() {
	if(settingControl) {
		Aerox.setDPI(dpiStages, 5);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function onpollingRateChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function onsleepTimeoutChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function ondimTimeoutChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function onsmartIlluminationChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

export function onhighEfficiencyModeChanged() {
	if(settingControl) {
		Aerox.setDPI(dpiStages);
		Aerox.setSleepTimeout(sleepTimeout);
		Aerox.setHighEfficiencyMode(highEfficiencyMode);
	}
}

const PollModeInternal = 15000;
let savedPollTimer = Date.now();

function getDeviceBatteryStatus() {
	if (Date.now() - savedPollTimer < PollModeInternal) {
		return;
	}

	savedPollTimer = Date.now();

	Aerox.getBatteryInfo();
}

function sendColors(overrideColor) {
	for(let iIdx = 0; iIdx < 3; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];

		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		device.write([0x00, 0x61, 0x01, iIdx, color[0], color[1], color[2]], 65);

		const returnPacket = device.read([0x00, 0x61, 0x01, iIdx, color[0], color[1], color[2]], 65);

		if(returnPacket[1] === 0x40) { device.log("No connection?"); device.pause(1000); }

		device.pause(1);
	}

	device.pause(10);
}

class AeroxMouse {
	constructor() {
		this.pollingDict =
		{
			"125" : 0x03,
			"250" : 0x02,
			"500" : 0x01,
			"1000" : 0x00,
		};

		//These are all wireless Mice. The Wired Only Mice need a separate file.
		this.deviceDictionary = {
			0x1838 : {
				name: "Steelseries Aerox 3",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-3.png"
			},
			0x183A : {
				name: "Steelseries Aerox 3",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-3.png"
			},
			0x1852 : {
				name: "Steelseries Aerox 5",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5.png"
			},
			0x1854 : {
				name: "Steelseries Aerox 5",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5.png"
			},
			0x1860 : {
				name: "Steelseries Aerox 5 Diablo IV Edition",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5-diablo-4-edition.png"
			},
			0x233a : {
				name: "Steelseries Aerox 5 Diablo IV Edition",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5-diablo-4-edition.png"
			},
			0x185C : {
				name: "Steelseries Aerox 5 Lightfall Edition",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5-lightfall-edition.png"
			},
			0x185E : {
				name: "Steelseries Aerox 5 Lightfall Edition",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-5-lightfall-edition.png"
			},
			0x1858 : {
				name: "Steelseries Aerox 9",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-9.png"
			},
			0x185A : {
				name: "Steelseries Aerox 9",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-9.png"
			},
			0x1876 : {
				name: "Steelseries Aerox 9 WOW Edition",
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mice/aerox-9-wow.png"
			},
		};
	}

	getBatteryInfo() {
		device.clearReadBuffer();

		device.write([0x00, 0xD2], 65);
		device.pause(1);

		const returnpacket = device.read([0x00, 0xD2], 65, 10);

		const batteryPercentage = ((returnpacket[2] & ~0b10000000) - 1) * 5;

		device.log(batteryPercentage);

		const batteryState = (returnpacket[2] & 0b10000000) === 128;
		device.log(`Battery Charging State ${batteryState}`);

		battery.setBatteryLevel(batteryPercentage);
		battery.setBatteryState(batteryState+1);
	}

	setPollingRate(pollingRate) {
		device.write([0x00, 0x6b, this.pollingDict[pollingRate]], 65);
		device.read([0x00, 0x6b, this.pollingDict[pollingRate]], 65);
		device.pause(20);
	}

	setDPI(dpiStages, currentStage = 1) {
		const packet = [0x00, 0x6D, dpiStages, currentStage, (dpi1/100), (dpi2/100), (dpi3/100), (dpi4/100), (dpi5/100)]; //5 is number of stage
		device.write(packet, 65);
		device.read(packet, 65);
		device.pause(20);
	}

	setSleepTimeout(sleepTimeout) {
		const DeviceSleepTimeout = sleepTimeout * 60 * 1000;
		const byte1 = DeviceSleepTimeout >> 16 & 0xFF;
		const byte2 = DeviceSleepTimeout & 0xFF;
		const byte3 = DeviceSleepTimeout >> 8 & 0xFF;
		const packet = [0x00, 0x69, byte1, byte2, byte3];
		device.write(packet, 65);
		device.read(packet, 65);
		device.pause(20);
	}

	setHighEfficiencyMode(highEfficiencyMode) {
		const packet = [0x00, 0x68, highEfficiencyMode]; //0x00 for off
		device.write(packet, 65);
		device.read(packet, 65);
		this.setLightDimTimer(highEfficiencyMode ? 0x00 : dimTimeout, highEfficiencyMode ? highEfficiencyMode : smartIllumination);
		this.setPollingRate(highEfficiencyMode ? 0x03 : this.pollingDict[pollingRate]);
		device.pause(20);
	}

	setLightDimTimer(dimTimeout, smartIllumination = false) {
		const DeviceDimTimeout = dimTimeout * 60 * 1000;
		const byte1 = DeviceDimTimeout >> 16 & 0xFF;
		const byte2 = DeviceDimTimeout & 0xFF;
		const byte3 = DeviceDimTimeout >> 8 & 0xFF;

		device.write([0x00, 0x63, 0x0f, 0x01, smartIllumination, 0x00, byte1, byte2, byte3], 65);
		device.read([0x00, 0x63, 0x0f, 0x01, smartIllumination, 0x00, byte1, byte2, byte3], 65);
		device.pause(20);
	}

	Apply() {
		const packet = [0x00, 0x51];
		device.write(packet, 65);
		device.read(packet, 65);
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
