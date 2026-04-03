import LCD from "@SignalRGB/lcd";
export function Name() {
	return "Lian Li Galahad II LCD";
}
export function VendorId() {
	return 0x0416;
}
export function ProductId() {
	return 0x7395;
}
export function Publisher() {
	return "WhirlwindFX";
}
export function Size() {
	return [1, 1];
}
export function ConflictingProcesses() {
	return ["L-Connect-Service.exe", "L-Connect-Service-Watcher.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
fanMode:readonly
*/
export function ControllableParameters() {
	return [
		{
			property: "shutdownColor",
			group: "lighting",
			label: "Shutdown Color",
			min: "0",
			max: "360",
			type: "color",
			default: "#009bde",
		},
		{
			property: "LightingMode",
			group: "lighting",
			label: "Lighting Mode",
			type: "combobox",
			values: ["Canvas", "Forced"],
			default: "Canvas",
		},
		{
			property: "forcedColor",
			group: "lighting",
			label: "Forced Color",
			min: "0",
			max: "360",
			type: "color",
			default: "#009bde",
		},
		{
			property: "fanMode",
			group: "fan",
			label: "Fan Mode",
			type: "combobox",
			values: ["SignalRGB", "PWM"],
			default: "SignalRGB",
		},
	];
}

export function DefaultComponentBrand() {
	return "LianLi";
}
export function SupportsFanControl() {
	return true;
}
export function SubdeviceController() {
	return true;
}

const DeviceMaxLedLimit = 50;
const pollInterval = 1000;
let currentTime = Date.now();

//Channel Name, Led Limit
const ChannelArray = [["Channel 1", 50]];

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for (let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

const vPumpLedNames = [
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
];
const vPumpLedPos = [
	[0, 0],
	[1, 0],
	[2, 0],
	[3, 0],
	[4, 0],
	[5, 0],
	[6, 0],
	[7, 0],
	[8, 0],
	[9, 0],
	[10, 0],
	[11, 0],
];
const vPumpLeds = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const ConnectedProbes = [];
const ConnectedFans = [];

export function LedNames() {
	return [];
}

export function LedPositions() {
	return [];
}

export function Initialize() {
	spawnPumpObject();
	SetupChannels();
	Galahad.setPumpSpeed(50, fanMode === "PWM" ? 0x01 : 0x00);

	Galahad.setFanColors();
	Galahad.setPumpColors();
	Galahad.fetchRPM();
	LCD.initialize({ width: 480, height: 480 });
}

export function Render() {
	colorgrabber();
	Galahad.setPumpPerLED();
	Galahad.setFansPerLED();

	if (Date.now() - currentTime >= pollInterval) {
		Galahad.fetchRPM();
		currentTime = Date.now();
	}

	if (fanMode === "SignalRGB") {
		PollFans();
	}
}

export function Shutdown() {
	Galahad.setFansPerLED(true);
	Galahad.setPumpPerLED(true);
}

export function onfanModeChanged() {
	Galahad.setPumpSpeed(50, fanMode === "PWM" ? 0x01 : 0x00);

	if (fanMode === "PWM") {
		destroyFans();
	}
}

function spawnPumpObject() {
	device.removeSubdevice("Pump");
	device.createSubdevice("Pump");
	device.setSubdeviceName("Pump", `Pump`);
	device.setSubdeviceSize("Pump", 12, 12);
	device.setSubdeviceLeds("Pump", vPumpLedNames, vPumpLedPos);
}

function getChannelColors(shutdown) {
	let RGBData = [];

	if (LightingMode === "Forced") {
		RGBData = device.createColorArray(
			forcedColor,
			device.getLedCount(),
			"Inline",
			"RGB"
		);
	} else if (shutdown) {
		RGBData = device.createColorArray(
			shutdownColor,
			device.getLedCount(),
			"Inline",
			"RGB"
		);
	} else if (device.getLedCount() === 0) {
		const pulseColor = device.getChannelPulseColor(ChannelArray[0][0]);
		RGBData = device.createColorArray(
			pulseColor,
			device.getLedCount(),
			"Inline",
			"RGB"
		);
	} else {
		RGBData = device.channel(ChannelArray[0][0]).getColors("Inline", "RGB");
	}

	return RGBData;
}

function colorgrabber() {
	const RGBData = LCD.getFrame({ format: "JPEG" });

	let BytesLeft = RGBData.length;
	const totalLength = RGBData.length;

	let packetsSent = 0;

	while (BytesLeft > 0) {
		const BytesToSend = Math.min(1013, BytesLeft);

		if (BytesToSend < 1013) {
			const RGBDataToSend = RGBData.slice(
				1013 * packetsSent,
				1013 * packetsSent + BytesToSend
			);

			Galahad.sendLargePacket(
				0x0e,
				RGBDataToSend,
				totalLength,
				packetsSent
			);
		} else {
			Galahad.sendLargePacket(
				0x0e,
				RGBData.slice(
					1013 * packetsSent,
					1013 * packetsSent + BytesToSend
				),
				totalLength,
				packetsSent
			);
		}

		BytesLeft -= BytesToSend;
		packetsSent++;
	}
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

// eslint-disable-next-line complexity
function PollFans() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if (device.fanControlDisabled()) {
		return;
	}

	if (
		!ConnectedProbes.includes(`Liquid Temperature`) &&
		Galahad.getLiquidTemp() !== -1
	) {
		ConnectedProbes.push(`Liquid Temperature`);
		device.createTemperatureSensor(`Liquid Temperature`);
	}

	if (
		Galahad.getLiquidTemp() !== -1 &&
		ConnectedProbes.includes(`Liquid Temperature`)
	) {
		device.SetTemperature(`Liquid Temperature`, Galahad.getLiquidTemp());
		device.log(`Liquid Temp: ${Galahad.getLiquidTemp()} C`);
	}

	if (Galahad.getPumpRPM() > 0 && !ConnectedFans.includes(`Pump`)) {
		ConnectedFans.push(`Pump`);
		device.createFanControl(`Pump`);
	}

	if (ConnectedFans.includes(`Pump`)) {
		device.log(`Pump RPM: ${Galahad.getPumpRPM()}`);
		device.setRPM(`Pump`, Galahad.getPumpRPM());
	}

	Galahad.setPumpSpeed(device.getNormalizedFanlevel(`Pump`) * 100);

	if (Galahad.getFanRPM() > 0 && !ConnectedFans.includes(`Fan`)) {
		ConnectedFans.push(`Fan`);
		device.createFanControl(`Fan`);
	}

	if (ConnectedFans.includes(`Fan`)) {
		device.log(`Fan RPM: ${Galahad.getFanRPM()}`);
		device.setRPM(`Fan`, Galahad.getFanRPM());
		Galahad.setFanSpeed(device.getNormalizedFanlevel(`Fan`) * 100);
	}
}

function destroyFans() {
	device.removeFanControl(`Fan`);
	device.removeFanControl(`Pump`);
	device.removeTemperatureSensor(`Liquid Temperature`);
	//Nuke the fan control props from orbit as we shouldn't have them floating around if you're using PWM.
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class GalahadIILCD {
	constructor() {
		this.commands = {
			getDeviceInfo: 0x81,
			setPumpSpeed: 0x8a,
			setFanSpeed: 0x8b,
			setFanColors: 0x85,
			setPumpColors: 0x83,
			setPerLED: 0x14,
		};

		this.fanRPM = -1;
		this.pumpRPM = -1;
		this.liquidTemp = -1;
	}

	getFanRPM() {
		return this.fanRPM;
	}
	setFanRPM(rpm) {
		this.fanRPM = rpm;
	}

	getPumpRPM() {
		return this.pumpRPM;
	}
	setPumpRPM(rpm) {
		this.pumpRPM = rpm;
	}

	getLiquidTemp() {
		return this.liquidTemp;
	}
	setLiquidTemp(liquidTemp) {
		this.liquidTemp = liquidTemp;
	}
	/** Set Pump colors, and full brightness. */
	setPumpColors(shutdown = false) {
		let col;

		if (shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.subdeviceColor("Pump", 0, 0);
		}

		this.sendSmallPacket(this.commands.setPumpColors, [
			0x00,
			0x03,
			0x04,
			0x00,
			col[0],
			col[1],
			col[2],
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
		]);
	}
	/** Set Fans to Full Brightness and Black.*/
	setFanColors() {
		this.sendSmallPacket(
			this.commands.setFanColors,
			[
				0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 50,
			]
		);
	}
	/** Send LED Data to the Fan Channel and Address Each LED Individually. */
	setFansPerLED(shutdown = false) {
		const RGBData = getChannelColors(shutdown);

		this.sendLargePacket(
			this.commands.setPerLED,
			[0x01].concat(RGBData),
			RGBData.length + 1
		);
	}
	/** Send LED Data to the Pump Channel and Address Each LED Individually. */
	setPumpPerLED(shutdown = false) {
		const RGBData = [];

		for (let iIdx = 0; iIdx < vPumpLedPos.length; iIdx++) {
			const ipxX = vPumpLedPos[iIdx][0];
			const ipxY = vPumpLedPos[iIdx][1];
			let col;

			if (shutdown) {
				col = hexToRgb(shutdownColor);
			} else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.subdeviceColor("Pump", ipxX, ipxY);
			}

			RGBData[vPumpLeds[iIdx] * 3 + 24] = col[0];
			RGBData[vPumpLeds[iIdx] * 3 + 25] = col[1];
			RGBData[vPumpLeds[iIdx] * 3 + 26] = col[2];
		}

		this.sendLargePacket(
			this.commands.setPerLED,
			[0x00].concat(RGBData),
			RGBData.length + 1
		);
	}
	/** Fetch RPM and Liquid Temp from Device. */
	fetchRPM() {
		device.clearReadBuffer();
		device.write([0x01, this.commands.getDeviceInfo], 64);

		const rpmPacket = device.read([0x01], 64);
		this.setFanRPM((rpmPacket[7] & 0xff) | ((rpmPacket[6] << 8) & 0xff00));
		this.setPumpRPM((rpmPacket[9] & 0xff) | ((rpmPacket[8] << 8) & 0xff00));
		this.setLiquidTemp(
			rpmPacket[10] === 1 ? rpmPacket[11] + rpmPacket[12] / 10 : -1
		);
	}
	/** Set Device Pump Speed and Mobo vs Software Control of PWM. */
	setPumpSpeed(speed, isPWMControlled = false) {
		this.sendSmallPacket(this.commands.setPumpSpeed, [
			isPWMControlled,
			speed,
		]);
	}
	/** Set Device Fan Speed. */
	setFanSpeed(speed) {
		this.sendSmallPacket(this.commands.setFanSpeed, [0x00, speed]);
	}
	/** Send a command using the smaller 64 byte packet.
	 *  Takes args for command, data to send, and packet number.
	 */
	sendSmallPacket(command, data, sequence = 0) {
		const finalPacket = [
			0x01,
			command,
			0x00,
			(sequence >> 8) & 0xff,
			sequence & 0xff,
			data.length,
		].concat(data);
		//report id, command, reserved, high packet sequence number, low packet sequence number, length.
		device.write(finalPacket, 64);
	}
	/** Send a command using the larger 1024 byte packet.
	 * Takes args for command, data to send, total length of data being sent, and packet number.*/
	sendLargePacket(command, packetData, totalLength, sequence = 0) {
		const finalPacket = [
			0x02,
			command,
			(totalLength >> 24) & 0xff,
			(totalLength >> 16) & 0xff,
			(totalLength >> 8) & 0xff,
			totalLength & 0xff,
			(sequence >> 16) & 0xff,
			(sequence >> 8) & 0xff,
			sequence & 0xff,
			(packetData.length >> 8) & 0xff,
			packetData.length & 0xff,
		].concat(packetData);

		device.write(finalPacket, 1024);
	}
}

const Galahad = new GalahadIILCD();

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/lian-li/aios/galahad-ii-lcd.png";
}
