import DeviceDiscovery from "@SignalRGB/DeviceDiscovery";

export function Name() { return "Razer Mouse"; }
export function VendorId() { return 0x1532; }
export function Documentation() { return "troubleshooting/razer"; }
export function ProductId() { return Object.keys(razerDeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function Type() { return "Hid"; }
export function DefaultPosition() { return [225, 120]; }
export function DefaultScale() { return 15.0; }
export function DeviceType(){return "mouse";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
settingControl:readonly
dpiRollover:readonly
OnboardDPI:readonly
dpiStages:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
dpi6:readonly
pollingRate:readonly
liftOffDistance:readonly
asymmetricLOD:readonly
ScrollMode:readonly
ScrollAccel:readonly
SmartReel:readonly
idleTimeout:readonly
lowPowerPercentage:readonly
*/
export function ControllableParameters() {
	return [
		{ "property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default": "#009bde" },
		{ "property": "OnboardDPI", "group": "mouse", "label": "Save DPI to Onboard Storage", description: "Saves the DPI settings to the device memory", "type": "boolean", "default": "false", "tooltip":"Make DPI settings persist when SignalRGB is closed." },
		{ "property": "pollingRate", "group": "mouse", "label": "Polling Rate", description: "Sets the Polling Rate of this device", "type": "combobox", "values": ["1000", "500", "125"], "default": "1000" },
		{ "property": "liftOffDistance", "group":"mouse", "label":"Lift Off Distance",  description: "Sets the lift off distance so the device can stop detecting inputs", "type":"combobox", "values":["Low", "Middle", "High"], "default":"Middle", "order" : 4},
		{ "property": "asymmetricLOD", "group": "mouse", "label": "Asymmetric Lift Off Distance",  description: "Sets the lift off distance so the device can stop detecting inputs", "type": "boolean", "default": "false" },
	];
}


let savedPollTimer = Date.now();
const PollModeInternal = 15000;
let macroTracker;

export function LedNames() {
	return Razer.getDeviceLEDNames();
}

export function LedPositions() {
	return Razer.getDeviceLEDPositions();
}

export function Initialize() {
	Razer.detectDeviceEndpoint();

	if(Razer.getDeviceInitializationStatus()) {
		deviceConfiguration(); //yay for edge cases without reloading a plugin
	}
}

export function Render() {

	if(!Razer.getDeviceInitializationStatus()) {
		deviceInitialization();

		return;
	}

	detectInputs();

	if (!Razer.Config.deviceSleepStatus) {
		grabColors();
		getDeviceBatteryStatus();
	}

}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	grabColors(color);
	//Razer.setModernMatrixEffect([0x00, 0x00, 0x03]); //Hardware mode baby.
	RazerMouse.setDeviceDPIToHardware();
	Razer.setDeviceMode("Hardware Mode");
}

export function onsettingControlChanged() {
	if (settingControl) {
		DPIHandler.setActiveControl(true);

		deviceInitialization(true); //technically not a wake command, but this sets everything cleanly.
	} else {
		Razer.setDeviceMode("Hardware Mode");
		DPIHandler.setActiveControl(false);
	}
}

export function ondpiStagesChanged() {
	DPIHandler.setMaxStageCount(dpiStages);
}

export function ondpiRolloverChanged() {
	DPIHandler.setRollover(dpiRollover);
}

export function ondpi1Changed() {
	DPIHandler.DPIStageUpdated(1);
}

export function ondpi2Changed() {
	DPIHandler.DPIStageUpdated(2);
}

export function ondpi3Changed() {
	DPIHandler.DPIStageUpdated(3);
}

export function ondpi4Changed() {
	DPIHandler.DPIStageUpdated(4);
}

export function ondpi5Changed() {
	DPIHandler.DPIStageUpdated(5);
}

export function ondpi6Changed() {
	DPIHandler.DPIStageUpdated(6);
}

export function onOnboardDPIChanged() {
	if(settingControl) {
		if (OnboardDPI) {
			Razer.setDeviceMode("Hardware Mode");
			DPIHandler.setActiveControl(false);
			RazerMouse.setDeviceDPI(1, dpiStages, true);
		} else {
			Razer.setDeviceMode("Software Mode");
			device.addFeature("mouse");
			DPIHandler.setActiveControl(true);
			DPIHandler.update();
		}
	}

}

export function onidleTimeoutChanged() {
	if (settingControl) {
		Razer.setDeviceIdleTimeout(idleTimeout);
	}
}

export function onlowPowerPercentageChanged() {
	if (settingControl) {
		Razer.setDeviceLowPowerPercentage(lowPowerPercentage);
	}
}

export function onScrollModeChanged() {
	if (settingControl) {
		RazerMouse.setDeviceScrollMode(ScrollMode);
	}
}

export function onScrollAccelChanged() {
	if (settingControl) {
		RazerMouse.setDeviceScrollAccel(ScrollAccel);
	}
}

export function onSmartReelChanged() {
	if (settingControl) {
		RazerMouse.setDeviceSmartReel(SmartReel);
	}
}

function deviceInitialization(wake = false) {
	if (!wake) {
		device.set_endpoint(Razer.Config.deviceEndpoint[`interface`], Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);
		Razer.getDeviceTransactionID();
	}

	device.set_endpoint(Razer.Config.deviceEndpoint[`interface`], Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);

	if(Razer.getDeviceInitializationStatus()) {
		deviceConfiguration();
	}
}

function deviceConfiguration() {
	Razer.detectSupportedFeatures();
	Razer.setDeviceProperties();
	Razer.setDeviceMacroProperties();
	Razer.setNumberOfLEDs(Razer.getDeviceLEDPositions().length);
	Razer.setSoftwareLightingMode();

	DPIHandler.setMinDpi(200);
	DPIHandler.setMaxDpi(RazerMouse.getMaxDPI());
	DPIHandler.setUpdateCallback(function(dpi) { return RazerMouse.setDeviceSoftwareDPI(dpi); });
	DPIHandler.addProperties();

	if(RazerMouse.getHasSniperButton()) {
		DPIHandler.addSniperProperty();
	}

	DPIHandler.setRollover(dpiRollover);

	if (settingControl) {
		if (OnboardDPI) {
			Razer.setDeviceMode("Hardware Mode");
			DPIHandler.setActiveControl(false);
			RazerMouse.setDeviceDPI(1, dpiStages, true);
			Razer.setDeviceMode("Hardware Mode");
		} else {
			Razer.setDeviceMode("Software Mode");
			DPIHandler.update(); //Yet again I hate edge cases.
		}
	}

	if (settingControl) {
		if (razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]]["hyperscrollWheel"]) {
			RazerMouse.setDeviceScrollMode(ScrollMode);
			RazerMouse.setDeviceScrollAccel(ScrollAccel);
			RazerMouse.setDeviceSmartReel(SmartReel);
		}

		if (razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]]["wireless"]) {
			Razer.setDeviceIdleTimeout(idleTimeout);
			Razer.setDeviceLowPowerPercentage(lowPowerPercentage);
		}

		RazerMouse.setDeviceLOD(asymmetricLOD, liftOffDistance);
		Razer.setDevicePollingRate(pollingRate);

		if (!OnboardDPI) {
			Razer.setDeviceMode("Software Mode");
			DPIHandler.setActiveControl(true);
			DPIHandler.update();
		}
	}
}

function getDeviceBatteryStatus() {
	if (Date.now() - savedPollTimer < PollModeInternal && !Razer.Config.deviceSleepStatus) {
		return;
	}

	savedPollTimer = Date.now();

	if (Razer.Config.SupportedFeatures.BatterySupport) {
		const battstatus = Razer.getDeviceChargingStatus();
		const battlevel = Razer.getDeviceBatteryLevel();

		if (battlevel !== -1) {
			battery.setBatteryState(battstatus);
			battery.setBatteryLevel(battlevel);
		}
	}
}

function detectInputs() {

	device.set_endpoint(1, 0x00000, 0x0001);

	const packet = device.read([0x00], 16, 0);

	const currentMacroArray = packet.slice(1, 10);

	if (Razer.Config.SupportedFeatures.HyperspeedSupport) {
		device.set_endpoint(1, 0x00000, 0x0001, 0x0006);
	} else {
		device.set_endpoint(1, 0x00000, 0x0001, 0x0005);
	}


	const sleepPacket = device.read([0x00], 16, 0);

	if (sleepPacket[0] === 0x05 && sleepPacket[1] === 0x09 && sleepPacket[2] === 0x03) { //additional arg to most likely represent which device it is to the receiver as BWV3 Mini reports 0x02 for byte 3
		device.log(`Device woke from sleep. Reinitializing and restarting render loop.`);
		Razer.Config.deviceSleepStatus = false;
		device.pause(3000);
		deviceInitialization(true);
	}

	if (sleepPacket[0] === 0x05 && sleepPacket[1] === 0x09 && sleepPacket[2] === 0x02) {
		device.log(`Device went to sleep. Suspending render loop until device wakes.`);
		Razer.Config.deviceSleepStatus = true;
	}

	device.set_endpoint(Razer.Config.deviceEndpoint[`interface`], Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);

	if (!macroTracker) { macroTracker = new ByteTracker(currentMacroArray); spawnMacroHelpers(); device.log("Macro Tracker Spawned."); }

	if (packet[0] === 0x04) {

		if (macroTracker.Changed(currentMacroArray)) {
			processInputs(macroTracker.Added(), macroTracker.Removed());
		}
	}
}

function spawnMacroHelpers() {
	if(Razer.getDeviceType() === "Keyboard") {
		device.addFeature("keyboard");
	} else {
		device.addFeature("mouse");
	}
}

function processInputs(Added, Removed) {

	for (let values = 0; values < Added.length; values++) {
		const input = Added.pop();

		if(Razer.getDeviceType() === "Keyboard") {
			processKeyboardInputs(input);
		} else {
			processMouseInputs(input);
		}
	}

	for (let values = 0; values < Removed.length; values++) {
		const input = Removed.pop();

		if(Razer.getDeviceType() === "Keyboard") {
			processKeyboardInputs(input, true);
		} else {
			processMouseInputs(input, true);
		}
	}
}

function processKeyboardInputs(input, released = false) {
	if(input === 0x01) {
		return;
	}

	const eventData = { key : Razer.getInputDict()[input], keyCode : 0, "released": released };
	device.log(`${Razer.getInputDict()[input]} Hit. Release Status: ${released}`);
	keyboard.sendEvent(eventData, "Key Press");
}

function processMouseInputs(input, released = false) {
	if(released) {
		if(input === 0x51) {
			device.log("DPI Clutch Released.");
			DPIHandler.setSniperMode(false);
		} else {
			const eventData = { "buttonCode": 0, "released": true, "name": Razer.getInputDict()[input] };
			device.log(Razer.getInputDict()[input] + " released.");
			mouse.sendEvent(eventData, "Button Press");
		}

		return;
	}

	switch (input) {
	case 0x20:
		device.log("DPI Up");
		DPIHandler.increment();
		break;
	case 0x21:
		device.log("DPI Down");
		DPIHandler.decrement();
		break;

	case 0x51:
		device.log("DPI Clutch Hit.");
		DPIHandler.setSniperMode(true);
		break;
	case 0x52:
		device.log("DPI Cycle Hit.");
		DPIHandler.increment();
		break;
	default:
		const eventData = { "buttonCode": 0, "released": false, "name": Razer.getInputDict()[input] };
		device.log(Razer.getInputDict()[input] + " hit.");
		mouse.sendEvent(eventData, "Button Press");
	}
}

function grabColors(overrideColor) {
	const vLedPositions = Razer.getDeviceLEDPositions();

	if (Razer.getHyperFlux()) {
		const RGBData = [];
		const PadRGBData = [];
		const hyperflux = razerDeviceLibrary.LEDLibrary["Hyperflux Pad"];

		for (let iIdx = 0; iIdx < hyperflux.vLedPositions.length; iIdx++) {

			const iPxX = hyperflux.vLedPositions[iIdx][0];
			const iPxY = hyperflux.vLedPositions[iIdx][1];

			let col;

			if (overrideColor) {
				col = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.subdeviceColor("Hyperflux", iPxX, iPxY);
			}

			const iLedIdx = iIdx * 3;
			PadRGBData[iLedIdx] = col[0];
			PadRGBData[iLedIdx + 1] = col[1];
			PadRGBData[iLedIdx + 2] = col[2];
		}

		for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
			const iPxX = vLedPositions[iIdx][0];
			const iPxY = vLedPositions[iIdx][1];
			let col;

			if (overrideColor) {
				col = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.color(iPxX, iPxY);
			}
			const iLedIdx = (iIdx * 3);
			RGBData[iLedIdx] = col[0];
			RGBData[iLedIdx + 1] = col[1];
			RGBData[iLedIdx + 2] = col[2];
		}

		RGBData.push(...PadRGBData);
		RazerMouse.setMouseLighting(RGBData, 17); //MMM Hardcoding.

	} else {
		const RGBData = [];

		for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
			const iPxX = vLedPositions[iIdx][0];
			const iPxY = vLedPositions[iIdx][1];
			let col;

			if (overrideColor) {
				col = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.color(iPxX, iPxY);
			}
			const iLedIdx = (iIdx * 3);
			RGBData[iLedIdx] = col[0];
			RGBData[iLedIdx + 1] = col[1];
			RGBData[iLedIdx + 2] = col[2];
		}

		if(vLedPositions.length > 0) {
			RazerMouse.setMouseLighting(RGBData);
		}
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [0, 0, 0];

	if (result !== null) {
		colors[0] = parseInt(result[1], 16);
		colors[1] = parseInt(result[2], 16);
		colors[2] = parseInt(result[3], 16);
	}

	return colors;
}

export class deviceLibrary {
	constructor() {

		this.mouseInputDict = {
			0x20 : "DPI Up",
			0x21 : "DPI Down",
			0x22 : "Right Back Button",
			0x23 : "Right Forward Button",
			0x50 : "Profile Button",
			0x51 : "DPI Clutch",
			0x52 : "DPI Cycle",
			0x54 : "Scroll Accel Button"
		};

		this.keyboardInputDict = {
			0x20 : "M1",
			0x21 : "M2",
			0x22 : "M3",
			0x23 : "M4"
		};

		this.PIDLibrary =
		{
			0x006B: "Abyssus Essential",
			0x0065: "Basilisk Essential",
			0x0086: "Basilisk Ultimate",
			0x0088: "Basilisk Ultimate",
			0x0064: "Basilisk",
			0x0085: "Basilisk V2",
			0x0099: "Basilisk V3",
			0x00cb: "Basilisk V3 35K",
			0x00aa: "Basilisk V3 Pro",
			0x00ab: "Basilisk V3 Pro",
			0x00cc: "Basilisk V3 Pro 35K", // Wired
			0x00cd: "Basilisk V3 Pro 35K",
			0x00d6: "Basilisk V3 Pro 35K", // Phantom Green Wired
			0x00d7: "Basilisk V3 Pro 35K", // Phantom Green Wireless
			0x0083: "Basilisk X Hyperspeed",
			0x00b9: "Basilisk V3 X Hyperspeed", //technically V3, but we do not care.
			0x00A3: "Cobra",
			0x00AF: "Cobra Pro", //Wired
			0x00B0: "Cobra Pro", //Wireless
			0x004D: "Deathadder Essential",
			0x005C: "Deathadder Elite",
			0x008C: "Deathadder Mini",
			0x0084: "Deathadder V2",
			0x007C: "Deathadder V2 Pro",
			0x007D: "Deathadder V2 Pro",
			0x00B2: "Deathadder V3",
			0x00B6: "Deathadder V3 Pro",
			0x00B7: "Deathadder V3 Pro",
			0x00C5: "Deathadder V3 Hyperspeed",
			0x0070: "Lancehead",
			0x006f: "Lancehead",
			0x0059: "Lancehead Tournament Edition",
			0x0060: "Lancehead Tournament Edition",
			0x006c: "Mamba Elite",
			0x0073: "Mamba",
			0x0072: "Mamba",
			0x0068: "Mamba Hyperflux",
			0x0069: "Mamba", // From Hyperflux kit
			//0x0046: "Mamba Tournament Edition", I'll come back for you soon.
			0x0093: "Naga Classic Edition",
			0x0053: "Naga Chroma",
			0x008D: "Naga Lefthand",
			0x008F: "Naga Pro",
			0x0090: "Naga Pro",
			0x00a8: "Naga Pro V2",
			0x00a7: "Naga Pro V2",
			0x0067: "Naga Trinity",
			0x0096: "Naga X",
			0x0075: "Turret Mouse",
			0x0094: "Orochi V2",
			0x0091: "Viper 8KHz",
			0x008a: "Viper Mini",
			0x0078: "Viper",
			0x00a6: "Viper V2 Pro",
			0x00a5: "Viper V2 Pro",
			0x00c0: "Viper V3 Pro", // Wired
			0x00c1: "Viper V3 Pro", // Wireless
			0x007A: "Viper Ultimate",
			0x007B: "Viper Ultimate"
		};

		this.LEDLibrary = //I'm tired of not being able to copy paste between files.
		{
			"Abyssus Essential":
			{
				size: [10, 10],
				vLedNames: ["ScrollWheel", "Logo", "SideBarLeft1"],
				vLedPositions: [[5, 0], [7, 5], [0, 1]],
				maxDPI: 12400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/abyssus-essential.png"
			},
			"Basilisk Essential":
			{
				size: [3, 3],
				vLedNames: ["Logo"],
				vLedPositions: [[1, 0]],
				maxDPI: 6400,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-ultimate.png"
			},
			"Basilisk Ultimate":
			{
				size: [7, 15],
				vLedNames: ["ScrollWheel", "Logo", "SideBar1", "SideBar2", "SideBar3", "SideBar4", "SideBar5", "SideBar6", "SideBar7", "SideBar8", "SideBar9", "SideBar10", "SideBar11"],
				vLedPositions: [[3, 3], [3, 14], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [6, 1], [6, 2], [6, 3]],
				maxDPI: 20000,
				wireless: true,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-ultimate.png"
			},
			"Basilisk":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 12400,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-quartz-pink.png"
			},
			"Basilisk V2":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 12400,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-v2.png"
			},
			"Basilisk V3":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scrollwheel", "UnderLeft1", "UnderLeft2", "UnderLeft3", "UnderLeft4", "UnderLeft5", "UnderRight1", "UnderRight2", "UnderRight3", "UnderRight4"],
				vLedPositions: [[3, 5], [3, 1], [1, 1], [0, 2], [0, 3], [0, 4], [2, 6], [4, 6], [5, 3], [6, 2], [6, 1]],
				maxDPI: 26000,
				hyperscrollWheel: true,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-v3.png"
			},
			"Basilisk V3 35K":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scrollwheel", "UnderLeft1", "UnderLeft2", "UnderLeft3", "UnderLeft4", "UnderLeft5", "UnderRight1", "UnderRight2", "UnderRight3", "UnderRight4"],
				vLedPositions: [[3, 5], [3, 1], [1, 1], [0, 2], [0, 3], [0, 4], [2, 6], [4, 6], [5, 3], [6, 2], [6, 1]],
				maxDPI: 35000,
				hyperscrollWheel: true,
				hasSniperButton : true,
				endpoint : { "interface": 3, "usage": 0x0001, "usage_page": 0x000C },
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-v3.png"
			},
			"Basilisk V3 Pro":
			{
				size: [6, 7],
				vLedNames: ["Logo", "Scrollwheel", "UnderLeft1", "UnderLeft2", "UnderLeft3", "UnderLeft4", "UnderLeft5", "UnderBottom", "UnderRight1", "UnderRight2", "UnderRight3", "UnderRight4", "UnderRight5"],
				vLedPositions: [[3, 4], [3, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [3, 6], [4, 4], [5, 3], [5, 2], [5, 1], [5, 0]],
				maxDPI: 30000,
				hyperscrollWheel: true,
				wireless: true,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-v3-pro.png"
			},
			"Basilisk V3 Pro 35K":
			{
				size: [6, 7],
				vLedNames: ["Logo", "Scrollwheel", "UnderLeft1", "UnderLeft2", "UnderLeft3", "UnderLeft4", "UnderLeft5", "UnderBottom", "UnderRight1", "UnderRight2", "UnderRight3", "UnderRight4", "UnderRight5"],
				vLedPositions: [[3, 4], [3, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [3, 6], [4, 4], [5, 3], [5, 2], [5, 1], [5, 0]],
				maxDPI: 35000,
				hyperscrollWheel: true,
				wireless: true,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-v3-pro.png"
			},
			"Basilisk X Hyperspeed":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 16000,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-x-hyperspeed.png"
			},
			"Basilisk V3 X Hyperspeed":
			{
				size: [1, 1],
				vLedNames: ["Scroll"],
				vLedPositions: [[0, 0]],
				maxDPI: 16000,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/basilisk-x-hyperspeed.png"
			},
			"Cobra":
			{
				size: [7, 7],
				vLedNames: ["Logo", "UnderLeft1", "UnderLeft2", "UnderLeft3", "UnderLeft4", "UnderBottom", "UnderRight1", "UnderRight2", "UnderRight3", "UnderRight4"],
				vLedPositions: [[3, 4], [0, 2], [0, 3], [0, 4], [1, 5], [3, 6], [5, 5], [6, 4], [6, 3], [6, 2]],
				maxDPI: 8500,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/cobra.png"
			},
			"Cobra Pro":
			{
				size: [7, 7],
				vLedNames: ["Logo", "Scrollwheel", "UnderLeft1", "UnderLeft2", "UnderLeft3", "UnderLeft4", "UnderBottom", "UnderRight1", "UnderRight2", "UnderRight3", "UnderRight4"],
				vLedPositions: [[3, 4], [3, 0], [0, 2], [0, 3], [0, 4], [1, 5], [3, 6], [5, 5], [6, 4], [6, 3], [6, 2]],
				maxDPI: 30000,
				hyperscrollWheel: false,
				wireless: true,
				hasSniperButton : false,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/cobra-pro.png"
			},
			"Deathadder Essential":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 6400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-elite.png"
			},
			"Deathadder Elite":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[1, 0], [1, 2], [0, 1]],
				maxDPI: 12400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-elite.png"
			},
			"Deathadder Mini":
			{
				size: [3, 3],
				vLedNames: ["Logo"],
				vLedPositions: [[1, 2]],
				maxDPI: 12400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-v2.png"
			},
			"Deathadder V2":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 20000,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-v2.png"
			},
			"Deathadder V2 Pro":
			{
				size: [3, 3],
				vLedNames: ["Logo"],
				vLedPositions: [[1, 2]],
				maxDPI: 20000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-v2-pro.png"
			},
			"Deathadder V3":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 30000,
				wireless: false,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-v3-pro.png"
			},
			"Deathadder V3 Pro":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 30000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-v3-pro.png"
			},
			"Deathadder V3 Hyperspeed":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 26000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-v3-pro.png"
			},
			"Hyperflux Pad":
			{
				size: [4, 5],
				vLedNames: ["Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12"],
				vLedPositions: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]],
				image: ""
			},
			"Lancehead":
			{
				size: [10, 10],
				vLedNames: ["ScrollWheel", "Logo", "SideBarLeft1"],
				vLedPositions: [[5, 0], [7, 5], [0, 1]],
				maxDPI: 12400,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/lancehead-wireless.png"
			},
			"Lancehead Tournament Edition":
			{
				size: [5, 9],
				vLedNames: ["ScrollWheel", "Logo", "Left Side Bar 1", "Left Side Bar 2", "Left Side Bar 3", "Left Side Bar 4", "Left Side Bar 5", "Left Side Bar 6", "Left Side Bar 7", "Right Side Bar 1", "Right Side Bar 2", "Right Side Bar 3", "Right Side Bar 4", "Right Side Bar 5", "Right Side Bar 6", "Right Side Bar 7"],
				vLedPositions: [[2, 0], [2, 8], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]],
				maxDPI: 16000,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/lancehead-tournament-edition.png"
			},
			"Mamba Elite":
			{
				size: [10, 11],
				vLedNames: ["ScrollWheel", "Logo", "SideBarLeft1", "SideBarLeft2", "SideBarLeft3", "SideBarLeft4", "SideBarLeft5", "SideBarLeft6", "SideBarLeft7", "SideBarLeft8", "SideBarLeft9", "SideBarRight1", "SideBarRight2", "SideBarRight3", "SideBarRight4", "SideBarRight5", "SideBarRight6", "SideBarRight7", "SideBarRight8", "SideBarRight9"],
				vLedPositions: [[5, 0], [5, 8], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 7], [0, 8], [0, 9], [0, 10], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 7], [9, 8], [9, 9], [9, 10]],
				maxDPI: 16000,
				requiresApplyPacket : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/mamba-elite.png"
			},
			"Mamba":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 16000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/mamba-standard.png"
			},
			"Mamba Hyperflux":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 16000,
				hyperflux: true,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/mamba-standard.png"
			},
			"Mamba Tournament Edition":
			{
				size: [5, 7],
				vLedNames: ["Left Side Bar 1", "Left Side Bar 2", "Left Side Bar 3", "Left Side Bar 4", "Left Side Bar 5", "Left Side Bar 6", "Left Side Bar 7", "Right Side Bar 1", "Right Side Bar 2", "Right Side Bar 3", "Right Side Bar 4", "Right Side Bar 5", "Right Side Bar 6", "Right Side Bar 7", "Logo", "ScrollWheel"],
				vLedPositions: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [2, 5], [2, 0]],
				maxDPI: 16000,
				requiresApplyPacket : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/mamba-tournament-edition.png"
			},
			"Naga Classic Edition":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[0, 0], [0, 2], [1, 1]],
				maxDPI: 5600,
				requiresApplyPacket : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-chroma.png"
			},
			"Naga Chroma":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[0, 0], [0, 2], [1, 1]],
				maxDPI: 18000,
				requiresApplyPacket : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-chroma.png"
			},
			"Naga Pro":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[1, 0], [1, 2], [0, 1]],
				maxDPI: 18000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-pro.png"
			},
			"Naga Pro V2":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[1, 0], [1, 2], [0, 1]],
				maxDPI: 30000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-v2-pro.png"
			},
			"Naga Lefthand":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[0, 0], [0, 2], [1, 1]],
				maxDPI: 16000,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-lefthand.png"
			},
			"Naga Trinity":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo", "Side Panel"],
				vLedPositions: [[0, 0], [0, 2], [1, 1]],
				maxDPI: 12400,
				requiresApplyPacket : true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-trinity.png"
			},
			"Naga X":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Side Panel"],
				vLedPositions: [[1, 0], [0, 1]],
				maxDPI: 18000,
				endpoint : { "interface": 3, "usage": 0x0001, "usage_page": 0x000C },
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/naga-x.png"
			},
			"Orochi V2":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 18000,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/abyssus-essential.png"
			},
			"Turret Mouse":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo",],
				vLedPositions: [[1, 0], [1, 2]],
				maxDPI: 16000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/turret-mouse.png"
			},
			"Viper 8KHz":
			{
				size: [2, 2],
				vLedNames: ["Mouse"],
				vLedPositions: [[1, 1]],
				maxDPI: 12400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/viper-8khz.png"
			},
			"Viper":
			{
				size: [2, 2],
				vLedNames: ["Mouse"],
				vLedPositions: [[1, 1]],
				maxDPI: 12400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/viper-standard.png"
			},
			"Viper V2 Pro":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 30000,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/viper-v2-pro.png",
			},
			"Viper V3 Pro":
			{
				size: [0, 0],
				vLedNames: [],
				vLedPositions: [],
				maxDPI: 35000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/viper-v3-pro.png",
			},
			"Viper Mini":
			{
				size: [2, 2],
				vLedNames: ["Mouse"],
				vLedPositions: [[1, 1]],
				maxDPI: 12400,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/viper-mini.png"
			},
			"Viper Ultimate":
			{
				size: [2, 2],
				vLedNames: ["Mouse"],
				vLedPositions: [[1, 1]],
				maxDPI: 20000,
				wireless: true,
				image: "https://assets.signalrgb.com/devices/brands/razer/mice/viper-ultimate.png"
			},
		};
	}
}

const razerDeviceLibrary = new deviceLibrary();

export class RazerProtocol {
	constructor() {
		/** Defines for the 3 device modes that a Razer device can be set to. FactoryMode should never be used, but is here as reference. */
		this.DeviceModes = Object.freeze(
			{
				"Hardware Mode": 0x00,
				"Factory Mode": 0x02,
				"Software Mode": 0x03,
				0x00: "Hardware Mode",
				0x02: "Factory Mode",
				0x03: "Software Mode"
			});
		/** Defines for responses coming from a device in response to commands. */
		this.DeviceResponses = Object.freeze(
			{
				0x01: "Device Busy",
				0x02: "Command Success",
				0x03: "Command Failure",
				0x04: "Command Time Out",
				0x05: "Command Not Supported"
			});
		/** These are used to identify what LED zone we're poking at on a device. Makes no difference for RGB Sends as it doesn't work with Legacy devices, but it does tell us what zones a modern device has to some extent.*/
		this.LEDIDs = Object.freeze(
			{
				"Scroll_Wheel": 0x01,
				"Battery": 0x02,
				"Logo": 0x03,
				"Backlight": 0x04,
				"Macro": 0x05, //pretty sure this just screams that it's a keyboard.
				"Game": 0x06,
				"Underglow": 0x0A,
				"Red_Profile": 0x0C,
				"Green_Profile": 0x0D,
				"Blue_Profile": 0x0E,
				"Unknown6": 0x0F,
				"Right_Side_Glow": 0x10,
				"Left_Side_Glow": 0x11,
				"Charging": 0x20,
				0x01: "Scroll_Wheel",
				0x02: "Battery",
				0x03: "Logo",
				0x04: "Backlight",
				0x05: "Macro",
				0x06: "Game",
				0x0A: "Underglow",
				0x0C: "Red_Profile",
				0x0D: "Green_Profile",
				0x0E: "Blue_Profile",
				0x0F: "Unknown6",
				0x10: "Right_Side_Glow",
				0x11: "Left_Side_Glow",
				0x20: "Charging"
			});

		this.Config =
		{
			/** ID used to tell which device we're talking to. Most devices have a hardcoded one, but hyperspeed devices can have multiple if a dongle has multiple connected devices. */
			TransactionID: 0x1f,
			/** @type {number[]} Reserved for Hyperspeed Pairing. Holds additional Transaction ID's for extra paired hyperspeed devices.*/
			AdditionalDeviceTransactionIDs: [],
			/** Stored Firmware Versions for Hyperspeed dongles. We're keeping an array here in case a device has two nonconsecutive transaction ID's. @type {number[]} */
			AdditionalDeviceFirmwareVersions: [],
			/** @type {string[]} Stored Serials for Hyperspeed dongles. */
			AdditionalDeviceSerialNumbers: [],
			/** Variable to indicate how many LEDs a device has, used in the color send packet for mice. Does not apply for keyboards. */
			NumberOfLEDs: -1,
			/** Variable to indicate how many leds should be sent per packet. */
			LEDsPerPacket: -1,
			/** Variable to indicate what type of device is connected. */
			DeviceType: "Mouse", //Default to mouse. Also this won't work with hyperspeed.
			/** Variable to indicate if a device supports above 1000Hz polling. */
			HighPollingRateSupport: false,
			/** Stored Serial Number to compare against for hyperspeed dongles. We'll update this each time so that we find any and all devices.@type {number[]} */
			LastSerial: [],
			/** Array to hold discovered legacy led zones. */
			LegacyLEDsFound: [],
			/** Object for the device endpoint to use. Basilisk V3 Uses interface 3 because screw your standardization. */
			deviceEndpoint: { "interface": 0, "usage": 0x0002, "usage_page": 0x0001 },
			/** Bool to handle render suspension if device is sleeping. */
			deviceSleepStatus: false,
			/** Variable that holds current device's LED Names. */
			DeviceLEDNames : [],
			/** Variable that holds current device's LED Positions. */
			DeviceLEDPositions : [],
			/** Variable that holds current device's LED vKeys. */
			DeviceLedIndexes : [],
			/** Variable that holds the current device's Product ID. */
			DeviceProductId : 0x00,
			/** Dict for button inputs to map them with names and things. */
			inputDict : {},
			/** Is the device connected and able to receive commands? */
			DeviceInitialized : false,
			/** Variable Used to Indicate if a Device Requires an Apply Packet for Lighting Data. */
			requiresApplyPacket : false,
			/** Variable Used to Indicate if a Device Uses the Standard Modern Matrix. */
			supportsModernMatrix : false,

			SupportedFeatures:
			{
				BatterySupport: false,
				DPIStageSupport: false,
				PollingRateSupport: false,
				FirmwareVersionSupport: false,
				SerialNumberSupport: false,
				DeviceModeSupport: false,
				HyperspeedSupport: false,
				ScrollAccelerationSupport: false,
				ScrollModeSupport: false,
				SmartReelSupport: false,
				IdleTimeoutSupport: false,
				LowPowerPercentage: false,
				Hyperflux: false
			}
		};
	}

	getDeviceInitializationStatus() { return this.Config.DeviceInitialized; }
	setDeviceInitializationStatus(initStatus) { this.Config.DeviceInitialized = initStatus; }

	getDeviceProductId() { return this.Config.DeviceProductId; }
	setDeviceProductId(productId) { this.Config.DeviceProductId = productId; }

	getDeviceLEDNames(){ return this.Config.DeviceLEDNames; }
	setDeviceLEDNames(DeviceLEDNames) { this.Config.DeviceLEDNames = DeviceLEDNames; }

	getDeviceLEDPositions(){ return this.Config.DeviceLEDPositions; }
	setDeviceLEDPositions(DeviceLEDPositions){ this.Config.DeviceLEDPositions = DeviceLEDPositions; }

	getDeviceLEDIndexes(){ return this.Config.DeviceLedIndexes; }
	setDeviceLEDIndexes(DeviceLedIndexes){ this.Config.DeviceLedIndexes = DeviceLedIndexes; }

	getRequiresApplyPacket() { return this.Config.requiresApplyPacket; }
	setRequiresApplyPacket(requiresApplyPacket) { this.Config.requiresApplyPacket = requiresApplyPacket; }

	getHyperFlux() { return this.Config.SupportedFeatures.Hyperflux; }
	setHyperFlux(HyperFlux) { this.Config.SupportedFeatures.Hyperflux = HyperFlux; }
	/** Function to set our TransactionID*/
	setTransactionID(TransactionID) { this.Config.TransactionID = TransactionID; }

	getDeviceType() { return this.Config.DeviceType; }
	setDeviceType(DeviceType) { this.Config.DeviceType = DeviceType; }

	getInputDict() { return this.Config.inputDict; }
	setInputDict(InputDict) { this.Config.inputDict = InputDict; }

	getSupportsModernMatrix() { return this.Config.supportsModernMatrix; }
	setSupportsModernMatrix(supportsModernMatrix) { this.Config.supportsModernMatrix = supportsModernMatrix; }

	getDeviceImage(){ return this.Config.DeviceImage; }
	setDeviceImage(DeviceImage) { this.Config.DeviceImage = DeviceImage; }

	getNumberOfLEDs() { return this.Config.NumberOfLEDs; }
	/** Function for setting the number of LEDs a device has on it.*/
	setNumberOfLEDs(NumberOfLEDs) { this.Config.NumberOfLEDs = NumberOfLEDs; }
	/** Function for setting device led properties.*/
	setDeviceProperties() {
		const layout = razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]];

		if (layout) {
			device.log("Valid Library Config found: " + razerDeviceLibrary.PIDLibrary[device.productId()]);
			device.setName("Razer " + razerDeviceLibrary.PIDLibrary[device.productId()]);
			device.setSize(layout.size);

			this.setDeviceLEDNames(layout.vLedNames);
			this.setDeviceLEDPositions(layout.vLedPositions);
			this.setDeviceProductId(device.productId()); //yay edge cases!
			this.setDeviceImage(layout.image);
			device.setImageFromUrl(this.getDeviceImage());

			if(layout.wireless){
				device.addProperty({ "property": "idleTimeout", "group": "", "label": "Device Idle Timeout Length (S)", "step": "1", "type": "number", "min": "1", "max": "15", "default": "5", "live" : false });
				device.addProperty({ "property": "lowPowerPercentage", "group": "", "label": "Device Low Power Mode Percentage", "step": "1", "type": "number", "min": "1", "max": "100", "default": "15", "live" : false });
			}

			if(layout.hyperscrollWheel){
				device.addProperty({ "property": "ScrollMode", "group": "mouse", "label": "Freespin Scrolling", "type": "boolean", "default": "false" });
				device.addProperty({ "property": "ScrollAccel", "group": "mouse", "label": "Scroll Acceleration", "type": "boolean", "default": "true" });
				device.addProperty({ "property": "SmartReel", "group": "mouse", "label": "Smart-Reel", "type": "boolean", "default": "false" });
			}

			if(layout.vKeys) {
				this.setDeviceLEDIndexes(layout.vKeys);
			}

			if(layout.DeviceType) {
				this.setDeviceType(layout.DeviceType);
			}

			if(layout.maxDPI) {
				device.log(`Max DPI: ${layout.maxDPI}`);
				RazerMouse.setMaxDPI(layout.maxDPI);
			}

			if(layout.hasSniperButton) {
				device.log("Device has Sniper Button.");
				RazerMouse.setHasSniperButton(layout.hasSniperButton);
			}

			if(layout.requiresApplyPacket) {
				device.log("Device Requires Apply Packet");
				this.setRequiresApplyPacket(layout.requiresApplyPacket);
			}

		} else {
			device.log("No Valid Library Config found.");
		}

		device.setControllableLeds(this.getDeviceLEDNames(), this.getDeviceLEDPositions());
		this.getDeviceLEDZones();

		if (layout.hyperflux) { this.setHyperFluxProperties(); }
	}
	setDeviceMacroProperties() {
		if (this.getDeviceType() === "Keyboard") {
			this.setInputDict(razerDeviceLibrary.keyboardInputDict);
		} else {
			this.setInputDict(razerDeviceLibrary.mouseInputDict);
		}
	}
	setHyperFluxProperties() {
		device.log("Device has a Hyperflux Pad!");
		this.setHyperFlux(true);

		const hyperflux = razerDeviceLibrary.LEDLibrary["Hyperflux Pad"];

		device.createSubdevice("Hyperflux");
		device.setSubdeviceName("Hyperflux", `Hyperflux Mousepad`);

		if (hyperflux.size[0] !== undefined && hyperflux.size[1] !== undefined) {
			device.setSubdeviceSize("Hyperflux", hyperflux.size[0], hyperflux.size[1]);
		}

		device.setSubdeviceLeds("Hyperflux", hyperflux.vLedNames, hyperflux.vLedPositions);
	}
	/* eslint-disable complexity */
	/** Function for detection all of the features that a device supports.*/
	detectSupportedFeatures() { //This list is not comprehensive, but is a good start.
		const BatterySupport = this.getDeviceBatteryLevel();

		if (BatterySupport !== -1) {
			this.Config.SupportedFeatures.BatterySupport = true;
			device.addFeature("battery");
		}
		const DPIStageSupport = RazerMouse.getDeviceDPIStages();

		if (DPIStageSupport !== -1) {
			this.Config.SupportedFeatures.DPIStageSupport = true;
		}
		const PollingRateSupport = this.getDevicePollingRate();

		if (PollingRateSupport !== -1) {
			this.Config.SupportedFeatures.PollingRateSupport = true;
		}
		const FirmwareVersionSupport = this.getDeviceFirmwareVersion();

		if (FirmwareVersionSupport !== -1) {
			this.Config.SupportedFeatures.FirmwareVersionSupport = true;
		}
		const SerialNumberSupport = this.getDeviceSerial();

		if (SerialNumberSupport !== -1) {
			this.Config.SupportedFeatures.SerialNumberSupport = true;
		}
		const DeviceModeSupport = this.getDeviceMode();

		if (DeviceModeSupport !== -1) {
			this.Config.SupportedFeatures.DeviceModeSupport = true;
		}
		const HyperspeedSupport = this.getCurrentlyConnectedDongles();

		if (HyperspeedSupport !== -1) {
			this.Config.SupportedFeatures.HyperspeedSupport = true;
		}
		const ScrollAccelerationSupport = RazerMouse.getDeviceScrollAccel();

		if (ScrollAccelerationSupport !== -1) {
			this.Config.SupportedFeatures.ScrollAccelerationSupport = true;
		}
		const ScrollModeSupport = RazerMouse.getDeviceScrollMode();

		if (ScrollModeSupport !== -1) {
			this.Config.SupportedFeatures.ScrollModeSupport = true;
		}
		const SmartReelSupport = RazerMouse.getDeviceSmartReel();

		if (SmartReelSupport !== -1) {
			this.Config.SupportedFeatures.SmartReelSupport = true;
		}
		const IdleTimeoutSupport = this.getDeviceIdleTimeout();

		if (IdleTimeoutSupport !== -1) {
			this.Config.SupportedFeatures.IdleTimeoutSupport = true;
		}

		const lowBatteryPercentageSupport = this.getDeviceLowPowerPercentage();

		if(lowBatteryPercentageSupport !== -1) {
			this.Config.SupportedFeatures.LowPowerPercentage = true;
		}
	}
	/* eslint-enable complexity */
	/** Function to Detect if we have a Basilisk V3 Attached. */
	detectDeviceEndpoint() {//Oh look at me. I'm a basilisk V3. I'm special

		const deviceEndpoints = device.getHidEndpoints();
		const devicePID = device.productId();

		const layout = razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]];

		for (let endpoints = 0; endpoints < deviceEndpoints.length; endpoints++) {
			const endpoint = deviceEndpoints[endpoints];

			if (endpoint) {
				if(layout.endpoint) {
					this.Config.deviceEndpoint[`interface`] = layout.endpoint[`interface`];
					this.Config.deviceEndpoint[`usage`] = layout.endpoint[`usage`];
					this.Config.deviceEndpoint[`usage_page`] = layout.endpoint[`usage_page`];

					return; //If we found one in the config table, no reason to check for the Basilisk V3.
				}

				if (endpoint[`interface`] === 3 && devicePID === 0x0099) {
					this.Config.deviceEndpoint[`interface`] = endpoint[`interface`];
					this.Config.deviceEndpoint[`usage`] = endpoint[`usage`];
					this.Config.deviceEndpoint[`usage_page`] = endpoint[`usage_page`];
					device.log("Basilisk V3 Found.");
				}
			}
		}
	}
	/** Wrapper function for Writing Config Packets without fetching a response.*/
	ConfigPacketSendNoResponse(packet, TransactionID = this.Config.TransactionID) {
		this.StandardPacketSend(packet, TransactionID);
		device.pause(10);
	}
	/** Wrapper function for Writing Config Packets and fetching a response.*/
	/** @returns {[number[], number]} */
	ConfigPacketSend(packet, TransactionID = this.Config.TransactionID) {
		this.StandardPacketSend(packet, TransactionID);
		device.pause(10);

		const returnPacket = this.ConfigPacketRead();
		let errorCode = 0;

		if (returnPacket[0] !== undefined) {
			errorCode = returnPacket[0];
		}

		return [returnPacket, errorCode];
	}
	/** Wrapper function for Reading Config Packets.*/
	ConfigPacketRead(TransactionID = this.Config.TransactionID) {
		let returnPacket = [];

		returnPacket = device.get_report([0x00, 0x00, TransactionID], 91);

		return returnPacket.slice(1, 90);
	}
	/** Wrapper function for Writing Standard Packets, such as RGB Data.*/
	StandardPacketSend(data, TransactionID = this.Config.TransactionID) {//Wrapper for always including our CRC
		let packet = [0x00, 0x00, TransactionID, 0x00, 0x00, 0x00];
		packet = packet.concat(data);
		packet[89] = this.CalculateCrc(packet);
		device.send_report(packet, 91);
	}
	/**Razer Specific CRC Function that most devices require.*/
	CalculateCrc(report) {
		let iCrc = 0;

		for (let iIdx = 3; iIdx < 89; iIdx++) {
			iCrc ^= report[iIdx];
		}

		return iCrc;
	}
	/**Function to grab a device's transaction ID using the serial mumber command.*/
	getDeviceTransactionID() {//Most devices return at minimum 2 Transaction ID's. We throw away any besides the first one.
		const possibleTransactionIDs = [0x1f, 0x2f, 0x3f, 0x4f, 0x5f, 0x6f, 0x7f, 0x8f, 0x9f];
		let devicesFound = 0;
		let loops = 0;

		do {
			for (let testTransactionID = 0x00; testTransactionID < possibleTransactionIDs.length; testTransactionID++) {
				const TransactionID = possibleTransactionIDs[testTransactionID];
				const packet = [0x02, 0x00, 0x82];

				const [returnPacket, errorCode] = this.ConfigPacketSend(packet, TransactionID);

				if (errorCode !== 2) {

					device.log("Error fetching Device Charging Status. Error Code: " + this.DeviceResponses[errorCode]);
				}

				const Serialpacket = returnPacket.slice(8, 23);

				if (Serialpacket.every(item => item !== 0)) {
					const SerialString = String.fromCharCode(...Serialpacket);

					devicesFound = this.checkDeviceTransactionID(TransactionID, SerialString, devicesFound);
					this.ConfigPacketRead(TransactionID);
				}

				if(devicesFound !== 0) {
					this.setDeviceInitializationStatus(true);
				}

				device.pause(400);
			}

			loops++;
		}
		while (devicesFound === 0 && loops < 5);
	}
	/**Function to ensure that a grabbed transaction ID is not for a device we've already found a transaction ID for.*/
	checkDeviceTransactionID(TransactionID, SerialString, devicesFound) {
		device.log(`Serial String ${SerialString}`);

		if (SerialString.length === 15 && devicesFound === 0) {
			this.Config.TransactionID = TransactionID;
			devicesFound++;
			device.log("Valid Serial Returned:" + SerialString);
			this.Config.LastSerial = SerialString; //Store a serial to compare against later.
		} else if (SerialString.length === 15 && devicesFound > 0 && this.Config.LastSerial !== SerialString) {
			if (SerialString in this.Config.AdditionalDeviceSerialNumbers) { return devicesFound; } //This deals with the edge case of a device having nonconcurrent transaction ID's. We skip this function if the serials match.

			device.log("Multiple Devices Found, Assuming this is a Hyperspeed Dongle and has more than 1 device connected.");
			this.Config.SupportedFeatures.HyperspeedSupport = true;
			this.Config.AdditionalDeviceTransactionIDs.push(TransactionID);
			device.log("Valid Serial Returned:" + SerialString);
			this.Config.AdditionalDeviceSerialNumbers.push(SerialString);
			this.Config.LastSerial = SerialString; //Store a serial to compare against later.
		}

		return devicesFound;
	}
	/** Function to check if a device is charging or discharging. */
	getDeviceChargingStatus() {
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x07, 0x84]);

		if (errorCode !== 2) {

			device.log("Error fetching Device Charging Status. Error Code: " + this.DeviceResponses[errorCode]);

			return -1;
		}

		if (returnPacket !== undefined) {
			const batteryStatus = returnPacket[9];

			device.log("Charging Status: " + batteryStatus);

			if (batteryStatus === undefined || batteryStatus > 1 || batteryStatus < 0) {
				device.log(`Error fetching Device Charging Status. Device returned out of spec response. Response: ${batteryStatus}`);

				return -1;
			}

			return batteryStatus + 1;
		}

		return -1;
	}
	/** Function to check a device's battery percentage.*/
	getDeviceBatteryLevel(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			[returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x07, 0x80]);

			if(errorCode !== 2) {
			   device.pause(10);
			   attempts++;
			}
	   }

	   while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Device Battery Level. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {
			if (returnPacket[9] !== undefined) {

				const batteryLevel = Math.floor(((returnPacket[9]) * 100) / 255);

				if(batteryLevel > 0) {
					device.log("Device Battery Level: " + batteryLevel);

					return batteryLevel;
				}

				return -1;
			}

			return -1;
		}

		return -1;
	}
	/** Function to fetch a device's serial number. This serial is the same as the one printed on the physical device.*/
	getDeviceSerial(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = this.ConfigPacketSend([0x16, 0x00, 0x82]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Device Serial. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {

			const Serialpacket = returnPacket.slice(8, 23);
			const SerialString = String.fromCharCode(...Serialpacket);

			device.log("Device Serial: " + SerialString);

			return SerialString;
		}

		return -1;
	}
	/** Function to check a device's firmware version.*/
	getDeviceFirmwareVersion(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x00, 0x81]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Device Firmware Version. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {
			const FirmwareByte1 = returnPacket[8];
			const FirmwareByte2 = returnPacket[9];
			device.log("Firmware Version: " + FirmwareByte1 + "." + FirmwareByte2);

			return [FirmwareByte1, FirmwareByte2];
		}


		return -1;
	}
	/** Function to fetch all of a device's LED Zones.*/
	getDeviceLEDZones() {
		const activeZones = [];

		for (let zones = 0; zones < 30; zones++) {
			RazerMouse.setModernMouseLEDBrightness(100, 0, true);

			const ledExists = RazerMouse.getModernMouseLEDBrightness(zones, true); //iirc main reason I use this is that it only applies to mice?


			if (ledExists === 100) {
				device.log(`LED Zone ${this.LEDIDs[zones]} Exists`, { toFile: true });
				activeZones.push(zones);

			}

		}

		if (activeZones.length > 0) {
			device.log("Device uses Modern Protocol for Lighting.", { toFile: true });

			return activeZones;
		}

		return -1; //Return -1 if we have no zones. I.E. device has no led zones 💀
	}
	/** Function to check if a device is in Hardware Mode or Software Mode. */
	getDeviceMode(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x00, 0x84]); //2,3,1

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Mode. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[8] !== undefined) {
			const deviceMode = returnPacket[8];
			device.log("Current Device Mode: " + this.DeviceModes[deviceMode]);

			return deviceMode;
		}

		return -1;
	}
	/** Function to set a device's mode between hardware and software.*/
	setDeviceMode(mode, retryAttempts = 5) {
		let errorCode = 0;
		let attempts = 0;

		do {
			const returnValues = this.ConfigPacketSend([0x02, 0x00, 0x04, this.DeviceModes[mode]]); //2,3,1
			errorCode = returnValues[1];

			if(errorCode !== 2) {
			   device.pause(10);
			   attempts++;
			}
	   }

	   while(errorCode !== 2 && attempts < retryAttempts);


		if (errorCode !== 2) {

			device.log("Error Setting Device Mode. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return this.getDeviceMode(); //Log device mode after switching modes.
	}
	/** Function to fetch what battery percentage a device will enter low power mode at.*/
	getDeviceLowPowerPercentage(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = this.ConfigPacketSend([0x01, 0x07, 0x81]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Device Low Power Percentage. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[8] !== undefined) {
			const lowPowerPercentage = Math.ceil((returnPacket[8]*100)/255);
			device.log(`Low Battery Mode Percentage: ${lowPowerPercentage}%`);

			return lowPowerPercentage;
		}

		return -1;
	}
	/** Function to set at what battery percentage a device will enter low power mode.*/
	setDeviceLowPowerPercentage(lowPowerPercentage, retryAttempts = 5) {
		let errorCode = 0;
		let attempts = 0;

		do {
			const returnValues = this.ConfigPacketSend([0x01, 0x07, 0x01, Math.floor(((lowPowerPercentage) * 255) / 100)]);
			errorCode = returnValues[1];

			if(errorCode !== 2) {
			   device.pause(10);
			   attempts++;
			}
	   }

	   while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error setting Device Low Power Percentage. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to fetch a device's polling rate. We do not currently parse this at all.*/
	getDevicePollingRate() {
		let pollingRate;
		const [returnPacket, errorCode] = Razer.ConfigPacketSend([0x01, 0x00, 0x85]);

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Polling Rate. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[8] !== 0 && returnPacket[8] !== undefined) {
			pollingRate = returnPacket[8];
			device.log("Polling Rate: " + 1000 / pollingRate + "Hz", { toFile: true });

			return pollingRate;
		}
		const [secondaryreturnPacket, secondaryErrorCode] = Razer.ConfigPacketSend([0x01, 0x00, 0xC0]);

		if (secondaryErrorCode !== 2) {

			device.log("Error fetching Current Device High Polling Rate. Error Code: " + secondaryErrorCode, { toFile: true });

			if (secondaryErrorCode === 1) {
				return -1;
			}

			return -1;
		}

		if (secondaryreturnPacket[9] !== 0 && secondaryreturnPacket[9] !== undefined) {
			pollingRate = secondaryreturnPacket[9];
			device.log("Polling Rate: " + 8000 / pollingRate + "Hz", { toFile: true });
			this.Config.HighPollingRateSupport = true;

			return pollingRate;
		}

		return -1;
	}
	/** Function to set a device's polling rate.*/
	setDevicePollingRate(pollingRate) {
		if (this.Config.HighPollingRateSupport) {
			return this.setDeviceHighPollingRate(pollingRate);
		}

		return this.setDeviceStandardPollingRate(pollingRate);
	}
	/** Function to set a device's polling rate on devices supporting 1000hz polling rates.*/
	setDeviceStandardPollingRate(pollingRate) {
		const returnValues = this.ConfigPacketSend([0x01, 0x00, 0x05, 1000 / pollingRate]);
		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Polling Rate. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to set a device's polling rate on devices supporting above 1000hz polling rate.*/
	setDeviceHighPollingRate(pollingRate) {
		const returnValues = this.ConfigPacketSend([0x02, 0x00, 0x40, 0x00, 8000 / pollingRate]); //Most likely onboard saving and current. iirc if you save things to flash they don't apply immediately.
		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Polling Rate. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}
		const secondaryReturnValues = this.ConfigPacketSend([0x02, 0x00, 0x40, 0x01, 8000 / pollingRate]);
		const secondaryErrorCode = secondaryReturnValues[1];

		if (secondaryErrorCode !== 2) {

			device.log("Error fetching Current Device Polling Rate. Error Code: " + secondaryErrorCode, { toFile: true });

			if (secondaryErrorCode === 1) {
				return -1;
			}

			return -1;
		}

		return 0;
	}
	/** Function to fetch the device idle timeout on supported devices. */
	getDeviceIdleTimeout() {
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x07, 0x83]);

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Idle Timeout Setting. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[8] !== undefined && returnPacket[9] !== undefined) {
			const idleTimeout = BinaryUtils.ReadInt16BigEndian([returnPacket[8], returnPacket[9]]);
			device.log(`Current Device Idle Timeout: ${idleTimeout/60} Minutes.`);

			return idleTimeout;
		}

		return -1;
	}
	/** Function to set the device idle timeout on supported devices. */
	setDeviceIdleTimeout(timeout) {
		const returnValues = this.ConfigPacketSend([0x02, 0x07, 0x03, (timeout*60 >> 8 & 0xff), (timeout*60 & 0xff)]);
		device.pause(10);

		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Current Device Idle Timeout Setting. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0; //function went through
	}
	/** Function to set a modern mouse to software lighting control mode.*/
	setSoftwareLightingMode() {
		const ModernMatrix = this.getModernMatrixEffect();

		if (ModernMatrix > -1) {
			this.setSupportsModernMatrix(true);
			this.setModernSoftwareLightingMode();
		} else if (this.Config.MouseType === "Modern") {
			this.setLegacyMatrixEffect(); ///MMM Edge cases are tasty.
		} else if (this.getHyperFlux()){
			console.log("Hyperflux set to software mode!");
			this.setDeviceMode("Software Mode");
			this.setSupportsModernMatrix(true);
			this.setModernSoftwareLightingMode();
		}
	}
	/** Function to set a legacy device's effect. Why is the Mamba TE so special?*/
	setLegacyMatrixEffect() {
		const returnValues = this.ConfigPacketSend([0x02, 0x03, 0x0A, 0x05, 0x00]);

		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Legacy Matrix Effect. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to set a modern device's effect*/
	getModernMatrixEffect() {
		const returnValues = this.ConfigPacketSend([0x06, 0x0f, 0x82, 0x00]);

		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error fetching Modern Matrix Effect. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to set a modern device's effect*/
	setModernMatrixEffect(data) {
		const returnValues = this.ConfigPacketSend([0x06, 0x0f, 0x02].concat(data)); //flash, zone, effect are additional args after length and idk what f and 2 are.

		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Modern Matrix Effect. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to set a modern device's effect to custom. */
	setModernSoftwareLightingMode() {//Not all devices require this, but it seems to be sent to all of them?
		return this.setModernMatrixEffect([0x00, 0x00, 0x08, 0x00, 0x01]);
	}
	/** Function to set the Chroma Charging Dock brightness.*/
	getChargingDockBrightness() {
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x01, 0x07, 0x82]);

		if (errorCode !== 2) {

			device.log("Error fetching Charging Dock Brightness. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[10] !== undefined && returnPacket[10] > -1) {
			const dockBrightness = returnPacket[10]; //TODO Test this.
			device.log("Dock Brightness: " + dockBrightness, { toFile: true });

			return dockBrightness;
		}

		return -1;
	}
	/** Function to set the Chroma Charging Dock brightness.*/
	setChargingDockBrightness(brightness) {
		const returnValues = this.ConfigPacketSend([0x01, 0x07, 0x02, brightness]);
		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Charging Dock Brightness. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to switch a Hyperspeed Dongle into Pairing Mode.*/
	setDonglePairingMode() {//Used for pairing multiple devices to a single hyperspeed dongle. The Class is smart enough to separate transaction ID's.
		const returnValues = this.ConfigPacketSend([0x01, 0x00, 0x46, 0x01]);

		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Hyperspeed Dongle to Pairing Mode. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to fetch paired device dongles from the connected dongle?!?!?*/
	getCurrentlyConnectedDongles() { //Also of note: return[0] gives 2, and return[4] gives 1 on Blackwidow. Dualpaired Naga.
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x07, 0x00, 0xbf], 0x0C); //Were you expecting this to give you paired devices? Well you'll be disappointed.
		//Naga itself returns 1 for return[1], and 0 for return[4]

		if (errorCode !== 2) {

			device.log("Error fetching Devices Currently Connected to Hyperspeed Dongle. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {
			if (returnPacket[10] === undefined || returnPacket[11] === undefined || returnPacket[13] === undefined || returnPacket[14] === undefined) {
				device.log("Error fetching Devices Currently Connected to dongle, due to out of spec packet response.", { toFile: true });

				return -1; //return -1 as this should be a retry.
			}

			const device1ConnectionStatus = returnPacket[1];
			const device2ConnectionStatus = returnPacket[4];

			const PID1 = returnPacket[10].toString(16) + returnPacket[11].toString(16);
			const PID2 = returnPacket[13].toString(16) + returnPacket[14].toString(16);
			const pairedPids = [];

			if (PID1 !== "ffff") {
				device.log("Paired Receiver ID 1: 0x" + PID1, { toFile: true });
				pairedPids.push(PID1);

				const pid1Num = parseInt(PID1, 16);
				const deviceName = razerDeviceLibrary.PIDLibrary[pid1Num];
				if (deviceName) {
					DeviceDiscovery.foundVirtualDevice({
						type: "mouse",
						name: deviceName,
						supported: true,
						vendorId: 0x1532,
						productId: pid1Num
					});
				}
			}

			if (PID2 !== "ffff") {
				device.log("Paired Receiver ID 2: 0x" + PID2, { toFile: true });
				pairedPids.push(PID2);

				const pid2Num = parseInt(PID2, 16);
				const deviceName = razerDeviceLibrary.PIDLibrary[pid2Num];
				if (deviceName) {
					DeviceDiscovery.foundVirtualDevice({
						type: "mouse",
						name: deviceName,
						supported: true,
						vendorId: 0x1532,
						productId: pid2Num
					});
				}
			}

			if (device1ConnectionStatus === 0x01) {
				device.log(`Device 1 with PID 0x${PID1} is connected.`, { toFile: true });
			}

			if (device2ConnectionStatus === 0x01) {
				device.log(`Device 2 with PID 0x${PID2} is connected.`, { toFile: true });
			}

			return pairedPids;
		}

		return -1;
	}
	/** Function to fetch connected device dongles from the connected dongle?!?!?*/
	getNumberOfPairedDongles() {
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x04, 0x00, 0x87], 0x88); //These values change depending on transaction ID. The expected transaction ID for the original device seems to give us the 2 Paired devices response. Most likely indicating Master. Transaction ID's for the newly paired device are for single paired device. Most likely indicating Slave.

		if (errorCode !== 2) {

			device.log("Error fetching number of devices current paired to dongle. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {
			let numberOfPairedDongles = 0;

			if (returnPacket[8] === 0x02 && returnPacket[9] === 0x02 && returnPacket[10] === 0x00) {
				device.log("Dongle has single paired device.", { toFile: true });
				numberOfPairedDongles = 1;
			}

			if (returnPacket[8] === 0x02 && returnPacket[9] === 0x01 && returnPacket[10] === 0x01) {
				device.log("Dongle has 2 Paired devices.", { toFile: true });
				numberOfPairedDongles = 2;
			}//Speculation: Byte 1 is free slots?, Byte 2 is number of additional paired devices?

			return numberOfPairedDongles;
		}

		return -1;
	}
	/** Function to set a modern keyboard's led colors.*/
	setKeyboardDeviceColor(NumberOfLEDs, RGBData, packetidx) {
		this.StandardPacketSend([(NumberOfLEDs*3 + 5), 0x0F, 0x03, 0x00, 0x00, packetidx, 0x00, NumberOfLEDs].concat(RGBData));
	}
}

const Razer = new RazerProtocol();

class RazerMouseFunctions {
	constructor() {
		this.Config = {
			maxDPI : 0,
			hasSniperButton : false
		};
	}

	getMaxDPI() { return this.Config.maxDPI; }
	setMaxDPI(MaxDPI) { this.Config.maxDPI = MaxDPI; }

	getHasSniperButton() { return this.Config.hasSniperButton; }
	setHasSniperButton(hasSniperButton) { this.Config.hasSniperButton = hasSniperButton; }

	/** Function to set a device's lift off distance.*/
	setDeviceLOD(asymmetricLOD, liftOffDistance) {
		const returnValues = Razer.ConfigPacketSend([0x04, 0x0b, 0x0b, 0x00, 0x04, (asymmetricLOD ? 0x02 : 0x01), (liftOffDistance - 1)]);
		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Device Lift Off Distance. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to fetch a device's onboard DPI levels. We do not currently parse this at all.*/
	getDeviceCurrentDPI() {
		const [returnPacket, errorCode] = Razer.ConfigPacketSend([0x07, 0x04, 0x85, 0x00]);

		if (errorCode !== 2) {

			device.log("Error fetching Current Device DPI. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {
			if (returnPacket[9] === undefined || returnPacket[10] === undefined || returnPacket[11] === undefined || returnPacket[12] === undefined) {
				device.log("Error fetching Current Device DPI. Device returned out of spec response", { toFile: true });

				return -1;
			}

			const dpiX = returnPacket[9] * 256 + returnPacket[10];
			const dpiY = returnPacket[11] * 256 + returnPacket[12];
			device.log("Current DPI X Value: " + dpiX), { toFile: true };
			device.log("Current DPI Y Value: " + dpiY), { toFile: true };

			return [dpiX, dpiY];
		}

		return -1;
	}
	/** Function to set a device's current stage dpi. We leverage this with software buttons to emulate multiple stages.*/
	setDeviceSoftwareDPI(dpi) {
		const returnValues = Razer.ConfigPacketSend([0x07, 0x04, 0x05, 0x00, dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff]);
		device.pause(10);

		const errorCode = returnValues[1];

		if (errorCode !== 2) {

			device.log("Error setting Device Software DPI. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		device.pause(10);

		const currentStage = DPIHandler.getCurrentStage();
		const maxDPIStage = DPIHandler.getMaxStage();
		this.setDeviceDPI(currentStage, maxDPIStage); //Yay for the stupid dpi light. Insert rant here.

		return 0;
	}
	/** Function to fix the edge case we create by fixing the dpi button/light on shutdown.*/
	// eslint-disable-next-line complexity
	setDeviceDPIToHardware(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = Razer.ConfigPacketSend([0x26, 0x04, 0x86, 0x01]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Device Onboard DPI Stages. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {

			const packet = [0x26, 0x04, 0x06, 0x00];

			for(let bytes = 0; bytes < 40; bytes ++) {
				if(typeof returnPacket[bytes + 9] === "number") {
					packet[bytes + 4] = returnPacket[bytes + 9]??0;
				}
			}

			let errorCode = 0;
			let attempts = 0;

			do {
			 const returnValues = Razer.ConfigPacketSend(packet);
			 errorCode = returnValues[1];

			 if(errorCode !== 2) {
					device.pause(10);
					attempts++;
			 }
			}

			while(errorCode !== 2 && attempts < retryAttempts);


			if (errorCode !== 2) {

				device.log("Error setting Onboard Device DPI Stages. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

				if (errorCode === 1) {
					return -1;
				}

				return -1;
			}

			device.pause(10);
		}

		return -1;
	}
	/** Function to fetch a device's onboard DPI levels.*/
	getDeviceDPIStages(retryAttempts = 5) {//DPI6 does not get included in here.

		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = Razer.ConfigPacketSend([0x26, 0x04, 0x86, 0x01]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Device Onboard DPI Stages. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket !== undefined) {
			//const stage1Flag = returnPacket[11];
			//const stage2Flag = returnPacket[18];
			//const stage3Flag = returnPacket[25];
			//const stage4Flag = returnPacket[32];
			//const stage5Flag = returnPacket[39];
			const numberOfStages = returnPacket[10];
			const currentStage = returnPacket[9];

			const dpi1X = BinaryUtils.ReadInt16BigEndian([returnPacket[12], returnPacket[13]]);
			const dpi1Y = BinaryUtils.ReadInt16BigEndian([returnPacket[14], returnPacket[15]]);
			const dpi2X = BinaryUtils.ReadInt16BigEndian([returnPacket[19], returnPacket[20]]);
			const dpi2Y = BinaryUtils.ReadInt16BigEndian([returnPacket[21], returnPacket[22]]);
			const dpi3X = BinaryUtils.ReadInt16BigEndian([returnPacket[26], returnPacket[27]]);
			const dpi3Y = BinaryUtils.ReadInt16BigEndian([returnPacket[28], returnPacket[29]]);
			const dpi4X = BinaryUtils.ReadInt16BigEndian([returnPacket[33], returnPacket[34]]);
			const dpi4Y = BinaryUtils.ReadInt16BigEndian([returnPacket[35], returnPacket[36]]);
			const dpi5X = BinaryUtils.ReadInt16BigEndian([returnPacket[40], returnPacket[41]]);
			const dpi5Y = BinaryUtils.ReadInt16BigEndian([returnPacket[42], returnPacket[43]]);

			device.log("Current Hardware DPI Stage: " + currentStage, { toFile: true });
			device.log("Number of Hardware DPI Stages: " + numberOfStages, { toFile: true });
			device.log("DPI Stage 1 X Value: " + dpi1X, { toFile: true });
			device.log("DPI Stage 1 Y Value: " + dpi1Y, { toFile: true });
			device.log("DPI Stage 2 X Value: " + dpi2X, { toFile: true });
			device.log("DPI Stage 2 Y Value: " + dpi2Y, { toFile: true });
			device.log("DPI Stage 3 X Value: " + dpi3X, { toFile: true });
			device.log("DPI Stage 3 Y Value: " + dpi3Y, { toFile: true });
			device.log("DPI Stage 4 X Value: " + dpi4X, { toFile: true });
			device.log("DPI Stage 4 Y Value: " + dpi4Y, { toFile: true });
			device.log("DPI Stage 5 X Value: " + dpi5X, { toFile: true });
			device.log("DPI Stage 5 Y Value: " + dpi5Y, { toFile: true });

			return [numberOfStages, currentStage, dpi1X, dpi1Y, dpi2X, dpi2Y, dpi3X, dpi3Y, dpi4X, dpi4Y, dpi5X, dpi5Y]; //Return 0 until I take the time to parse this properly.
		}

		return -1;
	}
	/** Function to set multiple dpi stages. We can set how many stages a device has, and this is saved onboard. This works with hardware buttons.*/
	setDeviceDPI(stage, dpiStages, saveToFlash = false, retryAttempts = 5) {
		const packet = [0x26, 0x04, 0x06, saveToFlash, stage, dpiStages];

		for(let stages = 0; stages < dpiStages; stages++) {
			try {
				// eslint-disable-next-line no-eval
				const dpi = eval(`dpi${stages+1}`); //Cope ESLint.
				const offset = 7 * stages + 6;

				packet[offset] = stages;
				packet[offset + 1] = dpi >> 8;
				packet[offset + 2] = dpi & 0xff;
				packet[offset + 3] = dpi >> 8;
				packet[offset + 4] = dpi & 0xff;
			} catch (error) {
				device.log("Tried to Call a nonexistent DPI Stage.", {toFile : true});
			}
		}

		let errorCode = 0;
		let attempts = 0;

		do {
			 const returnValues = Razer.ConfigPacketSend(packet);
			 errorCode = returnValues[1];

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);


		if (errorCode !== 2) {

			device.log("Error setting Onboard Device DPI Stages. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		device.pause(10);

		return 0;
	}
	/** Function to fetch the scroll mode from supported mice. */
	getDeviceScrollMode(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = Razer.ConfigPacketSend([0x02, 0x02, 0x94]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Scroll Mode. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[9] !== undefined) {
			const ScrollMode = returnPacket[9];
			device.log("Free Scroll is set to: " + ScrollMode, { toFile: true });

			return ScrollMode;
		}

		return -1;
	}
	/** Function to set the scroll mode for supported mice. */
	setDeviceScrollMode(ScrollMode, retryAttempts = 5) {
		let errorCode = 0;
		let attempts = 0;

		do {
			 const returnValues = Razer.ConfigPacketSend([0x02, 0x02, 0x14, 0x01, (ScrollMode ? 0x01 : 0x00)]);
			 errorCode = returnValues[1];

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error setting Current Device Scroll Mode. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to fetch the Scroll Acceleration mode from supported mice. */
	getDeviceScrollAccel(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = Razer.ConfigPacketSend([0x02, 0x02, 0x96]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Current Scroll Acceleration Setting. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[9] !== undefined) {
			if (returnPacket[9] < 2 && returnPacket[9] >= 0) {
				const ScrollAccel = returnPacket[9];
				device.log("Scroll Acceleration is set to: " + ScrollAccel, { toFile: true });

				return ScrollAccel;
			}

			return -1; //An invalid response but not an invalid packet should prompt a refetch.
		}

		return -1;
	}
	/** Function to set whether Scroll Acceleration is on for supported mice. */
	setDeviceScrollAccel(ScrollAccel, retryAttempts = 5) {
		let errorCode = 0;
		let attempts = 0;

		do {
			 const returnValues = Razer.ConfigPacketSend([0x02, 0x02, 0x16, 0x01, (ScrollAccel ? 0x01 : 0x00)]);
			 errorCode = returnValues[1];

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error setting Device Scroll Acceleration Mode. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to fetch the SmartReel Status of a supported mouse */
	getDeviceSmartReel(retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] = Razer.ConfigPacketSend([0x02, 0x02, 0x97]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error fetching Current Device Smart Reel Setting. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		if (returnPacket[9] !== undefined) {
			if (returnPacket[9] < 2 && returnPacket[9] >= 0) {
				const SmartReel = returnPacket[9];
				device.log("Smart Reel is set to: " + SmartReel, { toFile: true });

				return SmartReel;
			}
		}

		return -1;
	}
	/** Function to set whether SmartReel is on for supported mice. */
	setDeviceSmartReel(SmartReel, retryAttempts = 5) {
		let errorCode = 0;
		let attempts = 0;

		do {
		 const returnValues = Razer.ConfigPacketSend([0x02, 0x02, 0x17, 0x01, (SmartReel ? 0x01 : 0x00)]);
		 errorCode = returnValues[1];

		 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
		 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			device.log("Error setting Device Smart Reel Mode. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });

			return -1;
		}

		return 0;
	}
	/** Function to set Mouse Lighting.*/
	setMouseLighting(RGBData, NumberOfLEDs = Razer.getNumberOfLEDs()) { //no returns on this or the led color sets. I do not care.
		if(Razer.getDeviceProductId() === 0x0046) { //I'll leave this behind for now.
			Razer.StandardPacketSend([(NumberOfLEDs * 3 + 5), 0x03, 0x0C, 0x00, 0x00, 0x00, 0x00, NumberOfLEDs - 1].concat(RGBData));
		}else if(Razer.getDeviceProductId() === 0x0053) { // I'm special, I use the mousepad writing
			Razer.StandardPacketSend([(NumberOfLEDs * 3 + 2), 0x03, 0x0C, 0x00, NumberOfLEDs -1].concat(RGBData));
			Razer.setLegacyMatrixEffect();
		}else {
			Razer.StandardPacketSend([(NumberOfLEDs * 3 + 5), 0x0F, 0x03, 0x00, 0x00, 0x00, 0x00, NumberOfLEDs - 1].concat(RGBData));

			if(Razer.getRequiresApplyPacket()) {
				if(!Razer.getSupportsModernMatrix()) {
					Razer.setLegacyMatrixEffect();
				} else {
					Razer.setModernMatrixEffect([0x00, 0x00, 0x08, 0x00, 0x01]);
				}
			}
		}
	}
	/** Function to set a legacy mouse's led brightness. You cannot use zero for this one as it wants a specific zone. That being said we could scan for specific zones on a device.*/
	getModernMouseLEDBrightness(led = 0, detection = false, retryAttempts = 5) {
		let errorCode = 0;
		let returnPacket = [];
		let attempts = 0;

		do {
			 [returnPacket, errorCode] =  Razer.ConfigPacketSend([0x03, 0x0f, 0x84, 0x00, led]);

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			if(!detection) {
				device.log("Error fetching Modern Mouse LED Brightness. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });
			}

			return -1;
		}

		if (returnPacket[10] !== undefined) {
			const brightness = returnPacket[10] ?? 0;
			device.log(`LED ${led} is set to ${brightness * 100 / 255}% brightness.`, { toFile: true });

			return brightness * 100 / 255;
		}

		return -1;
	}
	/** Function to set a modern mouse's led brightness. If we use 0, it does all of the zones in the matrix.*/
	setModernMouseLEDBrightness(brightness, led = 0, detection = false, retryAttempts = 5) {
		let errorCode = 0;
		let attempts = 0;

		do {
			 const returnValues = Razer.ConfigPacketSend([0x03, 0x0f, 0x04, 0x01, led, brightness * 255 / 100]);
			 errorCode = returnValues[1];

			 if(errorCode !== 2) {
				device.pause(10);
				attempts++;
			 }
		}

		while(errorCode !== 2 && attempts < retryAttempts);

		if (errorCode !== 2) {

			if(!detection) {
				device.log("Error setting Modern Mouse LED Brightness. Error Code: " + Razer.DeviceResponses[errorCode], { toFile: true });
			}

			return -1;
		}

		return 0;
	}
}

const RazerMouse = new RazerMouseFunctions();

export default class DpiController {
	constructor() {
		this.currentStageIdx = 1;
		this.maxSelectedableStage = 5;
		this.maxStageIdx = 5; //Default to 5 as it's most common if not defined
		this.sniperStageIdx = 6;

		this.updateCallback = (dpi) => { this.log("No Set DPI Callback given. DPI Handler cannot function!"); dpi; };

		this.logCallback = (message) => { console.log(message); };

		this.sniperMode = false;
		this.enabled = false;
		this.dpiRollover = false;
		this.dpiMap = new Map();
		this.maxDpi = 18000;
		this.minDpi = 200;
	}
	addProperties() {
		device.addProperty({ "property": "settingControl", "group": "mouse", "label": "Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type": "boolean", "default": "false", "order": 1 });
		device.addProperty({ "property": "dpiStages", "group": "mouse", "label": "Number of DPI Stages", description: "Sets the number of active DPI stages to cycle though", "step": "1", "type": "number", "min": "1", "max": this.maxSelectedableStage, "default": this.maxStageIdx, "order": 1, "live" : false });
		device.addProperty({ "property": "dpiRollover", "group": "mouse", "label": "DPI Stage Rollover", description: "Allows DPI Stages to loop in a circle, going from last stage to first one on button press", "type": "boolean", "default": "false", "order": 1 });

		try {
			// @ts-ignore
			this.maxStageIdx = dpiStages;
		} catch (e) {
			this.log("Skipping setting of user selected max stage count. Property is undefined");
		}

		this.rebuildUserProperties();
	}
	addSniperProperty() {
		device.addProperty({ "property": `dpi${this.sniperStageIdx}`, "group": "mouse", "label": "Sniper Button DPI", "step": "50", "type": "number", "min": this.minDpi, "max": this.maxDpi, "default": "400", "order": 3, "live" : false });
		// eslint-disable-next-line no-eval
		this.dpiMap.set(6, () => { return eval(`dpi${6}`); });
	}
	getCurrentStage() {
		return this.currentStageIdx;
	}
	getMaxStage() {
		return this.maxStageIdx;
	}
	getSniperIdx() { return this.sniperStageIdx; }
	setRollover(enabled) {
		this.dpiRollover = enabled;
	}
	setMaxStageCount(count) {
		this.maxStageIdx = count;
		this.rebuildUserProperties();
	}
	setMinDpi(minDpi) { this.minDpi = minDpi; this.updateDpiRange(); }
	setMaxDpi(maxDpi) { this.maxDpi = maxDpi; this.updateDpiRange(); }
	setUpdateCallback(callback) {
		this.updateCallback = callback;
	}
	active() { return this.enabled; }
	setActiveControl(EnableDpiControl) {
		this.enabled = EnableDpiControl;

		if (this.enabled) {
			this.update();
		}
	}
	/** GetDpi Value for a given stage.*/
	getDpiForStage(stage) {
		if (!this.dpiMap.has(stage)) {
			device.log("bad stage: " + stage);
			this.log("Invalid Stage...");

			return;
		}

		// This is a dict of functions, make sure to call them
		this.log("Current DPI Stage: " + stage);

		const dpiWrapper = this.dpiMap.get(stage);
		const dpi = dpiWrapper();
		this.log("Current DPI: " + dpi);

		// eslint-disable-next-line consistent-return
		return dpi; //ESlint complains about not wanting a return. The dpi call checks if it has a return. If there's no return it does nothing. ESLint can't see that though.
	}
	/** Increment DPIStage */
	increment() {
		this.setStage(this.currentStageIdx + 1);
	}
	/** Decrement DPIStage */
	decrement() {
		this.setStage(this.currentStageIdx - 1);
	}
	/** Set DPIStage and then set DPI to that stage.*/
	setStage(stage) {
		if (stage > this.maxStageIdx) {
			this.currentStageIdx = this.dpiRollover ? 1 : this.maxStageIdx;
		} else if (stage < 1) {
			this.currentStageIdx = this.dpiRollover ? this.maxStageIdx : 1;
		} else {
			this.currentStageIdx = stage;
		}

		this.update();
	}
	/** SetDpi Using Callback. Bypasses setStage.*/
	update() {
		if (!this.enabled) {
			return;
		}
		const stage = this.sniperMode ? this.sniperStageIdx : this.currentStageIdx;
		const dpi = this.getDpiForStage(stage);

		if (dpi) {
			this.updateCallback(dpi);
		}
	}
	/** Stage update check to update DPI if current stage values are changed.*/
	DPIStageUpdated(stage) {
		// if the current stage's value was changed by the user
		// reapply the current stage with the new value
		if (stage === this.currentStageIdx) {
			this.update();
		}
	}
	/** Set Sniper Mode on or off. */
	setSniperMode(sniperMode) {
		this.sniperMode = sniperMode;
		this.log("Sniper Mode: " + this.sniperMode);
		this.update();
	}
	rebuildUserProperties() {
		// Remove Stages

		for (const stage in Array.from(this.dpiMap.keys())) {
			if(+stage+1 === this.sniperStageIdx) {
				continue;
			}

			if (+stage >= this.maxStageIdx) {
				this.log(`Removing Stage: ${+stage+1}`);
				device.removeProperty(`dpi${+stage+1}`);
				this.dpiMap.delete(+stage+1);
			}
		}
		// Add new Stages
		const stages = Array.from(this.dpiMap.keys());

		for (let i = 1; i <= this.maxStageIdx; i++) {
			if (stages.includes(i)) {
				continue;
			}

			this.log(`Adding Stage: ${i}`);
			device.addProperty({ "property": `dpi${i}`, "group": "mouse", "label": `DPI ${i}`, "step": "50", "type": "number", "min": this.minDpi, "max": this.maxDpi, "default": 800 + (400*i), "order": 2, "live" : false });
			// eslint-disable-next-line no-eval
			this.dpiMap.set(i, () => { return eval(`dpi${i}`); });
		}
	}
	updateDpiRange() {
		for (const stage in this.dpiMap.keys()) {
			const prop = device.getProperty(`dpi${+stage}`);
			prop.min = this.minDpi;
			prop.max = this.maxDpi;
			device.addProperty(prop);
		}
	}
	log(message) {
		if (this.logCallback) {
			this.logCallback(message);
		}
	}
}

const DPIHandler = new DpiController();

class ByteTracker {
	constructor(vStart) {
		this.vCurrent = vStart;
		this.vPrev = vStart;
		this.vAdded = [];
		this.vRemoved = [];
	}

	Changed(avCurr) {
		// Assign Previous value before we pull new one.
		this.vPrev = this.vCurrent; //Assign previous to current.
		// Fetch changes.
		this.vAdded = avCurr.filter(x => !this.vPrev.includes(x)); //Check if we have anything in Current that wasn't in previous.
		this.vRemoved = this.vPrev.filter(x => !avCurr.includes(x)); //Check if there's anything in previous not in Current. That's removed.

		// Reassign current.
		this.vCurrent = avCurr;

		// If we've got any additions or removals, tell the caller we've changed.
		const bChanged = this.vAdded.length > 0 || this.vRemoved.length > 0;

		return bChanged;
	}

	Added() {
		return this.vAdded;
	}

	Removed() {
		return this.vRemoved;
	}
};

class BinaryUtils {
	static WriteInt16LittleEndian(value) {
		return [value & 0xFF, (value >> 8) & 0xFF];
	}
	static WriteInt16BigEndian(value) {
		return this.WriteInt16LittleEndian(value).reverse();
	}
	static ReadInt16LittleEndian(array) {
		return (array[0] & 0xFF) | (array[1] & 0xFF) << 8;
	}
	static ReadInt16BigEndian(array) {
		return this.ReadInt16LittleEndian(array.slice(0, 2).reverse());
	}
	static ReadInt32LittleEndian(array) {
		return (array[0] & 0xFF) | ((array[1] << 8) & 0xFF00) | ((array[2] << 16) & 0xFF0000) | ((array[3] << 24) & 0xFF000000);
	}
	static ReadInt32BigEndian(array) {
		if (array.length < 4) {
			array.push(...new Array(4 - array.length).fill(0));
		}

		return this.ReadInt32LittleEndian(array.slice(0, 4).reverse());
	}
	static WriteInt32LittleEndian(value) {
		return [value & 0xFF, ((value >> 8) & 0xFF), ((value >> 16) & 0xFF), ((value >> 24) & 0xFF)];
	}
	static WriteInt32BigEndian(value) {
		return this.WriteInt32LittleEndian(value).reverse();
	}
}

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0002 || endpoint.interface === 1 && endpoint.usage === 0x0000 || endpoint.interface === 3;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}