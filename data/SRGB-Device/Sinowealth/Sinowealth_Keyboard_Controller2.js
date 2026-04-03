import {Assert} from "@SignalRGB/Errors.js";
export function Name() { return "Sinowealth Device 2"; }
export function VendorId() { return 0x258a; }
export function ProductId() { return Object.keys(SINOWEALTHdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/sinowealth"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
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

export function Initialize() {
	SINOWEALTH.Initialize();
}

export function Render() {
	SINOWEALTH.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	SINOWEALTH.sendColors(color); // Go Dark on System Sleep/Shutdown
}

export class SINOWEALTH_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "SINOWEALTH Device",
			DeviceEndpoint: { "interface": 1, "usage": 0x0001, "usage_page": 0xFF00, "collection": 0x0005 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(id) {

		const deviceConfig = SINOWEALTHdeviceLibrary.LEDLibrary[id];

		Assert.isOk(deviceConfig, `Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our Discord to get it added.`);

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

	getDeviceImage(deviceModel) { return SINOWEALTHdeviceLibrary.LEDLibrary[deviceModel].image; }

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
			this.setLedNames(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].vLedNames);
			this.setLedPositions(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].vLedPositions);
			this.setLeds(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].vLeds);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setSize(SINOWEALTHdeviceLibrary.LEDLayout[this.getLedLayout()].size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage(modelID));

		}else{
			device.notify("Unknown device", `Reach out to support@signalrgb.com, or visit our Discord to get it added.`, 0);
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ modelID);
		}
	}

	sendColors(overrideColor) {

		if(!this.getModelID()){
			return;
		}

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData					= [];

		for (let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLedPositions[iIdx][0];
			const iPxY = deviceLedPositions[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			RGBData[(deviceLeds[iIdx]*3)]	= color[0];
			RGBData[(deviceLeds[iIdx]*3)+1] = color[1];
			RGBData[(deviceLeds[iIdx]*3)+2] = color[2];
		}

		this.writeRGBPackage(RGBData);
	}

	writeRGBPackage(data){
		let packet = [0x08, 0x0a, 0x7a, 0x01];
		packet = packet.concat(data);

		device.send_report(packet, 382);
		device.pause(1);
	}

	fetchFirmwareData() {

		// System info endpoint
		device.set_endpoint(1, 0x0001, 0xFF00, 0x0005);

		const packet = [0x05, 0x05, 0x81, 0x00, 0x00, 0x00];

		device.send_report(packet, 6);
		device.pause(1);

		device.clearReadBuffer();

		const firmwareData	= device.get_report(packet, 8);
		device.pause(1);

		// Set endpoint back to RGB
		device.set_endpoint(1, 0x0001, 0xFF00, 0x0008);

		return (firmwareData[6] * 255) + firmwareData[7];
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x0049: "SINOWEALTH Device",
			//0x002a: "SINOWEALTH Device", // Flash?
		};

		this.LEDLibrary	=	{

			13: {
				name: "Redragon K633 Ryze Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k633-pro.png",
				layout:	"68%"
			},
			19: {
				name: "Redragon K633 Ryze",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k633-pro.png",
				layout:	"68%"
			},
			341: {
				name: "Redragon K565 Rudra",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k565.png",
				layout:	"Full"
			},
			354: {
				name: "Redragon K641 Shaco Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k641-pro.png",
				layout:	"68%v2"
			},
			131: {
				name: "Redragon K653 Sion Pro",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k653-pro.png",
				layout:	"96%"
			},
			467: {
				name: "Redragon K668 Trundle",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k668.png",
				layout:	"Fullv2"
			},
			13059: {
				name: "Redragon K618 Horus",
				image: "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k618-pro.png",
				layout:	"Full"
			},
			371: {
				name: "AULA F3261",
				image: "https://assets.signalrgb.com/devices/brands/aula/keyboards/f3261.png",
				layout:	"60%"
			},
			0x0001: {
				name: "CYI GAS67",
				image: "https://assets.signalrgb.com/devices/brands/cyi/keyboards/gas67.png",
				layout:	"68%"
			},
			825:{
				name: "Sharkoon Skiller SGK25 RGB",
				image: "https://assets.signalrgb.com/devices/brands/sharkoon/keyboards/sgk25.png",
				layout:	"75%"
			},
			497:{
				name: "Machenike K500A-B84W",
				image: "https://assets.signalrgb.com/devices/brands/machenike/keyboards/k500a-b84w.png",
				layout:	"84%"
			},
			280:{
				name: "Machenike K500-B94W",
				image: "https://assets.signalrgb.com/devices/brands/machenike/keyboards/k500a-b94w.png",
				layout:	"94%"
			},
			40:{
				name: "Machenike K500-B94W",
				image: "https://assets.signalrgb.com/devices/brands/machenike/keyboards/k500a-b94w.png",
				layout:	"94%"
			},

			/* Flash models or no audio models
			 0: { name: "Redragon K530 Draconic Pro" },
			26: { name: "Redragon K617" },
			*/
		};

		this.LEDLayout = {

			"Full": {
				vLedNames: [
					"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",		"Print Screen",	"Scroll Lock",	"Pause Break",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",				"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",						"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			 "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",							"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",			"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0",		  "Num .",
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,	103, 109, 115, 121,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,	104, 110, 116, 122,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,					105, 111, 117,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,		106, 112, 118, 124,
					5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,	107,    119,
				],
				vLedPositions: [
					[0, 0],			[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [ 9, 0], [11, 0], [12, 0], [13, 0],		[14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],		[17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		[17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],										[17, 3], [18, 3], [19, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],				 [15, 4],				[17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],		[14, 5], [15, 5], [16, 5],		[17, 5],		  [19, 5],
				],
				size: [21, 6],
			},

			"Fullv2": {
				vLedNames: [
					"Esc",     "F1", "F2", "F3", "F4",   "F5", "F6", "F7", "F8",    "F9", "F10", "F11", "F12",		"Print Screen",	"Scroll Lock",	"Pause Break", 	"MediaPreviousTrack", "MediaPlayPause", "MediaNextTrack", "AudioMute",
					"`", "1",  "2", "3", "4", "5",  "6", "7", "8", "9", "0",  "-",   "+",  "Backspace",				"Insert",		"Home",			"Page Up",		"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",						"Del",			"End",			"Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", 			 "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	  "Right Shift",							"Up Arrow",						"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",			"Left Arrow",	"Down Arrow",	"Right Arrow",	"Num 0",		  "Num .",
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 	 84, 90, 96,	102, 108, 114, 120,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	 85, 91, 97,	103, 109, 115, 121,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	 86, 92, 98,	104, 110, 116, 122,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,					105, 111, 117,
					4,    10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	   82, 		 94,		106, 112, 118, 124,
					5, 11, 17,			   35,			   53, 59, 65, 83,	 89, 95, 101,	107,    119,
				],
				vLedPositions: [
					[0, 0],			[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [ 9, 0], [11, 0], [12, 0], [13, 0],		[14, 0], [15, 0], [16, 0],		[17, 0], [18, 0], [19, 0], [20, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],		[17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		[17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], 		   [13, 3],										[17, 3], [18, 3], [19, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],				 [15, 4],				[17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],		[14, 5], [15, 5], [16, 5],		[17, 5],		  [19, 5],
				],
				size: [21, 6],
			},

			"75%": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "Page Up",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   "Enter",      "Page Down",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "AltGr", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow",
					"ISO_<", "ISO_#"
				],
				vLeds:  [
					0,    12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    82, 88,
					5, 11, 17,			35,			  53, 59, 65, 83, 89, 95,
					70, 75
				],
				vLedPositions: [
					[0, 0], 		[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
					[1, 4], [12, 3]
				],
				size: [15, 6],
			},
			"68%":  {
				vLedNames: [
					"Esc",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "\"",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#",  "Enter",      "Page Up",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Page Down",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 85,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87,
					4, 70, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 76, 82, 88,
					5, 11, 17,			35,		   53, 65, 	  71, 77, 83, 89
				],
				vLedPositions: [
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},
			"68%v2":  {
				vLedNames: [
					"Esc",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",  "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         "\"",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#",  "Enter",      "Page Up",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Page Down",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81, 93,
					4, 70, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 82, 88, 94,
					5, 11, 17,			35,				53, 59, 65, 83, 89, 95,
				],
				vLedPositions: [
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},
			"60%": {
				vLedNames: [
					"Esc",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#",  "Enter",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Menu", "Right Ctrl", "Fn",
				],
				vLeds:  [
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70,	  82,
					5, 11, 17,			35,              53, 59, 65, 83,
				],
				vLedPositions: [
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],
				],
				size: [14, 6],
			},
			"96%": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",		"Home",  "End",  "Pgup", "Pgdn",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace",	"NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         				"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   				"Enter",	"Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	"Right Shift", "Up Arrow",	"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 90, 96, 102, 108,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 91, 97, 103, 109,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 92, 98, 104, 110,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81, 93, 99, 105,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    70, 82, 88, 94, 100, 112,
					5, 11, 17,			35,			53, 59, 65, 83, 89, 95, 	101, 107,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
				],
				size: [18, 6],
			},
			"94%": {
				vLedNames: [
					"Esc",    "F1", "F2", "F3", "F4",	"F5", "F6", "F7", "F8",		  "F9", "F10", "F11", "F12",	"PrtSc", "Num -",  "Num +",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace",	"NumLock", "Num /", "Num *",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         				"Num 7", "Num 8", "Num 9",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   				"Enter",	"Num 4", "Num 5", "Num 6",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	"Right Shift", "Up Arrow",	"Num 1", "Num 2", "Num 3",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",   "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					0, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78,		84, 90, 96,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	85, 91, 97,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	86, 92, 98,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,	87, 93, 99,
					4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64,    70, 82,	88, 94, 100,
					5, 11, 17,			35,			   53, 59, 65, 77, 83, 89, 95, 101,
				],
				vLedPositions: [
					[0, 0],			[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3], [15, 3], [16, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
				],
				size: [18, 6],
			},
			"84%": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "PrtSc", "Pause",  "Del",
					"`",   "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace",	"Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",   "\\",         				"End",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",   				"Enter",	"PgUp",
					"Left Shift",  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", 	"Right Shift", "Up Arrow",	"PgDn",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90,
					1, 7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,	  91,
					2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80,	  92,
					3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69,     81,	  93,
					4,	  10, 16, 22, 28, 34, 40, 46, 52, 58, 64,	  82, 88, 94,
					5, 11, 17,			  35,			  53, 59, 65, 83, 89, 95,
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],			 [15, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],			 [15, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],			 [15, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4], [14, 4], [15, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],							[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5],
				],
				size: [16, 6],
			},
		};
	}
}

const SINOWEALTHdeviceLibrary = new deviceLibrary();
const SINOWEALTH = new SINOWEALTH_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
