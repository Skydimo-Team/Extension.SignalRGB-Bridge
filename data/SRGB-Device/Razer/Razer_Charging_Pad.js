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


export function Name() { return "Razer Charging Pad"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0F26; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [5, 5]; }
export function DefaultPosition(){return [50, 100];}
export function DefaultScale(){return 8.0;}
export function Type() { return "Hid"; }
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

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}


const vLedNames = [
	"Ring Led 1", "Ring Led 2", "Ring Led 3",
	"Ring Led 10",               "Ring Led 4",
	"Ring Led 9",                "Ring Led 5",
	"Ring Led 8", "Ring Led 7", "Ring Led 6"
];
const vLedPositions = [
	[1, 0], [2, 1], [3, 1],
	[0, 1],              [4, 1],
	[0, 2],              [4, 2],
	[1, 3], [2, 3], [3, 3],
];
const vLedMapping = [
	0, 9, 8,
	1,        7,
	2,        6,
	3,  4, 5,
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

	var packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x02;
	packet[7] = 0x00;
	packet[8] = 0x04;
	packet[9] = 0x03;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	var packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x06;
	packet[7] = 0x0F;
	packet[8] = 0x02;
	packet[9] = 0x00;
	packet[10] = 0x00;
	packet[11] = 0x03;
	packet[12] = 0x02;
	packet[13] = 0x01;

	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	//Enable Idle Mode
	var packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x03;
	packet[7] = 0x0F;
	packet[8] = 0x04;
	packet[9] = 0x01;
	packet[10] = 0x00;
	packet[11] = 0x0FF;

	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);

	//Enable all charge modes
	for(let i = 0x20; i <= 0x22; i++){
		var packet = [];
		packet[0] = 0x00;
		packet[1] = 0x00;
		packet[2] = 0x1F;
		packet[3] = 0x00;
		packet[4] = 0x00;
		packet[5] = 0x00;
		packet[6] = 0x03;
		packet[7] = 0x0F;
		packet[8] = 0x04;
		packet[9] = 0x01;
		packet[10] = i;
		packet[11] = 0x0FF;

		packet[89] = CalculateCrc(packet);
		device.send_report(packet, 91);
	}

}

function SendPacket(shutdown = false) {
	var packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x23;
	packet[7] = 0x0F;
	packet[8] = 0x03;
	packet[11] = 0;
	packet[13] = 0x09;


	for(let iIdx = 0; iIdx < vLedMapping.length; iIdx++){

		var iPxX = vLedPositions[iIdx][0];
		var iPxY = vLedPositions[iIdx][1];
		var col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iPxX, iPxY);
		}

		packet[vLedMapping[iIdx]*3+14] = col[0];
		packet[vLedMapping[iIdx]*3+15] = col[1];
		packet[vLedMapping[iIdx]*3+16] = col[2];
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
	device.pause(1); // We need a pause here (between packets), otherwise the ornata can't keep up.

	//02 1F 00 00 00 09 0F 02 01 20 01 00 01 01 FF FF FF
	for(let mode = 0x20; mode < 0x23;mode++){
		var packet = [];
		packet[0] = 0x00;
		packet[1] = 0x00;
		packet[2] = 0x1F;
		packet[3] = 0x00;
		packet[4] = 0x00;
		packet[5] = 0x00;
		packet[6] = 0x09;
		packet[7] = 0x0F;
		packet[8] = 0x02;
		packet[9] = 0x01;
		packet[10] = mode;
		packet[11] = 0x01;
		packet[12] = 0x00;
		packet[13] = 0x02;
		packet[14] = 0x01;

		//grab first led for overrides/settings
		var iPxX = vLedPositions[0][0];
		var iPxY = vLedPositions[0][1];
		var col;

		if(shutdown){
			col = hexToRgb(shutdownColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			//but grab middle of device
			col = device.color(3, 3);
		}

		packet[15] = col[0];
		packet[16] = col[1];
		packet[17] = col[2];

		packet[89] = CalculateCrc(packet);

		device.send_report(packet, 91);
	}


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
	SendPacket();

}


export function Shutdown() {
	SendPacket(true);


	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x03;
	packet[7] = 0x0F;
	packet[8] = 0x04;
	packet[9] = 0x01;
	packet[89] = CalculateCrc(packet);
	device.send_report(packet, 91);
}

export function Validate(endpoint) {
	return endpoint.interface === 0; //&& endpoint.usage === 0x0002;

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/misc/charging-pad.png";
}