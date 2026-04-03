// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() {
	return "Asus Ampere/Lovelace GPU";
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Documentation() {
	return "troubleshooting/asus";
}
export function Type() {
	return "SMBUS";
}
export function Size() {
	return [30, 1];
}
export function LedNames() {
	return vLedNames;
}
export function LedPositions() {
	return vLedPositions;
}
export function ConflictingProcesses() {
	return ["LightingService.exe"];
}
export function DeviceType() {
	return "gpu";
}
export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/gpu.png";
}
/* global
shutdownMode:readonly
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{
			property: "shutdownMode",
			group: "lighting",
			label: "Shutdown Mode",
			description:
				"Sets whether the device should follow SignalRGB shutdown color, or go back to hardware lighting",
			type: "combobox",
			values: ["SignalRGB", "Hardware"],
			default: "Hardware",
		},
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
			default: "#009bde",
		},
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

	for (const AsusGPUID of Asus3000GPUIDs) {
		if (
			AsusGPUID.Vendor === bus.Vendor() &&
			AsusGPUID.SubVendor === bus.SubVendor() &&
			AsusGPUID.Device === bus.Product() &&
			AsusGPUID.SubDevice === bus.SubDevice()
		) {
			// No Quick Write test on Nvidia
			//if(bus.ReadByteWithoutRegister(AsusGPUID.Address) > 0) {
			FoundAddresses.push(AsusGPUID.Address);
			//}
		}
	}

	return FoundAddresses;
}

const OldRGBData = [];

export function Initialize() {
	AsusGPU.getDeviceInformation();
	SetGPUNameFromBusIds();

	AsusGPU.setDirectMode(0x01);

	// ENEInterface.WriteRegister(0x80A2, 0x16);
	// ENEInterface.WriteRegister(0x80D0, 0x0F);
	// ENEInterface.WriteRegister(0x80D1, 0x4F);
	// ENEInterface.WriteRegister(0x80D0, 0x0F);
	// ENEInterface.WriteRegister(0x80D1, 0x4F);
	// ENEInterface.WriteBlock(0x8020, [0x01, 0x01]);
	// ENEInterface.WriteRegister(0x8024, 0);
	// ENEInterface.WriteRegister(0x802F, 1);

	//AsusGPU.auraWriteRegister(0x8024, 0x00); //This is an unknown register. it comes right after direction.
	//AsusGPU.auraWriteRegister(0x802f, 0x01);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if (SystemSuspending) {
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	} else {
		if (shutdownMode === "SignalRGB") {
			sendColors(shutdownColor);
		} else {
			AsusGPU.setDirectMode(0x00);
			AsusGPU.setMode(AsusGPU.modes.rainbow);
		}
	}
}

function SetGPUNameFromBusIds() {
	for (const AsusGPUID of Asus3000GPUIDs) {
		if (
			AsusGPUID.Vendor === bus.Vendor() &&
			AsusGPUID.SubVendor === bus.SubVendor() &&
			AsusGPUID.Device === bus.Product() &&
			AsusGPUID.SubDevice === bus.SubDevice()
		) {
			device.setName(AsusGPUID.Name);
		}
	}
}

let refreshColors = false;

function sendColors(overrideColor) {
	const RGBData = [];

	for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if (overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];
		RGBData[iLedIdx + 1] = color[2];
		RGBData[iLedIdx + 2] = color[1];

		if (
			OldRGBData[iLedIdx] !== RGBData[iLedIdx] ||
			OldRGBData[iLedIdx + 1] !== RGBData[iLedIdx + 1] ||
			OldRGBData[iLedIdx + 2] !== RGBData[iLedIdx + 2]
		) {
			refreshColors = true;
			OldRGBData[iLedIdx] = RGBData[iLedIdx];
			OldRGBData[iLedIdx + 1] = RGBData[iLedIdx + 1];
			OldRGBData[iLedIdx + 2] = RGBData[iLedIdx + 2];
		}
	}

	if (refreshColors) {
		bus.WriteBlock(0x00, 2, [0x81, 0x00]);

		while (RGBData.length > 0) {
			const packetSize = Math.min(RGBData.length, 31);
			let packet = [packetSize];
			packet = packet.concat(RGBData.splice(0, packetSize));

			bus.WriteBlock(AsusGPU.registers.color, packetSize + 1, packet);
		}

		refreshColors = false;
	}
}

class AsusGPUController {
	constructor() {
		this.registers = {
			command: 0x00,
			direction: 0x01,
			speed: 0x02,
			color: 0x03,
		};

		this.commands = {
			action: 0x80,
			speed: 0x20,
			direction: 0x24,
			apply: 0x2f,
		};

		this.modes = {
			static: 0x01,
			breathing: 0x02,
			rainbow: 0x05,
			comet: 0x07,
			yoyo: 0x0c,
			starryNight: 0x0d,
			flashAndDash: 0x0a,
		};

		this.speeds = {
			slow: 0x05,
			medium: 0x00,
			fast: 0xfb,
		};

		this.auraCommands = {
			deviceName: 0x1000,
			configTable: 0x1c00,
			directAccess: 0x8020,
			colorCtlV1: 0x8000,
			colorCtlV2: 0x8100,
			effectCtlV2: 0x8160, //This is like an extension of color ctlV2?
			apply: 0x80a0,
			ColorApply: 0x802f,
		};
	}

	auraReadRegister(reg) {
		bus.WriteBlock(0x00, 2, [(reg >> 8) & 0xff, reg & 0xff]);

		return bus.ReadByte(0x81);
	}

	auraWriteRegister(reg, value) {
		bus.WriteBlock(0x00, 2, [(reg >> 8) & 0xff, reg & 0xff]);

		bus.WriteByte(0x01, value);
	}

	auraWriteRegisterBlock(reg, size, data) {
		const iWord = bus.WriteBlock(this.registers.command, 2, [
			(reg >> 8) & 0xff,
			reg & 0xff,
		]); //The variable here isn't needed for gpus and normal cases. Hence, we aren't making use of it.
		bus.WriteBlock(0x03, size, data);
	}

	getDeviceInformation() {
		const deviceName = AsusGPU.getDeviceName();
		const deviceConfigTable = AsusGPU.getDeviceConfigTable();
		let deviceLEDCount = deviceConfigTable[3]; //No need to properly parse this. We only pull a single value off it for now.
		device.log("Device Controller Identifier: " + deviceName, {
			toFile: true,
		});
		device.log("Device LED Count: " + deviceLEDCount, { toFile: true });
		vLedNames = [];
		vLedPositions = [];

		if (deviceLEDCount > 30 || deviceLEDCount < 0) {
			device.log("Device returned out of bounds LED Count.", {
				toFile: true,
			});
			deviceLEDCount = 30;
		}

		for (let i = 0; i < deviceLEDCount; i++) {
			vLedNames.push(`LED ${i + 1}`);
			vLedPositions.push([deviceLEDCount - 1 - i, 0]);
		}

		device.setControllableLeds(vLedNames, vLedPositions);
		device.setSize([deviceLEDCount, 1]);
	}

	getDeviceName() {
		const deviceName = [];

		for (let iIdx = 0; iIdx < 16; iIdx++) {
			const character = this.auraReadRegister(
				this.auraCommands.deviceName + iIdx
			);

			if (character > 0) {
				deviceName.push(character);
			}
		}

		return String.fromCharCode(...deviceName);
	}

	getDeviceConfigTable() {
		const configTable = new Array(65);

		for (let iIdx = 0; iIdx < 64; iIdx++) {
			configTable[iIdx] = this.auraReadRegister(
				this.auraCommands.configTable + iIdx
			);
		}

		return configTable;
	}

	setDirectMode(directMode) {
		this.auraWriteRegister(this.auraCommands.directAccess, directMode);
		this.auraWriteRegister(0x80a0, 1);
	}

	setMode(deviceMode) {
		bus.WriteBlock(this.registers.command, 2, [
			this.commands.action,
			this.commands.speed,
		]);
		bus.WriteBlock(this.registers.speed, 2, [
			this.speeds.medium,
			deviceMode,
		]);
		this.setDirection(0x00); //0x00 is left. 0x01 is right. I'm not making a dict for two values.
	}

	setDirection(direction) {
		bus.WriteBlock(this.registers.command, 2, [
			this.commands.action,
			this.commands.direction,
		]);
		bus.WriteByte(this.registers.direction, direction);
		bus.WriteBlock(this.registers.command, 2, [
			this.commands.action,
			this.commands.apply,
		]);
		bus.WriteByte(this.registers.direction, 0x01); //apply direction
	}
}
export class BinaryUtils {
	static WriteInt16LittleEndian(value) {
		return [value & 0xff, (value >> 8) & 0xff];
	}
	static WriteInt16BigEndian(value) {
		return this.WriteInt16LittleEndian(value).reverse();
	}
	static ReadInt16LittleEndian(array) {
		return (array[0] & 0xff) | ((array[1] & 0xff) << 8);
	}
	static ReadInt16BigEndian(array) {
		return this.ReadInt16LittleEndian(array.slice(0, 2).reverse());
	}
	static ReadInt32LittleEndian(array) {
		return (
			(array[0] & 0xff) |
			((array[1] << 8) & 0xff00) |
			((array[2] << 16) & 0xff0000) |
			((array[3] << 24) & 0xff000000)
		);
	}
	static ReadInt32BigEndian(array) {
		if (array.length < 4) {
			array.push(...new Array(4 - array.length).fill(0));
		}

		return this.ReadInt32LittleEndian(array.slice(0, 4).reverse());
	}
	static WriteInt32LittleEndian(value) {
		return [
			value & 0xff,
			(value >> 8) & 0xff,
			(value >> 16) & 0xff,
			(value >> 24) & 0xff,
		];
	}
	static WriteInt32BigEndian(value) {
		return this.WriteInt32LittleEndian(value).reverse();
	}
}

class ENEInterface {
	static WriteBlock(register, data) {
		bus.WriteBlock(0x00, 2, BinaryUtils.WriteInt16BigEndian(register));

		//bus.WriteWord(0x00, ((register << 8) & 0xFF00) | ((register >> 8) & 0x00FF));
		bus.WriteBlock(0x03, data.length, data);
	}

	static WriteWord(register) {
		bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		bus.WriteByte(0x01, 0x00);
		bus.WriteByte(0x01, 0x01);
	}

	static WriteRegisterWithoutArgument(register) {
		bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
	}

	static WriteRegister(register, value) {
		bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);
		bus.WriteByte(0x01, value);
	}

	static ReadRegister(register) {
		bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		return bus.ReadByte(0x81);
	}

	static ReadWord(register) {
		bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		let returnValue = (bus.ReadByte(0x81) << 8) & 0xff00;
		returnValue |= bus.ReadByte(0x81) & 0xff;

		return returnValue;
	}

	static ReadBytes(length) {
		for (let bytesToRead = 0; bytesToRead < length; bytesToRead++) {
			bus.ReadByte(0x81);
		}
	}

	static ReadBlockByBytes(register, length) {
		bus.WriteWord(
			0x00,
			((register << 8) & 0xff00) | ((register >> 8) & 0x00ff)
		);

		const returnedBytes = [];

		for (let bytesToRead = 0; bytesToRead < length; bytesToRead++) {
			returnedBytes[bytesToRead] = bus.ReadByte(0x81);
		}

		return returnedBytes;
	}
}

const AsusGPU = new AsusGPUController();

class GPUIdentifier {
	constructor(
		Vendor,
		SubVendor,
		Device,
		SubDevice,
		Address,
		Name,
		Model = ""
	) {
		this.Vendor = Vendor;
		this.SubVendor = SubVendor;
		this.Device = Device;
		this.SubDevice = SubDevice;
		this.Address = Address;
		this.Name = Name;
		this.Model = Model;
	}
}

class AsusGPUIdentifier extends GPUIdentifier {
	constructor(Device, SubDevice, Name, Model = "") {
		super(0x10de, 0x1043, Device, SubDevice, 0x67, Name, Model);
	}
}

class NvidiaGPUDeviceIds {
	constructor() {
		this.GTX1050TI = 0x1c82;
		this.GTX1060 = 0x1c03;
		this.GTX1070 = 0x1b81;
		this.GTX1070TI = 0x1b82;
		this.GTX1080 = 0x1b80;
		this.GTX1080TI = 0x1b06;
		this.GTX1650 = 0x1f82;
		this.GTX1650S = 0x2187;
		this.GTX1660 = 0x2184;
		this.GTX1660TI = 0x2182;
		this.GTX1660S = 0x21c4;
		this.RTX2060_TU104 = 0x1e89;
		this.RTX2060_TU106 = 0x1f08;
		this.RTX2060S = 0x1f47;
		this.RTX2060S_OC = 0x1f06;
		this.RTX2070 = 0x1f02;
		this.RTX2070_OC = 0x1f07;
		this.RTX2070S = 0x1e84;
		this.RTX2080 = 0x1e82;
		this.RTX2080_A = 0x1e87;
		this.RTX2080S = 0x1e81;
		this.RTX2080TI_TU102 = 0x1e04;
		this.RTX2080TI = 0x1e07;
		this.RTX2080_SUPER = 0x1e81;
		this.RTX3050 = 0x2507;
		this.RTX3060 = 0x2503;
		this.RTX3060_LHR = 0x2504;
		this.RTX3060_GA104 = 0x2487;
		this.RTX3060TI = 0x2486;
		this.RTX3060TI_LHR = 0x2489;
		this.RTX3060TI_GDDR6X = 0x24c9;
		this.RTX3070 = 0x2484;
		this.RTX3070_LHR = 0x2488;
		this.RTX3070TI = 0x2482;
		this.RTX3070TI_GA102 = 0x2207;
		this.RTX3080 = 0x2206;
		this.RTX3080_LHR = 0x2216;
		this.RTX3080_GA102 = 0x220a;
		this.RTX3080TI = 0x2208;
		this.RTX3090 = 0x2204;
		this.RTX3090TI = 0x2203;
		this.RTX4060 = 0x2882;
		this.RTX4060TI = 0x2803;
		this.RTX4060TI_OC = 0x2805;
		this.RTX4070 = 0x2786;
		this.RTX4070_S = 0x2783;
		this.RTX4070TI = 0x2782;
		this.RTX4070TI_S = 0x2705;
		this.RTX4070TI_S_2 = 0x2689;
		this.RTX4080 = 0x2704;
		this.RTX4080_S = 0x2702;
		this.RTX4090 = 0x2684;
		this.RTX5060TI = 0x2d04;
		this.RTX5070 = 0x2f04;
		this.RTX5070TI = 0x2c05;
		this.RTX5080 = 0x2c02;
		this.RTX5090 = 0x2b85;
	}
}

const Nvidia = new NvidiaGPUDeviceIds();

class Asus_Ampere_Lovelace_IDs {
	constructor() {
		this.RTX3050_STRIX_GAMING = 0x8872; //0x2507

		this.RTX3060_STRIX_GAMING = 0x8818;
		this.RTX3060_STRIX_GAMING_V2 = 0x8819;
		this.RTX3060_STRIX_GAMING_OC = 0x87f3;
		this.RTX3060_STRIX_GAMING_OC_2 = 0x87f4;
		this.RTX3060_TUF_GAMING_OC = 0x87f5;
		this.RTX3060_TUF_GAMING_OC_V2 = 0x8816;
		this.RTX3060_TUF_GAMING_OC_V2_2 = 0x8865;
		this.RTX3060_TUF_GAMING_O12G = 0x87f6; //0x2503
		this.RTX3060_TUF_GAMING_OC_V2_LHR = 0x8817; //0x2504
		this.RTX3060_STRIX_O12G_KO = 0x8821; //0x2504
		this.RTX3060_STRIX_O12G_KO_2 = 0x87fb;
		this.RTX3060_STRIX_O12G_KO_3 = 0x8822; //0x2504
		this.RTX3060_TUF_O12G_OC_DEMON_SLAYER = 0x8896;

		this.RTX3060TI_STRIX_GAMING = 0x87ba;
		this.RTX3060TI_STRIX_GAMING_2 = 0x87bb;
		this.RTX3060TI_STRIX_GAMING_KO = 0x883e;
		this.RTX3060TI_STRIX_GAMING_KO_2 = 0x87ca; //0x2486
		this.RTX3060TI_STRIX_GAMING_KO_3 = 0x883F;
		this.RTX3060TI_STRIX_GAMING_V2 = 0x8834;
		this.RTX3060TI_STRIX_GAMING_V2_2 = 0x8835;
		this.RTX3060TI_TUF_GAMING_OC = 0x87c6;
		this.RTX3060TI_TUF_GAMING_OC_2 = 0x87c7;
		this.RTX3060TI_TUF_GAMING_OC_LHR = 0x8827;
		this.RTX3060TI_TUF_GAMING_OC_LHR_2 = 0x8828;
		this.RTX3060TI_TUF_O8G_GDDR6X = 0x88ac;
		this.RTX3060TI_TUF_O8G_GDDR6X_2 = 0x88ad;

		this.RTX3070_STRIX_GAMING = 0x87be;
		this.RTX3070_STRIX_GAMING_OC = 0x87d8;
		this.RTX3070_STRIX_GAMING_OC_3 = 0x87d0; //Untested.
		this.RTX3070_STRIX_GAMING_OC_2 = 0x87b8;
		this.RTX3070_STRIX_GAMING_OC_WHITE = 0x87e0;
		this.RTX3070_STRIX_GAMING_OC_WHITE_V2 = 0x8833; //LHR
		this.RTX3070_STRIX_GAMING_OC_LHR = 0x882c;
		this.RTX3070_STRIX_GAMING_V2_LHR = 0x882d;
		this.RTX3070_STRIX_GAMING_WHITE_LHR = 0x8832;
		this.RTX3070_STRIX_GAMING_LHR = 0x883a;
		this.RTX3070_STRIX_KO_V2 = 0x8842; //LHR
		this.RTX3070_TUF_GAMING = 0x87b9;
		this.RTX3070_TUF_GAMING_2 = 0x87c2;
		this.RTX3070_TUF_GAMING_OC = 0x87e1;
		this.RTX3070_TUF_GAMING_OC_2 = 0x87c1;
		this.RTX3070_TUF_GAMING_OC_LHR = 0x8825;

		this.RTX3070TI_STRIX_GAMING = 0x880e;
		this.RTX3070TI_STRIX_GAMING_2 = 0x880f;
		this.RTX3070TI_TUF_GAMING = 0x8812;
		this.RTX3070TI_TUF_GAMING_2 = 0x8813;
		this.RTX3070TI_TUF_GAMING_OC = 0x88bc;

		this.RTX3080_STRIX_GAMING_WHITE = 0x87d1;
		this.RGB3080_STRIX_GAMING_V2 = 0x882f;
		this.RTX3080_STRIX_GAMING_WHITE_OC_LHR = 0x8830;
		this.RTX3080_STRIX_GAMING_GUNDAM = 0x87ce;
		this.RTX3080_STRIX_GAMING_OC = 0x87aa;
		this.RTX3080_STRIX_GAMING = 0x87ac;
		this.RTX3080_STRIX_O10G_GAMING_WHITE_V2 = 0x8831; //2216
		this.RTX3080_TUF_GAMING_V2_LHR = 0x8822;
		this.RTX3080_TUF_GAMING_LHR = 0x8823;
		this.RTX3080_TUF_GAMING = 0x87b2;
		this.RTX3080_TUF_GAMING_V2 = 0x87c4;
		this.RTX3080_TUF_O10G_GAMING = 0x882b;
		this.RTX3080_TUF_GAMING_OC_LHR = 0x882e;
		this.RTX3080_TUF_GAMING_OC = 0x87b0;
		this.RTX3080_TUF_GAMING_OC_8GB = 0x886a;
		this.RTX3080_STRIX_GAMING_LHR = 0x886c;
		this.RTX3080_TUF_GAMING_OC_GDDR6X = 0x886e; //0x220A
		this.RTX3080_TUF_GAMING_OC_GDDR6X_LHR = 0x886f; //0x220A
		this.RTX3080_STRIX_O12G_GAMING_OC = 0x886b;
		this.RTX3080_STRIX_EVA = 0x8887;

		this.RTX3080TI_TUF_GAMING_OC = 0x8802;
		this.RTX3080TI_TUF_GAMING = 0x8803;
		this.RTX3080TI_STRIX_GAMING = 0x8807;
		this.RTX3080TI_STRIX_GAMING_OC = 0x8808;
		this.RTX3080TI_STRIX_LC_GAMING_OC = 0x8809;
		this.RTX3080TI_STRIX_LC = 0x880a;

		this.RTX3090_TUF_GAMING_OC = 0x87b3;
		this.RTX3090_TUF_GAMING = 0x87b5;
		this.RTX3090_STRIX_GAMING = 0x87af;
		this.RTX3090_STRIX_GAMING_2 = 0x87ad;
		this.RTX3090_STRIX_GAMING_3 = 0x87c5;
		this.RTX3090_STRIX_GAMING_WHITE = 0x87d9;
		this.RTX3090_STRIX_GAMING_WHITE_V2 = 0x87da;
		this.RTX3090_STRIX_GAMING_EVA = 0x8886;

		this.RTX3090TI_STRIX_LC_GAMING = 0x8871;
		this.RTX3090TI_STRIX_LC_GAMING_OC = 0x8870;
		this.RTX3090TI_TUF_GAMING = 0x8874;

		this.RTX4060_STRIX_GAMING = 0x8908;

		this.RTX4060TI_TUF_GAMING_OC = 0x88f6;
		this.RTX4060TI_STRIX_GAMING = 0x88fb;
		this.RTX4060TI_STRIX_GAMING_OC = 0x892f;

		this.RTX4070_TUF_GAMING = 0x88df;
		this.RTX4070_TUF_GAMING_2 = 0x88de;
		this.RTX4070_TUF_GAMING_3 = 0x88eb;
		this.RTX4070_TUF_GAMING_OC = 0x88ec;
		this.RTX4070_STRIX_GAMING = 0x88f4;
		this.RTX4070_STRIX_GAMING_2 = 0x88f3;
		this.RTX4070_STRIX_GAMING_OC = 0x88da;

		this.RTX4070_SUPER_TUF_GAMING_OC = 0x8952;
		this.RTX4070_SUPER_STRIX_GAMING = 0x8972;
		this.RTX4070_SUPER_STRIX_GAMING_2 = 0x8973;

		this.RTX4070TI_TUF_GAMING_OC = 0x88a3;
		this.RTX4070TI_TUF_GAMING_OC_WH = 0x8935;
		this.RTX4070TI_12GB_STRIX_GAMING_OC = 0x88a7;
		this.RTX4070TI_12GB_STRIX_GAMING_OC_2 = 0x88dc;
		this.RTX4070TI_12GB_STRIX_GAMING_OC_3 = 0x88e5;
		this.RTX4070TI_12GB_STRIX_GAMING_OC_4 = 0x88e4;
		this.RTX4070TI_TUF_GAMING = 0x88a6;
		this.RTX4070TI_TUF_GAMING_2 = 0x88dd;
		this.RTX4070TI_TUF_GAMING_OC_2 = 0x88a4;
		this.RTX4070TI_12GB_TUF = 0x88dd;

		this.RTX4070TI_SUPER_STRIX_16G = 0x896b;
		this.RTX4070TI_SUPER_STRIX_16G_2 = 0x896a;
		this.RTX4070TI_SUPER_STRIX_16G_3 = 0x896d;
		this.RTX4070TI_SUPER_TUF_16G = 0x8958;
		this.RTX4070TI_SUPER_TUF_OC_16G = 0x8957;
		this.RTX4070TI_SUPER_TUF_OC_16G_2 = 0x89b0;
		this.RTX4070TI_SUPER_TUF_OC_16G_3 = 0x89af;
		this.RTX4070TI_SUPER_TUF_OC_WH_16G = 0x895b;
		this.RTX4070TI_SUPER_BTF = 0x897a;

		this.RTX4080_STRIX_GAMING_3 = 0x88a0;
		this.RTX4080_TUF_GAMING = 0x88a1;
		this.RTX4080_STRIX_GAMING = 0x889f;
		this.RTX4080_TUF_GAMING_2 = 0x88a2;
		this.RTX4080_TUF_GAMING_3 = 0x88cb;
		this.RTX4080_STRIX_GAMING_OC = 0x88bf;
		this.RTX4080_STRIX_GAMING_2 = 0x88c0;
		this.RTX4080_STRIX_GAMING_OC_WHITE = 0x88c8;
		this.RTX4080_STRIX_GAMING_WHITE = 0x88c9;
		this.RTX4080_TUF_GAMING_OC = 0x88ca;

		this.RTX4080_SUPER_TUF_GAMING = 0x8963;
		this.RTX4080_SUPER_TUF_GAMING_OC = 0x8962;
		this.RTX4080_SUPER_STRIX_GAMING = 0x8964;
		this.RTX4080_SUPER_STRIX_GAMING_2 = 0x8967;
		this.RTX4080_SUPER_STRIX_GAMING_3 = 0x8965;
		this.RTX4080_SUPER_STRIX_GAMING_WHITE = 0x8969;
		this.RTX4080_SUPER_STRIX_GAMING_OC = 0x8966;
		this.RTX4080_SUPER_STRIX_GAMING_OC_WHITE = 0x8968;

		this.RTX4090_STRIX_GAMING = 0x889c;
		this.RTX4090_STRIX_GAMING_2 = 0x889d;
		this.RTX4090_STRIX_GAMING_3 = 0x8933;
		this.RTX4090_STRIX_GAMING_OC = 0x88ef;
		this.RTX4090_STRIX_GAMING_OC_2 = 0x8932;
		this.RTX4090_STRIX_GAMING_OC_3 = 0x88f0;
		this.RTX4090_STRIX_GAMING_WHITE_OC = 0x88c3;
		this.RTX4090_STRIX_GAMING_WHITE_OC_2 = 0x88f1;
		this.RTX4090_STRIX_GAMING_WHITE = 0x88c4;
		this.RTX4090_STRIX_GAMING_WHITE_2 = 0x88f2;
		this.RTX4090_STRIX_LC_OC = 0x88e8;
		this.RTX4090_TUF_GAMING = 0x889a;
		this.RTX4090_TUF_GAMING_2 = 0x889b;
		this.RTX4090_TUF_GAMING_3 = 0x88e3;
		this.RTX4090_TUF_GAMING_OC = 0x88e6;
		this.RTX4090_TUF_GAMING_OC_2 = 0x88e2;
		this.RTX4090_TUF_GAMING_OG = 0x88e7;
		this.RTX4090_MATRIX = 0x8934;
		this.RTX4090_BTF = 0x893c;
		this.RTX4090_STRIX_EVA = 0x890c;

		this.RTX5060TI_TUF_GAMING = 0x8A08;

		this.RTX5070_TUF_GAMING = 0x89f2;
		this.RTX5070_ROG_STRIX_OC = 0x8A18;

		this.RTX5070TI_TUF_GAMING = 0x89F4;
		this.RTX5070TI_ROG_STRIX_OC = 0x8A0D;
		this.RTX5070TI_TUF_GAMING_2 = 0x8A0C;
		this.RTX5070TI_BTF_OC       = 0x8a37;

		this.RTX5080_ASTRAL = 0x89de;
		this.RTX5080_ASTRAL_2 = 0x89df;
		this.RTX5080_ASTRAL_WH = 0x8a2b;
		this.RTX5080_TUF_GAMING_OC = 0x89d7;
		this.RTX5080_ASTRAL_DOOM  = 0x8a3e;
		this.RTX5080_ASTRAL_W_OC_2 = 0x8a2c;
		this.RTX5080_ASTRAL_HATSUNE_MIKU_OC = 0x8a45;

		this.RTX5090_TUF_GAMING = 0x89ef;
		this.RTX5090_TUF_GAMING_2 = 0x89ee;
		this.RTX5090_ASTRAL = 0x89ec;
		this.RTX5090_ASTRAL_2 = 0x89e3;
		this.RTX5090_ASTRAL_3 = 0x89e5;
		this.RTX5090_ASTRAL_4 = 0x89e4;
		this.RTX5090_ASTRAL_5 = 0x8a5a;
		this.RTX5090_ASTRAL_BTF = 0x8a3c;
		this.RTX5090_ASTRAL_W_OC = 0x8a2e;
	}
}

const AsusID = new Asus_Ampere_Lovelace_IDs();

export function BrandGPUList() {
	return Asus3000GPUIDs;
}

const Asus3000GPUIDs = [
	new AsusGPUIdentifier(
		Nvidia.RTX3050,
		AsusID.RTX3050_STRIX_GAMING,
		"Asus ROG Strix RTX 3050 Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_STRIX_GAMING,
		"Asus ROG Strix RTX 3060 O12G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_STRIX_GAMING_V2,
		"Asus ROG Strix RTX 3060 O12G Gaming V2 LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060,
		AsusID.RTX3060_STRIX_GAMING_OC,
		"Asus ROG Strix RTX 3060 O12G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060,
		AsusID.RTX3060_STRIX_GAMING_OC_2,
		"Asus ROG Strix RTX 3060 O12G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060,
		AsusID.RTX3060_STRIX_O12G_KO_2,
		"Asus ROG Strix RTX 3060 KO OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_STRIX_O12G_KO_3,
		"Asus ROG Strix RTX 3060 KO"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_STRIX_O12G_KO,
		"Asus ROG Strix RTX 3060 KO OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060,
		AsusID.RTX3060_TUF_GAMING_O12G,
		"Asus TUF RTX 3060 Gaming O12G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060,
		AsusID.RTX3060_TUF_GAMING_OC,
		"Asus TUF RTX 3060 Gaming O12G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_TUF_GAMING_OC_V2,
		"Asus TUF RTX 3060 Gaming O12G Gaming OC V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_GA104,
		AsusID.RTX3060_TUF_GAMING_OC_V2_2,
		"Asus 3060 TUF Gaming O12G Gaming OC V2 GA104"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_TUF_GAMING_OC_V2_LHR,
		"Asus TUF 3060 Gaming O12G Gaming OC V2 LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060_LHR,
		AsusID.RTX3060_TUF_O12G_OC_DEMON_SLAYER,
		"Asus TUF 3060 Gaming OC Demon Slayer"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_STRIX_GAMING_V2,
		"Asus ROG Strix 3060TI O8G Gaming V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_STRIX_GAMING_V2_2,
		"Asus ROG Strix 3060TI O8G Gaming V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_TUF_GAMING_OC_LHR,
		"Asus TUF 3060TI O8G Gaming OC LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_TUF_GAMING_OC_LHR_2,
		"Asus TUF 3060TI O8G Gaming OC LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI,
		AsusID.RTX3060TI_STRIX_GAMING,
		"Asus ROG Strix 3060TI O8G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI,
		AsusID.RTX3060TI_STRIX_GAMING_2,
		"Asus ROG Strix 3060TI O8G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI,
		AsusID.RTX3060TI_STRIX_GAMING_KO_2,
		"Asus ROG Strix 3060TI O8G Gaming KO"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_STRIX_GAMING_KO,
		"Asus ROG Strix 3060TI O8G Gaming KO LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_STRIX_GAMING_KO_2,
		"Asus ROG Strix 3060TI O8G Gaming KO LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_LHR,
		AsusID.RTX3060TI_STRIX_GAMING_KO_3,
		"Asus ROG Strix 3060TI O8G V2 Gaming KO LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI,
		AsusID.RTX3060TI_TUF_GAMING_OC,
		"Asus TUF 3060TI O8G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI,
		AsusID.RTX3060TI_TUF_GAMING_OC_2,
		"Asus TUF 3060TI O8G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_GDDR6X,
		AsusID.RTX3060TI_TUF_O8G_GDDR6X,
		"Asus TUF 3060TI O8G GDDR6X"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3060TI_GDDR6X,
		AsusID.RTX3060TI_TUF_O8G_GDDR6X_2,
		"Asus TUF 3060TI O8G GDDR6X"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_STRIX_GAMING,
		"Asus ROG Strix 3070 O8G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_STRIX_GAMING_OC,
		"Asus ROG Strix 3070 O8G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_STRIX_GAMING_OC_2,
		"Asus ROG Strix 3070 O8G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_STRIX_GAMING_OC_3,
		"Asus ROG Strix 3070 O8G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_STRIX_GAMING_OC_WHITE,
		"Asus ROG Strix 3070 Gaming OC White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_STRIX_GAMING_OC_WHITE_V2,
		"Asus ROG Strix 3070 Gaming OC White V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_STRIX_GAMING_OC_LHR,
		"Asus ROG Strix 3070 Gaming OC LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_TUF_GAMING,
		"Asus TUF 3070 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_TUF_GAMING_2,
		"Asus TUF 3070 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_TUF_GAMING_OC,
		"Asus TUF 3070 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_STRIX_KO_V2,
		"Asus 3070 KO V2 OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070,
		AsusID.RTX3070_TUF_GAMING_OC_2,
		"Asus TUF 3070 Gaming OC 2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_TUF_GAMING_OC_LHR,
		"Asus TUF 3070 Gaming OC LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_STRIX_GAMING_V2_LHR,
		"Asus ROG Strix 3070 O8G V2 LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_STRIX_GAMING_WHITE_LHR,
		"Asus ROG Strix 3070 O8G White LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070_LHR,
		AsusID.RTX3070_STRIX_GAMING_LHR,
		"Asus ROG Strix 3070 O8G Gaming LHR"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3070TI,
		AsusID.RTX3070TI_STRIX_GAMING,
		"Asus ROG Strix 3070TI O8G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070TI,
		AsusID.RTX3070TI_STRIX_GAMING_2,
		"Asus ROG Strix 3070TI O8G Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3070TI,
		AsusID.RTX3070TI_TUF_GAMING,
		"Asus TUF 3070TI Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070TI,
		AsusID.RTX3070TI_TUF_GAMING_2,
		"Asus TUF 3070TI Gaming 2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3070TI_GA102,
		AsusID.RTX3070TI_TUF_GAMING_OC,
		"Asus TUF 3070TI Gaming OC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_STRIX_GAMING_WHITE,
		"Asus ROG Strix 3080 O10G White Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RGB3080_STRIX_GAMING_V2,
		"Asus ROG Strix 3080 O10G Gaming LHR"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RTX3080_STRIX_GAMING_WHITE_OC_LHR,
		"Asus ROG Strix 3080 O10G White OC LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_STRIX_GAMING_GUNDAM,
		"Asus ROG Strix 3080 O10G Gundam"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_STRIX_GAMING,
		"Asus ROG Strix 3080 O10G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_STRIX_GAMING_OC,
		"Asus ROG Strix 3080 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RTX3080_TUF_GAMING_V2_LHR,
		"Asus TUF 3080 O10G V2 LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RTX3080_TUF_GAMING_LHR,
		"Asus TUF 3080 O10G Gaming LHR"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_TUF_GAMING,
		"Asus TUF 3080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_TUF_GAMING_OC_8GB,
		"Asus TUF 3080 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_GA102,
		AsusID.RTX3080_STRIX_GAMING_LHR,
		"Asus Strix 3080 Gaming LHR"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_TUF_GAMING_V2,
		"Asus TUF 3080 Gaming V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RTX3080_TUF_O10G_GAMING,
		"Asus TUF 3080 O10G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_GA102,
		AsusID.RTX3080_TUF_GAMING_OC_GDDR6X,
		"Asus TUF 3080 Gaming OC GDDR6X"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_GA102,
		AsusID.RTX3080_TUF_GAMING_OC_GDDR6X_LHR,
		"Asus TUF 3080 Gaming OC GDDR6X LHR"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RTX3080_TUF_GAMING_OC_LHR,
		"Asus ROG Strix 3080 O10G Gaming OC LHR"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3080,
		AsusID.RTX3080_TUF_GAMING_OC,
		"Asus TUF 3080 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_GA102,
		AsusID.RTX3080_STRIX_O12G_GAMING_OC,
		"Asus ROG Strix 3080 O12G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_LHR,
		AsusID.RTX3080_STRIX_O10G_GAMING_WHITE_V2,
		"Asus ROG Strix 3080 O10G Gaming White V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080_GA102,
		AsusID.RTX3080_STRIX_EVA,
		"Asus ROG Strix 3080 O12G EVA"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3080TI,
		AsusID.RTX3080TI_TUF_GAMING_OC,
		"Asus TUF 3080TI Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080TI,
		AsusID.RTX3080TI_TUF_GAMING,
		"Asus TUF 3080TI Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080TI,
		AsusID.RTX3080TI_STRIX_GAMING,
		"Asus ROG Strix 3080TI O12G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080TI,
		AsusID.RTX3080TI_STRIX_GAMING_OC,
		"Asus ROG Strix 3080TI O12G Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080TI,
		AsusID.RTX3080TI_STRIX_LC_GAMING_OC,
		"Asus ROG Strix 3080TI LC Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3080TI,
		AsusID.RTX3080TI_STRIX_LC,
		"Asus ROG Strix RTX 3080TI LC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_TUF_GAMING_OC,
		"Asus TUF 3090 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_TUF_GAMING,
		"Asus TUF 3090 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_STRIX_GAMING,
		"Asus ROG Strix 3090 O24G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_STRIX_GAMING_2,
		"Asus ROG Strix 3090 O24G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_STRIX_GAMING_3,
		"Asus ROG Strix 3090 O24G Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_STRIX_GAMING_WHITE,
		"Asus ROG Strix 3090 O24G Gaming White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_STRIX_GAMING_WHITE_V2,
		"Asus ROG Strix 3090 O24G Gaming White V2"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090,
		AsusID.RTX3090_STRIX_GAMING_EVA,
		"Asus ROG Strix 3090 EVA Edition"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX3090TI,
		AsusID.RTX3090TI_STRIX_LC_GAMING,
		"Asus ROG Strix 3090TI LC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090TI,
		AsusID.RTX3090TI_STRIX_LC_GAMING_OC,
		"Asus ROG Strix 3090TI LC OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX3090TI,
		AsusID.RTX3090TI_TUF_GAMING,
		"Asus TUF 3090TI Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4060,
		AsusID.RTX4060_STRIX_GAMING,
		"Asus ROG Strix 4060 Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4060TI,
		AsusID.RTX4060TI_TUF_GAMING_OC,
		"Asus 4060Ti TUF Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4060TI,
		AsusID.RTX4060TI_STRIX_GAMING,
		"Asus 4060Ti Strix Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4060TI_OC,
		AsusID.RTX4060TI_STRIX_GAMING_OC,
		"Asus 4060Ti Strix Gaming OC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_TUF_GAMING,
		"Asus 4070 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_TUF_GAMING_2,
		"Asus 4070 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_TUF_GAMING_3,
		"Asus 4070 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_TUF_GAMING_OC,
		"Asus 4070 TUF Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_STRIX_GAMING,
		"Asus 4070 Strix Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_STRIX_GAMING_2,
		"Asus 4070 Strix Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070,
		AsusID.RTX4070_STRIX_GAMING_OC,
		"Asus 4070 Strix Gaming OC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4070_S,
		AsusID.RTX4070_SUPER_TUF_GAMING_OC,
		"Asus 4070 Super TUF Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070_S,
		AsusID.RTX4070_SUPER_STRIX_GAMING,
		"Asus 4070 Super Strix Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070_S,
		AsusID.RTX4070_SUPER_STRIX_GAMING_2,
		"Asus 4070 Super Strix Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_12GB_STRIX_GAMING_OC,
		"Asus ROG Strix RTX 4070Ti 12GB Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_12GB_STRIX_GAMING_OC_2,
		"Asus ROG Strix RTX 4070Ti 12GB Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_12GB_STRIX_GAMING_OC_3,
		"Asus ROG Strix RTX 4070Ti 12GB Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_12GB_STRIX_GAMING_OC_4,
		"Asus ROG Strix RTX 4070Ti 12GB Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_TUF_GAMING_OC,
		"Asus TUF RTX 4070Ti Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_TUF_GAMING_OC_2,
		"Asus TUF RTX 4070Ti Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_TUF_GAMING_OC_WH,
		"Asus 4070Ti TUF Gaming OC White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_TUF_GAMING,
		"Asus TUF RTX 4070Ti 12GB Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI,
		AsusID.RTX4070TI_TUF_GAMING_2,
		"Asus TUF RTX 4070Ti 12GB Gaming"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_STRIX_16G,
		"ASUS ROG Strix 4070Ti Super 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_STRIX_16G_2,
		"ASUS 4070Ti Super Strix 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_STRIX_16G_3,
		"ASUS 4070Ti Super Strix 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_TUF_16G,
		"ASUS TUF 4070Ti Super 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_TUF_OC_16G,
		"ASUS TUF 4070Ti Super OC 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S_2,
		AsusID.RTX4070TI_SUPER_TUF_OC_16G_2,
		"ASUS TUF 4070Ti Super OC 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S_2,
		AsusID.RTX4070TI_SUPER_TUF_OC_16G_3,
		"ASUS TUF 4070Ti Super OC 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_TUF_OC_WH_16G,
		"ASUS TUF 4070Ti Super OC White 16GB"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4070TI_S,
		AsusID.RTX4070TI_SUPER_BTF,
		"ASUS Rog Strix 4070Ti BTF"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_TUF_GAMING,
		"Asus TUF RTX 4080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_TUF_GAMING_2,
		"Asus TUF RTX 4080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_TUF_GAMING_3,
		"Asus TUF RTX 4080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_STRIX_GAMING,
		"Asus ROG Strix RTX 4080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_STRIX_GAMING_2,
		"Asus ROG Strix RTX 4080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_STRIX_GAMING_3,
		"Asus ROG Strix RTX 4080 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_STRIX_GAMING_OC,
		"Asus ROG Strix 4080 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_STRIX_GAMING_WHITE,
		"Asus ROG Strix 4080 Gaming White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_STRIX_GAMING_OC_WHITE,
		"Asus ROG Strix 4080 Gaming OC White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080,
		AsusID.RTX4080_TUF_GAMING_OC,
		"Asus TUF RTX 4080 Gaming OC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_TUF_GAMING,
		"Asus TUF RTX 4080 Super Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_TUF_GAMING_OC,
		"Asus TUF RTX 4080 Super Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_STRIX_GAMING,
		"Asus ROG Strix RTX 4080 Super Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_STRIX_GAMING_2,
		"Asus Strix 4080 Super Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_STRIX_GAMING_3,
		"Asus Strix 4080 Super Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_STRIX_GAMING_WHITE,
		"Asus Strix 4080 Super Gaming White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_STRIX_GAMING_OC,
		"Asus Strix 4080 Super Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4080_S,
		AsusID.RTX4080_SUPER_STRIX_GAMING_OC_WHITE,
		"Asus Strix 4080 Super Gaming OC White"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING,
		"Asus ROG Strix 4090 Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_2,
		"Asus ROG Strix 4090 Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_3,
		"Asus 4090 Strix Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_OC,
		"Asus 4090 ROG Strix Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_OC_2,
		"Asus 4090 ROG Strix Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_OC_3,
		"Asus 4090 ROG Strix Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_WHITE,
		"Asus ROG Strix 4090 Gaming White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_WHITE_2,
		"Asus 4090 Strix Gaming White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_WHITE_OC,
		"Asus ROG Strix 4090 Gaming White OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_GAMING_WHITE_OC_2,
		"Asus ROG Strix 4090 Gaming White OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_LC_OC,
		"Asus 4090 ROG Strix LC OC Edition"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_TUF_GAMING,
		"Asus 4090 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_TUF_GAMING_2,
		"Asus 4090 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_TUF_GAMING_3,
		"Asus 4090 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_TUF_GAMING_OC,
		"Asus 4090 TUF Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_TUF_GAMING_OC_2,
		"Asus 4090 TUF Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_TUF_GAMING_OG,
		"Asus 4090 TUF Gaming OG"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_MATRIX,
		"Asus 4090 Matrix"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_BTF,
		"Asus 4090 Strix BTF"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX4090,
		AsusID.RTX4090_STRIX_EVA,
		"Asus 4090 Strix EVA-02"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX5060TI,
		AsusID.RTX5060TI_TUF_GAMING,
		"Asus 5060Ti TUF GAMING"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX5070,
		AsusID.RTX5070_TUF_GAMING,
		"Asus 5070 TUF Gaming"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5070,
		AsusID.RTX5070_ROG_STRIX_OC,
		"Asus 5070 ROG Strix OC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX5070TI,
		AsusID.RTX5070TI_TUF_GAMING,
		"Asus 5070Ti TUF GAMING"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5070TI,
		AsusID.RTX5070TI_TUF_GAMING_2,
		"Asus 5070Ti TUF GAMING"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX5070TI,
		AsusID.RTX5070TI_ROG_STRIX_OC,
		"Asus 5070Ti ROG Strix OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5070TI,
		AsusID.RTX5070TI_BTF_OC,
		"ASUS 5070Ti BTF OC"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_ASTRAL,
		"Asus 5080 ASTRAL OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_ASTRAL_2,
		"Asus 5080 ASTRAL"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_TUF_GAMING_OC,
		"Asus 5080 TUF Gaming OC"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_ASTRAL_DOOM,
		"ASUS 5080 Astral Doom Edition"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_ASTRAL_WH,
		"Asus 5080 ASTRAL White"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_ASTRAL_W_OC_2,
		"ASUS 5080 Astral White OC Edition"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5080,
		AsusID.RTX5080_ASTRAL_HATSUNE_MIKU_OC,
		"ASUS 5080 Astral Hatsune Miku OC Edition"
	),

	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_TUF_GAMING,
		"Asus 5090 TUF GAMING"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_TUF_GAMING_2,
		"Asus 5090 TUF GAMING"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL,
		"Asus 5090 ROG Astral"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL_2,
		"Asus 5090 ROG Astral"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL_3,
		"Asus 5090 ROG Astral"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL_4,
		"Asus 5090 ROG Astral"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL_5,
		"Asus 5090 ROG Astral"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL_BTF,
		"Asus 5090 ROG Astral BTF Edition"
	),
	new AsusGPUIdentifier(
		Nvidia.RTX5090,
		AsusID.RTX5090_ASTRAL_W_OC,
		"Asus 5090 ROG Astral WHITE OC Edition"
	),

];

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
