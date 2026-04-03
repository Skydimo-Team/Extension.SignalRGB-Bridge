import {ContextError, globalContext, Assert} from "@SignalRGB/Errors.js";
export function Name() { return "Corsair Void Headset Device"; }
export function VendorId() { return 0x1B1C; }
export function ProductId() { return Object.keys(CORSAIRdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/corsair"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "headphones";}
export function Validate(endpoint) { return endpoint.interface === 0 || endpoint.interface === 3; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
LightingMode:readonly
forcedColor:readonly
lowBatteryNotification:readonly
lowBatteryNotificationTime:readonly
muteFeedback:readonly
*/
export function ControllableParameters() {
	return [
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"lowBatteryNotification", group:"", label:"Enable Low battery sound notification", description: "Reproduces a beep sound when the device it's on low battery level", type:"boolean", default: true},
		{property:"lowBatteryNotificationTime", group:"", label:"Low battery sound notification (Minutes)", description: "Sets the interval in minutes to reproduce the low battery sound notification", type:"combobox", values:["1", "2", "3", "4", "5", "10", "15", "20", "25", "30"], default:"5"},
		{property:"muteFeedback", group:"", label:"Enable mute sound notification", description: "Reproduces a beep sound when the device it's muted", type:"boolean", default: true},
	];
}

export function Initialize() {
	CORSAIR.Initialize();
}

export function Render() {
	CORSAIR.sendColors();
	CORSAIR.fetchStatus();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		CORSAIR.sendColors("#000000");
	}else{
		CORSAIR.setSoftwareMode(true);
	}
}

export function onmuteFeedbackChanged() {
	CORSAIR.setMuteFeedback(muteFeedback);
}

export class CORSAIR_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Corsair Void Headset Device",
			DeviceEndpoint: { "interface": 0, "usage": 0x0000, "usage_page": 0x0000, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
			Wireless: false,
			micMuted: false,
			lastPolling: 0,
			pollingInterval: 1 * 1000, // 1 sec
			warningInterval: 3 * 60000,
			lastWarning: 0,
		};

		this.chargingStates = Object.freeze({
			0: "Unknown",
			1: "Discharging",
			2: "Low battery",
			4: "Fully Charged",
			5: "Charging",
		});

		this.chargingStateDictionary = Object.freeze({
			0 : 0, //Unknown
			1 : 1, //Discharging
			2 : 1, //Low battery
			4 : 4, //Fully Charged
			5 : 2, //Charging
		});
	}

	getDeviceProperties(deviceID) { return CORSAIRdeviceLibrary.PIDLibrary[deviceID];};

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

	getWirelessSupport() { return this.Config.Wireless; }
	setWirelessSupport(wireless) { this.Config.Wireless = wireless; }

	getMicMuted() { return this.Config.micMuted; }
	setMicMuted(state) { this.Config.micMuted = state; }

	setlowBatteryNotificationTime(time) { this.Config.warningInterval = time  * 60000; }

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

		if(DeviceProperties.wireless){
			this.setWirelessSupport(DeviceProperties.wireless);
			device.addFeature("battery");
		}

		device.log("Device model found: " + this.getDeviceName());
		device.setName("Corsair " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());

		this.setlowBatteryNotificationTime(lowBatteryNotificationTime);
		this.setSoftwareMode();
		this.setMuteFeedback(muteFeedback);
		this.fetchStatus();
	}

	/**
	 * Sets the device to either hardware or software mode
	 * @param {boolean} mode This defines if the device will be set to hardware mode (true) or software (false)
	 */
	setSoftwareMode(mode = false) {
		const endpoint = this.getDeviceEndpoint();
		device.set_endpoint(endpoint[`interface`], endpoint[`usage`], endpoint[`usage_page`], endpoint[`collection`]);

		if(mode){
			console.log("Setting Hardware Mode!");
			device.write([0xC8, 0x00, 0x00], 3); // Enable Hardware Mode
		}else{
			console.log("Setting Software Mode!");
			device.write([0xC8, 0x01, 0x00], 3); // Enable Software Mode
		}
	}

	/**
	 *
	 * @param {string} [overrideColor] This sets the device color to the provided hex code string if provided
	 */
	sendColors(overrideColor) {

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [];

		// Check for both arrays being the same size
		Assert.isEqual(deviceLedPositions.length, deviceLeds.length, "Device LEDs mapping size is wrong", this.Config);

		for (let iIdx = 0; iIdx < deviceLeds.length; iIdx++) {
			const iPxX = deviceLedPositions[iIdx][0];
			const iPxY = deviceLedPositions[iIdx][1];
			let color;

			if (overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else {
				color = device.color(iPxX, iPxY);
			}

			RGBData[(deviceLeds[iIdx] * 6)]		= (iIdx * 1) + 28;
			RGBData[(deviceLeds[iIdx] * 6) + 1]	= color[0];
			RGBData[(deviceLeds[iIdx] * 6) + 2]	= (iIdx * 2) + 22;
			RGBData[(deviceLeds[iIdx] * 6) + 3]	= color[1];
			RGBData[(deviceLeds[iIdx] * 6) + 4]	= (iIdx * 2) + 23;
			RGBData[(deviceLeds[iIdx] * 6) + 5]	= color[2];
		}

		this.writeRGB(RGBData);
	}

	/**
	 *
	 * @param {Array} RGBData The RGB data array with proper ID channels
	 * the format needs to be: [RID, RVALUE, GID, RVALUE, BID, BVALUE]
	 */
	writeRGB(RGBData) {
		device.write([0xCB, 0x06].concat(RGBData), 20);
	}

	/**
	 * Fetches the firmware version from the device
	 */
	fetchFirmwareVersion() {
		const firmwareVersion	= [0xC9, 0x66];

		device.clearReadBuffer();

		device.write(firmwareVersion, 2);

		const firmwareVersionData	= device.read(firmwareVersion, 5); // bytes 3 and 4 are duplicate of 1 and 2?

		device.log(`Firmware version: ${firmwareVersionData[1]}.${firmwareVersionData[2]}`);
	}

	/**
	 * Sets a single led channel to a specific value
	 * @param {number} channel ID of the channel
	 * @param {number} value Value to the change, range from 0 to 255
	 */
	setSingleLEDChannel(channel, value) {
		const command	= [0xCB, 0x01, channel, value];

		device.write(command, 20);
	}

	/**
	 * Plays a notification sound
	 * @param {boolean} option True to play mute sound and false to play unmute sound
	 */
	playNotificationSound(option = false){
		device.write([0xCA, 0x02, option === false ? 0x00 : 0x01], 5);
	}

	/**
	 * Sets the microphone mute state
	 * @param {boolean} option False to unmute the microphone and True to mute the microphone
	 */
	setMicrophoneState(option = false) {
		const command	= [0xCA, 0x03, option === false ? 0x00 : 0x01];

		device.clearReadBuffer();

		device.write(command, 5);

		console.log(option === false ? "Mute state disabled" : "enabled");
	}

	/**
	 * Sets the audio feedback when mutting the microphone
	 * @param {boolean} muteFeedback False to disable the feedback sound and True to enable the feedback sound
	 */
	setMuteFeedback(muteFeedback) {
		const command	= [0xCA, 0x04, muteFeedback === false ? 0x00 : 0x01];

		device.clearReadBuffer();

		device.write(command, 5);

		console.log(muteFeedback === false ? "Mute feedback disabled" : "Mute feedback enabled");
	}

	// Not sure what this enables/disables
	set05(option = true) {
		// Sets ??, 0x00 disables it and 0x01 enables
		const command	= [0xCA, 0x05, option === false ? 0x00 : 0x01];

		device.clearReadBuffer();

		device.write(command, 5);

		console.log(option === false ? "05 disabled" : "05 enabled");
	}

	/**
	 * Fetches and set the device status as battery and mic state
	 */
	fetchStatus(){

		if(Date.now() - this.Config.lastPolling < this.Config.pollingInterval) {
			return;
		}

		const batteryLevelPacket	= [0xC9, 0x64];

		device.clearReadBuffer();

		device.write(batteryLevelPacket, 2);

		const batteryLevelData	= device.read(batteryLevelPacket, 5);

		let batteryLevel = 0;

		if (batteryLevelData[3] === 35) {
			console.log("Headset turned off!");
		} else {

			if(batteryLevelData[2] > 100){
				batteryLevel	=	batteryLevelData[2] - 128;

				if (this.getMicMuted() === false) {
					this.setMicMuted(true);
				}
			}else{
				batteryLevel	=	batteryLevelData[2];

				if (this.getMicMuted() === true) {
					this.setMicMuted(false);
				}
			}

			this.setStatusLEDs();

			const batteryStatus	=	batteryLevelData[4];

			this.Config.lastPolling	= Date.now();

			battery.setBatteryLevel((batteryLevel ?? 0));
			battery.setBatteryState(this.chargingStateDictionary[batteryStatus ?? 0]);

			this.batteryWarning(batteryLevel);
		}
	}

	/**
	 * Plays a sound notification according to the received battery level as paramenter
	 * @param {number} batteryLevel Battery level, range from 0 to 100
	 */
	batteryWarning(batteryLevel){
		if(Date.now() - this.Config.lastWarning < this.Config.warningInterval) {
			return;
		}

		if(batteryLevel <= battery.lowBatteryWarningLevel && lowBatteryNotification === true){
			CORSAIR.playNotificationSound();
			this.Config.lastWarning	= Date.now();
		}

	}

	/**
	 * Function that fetches the current mic state property and set the michrophone led brightness
	 */
	setStatusLEDs(){

		const micState = this.getMicMuted() === true ? 0xFF : 0x00;

		/*
		// Packet to control multiple leds
			0xCB, 0x09, // Header
			0x1C, 0x00, // ??? Looks like setting 0xFF to those soft-lock the headset and a restart is needed
			0x16, 0x00, // ???
			0x17, 0x00, // ???
			0x1D, 0x00, // ???
			0x18, 0x00, // ???
			0x19, 0x00, // Power led B Channel I presume, but theres no blue led
			0x1B, 0x00, // Power led R Channel
			0x1A, 0x00, // Power led G Channel
			0x1E, micState // Mic R Channel

		// Packet to control single led
			0xCB, 0x01, // Header
			0x1E, micState // Mic R Channel
		*/

		// Why you are like this, Corsair?
		// the command to change a single led can only be sent with a 15ms interval between any previous packet,
		// less than that and the packet is ignored, this may delay a little bit the mic color status
		// but that seems the best we can do for now, the mic led doesn't respond on the multi led packet
		device.pause(15);
		device.write([0xCB, 0x01, 0x1E, micState], 20);
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

		console.log(`Endpoints not found in the device! - ${deviceLibrary.endpoint}`);
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x0A51: {
				name: "Void Elite Wireless",
				size: [3, 3],
				LedNames: ["Left Can", "Right Can"],
				LedPositions: [[0, 1], [2, 1]],
				Leds: [0, 1],
				wireless: true,
				endpoint : [{ "interface": 3, "usage": 0x0001, "usage_page": 0xFFC5, "collection": 0x0002 }],
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/void.png"
			},
			0x0A55: {
				name: "Void Elite Wireless", // White
				size: [3, 3],
				LedNames: ["Left Can", "Right Can"],
				LedPositions: [[0, 1], [2, 1]],
				Leds: [0, 1],
				wireless: true,
				endpoint : [{ "interface": 3, "usage": 0x0001, "usage_page": 0xFFC5, "collection": 0x0002 }],
				image: "https://assets.signalrgb.com/devices/brands/corsair/audio/void.png"
			},
		};
	}
}

const CORSAIRdeviceLibrary = new deviceLibrary();
const CORSAIR = new CORSAIR_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
