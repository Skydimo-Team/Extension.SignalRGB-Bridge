// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "Corsair Vengeance Pro Ram"; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/corsair"; }
export function Size() { return [2, 10]; }
export function DefaultPosition(){return [40, 30];}
export function DefaultScale(){return 10.0;}
export function Type() { return "SMBUS"; }
export function ConflictingProcesses() { return ["iCUE.exe"]; }
export function DeviceType(){return "ram"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"}
	];
}
export function Scan(bus) {

	const PossibleAddresses = [0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F];
	const FoundAddresses = [];

	// Skip any non AMD / INTEL Busses
	if (!bus.IsSystemBus()) {
		return [];
	}

	for (const address of PossibleAddresses) {
		if (bus.IsSystemBus()) {

			// Skip any address that fails a quick write
			if (bus.WriteQuick(address) !== 0){
				continue;
			}
			const vendor = bus.ReadByte(address, 0x43);

			if (vendor === 0x1C){
				const model = bus.ReadByte(address, 0x44);

				if (model === 0x03 || model === 0x04){
					bus.log("Vengeance Pro Ram found at: "+ address, {toFile : true});
					FoundAddresses.push(address);
				}
			}
		}
	}

	return FoundAddresses;
}

const vLedNames = [ "Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10" ];
const vLedPositions = [ [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9] ];
let iRamVersion = 0;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	GetRamVersion();
}

export function Render() {
	WritePacket();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		WritePacket("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		WritePacket(shutdownColor);
	}
}

function GetRamVersion() {
	iRamVersion = bus.ReadByte(0x44);
	device.log("Vengeance Ram Version: "+iRamVersion);

	if (iRamVersion === 3) {
		device.notify("Update RAM Firmware Through ICUE", "The Current Firmware version of your RAM is out of date. Please update using ICUE to get higher frame rates", 1);
	}
}

const vPecTable = [
	0,   7,   14,  9,   28,  27,  18,  21,  56,  63,  54,  49,  36,  35,  42,  45,  112, 119, 126, 121, 108, 107, 98,  101, 72,  79,
	70,  65,  84,  83,  90,  93,  224, 231, 238, 233, 252, 251, 242, 245, 216, 223, 214, 209, 196, 195, 202, 205, 144, 151, 158, 153,
	140, 139, 130, 133, 168, 175, 166, 161, 180, 179, 186, 189, 199, 192, 201, 206, 219, 220, 213, 210, 255, 248, 241, 246, 227, 228,
	237, 234, 183, 176, 185, 190, 171, 172, 165, 162, 143, 136, 129, 134, 147, 148, 157, 154, 39,  32,  41,  46,  59,  60,  53,  50,
	31,  24,  17,  22,  3,   4,   13,  10,  87,  80,  89,  94,  75,  76,  69,  66,  111, 104, 97,  102, 115, 116, 125, 122, 137, 142,
	135, 128, 149, 146, 155, 156, 177, 182, 191, 184, 173, 170, 163, 164, 249, 254, 247, 240, 229, 226, 235, 236, 193, 198, 207, 200,
	221, 218, 211, 212, 105, 110, 103, 96,  117, 114, 123, 124, 81,  86,  95,  88,  77,  74,  67,  68,  25,  30,  23,  16,  5,   2,
	11,  12,  33,  38,  47,  40,  61,  58,  51,  52,  78,  73,  64,  71,  82,  85,  92,  91,  118, 113, 120, 127, 106, 109, 100, 99,
	62,  57,  48,  55,  34,  37,  44,  43,  6,   1,   8,   15,  26,  29,  20,  19,  174, 169, 160, 167, 178, 181, 188, 187, 150, 145,
	152, 159, 138, 141, 132, 131, 222, 217, 208, 215, 194, 197, 204, 203, 230, 225, 232, 239, 250, 253, 244, 243];


function WritePacket(overrideColor) {
	if (iRamVersion === 4) {
		 WritePacketV4(overrideColor);
	}else{
		WritePacketV3(overrideColor);
	}
}

function WritePacketV3(overrideColor) {
	bus.WriteByte(0x10, 0x64);
	bus.WriteByte(0x28, 0x49);

	const packet = [ 0xB0, 0x00, 0xB0, 0x00, 0xB0, 0x00, 0xB0, 0x00, 0xB0, 0x00, 0xB0, 0x00, 0xB0, 0x00,
		0xB0, 0x00, 0xB0, 0x00, 0xB0, 0x00, 0xB0, 0xFC, 0xB0, 0xFE, 0xB0, 0xFC, 0xB0, 0xFE,
		0xB0, 0xFC, 0xB0, 0xFE, 0xB0, 0xFC, 0xB0, 0xFE, 0xB0, 0x00, 0xB0, 0xFF ];

	// Set Colors.
	for (let iIdx = 0; iIdx < 10; iIdx++){

		const iRedIdx = iIdx * 4 + 1;
		const iBlueIdx = iIdx * 4 + 3;
		const iGreenIdxA = iIdx * 4;
		const iGreenIdxB = iIdx * 4 + 2;

		let Color;

		if(overrideColor){
			Color = hexToRgb(overrideColor);
		}else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(vLedPositions[iIdx][0], vLedPositions[iIdx][1]);
		}

		packet[iRedIdx] = Color[0];
		packet[iBlueIdx] = Color[1];
		packet[iGreenIdxA] = 0xB0 | (Color[2] & 0x0F);
		packet[iGreenIdxB] = 0xB0 | (Color[2] >> 4);
	}

	// Calc CRC.
	let iCrc = 0;

	for (let iIdx = 0; iIdx < 40; iIdx += 2) {
		if (iIdx < 40) {
			let iTableIdx = iCrc ^ packet[iIdx];
			iCrc = vPecTable[iTableIdx];

			iTableIdx = iCrc ^ packet[iIdx + 1];
			iCrc = vPecTable[iTableIdx];
		}

		bus.WriteByte(packet[iIdx], packet[iIdx + 1]);
	}

	bus.WriteByte(0x28, iCrc);
}

function WritePacketV4(overrideColor) {
	const vLedPacket = [0x0A];

	// Set Colors.
	for (let iIdx = 0; iIdx < 10; iIdx++){

		let Color;

		if(overrideColor){
			Color = hexToRgb(overrideColor);
		}else if(LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		} else {
			Color = device.color(vLedPositions[iIdx][0], vLedPositions[iIdx][1]);
		}

		vLedPacket.push(...Color);
	}

	// Calc CRC.
	let iCrc = 0;

	for (let iIdx = 0; iIdx < 31; iIdx++) {
		if (iIdx < 31) {
			const iTableIdx = iCrc ^ vLedPacket[iIdx];
			iCrc = vPecTable[iTableIdx];
		}
	}

	vLedPacket[31] = iCrc;

	// Write block.
	bus.WriteBlock(0x31, 32, vLedPacket);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/ram/vengeance-rgb-pro.png";
}