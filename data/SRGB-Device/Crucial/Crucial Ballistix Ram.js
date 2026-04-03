// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "Crucial Ballistix Ram"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting"; }
export function Type() { return "SMBUS"; }
export function Size() { return [2, 8]; }
export function DefaultPosition(){return [150, 40];}
export function DefaultScale(){return 12.0;}
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
export function DeviceType(){return "ram";}
export function ConflictingProcesses() { return ["LightingService.exe", "LEDKeeper2.exe", "RGBFusion.exe", "ControlCenter.exe"]; }
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

const vLedNames = ["Led 8", "Led 7", "Led 6", "Led 5", "Led 4", "Led 3", "Led 2", "Led 1"];
const vLedPositions = [
	[0, 7], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0]
];

let Ballistix;

/** @param {FreeAddressBus} bus */
export function Scan(bus) {

	// Skip any non AMD / INTEL Busses
	if (!bus.IsSystemBus()) {
		return [];
	}

	// Interface here must be of a Free Address Type.
	// We can't set this in the global scope directly as bus doesn't exist in the global scope for this function.
	const CrucialInterface = new CrucialInterfaceFree(bus);
	Ballistix = new CrucialBallistix(CrucialInterface);

	const FoundAddresses = [];
	// Crucial Ballistix Ram like Aura/ENE ram needs to have its address remapped by the first program that touches it.
	// If we have a device on 0x27 then we need to attempt to remap them.
	const iRet = bus.WriteQuick(0x27);

	if (iRet === 0) {
		bus.log(`Address 0x27 is populated. Attempting to remap Ram addresses.`);
		Ballistix.CheckForFreeAddresses();
	}


	for (const address of Ballistix.potentialAddresses) {
		const iRet = bus.WriteQuick(address);

		if(iRet < 0){
			continue;
		}

		bus.log(`Address [${address}] has something on it, possible Crucial Ballistix RAM!`);

		const ValidRegisters = Ballistix.TestRegisterValues(address);

		if(!ValidRegisters){
			continue;
		}

		if(Ballistix.TestManufactureName(address)){
			FoundAddresses.push(address);
		}
	}

	return FoundAddresses;
}

export function Initialize() {
	// Interface here must be of a Fixed Type.
	// We can't set this in the global scope directly as bus doesn't exist when the scan function is called.
	const Interface = new CrucialInterfaceFixed(bus);
	Ballistix = new CrucialBallistix(Interface);

	Ballistix.SetDirectMode();

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


function sendColors(overrideColor){
	const RedColors = [];
	const GreenColors = [];
	const BlueColors = [];

	//Fetch Colors
	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++){
 		let Color;

		if(overrideColor){
			Color = hexToRgb(overrideColor);
		}else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(vLedPositions[iIdx][0], vLedPositions[iIdx][1]);
		}
		// Ballistix ram is warmer, so using kelvin vals for 12000K. // NOTE: Actually, 12000k values weren't enough, so
		// we reduced the red channel further to a max at 145.

		RedColors.push(Color[0] * .56); // (145 / 255)
		GreenColors.push(Color[1] * .82); // (209 / 255)
		BlueColors.push(Color[2]);
 	}

	 Ballistix.SendRGBData(RedColors, GreenColors, BlueColors);

}

class CrucialInterface{
	constructor(bus){
		this.bus = bus;
	}
	ReadRegister(){ this.bus.log("Unimplimented Virtual Function!"); }
	WriteRegister(){ this.bus.log("Unimplimented Virtual Function!"); }
	WriteBlock(){ this.bus.log("Unimplimented Virtual Function!"); }
}

class CrucialInterfaceFree extends CrucialInterface{
	constructor(bus){
		super(bus);
	}

	ReadRegister(address, register){
		this.bus.WriteWord(address, 0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));

		return this.bus.ReadByte(address, 0x81);
	}

	WriteRegister(address, register, value){
		this.bus.WriteWord(address, 0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));
		this.bus.WriteByte(address, 0x01, value);
	}
	WriteBlock(address, register, data){
		this.bus.WriteWord(address, 0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));
		this.bus.WriteBlock(address, 0x03, data.length, data);
	}
}

class CrucialInterfaceFixed extends CrucialInterface{
	constructor(bus){
		super(bus);
	}

	WriteBlock(register, data){
		this.bus.WriteWord(0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));
		this.bus.WriteBlock(0x03, data.length, data);
	}

	WriteRegister(register, value){
		this.bus.WriteWord(0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));
		this.bus.WriteByte(0x01, value);
	}
	ReadRegister(register){
		this.bus.WriteWord(0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));

		return this.bus.ReadByte(0x81);
	}
}

class CrucialBallistix{
	constructor(Interface){
		this.Interface = Interface;

		this.config = {
			RedChannelData: [],
			GreenChannelData: [],
			BlueChannelData: [],
		};

		this.potentialAddresses = [0x39, 0x3A, 0x3B, 0x3C, 0x20, 0x21, 0x22, 0x23];
		this.registers = {
			DeviceName: 0x1000,
			ManufactureName: 0x1025,
			Mode: 0x820F,
			apply: 0x82F0,
			RedColorChannel: 0x8300,
			GreenColorChannel: 0x8340,
			BlueColorChannel: 0x8380,
		};
		this.EffectModes = {
			static: 0xCF,
		};
	}
	Bus(){
		return this.Interface.bus;
	}

	IsFixedBus(){
		return this.Interface instanceof CrucialInterfaceFixed;
	}

	SetDirectMode(){
		this.Interface.WriteRegister(this.registers.Mode, this.EffectModes.static);
		this.Interface.WriteRegister(0x82EE, 0x00);
		this.Interface.WriteRegister(0x82EF, 0x10 /*fast?*/);
		this.Interface.WriteRegister(this.registers.apply, 0x84);
	}

	SendRGBData(RedData, GreenData, BlueData){
		bus.TransactionLock();
		this.Interface.WriteBlock(this.registers.RedColorChannel, RedData);
		this.Interface.WriteBlock(this.registers.GreenColorChannel, GreenData);
		this.Interface.WriteBlock(this.registers.BlueColorChannel, BlueData);
		bus.TransactionUnlock();

	}

	CheckForFreeAddresses() {

		if(this.IsFixedBus()){
			this.Bus().log("Bus Interface must be a \"Free\" Type to use this function! This can only be done inside of the Scan() export.");

			return;
		}

		for (let iChannelIdx = 0; iChannelIdx < 4; iChannelIdx++) {
			const iRet = this.Bus().WriteQuick(0x27);

			if (iRet < 0) {
				break;
			}

			let freeAddress = 0;

			// Find a free address to remap a stick to
			for (const address of this.potentialAddresses) {
				const iRet = this.Bus().WriteQuick(address);

				if (iRet < 0) {
					this.Bus().log(`Found Free Address on [${address}]`, {toFile : true});
					freeAddress = address;
					break;

				}
			}

			if(freeAddress === 0){
				this.Bus().log(`Didn't find a free address. Aborting any further remap attempts.`, {toFile : true});
				break;
			}

			const setSlotReg = 0x82EE;
			const SetAddressReg = 0x82EF;
			const busAddress = freeAddress << 1;

			this.Interface.WriteRegister(0x27, setSlotReg, iChannelIdx);
			this.Interface.WriteRegister(0x27, SetAddressReg, busAddress);
			this.Interface.WriteRegister(0x27, 0x82F0, 0xF0);

			this.Bus().log(`Remapping Address from [${busAddress}] to [${freeAddress}]`);
		}
	}
	TestRegisterValues(address) {
		// This can only be used while we have a free address bus.
		// if we do we can't directly call bus. We need to use this.Bus()
		if(this.IsFixedBus()){
			this.Bus().log("Bus Interface must be a \"Free\" Type to use this function! This can only be done inside of the Scan() export.", {toFile : true});

			return false;
		}

		for (let register = 0xA0; register < 0xB0; register++) {
			const expectedValue = register - 0xA0;
			const iRet = this.Bus().ReadByte(address, register);
			this.Bus().pause(30);

			if (iRet !== expectedValue) {
				this.Bus().log(`Address: [${address}], Register: [${register}], Expected [${expectedValue}] but instead got [${iRet}]`, {toFile : true});

				return false;
			}
		}

		return true;
	}
	TestManufactureName(address){
		// This can only be used while we have a free address bus.
		// if we do we can't directly call bus. We need to use this.Bus()
		if(this.IsFixedBus()){
			this.Bus().log("Bus Interface must be a \"Free\" Type to use this function! This can only be done inside of the Scan() export.", {toFile : true});

			return false;
		}

		const Characters = [];

		for (let iIdx = 0; iIdx < 21; iIdx++) {
			const iRet = this.Interface.ReadRegister(address, 0x1025 + iIdx);
			this.Bus().pause(30);

			if(iRet > 0){
				Characters.push(iRet);
			}
		}

		const ManufactureName = String.fromCharCode(...Characters);

		const ValidManufactureString = ManufactureName.includes("Micron");

		if(ValidManufactureString){
			this.Bus().log(`Address: [${address}], Found Manufacturer Name: [${ManufactureName}]`, {toFile : true});
		}else{
			this.Bus().log(`Invalid Manufacture Name on address: [${address}]. Wanted \"Micron\", but found [${ManufactureName}]`, {toFile : true});
		}

		return ValidManufactureString;
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	if(result === null){
		return [0, 0, 0];
	}

	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/crucial/ram/ballistix-rgb.png";
}