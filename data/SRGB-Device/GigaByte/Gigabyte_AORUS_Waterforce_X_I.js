export function Name() { return "Gigabyte Aorus Waterforce X I"; }
export function VendorId() { return 0x1044; }
export function ProductId() { return 0x7A4D; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [2, 2]; }
export function ConflictingProcesses() { return ["RGBFusion.exe"]; }
export function DeviceType(){return "aio";}
export function SupportsFanControl(){ return true; }
export function Validate(endpoint) { return endpoint.interface === 0; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/gigabyte/aios/aorus-waterforce-x-i.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

export function DeviceMessages() {
	return [
		{property: "Limited Functionality", message:"Limited Functionality", tooltip: "This device's firmware doesn't support LCD control"},
	];
}

const vLedNames = [ "Cooler" ];
const vLedPositions = [ [1, 1] ];
const ConnectedFans = [];
let lcdMode = 0;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	checkRPMMode();
	getDeviceMode();
	getSpeeds();
	getModel();

	if(device.fanControlDisabled()) {
		return;
	}

	//Set Fan Modes
	device.write([0x99, 0xE5, 1, 1, 0], 6144);
	device.write([0x99, 0xE5, 2, 1, 0], 6144);
}

export function Render() {
	setColors();

	PollFans();
}

export function Shutdown() {
	setColors(true);
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function PollFans() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	const fan = 1;
	const pump = 1;

	if(device.fanControlDisabled()) {
		return;
	}
	const [fanRpm, pumpRpm] = getSpeeds();
	device.log(`Fan rpm: ${fanRpm}`);
	device.log(`Pump rpm: ${pumpRpm}`);

	if(fanRpm > 0 && !ConnectedFans.includes(`Fan ${fan}`)) {
		ConnectedFans.push(`Fan ${fan}`);
		device.createFanControl(`Fan ${fan}`);
	}

	if(ConnectedFans.includes(`Fan ${fan}`)) {
		device.setRPM(`Fan ${fan}`, fanRpm);

		const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
		setFanCurve(newSpeed);
	}

	if(pumpRpm > 0 && !ConnectedFans.includes(`Pump ${pump}`)) {
		ConnectedFans.push(`Pump ${pump}`);
		device.createFanControl(`Pump ${pump}`);
	}

	if(ConnectedFans.includes(`Pump ${pump}`)) {
		device.setRPM(`Pump ${pump}`, pumpRpm);

		const newSpeed = device.getNormalizedFanlevel(`Pump ${pump}`) * 100;
		setPumpCurve(newSpeed);
	}
}

function setPumpCurve(percent) {
	const packet = [0x99, 0xE6, 0x00, 0x02];
	const temps = [0, 30, 50, 65];
	let rpm = Math.round(2800 * percent/100);
	rpm = Math.max(1600, rpm);

	for(let cPoints = 0; cPoints < 4; cPoints++) {
		packet[cPoints * 3 + 4] = temps[cPoints];
		packet[cPoints * 3 + 5] = rpm >> 8;
		packet[cPoints * 3 + 6] = rpm;
	}

	device.write(packet, 6144);
}

function setFanCurve(percent) {
	const packet = [0x99, 0xE6, 0x00, 0x01];
	const temps = [0, 30, 50, 65];
	const rpm = Math.round(2800 * percent/100);

	for(let cPoints = 0; cPoints < 4; cPoints++) {
		packet[cPoints * 3 + 4] = temps[cPoints];
		packet[cPoints * 3 + 5] = rpm >> 8;
		packet[cPoints * 3 + 6] = rpm;
	}

	device.write(packet, 6144);
}

function checkRPMMode() {
	device.clearReadBuffer();
	device.write([0x99, 0xDD], 6144);

	device.pause(10);

	const returnPacket = device.read([0x99, 0xDD], 256);

	device.log(`Fan Mode: ${returnPacket[2]}`);
	device.log(`Pump Mode: ${returnPacket[3]}`);
}

function getDeviceMode() {
	device.clearReadBuffer();
	device.pause(10);
	device.write([0x99, 0xE8], 6144);
	device.pause(10);

	const returnPacket = device.read([0x99, 0xE8], 256);

	device.log(`Device Mode: ${returnPacket[2] - 1}`);
	lcdMode = (returnPacket[2] - 1);
}

function setDeviceMode(deviceMode) {
	device.write([0x99, 0xE7, deviceMode - 1, 0], 6144);
	//0 is nparam w/e that means
	device.pause(10);
}

function getSpeeds() {
	device.clearReadBuffer();
	device.pause(10);
	device.write([0x99, 0xDA], 6144);
	device.pause(10);

	const returnPacket = device.read([0x99, 0xDA], 256);
	const fanSpeed = returnPacket[2] | returnPacket[3] << 8 | returnPacket[4] << 16;
	const pumpSpeed = returnPacket[5] | returnPacket[6] << 8 | returnPacket[7] << 16;

	device.log(`Fan Speed: ${fanSpeed} RPM`);
	device.log(`Pump Speed: ${pumpSpeed} RPM`);

	return [fanSpeed, pumpSpeed];
}

function getModel() {
	device.clearReadBuffer();
	device.write([0x99, 0xDE], 6144);
	device.pause(10);

	const returnPacket = device.read([0x99, 0xDE], 256);
	device.log(returnPacket[2]);
	//0 is 240, 1 is 360 ICE, 2 is 360
}


function setColors(shutdown = false) {
	const iX = vLedPositions[0][0];
	const iY = vLedPositions[0][1];
	let col;

	if (shutdown) {
		col = hexToRgb(shutdownColor);
	} else if (LightingMode === "Forced Static") {
		col = hexToRgb(forcedColor);
	} else {
		col = device.color(iX, iY);
	}

	device.write([0x99, 0xcd, col[0], col[1], col[2]], 6144);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
