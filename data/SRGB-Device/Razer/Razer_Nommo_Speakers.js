export function Name() { return "Razer Nommo"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return Object.keys(razerDeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "speakers"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

export class deviceLibrary {
	constructor() {

		this.PIDLibrary =
		{
			0x0517 : "Nommo Chroma",
			0x0518 : "Nommo Pro",
			0x055C : "Nommo V2",
			0x055A : "Nommo V2 Pro"
		};

		this.LEDLibrary =
		{
			"Nommo Chroma" :
			{
				Speakers : {
					Speaker_Right : {
						devicename: "Right Speaker",
						lednames: [
							"Right 1", "Right 2", "Right 3", "Right 4", "Right 5", "Right 6", "Right 7", "Right 8", "Right 9", "Right 10", "Right 11", "Right 12",
							"Right 13", "Right 14", "Right 15", "Right 16", "Right 17", "Right 18", "Right 19", "Right 20", "Right 21", "Right 22", "Right 23", "Right 24"
						],
						ledpos:	[
							[4, 11], [5, 10], [5, 9], [6, 8], [6, 7], [7, 6], [7, 5], [6, 4], [6, 3], [5, 2], [5, 1], [4, 0],
							[3, 0], [2, 1], [2, 2], [1, 3], [1, 4], [0, 5], [0, 6], [1, 7], [1, 8], [2, 9], [2, 10], [3, 11]
						],
						ledindexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
						size: [8, 12]
					},
					Speaker_Left : {
						devicename: "Left Speaker",
						lednames: [
							"Left 1", "Left 2", "Left 3", "Left 4", "Left 5", "Left 6", "Left 7", "Left 8", "Left 9", "Left 10", "Left 11", "Left 12",
							"Left 13", "Left 14", "Left 15", "Left 16", "Left 17", "Left 18", "Left 19", "Left 20", "Left 21", "Left 22", "Left 23", "Left 24"
						],
						ledpos:	[
							[4, 11], [5, 10], [5, 9], [6, 8], [6, 7], [7, 6], [7, 5], [6, 4], [6, 3], [5, 2], [5, 1], [4, 0],
							[3, 0], [2, 1], [2, 2], [1, 3], [1, 4], [0, 5], [0, 6], [1, 7], [1, 8], [2, 9], [2, 10], [3, 11]
						],
						ledindexes: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
						size: [8, 12]
					},
				},
				endpoint : { "interface": 1, "usage": 0x0003, "usage_page": 0x0001 },
				LEDsPerPacket : 24,
				PacketHeaders: [0x00],
				image: "https://assets.signalrgb.com/devices/brands/razer/audio/nommo-chroma.png"
			},
			"Nommo Pro" :
			{
				Speakers : {
					Speaker_Right : {
						devicename: "Right Speaker",
						lednames: [
							"Right 1", "Right 2", "Right 3", "Right 4", "Right 5", "Right 6", "Right 7", "Right 8"
						],
						ledpos:	[
							[2, 3], [3, 2], [3, 1], [2, 0], [1, 0], [0, 1], [0, 2], [1, 3]
						],
						ledindexes: [8, 9, 10, 11, 12, 13, 14, 15],
						size: [4, 4]
					},
					Speaker_Left : {
						devicename: "Left Speaker",
						lednames: [
							"Left 1", "Left 2", "Left 3", "Left 4", "Left 5", "Left 6", "Left 7", "Left 8"
						],
						ledpos:	[
							[2, 3], [3, 2], [3, 1], [2, 0], [1, 0], [0, 1], [0, 2], [1, 3]
						],
						ledindexes: [0, 1, 2, 3, 4, 5, 6, 7],
						size: [4, 4]
					},
				},
				endpoint : { "interface": 1, "usage": 0x0003, "usage_page": 0x0001 },
				LEDsPerPacket : 8,
				PacketHeaders: [0x00],
				image: "https://assets.signalrgb.com/devices/brands/razer/audio/nommo-pro.png"
			},
			"Nommo V2" :
			{
				Speakers : {
					Speaker_Right : {
						devicename: "Right Speaker",
						lednames: [
							"Right 1", "Right 2", "Right 3", "Right 4", "Right 5", "Right 6",
						],
						ledpos:	[
							[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
						],
						ledindexes: [0, 1, 2, 3, 4, 5],
						size: [6, 1]
					},
					Speaker_Left : {
						devicename: "Left Speaker",
						lednames: [
							"Left 1", "Left 2", "Left 3", "Left 4", "Left 5", "Left 6"
						],
						ledpos:	[
							[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
						],
						ledindexes: [6, 7, 8, 9, 10, 11],
						size: [6, 1]
					},
				},
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0x000C },
				LEDsPerPacket : 12,
				PacketHeaders: [0x07],
				image: "https://assets.signalrgb.com/devices/brands/razer/audio/nommo-v2.png"
			},
			"Nommo V2 Pro" :
			{
				Speakers : {
					Speaker_Right : {
						devicename: "Right Speaker",
						lednames: [
							"Right 1", "Right 2", "Right 3", "Right 4", "Right 5", "Right 6",
						],
						ledpos:	[
							[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
						],
						ledindexes: [0, 1, 2, 3, 4, 5],
						size: [6, 1]
					},
					Speaker_Left : {
						devicename: "Left Speaker",
						lednames: [
							"Left 1", "Left 2", "Left 3", "Left 4", "Left 5", "Left 6"
						],
						ledpos:	[
							[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
						],
						ledindexes: [6, 7, 8, 9, 10, 11],
						size: [6, 1]
					},
				},
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0x000C },
				LEDsPerPacket : 12,
				PacketHeaders: [0x07],
				image: "https://assets.signalrgb.com/devices/brands/razer/audio/nommo-v2-pro.png"
			},
		};
	}
}

const razerDeviceLibrary = new deviceLibrary();

export function Initialize() {
	Razer.Initialization();
}

export function Render() {
	Razer.sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		Razer.sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		Razer.sendColors(shutdownColor);
		Razer.setModernMatrixEffect([0x00, 0x00, 0x03]); //Hardware mode baby.
	}
}

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
			/** Variable to indicate how many leds should be sent per packet. */
			LEDsPerPacket: -1,
			/** Stored Serial Number to compare against for hyperspeed dongles. We'll update this each time so that we find any and all devices.@type {number[]} */
			LastSerial: [],
			/** Object for the device endpoint to use. Basilisk V3 Uses interface 3 because screw your standardization. */
			deviceEndpoint: { "interface": 0, "usage": 0x0002, "usage_page": 0x0001 },

			DeviceLEDNames : [[], []],
			/** Variable that holds current device's LED Positions. */
			DeviceLEDPositions : [[], []],
			/** Variable that holds current device's LED Indexes. */
			DeviceLEDIndexes : [[], []],
			/** Variable that holds current device's LED Speaker properties. */
			Speakers : {
				Speaker_Right : {
					devicename: "Right Speaker",
					lednames: [],
					ledpos:	[],
					ledindexes: [],
					size: [1, 1]
				},
				Speaker_Left : {
					devicename: "Left Speaker",
					lednames: [],
					ledpos:	[],
					ledindexes: [],
					size: [1, 1]
				},
			},
			PacketHeaders: [0x00],
			/** Variable that holds the current device's Product ID. */
			DeviceProductId : 0x00,
			/** Is the device connected and able to receive commands? */
			DeviceInitialized : false,
			/** Variable Used to Indicate if a Device Requires an Apply Packet for Lighting Data. */
			requiresApplyPacket : false,
			/** Variable Used to Indicate if a Device Uses the Standard Modern Matrix. */
			supportsModernMatrix : false,

			SupportedFeatures:
			{
				BatterySupport: false,
				FirmwareVersionSupport: false,
				SerialNumberSupport: false,
				DeviceModeSupport: false,
				HyperspeedSupport: false,
			}
		};
	}
	/** Function to get the device Init status*/
	getDeviceInitializationStatus() { return this.Config.DeviceInitialized; }
	/** Function to set the device Init status*/
	setDeviceInitializationStatus(initStatus) { this.Config.DeviceInitialized = initStatus; }

	/** Function to get the device PID property, this is not the actual PID from Windows*/
	getDeviceProductId() { return this.Config.DeviceProductId; }
	/** Function to set the device PID property, this is not the actual PID from Windows*/
	setDeviceProductId(productId) { this.Config.DeviceProductId = productId; }

	/** Function to get the device speaker properties*/
	getDeviceSpeakers(){ return this.Config.Speakers; }

	getDeviceLEDNames(Speaker){ return this.Config.Speakers[Speaker].lednames; }
	setDeviceLEDNames(Speaker, DeviceLEDNames) { this.Config.Speakers[Speaker].lednames = DeviceLEDNames; }

	getDeviceLEDPositions(Speaker){ return this.Config.Speakers[Speaker].ledpos; }
	setDeviceLEDPositions(Speaker, DeviceLEDPositions){ this.Config.Speakers[Speaker].ledpos = DeviceLEDPositions; }

	getDeviceLEDIndexes(Speaker){ return this.Config.Speakers[Speaker].ledindexes; }
	setDeviceLEDIndexes(Speaker, DeviceLEDIndexes){ this.Config.Speakers[Speaker].ledindexes = DeviceLEDIndexes; }

	getDeviceSize(Speaker){ return this.Config.Speakers[Speaker].size; }
	setDeviceSize(Speaker, DeviceSize){ this.Config.Speakers[Speaker].size = DeviceSize; }

	getRequiresApplyPacket() { return this.Config.requiresApplyPacket; }
	setRequiresApplyPacket(requiresApplyPacket) { this.Config.requiresApplyPacket = requiresApplyPacket; }

	/** Function to get the Packet header used by the current model */
	getPacketHeaders() { return this.Config.PacketHeaders; }
	/** Function to set the Packet header used by the current model */
	setPacketHeaders(headers) { this.Config.PacketHeaders = headers; }

	/** Function to set our TransactionID*/
	setTransactionID(TransactionID) { this.Config.TransactionID = TransactionID; }

	getSupportsModernMatrix() { return this.Config.supportsModernMatrix; }
	setSupportsModernMatrix(supportsModernMatrix) { this.Config.supportsModernMatrix = supportsModernMatrix; }

	/** Function for setting the number of LEDs a device has to send on each packet */
	getNumberOfLEDsPacket() { return this.Config.LEDsPerPacket; }
	/** Function for setting device led per packet properties.*/
	setNumberOfLEDsPacket(NumberOfLEDsPacket) { this.Config.LEDsPerPacket = NumberOfLEDsPacket; }

	/** Function for getting the device image property */
	getDeviceImage() { return this.Config.image; }
	/** Function for setting the device image property */
	setDeviceImage(image) { this.Config.image = image; }

	/** Function for setting device led properties.*/
	setDeviceProperties() {
		const layout = razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]];

		if (layout) {
			device.log("Valid Library Config found: " + razerDeviceLibrary.PIDLibrary[device.productId()]);
			device.setName("Razer " + razerDeviceLibrary.PIDLibrary[device.productId()]);
			device.setImageFromUrl(layout.image);

			const Speakers = Object.keys(layout.Speakers);

			for (let i = 0; i < Speakers.length; i++) {
				this.setDeviceLEDNames(Speakers[i], layout.Speakers[Speakers[i]].lednames);
				this.setDeviceLEDPositions(Speakers[i], layout.Speakers[Speakers[i]].ledpos);
				this.setDeviceLEDIndexes(Speakers[i], layout.Speakers[Speakers[i]].ledindexes);

				console.log(`Creating subdevice: Speaker ${i+1}`);
				device.createSubdevice(`Speaker${i}`);
				device.setSubdeviceName(`Speaker${i}`, `${layout.Speakers[Speakers[i]].devicename}`);
				device.setSubdeviceSize(`Speaker${i}`, layout.Speakers[Speakers[i]].size[0], layout.Speakers[Speakers[i]].size[1]);
				device.setSubdeviceLeds(`Speaker${i}`, layout.Speakers[Speakers[i]].lednames, layout.Speakers[Speakers[i]].ledpos);
			}

			this.setNumberOfLEDsPacket(layout.LEDsPerPacket);
			this.setPacketHeaders(layout.PacketHeaders);
			this.setDeviceProductId(device.productId());
			this.setDeviceImage(layout.image);
		} else {
			device.log("No Valid Library Config found.");
		}
	}

	Initialization(){
		this.detectDeviceEndpoint();
		device.set_endpoint(this.Config.deviceEndpoint[`interface`], this.Config.deviceEndpoint[`usage`], this.Config.deviceEndpoint[`usage_page`]);
		this.setPacketHeaders(razerDeviceLibrary.LEDLibrary[razerDeviceLibrary.PIDLibrary[device.productId()]].PacketHeaders);
		console.log("Detecting Transaction ID...");
		this.getDeviceTransactionID();
		console.log("Detecting Features...");
		this.detectSupportedFeatures();
		console.log("Setting device properties...");
		this.setDeviceProperties();
		console.log("Enabling Lightning...");
		this.setSoftwareLightingMode(); //we'll need the wake handler at some point for keebs, but for now we don't do features because I could not be bothered.
	}

	sendColors(overrideColor) {
		const RGBData = [];
		const Speakers = this.getDeviceSpeakers();
		const Speakers_keys = Object.keys(Speakers);
		const LEDsPerPacket = this.getNumberOfLEDsPacket();

		for(let iIdx = 0; iIdx < Speakers_keys.length; iIdx++){
			const Speaker = Speakers_keys[iIdx];

			for(let i = 0; i < Speakers[Speaker].ledindexes.length; i++){
				let col;
				const iPxX = Speakers[Speaker].ledpos[i][0];
				const iPxY = Speakers[Speaker].ledpos[i][1];

				if(overrideColor) {
					col = hexToRgb(overrideColor);
				} else if (LightingMode === "Forced") {
					col = hexToRgb(forcedColor);
				} else {
					if(iIdx === 0){
						col = device.subdeviceColor(`Speaker${iIdx}`, iPxX, iPxY);
					}else{
						col = device.subdeviceColor(`Speaker${iIdx}`, iPxX, iPxY);
					}
				}

				const iLedIdx		= Speakers[Speaker].ledindexes[i] * 3;
				RGBData[iLedIdx] 	= col[0];
				RGBData[iLedIdx+1]	= col[1];
				RGBData[iLedIdx+2]	= col[2];
			}
		}
		const packetsTotal = Math.ceil((RGBData.length / 3) / LEDsPerPacket);

		for (let packetCount = 0; packetCount < packetsTotal; packetCount++) {
			this.setDeviceColor(LEDsPerPacket, RGBData.splice(0, LEDsPerPacket*3), packetCount);
			device.pause(1);
		}

	}

	/* eslint-disable complexity */
	/** Function for detection all of the features that a device supports.*/
	detectSupportedFeatures() { //This list is not comprehensive, but is a good start.
		const BatterySupport = this.getDeviceBatteryLevel();

		if (BatterySupport !== -1) {
			this.Config.SupportedFeatures.BatterySupport = true;
			device.addFeature("battery");
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

	}
	/* eslint-enable complexity */
	detectDeviceEndpoint() {

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
		const PacketHeaders = this.getPacketHeaders();

		returnPacket = device.get_report([PacketHeaders[0], 0x00, TransactionID], 91);

		return returnPacket.slice(1, 90);
	}
	/** Wrapper function for Writing Standard Packets, such as RGB Data.*/
	StandardPacketSend(data, TransactionID = this.Config.TransactionID) {//Wrapper for always including our CRC
		const PacketHeaders = this.getPacketHeaders();
		let packet = [PacketHeaders[0], 0x00, TransactionID, 0x00, 0x00, 0x00];
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

					device.log("Error fetching Device Charging Status. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });
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

		if (SerialString.length === 15 && devicesFound === 0) {
			this.Config.TransactionID = TransactionID;
			devicesFound++;
			device.log("Valid Serial Returned:" + SerialString);
			this.Config.LastSerial = SerialString; //Store a serial to compare against later.
		} else if (SerialString.length === 15 && devicesFound > 0 && this.Config.LastSerial !== SerialString) {
			//This deals with the edge case of a device having nonconcurrent transaction ID's. We skip this function if the serials match.
			if (SerialString in this.Config.AdditionalDeviceSerialNumbers) { return devicesFound; }

			device.log("Multiple Devices Found, Assuming this is a Hyperspeed Dongle and has more than 1 device connected.");
			this.Config.SupportedFeatures.HyperspeedSupport = true;
			this.Config.AdditionalDeviceTransactionIDs.push(TransactionID);
			device.log("Valid Serial Returned:" + SerialString);
			this.Config.AdditionalDeviceSerialNumbers.push(SerialString);
			this.Config.LastSerial = SerialString; //Store a serial to compare against later.
		}

		return devicesFound;
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

	/** Function to set a modern mouse to software lighting control mode.*/
	setSoftwareLightingMode() {
		const ModernMatrix = this.getModernMatrixEffect();

		if (ModernMatrix > -1) {
			this.setSupportsModernMatrix(true);
			this.setModernSoftwareLightingMode();
			console.log("Modern matrix set!");
		} else if (this.Config.MouseType === "Modern") {
			this.setLegacyMatrixEffect(); ///MMM Edge cases are tasty.
			console.log("Legacy matrix set!");
		}

		console.log("May there be light!");
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

	/** Function to set a modern keyboard's led colors.*/
	setDeviceColor(LEDsPerPacket, RGBData, packetidx) {
		this.StandardPacketSend([(LEDsPerPacket * 3) + 5, 0x0F, 0x03, 0x00, 0x00, packetidx, 0x00, LEDsPerPacket - 1].concat(RGBData));
	}
}

const Razer = new RazerProtocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0x000C && endpoint.collection === 0x0000 || // Nommo V2 Endpoint
			endpoint.interface === 1 && endpoint.usage === 0x0003 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/audio/nommo-pro.png";
}