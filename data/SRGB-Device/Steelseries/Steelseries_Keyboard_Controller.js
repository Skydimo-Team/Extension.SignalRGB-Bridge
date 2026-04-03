export function Name() { return "Steelseries Device"; }
export function VendorId() { return 0x1038; }
export function ProductId() { return Object.keys(STEELSERIESdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
export function Validate(endpoint) { return endpoint.interface === 1 || endpoint.interface === 3; }
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
	STEELSERIES.Initialize();
}

export function Render() {
	STEELSERIES.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	STEELSERIES.sendColors(color);
}

class STEELSERIES_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Steelseries Device",
			DeviceEndpoint: { "interface": 1, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
			Initialized: false
		};
	}

	getDeviceProperties(deviceID) { return STEELSERIESdeviceLibrary.PIDLibrary[deviceID];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	getSpecialByte() { return this.Config.specialByte; }
	setSpecialByte(byte) { this.Config.specialByte = byte; }

	getInitialized() { return this.Config.Initialized; }
	setInitialized(status) { this.Config.Initialized = status; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const DeviceProperties = this.getDeviceProperties(this.getDeviceProductId());
		this.setDeviceName(DeviceProperties.name);
		this.detectDeviceEndpoint(DeviceProperties);
		this.setLedNames(DeviceProperties.LedNames);
		this.setLedPositions(DeviceProperties.LedPositions);
		this.setLeds(DeviceProperties.Leds);
		this.setDeviceImage(DeviceProperties.image);
		this.setSpecialByte(DeviceProperties.specialByte);

		device.log("Device model found: " + this.getDeviceName());
		device.setName("Steelseries " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());

		this.setSoftwareMode();
	}

	setSoftwareMode() {
		device.send_report([0x00, 0x4B], 642); //Direct Mode
	}

	sendColors(overrideColor) {

		if(!this.getInitialized()){
			return;
		}

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [];

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

			RGBData[(i*4)]		= deviceLeds[i];
			RGBData[(i*4)+1]	= color[0];
			RGBData[(i*4)+2]	= color[1];
			RGBData[(i*4)+3]	= color[2];
		}

		// index 1 seems to be some variable depending on the model, not sure about the meaning,
		// but it needs to be the correct value otherwise the device doesn't respond to commands
		// index 1 as been seen as 0x0B, 0x21, 0x40, 0x61 and 0x3A
		device.send_report([0x00, this.getSpecialByte(), deviceLeds.length].concat(RGBData), 642);
	}

	detectDeviceEndpoint(deviceLibrary) {

		console.log("Searching for endpoints...");

		const deviceEndpoints = device.getHidEndpoints();

		for (let endpoints = 0; endpoints < deviceLibrary.endpoint.length; endpoints++) {
			const endpoint = deviceLibrary.endpoint[endpoints];

			for (let endpointList = 0; endpointList < deviceEndpoints.length; endpointList++) {
				const currentEndpoint = deviceEndpoints[endpointList];

				if (
					endpoint.interface	=== currentEndpoint.interface	&&
					endpoint.usage		=== currentEndpoint.usage		&&
					endpoint.usage_page	=== currentEndpoint.usage_page	&&
					endpoint.collection	=== currentEndpoint.collection	) {

					this.setDeviceEndpoint(currentEndpoint);
					this.setInitialized(true);
					device.set_endpoint(
						currentEndpoint.interface,
						currentEndpoint.usage,
						currentEndpoint.usage_page,
						currentEndpoint.collection,
					);

					console.log("Endpoint " + JSON.stringify(currentEndpoint) + " found!");

					return;
				}
			}
		}

		console.log("Endpoints not found in the device! - " + JSON.stringify(deviceLibrary.endpoint));
	}
}

class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x1640: {
				name: "Apex Pro Gen3",
				size: [21, 6],
				LedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",								"LCD Button",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",             //13
					"ISO_<", "ISO_#", //ISO
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],			  [14, 0], [15, 0], [16, 0],							  [20, 0], //20
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3],								   [17, 3], [18, 3], [19, 3], // 17
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],			   [15, 4],			   [17, 4], [18, 4], [19, 4], [20, 4], // 17
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [18, 5], // 13
					[1, 4], [12, 3], //ISO
				],
				Leds: [
					41, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,         70, 71, 72,						251,
					53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,     73, 74, 75,         83, 84, 85, 86,  //21
					43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,      76, 77, 78,         95, 96, 97, 87,    //21
					57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40,                                 92, 93, 94,      //16
					225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229,                82,               89, 90, 91, 88, //17
					224, 227, 226, 44, 230, 231, 240, 228,                     80, 81, 79,           98, 99,          //13
					100, 50, //ISO
				],
				specialByte: 0x3A,
				endpoint : [{ "interface": 1, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 }],
				image: "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-pro-gen3.png"
			},
			0x1642: {
				name: "Apex Pro TKL Gen3",
				size: [17, 6],
				LedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         								"LCD Button",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
					"ISO_<", "ISO_#", //ISO
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],							  [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],	[14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],	[14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],			 [15, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],	[14, 5], [15, 5], [16, 5],
					[1, 4], [12, 3], //ISO
				],
				Leds: [
					41, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,          		251,
					53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,      73, 74, 75,
					43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,       76, 77, 78,
					57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40,
					225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229,                 82,
					224, 227, 226, 44, 230, 231, 240, 228,                       80, 81, 79,
					100, 50, //ISO
				],
				specialByte: 0x40,
				endpoint : [{ "interface": 1, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 }],
				image: "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-pro-tkl-gen3.png"
			},
			0x1644: { // Wireless version
				name: "Apex Pro TKL Gen3",
				size: [17, 6],
				LedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         								"LCD Button",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
					"ISO_<", "ISO_#", //ISO
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],							  [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],	[14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],	[14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],			 [15, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],	[14, 5], [15, 5], [16, 5],
					[1, 4], [12, 3], //ISO
				],
				Leds: [
					41, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,          		251,
					53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,      73, 74, 75,
					43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,       76, 77, 78,
					57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40,
					225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229,                 82,
					224, 227, 226, 44, 230, 231, 240, 228,                       80, 81, 79,
					100, 50, //ISO
				],
				specialByte: 0x61,
				endpoint : [{ "interface": 3, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 }],
				image: "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-pro-tkl-gen3.png"
			},
			0x1646: { // Wireless version but wired
				name: "Apex Pro TKL Gen3",
				size: [17, 6],
				LedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         								"LCD Button",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
					"ISO_<", "ISO_#", //ISO
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],							  [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],	[14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],	[14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],		   [13, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],			 [15, 4],
					[0, 5], [1, 5], [2, 5],							[6, 5],							[10, 5], [11, 5], [12, 5], [13, 5],	[14, 5], [15, 5], [16, 5],
					[1, 4], [12, 3], //ISO
				],
				Leds: [
					41, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,          		251,
					53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,      73, 74, 75,
					43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,       76, 77, 78,
					57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40,
					225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229,                 82,
					224, 227, 226, 44, 230, 231, 240, 228,                       80, 81, 79,
					100, 50, //ISO
				],
				specialByte: 0x21,
				endpoint : [{ "interface": 3, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 }],
				image: "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-pro-tkl-gen3.png"
			},
			0x1648: {
				name: "Apex Pro Mini Gen3",
				size: [14, 5],
				LedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",
					"ISO_<", "ISO_#", //ISO
				],
				LedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],         [13, 2],
					[0, 3],        [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],
					[0, 4], [1, 4], [2, 4],                      [6, 4],                      [10, 4], [11, 4], [12, 4], [13, 4],
					[1, 4], [12, 2], //ISO
				],
				Leds: [
					41, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42,
					43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49,
					57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40,
					225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229,
					224, 227, 226, 44, 230, 231, 240, 228,
					100, 50, //ISO
				],
				specialByte: 0x40,
				endpoint : [{ "interface": 1, "usage": 0x0001, "usage_page": 0xFFC0, "collection": 0x0000 }],
				image: "https://assets.signalrgb.com/devices/brands/steelseries/keyboards/apex-pro-mini.png"
			},
		};
	}
}

const STEELSERIESdeviceLibrary = new deviceLibrary();
const STEELSERIES = new STEELSERIES_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
