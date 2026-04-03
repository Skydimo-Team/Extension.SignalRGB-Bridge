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

		if (this.getRequiresReport()) {
			const packet = [0x00, 0x40, 0x01, 0x00, 0x00, 0x08]; //Direct Mode
			device.send_report(packet, 9);
		} else {
			const packet = [0x40, 0x01, 0x00, 0x00, 0x08]; //Direct Mode
			device.write(packet, 28);
		}

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

	CalculateCrc(report, iStart, iEnd) {
		let iCrc = 0;

		for (let iIdx = iStart; iIdx < iEnd; iIdx++) {
			iCrc ^= report[iIdx];
		}

		return iCrc;
	}

	writeRGB(RGBData) {
		if (this.getRequiresReport()) {
			device.send_report([0x00, 0x40, 0x03, 0x00].concat(RGBData), 9);
		} else {
			device.write([0x40, 0x03, 0x00].concat(RGBData), 9);
		}
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x0527: "Kraken Ultimate Edition",
			0x0533: "Kraken V3",
			0x0537: "Kraken V3",
			0x0549: "Kraken V3",
			0x0560: "Kraken Kitty V2",
			//0x0554: "Kraken Kitty V2 Pro",
			//0x0544: "Kaira HS Pro" // Changes RGB from Synapse phone app over BT which we don't support yet
		};

		this.LEDLibrary	=	{
			"Kraken Ultimate Edition":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 3, "usage": 0x0001, "usage_page": 0x000C },
			},
			"Kraken V3":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 3, "usage": 0x0001, "usage_page": 0x000C },
			},
			"Kraken Kitty V2":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 3, "usage": 0x0001, "usage_page": 0x000C },
				requiresReport: true
			},
			"Kraken Kitty V2 Pro":
			{
				size: [1, 1],
				LedNames: ["Both Cans"],
				LedPositions: [[0, 0]],
				Leds: [0],
				endpoint : { "interface": 3, "usage": 0x0001, "usage_page": 0x000C },
				requiresReport: true
			},
		};

		this.imageLibrary = {
			"Kraken Ultimate Edition"	:	"https://assets.signalrgb.com/devices/brands/razer/audio/kraken-ultimate.png",
			"Kraken V3"					:	"https://assets.signalrgb.com/devices/brands/razer/audio/kraken-v3.png",
			"Kraken Kitty V2"			:	"https://assets.signalrgb.com/devices/brands/razer/audio/kraken-kitty-v2.png",
			"Kraken Kitty V2 Pro"		:	"https://assets.signalrgb.com/devices/brands/razer/audio/kraken-kitty-v2.png",
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
	return endpoint.interface === 3;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
