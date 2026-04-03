export function Name() { return "LG UltraGear 38GL950G"; }
export function VendorId() { return 0x043e; }
export function ProductId() { return 0x9a57; }
export function Publisher() { return "Jazo Mannucci"; }
export function Size() { return [16, 16]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [10, 100]; }
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "other";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = [
	"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10",
	"Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20",
	"Led 21", "Led 22", "Led 23", "Led 24", "Led 25", "Led 26", "Led 27", "Led 28", "Led 29", "Led 30",
	"Led 31", "Led 32", "Led 33", "Led 34", "Led 35", "Led 36", "Led 37", "Led 38", "Led 39", "Led 40",
	"Led 41", "Led 42", "Led 43", "Led 44", "Led 45", "Led 46", "Led 47", "Led 48"
];
const vLedPositions = [
	[7, 0], [6, 0], [5, 0], [5, 1], [4, 1], [3, 2], [2, 3], [1, 4], [1, 5], [0, 5],
	[0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [1, 10], [1, 11], [2, 12], [3, 13], [4, 14],
	[5, 14], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [10, 14], [11, 14], [12, 13],
	[13, 12], [14, 11], [14, 10], [15, 10], [15, 9], [15, 8], [15, 7], [15, 6], [15, 5], [14, 5],
	[14, 4], [13, 3], [12, 2], [11, 1], [10, 1], [10, 0], [9, 0], [8, 0]
];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	device.write([0x00, 0x53, 0x43, 0xca, 0x02, 0x02, 0x03, 0x08, 0xd1, 0x45, 0x44], 65);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function sendColors(overrideColor){
	const newColors = [];

	for (let i=0; i<48; i++){
		const iX = vLedPositions[i][0];
		const iY = vLedPositions[i][1];
		var rgbCol;

		if(overrideColor){
			rgbCol = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			rgbCol = hexToRgb(forcedColor);
		}else{
			rgbCol = device.color(iX, iY);
		}

		newColors.push(fixColor(rgbToHex(rgbCol)));
	}

	let cmd = '5343c1029100';
	cmd += newColors.join('');
	cmd += calcCrc(cmd);
	cmd += '4544';

	const cmd1 = cmd.substring(0, 128);
	const cmd2 = cmd.substring(128, 256);
	const cmd3 = cmd.substring(256, cmd.length) + ('0'.repeat(78)); // pad with zeroes to get to 64 bytes / 128 chars

	device.write(hexToBytes("00"+cmd1), 65);
	device.write(hexToBytes("00"+cmd2), 65);
	device.write(hexToBytes("00"+cmd3), 65);
}

function fixColor(colorString){
	// each RGB component must be at least 1, otherwise the monitor can 'crash'
	if (colorString.length === 6){
		const red = colorString.substring(0, 2);
		const green = colorString.substring(2, 4);
		const blue = colorString.substring(4, 6);
		const nonZero = (value)=>{
			return value === '00' ? '01' : value;
		};

		return nonZero(red)+nonZero(green)+nonZero(blue);
	}

	return colorString;
}

function calcCrc(data){
	// This is the standard CRC algorithm, with the paramaters tweaked to what's
	// used here. This implementation is based off of:
	//   https://gist.github.com/Lauszus/6c787a3bc26fea6e842dfb8296ebd630
	const bytesData = hexToBytes(data);
	let crc = 0;
	bytesData.forEach(byte => {
		crc = crc^byte;

		// this loop could be removed?
		for (let i=0; i<8; i++){
			crc = crc << 1;

			if (crc & 0x100){
				crc = crc^0x101;
			}
		}
	});
	crc = crc.toString(16);

	if (crc.length == 1){
		crc = '0' + crc;
	}

	return crc;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function rgbToHex(rgb) {
	const intToHex = (integer)=>{
		const str = Number(integer).toString(16);

		return str.length == 1 ? "0" + str : str;
	};

	return intToHex(rgb[0]) + intToHex(rgb[1]) + intToHex(rgb[2]);
}

;

function hexToBytes(hex) {
	const bytes = [];

	for (let c = 0; c < hex.length; c += 2) {bytes.push(parseInt(hex.substr(c, 2), 16));}

	return bytes;
}

export function Validate(endpoint) {
	return (endpoint.interface === -1 || endpoint.interface === 0) && endpoint.usage === 1 && endpoint.usage_page === 0xff00;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/lg/ultragear-27gn950.png";
}
