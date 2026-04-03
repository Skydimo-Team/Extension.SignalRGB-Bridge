import permissions from "@SignalRGB/permissions";
import { Assert } from "@SignalRGB/Errors.js";
export function Name() { return "LianLi L-Connect 3 Strimer Controller"; }
export function VendorId() { return  0x0cf2; }
export function ProductId() { return 0xa200;}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [120, 80];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "lightingcontroller"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
moboSync:readonly
ATXCable:readonly
GPUCable:readonly
GPUCableType:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"moboSync", "group":"lighting", "label":"Motherboard Passthrough Mode", "type":"boolean", "default": "false"},
		{"property":"ATXCable", "group":"lighting", "label":"24 Pin Cable Connected", "type":"boolean", "default": "true"},
		{"property":"GPUCable", "group":"lighting", "label":"GPU Cable Connected", "type":"boolean", "default": "true"},
		{"property":"GPUCableType", "group":"lighting", "label":"GPU Cable Type", description: "Sets the model of the GPU cable connected", "type":"combobox", "values":["Dual 8 Pin", "Triple 8 Pin"], "default":"Triple 8 Pin"},
	];
}

let channelReload = false;
const deviceConstants =
{
	MoboZone :
    {
    	0 : 0x30,
    	1 : 0x31,
    	2 : 0x32,
    	3 : 0x33,
    	4 : 0x34,
    	5 : 0x35,
    },
	DualGPUZone :
    {
    	0 : 0x36,
    	1 : 0x37,
    	2 : 0x38,
    	3 : 0x39
    },
	TripleGPUZone :
    {
    	0 : 0x36,
    	1 : 0x37,
    	2 : 0x38,
    	3 : 0x39,
    	4 : 0x3a,
    	5 : 0x3b
    },
};

const vDual8PinLedNames =
[
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
	"LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20",
	"LED 21", "LED 22", "LED 23", "LED 24", "LED 25", "LED 26", "LED 27", "LED 28", "LED 29", "LED 30",

	"LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37", "LED 38", "LED 39", "LED 40",
	"LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50",
	"LED 51", "LED 52", "LED 53", "LED 54", "LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60",

	"LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68", "LED 69", "LED 70",
	"LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80",
	"LED 81", "LED 82", "LED 83", "LED 84", "LED 85", "LED 86", "LED 87", "LED 88", "LED 89", "LED 90",

	"LED 91", "LED 92", "LED 93", "LED 94", "LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100",
	"LED 101", "LED 102", "LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108"
];

const vDual8PinLedPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
	[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
	[20, 0], [21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0],

	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
	[10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1],
	[20, 1], [21, 1], [22, 1], [23, 1], [24, 1], [25, 1], [26, 1],

	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
	[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],
	[20, 2], [21, 2], [22, 2], [23, 2], [24, 2], [25, 2], [26, 2],

	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
	[10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],
	[20, 3], [21, 3], [22, 3], [23, 3], [24, 3], [25, 3], [26, 3]
];

const vTriple8PinLedNames = //162
[
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
	"LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20",
	"LED 21", "LED 22", "LED 23", "LED 24", "LED 25", "LED 26", "LED 27",

	"LED 28", "LED 29", "LED 30", "LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37", "LED 38", "LED 39", "LED 40",
	"LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50",
	"LED 51", "LED 52", "LED 53", "LED 54",

	"LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60", "LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68", "LED 69", "LED 70",
	"LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80",
	"LED 81",

	"LED 82", "LED 83", "LED 84", "LED 85", "LED 86", "LED 87", "LED 88", "LED 89", "LED 90", "LED 91", "LED 92", "LED 93", "LED 94",
	"LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100", "LED 101", "LED 102", "LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108",

	"LED 109", "LED 110", "LED 111", "LED 112", "LED 113", "LED 114", "LED 115", "LED 116", "LED 117", "LED 118", "LED 119", "LED 120", "LED 121", "LED 122",
	"LED 123", "LED 124", "LED 125", "LED 126", "LED 127", "LED 128", "LED 129", "LED 130", "LED 131", "LED 132", "LED 133", "LED 134", "LED 135",

	"LED 136", "LED 137", "LED 138", "LED 139", "LED 140", "LED 141", "LED 142", "LED 143", "LED 144", "LED 145", "LED 146", "LED 147", "LED 148", "LED 149", "LED 150", "LED 151",
	"LED 152", "LED 153", "LED 154", "LED 155", "LED 156", "LED 157", "LED 158", "LED 159", "LED 160", "LED 161", "LED 162"

];

const vTriple8PinLedPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
	[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
	[20, 0], [21, 0], [22, 0], [23, 0], [24, 0], [25, 0], [26, 0],

	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
	[10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1],
	[20, 1], [21, 1], [22, 1], [23, 1], [24, 1], [25, 1], [26, 1],

	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
	[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],
	[20, 2], [21, 2], [22, 2], [23, 2], [24, 2], [25, 2], [26, 2],

	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
	[10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],
	[20, 3], [21, 3], [22, 3], [23, 3], [24, 3], [25, 3], [26, 3],

	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
	[10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 4], [19, 4],
	[20, 4], [21, 4], [22, 4], [23, 4], [24, 4], [25, 4], [26, 4],

	[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
	[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5],
	[20, 5], [21, 5], [22, 5], [23, 5], [24, 5], [25, 5], [26, 5]
];

const v24PinLedNames =
[
	"LED 1", "LED 2", "LED 3", "LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10",
	"LED 11", "LED 12", "LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20",

	"LED 21", "LED 22", "LED 23", "LED 24", "LED 25", "LED 26", "LED 27", "LED 28", "LED 29", "LED 30",
	"LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37", "LED 38", "LED 39", "LED 40",

	"LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50",
	"LED 51", "LED 52", "LED 53", "LED 54", "LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60",

	"LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68", "LED 69", "LED 70",
	"LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80",

	"LED 81", "LED 82", "LED 83", "LED 84", "LED 85", "LED 86", "LED 87", "LED 88", "LED 89", "LED 90",
	"LED 91", "LED 92", "LED 93", "LED 94", "LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100",

	"LED 101", "LED 102", "LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108", "LED 109", "LED 110",
	"LED 111", "LED 112", "LED 113", "LED 114", "LED 116", "LED 117", "LED 118", "LED 119", "LED 120"
];

const v24PinLedPositions =
[
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
	[10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],

	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
	[10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1],

	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
	[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],

	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
	[10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],

	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
	[10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 4], [19, 4],

	[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
	[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5],
];

export function SubdeviceController(){ return true; }
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

	if(updatedPermissions["lighting"] === true){
		StartLighting();
	}
}

function StartLighting(){
	initController();

	if(moboSync) {
		setMoboSync(moboSync);
	}
}

export function Initialize() {
	addChannels();

	permissionManager.Register();

	if(permissionManager.GetPermission("lighting")){
		StartLighting();
	}

}

export function Render() {
	if(!permissionManager.GetPermission("lighting")){
		return;
	}

	if(!channelReload) {
		if(ATXCable) {
			setMoboColors();
		}

		if(GPUCable) 	{
			if(GPUCableType === "Dual 8 Pin") {
				setDualGPUColors();
			} else if(GPUCableType === "Triple 8 Pin") {
				setTripleGPUColors();
			}
		}
	} else 	{
		channelReload = false;
	}
}


export function Shutdown(SystemSuspending) {
	if(!permissionManager.GetPermission("lighting")){
		return;
	}
	const color = SystemSuspending ? "#000000" : shutdownColor;

	if(ATXCable) {
		setMoboColors(color);
	}

	if(GPUCable) 	{
		if(GPUCableType === "Dual 8 Pin") {
			setDualGPUColors(color);
		} else if(GPUCableType === "Triple 8 Pin") {
			setTripleGPUColors(color);
		}
	}
}

export function onmoboSyncChanged() {
	setMoboSync(moboSync);
	addChannels();
}

export function onGPUCableChanged() {
	addChannels();
}

export function onATXCableChanged() {
	addChannels();
}

export function onGPUCableTypeChanged() {
	addChannels();
}

function initController() {
	for(let zones = 0x10; zones < 0x1c; zones++) {
		device.send_report([0xE0, zones, 0x01, 0x02], 255);
	}
}

function setMoboSync(moboSync) {

	device.send_report([0xE0, 0x10, 0x40, moboSync], 255);
	device.send_report([0xE0, 0x20], 255);
	device.send_report([0xE0, 0x50, 0x01], 255);
}

function addChannels() {
	device.removeSubdevice("Dual8PinStrimer"); //Remove these so I don't make 25 of them on reload.
	device.removeSubdevice("Triple8PinStrimer");
	device.removeSubdevice("24PinStrimer");
	channelReload = true;

	if(!moboSync) {
		if(GPUCable) 	{
			if(GPUCableType === "Dual 8 Pin") {
				device.createSubdevice("Dual8PinStrimer");
				device.setSubdeviceName("Dual8PinStrimer", `Dual 8 Pin Strimer`);
				device.setSubdeviceSize("Dual8PinStrimer", 27, 4);
				device.setSubdeviceLeds("Dual8PinStrimer", vDual8PinLedNames, vDual8PinLedPositions);
				//device.setSubdeviceImage("Dual8PinStrimer", Image());
			} else if(GPUCableType === "Triple 8 Pin") {
				device.createSubdevice("Triple8PinStrimer");
				device.setSubdeviceName("Triple8PinStrimer", `Triple 8 Pin Strimer`);
				device.setSubdeviceSize("Triple8PinStrimer", 27, 6);
				device.setSubdeviceLeds("Triple8PinStrimer", vTriple8PinLedNames, vTriple8PinLedPositions);
				//device.setSubdeviceImage("Dual8PinStrimer", Image());
			}
		}

		if(ATXCable) {
			device.createSubdevice("24PinStrimer");
			device.setSubdeviceName("24PinStrimer", `ATX Strimer`);
			device.setSubdeviceLeds("24PinStrimer", v24PinLedNames, v24PinLedPositions);
			//device.setSubdeviceImage("24PinStrimer", Image());
			device.setSubdeviceSize("24PinStrimer", 20, 6);
		}
	}
}

function setMoboColors(overrideColor) {
	const RGBData = [];

	for(let iIdx = 0; iIdx < v24PinLedPositions.length; iIdx++) {
		const iPxX = v24PinLedPositions[iIdx][0];
		const iPxY = v24PinLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("24PinStrimer", iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];;
		RGBData[iLedIdx+1] = color[2];
		RGBData[iLedIdx+2] = color[1];
	}

	for(let zones = 0; zones < 6; zones++) {
		const packet = [0xE0, deviceConstants["MoboZone"][zones]];
		packet.push(...RGBData.splice(0, 60));
		device.write(packet, 255);
	}

	device.send_report([0xE0, 0x2c, 0x00, 0x3f], 255);
}

function setDualGPUColors(overrideColor) {
	const RGBData = [];

	for(let iIdx = 0; iIdx < vDual8PinLedPositions.length; iIdx++) {
		const iPxX = vDual8PinLedPositions[iIdx][0];
		const iPxY = vDual8PinLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("Dual8PinStrimer", iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];;
		RGBData[iLedIdx+1] = color[2];
		RGBData[iLedIdx+2] = color[1];
	}

	for(let zones = 0; zones < 4; zones++) {
		const packet = [0xE0, deviceConstants["DualGPUZone"][zones]];
		packet.push(...RGBData.splice(0, 81));
		device.write(packet, 255);
	}

	device.send_report([0xE0, 0x2c, 0x03, 0xc0], 255);
}

function setTripleGPUColors(overrideColor) {
	const RGBData = [];

	for(let iIdx = 0; iIdx < vTriple8PinLedPositions.length; iIdx++) {
		const iPxX = vTriple8PinLedPositions[iIdx][0];
		const iPxY = vTriple8PinLedPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("Triple8PinStrimer", iPxX, iPxY);
		}

		const iLedIdx = iIdx * 3;
		RGBData[iLedIdx] = color[0];;
		RGBData[iLedIdx+1] = color[2];
		RGBData[iLedIdx+2] = color[1];
	}

	for(let zones = 0; zones < 6; zones++) {
		const packet = [0xE0, deviceConstants["TripleGPUZone"][zones]];
		packet.push(...RGBData.splice(0, 81));
		device.write(packet, 255);
	}

	device.send_report([0xE0, 0x2c, 0x0f, 0xc0], 255);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 1;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/lian-li/fan-controllers/strimmer-controller.png";
}