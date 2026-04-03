export function Name() { return "Razer Deathstalker V2 Pro TKL Wired"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0298; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [17, 6]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard"}
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

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
const vLedNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
];

const vLedPositions = [
	[0, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],            [14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],        [13, 3],
	[0, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],                [13, 4],               [15, 4],
	[0, 5], [1, 5], [2, 5],                      [6, 5],                       [10, 5], [11, 5], [12, 5], [13, 5],        [14, 5], [15, 5], [16, 5],
];

let savedPollTimer = Date.now();
const PollModeInternal = 15000;
const transactionID = 0x1f;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.addFeature("battery");
	getDeviceBatteryStatus();
}
export function Render() {
	SendPacket(0);
	SendPacket(1);
	SendPacket(2);
	SendPacket(3);
	SendPacket(4);
	SendPacket(5);
	getDeviceBatteryStatus();
}


export function Shutdown() {
	SendPacket(0, true);
	SendPacket(1, true);
	SendPacket(2, true);
	SendPacket(3, true);
	SendPacket(4, true);
	SendPacket(5, true);
}

function SendPacket(idx, shutdown = false) {
	const packet = [0x00, 0x00, 0x1f, 0x00, 0x00, 0x00, 0x38, 0x0F, 0x03, 0x00, 0x00, idx, 0x00, 0x11];

	for(let iIdx = 0; iIdx < 17; iIdx++){
		var col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iIdx, idx);
		}
		const iLedIdx = (iIdx*3) + 14;
		packet[iLedIdx] = col[0];
		packet[iLedIdx+1] = col[1];
		packet[iLedIdx+2] = col[2];
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
}

function getDeviceChargingStatus() {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x07, 0x84];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);

	const batteryStatus = returnpacket[10];
	device.log("Charging Status: " + batteryStatus);

	return batteryStatus+1;
}

function getDeviceBatteryLevel() {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x07, 0x80];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);

	const batteryLevel = Math.floor(((returnpacket[10])*100)/255);
	device.log("Device Battery Level: " + batteryLevel);

	return batteryLevel;
}

function getDeviceBatteryStatus() {
	if (Date.now() - savedPollTimer < PollModeInternal) {
		return;
	}

	savedPollTimer = Date.now();

	const battstatus = getDeviceChargingStatus();
	const battlevel = getDeviceBatteryLevel();

	battery.setBatteryState(battstatus);
	battery.setBatteryLevel(battlevel);
}

function packetSend(packet, length) //Wrapper for always including our CRC
{
	const packetToSend = packet;
	packetToSend[89] = CalculateCrc(packet);
	device.send_report(packetToSend, length);
}

export function Validate(endpoint) {
	return endpoint.interface === 3;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/deathstalker-v2-pro-tkl.png";
}