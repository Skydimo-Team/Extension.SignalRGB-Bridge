export function Name() { return "OEM Device"; }
export function VendorId() { return 0x3554; }
export function ProductId() { return Object.keys(OEMdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 1 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xff02 && endpoint.collection === 0x0001; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/keyboards/full-size-keyboard-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

export function DeviceMessages() {
	return [
		{property: "Limited Functionality", message:"Limited Functionality", tooltip: "Due to firmware limitations this device is limited to Solid Colors only"},
	];
}

export function Initialize() {
	OEM.Initialize();
}

export function Render() {
	OEM.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	OEM.sendColors(color); // Go Dark on System Sleep/Shutdown
}

export class OEM_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "OEM Device",
			DeviceEndpoint: { "interface": 1, "usage": 0x0002, "usage_page": 0xFF02, "collection": 0x0001 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

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

	Initialize() {
		//Initializing vars
		this.setDeviceName(OEMdeviceLibrary.PIDLibrary[device.productId()]);
		this.setLedNames(["Keyboard"]);
		this.setLedPositions([[0, 0]]);
		this.setLeds([0]);

		device.setName(this.getDeviceName());
		device.setSize([1, 1]);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
	}

	sendColors(overrideColor) {

		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(0, 0);
		}

		this.writeRGBPackage(color);
	}

	writeRGBPackage(RGBData){

		const packet = [0x13, 0x88, 0x01, 0x00, 0x23, RGBData[0], RGBData[1], RGBData[2]];

		packet[19] = this.CalculateCrc(packet);

		device.write(packet, 20);
		device.pause(1);
	}

	CalculateCrc(report) {
		let iCrc = 0;

		for (let iIdx = 0; iIdx < 19; iIdx++) {
			iCrc += report[iIdx];
		}

		return iCrc & 0xFF;
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0xFA09: "OEM Wireless Keyboard",
		};
	}
}

const OEMdeviceLibrary = new deviceLibrary();
const OEM = new OEM_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
