export function Name() { return "Corsair Void Pro Headset"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x0A14;}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition(){return [145, 85];}
export function DefaultScale(){return 10.0;}
export function DeviceType(){return "headphones";}
/* global
LightingMode:readonly
forcedColor:readonly
SidetoneControl:readonly
SidetoneAmount:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"SidetoneControl", "group":"", "label":"Sidetone", description: "Enables the microphone feedback.", "type":"combobox", "values":["Off", "On"], "default":"Off"},
		{"property":"SidetoneAmount", "group":"", "label":"Sidetone Amount", description: "Adjusts the microphone feedback volume", "step":"1", "type":"number", "min":"0", "max":"100", "default":"0"},

	];
}

export function Documentation(){ return "troubleshooting/corsair"; }

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

function sendPacketString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] = parseInt(data[i], 16);//.toString(16)
	}

	device.write(packet, size);
}

export function Initialize() {
	device.set_endpoint(3, 1, 0xffc5); // Main Endpoint

	sendPacketString("C8 01", 20);

	if(SidetoneControl) {
		setSidetone();
	}

	ReadBattery();
}


export function Render() {
	sendColors();
}

export function onSidetoneAmountChanged() {
	setSidetone();
}

function setSidetone() {
	device.set_endpoint(3, 1, 0xff00); // Sidetone Endpoint

	const packet = [];
	packet[0x00]   = 0xFF;
	packet[0x01]   = 0x0B;
	packet[0x02]   = 0x00;
	packet[0x03]   = 0xFF;
	packet[0x04]   = 0x04;
	packet[0x05]   = 0x0E;
	packet[0x06]   = 0xFF;
	packet[0x07]   = 0x05;
	packet[0x08]   = 0x01;
	packet[0x09]   = 0x04;
	packet[0x0A]   = 0x00;
	packet[0x0B]   = (SidetoneAmount+200);
	packet[0x0C]   = 0x00;
	packet[0x0D]   = 0x00;
	packet[0x0E]   = 0x00;
	packet[0x0F]   = 0x00;
	device.log("Sidetone is set to: " + (SidetoneAmount));
	device.send_report(packet, 64);
	ReadBattery();
}

function ReadBattery() {
	device.set_endpoint(3, 1, 0xffc5); // Main Endpoint

	let packet = [];
	packet[0x00]   = 0xC9;
	packet[0x01]   = 0x0B;

	device.write(packet, 20);

	packet = device.read(packet, 20);

	if (packet[2] >= 101) {
		var	Battery = (packet[2] - 128);
		device.log("Battery Percentage: " + (Battery) + "%");
	} else if (packet[2] != 0) {
		var	Battery = packet[2];
		device.log("Battery Percentage: " + (Battery) + "%");
	}

}

function sendColors(overrideColor) {

	const red = new Array(3).fill(0);
	const green = new Array(3).fill(0);
	const blue = new Array(3).fill(0);

	device.set_endpoint(3, 1, 0xffc5); // Main Endpoint

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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 3 && endpoint.usage === 1 && endpoint.usage_page === 0xffc5
	    || endpoint.interface === 3 && endpoint.usage === 1 && endpoint.usage_page === 0xff00;;
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		device.set_endpoint(3, 1, 0xffc5); // Main Endpoint
		sendPacketString("C8 00", 20);
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/audio/void.png";
}