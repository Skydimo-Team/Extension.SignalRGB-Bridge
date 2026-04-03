export function Name() { return "Cooler Master MP860 Mouse Pad"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x006D; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [6, 6]; }
export function DefaultPosition() {return [75, 70]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "mousepad"}
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
const vLedNames = [
	"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19"
];
const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
	[0, 1],                                 [5, 1],
	[0, 2],                                 [5, 2],
	[0, 3],                                 [5, 3],
	[0, 4],                                 [5, 4],
	[0, 5],  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
];

const vKeymap = [
	23,      24, 25,      27, 0,
	22,                           1,
	21,                           2,
	20,                            3,
	15,                           8,
	14,   13,  12,  11,  10, 9,
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor){
	const RGBData = new Array(50).fill(0);
	let TotalLedCount = 0;

	for(let iIdx = 0; iIdx < vKeymap.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let mxPxColor;

		if(overrideColor){
			mxPxColor = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			mxPxColor = hexToRgb(forcedColor);
		}else{
			mxPxColor = device.color(iPxX, iPxY);
		}

		RGBData[vKeymap[iIdx]*3] = mxPxColor[0];
		RGBData[vKeymap[iIdx]*3 +1 ] = mxPxColor[1];
		RGBData[vKeymap[iIdx]*3 +2 ] = mxPxColor[2];
		TotalLedCount++;
	}
	let packetCount = 0;
	let ledsSent = 0;
	TotalLedCount = 30;
	device.write([0x00, 0x41, 0x80], 65);

	while(packetCount < 6){
		const ledsToSend = TotalLedCount >= 12 ? 12 : TotalLedCount;
		TotalLedCount -= ledsToSend;

		let packet = [];
		packet[0] = 0x00;
		packet[1] = 0x51;
		packet[2] = 0xA8;
		packet[3] = packetCount;
		packet[4] = 0x00;
		packet = packet.concat(RGBData.splice(0, ledsToSend*3));

		device.write(packet, 65);

		ledsSent += ledsToSend;
		packetCount += 2;
	}

	device.write([0x00, 0x51, 0x28, 0x00, 0x00, 0xB0], 65);
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
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/coolermaster/mousepads/mp860.png";
}