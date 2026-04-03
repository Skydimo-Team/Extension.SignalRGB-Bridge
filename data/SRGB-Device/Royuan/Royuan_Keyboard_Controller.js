export function Name() { return "Royuan Device"; }
export function VendorId() { return 0x3151; }
export function ProductId() { return Object.keys(RoyuandeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/royuan"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
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
		{
			property:	"Limited Zone",
			message:	"Limited Zone",
			tooltip:	"This device's firmware is limited to a single zone on direct control"
		},
	];
}

export function Initialize() {
	Royuan.InitializeRoyuan();
}

export function Render() {
	Royuan.sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		Royuan.sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		Royuan.sendColors(shutdownColor);
	}

}

export class Royuan_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Royuan Device",
			DeviceEndpoint: { "interface": 0, "usage": 0x0006, "usage_page": 0x0001, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
		};
	}

	getDeviceProperties(deviceID) { return RoyuandeviceLibrary.LEDLibrary[deviceID];};

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

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	InitializeRoyuan() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const DeviceProperties = this.getDeviceProperties(this.getDeviceProductId());
		this.setDeviceName(DeviceProperties.name);
		this.setLedNames(DeviceProperties.vLedNames);
		this.setLedPositions(DeviceProperties.vLedPositions);
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setDeviceImage(DeviceProperties.image);

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName(this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(DeviceProperties.endpoint[`interface`], DeviceProperties.endpoint[`usage`], DeviceProperties.endpoint[`usage_page`], DeviceProperties.endpoint[`collection`]);

		this.DirectLightingMode();
	}

	DirectLightingMode() {
		device.send_report([0x00, 0x07, 0x15, 0x04, 0x04, 0x07, 0x00, 0x00, 0x00, 0xD4], 65); //Direct Mode
	}

	sendColors(overrideColor) {

		const deviceLeds	= this.getLedPositions();
		const packet		= [];
		const RGBData		= [];
		let crc				= 255;

		for (let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLeds[iIdx][0];
			const iPxY = deviceLeds[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			RGBData[iIdx]   = color[0];
			RGBData[iIdx+1] = color[1];
			RGBData[iIdx+2] = color[2];
		}

		packet[0] = 0x00; //Zero Padding
		packet[1] = 0x0E;
		packet[2] = RGBData[0];
		packet[3] = RGBData[1];
		packet[4] = RGBData[2];

		for (let i = 1; i < 5; i++) {
			crc -= packet[i];
		}

		packet[8] = crc;

		device.send_report(packet, 65); // Send commands
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x4002: "Royuan device",
			0x4003: "Royuan device",
			//0x4010: "",
			0x4015: "Royuan device",
		};

		this.LEDLibrary	=	{
			0x4002: {
				name: "Royuan device",
				size: [1, 1],
				vLedNames: ["Keyboard"],
				vLedPositions: [[0, 0]],
				endpoint : { "interface": 0, "usage": 0x0006, "usage_page": 0x0001, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/default/keyboards/65-keyboard-render.png"
			},
			0x4003: {
				name: "Royuan device",
				size: [1, 1],
				vLedNames: ["Keyboard"],
				vLedPositions: [[0, 0]],
				endpoint : { "interface": 0, "usage": 0x0006, "usage_page": 0x0001, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/default/keyboards/65-keyboard-render.png"
			},
			0x4015: {
				name: "Royuan device",
				size: [1, 1],
				vLedNames: ["Keyboard"],
				vLedPositions: [[0, 0]],
				endpoint : { "interface": 2, "usage": 0x0002, "usage_page": 0xFFFF, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/default/keyboards/65-keyboard-render.png"
			},
		};
	}
}

const RoyuandeviceLibrary = new deviceLibrary();
const Royuan = new Royuan_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 0 || endpoint.interface === 2;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
