// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "ASUS Legacy GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/asus"; }
export function Type() { return "SMBUS"; }
export function Size() { return [5, 2]; }
export function DefaultPosition(){return [192, 127];}
export function DefaultScale(){return 12.5;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function ConflictingProcesses() { return ["LightingService.exe"]; }
export function DeviceType(){return "gpu";}
/* global
shutdownMode:readonly
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownMode", "group":"lighting", "label":"Shutdown Mode", description: "Sets whether the device should follow SignalRGB shutdown color, or go back to hardware lighting", "type":"combobox", "values":["SignalRGB", "Hardware"], "default":"Hardware"},
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
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

	for(const GPU of new ASUSLegacyGPUList().devices){
		if(CheckForIdMatch(bus, GPU)){
			// No Quick Write test on Nvidia
			if(CheckForASUSLegacyGPU(bus, GPU.Address)) {FoundAddresses.push(GPU.Address);}

			break;
		}
	}

	return FoundAddresses;
}

function CheckForASUSLegacyGPU(bus, address){
	const ASUSLegacyTestValue = 0x1589;
	const highByte = bus.ReadByte(address, 0x20);
	const lowByte = bus.ReadByte(address, 0x21);

	return (highByte << 8) + lowByte === ASUSLegacyTestValue;
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
	SetGPUNameFromBusIds(new ASUSLegacyGPUList().devices);
	ASUSLegacy.SetMode(ASUSLegacy.modes.static);

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
		if (shutdownMode === "SignalRGB") {
			sendColors(shutdownColor);
		} else {
			ASUSLegacy.SetMode(ASUSLegacy.modes.colorCycle);
		}
	}

}

function PollHardwareModes(){
	const PollInterval = 5000;

	if (Date.now() - PollHardwareModes.lastPollTime < PollInterval) {
		return;
	}

	const CurrentMode = ASUSLegacy.ReadCurrentMode();

	if(CurrentMode !== ASUSLegacy.modes.static){
		device.log(`Found Device in Invalid Mode! [${ASUSLegacy.GetModeNameFromId(CurrentMode)}]. Setting back to Static...`);
		ASUSLegacy.SetMode(ASUSLegacy.modes.static);
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
		ASUSLegacy.WriteRGB(Color);
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

class ASUSLegacyGPUProtocol{
	constructor(){
		this.registers = {
			red: 0x04,
			green: 0x05,
			blue: 0x06,
			mode: 0x07,
			sync: 0x0C,
			apply: 0x0E,
		};
		this.modes = {
			static: 0x01,
			breathing: 0x02,
			flash: 0x03,
			colorCycle: 0x04
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
			bus.WriteByte(this.registers.mode, mode);
			bus.WriteByte(this.registers.apply, 1);
		}
	}

	WriteRGB(RGBData){

		bus.WriteByte(this.registers.red, RGBData[0]);
		bus.WriteByte(this.registers.green, RGBData[1]);
		bus.WriteByte(this.registers.blue, RGBData[2]);

	}
}

const ASUSLegacy = new ASUSLegacyGPUProtocol();

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
		this.RTX2070S2		 = 0x1EC7;
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

class ASUSLegacyGPUDeviceIds{
	constructor(){
		this.GTX1050TI_STRIX_GAMING_OC                 = 0x85D1;
		this.GTX1050TI_STRIX_GAMING_OC_2			   = 0x864B;
		this.GTX1060_STRIX_GAMING_FE                   = 0x85A4;
		this.GTX1060_STRIX                             = 0x85AC;
		this.GTX1060_STRIX_GAMING                      = 0x854A;
		this.GTX1070_STRIX_GAMING                      = 0x8598;
		this.GTX1070_STRIX_OC                          = 0x8599;
		this.GTX1070TI_STRIX_GAMING                    = 0x861E;
		this.GTX1070TI_STRIX_GAMING_2				   = 0x861D;
		this.GTX1080_STRIX                             = 0x8592;
		this.GTX1080_STRIX_GAMING_OC                   = 0x8593;
		this.GTX1080_STRIX_GAMING                      = 0x85E8;
		this.GTX1080TI_POSEIDON						   = 0x85EC;
		this.ROG_STRIX_GTX1080_A8G_GAMING              = 0x85AA;
		this.ROG_STRIX_GTX1080_O8G_GAMING              = 0x85F9;
		this.ROG_STRIX_GTX1080TI_11G_GAMING            = 0x85F1;
		this.ROG_STRIX_GTX1080TI_GAMING                = 0x85EA;
		this.ROG_STRIX_GTX1080TI_GAMING_OC			   = 0x85EB;
		this.ROG_STRIX_GTX1080TI_11G_GAMING_OC         = 0x85E4;
		this.ROG_STRIX_GTX1660_SUPER_GAMING_OC		   = 0x8752;
		this.ROG_STRIX_GTX1660_SUPER_GAMING_ADVANCED   = 0x8753;
		this.ROG_GTX1660TI							   = 0x86A7;
		this.ROG_GTX1660TI_OC                          = 0x86A5;
		this.ROG_GTX1660TI_OC_2						   = 0x86A6;
		this.ROG_STRIX_GTX1650_SUPER_GAMING_ADVANCED   = 0x8750;
		this.ROG_STRIX_GTX1650_SUPER_GAMING_OC         = 0x8751;
		this.ROG_STRIX_GTX1650_SUPER_OC                = 0x874F;
		this.ROG_STRIX_RTX2060_GAMING                  = 0x86D1;
		this.ROG_STRIX_RTX2060_EVO_GAMING              = 0x86D2;
		this.ROG_STRIX_RTX2060_EVO_GAMING_2            = 0x86D3;
		this.ROG_STRIX_RTX2060_EVO_V2_GAMING           = 0x880B;
		this.ROG_STRIX_RTX2060_EVO_V2                  = 0x880c;
		this.ROG_STRIX_RTX2060_EVO_V2_GAMING_2         = 0x8776;
		this.ROG_STRIX_RTX2060_EVO_V2_GAMING_3         = 0x8775;
		this.ROG_STRIX_RTX2060_OC                      = 0x868E;
		this.ROG_STRIX_RTX2060_O6G_GAMING              = 0x868F;
		this.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING    = 0x8703;
		this.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_2  = 0x8702;
		this.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_OC = 0x8730;
		this.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_OC_2  = 0x87A0;
		this.ROG_STRIX_RTX2060_SUPER_O8G_GAMING        = 0x872F;
		this.ROG_STRIX_RTX2060_SUPER_O8G_GAMING_OC     = 0x86FB;
		this.ROG_STRIX_RTX2060_SUPER_O8G_GAMING_OC_2   = 0x879F;
		this.ROG_STRIX_RTX2060_SUPER_A8G_GAMING_OC     = 0x86FC;
		this.ROG_STRIX_RTX2060_SUPER_A8G_GAMING_OC_2   = 0x86FD;
		this.ROG_STRIX_RTX2070_A8G_GAMING              = 0x8671;
		this.ROG_STRIX_RTX2070_O8G_GAMING              = 0x8670;
		this.ROG_STRIX_RTX2070_O8G_GAMING_2            = 0x867E;
		this.ROG_STRIX_RTX2070_O8G                     = 0x8796;
		this.ROG_STRIX_RTX2070_SUPER_O8G_GAMING_OC     = 0x8729;
		this.ROG_STRIX_RTX2070_SUPER_A8G_GAMING        = 0x8728;
		this.ROG_STRIX_RTX2070_SUPER_A8G_GAMING_2      = 0x86FF;
		this.ROG_STRIX_RTX2070_SUPER_O8G_GAMING        = 0x8727;
		this.ROG_STRIX_RTX2070_SUPER_A08G_GAMING       = 0x8706;
		this.ROG_STRIX_RTX2070_SUPER_8G			       = 0x8701;
		this.ROG_STRIX_RTX2080_O8G_GAMING              = 0x865F;
		this.ROG_STRIX_RTX2080_A8G_GAMING              = 0x8660;
		this.ROG_STRIX_RTX2080_A8G_GAMING_2            = 0x8661;
		this.ROG_STRIX_RTX2080_SUPER_GAMING            = 0x8711;
		this.ROG_STRIX_RTX2080_SUPER_OC                = 0x8712;
		this.ROG_STRIX_RTX2080_SUPER_A8G_GAMING        = 0x8713;
		this.ROG_STRIX_RTX2080_SUPER_OC_WHITE          = 0x876B;
		this.ROG_STRIX_RTX2080TI_O11G_GAMING           = 0x866A;
		this.ROG_STRIX_RTX2080TI_011G                  = 0x8759;
		this.ROG_STRIX_RTX2080TI_011G_GAMING_OC_WHITE  = 0x875A;
		this.ROG_STRIX_RTX2080TI_O11G_GAMING_TU102     = 0x8687;
		this.ROG_STRIX_RTX2080TI_O11G_GAMING_OC        = 0x866B;
		this.ROG_STRIX_RTX2080TI_O11G_GAMING_ALT       = 0x866C;
		this.ROG_STRIX_RTX2080TI_O11G_BLACKOPS_4       = 0x8689;
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
}

class ASUSLegacyDeviceIdentifier extends GPUIdentifier{
	constructor(Device, SubDevice, Address, Name, Model = ""){
		super(0x10DE, 0x1043, Device, SubDevice, Address, Name, Model);
	}
}
export function BrandGPUList(){ return new ASUSLegacyGPUList().devices; }

class ASUSLegacyGPUList{
	constructor(){
		const Nvidia = new NvidiaGPUDeviceIds();
		const ASUSLegacyGPUIds = new ASUSLegacyGPUDeviceIds();

		this.devices = [
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1050TI,       	ASUSLegacyGPUIds.GTX1050TI_STRIX_GAMING_OC,         		0x29, "ASUS GTX 1050Ti Strix Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1050TI,       	ASUSLegacyGPUIds.GTX1050TI_STRIX_GAMING_OC_2,         		0x29, "ASUS GTX 1050Ti Strix Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1060,         	ASUSLegacyGPUIds.GTX1060_STRIX,                     		0x29, "ASUS GTX 1060 Strix"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1060,         	ASUSLegacyGPUIds.GTX1060_STRIX_GAMING_FE,           		0x29, "ASUS GTX 1060 Strix Gaming FE"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1060,         	ASUSLegacyGPUIds.GTX1060_STRIX_GAMING,              		0x29, "ASUS GTX 1060 Strix Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1070,         	ASUSLegacyGPUIds.GTX1070_STRIX_GAMING,              		0x29, "ASUS GTX 1070 Strix Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1070,         	ASUSLegacyGPUIds.GTX1070_STRIX_OC,                  		0x29, "ASUS GTX 1070 Strix OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1070TI,       	ASUSLegacyGPUIds.GTX1070TI_STRIX_GAMING,            		0x29, "ASUS GTX 1070Ti Strix Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1070TI,       	ASUSLegacyGPUIds.GTX1070TI_STRIX_GAMING_2,            		0x29, "ASUS GTX 1070Ti Strix Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080,         	ASUSLegacyGPUIds.GTX1080_STRIX,                     		0x29, "ASUS GTX 1080 Strix"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080,         	ASUSLegacyGPUIds.GTX1080_STRIX_GAMING_OC,           		0x29, "ASUS GTX 1080 Strix Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080,         	ASUSLegacyGPUIds.GTX1080_STRIX_GAMING,              		0x29, "ASUS GTX 1080 Strix Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080,         	ASUSLegacyGPUIds.ROG_STRIX_GTX1080_A8G_GAMING,      		0x29, "ASUS ROG Strix GTX 1080 A8G Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080,         	ASUSLegacyGPUIds.ROG_STRIX_GTX1080_O8G_GAMING,      		0x29, "ASUS ROG Strix GTX 1080 OC 11 Gbps"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080TI,       	ASUSLegacyGPUIds.ROG_STRIX_GTX1080TI_GAMING,        		0x29, "ASUS ROG Strix GTX 1080Ti Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080TI,       	ASUSLegacyGPUIds.ROG_STRIX_GTX1080TI_GAMING_OC,        		0x29, "ASUS ROG Strix GTX 1080Ti Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080TI,       	ASUSLegacyGPUIds.ROG_STRIX_GTX1080TI_11G_GAMING,    		0x29, "ASUS ROG Strix GTX 1080Ti Gaming 11G"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080TI,		ASUSLegacyGPUIds.ROG_STRIX_GTX1080TI_11G_GAMING_OC,			0x29, "ASUS ROG Strix GTX 1080Ti Gaming OC 11G"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1080TI,       	ASUSLegacyGPUIds.GTX1080TI_POSEIDON,						0x29, "ASUS 1080Ti POSEIDON"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1650S,        	ASUSLegacyGPUIds.ROG_STRIX_GTX1650_SUPER_OC,        		0x2A, "ASUS ROG Strix GTX 1650 Super OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1650S,        	ASUSLegacyGPUIds.ROG_STRIX_GTX1650_SUPER_GAMING_ADVANCED, 	0x2A, "ASUS ROG Strix GTX 1650 Super Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1650S,        	ASUSLegacyGPUIds.ROG_STRIX_GTX1650_SUPER_GAMING_OC, 		0x2A, "ASUS ROG Strix GTX 1650 Super Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1660S,        	ASUSLegacyGPUIds.ROG_STRIX_GTX1660_SUPER_GAMING_ADVANCED, 	0x2A, "ASUS ROG Strix GTX 1660 Super Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1660S,			ASUSLegacyGPUIds.ROG_STRIX_GTX1660_SUPER_GAMING_OC, 		0x2A, "ASUS ROG Strix GTX 1660 Super Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1660TI,       	ASUSLegacyGPUIds.ROG_GTX1660TI_OC,                  		0x2A, "ASUS ROG Strix GTX 1660TI OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1660TI,       	ASUSLegacyGPUIds.ROG_GTX1660TI_OC_2,                  		0x2A, "ASUS ROG Strix GTX 1660TI OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.GTX1660TI,		ASUSLegacyGPUIds.ROG_GTX1660TI,								0x2A, "ASUS ROG Strix GTX 1660Ti Strix Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_GAMING,          		0x2A, "ASUS ROG Strix RTX 2060 Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_O6G_GAMING,          	0x2A, "ASUS ROG Strix RTX 2060 Gaming 6gb"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_EVO_GAMING,      		0x2A, "ASUS ROG Strix RTX 2060 EVO Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_EVO_GAMING_2,      		0x2A, "ASUS ROG Strix RTX 2060 EVO Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING, 	0x2A, "ASUS ROG Strix RTX 2060 Super EVO Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_2, 	0x2A, "ASUS ROG Strix RTX 2060 Super EVO Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_OC,	0x2A, "ASUS ROG Strix RTX 2060 Super EVO Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,     	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_O8G_GAMING, 		0x2A, "ASUS ROG Strix RTX 2060 Super Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,     	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_O8G_GAMING_OC, 	0x2A, "ASUS ROG Strix RTX 2060 Super Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,     	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_O8G_GAMING_OC_2, 	0x2A, "ASUS ROG Strix RTX 2060 Super Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,     	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_GAMING_OC, 	0x2A, "ASUS ROG Strix RTX 2060 Super Gaming Advanced OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,     	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_GAMING_OC_2, 	0x2A, "ASUS 2060 Super ROG Strix Super Gaming Advanced OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,      ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_OC,	0x2A, "ASUS ROG Strix RTX 2060 Super EVO Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060S_OC,		ASUSLegacyGPUIds.ROG_STRIX_RTX2060_SUPER_A8G_EVO_GAMING_OC_2,	0x2A, "ASUS ROG Strix RTX 2060 Super EVO Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_OC,              		0x2A, "ASUS ROG Strix RTX 2060 OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070_OC,      	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_A8G_GAMING,      		0x2A, "ASUS ROG Strix RTX 2070 Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070_OC,      	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_O8G_GAMING,      		0x2A, "ASUS ROG Strix RTX 2070 Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070,      	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_O8G_GAMING_2,      		0x2A, "ASUS ROG Strix RTX 2070 Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070,         	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_O8G,             		0x2A, "ASUS ROG Strix RTX 2070 Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_SUPER_A08G_GAMING,  	    0x2A, "ASUS ROG Strix RTX 2070 Super Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_SUPER_A8G_GAMING,   	    0x2A, "ASUS ROG Strix RTX 2070 Super Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070S2,        ASUSLegacyGPUIds.ROG_STRIX_RTX2070_SUPER_A8G_GAMING_2,   	0x2A, "ASUS ROG Strix RTX 2070 Super Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_SUPER_O8G_GAMING_OC,	    0x2A, "ASUS ROG Strix RTX 2070 Super Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2070_SUPER_O8G_GAMING,   	    0x2A, "ASUS ROG Strix RTX 2070 Super Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2070S2,		ASUSLegacyGPUIds.ROG_STRIX_RTX2070_SUPER_8G,				0X2A, "ASUS ROG Strix RTX 2070 Super 8GB"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080_A,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_O8G_GAMING,      		0x2A, "ASUS ROG Strix RTX 2080 Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080_A,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_A8G_GAMING,      		0x2A, "ASUS ROG Strix RTX 2080 Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080_A,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_A8G_GAMING_2,      		0x2A, "ASUS ROG Strix RTX 2080 Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_O11G_GAMING,   		0x2A, "ASUS ROG Strix RTX 2080Ti Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_EVO_V2_GAMING,   		0x2A, "ASUS ROG Strix RTX 2060 Evo V2"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU104,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_EVO_V2_GAMING_2,   		0x2A, "ASUS ROG Strix RTX 2060 Evo V2"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU104,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_EVO_V2_GAMING_3,   		0x2A, "ASUS ROG Strix RTX 2060 Evo V2"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_O11G_GAMING_OC,   		0x2A, "ASUS ROG Strix RTX 2080Ti Gaming OC"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_O11G_BLACKOPS_4,  	 	0x2A, "ASUS ROG Strix RTX 2080Ti Call of Duty BO4"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2060_TU106,   	ASUSLegacyGPUIds.ROG_STRIX_RTX2060_EVO_V2,             	 	0x2A, "ASUS ROG Strix RTX 2060 Evo"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_SUPER_GAMING,       	 	0x2A, "ASUS ROG Strix RTX 2080 Super Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_SUPER_A8G_GAMING,   	 	0x2A, "ASUS ROG Strix RTX 2080 Super Gaming 8G"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_SUPER_OC,        		0x2A, "ASUS ROG Strix RTX 2080 Super Gaming Advanced"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080S,        	ASUSLegacyGPUIds.ROG_STRIX_RTX2080_SUPER_OC_WHITE,     	 	0x2A, "ASUS ROG Strix RTX 2080 Super Gaming OC White Edition"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_011G,          		0x2A, "ASUS ROG Strix RTX 2080Ti"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI,        ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_O11G_GAMING_ALT,       0x2A, "ASUS Rog Strix RTX 2080Ti Gaming"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI,       	ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_011G_GAMING_OC_WHITE,  0x2A, "ASUS ROG Strix RTX 2080Ti Gaming OC White Edition"),
			new ASUSLegacyDeviceIdentifier(Nvidia.RTX2080TI_TU102, 	ASUSLegacyGPUIds.ROG_STRIX_RTX2080TI_O11G_GAMING_TU102,     0x2A, "ASUS ROG Strix RTX 2080Ti Gaming (TU102)"),

		];
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/gpu.png";
}