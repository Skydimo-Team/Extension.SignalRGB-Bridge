export function Name() { return "Razer Soundbar"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return Object.keys(RAZERdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "speakers";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

export function Initialize() {
	RAZER.InitializeRAZER();
}

export function Render() {
	RAZER.sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		RAZER.sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		RAZER.setDeviceSoftwareMode(false);
	}

}

export class RAZER_Soundbar_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Razer Soundbar",
			DeviceEndpoint: { "interface": 1, "usage": 0x0001, "usage_page": 0xFF00, "collection": 0x0000 },
			Leds: [],
			LedNames: [],
			LedPositions: [],
			Zones: 2,
			PacketHeaders: [0x07, 0x2F, 0x0D],
			PacketLEDs: 15,
			TransactionID: 0x1F,
			WriteLength: 0,
			ReadLength: 0
		};

		this.DeviceResponses = Object.freeze(
			{
				0x01: "Device Busy",
				0x02: "Command Success",
				0x03: "Command Failure",
				0x04: "Command Time Out",
				0x05: "Command Not Supported"
			}
		);
	}

	getDeviceProperties(deviceName) { return RAZERdeviceLibrary.LEDLibrary[deviceName];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getZones() { return this.Config.Zones; }
	setZones(zones) { this.Config.Zones = zones; }

	getPacketHeaders() { return this.Config.PacketHeaders; }
	setPacketHeaders(headers) { this.Config.PacketHeaders = headers; }

	getPacketLEDs() { return this.Config.PacketLEDs; }
	setPacketLEDs(leds) { this.Config.PacketLEDs = leds; }

	getTransactionID() { return this.Config.TransactionID; }
	setTransactionID(transactionID) { this.Config.TransactionID = transactionID; }

	getWriteLength() { return this.Config.WriteLength; }
	setWriteLength(length) { this.Config.WriteLength = length; }

	getReadLength() { return this.Config.ReadLength; }
	setReadLength(length) { this.Config.ReadLength = length; }

	getDeviceImage(deviceName) { return RAZERdeviceLibrary.imageLibrary[deviceName]; }

	InitializeRAZER() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(RAZERdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.Endpoint);
		this.setLeds(DeviceProperties.vLeds);
		this.setLedNames(DeviceProperties.vLedNames);
		this.setLedPositions(DeviceProperties.vLedPositions);
		this.setZones(DeviceProperties.Zones);
		this.setPacketHeaders(DeviceProperties.PacketHeaders);
		this.setPacketLEDs(DeviceProperties.PacketLEDs);
		this.setWriteLength(DeviceProperties.WriteLength);
		this.setReadLength(DeviceProperties.ReadLength);
		device.set_endpoint(DeviceProperties.Endpoint[`interface`], DeviceProperties.Endpoint[`usage`], DeviceProperties.Endpoint[`usage_page`]);

		console.log("Initializing device...");
		this.getDeviceTransactionID();
		this.setDeviceSoftwareMode();

		console.log(`Device model found: ` + this.getDeviceName());
		device.setName("RAZER " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage(this.getDeviceName()));

	}

	sendColors(overrideColor) {

		const deviceLeds 			= this.getLeds();
		const deviceLedPositions 	= this.getLedPositions();
		const PacketHeaders 		= this.getPacketHeaders();
		const PacketLEDs 			= this.getPacketLEDs();
		const DeviceZones 			= this.getZones();

		const RGBData = [];

		for(let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLedPositions[iIdx][0];
			const iPxY = deviceLedPositions[iIdx][1];
			let col;

			if (overrideColor){
				col = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.color(iPxX, iPxY);
			}

			const iLedIdx 		= deviceLeds[iIdx] * 3;
			RGBData[iLedIdx] 	= col[0];
			RGBData[iLedIdx+1] 	= col[1];
			RGBData[iLedIdx+2] 	= col[2];
		}

		for(let zone = 0; zone < DeviceZones; zone++){
			const packet = [PacketHeaders[1], 0x0F, 0x03, 0x00, 0x00, zone, 0x00, PacketHeaders[2]].concat(RGBData.splice(0, PacketLEDs*3));
			this.StandardPacketSend(packet);
		}
	}

	CalculateCrc(report) {
		let iCrc = 0;

		for (let iIdx = 3; iIdx < (this.getWriteLength() - 2); iIdx++) {
			iCrc ^= report[iIdx];
		}

		return iCrc;
	}

	setDeviceSoftwareMode(mode = true) {
		const packet = [0x02, 0x00, 0x04, mode === true ? 0x03 : 0x00];

		console.log("Enabling software mode...");
		this.StandardPacketSend(packet);
	}

	getDeviceTransactionID() { //Most devices return at minimum 2 Transaction ID's. We throw away any besides the first one.
		const possibleTransactionIDs = [0x1f, 0x2f, 0x3f, 0x4f, 0x5f, 0x6f, 0x7f, 0x8f, 0x9f];
		let devicesFound = 0;
		let loops = 0;

		if([0x0532, 0x054A].includes(this.getDeviceProductId())) {
			return;  // This breaks on V2 and X
		}

		console.log("Starting to search Transaction ID...");

		do {
			for (let testTransactionID = 0x00; testTransactionID < possibleTransactionIDs.length; testTransactionID++) {
				const TransactionID = possibleTransactionIDs[testTransactionID];
				const packet = [0x02, 0x00, 0x82];

				const [returnPacket, errorCode] = this.ConfigPacketSend(packet, TransactionID);

				if (errorCode !== 2) {

					console.log("Error fetching Device Charging Status. Error Code: " + this.DeviceResponses[errorCode], { toFile: true });
				}

				const Serialpacket = returnPacket.slice(8, 23);

				if (Serialpacket.every(item => item !== 0)) {
					const SerialString = String.fromCharCode(...Serialpacket);

					devicesFound = this.checkDeviceTransactionID(TransactionID, SerialString, devicesFound);
					this.ConfigPacketRead(TransactionID);
				}

				device.pause(400);
			}

			loops++;
		}
		while (devicesFound === 0 && loops < 5);
	}

	/**Function to ensure that a grabbed transaction ID is not for a device we've already found a transaction ID for.*/
	checkDeviceTransactionID(TransactionID, SerialString, devicesFound) {
		console.log(`Serial String ${SerialString}`);

		if (SerialString.length === 15 && devicesFound === 0) {
			this.setTransactionID(TransactionID);
			devicesFound++;
			console.log("Valid Serial Returned: " + SerialString);
		} else {
			console.log("Device serial not recognized! No TransactionID set.");
		}

		return devicesFound;
	}

	/** Wrapper function for Writing Config Packets and fetching a response.*/
	/** @returns {[number[], number]} */
	ConfigPacketSend(packet, TransactionID = this.getTransactionID()) {
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
	ConfigPacketRead(TransactionID = this.getTransactionID()) {
		let returnPacket = [];
		const length = this.getReadLength();

		returnPacket = device.get_report([0x00, 0x00, TransactionID], length);

		return returnPacket.slice(1, length - 1);
	}

	packetSend(packet) { //Wrapper for always including our CRC
		const packetToSend = packet;
		const length = this.getWriteLength();
		packetToSend[length - 2] = this.CalculateCrc(packet);
		device.send_report(packetToSend, length);
	}

	/** Wrapper function for Writing Standard Packets, such as RGB Data.*/
	StandardPacketSend(data, TransactionID = this.getTransactionID()) {//Wrapper for always including our CRC
		const PacketHeaders = this.getPacketHeaders();
		const length = this.getWriteLength();
		let packet = [PacketHeaders[0], 0x00, TransactionID, 0x00, 0x00, 0x00];

		packet = packet.concat(data);
		packet[length - 2] = this.CalculateCrc(packet);
		device.send_report(packet, length);
	}

}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x0532: "Leviathan V2",
			0x054A: "Leviathan V2 X",
			0x0548: "Leviathan V2 Pro",
		};

		this.LEDLibrary	=	{
			"Leviathan V2":
			{
				size: [18, 1],
				vLeds:[
					0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
				],
				vLedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10", "LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17 ", "LED 18"
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0]
				],
				Endpoint : { "interface": 2, "usage": 0x0001, "usage_page": 0x000C, "collection": 0x0000 },
				Zones : 2,
				PacketHeaders: [0x08, 0x20, 0x08],
				PacketLEDs: 9,
				WriteLength: 91,
				ReadLength: 91
			},
			"Leviathan V2 X":
			{
				size: [14, 1],
				vLeds:[
					0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
				],
				vLedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10", "LED 11", "LED 12", "LED 13", "LED 14",
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
				],
				Endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0x000C, "collection": 0x0000 },
				Zones : 1,
				PacketHeaders: [0x07, 0x2F, 0x0D],
				PacketLEDs: 14,
				WriteLength: 91,
				ReadLength: 91
			},
			"Leviathan V2 Pro":
			{
				size: [30, 1],
				vLeds:[
					0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29
				],
				vLedNames: [
					"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14",
					"Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20", "Led 21", "Led 22", "Led 23", "Led 24", "Led 25", "Led 26", "Led 27", "Led 28", "Led 29", "Led 30"
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0], [27, 0], [28, 0], [29, 0],
				],
				Endpoint : { "interface": 4, "usage": 0x0003, "usage_page": 0x0001, "collection": 0x0000 },
				Zones : 2,
				PacketHeaders: [0x00, 0x32, 0x0E],
				PacketLEDs: 15,
				WriteLength: 65,
				ReadLength: 65
			},
		};

		this.imageLibrary = {
			"Leviathan V2":		"https://assets.signalrgb.com/devices/brands/razer/audio/leviathan-v2.png",
			"Leviathan V2 X":	"https://assets.signalrgb.com/devices/brands/razer/audio/leviathan-v2-x.png",
			"Leviathan V2 Pro":	"https://assets.signalrgb.com/devices/brands/razer/audio/leviathan-v2-pro.png",
		};
	}
}

const RAZERdeviceLibrary = new deviceLibrary();
const RAZER = new RAZER_Soundbar_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 0 || endpoint.interface === 2 || endpoint.interface === 4;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/audio/leviathan-v2.png";
}
