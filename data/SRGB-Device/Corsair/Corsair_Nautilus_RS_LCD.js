import LCD from "@SignalRGB/lcd";

export function Name() { return "Corsair Nautilus RS LCD"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x0C55; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lcd"}
export function ControllableParameters() { return []; }

export function SubdeviceController() { return true; }

const pollInterval = 30000;
let currentTime = Date.now();
let packetsSent = 0;

export function Initialize() {
	// Standard Corsair LCD initialization sequence
	device.send_report([0x03, 0x1d, 0x01, 0x00], 32);
	device.get_report([0x03, 0x1d, 0x01, 0x00], 32);
	device.send_report([0x03, 0x19], 32);
	device.get_report([0x03, 0x19], 32);
	device.send_report([0x03, 0x20, 0x00, 0x19, 0x79, 0xE7, 0x32, 0x2E, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);
	device.get_report([0x03, 0x20, 0x00, 0x19, 0x79, 0xE7, 0x32, 0x2E, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);
	device.send_report([0x03, 0x0B, 0x40, 0x01, 0x79, 0xE7, 0x32, 0x2e, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);
	device.get_report([0x03, 0x0B, 0x40, 0x01, 0x79, 0xE7, 0x32, 0x2e, 0x30, 0x2E, 0x30, 0x2E, 0x33], 32);

	// Initialize LCD canvas - Nautilus RS LCD is 480x480 pixels
	LCD.initialize({ width: 480, height: 480 });
}

export function Render() {
	sendImageToDevice();
}

export function Shutdown(SystemSuspending) {
	// Send shutdown command
	device.send_report([0x03, 0x1E, 0x40, 0x01, 0x43, 0x00, 0x69, 0x00], 32);
}

function sendImageToDevice() {
	// Get the rendered frame as JPEG
	const imageData = LCD.getFrame({format: "JPEG"});

	let bytesLeft = imageData.length;
	packetsSent = 0;

	while(bytesLeft > 0) {
		const bytesToSend = Math.min(1016, bytesLeft);
		const finalPacket = (bytesToSend < 1015) ? 0x01 : 0x00;

		let imageChunk;

		if(bytesToSend < 1015) {
			// Last packet - pad to full size
			imageChunk = imageData.slice((1016 * packetsSent));

			// Pad with previous data to reach 1016 bytes
			while(imageChunk.length < 1016) {
				imageChunk.push(imageData[(1016 * (packetsSent - 1)) + imageChunk.length]);
			}
		} else {
			// Regular packet
			imageChunk = imageData.slice((1016 * packetsSent), (1016 * packetsSent) + bytesToSend);
		}

		sendPacket(imageChunk.length, imageChunk, packetsSent, finalPacket);

		bytesLeft -= bytesToSend;
		packetsSent++;
	}
}

function sendPacket(dataLength, imageData, packetNumber, finalPacket) {
	// Packet format: [0x02, 0x05, 0x40, finalPacket, packetNumber, 0x00, lengthLow, lengthHigh, ...imageData]
	let packet = [
		0x02,                           // Command type
		0x05,                           // Subcommand type
		0x40,                           // Zone identifier (standard for Corsair LCD)
		finalPacket,                    // Final packet flag (0x01 = last, 0x00 = more)
		packetNumber,                   // Packet sequence number
		0x00,                           // Reserved
		(dataLength & 0xFF),           // Length low byte
		(dataLength >> 8 & 0xFF)       // Length high byte
	];

	packet = packet.concat(imageData);

	// Send via bulk transfer (1024 bytes)
	device.write(packet, 1024);

	// Send keepalive poll every 30 seconds on final packet
	if(Date.now() - currentTime >= pollInterval && finalPacket) {
		device.send_report([0x03, 0x19, 0x40, finalPacket, packetNumber, 0x00, (dataLength & 0xFF), (dataLength >> 8 & 0xFF)], 32);
		currentTime = Date.now();
	}
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/aio/nautilus-rs-lcd.png";
}
