import LCD from "@SignalRGB/lcd";

export function Name() {
	return "THERMALRIGHT GRAND VISION LCD";
}

export function VendorId() {
	return 0x87AD;
}

export function ProductId() {
	return 0x70DB;
}

export function Publisher() {
	return "WhirlwindFX";
}

export function Size() {
	return [1, 1];
}

export function Type() {
	return "rawusb";
}

export function DeviceType() {
	return "lcd";
}

export function ConflictingProcesses() {
	return ["TRCC.exe"];
}

// Return empty array to explicitly indicate no controllable parameters
// This prevents any lighting or configuration tabs from appearing
export function ControllableParameters() {
	return [];
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/thermalright/aio/grand-vision.png";
}

export function Initialize() {
	const packet = [0x12, 0x34, 0x56, 0x78];
	packet[56] = 0x01;

	device.bulk_transfer(0x01, packet, 64);

	// Initialize LCD module as 480x480 square display
	LCD.initialize({ width: 480, height: 480, circular: false });
}

export function Render() {
	sendLCDFrame();
}

export function Shutdown(SystemSuspending) {
}

export function SubdeviceController() { return true; }

function sendLCDFrame() {
	const jpegData = LCD.getFrame({ format: "JPEG" });

	const header = [0x12, 0x34, 0x56, 0x78, 0x02];

	// Width: 480 (0x01E0) - little endian
	header[8] = 0xE0;
	header[9] = 0x01;

	// Height: 480 (0x01E0) - little endian
	header[12] = 0xE0;
	header[13] = 0x01;

	header[56] = 0x02;

	const jpegSize = jpegData.length;
	header[60] = jpegSize & 0xFF;
	header[61] = (jpegSize >> 8) & 0xFF;
	header[62] = (jpegSize >> 16) & 0xFF;
	header[63] = (jpegSize >> 24) & 0xFF;

	const packet = header.concat(jpegData);

	device.bulk_transfer(0x01, packet, packet.length);
}