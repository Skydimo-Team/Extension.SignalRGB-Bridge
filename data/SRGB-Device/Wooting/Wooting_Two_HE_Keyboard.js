export function Name() { return "Wooting Two HE"; }
export function VendorId() { return 0x31e3; }
export function ProductId() { return [0x1220, 0x1221, 0x1222, 0x1230, 0x1231, 0x1232]; }
export function Publisher() { return "twelveroses"; }
export function Size() { return [21, 6]; }
export function ConflictingProcesses() { return ["wootility-lekker.exe"]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/wooting/keyboards/two-he.png"; }
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

const vKeysANSI = [
	0,      2, 3, 4, 5,      6, 7, 8, 9,      10, 11, 12, 13,      14, 15, 16,       17, 18, 19, 20,
	21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,  34,       35, 36, 37,       38, 39, 40, 41,
	42,  43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,  55,      56, 57, 58,       59, 60, 61, 62,
	63,  64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,    76,						     80, 81, 82,
	84,   86, 87, 88, 89, 90, 91, 92, 93, 94, 95,     97,				99,		     101, 102, 103, 104,
	105, 106, 107,          111,           115, 116, 117, 118,     119, 120, 121,       123,   124
];

const vKeyNamesANSI = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "A1", "A2", "A3", "Mode",              //20
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",       "Num 0", "Num ."               //13
];

const vKeyPositionsANSI = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],           [14, 0], [15, 0], [16, 0],   [17, 0], [18, 0], [19, 0], [20, 0], //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                             [17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                 [13, 4],           [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [18, 5] // 13
];

const vKeysISO = [
	75, 85, // iso
	0,      2, 3, 4, 5,      6, 7, 8, 9,      10, 11, 12, 13,      14, 15, 16,       17, 18, 19, 20,
	21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,  34,       35, 36, 37,       38, 39, 40, 41,
	42,  43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,  55,      56, 57, 58,       59, 60, 61, 62,
	63,  64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,    76,						     80, 81, 82,
	84,   86, 87, 88, 89, 90, 91, 92, 93, 94, 95,     97,				99,		     101, 102, 103, 104,
	105, 106, 107,          111,           115, 116, 117, 118,     119, 120, 121,       123,   124
];

const vKeyNamesISO = [
	"< ISO", "# ISO", // iso
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "A1", "A2", "A3", "Mode",              //20
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",       "Num 0", "Num ."               //13
];

const vKeyPositionsISO = [
	[12, 3], [1, 4], // iso
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],           [14, 0], [15, 0], [16, 0],   [17, 0], [18, 0], [19, 0], [20, 0], //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                             [17, 3], [18, 3], [19, 3], // 17
	[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],           [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [19, 5] // 13
];

export function LedNames() {
	return Wooting.config.vKeyNames;
}

export function LedPositions() {
	return Wooting.config.vKeyPositions;
}

let writeLength;

export function Initialize() {
	writeLength = device.getHidInfo().writeLength;
	device.log(`Device Write Length: ${writeLength}`);

	Wooting.getKeyboardLayout();
	Wooting.config.deviceProtocolType = "Modern";
	Wooting.initLighting();
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

function sendColors(overrideColor) {
	const RGBData = [];
	const vKeys = Wooting.getvKeys();
	const vKeyPositions = Wooting.getvKeyPositions();

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		let col;
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}
		const wootingColor = Wooting.compressLEDData(col);
		const iLedIdx = vKeys[iIdx] * 2;
		RGBData[iLedIdx] = wootingColor & 0xff;
		RGBData[iLedIdx+1] = wootingColor >> 8 & 0xff;
	}


	if(writeLength > 250) {
		Wooting.sendLargeModernLightingPacket(RGBData);
	} else {
		let packetCount = 0;

		while(packetCount < 4) {
			if(packetCount === 0) {
				const packet = RGBData.splice(0, 61);
				Wooting.sendModernLightingPacket(packet, true);
			} else {
				const packet = RGBData.splice(0, 64);
				Wooting.sendModernLightingPacket(packet);
			}

			packetCount++;
		}
	}
}

class wootingProtocol { //This protocol will be common across the range of wooting keebs. Though I don't have a good way to implement the legacy ones.
	constructor() {
		this.commands = {
			deviceConfig : 0x13,
			colorControl : 0x0B,
			singleColor  : 0x1E,
			resetSingleKey : 0x1F,
			resetAllKeys : 0x20,
			initColors : 0x21
		},

		this.config = {
			deviceProtocolType : "Modern",
			deviceLayout : "ANSI",
			vKeys : vKeysANSI,
			vKeyNames : vKeyNamesANSI,
			vKeyPositions : vKeyPositionsANSI
		};
	}

	getvKeys() { return this.config.vKeys; }
	setvKeys(vKeys) { this.config.vKeys = vKeys; }

	getvKeyNames() { return this.config.vKeyNames; }
	setvKeyNames(vKeyNames) { this.config.vKeyNames = vKeyNames; }

	getvKeyPositions() { return this.config.vKeyPositions; }
	setvKeyPositions(vKeyPositions) { this.config.vKeyPositions = vKeyPositions; }

	sendPacket(data) {
		const packet = [0x00, 0xD0, 0xDA].concat(data);//Data is in reverse order
		device.send_report(packet, 8);

		const returnPacket = device.read(packet, 64);

		return returnPacket;
	}

	sendPacketNoResponse(data) {
		let packet = [0x00, 0xD0, 0xDA];
		data  = data || [ 0x00, 0x00, 0x00 ]; //Data is in reverse order
		packet = packet.concat(data);
		device.send_report(packet, 8);
	}

	sendLargeModernLightingPacket(data) {
		let packet = [0x00, 0xD0, 0xDA, this.commands.colorControl];

		data  = data || [ 0x00, 0x00, 0x00 ]; //Data is in reverse order
		packet = packet.concat(data);
		device.write(packet, 265);
	}

	sendModernLightingPacket(data, header = false) {
		let packet = [0x00];

		if(header) {
			packet = [0x00, 0xD0, 0xDA, this.commands.colorControl];
		}

		data  = data || [ 0x00, 0x00, 0x00 ]; //Data is in reverse order
		packet = packet.concat(data);
		device.write(packet, 65);
	}

	getKeyboardLayout() {
		const packet = [this.commands.deviceConfig, 0x00, 0x00, 0x00, 0x00];
		const returnPacket = this.sendPacket(packet);

		let layout;

		device.log(`Keeb layout packet return: ${returnPacket}`);

		if(this.config.deviceProtocolType === "Modern") {
			layout = returnPacket[11];
		} else {
			layout = returnPacket[1];
		}

		if(layout === 0) {
			this.config.deviceLayout = "ANSI";
			this.setvKeys(vKeysANSI);
			this.setvKeyNames(vKeyNamesANSI);
			this.setvKeyPositions(vKeyPositionsANSI);
		} else if(layout === 1) {
			this.config.deviceLayout = "ISO";
			this.setvKeys(vKeysISO);
			this.setvKeyNames(vKeyNamesISO);
			this.setvKeyPositions(vKeyPositionsISO);
		}

		device.log(`Keyboard Layout is ${this.config.deviceLayout}.`);
	}

	initLighting() {
		const packet = [this.commands.initColors, 0x00, 0x00, 0x00, 0x00];
		this.sendPacketNoResponse(packet); //This gives no response.
	}

	compressLEDData(RGBData) {
		let compressedRGBData = 0x0000;
		compressedRGBData |= (RGBData[0] & 0xf8) << 8;
		compressedRGBData |= (RGBData[1] & 0xfc) << 3;
		compressedRGBData |= (RGBData[2] & 0xf8) >> 3;

		return compressedRGBData;
	}
}

const Wooting = new wootingProtocol();

function hexToRgb(hex) {

	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
