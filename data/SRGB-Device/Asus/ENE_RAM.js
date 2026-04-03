// Modifing SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() {
	return "Aura Compatible RAM";
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Documentation() {
	return "troubleshooting";
}
export function Type() {
	return "SMBUS";
}
export function Size() {
	return [8, 2];
}
export function DefaultPosition() {
	return [150, 40];
}
export function DefaultScale() {
	return 12.0;
}
export function LedNames() {
	return vLedNames;
}
export function LedPositions() {
	return vLedPositions;
}
export function DeviceType() {
	return "ram";
}
export function ConflictingProcesses() {
	return [
		"LightingService.exe",
		"XPG-Prime.exe",
		"LEDKeeper2.exe",
		"RGBFusion.exe",
		"ControlCenter.exe",
	];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{
			property: "shutdownColor",
			group: "lighting",
			label: "Shutdown Color",
			description:
				"This color is applied to the device when the System, or SignalRGB is shutting down",
			min: "0",
			max: "360",
			type: "color",
			default: "#000000",
		},
		{
			property: "LightingMode",
			group: "lighting",
			label: "Lighting Mode",
			description:
				"Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color",
			type: "combobox",
			values: ["Canvas", "Forced"],
			default: "Canvas",
		},
		{
			property: "forcedColor",
			group: "lighting",
			label: "Forced Color",
			description:
				"The color used when 'Forced' Lighting Mode is enabled",
			min: "0",
			max: "360",
			type: "color",
			default: "#ff0000",
		},
	];
}

let vLedNames = [];
let vLedPositions = [];
let ENE;

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	// Skip any non AMD / INTEL Busses
	if (!bus.IsSystemBus()) {
		return [];
	}

	// Interface here must be of a Free Address Type.
	// We can't set this in the global scope directly as bus doesn't exist in the global scope for this function.
	const ENEInterface = new ENEInterfaceFree(bus);
	ENE = new ENERam(ENEInterface);

	const FoundAddresses = [];
	const startingAddresses = [0x77]; // 0x74 This is gone because it explodes on Gigglebyte boards.

	// Teamgroup Xtreem Ram like Aura/ENE ram needs to have its address remapped by the first program that touches it.
	// If we have a device on 0x77 then we need to attempt to remap them.
	bus.log(`Checking for starting addresses.`, { toFile: true });
	for (const address of startingAddresses) {
		ENE.CheckForFreeAddresses(address);
	}

	bus.log(`Checking for XTREEM RAM.`, { toFile: true });
	for (const address of ENE.potentialXTREEMAddresses) {
		const iRet = bus.WriteQuick(address);
		bus.pause(1);

		if (iRet !== 0) {
			continue;
		}

		bus.log(
			`Address [${address}] is populated. Checking for valid ENE registers.`,
			{ toFile: true }
		);

		if (!ENE.checkForValidENERegisters(address)) {
			bus.log(`Address [${address}] does not have valid ENE registers.`, {
				toFile: true,
			});
			continue;
		}

		bus.log(
			`Address [${address}] has valid ENE registers. Checking for XTREEM registers.`,
			{ toFile: true }
		);

		const ValidRegisters = ENE.TestXTREEMRegisterValues(address);

		if (!ValidRegisters) {
			continue;
		}

		bus.log(`Found T-Force Ram on Address: [${address}]`, { toFile: true });
		FoundAddresses.push(address);
	}

	bus.log(`Checking for Aura RAM.`, { toFile: true });
	for (const address of ENE.potentialAuraAddresses) {
		bus.log(`Testing address: [${address}]`, { toFile: true });

		const iRet = bus.WriteQuick(address);
		bus.pause(1);

		if (iRet !== 0) {
			continue;
		}

		bus.log(
			`Address [${address}] is populated. Checking for valid ENE registers.`,
			{ toFile: true }
		);

		if (!ENE.checkForValidENERegisters(address)) {
			bus.log(`Address [${address}] does not have valid ENE registers.`, {
				toFile: true,
			});
			continue;
		}

		bus.log(
			`Address [${address}] has valid ENE registers. Checking for device model.`,
			{ toFile: true }
		);

		if (ENE.TestDeviceModel(address)) {
			if (ENE.TestManufactureName(address)) {
				bus.log(`Found ENE Ram on Address: [${address}]`, {
					toFile: true,
				});
				FoundAddresses.push(address);
			} else {
				bus.log(`Found Ballistix Sticks on [${address}], ignoring.`, {
					toFile: true,
				});
			}
		}
	}

	return FoundAddresses;
}

export function Initialize() {
	// Interface here must be of a Fixed Type.
	// We can't set this in the global scope directly as bus doesn't exist when the scan function is called.
	const Interface = new ENEInterfaceFixed(bus);
	ENE = new ENERam(Interface);
	ENE.getDeviceInformation();
	ENE.config.XTREEM = ENE.TestFixedXTREEMRegisterValues();

	if (ENE.config.XTREEM === false) {
		device.log(`Device is not XTREEM RAM.`);
	}

	ENE.setLEDArrays();
	ENE.SetDirectMode();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

//TODO: find out if these take rgb data blocks like normal ENE Sticks.
function sendColors(overrideColor) {
	const RGBData = [];

	//Fetch Colors
	for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		let Color;

		if (overrideColor) {
			Color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(
				vLedPositions[iIdx][0],
				vLedPositions[iIdx][1]
			);
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = Color[0];
		RGBData[iLedIdx + 1] = Color[2];
		RGBData[iLedIdx + 2] = Color[1];
	}

	ENE.SendRGBData(RGBData);
}

class ENEInterface {
	constructor(bus) {
		this.bus = bus;
	}
	ReadRegister() {
		this.bus.log("Unimplimented Virtual Function!");
	}
	ReadWord() {
		this.bus.log("Unimplimented Virtual Function!");
	}
	ReadBlockByBytes() {
		this.bus.log("Unimplimented Virtual Function!");
	}
	WriteRegister() {
		this.bus.log("Unimplimented Virtual Function!");
	}
	WriteBlock() {
		this.bus.log("Unimplimented Virtual Function!");
	}
}

class ENEInterfaceFree extends ENEInterface {
	constructor(bus) {
		super(bus);
	}

	ReadRegister(address, register) {
		this.bus.WriteWord(
			address,
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		return this.bus.ReadByte(address, 0x81);
	}
	ReadWord(address, register) {
		this.bus.WriteWord(
			address,
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		let returnValue = (this.bus.ReadByte(address, 0x81) << 8) & 0xff00;
		this.bus.pause(30);
		returnValue |= this.bus.ReadByte(address, 0x81) & 0xff;

		return returnValue;
	}

	ReadBlockByBytes(address, register, length) {
		this.bus.WriteWord(
			address,
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		const returnedBytes = [];

		for (let bytesToRead = 0; bytesToRead < length; bytesToRead++) {
			returnedBytes[bytesToRead] = this.bus.ReadByte(address, 0x81);
			this.bus.pause(30);
		}

		return returnedBytes;
	}

	WriteRegister(address, register, value) {
		this.bus.WriteWord(
			address,
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		this.bus.WriteByte(address, 0x01, value);
	}
	WriteBlock(address, register, data) {
		this.bus.WriteWord(
			address,
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		this.bus.WriteBlock(address, 0x03, data.length, data);
	}
}

class ENEInterfaceFixed extends ENEInterface {
	constructor(bus) {
		super(bus);
	}

	WriteBlock(register, data) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		this.bus.WriteBlock(0x03, data.length, data);
	}

	WriteWord(register) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		this.bus.WriteByte(0x01, 0x00);
		this.bus.WriteByte(0x01, 0x01);
	}

	WriteRegisterWithoutArgument(register) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
	}

	WriteRegister(register, value) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		this.bus.WriteByte(0x01, value);
	}

	ReadRegister(register) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		return this.bus.ReadByte(0x81);
	}

	ReadWord(register) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		let returnValue = (this.bus.ReadByte(0x81) << 8) & 0xff00;
		this.bus.pause(30);
		returnValue |= this.bus.ReadByte(0x81) & 0xff;

		return returnValue;
	}

	ReadBytes(length) {
		for (let bytesToRead = 0; bytesToRead < length; bytesToRead++) {
			this.bus.ReadByte(0x81);
			this.bus.pause(30);
		}
	}

	ReadBlockByBytes(register, length) {
		this.bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		const returnedBytes = [];

		for (let bytesToRead = 0; bytesToRead < length; bytesToRead++) {
			returnedBytes[bytesToRead] = this.bus.ReadByte(0x81);
			this.bus.pause(30);
		}

		return returnedBytes;
	}
}

class ENERam {
	constructor(Interface) {
		this.Interface = Interface;

		this.config = {
			PreviousRGBData: [],
			deviceProtocolVersion: "",
			deviceName: "",
			XTREEM: false,
			deviceLEDCount: 0,
		};
		this.potentialAuraAddresses = [
			0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x4f, 0x66, 0x67,
			0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76,
		];
		this.potentialXTREEMAddresses = [
			0x39, 0x3a, 0x67, 0x70, 0x71, 0x72, 0x73, 0x75, 0x76,
		];

		this.commands = {
			DeviceName: 0x1000,
			ConfigTable: 0x1c00,
			ManufacturerName: 0x1030,
			DirectMode: 0x8020, //Is this interchageable for ENE RAM?
			SetChannelIdx: 0x80f8,
			SetStickAddress: 0x80f9, //0x80 based. Let's see if they play ball.
			ColorCtlV1: 0x8000,
			ColorCtlV2: 0x8100,
			effectCtlV2: 0x8160,
			ColorApply: 0x802f,
		};

		this.XTREEMcommands = {
			DirectMode: 0xe020, //Is this interchageable for ENE RAM?
			ColorApply: 0xe02f,
			SetChannelIdx: 0xe0f8,
			SetStickAddress: 0xe0f9,
			XTREEMColorsStart: 0xe300,
		};

		this.deviceNameDict =
			//Used for Aura Compatible ENE Devices. XTREEM is special.
			{
				"LED-0116": "V1",
				"AUMA0-E8K4-0101": "V1",
				"AUDA0-E6K5-0101": "V2",
				"AUMA0-E6K5-0104": "V2",
				"AUMA0-E6K5-0105": "V2",
				"AUMA0-E6K5-0106": "V2",
				"AUMA0-E6K5-0107": "GPU V2",
				"DIMM_LED-0102": "V1",
				"DIMM_LED-0103": "V1",
			};
	}
	Bus() {
		return this.Interface.bus;
	}

	IsFixedBus() {
		return this.Interface instanceof ENEInterfaceFixed;
	}

	SetDirectMode() {
		if (this.config.XTREEM) {
			this.Interface.WriteWord(this.XTREEMcommands.DirectMode);
		} else {
			this.Interface.WriteRegister(this.commands.DirectMode, 0x01);
		}
	}

	SendRGBData(RGBData) {
		if (this.config.XTREEM) {
			let bytesWritten = 0;

			while (RGBData.length > 0) {
				const DataLength = Math.min(30, RGBData.length);

				const packet = RGBData.splice(0, DataLength);
				this.Interface.WriteBlock(
					this.XTREEMcommands.XTREEMColorsStart + bytesWritten,
					packet
				);
				bytesWritten += DataLength;
			}

			this.Interface.WriteRegister(this.XTREEMcommands.ColorApply, 0xa0);
		} else {
			if (this.config.deviceProtocolVersion === "V1") {
				let bytesWritten = 0;

				while (RGBData.length > 0) {
					const DataLength = Math.min(15, RGBData.length);

					const packet = RGBData.splice(0, DataLength);
					this.Interface.WriteBlock(
						this.commands.ColorCtlV1 + bytesWritten,
						packet
					);
					bytesWritten += DataLength;
				}

				this.Interface.WriteRegister(this.commands.ColorApply, 0x01);
			} else if (this.config.deviceProtocolVersion === "V2") {
				let bytesWritten = 0;

				while (RGBData.length > 0) {
					const DataLength = Math.min(15, RGBData.length);

					const packet = RGBData.splice(0, DataLength);
					this.Interface.WriteBlock(
						this.commands.ColorCtlV2 + bytesWritten,
						packet
					);
					bytesWritten += DataLength;
				}

				this.Interface.WriteRegister(this.commands.ColorApply, 0x01);
			}
		}
	}

	getDeviceName(address) {
		//This fixes dealing with fixed vs free.
		const deviceName = [];

		for (let iIdx = 0; iIdx < 16; iIdx++) {
			const character = this.Interface.ReadRegister(
				address,
				this.commands.DeviceName + iIdx
			);

			if (character > 0) {
				deviceName.push(character);
			}
		}

		return String.fromCharCode(...deviceName);
	}

	getFixedDeviceName() {
		//This fixes dealing with fixed vs free.
		const deviceName = [];

		for (let iIdx = 0; iIdx < 16; iIdx++) {
			const character = this.Interface.ReadRegister(
				this.commands.DeviceName + iIdx
			);

			if (character > 0) {
				deviceName.push(character);
			}
		}

		return String.fromCharCode(...deviceName);
	}

	getDeviceInformation() {
		this.config.deviceName = this.getFixedDeviceName();
		this.config.deviceProtocolVersion =
			this.deviceNameDict[this.config.deviceName];

		let configTable = this.getDeviceConfigTable();
		device.log(configTable);

		this.config.deviceLEDCount = Math.max(
			configTable[0x02],
			configTable[0x03]
		);

		for (let attempts = 0; attempts < 20; attempts++) {
			if (
				this.config.deviceName in this.deviceNameDict &&
				this.config.deviceLEDCount < 15
			) {
				device.log(`Init hit on attempt: ${attempts}.`);
				break;
			} else {
				this.config.deviceName = this.getFixedDeviceName();
				this.config.deviceProtocolVersion =
					this.deviceNameDict[this.config.deviceName];

				configTable = this.getDeviceConfigTable();
				device.log(configTable);

				this.config.deviceLEDCount = Math.max(
					configTable[0x02],
					configTable[0x03]
				);
			}
		}

		device.log("Device Type: " + this.config.deviceName);
		device.log(
			"Device Protocol Version: " + this.config.deviceProtocolVersion
		);
		device.log("Device Onboard LED Count: " + this.config.deviceLEDCount);
	}

	getDeviceConfigTable() {
		const configTable = new Array(65);

		for (let iIdx = 0; iIdx < 64; iIdx++) {
			configTable[iIdx] = this.Interface.ReadRegister(
				this.commands.ConfigTable + iIdx
			);
			device.pause(10);
		}

		return configTable;
	}

	setLEDArrays() {
		vLedNames = [];
		vLedPositions = [];

		if (this.config.XTREEM) {
			vLedNames = [
				"LED 1",
				"LED 2",
				"LED 3",
				"LED 4",
				"LED 5",
				"LED 6",
				"LED 7",
				"LED 8",
				"LED 9",
				"LED 10",
				"LED 11",
				"LED 12",
				"LED 13",
				"LED 14",
				"LED 15",
			];
			vLedPositions = [
				[0, 0],
				[0, 1],
				[0, 2],
				[0, 3],
				[0, 4],
				[0, 5],
				[0, 6],
				[0, 7],
				[1, 6],
				[1, 5],
				[1, 4],
				[1, 3],
				[1, 2],
				[1, 1],
				[1, 0],
			];

			device.setControllableLeds(vLedNames, vLedPositions);
			device.setSize([2, 8]);
			device.setName("T-Force XTREEM RAM");
		} else {
			for (let i = 0; i < this.config.deviceLEDCount; i++) {
				vLedNames.push(`LED ${i + 1}`);
				vLedPositions.push([0, this.config.deviceLEDCount - 1 - i]);
			}

			device.setControllableLeds(vLedNames, vLedPositions);
			device.setSize([1, this.config.deviceLEDCount]);
		}
	}

	checkForValidENERegisters(address) {
		if (this.IsFixedBus()) {
			this.Bus().log(
				'Bus Interface must be a "Free" Type to use this function! This can only be done inside of the Scan() export.'
			);

			return;
		}

		// Standard ENE identification: registers 0xA0-0xAF should contain 0x00-0x0F (corroborated by OpenRGB)
		if (this.checkENERegisterPattern(address, 0xa0, 0)) {
			return true;
		}

		// Fallback for certain hardware variants (e.g. some TeamGroup sticks): registers 0x90-0x9F contain 0x10-0x1F
		return this.checkENERegisterPattern(address, 0x90, 0x10);
	}

	checkENERegisterPattern(address, registerBase, valueOffset) {
		const registerValues = [];

		for (let i = 0; i < 16; i++) {
			const registerValue = this.Bus().ReadByte(
				address,
				registerBase + i
			);
			registerValues.push(registerValue);
		}

		this.Bus().log(
			`Register Values (0x${registerBase.toString(16)}): [${registerValues.join(", ")}]`,
			{ toFile: true }
		);

		const checkRegister = (value, index) => value === index + valueOffset;
		const requiredChecks = 14;
		const passCount = registerValues.reduce(
			(acc, curr, index) => acc + checkRegister(curr, index),
			0
		);
		const passedChecks = passCount > requiredChecks;

		this.Bus().log(
			`Address: [${address}], Base: 0x${registerBase.toString(16)}, Found ${passCount} passes. Passed Checks: ${passedChecks}.`,
			{ toFile: true }
		);

		return passedChecks;
	}

	CheckForFreeAddresses(primaryAddress) {
		if (this.IsFixedBus()) {
			this.Bus().log(
				'Bus Interface must be a "Free" Type to use this function! This can only be done inside of the Scan() export.'
			);

			return;
		}

		for (let iChannelIdx = 0; iChannelIdx < 8; iChannelIdx++) {
			const iRet = this.Bus().WriteQuick(primaryAddress);
			this.Bus().pause(1);

			if (iRet < 0) {
				this.Bus().log(
					`Address [${primaryAddress}] is unpopulated. Avoiding Ram address remap.`,
					{ toFile: true }
				);
				break;
			}

			this.Bus().log(
				`Address [${primaryAddress}] is populated. Attempting to remap Ram addresses.`,
				{ toFile: true }
			);

			let freeAddress = 0;

			// Find a free address to remap a stick to
			const XTREEM = this.TestXTREEMRegisterValues(primaryAddress);

			if (XTREEM) {
				for (const address of this.potentialXTREEMAddresses) {
					const iRet = this.Bus().WriteQuick(address);

					if (iRet < 0) {
						this.Bus().log(
							`Remapping XTREEM RAM on address ${address}.`,
							{ toFile: true }
						);
						this.Bus().log(`Found Free Address on [${address}]`, {
							toFile: true,
						});
						freeAddress = address;
						break;
					}
				}

				if (freeAddress === 0) {
					this.Bus().log(
						`Didn't find a free address. Aborting any further remap attempts.`,
						{ toFile: true }
					);
					break;
				}

				const busAddress = freeAddress << 1;

				this.Interface.WriteRegister(
					primaryAddress,
					0xe0f8,
					iChannelIdx
				);
				this.Bus().pause(1);
				this.Interface.WriteRegister(
					primaryAddress,
					0xe0f9,
					busAddress
				);
				this.Bus().pause(1);

				this.Bus().log(
					`Remapping Address from [${busAddress}] to [${freeAddress}]`,
					{ toFile: true }
				);
			} else {
				for (const address of this.potentialAuraAddresses) {
					const iRet = this.Bus().WriteQuick(address);
					this.Bus().pause(1);

					if (iRet < 0) {
						this.Bus().log(`Found Free Address on [${address}]`, {
							toFile: true,
						});
						freeAddress = address;
						break;
					}
				}

				if (freeAddress === 0) {
					this.Bus().log(
						`Didn't find a free address. Aborting any further remap attempts.`,
						{ toFile: true }
					);
					break;
				}

				const busAddress = freeAddress << 1;

				this.Interface.WriteRegister(
					primaryAddress,
					0x80f8,
					iChannelIdx
				);
				this.Bus().pause(1);
				this.Interface.WriteRegister(
					primaryAddress,
					0x80f9,
					busAddress
				);
				this.Bus().pause(1);

				this.Bus().log(
					`Remapping Address from [${primaryAddress}] to [${freeAddress}]`,
					{ toFile: true }
				);
			}
		}
	}

	TestXTREEMRegisterValues(address) {
		// This can only be used while we have a free address bus.
		// if we do we can't directly call bus. We need to use this.Bus()
		if (this.IsFixedBus()) {
			this.Bus().log(
				'Bus Interface must be a "Free" Type to use this function! This can only be done inside of the Scan() export.'
			);

			return false;
		}

		const Value1 = this.Interface.ReadWord(address, 0xf01c);

		if (Value1 !== 0x0000) {
			this.Bus().log(
				`Check 1 Failed! Returned value: ${Value1}, Expected: 0x0000`,
				{ toFile: true }
			);

			return false;
		}

		const value2 = this.Interface.ReadWord(address, 0x4000);

		if (value2 !== 0x7742) {
			this.Bus().log(
				`Check 2 Failed! Returned value: ${value2}, Expected: 0x7742`,
				{ toFile: true }
			);

			return false;
		}

		for (let offset = 0x00; offset < 5; offset++) {
			const val = this.Bus().ReadByte(address, 0x9b + offset);
			this.Bus().pause(30);

			if (val !== 0x1b + offset) {
				this.Bus().log(
					`Check 3 Failed! Returned value: ${val}, Expected: ${0x1b + offset}`,
					{ toFile: true }
				);

				return false;
			}
		}

		const iRet = this.Bus().ReadByte(address, 0xa0);

		if (iRet !== 0x20) {
			this.Bus().log(
				`Check 4 Failed! Returned value: ${iRet}, Expected ${0x20}`,
				{ toFile: true }
			);

			return false;
		}

		return true;
	}

	TestFixedXTREEMRegisterValues() {
		const Value1 = this.Interface.ReadWord(0xf01c);

		if (Value1 !== 0x0000) {
			return false;
		}

		const value2 = this.Interface.ReadWord(0x4000);

		if (value2 !== 0x7742) {
			return false;
		}

		for (let offset = 0x00; offset < 5; offset++) {
			const val = bus.ReadByte(0x9b + offset);
			bus.pause(30);

			if (val !== 0x1b + offset) {
				return false;
			}
		}

		const iRet = bus.ReadByte(0xa0);

		if (iRet !== 0x20) {
			return false;
		}

		return true;
	}

	TestDeviceModel(address) {
		// This can only be used while we have a free address bus.
		// if we do we can't directly call bus. We need to use this.Bus()
		if (this.IsFixedBus()) {
			this.Bus().log(
				'Bus Interface must be a "Free" Type to use this function! This can only be done inside of the Scan() export.'
			);

			return false;
		}

		const Characters = [];

		for (let iIdx = 0; iIdx < 16; iIdx++) {
			const iRet = this.Interface.ReadRegister(address, 0x1000 + iIdx);
			this.Bus().pause(30);

			if (iRet > 0) {
				Characters.push(iRet);
			}
		}

		const DeviceModel = String.fromCharCode(...Characters);

		if (DeviceModel in this.deviceNameDict) {
			this.Bus().log(
				`Address: [${address}], Found Valid Device Model: [${DeviceModel}]`,
				{ toFile: true }
			);

			return true;
		}

		this.Bus().log(
			`Address: [${address}], Found Invalid Device Model: [${DeviceModel}]`,
			{ toFile: true }
		);

		return false;
	}

	TestManufactureName(address) {
		// This can only be used while we have a free address bus.
		// if we do we can't directly call bus. We need to use this.Bus()
		if (this.IsFixedBus()) {
			this.Bus().log(
				'Bus Interface must be a "Free" Type to use this function! This can only be done inside of the Scan() export.'
			);

			return false;
		}

		const Characters = [];

		for (let iIdx = 0; iIdx < 21; iIdx++) {
			const iRet = this.Interface.ReadRegister(
				address,
				this.commands.ManufacturerName + iIdx
			);
			this.Bus().pause(30);

			if (iRet > 0) {
				Characters.push(iRet);
			}
		}

		const ManufactureName = String.fromCharCode(...Characters);

		const InvalidManufactureString = ManufactureName.includes("Micron");

		if (InvalidManufactureString) {
			this.Bus().log(
				`Address: [${address}], Found Micron Manufacturer Name: [${ManufactureName}]`
			);

			return false;
		}

		this.Bus().log(
			`Valid Manufacture Name on address: [${address}]. Address Found: [${ManufactureName}]`,
			{ toFile: true }
		);

		return true;
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	if (result === null) {
		return [0, 0, 0];
	}

	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/ram.png";
}
