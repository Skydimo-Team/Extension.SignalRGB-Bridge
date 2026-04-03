export function Name() { return "Xiaohua Device"; }
export function VendorId() { return 0x2E88; }
export function ProductId() { return Object.keys(XIAOHUAdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/xiaohua"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 0 && endpoint.usage === 0x0091 && endpoint.usage_page === 0xFF1B && endpoint.collection === 0x0006; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/keyboards/full-size-keyboard-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

export function Initialize() {
	XIAOHUA.Initialize();
}

export function Render() {
	XIAOHUA.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	XIAOHUA.sendColors(color); // Go Dark on System Sleep/Shutdown
}

export class XIAOHUA_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Xiaohua Device",
			DeviceEndpoint: { "interface": 0, "usage": 0x0091, "usage_page": 0xFF1B, "collection": 0x0006 },
			LedNames: [],
			LedPositions: [],
			Leds: [], // 0x00 (first zone) is keyboard and 0x01 (second is for models with special leds)
		};
	}

	getDeviceProperties(id) { return XIAOHUAdeviceLibrary.LEDLibrary[id];};

	getModelID() { return this.Config.ModelID; }
	setModelID(modelid) { this.Config.ModelID = modelid; }

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLedLayout() { return this.Config.layout; }
	setLedLayout(layout) { this.Config.layout = layout; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getDeviceImage(deviceModel) { return XIAOHUAdeviceLibrary.LEDLibrary[deviceModel].image; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		// Fetch model
		const modelID	=	this.fetchFirmwareData();

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setModelID(modelID);
			this.setDeviceName(DeviceProperties.name);
			this.setLedLayout(DeviceProperties.layout);
			this.setLedNames(XIAOHUAdeviceLibrary.LEDLayout[this.getLedLayout()].vLedNames);
			this.setLedPositions(XIAOHUAdeviceLibrary.LEDLayout[this.getLedLayout()].vLedPositions);
			this.setLeds(XIAOHUAdeviceLibrary.LEDLayout[this.getLedLayout()].vLeds);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setSize(XIAOHUAdeviceLibrary.LEDLayout[this.getLedLayout()].size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage(modelID));

			// Set Direct mode
			this.DirectLightingMode();
		}else{
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ modelID);
		}
	}

	DirectLightingMode() {
		device.write([0x06, 0x17, 0x00, 0x00, 0x00, 0x01, 0x01], 64);
		device.write([0x06, 0x08, 0x00, 0x00, 0x00, 0x0D, 0x02, 0x03, 0x03, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01], 64);
	}

	sendColors(overrideColor) {

		if(!this.getModelID()){
			return;
		}

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [[0], [0]];
		let zoneOffset = 0;

		for (let zone = 0; zone < deviceLeds.length; zone++){

			for (let iIdx = 0; iIdx < deviceLeds[zone].length; iIdx++) {
				const iPxX = deviceLedPositions[iIdx + zoneOffset][0];
				const iPxY = deviceLedPositions[iIdx + zoneOffset][1];
				let color;

				if(overrideColor){
					color = hexToRgb(overrideColor);
				}else if (LightingMode === "Forced") {
					color = hexToRgb(forcedColor);
				}else{
					color = device.color(iPxX, iPxY);
				}

				RGBData[zone][(deviceLeds[zone][iIdx]*3)]   = color[0];
				RGBData[zone][(deviceLeds[zone][iIdx]*3)+1] = color[1];
				RGBData[zone][(deviceLeds[zone][iIdx]*3)+2] = color[2];
			}

			zoneOffset += deviceLeds[zone].length;
		}

		for (let zone = 0; zone < deviceLeds.length; zone++) {
			let packetCount		= 0;
			let	zoneTotalLEDs	= RGBData[zone].length / 3;

			while(zoneTotalLEDs > 0) {
				const ledsToSend = zoneTotalLEDs >= 18 ? 18 : zoneTotalLEDs;

				const packet = [0x06, 0x0F, zone, 0x00, packetCount, ledsToSend*3].concat(RGBData[zone].splice(0, ledsToSend*3));

				this.writeRGBPackage(packet);
				zoneTotalLEDs	-= ledsToSend;
				packetCount++;
			}
		}

		// We need to send a blank array to the next zone even if there's no LEDs on it
		if(deviceLeds.length === 1){
			device.write([0x06, 0x0F, 0x01, 0x00, 0x00, 0x36], 65);
			device.write([0x06, 0x0F, 0x01, 0x00, 0x01, 0x2D], 65);
		}
	}

	writePackage(data, read = false){
		const packet = data.concat(Array(62).fill(0));

		if (read) {
			device.write(packet, 65);

			return device.read(packet, 65);
		}

		return device.write(packet, 65);
	}

	writeRGBPackage(data){
		const packet = data;
		device.write(packet, 65);
	}

	fetchFirmwareData() {
		const packet = [0x06, 0x0D];

		device.write(packet, 64);

		const firmwareData	= device.read(packet, 64);
		const modelID		= String.fromCharCode(...firmwareData).split(",")[4];
		const firmwareVer	= String.fromCharCode(...firmwareData).split(",")[5];

		console.log(`ModelID: ${modelID} `);
		console.log(`Firmware Version: ${firmwareVer}`);

		return modelID;
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0xB30A: "Xiaohua Device",
		};

		this.LEDLibrary	=	{

			XS63RGB: {
				name: "Husky Blizzard",
				image: "https://assets.signalrgb.com/devices/brands/husky/keyboards/hailstorm.png",
				layout:	"60%"
			},

		};

		this.LEDLayout = {
			"Full": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up", "NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",			"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",	"Num 0", "Num ."
				],
				vLeds:  [
					[
						0,  2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14, 			15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 	37, 38, 39, 		40, 41, 42, 43,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 	59, 60, 61, 		62, 63, 64, 65,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,								84, 85, 86,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99,		102,		104,			106, 107, 108, 109,
						110, 111, 112,		116,		120, 121, 122, 123,			125, 126, 127, 		128,	130,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],								 [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],			 [17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5], [17, 5], 		   [19, 5],
				],
				size: [21, 6],
			},
			"TKL": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",								"Logo 1", "Logo 2", "Logo 3",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,     15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,		84, 85, 86,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102,	   104,
						110, 111, 112,		116,		120, 121, 122, 123,	  125, 126, 127,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],	  [14, 3], [15, 3], [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],
				],
				size: [17, 6],
			},
			"68%": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "'", //15
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", //15
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", "PgUp", //15
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", "Up Arrow", "PgDn", //13
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow" //8
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 	80, 81,
						88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  102, 103, 104,
						110, 111, 112,		116,	  120, 121, 122, 123, 125, 126,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], 	      [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                 [5, 4],                 [8, 4], [9, 4], [10, 4], 		  [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"68%v2": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "'", //15
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", //15
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", "PgUp", //15
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", "Up Arrow", "PgDn", //13
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow" //8
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 38,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 60,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,     80, 82,
						88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  102, 103, 104,
						110, 111, 112,        116,      120, 123, 122, 124, 125, 126,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], 	      [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                 [5, 4],                 [8, 4], [9, 4], [10, 4], 		  [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"65%": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "'", "[", "Home",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç", "~", "]", "Enter", "PgUp",
					"Left Shift", "\\", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PgDn",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",      "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36, 37,
						44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
						88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 102, 103,
						111, 112, 116,         120,          121, 122, 123, 124, 125, 126,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],   [13, 0], [14, 0],
					[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],  		  [14, 1],
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],  [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                         [6, 4],                [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"60%": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter",
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",      "Right Alt", "Menu", "Right Ctrl", "Fn"
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36,
						44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58,
						66,   68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,    80,
						88,    90, 91, 92, 93, 94, 95, 96, 97, 98, 99,      102,
						110, 111, 112,         116,          120, 121, 122, 123
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],   [13, 0],
					[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],  [13, 1],
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2],
					[0, 3],        [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],             [13, 3],
					[0, 4], [1, 4], [2, 4],                         [6, 4],                            [10, 4], [11, 4], [12, 4], [13, 4]
				],
				size: [14, 5],
			},
			"Numpad": {
				vLedNames: [
					"Esc", "Tab", "Backspace", "FN",
					"Numlock", "/", "*", "-",
					"Num 7", "Num 8", "Num 9", "Num +",
					"Num 4", "Num 5", "Num 6",
					"Num 1", "Num 2", "Num 3", "Num Enter",
					"Num 0", "."
				],
				vLeds: [
					[
						18, 19, 20, 21,
						40, 41, 42, 43,
						62, 63, 64, 65,
						84, 85, 86,
						106, 107, 108, 109,
						128, 130
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0],
					[0, 1], [1, 1], [2, 1], [3, 1],
					[0, 2], [1, 2], [2, 2], [3, 2],
					[0, 3], [1, 3], [2, 3],
					[0, 4], [1, 4], [2, 4], [3, 4],
					[0, 5],			[2, 5],
				],
				size: [4, 6],
			},
		};
	}
}

const XIAOHUAdeviceLibrary = new deviceLibrary();
const XIAOHUA = new XIAOHUA_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
