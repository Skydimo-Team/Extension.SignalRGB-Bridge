export function Name() { return "Corsair Nexus"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x1B8E; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [320, 200]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lcd"}
/* global
*/
export function ControllableParameters() {
	return [

	];
}

export function Documentation(){ return "troubleshooting/corsair"; }

export function Initialize() {
	device.send_report([0x03, 0x1d, 0x01, 0x00], 32);
	device.get_report([0x03, 0x1d, 0x01, 0x00], 32); //Returns literally 3
	device.send_report([0x03, 0x19], 32);
	device.get_report([0x03, 0x19], 32);
	device.send_report([0x03, 0x20, 0x00, 0x19, 0x79, 0xE7, 0x32, 0x2E, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);
	device.get_report([0x03, 0x20, 0x00, 0x19, 0x79, 0xE7, 0x32, 0x2E, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);
	device.send_report([0x03, 0x0B, 0x40, 0x01, 0x79, 0xE7, 0x32, 0x2e, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);
	device.get_report([0x03, 0x0B, 0x40, 0x01, 0x79, 0xE7, 0x32, 0x2e, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32); //THEY ALL RETURN 3

}

export function Render() {
	SendColorData();
	//colorgrabber();
	getInput();
}

export function Shutdown(SystemSuspending) {
	sendReportString("03 0D 01 01 78 00 C0 03 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF", 32);
	sendReportString("03 01 64 01 78 00 C0 03 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF 2F 2F 2F FF", 32);
}

const vKeyNames = [
	"Device Wide",
];

function sendReportString(string, size){
	const packet= [];
	const data = string.split(' ');

	for(let i = 0; i < data.length; i++){
		packet[parseInt(i, 16)] =parseInt(data[i], 16);//.toString(16)
	}

	device.send_report(packet, size);
}


const vKeyPositions = [
	[0, 0]
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}
const RGBdata = new Array(38000);
let offset = 0;

let packetsSent = 0;

function getInput() {
	const packet = device.read([0x00], 512, 1);

	if(packet[0] === 0x01 && packet[1] === 0x02 && packet[2] === 0x21) {
		const position = (packet[7] << 8) + (packet[6] & 0xff);
		device.log(`Position: ${position}`);
	}
}

function colorgrabber() {

	const RGBData = device.getImageBuffer(0, 0, 319, 199, {flipH: false, outputWidth: 640, outputHeight: 48, format: "BMP"});

	let BytesLeft = RGBData.length;

	packetsSent = 0;


	while(BytesLeft > 0) {
		const BytesToSend = Math.min(1016, BytesLeft);

		if(BytesToSend < 1015) {
			sendZone(BytesLeft, RGBData.splice(0, BytesToSend), packetsSent, 0x01);
			device.log(packetsSent);
		} else {
			sendZone(BytesToSend, RGBData.splice(0, BytesToSend), packetsSent, 0x00);
		}

		BytesLeft -= BytesToSend;
		packetsSent++;
	}

}

function sendZone(packetRGBDataLength, RGBData, packetsSent, finalPacket) {

	let packet = [0x02, 0x05, 0x40, finalPacket, packetsSent, 0x00, (packetRGBDataLength >> 8 & 0xFF), (packetRGBDataLength & 0xFF)];
	packet = packet.concat(RGBData);

	const result = device.write(packet, 1024);
}

function SendColorData() {

	for (let row  = 0; row < 48; row = row + 1) {
		for(let iIdx= 0 + offset; iIdx < 641; iIdx = iIdx + 2) {
			var col;

			col = device.color(iIdx/2, row*4);

			const iLedIdx = (iIdx+row*640) * 4;
			RGBdata[iLedIdx] =   col[2];
			RGBdata[iLedIdx+1] = col[1];
			RGBdata[iLedIdx+2] = col[0];
			RGBdata[iLedIdx+3] = 0xFF;
		}
	}

	for (let row = 0; row < 121;row++) {
		let packet = [];
		packet[0x00]   = 0x02; //This looks a bit familiar eh?
		packet[0x01]   = 0x05;
		packet[0x02]   = 0x40;

		packet[0x03]   = row === 120 ? 1 : 0;
		packet[0x04]   = row ;
		packet[0x05]   = 0x00;
		packet[0x06]   = 0xF8;
		packet[0x07]   = 0x03;

		packet  = packet.concat(RGBdata.slice(row*4*254, row*4*254 + 4*254));

		device.write(packet, 1024);
		offset === 1 ? offset = 1: offset = 0;

	}
}

export function Validate(endpoint) {
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/misc/nexus.png";
}