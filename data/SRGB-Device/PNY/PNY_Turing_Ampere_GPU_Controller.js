// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "PNY Ampere GPU"; }
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

export function DeviceMessages() {
	return [
		{property: "Single Zone Control", message:"Single RGB Zone", tooltip: "This device's firmware is limited to a single zone of rgb control while under direct control."},
	];
}

const vLedNames = [ "GPU" ];
const vLedPositions = [ [1, 0] ];

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
	bus.WriteByte(PNYGPU.registers.Control, 0x00);
	bus.WriteByte(PNYGPU.registers.Mode, 0x01);
	bus.WriteByte(PNYGPU.registers.Brightness, 0x64);
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
	const iPxX = vLedPositions[0][0];
	const iPxY = vLedPositions[0][1];
	let color;

	if(overrideColor) {
		color = hexToRgb(overrideColor);
	} else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	} else {
		color = device.color(iPxX, iPxY);
	}

	bus.WriteByte(PNYGPU.registers.R, color[0]);
	bus.WriteByte(PNYGPU.registers.G, color[1]);
	bus.WriteByte(PNYGPU.registers.B, color[2]);
}

class PNYGPUController {
	constructor() {
		this.registers =
        {
        	Control    : 0xE0,
        	Mode       : 0x60,
        	R          : 0x6C,
        	G          : 0x6D,
        	B          : 0x6E,
        	Brightness : 0x6F
        };
	}

	setDeviceMode(mode) {
		bus.WriteByte(this.registers.Mode, mode);
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
	constructor(Brand, Device, SubDevice, Name, Model = "") {
		super(0x10DE, Brand, Device, SubDevice, 0x49, Name, Model);
	}
}
export function BrandGPUList(){ return PNYGPUIDs; }

const PNYGPUIDs =
[
	///////// PNY /////////
	new PNYGPUIdentifier(0x196E, 0x2484, 0x136E, "PNY 3070 XLR8"),
	new PNYGPUIdentifier(0x196E, 0x2488, 0x138A, "PNY 3070 XLR8"),

	new PNYGPUIdentifier(0x196E, 0x2482, 0x138C, "PNY 3070Ti XLR8"),

	new PNYGPUIdentifier(0x196E, 0x2216, 0x138B, "PNY 3080 XLR8"),
	new PNYGPUIdentifier(0x196E, 0x2206, 0x136B, "PNY 3080 XLR8 REVEL EPIC-X RGB"),
	new PNYGPUIdentifier(0x196E, 0x220A, 0x1398, "PNY 3080 XLR8 REVEL EPIC-X RGB"),

	new PNYGPUIdentifier(0x196E, 0x2208, 0x1385, "PNY 3080Ti XLR8 REVEL"),

	new PNYGPUIdentifier(0x196E, 0x2204, 0x136A, "PNY 3090 XLR8"),

	///////// PALIT /////////
	new PNYGPUIdentifier(0x1569, 0x2486, 0x2486, "PALIT 3060Ti Dual OC"),

	new PNYGPUIdentifier(0x1569, 0x2484, 0x2484, "PALIT 3070 GameRock"),
	new PNYGPUIdentifier(0x1569, 0x2484, 0xf278, "PALIT 3070 GameRock OC"),
	new PNYGPUIdentifier(0x1569, 0x2484, 0xf280, "PALIT 3070 JetStream"),
	new PNYGPUIdentifier(0x1569, 0x2488, 0xf280, "PALIT 3070 JetStream"),
	new PNYGPUIdentifier(0x1569, 0x2488, 0x2488, "PALIT 3070 Gaming Pro"),
	new PNYGPUIdentifier(0x1569, 0x2488, 0xf278, "PALIT 3070 GameRock"),

	new PNYGPUIdentifier(0x1569, 0x2482, 0xf278, "PALIT 3070Ti GameRock"),
	new PNYGPUIdentifier(0x1569, 0x2482, 0x2482, "PALIT 3070Ti Gaming Pro"),

	new PNYGPUIdentifier(0x1569, 0x2216, 0x2216, "PALIT 3080 Gaming Pro"),
	new PNYGPUIdentifier(0x1569, 0x2206, 0x2206, "PALIT 3080 Gaming Pro"),
	new PNYGPUIdentifier(0x1569, 0x220a, 0x220a, "PALIT 3080 Gaming Pro GA102"),
	new PNYGPUIdentifier(0x1569, 0x2206, 0xf278, "PALIT 3080 GameRock"),
	new PNYGPUIdentifier(0x1569, 0x2216, 0xF278, "PALIT 3080 GameRock LHR"),

	new PNYGPUIdentifier(0x1569, 0x2208, 0x2208, "PALIT 3080Ti Gaming Pro"),
	new PNYGPUIdentifier(0x1569, 0x2208, 0xf278, "PALIT 3080Ti GameRock OC"),

	new PNYGPUIdentifier(0x1569, 0x2204, 0xf278, "PALIT 3090 GameRock"),
	new PNYGPUIdentifier(0x1569, 0x2204, 0x2204, "PALIT 3090 Gaming Pro"),

	new PNYGPUIdentifier(0x1569, 0x2203, 0xF294, "PALIT 3090Ti GameRock"),

	new PNYGPUIdentifier(0x1569, 0x2786, 0xF298, "PALIT 4070 Gaming Pro OC"),

	new PNYGPUIdentifier(0x1569, 0x2782, 0xF298, "PALIT 4070Ti Gaming Pro"),
	new PNYGPUIdentifier(0x1569, 0x2782, 0xF294, "PALIT 4070Ti GameRock Classic"),

	new PNYGPUIdentifier(0x1569, 0x2705, 0xF298, "PALIT 4070Ti Super Gaming Pro"),

	new PNYGPUIdentifier(0x1569, 0x2704, 0xF296, "PALIT 4080 GameRock"),

	new PNYGPUIdentifier(0x1569, 0x2702, 0xF298, "PALIT 4080 Super Gaming Pro"),

	new PNYGPUIdentifier(0x1569, 0x2684, 0xF296, "PALIT 4090 GameRock OC"),

	new PNYGPUIdentifier(0x1569, 0x2D04, 0xF330, "PALIT 5060Ti Dual 8GB"),

	new PNYGPUIdentifier(0x1569, 0x2f04, 0xF324, "PALIT 5070 Gaming Pro"),

	new PNYGPUIdentifier(0x1569, 0x2C05, 0xF320, "PALIT 5070Ti GameRock"),
	new PNYGPUIdentifier(0x1569, 0x2C05, 0xF322, "PALIT 5070Ti Gaming Pro V1"),

	new PNYGPUIdentifier(0x1569, 0x2C02, 0xF320, "PALIT 5080 GameRock"),
	new PNYGPUIdentifier(0x1569, 0x2C02, 0xF322, "PALIT 5080 Gaming Pro"),

	new PNYGPUIdentifier(0x1569, 0x2B85, 0xF318, "PALIT 5090 GameRock"),

	///////// GAINWARD /////////
	new PNYGPUIdentifier(0x10B0, 0x2484, 0x2484, "Gainward 3070 Phoenix GS"),
	new PNYGPUIdentifier(0x10B0, 0x2488, 0x2488, "Gainward 3070 Phantom GS"),

	new PNYGPUIdentifier(0x10B0, 0x2482, 0x2482, "Gainward 3070Ti Phoenix"),

	new PNYGPUIdentifier(0x10B0, 0x2206, 0x2206, "Gainward 3080 Phoenix"),
	new PNYGPUIdentifier(0x10B0, 0x2216, 0x2216, "Gainward 3080 Phoenix"),

	new PNYGPUIdentifier(0x10B0, 0x2204, 0x2204, "Gainward 3090 Phoenix"),

	new PNYGPUIdentifier(0x10B0, 0x2782, 0xF299, "Gainward 4070Ti Phoenix GS"),

	new PNYGPUIdentifier(0x10B0, 0x2704, 0xF299, "Gainward 4080 Phoenix GS"),
	new PNYGPUIdentifier(0x10B0, 0x2704, 0xf297, "Gainward 4080 Phantom GS"),

	new PNYGPUIdentifier(0x10B0, 0x2702, 0xF299, "Gainward 4080 Super Phoenix"),

	new PNYGPUIdentifier(0x10B0, 0x2684, 0xF297, "Gainward 4090 Phantom GS"),

	new PNYGPUIdentifier(0x10B0, 0x2F04, 0xF325, "Gainward 5070 Phoenix"),

	new PNYGPUIdentifier(0x10B0, 0x2C02, 0xF323, "Gainward 5080 Phoenix"),

	new PNYGPUIdentifier(0x10B0, 0x2B85, 0xF319, "Gainward 5090 Phantom GS"),
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