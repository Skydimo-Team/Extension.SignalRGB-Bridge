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


export function Name() { return "Razer Orbweaver Chroma"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0207; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [10, 12]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "keyboard";}
const vLedNames = ["Keyboard"];

const vLedPositions = [[0, 1]];

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

function SendPacket() {
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x3F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x04;
	packet[7] = 0x03;
	packet[8] = 0x0A;
	packet[9] = 0x06;

	const col = device.color(0, 0);


	packet[10] = col[0];
	packet[11] = col[1];
	packet[12] = col[2];


	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
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

}

export function Validate(endpoint) {
	return endpoint.interface === 2 && endpoint.usage === 0x0002;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/orbweaver-chroma.png";
}