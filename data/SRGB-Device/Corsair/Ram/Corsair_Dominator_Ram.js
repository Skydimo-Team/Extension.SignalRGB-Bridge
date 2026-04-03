import systeminfo from "@SignalRGB/systeminfo";
// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() {
	return "Corsair Dominator Ram";
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Documentation() {
	return "troubleshooting/corsair";
}
export function Type() {
	return "SMBUS";
}
export function Size() {
	return [2, 12];
}
export function DefaultPosition() {
	return [40, 30];
}
export function DefaultScale() {
	return 10.0;
}
export function LedNames() {
	return vLedNames;
}
export function LedPositions() {
	return vLedPositions;
}
export function ConflictingProcesses() {
	return ["iCUE.exe"];
}
export function DeviceType() {
	return "ram";
}
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
			default: "#009bde",
		},
		{
			property: "forceRam",
			group: "settings",
			label: "Force Ram Model",
			description:
				"Overrides the autodetected ram model when enabled. This may be needed if you have multiple different types of Corsair ram in your System",
			type: "boolean",
			default: "false",
		},
		{
			property: "forcedRamType",
			group: "settings",
			label: "Forced Ram Model",
			description:
				"The model of ram to use when 'Force Ram Model' is enabled",
			type: "combobox",
			values: DominatorProtocol.ModelNames,
			default: "Dominator Platinum",
		},
	];
}

/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
forceRam:readonly
forcedRamType:readonly
*/

let vLedNames = [];
let vLedPositions = [];

export function onforceRamChanged() {
	SetupRamModel();
}

export function onforcedRamTypeChanged() {
	SetupRamModel();
}

export function Initialize() {
	SetupRamModel();
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const PossibleAddresses = [
		0x18, 0x19, 0x1a, 0x1b, 0x58, 0x59, 0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f,
	];
	const FoundAddresses = [];

	// Skip any non AMD / INTEL Busses
	if (!bus.IsSystemBus()) {
		return [];
	}

	for (const address of PossibleAddresses) {
		// Skip any address that fails a quick write
		if (bus.WriteQuick(address) !== 0) {
			continue;
		}

		// Add address if it matches expected values
		if (DominatorProtocol.CheckForDominatorRam(bus, address)) {
			bus.log("Corsair DDR5 Ram Found At Address: " + address);
			FoundAddresses.push(address);
		}
	}

	return FoundAddresses;
}

function sendColors(overrideColor) {
	const RGBData = new Array(38).fill(0);

	//Fetch Colors
	for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		const PacketOffset = iIdx * 3;
		const Led = vLedPositions[iIdx];
		let Color;

		if (overrideColor) {
			Color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(Led[0], Led[1]);
		}

		RGBData[PacketOffset] = Color[0];
		RGBData[PacketOffset + 1] = Color[1];
		RGBData[PacketOffset + 2] = Color[2];
	}

	DominatorProtocol.SendRGBData(RGBData);
}

function SetupRamModel() {
	if (!forceRam) {
		DominatorProtocol.SetRamToSystemId();
	} else {
		const Model = DominatorProtocol.GetRamModelByName(forcedRamType);
		DominatorProtocol.SetModelId(Model ? Model.id : "");
	}
}

class DominatorRamModel {
	constructor(name, ledCount, id, image) {
		this.name = name;
		this.shortName = name.replace("Corsair ", "");
		this.ledCount = ledCount;
		this.id = id;
		this.image = image;
	}
}

/**
 * Protocol for Corsair Dominator Ram
 */
export class CorsairDominatorProtocol {
	//read 2 from 0x24
	constructor() {
		/**
		 * Contains Known Registers
		 */
		this.Registers = {
			DirectRGB: 0x31,
			Vender: 0x43,
			Model: 0x44,
		};
		/**
		 * Expected Vender Id for Corsair Dominator Protocol Ram
		 */
		this.VendorId = 0x1b;
		/**
		 * Array of expected Model Ids for Corsair Dominator Protocol Ram
		 */
		this.ModelIds = [0x03, 0x04];
		/**
		 * Contains Known Command Id's
		 */
		this.Commands = {
			DirectRGB: 0x0c,
		};

		// This Protocol Supports multiple Types of Ram, and
		// the only difference between them is the Led Count.
		//
		// We can tell them apart via the ram's WMI Part Number.
		/**
		 * Contains Known Ram Models using the Corsair Dominator Protocol
		 */
		this.Models = {
			CMT: new DominatorRamModel(
				"Corsair Dominator Platinum RGB",
				12,
				"CMT",
				"https://assets.signalrgb.com/devices/brands/corsair/ram/dominator-platinum-rgb.png"
			),
			CMH: new DominatorRamModel(
				"Corsair Vengeance Pro SL",
				10,
				"CMH",
				"https://assets.signalrgb.com/devices/brands/corsair/ram/vengeance-rgb-pro-sl.png"
			),
			CMN: new DominatorRamModel(
				"Corsair Vengeance RGB RT",
				10,
				"CMN",
				"https://assets.signalrgb.com/devices/brands/corsair/ram/vengeance-rgb-pro-rt.png"
			),
			CMG: new DominatorRamModel(
				"Corsair Vengeance RGB RS",
				6,
				"CMG",
				"https://assets.signalrgb.com/devices/brands/corsair/ram/vengeance-rgb-pro-rs.png"
			),
		};

		this.ModelNames = [];

		for (const RamModel of Object.values(this.Models)) {
			this.ModelNames.push(RamModel.shortName);
		}

		this.Config = {
			Model: this.Models["CMT"],
		};

		this.PecTable = [
			0, 7, 14, 9, 28, 27, 18, 21, 56, 63, 54, 49, 36, 35, 42, 45, 112,
			119, 126, 121, 108, 107, 98, 101, 72, 79, 70, 65, 84, 83, 90, 93,
			224, 231, 238, 233, 252, 251, 242, 245, 216, 223, 214, 209, 196,
			195, 202, 205, 144, 151, 158, 153, 140, 139, 130, 133, 168, 175,
			166, 161, 180, 179, 186, 189, 199, 192, 201, 206, 219, 220, 213,
			210, 255, 248, 241, 246, 227, 228, 237, 234, 183, 176, 185, 190,
			171, 172, 165, 162, 143, 136, 129, 134, 147, 148, 157, 154, 39, 32,
			41, 46, 59, 60, 53, 50, 31, 24, 17, 22, 3, 4, 13, 10, 87, 80, 89,
			94, 75, 76, 69, 66, 111, 104, 97, 102, 115, 116, 125, 122, 137, 142,
			135, 128, 149, 146, 155, 156, 177, 182, 191, 184, 173, 170, 163,
			164, 249, 254, 247, 240, 229, 226, 235, 236, 193, 198, 207, 200,
			221, 218, 211, 212, 105, 110, 103, 96, 117, 114, 123, 124, 81, 86,
			95, 88, 77, 74, 67, 68, 25, 30, 23, 16, 5, 2, 11, 12, 33, 38, 47,
			40, 61, 58, 51, 52, 78, 73, 64, 71, 82, 85, 92, 91, 118, 113, 120,
			127, 106, 109, 100, 99, 62, 57, 48, 55, 34, 37, 44, 43, 6, 1, 8, 15,
			26, 29, 20, 19, 174, 169, 160, 167, 178, 181, 188, 187, 150, 145,
			152, 159, 138, 141, 132, 131, 222, 217, 208, 215, 194, 197, 204,
			203, 230, 225, 232, 239, 250, 253, 244, 243,
		];
	}

	GetRamModelByName(ModelName) {
		for (const RamModel of Object.values(this.Models)) {
			if (
				RamModel.name === ModelName ||
				RamModel.shortName === ModelName
			) {
				return RamModel;
			}
		}

		return null;
	}
	GetModelIdFromSystem() {
		const ramInfo = systeminfo.GetRamInfo();

		if (!ramInfo) {
			return undefined;
		}

		for (let sticks = 0; sticks < ramInfo.length; sticks++) {
			const stick = ramInfo[sticks];
			const partNumber = stick.partNumber;
			device.log(`Ram stick part number: ${partNumber}`);

			const modelNum = partNumber.slice(0, 3);

			if (this.HasModel(modelNum)) {
				device.log(`Found matching ram stick part number: ${modelNum}`);

				return modelNum;
			}
		}

		device.log("No valid Model Number Found! Defaulting to SL");

		return "CMH";
	}

	SetRamToSystemId() {
		let ModelId;
		let attempts = 0;

		while (!ModelId && attempts < 10) {
			ModelId = this.GetModelIdFromSystem();
			attempts++;
			device.pause(500);
		}

		if (!ModelId) {
			device.log("No WMI return. Defaulting to SL.");
			ModelId = "CMH";
		}

		this.SetModelId(ModelId);
	}
	/**
	 * Sets the current ram type to the ModelId given
	 * @param {string} ModelId 3 character ram ModelId
	 */
	SetModelId(ModelId) {
		if (!this.HasModel(ModelId)) {
			device.log(
				`CorsairDominatorProtocol: SetModelId(): Unknown Model Id [${ModelId}]`
			);
			this.SetModelId("CMT"); // Default to Dominator Plat

			return;
		}

		this.Config.Model = this.Models[ModelId];
		// Update Device Info anytime the model changes
		this.SetDeviceSettings();
	}

	HasModel(ModelId) {
		return this.Models.hasOwnProperty(ModelId);
	}
	SetDeviceSettings() {
		const Model = this.Config.Model;

		device.setName(Model.name);
		device.setSize([2, Model.ledCount]);
		device.setImageFromUrl(Model.image);

		this.CreateLeds();
	}

	CreateLeds() {
		// Bash Old Led Info
		vLedNames = [];
		vLedPositions = [];

		const Model = this.Config.Model;

		for (let iIdx = 0; iIdx < Model.ledCount; iIdx++) {
			vLedNames.push(`Led ${iIdx + 1}`);
			vLedPositions.push([0, iIdx]);
		}

		// Tell SignalRGB We Changed These.
		device.setControllableLeds(vLedNames, vLedPositions);
	}
	/**
	 * Sends the given RGB data to the device.
	 * @param {number[]} RGBData RGB array containing 'RGBRGBRGB' style colors. Array cannot be larger then 36 bytes.
	 */
	SendRGBData(RGBData) {
		const packet = [];
		packet[0] = this.Commands.DirectRGB;

		packet.push(...RGBData);

		// Calc CRC.
		packet[37] = this.CalculateCRC(packet);
		bus.WriteBlock(this.Registers.DirectRGB, 32, packet.splice(0, 32));
		bus.WriteBlock(this.Registers.DirectRGB + 1, 6, packet.splice(0, 6));
	}

	/**
	 * calculates a CRC code for the given array.
	 * @param {number[]} data
	 */
	CalculateCRC(data) {
		let iCrc = 0;

		for (let iIdx = 0; iIdx < 37; iIdx++) {
			const iTableIdx = iCrc ^ data[iIdx];
			iCrc = this.PecTable[iTableIdx];
		}

		return iCrc;
	}

	CheckForDominatorRam(bus, address){
		if(!this.CheckForVendorMatch(bus, address)) {
			return false;
		}

		return this.CheckForModelMatch(bus, address);
	}


	CheckForVendorMatch(bus, address) {
		for(let attempts = 0; attempts < 5; attempts++) {
			const vendorByte = bus.ReadByte(address, this.Registers.Vender);
			bus.log(`Address ${address} has Vendor Byte ${vendorByte}`, {toFile: true});

			if (vendorByte === this.VendorId){
				return true;
			}
		}

		return false;
	}

	CheckForModelMatch(bus, address) {
		for(let attempts = 0; attempts < 5; attempts++) {
			const modelByte = bus.ReadByte(address, this.Registers.Model);
			bus.log(`Address ${address} has Model Byte ${modelByte}`, {toFile: true});


			if (this.ModelIds.includes(modelByte)){
				bus.log(`Dominator Ram hit on init attempt ${attempts}`, {toFile: true});

				return true;
			}
		}

		return false;
	}
}

const DominatorProtocol = new CorsairDominatorProtocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/ram.png";
}
