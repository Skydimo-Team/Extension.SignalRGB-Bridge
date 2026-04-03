export function Name() { return "Colorful Ampere GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting"; }
export function Type() { return "SMBUS"; }
export function Size() { return [3, 1]; }
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu";}
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/gpu.png"; }
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

const vLedNames = [ "GPU" ];
const vLedPositions = [ [1, 0] ];
let modelBytes = [];

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	  if (!bus.IsNvidiaBus()) {
		return [];
	}

	for(const ColorfulGPUID of ColorfulGPUIDs) {
		if(ColorfulGPUID.Vendor === bus.Vendor() &&
		ColorfulGPUID.SubVendor === bus.SubVendor() &&
		ColorfulGPUID.Device === bus.Product() &&
		ColorfulGPUID.SubDevice === bus.SubDevice()
		) {
			FoundAddresses.push(ColorfulGPUID.Address);
		}
	}

	return FoundAddresses;
}

function SetGPUNameFromBusIds() {
	for(const ColorfulGPUID of ColorfulGPUIDs) {
		if(ColorfulGPUID.Vendor === bus.Vendor() &&
		ColorfulGPUID.SubVendor === bus.SubVendor() &&
		ColorfulGPUID.Device === bus.Product() &&
		ColorfulGPUID.SubDevice === bus.SubDevice()
		) {
			device.setName(ColorfulGPUID.Name);

			device.log("Found Colorful GPU: " + ColorfulGPUID.Name);

			if(ColorfulGPUID.Name.includes("Vulcan")) {
				modelBytes = [0x01, 0x04];
				device.log("Vulcan GPU detected, using special model bytes");
			}else {
				modelBytes = [0x12, 0x03];
			}
		}
	}
}

export function Initialize() {

	SetGPUNameFromBusIds();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	let color;

	if(overrideColor) {
		color = hexToRgb(overrideColor);
	} else if (LightingMode === "Forced") {
		color = hexToRgb(forcedColor);
	} else {
		color = device.color(vLedPositions[0][0],  vLedPositions[0][1]);
	}

	const packet = [0xAA, 0xEF, modelBytes[0], modelBytes[1], 0x01, 0xff].concat(color);

	const CRCResult = BinaryUtils.WriteInt16LittleEndian(generateCRC(packet));

	if(CRCResult[0] !== undefined && CRCResult[1] !== undefined) {
		packet[9] = CRCResult[0];
		packet[10] = CRCResult[1];

		bus.WriteBlockWithoutRegister(0x0B, packet);
	}
}

function generateCRC(packet) { //I hate CRC's but at least this one isn't stupid complicated.
	let CRCResult = 0;

	for(let bytes = 0; bytes < 9; bytes++) {
		CRCResult += packet[bytes];
	}

	return CRCResult;
}

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

class ColorfulGPUIdentifier extends GPUIdentifier {
	constructor(Brand, Device, SubDevice, Name, Model = "") {
		super(0x10DE, Brand, Device, SubDevice, 0x61, Name, Model);
	}
}

export function BrandGPUList(){ return ColorfulGPUIDs; }

const ColorfulGPUIDs =
[
	//new ColorfulGPUIdentifier(0x7377, 0x2504, 0x150A, "Colorful 3060 iGame Advanced OC-V"),
	new ColorfulGPUIdentifier(0x7377, 0x2544, 0x1500, "Colorful 3060 iGame Ultra"),
	new ColorfulGPUIdentifier(0x7377, 0x2504, 0x1501, "Colorful 3060 iGame Ultra LHR"),
	new ColorfulGPUIdentifier(0x7377, 0x2504, 0x1401, "Colorful 3060 iGame Advanced OC 12G L-V LHR"),

	new ColorfulGPUIdentifier(0x7377, 0x2503, 0x150a, "Colorful 3060 iGame Ultra OC"),
	new ColorfulGPUIdentifier(0x7377, 0x2504, 0x150a, "Colorful 3060 iGame Ultra OC"),
	new ColorfulGPUIdentifier(0x7377, 0x24C9, 0x1581, "Colorful 3060 iGame Ultra OC GDDR6X"),
	new ColorfulGPUIdentifier(0x7377, 0x2503, 0x2000, "Colorful 3060 Battle Axe"),

	new ColorfulGPUIdentifier(0x7377, 0x2489, 0x150A, "Colorful 3060Ti iGame Ultra OC LHR"),
	new ColorfulGPUIdentifier(0x7377, 0x24C9, 0x1580, "Colorful 3060Ti iGame Ultra OC GDDR6X"),
	new ColorfulGPUIdentifier(0x7377, 0x2489, 0x120B, "Colorful 3060Ti iGame Vulcan OC LHR"),

	new ColorfulGPUIdentifier(0x7377, 0x2484, 0x150A, "Colorful 3070 iGame Ultra OC"),

	new ColorfulGPUIdentifier(0x7377, 0x2482, 0x1400, "Colorful 3070Ti iGame Advanced"),

	new ColorfulGPUIdentifier(0x7377, 0x2206, 0x140A, "Colorful 3080 iGame Advanced OC-V"),
	new ColorfulGPUIdentifier(0x7377, 0x2206, 0x120b, "Colorful 3080 iGame Vulcan"),

	new ColorfulGPUIdentifier(0x7377, 0x2204, 0x140A, "Colorful 3090 iGame Advanced OC-V"),
	new ColorfulGPUIdentifier(0x7377, 0x2204, 0x120b, "Colorful 3090 iGame Vulcan"),
	new ColorfulGPUIdentifier(0x7377, 0x2204, 0x1201, "Colorful 3090 iGame Vulcan"),

	new ColorfulGPUIdentifier(0x7377, 0x2882, 0x2100, "Colorful 4060 NB Duo"),

	new ColorfulGPUIdentifier(0x7377, 0x2803, 0x1751, "Colorful 4060Ti iGame Mini"),

	new ColorfulGPUIdentifier(0x7377, 0x2786, 0x2000, "Colorful 4070 NB EX-V"),

	new ColorfulGPUIdentifier(0x7377, 0x2782, 0x1401, "Colorful 4070Ti iGame Advanced OC"),
	new ColorfulGPUIdentifier(0x7377, 0x2782, 0x1500, "Colorful 4070Ti iGame Ultra OC"),
	new ColorfulGPUIdentifier(0x7377, 0x2782, 0x2001, "Colorful 4070Ti Battle Axe"),

	new ColorfulGPUIdentifier(0x7377, 0x2705, 0x1500, "Colorful 4070Ti SUPER iGame Ultra OC"),

	new ColorfulGPUIdentifier(0x7377, 0x2D04, 0x1500, "Colorful 5060Ti iGame Ultra White DUO OC 16G"),
	new ColorfulGPUIdentifier(0x7377, 0x2D04, 0x1501, "Colorful 5060Ti iGame Ultra White OC 16G"),

	new ColorfulGPUIdentifier(0x7377, 0x2F04, 0x1500, "Colorful 5070 iGame Ultra White OC 12G"),
	new ColorfulGPUIdentifier(0x7377, 0x2F04, 0x1501, "Colorful 5070 iGame Ultra White OC"),
	new ColorfulGPUIdentifier(0x7377, 0x2F04, 0x1201, "Colorful 5070 iGame Vulcan"),

	new ColorfulGPUIdentifier(0x7377, 0x2c05, 0x1500, "Colorful 5070Ti iGame Ultra White OC"),
	new ColorfulGPUIdentifier(0x7377, 0x2c05, 0x1501, "Colorful 5070Ti iGame Ultra White OC"),

	new ColorfulGPUIdentifier(0x7377, 0x2c02, 0x1500, "Colorful 5080 iGame Ultra White OC"),

	new ColorfulGPUIdentifier(0x7377, 0x2c02, 0x1501, "Colorful 5080 iGame Ultra White OC"),
	new ColorfulGPUIdentifier(0x7377, 0x2c02, 0x1401, "Colorful 5080 Advanced OC"),
];

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export default class BinaryUtils{
	static WriteInt16LittleEndian(value){
		return [value & 0xFF, (value >> 8) & 0xFF];
	}
	static WriteInt16BigEndian(value){
		return this.WriteInt16LittleEndian(value).reverse();
	}
	static ReadInt16LittleEndian(array){
		return (array[0] & 0xFF) | (array[1] & 0xFF) << 8;
	}
	static ReadInt16BigEndian(array){
		return this.ReadInt16LittleEndian(array.slice(0, 2).reverse());
	}
	static ReadInt32LittleEndian(array){
		return (array[0] & 0xFF) | ((array[1] << 8) & 0xFF00) | ((array[2] << 16) & 0xFF0000) | ((array[3] << 24) & 0xFF000000);
	}
	static ReadInt32BigEndian(array){
		if(array.length < 4){
			array.push(...new Array(4 - array.length).fill(0));
		}

		return this.ReadInt32LittleEndian(array.slice(0, 4).reverse());
	}
	static WriteInt32LittleEndian(value){
		return [value & 0xFF, ((value >> 8) & 0xFF), ((value >> 16) & 0xFF), ((value >> 24) & 0xFF)];
	}
	static WriteInt32BigEndian(value){
		return this.WriteInt32LittleEndian(value).reverse();
	}
}