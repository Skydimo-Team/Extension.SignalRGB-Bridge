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


export function Name() { return "Razer Tomahawk ATX Case"; }
export function VendorId() { return 0x1532; }
export function Documentation() { return "troubleshooting/razer"; }
export function ProductId() { return 0x0f17; }
export function Publisher() { return "Draxi"; }
export function Size() { return [20, 2]; }
export function Type() { return "Hid"; }
export function DefaultPosition() { return [0, 0]; }
export function DefaultScale() { return 8.0; }
export function DeviceType(){return "case";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{ "property": "shutdownColor", "group": "lighting", "label": "Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min": "0", "max": "360", "type": "color", "default":"#000000" },
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default":"#009bde" },
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

const vLedNames = [
	"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20", "Led 21", "Led 22", "Led 23", "Led 24", "Led 25", "Led 26", "Led 27", "Led 28", "Led 29", "Led 30", "Led 31", "Led 32", "Led 33", "Led 34", "Led 35", "Led 36", "Led 37", "Led 38", "Led 39", "Led 40"
];
const vLedPositions = [

	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1]

];

const vLedDecode = [
	35, 25, 15, 5, 36, 26, 16, 6, 37, 27, 17, 7, 38, 28, 18, 8, 39, 29, 19, 9, 30, 20, 10, 0, 31, 21, 11, 1, 32, 22, 12, 2, 33, 23, 13, 3, 34, 24, 14, 4
];


export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function EnableSoftwareControl() {
	const report = GetReport(0x0F, 0x03, 0x47);

	report[2] = 0x3F; // transaction id.

	report[11] = 0; // row index.

	report[13] = 15; // led count.

	report[89] = CalculateCrc(report);


	device.send_report(report, 91);
}


function ReturnToHardwareControl() {

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
	packet[6] = 0x35;
	packet[7] = 0x0f;
	packet[8] = 0x03;
	packet[9] = 0x00;
	packet[10] = 0x00;
	packet[11] = idx;
	packet[12] = 0x00;
	packet[13] = 0x0f;

	const chunk_start = idx * 10;
	const chunk_end = chunk_start + 10;

	for (let iIdx = chunk_start; iIdx < chunk_end; iIdx++) {

		const vLedPos = [];

		let i = 0;

		while (i < 40) {
			//get index of i in vLedDecode
			const iIdx = vLedDecode.indexOf(i);
			vLedPos.push(vLedPositions[iIdx]);
			i++;
		}

		const iPxX = vLedPos[iIdx][0];
		const iPxY = vLedPos[iIdx][1];
		var col;

		if (shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		const iLedIdx = (iIdx % 10 * 3) + 32;
		packet[iLedIdx] = col[0];
		packet[iLedIdx + 1] = col[1];
		packet[iLedIdx + 2] = col[2];
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	device.pause(1);


}


function Apply() {
	const packet = []; //new Array(91).fill(0);
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x3F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x0C;
	packet[7] = 0x0F;
	packet[8] = 0x02;
	packet[11] = 0x08;

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
}


export function Render() {
	SendPacket(0);
	SendPacket(1);
	SendPacket(2);
	SendPacket(3);
}


export function Shutdown() {
	SendPacket(0, true);
	SendPacket(1, true);
	SendPacket(2, true);
	SendPacket(3, true);
}

export function Validate(endpoint) {
	return endpoint.interface === 2 && endpoint.usage === 0x0002;

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/cases/tomahawk-itx.png";
}