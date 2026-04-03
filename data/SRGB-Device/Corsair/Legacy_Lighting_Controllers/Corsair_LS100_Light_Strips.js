export function Name() { return "Corsair LS100 Light Strips"; }
export function VendorId() { return   0x1b1c; }
export function ProductId() { return   0x0C1E; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
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
		{"property":"ArduinoCompatibilityMode", "group":"", "label":"Arduino Compatibility Mode", description: "Sets the endpoint between an official Corsair device or a Arduino based to handle minor Firmware differences Corsair Node core", "type":"boolean", "default":"true", "tooltip":"This is required for Arduino Based Models. Enabling will lower frame rate on Official Corsair Models."},
	];
}
const BrightnessLimiter = .5;
const vKeyNames = [];
const vKeyPositions = [];

export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "Corsair";}
export function Documentation(){ return "troubleshooting/corsair"; }

const DeviceMaxLedLimit = 196;

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 138],
	["Channel 2", 138],
];

function SetupChannels(){
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++){
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

export function Initialize() {
	SetupChannels();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		if(!ArduinoCompatibilityMode){
			device.clearReadBuffer();
		}

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

export function LedNames() {
	return vKeyNames;
}


export function LedPositions() {
	return vKeyPositions;
}

function SendChannel(Channel, overrideColor) {
	let ChannelLedCount = device.channel(ChannelArray[Channel][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	let ColorData = [];

	if(overrideColor) {
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	}else if(LightingMode === "Forced"){
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Separate");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 120;

		const pulseColor = device.getChannelPulseColor(ChannelArray[Channel][0]);
		ColorData = device.createColorArray(pulseColor, ChannelLedCount, "Separate");

	}else{
		ColorData = device.channel(ChannelArray[Channel][0]).getColors("Separate");
	}

	ColorData[0] = ColorData[0].map( x => Math.floor(x * BrightnessLimiter));
	ColorData[1] = ColorData[1].map( x => Math.floor(x * BrightnessLimiter));
	ColorData[2] = ColorData[2].map( x => Math.floor(x * BrightnessLimiter));

	CorsairLightingController.SetDirectColors(Channel, ColorData);

}


export function Render() {
	if(!ArduinoCompatibilityMode){
		device.clearReadBuffer();
	}

	SendChannel(0);
	device.pause(1);

	SendChannel(1);
	device.pause(1);

	CorsairLightingController.CommitColors();
}

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0 || endpoint.interface === 2;
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
		// Check Red Channel Length
		let TotalLedCount = RGBData[0].length >= 138 ? 138 : RGBData[0].length;

		while(TotalLedCount > 0){
			const ledsToSend = TotalLedCount >= 50 ? 50 : TotalLedCount;

			this.StreamDirectColors(ledsSent, ledsToSend, 0, RGBData[0].splice(0, ledsToSend), ChannelId);

			this.StreamDirectColors(ledsSent, ledsToSend, 1, RGBData[1].splice(0, ledsToSend), ChannelId);

			this.StreamDirectColors(ledsSent, ledsToSend, 2, RGBData[2].splice(0, ledsToSend), ChannelId);

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
	return "https://assets.signalrgb.com/devices/brands/corsair/lightstrips/ls100.png";
}
