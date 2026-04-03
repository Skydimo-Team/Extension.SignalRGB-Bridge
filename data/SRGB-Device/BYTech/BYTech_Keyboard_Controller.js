import {Assert} from "@SignalRGB/Errors.js";
export function Name() { return "BYTech Device"; }
export function VendorId() { return 0x372E; }
export function ProductId() { return Object.keys(BYTechdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/bytech"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 2; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
topLightMode:readonly
topLightColor:readonly
topLightColorMode:readonly
pollingRate:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"pollingRate", group:"", label:"Polling Rate", description: "Sets the Polling Rate of this device. (This will restart the device)", type:"combobox", values:["125", "250", "500", "1000", "2000", "4000", "8000"], default:"1000"}
	];
}

export function Initialize() {
	BYTech.Initialize();
}

export function Render() {
	BYTech.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	BYTech.sendColors(color); // Go Dark on System Sleep/Shutdown
}

export function ontopLightModeChanged() {
	BYTech.setTopLight();
}

export function ontopLightColorModeChanged() {
	BYTech.setTopLight();
}

export function ontopLightColorChanged() {
	BYTech.setTopLight();
}

export function onpollingRateChanged() {
	BYTech.setPollingRate();
}

export class BYTech_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "BY Tech Device",
			DeviceEndpoint: [{ "interface": 2, "usage": 0x0061, "usage_page": 0xFF60, "collection": 0x0001 }],
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};

		this.toplightingModes = {
			"Static": 0x03,
			"Flow": 0x01,
			"Breathing": 0x04,
			"Neon": 0x02,
			"Visor": 0x05
		}

		this.pollingRates = {
			"125": 0x03,
			"250": 0x02,
			"500": 0x01,
			"1000":0x00,
			"2000": 0x06,
			"4000": 0x05,
			"8000": 0x04,
			0x03 : "125",
			0x02 : "250",
			0x01 : "500",
			0x00 : "1000",
			0x06 : "2000",
			0x05 : "4000",
			0x04 : "8000",
		}
	}

	getDeviceProperties(id) {

		const deviceConfig = BYTechdeviceLibrary.LEDLibrary[id];

		Assert.isOk(deviceConfig, `Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our Discord to get it added.`);

		return deviceConfig;
	};

	getModelID() { return this.Config.ModelID; }
	setModelID(modelid) { this.Config.ModelID = modelid; }

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLedLayout() { return this.Config.layout; }
	setLedLayout(layout) { this.Config.layout = layout; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const deviceHID = device.getDeviceInfo();

		// Fetch model
		const modelID	= deviceHID.product;

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setModelID(modelID);
			this.setDeviceName(DeviceProperties.name);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setImageFromUrl(DeviceProperties.image);

			if(DeviceProperties.layout === "None"){
				this.setLedLayout(DeviceProperties.layout);
				device.notify("Unsupported mode", `This connection mode isn't supported due to firmware limitations.`, 2);
				console.log("This connection mode isn't supported due to firmware limitations.");
			}else{
				this.setLedNames(DeviceProperties.vLedNames);
				this.setLedPositions(DeviceProperties.vLedPositions);
				this.setLeds(DeviceProperties.vLeds);
				this.detectDeviceEndpoint(DeviceProperties);

				device.setSize(DeviceProperties.size);
				device.setControllableLeds(this.getLedNames(), this.getLedPositions());

				this.setPollingRate();

				if(DeviceProperties.topLight){
					device.addProperty({property:"topLightMode", group:"lighting", label:"Top Light Mode", description: "Controls the lighting effect for the keyboard's top LED strip - Static for solid color, Flow for rainbow wave, Breathing for fade in/out, Neon for bright pulse, Visor for scanning effect, or Off to disable", type:"combobox", values:["Static", "Flow", "Breathing", "Neon", "Visor", "Off"], default:"Static"});
					device.addProperty({property:"topLightColorMode", group:"lighting", label:"Random Colors", description:"Enable to use automatic color cycling, or disable to use the custom color selected below", type:"boolean", default:"false"});
					device.addProperty({property:"topLightColor", group:"lighting", label:"Top Light Color", description: "Custom color for the top LED strip when Random Colors is disabled", min:"0", max:"360", type:"color", default:"#009bde"});
					this.setTopLight();
				}
			}
		}else{
			device.notify("Unknown device", `Reach out to support@signalrgb.com, or visit our Discord to get it added.`, 0);
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ modelID);
		}
	}

	sendColors(overrideColor) {

		if(!this.getModelID() || this.getLedLayout() === "None") {
			return;
		}

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= new Map();

		for (let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
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

			const colorKey = (color[0] << 16) | (color[1] << 8) | color[2];

			if (!RGBData.has(colorKey)) {
				RGBData.set(colorKey, {
					r: color[0],
					g: color[1],
					b: color[2],
					indexes: []
				});
			}

			RGBData.get(colorKey).indexes.push(deviceLeds[iIdx]);
		}

		// Apply color compression to reduce groups
		const compressedGroups = this.compressColors(Array.from(RGBData.values()));

		// Convert to flat array format: [R, G, B, count, ...indexes, R, G, B, count, ...indexes]
		const flatData = [];

		for (const group of compressedGroups) {
			flatData.push(group.r, group.g, group.b, group.indexes.length, ...group.indexes);
		}

		this.writeRGBPackage(flatData);
	}

	writeRGBPackage(RGBData){
		const bytesToSend = 56;
		const TotalPackets = Math.ceil(RGBData.length / bytesToSend);

		for (let index = 0; index < TotalPackets; index++) {
			const data = RGBData.splice(0, bytesToSend);

			const header = [0x09, 0x08, 0x01, 0x00, TotalPackets, index, data.length];
			const packet = header.concat(data);

			// Calculate checksum
			packet[63] = this.calculateChecksum(packet);

			device.write(packet, 64);
			device.pause(1);
		}
	}

	setTopLight() {

		let mode = 0x00; // Off

		mode = this.toplightingModes[topLightMode];

		const color = hexToRgb(topLightColor);
		const packet = [0x09, 0x04, 0x06, 0x00, 0x01, 0x00, topLightColorMode === true ? 0x04 : 0x07, mode, topLightColorMode === true ? 0x07 : 0x00, color[0], color[1], color[2], 0x02, 0x01];

		// Calculate checksum
		packet[63] = this.calculateChecksum(packet);

		device.write(packet, 64);
		device.pause(1);
	}

	setPollingRate() {

		let readpacket = [0x09, 0x84, 0x17, 0x00, 0x01, 0x00, 0x01];

		// Calculate checksum
		readpacket[63] = this.calculateChecksum(readpacket);

		device.clearReadBuffer();
		device.write(readpacket, 64);
		const pollingRateResult = device.read(readpacket, 64);
		device.pause(1);

		console.log("Polling rate: " + this.pollingRates[pollingRateResult[7]])
		
		if(pollingRate !== this.pollingRates[pollingRateResult[7]]){
			const packet = [0x09, 0x04, 0x17, 0x00, 0x01, 0x00, 0x01, this.pollingRates[pollingRate]];
			// Calculate checksum
			packet[63] = this.calculateChecksum(packet);

			console.log(`Setting polling rate to ${pollingRate}, device will restart...`)
			device.write(packet, 64);
			device.pause(1);
		}
	}

	calculateChecksum(data) {
		const packetSum = data.reduce((sum, num) => sum + num, 0);

		return 0xFF - (packetSum & 255);
	}

	compressColors(colorGroups, threshold = 15) {
		if (colorGroups.length <= 40) {
			return colorGroups;
		}

		const compressed = [];
		const used = new Set();

		for (let i = 0; i < colorGroups.length; i++) {
			if (used.has(i)) {continue;}

			const mainGroup = colorGroups[i];
			const mergedGroup = {
				r: mainGroup.r,
				g: mainGroup.g,
				b: mainGroup.b,
				indexes: [...mainGroup.indexes]
			};

			// Find similar colors to merge
			for (let j = i + 1; j < colorGroups.length; j++) {
				if (used.has(j)) {continue;}

				const otherGroup = colorGroups[j];
				const colorDistance = Math.abs(mainGroup.r - otherGroup.r) +
									Math.abs(mainGroup.g - otherGroup.g) +
									Math.abs(mainGroup.b - otherGroup.b);

				if (colorDistance <= threshold) {
					mergedGroup.indexes.push(...otherGroup.indexes);
					used.add(j);
				}
			}

			compressed.push(mergedGroup);
			used.add(i);

			// Stop if we reached the limit
			if (compressed.length >= 40) {
				break;
			}
		}

		return compressed;
	}

	detectDeviceEndpoint(deviceLibrary) {

		console.log("Searching for endpoints...");

		const deviceEndpoints = device.getHidEndpoints();

		for (let endpoints = 0; endpoints < deviceLibrary.endpoint.length; endpoints++) {
			const endpoint = deviceLibrary.endpoint[endpoints];

			for (let endpointList = 0; endpointList < deviceEndpoints.length; endpointList++) {
				const currentEndpoint = deviceEndpoints[endpointList];

				if (
					endpoint.interface	=== currentEndpoint.interface	&&
					endpoint.usage		=== currentEndpoint.usage		&&
					endpoint.usage_page	=== currentEndpoint.usage_page	&&
					endpoint.collection	=== currentEndpoint.collection	) {

					this.setDeviceEndpoint(currentEndpoint);
					device.set_endpoint(
						currentEndpoint.interface,
						currentEndpoint.usage,
						currentEndpoint.usage_page,
						currentEndpoint.collection,
					);

					console.log("Endpoint " + JSON.stringify(currentEndpoint) + " found!");

					return;
				}
			}
		}

		console.log(`Endpoints not found in the device! - ${JSON.stringify(deviceLibrary.endpoint)}`);
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x103E: "BY Tech Device",
		};

		this.LEDLibrary	=	{

			"HERO 84 HE": {
				name: "AULA Hero 84 HE",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/hero-84-he.png",
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "PrtSc", "Insert", "Delete",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "End",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "PageUp",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PageDown",
					"Left Ctrl", "Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 	 2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 95, 98, 99,
					14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,		100,
					28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,		101,
					42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,		54,		102,
					55,		56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,		74, 103,
					67, 68, 69,				70,				71, 72, 73, 76, 75, 77
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],			 [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],			 [15, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3],			 [15, 3],
					[0, 4],         [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],			[14, 4], [15, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5],
				],
				size: [16, 6],
				endpoint: [{ "interface": 2, "usage": 0x0061, "usage_page": 0xFF60, "collection": 0x0001 }],
				topLight: true
			},

			"HERO 68 HE": {
				name: "AULA Hero 68 HE",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/hero-68-he.png",
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "+", "Backspace", "Insert",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Delete",
					"Caps Lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "Page Up",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Page Down",
					"Left Ctrl", "Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					 1, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,		98,
					28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,		99,
					42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,		54,		102,
					55,		56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,		74, 103,
					67, 68, 69,				70,				71, 72, 73, 76, 75, 77
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],			 [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],			 [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],		   [13, 2],			 [15, 2],
					[0, 3],         [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],			[14, 3], [15, 3],
					[0, 4], [1, 4], [2, 4],							[6, 4],							[10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4],
				],
				size: [16, 6],
				endpoint: [{ "interface": 2, "usage": 0x0061, "usage_page": 0xFF60, "collection": 0x0001 }],
				topLight: true
			},

			"2.4G Dongle": {
				name: "Wireless Dongle",
				image: "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png",
				layout:	"None",
			},
		};
	}
}

const BYTechdeviceLibrary = new deviceLibrary();
const BYTech = new BYTech_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
