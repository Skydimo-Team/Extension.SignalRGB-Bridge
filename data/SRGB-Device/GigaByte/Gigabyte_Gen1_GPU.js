// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "Gigabyte Vision GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/gigabyte"; }
export function Type() { return "SMBUS"; }
export function Size() { return [5, 2]; }
export function DefaultPosition(){return [192, 127];}
export function DefaultScale(){return 12.5;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function ConflictingProcesses() { return ["RGBFusion.exe"]; }
export function DeviceType(){return "gpu";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = ["Main Zone"];
/** @type {LedPosition[]} */
const vLedPositions = [[3, 1]];

let GigabyteVision;

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	if (!bus.IsNvidiaBus()) {
		return [];
	}

	for(const GPU of new GigabyteVisionGPuList().devices) {
		if(CheckForIdMatch(bus, GPU)) {

			bus.log(`Found Potential Gigabyte Gen1 GPU! [${GPU.Name}]`, {toFile : true});

			if(GigabyteVisionGpuCheck(bus, GPU.Address, true)){
				FoundAddresses.push(GPU.Address);
				bus.log(`Gigabyte Gen1 GPU passed read test! [${GPU.Name}]`, {toFile : true});
			}else{
				bus.log(`Gigabyte Gen1 GPU failed read test! [${GPU.Name}]`, {toFile : true});
			}

		}
	}

	return FoundAddresses;
}

function CheckForIdMatch(bus, Gpu) {
	return Gpu.Vendor === bus.Vendor() &&
    Gpu.SubVendor === bus.SubVendor() &&
    Gpu.Device === bus.Product() &&
    Gpu.SubDevice === bus.SubDevice();
}

function SetGPUNameFromBusIds(GPUList) {
	for(const GPU of GPUList) {
		if(CheckForIdMatch(bus, GPU)) {
			device.setName(GPU.Name);
			break;
		}
	}
}

function CheckAllPotentialAddresses(bus){
	const addressesToCheck = [0x32, 0x46, 0x47, 0x48, 0x51, 0x52, 0x55, 0x56, 0x62, 0x63, 0x71];
	const passedAddresses = [];

	bus.log(`Checking all potential Gigabyte GPU addresses`, {toFile: true});

	for(let i = 0; i < addressesToCheck.length; i++){
		const address = addressesToCheck[i];

		if(GigabyteVisionGpuCheck(bus, address)){
			passedAddresses.push(address);
		}
	}

	bus.log(`Valid Gigabyte GPU addresses: [${passedAddresses}]`, {toFile: true});

	return passedAddresses;
}

function GigabyteVisionGpuCheck(bus, address, log = false){

	// This cards fails both 4 and 8 byte read test, so we bypass that model
	if (bus.Product() === 0x2486 && bus.SubDevice() === 0x405E) {
		return true;
	}

	const ValidReturnCodes = [0x10, 0x11, 0x12, 0x14];
	// 0x62 (Gaming OC) cards use a 8 byte write length.
	// GPU will softlock if this is wrong.
	const WriteLength = [0x32, 0x50, 0x62, 0x71].includes(address) ? 8 : 4;

	let data;

	// This might be an awful idea. Something Something Cpp class names
	if(String(bus).startsWith("I2CBusWrapperFixedAddress")){
		bus.WriteBlockWithoutRegister(WriteLength, [0xAB]);
		data = bus.ReadBlockWithoutRegister(4);
	}else{
		bus.WriteBlockWithoutRegister(address, WriteLength, [0xAB]);
		data = bus.ReadBlockWithoutRegister(address, 4);
	}

	const isValidAddress = (data[1][0] === 0xAB && ValidReturnCodes.includes(data[1][1]));

	if(log){
		bus.log(`Gigabyte GPU returned Init Read: [${data[1]}], Error: [${data[0]}]`, {toFile : true});
	}

	return isValidAddress;
}

export function Initialize() {
	GigabyteVision = new GigabyteVisionProtocol();
	// We must do this before any other writes as a bad length will soft lock the GPU.
	GigabyteVision.determineWriteLength();
	GigabyteVision.setMode(GigabyteVision.modes.static);

	SetGPUNameFromBusIds(new GigabyteVisionGPuList().devices);
}

export function Render() {
	sendColors();

	device.pause(10);
}


export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function sendColors(overrideColor) {

	let Color;

	if(overrideColor) {
		Color = hexToRgb(overrideColor);
	} else if(LightingMode === "Forced") {
		Color = hexToRgb(forcedColor);
	} else {
		Color = device.color(...vLedPositions[0]);
	}

	GigabyteVision.WriteRGB(Color);
}


function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class GigabyteVisionProtocol {
	constructor(){

		this.registers =
		{
			Initialization: 0xAB,
			Mode: 0x88,
			Color: 0x40,
		};
		this.modes =
		{
			static: 0x01,
			breathing: 0x02,
			flashing: 0x04,
			dualFlash: 0x08,
			specrum: 0x11,
		};
		this.config =
		{
			writeLength : 0
		};
	}

	determineWriteLength() {
		this.config.writeLength = [0x32, 0x62].includes(bus.GetAddress()) ? 8 : 4;
	}

	setMode(mode) {
		const data = [this.registers.Mode, mode, 5, 0x63];

		const iRet = this.WriteBlockSafe(data);

		if(iRet < 0) {
			bus.log("Failed To Set Mode");

			return;
		}

		bus.log(`Set Lighting Mode To [${mode}]`);
	}

	WriteRGB(RGBData) {
		if(RGBData.length > 3) {
			bus.log(`Invalid RGB Data Length. Expected 3, Got [${RGBData.length}]`);

			return;
		}
		const Data = [this.registers.Color];
		Data.push(...RGBData);
		this.WriteBlockSafe(Data);
	}

	WriteBlockSafe(Data) {
		if(this.config.writeLength === -1) {
			bus.log("Invalid Write Length. Aborting Write Operation to Redetect...");
			this.determineWriteLength();

			return -1;
		}

		return bus.WriteBlockWithoutRegister(this.config.writeLength, Data);
	}

}

class NvidiaGPUDeviceIds {
	constructor() {
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
		this.RTX3050         = 0x2507;
		this.RTX3060         = 0x2503;
		this.RTX3060_LHR     = 0x2504;
		this.RTX3060_GA104   = 0x2487;
		this.RTX3060TI       = 0x2486;
		this.RTX3060TI_D6X	 = 0x24C9;
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
		this.RTX4060         = 0x2882;
		this.RTX4060TI		 = 0x2803;
		this.RTX4060TI_OC	 = 0x2805;
		this.RTX4070		 = 0x2786;
		this.RTX4070S        = 0x2783;
		this.RTX4070TI 		 = 0x2782;
		this.RTX4070TI_S	 = 0x2705;
		this.RTX4080		 = 0x2704;
		this.RTX4080_S	 	 = 0x2702;
		this.RTX4090		 = 0x2684;
	}
};

const Nvidia = new NvidiaGPUDeviceIds();

class GigabyteVisionDeviceIds {
	constructor() {
		this.GTX1050TI_G1_GAMING            = 0x372A;
		this.GTX1060_G1_GAMING_OC           = 0x3739;
		this.GTX1060_XTREME                 = 0x3776;
		this.GTX1070_GAMING                 = 0x3772;
		this.GTX1070_XTREME                 = 0x3778;
		this.GTX1070_G1_GAMING              = 0x3701;
		this.GTX1070TI_GAMING               = 0x3794;
		this.GTX1080_G1_GAMING              = 0x3702;
		this.GTX1080_AORUS                  = 0x377D;
		this.GTX1080_AORUS_2				= 0x377E;
		this.GTX1080TI_GAMING_OC            = 0x374C;
		this.GTX1080TI_GAMING_OC_BLACK      = 0x377A;
		this.GTX1080TI_XTREME               = 0x3751;
		this.GTX1080TI_XTREME_WATERFORCE    = 0x3762;
		this.GTX1080TI_XTREME_WATERFORCE_2  = 0x376A;
		this.GTX1080TI_AORUS_11G       		= 0x3752;

		this.GTX1650_GAMING_OC              = 0x3FE4;
		this.GTX1660_GAMING_OC_6GB          = 0x3FC7;
		this.GTX1660_GAMING_OC_6GB_2		= 0x3FCF;
		this.GTX1660TI_GAMING_OC_6GB        = 0x3FC5;
		this.GTX1660S_GAMING_OC             = 0x4014;

		this.RTX2060_GAMING_OC              = 0x37CE;
		this.RTX2060_GAMING_OC_PRO          = 0x3FC2;
		this.RTX2060_GAMING_OC_PRO_2		= 0x3FC9;
		this.RTX2060_GAMING_OC_PRO_WHITE    = 0x3FD0;
		this.RTX2060_XTREME_6G				= 0x37d4;
		this.RTX2060_XTREME					= 0x3FD1;
		this.RTX2060S_GAMING_OC_3X_WHITE    = 0x401E;
		this.RTX2060S_GAMING                = 0x404A;
		this.RTX2060S_GAMING_OC             = 0x3FED;
		this.RTX2060S_GAMING_OC_WHITE       = 0x3FFE;
		this.RTX2060S_GAMING_OC_3X_8GB		= 0x4009;
		this.RTX2070_GAMING					= 0x37C8;
		this.RTX2070_GAMING_OC              = 0x37AD;
		this.RTX2070_GAMING_OC_WHITE		= 0x37C6;
		this.RTX2070_WINDFORCE              = 0x37C2;
		this.RTX2070_XTREME_OC_8G			= 0x37B5;
		this.RTX2070S_GAMING_OC             = 0x3FEB;
		this.RTX2070S_GAMING_OC_3X          = 0x4008;
		this.RTX2070S_GAMING_OC_3X_WHITE    = 0x400D;
		this.RTX2070S_GAMING_OC_3X_2		= 0x4010;
		this.RTX2070S_GAMING_WINDFORCE_OC   = 0x3FFC;
		this.RTX2070S_GAMING_OC_WHITE 		= 0x3fff;
		this.RTX2080_A_GAMING_OC            = 0x37A7;
		this.RTX2080_WINDFORCE				= 0x379f;
		this.RTX2080_WINDFORCE_OC			= 0x37c1;
		this.RTX2080_GAMING_OC              = 0x37D6;
		this.RTX2080S_GAMING_OC             = 0x3FE9;
		this.RTX2080TI_GAMING_OC            = 0x37A9;

		this.RTX3050_EAGLE_OC               = 0x40AA;
		this.RTX3060_EAGLE_OC_REV          	= 0x4071;
		this.RTX3060_EAGLE_OC_REV2          = 0x4072;
		this.RTX3060_VISION_OC_12GB         = 0x4073;
		this.RTX3060_GAMING_OC_12GB         = 0x4074;
		this.RTX3060TI_VISION_OC			= 0x4077;
		this.RTX3060TI_GAMING_OC            = 0x405A;
		this.RTX3060TI_GAMING_OC_D6X		= 0x40CD;
		this.RTX3060TI_EAGLE_OC             = 0x405B;
		this.RTX3060TI_EAGLE_OC_REV2_LHR    = 0x4060;
		this.RTX3060TI_GAMING_OC_PRO        = 0x405E;
		this.RTX3070_GAMING_OC              = 0x404C;
		this.RTX3070_VISION_OC              = 0x404D;
		this.RTX3070_EAGLE_OC           	= 0x404E;
		this.RTX3070TI_GAMING	            = 0x40B6;
		this.RTX3070TI_GAMING_OC            = 0x408F;
		this.RTX3070TI_EAGLE                = 0x408C;
		this.RTX3070TI_EAGLE_OC             = 0x408D;
		this.RTX3070TI_VISION_OC            = 0x4090;
		this.RTX3080_VISION_OC              = 0x404B;
		this.RTX3080_EAGLE_12GB_LHR         = 0x409F;
		this.RTX3080_GAMING_OC              = 0x403F;
		this.RTX3080TI_EAGLE                = 0x4085;
		this.RTX3080TI_EAGLE_OC             = 0x4086;
		this.RTX3080TI_VISION_OC            = 0x4087;
		this.RTX3080TI_GAMING_OC            = 0x4088;
		this.RTX3080_12G_GAMING_OC          = 0x40A2;
		this.RTX3080_EAGLE_OC				= 0x4040;
		this.RTX3090_VISION_OC_24G			= 0x4044;
		this.RTX3090_GAMING_OC_24GB         = 0x4043;

		this.RTX4060_AERO_OC                = 0x410A;
		this.RTX4060_GAMING_OC				= 0x4109;
		this.RTX4060TI_GAMING_OC            = 0x40F8;
		this.RTX4060TI_GAMING_OC_2			= 0x4112;
		this.RTX4060TI_AERO					= 0x40F9;
		this.RTX4060TI_AERO_OC				= 0x4113;
		this.RTX4070_AERO					= 0x40E6;
		this.RTX4070_AERO_OC                = 0x412C;
		this.RTX4070_EAGLE_OC				= 0x40ED;
		this.RTX4070_WINDFORCE_OC			= 0x40EE;
		this.RTX4070S_AERO                  = 0x4139;
		this.RTX4070S_EAGLE_OC				= 0x413A;
		this.RTX4070S_EAGLE_OC_ICE			= 0x4148;
		this.RTX4070TI_GAMING_OC            = 0x40c6;
		this.RTX4070TI_EAGLE_12G			= 0x40D2;
		this.RTX4070TI_EAGLE_OC_12G			= 0x40CA;
		this.RTX4070TI_AERO					= 0x40CB;
		this.RTX4070TI_AERO_OC				= 0x40FF;
		this.RTX4070TI_EAGLE				= 0x40EC;
		this.RTX4070TI_MASTER_12G           = 0x40bb;
		this.RTX4070TI_SUPER_AERO_OC		= 0x413F;
		this.RTX4070TI_S_EAGLE_OC			= 0x413E;
		this.RTX4070TI_S_EAGLE_OC_ICE		= 0x414E;
		this.RTX4080_EAGLE_16GD				= 0x40CC;
		this.RTX4080_EAGLE_OC_16GD			= 0x40BE;
		this.RTX4080_GAMING_OC	            = 0x40bc;
		this.RTX4080_AERO_OC_16G			= 0x40C5;
		this.RTX4080_S_AERO_OC_16G			= 0x4141;
		this.RTX4090_AERO_OC				= 0x40E4;
		this.RTX4090_GAMING_OC_24GB			= 0x40BF;
	}
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

//0x1458
class GigabyteVisionIdentifier extends GPUIdentifier {
	constructor(device, SubDevice, Address, Name) {
		super(0x10DE, 0x1458, device, SubDevice, Address, Name, "");
	}
}
export function BrandGPUList(){ return new GigabyteVisionGPuList().devices; }

class GigabyteVisionGPuList {
	constructor() {
		const Nvidia = new NvidiaGPUDeviceIds();
		const GigabyteVisionIds  = new GigabyteVisionDeviceIds();

		this.devices = [
			new GigabyteVisionIdentifier(Nvidia.GTX1070,        GigabyteVisionIds.GTX1070_GAMING,				0x47, "GIGABYTE 1070 Gaming"),
			new GigabyteVisionIdentifier(Nvidia.GTX1070,		GigabyteVisionIds.GTX1070_G1_GAMING,			0x48, "GIGABYTE 1070 G1 Gaming"),

			new GigabyteVisionIdentifier(Nvidia.GTX1080,		GigabyteVisionIds.GTX1080_G1_GAMING,			0x48, "GIGABYTE 1080 G1 Gaming"),
			new GigabyteVisionIdentifier(Nvidia.GTX1080,		GigabyteVisionIds.GTX1080_AORUS,				0x47, "GIGABYTE 1080 AORUS 8GB"),
			new GigabyteVisionIdentifier(Nvidia.GTX1080,		GigabyteVisionIds.GTX1080_AORUS_2,				0x47, "GIGABYTE 1080 AORUS 8GB"),

			new GigabyteVisionIdentifier(Nvidia.GTX1080TI,      GigabyteVisionIds.GTX1080TI_AORUS_11G,			0x47, "GIGABYTE 1080Ti AORUS"),
			new GigabyteVisionIdentifier(Nvidia.GTX1080TI,      GigabyteVisionIds.GTX1080TI_XTREME,				0x47, "GIGABYTE 1080Ti XTREME Edition"),
			new GigabyteVisionIdentifier(Nvidia.GTX1080TI,      GigabyteVisionIds.GTX1080TI_GAMING_OC,			0x47, "GIGABYTE 1080Ti Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.GTX1080TI,      GigabyteVisionIds.GTX1080TI_GAMING_OC_BLACK,	0x47, "GIGABYTE 1080Ti Gaming OC Black"),
			new GigabyteVisionIdentifier(Nvidia.GTX1080TI,      GigabyteVisionIds.GTX1080TI_XTREME_WATERFORCE_2, 0x47, "GIGABYTE 1080Ti Waterforce Xtreme Edition"),

			new GigabyteVisionIdentifier(Nvidia.GTX1660,        GigabyteVisionIds.GTX1660_GAMING_OC_6GB,		0x47, "GIGABYTE 1660 Gaming OC 6gb"),
			new GigabyteVisionIdentifier(Nvidia.GTX1660,        GigabyteVisionIds.GTX1660_GAMING_OC_6GB_2,		0x47, "GIGABYTE 1660 Gaming OC 6gb"),

			new GigabyteVisionIdentifier(Nvidia.GTX1660S,       GigabyteVisionIds.GTX1660S_GAMING_OC,			0x47, "GIGABYTE 1660 Super Gaming OC"),

			new GigabyteVisionIdentifier(Nvidia.GTX1660TI,      GigabyteVisionIds.GTX1660TI_GAMING_OC_6GB,		0x47, "GIGABYTE 1660Ti Gaming OC 6gb"),

			new GigabyteVisionIdentifier(Nvidia.RTX2060S_OC,    GigabyteVisionIds.RTX2060S_GAMING_OC_3X_WHITE,	0x47, "GIGABYTE 2060 Super Gaming OC Windforce White"),
			new GigabyteVisionIdentifier(Nvidia.RTX2060S_OC,    GigabyteVisionIds.RTX2060S_GAMING_OC,			0x47, "GIGABYTE 2060 Super Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX2060S_OC,    GigabyteVisionIds.RTX2060S_GAMING_OC_3X_8GB,	0x47, "GIGABYTE 2060 Super Gaming OC Windforce"),
			new GigabyteVisionIdentifier(Nvidia.RTX2060S_OC,    GigabyteVisionIds.RTX2060S_GAMING_OC_WHITE,		0x47, "GIGABYTE 2060 Super Gaming OC White"),

			new GigabyteVisionIdentifier(Nvidia.RTX2060_TU104,  GigabyteVisionIds.RTX2060_GAMING_OC_PRO,		0x47, "GIGABYTE 2060 Gaming OC Pro"),
			new GigabyteVisionIdentifier(Nvidia.RTX2060_TU104,  GigabyteVisionIds.RTX2060_GAMING_OC_PRO_2,		0x47, "GIGABYTE 2060 Gaming OC Pro"),
			new GigabyteVisionIdentifier(Nvidia.RTX2060_TU106,  GigabyteVisionIds.RTX2060_XTREME_6G,            0x47, "GIGABYTE 2060 XTREME 6G"),
			new GigabyteVisionIdentifier(Nvidia.RTX2060_TU106,  GigabyteVisionIds.RTX2060_XTREME,				0x47, "GIGABYTE 2060 XTREME"),

			new GigabyteVisionIdentifier(Nvidia.RTX2070,		GigabyteVisionIds.RTX2070_GAMING,				0x47, "GIGABYTE 2070 Gaming"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070_OC,     GigabyteVisionIds.RTX2070_GAMING_OC,			0x47, "GIGABYTE 2070 Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070_OC,     GigabyteVisionIds.RTX2070_GAMING_OC_WHITE,		0x47, "GIGABYTE 2070 Gaming OC White"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070_OC,		GigabyteVisionIds.RTX2070_XTREME_OC_8G,			0x50, "GIGABYTE 2070 XTREME OC 8G"),

			new GigabyteVisionIdentifier(Nvidia.RTX2070S,       GigabyteVisionIds.RTX2070S_GAMING_OC,			0x47, "GIGABYTE 2070 Super Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070S,       GigabyteVisionIds.RTX2070S_GAMING_OC_3X,		0x47, "GIGABYTE 2070 Super Gaming OC 3x"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070S,       GigabyteVisionIds.RTX2070S_GAMING_OC_3X_WHITE,	0x47, "GIGABYTE 2070 Super Gaming OC 3x White Edition"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070S,       GigabyteVisionIds.RTX2070S_GAMING_WINDFORCE_OC,	0x47, "GIGABYTE 2070 Super Gaming OC Windforce 8GB"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070S,		GigabyteVisionIds.RTX2070S_GAMING_OC_3X_2,		0x47, "GIGABYTE 2070 Super Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX2070S,		GigabyteVisionIds.RTX2070S_GAMING_OC_WHITE,		0x47, "GIGABYTE 2070 Super Gaming OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX2080,		GigabyteVisionIds.RTX2080_WINDFORCE_OC,			0x47, "GIGABYTE 2080 Windforce OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX2080_A,      GigabyteVisionIds.RTX2080_WINDFORCE,			0x47, "GIGABYTE 2080 Windforce OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX2080S,       GigabyteVisionIds.RTX2080S_GAMING_OC,			0x47, "GIGABYTE 2080 Super Gaming OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX2080TI,      GigabyteVisionIds.RTX2080TI_GAMING_OC,			0x47, "GIGABYTE 2080Ti Gaming OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3050,        GigabyteVisionIds.RTX3050_EAGLE_OC,				0x62, "GIGABYTE 3050 Eagle OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3060,        GigabyteVisionIds.RTX3060_EAGLE_OC_REV2,		0x32, "GIGABYTE 3060 Eagle OC Rev 2.0"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060,        GigabyteVisionIds.RTX3060_EAGLE_OC_REV2,		0x63, "GIGABYTE 3060 Eagle OC Rev 2.0"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060,        GigabyteVisionIds.RTX3060_GAMING_OC_12GB,		0x62, "GIGABYTE 3060 Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060,        GigabyteVisionIds.RTX3060_VISION_OC_12GB,		0x63, "GIGABYTE 3060 Vision OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3060_LHR,    GigabyteVisionIds.RTX3060_EAGLE_OC_REV,			0x63, "GIGABYTE 3060 Eagle OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_LHR,    GigabyteVisionIds.RTX3060_EAGLE_OC_REV2,		0x32, "GIGABYTE 3060 Eagle OC Rev 2.0 LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_LHR,    GigabyteVisionIds.RTX3060_EAGLE_OC_REV2,		0x63, "GIGABYTE 3060 Eagle OC Rev 2.0 LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_LHR,    GigabyteVisionIds.RTX3060_VISION_OC_12GB,		0x63, "GIGABYTE 3060 Vision OC LHR"),

			new GigabyteVisionIdentifier(Nvidia.RTX3060_GA104,  GigabyteVisionIds.RTX3060_EAGLE_OC_REV,		    0x32, "GIGABYTE 3060 Eagle OC LHR (GA104)"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_GA104,  GigabyteVisionIds.RTX3060_EAGLE_OC_REV2,		0x32, "GIGABYTE 3060 Eagle OC LHR (GA104)"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_GA104,  GigabyteVisionIds.RTX3060_EAGLE_OC_REV2,		0x63, "GIGABYTE 3060 Eagle OC LHR (GA104)"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_GA104,  GigabyteVisionIds.RTX3060_GAMING_OC_12GB,		0x62, "GIGABYTE 3060 Gaming OC LHR (GA104)"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060_GA104,  GigabyteVisionIds.RTX3060_VISION_OC_12GB,		0x63, "GIGABYTE 3060 Vision OC LHR (GA104)"),

			new GigabyteVisionIdentifier(Nvidia.RTX3060TI,      GigabyteVisionIds.RTX3060TI_EAGLE_OC,			0x32, "GIGABYTE 3060Ti Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI,      GigabyteVisionIds.RTX3060TI_EAGLE_OC,			0x63, "GIGABYTE 3060Ti Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI,      GigabyteVisionIds.RTX3060TI_GAMING_OC_PRO,		0x62, "GIGABYTE 3060Ti Gaming OC Pro Rev 1.0"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI,      GigabyteVisionIds.RTX3060TI_GAMING_OC,			0x62, "GIGABYTE 3060Ti Gaming OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_VISION_OC,			0x63, "GIGABYTE 3060Ti Vision OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_EAGLE_OC,			0x32, "GIGABYTE 3060Ti Eagle OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_EAGLE_OC,			0x63, "GIGABYTE 3060Ti Eagle OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_EAGLE_OC_REV2_LHR,	0x63, "GIGABYTE 3060Ti Eagle OC Rev 2.0 LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_GAMING_OC,			0x32, "GIGABYTE 3060Ti Gaming OC Rev 2.0"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_GAMING_OC,			0x62, "GIGABYTE 3060Ti Gaming OC Rev 2.0"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteVisionIds.RTX3060TI_GAMING_OC_PRO,		0x62, "GIGABYTE 3060Ti Gaming OC Pro Rev 3.0"),
			new GigabyteVisionIdentifier(Nvidia.RTX3060TI_D6X,  GigabyteVisionIds.RTX3060TI_GAMING_OC_D6X,		0x62, "GIGABYTE 3060Ti Gaming OC D6X"),

			new GigabyteVisionIdentifier(Nvidia.RTX3070,        GigabyteVisionIds.RTX3070_GAMING_OC,			0x62, "GIGABYTE 3070 Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070,        GigabyteVisionIds.RTX3070_EAGLE_OC,				0x63, "GIGABYTE 3070 Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070,        GigabyteVisionIds.RTX3070_EAGLE_OC,				0x62, "GIGABYTE 3070 Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070,        GigabyteVisionIds.RTX3070_VISION_OC,			0x63, "GIGABYTE 3070 Vision OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3070_LHR,    GigabyteVisionIds.RTX3070_VISION_OC,			0x63, "GIGABYTE 3070 Vision OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070_LHR,    GigabyteVisionIds.RTX3070_GAMING_OC,			0x62, "GIGABYTE 3070 Gaming OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070_LHR,    GigabyteVisionIds.RTX3070_EAGLE_OC,				0x63, "GIGABYTE 3070 Eagle OC LHR"),

			new GigabyteVisionIdentifier(Nvidia.RTX3070TI,      GigabyteVisionIds.RTX3070TI_EAGLE,				0x63, "GIGABYTE 3070Ti Eagle"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070TI,      GigabyteVisionIds.RTX3070TI_EAGLE_OC,			0x63, "GIGABYTE 3070Ti Eagle OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070TI,      GigabyteVisionIds.RTX3070TI_VISION_OC,			0x63, "GIGABYTE 3070Ti Vision OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070TI,      GigabyteVisionIds.RTX3070TI_GAMING,				0x62, "GIGABYTE 3070Ti Gaming"),
			new GigabyteVisionIdentifier(Nvidia.RTX3070TI,      GigabyteVisionIds.RTX3070TI_GAMING_OC,			0x62, "GIGABYTE 3070Ti Gaming OC LHR"),

			new GigabyteVisionIdentifier(Nvidia.RTX3080,        GigabyteVisionIds.RTX3080_GAMING_OC,			0x62, "GIGABYTE 3080 Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080,        GigabyteVisionIds.RTX3080_VISION_OC,			0x63, "GIGABYTE 3080 Vision OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080,	    GigabyteVisionIds.RTX3080_EAGLE_OC,				0x63, "GIGABYTE 3080 Eagle OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3080_GA102,  GigabyteVisionIds.RTX3080_12G_GAMING_OC,		0x62, "GIGABYTE 3080 Gaming OC 12g LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080_GA102,  GigabyteVisionIds.RTX3080_EAGLE_12GB_LHR,		0x63, "GIGABYTE 3080 Eagle OC 12g LHR"),

			new GigabyteVisionIdentifier(Nvidia.RTX3080_LHR,    GigabyteVisionIds.RTX3080_GAMING_OC,			0x62, "GIGABYTE 3080 Gaming OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080_LHR,    GigabyteVisionIds.RTX3080_GAMING_OC,			0x63, "GIGABYTE 3080 Vision OC LHR"),

			new GigabyteVisionIdentifier(Nvidia.RTX3080_LHR,    GigabyteVisionIds.RTX3080_VISION_OC,			0x63, "GIGABYTE 3080 Vision OC LHR"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080_LHR,    GigabyteVisionIds.RTX3080_EAGLE_OC,				0x63, "GIGABYTE 3080 Eagle OC LHR"),

			new GigabyteVisionIdentifier(Nvidia.RTX3080TI,      GigabyteVisionIds.RTX3080TI_VISION_OC,			0x63, "GIGABYTE 3080Ti Vision OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080TI,      GigabyteVisionIds.RTX3080TI_GAMING_OC,			0x62, "GIGABYTE 3080Ti Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080TI,      GigabyteVisionIds.RTX3080TI_EAGLE,				0x63, "GIGABYTE 3080Ti Eagle"),
			new GigabyteVisionIdentifier(Nvidia.RTX3080TI,      GigabyteVisionIds.RTX3080TI_EAGLE_OC,			0x63, "GIGABYTE 3080Ti Eagle OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX3090,        GigabyteVisionIds.RTX3090_VISION_OC_24G,		0x63, "GIGABYTE 3090 Vision OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX3090,        GigabyteVisionIds.RTX3090_GAMING_OC_24GB,		0x62, "GIGABYTE 3090 Gaming OC 24G"),

			new GigabyteVisionIdentifier(Nvidia.RTX4060,        GigabyteVisionIds.RTX4060_AERO_OC,              0x55, "Gigabyte 4060 Aero OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4060,        GigabyteVisionIds.RTX4060_GAMING_OC,			0x55, "Gigabyte 4060 Gaming OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX4060TI,		GigabyteVisionIds.RTX4060TI_GAMING_OC,			0x71, "GIGABYTE 4060Ti Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4060TI,		GigabyteVisionIds.RTX4060TI_GAMING_OC_2,		0x71, "GIGABYTE 4060Ti Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4060TI,		GigabyteVisionIds.RTX4060TI_AERO,				0x71, "GIGABYTE 4060Ti Aero"),

			new GigabyteVisionIdentifier(Nvidia.RTX4060TI_OC,	GigabyteVisionIds.RTX4060TI_GAMING_OC_2,		0x71, "GIGABYTE 4060Ti Gaming OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4060TI_OC,	GigabyteVisionIds.RTX4060TI_AERO_OC,			0x71, "GIGABYTE 4060Ti Aero OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX4070,		GigabyteVisionIds.RTX4070_AERO,					0x71, "GIGABYTE 4070 Aero"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070,		GigabyteVisionIds.RTX4070_AERO_OC,				0x71, "GIGABYTE 4070 Aero OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070,		GigabyteVisionIds.RTX4070_EAGLE_OC,				0x71, "GIGABYTE 4070 Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070, 		GigabyteVisionIds.RTX4070_WINDFORCE_OC,			0x71, "GIGABYTE 4070 Windforce OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX4070S,		GigabyteVisionIds.RTX4070S_AERO,				0x71, "GIGABYTE 4070 Super Aero"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070S,		GigabyteVisionIds.RTX4070S_EAGLE_OC,			0x71, "GIGABYTE 4070 Super Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070S,		GigabyteVisionIds.RTX4070S_EAGLE_OC_ICE,		0x71, "GIGABYTE 4070 Super Eagle OC ICE"),

			new GigabyteVisionIdentifier(Nvidia.RTX4070TI,		GigabyteVisionIds.RTX4070TI_EAGLE,				0x71, "GIGABYTE 4070Ti Eagle"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI,      GigabyteVisionIds.RTX4070TI_EAGLE_12G,			0x71, "GIGABYTE 4070Ti Eagle"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI,      GigabyteVisionIds.RTX4070TI_EAGLE_OC_12G,		0x71, "GIGABYTE 4070Ti Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI,      GigabyteVisionIds.RTX4070TI_MASTER_12G,			0x71, "GIGABYTE 4070Ti Master 12G"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI,		GigabyteVisionIds.RTX4070TI_AERO,				0x71, "GIGABYTE 4070Ti Aero"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI,		GigabyteVisionIds.RTX4070TI_AERO_OC,			0x71, "GIGABYTE 4070Ti Aero OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX4070TI_S,	GigabyteVisionIds.RTX4070TI_SUPER_AERO_OC,		0x71, "GIGABYTE 4070Ti Super Aero OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI_S,	GigabyteVisionIds.RTX4070TI_S_EAGLE_OC,			0x71, "Gigabyte 4070Ti Super Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4070TI_S,	GigabyteVisionIds.RTX4070TI_S_EAGLE_OC_ICE,		0x71, "Gigabyte 4070Ti Super Eagle OC ICE"),

			new GigabyteVisionIdentifier(Nvidia.RTX4080,        GigabyteVisionIds.RTX4080_EAGLE_16GD,			0x71, "GIGABYTE 4080 Eagle"),
			new GigabyteVisionIdentifier(Nvidia.RTX4080,        GigabyteVisionIds.RTX4080_EAGLE_OC_16GD,		0x71, "GIGABYTE 4080 Eagle OC"),
			new GigabyteVisionIdentifier(Nvidia.RTX4080,        GigabyteVisionIds.RTX4080_AERO_OC_16G,			0x71, "GIGABYTE 4080 Aero OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX4080_S,      GigabyteVisionIds.RTX4080_S_AERO_OC_16G,		0x72, "GIGABYTE 4080 Super Aero OC"),

			new GigabyteVisionIdentifier(Nvidia.RTX4090,		GigabyteVisionIds.RTX4090_AERO_OC,				0x71, "GIGABYTE 4090 Aero OC"),
		];
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/gigabyte/gpus/gpu.png";
}