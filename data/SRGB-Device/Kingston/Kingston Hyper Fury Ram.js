import systeminfo from "@SignalRGB/systeminfo";
/// <reference path="./Kingston_Hyper_Fury_Ram.d.ts" />
// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() {
	return "Kingston Hyper Fury Ram";
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
	return [2, 12];
}
export function DefaultPosition() {
	return [150, 40];
}
export function DefaultScale() {
	return 10.0;
}
export function DeviceType() {
	return "ram";
}
export function ConflictingProcesses() {
	return ["FuryControllerService.exe"];
}
export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/kingston/ram/fury-ddr5.png";
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
highSpeedMode:readonly
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
	  description: "The color used when 'Forced' Lighting Mode is enabled",
	  min: "0",
	  max: "360",
	  type: "color",
	  default: "#009bde",
		},
		{
	  property: "highSpeedMode",
	  group: "lighting",
	  label: "Single Color Mode (Higher Speed)",
	  description:
		"Sets the stick to work on single-mode only. This will result in higher frame rates",
	  type: "boolean",
	  default: "false",
		},
	];
}

/** @type {LedPosition[]} */
const vPerLEDLedPositions = [
	[0, 11],
	[0, 10],
	[0, 9],
	[0, 8],
	[0, 7],
	[0, 6],
	[0, 5],
	[0, 4],
	[0, 3],
	[0, 2],
	[0, 1],
	[0, 0],
];
const vPerLEDLedNames = [
	"Led 12",
	"Led 11",
	"Led 10",
	"Led 9",
	"Led 8",
	"Led 7",
	"Led 6",
	"Led 5",
	"Led 4",
	"Led 3",
	"Led 2",
	"Led 1",
];

/** @type {LedPosition[]} */
const vSingleLEDPosition = [[0, 5]];
const vSingleLEDName = ["Main LED"];

let vLedNames = vPerLEDLedNames;
let vLedPositions = vPerLEDLedPositions;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	SetMode();
	setLEDs();
}

export function Render() {
	if (highSpeedMode) {
		sendSingleColor();
	} else {
		SendColors();
		device.pause(10);
	}
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;

	if (highSpeedMode) {
		sendSingleColor(color);
	} else {
		SendColors(color);
	}
}

export function onhighSpeedModeChanged() {
	setLEDs();

	if (!highSpeedMode) {
		SetMode();
	}
}

function SystemHasFuryRam(bus) {
	const ramInfo = systeminfo.GetRamInfo();

	if (!ramInfo) {
		bus.log("System Ram Info Not Available!", { toFile: true });

		return false;
	}

	const validPrefixes = ["KF", "HP"];

	for (let stick = 0; stick < ramInfo.length; stick++) {
		const { partNumber } = ramInfo[stick];
		bus.log(`Checking Ram stick part number: ${partNumber}`, {
	  		toFile: true,
		});

		const modelNum = partNumber.slice(0, 2);

		if (ramInfo[stick].manufacturer != "Kingston") {
	  		continue;
		}

	  	bus.log(`Ram stick has a valid Manufacturer: ${ramInfo[stick].manufacturer}`, {
			toFile: true,
		});

		if (validPrefixes.includes(modelNum)) {
			return true;
		}

	}

	return false;
}

export function Scan(bus) {

	// Skip any non AMD / INTEL Busses
	if (!bus.IsSystemBus()) {
		return [];
	}

	const PossibleAddresses = [0x60, 0x61, 0x62, 0x63, 0x58, 0x59, 0x5a, 0x5b];

	const FoundAddresses = [];

	bus.log(`"Scanning for Kingston Hyper Fury Ram..."`, { toFile: true });

	if (!SystemHasFuryRam(bus)) {
		bus.log("System Does Not Have Fury Ram Installed!", { toFile: true });

		return [];
	}

	bus.log("System Has Fury Ram Installed!", { toFile: true });

	for (const addr of PossibleAddresses) {
		const validAddress = bus.WriteQuick(addr);
		bus.pause(30);

		// Skip any address that fails a quick write
		if (validAddress !== 0) {
			continue;
		}

		bus.log(
			`Address ${addr} passed quick write test with result ${validAddress}`,
			{ toFile: true }
		);

		const found = CheckForHyperFuryRam(bus, addr);

		bus.log(
			`Kingston Hyper Fury Ram ${found ? "" : "Not"} Found At Address: ${addr}`,
			{ toFile: true,	}
		);

		if (found) {
			FoundAddresses.push(addr);
		}
	}

	return FoundAddresses;
}

function setLEDs() {
	if (highSpeedMode) {
		vLedNames = vSingleLEDName;
		vLedPositions = vSingleLEDPosition;
	} else {
		vLedNames = vPerLEDLedNames;
		vLedPositions = vPerLEDLedPositions;
	}

	device.setControllableLeds(vLedNames, vLedPositions);
}

function CheckForHyperFuryRam(bus, addr) {
	// Note: I removed the checks for spd info
	// These should not be necessary considering the fact that we check both if the stick returns 'FURY' AND if it is one of the Fury models

	// Handle Address collision.
	//Avoid unproperly setting the PWM controller CPU voltage
	const PWMCheck_byte = bus.ReadByte(addr, 0xdd);

	//RT3678 and RT3672
	if (PWMCheck_byte === 0x72 || PWMCheck_byte === 0x78) {
		bus.log(
	  `Skipping Address due to RT PWM controller being detected. Return: ${PWMCheck_byte}`,
	  { toFile: true }
		);

		return false;
	}

	let attempts = 0;
	let deviceCheck = false;

	bus.WriteByte(addr, 0x08, 0x53);

	const validDeviceNames = [
		[0x46, 0x55, 0x52, 0x59], //FURY
		[0x06, 0x55, 0x52, 0x59], //AckURY
		[0x07, 0xe0, 0xff, 0xff], //????
	].map(JSON.stringify);

	while (attempts < 5) {
		attempts++;

		//This should always hit on the first attempt, but conflicting apps can break stuff.
		const nameReturnBytes = [];

		// Read the first 4 bytes of the model address
		for (let bytesToRead = 0; bytesToRead < 4; bytesToRead++) {
			bus.pause(30);

			const returnByte = BinaryUtils.WriteInt16LittleEndian(
				bus.ReadWord(addr, bytesToRead + 1)
			);
			nameReturnBytes.push(returnByte[1]);
		}

		bus.log(
			`Fury Identifier Return: ${nameReturnBytes} | Expected one of: ${validDeviceNames}`,
			{ toFile: true }
		);

		const deviceName = String.fromCharCode(...nameReturnBytes);

		bus.log(`Device Name Return: ${deviceName}`, { toFile: true });

		// Check if the address reported as a Kingston Hyper Fury RAM
		if (validDeviceNames.includes(JSON.stringify(nameReturnBytes))) {
		// Check if there's any Kingston Fury RAM according to WMI
			bus.log(`Device hit on attempt number: ${attempts}`, {
				toFile: true,
			});
			deviceCheck = true;
			break;
		}
	}

	bus.WriteByte(addr, 0x08, 0x44);

	return deviceCheck;
}

function SetMode() {
	CheckedWrite(0x08, 0x53); //start Command
	CheckedWrite(0x0b, 0x00); //LED index
	CheckedWrite(0x09, 0x10); //Mode set to direct

	CheckedWrite(0x0c, 0x01); //Effect Direction. Why does this even need set when we're in direct mode??!?!?!
	CheckedWrite(0x20, 0x50); //Brightness, why does this get set to 0x50/80?

	CheckedWrite(0x08, 0x44); //End Command
}

function SendColors(overrideColor) {
	const RGBData = [];

	//Fetch Colors
	for (let iIdx = 0; iIdx < vLedPositions.length; iIdx++) {
		let Color;

		if (overrideColor) {
	  Color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
	  Color = hexToRgb(forcedColor);
		} else {
	  Color = device.color(vLedPositions[iIdx][0], vLedPositions[iIdx][1]);
		}

		RGBData.push(...Color);
	}

	WriteRGBData(RGBData);
}

let lastRGBData = [];

function sendSingleColor(overrideColor) {
	let Color;

	if (overrideColor) {
		Color = hexToRgb(overrideColor);
	} else if (LightingMode === "Forced") {
		Color = hexToRgb(forcedColor);
	} else {
		Color = device.color(vSingleLEDPosition[0][0], vSingleLEDPosition[0][1]);
	}

	if (!CompareArrays(lastRGBData, Color)) {
		bus.WriteByte(0x08, 0x53);
		device.pause(1);
		bus.WriteByte(0x09, 0x00);
		device.pause(1);
		bus.WriteByte(0x30, 0x01);
		device.pause(1);

		for (let bytes = 0; bytes < 3; bytes++) {
	  bus.WriteByte(0x31 + bytes, Color[bytes]);
	  device.pause(1);
		}

		bus.WriteByte(0x08, 0x44); // End Command
		device.pause(1);
		lastRGBData = Color;
	}
}

function CheckedWrite(register, byte) {
	let returnCode = bus.WriteByte(register, byte);
	let attempts = 0;

	if (returnCode != 0 && attempts < 5) {
		device.pause(5);
		returnCode = bus.WriteByte(register, byte);
		attempts += 1;
	}

	return returnCode === 0;
}

const OldRGBData = [];

function WriteRGBData(RGBData) {
	bus.WriteByte(0x08, 0x53);
	device.pause(3);

	for (let i = 0; i < RGBData.length; i++) {
		if (RGBData[i] === OldRGBData[i]) {
	  continue;
		}

		const success = CheckedWrite(0x50 + i, RGBData[i]);

		if (success) {
	  OldRGBData[i] = RGBData[i];
		} else {
	  device.log("Failed To Write Byte within 5 attempts!");
		}
	}

	bus.WriteByte(0x08, 0x44);
	device.pause(3);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function CompareArrays(array1, array2) {
	return (
		array1.length === array2.length &&
	array1.every(function (value, index) {
	  return value === array2[index];
	})
	);
}

class BinaryUtils {
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
