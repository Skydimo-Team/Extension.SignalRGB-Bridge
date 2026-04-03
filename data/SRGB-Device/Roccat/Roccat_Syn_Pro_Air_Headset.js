export function Name() { return "Roccat Syn Pro Air"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x3a3b;}
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

const vKeys = [ 0, 1 ];
const vLedNames = [ "Front", "Rear" ];
const vLedPositions = [ [1, 0], [2, 0] ];
let SavedPollTimer = Date.now();
const PollModeInterval = 8000;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	CheckConnectionStatus();

	sendPacketString("00 fe 01 00 00 00 09 08 02 00 ff ff ff ff ff ff ff ff ff", 64 );

	sendPacketString("00 fe 02 00 00 01", 64);
	PollBattery();
}

export function Shutdown() {
	// Lighting IF
	sendColors(true);
}

export function Render() {
	CheckConnectionStatus();
	GetBatteryStatus();
	sendColors();

}

function PollReconnectStatus(){
	let packet = [];

	do{
		packet = device.read([0x00], 65);

		if(packet[1] == 0xE6 && packet[2] == 0x06 && packet[3] == 0x04 && packet[5] == 0x01){// if packet[5] = 0x00 then the headset was put to sleep
			return true;
		}
	}while(device.getLastReadSize() > 0);

	return false;
}

function CheckConnectionStatus() {
	const status = PollReconnectStatus();

	if(status) {
		device.log("HeadSet Reconnected");
		device.pause(1000);
		Initialize();
	}
}

const BatteryDict =
{
	0x05 : 100,
	0x04 : 75,
	0x03 : 50,
	0x02 : 25,
	0x01 : 0
};


function GetBatteryStatus(){
	//Break if were not ready to poll
	if(Date.now() - SavedPollTimer < PollModeInterval) {
		return;
	}

	SavedPollTimer = Date.now();
	sendPacketString("00 fe 04", 64); //Keep alive packet
	PollBattery();
}

function PollBattery() {

	let packet = [];
	packet[0] = 0x00;
	packet[1] = 0xa1;
	packet[2] = 0x07;
	packet[3] = 0x06;
	packet[4] = 0x20;
	device.write(packet, 65);
	device.pause(10);
	packet = device.read(packet, 65);

	const Battery = packet[11];
	const Batterylevel = BatteryDict[Battery];

	if(Batterylevel == -1){
		device.log("Battery Status Invalid. Repolling in 10 seconds.");
	}else{
		device.log(`Battery level is at ${Batterylevel} %`);
	}

	return Batterylevel;
}

function sendColors(shutdown = false) {
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0xFE;
	packet[2] = 0x03;

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode == "Forced") {
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

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.write(packet, size);
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
	return "https://assets.signalrgb.com/devices/brands/roccat/audio/syn-pro-air.png";
}