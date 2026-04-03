// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "PNY Blackwell GPU"; }
export function Publisher() { return "WhirlwindFX & Ben"; }
export function Type() { return "SMBUS"; }
export function Size() { return [1, 1]; }
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu";}
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

const vLedNames = [ "LED 1"];
const vLedPositions = [ [0, 0] ];

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

	for(let zone = 0; zone < 1; zone++) {
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
        	Lighting : 0x04,
			ArrowLighting : 0x02
        };
	}

	setRGB(zone, RGBData) {
		const packet = [0x06, 0xff, zone, 0x00];
		packet.push(...RGBData);

		// This apparently has leds all over the place, sending to 1 zone lights up on more than one place, like paired leds

		// Side and fans zone
		bus.WriteBlock(this.registers.Lighting, 0x07, packet);

		// Arrow zone
		bus.WriteBlock(this.registers.ArrowLighting, 0x07, packet);
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
	new PNYGPUIdentifier(0x2d04, 0x143e, "PNY 5060Ti EPIC-X"),
	new PNYGPUIdentifier(0x2d04, 0x1442, "PNY 5060Ti EPIC-X"),

	new PNYGPUIdentifier(0x2f04, 0x1439, "PNY 5070 EPIC-X"),

	new PNYGPUIdentifier(0x2c05, 0x144A, "PNY 5070Ti EPIC-X"),
	new PNYGPUIdentifier(0x2c05, 0x143A, "PNY 5070Ti EPIC-X"),

	new PNYGPUIdentifier(0x2c02, 0x1435, "PNY 5080 EPIC-X"),

	new PNYGPUIdentifier(0x2b85, 0x1446, "PNY 5090 EPIC-X"),
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
	return "https://assets.signalrgb.com/devices/brands/pny/gpus/gpu-50.png";
}
