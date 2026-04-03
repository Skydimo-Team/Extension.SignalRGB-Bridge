// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "Gigabyte Master GPU"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/gigabyte"; }
export function Type() { return "SMBUS"; }
export function Size() { return [6, 2]; }
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

let vLedNames = [ ];
/** @type {LedPosition[]} */
let vLedPositions = [ ];

/** @type {GigabyteMasterProtocol} */
let GigabyteMaster;

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const FoundAddresses = [];

	  // Skip any non AMD / INTEL Busses
	if (!bus.IsNvidiaBus()) {
		return [];
	}

	//CheckAllPotentialAddresses(bus);

	for(const GPU of new GigabyteMasterGPuList().devices) {
		if(CheckForIdMatch(bus, GPU)) {
			bus.log(`Found Potential Gigabyte Gen2 GPU! [${GPU.Name}]`, {toFile : true});

			if(GPU.Address === 0x50 || GigabyteVisionGpuCheck(bus, GPU.Address, true)){
				FoundAddresses.push(GPU.Address);
				bus.log(`Gigabyte Gen2 GPU passed read test! [${GPU.Name}]`, {toFile : true});
			}else{
				bus.log(`Gigabyte Gen2 GPU failed read test! [${GPU.Name}]`, {toFile : true});
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
	const ValidReturnCodes = [0x10, 0x11, 0x12, 0x14];
	// All Master Protocol GPU's use 8 byte writes
	const WriteLength = 8;

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
	GigabyteMaster = new GigabyteMasterProtocol();
	// We must do this before any other writes as a bad length will soft lock the GPU.
	GigabyteMaster.determineWriteLength();

	for(let zones = 0; zones < 8; zones++) {
		GigabyteMaster.setMode(GigabyteMaster.modes.static, zones);
	}

	GigabyteMaster.BuildLEDs();

	SetGPUNameFromBusIds(new GigabyteMasterGPuList().devices);
}

export function Render() {
	if(GigabyteMaster.config.perLEDSupport) {
		GigabyteMaster.UpdatePerLED();
	} else {
		grabStandardRGB();
	}

	device.pause(10);

}

export function Shutdown(SystemSuspending) {
	// Go Dark on System Sleep/Shutdown
	const color = SystemSuspending ? "#000000" : shutdownColor;

	if(GigabyteMaster.config.perLEDSupport) {
		GigabyteMaster.UpdatePerLED(color);
	} else {
		grabStandardRGB(color);
	}
}

function grabStandardRGB(overrideColor) {

	for(let Leds = 0; Leds < vLedPositions.length; Leds++) {
		let Color;
		const iPxX = vLedPositions[Leds][0];
		const iPxY = vLedPositions[Leds][1];

		if(overrideColor) {
			Color = hexToRgb(overrideColor);
		} else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(iPxX, iPxY);
		}

		GigabyteMaster.UpdateStandardLED(Color, Leds+1);
	}
}

function grabPerLEDRGB(zoneId, ZoneInfo, overrideColor) {
	const zonePositions = ZoneInfo.Positions;
	const RGBData = new Array(24);

	for(let zoneLeds = 0; zoneLeds < zonePositions.length; zoneLeds++) {
		let Color;
		const iPxX = zonePositions[zoneLeds][0];
		const iPxY = zonePositions[zoneLeds][1];

		if(overrideColor) {
			Color = hexToRgb(overrideColor);
		} else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(iPxX, iPxY);
		}

		RGBData[zoneLeds * 3] = Color[0];
		RGBData[zoneLeds * 3 + 1] = Color[1];
		RGBData[zoneLeds * 3 + 2] = Color[2];
	}

	GigabyteMaster.WritePerLEDRGB(RGBData, zoneId);
}


function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class GigabyteMasterProtocol {
	constructor(){

		this.registers =
		{
			Initialization: 0xAB,
			Mode: 0x88,
			Color: 0x40
		};

		this.modes =
		{
			static: 0x01,
			breathing: 0x02,
			flashing: 0x04,
			dualFlash: 0x08,
			specrum: 0x011
		};

		this.config =
		{
			perLEDSupport : false
		};

		this.library =
		{ //So it begins.
			0x3FF8 : // 2060S AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED 1", "Side Logo LED 2", "Face Logo LED", ],
						Positions : [ [11, 0], [12, 1], [12, 2],],
						Mapping :	[ 0, 1, 3 ]
					}
				}
			},
			0x3FF7 : // 2060S AORUS OC
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED 1", "Side Logo LED 2", "Face Logo LED", ],
						Positions : [ [11, 0], [12, 1], [12, 2],],
						Mapping :	[ 0, 1, 3 ]
					}
				}
			},
			0x3FF5 : // 2070S AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED 1", "Side Logo LED 2", "Face Logo LED", ],
						Positions : [ [11, 0], [12, 1], [12, 2],],
						Mapping :	[ 0, 1, 3 ]
					}
				}
			},
			0x3FF6 : // 2070S Gaming OC V2
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
				Zones:
				{
					0: {
						Names :		[ "Fan 1 LED 1", "Fan 1 LED 2", "Fan 1 LED 3", "Fan 1 LED 4", "Fan 1 LED 5", "Fan 1 LED 6", "Fan 1 LED 7", "Fan 1 LED 8",],
					 	Positions : [ [0, 5], [1, 4], [2, 3], [3, 4], [4, 5], [3, 6], [2, 7], [1, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]}
					,
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
						Names :		[ "Side Logo LED 1", "Side Logo LED 2", "Unknown LED", "Back Logo LED" ],
						Positions : [ [11, 0], [11, 0], [11, 0], [11, 0] ],
						Mapping :	[ 0, 1, 2, 3 ]
					}
				}
			},
			0x37B3 : // 2080 AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
				Zones:
				{
					0: {
						Names :		[ "Fan 1 LED 1", "Fan 1 LED 2", "Fan 1 LED 3", "Fan 1 LED 4", "Fan 1 LED 5", "Fan 1 LED 6", "Fan 1 LED 7", "Fan 1 LED 8",],
					 	Positions : [ [0, 5], [1, 4], [2, 3], [3, 4], [4, 5], [3, 6], [2, 7], [1, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					1: {
						Names :		[ "Fan 2 LED 1", "Fan 2 LED 2", "Fan 2 LED 3", "Fan 2 LED 4", "Fan 2 LED 5", "Fan 2 LED 6", "Fan 2 LED 7", "Fan 2 LED 8",],
						Positions : [ [5, 5], [6, 4], [7, 3], [8, 4], [9, 5], [8, 6], [7, 7], [6, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					2: {
						Names :		[ "Fan 3 LED 1", "Fan 3 LED 2", "Fan 3 LED 3", "Fan 3 LED 4", "Fan 3 LED 5", "Fan 3 LED 6", "Fan 3 LED 7", "Fan 3 LED 8",],
						Positions : [ [10, 5], [11, 4], [12, 3], [13, 4], [14, 5], [13, 6], [12, 7], [11, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					3: {
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]}
				}
			},
			0x3FF3 : // 2080S AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
				Zones:
				{
					0: {
						Names :		[ "Fan 1 LED 1", "Fan 1 LED 2", "Fan 1 LED 3", "Fan 1 LED 4", "Fan 1 LED 5", "Fan 1 LED 6", "Fan 1 LED 7", "Fan 1 LED 8",],
					 	Positions : [ [0, 5], [1, 4], [2, 3], [3, 4], [4, 5], [3, 6], [2, 7], [1, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					1: {
						Names :		[ "Fan 2 LED 1", "Fan 2 LED 2", "Fan 2 LED 3", "Fan 2 LED 4", "Fan 2 LED 5", "Fan 2 LED 6", "Fan 2 LED 7", "Fan 2 LED 8",],
						Positions : [ [5, 5], [6, 4], [7, 3], [8, 4], [9, 5], [8, 6], [7, 7], [6, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					2: {
						Names :		[ "Fan 3 LED 1", "Fan 3 LED 2", "Fan 3 LED 3", "Fan 3 LED 4", "Fan 3 LED 5", "Fan 3 LED 6", "Fan 3 LED 7", "Fan 3 LED 8",],
						Positions : [ [10, 5], [11, 4], [12, 3], [13, 4], [14, 5], [13, 6], [12, 7], [11, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					3: {
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]}
				}
			},
			0x3FF4 : // 2080S AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
				Zones:
				{
					0: {
						Names :		[ "Fan 1 LED 1", "Fan 1 LED 2", "Fan 1 LED 3", "Fan 1 LED 4", "Fan 1 LED 5", "Fan 1 LED 6", "Fan 1 LED 7", "Fan 1 LED 8",],
					 	Positions : [ [0, 5], [1, 4], [2, 3], [3, 4], [4, 5], [3, 6], [2, 7], [1, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					1: {
						Names :		[ "Fan 2 LED 1", "Fan 2 LED 2", "Fan 2 LED 3", "Fan 2 LED 4", "Fan 2 LED 5", "Fan 2 LED 6", "Fan 2 LED 7", "Fan 2 LED 8",],
						Positions : [ [5, 5], [6, 4], [7, 3], [8, 4], [9, 5], [8, 6], [7, 7], [6, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					2: {
						Names :		[ "Fan 3 LED 1", "Fan 3 LED 2", "Fan 3 LED 3", "Fan 3 LED 4", "Fan 3 LED 5", "Fan 3 LED 6", "Fan 3 LED 7", "Fan 3 LED 8",],
						Positions : [ [10, 5], [11, 4], [12, 3], [13, 4], [14, 5], [13, 6], [12, 7], [11, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					3: {
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]}
				}
			},
			0x37BF : // 2080TI AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
				Zones:
				{
					0: {
						Names :		[ "Fan 1 LED 1", "Fan 1 LED 2", "Fan 1 LED 3", "Fan 1 LED 4", "Fan 1 LED 5", "Fan 1 LED 6", "Fan 1 LED 7", "Fan 1 LED 8",],
					 	Positions : [ [0, 5], [1, 4], [2, 3], [3, 4], [4, 5], [3, 6], [2, 7], [1, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					1: {
						Names :		[ "Fan 2 LED 1", "Fan 2 LED 2", "Fan 2 LED 3", "Fan 2 LED 4", "Fan 2 LED 5", "Fan 2 LED 6", "Fan 2 LED 7", "Fan 2 LED 8",],
						Positions : [ [5, 5], [6, 4], [7, 3], [8, 4], [9, 5], [8, 6], [7, 7], [6, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					2: {
						Names :		[ "Fan 3 LED 1", "Fan 3 LED 2", "Fan 3 LED 3", "Fan 3 LED 4", "Fan 3 LED 5", "Fan 3 LED 6", "Fan 3 LED 7", "Fan 3 LED 8",],
						Positions : [ [10, 5], [11, 4], [12, 3], [13, 4], [14, 5], [13, 6], [12, 7], [11, 6], ],
						Mapping :	[ 0, 1, 2, 3, 4, 5, 6, 7 ]},
					3: {
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]}
				}
			},
			0x407B : // 3060 ELITE REV2
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x4076 : // 3060TI ELITE REV2
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x4105 : // 4060 AORUS
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x40F0 : // 4060Ti Elite
			{
				Size: [5, 3],
				modeZones : [0], //This is an odd card all the way around.
				Zones:
				{
					0: {
						Names : 	[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping : 	[ 0, 1, 2 ]
					},
					3: {
						Names : 	[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping : 	[ 0 ]
					}
				}
			},
			0x4100 : // 4070TI Gaming OC V2
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x40C6 : // 4070 GAMING OC 12G
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :	[ "Logo", "Placeholder 1", "Placeholder 2" ],
						Positions : [ [3, 1], [0, 0], [1, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x412B : // 4070 GAMING OC V2 12G
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :	[ "Logo", "Placeholder 1", "Placeholder 2" ],
						Positions : [ [3, 1], [0, 0], [1, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x4138 : // 4070 SUPER GAMING OC 12G
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED" ],
						Positions : [ [11, 0] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x40DF : // 4070TI GAMING 12G
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :		[ "Logo", "Placeholder 1", "Placeholder 2" ],
						Positions : [ [3, 1], [0, 0], [1, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x40C9 : // 4070TI ELITE
			{
				Size: [15, 8],
				modeZones : [2, 5, 6],
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
						Names :		[ "Side Logo LED 1", "Top Logo LED 1", "Unknown LED 1", "Unknown LED 2", "Unknown LED 3", ],
						Positions : [ [11, 0], [12, 2], [12, 2], [12, 2], [12, 2], ],
						Mapping :	[ 0, 2, 3, 4, 5 ]
					}
				}
			},
			0x4136 : // 4070Ti Super AORUS MASTER
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED 1", "Top Logo LED 1", "Unknown LED 1", "Unknown LED 2", "Unknown LED 3", ],
						Positions : [ [11, 0], [12, 2], [12, 2], [12, 2], [12, 2], ],
						Mapping :	[ 0, 2, 3, 4, 5 ]
					}
				}
			},
			0x413C : // 4070Ti Super Gaming OC
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names : 	[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping : 	[ 0, 1, 2 ]
					},
					3: {
						Names : 	[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping : 	[ 0 ]
					}
				}
			},
			0x40BC : // 4080 Gaming OC
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x4140 : // 4080 Super Gaming OC
			{
				Size: [5, 3],
				modeZones : [0],
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x40C0 : // 4090 AORUS MASTER
			{
				Size: [15, 8],
				modeZones : [2, 3, 5, 6],
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
						Names :		[ "Side Logo LED 1", "Top Logo LED 1", "Unknown LED 1", "Unknown LED 2", "Unknown LED 3", ],
						Positions : [ [11, 0], [12, 2], [12, 2], [12, 2], [12, 2], ],
						Mapping :	[ 0, 2, 3, 4, 5 ]
					}
				}
			},
			0x40BF : // 4090 Gaming OC
			{
				Size: [5, 3],
				modeZones : [0], //This is an odd card all the way around.
				Zones:
				{
					0: {
						Names :		[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping :	[ 0, 1, 2 ]
					},
					3: {
						Names :		[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping :	[ 0 ]
					}
				}
			},
			0x40E5 : // 4090 Gaming OC
			{
				Size: [5, 3],
				modeZones : [0], //This is an odd card all the way around.
				Zones:
				{
					0: {
						Names : 	[ "Fan 1", "Fan 2", "Fan 3" ],
						Positions : [ [1, 2], [2, 2], [3, 2] ],
						Mapping : 	[ 0, 1, 2 ]
					},
					3: {
						Names : 	[ "Logo" ],
						Positions : [ [3, 1] ],
						Mapping : 	[ 0 ]
					}
				}
			},
		};

		this.model = this.library[bus.SubDevice()];
	}

	determineWriteLength() {
		this.config.writeLength = [0x62, 0x71].includes(bus.GetAddress()) ? 8 : 4;
	}

	setMode(mode, zone) {

		const data = [this.registers.Mode, mode, 0x06, 0x63, 0x08, zone];

		const iRet = this.WriteBlockSafe(data);

		if(iRet < 0) {
			bus.log("Failed To Set Mode");
		}

		//bus.log(`Set Lighting Mode To [${mode}] and zone [${zone}]`);
	}

	UpdatePerLED(overrideColor) {
		this.setMode(this.modes.static, GigabyteMaster.model.modeZones[0]);

		for(const [zoneId, ZoneInfo] of Object.entries(GigabyteMaster.model.Zones)) {
			grabPerLEDRGB(zoneId, ZoneInfo, overrideColor);
		}
	}

	UpdateStandardLED(RGBData, led) {
		const packet = [this.registers.Color].concat(RGBData);
		packet.push(led);

		this.setMode(this.modes.static, led + 1);
		this.WriteBlockSafe(packet);
	}

	BuildLEDs() {
		vLedNames = [];
		vLedPositions = [];

		if(this.library[bus.SubDevice()]) {
			this.config.perLEDSupport = true;

			for(const [zoneId, ZoneInfo] of Object.entries(GigabyteMaster.model.Zones)) {
				vLedNames.push(...ZoneInfo.Names);
				vLedPositions.push(...ZoneInfo.Positions);
			}

			device.setSize(GigabyteMaster.model.Size);
		} else {  //NonPerLED Cards. Gigglebyte, why the inconsistency?
			vLedNames.push( ["Zone 1"], ["Zone 2"], ["Zone 3"], ["Zone 4"] );
			vLedPositions.push( [2, 1], [3, 1], [4, 1], [5, 1] );
			device.setSize([6, 2]);
		}


		device.setControllableLeds(vLedNames, vLedPositions);
	}

	WritePerLEDRGB(RGBData, zone) {

		for(let zonePackets = 0; zonePackets < 4; zonePackets++) {
			const zoneIdx = 0xB0 + ((zone)* 4) + zonePackets;
			const Data = [zoneIdx, 0x01];
			Data.push(...RGBData.splice(0, 6));
			this.WriteBlockSafe(Data);
		}
	}

	WriteBlockSafe(Data) {
		if(this.config.writeLength === -1) {
			bus.log("Invalid Write Length. Aborting Write Operation to Redetect...");
			this.determineWriteLength();

			return -1;
		}

		return bus.WriteBlockWithoutRegister(8, Data);
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
		this.RTX4060		 = 0x2882;
		this.RTX4060TI		 = 0x2803;
		this.RTX4070		 = 0x2786;
		this.RTX4070S        = 0x2783;
		this.RTX4070TI 		 = 0x2782;
		this.RTX4070TI_S	 = 0x2705;
		this.RTX4080		 = 0x2704;
		this.RTX4080_S		 = 0x2702;
		this.RTX4090		 = 0x2684;

		this.RTX5080		 = 0x2C02;
	}
};

const Nvidia = new NvidiaGPUDeviceIds();

class GigabyteMasterDeviceIds {
	constructor() {

		this.RTX2060S_AORUS_OC               = 0x3FF7;
		this.RTX2060S_AORUS_P                = 0x3FF8;

		this.RTX2070S_GAMING_OC_V2			 = 0x3FF6;
		this.RTX2070S_AORUS					 = 0x3FF5;

		this.RTX2080_AORUS					 = 0x37B3;
		this.RTX2080_EXTREME 				 = 0x37B1;

		this.RTX2080S_AORUS                  = 0x3FF3;
		this.RTX2080S_AORUS_P                = 0x3FF4;

		this.RTX2080TI_AORUS				 = 0x37BF;
		this.RTX2080TI_EXTREME				 = 0x37BD;
		this.RTX2080TI_EXTREME_11G			 = 0x37BC;
		this.RTX2080TI_WATERFORCE			 = 0x37b9;

		this.RTX3050_ELITE					 = 0x40B2;

		this.RTX3060_ELITE_REV2 			 = 0x407B;
		this.RTX3060_GAMING_OC_12GB          = 0x4074;
		this.RTX3060_MASTER_O08G             = 0x4051;

		this.RTX3060TI_ELITE_REV2			 = 0x4076;

		this.RTX3070_MASTER                  = 0x4069;

		this.RTX3070TI_MASTER                = 0x408E;

		this.RTX3080_XTREME_WATERFORCE       = 0x4038;
		this.RTX3080_XTREME_WATERFORCE_10G	 = 0x4037;
		this.RTX3080_XTREME_WATERFORCE_12G	 = 0x40A4;
		this.RTX3080_XTREME_WATERFORCE_12G_2 = 0x40A3;

		this.RTX3080TI_XTREME_WATERFORCE_12G = 0x4082;

		this.RTX3090_XTREME_WATERFORCE       = 0x403A;
		this.RTX3090_XTREME_WATERFORCE_2	 = 0x4039;

		this.RTX4060_AORUS					 = 0x4105;

		this.RTX4060TI_ELITE				 = 0x40F0;

		this.RTX4070_MASTER					 = 0x40E9;
		this.RTX4070_GAMING_OC_12G			 = 0x40C6;
		this.RTX4070_GAMING_OC_V2_12G		 = 0x412B;
		this.RTX4070_AERO_12G                = 0x4111;

		this.RTX4070S_GAMING_OC_12G			 = 0x4138;
		this.RTX4070_SUPER_AORUS_MASTER		 = 0x4137;

		this.RTX4070TI_GAMING_OC_V2			 = 0x4100;
		this.RTX4070TI_GAMING_12G			 = 0x40DF;
		this.RTX4070TI_GAMING_OC_12G		 = 0x40C6; // Yes, same PID for different SKUs
		this.RTX4070TI_ELITE				 = 0x40C9;
		this.RTX4070TI_XTREME_WATERFORCE	 = 0x40FC;

		this.RTX4070TI_SUPER_GAMING_OC_16G	 = 0x413C;
		this.RTX4070TI_SUPER_AORUS_MASTER	 = 0x4136;

		this.RTX4080_GAMING_OC_16G	    	 = 0x40bc;
		this.RTX4080_GAMING_OC_16G_2	     = 0x40bd;
		this.RTX4080_GAMING_OC_16G_3         = 0x40D7;
		this.RTX4080_XTREME_WATERFORCE		 = 0x40c8;

		this.RTX4080_SUPER_GAMING_OC_16G	 = 0x4140;
		this.RTX4080_SUPER_AORUS_MASTER      = 0x4135;
		this.RTX4080_SUPER_XTREME_ICE        = 0x4151;

		this.RTX4090_AORUS_MASTER 			 = 0x40C0;
		this.RTX4090_GAMING_OC_24GB			 = 0x40BF;
		this.RTX4090_GAMING_OC_24GB_2		 = 0x40E5;
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
class GigabyteMasterIdentifier extends GPUIdentifier {
	constructor(device, SubDevice, Address, Name) {
		super(0x10DE, 0x1458, device, SubDevice, Address, Name, "");
	}
}
export function BrandGPUList(){ return new GigabyteMasterGPuList().devices; }

class GigabyteMasterGPuList {
	constructor() {
		const Nvidia = new NvidiaGPUDeviceIds();
		const GigabyteMasterIds  = new GigabyteMasterDeviceIds();

		this.devices = [
			new GigabyteMasterIdentifier(Nvidia.RTX2060S,       GigabyteMasterIds.RTX2060S_AORUS_P,         		0x50, "GIGABYTE 2060 Super AORUS"),

			new GigabyteMasterIdentifier(Nvidia.RTX2060S_OC,    GigabyteMasterIds.RTX2060S_AORUS_OC,         		0x50, "GIGABYTE 2060 Super AORUS OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX2060S_OC,	GigabyteMasterIds.RTX2060S_AORUS_P,         		0x50, "GIGABYTE 2060 Super AORUS OC"),

			new GigabyteMasterIdentifier(Nvidia.RTX2070S,		GigabyteMasterIds.RTX2070S_GAMING_OC_V2,			0x50, "GIGABYTE 2070 Super Gaming OC V2"),
			new GigabyteMasterIdentifier(Nvidia.RTX2070S,		GigabyteMasterIds.RTX2070S_AORUS,					0x50, "GIGABYTE 2070 Super AORUS"),

			new GigabyteMasterIdentifier(Nvidia.RTX2080_A,		GigabyteMasterIds.RTX2080_AORUS,					0x50, "GIGABYTE 2080 AORUS"),
			new GigabyteMasterIdentifier(Nvidia.RTX2080_A,		GigabyteMasterIds.RTX2080S_AORUS,					0x50, "GIGABYTE 2080 Super AORUS"),
			new GigabyteMasterIdentifier(Nvidia.RTX2080_A, 		GigabyteMasterIds.RTX2080_EXTREME,					0x50, "GIGABYTE 2080 Extreme"),

			new GigabyteMasterIdentifier(Nvidia.RTX2080S,       GigabyteMasterIds.RTX2080S_AORUS,         			0x50, "GIGABYTE 2080 Super AORUS"),
			new GigabyteMasterIdentifier(Nvidia.RTX2080S,       GigabyteMasterIds.RTX2080S_AORUS_P,         		0x50, "GIGABYTE 2080 Super AORUS"),

			new GigabyteMasterIdentifier(Nvidia.RTX2080TI,		GigabyteMasterIds.RTX2080TI_AORUS,					0x50, "GIGABYTE 2080Ti AORUS"),
			new GigabyteMasterIdentifier(Nvidia.RTX2080TI, 		GigabyteMasterIds.RTX2080TI_EXTREME,				0x50, "GIGABYTE 2080Ti Extreme"),
			new GigabyteMasterIdentifier(Nvidia.RTX2080TI, 		GigabyteMasterIds.RTX2080TI_WATERFORCE,				0x52, "GIGABYTE 2080Ti XTREME Waterforce"),
			//new GigabyteMasterIdentifier(Nvidia.RTX2080TI, 		GigabyteMasterIds.RTX2080TI_EXTREME_11G,           0x50, "GIGABYTE 2080TI Extreme 11G"), https://discord.com/channels/951628333504925756/1084435323938951168

			new GigabyteMasterIdentifier(Nvidia.RTX3050,  	    GigabyteMasterIds.RTX3050_ELITE,					0x70, "GIGABYTE 3050 AORUS Elite"),

			new GigabyteMasterIdentifier(Nvidia.RTX3060_LHR,	GigabyteMasterIds.RTX3060_ELITE_REV2,				0x70, "GIGABYTE 3060 AORUS Elite REV2 LHR"),
			new GigabyteMasterIdentifier(Nvidia.RTX3060_LHR,    GigabyteMasterIds.RTX3060_GAMING_OC_12GB,        	0x32, "GIGABYTE 3060 Gaming OC LHR"),
			new GigabyteMasterIdentifier(Nvidia.RTX3060_LHR,    GigabyteMasterIds.RTX3060_GAMING_OC_12GB,        	0x62, "GIGABYTE 3060 Gaming OC LHR"),

			new GigabyteMasterIdentifier(Nvidia.RTX3060_GA104,	GigabyteMasterIds.RTX3060_ELITE_REV2,				0x70, "GIGABYTE 3060 AORUS Elite REV2 LHR"),
			new GigabyteMasterIdentifier(Nvidia.RTX3060_GA104,  GigabyteMasterIds.RTX3060_GAMING_OC_12GB,        	0x32, "GIGABYTE 3060 Gaming OC"),

			new GigabyteMasterIdentifier(Nvidia.RTX3060TI,		GigabyteMasterIds.RTX3060_MASTER_O08G,       		0x66, "GIGABYTE 3060Ti AORUS Master 8GB"),

			new GigabyteMasterIdentifier(Nvidia.RTX3060TI_LHR,  GigabyteMasterIds.RTX3060TI_ELITE_REV2,				0x70, "GIGABYTE 3060Ti AORUS Elite REV2 LHR"),

			new GigabyteMasterIdentifier(Nvidia.RTX3070,        GigabyteMasterIds.RTX3070_MASTER,         			0x66, "GIGABYTE 3070 AORUS Master 8GB"),

			new GigabyteMasterIdentifier(Nvidia.RTX3070_LHR,	GigabyteMasterIds.RTX3070_MASTER,					0x66, "GIGABYTE 3070 AORUS Master 8GB LHR"),

			new GigabyteMasterIdentifier(Nvidia.RTX3070TI,		GigabyteMasterIds.RTX3070TI_MASTER,         		0x70, "GIGABYTE 3070Ti AORUS Master 8GB"),

			new GigabyteMasterIdentifier(Nvidia.RTX3080,        GigabyteMasterIds.RTX3080_XTREME_WATERFORCE,   		0x64, "GIGABYTE 3080 AORUS XTREME Waterforce 10GB"),
			new GigabyteMasterIdentifier(Nvidia.RTX3080,        GigabyteMasterIds.RTX3080_XTREME_WATERFORCE_10G,	0x65, "GIGABYTE 3080 AORUS XTREME Waterforce 10GB"),

			new GigabyteMasterIdentifier(Nvidia.RTX3080_GA102,	GigabyteMasterIds.RTX3080_XTREME_WATERFORCE_12G,	0x65, "GIGABYTE 3080 AORUS XTREME Waterforce 12GB GA102"),
			new GigabyteMasterIdentifier(Nvidia.RTX3080_GA102,	GigabyteMasterIds.RTX3080_XTREME_WATERFORCE_12G_2,	0x64, "GIGABYTE 3080 AORUS XTREME Waterforce 12GB GA102"),

			new GigabyteMasterIdentifier(Nvidia.RTX3080_LHR,    GigabyteMasterIds.RTX3080_XTREME_WATERFORCE_10G,	0x65, "GIGABYTE 3080 AORUS XTREME Waterforce 10GB"),
			new GigabyteMasterIdentifier(Nvidia.RTX3080_LHR,	GigabyteMasterIds.RTX3080_XTREME_WATERFORCE,		0x64, "GIGABYTE 3080 AORUS XTREME Waterforce 10GB LHR"),

			new GigabyteMasterIdentifier(Nvidia.RTX3080TI,      GigabyteMasterIds.RTX3080TI_XTREME_WATERFORCE_12G,	0x64, "GIGABYTE 3080Ti AORUS XTREME Waterforce 12GB"),

			new GigabyteMasterIdentifier(Nvidia.RTX3090,        GigabyteMasterIds.RTX3090_XTREME_WATERFORCE,		0x64, "GIGABYTE 3090 AORUS XTREME Waterforce 24GB"),
			new GigabyteMasterIdentifier(Nvidia.RTX3090,        GigabyteMasterIds.RTX3090_XTREME_WATERFORCE_2,		0x65, "GIGABYTE 3090 AORUS XTREME Waterforce 24GB"),

			new GigabyteMasterIdentifier(Nvidia.RTX4060, 		GigabyteMasterIds.RTX4060_AORUS,					0x71, "GIGABYTE 4060 AORUS Elite"),

			new GigabyteMasterIdentifier(Nvidia.RTX4060TI, 		GigabyteMasterIds.RTX4060TI_ELITE,					0x71, "GIGABYTE 4060Ti AORUS Elite"),

			new GigabyteMasterIdentifier(Nvidia.RTX4070, 		GigabyteMasterIds.RTX4070_GAMING_OC_12G,			0x71, "GIGABYTE 4070 Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070, 		GigabyteMasterIds.RTX4070_GAMING_OC_V2_12G,			0x71, "GIGABYTE 4070 Gaming V2 OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070, 		GigabyteMasterIds.RTX4070_MASTER,					0x71, "GIGABYTE 4070 AORUS Master"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070, 		GigabyteMasterIds.RTX4070_AERO_12G,				    0x71, "GIGABYTE 4070 AERO 12G"),

			new GigabyteMasterIdentifier(Nvidia.RTX4070S, 		GigabyteMasterIds.RTX4070S_GAMING_OC_12G,			0x71, "GIGABYTE 4070 Super Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070S, 		GigabyteMasterIds.RTX4070_SUPER_AORUS_MASTER,		0x71, "GIGABYTE 4070 Super AORUS Master"),

			new GigabyteMasterIdentifier(Nvidia.RTX4070TI, 		GigabyteMasterIds.RTX4070TI_GAMING_12G,				0x71, "GIGABYTE 4070Ti Gaming"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070TI, 		GigabyteMasterIds.RTX4070TI_GAMING_OC_12G,			0x71, "GIGABYTE 4070Ti Gaming OC"), // Yes, same PID for different SKUs
			new GigabyteMasterIdentifier(Nvidia.RTX4070TI, 		GigabyteMasterIds.RTX4070TI_GAMING_OC_V2,			0x71, "GIGABYTE 4070Ti Gaming OC V2"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070TI, 		GigabyteMasterIds.RTX4070TI_ELITE,					0x71, "GIGABYTE 4070Ti Elite 12G"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070TI, 		GigabyteMasterIds.RTX4070TI_XTREME_WATERFORCE,		0x64, "GIGABYTE 4070Ti AORUS XTREME Waterforce"),

			new GigabyteMasterIdentifier(Nvidia.RTX4070TI_S,	GigabyteMasterIds.RTX4070TI_SUPER_GAMING_OC_16G,	0x71, "GIGABYTE 4070Ti Super Gaming OC 16GB"),
			new GigabyteMasterIdentifier(Nvidia.RTX4070TI_S,	GigabyteMasterIds.RTX4070TI_SUPER_AORUS_MASTER,		0x71, "GIGABYTE 4070Ti Super AORUS Master"),

			new GigabyteMasterIdentifier(Nvidia.RTX4080, 		GigabyteMasterIds.RTX4080_GAMING_OC_16G,			0x71, "GIGABYTE 4080 Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4080, 		GigabyteMasterIds.RTX4080_GAMING_OC_16G_2,			0x71, "GIGABYTE 4080 Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4080, 		GigabyteMasterIds.RTX4080_GAMING_OC_16G_3,			0x71, "GIGABYTE 4080 Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4080, 		GigabyteMasterIds.RTX4080_XTREME_WATERFORCE,		0x64, "GIGABYTE 4080 XTREME Waterforce 16GB"), //This card is single zone. Older ones were multizone. We'll see if it plays ball or not with sending multiple zones.

			new GigabyteMasterIdentifier(Nvidia.RTX4080_S, 		GigabyteMasterIds.RTX4080_SUPER_GAMING_OC_16G,		0x72, "GIGABYTE 4080 Super Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4080_S, 		GigabyteMasterIds.RTX4080_SUPER_AORUS_MASTER,		0x71, "GIGABYTE 4080 Super AORUS Master"),
			new GigabyteMasterIdentifier(Nvidia.RTX4080_S, 		GigabyteMasterIds.RTX4080_SUPER_XTREME_ICE,		    0x71, "GIGABYTE 4080 Super XTREME ICE"),

			new GigabyteMasterIdentifier(Nvidia.RTX4090,        GigabyteMasterIds.RTX4090_GAMING_OC_24GB,			0x71, "GIGABYTE 4090 Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4090,        GigabyteMasterIds.RTX4090_GAMING_OC_24GB_2,			0x71, "GIGABYTE 4090 Gaming OC"),
			new GigabyteMasterIdentifier(Nvidia.RTX4090, 		GigabyteMasterIds.RTX4090_AORUS_MASTER,				0x71, "GIGABYTE 4090 AORUS Master"),

		];
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/gigabyte/gpus/gpu.png";
}