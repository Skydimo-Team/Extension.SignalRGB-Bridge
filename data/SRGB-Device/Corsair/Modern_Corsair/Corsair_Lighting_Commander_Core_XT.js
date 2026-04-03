export function Name() { return "Corsair Commander Core XT"; }
export function VendorId() { return 0x1b1c; }
export function ProductId() { return 0x0C2A; }
export function Documentation(){ return "troubleshooting/corsair"; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition() { return [0, 0]; }
export function DefaultScale() { return 1.0; }
export function DeviceType(){return "lightingcontroller"}
/* global
LightingMode:readonly
forcedColor:readonly
*/
/** @type {ControllableParametersExport} */
export function ControllableParameters() {
	return [
		{ "property": "LightingMode", "group":"lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group":"lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default": "#009bde" },
	];
}
export function LedNames() { return []; }
export function LedPositions() { return []; }
export function SubdeviceController() { return true; }
export function DefaultComponentBrand() { return "Corsair"; }

export function SupportsFanControl(){ return true; }
// Use the CorsairLink mutex any time this device is rendering.
// if we don't our reads may be ruined by other programs
export function UsesCorsairMutex(){ return true; }

/** @param {HidEndpoint} endpoint*/
export function Validate(endpoint) {
	return endpoint.interface === 0x0000 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF42;
}


/** @type {Options} */
const options = {
	developmentFirmwareVersion: "1.3.54",
};

function SetupChannels() {
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++) {
		const channelInfo = ChannelArray[i];

		if(channelInfo){
			device.addChannel(...channelInfo);
		}
	}
}


//Global Variables
let ConnectedFans = [];
let ConnectedProbes = [];
let savedLedCount;
const DeviceMaxLedLimit = 264;

//Channel Name, Led Limit
/** @type {ChannelConfig[]}  */
const ChannelArray = [
	["4 pin Ports", 204, 204],
	["3 Pin Lighting Channel", 128, 60],
];

const FanControllerArray = [
	"Fan 1",
	"Fan 2",
	"Fan 3",
	"Fan 4",
	"Fan 5",
	"Fan 6",
];

export function Initialize() {
	if(StateMgr.states.length === 0){
		StateMgr.Push(new StateSetFanSpeeds(StateMgr));
		StateMgr.Push(new StatePollTempProbes(StateMgr));
		StateMgr.Push(new StatePollFanSpeeds(StateMgr));
	}

	Corsair.SetMode("Software");
	Corsair.FetchDeviceInformation();

	const SupportedLightingEndpoint = Corsair.FindLightingEndpoint();

	if(SupportedLightingEndpoint === Corsair.Endpoints.LightingController){
		Corsair.config.IsLightingController = true;
	}

	if(SupportedLightingEndpoint != 0){
		Corsair.OpenHandle("Lighting", SupportedLightingEndpoint);
	}

	savedLedCount = -1;

	const deviceIds = GetAttachedLedCounts();

	if(deviceIds[0] === 160){
		console.log(`Found 5000T case controller!`);
		device.setName(`Corsair 5000T Case`);

		// Set Default LED Counts;
		for(const channel of ChannelArray){
			if(channel[0] === "3 Pin Lighting Channel"){
				channel[1] = 160;
				channel[2] = 160;
			}
		}
	}

	SetupChannels();

	// Set Led Counts to something we can use.
	SetFanLedCount();

	//device.log(Corsair.FetchProperty(0x4)); // 60676 - 0xED04
	//device.log(Corsair.FetchProperty(0x3D)); // 14560 - 2 * property 0x3E?
	//device.log(Corsair.FetchProperty(0x3E)); // 7280
}

// Yes it's kind of wasteful to copy here.
// Splicing is also bad given that's O(n) too...
function* chunks(arr, n) {
	for (let i = 0; i < arr.length; i += n) {
	  yield arr.slice(i, i + n);
	}
}

function GetAttachedLedCounts(){
	let data = Corsair.ReadFromEndpoint(Corsair.Handles.Background, 0x20, 0x15);
	const DATA_LENGTH = data[6] ?? 7;
	data = data.splice(7, 4 * DATA_LENGTH);

	const foundLedCounts = [];

	for(const deviceId of chunks(data, 4)){
		if(deviceId[0] !== 2){
			foundLedCounts.push(0);
			continue;
		}

		foundLedCounts.push(deviceId[2]);
	}

	return foundLedCounts;
}

export function Render() {
	StateMgr.process();

	SendColorData();
}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		SendColorData("#000000");
	}else{
		Corsair.SetMode("Hardware");
	}
}

function GetFanSettings() {

	const FanData = Corsair.FetchFanStates();

	// Skip iterating other fans and creating FanControllers if the system is disabled.
	if(device.fanControlDisabled()) {
		// Reset if the system was disbled during runtime.
		device.log("System Monitoring disabled...", {toFile: true});

		return false;
	}

	if(ConnectedFans.length !== 0){
		return true;
	}

	for(let i = 0; i < FanData.length; i++) {
		const fanState = FanData[i];

		switch(fanState){
		case 1:
			device.log(`${FanControllerArray[i]} is Disconnected!`);
			break;
		case 4:
			device.log("Device is still booting up. We'll refetch fan states later...", {toFile: true});
			ConnectedFans = [];

			return false;
		case 7:
			if(!ConnectedFans.includes(i)){
				device.createFanControl(FanControllerArray[i]);
				ConnectedFans.push(i);
				device.log(`Found ${FanControllerArray[i]}`);
			}

			break;
		default:
			device.log(`${FanControllerArray[i]}: Unknown Fan State [${fanState}]`, {toFile: true});
		}
	}

	return true;
}

function SendColorData(overrideColor) {
	const ChannelLedCount = device.channel(ChannelArray[1][0]).LedCount();

	if(savedLedCount !== ChannelLedCount) {
		savedLedCount = ChannelLedCount;
		SetFanLedCount(ChannelLedCount);
	}

	const RGBData = GetColors(overrideColor);

	Corsair.SendRGBData(RGBData);
}

function GetColors(overrideColor) {

	const RGBData = [];
	// Add 3 Pin Lighting Data
	RGBData.push(...Get3PinColors(overrideColor));

	// Add 4 Pin Fan Ports to the end
	RGBData.push(...Get4PinColors(overrideColor));

	return RGBData;
}

function Get4PinColors(overrideColor){
	const componentChannel = device.channel(ChannelArray[0][0]);

	if(!componentChannel){
		return [];
	}

	let ChannelLedCount = componentChannel.LedCount();

	const ChannelData = [];

	if(overrideColor) {
		return device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	}else if(LightingMode  === "Forced") {
		return device.createColorArray(forcedColor, ChannelLedCount, "Inline");
	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 34 * 4;

		const pulseColor = device.getChannelPulseColor(ChannelArray[0][0]);

		return device.createColorArray(pulseColor, ChannelLedCount, "Inline");
	}

	const components = componentChannel.getComponentNames();

	for(let i = 0; i < components.length; i++) {

		let ComponentColors;

		// Each fan group is set to 34 Leds long, Each Component Must take up that many LEDs
		if(!componentChannel.shouldPulseColors()){
			ComponentColors = componentChannel.getComponentColors(components[i], "Inline");

			const QLFanLedCount = 34;

			if(ComponentColors.length < (QLFanLedCount * 3)){
				ComponentColors.push(...new Array(QLFanLedCount * 3 - ComponentColors.length).fill(0));
			}

		}else{
			ComponentColors = [];

			for(let j = 0; j < 34; j++) {
				ComponentColors.push(...[0, 128, 0]);
			}
		}

		ChannelData.push(...ComponentColors);
	}

	return ChannelData;

}

function Get3PinColors(overrideColor){
	let ChannelData = [];
	const Channel = device.channel(ChannelArray[1][0]);

	if(!Channel){
		return [];
	}
	// Channel 1, 3 Pin Strips
	let ChannelLedCount = Channel.LedCount();

	if(overrideColor) {
		ChannelData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	} else if(LightingMode === "Forced") {
		ChannelData = device.createColorArray(forcedColor, ChannelLedCount, "Inline");
	} else if(Channel.shouldPulseColors()) {
		ChannelLedCount = 0;

		const pulseColor = device.getChannelPulseColor(ChannelArray[1][0]);
		ChannelData = device.createColorArray(pulseColor, ChannelLedCount, "Inline");

	} else {
		const components = Channel.getComponentNames();

		for(let i = 0; i < components.length; i++) {
			const ComponentColors = Channel.getComponentColors(components[i], "Inline");
			ChannelData.push(...ComponentColors);
		}
	}

	return ChannelData;
}

//00 08 06 01 11 00 00 00 0D 00 07 01 01 01 06 01 06 01 06 01 06 01 06 01 06
function SetFanLedCount(ledCount) {
	// Configure Fan Ports to use QL Fan size grouping. 34 Leds
	const FanSettings = [0x00, 0x08, 0x06, 0x01, 0x11, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x07];
	const offset = 11;

	for(let iIdx = 0; iIdx < 7; iIdx++) {
		FanSettings[offset + iIdx * 2] = 0x01;
		FanSettings[offset + iIdx * 2 + 1] = iIdx === 0 ? 0x01 : 0x06; // 1 for nothing, 0x08 for pump?
	}
	// Set Strip Length to Size of 3 Pin port channel
	const StripSettings = [0x00, Corsair.ConnectionType, Corsair.CommandIds.writeEndpoint, 0x02, 0x11, 0x00, 0x00, 0x00, 0x0C, 0x00, 0x07];
	StripSettings[11] = ledCount & 0xFF;
	StripSettings[12] = ledCount >> 8;

	// We must open and set the Fan Ports
	Corsair.OpenHandle("Background", Corsair.Endpoints.LedCount_4Pin);
	Corsair.CheckHandle("Background");

	device.write(FanSettings, Corsair.GetWriteLength());
	device.read([0x00], Corsair.GetReadLength());
	// THEN open and set the strip ports before closing the endpoints
	// If we don't then the Fan Leds will toggle on and off with each sending of this
	Corsair.OpenHandle("Auxiliary", Corsair.Endpoints.LedCount_3Pin);
	Corsair.CheckHandle("Auxiliary");

	device.write(StripSettings, Corsair.GetWriteLength());
	device.read([0x00], Corsair.GetReadLength());

	// Close both handles together after
	Corsair.CloseHandle("Auxiliary");
	Corsair.CloseHandle("Background");

	// Send Confirm packet
	const packet = [0x00, Corsair.ConnectionType, Corsair.CommandIds.confirmChange, 1];
	device.write(packet, Corsair.GetWriteLength());
	device.read(packet, Corsair.GetReadLength());
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
		return this.ReadInt32LittleEndian(array.slice(0, 4).reverse());
	}
	static WriteInt32LittleEndian(value){
		return [value & 0xFF, ((value >> 8) & 0xFF), ((value >> 16) & 0xFF), ((value >> 24) & 0xFF)];
	}
	static WriteInt32BigEndian(value){
		return this.WriteInt32LittleEndian(value).reverse();
	}
}


function getKeyByValue(object, value) {
	const Key = Object.keys(object).find(key => object[key] === value);

	return parseInt(Key || "");
}

function decimalToHex(d, padding = 2) {
	let hex = Number(d).toString(16);

	while (hex.length < padding) {
		hex = "0" + hex;
	}

	return "0x" + hex;
}

class StateManager{
	constructor(){
		/** @type {State[]} */
		this.states = [];
		/** @type {State?} */
		this.currentState = null;
		this.lastProcessTime = Date.now();
		this.interval = 1000;
	}
	UpdateState(){
		if (this.states.length > 0) {
			this.currentState = this.states[this.states.length - 1];
			this.interval = this.currentState.interval || 3000;
			//device.log(`Set State Interval to ${this.interval}`);
		} else {
			this.currentState = null;
		}
	}
	/**
	 * @param {State} newState
	 */
	Push(newState){
		if(!newState){
			return;
		}

		this.states.push(newState);
		this.UpdateState();
	}
	/**
	 * @param {State} newState
	 */
	Replace(newState){
		this.states.pop();
		this.Push(newState);
	}
	Pop(){
		this.states.pop();
		this.UpdateState();
	}

	Shift(){
		const state = this.states.shift();

		if(state){
			this.Push(state);
		}
	}

	process(){
		//Break if were not ready to process this state
		if(Date.now() - this.lastProcessTime < this.interval) {
			return;
		}
		const startTime = Date.now();

		if(this.currentState !== null){
			this.currentState.run();
		}

		this.lastProcessTime = Date.now();
		//device.log(`State Took [${Date.now() - startTime}]ms to process`);

	}
}
const StateMgr = new StateManager();

class State{
	/**
	 * @param {StateManager} controller
	 * @param {number} interval
	 */
	constructor(controller, interval){
		this.controller = controller;
		this.interval = interval;
	}
	run(){

	}
}
class StateSystemMonitoringDisabled extends State{
	constructor(controller){
		super(controller, 5000);
	}
	run(){
		// Clear Existing Fans
		for(const FanID of ConnectedFans){
			device.log(`Removing Fan Control: ${FanControllerArray[FanID]}`);
			device.removeFanControl(FanControllerArray[FanID]);
		}

		ConnectedFans = [];

		// Clear Existing Probes
		for(const ProbeID of ConnectedProbes){
			device.log(`Removing Temperature Probe ${ProbeID + 1}`);
			device.removeTemperatureSensor(`Temperature Probe ${ProbeID + 1}`);
		}

		ConnectedProbes = [];

		// Stay here until fan control is enabled.
		if(!device.fanControlDisabled()) {
			device.log(`Fan Control Enabled, Fetching Connected Fans...`);
			this.controller.Replace(new StateEnumerateConnectedFans(this.controller));

		}
	};
};

class StateEnumerateConnectedFans extends State{
	constructor(controller){
		super(controller, 1000);
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`);
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		if(GetFanSettings()){
			device.log(`Found Connected Fans. Starting Polling Loop...`);
			this.controller.Pop();
		}else{
			device.log(`Connected Fans are still being initialized by the controller. Delaying Detection!`, {toFile: true});
			// delay next poll operation to give the device time to finish booting.
			this.interval = 5000;
		}
	};
}


class StatePollFanSpeeds extends State{
	constructor(controller){
		super(controller, 2000);
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`);
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		// Add Blocking State if we have no connected fans detected
		if(ConnectedFans.length === 0){
			device.log(`No Connected Fans Known. Fetching Connected Fans... `);
			this.controller.Push(new StateEnumerateConnectedFans(this.controller));

			return;
		}

		// Read Fan RPM
		const FanSpeeds = Corsair.FetchFanRPM();

		for(let i = 0; i < FanSpeeds.length; i++) {
			const fanRPM = FanSpeeds[i];

			if(fanRPM > 0) {
				device.log(`${FanControllerArray[i]} is running at rpm ${fanRPM}`);
			}

			device.setRPM(FanControllerArray[i], fanRPM);
		}

		this.controller.Shift();

	};
};

class StatePollTempProbes extends State{
	constructor(controller){
		super(controller, 2000);
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`);
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		// Read Temperature Probes
		const Temperatures = Corsair.FetchTemperatures();

		for(let i = 0; i < Temperatures.length; i++) {
			const temperature = Temperatures[i];

			if(!ConnectedProbes.includes(i)){
				ConnectedProbes.push(i);
				device.createTemperatureSensor(`Temperature Probe ${i + 1}`);
				device.log(`Found Temperature Sensor on Port ${i + 1}`, {toFile: true});
			}

			device.SetTemperature(`Temperature Probe ${i + 1}`, temperature);
			device.log(`Temperature Probe ${i+1} is at ${temperature}C`);
		}

		this.controller.Shift();

	};
};

class StateSetFanSpeeds extends State{
	constructor(controller){
		super(controller, 2000);
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`);
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		// Add Blocking State if we have no connected fans detected
		if(ConnectedFans.length === 0){
			device.log(`No Connected Fans Known. Fetching Connected Fans... `);
			this.controller.Push(new StateEnumerateConnectedFans(this.controller));

			return;
		}

		//Set Fan Speeds
		Corsair.SetFanSpeeds();

		this.controller.Shift();

	};
};

class PolledFunction{
	constructor(callback, interval){
		this.callback = callback;
		this.interval = interval;
		this.lastPollTime = Date.now();
	}
	Poll(){
		if (Date.now() - this.lastPollTime < this.interval) {
			return;
		}

		this.callback();

		this.lastPollTime = Date.now();
	}
	RunNow(){
		this.callback();

		this.lastPollTime = Date.now();
	}
}

/**
 * @typedef Options
 * @type {Object}
 * @property {string=} developmentFirmwareVersion
 * @property {boolean=} IsLightingController
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
 * Major concepts are {@link ModernCorsairProtocol#Properties|Properties} and {@link ModernCorsairProtocol#Handles|Handles}/{@link ModernCorsairProtocol#Endpoints|Endpoints}.
 *
 */
export class ModernCorsairProtocol{


	/** @constructs
	 * @param {Options} options - Options object containing device specific configuration values
	 */
	constructor(options = {}) {
		this.ConfiguredDeviceBuffer = false;

		/**
		 * @property {boolean} IsLightingController - Used to determine if lighting data is formated in a RGBRGBRGB format
		 * @property {string} developmentFirmwareVersion - Used to track the firmware version the plugin was developed with to the one on a users device
		 * @property {number} LedChannelSpacing - Used to seperate color channels on non-lighting controller devices.
		 */
		this.config = {
			IsLightingController: typeof options.IsLightingController === "boolean" ? options.IsLightingController : false,
			developmentFirmwareVersion: typeof options.developmentFirmwareVersion === "string" ? options.developmentFirmwareVersion : "Unknown",
			LedChannelSpacing: typeof options.LedChannelSpacing === "number" ? options.LedChannelSpacing : 0,
			WriteLength: 0,
			ReadLength: 0
		};

		this.KeyCodes = [];
		this.KeyCount = 0;

		/**
		 * Connection Types for Wired vs Wireless connection types. This must be set to match the physical device's connection or all commands will be rejected by the device.
		 * @readonly
		 * @enum {number}
		 * @property {0x08} WiredCommand - Used for Commands when the device has a Wired connection
		 * @property {0x09} WirelessCommand - Used for Commands when the device has a Wireless connection
		 */
		this.ConnectionTypes = Object.freeze({
			WiredCommand: 0x08,
			WirelessCommand: 0x09
		});
		this.ConnectionType = this.ConnectionTypes.WiredCommand;

		/**
		 * @readonly
		 * @static
		 * @enum {number}
		 * @property {0x01} setProperty - Used to set a {@link ModernCorsairProtocol#Properties|Property} value on the device
		 * @property {0x02} getProperty - Used to fetch a {@link ModernCorsairProtocol#Properties|Property} value from the device
		 * @property {0x05} closeHandle - Used to close a device {@link ModernCorsairProtocol#Handles|Handle}
		 * @property {0x06} writeEndpoint - Used to write data to an opened device {@link ModernCorsairProtocol#Endpoints|Endpoint}.
		 * @property {0x07} streamEndpoint - Used to stream data to an opened device {@link ModernCorsairProtocol#Endpoints|Endpoint} if the data cannot fit within one packet
		 * @property {0x08} readEndpoint - Used to read data (i.e Fan Speeds) from a device {@link ModernCorsairProtocol#Endpoints|Endpoint}
		 * @property {0x09} checkHandle - Used to check the status of a device {@link ModernCorsairProtocol#Endpoints|Endpoint}. Returned data is currently unknown
		 * @property {0x0D} openEndpoint - Used to open an Endpoint on a device {@link ModernCorsairProtocol#Handles|Handle}
		 * @property {0x12} pingDevice - Used to ping the device for it's current connection status
		 * @property {0x15} confirmChange - Used to apply led count changes to Commander Core [XT]
		 */
		this.CommandIds = Object.freeze({
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
		 * @enum {number}
		 * @property {0x01} - Hardware Mode
		 * @property {0x02} - Software Mode
		 */
		this.Modes = Object.freeze({
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
		 * @property {0x21} dpiX Device's Current X DPI PropertyID
		 * @property {0x22} dpiY Device's Current Y DPI PropertyID.
		 * @property {0x37} idleModeTimeout Device's Idle Timeout PropertyId. Value is in Milliseconds and has a max of 99 Minutes.
		 * @property {0x41} layout Device's Physical Layout PropertyId. Only applies to Keyboards.
		 * @property {0x44} BrightnessLevel Coarse (0-3) Brightness. Effectively sets brightness in 33.33% increments.
		 * @property {0x45} WinLockState Device's WinKey Lock Status. Only applies to Keyboards.
		 * @property {0x4A} LockedShortcuts Device's WinKey Lock Bit flag. Governs what key combinations are disabled by the devices Lock mode. Only Applies to Keyboards.
		 * @property {0x96} maxPollingRate Device's Max Polling Rate PropertyId. Not supported on all devices.
		 * @property {0xB0} ButtonResponseOptimization
		 */

		this.Properties =  Object.freeze({
			pollingRate: 0x01,
			brightness: 0x02,
			mode: 0x03,
			angleSnap: 0x07,
			idleMode: 0x0d,
			batteryLevel: 0x0F,
			batteryStatus: 0x10,
			vid: 0x11,
			pid: 0x12,
			firmware:0x13,
			BootLoaderFirmware: 0x14,
			WirelessChipFirmware: 0x15,
			dpiProfile: 0x1E,
			dpiMask: 0x1F,
			dpiX: 0x21,
			dpiY: 0x22,
			idleModeTimeout: 0x37,
			layout: 0x41,
			BrightnessLevel: 0x44,
			WinLockState: 0x45,
			LockedShortcuts: 0x4A,
			maxPollingRate: 0x96,
			ButtonResponseOptimization: 0xB0,
		});

		this.PropertyNames = Object.freeze({
			0x01: "Polling Rate",
			0x02: "HW Brightness",
			0x03: "Mode",
			0x07: "Angle Snapping",
			0x0d: "Idle Mode",
			0x0F: "Battery Level",
			0x10: "Battery Status",
			0x11: "Vendor Id",
			0x12: "Product Id",
			0x13: "Firmware Version",
			0x1E: "DPI Profile",
			0x1F: "DPI Mask",
			0x21: "DPI X",
			0x22: "DPI Y",
			0x37: "Idle Mode Timeout",
			0x41: "HW Layout",
			0x44: "Brightness Level",
			0x45: "WinLock Enabled",
			0x4a: "WinLock Disabled Shortcuts",
			0x5f: "MultipointConnectionSupport",
			0x96: "Max Polling Rate",
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
		 * @property {0x21} TemperatureData
		 * @property {0x22} LightingController
		 * @property {0x27} ErrorLog
		 */
		this.Endpoints = Object.freeze({
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

		this.EndpointNames = Object.freeze({
			0x01: "Lighting",
			0x02: "Buttons",
			0x17: "Fan RPM",
			0x18: "Fan Speeds",
			0x1A: "Fan States",
			0x1D: "3Pin Led Count",
			0x1E: "4Pin Led Count",
			0x21: "Temperature Probes",
			0x22: "Lighting Controller",
			0x27: "Error Log"
		});

		this.ChargingStates = Object.freeze({
			1: "Charging",
			2: "Discharging",
			3: "Fully Charged",
		});


		this.DataTypes = Object.freeze({
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
		 * Contains the HandleId's of usable device Handles. These are used to open internal device {@link ModernCorsairProtocol#Endpoints|Endpoint} foradvanced functions like Lighting and Fan Control.
		 * Each Handle can only be open for one {@link ModernCorsairProtocol#Endpoints|Endpoint} at a time, and must be closed before the {@link ModernCorsairProtocol#Endpoints|Endpoint} can be changed.
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
		this.Handles = Object.freeze({
			Lighting: 0x00,
			Background: 0x01,
			Auxiliary: 0x02,
		});

		this.HandleNames = Object.freeze({
			0x00: "Lighting",
			0x01: "Background",
			0x02: "Auxiliary"
		});
		/**
		 * Contains the values of all known Fan States. These are returned by {@link ModernCorsairProtocol#FetchFanStates|FetchFanStates}
		 * @enum {number} Endpoints
		 * @property {0x01} Disconnected - This fan Fan Port is empty and has no connected fan.
		 * @property {0x04} Initializing - The state of this Fan Port is still being determined by the device. You should rescan in a few seconds.
		 * @property {0x07} Connected - A Fan a connected to this Port
		 */
		this.FanStates = Object.freeze({
			Disconnected: 0x01,
			Initializing: 0x04,
			Connected: 0x07,
		});

		this.FanTypes = Object.freeze({
			QL: 0x06,
			SpPro: 0x05
		});

		this.PollingRates = Object.freeze({
			1: "125hz",
			2: "250hz",
			3: "500hz",
			4: "1000hz",
			5: "2000hz",
		});

		this.PollingRateNames = Object.freeze({
			"125hz": 1,
			"250hz": 2,
			"500hz": 3,
			"1000hz": 4,
			"2000hz": 5,
		});

		this.Layouts = Object.freeze({
			0x01: "ANSI",
			"ANSI" : 0x01,
			0x02: "ISO",
			"ISO": 0x02
		});

		this.KeyStates = Object.freeze({
			Disabled: 0,
			0: "Disabled",
			Enabled: 1,
			1: "Enabled",
		});
	}

	GetNameOfHandle(Handle){
		if(this.HandleNames.hasOwnProperty(Handle)){
			return this.HandleNames[Handle];
		}

		return "Unknown Handle";
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
	PingDevice(){
		let packet = [0x00, this.ConnectionType, this.CommandIds.pingDevice];
		device.write(packet, this.GetWriteLength());
		packet = device.read(packet, this.GetReadLength());

		if(packet[2] !== 0x12){
			return false;
		}

		return true;
	}

	SetKeyStates(Enabled){
		this.KeyCodes = [];

		// Assuming a continuous list of key id's
		for(let iIdx = 0; iIdx < this.KeyCount; iIdx++){
			this.KeyCodes.push(Enabled);
		}

		this.WriteToEndpoint("Background", this.Endpoints.Buttons, this.KeyCodes);
	}

	SetSingleKey(KeyID, Enabled){
		this.KeyCodes[KeyID - 1] = Enabled;

		this.WriteToEndpoint("Background", this.Endpoints.Buttons, this.KeyCodes);
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
	 * Finds and sets the device's buffer lengths for internal use within the class. This should be the first function called when using this Protocol class as all other interactions with the device rely on the buffer size being set properly.
	 *
	 * This is automatically called on the first write/read operation.
	 */
	FindBufferLengths(){

		if(this.ConfiguredDeviceBuffer){
			return;
		}

		const HidInfo = device.getHidInfo();
		this.log(`Setting up device Buffer Lengths...`);

		if(HidInfo.writeLength != 0){
			this.config.WriteLength = HidInfo.writeLength;
			this.log(`Write length set to ${this.config.WriteLength}`);
		}

		if(HidInfo.readLength != 0){
			this.config.ReadLength = HidInfo.readLength;
			this.log(`Read length set to ${this.config.ReadLength}`);
		}

		this.ConfiguredDeviceBuffer = true;
	}
	FetchDeviceInformation(){

		device.log(`Vid: [${decimalToHex(this.FetchProperty(this.Properties.vid), 4)}]`);
		device.log(`Pid: [${decimalToHex(this.FetchProperty(this.Properties.pid), 4)}]`);

		this.FetchFirmware();

		//DumpAllSupportedProperties();
		//DumpAllSupportedEndpoints();
	}
	FindLightingEndpoint(){
		let SupportedLightingEndpoint = -1;

		if(this.IsEndpointSupported(this.Endpoints.Lighting)){
			SupportedLightingEndpoint = this.Endpoints.Lighting;
		}else if(this.IsEndpointSupported(this.Endpoints.LightingController)){
			SupportedLightingEndpoint = this.Endpoints.LightingController;
		}

		device.log(`Supported Lighting Style: [${this.EndpointNames[SupportedLightingEndpoint]}]`, {toFile: true});

		return SupportedLightingEndpoint;
	}

	IsPropertySupported(PropertyId){
		return this.FetchProperty(PropertyId) !== -1;
	}

	DumpAllSupportedProperties(){
		const SupportedProperties = [];

		for(let i = 0; i < 0x64; i++){
			if(this.IsPropertySupported(i)){
				SupportedProperties.push(i);
			}
		}

		for(const property of SupportedProperties){
			device.log(`Supports Property: [${decimalToHex(property, 2)}], ${this.PropertyNames[property]}`, {toFile: true});
		}

		return SupportedProperties;

	}

	IsEndpointSupported(Endpoint){

		this.CloseHandleIfOpen("Background");

		const isHandleSupported = this.OpenHandle("Background", Endpoint) === 0;

		// Clean up after if the handle is now open.
		if(isHandleSupported){
			this.CloseHandle("Background");
		}

		return isHandleSupported;
	}

	DumpAllSupportedEndpoints(){
		const SupportedEndpoints = [];

		for(let i = 0; i < 0x80; i++){
			if(this.IsEndpointSupported(i)){
				SupportedEndpoints.push(i);
			}
		}

		for(const endpoint of SupportedEndpoints){
			device.log(`Supports Endpoint: [${decimalToHex(endpoint, 2)}], ${this.EndpointNames[endpoint]}`, {toFile: true});
		}

		return SupportedEndpoints;
	}
	/**
	 * Helper function to read and properly format the device's firmware version.
	 */
	FetchFirmware(){
		const data = this.ReadProperty(this.Properties.firmware);

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
	 * Helper function to set the devices current DPI. This will set the X and Y DPI values to the provided value.
	 * @param {number} DPI Desired DPI value to be set.
	 */
	SetDPI(DPI){
		const CurrentDPI = this.FetchProperty("DPI X");

		if(CurrentDPI !== DPI){

			device.log(`Current device DPI is [${CurrentDPI}], Desired value is [${DPI}]. Setting DPI!`);
			this.SetProperty(this.Properties.dpiX, DPI);
			this.SetProperty(this.Properties.dpiY, DPI);

			device.log(`DPI X is now [${this.FetchProperty(this.Properties.dpiX)}]`);
			device.log(`DPI Y is now [${this.FetchProperty(this.Properties.dpiX)}]`);
		}
	}

	/**
	 * Helper function to grab the devices battery level and charge state. Battery Level is on a scale of 0-1000.
	 * @returns [number, number] An array containing [Battery Level, Charging State]
	 */
	FetchBatteryStatus(){
		const BatteryLevel = this.FetchProperty(this.Properties.batteryLevel);
		const ChargingState = this.FetchProperty(this.Properties.batteryStatus);

		return [BatteryLevel, ChargingState];
	}
	/**
	 *
	 * @param {number[]} Data - Data packet read from the device.
	 * @param {string} Context - String representing the calling location.
	 * @returns {number} An Error Code if the Data packet contained an error, otherwise 0.
	 */
	CheckError(Data, Context){
		const hasError = Data[3] ?? false;

		if(!hasError){
			return hasError;
		}

		const caller_line = (new Error).stack.split("\n")[2];
		const caller_function = caller_line.slice(0, caller_line.indexOf("@"));
		const line_number = caller_line.slice(caller_line.lastIndexOf(":")+1);
		const caller_context = `${caller_function}():${line_number}`;

		switch(Data[3]){
		case 1: // Invalid Value
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Invalid Value Set!`);
			break;

		case 3: // Endpoint Error
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Operation Failed!`);
			break;

		case 5: // Property Not Supported
			device.log(`${caller_context} CorsairProtocol Error [${hasError}]: Property is not supported on this device!`);
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
	 * 	@param {number|string} PropertyId Property Index to be checked and set on the device. This value can either be the {@link ModernCorsairProtocol#Properties|PropertyId}, or the readable string version of it.
	 * 	@param {number} Value The Value to be checked against and set if the device's value doesn't match.
	 *  @return {boolean} a Boolean on if the Property value on the device did match, or now matches the value desired.
	 */
	CheckAndSetProperty(PropertyId, Value){
		if(typeof PropertyId === "string"){
			PropertyId = getKeyByValue(this.PropertyNames, PropertyId);
		}

		const CurrentValue = this.FetchProperty(PropertyId);

		if(CurrentValue !== Value){
			device.log(`Device ${this.PropertyNames[PropertyId]} is currently [${CurrentValue}]. Desired Value is [${Value}]. Setting Property!`);

			this.SetProperty(PropertyId, Value);
			device.read([0x00], this.GetReadLength(), 5);

			const NewValue = this.FetchProperty(PropertyId);
			device.log(`Device ${this.PropertyNames[PropertyId]} is now [${NewValue}]`);

			return NewValue === Value;
		}

		return true;
	}

	/**
	 * Reads a property from the device and returns the joined value after combining any high/low bytes. This function can return a null value if it's unable to read the property; i.e. it's unavailable on this device.
	 * @param {number | string } PropertyId Property Index to be read from the device. This value can either be the {@link ModernCorsairProtocol#Properties|PropertyId}, or the readable string version of it.
	 * @returns The joined value, or undefined if the device fetch failed.
	 */
	FetchProperty(PropertyId) {
		if(typeof PropertyId === "string"){
			PropertyId = getKeyByValue(this.PropertyNames, PropertyId);
		}

		const data = this.ReadProperty(PropertyId);

		// Don't return error codes.
		if(data.length === 0){
			return -1;
		}

		return BinaryUtils.ReadInt32LittleEndian(data.slice(4, 7));
	}

	/**
	 * Attempts to sets a property on the device and returns if the operation was a success.
	 * @param {number|string} PropertyId Property Index to be written to on the device. This value can either be the {@link ModernCorsairProtocol#Properties|PropertyId}, or the readable string version of it.
	 * @param {number} Value The Value to be set.
	 * @returns 0 on success, otherwise an error code from the device.
	 */
	SetProperty(PropertyId, Value) {
		if(typeof PropertyId === "string"){
			PropertyId = getKeyByValue(this.PropertyNames, PropertyId);
		}

		let packet = [0x00, this.ConnectionType, this.CommandIds.setProperty, PropertyId, 0x00, (Value & 0xFF), (Value >> 8 & 0xFF), (Value >> 16 & 0xFF)];
		device.write(packet, this.GetWriteLength());
		packet = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(packet, `SetProperty`);

		if(ErrorCode === 1){
			device.log(`Failed to set Property [${this.PropertyNames[PropertyId]}, ${decimalToHex(PropertyId, 2)}]. [${Value}] is an Invalid Value`);

			return ErrorCode;
		}

		if(ErrorCode === 3){
			device.log(`Failed to set Property [${this.PropertyNames[PropertyId]}, ${decimalToHex(PropertyId, 2)}]. Are you sure it's supported?`);

			return ErrorCode;
		}

		if(ErrorCode === 9){
			device.log(`Failed to set Property [${this.PropertyNames[PropertyId]}, ${decimalToHex(PropertyId, 2)}]. The device says this is a read only property!`);

			return ErrorCode;
		}

		return 0;
	}

	/**
	 * Reads a property from the device and returns the raw packet.
	 * @param {number} PropertyId Property Index to be read from the device.  This value can either be the {@link ModernCorsairProtocol#Properties|PropertyId}, or the readable string version of it.
	 * @returns The packet data read from the device.
	 */
	ReadProperty(PropertyId) {

		let packet = [0x00, this.ConnectionType, this.CommandIds.getProperty, PropertyId, 0x00];
		device.clearReadBuffer();
		device.write(packet, this.GetWriteLength());
		packet = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(packet, `ReadProperty`);

		if(ErrorCode){
			device.log(`Failed to read Property [${this.PropertyNames[PropertyId]}, ${decimalToHex(PropertyId, 2)}]. Are you sure it's supported?`);

			return [];
		}

		return packet;
	}

	SendCommand(data){
		device.clearReadBuffer();

		const SubDeviceId = 0;

		const packet = [0x00, (0x08 | SubDeviceId)];

		packet.push(...data);

		device.write(packet, this.GetWriteLength());

		const returnPacket = device.read([0x00], this.GetReadLength());

		// Error Check here?

		return returnPacket;
	}
	/**
	 * Opens a Endpoint on the device. Only one Endpoint can be open on a Handle at a time so if the handle is already open this function will fail.
	 * @param {Handle} Handle The Handle to open the Endpoint on. Default is 0.
	 * @param {number} Endpoint Endpoint Address to be opened.
	 * @returns 0 on success, otherwise an error code from the device.
	 */
	OpenHandle(Handle, Endpoint) {
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}

		const packet = [0x00, this.ConnectionType, this.CommandIds.openEndpoint, Handle, Endpoint];
		device.clearReadBuffer();
		device.write(packet, this.GetWriteLength());

		const returnPacket = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(returnPacket, `OpenEndpoint`);

		if(ErrorCode){
			device.log(`Failed to open Endpoint [${this.EndpointNames[Endpoint]}, ${decimalToHex(Endpoint, 2)}] on Handle [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. Are you sure it's supported and wasn't already open?`);
		}

		return ErrorCode;
	}
	/**
	 * Closes a Handle on the device.
	 * @param {Handle} Handle The HandleId to Close.
	 * @returns 0 on success, otherwise an error code from the device.
	 */
	CloseHandle(Handle) {
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}
		let packet = [0x00, this.ConnectionType, this.CommandIds.closeHandle, 1, Handle];
		device.clearReadBuffer();
		device.write(packet, this.GetWriteLength());
		packet = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(packet, `CloseEndpoint`);

		if(ErrorCode){
			device.log(`Failed to close Handle [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. was it even open?`);
		}

		return ErrorCode;
	}
	/**
	 * Helper function to Check the Handle is currently open and closes it if it is.
	 * @param {Handle} Handle - HandleId to perform the check on.
	 */
	CloseHandleIfOpen(Handle){
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}

		if(this.IsHandleOpen(Handle)){
			device.log(`${this.GetNameOfHandle(Handle)} Handle is open. Closing...`);
			this.CloseHandle(Handle);
		}
	}

	/**
	 * Performs a Check Command on the HandleId given and returns whether the handle is open.
	 * @param {Handle} Handle - HandleId to perform the check on.
	 * @returns {Boolean} Boolean representing if the Handle is already open.
	 */
	IsHandleOpen(Handle){
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}

		device.clearReadBuffer();

		let packet = [0x00, this.ConnectionType, this.CommandIds.checkHandle, Handle, 0x00];
		device.write(packet, this.GetWriteLength());
		packet = device.read(packet, this.GetReadLength());

		const isOpen = packet[3] !== 3;

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
	CheckHandle(Handle){
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}
		let packet = [0x00, this.ConnectionType, this.CommandIds.checkHandle, Handle, 0x00];
		device.clearReadBuffer();
		device.write(packet, this.GetWriteLength());
		packet = device.read(packet, this.GetReadLength());

		const ErrorCode = this.CheckError(packet, `CheckHandle`);

		if(ErrorCode){
			this.CloseHandle(Handle);
			device.log(`Failed to check Handle [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. Did you open it?`);

			return ErrorCode;
		}

		return packet;
	}
	/**
	 * This Helper Function will Open, Read, and Close a device Handle for the Endpoint given.
	 * If the read packet does not contain the ResponseId given the packet will be reread up to 4 times before giving up and returning the last packet read.
	 * If the Handle given is currently open this function will close it and then re-attempt opening it.
	 * @param {Handle} Handle - Handle to be used.
	 * @param {number} Endpoint - Endpoint to be read from
	 * @param {number} Command - CommandId that is contained in the return packet to verify the correct packet was read from the device.
	 * @returns The entire packet read from the device.
	 */
	ReadFromEndpoint(Handle, Endpoint, Command) {
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}

		if(this.IsHandleOpen(Handle)){
			device.log(`CorsairProtocol: Handle is already open: [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. Attemping to close...`);
			this.CloseHandle(Handle);
		}

		const ErrorCode = this.OpenHandle(Handle, Endpoint);

		if(ErrorCode){
			this.CloseHandle(Handle);
			device.log(`CorsairProtocol: Failed to open Device Handle [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. Aborting ReadEndpoint operation.`);

			return [];
		}

		device.clearReadBuffer();

		device.write([0x00, this.ConnectionType, this.CommandIds.readEndpoint, Handle], this.GetWriteLength());

		let Data = [];
		Data = device.read([0x00], this.GetReadLength());

		let RetryCount = 4;

		do {
			RetryCount--;
			device.write([0x00, this.ConnectionType, this.CommandIds.readEndpoint, Handle], this.GetWriteLength());
			Data = device.read(Data, this.GetReadLength());

			if(this.DataTypes[Data[4]] !== this.DataTypes[Command]) {
				device.log(`Invalid Command Read: Got [${this.DataTypes[Data[2]]}][${Data[4]}], Wanted [${this.DataTypes[Command]}][${Command}]`);
			}

		} while(this.DataTypes[Data[4]] !== this.DataTypes[Command] && RetryCount > 0);

		this.CloseHandle(Handle);

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
	WriteToEndpoint(Handle, Endpoint, Data) {
		if(typeof Handle === "string"){
			Handle = this.Handles[Handle];
		}

		if(this.IsHandleOpen(Handle)){
			device.log(`CorsairProtocol: Handle is already open: [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. Attemping to close...`);

			this.CloseHandle(Handle);
		}

		let ErrorCode = this.OpenHandle(Handle, Endpoint);

		if(ErrorCode){
			device.log(`CorsairProtocol: Failed to open Device Handle [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}]. Aborting WriteEndpoint operation.`);

			return ErrorCode;
		}

		let packet = [0x00, this.ConnectionType, this.CommandIds.writeEndpoint, Handle];
		packet.push(...BinaryUtils.WriteInt32LittleEndian(Data.length));
		packet.push(...Data);

		device.clearReadBuffer();
		device.write(packet, this.GetWriteLength());

		packet = device.read([0x00], this.GetReadLength());

		ErrorCode = this.CheckError(packet, `WriteEndpoint`);

		if(ErrorCode){
			device.log(`Failed to Write to Handle [${this.GetNameOfHandle(Handle)}, ${decimalToHex(Handle, 2)}].`);
		}

		this.CloseHandle(Handle);

		return ErrorCode;
	}
	/**
	 * This Helper Function to write RGB data to the device. This function will split the data into as many packets as needed and do multiple WriteEndpoints(Handle, Endpoint, Data) based on the DeviceBufferSize set.
	 *
	 * This function expects the Lighting HandleId (0x00) to already be open.
	 *
	 * This function will handle setting the header data expected by the device. If the RGBData Array Length provided doesn't match what the devices Lighting Endpoint expects this command will Error.
	 *
	 * @param {number[]} RGBData - RGBData to be written to the device in a RRRGGGBBB(Lighting Endpoint 0x01) or RGBRGBRGB(LightingController Endpoint 0x22) format.
	 */
	SendRGBData(RGBData){
		const InitialHeaderSize = 8;
		const HeaderSize = 4;
		let BytesSent = 0;

		// All packets sent to the LightingController Endpoint have these 2 values added before any other data.
		if(this.config.IsLightingController){
			RGBData.splice(0, 0, ...[this.DataTypes.LightingController, 0x00]);
		}

		let TotalBytes = RGBData.length;
		const InitialPacketSize = this.GetWriteLength() - InitialHeaderSize;

		this.WriteLighting(RGBData.length, RGBData.splice(0, InitialPacketSize));

		TotalBytes -= InitialPacketSize;
		BytesSent += InitialPacketSize;

		while(TotalBytes > 0){
			const BytesToSend = Math.min(this.GetWriteLength() - HeaderSize, TotalBytes);
			this.StreamLighting(RGBData.splice(0, BytesToSend));

			TotalBytes -= BytesToSend;
			BytesSent += BytesToSend;
		}
	}

	/** @private */
	WriteLighting(LedCount, RGBData){

		const packet = [0x00, this.ConnectionType, this.CommandIds.writeEndpoint, 0x00];
		packet.push(...BinaryUtils.WriteInt32LittleEndian(LedCount));
		packet.push(...RGBData);

		device.write(packet, this.GetWriteLength());

		const response = device.read([0x00], this.GetReadLength());

		this.CheckError(response, "WriteLighting");
	}

	/** @private */
	StreamLighting(RGBData) {

		const packet = [];
		packet[0x00] = 0x00;
		packet[0x01] = this.ConnectionType;
		packet[0x02] = this.CommandIds.streamEndpoint;
		packet[0x03] = 0x00;
		packet.push(...RGBData);

		device.write(packet, this.GetWriteLength());

		const response = device.read([0x00], this.GetReadLength());

		this.CheckError(response, "StreamLighting");
	}

	/**
	 * Helper Function to Fetch and Set the devices mode. This function will close all currently open Handles on the device to ensure a clean slate and to prevent issues interacting with the device.
	 * Closing Handles in this function leads to iCUE not being able to function anymore, but solves issues with us not being able to find an open handle when trying to access non-lighting endpoints.
	 * @param {number | "Hardware" | "Software"} Mode ModeId to be checks against and set on the device.
	 */
	SetMode(Mode){
		if(typeof Mode === "string"){
			Mode = this.Modes[Mode];
		}

		let CurrentMode = this.FetchProperty(this.Properties.mode);

		// if going into hardware mode we want to close all handles.
		// if going into software mode we don't want any handles stuck open from Icue or the file watchdog trigger.
		this.CloseHandleIfOpen("Lighting");
		this.CloseHandleIfOpen("Background");
		this.CloseHandleIfOpen("Auxiliary");

		if(CurrentMode !== Mode) {
			device.log(`Setting Device Mode to ${this.Modes[Mode]}`);
			this.SetProperty(this.Properties.mode, Mode);
			CurrentMode = this.FetchProperty(this.Properties.mode);
			device.log(`Mode is now ${this.Modes[CurrentMode]}`);
		}
	}

	/**
	 * Helper function to set the Hardware level device brightness if it is different then the Brightness value provided. This property is saved to flash.
	 * @param {number} Brightness Brightness Value to be set in the range of 0-1000
	 */
	SetHWBrightness(Brightness){
		const HardwareBrightness = this.FetchProperty(this.Properties.brightness);

		if(HardwareBrightness !== Brightness){
			device.log(`Hardware Level Brightness is ${HardwareBrightness/10}%`);

			this.SetProperty(this.Properties.brightness, Brightness);

			// Setting brightness appears to queue 2 packets to be read from the device
			// instead of the expected one.
			this.ReadProperty(this.Properties.brightness);

			device.log(`Hardware Level Brightness is now ${this.FetchProperty(this.Properties.brightness)/10}%`);
		}
	}

	/**
	 * Helper function to set the device's angle snapping if it is difference then the bool provided. This property is saved to flash.
	 * @param {boolean} AngleSnapping boolean Status to be set for Angle Snapping.
	 */
	SetAngleSnapping(AngleSnapping){
		const HardwareAngleSnap = this.FetchProperty(this.Properties.angleSnap);

		if(!!HardwareAngleSnap !== AngleSnapping){
			device.log(`Device Angle Snapping is set to [${HardwareAngleSnap ? "True" : "False"}]`);

			this.SetProperty(this.Properties.angleSnap, AngleSnapping ? 1 : 0);

			const NewAngleSnap = this.FetchProperty(this.Properties.angleSnap);
			device.log(`Device Angle Snapping is now [${NewAngleSnap ? "True" : "False"}]`);
		}
	}

	/** */
	FetchFanRPM() {
		//device.log("CorsairProtocol: Reading Fan RPM's.");

		if(device.fanControlDisabled()) {
			device.log("Fan Control is Disabled! Are you sure you want to try this?");

			return [];
		}

		const data = this.ReadFromEndpoint("Background", this.Endpoints.FanRPM, 0x06);

		if(data.length === 0){
			this.log("Failed To Read Fan RPM's.");

			return [];
		}

		const FanSpeeds = [];

		if(data[4] !== 6 && data[5] !== 0) {
			device.log("Failed to get Fan RPM's");
		}

		const fanCount = data[6] ?? 0;
		this.log(`Device Reported [${fanCount}] Fan RPM's`);

		const fanSpeeds = data.slice(7, 7 + 2 * fanCount);

		for(let i = 0; i < fanCount; i++) {
			const rpmData = fanSpeeds.splice(0, 2);
			FanSpeeds[i] = BinaryUtils.ReadInt16LittleEndian(rpmData);
		}

		return FanSpeeds;
	}
	/** */
	FetchFanStates() {
		const data = this.ReadFromEndpoint("Background", this.Endpoints.FanStates, 0x09);

		if(data.length === 0){
			device.log(`CorsairProtocol: Failed To Read Fan States.`);

			return [];
		}

		if(data[4] !== 9 || data[5] !== 0) {
			device.log("Failed to get Fan Settings", {toFile: true});

			return [];
		}

		const FanCount = data[6] ?? 0;
		device.log(`CorsairProtocol: Device Reported [${FanCount}] Fans`);

		const FanData = data.slice(7, 7 + FanCount);

		return FanData;
	}
	/** */
	SetFanType() {
		// Configure Fan Ports to use QL Fan size grouping. 34 Leds
		const FanCount = 7;

		const FanSettings = [this.DataTypes.FanTypes, 0x00, FanCount];

		for(let iIdx = 0; iIdx < FanCount; iIdx++) {
			FanSettings.push(0x01);
			FanSettings.push(iIdx === 0 ? 0x01 : this.FanTypes.QL); // 1 for nothing, 0x08 for pump?
		}

		this.WriteToEndpoint("Background", this.Endpoints.LedCount_4Pin, FanSettings);
	}

	SetFanSpeeds() {
		const FanCount = 6;
		const DefaultFanSpeed = 0x32;

		const FanSpeedData = [
			this.DataTypes.FanDuty, 0x00, FanCount,
		];

		for(let FanId = 0; FanId < FanCount; FanId++) {
			const FanData = [FanId, 0x00, DefaultFanSpeed, 0x00];

			if(ConnectedFans.includes(FanId)){

				const fanLevel = device.getFanlevel(FanControllerArray[FanId]);
				device.log(`Setting Fan ${FanId + 1} Level to ${fanLevel}%`);
				FanData[2] = fanLevel;
			}

			FanSpeedData.push(...FanData);
		}

		Corsair.WriteToEndpoint("Background", Corsair.Endpoints.FanSpeeds, FanSpeedData);
	}

	/** */
	FetchTemperatures() {
		//device.log(`CorsairProtocol: Reading Temp Data.`);

		const data = this.ReadFromEndpoint("Background", this.Endpoints.TemperatureData, 0x10);

		if(data.length === 0){
			device.log(`CorsairProtocol: Failed To Read Temperature Data.`);

			return [];
		}

		if(data[4] !== this.DataTypes.TemperatureProbes || data[5] !== 0) {
			device.log("Failed to get Temperature Data", {toFile: true});

			return [];
		}

		const ProbeTemps = [];
		const ProbeCount = data[6] ?? 0;
		this.log(`Device Reported [${ProbeCount}] Temperature Probes`);

		const TempValues = data.slice(7, 7 + 3 * ProbeCount);

		for(let i = 0; i < ProbeCount; i++) {
			const probe = TempValues.slice(i * 3 + 1, i * 3 + 3);
			const temp = BinaryUtils.ReadInt16LittleEndian(probe) / 10;

			ProbeTemps[i] = temp;
		}

		return ProbeTemps;
	}
}

const Corsair = new ModernCorsairProtocol(options);

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/controllers/commander-core-xt.png";
}