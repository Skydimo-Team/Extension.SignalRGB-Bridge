export function Name() { return "Roccat Kone XP Air"; }
export function VendorId() { return 0x1e7d; }
export function ProductId() { return 0x2cb6; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mouse"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
angleSnapping:readonly
PollingDict:readonly
pollingrate:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = [ "Scroll Wheel", "Left Front", "Right Front", "Left Back", "Right Back" ];
const vLedPositions = [ [1, 0], [0, 1], [2, 1], [0, 2], [2, 2] ];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.send_report([0x06, 0x01, 0x13, 0x07, 0x02], 30);
	device.pause(30);
	device.send_report([0x06, 0x00, 0x00, 0x04], 30);
	device.pause(30);
	device.send_report([0x06, 0x00, 0x00, 0x05], 30); //since these are 0 flagged, probably talking to receiver.
	device.pause(30);
	device.send_report([0x06, 0x01, 0x35, 0x07], 30);
	device.pause(30);
	device.send_report([0x06, 0x01, 0x00, 0x04], 30);
	device.pause(30);
	device.send_report([0x06, 0x01, 0x00, 0x05], 30); //since these are 0 flagged, probably talking to receiver.
	device.pause(30);
	device.send_report([0x06, 0x01, 0x4E, 0x06, 0x04, 0x01, 0x01, 0x01, 0xff], 30); //Lighting setup
	device.pause(30);
	device.send_report([0x06, 0x01, 0x44, 0x07], 30); //Apply iirc
	device.pause(30);
	device.send_report([0x06, 0x01, 0x49, 0x06, 0x01, 0x04], 30);
	device.pause(30);
	device.send_report([0x06, 0x01, 0x44, 0x07], 30); //Apply iirc
}

export function Render() {
	sendZone();
}

export function Shutdown() {
	sendZone(true);
}

// @ts-ignore
function saveForLater() {
	const packet = [];
	// @ts-ignore
	packet[12] = dpi1%256;//50 for 50 dpi
	// @ts-ignore
	packet[13] = Math.floor(dpi1/256);//0 for 50
	// @ts-ignore
	packet[14] = dpi2%256;//100 for 100
	// @ts-ignore
	packet[15] = Math.floor(dpi2/256);//0 for 100
	// @ts-ignore
	packet[16] = dpi3%256;//200
	// @ts-ignore
	packet[17] = Math.floor(dpi3/256);//0
	// @ts-ignore
	packet[18] = dpi4%256;//144 for 400
	// @ts-ignore
	packet[19] = Math.floor(dpi4/256);//1 to add 256 to dpi
	// @ts-ignore
	packet[20] = dpi5%256;// 64 for 1600
	// @ts-ignore
	packet[21] = Math.floor(dpi5/256); //6 to add 256 6 times to dpi
	// @ts-ignore
	packet[22] = dpi1%256;//50 for 50 dpi
	// @ts-ignore
	packet[23] = Math.floor(dpi1/256);//0 for 50
	// @ts-ignore
	packet[24] = dpi2%256;//100 for 100
	// @ts-ignore
	packet[25] = Math.floor(dpi2/256);//0 for 100
	// @ts-ignore
	packet[26] = dpi3%256;//200
	// @ts-ignore
	packet[27] = Math.floor(dpi3/256);//0
	// @ts-ignore
	packet[28] = dpi4%256;//144 for 400
	// @ts-ignore
	packet[29] = Math.floor(dpi4/256);//1 to add 256 to dpi
}

// @ts-ignore
function dpiset() {
	device.send_report([0x06, 0x01, 0x46, 0x06, 0x02], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x19, 0x06, 0x4E, 0x00, 0x00, 0x00, 0x1f, 0x04, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00, 0x32, 0x00], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x02, 0x01], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x19, 0x32, 0x00, 0x00, 0x00, 0x03, 0x08, 0x06, 0xff, 0xf0, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0x00, 0xff, 0x00, 0x03, 0xff, 0x00, 0xff], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x02, 0x02], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x19, 0x32, 0x04, 0xff, 0x00, 0xff, 0x64, 0x05, 0xff, 0x00, 0xff, 0x32, 0x06, 0xff, 0x00, 0xff, 0x64, 0x07, 0x00, 0x00, 0x00, 0x00, 0x01, 0x64, 0xc5, 0x0b], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x02, 0x03], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x03, 0xdc, 0xda, 0x10], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x49, 0x06, 0x01, 0x49, 0x06, 0x03, 0x05, 0x6f, 0x45], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x4E, 0x06, 0x04, 0x01, 0x01, 0x01, 0xff], 30); //Lighting setup
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);
}

// @ts-ignore
function varioussettings() {
	// @ts-ignore
	const packet = [0x06, 0x01, 0x46, 0x06, 0x19, 0x80, 0x0C, angleSnapping ? 0x00 : 0x01, 0x00, PollingDict[pollingrate]];

	packet[10] = 0x09;
	packet[11] = 0x06;
	packet[12] = 0xff;
	packet[13] = 0x0f; //15 in decimal, probably time identifier
	packet[14] = 0x00;//ff for no effect
	packet[15] = 0x00;
	packet[16] = 0x01;
	packet[17] = 0x00;
	packet[18] = 0x00;
	packet[19] = 0x00;
	packet[20] = 0x00;
	packet[21] = 0x02;
	packet[22] = 0xff;
	packet[23] = 0x00;
	packet[24] = 0xff;
	packet[25] = 0x00;
	packet[26] = 0x03;
	packet[27] = 0xff;
	packet[28] = 0x00;
	packet[29] = 0xff;
	device.send_report(packet, 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x02, 0x02], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);


	device.send_report([0x06, 0x01, 0x46, 0x06, 0x19, 0x32, 0x04, 0xff, 0x00, 0xff, 0x64, 0x05, 0xff, 0x00, 0xff, 0x32, 0x06, 0xff, 0x00, 0xff, 0x64, 0x07, 0x00, 0x00, 0x00, 0x00, 0x01, 0x64, 0xc5, 0x0b], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x02, 0x03], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x46, 0x06, 0x03, 0xdc, 0x60, 0x13], 30); //Last 2 bytes of this and the next function shift around a lot. Probably an overall CRC?
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x49, 0x06, 0x01, 0x49, 0x06, 0x03, 0x05, 0x51, 0xc2], 30);
	device.pause(40);

	device.send_report([0x06, 0x00, 0x00, 0x04], 30);
	device.pause(40);

	device.send_report([0x06, 0x00, 0x00, 0x05], 30); //Pinging Receiver most likely.
	device.pause(40);

	device.send_report([0x06, 0x00, 0x25, 0x07], 30);
	device.pause(40);

	device.send_report([0x06, 0x01, 0x4E, 0x06, 0x04, 0x01, 0x01, 0x01, 0xff], 30); //Lighting setup
	device.pause(40);

	device.send_report([0x06, 0x01, 0x44, 0x07], 30);
	device.pause(40);

}

function sendZone(shutdown = false) {
	const packet = [0x06, 0x01, 0x4D, 0x06, 0x15, 0x00, 0x00, 0x00, 0x00];

	for(let iIdx = 0; iIdx < vLedNames.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		packet[iIdx*3 + 8] = col[0];
		packet[iIdx*3 + 9] = col[1];
		packet[iIdx*3 + 10] = col[2];

	}

	device.send_report(packet, 30);
	device.pause(1);
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
	return endpoint.interface === 2 && endpoint.usage === 0xff00;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/roccat/mice/kone-xp-air.png";
}