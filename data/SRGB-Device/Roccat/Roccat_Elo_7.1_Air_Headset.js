export function Name() { return "Roccat Elo 7.1 Air"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x3a37;}
export function Documentation(){ return "troubleshooting/roccat"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [7, 7]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 7.0;}
export function DeviceType(){return "headphones"}
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
const vKeys = [ 0 ];
const vLedNames = [ "Cans" ];
const vLedPositions = [ [1, 0], ];
let SavedPollTimer = Date.now();
const PollModeInterval = 10000;
const BatteryDict =
{
	"6" : -1,
	"4" : 100,
	"3" : 75,
	"2" : 50,
	"1" : 25,
	"0" : 0
};
let Deviceconnected = true;
export function LedNames() {
	return vLedNames;
}
export function LedPositions() {
	return vLedPositions;
}

function PollConnectionStatus()//Overcomplicated logic to know when we reconnect to the pc.
{
	let packet = [];

	do {
		packet = device.read([0x00], 65);

		if(packet[1] == 0xE0 && packet[2] == 0x06 && packet[3] == 0x03 && packet[5] == 0x01) {
			Deviceconnected = true;

			return true;
		} else if(packet[1] == 0xE6 && packet[2] == 0x06 && packet[3] == 0x04) {
			Deviceconnected = false;
		}
	}
	while(device.getLastReadSize() > 0);


	while(Deviceconnected == false) {
		packet = device.read([0x00], 65);

		if(packet[1] == 0xE0 && packet[2] == 0x06 && packet[3] == 0x03 && packet[5] == 0x01) {
			Deviceconnected = true;

			return true;
		}

		device.pause(15000);
	}

	return false;
}

function CheckConnectionStatus() {
	const status = PollConnectionStatus();

	if(status) {
		device.log("Headset Reconnected");
		device.pause(20000);

		const packet = device.read([0x00], 65);

		Initialize();
	}
}
export function Initialize() {
	device.write([0x00, 0xFF, 0x02], 64);
	device.pause(10);
	device.write([0x00, 0xFF, 0x03, 0x00, 0x01, 0x00, 0x01], 64);
	device.pause(10);
	device.write([0x00, 0xFF, 0x04], 64);
	device.pause(10);
	device.write([0x00, 0xFF, 0x01], 64);
	device.pause(10);

	const packet = device.read([0x00], 65);
}
export function Render() {
	sendZone();
	GetBatteryStatus();
	CheckConnectionStatus();
}
export function Shutdown() {
	// Lighting IF
	sendZone(true);
}

function GetBatteryStatus(){
	//Break if were not ready to poll
	if(Date.now() - SavedPollTimer < PollModeInterval) {
		return;
	}

	SavedPollTimer = Date.now();
	PollBattery();
}

function PollBattery()//This refuses to work properly for like the first 5-7 reads after reconnecting the headset. After that, it's fine.
{
	let packet = device.read([0x00], 65);
	packet = [];
	packet[0] = 0x00;
	packet[1] = 0x8a;
	packet[2] = 0x07;
	packet[3] = 0x06;
	device.write(packet, 65);
	device.pause(10);
	packet = device.read(packet, 65);

	const Battery = packet[5];
	const Batterylevel = BatteryDict[Battery];

	if(Batterylevel == -1) {
		device.log("Battery Status Invalid. Repolling in 10 seconds.");
	} else {
		device.log(`Battery level is at ${Batterylevel} %`);
	}

	return Batterylevel;
}

function sendZone(shutdown = false) {
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0xFF;
	packet[2] = 0x04;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[vKeys[iIdx]*3+5] = col[0];
		packet[vKeys[iIdx]*3+6] = col[1];
		packet[vKeys[iIdx]*3+7] = col[2];
	}

	device.write(packet, 65);
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
	return endpoint.interface === 0;
}


export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/audio/elo-7-1-air.png";
}