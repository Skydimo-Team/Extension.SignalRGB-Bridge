import permissions from "@SignalRGB/permissions";
import { Assert } from "@SignalRGB/Errors.js";
export function Name() { return "Lian Li Uni Fan Controller SL Infinity"; }
export function VendorId() { return  0x0CF2; }
export function ProductId() { return 0xA102;}//0xA100; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "lightingcontroller";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
moboSync:readonly
FanMode:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"moboSync", "label":"Enable Passthrough Control", "type":"boolean", "default":"false"},
		{"property":"FanMode", "label":"Fan Speed Mode", "type":"combobox", "values":["SignalRGB", "Motherboard PWM"], "default":"SignalRGB"},
	];
}
export function DeviceMessages() {
	return [
		{property: "Limited Frame Rate", message:"Limited Frame Rate", tooltip: "This device's firmware is limited to a slower refresh rate than other device's when using more than 2 channels"},
	];
}

export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "LianLi";}
export function SupportsFanControl(){ return true; }

const DeviceMaxLedLimit = 80 * 4;

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 80],
	["Channel 2", 80],
	["Channel 3", 80],
	["Channel 4", 80],
];

/** @param {UpdatedPermissions} updatedPermissions */
function onPermissionsUpdated(updatedPermissions){
	console.log(updatedPermissions);

	if(updatedPermissions["fans"] === false) {
		//Destroy fan control props if we're dropping our control.
		destroyFans();
	}

	if(updatedPermissions["lighting"] === true){
		setMoboPassthrough();
	}
}

function destroyFans(){
	for(const fan of ConnectedFans){
		device.removeFanControl(fan);
	}

	ConnectedFans.splice(0, ConnectedFans.length);
}

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}


const vLedNames = [];
const vLedPos = [];
const ConnectedFans = [];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPos;
}

export function Initialize() {

	SetupChannels();
	getDeviceFWVersion();

	// Must be done inside init.
	//permissionManager.Register();

	//if(permissionManager.GetPermission("lighting")){
		setMoboPassthrough();
	//}

	//if(permissionManager.GetPermission("fans")){
		setFanMode();
	//}

}

export function onmoboSyncChanged() {
	setMoboPassthrough();
}

export function onFanModeChanged() {
	setFanMode();
}

export function Render() {
	if(FanMode === "SignalRGB" && permissionManager.GetPermission("fans")) {
		PollFans();
	}

	if(!moboSync && permissionManager.GetPermission("lighting")) {
		sendColors();
	}

}

export function Shutdown(SystemSuspending) {
	if(!moboSync && permissionManager.GetPermission("lighting")) {
		const color = SystemSuspending ? "#000000" : shutdownColor;

		sendColors(color);
	}
}

function getChannelColors(Channel, ledcount, componentChannel, overrideColor) {
	let RGBData = [];

	if(overrideColor) {
		RGBData = device.createColorArray(overrideColor, ledcount, "Inline", "RBG");
	} else if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ledcount, "Inline", "RBG");
	} else if(componentChannel.shouldPulseColors()) {
		ledcount = 80;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ledcount, "Inline", "RBG");
	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "RBG");
	}

	return RGBData;
}

function sendColors(overrideColor) {
	for(let Channel = 0; Channel < 4; Channel++) {

		const ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
		const componentChannel = device.channel(ChannelArray[Channel][0]);

		if(ChannelLedCount > 0) {
			const ChannelRGBData = getChannelColors(Channel, ChannelLedCount, componentChannel, overrideColor);
			let innerRGBData = [];
			let outerRGBData = [];

			for(let fan = 0; fan < 4; fan++) {
				innerRGBData = innerRGBData.concat( ChannelRGBData.splice(0, 8 * 3));
				outerRGBData  = outerRGBData.concat(ChannelRGBData.splice(0, 12 * 3));
			}

			device.write([0xE0, (0x30 | (Channel * 2) )].concat(innerRGBData), 353);
			device.pause(1);

			device.write([0xE0, (0x30 | (Channel * 2) + 1)].concat(outerRGBData), 353);
			device.pause(1);

			device.send_report([0xE0, (0x10 | (Channel * 2)), 0x01, 0x02], 0x06);
			device.pause(1);

			device.send_report([0xE0, (0x10 | (Channel * 2) + 1), 0x01, 0x02], 0x06);
			device.pause(1);
		}
	}
}

function setMoboPassthrough() {
	device.send_report([0xE0, 0x10, 0x61, moboSync], 0x06);
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function PollFans() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if(!permissionManager.GetPermission("fans")) {
		console.warn("Fan Control is disabled through L-Connect! Signal will not control fans if L-Connect is controlling them!");

		return;
	}

	if(device.fanControlDisabled()) {
		return;
	}

	device.send_report([0xE0, 0x50, 0x00], 0x06);

	const fanRPMPacket = device.input_report([0xE0, 0x50], 65);

	for(let fan = 0; fan < 4; fan++) {
		const rpm = fanRPMPacket[(fan * 2 + 2)] | (fanRPMPacket[(fan * 2 + 1)] << 8);
		device.log(`Fan ${fan}: ${rpm}rpm`);

		if(rpm > 0 && !ConnectedFans.includes(`Fan ${fan}`)) {
			ConnectedFans.push(`Fan ${fan}`);
			device.createFanControl(`Fan ${fan}`);
		}

		if(ConnectedFans.includes(`Fan ${fan}`)) {
			device.setRPM(`Fan ${fan}`, rpm);

			const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
			setFanPercent(fan, newSpeed);
		}
	}
}

function setFanMode() {
	for(let channel = 0; channel < 4; channel++) {
		device.input_report([0xE0], 65);
		device.pause(20);
		device.send_report([0xE0, 0x10, 0x62, (1 << channel + 4 | (FanMode === "SignalRGB" ? 0 : 1) << channel)], 0x06);
	}
}

function setFanPercent(channel, percent) {
	device.pause(20);
	device.send_report([0xE0, 0x20 | channel, 0x00, (percent > 20 ? percent : 20)], 0x06);
}

function getDeviceFWVersion() {
	device.send_report([0xE0, 0x50, 0x01], 0x06);

	const FWPacket = device.input_report([0xE0], 65);

	device.log(`Firmware Version Packet: ${FWPacket}`);
	device.log(`Firmware Version ${FWPacket[5]}`);
}

/**
 * @typedef {("fans" | "lighting" | "macros")} Permission
 * @typedef {Object.<string, boolean>} UpdatedPermissions
 * @callback PermissionCallback
 * @param {UpdatedPermissions} updatedPermissions - ...
 */

/**
 * Manages permissions for a specific target partner. Tracks permission changes internally and
 * emits changed permissions to a provided callback funtion.
 * @class
 */
class PermissionsManager{
	/**
	 * Creates an instance of PermissionsManager.
	 * @constructor
	 * @param {string} partner - The name of the target for which permissions are managed.
	 *
	 * @param {PermissionCallback} callback - The callback function to be triggered when permissions are updated.
	 */
	constructor(partner, callback){
		/** @type {string} */
		this.target = partner;
		/** @type {Object.<string, boolean>} */
		this.permissions = {};
		/** @type {PermissionCallback} */
		this.callback = callback;
	}

	/**
	 * Registers the callback and initializes permissions.
	 */
	Register(){
		// Register callback. We HAVE to bind this as it's a class method.
		permissions.setCallback(this.HandlePermissionUpdate.bind(this));
		// Seed initial values
		this.HandlePermissionUpdate(permissions.permissions());
	}

	HandlePermissionUpdate(data){
		// users may not have permissions without internet so we likely want to just assume it's a success.
		const permissions = data[this.target];
		Assert.softIsDefined(permissions, `Permissions object doesn't contain: ${this.target}. Are you sure it's a valid partner?`);

		// This expects no new/removed permissions, only changes in status
		/** @type {UpdatedPermissions} */
		const changedPermissions = {};

		for(const key in permissions){
			if(permissions[key] !== this.permissions[key]){
				console.log(`Changed Permission! [${key}]: ${this.permissions[key]} -> ${permissions[key]}`);
				changedPermissions[key] = permissions[key];
			}
		}

		this.permissions = permissions ?? {};

		if(this.callback){
			this.callback(changedPermissions);
		}
	}

	/**
	 * Gets the value of a specific permission. Defaulting to true if it doesn't have a value
	 * @param {Permission} permission - The permission to check.
	 * @returns {boolean} - The value of the permission.
	 */
	GetPermission(permission){
		// Assume we have permissions if there isn't a setting for it.
		const value = this.permissions[permission] ?? true;
		//console.log(`Checking permission: [${permission}]. Result: [${value}]`);
		//console.log(this.permissions);

		return value;
	}
}

const permissionManager = new PermissionsManager("Lian-Li", onPermissionsUpdated);

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/lian-li/fan-controllers/uni-hub-controller.png";
}