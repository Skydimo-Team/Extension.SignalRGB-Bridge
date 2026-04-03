export function Name() { return "Razer Headset Device"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return Object.keys(RAZERdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/RAZER"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "headphones"}
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
	RAZER.InitializeRAZER();
}

export function Render() {
	RAZER.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	RAZER.sendColors(color);
}

export class RAZER_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Razer Headset Device",
			DeviceEndpoint: { "interface": 3, "usage": 0x0001, "usage_page": 0x000C},
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(deviceName) { return RAZERdeviceLibrary.LEDLibrary[deviceName];};

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

	getRequiresReport() { return this.Config.requiresReport; }

	getDeviceImage(deviceName) { return RAZERdeviceLibrary.imageLibrary[deviceName]; }

	InitializeRAZER() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(RAZERdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setLedNames(DeviceProperties.LedNames);
		this.setLedPositions(DeviceProperties.LedPositions);
		this.setLeds(DeviceProperties.Leds);

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName("Razer " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage(this.getDeviceName()));
		device.set_endpoint(
			DeviceProperties.endpoint[`interface`],
			DeviceProperties.endpoint[`usage`],
			DeviceProperties.endpoint[`usage_page`]);

		this.setSoftwareMode();
	}

	setSoftwareMode() {

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

		this.writeRGB(RGBData);
	}

	writeRGB(RGBData) {
		const packet = [0xFF, 0x0A, 0x00, 0xFF, 0x04, 0x12, 0xF1, 0x05, 0x72].concat(RGBData);

		device.send_report(packet, 64);
		device.pause(30);
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x051C: "Nari",
			0x051F: "Nari Essential",
			0x051E: "Nari Essential", // Wireless
			0x051A: "Nari Ultimate",
		};

		this.LEDLibrary	=	{
			"Nari":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 5, "usage": 0x0001, "usage_page": 0xFF00 },
				protocol: "nari",
				requiresReport: true
			},
			"Nari Essential":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 5, "usage": 0x0001, "usage_page": 0xFF00 },
				protocol: "nari",
				requiresReport: true
			},
			"Nari Ultimate":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 5, "usage": 0x0001, "usage_page": 0xFF00 },
				protocol: "nari",
				requiresReport: true
			},
		};

		this.imageLibrary = {
			"Nari"						:	"https://assets.signalrgb.com/devices/brands/razer/audio/nari-essential.png",
			"Nari Essential"			:	"https://assets.signalrgb.com/devices/brands/razer/audio/nari-essential.png",
			"Nari Ultimate"				:	"https://assets.signalrgb.com/devices/brands/razer/audio/nari-ultimate.png",
		};
	}
}

const RAZERdeviceLibrary = new deviceLibrary();
const RAZER = new RAZER_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 5;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
