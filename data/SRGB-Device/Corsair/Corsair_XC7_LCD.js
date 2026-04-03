import LCD from "@SignalRGB/lcd";

export function Name() {
	return "Corsair XC7 RGB ELITE LCD";
}
export function VendorId() {
	return 0x1b1c;
}
export function ProductId() {
	return 0x0c42;
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Size() {
	return [6, 6];
}
export function DeviceType() {
	return "lcd";
}
export function SubdeviceController() {
	return true;
}

/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
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

// Use the CorsairLink mutex any time this device is rendering.
// if we don't our reads may be ruined by other programs
export function UsesCorsairMutex() {
	return true;
}

const pollInterval = 30000;
let currentTime = Date.now();

const ringLedNames = [
	"Led 1",
	"Led 2",
	"Led 3",
	"Led 4",
	"Led 5",
	"Led 6",
	"Led 7",
	"Led 8",
	"Led 9",
	"Led 10",
	"Led 11",
	"Led 12",
	"Led 13",
	"Led 14",
	"Led 15",
	"Led 16",
	"Led 17",
	"Led 18",
	"Led 19",
	"Led 20",
	"Led 21",
	"Led 22",
	"Led 23",
	"Led 24",
	"Led 25",
	"Led 26",
	"Led 27",
	"Led 28",
	"Led 29",
	"Led 30",
	"Led 31",
];
const ringLedPositions = [
	[9, 9],
	[8, 10],
	[7, 11],
	[6, 12],
	[6, 12],
	[5, 12],
	[4, 12],
	[4, 12],
	[3, 11],
	[2, 10],
	[1, 9],
	[0, 8],
	[0, 7],
	[0, 6],
	[0, 6],
	[0, 5],
	[0, 5],
	[0, 4],
	[1, 3],
	[2, 2],
	[3, 1],
	[4, 0],
	[4, 0],
	[5, 0],
	[6, 0],
	[6, 0],
	[7, 1],
	[8, 2],
	[9, 3],
	[11, 6],
	[12, 6],
];

export function LedNames() {
	return [];
}

export function LedPositions() {
	return [];
}

let packetsSent = 0;

export function Initialize() {
	device.send_report([0x03, 0x1d, 0x01, 0x00], 32);
	device.get_report([0x03, 0x1d, 0x01, 0x00], 32); //Returns literally 3
	device.send_report([0x03, 0x19], 32);
	device.get_report([0x03, 0x19], 32);
	initRing();

	LCD.initialize({ width: 480, height: 480, circular: true });
}

export function Render() {
	pollLiquidTemp();
	colorgrabber();
	grabRing();
}

export function Shutdown(SystemSuspending) {
	device.send_report([0x03, 0x1e, 0x19, 0x01, 0x04, 0x00, 0xa3], 32);
	device.send_report([0x03, 0x1d, 0x00, 0x01, 0x04, 0x00, 0xa3], 32);
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;
const connectedProbes = [];

function Convert_To_16Bit(values) {
	let returnValue = 0;

	for (let i = 0; i < values.length; i++) {
		returnValue += values[i] << (8 * i);
	}

	return returnValue;
}

function pollLiquidTemp() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if (device.fanControlDisabled()) {
		return;
	}

	const liquidTempPacket = device.get_report([0x18], 32);

	const liquidTemp = Convert_To_16Bit(liquidTempPacket.slice(2, 4)) / 10;
	//device.log(`Liquid Temp: ${liquidTemp} C`);

	if (!connectedProbes.includes(0) && liquidTemp !== 0) {
		connectedProbes.push(0);
		device.createTemperatureSensor(`Liquid Temperature`);
	}

	if (liquidTemp !== 0) {
		device.SetTemperature(`Liquid Temperature`, liquidTemp);
	}
}

function colorgrabber() {
	const RGBData = LCD.getFrame({
		format: "JPEG",
	});

	let BytesLeft = RGBData.length;

	packetsSent = 0;

	while (BytesLeft > 0) {
		const BytesToSend = Math.min(1016, BytesLeft);

		if (BytesToSend < 1015) {
			const RGBDataToSend = RGBData.slice(1016 * packetsSent);

			sendZone(BytesToSend, RGBDataToSend, packetsSent, 0x01);
		} else {
			sendZone(
				BytesToSend,
				RGBData.slice(
					1016 * packetsSent,
					1016 * packetsSent + BytesToSend
				),
				packetsSent,
				0x00
			);
		}

		BytesLeft -= BytesToSend;
		packetsSent++;
	}
}

function initRing() {
	device.createSubdevice("Ring");
	device.setSubdeviceLeds("Ring", ringLedNames, ringLedPositions);
	device.setSubdeviceName("Ring", "LCD Ring");
	device.setSubdeviceImageUrl(
		"Ring",
		"https://assets.signalrgb.com/devices/brands/corsair/misc/link-xc7.png"
	);
	device.setSubdeviceSize("Ring", 13, 13);
}

function grabRing() {
	const RGBData = [];
	const LEDPositions = ringLedPositions;

	for (let iIdx = 0; iIdx < LEDPositions.length; iIdx++) {
		let col;
		const iPxX = LEDPositions[iIdx][0];
		const iPxY = LEDPositions[iIdx][1];

		if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.subdeviceColor("Ring", iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = col[0];
		RGBData[iLedIdx + 1] = col[1];
		RGBData[iLedIdx + 2] = col[2];
	}

	device.write([0x02, 0x07, 0x1f].concat(RGBData), 1024);
}

function sendZone(packetRGBDataLength, RGBData, packetsSent, finalPacket) {
	let packet = [
		0x02,
		0x05,
		0x1f,
		finalPacket,
		packetsSent,
		0x00,
		packetRGBDataLength & 0xff,
		(packetRGBDataLength >> 8) & 0xff,
	];
	packet = packet.concat(RGBData);

	const result = device.write(packet, 1024);

	if (Date.now() - currentTime >= pollInterval && finalPacket) {
		device.send_report(
			[
				0x03,
				0x19,
				0x1c,
				finalPacket,
				packetsSent,
				0x00,
				packetRGBDataLength & 0xff,
				(packetRGBDataLength >> 8) & 0xff,
			],
			32
		);
		currentTime = Date.now();
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/aio/lcd.png";
}
