// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "PNY XLR8 GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Type() { return "SMBUS"; }
export function Size() { return [3, 1]; }
export function DefaultPosition(){return [5, 2];}
export function DefaultScale(){return 2.5;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu";}
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

const vLedNames = [ "LED 1", "LED 2", "LED 3" ];
const vLedPositions = [ [0, 0], [1, 0], [2, 0] ];

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
	SetGPUNameFromBusIds();
	sendColors();
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

	for(let zone = 0; zone < 3; zone++) {
		const iPxX = vLedPositions[zone][0];
		const iPxY = vLedPositions[zone][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		PNYGPU.setRGB(zone, color);
	}

}

class PNYGPUController {
	constructor() {
		this.registers =
        {
        	Fetch    : 0x82,
        	Lighting : 0x02
        };
	}

	setRGB(zone, RGBData) {
		const packet = [0x06, 0xff, zone, 0x00];
		packet.push(...RGBData);
		bus.WriteBlock(this.registers.Lighting, 0x07, packet);
	}
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
		super(0x10DE, 0x196E, Device, SubDevice, 0x60, Name, Model);
	}
}

export function BrandGPUList(){ return PNYGPUIDs; }

const PNYGPUIDs =
[
	new PNYGPUIdentifier(0x2882, 0x13E6, "PNY 4060 XLR8"),

	new PNYGPUIdentifier(0x2786, 0x13CC, "PNY 4070 XLR8"),
	new PNYGPUIdentifier(0x2786, 0x13CE, "PNY 4070 XLR8 VERTO"),

	new PNYGPUIdentifier(0x2782, 0x13B1, "PNY 4070Ti XLR8"),
	new PNYGPUIdentifier(0x2782, 0x13D4, "PNY 4070TI XLR8"),
	new PNYGPUIdentifier(0x2782, 0x13B2, "PNY 4070Ti XLR8 VERTO"),

	new PNYGPUIdentifier(0x2705, 0x141C, "PNY 4070TI SUPER XLR8"),

	new PNYGPUIdentifier(0x2783, 0x1421, "PNY 4070 SUPER XLR8"),

	new PNYGPUIdentifier(0x2704, 0x13B0, "PNY 4080 XLR8 VERTO OC"),
	new PNYGPUIdentifier(0x2704, 0x13BB, "PNY 4080 XLR8 VERTO"),
	new PNYGPUIdentifier(0x2704, 0x13BC, "PNY 4080 XLR8 Gaming OC"),

	new PNYGPUIdentifier(0x2702, 0x1418, "PNY 4080 Super XLR8 VERTO Epic-X"),

	new PNYGPUIdentifier(0x2684, 0x13AD, "PNY 4090 XLR8"),
	new PNYGPUIdentifier(0x2684, 0x13AE, "PNY 4090 XLR8"),
	new PNYGPUIdentifier(0x2684, 0x13D8, "PNY 4090 XLR8 Verto Epic-X OC"),
	new PNYGPUIdentifier(0x2684, 0x13D9, "PNY 4090 XLR8 Verto Gaming"),
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