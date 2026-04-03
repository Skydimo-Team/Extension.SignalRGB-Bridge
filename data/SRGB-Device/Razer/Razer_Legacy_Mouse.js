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
SettingControl:readonly
DPIRollover:readonly
dpiStages:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
dpi6:readonly
pollingRate:readonly
*/
export function ControllableParameters() {
	return [
		{ "property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default": "#009bde" },

	];
}

let vLedNames = [];
let vLedPositions = [];
let macroTracker;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	deviceInitialization();
}

export function Render() {

	//detectInputs();
	grabColors();

}

export function Shutdown() {
	grabColors(true);
	Razer.setDeviceMode("Hardware Mode");
}

export function onSettingControlChanged() {
	if (SettingControl) {
		DpiHandler.setEnableControl(true);

		deviceInitialization();
	} else {
		Razer.setDeviceMode("Hardware Mode");
		DpiHandler.setEnableControl(false);
	}
}

export function ondpiStagesChanged() {
	DpiHandler.maxDPIStage = dpiStages;
}

export function ondpi1Changed() {
	DpiHandler.DPIStageUpdated(1);
}

export function ondpi2Changed() {
	DpiHandler.DPIStageUpdated(2);
}

export function ondpi3Changed() {
	DpiHandler.DPIStageUpdated(3);
}

export function ondpi4Changed() {
	DpiHandler.DPIStageUpdated(4);
}

export function ondpi5Changed() {
	DpiHandler.DPIStageUpdated(5);
}

export function ondpi6Changed() {
	DpiHandler.DPIStageUpdated(6);
}

function deviceInitialization() {

	Razer.detectDeviceEndpoint();
	device.set_endpoint(Razer.Config.deviceEndpoint[`interface`], Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);
	Razer.setDeviceLightingProperties();
	Razer.getDevicePollingRate();
	Razer.getDeviceFirmwareVersion();
	Razer.getDeviceSerial();
	Razer.setDeviceMode("Software Mode");

	if (SettingControl) {
		Razer.setDevicePollingRate(pollingRate);
		DpiHandler.setEnableControl(true);
		DpiHandler.maxDPIStage = dpiStages;
		DpiHandler.dpiRollover = DPIRollover;
		Razer.setDeviceMode("Software Mode");
		DpiHandler.setEnableControl(true);
		DpiHandler.setDpi();
	}
}

function detectInputs() {

	device.set_endpoint(1, 0x00000, 0x0001);

	const packet = device.read([0x00], 16, 1);

	const currentMacroArray = packet.slice(1, 10);

	device.set_endpoint(Razer.Config.deviceEndpoint[`interface`], Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);

	if (!macroTracker) { macroTracker = new ByteTracker(currentMacroArray); device.log("Macro Tracker Spawned."); }

	if (packet[0] === 0x04) {
		if (macroTracker.Changed(currentMacroArray)) {
			processInputs(macroTracker.Added(), macroTracker.Removed());
		}
	}
}

function processInputs(Added, Removed) {

	for (let values = 0; values < Added.length; values++) {
		const input = Added.pop();

		switch (input) {
		case 0x20:
			device.log("DPI Up");
			DpiHandler.increment();
			break;
		case 0x21:
			device.log("DPI Down");
			DpiHandler.decrement();
			break;
		case 0x22:
			device.log("Right Back Button");
			DpiHandler.decrement();
			break;
		case 0x23:
			device.log("Right Forward Button");
			DpiHandler.increment();
			break;
		case 0x50:
			device.log("Profile Button Hit.");
			break;
		case 0x51:
			device.log("DPI Clutch Hit.");
			DpiHandler.SetSniperMode(true);
			break;
		case 0x52:
			device.log("DPI Cycle Hit.");
			DpiHandler.increment();
			break;
		case 0x54:
			device.log("Scroll Accel Button Hit.");
			break;
		}
	}

	for (let values = 0; values < Removed.length; values++) {
		const input = Removed.pop();

		if (input === 0x51) {
			device.log("DPI Clutch Released.");
			DpiHandler.SetSniperMode(false);
		}
	}

}

function grabColors(shutdown = false) {

	const RGBData = [];

	for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if (shutdown) {
			col = hexToRgb(shutdownColor);
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

	RazerMouse.setMouseLighting(RGBData);
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
		this.PIDLibrary =
		{
			0x0043 : "Deathadder Chroma",
		};

		this.LEDLibrary = //I'm tired of not being able to copy paste between files.
		{
			"Deathadder Chroma":
			{
				size: [3, 3],
				vLedNames: ["ScrollWheel", "Logo"],
				vLedPositions: [[2, 0], [2, 2]],
				maxDPI: 12400,
				legacyLighting : true,
				legacyLightingZones : [1, 4]
			},

		};
	}
}

const razerDeviceLibrary = new deviceLibrary();

export class RazerProtocol {
	constructor() {
		/** Defines for the 3 device modes that a Razer device can be set to. FactoryMode should never be used, but is here as reference. */
		this.DeviceModes =
		{
			"Hardware Mode": 0x00,
			"Factory Mode": 0x02,
			"Software Mode": 0x03,
			0x00: "Hardware Mode",
			0x02: "Factory Mode",
			0x03: "Software Mode"
		};
		/** Defines for responses coming from a device in response to commands. */
		this.DeviceResponses =
		{
			0x01: "Device Busy",
			0x02: "Command Success",
			0x03: "Command Failure",
			0x04: "Command Time Out",
			0x05: "Command Not Supported"
		};
		/** These are used to identify what LED zone we're poking at on a device. Makes no difference for RGB Sends as it doesn't work with Legacy devices, but it does tell us what zones a modern device has to some extent.*/
		this.LEDIDs =
		{
			"Scroll_Wheel": 0x01,
			"Battery": 0x02,
			"Logo": 0x03,
			"Backlight": 0x04,
			"Macro": 0x05,
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
		};

		this.Config =
		{
			/** ID used to tell which device we're talking to. Most devices have a hardcoded one, but hyperspeed devices can have multiple if a dongle has multiple connected devices. */
			TransactionID: 0x1f,
			/** Variable to indicate what type of device is connected. */
			DeviceType: "Mouse", //Default to mouse. Also this won't work with hyperspeed.
			/** Object for the device endpoint to use. Basilisk V3 Uses interface 3 because screw your standardization. */
			deviceEndpoint: { "interface": 0, "usage": 0x0002, "usage_page": 0x0001 },
		};
	}
	/** Function to set our TransactionID*/
	setTransactionID(TransactionID) {
		this.Config.TransactionID = TransactionID;
	}
	/** Function for setting device led properties.*/
	setDeviceLightingProperties() {
		const DeviceInfo = razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]];
		vLedNames = [];
		vLedPositions = [];

		if (DeviceInfo) {
			device.log("Valid Library Config found.");
			device.setName("Razer " + razerDeviceLibrary.PIDLibrary[device.productId()]);
			device.setSize(DeviceInfo.size);
			vLedNames.push(...DeviceInfo.vLedNames);
			vLedPositions.push(...DeviceInfo.vLedPositions);

			device.addProperty({ "property": "SettingControl", "group": "mouse", "label": "Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type": "boolean", "default": "false" });
			device.addProperty({ "property": "DPIRollover", "group": "mouse", "label": "DPI Stage Rollover", description: "Allows DPI Stages to loop in a circle, going from last stage to first one on button press", "type": "boolean", "default": "true" });
			device.addProperty({ "property": "dpiStages", "group": "mouse", "label": "Number of DPI Stages", description: "Sets the number of active DPI stages to cycle though", "step": "1", "type": "number", "min": "1", "max": "5", "default": "5" });
			device.addProperty({ "property": "dpi1", "group": "mouse", "label": "DPI 1", "step": "50", "type": "number", "min": "200", "max": DeviceInfo.maxDPI, "default": "400" });
			device.addProperty({ "property": "dpi2", "group": "mouse", "label": "DPI 2", "step": "50", "type": "number", "min": "200", "max": DeviceInfo.maxDPI, "default": "800" });
			device.addProperty({ "property": "dpi3", "group": "mouse", "label": "DPI 3", "step": "50", "type": "number", "min": "200", "max": DeviceInfo.maxDPI, "default": "1200" });
			device.addProperty({ "property": "dpi4", "group": "mouse", "label": "DPI 4", "step": "50", "type": "number", "min": "200", "max": DeviceInfo.maxDPI, "default": "1600" });
			device.addProperty({ "property": "dpi5", "group": "mouse", "label": "DPI 5", "step": "50", "type": "number", "min": "200", "max": DeviceInfo.maxDPI, "default": "2000" });
			device.addProperty({ "property": "dpi6", "group": "mouse", "label": "Sniper Button DPI", "step": "50", "type": "number", "min": "200", "max": DeviceInfo.maxDPI, "default": "200" });
			device.addProperty({ "property": "pollingRate", "group": "mouse", "label": "Polling Rate", description: "Sets the Polling Rate of this device", "type": "combobox", "values": ["1000", "500", "125"], "default": "1000" });

			device.setControllableLeds(vLedNames, vLedPositions);
		} else {
			device.log("No Valid Library Config found.");
		}
	}
	/** Function to Detect if we have a Basilisk V3 Attached. */
	detectDeviceEndpoint() {//Oh look at me. I'm a basilisk V3. I'm special

		const deviceEndpoints = device.getHidEndpoints();
		const devicePID = device.productId();

		for (let endpoints = 0; endpoints < deviceEndpoints.length; endpoints++) {
			const endpoint = deviceEndpoints[endpoints];

			if (endpoint) {
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
	/** @returns {[number[], string]} */
	ConfigPacketSend(packet, TransactionID = this.Config.TransactionID) {
		this.StandardPacketSend(packet, TransactionID);
		device.pause(10);

		const returnPacket = this.ConfigPacketRead();
		let errorCode = "";

		if (returnPacket[0] !== undefined) {
			errorCode = this.DeviceResponses[returnPacket[0]];
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
		device.pause(5);
	}
	/**Razer Specific CRC Function that most devices require.*/
	CalculateCrc(report) {
		let iCrc = 0;

		for (let iIdx = 3; iIdx < 89; iIdx++) {
			iCrc ^= report[iIdx];
		}

		return iCrc;
	}
	/** Function to fetch a device's serial number. This serial is the same as the one printed on the physical device.*/
	getDeviceSerial() {
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x16, 0x00, 0x82]);

		if (errorCode !== "Command Success") {

			device.log("Error fetching Device Serial. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (returnPacket !== undefined) {

			const Serialpacket = returnPacket.slice(8, 23);
			const SerialString = String.fromCharCode(...Serialpacket);

			device.log("Device Serial: " + SerialString);

			return SerialString;
		}

		return -3;
	}
	/** Function to check a device's firmware version.*/
	getDeviceFirmwareVersion() {
		const [returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x00, 0x81]);

		if (errorCode !== "Command Success") {

			device.log("Error fetching Device Firmware Version. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (returnPacket !== undefined) {
			const FirmwareByte1 = returnPacket[8];
			const FirmwareByte2 = returnPacket[9];
			device.log("Firmware Version: " + FirmwareByte1 + "." + FirmwareByte2);

			return [FirmwareByte1, FirmwareByte2];
		}


		return -3;
	}
	/** Function to check if a device is in Hardware Mode or Software Mode. */
	getDeviceMode() {

		const [returnPacket, errorCode] = this.ConfigPacketSend([0x02, 0x00, 0x84]); //2,3,1

		if (errorCode !== "Command Success") {

			device.log("Error fetching Current Device Mode. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (returnPacket[8] !== undefined) {
			const deviceMode = returnPacket[8];
			device.log("Current Device Mode: " + this.DeviceModes[deviceMode]);

			return deviceMode;
		}

		return -3;
	}
	/** Function to set a device's mode between hardware and software.*/
	setDeviceMode(mode) {
		const returnValues = this.ConfigPacketSend([0x02, 0x00, 0x04, this.DeviceModes[mode]]);
		const errorCode = returnValues[1];

		if (errorCode !== "Command Success") {

			device.log("Error Setting Device Mode. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		return this.getDeviceMode(); //Log device mode after switching modes.
	}
	/** Function to fetch a device's polling rate. We do not currently parse this at all.*/
	getDevicePollingRate() {
		let pollingRate;
		const [returnPacket, errorCode] = Razer.ConfigPacketSend([0x01, 0x00, 0x85]);

		if (errorCode !== "Command Success") {

			device.log("Error fetching Current Device Polling Rate. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (returnPacket[8] !== 0 && returnPacket[8] !== undefined) {
			pollingRate = returnPacket[8];
			device.log("Polling Rate: " + 1000 / pollingRate + "Hz", { toFile: true });

			return pollingRate;
		}
		const [secondaryreturnPacket, secondaryErrorCode] = Razer.ConfigPacketSend([0x01, 0x00, 0xC0]);

		if (secondaryErrorCode !== "Command Success") {

			device.log("Error fetching Current Device High Polling Rate. Error Code: " + secondaryErrorCode, { toFile: true });

			if (secondaryErrorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (secondaryreturnPacket[9] !== 0 && secondaryreturnPacket[9] !== undefined) {
			pollingRate = secondaryreturnPacket[9];
			device.log("Polling Rate: " + 8000 / pollingRate + "Hz", { toFile: true });
			this.Config.HighPollingRateSupport = true;

			return pollingRate;
		}

		return -3;
	}
	/** Function to set a device's polling rate.*/
	setDevicePollingRate(pollingRate) {
		this.ConfigPacketSend([0x01, 0x00, 0x05, 1000 / pollingRate]);
	}
	/** Function to set a legacy mouse's led effect.*/
	setLegacyLEDEffect(zone) {//This only needs set once, that being said if you only set it once it does a stupid gradient. This is technically bypassing the gradient by forcing the effect. Interesting.
		this.StandardPacketSend([0x03, 0x03, 0x02, 0x00, zone]);//Applies to Deathadder Chroma and older mice 0x00 is save to flash variable
	}//This does not get a return to save cycles.
}

const Razer = new RazerProtocol();

class RazerMouseFunctions {
	constructor() {
	}
	/** Function to fetch a device's onboard DPI levels. We do not currently parse this at all.*/
	getDeviceCurrentDPI() {
		const [returnPacket, errorCode] = Razer.ConfigPacketSend([0x07, 0x04, 0x85, 0x00]);

		if (errorCode !== "Command Success") {

			device.log("Error fetching Current Device DPI. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (returnPacket !== undefined) {
			if (returnPacket[9] === undefined || returnPacket[10] === undefined || returnPacket[11] === undefined || returnPacket[12] === undefined) {
				device.log("Error fetching Current Device DPI. Device returned out of spec response", { toFile: true });

				return -2;
			}

			const dpiX = returnPacket[9] * 256 + returnPacket[10];
			const dpiY = returnPacket[11] * 256 + returnPacket[12];
			device.log("Current DPI X Value: " + dpiX), { toFile: true };
			device.log("Current DPI Y Value: " + dpiY), { toFile: true };

			return [dpiX, dpiY];
		}

		return -3;
	}
	/** Function to set a device's current stage dpi. We leverage this with software buttons to emulate multiple stages.*/
	setDeviceSoftwareDPI(dpi) {
		const returnValues = Razer.ConfigPacketSend([0x07, 0x04, 0x05, 0x00, dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff]);
		device.pause(500);

		const errorCode = returnValues[1];

		if (errorCode !== "Command Success") {

			device.log("Error setting Device Software DPI. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		device.pause(20);

		return 0;
	}
	/** Handler function to set mouse lighting regardless of protocol.*/
	setMouseLighting(RGBData) { //no returns on this or the led color sets. I do not care.
		this.setLegacyMouseLEDColor(RGBData);
	}
	/** Function to set a legacy mouse's led color.*/
	setLegacyMouseLEDColor(rgbdata) {//Color for Deathadder Chroma
		const ledProperties = razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]];

		for(let LEDs = 0; LEDs < ledProperties.legacyLightingZones.length; LEDs++) {
			const zone = ledProperties.legacyLightingZones[LEDs];
			const RGBDataToSend = rgbdata.splice(0, 3);
			Razer.StandardPacketSend([0x05, 0x03, 0x01, 0x00, zone, RGBDataToSend[0], RGBDataToSend[1], RGBDataToSend[2]]);
			Razer.setLegacyLEDEffect(zone);
		}

	}
	/** Function to fetch a legacy mouse's led brightness.*/
	getLegacyMouseLEDBrightness(led = 0, detection = false) {
		const [returnPacket, errorCode] = Razer.ConfigPacketSend([0x03, 0x03, 0x83, 0x00, led]);

		if (errorCode !== "Command Success") {

			if(!detection) {
				device.log("Error fetching Legacy Mouse LED Brightness. Error Code: " + errorCode, { toFile: true });
			}

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		if (returnPacket[10] !== undefined) {
			const brightness = returnPacket[10] ?? 0;
			device.log(`LED ${led} is set to ${brightness * 100 / 255}% brightness.`, { toFile: true });

			return brightness;
		}

		return -3;
	}
	/** Function to set a legacy mouse's led brightness.*/
	setLegacyMouseLEDBrightness(brightness, led = 0) {
		const returnValues = Razer.ConfigPacketSend([0x03, 0x03, 0x03, 0x00, led, brightness * 255 / 100]);
		const errorCode = returnValues[1];

		if (errorCode !== "Command Success") {

			device.log("Error setting Legacy Mouse LED Brightness. Error Code: " + errorCode, { toFile: true });

			if (errorCode === "Device Busy") {
				return -2;
			}

			return -1;
		}

		return 0;
	}
}

const RazerMouse = new RazerMouseFunctions();

class DPIManager {
	constructor(DPIConfig) {
		this.currentStage = 1;
		this.sniperStage = 6;

		this.DPISetCallback = function () { device.log("No Set DPI Callback given. DPI Handler cannot function!"); };

		if (DPIConfig.hasOwnProperty("callback")) {
			this.DPISetCallback = DPIConfig.callback;
		}

		this.sniperMode = false;
		this.enableDpiControl = false;
		this.maxDPIStage = 5; //Default to 5 as it's most common if not defined
		this.dpiRollover = false;
		this.dpiStageValues = {};

		if (DPIConfig.hasOwnProperty("callback")) {
			this.dpiStageValues = DPIConfig.stages;
		} else {
			device.log("No Set DPI Callback given. DPI Handler cannot function!");
		}
	}
	/** Enables or Disables the DPIHandler*/
	setEnableControl(EnableDpiControl) {
		this.enableDpiControl = EnableDpiControl;
	}
	/** GetDpi Value for a given stage.*/
	getDpiValue(stage) {
		// TODO - Bounds check
		// This is a dict of functions, make sure to call them
		device.log("Current DPI Stage: " + stage);
		device.log("Current DPI: " + this.dpiStageValues[stage]());

		return this.dpiStageValues[stage]();
	}
	/** SetDpi Using Callback. Bypasses setStage.*/
	setDpi() {
		if (!this.enableDpiControl) {
			return;
		}

		if (this.sniperMode) {
			this.DPISetCallback(this.getDpiValue(6));
		} else {

			this.DPISetCallback(this.getDpiValue(this.currentStage));
		}
	}
	/** Increment DPIStage */
	increment() {
		this.setStage(this.currentStage + 1);
	}
	/** Decrement DPIStage */
	decrement() {
		this.setStage(this.currentStage - 1);
	}
	/** Set DPIStage and then set DPI to that stage.*/
	setStage(stage) {
		if (stage > this.maxDPIStage) {
			this.currentStage = this.dpiRollover ? 1 : this.maxDPIStage;
		} else if (stage < 1) {
			this.currentStage = this.dpiRollover ? this.maxDPIStage : 1;
		} else {
			this.currentStage = stage;
		}

		this.setDpi();
	}
	/** Stage update check to update DPI if current stage values are changed.*/
	DPIStageUpdated(stage) {
		// if the current stage's value was changed by the user
		// reapply the current stage with the new value
		if (stage === this.currentStage) {
			this.setDpi();
		}
	}
	/** Set Sniper Mode on or off. */
	SetSniperMode(sniperMode) {
		this.sniperMode = sniperMode;
		this.setDpi();
	}

}

const DPIConfig =
{
	stages:
	{
		1: function () { return dpi1; },
		2: function () { return dpi2; },
		3: function () { return dpi3; },
		4: function () { return dpi4; },
		5: function () { return dpi5; },
		6: function () { return dpi6; }
	},
	callback: function (dpi) { return RazerMouse.setDeviceSoftwareDPI(dpi); }
};

const DpiHandler = new DPIManager(DPIConfig);


class ByteTracker {
	constructor(vStart) {
		this.vCurrent = vStart;
		this.vPrev = vStart;
		this.vAdded = [];
		this.vRemoved = [];
	}

	Changed(avCurr) {
		// Assign Previous value before we pull new one.
		this.vPrev = this.vCurrent;
		// Fetch changes.
		this.vAdded = avCurr.filter(x => !this.vPrev.includes(x));
		this.vRemoved = this.vPrev.filter(x => !avCurr.includes(x));

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
	return endpoint.interface === 0 && endpoint.usage === 0x0002 || endpoint.interface === 1 && endpoint.usage === 0x0000 || endpoint.interface === 3 && endpoint.usage === 0x0001;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-chroma.png";
}