export function Name() { return "Razer Device"; }
export function VendorId() { return 0x1532; }
export function Documentation() { return "troubleshooting/razer"; }
export function ProductId() { return Object.keys(razerDeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "other";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0002 || endpoint.interface === 1 && endpoint.usage === 0x0000 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}

let razerDevice;
let macroTracker;

export function LedNames() {
	return [];
}

export function LedPositions() {
	return [];
}

export function Initialize() {
	Razer.detectDeviceEndpoint();
	deviceInitialization();
}

export function Render() {

	if(!Razer.getDeviceInitializationStatus()) {
		deviceInitialization();
	}

	detectInputs();

	if(razerDevice) {
		grabColors();
	}
}

export function Shutdown() {
	if(razerDevice) {
		grabColors(true);
	}
}

function deviceInitialization() {
	device.set_endpoint(Razer.Config.deviceEndpoint[`interface`], Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);
	Razer.getDeviceTransactionID();

	if(Razer.getDeviceInitializationStatus()) {
		createChildren();
		deviceConfiguration();
	}
}

function createChildren() {
	const transactionIds = Razer.Config.DeviceTransactionIDs;


	addChild(transactionIds[0], device.productId());
	device.log(`Device at 0x${transactionIds[0]?.toString(16)} exists!`);

	if(transactionIds.length > 1) {
		device.log("Device has more than one Serial? Something is amiss.", { toFile : true });
	}
}

function addChild(transactionID, devicePID) {
	const deviceConfig = Razer.getDeviceProperties(devicePID);

	if(!deviceConfig) {
		device.notify("Device Unsupported", "SignalRGB Currently does not support this device. Reach out to Support to get it supported.", 1);

		return;
	}

	deviceConfig.deviceProductID = devicePID;
	deviceConfig.transactionID = transactionID;
	deviceConfig.supportedFeatures = Razer.detectSupportedFeatures(transactionID);
	deviceConfig.supportedFeatures.requiresApplyPacket = deviceConfig.requiresApplyPacket;

	razerDevice = new RazerDevice(deviceConfig);
	device.log(`Child Device: ${razerDevice.size}`);
	device.setName("Razer " + razerDevice.name);
	device.setSize(razerDevice.size);
	device.setImageFromUrl(razerDevice.deviceImage);
	device.setControllableLeds(razerDevice.ledNames, razerDevice.ledPositions);
}

function deviceConfiguration() {
	const deviceConfig = razerDevice;

	if(!deviceConfig) {
		return;
	}

	Razer.setDeviceMode("Software Mode");
	Razer.setSoftwareLightingMode(deviceConfig.transactionID);
}


function detectInputs() {

	device.set_endpoint(1, 0x00000, 0x0001);

	const packet = device.read([0x00], 16, 0);

	const currentMacroArray = packet.slice(1, 10);

	device.set_endpoint(Razer.Config.deviceEndpoint[`interface`],
		Razer.Config.deviceEndpoint[`usage`], Razer.Config.deviceEndpoint[`usage_page`]);

	if (!macroTracker) { macroTracker = new ByteTracker(currentMacroArray); spawnMacroHelpers(); device.log("Macro Tracker Spawned."); }

	if (packet[0] === 0x04) {

		if (macroTracker.Changed(currentMacroArray)) {
			processInputs(macroTracker.Added(), macroTracker.Removed());
		}
	}
}

function spawnMacroHelpers() {

	device.addFeature("keyboard");
}

function processInputs(Added, Removed) {

	for (let values = 0; values < Added.length; values++) {
		const input = Added.pop();

		sendMacroEvent(input, false);
	}

	for (let values = 0; values < Removed.length; values++) {
		const input = Removed.pop();
		sendMacroEvent(input, true);
	}
}

function sendMacroEvent(input, state) {
	if(input === 0x5C) {
		const eventData = { key : "Cycle Effect", keyCode : 0, "released": state };
		device.log(`Cycle Effect Hit. Release Status: ${state}`);
		keyboard.sendEvent(eventData, "Key Press");
	}
}

function grabColors(shutdown = false) {
	const ledsPerPacket = razerDevice.ledsPerPacket;

	if(!razerDevice) {
		return;
	}

	const vLedPositions = razerDevice.ledPositions;

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

	const packetsTotal = Math.ceil((RGBData.length / 3) / ledsPerPacket);
	let packetCount = 0;

	do {
		Razer.setModernDeviceColor(ledsPerPacket, RGBData.splice(0, ledsPerPacket*3), packetCount);
		packetCount++;
	}while(packetCount <= packetsTotal);

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
			0x0F59: "Monitor Stand Chroma"
		};

		this.configLibrary =
		{
			"Monitor Stand Chroma":
			{
				name: "Monitor Stand Chroma",
				deviceImage: "https://assets.signalrgb.com/devices/brands/razer/misc/monitor-stand-chroma.png",
				size: [28, 3],
				vLedNames: [
					"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12",
					"Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20", "Led 21", "Led 22", "Led 23", "Led 24",
					"Led 25", "Led 26", "Led 27", "Led 28",
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
					[12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0], [23, 0],
					[24, 0], [25, 0], [26, 0], [27, 0],
				],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0x000C },
				ledsPerPacket: 14
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
				0x05: "Command Not Supported",
				0x07: "NoPIDInBootloader",
				0x09: "Enumerating Device Info Failed",
				0x0A: "FW Version All Zero's",
				0x0B: "Serial All Zeros",
				0x0C: "Write Serial Readback Failed",
				0x0D: "Get Firmware Failed",
				0x0E: "Get Serial Failed",
				0x0F: "Get Edition Failed"
			});
		/** These are used to identify what LED zone we're poking at on a device.
		 * Makes no difference for RGB Sends as it doesn't work with Legacy devices,
		 * but it does tell us what zones a modern device has to some extent.*/
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
			/** ID used to tell which device we're talking to.
			 * Most devices have a hardcoded one, but hyperspeed devices can have multiple if a dongle has multiple connected devices. */
			parentTransactionID: 0x1f,
			/** @type {number[]} Reserved for Hyperspeed Pairing.
			 * Holds additional Transaction ID's for extra paired hyperspeed devices.*/
			DeviceTransactionIDs: [],
			/** Object for the device endpoint to use. Basilisk V3 Uses interface 3 because screw your standardization. */
			deviceEndpoint: { "interface": 0, "usage": 0x0002, "usage_page": 0x0001 },
			/** @type {string[]} Stored Serials for Hyperspeed dongles. */
			DeviceSerialNumbers: [],
			LastSerial: [],
			deviceInitializationStatus : false,

			isHyperspeed: false,
			sleepStatus: false
		};
	}

	getDeviceInitializationStatus() { return this.Config.DeviceInitialized; }
	setDeviceInitializationStatus(initStatus) { this.Config.DeviceInitialized = initStatus; }

	/** Function to set our TransactionID*/
	setParentTransactionID(TransactionID) { this.Config.parentTransactionID = TransactionID; }

	/** Function for setting device led properties.*/
	getDeviceProperties(devicePID = device.productId()) {
		const deviceConfig = razerDeviceLibrary.configLibrary[razerDeviceLibrary.PIDLibrary[devicePID]];

		return deviceConfig;
	}
	/* eslint-disable complexity */
	/** Function for detection all of the features that a device supports.*/
	detectSupportedFeatures(transactionID) { //This list is not comprehensive, but is a good start.
		const supportedFeatures = {
			FirmwareVersion: false,
			SerialNumber: false,
			DeviceMode: false,
			requiresApplyPacket : false,
			ModernMatrix : false
		};

		const FirmwareVersionSupport = this.getDeviceFirmwareVersion(transactionID);

		if (FirmwareVersionSupport !== -1) {
			supportedFeatures.FirmwareVersion = true;
		}
		const SerialNumberSupport = this.getDeviceSerial(transactionID);

		if (SerialNumberSupport !== -1) {
			supportedFeatures.SerialNumber = true;
		}
		const DeviceModeSupport = this.getDeviceMode(transactionID);

		if (DeviceModeSupport !== -1) {
			supportedFeatures.DeviceMode = true;
		}

		const modernMatrixSupport = this.getModernMatrixEffect(transactionID);

		if(modernMatrixSupport !== -1) {
			supportedFeatures.ModernMatrix = true;
		}

		return supportedFeatures;
	}
	/* eslint-enable complexity */
	/** Function to Detect if we have a Basilisk V3 Attached. */
	detectDeviceEndpoint() {//Oh look at me. I'm a basilisk V3. I'm special

		const deviceEndpoints = device.getHidEndpoints();

		const deviceConfig = razerDeviceLibrary.configLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]];

		for (let endpoints = 0; endpoints < deviceEndpoints.length; endpoints++) {
			const endpoint = deviceEndpoints[endpoints];

			if (endpoint) {
				if(deviceConfig.endpoint) {
					this.Config.deviceEndpoint[`interface`] = deviceConfig.endpoint[`interface`];
					this.Config.deviceEndpoint[`usage`] = deviceConfig.endpoint[`usage`];
					this.Config.deviceEndpoint[`usage_page`] = deviceConfig.endpoint[`usage_page`];

					return; //If we found one in the config table, no reason to check for the Basilisk V3.
				}
			}
		}
	}
	/** Wrapper function for Writing Config Packets without fetching a response.*/
	ConfigPacketSendNoResponse(packet, TransactionID = 0x1f) {
		this.StandardPacketSend(packet, TransactionID);
		device.pause(10);
	}
	/** Wrapper function for Writing Config Packets and fetching a response.*/
	/** @returns {number[]} */
	ConfigPacketSend(packet, TransactionID = 0x1f) {
		this.StandardPacketSend(packet, TransactionID);
		device.pause(10);

		const returnPacket = this.ConfigPacketRead(TransactionID);

		return returnPacket;
	}
	/** Wrapper function for Reading Config Packets.*/
	ConfigPacketRead(TransactionID = 0x1f) {
		const returnPacket = device.get_report([0x00, 0x00, TransactionID], 91);

		return returnPacket.slice(1, 90);
	}
	/** Wrapper function for Writing Standard Packets, such as RGB Data.*/
	StandardPacketSend(data, TransactionID = 0x1f) {
		//Wrapper for always including our CRC
		const packet = [0x00, 0x00, TransactionID, 0x00, 0x00, 0x00].concat(data);
		packet[89] = this.CalculateCrc(packet);
		device.send_report(packet, 91);
	}
	/** Wrapper function for sending Config Packets with a retry system and error code checking.*/
	setDeviceFeatureWithResponse(packetToSend, callingFunction, transactionID = 0x1f, retryAttempts = 5) {
		let response;
		let attempts = 0;

		do {
			 response = new RazerReturn(Razer.ConfigPacketSend(packetToSend, transactionID));
			 device.pause(10);
			 attempts++;
		}

		while(attempts < retryAttempts && response.errorCode !== 2);

		if (response.hasError) {
			device.log(`${callingFunction} Returned Error Code ${this.DeviceResponses[response.errorCode]}`);
		}

		return response;
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
	getDeviceTransactionID() {
		//Most devices return at minimum 2 Transaction ID's. We throw away any besides the first one.
		const possibleTransactionIDs = [0x1f, 0x2f, 0x3f, 0x4f, 0x5f, 0x6f, 0x7f, 0x8f, 0x9f, 0xaf, 0xbf, 0xcf, 0xdf, 0xef, 0xff];
		let devicesFound = 0; //Check E8. If it exists it's the dongle.
		device.pause(50);
		device.clearReadBuffer();

		for (let testTransactionID = 0x00; testTransactionID < possibleTransactionIDs.length; testTransactionID++) {
			const TransactionID = possibleTransactionIDs[testTransactionID];

			const response = new RazerReturn(this.ConfigPacketSend([0x02, 0x00, 0x82], TransactionID));
			//We don't log these as most of the transaction id's are going to give null values back.

			const Serialpacket = response.returnPacket.slice(8, 23);

			if (Serialpacket.every(item => item !== 0)) {
				const SerialString = String.fromCharCode(...Serialpacket);

				devicesFound = this.checkDeviceTransactionID(TransactionID, SerialString, devicesFound);
				this.ConfigPacketRead(TransactionID);
			}

			device.pause(200);

			if(devicesFound !== 0) {
				Razer.setDeviceInitializationStatus(true);
			}
		}
	}
	/**Function to ensure that a grabbed transaction ID is not for a device we've already found a transaction ID for.*/
	checkDeviceTransactionID(transactionID, serialString, devicesFound) {
		device.log(`Serial String ${serialString}`);

		if(!this.Config.DeviceTransactionIDs.includes(transactionID)) {
			if (serialString.length === 15 && !this.Config.DeviceSerialNumbers.includes(serialString)) {
				devicesFound++;
				device.log("Valid Serial Returned:" + serialString);
				this.Config.DeviceSerialNumbers.push(serialString);

				this.Config.DeviceTransactionIDs.push(transactionID);
			}

			if(devicesFound > 1) {
				device.log("Multiple Devices Found, Assuming this is a Hyperspeed Dongle and has more than 1 device connected.");
				this.Config.multipointEnabled = true;
			}
		}

		return devicesFound;
	}
	/** Function to fetch a device's serial number. This serial is the same as the one printed on the physical device.*/
	getDeviceSerial(transactionID) {
		const returnedValues = this.setDeviceFeatureWithResponse([0x16, 0x00, 0x82],
			"Device Serial Number", transactionID);
		const returnPacket = returnedValues.returnPacket;

		if (returnPacket === undefined) {
			return -1;
		}

		const Serialpacket = returnPacket.slice(8, 23);
		const SerialString = String.fromCharCode(...Serialpacket);

		device.log("Device Serial: " + SerialString);

		return SerialString;
	}
	/** Function to check a device's firmware version.*/
	getDeviceFirmwareVersion(transactionID) {
		const returnedValues = this.setDeviceFeatureWithResponse([0x02, 0x00, 0x81],
			"Device Firmware Version", transactionID);
		const returnPacket = returnedValues.returnPacket;

		if (returnPacket[8] === undefined || returnPacket[9] === undefined) {
			return -1;
		}

		const FirmwareByte1 = returnPacket[8]; //Major Version
		const FirmwareByte2 = returnPacket[9]; //Minor Version
		//this has 2 extra bytes. Interal Version and Reserved.
		device.log("Firmware Version: " + FirmwareByte1 + "." + FirmwareByte2);

		return [FirmwareByte1, FirmwareByte2];
	}
	/** Function to check if a device is in Hardware Mode or Software Mode. */
	getDeviceMode(transactionID) {
		const returnedValues = this.setDeviceFeatureWithResponse([0x02, 0x00, 0x84],
			"Get Device Mode", transactionID);
		const returnPacket = returnedValues.returnPacket;

		if (returnPacket[8] === undefined) {
			return -1;
		}

		const deviceMode = returnPacket[8];
		device.log("Current Device Mode: " + this.DeviceModes[deviceMode]);

		return deviceMode;
	}
	/** Function to set a device's mode between hardware and software.*/
	setDeviceMode(mode, transactionID) {
		this.setDeviceFeatureWithResponse([0x02, 0x00, 0x04, this.DeviceModes[mode]], "Set Device Mode", transactionID);

		return this.getDeviceMode(transactionID); //Log device mode after switching modes.
	}
	/** Function to set a modern mouse to software lighting control mode.*/
	setSoftwareLightingMode(transactionID) {
		const ModernMatrix = this.getModernMatrixEffect(transactionID);

		if (ModernMatrix > -1) {
			this.setModernSoftwareLightingMode(transactionID);
		} else if (this.Config.MouseType === "Modern") {
			this.setLegacyMatrixEffect(transactionID); ///MMM Edge cases are tasty.
		}
	}
	/** Function to set a legacy device's effect. Why is the Mamba TE so special?*/
	setLegacyMatrixEffect(transactionID) {
		this.setDeviceFeatureWithResponse([0x02, 0x03, 0x0A, 0x05, 0x00], "Set Legacy Matrix Effect", transactionID);

		return 0;
	}
	/** Function to set a modern device's effect*/
	getModernMatrixEffect(transactionID) {
		const returnedValues = this.setDeviceFeatureWithResponse([0x06, 0x0f, 0x82, 0x00],
			"Get Modern Matrix Effect", transactionID);
		const returnPacket = returnedValues.returnPacket;


		device.log(`Modern Matrix Effect Packet: ${returnPacket}`); //TODO: PARSE

		return 0;
	}
	/** Function to set a modern device's effect*/
	setModernMatrixEffect(data, transactionID) {
		this.setDeviceFeatureWithResponse([0x06, 0x0f, 0x02].concat(data),
			"Set Legacy Matrix Effect", transactionID);

		return 0;
	}
	/** Function to set a modern device's effect to custom. */
	setModernSoftwareLightingMode(transactionID) {
		//Not all devices require this, but it seems to be sent to all of them?
		return this.setModernMatrixEffect([0x00, 0x00, 0x08, 0x00, 0x01], transactionID);
	}
    	/** Function to set a modern keyboard's led colors.*/
	setModernDeviceColor(LEDsPerPacket, RGBData, packetidx) {

		if(razerDevice.supportedFeatures.requiresApplyPacket) {
			this.StandardPacketSend([(LEDsPerPacket * 3) + 5, 0x03, 0x0B, 0xFF, packetidx, 0x00, LEDsPerPacket - 1].concat(RGBData)); // Chroma/Synapse2 writing style

			if(!razerDevice.supportedFeatures.ModernMatrix) {
				Razer.setLegacyMatrixEffect();
			} else {
				Razer.setModernMatrixEffect([0x00, 0x00, 0x08, 0x00, 0x01]);
			}
		} else {
			this.StandardPacketSend([(LEDsPerPacket * 3) + 5, 0x0F, 0x03, 0x00, 0x00, packetidx, 0x00, LEDsPerPacket - 1].concat(RGBData));
		}
	}
}

const Razer = new RazerProtocol();

class RazerDevice{
	/* eslint-disable complexity */
	constructor(device){
		this.name = device?.name ?? "Unknown Device";
		this.size = device?.size ?? [1, 1];
		this.ledNames = device?.vLedNames ?? [];
		this.ledPositions =device?.vLedPositions ?? [];
		this.ledMap = device?.vLedMap ?? [];
		this.numberOfLEDs = device?.numberOfLEDs ?? 0;
		this.ledsPerPacket = device?.ledsPerPacket ?? 0;
		this.deviceEndpoint = device?.endpoint ?? { "interface": 0, "usage": 0x0002, "usage_page": 0x0001 };
		this.deviceProductID = device?.deviceProductID ?? 0x0000;
		this.deviceImage = device?.deviceImage ?? "";
		this.deviceInitialized = device?.deviceInitialized ?? false;
		this.transactionID = device?.transactionID ?? 0x1f;
		this.supportedFeatures = device?.supportedFeatures ?? {
			Battery: false,
			FirmwareVersion: false,
			SerialNumber: false,
			DeviceMode: false,
			requiresApplyPacket : false,
			ModernMatrix : false,
		};
	}
}

class RazerReturn{ // RazerError? RazerPacket?
	constructor(packet){
		this.errorCode = packet[0] ?? 0;
		this.returnPacket = packet ?? [];
		this.hasError = this.errorCode !== 2;
	}
}

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