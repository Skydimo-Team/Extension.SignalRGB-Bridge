export function Name() { return "Asus Mouse"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return Object.keys(ASUSdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/asus"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "mouse";}

/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
SettingControl:readonly
angleSnapping:readonly
mousePolling:readonly
sleepTimeout:readonly
lowPowerPercentage:readonly
mouseResponse:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

let savedPollTimer = Date.now();
const PollModeInternal = 15000;

export function Initialize() {
	ASUS.InitializeASUS();
}

export function Render() {
	ASUS.getDeviceBatteryStatus();
	ASUS.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	ASUS.sendColors(color);
}

export class ASUS_Mouse_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Asus Mouse",
			DeviceEndpoint: { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
			DeviceProtocol: "Legacy",
			LedNames: [],
			LedPositions: [],
			SupportedFeatures:
			{
				DPISupport: false,
				AngleSnapSupport: false,
				PollingRateSupport: false,
				BatterySupport: false,
				SleepTimeoutSupport: false,
				LowPowerPercentage: false,
			}
		};
	}

	getDeviceProperties(deviceName) { return ASUSdeviceLibrary.LEDLibrary[deviceName];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getDeviceProtocol() { return this.Config.DeviceProtocol; }
	setDeviceProtocol(deviceProtocol) { this.Config.DeviceProtocol = deviceProtocol; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getBrightness() { return this.Config.brightness; }
	setBrightness(brightness) { this.Config.brightness = brightness; }

	getDPISupport() { return this.Config.SupportedFeatures.DPISupport; }
	setDPISupport(dpi) { this.Config.SupportedFeatures.DPISupport = dpi; }

	getBatteryFeature() { return this.Config.SupportedFeatures.BatterySupport; }
	setBatteryFeature(battery) { this.Config.SupportedFeatures.BatterySupport = battery; }

	getAngleSnapFeature() { return this.Config.SupportedFeatures.AngleSnapSupport; }
	setAngleSnapFeature(angleSnapping) { this.Config.SupportedFeatures.AngleSnapSupport = angleSnapping; }

	getPollingFeature() { return this.Config.SupportedFeatures.PollingRateSupport; }
	setPollingFeature(polling) { this.Config.SupportedFeatures.PollingRateSupport = polling; }

	getSleepFeature() { return this.Config.SupportedFeatures.SleepTimeoutSupport; }
	setSleepFeature(sleep) { this.Config.SupportedFeatures.SleepTimeoutSupport = sleep; }

	getLowPowerFeature() { return this.Config.SupportedFeatures.LowPowerPercentage; }
	setLowPowerFeature(lowPower) { this.Config.SupportedFeatures.LowPowerPercentage = lowPower; }

	InitializeASUS() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(ASUSdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.Endpoint);
		this.setDeviceProtocol(DeviceProperties.Protocol);
		this.setLedNames(DeviceProperties.vLedNames);
		this.setLedPositions(DeviceProperties.vLedPositions);
		device.set_endpoint(DeviceProperties.Endpoint[`interface`], DeviceProperties.Endpoint[`usage`], DeviceProperties.Endpoint[`usage_page`], DeviceProperties.Endpoint[`collection`]);
		console.log("Initializing device...");

		if(DeviceProperties.brightness){
			console.log("Brightness v2 set!");
			this.setBrightness(DeviceProperties.brightness);
		}else{
			this.setBrightness(0x04);
		}

		if(DeviceProperties.DPISupport === true){
			this.setDPISupport(true);
			this.setAngleSnapFeature(true);
			this.setPollingFeature(true);

			device.addProperty({"property":"SettingControl", "group":"mouse", "label":"Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default" :"false"});
			device.addProperty({"property":"dpi1", "group":"dpi", "label":"DPI 1", "step":"100", "type":"number", "min":"100", "max": DeviceProperties.maxDPI, "default": "800", "live" : false});
			device.addProperty({"property":"dpi2", "group":"dpi", "label":"DPI 2", "step":"100", "type":"number", "min":"100", "max": DeviceProperties.maxDPI, "default":"1200", "live" : false});
			device.addProperty({"property":"dpi3", "group":"dpi", "label":"DPI 3", "step":"100", "type":"number", "min":"100", "max": DeviceProperties.maxDPI, "default":"1500", "live" : false});
			device.addProperty({"property":"dpi4", "group":"dpi", "label":"DPI 4", "step":"100", "type":"number", "min":"100", "max": DeviceProperties.maxDPI, "default":"2000", "live" : false});
			device.addProperty({"property":"angleSnapping", "group":"mouse", "label":"Angle Snapping", description: "Enables Angle Snapping on the mouse. This will result in the cursor moving only in straight lines", "type":"boolean", "default":"false"});
			device.addProperty({"property":"mousePolling", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":["125Hz", "250Hz", "500Hz", "1000Hz"], "default":"500Hz"});
			device.addProperty({"property":"mouseResponse", "group":"mouse", "label":"button response", "type":"combobox", "values":["12ms", "16ms", "20ms", "24ms", "28ms", "32ms"], "default":"16ms"});

			for(let i = 0; i < 5; i++){
				this.sendMouseSetting(i);
			}

			this.sendMouseSetting(6);

			if(DeviceProperties.Protocol === "Modern"){
				this.modernDirectLightingMode();
				console.log("This is a Modern device");

				if(DeviceProperties.battery){
					this.setBatteryFeature(true);
					this.setSleepFeature(true);
					this.setLowPowerFeature(true);

					device.addFeature("battery");
					console.log("Device has a battery and it's wireless");
					device.addProperty({"property":"sleepTimeout", "group":"mouse", "label":"Sleep Mode Timeout (Minutes)", "type":"combobox", "values":["1", "2", "3", "5", "10", "Never"], "default":"5"});
					device.addProperty({"property":"lowPowerPercentage", "group":"mouse", "label":"Low Battery Warning Percentage", "type":"combobox", "values":["Never", "10%", "15%", "20%", "25%", "30%"], "default":"20%"});

					this.sendLightingSettings();
					this.modernFetchBatteryLevel();
				}
			}else {
				console.log("This is a Legacy device with DPI feature");
			}
		}else {
			console.log("This is a Legacy device with no DPI feature");
		}

		console.log(`Device model found: ` + this.getDeviceName());
		device.setName("ASUS " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(DeviceProperties.image);

	}

	modernDirectLightingMode() {
		const packet = [0x00, 0x51, 0x28, 0x03, 0x00, 0x02, 0x64, 0x02]; //Direct Mode
		device.write(packet, 65);
	}

	sendColors(overrideColor) {

		switch (this.getDeviceProtocol()) {
		case "Legacy":
			this.sendColorsLegacy(overrideColor);
			break;
		case "ChakramX":
			this.sendColorsChakramX(overrideColor);
			break;
		case "Modern":
			this.sendColorsModern(overrideColor);
			break;
		default:
			this.sendColorsLegacy(overrideColor);
			break;
		}

	}

	sendColorsLegacy(overrideColor) {

		const deviceLeds	= this.getLedPositions();
		const deviceBrght	= this.getBrightness();

		for (let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLeds[iIdx][0];
			const iPxY = deviceLeds[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			const packet = [0x00, 0x51, 0x28, iIdx, 0x00, 0x00, deviceBrght, color[0], color[1], color[2]];
			device.write(packet, 65);
			device.pause(1);
		}
	}

	sendColorsModern(overrideColor) {

		const deviceLeds = this.getLedPositions();
		const RGBData = [];

		for(let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLeds[iIdx][0];
			const iPxY = deviceLeds[iIdx][1];
			let color;

			if(overrideColor) {
				color = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			} else {
				color = device.color(iPxX, iPxY);
			}

			const iLedIdx = (iIdx * 3);
			RGBData[iLedIdx] = color[0];
			RGBData[iLedIdx+1] = color[1];
			RGBData[iLedIdx+2] = color[2];
		}

		const packet = [0x00, 0x51, 0x29, 0xff, 0x00, 0x00];
		packet.push(...RGBData);
		device.write(packet, 65);

	}

	sendColorsChakramX(overrideColor) {

		const deviceLeds = this.getLedPositions();
		const RGBData = [];

		for(let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLeds[iIdx][0];
			const iPxY = deviceLeds[iIdx][1];
			let color;

			if(overrideColor) {
				color = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			} else {
				color = device.color(iPxX, iPxY);
			}

			const iLedIdx 		= (iIdx * 3);
			RGBData[iLedIdx] 	= color[0];
			RGBData[iLedIdx+1] 	= color[1];
			RGBData[iLedIdx+2] 	= color[2];

		}

		[[4, 5], [5, 0]].forEach(zones => {
			const packet = [0x00, 0x51, 0x29, zones[0], 0x00, zones[1]];
			packet.push(...RGBData);
			device.write(packet, 65);
		});

	}

	getDeviceBatteryStatus() {

		if(this.getBatteryFeature()){
			if (Date.now() - savedPollTimer < PollModeInternal) {
				return;
			}

			console.log("Device has battery, polling info...");
			savedPollTimer = Date.now();

			this.modernFetchBatteryLevel();
		}

	}

	modernFetchBatteryLevel() {
		device.clearReadBuffer();
		device.write([0x00, 0x12, 0x07], 65);

		const returnPacket = device.read([0x00, 0x12, 0x07], 65);

		const batteryState = returnPacket[4];
		const batteryLevel = returnPacket[5];

		battery.setBatteryLevel(batteryLevel);
		battery.setBatteryState(batteryState + 1);
	}

	sendMouseSetting(setting) {
		if(SettingControl) {
			switch (setting) {
			case 0:
				device.write([0x00, 0x51, 0x31, 0x00, 0x00, (dpi1/100 + 1)], 65);
				break;
			case 1:
				device.write([0x00, 0x51, 0x31, 0x01, 0x00, (dpi2/100 + 1)], 65);
				break;
			case 2:
				device.write([0x00, 0x51, 0x31, 0x02, 0x00, (dpi3/100 + 1)], 65);
				break;
			case 3:
				device.write([0x00, 0x51, 0x31, 0x03, 0x00, (dpi4/100 + 1)], 65);
				break;
			case 4:
				device.write([0x00, 0x51, 0x31, 0x04, 0x00, ASUSdeviceLibrary.pollingDict[mousePolling]], 65);
				break;
			case 5:
				device.write([0x00, 0x51, 0x31, 0x05, 0x00, ASUSdeviceLibrary.responseDict[mouseResponse]], 65);
				break;
			case 6:
				device.write([0x00, 0x51, 0x31, 0x06, 0x00, angleSnapping ? 0x01 : 0x00], 65);
				break;
			default:
				console.log("Not a valid mouse setting: " + setting);
				break;
			}

			device.write([0x00, 0x50, 0x03, 0x03], 65); // Apply
		}
	}

	sendAllMouseSettings() {
		if(SettingControl) {
			device.write([0x00, 0x51, 0x31, 0x00, 0x00, (dpi1/100 + 1)], 65);
			device.write([0x00, 0x51, 0x31, 0x01, 0x00, (dpi2/100 + 1)], 65);
			device.write([0x00, 0x51, 0x31, 0x02, 0x00, (dpi3/100 + 1)], 65);
			device.write([0x00, 0x51, 0x31, 0x03, 0x00, (dpi4/100 + 1)], 65);
			device.write([0x00, 0x51, 0x31, 0x04, 0x00, ASUSdeviceLibrary.pollingDict[mousePolling]], 65);
			device.write([0x00, 0x51, 0x31, 0x05, 0x00, ASUSdeviceLibrary.responseDict[mouseResponse]], 65);
			device.write([0x00, 0x51, 0x31, 0x06, 0x00, angleSnapping ? 0x01 : 0x00], 65);
			device.write([0x00, 0x50, 0x03, 0x03], 65);
		}
	}

	sendLightingSettings() {
		if(SettingControl) {
			const lightingSettingsPacket = [0x00, 0x51, 0x37, 0x00, 0x00, ASUSdeviceLibrary.sleepModeDict[sleepTimeout], 0x00, ASUSdeviceLibrary.lowPowerPercentageDict[lowPowerPercentage]];
			device.write(lightingSettingsPacket, 65);

			const applyPacket = [0x00, 0x50, 0x03];
			device.write(applyPacket, 65);
		}
	}

}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x1958: "Chakram Core",
			0x18E3: "Chakram Wireless", // Wired Mode
			0x18E5: "Chakram Wireless",
			0x1A18: "Chakram X",
			0x1A1A: "Chakram X", //Wireless
			0x18DD: "Gladius II Core",
			0x1877: "Gladius II Origin",
			0x1845: "Gladius II Origin",
			0x18B1: "Gladius II Origin - Call of Duty Black Ops 4 edition",
			0x189E: "Gladius II Wired",
			0x18A0: "Gladius II Wireless",
			0x197B: "Gladius III", //WIP
			0x197D: "Gladius III Wireless", // Wired mode
			0x197F: "Gladius III Wireless",
			0x1A72: "Gladius III Aimpoint",
			0x1A70: "Gladius III Aimpoint",
			0x1B0C: "Gladius III Aimpoint", // Evangelion Edition
			0x18E1: "Impact II",
			0x19D2: "Impact II",
			0x1956: "Impact II Electro Punk",
			0x1947: "Impact II Wireless",
			0x1949: "Impact II Wireless",
			0x1A88: "Impact III",
			0x1A92: "ROG Harpe Ace AIM LAB Edition",
			0x1A94: "ROG Harpe Ace AIM LAB Edition",
			0x195C: "ROG Keris",
			0x1960: "ROG Keris",
			0x195E: "ROG Keris",
			0x1A59: "ROG Keris",
			0x1A66: "ROG Keris Aimpoint",
			0x1A68: "ROG Keris Aimpoint", // Wireless
			0x1C0C: "ROG Keris II Origin",
			0x1846: "Pugio I",
			0x1906: "Pugio II",
			0x1908: "Pugio II Wireless",
			//0x181C: "Spatha", // Flash based according to captures
			0x1979: "Spatha X Wireless",
			0x1977: "Spatha X Wireless",
			0x1910: "TUF Gaming M3",
			0x1A9B: "TUF Gaming M3 II",
		};

		this.LEDLibrary	=	{
			"Chakram Core":
			{
				size: [5, 5],
				vLedNames: ["Scroll Wheel", "Logo"],
				vLedPositions: [[1, 4], [1, 1]],
				maxDPI: 16000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/chakram-standard.png",
			},
			"Chakram Wireless":
			{
				size: [5, 5],
				vLedNames: ["Scroll Wheel", "Logo", "Front Zone"],
				vLedPositions: [[1, 4], [1, 1], [1, 0]],
				maxDPI: 16000,
				battery: true,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/chakram-wireless.png"
			},
			"Chakram X":
			{
				size: [3, 4],
				vLedNames: ["Scroll Wheel", "Logo", "Front Zone", "Front Zone 2", "Front Zone 3"],
				vLedPositions: [[1, 1], [1, 3], [0, 0], [1, 0], [2, 0]],
				maxDPI: 36000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "ChakramX",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/chakram-wireless.png"
			},
			"Gladius II Core":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scroll Wheel"],
				vLedPositions: [[3, 5], [3, 0]],
				maxDPI: 6200,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-ii-core.png"
			},
			"Gladius II Origin":
			{
				size: [7, 8],
				vLedNames: ["Scroll Wheel", "Logo", "Underglow"],
				vLedPositions: [[3, 0], [3, 5], [3, 6]],
				maxDPI: 12000,
				Endpoint : { "interface": 2, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-ii-origin.png"
			},
			"Gladius II Origin - Call of Duty Black Ops 4 edition":
			{
				size: [7, 8],
				vLedNames: ["Scroll Wheel!", "Logo", "Underglow"],
				vLedPositions: [[3, 5], [3, 0], [3, 6]],
				maxDPI: 12000,
				Endpoint : { "interface": 2, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-ii-origin-bo4.png"
			},
			"Gladius II Wired":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo"],
				vLedPositions: [[1, 2], [1, 0]],
				maxDPI: 16000,
				battery: true,
				Endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFF13, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-ii-wireless.png"
			},
			"Gladius II Wireless":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo"],
				vLedPositions: [[1, 2], [1, 0]],
				maxDPI: 16000,
				battery: true,
				Endpoint : { "interface": 2, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-ii-wireless.png"
			},
			"Gladius III":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo", "Side Zone 1"],
				vLedPositions: [[1, 2], [1, 0], [0, 0]],
				maxDPI: 19000,
				battery: true,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Modern",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-iii-wireless.png"
			},
			"Gladius III Wireless":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo", "Side Zone 1"],
				vLedPositions: [[1, 2], [1, 0], [0, 0]],
				maxDPI: 19000,
				battery: true,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Modern",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-iii-wireless.png"
			},
			"Gladius III Aimpoint":
			{
				size: [3, 3],
				vLedNames: [ "Logo" ],
				vLedPositions: [[1, 0]],
				maxDPI: 36000,
				battery: true,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Modern",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/gladius-iii-aimpoint.png"
			},
			"Impact II":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo", "Underglow"],
				vLedPositions: [[1, 1], [1, 2], [1, 0]],
				maxDPI: 6200,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/impact-ii-standard.png"
			},
			"Impact II Electro Punk":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo", "Underglow"],
				vLedPositions: [[1, 1], [1, 2], [1, 0]],
				maxDPI: 6200,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/impact-ii-electropunk.png"
			},
			"Impact II Wireless":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo"],
				vLedPositions: [[1, 2], [1, 0]],
				maxDPI: 16000,
				battery: true,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 }, // NEED CONFIRM
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/impact-ii-wireless.png"
			},
			"Impact III":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo"],
				vLedPositions: [[1, 2], [1, 0]],
				maxDPI: 12000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/impact-iii.png",
				brightness: 0x64
			},
			"ROG Harpe Ace AIM LAB Edition":
			{
				size: [3, 5],
				vLedNames: ["Scroll Wheel"],
				vLedPositions: [[1, 0]],
				maxDPI: 36000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Modern",
				DPISupport: true,
				battery: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/harpe-aim-lab.png"
			},
			"ROG Keris":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scroll Wheel"],
				vLedPositions: [[3, 5], [3, 0]],
				maxDPI: 16000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/keris-wireless.png"
			},
			"ROG Keris Aimpoint":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scroll Wheel"],
				vLedPositions: [[3, 5], [3, 0]],
				maxDPI: 16000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/keris-wireless.png",
				brightness: 0x64 // Brightness max its 0x64(100) on Aimpoint instead of 0x04 default one
			},
			"ROG Keris II Origin":
			{
				size: [5, 6],
				vLedNames: ["ROG Logo","Pulley","Side"],
				vLedPositions: [[2, 5],[2, 0],[0, 3]],
				maxDPI: 42000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				brightness: 0x64,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/keris-wireless.png"
			},
			"Pugio I":
			{
				size: [7, 8],
				vLedNames: ["Scroll Wheel", "Logo", "Underglow"],
				vLedPositions: [[3, 0], [3, 5], [3, 6]],
				maxDPI: 7200,
				Endpoint : { "interface": 2, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/pugio-ii.png"
			},
			"Pugio II":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scroll Wheel", "Underglow"],
				vLedPositions: [[3, 5], [3, 0], [3, 6]],
				maxDPI: 16000,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/pugio-ii.png"
			},
			"Pugio II Wireless":
			{
				size: [7, 8],
				vLedNames: ["Logo", "Scroll Wheel", "Underglow"],
				vLedPositions: [[3, 5], [3, 0], [3, 6]],
				maxDPI: 16000,
				//battery: true, // Not tested
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/pugio-ii.png"
			},
			"Spatha":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo", "Side Zone 1", "Side Zone 2"],
				vLedPositions: [[1, 2], [1, 0], [0, 0], [0, 1]],
				maxDPI: 16000,
				Endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0x000C, "collection": 0x0002 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/spatha-x.png"
			},
			"Spatha X Wireless":
			{
				size: [3, 3],
				vLedNames: ["Scroll Wheel", "Logo", "Side Zone 1", "Side Zone 2"],
				vLedPositions: [[1, 2], [1, 0], [0, 0], [0, 1]],
				maxDPI: 19000,
				battery: true,
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Modern",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/spatha-x.png"
			},
			"TUF Gaming M3":
			{
				size: [1, 1],
				vLedNames: [ "Logo" ],
				vLedPositions: [[0, 0]],
				maxDPI: 7000,
				battery: false,
				Endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/tuf-m3.png"
			},
			"TUF Gaming M3 II":
			{
				size: [1, 1],
				vLedNames: [ "Logo" ],
				vLedPositions: [[0, 0]],
				maxDPI: 7000,
				battery: false,
				Endpoint : { "interface": 2, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
				Protocol: "Legacy",
				DPISupport: true,
				brightness: 0x64,
				image: "https://assets.signalrgb.com/devices/brands/asus/mice/tuf-m3-ii.png"
			},
		};

		this.pollingDict = {
			"125Hz"  : 0,
			"250Hz"  : 1,
			"500Hz"  : 2,
			"1000Hz" : 3,
		};

		this.responseDict = {
			"12ms" : 2,
			"16ms" : 3,
			"20ms" : 4,
			"24ms" : 5,
			"28ms" : 6,
			"32ms" : 7,
		};

		this.sleepModeDict = {
			"1" : 0x00,
			"2" : 0x01,
			"3" : 0x02,
			"5" : 0x03,
			"10" : 0x04,
			"Never" : 0xff
		};

		this.lowPowerPercentageDict = {
			"Never" : 0x00,
			"10%" : 0x0A,
			"15%" : 0x0F,
			"20%" : 0x14,
			"25%" : 0x19,
			"30%" : 0x1E
		};
	}
}

const ASUSdeviceLibrary = new deviceLibrary();
const ASUS = new ASUS_Mouse_Protocol();

export function ondpi1Changed() {
	ASUS.sendMouseSetting(0);
}

export function ondpi2Changed() {
	ASUS.sendMouseSetting(1);
}

export function ondpi3Changed() {
	ASUS.sendMouseSetting(2);
}

export function ondpi4Changed() {
	ASUS.sendMouseSetting(3);
}

export function onmousePollingChanged() {
	ASUS.sendMouseSetting(4);
}

export function onangleSnappingChanged() {
	ASUS.sendMouseSetting(6);
}

export function onSettingControlChanged() {
	if(ASUS.getDPISupport()){
		for(let i = 0; i< 4; i++){
			ASUS.sendMouseSetting(i);
		}

		if(ASUS.getDeviceProtocol() === "Modern"){
			ASUS.sendMouseSetting(4);
			ASUS.sendMouseSetting(6);

			if(ASUS.getBatteryFeature()){
				ASUS.sendLightingSettings();
			}
		}
	}
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
	return endpoint.interface === 0 || endpoint.interface === 1 || endpoint.interface === 2;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
