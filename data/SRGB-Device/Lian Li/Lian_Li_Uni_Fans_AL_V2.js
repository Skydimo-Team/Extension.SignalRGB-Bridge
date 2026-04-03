import permissions from "@SignalRGB/permissions";
import { Assert } from "@SignalRGB/Errors.js";
export function Name() { return "Lian Li Uni Fan Controller AL V2"; }
export function VendorId() { return  0x0CF2; }
export function ProductId() { return 0xA104;}//0xA100; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type(){return "hybrid";}
export function DeviceType(){return "lightingcontroller"}

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
		{"property":"moboSync", "group":"", "label":"Enable Passthrough Control", "type":"boolean", "default":"false"},
		{"property":"FanMode", "group":"", "label":"Fan Speed Mode", "type":"combobox", "values":["SignalRGB", "Motherboard PWM"], "default":"SignalRGB"},
	];
}
export function DeviceMessages() {
	return [
		{property: "Limited Frame Rate", message:"Limited Frame Rate", tooltip: "This device's firmware is limited to a slower refresh rate than other device's when using more then 1 channel"},
	];
}

export function SupportsFanControl(){ return true; }
export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "LianLi";}

const DeviceMaxLedLimit = 480;

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 120],
	["Channel 2", 120],
	["Channel 3", 120],
	["Channel 4", 120],
];

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

/** @param {UpdatedPermissions} updatedPermissions */
function onPermissionsUpdated(updatedPermissions){
	console.log(updatedPermissions);

	if(updatedPermissions["fans"] === false) {
		//Destroy fan control props if we're dropping our control.
		destroyFans();
	}

	if(updatedPermissions["lighting"] === true){
		setUpLighting();
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

const innerChannelRGBDict = [0x30, 0x32, 0x34, 0x36];
const outerChannelRGBDict = [0x31, 0x33, 0x35, 0x37];
const innerChannelRGBCommitDict = [0x10, 0x12, 0x14, 0x16];
const outerChannelRGBCommitDict = [0x11, 0x13, 0x15, 0x17];

const vLedNames = [];
const vLedPos = [];
const ConnectedFans = [];

let ChannelRGBData;

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPos;
}

function setUpLighting(){
	device.send_report([0xE0, 0x10, 0x63, 0x00, 0x01, 0x02, 0x03, 0x08], 32);
	device.get_report([0xE0, 0x10, 0x63, 0x00, 0x01, 0x02, 0x03, 0x08], 32);
	device.send_report([0xE0, 0x10, 0x60, 0x01, 0x06], 32);
	device.get_report([0xE0, 0x10, 0x60, 0x01, 0x06], 32);
	device.send_report([0xE0, 0x30], 32);
	device.get_report([0xE0, 0x30], 32);
	device.send_report([0xE0, 0x10, 0x60, 0x02, 0x06], 32);
	device.get_report([0xE0, 0x10, 0x60, 0x02, 0x06], 32);
	device.send_report([0xE0, 0x32], 32);
	device.get_report([0xE0, 0x32], 32);
	device.send_report([0xE0, 0x10, 0x60, 0x03, 0x06], 32);
	device.get_report([0xE0, 0x10, 0x60, 0x03, 0x06], 32);
	device.send_report([0xE0, 0x34], 32);
	device.get_report([0xE0, 0x34], 32);
	device.send_report([0xE0, 0x10, 0x60, 0x04, 0x06], 32);
	device.get_report([0xE0, 0x10, 0x60, 0x04, 0x06], 32);
	device.send_report([0xE0, 0x36], 32);
	device.get_report([0xE0, 0x36], 32);

	setFanMode();
}

export function Initialize() {
	SetupChannels();

	// Must be done inside init.
	permissionManager.Register();

	if(permissionManager.GetPermission("fans")){
		burstFans();
	}

	if(permissionManager.GetPermission("lighting")){
		setUpLighting();
		setMoboPassthrough();
	}
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

	if(!permissionManager.GetPermission("lighting")){
		return;
	}

	sendChannels();
}

export function Shutdown(SystemSuspending) {
	if(!permissionManager.GetPermission("lighting")){
		return;
	}
	const color = SystemSuspending ? "#000000" : shutdownColor;

	sendChannels(color);
}

function sendChannels(overrideColor) {
	for(let Channel = 0; Channel < 4; Channel++) {
		const innerRGBData = [];
		const outerRGBData = [];

		const ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
		const componentChannel = device.channel(ChannelArray[Channel][0]);

		if (ChannelLedCount > 0 || componentChannel.shouldPulseColors()) {

			ChannelRGBData = getChannelColors(Channel, ChannelLedCount, overrideColor, componentChannel);

			for (let fan = 0; fan < 6; fan++) {
				innerRGBData.push(...ChannelRGBData.splice(0, 8 * 3));
				outerRGBData.push(...ChannelRGBData.splice(0, 12 * 3));
			}

			device.write([0xe0, innerChannelRGBDict[Channel]].concat(innerRGBData), 353);
			device.pause(5);
			device.write([0xe0, outerChannelRGBDict[Channel]].concat(outerRGBData), 353);
			device.pause(5);
			device.send_report([0xe0, innerChannelRGBCommitDict[Channel], 0x01, 0x02], 353);
			device.pause(5);
			device.send_report([0xe0, outerChannelRGBCommitDict[Channel], 0x01, 0x02], 353);
			device.pause(5);
		}
	}
}

function  getChannelColors(Channel, ledcount, overrideColor, componentChannel) {
	let RGBData = [];

	if(LightingMode === "Forced") {
		RGBData = device.createColorArray(forcedColor, ledcount, "Inline", "RBG");

	} else if(overrideColor) {
		RGBData = device.createColorArray(overrideColor, ledcount, "Inline", "RBG");
	} else if(componentChannel.shouldPulseColors()) {
		ledcount = 120;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ledcount, "Inline", "RBG");

	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "RBG");
	}

	return RGBData;
}

function setMoboPassthrough() {
	device.write([0xE0, 0x10, 0x61, moboSync], 353);
	device.pause(10);
	device.write([0xE0, 0x50], 353);
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function burstFans() {
	for(let fan = 0; fan < 4; fan++) {
		setFanPercent(fan, 50);
	}
}

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

	for(let fan = 0; fan < 4; fan++) {
		const rpm = readFanRPM(fan);
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

const rpmDict = [0xd800, 0xd802, 0xd804, 0xd806];

function readFanRPM(channel) {
	const packet = readControlPacket(rpmDict[channel], [], 65);

	return packet[0] | (packet[1] << 8);
}

function setFanMode() {

	for(let Channel = 0; Channel < 4; Channel++) {
		if(FanMode === "SignalRGB") {
			device.write([0xE0, 0x10, 0x62, softwareDict[Channel]], 353);
			device.pause(10);
		} else {
			device.write([0xE0, 0x10, 0x62, moboDict[Channel]], 353);
			device.pause(10);
		}
	}

	device.write([0xE0, 0x50], 32);
	device.pause(10);
}

const softwareDict = [0x10, 0x20, 0x40, 0x80];
const moboDict = [0x11, 0x22, 0x44, 0x88];


function setFanPercent(channel, percent) {
	const rpm = Math.round(2000 * percent/100);
	device.log(`Setting Channel ${channel} to ${Math.round(percent)}% Fan Speed, UniFan rpm equivalent: ${rpm}`);
	device.write([0xE0, 0x20+channel, 0x00, percent === 0 ? 1 : percent], 32); //for some reason 0 is not a valid option
}

function readControlPacket(index, data, length) {
	//                  iType, iRequest, iValue, iReqIdx, pBuf, iLen, iTimeout
	return device.control_transfer(0xC0, 0x81, 0, index, data, length, 1000);
}

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/lian-li/fan-controllers/uni-hub-controller.png";
}