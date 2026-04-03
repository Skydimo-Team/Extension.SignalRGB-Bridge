function GetReport(cmd_class, cmd_id, size) {
	const report = new Array(91).fill(0);

	report[0] = 0;

	// Status.
	report[1] = 0x00;

	// Transaction ID.
	report[2] = 0xFF;

	// Remaining packets.
	report[3] = 0x00;
	report[4] = 0x00;

	// Protocol type.
	report[5] = 0x00;

	// Data size.
	report[6] = size;

	// Command class.
	report[7] = cmd_class;

	// Command id.
	report[8] = cmd_id;

	//report[8-87] = data;

	//report[89] = crc;

	//report[89] = reserved;

	return report;
}


function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}


export function Name() { return "Razer Tartarus Pro"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0244; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [6, 7]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 7.0;}
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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
export function Type() { return "Hid"; }
const vLedNames = [
	"Key 1", "Key 2", "Key 3", "Key 4", "Key 5",
	"Key 5", "Key 6", "Key 7", "Key 8", "Key 9",
	"Key 10", "Key 11", "Key 12", "Key 13", "Key 14",
	"Key 15", "Key 16", "Key 17", "Key 18", "Key 19",
	"Key 20",
];
const vKeymap = [
	0, 1, 2, 3, 4,
	5, 6, 7, 8, 9,
	10, 11, 12, 13, 14,
	15, 16, 17, 18, 19,
	20
];
const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 4],
	[5, 6],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function Initialize() {

}

function SendPacket(idx, shutdown = false) {
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x44;
	packet[7] = 0x0F;
	packet[8] = 0x03;
	packet[11] = idx;
	packet[13] = 0x14;

	for(let iIdx = 0; iIdx < vKeymap.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		var color;

		if(shutdown){
			color = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}
		const iLedIdx = (iIdx*3) + 14;
		packet[iLedIdx] = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] = color[2];
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	device.pause(1);
}


export function Render() {
	SendPacket(0);

}


export function Shutdown() {
	SendPacket(0, true);


}

export function Validate(endpoint) {
	return endpoint.interface === 2;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/tartarus-pro.png";
}
