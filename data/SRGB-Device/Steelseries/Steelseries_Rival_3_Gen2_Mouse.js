export function Name() { return "SteelSeries Rival 3 Gen 2"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x1870; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DeviceType(){return "mouse";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
DpiControl:readonly
dpi1:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = [
	"Front Zone", "Mid Zone", "Rear Zone"
];

const vLedPositions = [
	[2, 0], [2, 1], [2, 2]
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
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function Validate(endpoint) {
	return endpoint.interface === 3;
}

const pollingDict = {
	125 : 0x04,
	250 : 0x03,
	500 : 0x02,
	1000 : 0x01
};

function setPollingRate(pollingRate) {
	device.write([0x00, 0x2B, pollingDict[pollingRate]], 65);
}

function setBrightness() {
	device.write([0x00, 0x23, 100], 65);
	//Force full brightness with 100
}

function grabFirmwareVersion() {
	device.write([0x00, 0x90], 65);

	const fwPacket = device.read([0x00, 0x90], 65);

	device.log(fwPacket);
}

function sendColors(overrideColor) {
	const packet = [0x00, 0x21, 0x07];

	for(let iIdx = 0; iIdx < vLedPositions.length; iIdx++){
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let color;

		if(overrideColor){
			color = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		}else{
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = 3 + iIdx * 3;
		packet[iLedIdx] = color[0];
		packet[iLedIdx+1] = color[1];
		packet[iLedIdx+2] = color[2];

	}

	device.write(packet, 65);

	device.pause(1);
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
	return "https://assets.signalrgb.com/devices/brands/steelseries/mice/rival-3.png";
}