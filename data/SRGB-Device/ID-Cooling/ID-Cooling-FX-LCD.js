import LCD from "@SignalRGB/lcd";
export function Name() { return "ID-Cooling FX-LCD"; }
export function VendorId() { return 0x2000; }
export function ProductId() { return 0x3000; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [240, 120];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "lcd"; }
export function ControllableParameters() { return []; }

export function SubdeviceController() { return true; }

export function Initialize() {
	LCD.initialize({ width: 240, height: 240 });
	device.write([0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x44, 0x49, 0x53], 1025);
	device.write([0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x4c, 0x49, 0x47, 0x00, 0x00, 0x19], 1025);
	device.setFrameRateTarget(40);
}

export function Render() {
	colorgrabber();
}

export function Shutdown(SystemSuspending) {
	device.write([0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x43, 0x4c, 0x45, 0x00, 0x00, 0x44, 0x43], 1025);
	device.write([0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x48, 0x41, 0x4e], 1025);
}

function colorgrabber() {
	const RGBData = LCD.getFrame({format: "JPEG"});

	let BytesLeft = RGBData.length;
	let firstPacket = true;

	while(BytesLeft > 0) {
		const BytesToSend =  firstPacket ?
			Math.min(992, BytesLeft) :
			Math.min(1024, BytesLeft);

		if(firstPacket) {
			sendFirstPacket(RGBData.splice(0, BytesToSend), BytesLeft + 32);
			firstPacket = false;
		} else {
			sendImagePacket(RGBData.splice(0, BytesToSend));
		}

		BytesLeft -= BytesToSend;
	}

}

function sendFirstPacket(imageData, totalImageSize) {
	const packet = [0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x44, 0x52, 0x41, 0x00, 0x00,
		(totalImageSize >> 8 & 0xFF), (totalImageSize & 0xFF), 0xb1]
		.concat(new Array(19).fill(0))
		.concat(imageData);

	device.write(packet, 1025);
}

function sendImagePacket(imageData) {
	const packet = [0x00].concat(imageData);

	device.write(packet, 1025);
}

export function Validate(endpoint) {
	return endpoint.interface === 0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/id-cooling/aios/fx-lcd.png";
}