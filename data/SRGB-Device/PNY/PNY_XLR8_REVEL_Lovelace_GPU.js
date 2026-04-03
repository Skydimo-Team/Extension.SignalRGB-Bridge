// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "PNY GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Type() { return "SMBUS"; }
export function Size() { return [4, 1]; }
export function DefaultPosition(){return [5, 2];}
export function DefaultScale(){return 29.0;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu"}
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

const vLedNames = [ "LED 1", "LED 2", "LED 3", "LED 4" ];
const vLedPositions = [ [0, 0], [1, 0], [2, 0], [3, 0] ];

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	  if (!bus.IsNvidiaBus()) {
		return [];
	}

	for(const PNYGPUID of PNYGPUIDs) {
		if(PNYGPUID.Vendor === bus.Vendor() &&
		PNYGPUID.SubVendor === bus.SubVendor() &&
		PNYGPUID.Device === bus.Product() &&
		PNYGPUID.SubDevice === bus.SubDevice()
		) {
			FoundAddresses.push(PNYGPUID.Address);
		}
	}

	return FoundAddresses;
}

export function Initialize() {
	// Because there's no direct control of the individual LEDS, we misuse the BLOCK COLORS function
	bus.WriteByte(PNYGPU.registers.Init, 0x00);
	bus.WriteByte(PNYGPU.registers.Control, 0x00);
	bus.WriteByte(PNYGPU.registers.Mode, 0x00);
	SetGPUNameFromBusIds();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function SetGPUNameFromBusIds() {
	for(const PNYGPUID of PNYGPUIDs) {
		if(PNYGPUID.Vendor === bus.Vendor() &&
		PNYGPUID.SubVendor === bus.SubVendor() &&
		PNYGPUID.Device === bus.Product() &&
		PNYGPUID.SubDevice === bus.SubDevice()
		) {
			device.setName(PNYGPUID.Name);
		}
	}
}

function sendColors(overrideColor) {
	const RGBData = new Array(16);

	RGBData[0] = 0x05;
	RGBData[1] = 0x05;
	RGBData[2] = 0x05;
	RGBData[3] = 0x05;

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3 + 4;
		RGBData[iLedIdx] = color[0];
		RGBData[iLedIdx+1] = color[1];
		RGBData[iLedIdx+2] = color[2];
	}

	bus.WriteBlock(PNYGPU.registers.Command, 16, RGBData);
	bus.WriteBlock(PNYGPU.registers.Control, 3, [0x05, 0x03, 0x18]);
}

class PNYGPUController {
	constructor() {
		this.registers =
        {
        	Init	   : 0xEF,
        	Control    : 0xE0,
        	Mode       : 0x60,
        	Command	   : 0xB0,
        	Brightness : 0x6F
        };
	}

	// Not sure if we still need this
	// setDeviceMode(mode) {
	// 	bus.WriteByte(this.registers.Mode, mode);
	// }
}

const PNYGPU = new PNYGPUController();

class GPUIdentifier {
	constructor(Vendor, SubVendor, Device, SubDevice, Address, Name, Model = "") {
		this.Vendor = Vendor;
		this.SubVendor = SubVendor;
		this.Device = Device;
		this.SubDevice = SubDevice;
		this.Address = Address;
		this.Name = Name;
		this.Model = Model;
	}
}

class PNYGPUIdentifier extends GPUIdentifier {
	constructor(Device, SubDevice, Name, Model = "") {
		super(0x10DE, 0x196E, Device, SubDevice, 0x49, Name, Model);
	}
}
export function BrandGPUList(){ return PNYGPUIDs; }

const PNYGPUIDs =
[
	new PNYGPUIdentifier(0x2684, 0x13c7, "PNY RTX 4090 XLR8 GAMING REVEL EPIC-X RGB Triple Fan"),
];

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/pny/gpus/gpu.png";
}