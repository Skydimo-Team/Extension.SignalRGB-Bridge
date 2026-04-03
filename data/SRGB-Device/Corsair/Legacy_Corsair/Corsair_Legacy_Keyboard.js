export function Name() { return "Corsair Legacy Keyboard"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return Object.keys(deviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [21, 7]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard";}
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}
export function Documentation(){ return "troubleshooting/corsair"; }

export function LedNames() {
	return LegacyCorsair.getvKeyNames();
}

export function LedPositions() {
	return LegacyCorsair.getvLedPositions();
}

export function Initialize() {
	device.set_endpoint(1, 0x0004, 0xffc2);

	LegacyCorsair.deviceInitialization();

	LegacyCorsair.setLightingControlMode(LegacyCorsair.modes.SoftwareMode);
	LegacyCorsair.setSpecialFunctionControlMode(LegacyCorsair.modes.SoftwareMode);

	if(device.productId() === 0x1B20 || device.productId() === 0x1B15 || device.productId() === 0x1B48) {
		setStrafeLighting();
	}

	//set key codes to get the keys working again, unless you wanna assign them all in software. Pls don't. I beg of you.
	InitScanCodes();
}

export function Render() {
	readInputs();

	sendColors();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		LegacyCorsair.setLightingControlMode(LegacyCorsair.modes.HardwareMode);
		LegacyCorsair.setSpecialFunctionControlMode(LegacyCorsair.modes.HardwareMode);
	}
}

function readInputs() {
	device.set_endpoint(0, 0x0002, 0xffc0); // Macro input endpoint

	do {
    	const packet = device.read([0x00], 64, 0);
    	processInputs(packet);
	}
	while(device.getLastReadSize() > 0);

}

function processInputs(packet) {
	device.set_endpoint(1, 0x0004, 0xffc2);

	if(packet[0] === 0x03) {
    	macroInputArray.update(packet.slice(1, 19)); //needs resized to like 10
	}
}

function macroInputHandler(bitIdx, isPressed) {
	const buttonName = LegacyCorsair.getPressedKey(bitIdx);

	const eventData = {
		key : buttonName,
		keyCode : 0,
		"released": !isPressed,
	};

	device.log(eventData);
	keyboard.sendEvent(eventData, "Key Press");
}

function setStrafeLighting() {
	device.write([0x00, 0x07, 0x05, 0x08, 0x00, 0x01], 65);//Strafe Specific Lighting! //pretty simple. Uses the Lighting Mode Control switch, then 0x08 is strafe specific, 0x00 always is a thing, then the 0x01 is an on argument.
}

function InitScanCodes() {

	const layout = deviceLibrary.LayoutDict[LegacyCorsair.getKeyboardLayout()];
	const ScanCodes = [];

	for(let ScanCode = 0; ScanCode < 120 + layout.length && ScanCode < 0x84; ScanCode++) {
		if(layout.includes(ScanCode)) {
			continue; //If a scancode is in the dict, skip it. We have to skip them as we run out of registers otherwise
		}

		ScanCodes.push(ScanCode);
		ScanCodes.push(0x80); //If you don't send this, key no worky. Sets HID Exclusive
	}

	while(ScanCodes.length > 0) {
		const keysToSend = Math.min(ScanCodes.length/2, 0x1E);
		LegacyCorsair.setCommand([LegacyCorsair.Commands.keyInputMode, keysToSend, 0x00].concat(ScanCodes.splice(0, 60)));
	}
}

function sendColors(overrideColor) {

	const vKeys = LegacyCorsair.getvKeys();
	const vKeyPositions = LegacyCorsair.getvLedPositions();

	const red = [vKeys.length]; //why is this here?
	const green = [vKeys.length];
	const blue = [vKeys.length];

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let col;

		if(overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		red[vKeys[iIdx]] = col[0];
		green[vKeys[iIdx]] = col[1];
		blue[vKeys[iIdx]] = col[2];
	}

	const colorDict = {
		1 : red,
		2 : green,
		3 : blue
	};

	if (LegacyCorsair.getDeviceName() === "K55 RGB") {
		const RGBData = [];

		for(let colors = 1; colors < 4; colors++) {
			RGBData[(colors-1)] 	= colorDict[colors][0];
			RGBData[(colors-1)+3]	= colorDict[colors][1];
			RGBData[(colors-1)+6]	= colorDict[colors][2];
		}

		LegacyCorsair.setK55SoftwareLightingStream(RGBData);
	} else {
		for(let colors = 1; colors < 4; colors++) {

			const colorArray = colorDict[colors];
			let packetsSent = 0;

			do {
				const bytesToSend = Math.min(colorArray.length, 60);
				LegacyCorsair.setSoftwareLightingStream(packetsSent+1, bytesToSend, colorArray.splice(0, bytesToSend));
				device.pause(1);
				packetsSent++;
			}
			while(colorArray.length > 0);

			LegacyCorsair.ApplyLightingStream(colors, 3, colors === 3 ? 2 : 1);

			device.pause(1);
		}
	}

}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

class LegacyCorsairLibrary {
	constructor() {
		this.PIDLibrary = {
			0x1B3D : "K55 RGB",
			0x1B17 : "K65 RGB",
			0x1B37 : "K65 RGB Lux",
			0x1B39 : "K65 RGB Rapidfire",
			0x1B4F : "K68",
			0x1b49 : "K70 MKII",
			0x1b55 : "K70 MKII Low Profile",
			0x1B6B : "K70 MKII SE",
			0x1B38 : "K70 Rapidfire",
			0x1B3A : "K70 Rapidfire Red",
			0x1B33 : "K70 Lux",
			//0x1B36 : "K70 Lux", // Red only
			0x1B13 : "K70",
			0x1B11 : "K95 RGB",
			0x1B2D : "K95 Platinum",
			0x1B82 : "K95 Platinum SE",
			0x1B20 : "Strafe",
			0x1B15 : "Strafe",
			0x1b48 : "Strafe MKII"
		};

		this.DeviceLibrary = {
			"K55 RGB" : {
				name: "K55 RGB",
				vLedNames : [
					"Zone1", "Zone2", "Zone3",
				],
				vLedPositions : [
					[0, 1], [2, 1], [4, 1],
				],
				vKeys : [
					0, 1, 2,
				],
				size : [5, 3],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k55-rgb.png"
			},
			"K65 RGB" : {
				name: "K65 RGB",
				vLedNames : [
					"Mute", "Volume Down", "Volume Up",    "Lock",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",

					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
					[10, 0], [11, 0], [12, 0], [13, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [10, 1], [11, 1], [12, 1],        [13, 1],  [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],         [12, 5],            [15, 5],
					[0, 6], [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					137, 20, 44, 32, // 8,  //59,     // Special key row.
					0,     12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,     //56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    //80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    //9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    //57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,            79,          103,       //93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   //129, 141
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k65-rgb.png"
			},
			"K65 RGB Lux" : {
				name: "K65 RGB Lux",
				vLedNames : [
					"Mute", "Volume Down", "Volume Up",    "Lock",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",

					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
					[10, 0], [11, 0], [12, 0], [13, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [10, 1], [11, 1], [12, 1],        [13, 1],  [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],            [15, 5],
					[0, 6], [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					137, 20, 44, 32, // 8,  //59,     // Special key row.
					0,     12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,     //56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    //80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    //9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    //57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,            79,          103,       //93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   //129, 141
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k65-rgb-lux.png"
			},
			"K65 RGB Rapidfire" : {
				name: "K65 RGB Rapidfire",
				vLedNames : [
					"Mute", "Volume Down", "Volume Up",    "Lock",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",

					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
					[10, 0], [11, 0], [12, 0], [13, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [10, 1], [11, 1], [12, 1],        [13, 1],  [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],            [15, 5],
					[0, 6], [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					137, 20, 44, 32, // 8,  //59,     // Special key row.
					0,     12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,     //56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    //80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    //9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    //57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,            79,          103,       //93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   //129, 141
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k65-rgb-rapidfire.png"
			},
			"K68" : {
				name: "K68",
				vLedNames : [
					"Profile", "Brightness", "Lock",                                               "Mute", "Volume Down", "Volume Up",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					[14, 0], [14, 0], [15, 0],            [18, 0], [19, 0], [20, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],         [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],                             [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],                   [15, 5],           [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                                                      20, 142, 130,    // Special key row.
					0,     12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,          79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k68.png"
			},
			"K70 MKII" : {
				name: "K70 MKII",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70-mkii.png"
			},
			"K70 MKII Low Profile" : {
				name: "K70 MKII Low Profile",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70-mkii-low-profile.png"
			},
			"K70 MKII SE" : {
				name: "K70 MKII SE",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70-mkii-se.png"
			},
			"K70 Rapidfire" : {
				name: "K70 Rapidfire",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5],  // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70-rapidfire.png"
			},
			"K70 Rapidfire Red" : {
				name: "K70 Rapidfire Red",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70-rapidfire.png"
			},
			"K70 Lux" : {
				name: "K70 Lux",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70-lux.png"
			},
			"K70" : {
				name: "K70",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo", "Logo2",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "?", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                       //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					// eslint-disable-next-line indent
											[3, 0], [4, 0], [5, 0],                         [9, 0], [10, 0],                                                           [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],          [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],                                [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],            [15, 5],            [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                         [6, 6],                         [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       58, 59,                               20,    // Special key row.
					0,   12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         138, 79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					//ISO
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k70.png"
			},
			"K95 RGB" : {
				name: "K95 RGB",
				vLedNames : [
					"Lock", "Mute",
					"G1", "G2", "G3", "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"G4", "G5", "G6", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"G7", "G8", "G9", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"G10", "G11", "G12", "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"G13", "G14", "G15", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"G16", "G17", "G18", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
				],
				vLedPositions : [
					[17, 0],                           [21, 0],           // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],         [16, 1],   [17, 1], [18, 1], [19, 1],   [20, 1], [21, 1], [22, 1], [23, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2],   [20, 2], [21, 2], [22, 2], [23, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3],   [20, 3], [21, 3], [22, 3], [23, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],         [16, 4],                             [20, 4], [21, 4], [22, 4], // 16
					[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],                           [18, 5],           [20, 5], [21, 5], [22, 5], [23, 5], // 17
					[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],                      [9, 6],                         [13, 6], [14, 6], [15, 6], [16, 6],   [17, 6], [18, 6], [19, 6],   [20, 6],        [22, 6], // 14
				],
				vKeys : [
					137,           20,    // Special key row.
					10,  22,  34,    0,   12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,       18, 30, 42,    32, 44, 56,  68,  //20
					46,  58,  70,    1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					82,  94,  106,   2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					118, 59,  71,    3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					83,  95,  107,   4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,         79,         103,       93, 105, 117, 140,
					119, 131, 143,   5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
				],
				size : [24, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k95-rgb.png"
			},
			"K95 Platinum" : {
				name: "K95 Platinum",
				vLedNames : [
					// Top Light Strip & Logo
					"Lightbar Led 1", "Lightbar Led 2", "Lightbar Led 3", "Lightbar Led 4", "Lightbar Led 5", "Lightbar Led 6", "Lightbar Led 7", "Lightbar Led 8", "Logo Left (Led 9)", "Logo Right (Led 10)", "Lightbar Led 11", "Lightbar Led 12",
					"Lightbar Led 13", "Lightbar Led 14", "Lightbar Led 15", "Lightbar Led 16", "Lightbar Led 17", "Lightbar Led 18", "Lightbar Led 19",																								// 18
					// Special Key Row
					"Profile", "Brightness", "Lock",                                                                                                               "Mute",																				// 4
					// Keyboard Layout
					"G1", "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",  "Media Stop", "Media Rewind", "Media Play/Pause", "Media FastForward",				// 21
					"G2", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                            "Insert", "Home", "Page Up",  "NumLock", "Num /", "Num *", "Num -",												// 21
					"G3", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                                     "Del", "End", "Page Down",  "Num 7", "Num 8", "Num 9", "Num +",													// 21
					"G4", "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",															// 16
					"G5", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                 "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter",												// 18
					"G6", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",																	// 13
					// ISO
					"ISO #", "ISO <"																																																					// 2
				],
				vLedPositions : [
					// Top Light Strip & Logo
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [9, 0], [11, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0],									// 18
					// Special Key Row
	                [3, 1], [4, 1], [5, 1],																																		  [18, 1],								// 4
					// Keyboard Layout
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],          [14, 2],   [15, 2], [16, 2], [17, 2],   [18, 2], [19, 2], [20, 2], [21, 2],	// 21
					[0, 3],   [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],   [15, 3], [16, 3], [17, 3],   [18, 3], [19, 3], [20, 3], [21, 3],	// 21
					[0, 4],   [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],   [15, 4], [16, 4], [17, 4],   [18, 4], [19, 4], [20, 4], [21, 4],	// 21
					[0, 5],   [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],          [14, 5],                                [18, 5], [19, 5], [20, 5],			// 16
					[0, 6],   [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [13, 6],                              [16, 6],            [18, 6], [19, 6], [20, 6], [21, 6],	// 18
					[0, 7],   [1, 7], [2, 7], [3, 7],                     [7, 7],                              [11, 7], [12, 7], [13, 7], [14, 7],   [15, 7], [16, 7], [17, 7],   [18, 7],          [20, 7],			// 14
					// ISO
					[2, 6], [13, 5],																																													// 2
				],
				vKeys : [
					// Top Light Strip & Logo
					144, 145, 146, 158, 160, 147, 148, 149, 150, 151, 152, 153, 154, 155, 159, 162, 161, 156, 157,				// 18
					// Special Key Row
	           		125, 137, 8,																			20,					// 4
					// Keyboard Layout
					10,     0, 12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,	// 21
					22,     1, 13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,     31,     54, 66, 78,    80, 92, 104, 116,	// 21
					34,     2, 14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128,	// 21
					46,     3, 15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,       126,                    57, 69, 81,			// 16
					58,     4, 28, 40, 52, 64, 76, 88, 100, 112, 124, 136,           79,          103,      93, 105, 117, 140,	// 18
					70,     5, 17, 29,            53,                  89, 101, 113, 91,     115, 127, 139,   129, 141,			// 14
					// ISO
					114, 16,																									// 2
				],
				size : [24, 8],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k95-platinum.png"
			},
			"K95 Platinum SE" : {
				name: "K95 Platinum SE",
				vLedNames : [
					// Top Light Strip & Logo
					"Lightbar Led 1", "Lightbar Led 2", "Lightbar Led 3", "Lightbar Led 4", "Lightbar Led 5", "Lightbar Led 6", "Lightbar Led 7", "Lightbar Led 8", "Logo Left (Led 9)", "Logo Right (Led 10)", "Lightbar Led 11", "Lightbar Led 12",
					"Lightbar Led 13", "Lightbar Led 14", "Lightbar Led 15", "Lightbar Led 16", "Lightbar Led 17", "Lightbar Led 18", "Lightbar Led 19",																								// 18
					// Special Key Row
					"Profile", "Brightness", "Lock",                                                                                                               "Mute",																				// 4
					// Keyboard Layout
					"G1", "Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",  "Media Stop", "Media Rewind", "Media Play/Pause", "Media FastForward",				// 21
					"G2", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                            "Insert", "Home", "Page Up",  "NumLock", "Num /", "Num *", "Num -",												// 21
					"G3", "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                                     "Del", "End", "Page Down",  "Num 7", "Num 8", "Num 9", "Num +",													// 21
					"G4", "CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",															// 16
					"G5", "Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                 "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter",												// 18
					"G6", "Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Right Win", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",																	// 13
					// ISO
					"ISO #", "ISO <"																																																					// 2
				],
				vLedPositions : [
					// Top Light Strip & Logo
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [9, 0], [11, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0],									// 18
					// Special Key Row
	                [3, 1], [4, 1], [5, 1],																																		  [18, 1],								// 4
					// Keyboard Layout
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],          [14, 2],   [15, 2], [16, 2], [17, 2],   [18, 2], [19, 2], [20, 2], [21, 2],	// 21
					[0, 3],   [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],   [15, 3], [16, 3], [17, 3],   [18, 3], [19, 3], [20, 3], [21, 3],	// 21
					[0, 4],   [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],   [15, 4], [16, 4], [17, 4],   [18, 4], [19, 4], [20, 4], [21, 4],	// 21
					[0, 5],   [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],          [14, 5],                                [18, 5], [19, 5], [20, 5],			// 16
					[0, 6],   [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [13, 6],                              [16, 6],            [18, 6], [19, 6], [20, 6], [21, 6],	// 18
					[0, 7],   [1, 7], [2, 7], [3, 7],                     [7, 7],                              [11, 7], [12, 7], [13, 7], [14, 7],   [15, 7], [16, 7], [17, 7],   [18, 7],          [20, 7],			// 14
					// ISO
					[2, 6], [13, 5],																																													// 2
				],
				vKeys : [
					// Top Light Strip & Logo
					144, 145, 146, 158, 160, 147, 148, 149, 150, 151, 152, 153, 154, 155, 159, 162, 161, 156, 157,				// 18
					// Special Key Row
	           		125, 137, 8,																			20,					// 4
					// Keyboard Layout
					10,     0, 12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,	// 21
					22,     1, 13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,     31,     54, 66, 78,    80, 92, 104, 116,	// 21
					34,     2, 14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134, 90,   102,     43, 55, 67,    9,  21, 33,  128,	// 21
					46,     3, 15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,       126,                    57, 69, 81,			// 16
					58,     4, 28, 40, 52, 64, 76, 88, 100, 112, 124, 136,           79,          103,      93, 105, 117, 140,	// 18
					70,     5, 17, 29,            53,                  89, 101, 113, 91,     115, 127, 139,   129, 141,			// 14
					// ISO
					114, 16,																									// 2
				],
				size : [24, 8],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/k55-platinum-se.png"
			},
			"Strafe" : {
				name: "Strafe",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                     //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					[0, 0], [19, 0], [20, 0],                      [9, 0],                                                             [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],         [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],                             [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],         [13, 5],           [15, 5],           [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       59,                               20,    // Special key row.
					0,     12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,          79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/strafe.png"
			},
			"Strafe MKII" : {
				name: "Strafe MKII",
				vLedNames : [
					"Profile", "Brightness", "Lock",                  "Logo",                   "Mute",
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",   "MediaStop", "MediaRewind", "MediaPlayPause", "MediaFastForward",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .",                     //13
					//ISO
					"ISO #", "ISO <"
				],
				vLedPositions : [
					[0, 0], [19, 0], [20, 0],                      [9, 0],                                                             [17, 0],   // Logo & specialkey row.
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],         [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //20
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //21
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],   [14, 3], [15, 3], [16, 3],   [17, 3], [18, 3], [19, 3], [20, 3], //21
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],         [13, 4],                             [17, 4], [18, 4], [19, 4], // 16
					[0, 5], 		[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],         [13, 5],           [15, 5],           [17, 5], [18, 5], [19, 5], [20, 5], // 17
					[0, 6], [1, 6], [2, 6],                      [6, 6],                      [10, 6], [11, 6], [12, 6], [13, 6],   [14, 6], [15, 6], [16, 6],   [17, 6],        [19, 6], // 14
					//ISO
					[12, 4], [1, 5]
				],
				vKeys : [
					125, 137, 8,                       59,                               20,    // Special key row.
					0,     12, 24, 36, 48,     60, 72, 84, 96,     108, 120, 132, 6,     18, 30, 42,    32, 44, 56,  68,  //20
					1,   13, 25, 37, 49, 61, 73, 85, 97, 109, 121, 133, 7,       31,     54, 66, 78,    80, 92, 104, 116, //21
					2,   14, 26, 38, 50, 62, 74, 86, 98, 110, 122, 134,   90,   102,     43, 55, 67,    9,  21, 33,  128, //21
					3,   15, 27, 39, 51, 63, 75, 87, 99, 111, 123, 135,         126,                    57, 69, 81,       //16
					4,   28, 40, 52, 64, 76, 88, 100, 112, 124, 136,          79,         103,       93, 105, 117, 140,
					5,   17, 29,            53,                    89, 101, 113, 91,     115, 127, 139,   129, 141,
					114, 16
				],
				size : [21, 7],
				image: "https://assets.signalrgb.com/devices/brands/corsair/keyboards/strafe-mkii.png"
			}
		};

		this.LayoutDict =
		{
			"ANSI":   [ 63, 65, 66, 70, 71, 81, 83, 85, 96, 111, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129 ], //70 + 71 are profile and brightness 96 is lock.
			"ISO":    [ 63, 65, 66, 70, 71, 80, 83, 85, 96, 111, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129 ],
			"ABNT2" : [ 63, 65, 66, 70, 71, 80, 85, 96, 111, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129 ]
		};
	}
}
const deviceLibrary = new LegacyCorsairLibrary();

class LegacyCorsairProtocol {
	constructor() {
		/** Write command to device, and recieves no response. */
		this.write = 0x07;
		/** Get data from the device. */
		this.read = 0x0E;
		/** Used to Send Streaming lighting packets. */
		this.stream = 0x7f;

		this.modes = {
			"HardwareMode"    : 0x01,
			"SoftwareMode"    : 0x02,
			"StrafeSidelight" : 0x08,
			"WinlockControl"  : 0x09
		};

		this.Commands =
		{
			/** Control for software versus hardware button event/mapping. */
			specialFunctionControl : 0x04,
			/** Control for software versus hardware lighting control. */
			lightingControl		   : 0x05,
			/** Control for a device's Polling/Refresh rate. */
			pollingRate 		   : 0x0a,
			/** Command for anything mouse specific*/
			mouseFunctions : 0x13,
			/** Command for setting Software Mouse Lighting Zones.*/
			softwareMouseColorChange : 0x22,
			/** Command for setting Software Mousepad Lighting Zones.*/ //slightly differing formatting from mouse writes
			softwareMousepadColorChange : 0x22,
			/** Command for setting K55 Lighting Zones.*/
			softwareK55ColorChange : 0x25,
			/** Command for setting 9 Bit Software Keyboard Lighting Zones.*/
			softwareKeyboard9BitColorChange : 0x27,
			/** Command for setting 24 Bit Software Keyboard Lighting Zones.*/
			softwareKeyboard24BitColorChange : 0x28,
			/** Command for determining what write type a keyboard will output (HID, Corsair, Both).*/
			keyInputMode : 0x40,
			/** Command for reading Battery.*/
			batteryStaus : 0x50,
			/** Command for setting idle timeout.*/
			idleTimeout : 0xA6
		};
		/** Array of Config Values*/
		this.Config =
		{
			/** Device Type Variable (Keyboard, Mouse, Mousepad).*/
			deviceType : 0x00,
			/** Flag for Wired Vs Wireless Device.*/ //May be able to infer from available endpoints? I'll have to see what the K57? does
			wirelessDevice : false,
			/** Flag for Knowing if a device is awake or not. Is always true on wired devices.*/
			deviceAwake : false,
			/** Device Name Variable used for setting name in signal and looking up through the device library dict.*/
			deviceName : "",
			vKeys : [],
			vKeyPositions : [],
			vKeyNames : [],
			keyboardLayout : ""
		};

		this.DeviceTypes =
		{
			"Mouse" : 0x01,
			"Keyboard" : 0x03,
			"Mousepad" : 0x04,
			"Headset Stand" : 0x05,
			0x01 : "Mouse",
			0x03 : "Keyboard",
			0x04 : "Mousepad",
			0x05 : "Headset Stand"
		};

		this.DeviceIdentifiers =
		{
			0xc0 : "Keyboard",
			0xc1 : "Mouse",
			0xc2 : "Mousepad"
		};

		this.batteryDict = {
			0x05 : 100,
			0x04 : 50,
			0x03 : 30,
			0x02 : 15,
			0x01 : 0
		};

		this.LODDict = {
			"Low" : 0x02,
			"Middle" : 0x03,
			"High" : 0x04
		};

		this.mouseSubcommands =
		{
			dpi : 0x02,
			liftOffDistance : 0x03,
			angleSnapping : 0x04
		};

		this.keyboardColorDict =
		{
			"red" : 0x01,
			"green" : 0x02,
			"blue" : 0x03,
		};

		this.keyboardLayoutDict = {
			0x00 : "ANSI",
			0x01 : "ISO",
			0x02 : "ABNT2"
		};

		this.keyIdx = {
			0  : "Esc",
			1  : "F1",
			2  : "F2",
			3  : "F3",
			4  : "F4",
			5  : "F5",
			6  : "F6",
			7  : "F7",
			8  : "F8",
			9  : "F9",
			10 : "F10",
			11 : "F11",
			12 : "`",
			13 : "1",
			14 : "2",
			15 : "3",
			16 : "4",
			17 : "5",
			18 : "6",
			19 : "7",
			20 : "8",
			21 : "9",
			22 : "0",
			23 : "-",
			24 : "Tab",
			25 : "Q",
			26 : "W",
			27 : "E",
			28 : "R",
			29 : "T",
			30 : "Y",
			31 : "U",
			32 : "I",
			33 : "O",
			34 : "P",
			35 : "[",
			36 : "Caps Lock",
			37 : "A",
			38 : "S",
			39 : "D",
			40 : "F",
			41 : "G",
			42 : "H",
			43 : "J",
			44 : "K",
			45 : "L",
			46 : ";",
			47 : "'",
			48 : "Left Shift",
			49 : "",
			50 : "Z",
			51 : "X",
			52 : "C",
			53 : "V",
			54 : "B",
			55 : "N",
			56 : "M",
			57 : ",",
			58 : ".",
			59 : "/",
			60 : "Left Ctrl",
			61 : "Left Win",
			62 : "Left Alt",
			63 : "",
			64 : "Space",
			65 : "",
			66 : "",
			67 : "Right Alt",
			68 : "Right Win",
			69 : "Menu",
			70 : "Profile",
			71 : "Brightness",
			72 : "F12",
			73 : "Print Screen",
			74 : "Scroll Lock",
			75 : "Pause Break",
			76 : "Insert",
			77 : "Home",
			78 : "Page Up",
			79 : "]",
			80 : "",
			81 : "",
			82 : "Enter",
			83 : "ABNT Question Mark",
			84 : "+",
			85 : "",
			86 : "Back Space",
			87 : "Delete",
			88 : "End",
			89 : "Page Down",
			90 : "Right Shift",
			91 : "Right Ctrl",
			92 : "Up Arrow",
			93 : "Left Arrow",
			94 : "Down Arrow",
			95 : "Right Arrow",
			96 : "Lock",
			97 : "Mute",
			98 : "Stop",
			99 : "Rewind Track",
			100 : "Pause",
			101 : "Skip Track",
			102 : "Num Lock",
			103 : "Num /",
			104 : "Num *",
			105 : "Num -",
			106 : "Num +",
			107 : "Num Enter",
			108 : "Num 7",
			109 : "Num 8",
			110 : "Num 9",
			111 : "",
			112 : "Num 4",
			113 : "Num 5",
			114 : "Num 6",
			115 : "Num 1",
			116 : "Num 2",
			117 : "Num 3",
			118 : "Num 0",
			119 : "Num .",
			120 : "G1",
			121 : "G2",
			122 : "G3",
			123 : "G4",
			124 : "G5",
			125 : "G6",
			126 : "G7",
			127 : "G8",
			128 : "G9",
			129 : "G10",
			136 : "G11",
			137 : "G12",
			138 : "G13",
			139 : "G14",
			140 : "G15",
			141 : "G16",
			142 : "G17",
			143 : "G18"
		};
	}

	getPressedKey(keyIdx) { return this.keyIdx[keyIdx]; }

	getKeyboardLayout() { return this.Config.keyboardLayout; }
	setKeyboardLayout(keyboardLayout) { this.Config.keyboardLayout = keyboardLayout;}

	getDeviceName() { return this.Config.deviceName; }
	setDeviceName(deviceName) { this.Config.deviceName = deviceName; }

	getDeviceType() { return this.Config.deviceType; }
	setDeviceType(deviceType) { this.Config.deviceType = this.DeviceTypes[deviceType]; }

	getvKeys() { return this.Config.vKeys; }
	setvKeys(vKeys) { this.Config.vKeys = vKeys; }

	getvKeyNames() { return this.Config.vKeyNames; }
	setvKeyNames(vKeyNames) { this.Config.vKeyNames = vKeyNames; }

	getvLedPositions() { return this.Config.vKeyPositions; }
	setvLedPositions(vKeyPositions) { this.Config.vKeyPositions = vKeyPositions; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	setDeviceInfo() {
		const config = deviceLibrary.DeviceLibrary[deviceLibrary.PIDLibrary[device.productId()]];

		this.setvKeys(config.vKeys);
		this.setvKeyNames(config.vLedNames);
		this.setvLedPositions(config.vLedPositions);
		this.setDeviceName(config.name);
		this.setDeviceImage(config.image);

		device.setName("Corsair " + this.getDeviceName());
		device.setSize(config.size);
		device.setControllableLeds(this.Config.vKeyNames, this.Config.vKeyPositions);
		device.setImageFromUrl(this.getDeviceImage());
	}

	/** Legacy Corsair Write Command*/
	setCommand(data) {
		const packet = [0x00, this.write];
		data  = data || [0x00, 0x00, 0x00];
		packet.push(...data);
		device.write(packet, 65);
	}
	/** Legacy Corsair Read Command*/
	getCommand(data) {
		const packet = [0x00, this.read];
		packet.push(...data);
		device.send_report(packet, 65);

		const returnPacket = device.get_report(packet, 65);

		return returnPacket.slice(4, 64);
	}
	/** Legacy Corsair Streaming Command, used exclusively on keyboards iirc*/
	streamCommand(data) {
		const packet = [0x00, this.stream];
		packet.push(...data);
		device.write(packet, 65);
	}
	/* eslint-disable complexity */
	/** Grab Relevant Information off of the Device.*/
	getFirmwareInformation() { //Complexity of 21, but we don't really care. This is simply just a way to return all of our info and we parse like 2 bytes of it. If we do, then I may split it out into smaller functions.
		const returnPacket = this.getCommand([0x01, 0x00]);
		device.log(returnPacket);

		let firmwareVersion = "";
		let bootloaderVersion = "";
		let VendorID = "";
		let ProductID = "";
		let pollingRate = 0;
		let layout = "";
		let deviceType = "";


		if(returnPacket[5] !== undefined && returnPacket[6] !== undefined && returnPacket[5] > 0) {
			firmwareVersion = returnPacket[6].toString(16) + returnPacket[5].toString(16);
			device.log("Device Firmware Version:" + firmwareVersion, {toFile: true});
		} else {
			return [-1, -1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[7] !== undefined && returnPacket[8] !== undefined) {
			bootloaderVersion = returnPacket[8].toString(16) + returnPacket[7].toString(16);
			device.log("Device Bootloader Version:" + bootloaderVersion, {toFile: true});
		}else {
			return [-1, -1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[9] !== undefined && returnPacket[10] !== undefined && returnPacket[9] > 0) {
			VendorID = returnPacket[10].toString(16) + returnPacket[9].toString(16);
			device.log("Device Vendor ID: " + VendorID, {toFile: true});
		}else {
			return [-1, -1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[11] !== undefined && returnPacket[12] !== undefined && returnPacket[11] > 0) {
			ProductID = returnPacket[12].toString(16) + returnPacket[11].toString(16);
			device.log("Device Product ID: " + ProductID, {toFile: true});
		}else {
			return [-1, -1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[13] !== undefined && returnPacket[13] > 0) {
			pollingRate = 1000 / returnPacket[13];
			device.log("Device Polling Rate: " + pollingRate + "Hz", {toFile: true});
		}

		if(returnPacket[17] !== undefined && returnPacket[17] > 0) {
			deviceType = this.DeviceIdentifiers[returnPacket[17]];

		}else {
			return [-1, -1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[20] !== undefined && returnPacket[20] >= 0) {

			layout = this.keyboardLayoutDict[returnPacket[20]] ?? "ANSI";

			if(returnPacket[20] > 5 && deviceType === "Keyboard") {
				device.log("Mouse misidentified as a keyboard.", {toFile: true});
				deviceType = "Mouse"; //something something Dark Core identifies as a keyboard
			}

			device.log("Keyboard Layout Byte: " + layout);
			device.log("Device Type: " + deviceType, {toFile: true});
		}

		return [firmwareVersion, bootloaderVersion, VendorID, ProductID, pollingRate, deviceType, layout];
	}
	/* eslint-enable complexity */
	/** Initialize the Device and Check That it is Connected and Awake. */
	deviceInitialization() {

		let attempts = 0;
		let DeviceInformation = [];

		do {
			DeviceInformation = this.getFirmwareInformation();

			if(DeviceInformation[0] === -1) {
			   device.pause(50);
			   attempts++;
			}
		}

	    while(DeviceInformation[0] === -1 && attempts < 5);

	    this.setDeviceInfo();

		this.setKeyboardLayout(DeviceInformation[6]);
		this.setDeviceType(DeviceInformation[5]);

		device.addFeature("keyboard");
		macroInputArray.setCallback(macroInputHandler);
	}
	/** Set Device to Function Control Mode.*/
	setSpecialFunctionControlMode(mode) {
		const packet = [this.Commands.specialFunctionControl, mode];
		this.setCommand(packet);
	}
	/** Set Device Lighting Mode.*/
	setLightingControlMode(mode) {
		const packet = [this.Commands.lightingControl, mode, 0x00, 0x03];
		this.setCommand(packet);
	}
	/** Set Software Lighting on the Dark Core and Dark Core SE. Things use a wacky packet send.*/
	setDarkCoreLighting(RGBData) {
		device.write([0x00, 0x07, 0xaa, 0x00, 0x00, 0x01, 0x07, 0x00, 0x00, 0x64].concat(RGBData.splice(0, 3)).concat([0x00, 0x00, 0x00, 0x05]), 65); //no idea what second arg is, AS IT DOES NOTHING
		device.pause(5);
		device.write([0x00, 0x07, 0xaa, 0x00, 0x00, 0x02, 0x07, 0x00, 0x00, 0x64].concat(RGBData.splice(0, 3)).concat([0x00, 0x00, 0x00, 0x04]), 65);
		device.pause(5);
		device.write([0x00, 0x07, 0xaa, 0x00, 0x00, 0x04, 0x07, 0x00, 0x00, 0x64].concat(RGBData.slice(0, 3)).concat([0x00, 0x00, 0x00, 0x03]), 65);
		device.pause(5);
	}

	/** Set Device's Software Mouse Lighting Zones.*/
	setSoftwareMouseLighting(RGBData) {
		this.setCommand([this.Commands.softwareMouseColorChange, this.getvLedPositions().length, 0x01].concat(RGBData));
	}
	/** Set Device's Software Mousepad Lighting Zones.*/
	setSoftwareMousepadLighting(RGBData) {
		this.setCommand([this.Commands.softwareMousepadColorChange, this.getvLedPositions().length, 0x00].concat(RGBData));
	}
	/** Set Device's Software Keyboard Lighting Zones.*/
	setSoftwareLightingStream(packetID, keys, RGBData) {
		this.streamCommand([packetID, keys, 0x00].concat(RGBData));
	}
	/** Apply K55 Device's Software Keyboard Lighting Zones.*/
	setK55SoftwareLightingStream(RGBData) {
		this.setCommand([this.Commands.softwareK55ColorChange, 0x00, 0x00].concat(RGBData));
	}
	/** Set Device's Polling Rate.*/
	setDevicePollingRate(pollingRate) {
		this.setCommand([this.Commands.pollingRate, 0x00, 0x00, 1000 / pollingRate]);
	}
	/** Set Device's Angle Snapping on or off.*/
	setDeviceAngleSnap(angleSnapping) {
		this.setCommand([this.Commands.mouseFunctions, this.mouseSubcommands.angleSnapping, 0x00, angleSnapping]);
	}
	/** Apply Device's Software Keyboard Lighting Zones.*/
	ApplyLightingStream(colorChannel, packetCount, finishValue) {
		this.setCommand([this.Commands.softwareKeyboard24BitColorChange, colorChannel, packetCount, finishValue]);
	}

	/** Set Which Output Method a Given Array of Keys Will Use.*/
	setKeyOutputType(keys) { //In this method we feed in the keys and the type they'll use in case we want to split them (Which we will.)
		while(keys > 0) {
			const keysToSend = Math.min(keys.length, 30);
			this.setCommand([this.Commands.keyInputMode, keysToSend].concat(keys.splice(0, keysToSend*2)));
		}
	}
	/** Set Device's Idle Timeout and it's length. */
	setIdleTimeout(idleTimeout, idleTimeoutLength) {
		this.setCommand([this.Commands.idleTimeout, 0x00, idleTimeout, 0x03, idleTimeoutLength]);
	}
}

const LegacyCorsair = new LegacyCorsairProtocol();

/**
 * @callback bitArrayCallback
 * @param {number} bitIdx
 * @param {boolean} state
 */

export class BitArray {
	constructor(length) {
		// Create Backing Array
		this.buffer = new ArrayBuffer(length);
		// Byte View
		this.bitArray = new Uint8Array(this.buffer);
		// Constant for width of each index
		this.byteWidth = 8;

		/** @type {bitArrayCallback} */
		this.callback = (bitIdx, state) => {throw new Error("BitArray(): No Callback Available?");};
	}

	toArray() {
		return [...this.bitArray];
	}

	/** @param {number} bitIdx */
	get(bitIdx) {
		const byte = this.bitArray[bitIdx / this.byteWidth | 0] ?? 0;

		return Boolean(byte & 1 << (bitIdx % this.byteWidth));
	}

	/** @param {number} bitIdx */
	set(bitIdx) {
		this.bitArray[bitIdx / this.byteWidth | 0] |= 1 << (bitIdx % this.byteWidth);
	}

	/** @param {number} bitIdx */
	clear(bitIdx) {
		this.bitArray[bitIdx / this.byteWidth | 0] &= ~(1 << (bitIdx % this.byteWidth));
	}

	/** @param {number} bitIdx */
	toggle(bitIdx) {
		this.bitArray[bitIdx / this.byteWidth | 0] ^= 1 << (bitIdx % this.byteWidth);
	}

	/**
	 * @param {number} bitIdx
	 * @param {boolean} state
	 *  */
	setState(bitIdx, state) {
		if(state) {
			this.set(bitIdx);
		} else {
			this.clear(bitIdx);
		}
	}

	/** @param {bitArrayCallback} callback */
	setCallback(callback){
		this.callback = callback;
	}

	/** @param {number[]} newArray */
	update(newArray) {
		// Check Every Byte
		for(let byteIdx = 0; byteIdx < newArray.length; byteIdx++) {
			const value = newArray[byteIdx] ?? 0;

			if(this.bitArray[byteIdx] === value) {
				continue;
			}

			// Check Every bit of every changed Byte
			for (let bit = 0; bit < this.byteWidth; bit++) {
				const isPressed = Boolean((value) & (1 << (bit)));

				const bitIdx = byteIdx * 8 + bit;

				// Skip if the new bit state matches the old bit state
				if(isPressed === this.get(bitIdx)) {
					continue;
				}

				// Save new State
				this.setState(bitIdx, isPressed);

				// Fire callback
				this.callback(bitIdx, isPressed);
			}

		}
	}
}

const macroInputArray = new BitArray(18);

export function Validate(endpoint) {
	return (endpoint.interface === 1 && endpoint.usage === 0x0004 && endpoint.usage_page === 0xffc2)  //Normal Endpoint
	    || (endpoint.interface === 0 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xffc0); //Macro Endpoint
}


export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/keyboards/full-size-keyboard-render.png";
}