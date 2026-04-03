export function Name() { return "Corsair Void Pro Headset"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x1B23;}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition(){return [145, 85];}
export function DefaultScale(){return 10.0;}
export function DeviceType(){return "headphones";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		//{"property":"micLedControl", "group":"", "label":"Enable Mic Led","type":"boolean","default":"false"},
		//{"property":"frameRate", "group":"", "label":"Frame Rate", "type":"number","min":"1", "max":"10","default":"5"},
	];
}

export function Documentation(){ return "troubleshooting/corsair"; }

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
const vLedNames = ["Left Cans", "Right Can"];

const vLedPositions = [
	[0, 2], [2, 2]
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function EnableSoftwareControl() {
}

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] = parseInt(data[i], 16);//.toString(16)
	}

	device.write(packet, size);
}

function ReturnToHardwareControl() {
}


export function Initialize() {
	sendPacketString("C8 01", 20);

}


export function Render() {
	sendColors();
}

function sendColors(overrideColor){

	const red = new Array(3).fill(0);
	const green = new Array(3).fill(0);
	const blue = new Array(3).fill(0);


	const packet = [];
	packet[0x00]   = 0xCB;
	packet[0x01]   = 0x06;
	packet[0x02]   = 0x1C;
	packet[0x03]   = 0xFF;
	packet[0x04]   = 0x16;
	packet[0x05]   = 0xDC;
	packet[0x06]   = 0x17;
	packet[0x07]   = 0x9A;
	packet[0x08]   = 0x1D;
	packet[0x09]   = 0xFF;
	packet[0x0A]   = 0x18;
	packet[0x0B]   = 0xDC;
	packet[0x0C]   = 0x19;
	packet[0x0D]   = 0x9A;


	for(let zone_idx = 0; zone_idx < vLedPositions.length; zone_idx++) {
		const iX = vLedPositions[zone_idx][0];
		const iY = vLedPositions[zone_idx][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iX, iY);
		}

		packet[zone_idx * 6 + 3] = col[0];
		packet[zone_idx * 6 + 5] = col[1];
		packet[zone_idx * 6 + 7] = col[2];

	}

	device.write(packet, 20);
	device.pause(30);
}

export function Validate(endpoint) {
	return endpoint.interface === 3 && endpoint.usage === 1 && endpoint.usage_page === 0xffc5;
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		sendPacketString("C8 00", 20);
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/audio/void.png";
}