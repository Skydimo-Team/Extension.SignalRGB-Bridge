export function Name() { return "Razer Barracuda X Chroma"; }
export function VendorId() { return 0x1532; }
export function ProductId() { return 0x0574; }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/razer"; }
export function Size() { return [3, 4]; }
export function Type() { return "Hid"; }
export function DeviceType(){return "headphones";}
export function Validate(endpoint) { return endpoint.interface === 3 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF14 && endpoint.collection === 0x0004; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/razer/audio/barracuda-x-chroma.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

const vLeds = [
	  0,
	5,	1,
	4,	2,
	  3,
];

const vLedNames = [
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6"
];

const vLedPositions = [
		 [1, 0],
	[0, 1], [2, 1],
	[0, 2], [2, 2],
		 [1, 3],
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {

}

export function Render() {
	sendColors();
	device.pause(1);
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {

	const RGBData	= [];

	for (let idx = 0; idx < vLedPositions.length; idx++) {
		const iPxX = vLedPositions[idx][0];
		const iPxY = vLedPositions[idx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		RGBData[(vLeds[idx]*3)] 	= color[0];
		RGBData[(vLeds[idx]*3)+1]	= color[1];
		RGBData[(vLeds[idx]*3)+2]	= color[2];
	}

	const header	= [0x02, 0x00, 0x60, 0x00, 0x00, 0x00, (6 * 3) + 6, 0x0F, 0x03, 0x80, 0x00, 0x00, 0x00, 0x00, 6 - 1];
	const packet	= header.concat(RGBData);

	device.write(packet, 65); // Send commands
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
