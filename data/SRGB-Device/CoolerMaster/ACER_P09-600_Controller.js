export function Name() { return "ACER P09-600 RGB controller"; }
export function VendorId() { return 0x2516; }
export function ProductId() { return 0x010B; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/coolermaster"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [1, 1];}
export function DefaultScale(){return 1.0;}
export function ConflictingProcesses() { return ["PredatorSense.exe"]; }
export function SubdeviceController(){ return true; }
export function DeviceType(){return "lightingcontroller";}

/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vKeyNames = [];
const vKeyPositions = [];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {

	for(let fans = 0; fans < 3; fans++) {
		const ChannelID = fans + 1;
		device.createSubdevice(`12v Fan ${ChannelID}`);
		device.setSubdeviceName(`12v Fan ${ChannelID}`, `12v Fan ${ChannelID}`);
		device.setSubdeviceSize(`12v Fan ${ChannelID}`, 3, 3);
		device.setSubdeviceImageUrl(`12v Fan ${ChannelID}`, "https://assets.signalrgb.com/devices/default/fans/fan.png");
	}
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		device.write([0x00, 0x50, 0x55], 65);
		device.write([0x00, 0x41], 65);
	}

}

function sendColors(overrideColor) {
	const packet	= [];
	const RGBData	= [];

	for(let iIdx = 0; iIdx < 3; iIdx++) {
		const ChannelID = iIdx + 1;
		let Color;

		if(overrideColor){
			Color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			Color = hexToRgb(forcedColor);
		}else{
			Color = device.subdeviceColor(`12v Fan ${ChannelID}`, 1, 1);
		}

		RGBData[iIdx*3]		= Color[0];
		RGBData[iIdx*3+1]	= Color[1];
		RGBData[iIdx*3+2]	= Color[2];
	}

	// This is a nightmare
	device.write([0x00, 0x41, 0x01], 65);
	device.write([0x00, 0x56, 0x14], 65);
	device.write([0x00, 0x56, 0x20], 65);
	device.write([0x00, 0x56, 0x20, 0x01], 65);
	device.write([0x00, 0x56, 0x20, 0x02], 65);
	device.write([0x00, 0x56, 0x15, 0x00, 0x00, 0x04, 0x00, 0x15], 65);

	// I couldn't find a pattern, so this is the raw data
	device.write([0x00, 0x56, 0x21, 0x00, 0x00, 0x00, 0x31, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x08, 0x00, 0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00, RGBData[0], RGBData[1], RGBData[2], 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00, RGBData[3], RGBData[4], RGBData[5], 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00], 65);
	device.write([0x00, 0x56, 0x21, 0x01, 0x00, RGBData[6], RGBData[7], RGBData[8], 0xff, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x11, 0x00, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x00, 0x01, 0x00, 0x09, 0x00, 0x02, 0x00, 0x0d, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 65);
	device.write([0x00, 0x56, 0x21, 0x02], 65); // There's a 4th fan port, but the UI doesn't have a 4 fan, so this packet is empty

	device.write([0x00, 0x51, 0x28], 65);
	device.write([0x00, 0x50, 0x55], 65);

}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/acer/cases/predator-orion-9000.png";
}