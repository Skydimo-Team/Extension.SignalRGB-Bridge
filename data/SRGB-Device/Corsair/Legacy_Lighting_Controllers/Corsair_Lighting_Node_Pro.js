export function Name() { return "Corsair Lighting Node Pro"; }
export function VendorId() { return  0x1b1c;}
export function ProductId() { return 0x0C0B;}
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function LedNames() { return []; }
export function LedPositions() { return []; }
export function DeviceType(){return "lightingcontroller"}
/* global
LightingMode:readonly
forcedColor:readonly
ArduinoCompatibilityMode:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"ArduinoCompatibilityMode", "group":"", "label":"Arduino Compatibility Mode", description: "Sets the endpoint between an official Corsair device or a Arduino based model to handle minor Firmware differences", "type":"boolean", "default":"false", "tooltip":"This is required for Arduino Based Models. Enabling will lower frame rate on Official Corsair Models."},
	];
}

export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "Corsair";}
export function Documentation(){ return "troubleshooting/corsair"; }

//Channel Name, Led Limit
/** @type {ChannelConfigArray}  */
const ChannelArray = [
	["Channel 1", 204, 120],
	["Channel 2", 204, 120],
];

const DeviceMaxLedLimit = 204;

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		const channelInfo = ChannelArray[i];

		if(channelInfo){
			device.addChannel(...channelInfo);
		}
	}
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0 || endpoint.interface === 2;
}

export function Initialize() {
	SetupChannels();

	CorsairLightingController.FetchFirmwareVersion();
}

export function Render() {
	device.clearReadBuffer();

	SendChannel(0);
	device.pause(1);

	SendChannel(1);
	device.pause(1);

	CorsairLightingController.CommitColors();

}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		device.clearReadBuffer();

		SendChannel(0, "#000000");
		device.pause(1);

		SendChannel(1, "#000000");
		device.pause(1);

		CorsairLightingController.CommitColors();
	}else{
		CorsairLightingController.SetChannelToHardwareMode(0);
		CorsairLightingController.SetChannelToHardwareMode(1);
	}
}

function SendChannel(Channel, overrideColor) {
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	if(!componentChannel){
		return;
	}
	let ChannelLedCount = componentChannel.LedCount();

	let ColorData = [];

	if(overrideColor) {
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Separate");
	}else if(LightingMode === "Forced"){
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Separate");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 120;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		ColorData = device.createColorArray(pulseColor, ChannelLedCount, "Separate");

	}else{
		ColorData = componentChannel.getColors("Separate");
	}

	//Set up for update
	CorsairLightingController.SetDirectColors(Channel, ColorData);
}

/**
 * Protocol Library for Corsair's Legacy Lighting Controllers
 * @class CorsairLightingControllerProtocol
 */
class CorsairLightingControllerProtocol{
	/** @typedef {1 | 2} ModeId */
	/** @typedef {0 | 1} ChannelId*/

	constructor(){
		this.writeLength = 65;
		this.readLength = 17;

		/** @type {Object.<string, ModeId>} */
		this.modes = {
			hardware: 1,
			software: 2
		};

		/**
		 * @alias CommandIdDict
		 * @type {Object.<string, number>}
		 * @readonly
		 */
		this.commandIds = {
			firmware: 0x02,
			directColors: 0x032,
			commit: 0x33,
			startDirect: 0x34,
			reset: 0x37,
			mode: 0x38
		};
	}

	FetchFirmwareVersion(){
		const packet = [0x00, this.commandIds.firmware];
		device.clearReadBuffer();
		device.write(packet, this.writeLength);

		const data = device.read([0x00], this.readLength);
		device.log(data);
	}
	/** @param {ChannelId} ChannelId */
	SetChannelToHardwareMode(ChannelId){
		this.SetChannelMode(ChannelId, this.modes.hardware);
	}
	/** @param {ChannelId} ChannelId */
	SetChannelToSoftwareMode(ChannelId){
		this.SetChannelMode(ChannelId, this.modes.software);
	}
	/**
	 * @param {ChannelId} ChannelId
	 * @param {ModeId} Mode
	 */
	SetChannelMode(ChannelId, Mode){
		const packet = [0x00, this.commandIds.mode, ChannelId, Mode];

		device.write(packet, this.writeLength);
		this.SafeRead();
	}
	/**
	 * @param {ChannelId} ChannelId
	 * @param {number[][]} RGBData
	 */
	SetDirectColors(ChannelId, RGBData){
		this.SetChannelToSoftwareMode(ChannelId);

		if(ArduinoCompatibilityMode){
			this.StartDirectColorSend(ChannelId);
		}

		//Stream RGB Data
		let ledsSent = 0;
		let [red, green, blue] = RGBData;

		// Check Red Channel Length
		let TotalLedCount = Math.min(204, red.length);

		while(TotalLedCount > 0){
			const ledsToSend = Math.min(50, TotalLedCount);

			this.StreamDirectColors(ledsSent, ledsToSend, 0, red.splice(0, ledsToSend), ChannelId);

			this.StreamDirectColors(ledsSent, ledsToSend, 1, green.splice(0, ledsToSend), ChannelId);

			this.StreamDirectColors(ledsSent, ledsToSend, 2, blue.splice(0, ledsToSend), ChannelId);

			ledsSent += ledsToSend;
			TotalLedCount -= ledsToSend;
		}

	}
	StartDirectColorSend(ChannelId){
		const packet = [0x00, this.commandIds.startDirect, ChannelId];

		device.write(packet, this.writeLength);
		this.SafeRead();
	}
	StreamDirectColors(startIdx, count, colorChannelid, data, channelId) {
		let packet = [0x00, this.commandIds.directColors, channelId, startIdx, count, colorChannelid];
		packet = packet.concat(data);

		device.write(packet, this.writeLength);
		this.SafeRead();
	}
	CommitColors(){
		const packet = [0x00, this.commandIds.commit, 0xFF];

		device.write(packet, this.writeLength);
		this.SafeRead();
	}

	// Arduino based Node Pro's cannot use a 0 timeout buffer clear.
	// This results in a 6fps loss for arduino models we can avoid on official models.
	SafeRead(){
		if(ArduinoCompatibilityMode){
			return device.read([0x00], 17);
		}

		return device.read([0x00], 17, 0);
	}
}
const CorsairLightingController = new CorsairLightingControllerProtocol();

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/controllers/lighting-node-pro.png";
}
