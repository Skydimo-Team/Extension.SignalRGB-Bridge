/* eslint-disable max-len */
import DeviceDiscovery from "@SignalRGB/DeviceDiscovery";

export function Name() { return "Corsair Bragi Headset"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return Object.keys(CorsairLibrary.ProductIDList()); }
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/corsair"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "dongle";}
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
micLedMode:readonly
micMuteColor:readonly
idleTimeout:readonly
SidetoneAmount:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"idleTimeout", group:"", label:"Device Sleep Timeout (Minutes)", description: "Enables the device to enter sleep mode", type:"combobox", values:["Off", "1", "2", "3", "4", "5", "10", "15", "20", "25", "30"], default:"10"},
	];
}

const devFlags = false;


export function SubdeviceController() { return devFlags; } //Fix DPI Logic. If you remove too many stages, it blows up.

/** @type {CorsairBragiDongle | undefined} */
let BragiDongle;
/** @type {CorsairBragiDevice | undefined} */
let wiredDevice;

/** @type {Options} */
const options = {
	developmentFirmwareVersion: "5.6.126",
};

/** @param {HidEndpoint} endpoint */
export function Validate(endpoint) {
	return (endpoint.interface === 3) ||
	(endpoint.interface === 4);
}

let mainEndpoint;
let notificationEndpoint;

export function Initialize() {
	//What I don't know is if the endpoints can change around since these are all slipstream dongles.
	//This is very much subject to change.
	mainEndpoint = CorsairLibrary.GetMainEndpoint(device.productId());
	notificationEndpoint = CorsairLibrary.GetNotificationEndpoint(device.productId());
	device.set_endpoint(mainEndpoint["interface"], mainEndpoint["usage"], mainEndpoint["usage_page"]);

	Corsair.SetMode("Software");
	Corsair.FetchDeviceInformation();
	fetchAndConfigureChildren();
	macroInputArray.setCallback((bitIdx, isPressed) => { return processMacroInputs(bitIdx, isPressed); });
	device.addFeature("keyboard");
	//device.control_transfer(0x00, 9, 0x01, 0, [], 0, 1000);
	//We can't send these because windows is stupid.
	//device.control_transfer(0x20, 1, 0x0100, 0x0600, [1], 1, 1000);
}

let subdevicesEditedLastFrame = false;

export function Render() {
	readDeviceNotifications();

	if(subdevicesEditedLastFrame) {
		subdevicesEditedLastFrame = false;

		return;
	}

	PollDeviceMode();
	PollDeviceState();

	if(wiredDevice){
		UpdateRGB(wiredDevice);
	}

	if(BragiDongle) {
		for(const [key, value] of BragiDongle.children){
			PollDeviceMode(key);
			PollDeviceState(key);
			UpdateRGB(value, key);
		}
	}
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		if(wiredDevice) {
			UpdateRGB(wiredDevice, undefined, "#000000");
			Corsair.SetMode("Hardware");
		}

		if(BragiDongle){
			for(const [key, value] of BragiDongle.children){
				UpdateRGB(value, key, "#000000");
				Corsair.SetMode("Hardware", key);
			}
		}
	}else{
		if(wiredDevice) {
			UpdateRGB(wiredDevice, undefined, shutdownColor);
			Corsair.SetMode("Hardware");
		}

		if(BragiDongle){
			for(const [key, value] of BragiDongle.children){
				UpdateRGB(value, key, shutdownColor);
				Corsair.SetMode("Hardware", key);
			}
		}
	}
}

export function onSidetoneAmountChanged() {
	Corsair.SetSidetone(wiredDevice ? 0 : 1);
}

export function onidleTimeoutChanged() {
	Corsair.SetIdleTimeout(wiredDevice ? 0 : 1);
}

function fetchAndConfigureChildren() {
	if(Corsair.IsPropertySupported(Corsair.properties.subdeviceBitmask)){
		device.log(`Wireless Dongle detected!`, {toFile : true});

		if(!BragiDongle){
			BragiDongle = new CorsairBragiDongle();
		}

		setupDongle();

		return;
	}

	device.log("Device is not a wireless dongle. Setting up Wired Mode...", {toFile : true});
	setupWiredDevice();
}

function setupDongle() {
	const children = GetConnectedSubdevices();

	device.log(`Detected ${children.length} connected device(s)!`);


	for(let devices = 0; devices < children.length; devices++) {
		device.log("Child BitID: " + children[devices]);

		if(devices > 1 && !devFlags){
			device.notify("Multipoint is not supported!", "Multipoint is not supported on Corsair devices due to instability issues. Please pair devices to their respective dongles.", 1);
			device.log(`Multiple Devices Connected. Plugin Doesn't support this!`);

			return;
		}

		if(devFlags) {
			addChildDevice(children[devices]);
		} else { addSinglePointChild(children[devices]); }

	}
}

function setupWiredDevice() {
	const devicePID = Corsair.FetchProperty(Corsair.properties.pid);
	const deviceConfig = CorsairLibrary.GetDeviceByProductId(devicePID);

	wiredDevice = new CorsairBragiDevice(deviceConfig, 0x00);

	if(!devFlags) {
		device.setName(wiredDevice.name);
		device.setSize(wiredDevice.size);
		device.setControllableLeds(wiredDevice.ledNames, wiredDevice.ledPositions);
		device.setImageFromUrl(wiredDevice.image);
		initializeDevice(wiredDevice);
	}

	if(devFlags) { createSubdevice(wiredDevice); initializeDevice(wiredDevice); }
}

/* eslint-disable complexity */
function initializeDevice(deviceConfig, deviceID = 0) {
	Corsair.SetMode("Software", deviceID);

	Corsair.SetHWBrightness(1000, deviceID);

	//deviceConfig.isLightingController = Corsair.FetchLightingControllerSupport(deviceID);

	const supportedLighting = Corsair.FindLightingEndpoint(deviceID);

	deviceConfig.isLightingController = supportedLighting === 0x22 ? true : false;

	device.log(`Device Uses Lighting Controller Scheme: ${deviceConfig.isLightingController}`);
	device.log("Let There Be Light!");

	deviceConfig.supportsBattery = Corsair.FetchBatterySupport(deviceID);
	device.log(`Device Battery Support: ${deviceConfig.supportsBattery}`);

	if(deviceConfig.supportsBattery) {
		device.addFeature("battery");

		const [BatteryLevel, ChargeState] = Corsair.FetchBatteryStatus(deviceID);

		device.log(`Battery Level is [${(BatteryLevel ?? 0)/10}%]`);
		device.log(`Battery Status is [${Corsair.chargingStates[ChargeState ?? 0]}]`);

		battery.setBatteryLevel((BatteryLevel ?? 0)/ 10);
		battery.setBatteryState(Corsair.chargingStateDictionary[ChargeState ?? 0]);
	}


	deviceConfig.supportsModernMute = Corsair.FetchModernMuteSupport(deviceID);
	deviceConfig.supportsLegacyMute = Corsair.FetchLegacyMuteSupport(deviceID);
	deviceConfig.supportsSidetone = Corsair.FetchSidetoneSupport(deviceID);

	/*
	if(deviceConfig.supportsModernMute || deviceConfig.supportsLegacyMute) {
		device.addProperty({property:"micLedMode", group:"lighting", label:"Microphone LED Mode", description: "Sets the microphone LED behavior", type:"combobox", values:["Canvas", "MuteState"], default:"Canvas"});
		device.addProperty({property:"micMuteColor", group:"lighting", label:"Microphone Mute Color", description: "Sets the microphone LED color when on mute while 'Microphone LED Mode' is set to 'MuteState'", min:"0", max:"360", type:"color", default:"#ff0000"});
	}
	*/

	if(deviceConfig.supportsSidetone) {
		device.addProperty({property:"SidetoneAmount", group:"", label:"Sidetone", description: "Sets the sidetone level amount", step:"1", type:"number", min:"0", max:"100", default:"0", live : false});
		Corsair.SetSidetone(wiredDevice ? 0 : 1);
	}

	Corsair.SetIdleTimeout(wiredDevice ? 0 : 1);

}
/* eslint-enable complexity */

function GetConnectedSubdevices(){
	device.log(`Checking for connected devices!`);

	const bitmask = Corsair.FetchProperty(Corsair.properties.subdeviceBitmask);
	device.log("Bitmask:" + bitmask);

	const ConnectedChildren = [];

	for(let i = 1; i < 8; i ++){
		const mask = 1 << i;

		if(bitmask & mask){
			ConnectedChildren.push(i);
		}
	}

	return ConnectedChildren;
}

function createSubdevice(subdevice) {
	device.createSubdevice(subdevice.name);
	device.setSubdeviceName(subdevice.name, `${subdevice.name}`);
	//TODO: Attach image url to device library
	//device.setSubdeviceImage(subdevice.name, Image()); //can't wait to have a dict for these
	device.setSubdeviceSize(subdevice.name, subdevice.size[0], subdevice.size[1]);
	device.setSubdeviceLeds(subdevice.name,
		subdevice.ledNames,
		subdevice.ledPositions);
}

function readDeviceNotifications(){
	device.set_endpoint(notificationEndpoint["interface"], notificationEndpoint["usage"], notificationEndpoint["usage_page"]);

	do{
		const data = device.read([0x00], Corsair.config.ReadLength, 0); // Read Key Event

		if(device.getLastReadSize() === 0){
			break;
		}

		ProcessInput(data);

	}while(device.getLastReadSize() > 0);

	device.set_endpoint(mainEndpoint["interface"], mainEndpoint["usage"], mainEndpoint["usage_page"]);
}

let macroSubdeviceID = 0;

//Possibly make a bragi notification struct?
function ProcessInput(InputData){
	// Notification
	if(InputData[2] === 1){

		const subdeviceId = InputData[1];
		const NotificationType = BinaryUtils.ReadInt16LittleEndian(InputData.slice(3, 5));
		const value = BinaryUtils.ReadInt32LittleEndian(InputData.slice(5, 9));

		switch(NotificationType){
		case Corsair.properties.batteryLevel:
			setDeviceBatteryLevel(subdeviceId, value);
			break;
		case Corsair.properties.batteryStatus:
			setDeviceBatteryState(subdeviceId, value);
			break;
		case Corsair.properties.micMuteStateModern:
			device.log(`Mic Mute status changed to ${Boolean(value)}`);
			break;

		case(Corsair.properties.subdeviceBitmask): {
			device.log(`Subdevice: [${subdeviceId}], Subdevice Notification. Value is [${value}]`);

			if(subdeviceId === 0) {
				addAndRemoveDevicesFromDongleNotifications(value);
				subdevicesEditedLastFrame = true;
			} //If it isn't subdevice 0 it isn't coming from the dongle.

			break;
		}

		default:
			device.log(`Subdevice: [${subdeviceId}], Unknown Notification: [${NotificationType}]. Value is [${value}]`);
		}
	}

	if(InputData[2] === 2){
		macroSubdeviceID = InputData[1]; //Doesn't persist through the macroInputArray, so I save to a global var.
		// I doubt we'll ever have over 32 bytes (256 Keys) of bit flags.
		macroInputArray.update(InputData.slice(3, 35));
	}

}

function processMacroInputs(bitIdx, state) {
	device.set_endpoint(mainEndpoint["interface"], mainEndpoint["usage"], mainEndpoint["usage_page"]);

	let buttonMapType;

	if(macroSubdeviceID === 0) {
		buttonMapType = wiredDevice?.buttonMap;
	} else {
		buttonMapType = BragiDongle?.children.get(macroSubdeviceID).buttonMap;
		//"fixed" the button map problem. It's not the cleanest solution but should get us where we need to go.
	}

	const keyName = CorsairLibrary.GetKeyMapping(bitIdx, buttonMapType);

	//device.log(`Key Pressed: ${bitIdx}`);

	processMacros(bitIdx, state, keyName);
}

function processMacros(bitIdx, state, keyName) {
	const eventData = {
		key : keyName,
		keyCode : 0,
		"released": !state,
	};

	if(keyName === "Mute Switch") {
		if(state) {

			const deviceConfig = wiredDevice || BragiDongle?.children.get(macroSubdeviceID);

			if(deviceConfig.supportsModernMute){
				const currentState = Boolean(Corsair.FetchProperty(Corsair.properties.micMuteStateModern, macroSubdeviceID));
				device.log(`Current Mic Mute State: ${currentState}, changing to ${!currentState}`);
				Corsair.SetProperty(Corsair.properties.micMuteStateModern, +!currentState, 1);
			}else if(deviceConfig.supportsLegacyMute){
				const currentState = Boolean(Corsair.FetchProperty(Corsair.properties.micMuteStateLegacy, macroSubdeviceID));
				device.log(`Current Mic Mute State: ${currentState}, changing to ${!currentState}`);
				Corsair.SetProperty(Corsair.properties.micMuteStateLegacy, +!currentState, 1);
			}

		}
	} else {
		//device.log(`Key ${keyName} is state ${state}`);
		keyboard.sendEvent(eventData, "Key Press");
	}
}

function addSinglePointChild(subdeviceID) {
	let devicePID = Corsair.FetchProperty(Corsair.properties.pid, subdeviceID);
	device.log(`Device PID: ${devicePID.toString(16)}`);

	let retries = 0;

	while(devicePID === -1 && retries < 5) {
		device.log("Resetting Dongle");
		Corsair.ResetDongle();
		devicePID = Corsair.FetchProperty(Corsair.properties.pid, subdeviceID);
		retries++;

		if(retries === 5) {
			device.log(`Subdevice ID ${subdeviceID} failed after 5 resets.`, {toFile : true});

			break; //break the loop. Don't init a bad device.
		}
	}

	const deviceConfig = CorsairLibrary.GetDeviceByProductId(devicePID);

	const connectedDevice = new CorsairBragiDevice(deviceConfig, subdeviceID);

	if(deviceConfig && deviceConfig.name) {
		DeviceDiscovery.foundVirtualDevice({
			type: deviceConfig.type || "headset",
			name: deviceConfig.name,
			supported: true,
			vendorId: 0x1b1c,
			productId: devicePID
		});
	}

	if(BragiDongle) {
		BragiDongle.addChildDevice(connectedDevice.subdeviceId, connectedDevice, false);
		device.setName(connectedDevice.name);
		device.setSize(connectedDevice.size);
		device.setControllableLeds(connectedDevice.ledNames, connectedDevice.ledPositions);
		device.setImageFromUrl(connectedDevice.image);
		initializeDevice(connectedDevice, connectedDevice.subdeviceId);
	} else {
		device.log(`Bragi Dongle is not defined! Throwing error`, {toFile : true});
	}
}

function addChildDevice(subdeviceID) {
	let devicePID = Corsair.FetchProperty(Corsair.properties.pid, subdeviceID);
	device.log(`Device PID: ${devicePID.toString(16)}`);

	let retries = 0;

	while(devicePID === -1 && retries < 5) {
		device.log("Resetting Dongle");
		Corsair.ResetDongle();
		devicePID = Corsair.FetchProperty(Corsair.properties.pid, subdeviceID);
		retries++;

		if(retries === 5) {
			device.log(`Subdevice ID ${subdeviceID} failed after 5 resets.`, {toFile : true});

			break; //break the loop. Don't init a bad device.
		}
	}

	const deviceConfig = CorsairLibrary.GetDeviceByProductId(devicePID);

	const connectedDevice = new CorsairBragiDevice(deviceConfig, subdeviceID);

	if(deviceConfig && deviceConfig.name) {
		DeviceDiscovery.foundVirtualDevice({
			type: "headphones",
			name: deviceConfig.name,
			supported: true,
			vendorId: 0x1b1c,
			productId: devicePID
		});
	}

	if(BragiDongle) {
		BragiDongle.addChildDevice(connectedDevice.subdeviceId, connectedDevice);
		initializeDevice(connectedDevice, connectedDevice.subdeviceId);
	} else {
		device.log(`Bragi Dongle is not defined! Throwing error`, {toFile : true});
	}

}

function addAndRemoveDevicesFromDongleNotifications(bitmask) {
	device.set_endpoint(mainEndpoint["interface"], mainEndpoint["usage"], mainEndpoint["usage_page"]);

	const ConnectedChildren = [];

	for(let i = 1; i < 8; i ++){
		const mask = 1 << i;

		if(bitmask & mask){
			ConnectedChildren.push(i);
		}
	}

	const mapChildren = Array.from(BragiDongle.children.keys());

	const childrenToAdd = ConnectedChildren.filter(x => !mapChildren.includes(x));
	const childrenToRemove = mapChildren.filter(x => !ConnectedChildren.includes(x));

	for(const child of childrenToRemove) {
		device.log(`Removing Child Device ${child}`);
		BragiDongle.removeChildDevice(child);
	}

	if(ConnectedChildren.length === 0) {
		device.setImageFromUrl("https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png");
	}

	for(const child of childrenToAdd) {
		device.log(`Adding Child Device ${child}`);

		if(mapChildren.length === 0 && !devFlags) { //All of this will be cleaned up when we deprecate and remove devflags.
			addSinglePointChild(child);
		} else if(devFlags) {
			addChildDevice(child);
		}
	}
}

function setDeviceBatteryLevel(subdeviceId, value) {
	if(wiredDevice) {
		wiredDevice.batteryPercentage = value / 10;

		return;
	}

	const subdevice = BragiDongle ? BragiDongle.children.get(subdeviceId) : undefined;

	if(!subdevice){
		console.log("Por que dongle?");

		return;
	}

	subdevice.batteryPercentage = value / 10;

	device.log(`Subdevice: [${subdeviceId}], Battery Level is [${value / 10}]`); //We'll need a handler to split these by subdeviceID. For now that isn't an issue per se.
	battery.setBatteryLevel(value / 10);
}

function setDeviceBatteryState(subdeviceId, value) {
	if(wiredDevice) {
		wiredDevice.batteryPercentage = value / 10;

		return;
	}

	const subdevice = BragiDongle ? BragiDongle.children.get(subdeviceId) : undefined;

	if(!subdevice){
		console.log("Por que dongle?");

		return;
	}

	subdevice.batteryPercentage = value / 10;

	device.log(`Subdevice: [${subdeviceId}], Battery Status is [${Corsair.chargingStates[value]}]`);
	battery.setBatteryState(Corsair.chargingStateDictionary[value]);
}

function PollDeviceMode(deviceID = 0){
	const PollInterval = 60000;

	if(Date.now() - PollDeviceMode.lastPollTime < PollInterval) {
		return;
	}

	//K100 Air Hates devices disconnecting from the dongle, and hates reconnecting to the dongle.
	// Either the dongle or the K100 Air falls into an errored state. It seems to be the dongle.
	//To fix the error, we reset the dongle, which makes the dongle d/c every device and it resends subdevice notifications.
	//We drop everything and pick it all back up when that happens.
	if(BragiDongle) {
		for(const [key, value] of BragiDongle.children) {
			if(!Corsair.SetMode("Software", key)) {
				Corsair.ResetDongle();
			}
		}
	}

	if(wiredDevice) {
		Corsair.SetMode("Software", deviceID);
	}

	PollDeviceMode.lastPollTime = Date.now();
}

function PollDeviceState(deviceID = 0){
	// Corsair Pings every 52 Seconds. This will keep the device in software mode.
	const PollInterval = 50000;

	if(Date.now() - PollDeviceState.lastPollTime < PollInterval) {
		return;
	}

	if(!Corsair.PingDevice(deviceID)){
		device.log(`Device Ping Failed!`);
	}

	PollDeviceState.lastPollTime = Date.now();
}

function UpdateRGB(childDevice, deviceID, overrideColor){
	const isLightingController = childDevice.isLightingController;

	const RGBData = getColors(childDevice, overrideColor, isLightingController);

	if(RGBData){
		Corsair.SendRGBData(RGBData, deviceID, isLightingController);
	}
}

function getColors(childDevice, overrideColor, isLightingController) {
	if(isLightingController) {
		return getLightingControllerColors(childDevice, overrideColor, devFlags);
	}

	return getStandardColors(childDevice, overrideColor, devFlags);
}

function getStandardColors(deviceConfig, overrideColor, subdevice = false){

	if(!deviceConfig){
		throw new Error(`Device config is undefined. Is this a supported device?`);
	}

	const RGBData = new Array((deviceConfig.ledSpacing ?? 3) * 3);

	for(let iIdx = 0; iIdx < deviceConfig.ledPositions.length; iIdx++) {
		const ledPosition = deviceConfig.ledPositions[iIdx];

		if(ledPosition === undefined){
			throw new Error(`Device Led Position [${iIdx}] is undefined!`);
		}

		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = subdevice ? device.subdeviceColor(deviceConfig.name, ledPosition[0], ledPosition[1]) : device.color(ledPosition[0], ledPosition[1]);
		}

		const ledIdx = deviceConfig.ledMap[iIdx];

		RGBData[ledIdx] = col[0];
		RGBData[ledIdx + deviceConfig.ledSpacing] = col[1];
		RGBData[ledIdx + deviceConfig.ledSpacing * 2] = col[2];
	}

	return RGBData;
}

function getLightingControllerColors(deviceConfig, overrideColor, subdevice = false) {
	if(!deviceConfig){
		throw new Error(`Device config is undefined. Is this a supported mouse?`);
	}

	const RGBData = new Array(deviceConfig.ledMap.length * 3);

	for(let iIdx = 0; iIdx < deviceConfig.ledPositions.length; iIdx++) {
		const ledPosition = deviceConfig.ledPositions[iIdx];

		if(ledPosition === undefined){
			throw new Error(`Device Led Position [${iIdx}] is undefined!`);
		}

		let col;

		if(overrideColor){
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		}else{
			col = subdevice ? device.subdeviceColor(deviceConfig.name, ledPosition[0], ledPosition[1]) : device.color(ledPosition[0], ledPosition[1]);
		}

		const ledIdx = deviceConfig.ledMap[iIdx];

		RGBData[ledIdx * 3] = col[0];
		RGBData[ledIdx * 3 + 1] = col[1];
		RGBData[ledIdx * 3 + 2] = col[2];
	}

	return RGBData;
}

/**
 * @typedef {{
 * name: string,
 * size: [number, number],
 * ledNames: string[],
 * ledPositions: LedPosition[],
 * ledMap: number[],
 * devFirmware: string
 * ledSpacing: number,
 * keyCount : number,
 * isLightingController : boolean
 * }} CorsairDeviceInfo
 *  */

class CorsairLibrary{
	static HasDeviceName(productId){
		return CorsairLibrary.DeviceList().hasOwnProperty(productId);
	}

	static HasDeviceProductId(productId){
		return CorsairLibrary.GetDeviceNameFromProductId(productId) !== undefined;
	}

	static GetDeviceNameFromProductId(productId){
		const deviceName = CorsairLibrary.ProductIDList()[productId];
		device.log(`Device Name: ${deviceName}`);

		return deviceName;
	}

	static GetDeviceByName(name){
		return CorsairLibrary.DeviceList()[name];
	}

	static GetDeviceByProductId(productId){
		const deviceName = CorsairLibrary.GetDeviceNameFromProductId(productId);

		return CorsairLibrary.GetDeviceByName(deviceName);
	}

	static GetKeyMapping(keyIdx, buttonMapType) {
		return CorsairLibrary.KeyMapping()[buttonMapType][keyIdx];
	};

	static GetMainEndpoint(productId) {
		return CorsairLibrary.MainEndpoint()[productId];
	}

	static GetNotificationEndpoint(productId) {
		return CorsairLibrary.NotificationEndpoint()[productId];
	}

	static ProductIDList(){
		return Object.freeze({
			0x2A00 : "Virtuoso Max",
			0x2A02 : "Virtuoso Max", // Dongle

			//0x0A43 : "Virtuoso RGB Wireless",
			//0x0A44 : "Virtuoso RGB Wireless", // Dongle

			0x2A08 : "Void Wireless V2", // Dongle
			0x2A09 : "Void Wireless V2",

			0x0A96 : "HS80 Max",
			0x0A97 : "HS80 Max", // Dongle
			0x2A0F : "HS80 Max", // Dongle

			//0x0A69 : "HS80 RGB",
			//0x0A6B : "HS80 RGB" // Dongle
		});
	}

	static KeyMapping(){
		return Object.freeze({
			"Virtuoso Max" : {
				0 : "Mute Switch",
				1 : "Custom Key",
			},
			"Void Wireless V2" : {
				0: "Button",
			},
			"HS80 Max" : {
				0: "Wheel press",
			},
			"Default" : {
				0 : "Mute Switch",
				1 : "Custom Key",
			},
		});
	}

	static MainEndpoint(){
		return Object.freeze({
			0x2A02 : { "interface": 4, "usage": 0x0001, "usage_page": 0xFF42, "collection": 0x0001 },
			0x2A08 : { "interface": 4, "usage": 0x0001, "usage_page": 0xFF42, "collection": 0x0001 },
			0x0A97 : { "interface": 4, "usage": 0x0001, "usage_page": 0xFF42, "collection": 0x0001 },
			0x2A0F : { "interface": 4, "usage": 0x0001, "usage_page": 0xFF42, "collection": 0x0001 },
			//0x0A44 : { "interface": 3, "usage": 0x0001, "usage_page": 0xFF42, "collection": 0x0004 },
			//0x0A6B : { "interface": 3, "usage": 0x0001, "usage_page": 0xFF42, "collection": 0x0004 },
		});
	}

	static NotificationEndpoint(){
		return Object.freeze({
			0x2A02 : { "interface": 4, "usage": 0x0002, "usage_page": 0xFF42, "collection": 0x0002 },
			0x2A08 : { "interface": 4, "usage": 0x0002, "usage_page": 0xFF42, "collection": 0x0002 },
			0x0A97 : { "interface": 4, "usage": 0x0002, "usage_page": 0xFF42, "collection": 0x0002 },
			0x2A0F : { "interface": 4, "usage": 0x0002, "usage_page": 0xFF42, "collection": 0x0002 },
			//0x0A44 : { "interface": 3, "usage": 0x0002, "usage_page": 0xFF42, "collection": 0x0005 },
			//0x0A6B : { "interface": 3, "usage": 0x0002, "usage_page": 0xFF42, "collection": 0x0005 },
		});
	}

	// Qt needs to add support for static properties...
	/** @return {Object<string, CorsairDeviceInfo>} */
	static DeviceList(){
		return Object.freeze({

			"Virtuoso Max": {
				name: "Virtuoso Max",
				size: [9, 3],
				ledNames: [
					"Left Top", "Left Front", "Left Back",
					"Right Top", "Right Front", "Right Back"
				],
				ledPositions: [
					[2, 0], [0, 2], [3, 2],
					[7, 0], [5, 2], [8, 2]
				],
				ledMap: [0, 1, 2, 3, 4, 5],
				buttonMap: "Virtuoso Max",
				devFirmware: "5.6.126",
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/virtuoso-xt.png"
			},

			"Virtuoso RGB Wireless": {
				name: "Virtuoso RGB Wireless",
				size: [3, 3],
				ledNames: ["Logo", "Power", "Mic"],
				ledPositions: [[1, 0], [0, 2], [2, 2]],
				ledMap:  [0, 1, 2],
				ledSpacing : 3,
				buttonMap: "Default",
				devFirmware: "5.9.130",
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/virtuoso-standard.png"
			},

			"Void Wireless V2": {
				name: "Void Wireless V2",
				size: [2, 2],
				ledNames: ["Top", "Bottom"],
				ledPositions: [[0, 0], [0, 1]],
				ledMap: [0, 1],
				buttonMap: "Void Wireless V2",
				devFirmware: "0.9.38",
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/void.png"
			},

			"HS80 Max": {
				name: "HS80 Max",
				size: [3, 3],
				ledNames: ["Logo", "Mic"],
				ledPositions: [[1, 0], [2, 2]],
				ledMap: [0, 1],
				ledSpacing : 3,
				buttonMap: "HS80 Max",
				devFirmware: "0.16.118",
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/hs80.png"
			},

			"HS80 RGB": {
				name: "HS80 RGB",
				size: [3, 3],
				ledNames: ["Logo", "Power", "Mic"],
				ledPositions: [[1, 0], [0, 2], [2, 2]],
				ledMap:  [0, 1, 2],
				ledSpacing : 3,
				buttonMap: "Default",
				devFirmware: "0.16.118",
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/hs80.png"
			},
		});
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

function getKeyByValue(object, value) {
	const Key = Object.keys(object).find(key => object[key] === value);

	return parseInt(Key || "");
}

class HexFormatter{
	/**
	 * @param {number} number
	 * @param {number} padding
	 */
	static toHex(number, padding){
		let hex = Number(number).toString(16);

		while (hex.length < padding) {
			hex = "0" + hex;
		}

		return "0x" + hex;
	}
	/**
	 * @param {number} number
	 */
	static toHex2(number){
		return this.toHex(number, 2);
	}
	/**
	 * @param {number} number
	 */
	static toHex4(number){
		return this.toHex(number, 4);
	}
}

class BinaryUtils{
	static WriteInt16LittleEndian(value){
		return [value & 0xFF, (value >> 8) & 0xFF];
	}
	static WriteInt16BigEndian(value){
		return this.WriteInt16LittleEndian(value).reverse();
	}
	static ReadInt16LittleEndian(array){
		return (array[0] & 0xFF) | (array[1] & 0xFF) << 8;
	}
	static ReadInt16BigEndian(array){
		return this.ReadInt16LittleEndian(array.slice(0, 2).reverse());
	}
	static ReadInt32LittleEndian(array){
		return (array[0] & 0xFF) | ((array[1] << 8) & 0xFF00) | ((array[2] << 16) & 0xFF0000) | ((array[3] << 24) & 0xFF000000);
	}
	static ReadInt32BigEndian(array){
		if(array.length < 4){
			array.push(...new Array(4 - array.length).fill(0));
		}

		return this.ReadInt32LittleEndian(array.slice(0, 4).reverse());
	}
	static WriteInt32LittleEndian(value){
		return [value & 0xFF, ((value >> 8) & 0xFF), ((value >> 16) & 0xFF), ((value >> 24) & 0xFF)];
	}
	static WriteInt32BigEndian(value){
		return this.WriteInt32LittleEndian(value).reverse();
	}
}

/**
 * @typedef Options
 * @type {Object}
 * @property {string=} developmentFirmwareVersion
 * @property {number=} LedChannelSpacing
 * @memberof ModernCorsairProtocol
 */
/**
 * @typedef {0 | 1 | 2 | "Lighting" | "Background" | "Auxiliary"} Handle
 * @memberof ModernCorsairProtocol
 */
/**
 * @class Corsair Bragi Protocol Class
 *
 * Major concepts are {@link ModernCorsairProtocol#properties|Properties} and {@link ModernCorsairProtocol#handles|Handles}/{@link ModernCorsairProtocol#endpoints|Endpoints}.
 *
 */

export class ModernCorsairProtocol{

	/** @constructs
	 * @param {Options} options - Options object containing device specific configuration values
	 */
	constructor(options = {}) {
		this.ConfiguredDeviceBuffer = false;

		/**
		 * @property {string} developmentFirmwareVersion - Used to track the firmware version the plugin was developed with to the one on a users device
		 * @property {number} LedChannelSpacing - Used to seperate color channels on non-lighting controller devices.
		 */
		this.config = {
			productId: 0,
			vendorId: 0,
			developmentFirmwareVersion: typeof options.developmentFirmwareVersion === "string" ? options.developmentFirmwareVersion : "Unknown",
			LedChannelSpacing: typeof options.LedChannelSpacing === "number" ? options.LedChannelSpacing : 0,
			WriteLength: 0,
			ReadLength: 0,

			/** @type {CorsairDeviceInfo | undefined} device */
			device: undefined
		};

		this.KeyCodes = [];
		this.KeyCount = 0;

		/**
		 * @readonly
		 * @static
		 * @enum {number}
		 * @property {0x01} setProperty - Used to set a {@link ModernCorsairProtocol#properties|Property} value on the device
		 * @property {0x02} getProperty - Used to fetch a {@link ModernCorsairProtocol#properties|Property} value from the device
		 * @property {0x05} closeHandle - Used to close a device {@link ModernCorsairProtocol#handles|Handle}
		 * @property {0x06} writeEndpoint - Used to write data to an opened device {@link ModernCorsairProtocol#endpoints|Endpoint}.
		 * @property {0x07} streamEndpoint - Used to stream data to an opened device {@link ModernCorsairProtocol#endpoints|Endpoint} if the data cannot fit within one packet
		 * @property {0x08} readEndpoint - Used to read data (i.e Fan Speeds) from a device {@link ModernCorsairProtocol#endpoints|Endpoint}
		 * @property {0x09} checkHandle - Used to check the status of a device {@link ModernCorsairProtocol#endpoints|Endpoint}. Returned data is currently unknown
		 * @property {0x0D} openEndpoint - Used to open an Endpoint on a device {@link ModernCorsairProtocol#handles|Handle}
		 * @property {0x12} pingDevice - Used to ping the device for it's current connection status
		 * @property {0x15} confirmChange - Used to apply led count changes to Commander Core [XT]
		 */
		this.command = Object.freeze({
			setProperty: 0x01,
			getProperty: 0x02,
			closeHandle: 0x05,
			writeEndpoint: 0x06,
			streamEndpoint: 0x07,
			readEndpoint: 0x08,
			checkHandle: 0x09,
			openEndpoint: 0x0D,
			pingDevice: 0x12,
			confirmChange: 0x15
		});
		/**
		 * @enum {number} Modes
		 * @property {0x01} Hardware Mode
		 * @property {0x02} Software Mode
		 */
		this.modes = Object.freeze({
			Hardware: 0x01,
			0x01: "Hardware",
			Software: 0x02,
			0x02: "Software",
		});

		/**
		 * Contains the PropertyId's of all known Properties.
		 * The device values these represent can be read and set using the following commands:
		 * <ul style="list-style: none;">
		 * <li>{@link ModernCorsairProtocol#FetchProperty|FetchProperty(PropertyId)}
		 * <li>{@link ModernCorsairProtocol#ReadProperty|ReadProperty(PropertyId)}
		 * <li>{@link ModernCorsairProtocol#SetProperty|SetProperty(PropertyId, Value)}
		 * <li>{@link ModernCorsairProtocol#CheckAndSetProperty|CheckAndSetProperty(PropertyId, Value)}
		 * </ul>
		 *
		 * Not all Properties are available on all devices and the above functions will throw various errors if they are unsupported, or given invalid values.
		 * Any properties with [READONLY] are constant can only be read from the device and not set by the user.
		 * Properties with [FLASH] are saved to the devices eeprom memory and will persist between power cycles.
		 *
		 * @readonly
		 * @enum {number} Properties
		 * @property {0x01} pollingRate Device's Hardware Polling rate
		 * @property {0x02} brightness Device's Hardware Brightness level in the range 0-1000 [FLASH]
		 * @property {0x03} mode Device Mode [Software/Hardware] PropertyId
		 * @property {0x07} angleSnap Angle Snapping PropertyId. Only used for mice. [FLASH]
		 * @property {0x0D} idleMode Device Idle Mode Toggle PropertyId. Only effects wireless devices.
		 * @property {0x0F} batteryLevel Device Battery Level PropertyID. Uses a 0-1000 Range. [READONLY]
		 * @property {0x10} batteryStatus Device Charging State PropertyID. [READONLY]
		 * @property {0x11} vid Device VendorID PropertyID. [READONLY]
		 * @property {0x12} pid Device ProductID PropertyID. [READONLY]
		 * @property {0x13} firmware Device Firmware PropertyID. [READONLY]
		 * @property {0x14} BootLoaderFirmware Device BootLoader Firmware PropertyID. [READONLY]
		 * @property {0x15} WirelessChipFirmware Device Wireless Chip Firmware PropertyID. [READONLY]
		 * @property {0x1E} dpiProfile Device Current DPI Profile Index PropertyID. Dark Core Pro SE uses a 0-3 Range.
		 * @property {0x1F} dpiMask
		 * @property {0x20} dpi Device's Current DPI Value PropertyID
		 * @property {0x21} dpiX Device's Current X DPI PropertyID
		 * @property {0x22} dpiY Device's Current Y DPI PropertyID.
		 * @property {0x37} idleModeTimeout Device's Idle Timeout PropertyId. Value is in Milliseconds and has a max of 99 Minutes.
		 * @property {0x41} layout Device's Physical Layout PropertyId. Only applies to Keyboards.
		 * @property {0x44} BrightnessLevel Coarse (0-3) Brightness. Effectively sets brightness in 33.33% increments.
		 * @property {0x45} WinLockState Device's WinKey Lock Status. Only applies to Keyboards.
		 * @property {0x46} micMuteStateLegacy Legacy Device Microphone State
		 * @property {0x4A} LockedShortcuts Device's WinKey Lock Bit flag. Governs what key combinations are disabled by the devices Lock mode. Only Applies to Keyboards.
		 * @property {0x96} maxPollingRate Device's Max Polling Rate PropertyId. Not supported on all devices.
		 * @property {0xB0} ButtonResponseOptimization
		 * @property {0xA6} micMuteStateModern Modern Device Microphone State
		 */

		this.properties =  Object.freeze({ //55 and 5A both return their subdevices on the Link Hub. Not sure on other Bragi Proper devices. ICUE Logs note temp sensors and cooling sensors
			pollingRate: 0x01,
			brightness: 0x02,
			mode: 0x03,
			angleSnap: 0x07,
			idleMode: 0x0d,
			idleModeTimeoutLegacy: 0x0E,
			batteryLevel: 0x0F,
			batteryStatus: 0x10,
			vid: 0x11,
			pid: 0x12,
			firmware:0x13,
			BootLoaderFirmware: 0x14,
			WirelessChipFirmware: 0x15,
			dpiProfile: 0x1E,
			dpiMask: 0x1F,
			dpi : 0x20,
			dpiX: 0x21,
			dpiY: 0x22,
			subdeviceBitmask: 0x36,
			idleModeTimeout: 0x37,
			layout: 0x41,
			BrightnessLevel: 0x44,
			WinLockState: 0x45,
			micMuteStateLegacy: 0x46,
			LockedShortcuts: 0x4A,
			maxPollingRate: 0x96,
			ButtonResponseOptimization: 0xB0,
			micMuteStateModern: 0xA6,
			sidetoneLevel: 0x47
		});

		this.propertyNames = Object.freeze({
			0x01: "Polling Rate",
			0x02: "HW Brightness",
			0x03: "Mode",
			0x07: "Angle Snapping",
			0x0d: "Idle Mode",
			0x0E: "Idle Mode Timeout legacy",
			0x0F: "Battery Level",
			0x10: "Battery Status",
			0x11: "Vendor Id",
			0x12: "Product Id",
			0x13: "Firmware Version",
			0x14: "Bootloader Firmware Version",
			0x15: "Wireless Firmware Version",
			0x16: "Wireless Bootloader Version",
			0x1E: "DPI Profile",
			0x1F: "DPI Mask",
			0x20: "DPI",
			0x21: "DPI X",
			0x22: "DPI Y",
			0x2F: "DPI 0 Color",
			0x30: "DPI 1 Color",
			0x31: "DPI 2 Color",
			0x36: "Wireless Subdevices",
			0x37: "Idle Mode Timeout",
			0x41: "HW Layout",
			0x44: "Brightness Level",
			0x45: "WinLock Enabled",
			0x46: "Mic Mute state legacy",
			0x47: "Sidetone Level",
			0x4a: "WinLock Disabled Shortcuts",
			//0x4B: "???",
			//0x55: "???",
			//0x5A: "???",
			0x5f: "MultipointConnectionSupport",
			//0x66: "???",
			//0x67: "???",
			//0x68: "???",
			//0x78: "???",
			0x96: "Max Polling Rate",
			0xA6: "Mic Mute state modern",
		});

		/**
		 * Contains the EndpointId's of all known Endpoints. These handle advanced device functions like Lighting and Fan Control.
		 * To manually interact with these you must open a Handle to the Endpoint first using {@link ModernCorsairProtocol#OpenHandle|OpenHandle(HandleId, EndpointId)}.
		 *
		 * Helper Functions to interact with these exist as the following:
		 * <ul style="list-style: none;">
		 * <li> {@link ModernCorsairProtocol#WriteToEndpoint|WriteEndpoint(HandleId, EndpointId, CommandId)}
		 * <li> {@link ModernCorsairProtocol#ReadFromEndpoint|ReadEndpoint(HandleId, EndpointId, CommandId)}
		 * <li> {@link ModernCorsairProtocol#CloseHandle|CloseHandle(HandleId)}
		 * <li> {@link ModernCorsairProtocol#CheckHandle|CheckHandle(HandleId)}
		 * </ul>
		 *
		 * @enum {number} Endpoints
		 * @property {0x01} Lighting
		 * @property {0x02} Buttons
		 * @property {0x05} PairingID
		 * @property {0x17} FanRPM
		 * @property {0x18} FanSpeeds
		 * @property {0x1A} FanStates
		 * @property {0x1D} LedCount_3Pin
		 * @property {0x1E} LedCount_4Pin
		 * @property {0x21} TemperatureDa1ta
		 * @property {0x22} LightingController
		 * @property {0x27} ErrorLog
		 */
		this.endpoints = Object.freeze({
			Lighting: 0x01,
			Buttons: 0x02,
			PairingID: 0x05,
			FanRPM: 0x17,
			FanSpeeds: 0x18,
			FanStates: 0x1A,
			LedCount_3Pin: 0x1D,
			LedCount_4Pin: 0x1E,
			TemperatureData: 0x21,
			LightingController: 0x22,
			ErrorLog: 0x27,
		});

		this.endpointNames = Object.freeze({
			0x01: "Lighting",
			0x02: "Buttons",
			0x10: "Lighting Monochrome",
			0x17: "Fan RPM",
			0x18: "Fan Speeds",
			0x1A: "Fan States",
			0x1D: "3Pin Led Count",
			0x1E: "4Pin Led Count",
			0x21: "Temperature Probes",
			0x22: "Lighting Controller",
			0x27: "Error Log"
		});

		this.chargingStates = Object.freeze({
			1: "Charging",
			2: "Discharging",
			3: "Fully Charged",
		});

		this.chargingStateDictionary = Object.freeze({
			1 : 2,
			2 : 1,
			3 : 4
		});

		this.dataTypes = Object.freeze({
			FanRPM: 0x06,
			FanDuty: 0x07,
			FanStates: 0x09,
			TemperatureProbes: 0x10,
			LedCount3Pin: 0x0C,
			FanTypes: 0x0D,
			LedConfig: 0x0F,
			LightingController: 0x12
		});

		/**
		 * Contains the HandleId's of usable device Handles. These are used to open internal device {@link ModernCorsairProtocol#endpoints|Endpoint} foradvanced functions like Lighting and Fan Control.
		 * Each Handle can only be open for one {@link ModernCorsairProtocol#endpoints|Endpoint} at a time, and must be closed before the {@link ModernCorsairProtocol#endpoints|Endpoint} can be changed.
		 * For best practice all non-lighting Handles should be closed immediately after you are done interacting with it.
		 *
		 * Auxiliary (0x02) Should only be needed in very specific cases.
		 *
		 * Helper Functions to interact with these exist as the following:
		 * <ul style="list-style: none;">
		 * <li> {@link ModernCorsairProtocol#WriteToEndpoint|WriteEndpoint(HandleId, EndpointId, CommandId)}
		 * <li> {@link ModernCorsairProtocol#ReadFromEndpoint|ReadEndpoint(HandleId, EndpointId, CommandId)}
		 * <li> {@link ModernCorsairProtocol#CloseHandle|CloseHandle(HandleId)}
		 * <li> {@link ModernCorsairProtocol#CheckHandle|CheckHandle(HandleId)}
		 * </ul>
		 */
		this.handles = Object.freeze({
			Lighting: 0x00,
			Background: 0x01,
			Auxiliary: 0x02,
		});

		this.handleNames = Object.freeze({
			0x00: "Lighting",
			0x01: "Background",
			0x02: "Auxiliary"
		});

		this.fanTypes = Object.freeze({
			QL: 0x06,
			SpPro: 0x05
		});

		this.pollingRates = Object.freeze({
			1: "125hz",
			2: "250hz",
			3: "500hz",
			4: "1000hz",
			5: "2000hz",
			6: "4000hz",
			7: "8000hz"
		});

		this.pollingRateNames = Object.freeze({
			"125hz": 1,
			"250hz": 2,
			"500hz": 3,
			"1000hz": 4,
			"2000hz": 5,
			"4000hz" : 6,
			"8000hz" : 7
		});

		this.keyStates = Object.freeze({
			Disabled: 0,
			0: "Disabled",
			Enabled: 1,
			1: "Enabled",
		});
	}

	GetNameOfHandle(Handle){
		if(this.handleNames.hasOwnProperty(Handle)){
			return this.handleNames[Handle];
		}

		return "Unknown Handle";
	}
	GetNameOfProperty(Property){
		if(this.propertyNames.hasOwnProperty(Property)){
			return this.propertyNames[Property];
		}

		return "Unknown Property";
	}
	GetNameOfEndpoint(Endpoint){
		if(this.endpointNames.hasOwnProperty(Endpoint)){
			return this.endpointNames[Endpoint];
		}

		return "Unknown Endpoint";
	}
	/** Logging wrapper to prepend the proper context to anything logged within this class. */
	log(Message){
		//device.log(`CorsairProtocol:` + Message);
		device.log(Message);
	}
	/**
	 * This Function sends a device Ping request and returns if the ping was successful.
	 *
	 * This function doesn't seem to affect the devices functionality, but iCUE pings all BRAGI devices every 52 seconds.
	 * @returns {boolean} - Boolean representing Ping Success
	 */
	PingDevice(deviceID = 0){
		const packet = [0x02, deviceID | 0x08, this.command.pingDevice];
		device.write(packet, this.GetWriteLength());

		const returnPacket = device.read(packet, this.GetReadLength());

		if(returnPacket[2] !== 0x12){
			return false;
		}

		return true;
	}

	SetKeyStates(Enabled, keyCount, deviceID = 0){
		this.KeyCodes = [];

		// Assuming a continuous list of key id's
		for(let iIdx = 0; iIdx < keyCount; iIdx++){
			this.KeyCodes.push(Enabled);
		}

		this.WriteToEndpoint("Background", this.endpoints.Buttons, this.KeyCodes, deviceID);
	}

	SetSingleKey(KeyID, Enabled, deviceID = 0){
		this.KeyCodes[KeyID - 1] = Enabled;

		this.WriteToEndpoint("Background", this.endpoints.Buttons, this.KeyCodes, deviceID);
	}

	GetWriteLength(){
		if(!this.ConfiguredDeviceBuffer){
			this.FindBufferLengths();
		}

		return this.config.WriteLength;
	}

	GetReadLength(){
		if(!this.ConfiguredDeviceBuffer){
			this.FindBufferLengths();
		}

		return this.config.ReadLength;
	}

	/**
	 * Finds and sets the device's buffer lengths for internal use within the class.
	 * This should be the first function called when using this Protocol class as all other interactions with the device rely on the buffer size being set properly.
	 *
	 * This is automatically called on the first write/read operation.
	 */
	FindBufferLengths(){

		if(this.ConfiguredDeviceBuffer){
			return;
		}

		const HidInfo = device.getHidInfo();


		this.log(`Setting up device Buffer Lengths...`);

		if(HidInfo.writeLength !== 0){
			this.config.WriteLength = HidInfo.writeLength;
			this.log(`Write length set to ${this.config.WriteLength}`);
		}


		if(HidInfo.readLength !== 0){
			this.config.ReadLength = HidInfo.readLength;
			this.log(`Read length set to ${this.config.ReadLength}`);
		}

		this.ConfiguredDeviceBuffer = true;

	}

	FetchDeviceInformation(deviceID = 0){
		const vendorId = this.FetchProperty(this.properties.vid, deviceID);
		device.log(`Vid: [${HexFormatter.toHex4(vendorId)}]`);
		this.config.vendorId = vendorId;

		const productId = this.FetchProperty(this.properties.pid, deviceID);
		device.log(`Pid: [${HexFormatter.toHex4(productId)}]`);
		this.config.productId = productId;

		//device.log(`Idle Mode is [${this.FetchProperty("Idle Mode") ? "Enabled" : "Disabled"}]`);
		//device.log(`Idle Timeout is [${this.FetchProperty("Idle Mode Timeout") / 60 / 1000} Minutes]`);

		this.FetchFirmware(deviceID);
	}

	FindLightingEndpoint(deviceID = 0){
		let SupportedLightingEndpoint = -1;

		if(this.IsEndpointSupported(this.endpoints.Lighting, deviceID)){
			SupportedLightingEndpoint = this.endpoints.Lighting;
		}else if(this.IsEndpointSupported(this.endpoints.LightingController, deviceID)){
			SupportedLightingEndpoint = this.endpoints.LightingController;
		}

		device.log(`Supported Lighting Style: [${this.GetNameOfEndpoint(SupportedLightingEndpoint)}]`);

		return SupportedLightingEndpoint;
	}

	IsPropertySupported(PropertyId, deviceID = 0){
		return this.FetchProperty(PropertyId, deviceID) !== -1;
	}

	DumpAllSupportedProperties(deviceID = 0){
		const SupportedProperties = [];
		const MAX_PROPERTY_ID = 0x64;
		device.log(`Checking for properties supported by this device...`);

		for(let i = 0; i < MAX_PROPERTY_ID; i++){
			if(this.IsPropertySupported(i, deviceID)){
				SupportedProperties.push(i);
			}
		}

		for(const property of SupportedProperties){
			device.log(`Supports Property: [${HexFormatter.toHex2(property)}], ${this.GetNameOfProperty(property)}`, {toFile: true});
		}

		return SupportedProperties;

	}

	IsEndpointSupported(Endpoint, deviceID = 0){

		this.CloseHandleIfOpen("Background", deviceID);

		const isHandleSupported = this.OpenHandle("Background", Endpoint, deviceID) === 0;

		// Clean up after if the handle is now open.
		if(isHandleSupported){
			this.CloseHandle("Background", deviceID);
		}

		return isHandleSupported;
	}

	DumpAllSupportedEndpoints(deviceID = 0){
		const SupportedEndpoints = [];
		const MAX_HANDLE_ID = 0x80;
		device.log(`Checking for Endpoints supported by this device...`);

		for(let i = 0; i < MAX_HANDLE_ID; i++){
			if(this.IsEndpointSupported(i, deviceID)){
				SupportedEndpoints.push(i);
			}
		}

		for(const endpoint of SupportedEndpoints){
			device.log(`Supports Endpoint: [${HexFormatter.toHex2(endpoint)}], ${this.GetNameOfEndpoint(endpoint)}`, {toFile: true});
		}

		return SupportedEndpoints;
	}
	/** Fetch if a device supports Battery Reporting. */
	FetchBatterySupport(deviceID = 0) {
		return this.IsPropertySupported(this.properties.batteryLevel, deviceID);
	}
	/** Fetch if a device supports the Lighting Controller RGB Style. */
	FetchLightingControllerSupport(deviceID = 0) {
		return this.IsEndpointSupported(this.endpoints.LightingController, deviceID);
	}
	/** Fetch if a device supports Modern Mute Control. */
	FetchModernMuteSupport(deviceID = 0) {
		return this.IsPropertySupported(this.properties.micMuteStateModern, deviceID);
	}
	/** Fetch if a device supports Legacy Mute Control. */
	FetchLegacyMuteSupport(deviceID = 0) {
		return this.IsPropertySupported(this.properties.micMuteStateLegacy, deviceID);
	}
	/** Fetch if a device supports Sidetone Control. */
	FetchSidetoneSupport(deviceID = 0) {
		return this.IsPropertySupported(this.properties.sidetoneLevel, deviceID);
	}
	/** Fixes the K100 Air/respective Dongle not responding. */
	ResetDongle() {
		Corsair.SetProperty(23, 0);
		//Literally magic. Do not question this flag.
		//It comes right after App,BLD,Radio_App, and Radio_BLD version.
		//I'm guessing it's a reset flag.
		device.pause(1000);
		Corsair.SetMode("Hardware");
		Corsair.SetMode("Software");
		device.pause(1000);
	}
	/**
	 * Helper function to read and properly format the device's firmware version.
	 */
	FetchFirmware(deviceID){
		const data = this.ReadProperty(this.properties.firmware, deviceID);

		if(this.CheckError(data, "FetchFirmware")){
			return "Unknown";
		}

		const firmwareString = `${data[4]}.${data[5]}.${data[6]}`;
		device.log(`Firmware Version: [${firmwareString}]`, {toFile: true});

		if(this.config.developmentFirmwareVersion !== "Unknown"){
			device.log(`Developed on Firmware [${this.config.developmentFirmwareVersion}]`, {toFile: true});
		}

		return firmwareString;
	}

	/**
	 * Helper function to grab the devices battery level and charge state. Battery Level is on a scale of 0-1000.
	 * @returns [number, number] An array containing [Battery Level, Charging State]
	 */
	FetchBatteryStatus(deviceID){
		const BatteryLevel = this.FetchProperty(this.properties.batteryLevel, deviceID);
		const ChargingState = this.FetchProperty(this.properties.batteryStatus, deviceID);

		return [BatteryLevel, ChargingState];
	}
	/**
	 *
	 * @param {number[]} Data - Data packet read from the device.
	 * @param {string} Context - String representing the calling location.
	 * @returns {number} An Error Code if the Data packet contained an error, otherwise 0.
	 */
	CheckError(Data, Context){ //TODO: Rewrite this to add proper handling and dealing with errors in the case of the endpoint not being open.
		const hasError = Data[3] ?? 0;

		if(!hasError){
			return hasError; //Error 2 on setting the HWBrightness on the Dark Core Pro. The return packets for this device seem flipped around with HWBrightness. It sends an odd packet first, and then the expected one.
		}

		const caller_line = (new Error).stack.split("\n")[2];
		const caller_function = caller_line.slice(0, caller_line.indexOf("@"));
		const line_number = caller_line.slice(caller_line.lastIndexOf(":")+1);
		const caller_context = `${caller_function}():${line_number}`;

		switch(Data[3]){
		case 1: // Invalid Value
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Invalid Value Set!`);
			break;
		case 2: // K70 Pro Mini returned this when I gave it RGBData that is too long.
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Packet Exceeds length!`);
			break;

		case 3: // Endpoint Error - Usually indicates an unsupported function
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Operation Failed!`);
			break;

		case 5: // Property Not Supported
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Property is not supported on this device!`);
			break;

		case 6: //Handle not open?
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Handle is not open!`);
			break;

		case 9: // Read only property
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Property is read only!`);
			break;
		case 13:
		case 55:
			// Value still gets set properly?
			//device.log(`${caller_context} CorsairProtocol Unknown Error Code [${hasError}]: ${Context}. This may not be an error.`);
			return 0;
		default:
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: ${Context}`);
		}


		return hasError;
	}
	/**
	 * Helper Function to Read a Property from the device, Check its value, and Set it on the device if they don't match.
	 * 	@param {number|string} PropertyId Property Index to be checked and set on the device. This value can either be the {@link ModernCorsairProtocol#properties|PropertyId}, or the readable string version of it.
	 * 	@param {number} Value The Value to be checked against and set if the device's value doesn't match.
	 *  @return {boolean} a Boolean on if the Property value on the device did match, or now matches the value desired.
	 */
	CheckAndSetProperty(PropertyId, Value, deviceID = 0){
		if(typeof PropertyId === "string"){
			PropertyId = getKeyByValue(this.propertyNames, PropertyId);
		}

		const CurrentValue = this.FetchProperty(PropertyId, deviceID);

		if(CurrentValue === Value){
			return true;
		}

		device.log(`Device ${this.GetNameOfProperty(PropertyId)} is currently [${CurrentValue}]. Desired Value is [${Value}]. Setting Property!`);

		this.SetProperty(PropertyId, Value);
		device.read([0x00], this.GetReadLength(), 5); // TODO: Check if this is needed?

		const NewValue = this.FetchProperty(PropertyId, deviceID);
		device.log(`Device ${this.propertyNames[PropertyId]} is now [${NewValue}]`);

		return NewValue === Value;
	}

	/**
	 * Reads a property from the device and returns the joined value after combining any high/low bytes. This function can return a null value if it's unable to read the property; i.e. it's unavailable on this device.
	 * @param {number | string } PropertyId Property Index to be read from the device. This value can either be the {@link ModernCorsairProtocol#properties|PropertyId}, or the readable string version of it.
	 * @returns The joined value, or undefined if the device fetch failed.
	 */
	FetchProperty(PropertyId, deviceID = 0) {
		if(typeof PropertyId === "string"){
			PropertyId = getKeyByValue(this.propertyNames, PropertyId);
		}

		const data = this.ReadProperty(PropertyId, deviceID);

		// Don't return error codes.
		if(data.length === 0){
			return -1;
		}

		return BinaryUtils.ReadInt32LittleEndian(data.slice(4, 7));
	}

	/**
	 * Attempts to sets a property on the device and returns if the operation was a success.
	 * @param {number|string} PropertyId Property Index to be written to on the device. This value can either be the {@link ModernCorsairProtocol#properties|PropertyId}, or the readable string version of it.
	 * @param {number|Array} Value The Value to be set.
	 * @returns 0 on success, otherwise an error code from the device.
	 */
	SetProperty(PropertyId, Value, deviceID = 0) {
		let packet = [];

		if(typeof PropertyId === "string"){
			PropertyId = getKeyByValue(this.propertyNames, PropertyId);
		}

		if(typeof Value === "object"){
			packet = [0x02, deviceID | 0x08, this.command.setProperty, PropertyId, 0x00, ...Value];
		}else{
			packet = [0x02, deviceID | 0x08, this.command.setProperty, PropertyId, 0x00, (Value & 0xFF), (Value >> 8 & 0xFF), (Value >> 16 & 0xFF)];
		}

		device.clearReadBuffer(); //I added this, it shouldn't technically be necessary as we're really only checking if it worked.
		device.pause(10);
		device.write(packet, this.GetWriteLength());

		const returnPacket = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `SetProperty`);

		if(ErrorCode === 1){
			device.log(`Failed to set Property [${this.propertyNames[PropertyId]}, ${HexFormatter.toHex2(PropertyId)}]. [${Value}] is an Invalid Value`);

			return ErrorCode;
		}

		if(ErrorCode === 3){
			device.log(`Failed to set Property [${this.propertyNames[PropertyId]}, ${HexFormatter.toHex2(PropertyId)}]. Are you sure it's supported?`);

			return ErrorCode;
		}

		if(ErrorCode === 9){
			device.log(`Failed to set Property [${this.propertyNames[PropertyId]}, ${HexFormatter.toHex2(PropertyId)}]. The device says this is a read only property!`);

			return ErrorCode;
		}

		return 0;
	}

	/**
	 * Reads a property from the device and returns the raw packet.
	 * @param {number} PropertyId Property Index to be read from the device.  This value can either be the {@link ModernCorsairProtocol#properties|PropertyId}, or the readable string version of it.
	 * @returns The packet data read from the device.
	 */
	ReadProperty(PropertyId, deviceID = 0) {

		const packet = [0x02, deviceID | 0x08, this.command.getProperty, ...BinaryUtils.WriteInt16LittleEndian(PropertyId)];
		device.clearReadBuffer();
		device.pause(10);
		device.write(packet, this.GetWriteLength());
		device.pause(10);

		const returnPacket = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `ReadProperty`);

		if(ErrorCode){
			device.log(`Failed to read Property [${this.GetNameOfProperty(PropertyId)}, ${HexFormatter.toHex2(PropertyId)}]. Are you sure it's supported?`);

			return [];
		}

		return returnPacket;
	}
	/**
	 * Opens a Endpoint on the device. Only one Endpoint can be open on a Handle at a time so if the handle is already open this function will fail.
	 * @param {Handle} Handle The Handle to open the Endpoint on. Default is 0.
	 * @param {number} Endpoint Endpoint Address to be opened.
	 * @returns 0 on success, otherwise an error code from the device.
	 */
	OpenHandle(Handle, Endpoint, deviceID = 0) {
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}

		const packet = [0x02, deviceID | 0x08, this.command.openEndpoint, Handle, Endpoint];
		device.clearReadBuffer();
		device.pause(10);
		device.write(packet, this.GetWriteLength());
		device.pause(10);

		const returnPacket = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `OpenHandle`);

		if(ErrorCode){
			device.log(`Failed to open Endpoint [${this.GetNameOfEndpoint(Endpoint)}, ${HexFormatter.toHex2(Endpoint)}] on Handle [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}]. Are you sure it's supported and wasn't already open?`);
		}

		return ErrorCode;
	}
	/**
	 * Closes a Handle on the device.
	 * @param {Handle} Handle The HandleId to Close.
	 * @returns 0 on success, otherwise an error code from the device.
	 */
	CloseHandle(Handle, deviceID = 0) {
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}

		const packet = [0x02, deviceID | 0x08, this.command.closeHandle, 1, Handle];
		device.clearReadBuffer();
		device.pause(10);
		device.write(packet, this.GetWriteLength());
		device.pause(10);

		const returnPacket = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `CloseHandle`);

		if(ErrorCode){
			device.log(`Failed to close Handle [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}]. was it even open?`);
		}

		return ErrorCode;
	}
	/**
	 * Helper function to Check the Handle is currently open and closes it if it is.
	 * @param {Handle} Handle - HandleId to perform the check on.
	 */
	CloseHandleIfOpen(Handle, deviceID = 0){
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}

		if(this.IsHandleOpen(Handle)){
			device.log(`${this.GetNameOfHandle(Handle)} Handle is open. Closing...`);
			this.CloseHandle(Handle, deviceID);
		}
	}

	/**
	 * Performs a Check Command on the HandleId given and returns whether the handle is open.
	 * @param {Handle} Handle - HandleId to perform the check on.
	 * @returns {Boolean} Boolean representing if the Handle is already open.
	 */
	IsHandleOpen(Handle, deviceID = 0){
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}

		device.clearReadBuffer();

		const packet = [0x02, deviceID | 0x08, this.command.checkHandle, Handle, 0x00];
		device.pause(1);
		device.write(packet, this.GetWriteLength());
		device.pause(1);

		const returnPacket = device.read(packet, this.GetReadLength());
		const isOpen = returnPacket[3] !== 3;

		return isOpen;
	}

	/**
	 * Performs a Check Command on the HandleId given and returns the packet from the device.
	 * This function will return an Error Code if the Handle is not open.
	 * The Format of the returned packet is currently not understood.
	 * @param {Handle} Handle - HandleId to perform the check on.
	 * @returns The packet read from the device on success. Otherwise and Error Code.
	 * @Deprecated IsHandleOpen should be used in place of this function.
	 */
	CheckHandle(Handle, deviceID = 0){
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}
		const packet = [0x02, deviceID | 0x08, this.command.checkHandle, Handle, 0x00];
		device.clearReadBuffer();
		device.pause(10);
		device.write(packet, this.GetWriteLength());
		device.pause(10);

		const returnPacket = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `CheckHandle`);

		if(ErrorCode){ //TODO: Add the checker here as well to note if the handle is closed.
			this.CloseHandle(Handle);
			device.log(`Failed to check Handle [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle,)}]. Did you open it?`);

			return ErrorCode;
		}

		return returnPacket;
	}
	/**
	 * This Helper Function will Open, Read, and Close a device Handle for the Endpoint given.
	 * If the read packet does not contain the ResponseId given the packet will be reread up to 4 times before giving up and returning the last packet read.
	 * If the Handle given is currently open this function will close it and then re-attempt opening it.
	 * @param {Handle} Handle - Handle to be used.
	 * @param {number} Endpoint - Endpoint to be read from
	 * @returns The entire packet read from the device.
	 */
	// * @param {number} Command - CommandId that is contained in the return packet to verify the correct packet was read from the device.
	ReadFromEndpoint(Handle, Endpoint, deviceID = 0) {
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}

		if(this.IsHandleOpen(Handle, deviceID)){
			device.log(`CorsairProtocol: Handle is already open: [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}]. Attemping to close...`);
			this.CloseHandle(Handle, deviceID);
		}

		const ErrorCode = this.OpenHandle(Handle, Endpoint, deviceID);

		if(ErrorCode){
			this.CloseHandle(Handle);
			device.log(`CorsairProtocol: Failed to open Device Handle [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}]. Aborting ReadEndpoint operation.`);

			return [];
		}

		device.clearReadBuffer();
		device.pause(1);
		device.write([0x02, deviceID | 0x08, this.command.readEndpoint, Handle], this.GetWriteLength());
		device.pause(1);

		//let Data = [];
		const Data = device.read([0x00], this.GetReadLength());

		//const RetryCount = 4;

		// do {
		// 	RetryCount--;
		// 	device.write([0x00, this.ConnectionType, this.command.readEndpoint, Handle], this.GetWriteLength());
		// 	Data = device.read(Data, this.GetReadLength());

		// 	if(this.dataTypes[Data[4]] !== this.dataTypes[Command]) {
		// 		device.log(`Invalid Command Read: Got [${this.dataTypes[Data[2]]}][${Data[4]}], Wanted [${this.dataTypes[Command]}][${Command}]`);
		// 	}

		// } while(this.dataTypes[Data[4]] !== this.dataTypes[Command] && RetryCount > 0);

		this.CloseHandle(Handle, deviceID);

		return Data;
	}
	/**
	 * This Helper Function will Open, Write to, and Close a device Handle for the Endpoint given.
	 *
	 * This function will handle setting the header data expected by the device. If the Data Array Length provided doesn't match what the device's endpoint is expecting the operation will Error.
	 *
	 * If the Handle given is currently open this function will close it and then re-attempt opening it.
	 * @param {Handle} Handle - HandleId to be used.
	 * @param {number} Endpoint - EndpointId to be written too.
	 * @param {number[]} Data - Data to be written to the Endpoint.
	 * @returns {number} 0 on success, otherwise an error code value.
	 */
	WriteToEndpoint(Handle, Endpoint, Data, deviceID = 0) {
		if(typeof Handle === "string"){
			Handle = this.handles[Handle];
		}

		if(this.IsHandleOpen(Handle)){
			device.log(`CorsairProtocol: Handle is already open: [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}]. Attemping to close...`);

			this.CloseHandle(Handle);
		}

		let ErrorCode = this.OpenHandle(Handle, Endpoint, deviceID);

		if(ErrorCode){
			device.log(`CorsairProtocol: Failed to open Device Handle [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}]. Aborting WriteEndpoint operation.`);

			return ErrorCode;
		}

		device.clearReadBuffer();
		device.pause(1);
		device.write([0x02, deviceID | 0x08, this.command.writeEndpoint, Handle, ...BinaryUtils.WriteInt32LittleEndian(Data.length)].concat(Data), this.GetWriteLength());

		const returnPacket = device.read([0x00], this.GetReadLength());

		ErrorCode = this.CheckError(returnPacket, `WriteEndpoint`);

		if(ErrorCode){
			device.log(`Failed to Write to Handle [${this.GetNameOfHandle(Handle)}, ${HexFormatter.toHex2(Handle)}].`);
		}

		this.CloseHandle(Handle, deviceID);

		return ErrorCode;
	}
	/**
	 * This Helper Function to write RGB data to the device.
	 * This function will split the data into as many packets as needed
	 * and do multiple WriteEndpoints(Handle, Endpoint, Data) based on the DeviceBufferSize set.
	 *
	 * This function expects the Lighting HandleId (0x00) to already be open.
	 *
	 * This function will handle setting the header data expected by the device.
	 * If the RGBData Array Length provided doesn't match what the devices Lighting Endpoint expects this command will Error.
	 *
	 * @param {number[]} RGBData
	 * - RGBData to be written to the device in a RRRGGGBBB(Lighting Endpoint 0x01) or RGBRGBRGB(LightingController Endpoint 0x22) format.
	 */
	SendRGBData(RGBData, deviceID, isLightingController = false){
		const InitialHeaderSize = 8;
		const HeaderSize = 4;

		const lightingHandle = 0x00;

		// All packets sent to the LightingController Endpoint have these 2 values added before any other data.
		if(isLightingController){
			RGBData.splice(0, 0, ...[this.dataTypes.LightingController, 0x00]);
		}

		const isLightingEndpointOpen = this.IsHandleOpen(lightingHandle, deviceID);

		if(!isLightingEndpointOpen){
			this.OpenHandle(lightingHandle, isLightingController ? this.endpoints.LightingController : this.endpoints.Lighting, deviceID);
		}

		let TotalBytes = RGBData.length;
		const InitialPacketSize = this.GetWriteLength() - InitialHeaderSize;

		const writeLightingError = this.WriteLighting(RGBData.length, RGBData.splice(0, InitialPacketSize), lightingHandle, deviceID);
		//Changed this to try reopening the handle if any error is encountered as the checkError function doesn't return the error type.

		if(writeLightingError) {
			this.OpenHandle(lightingHandle, isLightingController ? this.endpoints.LightingController : this.endpoints.Lighting, deviceID);
		}

		TotalBytes -= InitialPacketSize;

		while(TotalBytes > 0){
			const BytesToSend = Math.min(this.GetWriteLength() - HeaderSize, TotalBytes);
			this.StreamLighting(RGBData.splice(0, BytesToSend), lightingHandle, deviceID);

			TotalBytes -= BytesToSend;
		}
	}


	WriteLighting(LedCount, RGBData, lightingHandle, deviceID = 0){
		const packet =
		[0x02, deviceID | 0x08, this.command.writeEndpoint, lightingHandle, ...BinaryUtils.WriteInt32LittleEndian(LedCount)].concat(RGBData);

		device.write(packet, this.GetWriteLength());
		device.pause(3);

		const returnPacket = device.read([0x00], this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `WriteLighting`);

		if(ErrorCode){
			device.log(`WriteLighting Error`);
			device.pause(50); //Same idea as above but less extreme.

			return true;
		}

		return false;
	}

	/** @private */
	StreamLighting(RGBData, lightingHandle, deviceID = 0, requiresStreamingRead) {
		device.write([0x02, requiresStreamingRead ? deviceID | 0x08 : deviceID, this.command.streamEndpoint, lightingHandle].concat(RGBData), this.GetWriteLength());
		device.pause(1);

		if(!requiresStreamingRead) {
			return;
		}

		const returnPacket = device.read([0x00], this.GetReadLength());

		this.CheckError(returnPacket, `StreamLighting`);
	}

	/**
	 * Helper Function to Fetch and Set the devices mode. This function will close all currently open Handles on the device to ensure a clean slate and to prevent issues interacting with the device.
	 * Closing Handles in this function leads to iCUE not being able to function anymore, but solves issues with us not being able to find an open handle when trying to access non-lighting endpoints.
	 * @param {number | "Hardware" | "Software"} Mode ModeId to be checks against and set on the device.
	 */
	SetMode(Mode, deviceID = 0){
		if(typeof Mode === "string"){
			Mode = this.modes[Mode];
		}

		let CurrentMode = this.FetchProperty(this.properties.mode, deviceID);

		if(CurrentMode === Mode) {
			return true;
		}

		// if going into hardware mode we want to close all handles.
		// if going into software mode we don't want any handles stuck open from Icue or the file watchdog trigger.
		this.CloseHandleIfOpen("Lighting", deviceID);
		this.CloseHandleIfOpen("Background", deviceID);
		this.CloseHandleIfOpen("Auxiliary", deviceID);

		device.log(`Setting Device Mode to ${this.modes[Mode]}`);
		this.SetProperty(this.properties.mode, Mode, deviceID);
		CurrentMode = this.FetchProperty(this.properties.mode, deviceID);
		device.log(`Mode is now ${this.modes[CurrentMode]}`);

		if(this.modes[CurrentMode] === undefined) {
			return false;
		}

		return true;
	}

	/**
	 * Helper function to set the Hardware level device brightness if it is different then the Brightness value provided. This property is saved to flash.
	 * @param {number} Brightness Brightness Value to be set in the range of 0-1000
	 */
	SetHWBrightness(Brightness, deviceID = 0){
		const HardwareBrightness = this.FetchProperty(this.properties.brightness, deviceID);

		if(HardwareBrightness === Brightness){
			return;
		}

		device.log(`Hardware Level Brightness is ${HardwareBrightness/10}%`);
		this.SetProperty(this.properties.brightness, Brightness, deviceID);
		this.ReadProperty(this.properties.brightness, deviceID);

		device.log(`Hardware Level Brightness is now ${this.FetchProperty(this.properties.brightness, deviceID)/10}%`);

	}

	/**
	 * Helper function to set the Idle Timeout time if it is different then the time value provided. This property is saved to flash.
	 * @param {number|String} Timeout Idle time in milliseconds to be set. This value is usually in the range of 1-15 (15 minutes).
	 */
	SetIdleTimeout(deviceID = 0){
		const deviceIdleMode = this.FetchProperty(this.properties.idleMode, deviceID);
		const deviceIdleModeTimeout = this.FetchProperty(this.properties.idleModeTimeoutLegacy, deviceID);
		const Timeout = idleTimeout;

		console.log ("Current timeout: " + (deviceIdleModeTimeout / 60 / 1000) + " minutes");

		if(deviceIdleModeTimeout === Timeout || deviceIdleMode === 0x00 && Timeout === "Off"){
			return;
		}

		if (Timeout === "Off") {
			console.log ("Setting Idle Timeout to: disabled");
			this.SetProperty(this.properties.idleMode, 0x00, deviceID);
		} else {
			this.SetProperty(this.properties.idleMode, 0x01, deviceID); // Set Idle Mode to Enabled
			device.pause(1);

			this.SetProperty(this.properties.idleMode, [0x01, 0x00], deviceID);
			device.pause(1);

			const timeoutValue = Timeout * 60000;
			const hexValue = timeoutValue.toString(16).padStart(6, '0');
			const littleEndianHex = hexValue.match(/../g).reverse();

			this.SetProperty(this.properties.idleModeTimeoutLegacy, [parseInt(littleEndianHex[0], 16), parseInt(littleEndianHex[1], 16), parseInt(littleEndianHex[2], 16)], deviceID);
			this.ReadProperty(this.properties.idleModeTimeoutLegacy, deviceID);

			device.log(`Timeout time is now ${this.FetchProperty(this.properties.idleModeTimeoutLegacy, deviceID) / 60 / 1000} Minutes`);
		}
	}

	/**
	 * Helper function to set the Hardware Sidetone if it is different then the Sidetone value provided. This property is saved to flash.
	 * @param {number} Sidetone Value to be set in the range of 0-100
	 */
	SetSidetone(deviceID = 0){
		const deviceSidetone = this.FetchProperty(this.properties.sidetoneLevel, deviceID);

		if(deviceSidetone === SidetoneAmount){
			return;
		}

		const sidetoneValue = Math.round((SidetoneAmount / 100) * 1000);

		this.SetProperty(this.properties.sidetoneLevel, [sidetoneValue & 0xFF, (sidetoneValue >> 8) & 0xFF], deviceID);
		this.ReadProperty(this.properties.sidetoneLevel, deviceID);

		device.log(`Device Sidetone is now ${this.FetchProperty(this.properties.sidetoneLevel, deviceID)}%`);
	}
}
const Corsair = new ModernCorsairProtocol(options);

class CorsairBragiDongle{
	constructor() {
		this.children = new Map();
	}
	/** Add a Child Device to the Children Map.*/
	addChildDevice(subdeviceID, childDevice, subdevice = true) {
		if(this.children.has(subdeviceID)) {
			device.log("Child Device to Add Already Exists or is Undefined. Skipping!");

			return;
		}

		this.children.set(subdeviceID, childDevice);

		if(subdevice) { createSubdevice(childDevice); }
	}

	/** Remove a Child Device from the Children Map.*/
	removeChildDevice(subdeviceID) {
		if(!this.children.has(subdeviceID)) {
			device.log("Child Device Does Not Exist in Map or is Undefined. Skipping!");

			return;
		}

		device.removeSubdevice(this.children.get(subdeviceID).name);
		this.children.delete(subdeviceID);

	}
}
class CorsairBragiDevice{
/* eslint-disable complexity */
	constructor(device, subdeviceID = 0){

		this.name = device?.name ?? "Unknown Device";
		this.size = device?.size ?? [1, 1];
		this.ledNames = device?.ledNames ?? [];
		this.ledPositions =device?.ledPositions ?? [];
		this.ledMap = device?.ledMap ?? [];
		this.ledSpacing = device?.ledSpacing ?? 3;
		this.image = device?.image ?? "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
		this.isLightingController = device?.isLightingController ?? false;
		this.lightingEndpoint = -1;
		this.subdeviceId = subdeviceID;
		this.supportsBattery = false;
		this.supportsModernMute = false;
		this.supportsLegacyMute = false;
		this.supportsSidetone = false;
		this.keyCount = device?.keyCount ?? 0;
		this.buttonMap = device?.buttonMap ?? "Unknown";
		this.batteryPercentage = -1;
		this.batteryStatus = -1;
		this.pressedKeys = [];
	}
	toString(){
		return `BragiDevice: \n\tName: ${this.name} \n\tSize: [${this.size}] \n\tSubdeviceId: ${this.subdeviceId}`;
	}
}

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
/* eslint-enable complexity */
const macroInputArray = new BitArray(32);