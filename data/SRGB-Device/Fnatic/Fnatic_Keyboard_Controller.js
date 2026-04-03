export function Name() { return "FNATIC Device"; }
export function VendorId() { return 0x2F0E; }
export function ProductId() { return Object.keys(FNATICdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/FNATIC"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard"}
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

export function DeviceMessages() {
	return [
		{property: "Limited Functionality", message:"Limited Functionality", tooltip: "Due to firmware limitations after (2.1.413+) this device is limited to 10 colors zone only"},
	];
}

export function Initialize() {
	FNATIC.Initialize();
}

export function Render() {
	FNATIC.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	FNATIC.sendColors(color);
}

export class FNATIC_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "FNATIC Device",
			DeviceEndpoint: { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(deviceName) { return FNATICdeviceLibrary.LEDLibrary[deviceName];};

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

	getDeviceImage(deviceName) { return FNATICdeviceLibrary.imageLibrary[deviceName]; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(FNATICdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setLedNames(DeviceProperties.LedNames);
		this.setLedPositions(DeviceProperties.LedPositions);
		this.setLeds(DeviceProperties.Leds);

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName("FNATIC " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage(this.getDeviceName()));
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
		const gradientZones			= [0x00, 0x0C, 0x17, 0x22, 0x2D, 0x38, 0x43, 0x4E, 0x59, 0x64];

		for (let iIdx = 0; iIdx < gradientZones.length; iIdx++) {
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

			RGBData[(deviceLeds[iIdx]*4)]	= color[0];
			RGBData[(deviceLeds[iIdx]*4)+1] = color[1];
			RGBData[(deviceLeds[iIdx]*4)+2] = color[2];
			RGBData[(deviceLeds[iIdx]*4)+3]	= gradientZones[iIdx];

		}

		this.writeRGB(RGBData);
	}

	writeRGB(RGBData){
		let packet	=	[0x00, 0x0F, 0x3B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0F, 0x0C, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0A];

		packet	= packet.concat(RGBData.splice(0, 9*4));
		packet	= packet.concat(RGBData.slice(0, 1*3));

		device.write(packet, 65);
		device.write([0x00, 0x0F, 0x3B, 0x00, 0x00, 0x39, 0x00, 0x00, RGBData[2], RGBData[3]], 65); // Wtf is this Fnatic?
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x0102: "miniSTREAK",
			//0x0105: "STREAK60"
		};

		this.LEDLibrary	=	{
			"miniSTREAK":
			{
				size: [11, 5],
				LedNames: ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10"],
				LedPositions: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2]],
				Leds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
				endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFF00, "collection": 0x0000 },
			},
		};

		this.imageLibrary = {
			"miniSTREAK": 		"https://assets.signalrgb.com/devices/brands/fnatic/keyboards/ministreak.png",
		};
	}
}

const FNATICdeviceLibrary = new deviceLibrary();
const FNATIC = new FNATIC_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
