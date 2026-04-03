export function Name() { return "Gigabyte XTREME GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/gigabyte"; }
export function Type() { return "SMBUS"; }
export function Size() { return [14, 6]; }
export function DefaultPosition(){return [192, 127];}
export function DefaultScale(){return 12.5;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function ConflictingProcesses() { return ["RGBFusion.exe"]; }
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

let vLedNames = [];
/** @type {LedPosition[]} */
let vLedPositions = [];

/** @type {GigabyteXtremeProtocol} */
let GigabyteXtreme;

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	  if (!bus.IsNvidiaBus()) {
		return [];
	}

	for(const GPU of new GigabyteXtremeGPUList().devices) {
		if(CheckForIdMatch(bus, GPU)) {
			// No Quick Write test on Nvidia

			//if(GigabyteVisionGpuCheck(bus, GPU))
			//{
			bus.log(`Found Gigabyte Gen3 GPU! [${GPU.Name}]`);
			FoundAddresses.push(GPU.Address);
			//}

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

export function Initialize() {
	GigabyteXtreme = new GigabyteXtremeProtocol();
	GigabyteXtreme.initializeGPU();
	buildLEDArray();
	SetGPUNameFromBusIds(new GigabyteXtremeGPUList().devices);

}

export function Render() {
	WriteRGB();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		WriteRGB("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		WriteRGB(shutdownColor);
	}

}

function buildLEDArray() {
	vLedNames = [];
	vLedPositions = [];

	for(let iIdx = 0; iIdx < 5; iIdx++) {
		const Zone = GigabyteXtreme.LEDZones[iIdx];
		vLedNames.push(...Zone.Names);
		vLedPositions.push(...Zone.Positions);
	}

	device.setControllableLeds(vLedNames, vLedPositions);
}

function grabColors(Zone, overrideColor) {
	const RGBData = [];

	for(let ledIdx = 0; ledIdx < Zone.Positions.length; ledIdx++) {
		let Color;

		if(overrideColor) {
			Color = hexToRgb(overrideColor);
		} else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(Zone.Positions[ledIdx][0], Zone.Positions[ledIdx][1]);
		}

		RGBData[ledIdx * 3] = Color[0];
		RGBData[ledIdx * 3 + 1] = Color[1];
		RGBData[ledIdx * 3 + 2] = Color[2];
	}

	return RGBData;
}

function WriteRGB(overrideColor) {

	for(let iIdx = 0; iIdx < Object.keys(GigabyteXtreme.LEDZones).length; iIdx++) {

		const Zone = GigabyteXtreme.LEDZones[iIdx];
		const RGBData = grabColors(Zone, overrideColor);
		const packet = [0xE6, Zone.ZoneIdentifier, 0x01, 0x64, 0x02, 0x03, Zone.Positions.length];
		packet.push(...RGBData);
		device.log(packet);
		bus.WriteBlockWithoutRegister(32, packet);
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class GigabyteXtremeProtocol {
	constructor() {
		this.LEDZones =
        {
        	0 :
            {
            	Names : ["Left Fan Zone 1", "Left Fan Zone 2", "Left Fan Zone 3"],
            	Positions : [ [0, 2], [0, 1], [0, 0] ],
            	ZoneIdentifier : 0x02
            },
        	1 :
            {
            	Names : ["Front Fan Zone 1", "Front Fan Zone 2", "Front Fan Zone 3"],
            	Positions : [ [7, 4], [8, 4], [9, 4] ],
            	ZoneIdentifier : 0x03
            },
        	2 :
            {
            	Names : ["Right Fan Zone 1", "Right Fan Zone 2", "Right Fan Zone 3"],
            	Positions : [ [13, 0], [13, 1], [13, 2] ],
            	ZoneIdentifier : 0x04
            },
        	3 :
            {
            	Names : ["Side Zone 1", "Side Zone 2", "Size Zone 3"],
            	Positions : [ [13, 5], [11, 5], [10, 5] ],
            	ZoneIdentifier : 0x05
            },
        	4 :
            {
            	Names : ["Top Zone 1", "Top Zone 2", "Top Zone 3", "Top Zone 4", "Top Zone 5", "Top Zone 6"],
            	Positions : [ [7, 5], [8, 4], [9, 3], [10, 2], [11, 1], [11, 0] ],
            	ZoneIdentifier : 0x06
            }
        };
	}

	initializeGPU() {
		const packet = [0xD6];
		bus.WriteBlockWithoutRegister(32, packet);

		//const returnpacket = bus.ReadBlockWithoutRegister(4); //We aren't using this for anything but hey it's here for consistency.

		//return returnpacket;
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
		this.RTX4080		 = 0x2704;
		this.RTX4090		 = 0x2684;
	}
};

const Nvidia = new NvidiaGPUDeviceIds();

class GigabyteXtremeDeviceIds {
	constructor() {
		this.RTX3080AORUS_X_10GD	=  0x403D;
		this.RTX3080AORUS_X_10GD_2	=  0x403E;
		this.RTX3090AOURUS_X_24GD	=  0x4041;
		this.RTX3080TI_XTREME_12G	=  0x4080;
		this.RTX3080TI_MASTER		=  0x4081;

		//New for Patch
		this.RTX3080AORUS_MASTER_12G	  =  0x40A5;
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

class GigabyteXtremeIdentifier extends GPUIdentifier {
	constructor(device, SubDevice, Address, Name) {
		super(0x10DE, 0x1458, device, SubDevice, Address, Name, "");
	}
}
export function BrandGPUList(){ return new GigabyteXtremeGPUList().devices; }

class GigabyteXtremeGPUList {
	constructor() {
		const Nvidia = new NvidiaGPUDeviceIds();
		const GigabyteXtremeIds  = new GigabyteXtremeDeviceIds();

		this.devices = [
			new GigabyteXtremeIdentifier(Nvidia.RTX3080, 		GigabyteXtremeIds.RTX3080AORUS_X_10GD,		0x60, "GIGABYTE 3080 AORUS Master"),
			new GigabyteXtremeIdentifier(Nvidia.RTX3080, 		GigabyteXtremeIds.RTX3080AORUS_X_10GD_2,	0x60, "GIGABYTE 3080 AORUS Master"),

			new GigabyteXtremeIdentifier(Nvidia.RTX3080_LHR, 	GigabyteXtremeIds.RTX3080AORUS_X_10GD,		0x60, "GIGABYTE 3080 AORUS Master LHR"), //I think 0x61 is lcd. Users will complain if I'm wrong.
			new GigabyteXtremeIdentifier(Nvidia.RTX3080_LHR, 	GigabyteXtremeIds.RTX3080AORUS_X_10GD_2,	0x60, "GIGABYTE 3080 AORUS Master LHR"),

			new GigabyteXtremeIdentifier(Nvidia.RTX3080_GA102, GigabyteXtremeIds.RTX3080AORUS_MASTER_12G,	0x60, "GIGABYTE 3080 AORUS Master (GA102)"), //Confirmed :)

			new GigabyteXtremeIdentifier(Nvidia.RTX3080TI, 		GigabyteXtremeIds.RTX3080TI_XTREME_12G,		0x60, "GIGABYTE 3080Ti XTREME"),
			new GigabyteXtremeIdentifier(Nvidia.RTX3080TI, 		GigabyteXtremeIds.RTX3080TI_MASTER,			0x60, "GIGABYTE 3080Ti AORUS Master"),

			new GigabyteXtremeIdentifier(Nvidia.RTX3090, 		GigabyteXtremeIds.RTX3090AOURUS_X_24GD,		0x60, "GIGABYTE 3090 XTREME"),
		];
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/gigabyte/gpus/gpu.png";
}