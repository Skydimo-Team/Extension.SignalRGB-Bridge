// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "EVGA Pascal GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/evga"; }
export function Type() { return "SMBUS"; }
export function Size() { return [5, 2]; }
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "gpu"}
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

	for(const GPU of new EVGAPascalGPUList().devices){
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
	SetGPUNameFromBusIds(new EVGAPascalGPUList().devices);
	EVGAPascal.SetMode(EVGAPascal.modes.static);

}

export function Render() {
	sendColors();
	PollHardwareModes();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		EVGAPascal.SetMode(EVGAPascal.modes.rainbow);
	}

}

function PollHardwareModes(){
	const PollInterval = 5000;

	if (Date.now() - PollHardwareModes.lastPollTime < PollInterval) {
		return;
	}

	const CurrentMode = EVGAPascal.ReadCurrentMode();

	if(CurrentMode !== EVGAPascal.modes.static){
		device.log(`Found Device in Invalid Mode! [${EVGAPascal.GetModeNameFromId(CurrentMode)}]. Setting back to Static...`);
		EVGAPascal.SetMode(EVGAPascal.modes.static);
	}


	PollHardwareModes.lastPollTime = Date.now();
}

function CompareArrays(array1, array2){
	return array1.length === array2.length &&
	array1.every(function(value, index) { return value === array2[index];});
}

let OldRGB = [];

function sendColors(overrideColor){
	const iPxX = vLedPositions[0][0];
	const iPxY = vLedPositions[0][1];
	let Color;

	if(overrideColor){
		Color = hexToRgb(overrideColor);
	}else if(LightingMode === "Forced") {
		Color = hexToRgb(forcedColor);
	} else {
		Color = device.color(iPxX, iPxY);
	}

	if(!CompareArrays(Color, OldRGB)){
		EVGAPascal.WriteRGB(Color);
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

class EVGAPascalProtocol{
	constructor(){
		this.registers = {
			mode: 0x60,
			color1Red: 0x09,
			color1Green: 0x0A,
			color1Blue: 0x0B,
			color1Brightness: 0x6F,
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

const EVGAPascal = new EVGAPascalProtocol();

class NvidiaGPUDeviceIds {

	constructor(){
		this.GTX1050TI       = 0x1C82;
		this.GTX1060         = 0x1C03;
		this.GTX1070         = 0x1B81;
		this.GTX1070TI       = 0x1B82;
		this.GTX1080         = 0x1B80;
		this.GTX1080TI       = 0x1B06;
	}
};

class EVGAPascalDeviceIds{
	constructor(){
		this.GTX1070_FTW		= 0x6276;
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

class EVGAPascalIdentifier extends GPUIdentifier{
	constructor(Device, SubDevice, Name, Model = ""){
		super(0x10DE, 0x3842, Device, SubDevice, 0x49, Name, Model);
	}
}

export function BrandGPUList(){ return new EVGAPascalGPUList().devices; }

class EVGAPascalGPUList extends GPUList{
	constructor(){
		super();

		const Nvidia = new NvidiaGPUDeviceIds();
		const EVGAPascalIds = new EVGAPascalDeviceIds();
		this.devices = [
			new EVGAPascalIdentifier(Nvidia.GTX1070,	EVGAPascalIds.GTX1070_FTW,	"EVGA 1070 FTW"),
		];
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/evga/gpus/gpu.png";
}