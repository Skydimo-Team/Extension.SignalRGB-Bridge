import {ContextError, globalContext, Assert} from "@SignalRGB/Errors.js";
export function Name() { return "Nuvoton Device"; }
export function VendorId() { return 0x0416; }
export function ProductId() { return Object.keys(NuvotondeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/nuvoton"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){ return [0, 0];}
export function DefaultScale(){ return 1.0;}
export function DeviceType(){ return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 1 && endpoint.usage === 0x0000 && endpoint.usage_page === 0x0001 && endpoint.collection === 0x0006; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
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
	Nuvoton.InitializeNuvoton();
}

export function Render() {
	Nuvoton.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	Nuvoton.sendColors(color); // Go Dark on System Sleep/Shutdown
}

class Nuvoton_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Nuvoton Device",
			DeviceEndpoint: { "interface": 1, "usage": 0x0000, "usage_page": 0x0001, "collection": 0x0006 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(id) {

		const deviceConfig = NuvotondeviceLibrary.LEDLibrary[id];

		Assert.isOk(deviceConfig, `Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our discord to get it added.`);

		return deviceConfig;
	};

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

	getDeviceImage(deviceModel) { return NuvotondeviceLibrary.LEDLibrary[deviceModel].image; }

	InitializeNuvoton() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		// Fetch model
		const modelID	=	this.fetchFirmwareData();

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setModelID(modelID);
			this.setDeviceName(DeviceProperties.name);
			this.setLedLayout(DeviceProperties.layout);
			this.setLedNames(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].vLedNames);
			this.setLedPositions(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].vLedPositions);
			this.setLeds(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].vLeds);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setSize(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage(modelID));

			// Set Direct mode
			this.DirectLightingMode();
		}else{
			device.notify("Unknown device", `Reach out to support@signalrgb.com, or visit our Discord to get it added.`, 0);
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ modelID);
		}
	}

	DirectLightingMode() {

	}

	sendColors(overrideColor) {

		if(!this.getModelID()){ return; }

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [];
		let TotalLedCount			= deviceLeds.length;
		let TotalLedSend			= 0;

		for (let i = 0; i < deviceLeds.length; i++) {
			const iPxX = deviceLedPositions[i][0];
			const iPxY = deviceLedPositions[i][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else {
				color = device.color(iPxX, iPxY);
			}

			RGBData[(i*4)]		= color[0];
			RGBData[(i*4)+1] 	= color[1];
			RGBData[(i*4)+2] 	= color[2];
			RGBData[(i*4)+3]	= 0x00;
		}

		while(TotalLedCount > 0){
			const ledsToSend = TotalLedCount >= 5 ? 5 : TotalLedCount;

			// LEDs array
			let packet = deviceLeds.slice(TotalLedSend, TotalLedSend + ledsToSend);

			// Make sure the led array has at least 5 indexes
			while( packet.length < 5){ packet.push(0);}

			// Fetching RGB values
			packet = packet.concat(RGBData.splice(0, ledsToSend*4));

			// Pre command
			device.write([0x06, 0xBE, 0x15, 0x00, 0x01, 0x01, 0x0E, 0x05, 0x06, 0x00, 0x00, 0x00, 0xFF], 32);

			// RGB command
			device.write([0x06, 0xBE, 0x19, 0x00, 0x01, 0x01, 0x0E].concat(packet), 32);
			device.pause(1);

			// Apply command
			device.write([0x06, 0xBE, 0x15, 0x00, 0x02, 0x01, 0x01, 0x05, 0x09, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x14, 0xFF, 0x00, 0x00, 0x01], 32);

			TotalLedCount -= ledsToSend;
			TotalLedSend += ledsToSend;
		}
	}

	fetchFirmwareData() {

		// Fetch model
		const packetModel = [0x06, 0xBE, 0x02];
		device.write(packetModel, 32);

		const modelData	= device.read(packetModel, 32);

		// Removing null characters
		const modelID	= String.fromCharCode(...modelData.slice(4, 20).filter(function(e){return e !== 0; }));

		// Fetch firmware version
		const packetFirmware = [0x06, 0xBE, 0x03];
		device.write(packetFirmware, 32);

		const firmwareData	= device.read(packetFirmware, 32);

		const firmwareVer	= String.fromCharCode(...firmwareData.slice(4, 18));

		console.log(`ModelID: ${modelID}`);
		console.log(`Firmware Version: ${firmwareVer}`); // Not sure what this is

		return modelID;
	}
}

class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0xA0F8: "Nuvoton Device",
		};

		this.LEDLibrary	=	{
			"WKB-NUC-NP87B-US": {
				name: "Drevo Tyrfing v2",
				image: "https://assets.signalrgb.com/devices/brands/drevo/keyboards/tyrfing-v2.png",
				layout:	"TKL"
			}, /*
			"WKNUB-NP87-UK": { // Seems to flick a lot not sure why
				name: "Drevo Tyrfing v2",
				image: "https://assets.signalrgb.com/devices/brands/drevo/keyboards/tyrfing-v2.png",
				layout:	"TKL"
			},*/
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
					0,  2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14, 			15, 16, 17,
					22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 	37, 38, 39, 		40, 41, 42, 43,
					44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 	59, 60, 61, 		62, 63, 64, 65,
					66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,								84, 85, 86,
					88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99,		102,		104,			106, 107, 108, 109,
					110, 111, 112,		116,		120, 121, 122, 123,			125, 126, 127, 		128,	130,
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
					"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",	"Print Screen", "Scroll Lock",	"Pause Break",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",			"Insert",		"Home",			"Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",					"Del",			"End",			"Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#",			"Enter",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",		  "Right Shift",		"Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",	"Left Arrow",	"Down Arrow",	"Right Arrow"
				],
				vLeds:  [
					41,  58,  59,  60,  61,       62,  63,  64,  65,  66,  67,  68,  69,  70,  71,  72,
					53,  30,  31,  32,  33,  34,  35,  36,  37,  38,  39,  45,  46,  42,  73,  74,  75,
					43,  20,  26,  8,   21,  23,  28,  24,  12,  18,  19,  47,  48,  49,  76,  77,  78,
					57,  4,   22,  7,   9,   10,  11,  13,  14,  15,  51,  52, 	50,  40,
					225, 100, 29,  27,  6,   25,  5,   17,  16,  54,  55,  56,       229,	   82,
					224, 227, 226,              44,					 230,  237, 101, 228, 80,  81,  79,
				],
				vLedPositions: [
					[0, 0],			[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],  [13, 0],	[14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],  [13, 1],	[14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],  [13, 2],	[14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],	[13, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],						 [15, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5],  [13, 5],	[14, 5], [15, 5], [16, 5]
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
					22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
					44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
					66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 	80, 81,
					88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  102, 103, 104,
					110, 111, 112,		116,	  120, 121, 122, 123, 125, 126,
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
					22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 38,
					44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 60,
					66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,     80, 82,
					88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  102, 103, 104,
					110, 111, 112,        116,      120, 123, 122, 124, 125, 126,
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
					22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36, 37,
					44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 59,
					66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
					88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 102, 103,
					111, 112, 116,         120,          121, 122, 123, 124, 125, 126,
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
					22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36,
					44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58,
					66,   68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,    80,
					88,    90, 91, 92, 93, 94, 95, 96, 97, 98, 99,      102,
					110, 111, 112,         116,          120, 121, 122, 123
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
					18, 19, 20, 21,
					40, 41, 42, 43,
					62, 63, 64, 65,
					84, 85, 86,
					106, 107, 108, 109,
					128, 130
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

const NuvotondeviceLibrary = new deviceLibrary();
const Nuvoton = new Nuvoton_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
