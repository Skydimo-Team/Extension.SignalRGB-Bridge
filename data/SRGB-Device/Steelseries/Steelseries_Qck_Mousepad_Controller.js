export function Name() { return "Steelseries QcK Prism"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return Object.keys(STEELSERIESdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "mousepad"}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
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
	STEELSERIES.Initialize();
}

export function Render() {
	STEELSERIES.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	STEELSERIES.sendColors(color);
}

export class STEELSERIES_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Steelseries QcK Prism",
			DeviceEndpoint: { "interface": 0, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
			image: ""
		};
	}

	getDeviceProperties(deviceName) { return STEELSERIESdeviceLibrary.LEDLibrary[deviceName];};

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

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(STEELSERIESdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setLedNames(DeviceProperties.LedNames);
		this.setLedPositions(DeviceProperties.LedPositions);
		this.setLeds(DeviceProperties.Leds);
		this.setDeviceImage(DeviceProperties.image);

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName("Steelseries QcK Prism " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(
			DeviceProperties.endpoint[`interface`],
			DeviceProperties.endpoint[`usage`],
			DeviceProperties.endpoint[`usage_page`],
			DeviceProperties.endpoint[`collection`]);
	}

	sendColors(overrideColor) {

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [];

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

			RGBData[(deviceLeds[iIdx]*3)]   = color[0];
			RGBData[(deviceLeds[iIdx]*3)+1] = color[1];
			RGBData[(deviceLeds[iIdx]*3)+2] = color[2];
		}

		this.writeRGBLightning(RGBData);
	}

	writeRGBLightning(RGBData){
		const packet = [];

		packet[1] 	= 0x0E;
		packet[3] 	= 0x02;

		packet[5] 	= RGBData[0];
		packet[6] 	= RGBData[1];
		packet[7] 	= RGBData[2];
		packet[8] 	= 0xFF;
		packet[9] 	= 0x32;
		packet[10] 	= 0xC8;
		packet[14] 	= 0x01;

		packet[17] 	= RGBData[3];
		packet[18] 	= RGBData[4];
		packet[19] 	= RGBData[5];
		packet[20] 	= 0xFF;
		packet[21] 	= 0x32;
		packet[22] 	= 0xC8;
		packet[25] 	= 0x01;

		packet[26] 	= 0x01;
		packet[28] 	= 0x01;

		device.send_report(packet, 525);
		device.write([0x00, 0x0D], 65);
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x150A: "Medium",
			0x151E: "XL",
			0x3769: "XL",
			0x1520: "XL",
			0x150D: "XL",
			0x1516: "3XL",
			0x151A: "5XL"
		};

		this.LEDLibrary	=	{
			"Medium":
			{
				size: [3, 3],
				LedNames: ["Top", "Bottom"],
				LedPositions: [[1, 0], [1, 2]],
				Leds: [0, 1],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mousepads/qck-prism-medium.png"
			},
			"XL":
			{
				size: [6, 3],
				LedNames: ["Top", "Bottom"],
				LedPositions: [[3, 0], [3, 2]],
				Leds: [0, 1],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mousepads/qck-prism-xl.png"
			},
			"3XL":
			{
				size: [7, 4],
				LedNames: ["Top", "Bottom"],
				LedPositions: [[3, 0], [3, 3]],
				Leds: [0, 1],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mousepads/qck-prism-3xl.png"
			},
			"5XL":
			{
				size: [9, 6],
				LedNames: ["Top", "Bottom"],
				LedPositions: [[4, 0], [4, 5]],
				Leds: [0, 1],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/steelseries/mousepads/qck-prism-5xl.png"
			},
		};
	}
}

const STEELSERIESdeviceLibrary = new deviceLibrary();
const STEELSERIES = new STEELSERIES_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFFC0 && endpoint.collection === 0x0000;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
