import { Assert } from "@SignalRGB/Errors.js";
// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() {
	return "Gigabyte Gen 4 GPU";
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Documentation() {
	return "troubleshooting/gigabyte";
}
export function Type() {
	return "SMBUS";
}
export function Size() {
	return [6, 2];
}
export function LedNames() {
	return vLedNames;
}
export function LedPositions() {
	return vLedPositions;
}
export function ConflictingProcesses() {
	return ["RGBFusion.exe"];
}
export function DeviceType() {
	return "gpu";
}
export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/gigabyte/gpus/gpu.png";
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
			default: "#009bde",
		},
	];
}

let vLedNames = [];
/** @type {LedPosition[]} */
let vLedPositions = [];

/** @type {GigabyteGen4Protocol} */
let GigabyteGen4;

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	// Skip any non AMD / INTEL Busses
	if (!bus.IsNvidiaBus()) {
		return [];
	}

	for (const GPU of new GigabyteGen4GPUList().devices) {
		if (CheckForIdMatch(bus, GPU)) {
			bus.log(`Found Potential Gigabyte Gen4 GPU! [${GPU.Name}]`, {
				toFile: true,
			});

			/* DEPRECATED - Not all models/firmware returns a value
			const validAddress = checkModel(bus);

			if (!validAddress) {
				continue;
			}
			*/

			FoundAddresses.push(GPU.Address);
		}
	}

	return FoundAddresses;
}

function CheckForIdMatch(bus, Gpu) {
	return (
		Gpu.Vendor === bus.Vendor() &&
		Gpu.SubVendor === bus.SubVendor() &&
		Gpu.Device === bus.Product() &&
		Gpu.SubDevice === bus.SubDevice()
	);
}

function SetGPUNameFromBusIds(GPUList) {
	for (const GPU of GPUList) {
		if (CheckForIdMatch(bus, GPU)) {
			device.setName(GPU.Name);
			GigabyteGen4.version	= GPU.Model ?? "Default";
			GigabyteGen4.model		= GigabyteGen4.library[GPU.Model] ?? GigabyteGen4.library["Default"];
			// Eagle and AERO use different headers
			GigabyteGen4.header		= GigabyteGen4.library[GPU.Model].Header ?? [0x12, 0x01, 0x01, 0x06, 0x0A];
			break;
		}
	}
}

export function Initialize() {
	GigabyteGen4 = new GigabyteGen4Protocol();
	SetGPUNameFromBusIds(new GigabyteGen4GPUList().devices);
	GigabyteGen4.BuildLEDs();
}

export function Render() {
	GigabyteGen4.UpdateLeds();
}

export function Shutdown(SystemSuspending) {
	// Go Dark on System Sleep/Shutdown
	const color = SystemSuspending ? "#000000" : shutdownColor;

	GigabyteGen4.UpdateLeds(color);
}

function checkModel(bus) {
	const addressList = [0x75];
	const GigabyteGen4Ids  = new GigabyteGen4DeviceIds();

	for(let i = 0; i < addressList.length; i++) {
		const address = addressList[i];
		let returnPacket;

		if(bus.Type() === "Fixed") {
			bus.WriteBlockWithoutRegister(0x40, [0x11, 0x01]);
			returnPacket = bus.ReadBlockWithoutRegister(0x04);
		} else if(bus.Type() === "Free"){
			bus.WriteBlockWithoutRegister(address, 0x40, [0x11, 0x01]);
			returnPacket = bus.ReadBlockWithoutRegister(address, 0x04);
		}

		bus.log(
			`Model reported: 0x${returnPacket[1][2].toString(16)}${returnPacket[1][3].toString(16)}`,
			{ toFile: true }
		);

		const cardModel = parseInt(
			`0x${returnPacket[1][2].toString(16)}${returnPacket[1][3].toString(16)}`
		);

		if (Object.values(GigabyteGen4Ids).includes(cardModel)) {
			bus.log(`GPU Model found on library!`, { toFile: true });

			return address;
		}

		bus.log(`Model reported not found!`, { toFile: true });

		bus.pause(100);
	}
}

function grabLeds(zoneId, ZoneInfo, overrideColor) {
	const zonePositions = ZoneInfo.Positions;
	const RGBData = [];

	for (let zoneLeds = 0; zoneLeds < zonePositions.length; zoneLeds++) {
		let Color;
		const iPxX = zonePositions[zoneLeds][0];
		const iPxY = zonePositions[zoneLeds][1];

		if (overrideColor) {
			Color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(iPxX, iPxY);
		}

		RGBData[zoneLeds * 3] = Color[0];
		RGBData[zoneLeds * 3 + 1] = Color[1];
		RGBData[zoneLeds * 3 + 2] = Color[2];
	}

	GigabyteGen4.WriteRGB(RGBData, zoneId);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class GigabyteGen4Protocol {
	constructor(){
		this.library =
		{

			"AERO" :
			{
				Size: [1, 1],
				Zones:
				{
					0: {
						Names :		[ "Side logo" ],
						Positions : [ [0, 0] ],
						Mapping :	[ 0 ]
					},
				},
				Header: [0x16, 0x01, 0x00, 0x06, 0x00]
			},

			"EAGLE" :
			{
				Size: [1, 1],
				Zones:
				{
					0: {
						Names :		[ "Side strip" ],
						Positions : [ [0, 0] ],
						Mapping :	[ 0 ]
					},
				},
				Header: [0x16, 0x01, 0x00, 0x06, 0x00]
			},

			"GAMING" :
			{
				Size: [3, 2],
				Zones:
				{
					0: {
						Names :		[ "Fan 3" ],
						Positions : [ [2, 1] ],
						Mapping :	[ 0 ]
					},
					1: {
						Names :		[ "Fan 1" ],
						Positions : [ [0, 1] ],
						Mapping :	[ 0 ]
					},
					2: {
						Names :		[ "Fan 2" ],
						Positions : [ [1, 1] ],
						Mapping :	[ 0 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [2, 0] ],
						Mapping :	[ 0 ]
					}
				},
			},

			"GAMING2" :
			{
				Size: [6, 2],
				Zones:
				{
					0: {
						Names :		[ "LED 1" ],
						Positions : [ [0, 0] ],
						Mapping :	[ 0 ]
					},
					1: {
						Names :		[ "LED 2" ],
						Positions : [ [1, 0] ],
						Mapping :	[ 0 ]
					},
					2: {
						Names :		[ "LED 3" ],
						Positions : [ [2, 0] ],
						Mapping :	[ 0 ]
					},
					3: {
						Names :		[ "LED 4" ],
						Positions : [ [3, 0] ],
						Mapping :	[ 0 ]
					},
					4: {
						Names :		[ "LED 5" ],
						Positions : [ [4, 0] ],
						Mapping :	[ 0 ]
					},
					5: {
						Names :		[ "LED 6" ],
						Positions : [ [5, 0] ],
						Mapping :	[ 0 ]
					}
				},
			},

			"AORUS MASTER" :
			{
				Size: [3, 3],
				Zones:
				{
					0: {
						Names :		[ "Fan 3" ],
						Positions : [ [2, 1] ],
						Mapping :	[ 0 ]
					},
					1: {
						Names :		[ "Fan 1" ],
						Positions : [ [0, 1] ],
						Mapping :	[ 0 ]
					},
					2: {
						Names :		[ "Fan 2" ],
						Positions : [ [1, 1] ],
						Mapping :	[ 0 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [2, 1] ],
						Mapping :	[ 0 ]
					},
					5: {
						Names :		[ "Back Logo" ],
						Positions : [ [1, 0] ],
						Mapping :	[ 0 ]
					},
				}
			},

			"AORUS MASTER STUB" :
			{
				Size: [15, 8],
				Zones:
				{
					0: {
						Names :		[ "Fan 1 LED 1", "Fan 1 LED 2", "Fan 1 LED 3", "Fan 1 LED 4", "Fan 1 LED 5", "Fan 1 LED 6", "Fan 1 LED 7", "Fan 1 LED 8",],
						Positions : [ [0, 5], [1, 4], [2, 3], [3, 4], [4, 5], [3, 6], [2, 7], [1, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]
					},
					1: {
						Names :		[ "Fan 2 LED 1", "Fan 2 LED 2", "Fan 2 LED 3", "Fan 2 LED 4", "Fan 2 LED 5", "Fan 2 LED 6", "Fan 2 LED 7", "Fan 2 LED 8",],
						Positions : [ [5, 5], [6, 4], [7, 3], [8, 4], [9, 5], [8, 6], [7, 7], [6, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]
					},
					2: {
						Names :		[ "Fan 3 LED 1", "Fan 3 LED 2", "Fan 3 LED 3", "Fan 3 LED 4", "Fan 3 LED 5", "Fan 3 LED 6", "Fan 3 LED 7", "Fan 3 LED 8",],
						Positions : [ [10, 5], [11, 4], [12, 3], [13, 4], [14, 5], [13, 6], [12, 7], [11, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]
					},
					3: {
						Names :		[ "LED 4" ],
						Positions : [ [3, 0] ],
						Mapping :	[ 0 ]
					},
					4: {
						Names :		[ "LED 5" ],
						Positions : [ [4, 0] ],
						Mapping :	[ 0 ]
					},
					5: {
						Names :		[ "LED 6" ],
						Positions : [ [5, 0] ],
						Mapping :	[ 0 ]
					}
				}
			},

			"WATERFORCE" : 
			{
				Size: [2, 3],
				Zones: 
				{
					0: { 
						Names: 		[ "Logo" ],
						Positions: 	[ [0, 2] ],
						Mapping: 	[ 0 ] 
					},
					2: { 
						Names: 		[ "Fans" ],
						Positions: 	[ [1, 0] ],
						Mapping: 	[ 0 ] 
					},
					3: { 
						Names: 		[ "AORUS Front Text" ],
						Positions: 	[ [0, 0] ],
						Mapping: 	[ 0 ] 
					},
					4: { 
						Names: 		[ "AORUS Side Text" ],
						Positions: 	[ [0, 1] ],
						Mapping: 	[ 0 ]
					}
				}
			},

			"Default" :
			{
				Size: [6, 2],
				Zones:
				{
					0: {
						Names :		[ "LED 1" ],
						Positions : [ [0, 0] ],
						Mapping :	[ 0 ]
					},
					1: {
						Names :		[ "LED 2" ],
						Positions : [ [1, 0] ],
						Mapping :	[ 0 ]
					},
					2: {
						Names :		[ "LED 3" ],
						Positions : [ [2, 0] ],
						Mapping :	[ 0 ]
					},
					3: {
						Names :		[ "LED 4" ],
						Positions : [ [3, 0] ],
						Mapping :	[ 0 ]
					},
					4: {
						Names :		[ "LED 5" ],
						Positions : [ [4, 0] ],
						Mapping :	[ 0 ]
					},
					5: {
						Names :		[ "LED 6" ],
						Positions : [ [5, 0] ],
						Mapping :	[ 0 ]
					}
				},
			},

		};

		this.version	= "Default";
		this.model		= this.library["Default"];
		this.header		= [0x12, 0x01, 0x01, 0x06, 0x0A]; // Master header for all commands
	}

	UpdateLeds(overrideColor) {
		for(let zoneId = 0; zoneId < 6; zoneId++) {
			const zoneInfo = this.model.Zones[zoneId];

			if (zoneInfo) {
				grabLeds(zoneId, zoneInfo, overrideColor);
			} else {
				this.WriteEmptyZone(zoneId);
			}
		}
	}

	BuildLEDs() {
		vLedNames = [];
		vLedPositions = [];

		for (const [zoneId, ZoneInfo] of Object.entries(
			GigabyteGen4.model.Zones
		)) {
			vLedNames.push(...ZoneInfo.Names);
			vLedPositions.push(...ZoneInfo.Positions);
		}

		device.setSize(GigabyteGen4.model.Size);
		device.setControllableLeds(vLedNames, vLedPositions);

		if (GigabyteGen4.version === "Default") {
			Assert.isOk(
				this.library[bus.SubDevice()],
				`Mapping for card 0x${bus
					.SubDevice()
					.toString(16)} does not exist! Using Default.`
			);
		}
	}

	WritePerLED(RGBData, zoneId) {
		//also can take 12 a 1 6
		//bus.WriteBlockWithoutRegister(0x40, [0x12, 0x01, 0x01, 0x06, 0x0A, RGBData[0], RGBData[1], RGBData[2], 0x00, zoneId, 0x08].concat(RGBData));
		device.pause(30);
	}

	WriteRGB(RGBData, zoneId) {
		bus.WriteBlockWithoutRegister(0x40, this.header.concat([RGBData[0], RGBData[1], RGBData[2], 0x00, zoneId]));
		device.pause(9);
	}

	WriteEmptyZone(zoneId) {
		bus.WriteBlockWithoutRegister(0x40, [
			0x12,
			0x01,
			0x01,
			0x06,
			0x0a,
			0x00,
			0x00,
			0x00,
			0x00,
			zoneId,
		]);
		device.pause(9);
	}
}

class NvidiaGPUDeviceIds {
	constructor() {
		this.RTX5060	= 0x2D05;
		this.RTX5060TI	= 0x2D04;
		this.RTX5070	= 0x2F04;
		this.RTX5070TI	= 0x2C05;
		this.RTX5080	= 0x2C02;
		this.RTX5090	= 0x2B85;
		this.RTX5090D   = 0x2B8C;
	}
}

class GigabyteGen4DeviceIds {
	constructor() {

		this.RTX5060_AERO				 = 0x41A0;

		this.RTX5060TI_GAMING_OC		 = 0x4191;
		this.RTX5060TI_AERO				 = 0x4192;
		this.RTX5060TI_AORUS_MASTER		 = 0x4190;

		this.RTX5070_AORUS_MASTER		 = 0x4175;
		this.RTX5070_GAMING_OC 			 = 0x4174;
		this.RTX5070_EAGLE_OC			 = 0x4185;
		this.RTX5070_EAGLE_OC_SFF		 = 0x417D;
		this.RTX5070_AERO				 = 0x4184;

		this.RTX5070TI_EAGLE_OC			 = 0x4180;
		this.RTX5070TI_EAGLE_OC_ICE		 = 0x4182;
		this.RTX5070TI_GAMING_OC		 = 0x4181;
		this.RTX5070TI_AORUS_MASTER		 = 0x417B;
		this.RTX5070TI_AERO				 = 0x417F;

		this.RTX5080_GAMING_OC			 = 0x4176;
		this.RTX5080_AERO				 = 0x4179;
		this.RTX5080_WATERFORCE_WB		 = 0x418A;
		this.RTX5080_AORUS_MASTER_ICE	 = 0x418C;
		this.RTX5080_AORUS_MASTER		 = 0x4178;

		this.RTX5090_AORUS_MASTER_ICE	 = 0x4199;
		this.RTX5090_WATERFORCE_WB		 = 0x4172;
		this.RTX5090_WATERFORCE_WB_2	 = 0x4171;
		this.RTX5090_GAMING_OC			 = 0x416F;
		this.RTX5090_AORUS_MASTER		 = 0x416E;

		this.RTX5090D_AORUS_MASTER_ICE	 = 0x41CA;
	}
}

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
class GigabyteGen4Identifier extends GPUIdentifier {
	constructor(device, SubDevice, Address, Name, Model = "Default") {
		super(0x10de, 0x1458, device, SubDevice, Address, Name, Model);
	}
}
export function BrandGPUList() {
	return new GigabyteGen4GPUList().devices;
}

class GigabyteGen4GPUList {
	constructor() {
		const Nvidia = new NvidiaGPUDeviceIds();
		const GigabyteGen4Ids = new GigabyteGen4DeviceIds();

		this.devices = [
			new GigabyteGen4Identifier(Nvidia.RTX5060,			GigabyteGen4Ids.RTX5060_AERO,				0x75, "GIGABYTE 5060 AERO", "AERO"),

			new GigabyteGen4Identifier(Nvidia.RTX5060TI,	  GigabyteGen4Ids.RTX5060TI_GAMING_OC,			0x75, "GIGABYTE 5060Ti Gaming OC", "GAMING2"),
			new GigabyteGen4Identifier(Nvidia.RTX5060TI,	  GigabyteGen4Ids.RTX5060TI_AERO,				0x75, "GIGABYTE 5060Ti AERO", "AERO"),
			new GigabyteGen4Identifier(Nvidia.RTX5060TI,	  GigabyteGen4Ids.RTX5060TI_AORUS_MASTER,		0x75, "GIGABYTE 5060Ti AORUS Master", "AORUS MASTER"),

			new GigabyteGen4Identifier(Nvidia.RTX5070,        GigabyteGen4Ids.RTX5070_AORUS_MASTER,			0x75, "GIGABYTE 5070 AORUS Master", "AORUS MASTER"),
			new GigabyteGen4Identifier(Nvidia.RTX5070,        GigabyteGen4Ids.RTX5070_GAMING_OC,			0x75, "GIGABYTE 5070 Gaming OC", "GAMING"),
			new GigabyteGen4Identifier(Nvidia.RTX5070,		  GigabyteGen4Ids.RTX5070_EAGLE_OC,				0x75, "GIGABYTE 5070 Eagle OC", "EAGLE"),
			new GigabyteGen4Identifier(Nvidia.RTX5070,		  GigabyteGen4Ids.RTX5070_EAGLE_OC_SFF,			0x75, "GIGABYTE 5070 Eagle OC SFF", "EAGLE"),
			new GigabyteGen4Identifier(Nvidia.RTX5070,		  GigabyteGen4Ids.RTX5070_AERO,					0x75, "GIGABYTE 5070 AERO", "AERO"),

			new GigabyteGen4Identifier(Nvidia.RTX5070TI,	  GigabyteGen4Ids.RTX5070TI_EAGLE_OC,			0x75, "GIGABYTE 5070Ti Eagle OC", "EAGLE"),
			new GigabyteGen4Identifier(Nvidia.RTX5070TI,	  GigabyteGen4Ids.RTX5070TI_EAGLE_OC_ICE,		0x75, "GIGABYTE 5070Ti Eagle OC Ice", "EAGLE"),
			new GigabyteGen4Identifier(Nvidia.RTX5070TI,	  GigabyteGen4Ids.RTX5070TI_GAMING_OC,			0x75, "GIGABYTE 5070Ti Gaming OC", "GAMING"),
			new GigabyteGen4Identifier(Nvidia.RTX5070TI,	  GigabyteGen4Ids.RTX5070TI_AORUS_MASTER,		0x75, "GIGABYTE 5070Ti AORUS Master", "AORUS MASTER"),
			new GigabyteGen4Identifier(Nvidia.RTX5070TI,	  GigabyteGen4Ids.RTX5070TI_AERO,				0x75, "GIGABYTE 5070Ti AERO", "AERO"),

			new GigabyteGen4Identifier(Nvidia.RTX5080,        GigabyteGen4Ids.RTX5080_GAMING_OC,			0x75, "GIGABYTE 5080 Gaming OC", "GAMING"),
			new GigabyteGen4Identifier(Nvidia.RTX5080,		  GigabyteGen4Ids.RTX5080_AERO,					0x75, "GIGABYTE 5080 AERO", "AERO"),
			new GigabyteGen4Identifier(Nvidia.RTX5080, 	      GigabyteGen4Ids.RTX5080_WATERFORCE_WB,	    0x75, "GIGABYTE 5080 Waterforce WB", "WATERFORCE"),
			new GigabyteGen4Identifier(Nvidia.RTX5080,		  GigabyteGen4Ids.RTX5080_AORUS_MASTER_ICE,		0x75, "GIGABYTE 5080 AORUS Master Ice", "AORUS MASTER"),
			new GigabyteGen4Identifier(Nvidia.RTX5080,		  GigabyteGen4Ids.RTX5080_AORUS_MASTER,			0x75, "GIGABYTE 5080 AORUS Master", "AORUS MASTER"),

			new GigabyteGen4Identifier(Nvidia.RTX5090, 	      GigabyteGen4Ids.RTX5090_WATERFORCE_WB,	    0x75, "GIGABYTE 5090 Waterforce WB", "WATERFORCE"),
			new GigabyteGen4Identifier(Nvidia.RTX5090, 	      GigabyteGen4Ids.RTX5090_WATERFORCE_WB_2,	    0x75, "GIGABYTE 5090 Waterforce WB", "WATERFORCE"),
			new GigabyteGen4Identifier(Nvidia.RTX5090,        GigabyteGen4Ids.RTX5090_GAMING_OC,			0x75, "GIGABYTE 5090 Gaming OC", "GAMING"),
			new GigabyteGen4Identifier(Nvidia.RTX5090,        GigabyteGen4Ids.RTX5090_AORUS_MASTER_ICE,		0x75, "GIGABYTE 5090 AORUS Master", "AORUS MASTER"),
			new GigabyteGen4Identifier(Nvidia.RTX5090,        GigabyteGen4Ids.RTX5090_AORUS_MASTER,			0x75, "GIGABYTE 5090 AORUS Master", "AORUS MASTER"),

			new GigabyteGen4Identifier(Nvidia.RTX5090D,       GigabyteGen4Ids.RTX5090D_AORUS_MASTER_ICE,	0x75, "GIGABYTE 5090D V2 AORUS Master Ice", "AORUS MASTER"),
		];
	}
}
