// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "EVGA Ampere GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/evga"; }
export function Type() { return "SMBUS"; }
export function Size() { return [5, 2]; }
export function DefaultPosition(){return [192, 127];}
export function DefaultScale(){return 12.5;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
ARGBLedCount:readonly
DisableMainBar:readonly
DisableSideLogo:readonly
DisableBackLogo:readonly
DisableARGBHeader:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"ARGBLedCount", "group":"lighting", "label":"ARGB Header LED Count", description: "Adjust the LED count to avoid inconsistent/issues with lighting Sets the LED count to the ARGB Header.", "min":"0", "max":"60", "type":"number", "default":"60"},
		{"property":"DisableMainBar", "group":"settings", "label":"Disable Main Bar Zone", description: "Disables this Zone, this will remove it from the Layouts and will prevent Signal from controlling it.", "type":"boolean", "default":"0"},
		{"property":"DisableSideLogo", "group":"settings", "label":"Disable Side Logo Zone", description: "Disables this Zone, this will remove it from the Layouts and will prevent Signal from controlling it.", "type":"boolean", "default":"0"},
		{"property":"DisableBackLogo", "group":"settings", "label":"Disable Back Logo Zone", description: "Disables this Zone, this will remove it from the Layouts and will prevent Signal from controlling it.", "type":"boolean", "default":"0"},
		{"property":"DisableARGBHeader", "group":"settings", "label":"Disable ARGB Header Zone", description: "Disables this Zone, this will remove it from the Layouts and will prevent Signal from controlling it.", "type":"boolean", "default":"0"},
	];
}

let vLedNames = [];
let vLedPositions = [];

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	  if (!bus.IsNvidiaBus()) {
		return [];
	}

	for(const GPU of new EVGAAmpereGPUList().devices){
		if(GPU.CheckForIdMatch(bus)){
			// No Quick Write test on Nvidia

			// This read fails after waking the system from sleep until the GPU gets written to atleast once.
			//if(bus.ReadByteWithoutRegister(GPU.Address) > 0){

			FoundAddresses.push(GPU.Address);
			break;


			//}else{
			//	bus.log(`[${GPU.Name}] Failed Read Byte Test on Address [${GPU.Address}]`);
			//}
		}
	}

	return FoundAddresses;
}

function SetGPUNameFromBusIds(GPUList){
	for(const GPU of GPUList){
		if(GPU.CheckForIdMatch(bus)){
			device.setName(GPU.Name);
			break;
		}
	}
}

export function onARGBLedCountChanged(){
	EVGAAmpere.SetARGBLedCount(ARGBLedCount);
}
let HardwareModePoll;

export function Initialize() {
	SetGPUNameFromBusIds(new EVGAAmpereGPUList().devices);

	EVGAAmpere.FetchFirmwareVersion();
	EVGAAmpere.SetSoftwareControl(true);
	EVGAAmpere.ReadCurrentModeData(true);
	RebuildLedArrays();
	HandleZoneDisables();

	EVGAAmpere.SetARGBLedCount(ARGBLedCount);

	HardwareModePoll = new PolledFunction(CheckHardwareModeStatus, 5000);
}

export function Render() {
	sendColors();

	HardwareModePoll.Poll();

	// Mimic old Refresh Speed. Noticing slight color blending going from Blue to Red where a Purple color gets flashed
	device.pause(10);

	//device.log(`Total Packets [${sentPackets + savedPackets}]. Checking RGB values saved us sending [${Math.floor(savedPackets/(savedPackets+sentPackets) * 100)}]% of them`)
	//device.log(`Saved: [${savedPackets}] Sent: [${sentPackets}]`);
}


export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

class PolledFunction{
	constructor(callback, interval){
		this.callback = callback;
		this.interval = interval;
		this.lastPollTime = Date.now();
	}
	Poll(){
		if (Date.now() - this.lastPollTime < this.interval) {
			return;
		}

		this.callback();

		this.lastPollTime = Date.now();
	}
}

function CheckHardwareModeStatus(){
	EVGAAmpere.ReadCurrentModeData();

	let InvalidMode = false;

	for(const ZoneId in EVGAAmpere.Config.Zones){
		const Zone = EVGAAmpere.Config.Zones[ZoneId];

		if(Zone.ledCount > 0 && Zone.mode !== 1 && !Zone.disabled){
			device.log(`Setting Zone: [${Zone.name}] back to Static Mode! Was in mode: [${Zone.mode}]`);
			InvalidMode = true;
			EVGAAmpere.SetZoneMode(ZoneId, 1);
		}
	}

	if(InvalidMode){
		EVGAAmpere.SetSoftwareControl(true);
	}
}

export function onDisableMainBarChanged(){
	HandleZoneDisables();
}
export function onDisableSideLogoChanged(){
	HandleZoneDisables();
}
export function onDisableBackLogoChanged(){
	HandleZoneDisables();
}
export function onDisableARGBHeaderChanged(){
	HandleZoneDisables();
}


function CompareArrays(array1, array2){
	return array1.length === array2.length &&
	array1.every(function(value, index) { return value === array2[index];});
}

function HandleZoneDisables(){
	EVGAAmpere.Config.Zones.MainBar.disabled = DisableMainBar;
	EVGAAmpere.Config.Zones.SideLogo.disabled = DisableSideLogo;
	EVGAAmpere.Config.Zones.BackLogo.disabled = DisableBackLogo;
	EVGAAmpere.Config.Zones.ARGBHeader.disabled = DisableARGBHeader;
	RebuildLedArrays();
}

function sendColors(overrideColor){

	for(const ZoneId in EVGAAmpere.Config.Zones){
		const Zone = EVGAAmpere.Config.Zones[ZoneId];

		if(Zone.ledCount === 0 || Zone.disabled){
			continue;
		}

		let Color;

		if(overrideColor){
			Color = hexToRgb(overrideColor);
		}else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(...Zone.position);
		}

		if(!CompareArrays(Color, Zone.oldColor)){
			EVGAAmpere.WriteRGB(Zone, Color);
		}

		Zone.oldColor = Color;
	}
}

function RebuildLedArrays(){
	vLedNames = [];
	vLedPositions = [];

	for(const ZoneId in EVGAAmpere.Config.Zones){
		const Zone = EVGAAmpere.Config.Zones[ZoneId];

		if(Zone.disabled){
			continue;
		}

		if(Zone.ledCount > 0){
			vLedNames.push(Zone.name);
			vLedPositions.push(Zone.position);
		}
	}

	device.setControllableLeds(vLedNames, vLedPositions);
}


function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}


class EVGAAmpereLedZone{
	constructor(offset, name, position, mode = -1, ledCount = -1){
		this.offset = offset;
		this.name = name;
		/** @type {LedPosition} */
		this.position = position;
		this.mode = mode;
		this.ledCount = ledCount;
		this.disabled = false;
		this.oldColor = [];
	}
	static GetValue(){
		return 5134;
	}
}


class EVGAAmpereProtocol{
	constructor(){
		this.Registers = {
			Firmware: 0xB1,
			CurrentMode: 0xC0,
			StaticColor: 0xC1
		};
		this.Config = {
			FirmwareVersion: "UNKNOWN",
			ARGBLedCount: 0,
			Zones: {
				MainBar: new EVGAAmpereLedZone(0, "Main Bar", [2, 1]),
				SideLogo: new EVGAAmpereLedZone(1, "Side Logo", [4, 1]),
				BackLogo: new EVGAAmpereLedZone(2, "Back Logo", [3, 1]),
				ARGBHeader: new EVGAAmpereLedZone(3, "ARGB Header", [3, 1]),
			}
		};
	};
	/**
	 * @returns string
	 */
	FetchFirmwareVersion(){
		const [ReturnCode, Data] = bus.ReadBlockBytes(this.Registers.Firmware, 6);

		if(ReturnCode < 0){
			device.log(`Failed to read Firmware version. Error Code: [${ReturnCode}]`);

			return "UNKNOWN";
		}

		const Firmware = `${Data[3]}.${Data[4]}.${Data[5]}`;
		this.Config.FirmwareVersion = Firmware;

		device.log(`Firmware Version: [${this.Config.FirmwareVersion}]`, {toFile: true});

		return Firmware;
	}

	ReadCurrentModeData(logData = false){
		const [ReturnCode, Data] = bus.ReadBlockBytes(this.Registers.CurrentMode, 10);

		if(ReturnCode < 0){
			device.log(`Failed to read Current Modes. Error Code: [${ReturnCode}]`);

			return;
		}

		this.Config.Zones.MainBar.mode = Data[1];
		this.Config.Zones.SideLogo.mode = Data[2];
		this.Config.Zones.BackLogo.mode = Data[3];
		this.Config.Zones.ARGBHeader.mode = Data[4];
		this.Config.Zones.MainBar.ledCount = Data[5];
		this.Config.Zones.SideLogo.ledCount = Data[6];
		this.Config.Zones.BackLogo.ledCount = Data[7];
		this.Config.Zones.ARGBHeader.ledCount = Data[8];
		this.Config.ARGBLedCount = Data[8];

		if(logData){
			device.log(`Current Modes:\n Zone 1 Mode: [${this.Config.Zones.MainBar.mode}],\n Zone 2 Mode: [${this.Config.Zones.SideLogo.mode}],\n Zone 3 Mode: [${this.Config.Zones.BackLogo.mode}],\n Zone 4 Mode: [${this.Config.Zones.ARGBHeader.mode}]\n ARGB Led Count: [${this.Config.ARGBLedCount}]`, {toFile: true});
		}
	}
	SetARGBLedCount(Count){
		device.log(`Setting ARGB Led Count to: [${Count}]`);

		const packet = [
			0x09,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			Count,
			0x00,
		];

		const iRet= bus.WriteBlock(this.Registers.CurrentMode, 10, packet);

		if(iRet < 0){
			device.log(`Failed to write Current Modes. Error Code: [${iRet}]`);
		}

		// Read current modes again to confirm the change
		this.ReadCurrentModeData();
	}
	SetZoneMode(ZoneId, Mode){
		if(!this.Config.Zones.hasOwnProperty(ZoneId)){
			device.log(`SetZoneMode(): Zone: [${ZoneId}] does not exist!`);
		}
		const ZoneObject = this.Config.Zones[ZoneId];

		device.log(`Setting Zone: [${ZoneId}] to mode: [${Mode}]`);

		const packet = [
			0x09,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0x00,
		];

		packet[ZoneObject.offset + 1] = Mode;

		const ReturnCode = bus.WriteBlock(this.Registers.CurrentMode, 10, packet);

		if(ReturnCode < 0){
			device.log(`Failed to write Current Modes. Error Code: [${ReturnCode}]`);
		}

		// Read current modes again to confirm the change
		this.ReadCurrentModeData();
	}

	SyncModesToHardware(){

		const packet = [
			0x09,
			this.Config.Zones.MainBar.mode,
			this.Config.Zones.SideLogo.mode,
			this.Config.Zones.BackLogo.mode,
			this.Config.Zones.ARGBHeader.mode
		];
		const ReturnCode = bus.WriteBlock(this.Registers.CurrentMode, 10, packet);

		if(ReturnCode < 0){
			device.log(`Failed to write Current Modes. Error Code: [${ReturnCode}]`);
		}
	}
	SetSoftwareControl(Enabled){
		if(Enabled){
			const packet = [0x04, 0xc6, 0xEB, 0xEA, 0x15];
			bus.WriteBlock(0xB2, 5, packet);

			//packet = [0x07, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00];
			//bus.WriteBlockBytes(0x52, 8, packet);
		}
	}
	WriteRGB(Zone, Color = []){
		const packet = [0x04, 0xff];
		packet.push(...Color);

		bus.WriteBlock(this.Registers.StaticColor + Zone.offset, 5, packet);
	}
};

const EVGAAmpere = new EVGAAmpereProtocol();

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

class EVGAAmpereDeviceIds{
	constructor(){
		this.RTX3060TI_FTW3_GAMING              = 0x3665;
		this.RTX3060TI_FTW3_ULTRA_GAMING        = 0x3667;
		this.RTX3060TI_FTW3_ULTRA_GAMING_LHR    = 0x4667;
		this.RTX3060TI_FTW3_ULTRA_GAMING_LHR_2  = 0x4567;
		this.RTX3070_FTW3_ULTRA_GAMING          = 0x3767;
		this.RTX3070_FTW3_ULTRA_LHR             = 0x4767;
		this.RTX3070_FTW3_ULTRA_LHR_2           = 0x4467; // UNTESTED
		this.RTX3070_XC3_BLACK                  = 0x3751;
		this.RTX3070_XC3_GAMING                 = 0x3753;
		this.RTX3070_XC3_GAMING_ULTRA           = 0x3755;
		this.RTX3070_XC3_ULTRA_LHR				= 0x4455;
		this.RTX3070_XC3_ULTRA_LHR_2            = 0x4755;
		this.RTX3070TI_FTW3_ULTRA_GAMING        = 0x3797;
		this.RTX3070TI_FTW3_ULTRA_GAMING_2      = 0x3497; // UNTESTED
		this.RTX3070TI_XC3_GAMING               = 0x3783;
		this.RTX3070TI_XC3_ULTRA_GAMING         = 0x3785;
		this.RTX3080_12G_FTW3_ULTRA             = 0x4877;
		this.RTX3080_12G_FTW3_ULTRA_HC          = 0x4879;
		this.RTX3080_12G_FTW3_ULTRA_HYBRID      = 0x4878;
		this.RTX3080_12G_XC3_ULTRA_HYBRID       = 0x4868;
		this.RTX3080_FTW3_GAMING                = 0x3895;
		this.RTX3080_FTW3_ULTRA_LHR      		= 0x4297;
		this.RTX3080_FTW3_ULTRA_GAMING          = 0x3897;
		this.RTX3080_FTW3_ULTRA_GAMING_LHR      = 0x4897;
		this.RTX3080_FTW3_ULTRA_HC              = 0x3899;
		this.RTX3080_FTW3_ULTRA_HC_LHR          = 0x4899;
		this.RTX3080_FTW3_ULTRA_HYBRID          = 0x3898;
		this.RTX3080_FTW3_ULTRA_HYBRID_LHR      = 0x4898;
		this.RTX3080_XC3_BLACK                  = 0x3881;
		this.RTX3080_XC3_BLACK_LHR              = 0x4881;
		this.RTX3080_XC3_GAMING                 = 0x3883;
		this.RTX3080_XC3_GAMING_LHR             = 0x4883;
		this.RTX3080_XC3_ULTRA                  = 0x3885;
		this.RTX3080_XC3_ULTRA_GAMING_LHR		= 0x4865;
		this.RTX3080_12G_XC3_ULTRA_HC		    = 0x4889;
		this.RTX3080_12G_XC3_ULTRA_HC_2		    = 0x4869;
		this.RTX3080_XC3_ULTRA_HC               = 0x3889;
		this.RTX3080_XC3_ULTRA_HYBRID           = 0x3888;
		this.RTX3080_XC3_ULTRA_HYBRID_LHR       = 0x4888;
		this.RTX3080_XC3_ULTRA_LHR              = 0x4885;
		this.RTX3080TI_FTW3_ULTRA               = 0x3967;
		this.RTX3080TI_FTW3_ULTRA_2             = 0x3367;
		this.RTX3080TI_FTW3_ULTRA_HYBRID        = 0x3968;
		this.RTX3080TI_FTW3_ULTRA_HYDROCOPPER   = 0x3969;
		this.RTX3080TI_XC3_GAMING               = 0x3953;
		this.RTX3080TI_XC3_GAMING_HC            = 0x3959;
		this.RTX3080TI_XC3_ULTRA_GAMING         = 0x3955;
		this.RTX3080TI_XC3_ULTRA_HYBRID         = 0x3958;
		this.RTX3090_FTW3_GAMING                = 0x3985;
		this.RTX3090_FTW3_ULTRA                 = 0x3987;
		this.RTX3090_FTW3_ULTRA_2               = 0x3387;
		this.RTX3090_FTW3_ULTRA_HC              = 0x3989;
		this.RTX3090_FTW3_ULTRA_HYBRID          = 0x3988;
		this.RTX3090_FTW3_ULTRA_HYBRID_V2       = 0x3983;
		this.RTX3090_FTW3_ULTRA_V2              = 0x3982;
		this.RTX3090_KINGPIN                    = 0x3998;
		this.RTX3090_KINGPIN_HC                 = 0x3999;
		this.RTX3090_XC3_BLACK                  = 0x3971;
		this.RTX3090_XC3_GAMING                 = 0x3973;
		this.RTX3090_XC3_ULTRA_GAMING           = 0x3975;
		this.RTX3090_XC3_ULTRA_HC               = 0x3979;
		this.RTX3090_XC3_ULTRA_HYBRID           = 0x3978;
		this.RTX3090TI_BLACK_GAMING             = 0x4981;
		this.RTX3090TI_FTW3_GAMING              = 0x4983;
		this.RTX3090TI_FTW3_HYBRID              = 0x4988;
		this.RTX3090TI_KINGPIN_HYBRID           = 0x4998;
		this.RTX3090TI_FTW3_ULTRA_GAMING        = 0x4985;


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
	CheckForIdMatch(bus){
		return this.Vendor === bus.Vendor() &&
		this.SubVendor === bus.SubVendor() &&
		this.Device === bus.Product() &&
		this.SubDevice === bus.SubDevice();
	}
}

class EVGAAmpereIdentifier extends GPUIdentifier{
	constructor(Device, SubDevice, Name, Model = ""){
		super(0x10DE, 0x3842, Device, SubDevice, 0x2D, Name, Model);
	}
}

export function BrandGPUList(){ return new EVGAAmpereGPUList().devices; }

class EVGAAmpereGPUList{
	constructor(){
		const Nvidia = new NvidiaGPUDeviceIds();

		const EVGAAmpereIds = new EVGAAmpereDeviceIds();
		this.devices = [
			new EVGAAmpereIdentifier(Nvidia.RTX3060TI,         EVGAAmpereIds.RTX3060TI_FTW3_ULTRA_GAMING,       "EVGA RTX 3060Ti FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3060TI_LHR,     EVGAAmpereIds.RTX3060TI_FTW3_ULTRA_GAMING_LHR,   "EVGA RTX 3060Ti FTW3 Ultra Gaming LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3060TI_LHR,     EVGAAmpereIds.RTX3060TI_FTW3_ULTRA_GAMING_LHR_2,	"EVGA RTX 3060Ti FTW3 Ultra Gaming LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3060TI_LHR,     EVGAAmpereIds.RTX3060TI_FTW3_ULTRA_GAMING,       "EVGA RTX 3060Ti FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3060TI,         EVGAAmpereIds.RTX3060TI_FTW3_GAMING,             "EVGA RTX 3060Ti FTW3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070,           EVGAAmpereIds.RTX3070_XC3_GAMING_ULTRA,          "EVGA RTX 3070 XC3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070,           EVGAAmpereIds.RTX3070_FTW3_ULTRA_GAMING,         "EVGA RTX 3070 FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070,           EVGAAmpereIds.RTX3070_XC3_BLACK,                 "EVGA RTX 3070 XC3 Black Edition"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070_LHR,       EVGAAmpereIds.RTX3070_XC3_ULTRA_LHR,             "EVGA RTX 3070 XC3 Ultra Gaming LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070,           EVGAAmpereIds.RTX3070_XC3_GAMING,                "EVGA RTX 3070 XC3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070_LHR,       EVGAAmpereIds.RTX3070_XC3_ULTRA_LHR_2,             "EVGA RTX 3070 XC3 Ultra LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070_LHR,       EVGAAmpereIds.RTX3070_FTW3_ULTRA_LHR_2,           "EVGA RTX 3070 FTW3 Ultra LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070_LHR,       EVGAAmpereIds.RTX3070_FTW3_ULTRA_LHR,            "EVGA RTX 3070 FTW3 Ultra LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070TI,         EVGAAmpereIds.RTX3070TI_XC3_GAMING,              "EVGA RTX 3070Ti XC3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070TI,         EVGAAmpereIds.RTX3070TI_XC3_ULTRA_GAMING,        "EVGA RTX 3070Ti XC3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070TI,         EVGAAmpereIds.RTX3070TI_FTW3_ULTRA_GAMING,       "EVGA RTX 3070Ti FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3070TI,         EVGAAmpereIds.RTX3070TI_FTW3_ULTRA_GAMING_2,     "EVGA RTX 3070Ti FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_XC3_BLACK,                 "EVGA RTX 3080 XC3 Black"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_XC3_BLACK_LHR,             "EVGA RTX 3080 XC3 Black LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_XC3_GAMING,                "EVGA RTX 3080 XC3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_XC3_GAMING_LHR,            "EVGA RTX 3080 XC3 Gaming LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_GA102,     EVGAAmpereIds.RTX3080_XC3_ULTRA_GAMING_LHR,      "EVGA RTX 3080 XC3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,		   EVGAAmpereIds.RTX3080_XC3_ULTRA_HYBRID,			"EVGA RTX 3080 XC3 Ultra Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_XC3_ULTRA_HYBRID_LHR,      "EVGA RTX 3080 XC3 Ultra Hybrid LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_XC3_ULTRA_HC,              "EVGA RTX 3080 XC3 Ultra HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_12G_XC3_ULTRA_HC,          "EVGA RTX 3080 XC3 Ultra HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_GA102,	   EVGAAmpereIds.RTX3080_12G_XC3_ULTRA_HC_2,		"EVGA RTX 3080 XC3 Ultra HydroCopper GA102"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_FTW3_ULTRA_LHR,		    "EVGA RTX 3080 FTW3 Ultra LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_FTW3_GAMING,               "EVGA RTX 3080 FTW3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_FTW3_ULTRA_HYBRID_LHR,     "EVGA RTX 3080 FTW3 Ultra Hybrid LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_FTW3_ULTRA_HC,             "EVGA RTX 3080 FTW3 Ultra HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_FTW3_ULTRA_HC_LHR,         "EVGA RTX 3080 FTW3 Ultra HydroCopper LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_XC3_ULTRA,                 "EVGA RTX 3080 XC3 Ultra"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_XC3_ULTRA_LHR,             "EVGA RTX 3080 XC3 Ultra LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_GA102,     EVGAAmpereIds.RTX3080_12G_XC3_ULTRA_HYBRID,     "EVGA RTX 3080 XC3 Ultra Hybrid 12g LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_FTW3_ULTRA_GAMING,         "EVGA RTX 3080 FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_LHR,       EVGAAmpereIds.RTX3080_FTW3_ULTRA_GAMING_LHR,     "EVGA RTX 3080 FTW3 Ultra LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080,           EVGAAmpereIds.RTX3080_FTW3_ULTRA_HYBRID,         "EVGA RTX 3080 FTW3 Ultra Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_GA102,     EVGAAmpereIds.RTX3080_12G_FTW3_ULTRA_HYBRID,     "EVGA RTX 3080 FTW3 Ultra Hybrid 12g LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_GA102,     EVGAAmpereIds.RTX3080_12G_FTW3_ULTRA_HC,         "EVGA RTX 3080 FTW3 Ultra HydroCopper 12g LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080_GA102,     EVGAAmpereIds.RTX3080_12G_FTW3_ULTRA,            "EVGA RTX 3080 FTW3 Ultra 12g LHR"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_XC3_ULTRA_HYBRID,        "EVGA RTX 3080Ti XC3 Ultra Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_FTW3_ULTRA_HYBRID,       "EVGA RTX 3080Ti XC3 Ultra Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_FTW3_ULTRA_HYDROCOPPER,  "EVGA RTX 3080Ti FTW3 Ultra HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_XC3_GAMING,              "EVGA RTX 3080Ti XC3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_XC3_ULTRA_GAMING,        "EVGA RTX 3080Ti XC3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_XC3_GAMING_HC,           "EVGA RTX 3080Ti XC3 Gaming HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_FTW3_ULTRA,              "EVGA RTX 3080Ti FTW3 Ultra"),
			new EVGAAmpereIdentifier(Nvidia.RTX3080TI,         EVGAAmpereIds.RTX3080TI_FTW3_ULTRA_2,            "EVGA RTX 3080Ti FTW3 Ultra"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_XC3_BLACK,                 "EVGA RTX 3090 XC3 Black"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_XC3_GAMING,                "EVGA RTX 3090 XC3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_GAMING,               "EVGA RTX 3090 FTW3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_XC3_ULTRA_HYBRID,          "EVGA RTX 3090 XC3 Ultra Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_XC3_ULTRA_HC,              "EVGA RTX 3090 XC3 Ultra HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_ULTRA,                "EVGA RTX 3090 FTW3 Ultra"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_ULTRA_2,              "EVGA RTX 3090 FTW3 Ultra"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_ULTRA_V2,             "EVGA RTX 3090 FTW3 Ultra v2"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_ULTRA_HC,             "EVGA RTX 3090 FTW3 Ultra HydroCopper"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_XC3_ULTRA_GAMING,          "EVGA RTX 3090 XC3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_ULTRA_HYBRID,         "EVGA RTX 3090 FTW3 Ultra Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_FTW3_ULTRA_HYBRID_V2,      "EVGA RTX 3090 FTW3 Ultra Hybrid V2"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090,           EVGAAmpereIds.RTX3090_KINGPIN,                   "EVGA RTX 3090 Kingpin"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090TI,         EVGAAmpereIds.RTX3090TI_FTW3_ULTRA_GAMING,       "EVGA RTX 3090Ti FTW3 Ultra Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090TI,         EVGAAmpereIds.RTX3090TI_BLACK_GAMING,            "EVGA RTX 3090TI Black Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090TI,         EVGAAmpereIds.RTX3090TI_FTW3_GAMING,             "EVGA RTX 3090TI FTW3 Gaming"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090TI,         EVGAAmpereIds.RTX3090TI_FTW3_HYBRID,             "EVGA RTX 3090TI FTW3 Hybrid"),
			new EVGAAmpereIdentifier(Nvidia.RTX3090TI,         EVGAAmpereIds.RTX3090TI_KINGPIN_HYBRID,          "EVGA RTX 3090TI KINGPIN Hybrid"),

		];
	}

}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/evga/gpus/gpu.png";
}