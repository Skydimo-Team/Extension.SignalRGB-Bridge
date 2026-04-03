export function Name() { return "Razer Deathadder Essential"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return [0x0098, 0x0071]; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "mouse";}
export function Validate(endpoint) { return endpoint.interface === 0 && endpoint.usage === 0x0002; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-essential.png"; }
/* global
LightingMode:readonly
DpiControl:readonly
dpi1:readonly
*/
export function ControllableParameters(){
	return [
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's brightness comes from. Canvas will pull from the active Effect, while Forced will override it to a specific brightness", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"DpiControl", group:"mouse", label:"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", type:"boolean", default:"false"},
		{property:"dpi1", group:"mouse", label:"DPI", step:"50", type:"number", min:"200", max:"6400", default:"800"},
	];
}

export function DeviceMessages() {
	return [
		{property: "Limited functionality", message:"Limited functionality", tooltip: "This device has only brightness control, it's a single color brightness device only."},
	];
}

const vLeds = [0];
const vLedNames = ["Brightness"];
const vLedPositions = [[0, 0]];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	if(DpiControl) {
		setDPIRazer(dpi1);
	}
}

export function Render() {
	sendBrightness();

	if(DpiControl) {
		setDPIRazer(dpi1);
	}
}

export function Shutdown(SystemSuspending) {
	sendBrightness("#000000");
}

export function onBrightnessChanged() {
	device.log(`Brightness is now set to: ${device.getBrightness()}`);
}

function sendBrightness(overrideColor){

	const packet = [];
	let color;

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

	if(overrideColor){
		packet[11] = 0x00;
	}else if (LightingMode === "Forced") {
		packet[11] = device.getBrightness();
	}else{
		color = device.color(0, 0);

		// dumb way to get brightness, not Luminance accurate, but should do it for now.
		const ledBrightness = ((color[0] * 0.3) + (color[1] * 0.3) + (color[2] * 0.3)) / 3;

		packet[11] = Math.ceil(ledBrightness);
	}

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
}

function setDPIRazer(dpi){
	const packet = [];
	packet[0] = 0x00;
	packet[1] = 0x00;
	packet[2] = 0x1F;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x07;
	packet[7] = 0x04;
	packet[8] = 0x05;
	packet[9] = 0x00;
	packet[10] = Math.floor(dpi/256);
	packet[11] = dpi%256;
	packet[12] = Math.floor(dpi/256);
	packet[13] = dpi%256;
	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}
