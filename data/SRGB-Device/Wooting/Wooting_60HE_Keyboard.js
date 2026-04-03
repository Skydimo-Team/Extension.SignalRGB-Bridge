export function Name() { return "Wooting 60 HE"; }
export function VendorId() { return 0x31e3; }
export function ProductId() { return [0x1310, 0x1312, 0x1300, 0x1302, 0x1322, 0x1320]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [14, 5]; }
export function ConflictingProcesses() { return ["wootility-lekker.exe"]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 1 && endpoint.usage_page === 0x1337 || endpoint.usage_page === 0xFF55; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/wooting/keyboards/60he.png"; }
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

const vKeysANSI =
[
	21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
	42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
	63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,    76,
	84, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,    97,
	105, 106, 107, 109, 110, 111, 112, 113, 115, 116, 117, 118,
];

const vKeyNamesANSI =
[
	"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", //14
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",      //14
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",      //13
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", //12
	"Left Ctrl", "Left Win", "Left Alt", "Space1", "Space2", "Space3", "Space4", "Space5", "Right Alt", "Menu", "Right Ctrl", "Fn", //12
];

const vKeyPositionsANSI =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],          //14
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],          //14
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],  	          //13
	        [0, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],          //12
	[0, 4], [1, 4], [2, 4],         [3, 4], [4, 4], [6, 4], [8, 4], [9, 4],         [10, 4], [11, 4], [12, 4], [13, 4],          //12
];

const vKeysISO =
[
	21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
	42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
	63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
	84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 97,
	105, 106, 107, 109, 110, 111, 112, 113, 115, 116, 117, 118,
];

const vKeyNamesISO =
[
	"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", //14
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",      //14
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",      //13
	"Left Shift", "ISO_>", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", //12
	"Left Ctrl", "Left Win", "Left Alt", "Space1", "Space2", "Space3", "Space4", "Space5", "Right Alt", "Menu", "Right Ctrl", "Fn", //12
];

const vKeyPositionsISO =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],          //14
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],          //14
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],  	          //13
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],          //12
	[0, 4], [1, 4], [2, 4],         [3, 4], [4, 4], [6, 4], [8, 4], [9, 4],         [10, 4], [11, 4], [12, 4], [13, 4],          //12
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

	Wooting.detectProtocol();
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
		RGBData[iLedIdx] = wootingColor &0xff;
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
			vKeyPositions : vKeyPositionsANSI,
			useLegacyProtocol : false, // false = 0xFF55 (0xD1/0x05), true = 0x1337 (0xD0/0x00)
			protocolHeader : 0xD1,
			reportId : 0x05
		};
	}

	getvKeys() { return this.config.vKeys; }
	setvKeys(vKeys) { this.config.vKeys = vKeys; }

	getvKeyNames() { return this.config.vKeyNames; }
	setvKeyNames(vKeyNames) { this.config.vKeyNames = vKeyNames; }

	getvKeyPositions() { return this.config.vKeyPositions; }
	setvKeyPositions(vKeyPositions) { this.config.vKeyPositions = vKeyPositions; }

	detectProtocol() {
		device.log("Searching for endpoints...");
		const deviceEndpoints = device.getHidEndpoints();

		// Check if any endpoint has usage_page 0xFF55
		if (deviceEndpoints.some(endpoint => endpoint.usage_page === 0xFF55)) {
			device.log("New protocol detected (0xFF55): Using 0xD1/0x05");
			this.config.useLegacyProtocol = false;
			this.config.protocolHeader = 0xD1;
			this.config.reportId = 0x05;
			return;
		}

		// Check if any endpoint has usage_page 0x1337
		if (deviceEndpoints.some(endpoint => endpoint.usage_page === 0x1337)) {
			device.log("Legacy protocol detected (0x1337): Using 0xD0/0x00");
			this.config.useLegacyProtocol = true;
			this.config.protocolHeader = 0xD0;
			this.config.reportId = 0x00;
			return;
		}

		// Default to new protocol if neither found
		device.log("Defaulting to new protocol (0xFF55)");
		this.config.useLegacyProtocol = false;
		this.config.protocolHeader = 0xD1;
		this.config.reportId = 0x05;
	}

	sendPacket(data) {
		const packet = [0x00, this.config.protocolHeader, 0xDA].concat(data);//Data is in reverse order
		device.send_report(packet, 8);

		const returnPacket = device.read(packet, 64);

		return returnPacket;
	}

	sendPacketNoResponse(data) {
		let packet = [0x00, this.config.protocolHeader, 0xDA];
		data  = data || [ 0x00, 0x00, 0x00 ]; //Data is in reverse order
		packet = packet.concat(data);
		device.send_report(packet, 8);
	}

	sendLargeModernLightingPacket(data) {
		let packet = [this.config.reportId, this.config.protocolHeader, 0xDA, this.commands.colorControl];

		data  = data || [ 0x00, 0x00, 0x00 ]; //Data is in reverse order
		packet = packet.concat(data);
		device.write(packet, 265);
	}

	sendModernLightingPacket(data, header = false) {
		let packet = [0x00];

		if(header) {
			packet = [this.config.reportId, this.config.protocolHeader, 0xDA, this.commands.colorControl];
		}

		data = data || [ 0x00, 0x00, 0x00 ]; //Data is in reverse order
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
