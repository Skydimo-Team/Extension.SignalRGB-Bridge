import permissions from "@SignalRGB/permissions";
import { Assert } from "@SignalRGB/Errors.js";
export function Name() { return "Lian Li Uni Fan Controller SL 1.2"; }
export function VendorId() { return  0x0CF2; }
export function ProductId() { return [0xA100, 0xA106];} // 0xA106 Redragon Spec
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type(){return "rawusb";}
export function DeviceType(){return "lightingcontroller"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
moboSync:readonly
FanMode:readonly
*/
export function ControllableParameters(){
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
		{property: "Limited Frame Rate", message:"Limited Frame Rate", tooltip: "This device's firmware is limited to a slower refresh rate than other device's when using more than 2 channels"},
	];
}
export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "LianLi";}
export function SupportsFanControl(){ return true; }

const DeviceMaxLedLimit = 64 * 3;

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 64],
	["Channel 2", 64],
	["Channel 3", 64],
	["Channel 4", 64],
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

const COMMAND_ADDRESS = 0xE020;
const SETUP_ADDRESS = 0xE300;
const FAN_RPM_ADDRESS = 0xD800;
const Channel_1_Controller = {
	action: 0xe300,
	commit: 0xe020,
	count: 0,
	fan_objects: ["Channel 1 Fan 1", "Channel 1 Fan 2", "Channel 1 Fan 3", "Channel 1 Fan 4"],
	fanAction: 0xD8a0,
	fanCommit:0xD890,
	fanRead: 0xd800,
	fanPMWCommit: 0xe818
};

const Channel_2_Controller = {
	action: 0xe3c0,
	commit: 0xe030,
	count: 0,
	fan_objects: ["Channel 2 Fan 1", "Channel 2 Fan 2", "Channel 2 Fan 3", "Channel 2 Fan 4"],
	fanAction: 0xD8a2,
	fanCommit:0xD891,
	fanRead: 0xd802,
	fanPMWCommit: 0xe81A
};

const Channel_3_Controller = {
	action: 0xe480,
	commit: 0xe040,

	count: 0,
	fan_objects: ["Channel 3 Fan 1", "Channel 3 Fan 2", "Channel 3 Fan 3", "Channel 3 Fan 4"],
	fanAction: 0xD8a4,
	fanCommit:0xD892,
	fanRead: 0xd804,
	fanPMWCommit: 0x81C
};

const Channel_4_Controller = {
	action: 0xe540,
	commit: 0xe050,
	count: 0,
	fan_objects: ["Channel 4 Fan 1", "Channel 4 Fan 2", "Channel 4 Fan 3", "Channel 4 Fan 4"],
	fanAction: 0xD8a6,
	fanCommit:0xD893,
	fanRead: 0xd806,
	fanPMWCommit: 0xe81E
};

const vLedNames = [];
const vLedPos = [];
const ConnectedFans = [];

const channelArray = [Channel_1_Controller, Channel_2_Controller, Channel_3_Controller, Channel_4_Controller];
const PACKET_START = [0x00, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
const PACKET_COMMIT = [0x00, 0x01, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPos;
}


function setUpLighting(){
	console.log("setting up lighting!");

	//set fan counts
	setFans();

	for(let channel = 0; channel < 4;channel++) {

		const packet = [0x00, 0x32, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
		packet[2] = 0x10 * channel + 3;
		sendControlPacket(COMMAND_ADDRESS, packet, 16);
	}

	sendControlPacket(COMMAND_ADDRESS, PACKET_START, 16);
	setMoboPassthrough();

	sendControlPacket(COMMAND_ADDRESS, [0x00, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01], 16);
}

export function Initialize() {
	SetupChannels();

	// Must be done inside init.
	permissionManager.Register();

	if(permissionManager.GetPermission("lighting")){
		setUpLighting();
	}
}

export function Render() {
	if(FanMode === "SignalRGB" && permissionManager.GetPermission("fans")) {
		PollFans();
	}

	if(!permissionManager.GetPermission("lighting")){
		return;
	}

	if(!moboSync) {
		sendChannels();
	}
}

export function Shutdown(SystemSuspending) {
	if(!permissionManager.GetPermission("lighting")){
		return;
	}
	const color = SystemSuspending ? "#000000" : shutdownColor;

	if(!moboSync) {
		sendChannels(color);
	}
}

export function onmoboSyncChanged() {
	setMoboPassthrough();
}

export function onFanModeChanged() {
	setFanMode();
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function PollFans(){
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if(!permissionManager.GetPermission("fans")) {
		console.warn("Fan Control is disabled through L-Connect! Signal will not control fans if L-Connect is controlling them!");

		return;
	}

	if(device.fanControlDisabled()){
		return;
	}

	for(let fan = 0; fan < 4; fan++){
		const rpm = readFanRPM(fan);
		device.log(`Fan ${fan}: ${rpm}rpm`);

		if(rpm > 0 && !ConnectedFans.includes(`Fan ${fan}`)){
			ConnectedFans.push(`Fan ${fan}`);
			device.createFanControl(`Fan ${fan}`);
		}

		if(ConnectedFans.includes(`Fan ${fan}`)){
			device.setRPM(`Fan ${fan}`, rpm);

			const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
			setFanPercent(fan, newSpeed);
		}
	}
}

function setFans() {
	for(let channel = 0; channel < 4;channel++) {
		channelArray[channel].count = 4;
	}
}

function readFanRPM(channel) {
	const packet = readControlPacket(channelArray[channel].fanRead, [], 2);

	return packet[0] | (packet[1] << 8);
}

function setFanPercent(channel, percent) {
	let rpm = Math.round(1900 * percent/100);
	rpm = Math.max(800, rpm);
	device.log(`Setting Channel ${channel} to ${Math.round(percent)}% Fan Speed, UniFan rpm equivalent: ${rpm}`);
	setFanRPM(channel, rpm);
}

function setFanRPM(channel, rpm) {

	const packet = [];
	packet[0] = rpm % 256;
	packet[1] = Math.floor(rpm / 256);
	//device.log(`Setting Channel ${channel} to ${rpm}rpm, [${packet[0]}, ${packet[1]}]`)
	sendControlPacket(channelArray[channel].fanAction, packet, 2);

	packet[0] = 1;
	sendControlPacket(channelArray[channel].fanCommit, packet, 1);

}

let savedFanMode;

function setFanMode() {
	if(savedFanMode != FanMode) {
		savedFanMode = FanMode;

		if(savedFanMode == "SignalRGB") {
			setFanRPM(true);
		} else if(savedFanMode == "Motherboard PWM") {
			for(let channel = 0; channel < 4;channel++) {
				const packet = [0x00, 0x31, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
				packet[2] = (0x10 << channel) + 0x0F;
				sendControlPacket(COMMAND_ADDRESS, packet, 16);
				device.log(packet);
			}
		}
	}
}

function sendChannels(overrideColor) {
	for(let Channel = 0; Channel < 4;Channel++) {
		if (isChannelActive(Channel)) {
			if (device.channel(ChannelArray[Channel][0]).LedCount() != 0) {
				const packet = getChannelColors(Channel, overrideColor);
				sendControlPacket(channelArray[Channel].action, packet, 192);

				device.pause(5);
				sendControlPacket(channelArray[Channel].commit, PACKET_COMMIT, 192);
				device.pause(5);
			}
		}
	}
}

function  getChannelColors(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let RGBData = [];

	if(overrideColor) {
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", "RBG");
	} else if(LightingMode == "Forced") {
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "RBG");
	} else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 64;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "RBG");

	} else {
		RGBData = device.channel(ChannelArray[Channel][0]).getColors("Inline", "RBG");
	}

	return RGBData;

}

function isChannelActive(channelIdx) {
	return channelArray[channelIdx].count > 0;
}

function setMoboPassthrough() {
	const packet = [0x00, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
	packet[2] = moboSync;

	sendControlPacket(COMMAND_ADDRESS, packet, 16);
}

function readControlPacket(index, data, length) {
	//                  iType, iRequest, iValue, iReqIdx, pBuf, iLen, iTimeout
	return device.control_transfer(0xC0, 0x81, 0, index, data, length, 1000);
}

function sendControlPacket(index, data, length) {
	//                  iType, iRequest, iValue, iReqIdx, pBuf, iLen, iTimeout
	device.control_transfer(0x40, 0x80, 0, index, data, length, 1000);
	device.pause(1);
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/lian-li/fan-controllers/uni-hub-controller.png";
}