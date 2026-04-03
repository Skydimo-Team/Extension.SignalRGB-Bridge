export function Name() { return "Logitech G402 Hyperion"; }
export function VendorId() { return 0x046d; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function ProductId() { return 0xC07E; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse"}
/* global
DpiControl:readonly
dpi1:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"dpi1", "group":"mouse", "label":"DPI", "step":"50", "type":"number", "min":"200", "max":"4000", "default":"800"},
	];
}
let Brightness;
let savedDpi1;
export function DeviceMessages() {
	return [
		{property: "Brightness Control Only", message:"Brightness Control Only", tooltip: "This device lacks ARGB leds, but brightness control is retained"},
	];
}
export function Initialize() {
	device.set_endpoint(1, 0x0001, 0xff00); // System IF

	 const packet = [];
	packet[0x00] = 0x10;
	packet[0x01] = 0xFF;
	packet[0x02] = 0x05;
	packet[0x03] = 0x3c;
	packet[0x04] = 0x01;
	device.write(packet, 7);

	if(savedDpi1 != dpi1 && DpiControl) {
		setDpi(dpi1);

	}

	device.set_endpoint(1, 0x0002, 0xff00); // Lighting IF
}

export function Render() {
	if(savedDpi1 != dpi1 && DpiControl) {
		setDpi(dpi1);
	  setDpi(dpi1);
	}
}


export function Shutdown(SystemSuspending) {

}

export function onBrightnessChanged() {
	sendZone();
	device.log(`Brightness is now set to: ${device.getBrightness()}`);
}

function sendZone() {
	device.set_endpoint(1, 0x0002, 0xff00); // Lighting IF

	const packet = [];
	packet[0x00] = 0x11;
	packet[0x01] = 0xFF;
	packet[0x02] = 0x05;
	packet[0x03] = 0x5B;
	packet[0x04] = 0x01;
	packet[0x05] = 0x00;
	packet[0x06] = 0x80;
	packet[0x07] = 0x00;
	packet[0x08] = device.getBrightness()/100 * 255;
	device.pause(20);
	device.write(packet, 20);
}


function setDpi(dpi) {
	device.set_endpoint(1, 0x0001, 0xff00); // System IF

	savedDpi1 = dpi1;

	const packet = [];
	packet[0] = 0x10;
	packet[1] = 0xFF;
	packet[2] = 0x0C;
	packet[3] = 0x3A;
	packet[4] = 0x00;
	packet[5] = Math.floor(dpi/256);
	packet[6] = dpi%256;
	device.write(packet, 7);
	device.read(packet, 7);
	device.pause(1);
}

export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xff00
     || endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/logitech/mice/g402.png";
}