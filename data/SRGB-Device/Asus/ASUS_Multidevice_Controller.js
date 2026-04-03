/* eslint-disable max-len */
/* eslint-disable complexity */
import systeminfo from "@SignalRGB/systeminfo";
export function Name() { return "ASUS Device"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return Object.keys(ASUSdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/ASUS"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "dongle";}
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === 2; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
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

export function Initialize() {
	ASUS.Initialize();
}

export function Render() {
	ASUS.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	ASUS.sendColors(color);
}

export class ASUS_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "ASUS Device",
			DeviceEndpoint: { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(deviceName) { return ASUSdeviceLibrary.LEDLibrary[deviceName];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getLedsZone() { return this.Config.LedsZone; }
	setLedsZone(ledsZone) { this.Config.LedsZone = ledsZone; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getProtocol() { return this.Config.protocol; }
	setProtocol(protocol) { this.Config.protocol = protocol; }

	getWriteType() { return this.Config.writeType; }
	setWriteType(write) { this.Config.writeType = write; }

	getDeviceHeader() { return this.Config.DeviceHeader; }
	setDeviceHeader(header) { this.Config.DeviceHeader = header; }

	getRGBOrder() { return this.Config.RGBOrder; }
	setRGBOrder(RGBOrder) { this.Config.RGBOrder = RGBOrder; }

	getSubdevices() { return this.Config.subdevices; }
	setSubdevices(subdevices) { this.Config.subdevices = subdevices; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const motherboardInfo = systeminfo.GetMotherboardInfo();
		const MotherboardName = motherboardInfo.model;

		const modelID	=	MotherboardName;

		console.log("Fetching model ID: " + modelID);

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setDeviceName(DeviceProperties.name);
			this.setDeviceEndpoint(DeviceProperties.endpoint);
			this.setLeds(DeviceProperties.Leds);
			this.setLedNames(DeviceProperties.LedNames);
			this.setLedPositions(DeviceProperties.LedPositions);
			this.setProtocol(DeviceProperties.protocol);
			this.setWriteType(DeviceProperties.writeType);
			this.setDeviceHeader(DeviceProperties.DeviceHeader);
			this.setRGBOrder(DeviceProperties.RGBOrder);
			this.setDeviceImage(DeviceProperties.image);

			if(DeviceProperties.protocol === "perledv2"){
				this.setLedsZone(DeviceProperties.LedsZone);
			}

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName("ASUS " + this.getDeviceName());

			if(DeviceProperties.subdevices) {
				console.log("Subdevices found, building...");

				this.setSubdevices(DeviceProperties.subdevices);

				for(let subdevice = 0; subdevice < DeviceProperties.subdevices.length; subdevice++){
					device.createSubdevice(`subdevice${subdevice}`);
					device.setSubdeviceName(`subdevice${subdevice}`, `${DeviceProperties.subdevices[subdevice].name}`);
					device.setSubdeviceSize(`subdevice${subdevice}`, DeviceProperties.subdevices[subdevice].size[0], DeviceProperties.subdevices[subdevice].size[1]);
					device.setSubdeviceLeds(`subdevice${subdevice}`, DeviceProperties.subdevices[subdevice].LedNames, DeviceProperties.subdevices[subdevice].LedPositions);
				}
			}

			device.setSize(DeviceProperties.size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage());

			if (DeviceProperties.endpoint[`collection`]){
				device.set_endpoint(
					DeviceProperties.endpoint[`interface`],
					DeviceProperties.endpoint[`usage`],
					DeviceProperties.endpoint[`usage_page`],
					DeviceProperties.endpoint[`collection`]
				);
			}else {
				device.set_endpoint(
					DeviceProperties.endpoint[`interface`],
					DeviceProperties.endpoint[`usage`],
					DeviceProperties.endpoint[`usage_page`]
				);
			}			

			this.setDirectMode();
		}else{
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ MotherboardName);
		}
	}

	setDirectMode() {

		const writeType			=	this.getWriteType();
		const deviceHeader		=	this.getDeviceHeader();
		const asusInitString	=	[deviceHeader, 0x41, 0x53, 0x55, 0x53, 0x20, 0x54, 0x65, 0x63, 0x68, 0x2E, 0x49, 0x6E, 0x63, 0x2E];
		const asusReadString	=	[deviceHeader, 0x05, 0x20, 0x31, 0x00, 0x10];
		const asusInitCode		=	[deviceHeader, 0xBC, 0xD0];

		if (writeType === "report") {
			device.send_report(asusInitString, 64);
			device.get_report(asusInitString, 64);

			device.send_report(asusReadString, 64);
			device.get_report(asusReadString, 64);

			device.send_report(asusInitCode, 64);
		} else {
			device.write(asusInitString, 64);
			device.read(asusInitString, 64);

			device.write(asusReadString, 64);
			device.read(asusReadString, 64);

			device.write(asusInitCode, 64);
		}

	}

	grabColors(overrideColor){

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBOrder				= this.getRGBOrder();
		let	  RGBData				= [];

		if (this.getProtocol() === "perledv2") {
			RGBData				= [[0], [0], [0]];

			let zoneOffset		= 0;

			for (let zone = 0; zone < deviceLeds.length; zone++){
				for (let iIdx = 0; iIdx < deviceLeds[zone].length; iIdx++) {
					const iPxX = deviceLedPositions[iIdx + zoneOffset][0];
					const iPxY = deviceLedPositions[iIdx + zoneOffset][1];
					let color;

					if(overrideColor){
						color = hexToRgb(overrideColor);
					}else if (LightingMode === "Forced") {
						color = hexToRgb(forcedColor);
					}else{
						color = device.color(iPxX, iPxY);
					}

					RGBData[zone][(deviceLeds[zone][iIdx]*3)]   = color[RGBOrder[0]];
					RGBData[zone][(deviceLeds[zone][iIdx]*3)+1] = color[RGBOrder[1]];
					RGBData[zone][(deviceLeds[zone][iIdx]*3)+2] = color[RGBOrder[2]];
				}

				zoneOffset += deviceLeds[zone].length;
			}

			return RGBData;
		}

		// Main device RGBData
		for (let iIdx = 0; iIdx < deviceLedPositions.length; iIdx++) {
			const iPxX = deviceLedPositions[iIdx][0];
			const iPxY = deviceLedPositions[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			RGBData[(deviceLeds[iIdx]*3)]   = color[RGBOrder[0]];
			RGBData[(deviceLeds[iIdx]*3)+1] = color[RGBOrder[1]];
			RGBData[(deviceLeds[iIdx]*3)+2] = color[RGBOrder[2]];
		}

		// Subdevice RGBData
		const subdevices	=	this.getSubdevices();

		if (subdevices) {
			for (let zone = 0; zone < subdevices.length; zone++){
				for (let iIdx = 0; iIdx < subdevices[zone].Leds.length; iIdx++) {
					const iPxX = subdevices[zone].LedPositions[iIdx][0];
					const iPxY = subdevices[zone].LedPositions[iIdx][1];
					let color;

					if(overrideColor){
						color = hexToRgb(overrideColor);
					}else if (LightingMode === "Forced") {
						color = hexToRgb(forcedColor);
					}else{
						color = device.subdeviceColor(`subdevice${zone}`, iPxX, iPxY);
					}

					RGBData[(subdevices[zone].Leds[iIdx]*3)]   = color[RGBOrder[0]];
					RGBData[(subdevices[zone].Leds[iIdx]*3)+1] = color[RGBOrder[1]];
					RGBData[(subdevices[zone].Leds[iIdx]*3)+2] = color[RGBOrder[2]];
				}
			}
		}

		return RGBData;
	}

	sendColors(overrideColor) {

		const RGBData	= this.grabColors(overrideColor);

		switch (this.getProtocol()) {
		case "perledv1":
			this.writePerledv1(RGBData);
			break;
		case "perledv2":
			this.writePerledv2(RGBData);
			break;
		case "zone":
			this.writeZone(RGBData);
			break;
		case "single":
			this.writeSingle(RGBData);
			break;
		default:
			break;
		}
	}

	writePerledv1(RGBData){
		const deviceHeader			= this.getDeviceHeader();
		const writeType				= this.getWriteType();
		let TotalLEDs				= RGBData.length / 3;
		let PacketCount				= 0;

		while(TotalLEDs > 0){
			const ledsToSend = TotalLEDs >= 16 ? 16 : TotalLEDs;

			if (writeType === "report") {
				device.send_report([deviceHeader, 0xBC, 0xD0, 0x01, 0x02, 0x00, PacketCount, ledsToSend, 0x00].concat(RGBData.splice(0, ledsToSend*3)), 64);
			} else {
				device.write([deviceHeader, 0xBC, 0xD0, 0x01, 0x02, 0x00, PacketCount, ledsToSend, 0x00].concat(RGBData.splice(0, ledsToSend*3)), 64);
			}

			TotalLEDs		-= ledsToSend;
			PacketCount++;
		}
	}

	writePerledv2(RGBData){
		const deviceHeader			= this.getDeviceHeader();
		const writeType				= this.getWriteType();
		const LEDsZone				= this.getLedsZone();

		// 0x01 - Keyboard zone
		// 0x04 - Underglow zone
		// 0x05 - Back zone

		for (let zone = 0; zone < LEDsZone.length; zone++) {
			if(LEDsZone[zone][0] === 0x01){
				let	zoneTotalLEDs			= RGBData[zone].length / 3; //TotalLEDs[0].length; // Asus sends all 168 leds even if they aren't present in the device
				let ledsSent				= 0;

				while(zoneTotalLEDs > 0){
					const ledsToSend			= zoneTotalLEDs >= 16 ? 16 : zoneTotalLEDs;

					if (writeType === "report") {
						const packet = [deviceHeader, 0xBC, 0x00, 0x01, LEDsZone[zone][0], LEDsZone[zone][1], ledsSent, ledsToSend, 0x00].concat(RGBData[zone].splice(0, (ledsToSend*3)));
						device.send_report(packet, 65);
					} else {
						const packet = [deviceHeader, 0xBC, 0x00, 0x01, LEDsZone[zone][0], LEDsZone[zone][1], ledsSent, ledsToSend, 0x00].concat(RGBData[zone].splice(0, (ledsToSend*3)));
						device.write(packet, 65);
					}

					zoneTotalLEDs	-= ledsToSend;
					ledsSent		+= ledsToSend;
				}
			}

			if(LEDsZone[zone][0] === 0x04){
				const	zoneTotalLEDs	= RGBData[zone].length / 3;
				const	ledsToSend		= zoneTotalLEDs >= 16 ? 16 : zoneTotalLEDs;

				if (writeType === "report") {
					const packet = [deviceHeader, 0xBC, 0x00, 0x01, LEDsZone[zone][0], LEDsZone[zone][1], 0x00, 0x00, 0x00].concat(RGBData[zone].splice(0, (ledsToSend*3)));
					device.send_report(packet, 65);
				} else {
					const packet = [deviceHeader, 0xBC, 0x00, 0x01, LEDsZone[zone][0], LEDsZone[zone][1], 0x00, 0x00, 0x00].concat(RGBData[zone].splice(0, (ledsToSend*3)));
					device.write(packet, 65);
				}
			}

			if(LEDsZone[zone][0] === 0x05){
				let	zoneTotalLEDs			= RGBData[zone].length / 3;
				let	ledsSent				= 0;

				while(zoneTotalLEDs > 0){
					const ledsToSend			= zoneTotalLEDs >= 16 ? 16 : zoneTotalLEDs;

					if (writeType === "report") {
						const packet = [deviceHeader, 0xBC, 0x00, 0x01, LEDsZone[zone][0], LEDsZone[zone][1], ledsSent+1, ledsToSend, 0x00].concat(RGBData[zone].splice(0, (ledsToSend*3)));
						device.send_report(packet, 65);
					} else {
						const packet = [deviceHeader, 0xBC, 0x00, 0x01, LEDsZone[zone][0], LEDsZone[zone][1], ledsSent+1, ledsToSend, 0x00].concat(RGBData[zone].splice(0, (ledsToSend*3)));
						device.write(packet, 65);
					}

					zoneTotalLEDs	-= ledsToSend;
					ledsSent		+= ledsToSend;
				}
			}
		}
	}

	writeZone(RGBData){
		const deviceHeader			= this.getDeviceHeader();
		const writeType				= this.getWriteType();

		if (writeType === "report") {
			device.send_report([deviceHeader, 0xBC, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00].concat(RGBData), 65);
		} else {
			device.write([deviceHeader, 0xBC, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00].concat(RGBData), 65);
		}
	}

	writeSingle(RGBData){
		const deviceHeader			= this.getDeviceHeader();
		const writeType				= this.getWriteType();

		if (writeType === "report") {
			device.send_report([deviceHeader, 0xB3, 0x00, 0x00, RGBData[0], RGBData[1], RGBData[2], 0xFF], 65);
		} else {
			device.write([deviceHeader, 0xB3, 0x00, 0x00, RGBData[0], RGBData[1], RGBData[2], 0xFF], 65);
		}
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x1866: "Aura device",
			0x19B6: "Aura device",
		};

		this.LEDLibrary	=	{
			// Cases
			"G10DK": {
				name: "G10DK",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0076, "usage_page": 0xFF31},
				protocol: "single",
				writeType: "report",
				DeviceHeader: 0x5E,
				RGBOrder: [0, 1, 2],
				image: "https://assets.signalrgb.com/devices/brands/asus/cases/g10dk.png",
			},
			"G13CHR": {
				name: "G13CHR",
				size: [9, 27],
				LedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
					"LED 11", "LED 12",	"LED 13", "LED 14",	"LED 15", "LED 16",	"LED 17", "LED 18",	"LED 19", "LED 20",
					"LED 21", "LED 22", "LED 23", "LED 24", "Led 25",
				],
				LedPositions: [
					[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 8], [2, 9], [3, 10],
					[4, 11], [5, 12], [6, 13], [7, 14], [8, 16], [8, 17], [8, 18], [8, 19], [8, 20], [8, 21],
					[8, 22], [8, 23], [8, 24], [8, 25], [8, 26], 
				],
				Leds: [
					0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10,
					11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
					21, 22, 23, 24
				],
				endpoint : { "interface": 0, "usage": 0x0080, "usage_page": 0xFF31},
				protocol: "perledv1",
				writeType: "report",
				DeviceHeader: 0x5E,
				RGBOrder: [0, 1, 2],
				image: "https://assets.signalrgb.com/devices/brands/asus/cases/g13chr.png",
			},
			"G15DK": {
				name: "G15DK",
				size: [24, 1],
				LedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
					"LED 11", "LED 12",	"LED 13", "LED 14",	"LED 15", "LED 16",	"LED 17", "LED 18",	"LED 19", "LED 20",
					"LED 21", "LED 22", "LED 23", "LED 24",
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
					[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
					[20, 0], [21, 0], [22, 0], [23, 0]
				],
				Leds: [ 0, 1, 2, 3,	4, 5, 6, 7,	8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23 ],
				endpoint : { "interface": 0, "usage": 0x0080, "usage_page": 0xFF31},
				protocol: "perledv1",
				writeType: "report",
				DeviceHeader: 0x5E,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/cases/g15dk.png",
			},
			"G15CF": {
				name: "G15CF",
				size: [24, 1],
				LedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
					"LED 11", "LED 12",	"LED 13", "LED 14",	"LED 15", "LED 16",	"LED 17", "LED 18",	"LED 19", "LED 20",
					"LED 21", "LED 22", "LED 23", "LED 24",
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
					[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
					[20, 0], [21, 0], [22, 0], [23, 0]
				],
				Leds: [ 0, 1, 2, 3,	4, 5, 6, 7,	8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23 ],
				endpoint : { "interface": 0, "usage": 0x0080, "usage_page": 0xFF31},
				protocol: "perledv1",
				writeType: "report",
				DeviceHeader: 0x5E,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/cases/g15dk.png",
			},
			"G16CHR": {
				name: "G16CHR",
				size: [25, 46],
				LedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
					"LED 11", "LED 12",	"LED 13", "LED 14",	"LED 15", "LED 16",	"LED 17", "LED 18",	"LED 19", "LED 20",
					"LED 21", "LED 22", "LED 23", "LED 24", "Led 25", "Led 26", "Led 27", "Led 28", "Led 29", "Led 30",
					"Led 31", "Led 32", "Led 33", "Led 34", "Led 35", "Led 36", "Led 37", "Led 38", "Led 39", "Led 40",
					"Led 41", "Led 42", "Led 43", "Led 44", "Led 45", "Led 46", "Led 47", "Led 48",
				],
				LedPositions: [
					[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9],
					[10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [4, 12], [5, 13], [6, 14], [7, 15],
					[8, 16], [9, 17], [10, 18], [11, 19], [12, 20], [13, 21], [14, 22], [15, 23], [16, 24], [17, 25],
					[18, 26], [19, 27], [20, 28], [21, 29], [22, 30], [23, 31], [24, 32], [24, 33], [24, 34], [24, 35],
					[24, 36], [24, 37], [24, 38], [24, 39], [24, 40], [24, 41], [24, 42], [24, 43],
				],
				Leds: [
					47, 46, 45, 44, 43, 42, 41, 40, 39, 38,
					37, 36, 35, 34, 33, 32, 31, 30, 29, 28,
					27, 26, 25, 24, 23, 22, 21, 20, 19, 18,
					17, 16, 15, 14, 13, 12, 11, 10, 9, 8,
					7, 6, 5, 4, 3, 2, 1, 0,
				],
				subdevices: [
					{
						name: "Side panel",
						size: [1, 22],
						LedNames: [
							"Side 1", "Side 2", "Side 3", "Side 4", "Side 5", "Side 6", "Side 7", "Side 8", "Side 9", "Side 10",
							"Side 11", "Side 12",	"Side 13", "Side 14",	"Side 15", "Side 16",	"Side 17", "Side 18",	"Side 19", "Side 20",
						],
						LedPositions: [
							[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
							[0, 10], [0, 11], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18], [0, 19], [0, 20], [0, 21],
						],
						Leds: [ 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48 ],
					},
					{
						name: "Top led",
						size: [1, 1],
						LedNames: [
							"Top 1"
						],
						LedPositions: [
							[0, 0]
						],
						Leds: [ 68 ],
					},
				],
				endpoint : { "interface": 0, "usage": 0x0080, "usage_page": 0xFF31},
				protocol: "perledv1",
				writeType: "report",
				DeviceHeader: 0x5E,
				RGBOrder: [0, 1, 2],
				image: "https://assets.signalrgb.com/devices/brands/asus/cases/g16chr.png",
			},
			"G16CH": {
				name: "G16CHR",
				size: [25, 46],
				LedNames: [
					"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
					"LED 11", "LED 12",	"LED 13", "LED 14",	"LED 15", "LED 16",	"LED 17", "LED 18",	"LED 19", "LED 20",
					"LED 21", "LED 22", "LED 23", "LED 24", "Led 25", "Led 26", "Led 27", "Led 28", "Led 29", "Led 30",
					"Led 31", "Led 32", "Led 33", "Led 34", "Led 35", "Led 36", "Led 37", "Led 38", "Led 39", "Led 40",
					"Led 41", "Led 42", "Led 43", "Led 44", "Led 45", "Led 46", "Led 47", "Led 48",
				],
				LedPositions: [
					[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9],
					[10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [4, 12], [5, 13], [6, 14], [7, 15],
					[8, 16], [9, 17], [10, 18], [11, 19], [12, 20], [13, 21], [14, 22], [15, 23], [16, 24], [17, 25],
					[18, 26], [19, 27], [20, 28], [21, 29], [22, 30], [23, 31], [24, 32], [24, 33], [24, 34], [24, 35],
					[24, 36], [24, 37], [24, 38], [24, 39], [24, 40], [24, 41], [24, 42], [24, 43],
				],
				Leds: [
					47, 46, 45, 44, 43, 42, 41, 40, 39, 38,
					37, 36, 35, 34, 33, 32, 31, 30, 29, 28,
					27, 26, 25, 24, 23, 22, 21, 20, 19, 18,
					17, 16, 15, 14, 13, 12, 11, 10, 9, 8,
					7, 6, 5, 4, 3, 2, 1, 0,
				],
				subdevices: [
					{
						name: "Side panel",
						size: [1, 22],
						LedNames: [
							"Side 1", "Side 2", "Side 3", "Side 4", "Side 5", "Side 6", "Side 7", "Side 8", "Side 9", "Side 10",
							"Side 11", "Side 12",	"Side 13", "Side 14",	"Side 15", "Side 16",	"Side 17", "Side 18",	"Side 19", "Side 20",
						],
						LedPositions: [
							[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
							[0, 10], [0, 11], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18], [0, 19], [0, 20], [0, 21],
						],
						Leds: [ 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48 ],
					},
					{
						name: "Top led",
						size: [1, 1],
						LedNames: [
							"Top 1"
						],
						LedPositions: [
							[0, 0]
						],
						Leds: [ 68 ],
					},
				],
				endpoint : { "interface": 0, "usage": 0x0080, "usage_page": 0xFF31},
				protocol: "perledv1",
				writeType: "report",
				DeviceHeader: 0x5E,
				RGBOrder: [0, 1, 2],
				image: "https://assets.signalrgb.com/devices/brands/asus/cases/g16chr.png",
			},

			// Zone based
			"GA402XV": {
				name: "Zephyrus G14 2022",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "zone",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/ga402xv-laptop.png",
			},
			"GA402RJ": {
				name: "Zephyrus G14 2022",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "zone",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/ga402xv-laptop.png",
			},
			// Zone based
			"GA403WR": {
				name: "Zephyrus G14 2025",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "zone",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/ga402xv-laptop.png",
			},
			"GV601VI": {
				name: "ROG Flow X16",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "zone",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/gv601vi-laptop.png",
			},
			"GU603ZM": {
				name: "Zephyrus M16",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "single",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g614jv-laptop.png",
			},
			"G614JV": {
				name: "ROG Strix G16",
				size: [11, 3],
				LedsZone: [[0x04, 0x00]],
				Leds: [
					[
						0, 1, 2, 3, 10, 9, 7, 6
					]
				],
				LedNames: ["Keyboard 1", "Keyboard 2", "Keyboard 3", "Keyboard 4", "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4"],
				LedPositions: [[2, 0], [4, 0], [6, 0], [8, 0], [0, 2], [3, 2], [7, 2], [10, 2]],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/gu603zm-laptop.png",
			},
			"G513QE": {
				name: "ROG Strix G15",
				size: [11, 3],
				LedsZone: [[0x04, 0x00]],
				Leds: [
					[
						0, 1, 2, 3, 10, 9, 7, 6
					]
				],
				LedNames: ["Keyboard 1", "Keyboard 2", "Keyboard 3", "Keyboard 4", "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4"],
				LedPositions: [[2, 0], [4, 0], [6, 0], [8, 0], [0, 2], [3, 2], [7, 2], [10, 2]],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g713rm-laptop.png",
			},
			"G513QM": {
				name: "ROG Strix G15",
				size: [11, 3],
				LedsZone: [[0x04, 0x00]],
				Leds: [
					[
						0, 1, 2, 3, 10, 9, 7, 6
					]
				],
				LedNames: ["Keyboard 1", "Keyboard 2", "Keyboard 3", "Keyboard 4", "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4"],
				LedPositions: [[2, 0], [4, 0], [6, 0], [8, 0], [0, 2], [3, 2], [7, 2], [10, 2]],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g713rm-laptop.png",
			},
			"G513IC": {
				name: "ROG Strix G15",
				size: [11, 3],
				LedsZone: [[0x04, 0x00]],
				Leds: [
					[
						0, 1, 2, 3, 11, 10, 9, 8, 7, 6
					]
				],
				LedNames: ["Keyboard 1", "Keyboard 2", "Keyboard 3", "Keyboard 4", "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6"],
				LedPositions: [[2, 0], [4, 0], [6, 0], [8, 0], [0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2]],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g713rm-laptop.png",
			},
			"G713RM": {
				name: "ROG Strix Scar G17",
				size: [11, 3],
				LedsZone: [[0x04, 0x00]],
				Leds: [
					[
						0, 1, 2, 3, 10, 9, 7, 6
					]
				],
				LedNames: ["Keyboard 1", "Keyboard 2", "Keyboard 3", "Keyboard 4", "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4"],
				LedPositions: [[2, 0], [4, 0], [6, 0], [8, 0], [0, 2], [3, 2], [7, 2], [10, 2]],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g713rm-laptop.png",
			},

			// Perled based
			"G532LWS": {
				name: "ROG Strix Scar G532",
				size: [20, 8],
				LedsZone: [[0x01, 0x01], [0x04, 0x00]],
				Leds: [
					[
						2,  3,  4,  5,  6,
						21, 	23, 24, 25, 26, 	28, 29, 30, 31, 	32, 33, 34, 35, 36,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,	56,			58,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 78,		79,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,		100,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120,
						126, 127, 128, 129,			132,		135, 136, 137,		140, 141, 142,
		   			],

		   			[
			   			0, 2, 3, 4, 5, 6, 7, 9, 10
			  		],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5 & Left U.D.", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Delete",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "PgUp",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter", "PgDn",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "End",
					"Left Ctrl", "FN", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",
				],
				LedPositions: [
					[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5],					  [16, 4],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],							[10, 6], [11, 6], [12, 6],			[14, 6], [15, 6], [16, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],
				],
				endpoint : { "interface": 2, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g532lws-laptop.png",
			},
			"G533QS": {
				name: "ROG Strix Scar G533",
				size: [20, 8],
				LedsZone: [[0x01, 0x01], [0x04, 0x00],],
				Leds: [
					[
								 2,  3,  4,  5,  6,
						21, 	23, 24, 25, 26, 	28, 29, 30, 31, 	32, 33, 34, 35, 36,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,	56,			58,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 78,		79,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,		100,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120, 121,
						126, 127, 128, 129,			132,		135, 136, 137,		140, 141, 142,
					],

					[
						0, 2, 3, 4, 5, 6, 7, 9, 10
		   			],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5 & Left U.D.", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Delete",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "MediaPlayPause",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Pause Button",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter", "MediaPreviousTrack",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "MediaNextTrack",
					"Left Ctrl", "FN", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",

				],
				LedPositions: [
					 				[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5], 		 [15, 4], [16, 4],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],							[10, 6], [11, 6], [12, 6],			[14, 6], [15, 6], [16, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g533qs-laptop.png",
			},
			"G533ZW": {
				name: "ROG Strix Scar G533",
				size: [20, 8],
				LedsZone: [[0x01, 0x01], [0x04, 0x00],],
				Leds: [
					[
								 2,  3,  4,  5,  6,
						21, 	23, 24, 25, 26, 	28, 29, 30, 31, 	32, 33, 34, 35, 36,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,	56,			58,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 78,		79,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,		100,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120, 121,
						126, 127, 128, 129,			132,		135, 136, 137,		140, 141, 142,
					],

					[
						0, 2, 3, 4, 5, 6, 7, 9, 10
		   			],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5 & Left U.D.", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Delete",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "MediaPlayPause",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Pause Button",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter", "MediaPreviousTrack",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "MediaNextTrack",
					"Left Ctrl", "FN", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",

				],
				LedPositions: [
					 				[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5], 		 [15, 4], [16, 4],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],							[10, 6], [11, 6], [12, 6],			[14, 6], [15, 6], [16, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g533qs-laptop.png",
			},
			"G614JZ": {
				name: "ROG Strix Scar G16",
				size: [18, 7],
				LedsZone: [[0x01, 0x01]],
				Leds: [
					[
						0, 1, 2, 3, 4,
						5,      6, 7, 8, 9,	10, 11, 13, 14,	 15, 16, 17, 18,		19,
						20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 	34,
						35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,		49,
						50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,			63,
				       	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 	78,
						79, 80, 81, 82,     83,    84, 85, 86,   		87, 88, 89,
		   			],
				],
				LedNames: [
					"M1", "M2", "M3", "M4", "M5",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					"Delete",
					"` ", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-",  "+",  "Left Backspace",				"Play",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",							"Stop",
        			"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter ", 						"Backward",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "Keyboard /", "Right Shift",		 "Up Arrow", 	"Forward",
					"Left Ctrl", "Fn", "Windows", "Left Alt", "Space", "Right Alt", "Impeccr", "Right Ctrl", "Left Arrow",  "Down Arrow",  "Right Arrow",
				],
				LedPositions: [
					[3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
  					[0, 1],         [2, 1], [3, 1], [4, 1], [5, 1],         [7, 1], [8, 1], [9, 1], [10, 1],          [12, 1], [13, 1], [14, 1], [15, 1], 		[17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],                   [15, 2], 		[17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], 		     [15, 3],		[17, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          	             [15, 4], 		[17, 4],
					[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], 		     [15, 5],		[17, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],                 [6, 6],                 [9, 6], [10, 6], [11, 6],                     [14, 6], [15, 6], [16, 6],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xff31},
				protocol: "perledv2",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g614jz-laptop.png",
			},
			"G634JZ": {
				name: "ROG Strix Scar G16",
				size: [20, 14],
				LedsZone: [[0x01, 0x01], [0x04, 0x00], [0x05, 0x00]],
				Leds: [
					[
						0, 1, 2, 3, 4,
						5,      6, 7, 8, 9,	10, 11, 13, 14,	 15, 16, 17, 18,		19,
						20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 	34,
						35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,		49,
						50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,			63,
				       	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 	78,
						79, 80, 81, 82,     83,    84, 85, 86,   		87, 88, 89,
		   			],

		   			[
			   			0, 2, 3, 4, 5, 6, 7, 9, 10
			  		],

					[
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
						11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
						21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
						31, 32, 33, 34, 35, 36, 37,
					],
				],
				LedNames: [
					"M1", "M2", "M3", "M4", "M5",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					"Delete",
					"` ", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-",  "+",  "Left Backspace",				"Play",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",							"Stop",
        			"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter ", 						"Backward",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "Keyboard /", "Right Shift",		 "Up Arrow", 	"Forward",
					"Left Ctrl", "Fn", "Windows", "Left Alt", "Space", "Right Alt", "Impeccr", "Right Ctrl", "Left Arrow",  "Down Arrow",  "Right Arrow",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",

					"Back 1", "Back 2", "Back 3", "Back 4", "Back 5", "Back 6", "Back 7", "Back 8", "Back 9", "Back 10",
					"Back 11", "Back 12", "Back 13", "Back 14", "Back 15", "Back 16", "Back 17", "Back 18", "Back 19", "Back 20",
					"Back 21", "Back 22", "Back 23", "Back 24", "Back 25", "Back 26", "Back 27", "Back 28", "Back 29", "Back 30",
					"Back 31", "Back 32", "Back 33", "Back 34", "Back 35", "Back 36", "Back 37", "Back 38"

				],
				LedPositions: [
					[3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
  					[0, 1],         [2, 1], [3, 1], [4, 1], [5, 1],         [7, 1], [8, 1], [9, 1], [10, 1],          [12, 1], [13, 1], [14, 1], [15, 1], 		[17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],                   [15, 2], 		[17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], 		     [15, 3],		[17, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          	             [15, 4], 		[17, 4],
					[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], 		     [15, 5],		[17, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],                 [6, 6],                 [9, 6], [10, 6], [11, 6],                     [14, 6], [15, 6], [16, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],

					[0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
					[0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
					[0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12],
					[0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g634jz-laptop.png",
			},
			"G713RS": {
				name: "ROG Strix Scar G17",
				size: [19, 8],
				LedsZone: [[0x01, 0x01]],
				Leds: [
					[
						2,   3,   4,   5,   6,
						21,       23,  24,  25,  26,  28,  29,  30,  31,       33,  34,  35,  36,       38,  39,  40,  41,
						42,  43,  44,  45,  46,  47,  48,  49,  50,  51,  52,  53,  54,  55,  56,       59,  60,  61,  62,
						63,  64,  65,  66,  67,  68,  69,  70,  71,  72,       73,  74,  75,  76,       80,  81,  82,  83,
						84,       85,  86,  87,  88,  89,  90,  91,  92,  93,  94,  95,       98,       101, 102, 103,
						105,      107, 108, 109, 110, 111, 112, 113, 114, 115, 116,      118, 120,      122, 123, 124, 125,
						126, 127, 128, 129,           132,           135, 137,           139,           144,      145,
						159, 160, 161,
		   			],
				],
				LedNames: [
					"M1", "M2", "M3", "M4", "M5",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",                                     "Delete", "Pause", "Print Screen", "Home",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-",  "+",  "Left Backspace", "Right Backspace",               "NumLock", "Numpad /", "Numpad *", "Numpad -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                                              "Numpad 7", "Numpad 8", "Numpad 9", "Numpad +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter ",                                          "Numpad 4", "Numpad 5", "Numpad 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "Keyboard /", "Right Shift (Left)", "Right Shift (Right)", "Numpad 1", "Numpad 2", "Numpad 3", "Numpad Enter",
					"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space", "Right Alt", "Right Ctrl",             "Up Arrow",                "Numpad 0",             "Numpad .",
					                                                                            "Left Arrow",  "Down Arrow", "Right Arrow",
				],
				LedPositions: [
					[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1],         [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],          [11, 1], [12, 1], [13, 1], [14, 1],          [15, 1], [16, 1], [17, 1], [18, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],          [15, 2], [16, 2], [17, 2], [18, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],          [11, 3], [12, 3], [13, 3], [14, 3],          [15, 3], [16, 3], [17, 3], [18, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],          [14, 4],          [15, 4], [16, 4], [17, 4],
					[0, 5],         [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],          [13, 5], [14, 5],          [15, 5], [16, 5], [17, 5], [18, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],                 [6, 6],                 [9, 6], [10, 6],                   [13, 6],                   [15, 6],          [17, 6],
																											          [12, 7], [13, 7], [14, 7],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g713rs-laptop.png",
			},
			"G733QR": {
				name: "ROG Strix Scar G733",
				size: [20, 8],
				LedsZone: [[0x01, 0x01], [0x04, 0x00],],
				Leds: [
					[
						2,  3,  4,  5,  6,
						21, 23, 24, 25, 26, 	28, 29, 30, 31, 	33, 34, 35, 36, 	38, 39, 40, 41,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 56,			59, 60, 61, 62,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 78,		80, 81, 82, 83,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,	    101, 102, 103, 104,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118,	123,
						126, 127, 128, 129,			132,		135, 137, 139, 141,		143, 144, 145,
					],

					[
						0, 2, 3, 4, 5, 6, 7, 9, 10
		   			],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",			"Delete",	"Num 7", "Num 8", "Num 9",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace",				"Num /", "Num 4", "Num 5", "Num 6",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",					"Num *", "Num 1", "Num 2", "Num 3",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",		"Num -", "Num +", "Num 0", "Num .",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",						"Up Arrow",
					"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Fn", "Right Ctrl", "Left Arrow ", "Down Arrow", "Right Arrow",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",
				],
				LedPositions: [
					 				[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2], [17, 2], [18, 2], [19, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3], [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4], [17, 4], [18, 4], [19, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5],										[15, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],									 		  [12, 6], [13, 6], [14, 6], [15, 6],		   [17, 6], [18, 6], [19, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "write",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g733qr-laptop.png",
			},
			"G814JIR": {
				name: "ROG Strix Scar G18",
				size: [20, 10],
				LedsZone: [[0x01, 0x01], [0x04, 0x00]],
				Leds: [
					[
						2,  3,  4,  5,  6,
						21, 23, 24, 25, 26, 	28, 29, 30, 31, 	33, 34, 35, 36, 	38, 39, 40, 41,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,			59, 60, 61, 62,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,		80, 81, 82, 83,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,	    101, 102, 103,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120, 121, 122, 123, 124, 125,
						126, 127, 128, 129,			132,		135, 136, 137, 141, 142, 143, 144, 145
		   			],

		   			[
			   			0, 2, 3, 4
			  		]
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					"Delete",	"Pause", "PrtSc", "Home",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace",						"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",							"Num 7", "Num 8", "Num 9", "Num +",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",				"Num 4", "Num 5", "Num 6",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Right Shift 2", "Up Arrow", "Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow ", "Down Arrow", "Right Arrow", "Num 0", "Num .",

					"Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4"
				],
				LedPositions: [
					[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2], [17, 2], [18, 2], [19, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3], [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4], [17, 4], [18, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5], [14, 4], [15, 4], [16, 5], [17, 5], [18, 5], [19, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],									 		  [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6],

					[0, 7], [0, 9], [19, 7], [19, 9]
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g834jy-laptop.png",
			},
			"G834JY": {
				name: "ROG Strix Scar G18",
				size: [20, 14],
				LedsZone: [[0x01, 0x01], [0x04, 0x00], [0x05, 0x00]],
				Leds: [
					[
						2,  3,  4,  5,  6,
						21, 23, 24, 25, 26, 	28, 29, 30, 31, 	33, 34, 35, 36, 	38, 39, 40, 41,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,			59, 60, 61, 62,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,		80, 81, 82, 83,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,	    101, 102, 103,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120, 121, 122, 123, 124, 125,
						126, 127, 128, 129,			132,		135, 136, 137, 141, 142, 143, 144, 145
		   			],

		   			[
			   			0, 2, 3, 4, 5, 6, 7, 9, 10
			  		],

					[
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
						11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
						21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
						31, 32, 33, 34, 35, 36, 37,
					],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					"Delete",	"Pause", "PrtSc", "Home",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace",						"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",							"Num 7", "Num 8", "Num 9", "Num +",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",				"Num 4", "Num 5", "Num 6",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Right Shift 2", "Up Arrow", "Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow ", "Down Arrow", "Right Arrow", "Num 0", "Num .",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",

					"Back 1", "Back 2", "Back 3", "Back 4", "Back 5", "Back 6", "Back 7", "Back 8", "Back 9", "Back 10",
					"Back 11", "Back 12", "Back 13", "Back 14", "Back 15", "Back 16", "Back 17", "Back 18", "Back 19", "Back 20",
					"Back 21", "Back 22", "Back 23", "Back 24", "Back 25", "Back 26", "Back 27", "Back 28", "Back 29", "Back 30",
					"Back 31", "Back 32", "Back 33", "Back 34", "Back 35", "Back 36", "Back 37", "Back 38"

				],
				LedPositions: [
					[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2], [17, 2], [18, 2], [19, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3], [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4], [17, 4], [18, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5], [14, 4], [15, 4], [16, 5], [17, 5], [18, 5], [19, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],									 		  [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],

					[0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
					[0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
					[0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12],
					[0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g834jy-laptop.png",
			},
			"G834JYR": {
				name: "ROG Strix Scar G18",
				size: [20, 14],
				LedsZone: [[0x01, 0x01], [0x04, 0x00], [0x05, 0x00]],
				Leds: [
					[
						2,  3,  4,  5,  6,
						21, 23, 24, 25, 26, 	28, 29, 30, 31, 	33, 34, 35, 36, 	38, 39, 40, 41,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,			59, 60, 61, 62,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,		80, 81, 82, 83,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,	    101, 102, 103,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120, 121, 122, 123, 124, 125,
						126, 127, 128, 129,			132,		135, 136, 137, 141, 142, 143, 144, 145
		   			],

		   			[
			   			0, 2, 3, 4, 5, 6, 7, 9, 10
			  		],

					[
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
						11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
						21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
						31, 32, 33, 34, 35, 36, 37,
					],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					"Delete",	"Pause", "PrtSc", "Home",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace",						"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",							"Num 7", "Num 8", "Num 9", "Num +",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",				"Num 4", "Num 5", "Num 6",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Right Shift 2", "Up Arrow", "Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow ", "Down Arrow", "Right Arrow", "Num 0", "Num .",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",

					"Back 1", "Back 2", "Back 3", "Back 4", "Back 5", "Back 6", "Back 7", "Back 8", "Back 9", "Back 10",
					"Back 11", "Back 12", "Back 13", "Back 14", "Back 15", "Back 16", "Back 17", "Back 18", "Back 19", "Back 20",
					"Back 21", "Back 22", "Back 23", "Back 24", "Back 25", "Back 26", "Back 27", "Back 28", "Back 29", "Back 30",
					"Back 31", "Back 32", "Back 33", "Back 34", "Back 35", "Back 36", "Back 37", "Back 38"

				],
				LedPositions: [
					[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2], [17, 2], [18, 2], [19, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3], [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4], [17, 4], [18, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5], [14, 4], [15, 4], [16, 5], [17, 5], [18, 5], [19, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],									 		  [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],

					[0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
					[0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
					[0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12],
					[0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g834jy-laptop.png",
			},
			"G834JZR": {
				name: "ROG Strix Scar G18",
				size: [20, 14],
				LedsZone: [[0x01, 0x01], [0x04, 0x00], [0x05, 0x00]],
				Leds: [
					[
						2,  3,  4,  5,  6,
						21, 23, 24, 25, 26, 	28, 29, 30, 31, 	33, 34, 35, 36, 	38, 39, 40, 41,
						42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,			59, 60, 61, 62,
						63, 	64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,		80, 81, 82, 83,
						84, 85, 86, 87, 88, 89, 90, 91, 92,	93, 94, 95, 97,		98,	    101, 102, 103,
						105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 120, 121, 122, 123, 124, 125,
						126, 127, 128, 129,			132,				135, 136, 137, 141, 142, 143, 144, 145
		   			],

		   			[
			   			0, 2, 3, 4, 5, 6, 7, 9, 10
			  		],

					[
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
						11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
						21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
						31, 32, 33, 34, 35, 36, 37,
					],
				],
				LedNames: [
					"Volume Down", "Volume Up", "AudioMute", "Fan Mode", "Armoury Crate",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					"Delete",	"Pause", "PrtSc", "Home",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace",						"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",							"Num 7", "Num 8", "Num 9", "Num +",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",				"Num 4", "Num 5", "Num 6",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Right Shift 2", "Up Arrow", "Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Fn", "Left Win", "Left Alt", "Space", "Right Alt", "PrtSc", "Right Ctrl", "Left Arrow ", "Down Arrow", "Right Arrow", "Num 0", "Num .",

					"Logo", "Monitorglow 1",  "Monitorglow 2",  "Underglow 1", "Underglow 2", "Underglow 3", "Underglow 4", "Underglow 5", "Underglow 6",

					"Back 1", "Back 2", "Back 3", "Back 4", "Back 5", "Back 6", "Back 7", "Back 8", "Back 9", "Back 10",
					"Back 11", "Back 12", "Back 13", "Back 14", "Back 15", "Back 16", "Back 17", "Back 18", "Back 19", "Back 20",
					"Back 21", "Back 22", "Back 23", "Back 24", "Back 25", "Back 26", "Back 27", "Back 28", "Back 29", "Back 30",
					"Back 31", "Back 32", "Back 33", "Back 34", "Back 35", "Back 36", "Back 37", "Back 38"

				],
				LedPositions: [
					[2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
					[0, 1], 		[2, 1], [3, 1], [4, 1], [5, 1], 		[7, 1], [8, 1], [9, 1], [10, 1], 		  [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],			[14, 2],		  [16, 2], [17, 2], [18, 2], [19, 2],
					[0, 3],			[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], 		  [16, 3], [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4],		  [16, 4], [17, 4], [18, 4],
					[0, 5],	[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], 		   [13, 5], [14, 4], [15, 4], [16, 5], [17, 5], [18, 5], [19, 5],
					[0, 6], [1, 6], [2, 6], [3, 6],					[6, 6],									 		  [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6],

					[0, 0], [13, 0], [14, 0], [3, 7], [7, 7], [11, 7], [14, 7], [17, 7], [19, 7],

					[0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
					[0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
					[0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12],
					[0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13],
				],
				endpoint : { "interface": 0, "usage": 0x0079, "usage_page": 0xFF31},
				protocol: "perledv2",
				writeType: "report",
				DeviceHeader: 0x5D,
				RGBOrder: [0, 1, 2],
				image :	"https://assets.signalrgb.com/devices/brands/asus/misc/g834jzr-laptop.png",
			},
		};
	}
}

const ASUSdeviceLibrary = new deviceLibrary();
const ASUS = new ASUS_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

