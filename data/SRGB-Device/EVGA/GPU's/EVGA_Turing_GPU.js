// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "EVGA Turing GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/evga"; }
export function Type() { return "SMBUS"; }
export function Size() { return [5, 2]; }
export function DefaultPosition(){return [192, 127];}
export function DefaultScale(){return 12.5;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = ["Main Zone"];
const vLedPositions = [[3, 1]];

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	  if (!bus.IsNvidiaBus()) {
		return [];
	}

	for(const GPU of new EVGATuringGPUList().devices){
		if(CheckForIdMatch(bus, GPU)){
			// No Quick Write test on Nvidia
			FoundAddresses.push(GPU.Address);
			break;
		}
	}

	return FoundAddresses;
}

function CheckForIdMatch(bus, Gpu){
	return Gpu.Vendor === bus.Vendor() &&
    Gpu.SubVendor === bus.SubVendor() &&
    Gpu.Device === bus.Product() &&
    Gpu.SubDevice === bus.SubDevice();
}

function SetGPUNameFromBusIds(GPUList){
	for(const GPU of GPUList){
		if(CheckForIdMatch(bus, GPU)){
			device.setName(GPU.Name);
			break;
		}
	}
}

export function Initialize() {
	SetGPUNameFromBusIds(new EVGATuringGPUList().devices);
	EVGATuring.SetMode(EVGATuring.modes.static);

}

export function Render() {
	sendColors();

	PollHardwareModes();
	// Mimic old Refresh Speed. Noticing slight color blending going from Blue to Red where a Purple color gets flashed
	//device.pause(10);

	//device.log(`Total Packets [${sentPackets + savedPackets}]. Checking RGB values saved us sending [${Math.floor(savedPackets/(savedPackets+sentPackets) * 100)}]% of them`)
	//device.log(`Saved: [${savedPackets}] Sent: [${sentPackets}]`);
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		EVGATuring.SetMode(EVGATuring.modes.rainbow);
	}

}

function PollHardwareModes(){
	const PollInterval = 5000;

	if (Date.now() - PollHardwareModes.lastPollTime < PollInterval) {
		return;
	}

	const CurrentMode = EVGATuring.ReadCurrentMode();

	if(CurrentMode !== EVGATuring.modes.static){
		device.log(`Found Device in Invalid Mode! [${EVGATuring.GetModeNameFromId(CurrentMode)}]. Setting back to Static...`);
		EVGATuring.SetMode(EVGATuring.modes.static);
	}


	PollHardwareModes.lastPollTime = Date.now();
}


function CompareArrays(array1, array2){
	return array1.length === array2.length &&
	array1.every(function(value, index) { return value === array2[index];});
}


let OldRGB = [];

function sendColors(overrideColor){

	let Color;

	if(overrideColor){
		Color = hexToRgb(overrideColor);
	}else if(LightingMode === "Forced") {
		Color = hexToRgb(forcedColor);
	} else {
		Color = device.color(...vLedPositions[0]);
	}

	if(!CompareArrays(Color, OldRGB)){
		EVGATuring.WriteRGB(Color);
	}

	OldRGB = Color;
}


function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class EVGATuringProtocol{
	constructor(){
		this.registers = {
			mode: 0x60,
			color1Red: 0x6C,
			color1Green: 0x6D,
			color1Blue: 0x6E,
			color1Brightness: 0x6F,
			color2Red: 0x70,
			color2Green: 0x71,
			color2Blue: 0x72,
			color2Brightness: 0x73,
		};
		this.modes = {
			off: 0x00,
			static: 0x01,
			rainbow: 0x0F,
			breating: 0x22
		};

	}

	GetModeNameFromId(mode){
		if(Object.values(this.modes).includes(mode)){
			return Object.keys(this.modes).find(key => this.modes[key] === mode);
		}

		return "UNKNOWN MODE";
	}

	ReadCurrentMode(){
		const iRet = bus.ReadByte(this.registers.mode);

		if(iRet < 0){
			device.log(`Failed to read existing lighting mode. Error Code: [${iRet}]`);
		}else{
			//device.log(`Current Lighting Mode: [${this.GetModeNameFromId(iRet)}]`);
		}

		return iRet;
	}
	SetMode(mode){
		if(!Object.values(this.modes).includes(mode)){
			device.log(`Cannot Set invalid Lighting Mode: [${mode}]`);

			return;
		}

		const currentMode = this.ReadCurrentMode();

		if(currentMode != mode){
			device.log(`Setting Lighting Mode: [${this.GetModeNameFromId(mode)}]`);
			this.StartTransaction();
			bus.WriteByte(this.registers.mode, mode);
			this.EndTransaction();
		}
	}

	WriteRGB(RGBData){
		this.StartTransaction();

		bus.WriteByte(this.registers.color1Red, RGBData[0]);
		bus.WriteByte(this.registers.color1Green, RGBData[1]);
		bus.WriteByte(this.registers.color1Blue, RGBData[2]);
		bus.WriteByte(this.registers.color1Brightness, 0x64);

		this.EndTransaction();
	}

	StartTransaction(){
		bus.WriteByte(0x0E, 0xE5);
		bus.WriteByte(0x0E, 0xE9);
		bus.WriteByte(0x0E, 0xF5);
		bus.WriteByte(0x0E, 0xF9);
	}

	EndTransaction(){
		bus.WriteByte(0x08, 0x01);
		bus.WriteByte(0x0E, 0xF0);
		bus.WriteByte(0x0E, 0xE0);
	}

}
const EVGATuring = new EVGATuringProtocol();

class NvidiaGPUDeviceIds {

	constructor(){
		this.GTX1050TI       = 0x1C82;
		this.GTX1060         = 0x1C03;
		this.GTX1070         = 0x1B81;
		this.GTX1070TI       = 0x1B82;
		this.GTX1080         = 0x1B80;
		this.GTX1080TI       = 0x1B06;
		this.GTX1650         = 0x1F82;
		this.GTX1650S        = 0x2187;
		this.GTX1660         = 0x2184;
		this.GTX1660TI       = 0x2182;
		this.GTX1660S        = 0x21C4;
		this.RTX2060_TU104   = 0x1E89;
		this.RTX2060_TU106   = 0x1F08;
		this.RTX2060S        = 0x1F47;
		this.RTX2060S_OC     = 0x1F06;
		this.RTX2070         = 0x1F02;
		this.RTX2070_OC      = 0x1F07;
		this.RTX2070S        = 0x1E84;
		this.RTX2080         = 0x1E82;
		this.RTX2080_A       = 0x1E87;
		this.RTX2080S        = 0x1E81;
		this.RTX2080TI_TU102 = 0x1E04;
		this.RTX2080TI       = 0x1E07;
		this.RTX2080_SUPER   = 0x1E81;
		this.RTX3050         = 0x2507;
		this.RTX3060         = 0x2503;
		this.RTX3060_LHR     = 0x2504;
		this.RTX3060_GA104   = 0x2487;
		this.RTX3060TI       = 0x2486;
		this.RTX3060TI_LHR   = 0x2489;
		this.RTX3070         = 0x2484;
		this.RTX3070_LHR     = 0x2488;
		this.RTX3070TI       = 0x2482;
		this.RTX3080         = 0x2206;
		this.RTX3080_LHR     = 0x2216;
		this.RTX3080_GA102   = 0x220A;
		this.RTX3080TI       = 0x2208;
		this.RTX3090         = 0x2204;
		this.RTX3090TI       = 0x2203;
	}
};

class EVGATuringDeviceIds{
	constructor(){
		this.RTX2060_SUPER_XC_GAMING                    = 0x3162;
		this.RTX2060_SUPER_XC_ULTRA_GAMING              = 0x3163;
		this.RTX2070_XC_GAMING                          = 0x2172;
		this.RTX2070_XC_OC                              = 0x2173;
		this.RTX2070_FTW3_ULTRA							= 0x2277; // UNTESTED
		this.RTX2070_SUPER_XC_ULTRA                     = 0x3173;
		this.RTX2070_SUPER_XC_ULTRA_PLUS                = 0x3175;
		this.RTX2070_SUPER_XC_GAMING                    = 0x3172;
		this.RTX2070_SUPER_XC_HYBRID                    = 0x3178;
		this.RTX2070_SUPER_FTW3                         = 0x3273;
		this.RTX2070_SUPER_FTW3_ULTRA                   = 0x3277;
		this.RTX2070_SUPER_FTW3_ULTRA_OC                = 0x3377;
		this.RTX2080_FTW3_HYBRID_GAMING					= 0x2284;
		this.RTX2080_BLACK                              = 0x2081;
		this.RTX2080_XC_BLACK                           = 0x2082;
		this.RTX2080_XC_GAMING                          = 0x2182;
		this.RTX2080_XC2_GAMING                         = 0x2187;
		this.RTX2080_XC_ULTRA_GAMING                    = 0x2183;
		this.RTX2080TI_BLACK_EDITION                    = 0x2281;
		this.RTX2080TI_BLACK_EDITION_2					= 0x2282;
		this.RTX2080TI_XC_ULTRA		                    = 0x2382;
		this.RTX2080TI_XC_ULTRA_GAMING                  = 0x2383;
		this.RTX2080TI_FTW3_ULTRA_HYBRID                = 0x2484;
		this.RTX2080TI_FTW3_ULTRA                       = 0x2487;
		this.RTX2080TI_FTW3_ULTRA_HYDRO_COPPER_GAMING   = 0x2489;
		this.RTX2080_SUPER_GAMING                       = 0x3080;
		this.RTX2080_SUPER_XC_GAMING                    = 0x3182;
		this.RTX2080_SUPER_XC_OC_ULTRA                  = 0x3183;
		this.RTX2080_SUPER_FTW3_ULTRA                   = 0x3287;
		this.RTX2080_SUPER_XC_HYBRID                    = 0x3188;
		this.RTX2080_SUPER_XC_HYDRO_COPPER              = 0x3189;
		this.RTX2080_SUPER_FTW3_HYDRO_COPPER            = 0x3289; // UNTESTED
		this.RTX2080_SUPER_FTW3_HYBRID_GAMING           = 0x3288;
	}
}


class GPUIdentifier{
	constructor(Vendor, SubVendor, Device, SubDevice, Address, Name, Model = ""){
		this.Vendor = Vendor;
		this.SubVendor = SubVendor;
		this.Device = Device;
		this.SubDevice = SubDevice;
		this.Address = Address;
		this.Name = Name;
		this.Model = Model;
	}
	UID(){
		return `${this.Vendor}:${this.SubVendor}:${this.Device}:${this.SubDevice}`;
	}
}

class GPUList{
	constructor(){
		this.devices = [];
	}
	DeviceList(){ return this.devices; }

	CheckForDuplicates(){
		const seen = new Set();
		const hasDuplicates = this.devices.some(function(currentObject) {
   		return seen.size === seen.add(currentObject.UID()).size;
		});

		return hasDuplicates;
	}
}

class EVGATuringIdentifier extends GPUIdentifier{
	constructor(Device, SubDevice, Name, Model = ""){
		super(0x10DE, 0x3842, Device, SubDevice, 0x49, Name, Model);
	}
}

export function BrandGPUList(){ return new EVGATuringGPUList().devices; }

class EVGATuringGPUList extends GPUList{
	constructor(){
		super();

		const Nvidia = new NvidiaGPUDeviceIds();
		const EVGATuringIds = new EVGATuringDeviceIds();
		this.devices = [
			new EVGATuringIdentifier(Nvidia.RTX2060S_OC,        EVGATuringIds.RTX2060_SUPER_XC_GAMING,          "EVGA RTX 2060 Super XC Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2060S_OC,        EVGATuringIds.RTX2060_SUPER_XC_ULTRA_GAMING,    "EVGA RTX 2060 Super XC Ultra Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2070_OC,         EVGATuringIds.RTX2070_XC_GAMING,                "EVGA RTX 2070 XC Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2070_OC,         EVGATuringIds.RTX2070_XC_OC,                    "EVGA RTX 2070 OC"),
			new EVGATuringIdentifier(Nvidia.RTX2070_OC,         EVGATuringIds.RTX2070_FTW3_ULTRA,               "EVGA RTX 2070 FTW3 Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_XC_ULTRA,           "EVGA RTX 2070 Super XC Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_XC_ULTRA_PLUS,      "EVGA RTX 2070 XC Ultra+"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_XC_GAMING,          "EVGA RTX 2070 Super XC Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_XC_HYBRID,          "EVGA RTX 2070 Super XC Hybrid"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_FTW3,               "EVGA RTX 2070 Super FTW3"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_FTW3_ULTRA,         "EVGA RTX 2070 Super FTW3 Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2070S,           EVGATuringIds.RTX2070_SUPER_FTW3_ULTRA_OC,      "EVGA RTX 2070 Super FTW3 Ultra OC"),
			new EVGATuringIdentifier(Nvidia.RTX2080,            EVGATuringIds.RTX2080_BLACK,                    "EVGA RTX 2080 Black"),
			new EVGATuringIdentifier(Nvidia.RTX2080_A,          EVGATuringIds.RTX2080_FTW3_HYBRID_GAMING,		"EVGA RTX 2080 FTW3 Hybrid Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080_A,          EVGATuringIds.RTX2080_XC_BLACK,                 "EVGA RTX 2080 XC Black"),
			new EVGATuringIdentifier(Nvidia.RTX2080_A,          EVGATuringIds.RTX2080_XC_GAMING,                "EVGA RTX 2080 XC Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080_A,          EVGATuringIds.RTX2080_XC2_GAMING,               "EVGA RTX 2080 XC2 Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080_A,          EVGATuringIds.RTX2080_XC_ULTRA_GAMING,          "EVGA RTX 2080 XC Ultra Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI_TU102,    EVGATuringIds.RTX2080TI_BLACK_EDITION,          "EVGA RTX 2080Ti Black Edition"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI,			EVGATuringIds.RTX2080TI_BLACK_EDITION_2,		"EVGA RTX 2080Ti Black Edition"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI,          EVGATuringIds.RTX2080TI_XC_ULTRA,		        "EVGA RTX 2080Ti XC Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI,          EVGATuringIds.RTX2080TI_XC_ULTRA_GAMING,        "EVGA RTX 2080Ti XC Ultra Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI,          EVGATuringIds.RTX2080TI_FTW3_ULTRA_HYBRID,      "EVGA RTX 2080Ti FTW3 Ultra Hybrid"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI,          EVGATuringIds.RTX2080TI_FTW3_ULTRA,             "EVGA RTX 2080Ti FTW3 Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2080TI,          EVGATuringIds.RTX2080TI_FTW3_ULTRA_HYDRO_COPPER_GAMING,		"EVGA RTX 2080Ti FTW3 Ultra Hydro Copper Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_GAMING,             "EVGA RTX 2080 Super Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_XC_GAMING,          "EVGA RTX 2080 Super XC Gaming"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_XC_OC_ULTRA,        "EVGA RTX 2080 Super XC OC Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_FTW3_ULTRA,         "EVGA RTX 2080 Super FTW3 Ultra"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_XC_HYBRID,          "EVGA RTX 2080 Super XC Hybrid"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_XC_HYDRO_COPPER,    "EVGA RTX 2080 Super XC Hydro Copper"),
			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_FTW3_HYBRID_GAMING, "EVGA RTX 2080 Super FTW3 Hybrid Gaming"),

			new EVGATuringIdentifier(Nvidia.RTX2080_SUPER,      EVGATuringIds.RTX2080_SUPER_FTW3_HYDRO_COPPER,  "EVGA RTX 2080 Super FTW3 Hydro Copper")
		];
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/evga/gpus/gpu.png";
}