export function Name() { return "Legacy Corsair Mouse"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return Object.keys(deviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function Documentation(){ return "troubleshooting/corsair"; }
export function DeviceType(){return "mouse";}
/* global
LightingMode:readonly
forcedColor:readonly
settingControl:readonly
dpiStages:readonly
dpiRollover:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
dpi6:readonly
angleSnapping:readonly
EnableMacro:readonly
idleTimeout:readonly
idleTimeoutLength:readonly
liftOffDistance:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas", "order" : 4},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde", "order" : 4},
		{"property":"angleSnapping", "group":"mouse", "label":"Angle Snapping", description: "Enables Angle Snapping on the mouse. This will result in the cursor moving only in straight lines", "type":"boolean", "default":"false", "order" : 4},
		{"property":"liftOffDistance", "group":"mouse", "label":"Lift Off Distance",  description: "Sets the lift off distance so the device can stop detecting inputs", "type":"combobox", "values":["Low", "Middle", "High"], "default":"Middle", "order" : 4},
		{"property":"EnableMacro", "group":"mouse", "label":"Enable Macro", description: "Enables extra buttons on the mouse. This will result in the extra mouse buttons being able to be assigned to macros", "type":"boolean", "default":"false", "order" : 4},
	];
}

let savedPollTimer = Date.now();
const PollModeInternal = 15000;

export function LedNames() {
	return LegacyCorsair.getvKeyNames();
}

export function LedPositions() {
	return LegacyCorsair.getvLedPositions();
}


export function Initialize() {
	device.set_endpoint(1, 0x0004, 0xffc2);
	device.addFeature("mouse");
	device.addFeature("keyboard");

	LegacyCorsair.deviceInitialization();

	if(!LegacyCorsair.getWirelessDevice()) {
		LegacyCorsair.configureDevice();
	}
}

export function Render() {
	readInputs();

	if(!LegacyCorsair.getWakeStatus()) {
		return;
	}

	sendColors();
	getDeviceBatteryStatus();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		sendColors("#000000");
	}else{
		LegacyCorsair.setLightingControlMode(LegacyCorsair.modes.HardwareMode);
		LegacyCorsair.setSpecialFunctionControlMode(LegacyCorsair.modes.HardwareMode); //throw it back to hardware mode.  (╯°□°）╯
	}
}

export function onsettingControlChanged() {
	DPIHandler.setActiveControl(settingControl);
}

export function ondpiStagesChanged() {
	DPIHandler.setMaxStageCount(dpiStages);
}

export function ondpiRolloverChanged() {
	DPIHandler.setRollover(dpiRollover);
}

export function ondpi1Changed() {
	DPIHandler.DPIStageUpdated(1);
}

export function ondpi2Changed() {
	DPIHandler.DPIStageUpdated(2);
}

export function ondpi3Changed() {
	DPIHandler.DPIStageUpdated(3);
}

export function ondpi4Changed() {
	DPIHandler.DPIStageUpdated(4);
}

export function ondpi5Changed() {
	DPIHandler.DPIStageUpdated(5);
}

export function ondpi6Changed() {
	DPIHandler.DPIStageUpdated(6);
}

export function onangleSnappingChanged() {
	LegacyCorsair.setDeviceAngleSnap(angleSnapping);
}

export function onidleTimeoutChanged() {
	LegacyCorsair.setIdleTimeout(idleTimeout, idleTimeoutLength);
}

export function onidleTimeoutLength() {
	LegacyCorsair.setIdleTimeout(idleTimeout, idleTimeoutLength);
}

export function onliftOffDistanceChanged() {
	LegacyCorsair.setliftOffDistance(liftOffDistance);
}

function getDeviceBatteryStatus() {
	if (Date.now() - savedPollTimer < PollModeInternal) {
		return;
	}

	savedPollTimer = Date.now();

	if (LegacyCorsair.getWirelessDevice()) {
		const [batteryLevel, batteryStatus] = LegacyCorsair.getBatteryLevel();

		battery.setBatteryState(batteryStatus);
		battery.setBatteryLevel(batteryLevel);
	}
}

function readInputs() {
	if(LegacyCorsair.getWirelessDevice()) { //also future me could use this to detect if we have a dongle or not?
		device.set_endpoint(0, 0x0002, 0xffc3); //Device Wake Endpoint. WHY DO WE NEED 3 ENDPOINTS

		do {
			const packet = device.read([0x00], 64, 0);
			processInputs(packet);
		}
		while(device.getLastReadSize() > 0);
	}


	device.set_endpoint(0, 0x0002, 0xffc1); // Macro input endpoint

	do {
    	const packet = device.read([0x00], 64, 1);
    	processInputs(packet);
	}
	while(device.getLastReadSize() > 0);

}

function processInputs(packet) {
	device.set_endpoint(1, 0x0004, 0xffc2);

	if(packet[0] === 0x04) {
		LegacyCorsair.checkWakeStatus();
	}

	if(packet[0] === 0x03) {
    	macroInputArray.update(packet.slice(1, 5));
	}

}

function grabColors(overrideColor) {
	const RGBData = [];
	const vKeys = LegacyCorsair.getvKeys();
	const vLedPositions = LegacyCorsair.getvLedPositions();

	for(let leds = 0; leds < vLedPositions.length; leds++) {
		const iX = vLedPositions[leds][0];
		const iY = vLedPositions[leds][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iX, iY);
		}

		RGBData[(leds * 4)] = vKeys[leds];
		RGBData[(leds * 4) + 1] = col[0];
		RGBData[(leds * 4) + 2] = col[1];
		RGBData[(leds * 4) + 3] = col[2];
	}

	return RGBData;
}

function grabDarkCoreColors(overrideColor) {
	const RGBData = [];
	const vKeys = LegacyCorsair.getvKeys();
	const vLedPositions = LegacyCorsair.getvLedPositions();

	for(let leds = 0; leds < vLedPositions.length; leds++) {
		const iX = vLedPositions[leds][0];
		const iY = vLedPositions[leds][1];
		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = device.color(iX, iY);
		}

		RGBData[(vKeys[leds] * 3)] = col[0];
		RGBData[(vKeys[leds] * 3) + 1] = col[1];
		RGBData[(vKeys[leds] * 3) + 2] = col[2];
	}

	return RGBData;
}

function sendColors(overrideColor){

	if(LegacyCorsair.getDeviceName() === "Dark Core SE" || LegacyCorsair.getDeviceName() === "Dark Core") {
		const RGBData = grabDarkCoreColors(overrideColor);
		LegacyCorsair.setDarkCoreLighting(RGBData);

		return;
	}

	const RGBData = grabColors(overrideColor);
	LegacyCorsair.setSoftwareMouseLighting(RGBData);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export class LegacyCorsairLibrary {
	constructor() {
		this.PIDLibrary = {
			0x1B35 : "Dark Core",
			0x1B64 : "Dark Core",
			0x1B51 : "Dark Core SE",
			0x1B4B : "Dark Core SE",
			0x1B34 : "Glaive RGB",
			0x1B74 : "Glaive Pro",
			0x1B3C : "Harpoon RGB",
			0x1B75 : "Harpoon Pro",
			0x1B5D : "Ironclaw RGB",
			0x1B5A : "M65 Elite",
			0x1B2E : "M65 Pro",
			0x1B5C : "Nightsword",
			0x1B2F : "Sabre RGB",
			0x1B14 : "Sabre RGB",
			0x1B1E : "Scimitar",
			0x1B8B : "Scimitar Elite",
			0x1B3E : "Scimitar Pro",
		};
		this.DeviceLibrary = {
			"Dark Core" : {
				name: "Dark Core",
				vLedNames : [ "Front Zone", "Logo Zone" ],
				vLedPositions : [ [1, 0], [1, 2], [0, 1] ],
				vKeys : [ 2, 0, 1 ],
				size : [3, 3],
				maxDPI : 16000,
				wireless : true,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/dark-core.png"
			},

			"Dark Core SE" : {
				name: "Dark Core SE",
				vLedNames : [ "Front Zone", "Logo Zone", "Sniper pew pew!" ],
				vLedPositions : [ [1, 0], [1, 2], [0, 1] ],
				vKeys : [ 2, 0, 1 ],
				size : [2, 3],
				maxDPI : 16000,
				wireless : true,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/dark-core.png"
			},
			"Glaive RGB" : {
				name: "Glaive RGB",
				vLedNames : [ "Logo Zone", "Front Zone", "Light Zone" ],
				vLedPositions : [ [1, 2], [1, 0], [1, 1] ],
				vKeys : [ 2, 1, 6 ],
				size : [3, 3],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/glaive-rgb.png"
			},
			"Glaive Pro" : {
				name: "Glaive Pro",
				vLedNames : [ "Logo Zone", "Light Edge Zone", "Front Zone" ],
				vLedPositions : [ [1, 2], [1, 0], [1, 1] ],
				vKeys : [ 0, 1, 2 ],
				size : [3, 3],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/glaive-pro.png"
			},
			"Harpoon RGB" : {
				name: "Harpoon RGB",
				vLedNames : [ "Mouse" ],
				vLedPositions : [ [1, 1] ],
				vKeys : [ 3 ],
				size : [3, 3],
				maxDPI : 6000,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/harpoon-rgb.png"
			},
			"Harpoon Pro" : {
				name: "Harpoon Pro",
				vLedNames : [ "Mouse" ],
				vLedPositions : [ [1, 1] ],
				vKeys : [ 3 ],
				size : [3, 3],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/harpoon-pro.png"
			},
			"Ironclaw RGB" : {
				name: "Ironclaw RGB",
				vLedNames : [ "Logo Zone", "Scroll Zone" ],
				vLedPositions : [ [1, 2], [1, 0] ],
				vKeys : [ 2, 4 ],
				size : [3, 3],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/ironclaw-rgb.png"
			},
			"M65 Elite" : {
				name: "M65 Elite",
				vLedNames : [ "Scroll Zone", "Dpi Zone", "Logo Zone" ],
				vLedPositions : [ [1, 0], [1, 1], [1, 2] ],
				vKeys : [ 4, 3, 2 ],
				size : [3, 3],
				maxDPI : 18000,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/m65-elite.png"
			},
			"M65 Pro" : {
				name: "M65 Pro",
				vLedNames : [ "Scroll Zone", "Dpi Zone", "Logo Zone" ],
				vLedPositions : [ [1, 0], [1, 1], [1, 2] ],
				vKeys : [ 1, 3, 2 ],
				size : [3, 3],
				maxDPI : 12400,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/m65-pro.png"
			},
			"Nightsword" : {
				name: "Nightsword",
				vLedNames : ["Logo Zone", "Rear Zone", "Front Zone", "Scroll Zone"],
				vLedPositions : [[2, 2], [2, 3], [1, 0], [0, 0]],
				vKeys : [ 2, 6, 1, 4 ],
				size : [3, 4],
				maxDPI : 12400,
				hasSniperButton : true,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/nightsword.png"
			},
			"Sabre RGB": {
				name: "Sabre RGB",
				size: [3, 3],
				vLedNames: [ "Scroll Zone", "Front Zone", "Bottom LED?", "Logo Zone" ],
				vLedPositions: [ [1, 1], [1, 0], [1, 1], [1, 2] ],
				vKeys: [ 0, 1, 2, 3 ],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/sabre-rgb-pro.png"
			},
			"Scimitar" : {
				name: "Scimitar",
				vLedNames : [ "Logo Zone", "Side Bar", "Side Keys", "Front Zone", "Scroll Zone" ],
				vLedPositions : [ [2, 2], [0, 0], [0, 1], [2, 0], [1, 0] ],
				vKeys : [ 2, 3, 5, 1, 4 ],
				size : [3, 4],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/scimitar-pro.png"
			},
			"Scimitar Elite" : {
				name: "Scimitar Elite",
				vLedNames : [ "Logo Zone", "Side Bar", "Side Keys", "Front Zone", "Scroll Zone" ],
				vLedPositions : [ [2, 2], [0, 0], [0, 1], [2, 0], [1, 0] ],
				vKeys : [ 2, 3, 5, 1, 4 ],
				size : [3, 4],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/scimitar-pro.png"
			},
			"Scimitar Pro" : {
				name: "Scimitar Pro",
				vLedNames : [ "Logo Zone", "Side Bar", "Side Keys", "Front Zone", "Scroll Zone" ],
				vLedPositions : [ [2, 2], [0, 0], [0, 1], [2, 0], [1, 0] ],
				vKeys : [ 2, 3, 5, 1, 4 ],
				size : [3, 4],
				maxDPI : 12400,
				image: "https://assets.signalrgb.com/devices/brands/corsair/mice/scimitar-pro.png"
			},
		};
	}

	getDeviceByProductId(productId) {
		return this.DeviceLibrary[this.PIDLibrary[productId]];
	}
}
const deviceLibrary = new LegacyCorsairLibrary();

export class LegacyCorsairProtocol {
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
			maxDPI: 0,
			hasSniperButton : false
		};

		this.DeviceTypes =
		{
			"Mouse" : 0x01,
			"Keyboard" : 0x03,
			"Mousepad" : 0x04,
			"Headset Stand" : 0x05
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
			red : 0x01,
			green : 0x02,
			blue : 0x03
		};

		this.keyIdx = {
			0 : "Left Click",
			1 : "Right Click",
			2 : "Middle Click",
			3 : "Backwards",
			4 : "Forwards",
			5 : "DPI Up",
			6 : "DPI Down",
			7 : "Sniper",
			8 : "Keypad 1",
			9 : "Keypad 2",
			10 : "Keypad 3",
			11 : "Keypad 4",
			12 : "Keypad 5",
			13 : "Keypad 6",
			14 : "Keypad 7",
			15 : "Keypad 8",
			16 : "Keypad 9",
			17 : "Keypad 10",
			18 : "Keypad 11",
			19 : "Keypad 12",
			20 : "null 20", //Wonder what mouse has this key?
			24 : "Profile Up",
			25 : "Profile Down"
		};

		this.defaultBinds = {
			0 : 0,
			1 : 0,
			2 : 0,
			3 : 0,
			4 : 0,
			5 : 0,
			6 : 0,
			7 : 0,
			8 :  97,
			9 :  98,
			10 : 99,
			11 : 100,
			12 : 101,
			13 : 102,
			14 : 103,
			15 : 104,
			16 : 105,
			17 : 96,
			18 : 109,
			19 : 107,
			20 : 0,
			24 : 106,
			25 : 108
		};
	}

	getPressedKey(keyIdx) { return this.keyIdx[keyIdx]; }
	getKeycode(keyIdx) { return this.defaultBinds[keyIdx]; }

	getDeviceName() { return this.Config.deviceName; }
	setDeviceName(deviceName) { this.Config.deviceName = deviceName; }

	getDeviceType() { return this.Config.deviceType; }
	setDeviceType(deviceType) { this.Config.deviceType = this.DeviceTypes[deviceType]; }

	getWirelessDevice() { return this.Config.wirelessDevice; }
	setWirelessDevice(wireless) { this.Config.wirelessDevice = wireless; }

	getMaxDPI() { return this.Config.maxDPI; }
	setMaxDPI(maxDPI) { this.Config.maxDPI = maxDPI; }

	getWakeStatus() { return this.Config.deviceAwake; }
	setWakeStatus(wakeStatus) { this.Config.deviceAwake = wakeStatus; }

	getHasSniperButton() { return this.Config.hasSniperButton; }
	setHasSniperButton(hasSniperButton) { this.Config.hasSniperButton = hasSniperButton; }

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

		if(config.wireless) {
			this.setWirelessDevice(config.wireless);

			device.addProperty({"property":"idleTimeout", "group":"mouse", "label":"Enable Device Sleep", description: "Enables the device to enter sleep mode", "type":"boolean", "default":"false", "order" : 4});
			device.addProperty({"property":"idleTimeoutLength", "group":"mouse", "label":"Device Sleep Timeout (Minutes)", description: "Sets the amount of time in minutes on idle before the device enters the sleep mode", "step":"1", "type":"number", "min":"1", "max":"30", "default":"15", "order" : 4, "live": "false"});
			device.addFeature("battery");
		}

		if(config.maxDPI) {
			device.log(`Setting Max DPI Based on Config: ${config.maxDPI}`);
			this.setMaxDPI(config.maxDPI);
		}

		if(config.hasSniperButton) {
			this.setHasSniperButton(config.hasSniperButton);
		}

		this.setvKeys(config.vKeys);
		this.setvKeyNames(config.vLedNames);
		this.setvLedPositions(config.vLedPositions);
		this.setDeviceName(config.name);
		this.setDeviceImage(config.image);

		device.setName("Corsair " + deviceLibrary.PIDLibrary[device.productId()]);
		device.setSize(config.size);
		device.setControllableLeds(this.Config.vKeyNames, this.Config.vKeyPositions);
		device.setImageFromUrl(this.getDeviceImage());
	}

	/** Legacy Corsair Write Command*/
	setCommand(data) {
		device.write([0x00, this.write].concat(data), 65);
	}
	/** Legacy Corsair Read Command*/
	getCommand(data) {
		device.send_report([0x00, this.read].concat(data), 65);

		const returnPacket = device.get_report([0x00, this.read], 65);

		return returnPacket.slice(4, 64);
	}
	/** Legacy Corsair Streaming Command, used exclusively on keyboards iirc*/
	streamCommand(data) {
		device.write([0x00, this.stream].concat(data), 65);
	}
	wirelessDeviceSetup() { //good way to make sure users pair the right device to the right receiver
		const wirelessFirmwarePacket = this.getCommand([0xae]);

		device.log("Full Wireless Info Packet: " + wirelessFirmwarePacket);

		if(wirelessFirmwarePacket[2] !== undefined && wirelessFirmwarePacket[2] > 0 && wirelessFirmwarePacket[1] !== undefined && wirelessFirmwarePacket[1] > 0) {
			const VendorID = wirelessFirmwarePacket[2].toString(16) + wirelessFirmwarePacket[1].toString(16);
			device.log("Wireless Device Vendor ID: " + VendorID);
		} else {
			device.log("Failed to Grab Wireless Device Vendor ID.", {toFile : true});

			return [-1, -1];
		}

		if(wirelessFirmwarePacket[4] !== undefined && wirelessFirmwarePacket[4] > 0 && wirelessFirmwarePacket[3] !== undefined && wirelessFirmwarePacket[3] > 0) {
			const ProductID = wirelessFirmwarePacket[4].toString(16) + wirelessFirmwarePacket[3].toString(16);
			device.log("Wireless Device Product ID: " + ProductID);
		} else {
			device.log("Failed to Grab Wireless Device Product ID.", {toFile : true});

			return [-1, -1];
		}

		this.setCommand([0xAD, 0x00, 0x00, 0x64]); //Crank the brightness

		return this.getBatteryLevel();
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
		let layout = 0;
		let deviceType = "";


		if(returnPacket[5] !== undefined && returnPacket[6] !== undefined && returnPacket[5] > 0) {
			firmwareVersion = returnPacket[6].toString(16) + returnPacket[5].toString(16);
			device.log("Device Firmware Version:" + firmwareVersion, {toFile: true});
		} else {
			return [-1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[7] !== undefined && returnPacket[8] !== undefined && returnPacket[7] > 0) {
			bootloaderVersion = returnPacket[8].toString(16) + returnPacket[7].toString(16);
			device.log("Device Bootloader Version:" + bootloaderVersion, {toFile: true});
		}else {
			return [-1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[9] !== undefined && returnPacket[10] !== undefined && returnPacket[9] > 0) {
			VendorID = returnPacket[10].toString(16) + returnPacket[9].toString(16);
			device.log("Device Vendor ID: " + VendorID, {toFile: true});
		}else {
			return [-1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[11] !== undefined && returnPacket[12] !== undefined && returnPacket[11] > 0) {
			ProductID = returnPacket[12].toString(16) + returnPacket[11].toString(16);
			device.log("Device Product ID: " + ProductID, {toFile: true});
		}else {
			return [-1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[13] !== undefined && returnPacket[13] > 0) {
			pollingRate = 1000 / returnPacket[13];
			device.log("Device Polling Rate: " + pollingRate + "Hz", {toFile: true});
		}

		if(returnPacket[17] !== undefined && returnPacket[17] > 0) {
			deviceType = this.DeviceIdentifiers[returnPacket[17]];
		}else {
			return [-1, -1, -1, -1, -1, -1];
		}

		if(returnPacket[20] !== undefined && returnPacket[20] > 0) {
			layout = returnPacket[20];

			if(layout > 5 && deviceType === "Keyboard") {
				device.log("Mouse misidentified as a keyboard.", {toFile: true});
				deviceType = "Mouse"; //something something Dark Core identifies as a keyboard
			}

			device.log("Keyboard Layout Byte: " + layout);
			device.log("Device Type: " + deviceType, {toFile: true});
		}

		return [firmwareVersion, bootloaderVersion, VendorID, ProductID, pollingRate, deviceType];
	}
	/* eslint-enable complexity */
	/** Grab Battery Level off of the Device.*/
	getBatteryLevel() {
		const batteryPacket = this.getCommand([0x50]);

		const batteryLevel = this.batteryDict[batteryPacket[1]];
		const batteryStatus = batteryPacket[2];

		if(batteryLevel !== undefined && batteryStatus !== undefined) {
			device.log("Battery Level: " + batteryLevel + "%");

			return [batteryLevel, batteryStatus];
		}

		device.log("Error Fetching Battery Level");

		return [-1, -1];
	}
	/** Check if a device is awake using the battery level as a gauge. Does not forward battery percentage to Signal's UI.*/
	checkWakeStatus() {
		const wakeStatus = this.getBatteryLevel();

		if(wakeStatus[0] !== undefined) {
			this.setWakeStatus(true);
			this.configureDevice();
		} else {
			this.setWakeStatus(false);
			device.log("Device is taking a nap.");
		}
	}
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

		this.setDeviceType(DeviceInformation[5]);

		if(this.getWirelessDevice()) {
			//this.wirelessDeviceSetup();
			//above should fix the battery is not defined console error but instead causes an IO overlap situation to occur when enabled.
			this.checkWakeStatus();
		} else {
			this.setWakeStatus(true); //Wired devices will never have a wake status
		}
	}
	/** Configure the device based on the dictionary and data gathered in Device Initialization. */
	configureDevice() {
		device.log("Device Requires Config as it has woken from sleep or has been rebooted");
		this.setLightingControlMode(this.modes.SoftwareMode);
		this.setSpecialFunctionControlMode(this.modes.SoftwareMode);

		if(this.getWirelessDevice()) {
			this.wirelessDeviceSetup();
		}


		DPIHandler.setMinDpi(200);
		DPIHandler.setMaxDpi(this.getMaxDPI());
		DPIHandler.addProperties();

		if(this.getHasSniperButton()) {
			DPIHandler.addSniperProperty();
		}

		DPIHandler.setMaxStageCount(dpiStages);
		DPIHandler.setRollover(dpiRollover);
		DPIHandler.setUpdateCallback(function(dpi) { return LegacyCorsair.setDPI(dpi); });

		if(settingControl) {
			DPIHandler.setActiveControl(true);
			DPIHandler.update();
			this.setDeviceAngleSnap(angleSnapping);
			this.setliftOffDistance(liftOffDistance);

			if(this.getWirelessDevice()) {
				this.setIdleTimeout(idleTimeout, idleTimeoutLength);
			}
		}

		if(this.getDeviceName() === "Nightsword") { //is mine just a special snowflake? Probably, but also edge cases.
			device.write([0x00, 0x07, 0x05, 0x02, 0x00, 0x03], 65); //Just realized this is setting software mode, but with an extra brightness flag.
		}

		this.setKeyOutputType([0x01, 0x80, 0x02, 0x80, 0x03, 0x80, 0x04, 0x80, 0x05, 0x80, 0x06, 0x40, 0x07, 0x40, 0x08, 0x40, 0x09, 0x40, 0x0a, 0x40, 0x0b, 0x40, 0x0c, 0x40, 0x0d, 0x40, 0x0e, 0x40, 0x0f, 0x40, 0x10, 0x40, 0x11, 0x40, 0x12, 0x40, 0x13, 0x40, 0x14, 0x40, 0x15, 0x40, 0x16, 0x40, 0x17, 0x40, 0x18, 0x40, 0x19, 0x40, 0x1a, 0x40]);

		device.write([0x00, 0x07, 0x40, 0x16, 0x00, 0x01, 0x80, 0x02, 0x80, 0x03, 0x80, 0x04, 0x80, 0x05, 0x80, 0x06, 0x40, 0x07, 0x40, 0x08, 0x40, 0x09, 0x40, 0x0a, 0x40, 0x0b, 0x40, 0x0c, 0x40, 0x0d, 0x40, 0x0e, 0x40, 0x0f, 0x40, 0x10, 0x40, 0x11, 0x40, 0x12, 0x40, 0x13, 0x40, 0x14, 0x40, 0x15, 0x40, 0x16, 0x40, 0x17, 0x40, 0x18, 0x40, 0x19, 0x40, 0x1a, 0x40], 65);
	}
	/** Set Device to Function Control Mode.*/
	setSpecialFunctionControlMode(mode) {
		const packet = [this.Commands.specialFunctionControl, mode];
		this.setCommand(packet);
	}
	/** Set Device Lighting Mode.*/
	setLightingControlMode(mode) {
		const packet = [this.Commands.lightingControl, mode, 0x00, this.getDeviceType()];
		this.setCommand(packet);
	}
	/** Set Software Lighting on the Dark Core and Dark Core SE. Things use a wacky packet send.*/
	setDarkCoreLighting(RGBData) {
		this.setCommand([0xaa, 0x00, 0x00, 0x01, 0x07, 0x00, 0x00, 0x64].concat(RGBData.splice(0, 3)).concat([0x00, 0x00, 0x00, 0x05])); //no idea what second arg is, AS IT DOES NOTHING
		device.pause(5);
		this.setCommand([0xaa, 0x00, 0x00, 0x02, 0x07, 0x00, 0x00, 0x64].concat(RGBData.splice(0, 3)).concat([0x00, 0x00, 0x00, 0x04]));
		device.pause(5);
		this.setCommand([0xaa, 0x00, 0x00, 0x04, 0x07, 0x00, 0x00, 0x64].concat(RGBData.slice(0, 3)).concat([0x00, 0x00, 0x00, 0x03]));
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
	/** Set Device's Polling Rate.*/
	setDevicePollingRate(pollingRate) {
		this.setCommand([this.Commands.pollingRate, 0x00, 0x00, 1000 / pollingRate]);
	}
	/** Set Device's Angle Snapping on or off.*/
	setDeviceAngleSnap(angleSnapping) {
		this.setCommand([this.Commands.mouseFunctions, this.mouseSubcommands.angleSnapping, 0x00, angleSnapping ? 1 : 0]);
	}
	/** Apply Device's Software Keyboard Lighting Zones.*/
	ApplyLightingStream(colorChannel, packetCount, finishValue) {
		this.setCommand([this.Commands.softwareKeyboard24BitColorChange, colorChannel, packetCount, finishValue]);
	}
	/** Set Which Output Method a Given Array of Keys Will Use.*/
	setKeyOutputType(keys) { //In this method we feed in the keys and the type they'll use in case we want to split them (Which we will.)
		while(keys.length > 0) {
			const keysToSend = Math.min((keys.length/2), 30);
			this.setCommand([this.Commands.keyInputMode, keysToSend, 0x00].concat(keys.splice(0, keysToSend*2)));
		}
	}
	/** Set Device's Software DPI.*/
	setDPI(deviceDPI, RGBData = [0x00, 0x00, 0x00]) {//There is another more complicated handler to do this properly. For now we're manipulating a single stage. Bright side is that we can do infinite zones even if a mouse only supports 2 or 3.

		const LowDpi = deviceDPI%256;
    	const HighDpi = deviceDPI/256;
    	this.setCommand([LegacyCorsair.Commands.mouseFunctions, 0xD3, 0x00, 0x00, LowDpi, HighDpi, LowDpi, HighDpi].concat(RGBData)); //this is jank, why am I doing it like this ?.
		this.setCommand([LegacyCorsair.Commands.mouseFunctions, 0x02, 0x00, 0x03]); //bonk. this is your stage selector. It's really not that complicated
	}//Double edged sword because of indicators. We render DPI Indicators useless by these means if a device won't let you change them individually. Namely the Dark Core.
	/** Set Device's Idle Timeout and it's length. */
	setIdleTimeout(idleTimeout, idleTimeoutLength) {
		if(idleTimeout <= 30 && idleTimeout >= 1) {
			this.setCommand([this.Commands.idleTimeout, 0x00, idleTimeout ? 0x01 : 0x00, 0x03, idleTimeoutLength]);
		} else {
			console.log("Failed to set Idle Timeout as value was out of bounds.", {toFile : true});
		}
	}
	/** Set Device's Lift Off Distance. */
	setliftOffDistance(liftOffDistance) {
		if(this.LODDict[liftOffDistance] !== undefined) {
			this.setCommand([this.Commands.mouseFunctions, this.mouseSubcommands.liftOffDistance, 0x00, this.LODDict[liftOffDistance]]);
		} else {
			console.log("Failed to set Lift Off Distance as value was out of bounds.", {toFile : true});
		}
	}
}

const LegacyCorsair = new LegacyCorsairProtocol();

export default class DpiController {
	constructor() {
		this.currentStageIdx = 1;
		this.maxSelectedableStage = 5;
		this.maxStageIdx = 5; //Default to 5 as it's most common if not defined
		this.sniperStageIdx = 6;

		this.updateCallback = (dpi) => { this.log("No Set DPI Callback given. DPI Handler cannot function!"); dpi; };

		this.logCallback = (message) => { console.log(message); };

		this.sniperMode = false;
		this.enabled = false;
		this.dpiRollover = false;
		this.dpiMap = new Map();
		this.maxDpi = 18000;
		this.minDpi = 200;
	}
	addProperties() {
		device.addProperty({ "property": "settingControl", "group": "dpi", "label": "Enable Setting Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type": "boolean", "default": "false", "order": 1 });
		device.addProperty({ "property": "dpiStages", "group": "dpi", "label": "Number of DPI Stages", description: "Sets the number of active DPI stages to cycle though", "step": "1", "type": "number", "min": "1", "max": this.maxSelectedableStage, "default": this.maxStageIdx, "order": 1, "live": "false" });
		device.addProperty({ "property": "dpiRollover", "group": "dpi", "label": "DPI Stage Rollover", description: "Allows DPI Stages to loop in a circle, going from last stage to first one on button press", "type": "boolean", "default": "false", "order": 1 });

		try {
			// @ts-ignore
			this.maxStageIdx = dpiStages;
		} catch (e) {
			this.log("Skipping setting of user selected max stage count. Property is undefined");
		}

		this.rebuildUserProperties();
	}
	addSniperProperty() {
		device.addProperty({ "property": `dpi${this.sniperStageIdx}`, "group": "dpi", "label": "Sniper Button DPI", "step": "50", "type": "number", "min": this.minDpi, "max": this.maxDpi, "default": "400", "order": 3, "live": "false" });
		// eslint-disable-next-line no-eval
		this.dpiMap.set(6, () => { return eval(`dpi${6}`); });
	}
	getCurrentStage() {
		return this.currentStageIdx;
	}
	getMaxStage() {
		return this.maxStageIdx;
	}
	getSniperIdx() { return this.sniperStageIdx; }
	setRollover(enabled) {
		this.dpiRollover = enabled;
	}
	setMaxStageCount(count) {
		this.maxStageIdx = count;
		this.rebuildUserProperties();
	}
	setMinDpi(minDpi) { this.minDpi = minDpi; this.updateDpiRange(); }
	setMaxDpi(maxDpi) { this.maxDpi = maxDpi; this.updateDpiRange(); }
	setUpdateCallback(callback) {
		this.updateCallback = callback;
	}
	active() { return this.enabled; }
	setActiveControl(EnableDpiControl) {
		this.enabled = EnableDpiControl;

		if (this.enabled) {
			this.update();
		}
	}
	/** GetDpi Value for a given stage.*/
	getDpiForStage(stage) {
		if (!this.dpiMap.has(stage)) {
			device.log("bad stage: " + stage);
			this.log("Invalid Stage...");

			return;
		}

		// This is a dict of functions, make sure to call them
		this.log("Current DPI Stage: " + stage);

		const dpiWrapper = this.dpiMap.get(stage);
		const dpi = dpiWrapper();
		this.log("Current DPI: " + dpi);

		return dpi;
	}
	/** Increment DPIStage */
	increment() {
		this.setStage(this.currentStageIdx + 1);
	}
	/** Decrement DPIStage */
	decrement() {
		this.setStage(this.currentStageIdx - 1);
	}
	/** Set DPIStage and then set DPI to that stage.*/
	setStage(stage) {
		if (stage > this.maxStageIdx) {
			this.currentStageIdx = this.dpiRollover ? 1 : this.maxStageIdx;
		} else if (stage < 1) {
			this.currentStageIdx = this.dpiRollover ? this.maxStageIdx : 1;
		} else {
			this.currentStageIdx = stage;
		}

		this.update();
	}
	/** SetDpi Using Callback. Bypasses setStage.*/
	update() {
		if (!this.enabled) {
			return;
		}
		const stage = this.sniperMode ? this.sniperStageIdx : this.currentStageIdx;
		const dpi = this.getDpiForStage(stage);

		if (dpi) {
			this.updateCallback(dpi);
		}
	}
	/** Stage update check to update DPI if current stage values are changed.*/
	DPIStageUpdated(stage) {
		// if the current stage's value was changed by the user
		// reapply the current stage with the new value
		if (stage === this.currentStageIdx) {
			this.update();
		}
	}
	/** Set Sniper Mode on or off. */
	setSniperMode(sniperMode) {
		this.sniperMode = sniperMode;
		this.log("Sniper Mode: " + this.sniperMode);
		this.update();
	}
	rebuildUserProperties() {
		// Remove Stages

		for (const stage in Array.from(this.dpiMap.keys())) {
			if(+stage+1 === this.sniperStageIdx) {
				continue;
			}

			if (stage >= this.maxStageIdx) {
				this.log(`Removing Stage: ${+stage+1}`);
				device.removeProperty(`dpi${+stage+1}`);
				this.dpiMap.delete(+stage+1);
			}
		}
		// Add new Stages
		const stages = Array.from(this.dpiMap.keys());

		for (let i = 1; i <= this.maxStageIdx; i++) {
			if (stages.includes(i)) {
				continue;
			}

			this.log(`Adding Stage: ${i}`);
			device.addProperty({ "property": `dpi${i}`, "group": "dpi", "label": `DPI ${i}`, "step": "50", "type": "number", "min": this.minDpi, "max": this.maxDpi, "default": 800 + (400*i), "order": 2, "live": "false" });
			// eslint-disable-next-line no-eval
			this.dpiMap.set(i, () => { return eval(`dpi${i}`); });
		}
	}
	updateDpiRange() {
		for (const stage in this.dpiMap.keys()) {
			const prop = device.getProperty(`dpi${+stage}`);
			prop.min = this.minDpi;
			prop.max = this.maxDpi;
			device.addProperty(prop);
		}
	}
	log(message) {
		if (this.logCallback) {
			this.logCallback(message);
		}
	}
}

const DPIHandler = new DpiController();

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
				switch(bitIdx){
				case 5:
					if(!isPressed) {break;}

					DPIHandler.increment();
					device.log("DPI Up");
					break;

				case 6:
					if(!isPressed) {break;}

					device.log("DPI Down");
					DPIHandler.decrement();
					break;
				case 7:
					device.log("Sniper Pressed: " + isPressed);
					DPIHandler.setSniperMode(isPressed);
					break;

				default: {
					const buttonName = LegacyCorsair.getPressedKey(bitIdx);
					device.log(`Button Pressed: ${buttonName} Pressed: ${isPressed}`);

					const keebEventData = {
						key : buttonName,
						keyCode : 0,
						"released": !isPressed,
					};

					const mouseEventData = {
						"buttonCode": 0,
						"released": !isPressed,
						"name":buttonName
					};

					if(EnableMacro === true) {
						if(device.productId() === 0x1B8B) {
							keyboard.sendEvent(keebEventData, "Key Press");
						} else {
							mouse.sendEvent(mouseEventData, "Button Press");
						}

					} else {
						keyboard.sendHid(LegacyCorsair.getKeycode(bitIdx), {released : !isPressed});
					}

				}
				}
			}

		}
	}
}
/* eslint-enable complexity */
const macroInputArray = new BitArray(4);


export function Validate(endpoint) {
	return (endpoint.interface === 1 && endpoint.usage === 0x0004 && endpoint.usage_page === 0xffc2)  //Normal Endpoint
	    || (endpoint.interface === 0 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xffc1) //Macro Endpoint
		|| (endpoint.interface === 0 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xffc3);//Wake endpoint
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/mice/mouse.png";
}