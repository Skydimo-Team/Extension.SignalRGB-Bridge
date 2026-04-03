export function Name() { return "Corsair Commander Pro"; }
export function VendorId() { return  0x1b1c; }
export function ProductId() { return [0x0C10, 0x1D00]; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 2.0;}
export function LedNames() {return []; }
export function LedPositions() {return []; }
export function DeviceType(){return "lightingcontroller"}
/* global
LightingMode:readonly
forcedColor:readonly
MonitoringCompatibilityMode:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"MonitoringCompatibilityMode", "group":"", "label":"Monitoring Compatibility Mode", description: "Makes this device wait until a frame is completely finished before releasing the CorsairLink mutex and letting other applications interact with it. Hardware monitors will have issues with this device while this is disabled, but enabling it will lower framerates", "type":"boolean", "default":"false", "tooltip":"This is required for compatibility with other hardware monitors. Enabling will lower frame rate and RGB may stutter when other programs are interacting with this device."},
	];
}

export function SubdeviceController(){ return true; }
export function SupportsFanControl(){ return true; }
// Use the CorsairLink mutex any time this device is rendering.
// if we don't our reads may be ruined by other programs
export function UsesCorsairMutex(){ return true; }

export function DefaultComponentBrand() { return "Corsair";}
export function Documentation(){ return "troubleshooting/corsair"; }

const DeviceMaxLedLimit = 204;
const ProductNames = {
	0x0C10: "Corsair Commander Pro",
	0x1D00: "Corsair Obsidian Series 1000D Case"
};
//Channel Name, Led Limit
/** @type {ChannelConfigArray} */
const ChannelArray = [
	["Channel 1", 204],
	["Channel 2", 204],
];

function SetupChannels(){
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++){
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

let ConnectedFans = [];
let ConnectedProbes = [];

/** @type {ValidateExport} */
export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0 || endpoint.interface === 2;
}

export function Initialize() {
	// Set the proper device name for the 1000D case as we're sharing the plugin file
	device.setName(ProductNames[device.productId()]);

	if(StateMgr.states.length === 0){
		StateMgr.Push(new StatePollFans(StateMgr));
		StateMgr.Push(new StatePollTempProbes(StateMgr));
	}

	SetupChannels();

}

export function Render() {
	device.clearReadBuffer();

	StateMgr.process();

	SendChannel(0);
	device.pause(1);

	SendChannel(1);
	device.pause(1);

	CorsairLightingController.CommitColors();


	// Wait until the device has no pending packets left
	// if we let the last packet land after we unlock the corsair link mutex then programs using the
	// CPUID SDK will risk getting their packets shifted by one if it lands after their first write.
	// This takes ~10ms to do
	if(MonitoringCompatibilityMode){
		//const start = Date.now();

		device.clearReadBuffer();
		device.read([0x00], 17, 40);

		//const end = Date.now();
		//device.log(`Final Read took ${end-start}ms.`);
	}

}

export function Shutdown(SystemSuspending) {
	if(SystemSuspending){
		// Go Dark on System Sleep/Shutdown
		SendChannel(0, "#000000");
		device.pause(1);

		SendChannel(1, "#000000");
		device.pause(1);
	}else{
		CorsairLightingController.SetChannelToHardwareMode(0);
		CorsairLightingController.SetChannelToHardwareMode(1);
	}
}

/**
 * @param {ChannelId} Channel
 * @param {string} [overrideColor]
 */
function SendChannel(Channel, overrideColor) {
	const componentChannel = device.channel(ChannelArray[Channel][0]);

	if(!componentChannel){
		return;
	}

	let ChannelLedCount = componentChannel.LedCount();

	let ColorData = [];

	if(overrideColor) {
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Inline");
	}else if(LightingMode === "Forced"){
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Separate");
	}else if(componentChannel.shouldPulseColors()){

		ChannelLedCount = 120;
		ColorData = componentChannel.getPulse(ChannelLedCount, "Separate");

	}else{
		ColorData = componentChannel.getColors("Separate");
	}

	CorsairLightingController.SetDirectColors(Channel, ColorData);

}

/**
 *
 * @param {number}timeout
 */
function ClearReadBuffer(timeout = 10){
	device.clearReadBuffer();
}


function FindConnectedFans(){

	const config = CorsairLightingController.FetchFanStates();

	const FanStates = CorsairLightingController.fanStates;

	for(let i = 0; i < config.length; i++) {
		const fanState = config[i];

		switch(fanState){
		case FanStates.disconnected:
			device.log(`Fan ${i + 1} is Disconnected!`, {toFile: true});
			break;
		case FanStates.deviceBooting:
			device.log("Device is still booting up. We'll refetch fan states later...", {toFile: true});

			return false;

		case FanStates.dc:
		case FanStates.pwm:
			if(!ConnectedFans.includes(i)){
				ConnectedFans.push(i);
				device.createFanControl(`Fan ${i + 1}`);
				device.log(`Found Fan on Port ${i + 1}`, {toFile: true});
			}

			break;
		default:
			device.log(`Fan ${i + 1}: Unknown Fan State [${fanState}]`, {toFile: true});
		}
	}

	return true;
}

function FindTempSensors(){
	const config = CorsairLightingController.GetTempConfiguration();

	for (let i = 0; i < config.length; i++){
		if(config[i] === 1){
			if(!ConnectedProbes.includes(i)){
				ConnectedProbes.push(i);
				device.createTemperatureSensor(`Temperature Probe ${i + 1}`);
				device.log(`Found Temp Sensor on Port ${i + 1}`, {toFile: true});
			}
		}
	}
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
			device.log(`Removing Fan Control: Fan ${FanID+1}`);
			device.removeFanControl(`Fan ${FanID+1}`);
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
			device.log(`Fan Control Enabled, Fetching Connected Fans...`, {toFile: true});
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
			device.log(`Fan Control Disabled...`, {toFile: true});
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		if(FindConnectedFans()){
			device.log(`Found Connected Fans. Starting Polling Loop...`, {toFile: true});
			this.controller.Pop();
		}else{
			device.log(`Connected Fans are still being initialized by the controller. Delaying Detection!`, {toFile: true});
			// delay next poll operation to give the device time to finish booting.
			this.controller.interval = 5000;
		}
	};
}


class StatePollFans extends State{
	constructor(controller){
		super(controller, 1000);
		/** @type {FanId} */
		this.index = 0;
		this.DetectionAttempts = 0;
		this.MaxDetectionAttempts = 4;

	}
	Reset(){
		this.index = 0;
		this.DetectionAttempts = 0;
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`, {toFile: true});
			this.Reset();
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		// Add Blocking State if we have no connected fans detected
		if(ConnectedFans.length === 0){

			if(ConnectedFans.length === 0 && this.DetectionAttempts > this.MaxDetectionAttempts){
				device.log(`Failed to detect any fans after ${this.MaxDetectionAttempts} attempts. We're stopping detection attempts...`, {toFile: true});
				this.controller.Pop();

				return;
			}

			device.log(`No Connected Fans Known. Fetching Connected Fans... `, {toFile: true});
			// Shift us to the back of the queue, and push a blocking state to enumerate the connected fans
			this.controller.Shift();

			this.controller.Push(new StateEnumerateConnectedFans(this.controller));
			this.DetectionAttempts++;

			return;
		}


		// Grab Fan RPM and pass it to the backend
		const rpm = CorsairLightingController.GetFanRPM(ConnectedFans[this.index]);
		device.setRPM(`Fan ${ConnectedFans[this.index] + 1}`, rpm);

		// Get Fans Target RPM and pass it to the device
		const level = device.getNormalizedFanlevel(`Fan ${ConnectedFans[this.index] + 1}`);
		CorsairLightingController.SetFanPercent(ConnectedFans[this.index], level * 100);

		device.log(`Fan ${ConnectedFans[this.index]+1} RPM: ${rpm}, Level: ${Math.round(level * 100)}%`);

		// This device has VERY slow reads and writes for fan control so we're doing one fan each pass.
		// When all fans are done we reset and shift to the next state
		this.index++;

		if(this.index === ConnectedFans.length){
			this.index = 0;
			this.controller.Shift();

		}

	};
};

class StateEnumerateConnectedProbes extends State{
	constructor(controller){
		super(controller, 1000);
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`, {toFile: true});
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		// I haven't seen this command be able to fail assuming probes are connected
		FindTempSensors();
		//device.log(`Found Connected Probes. Continuing Polling Loop...`, {toFile: true});
		this.controller.Pop();

	};
}

class StatePollTempProbes extends State{
	constructor(controller){
		super(controller, 1000);
		this.index = 0;
		this.DetectionAttempts = 0;
		this.MaxDetectionAttempts = 3;
	}
	Reset(){
		this.index = 0;
		this.DetectionAttempts = 0;
	}
	run(){
		// Add Blocking State if fan control is disabled
		if(device.fanControlDisabled()) {
			device.log(`Fan Control Disabled...`, {toFile: true});
			this.Reset();
			this.controller.Push(new StateSystemMonitoringDisabled(this.controller));

			return;
		}

		// Add Blocking State if we have no connected probes detected
		if(ConnectedProbes.length === 0){

			if(ConnectedProbes.length === 0 && this.DetectionAttempts > this.MaxDetectionAttempts){
				device.log(`Failed to detect any Temperature Probes after ${this.MaxDetectionAttempts} attempts. We're stopping detection attempts...`, {toFile: true});
				this.controller.Pop();

				return;

			}

			device.log(`No Connected Temperature Probes Known. Fetching Connected Temperature Probes... `, {toFile: true});
			// Shift us to the back of the queue, and push a blocking state to enumerate the connected fans
			this.controller.Shift();
			this.controller.Push(new StateEnumerateConnectedProbes(this.controller));

			this.DetectionAttempts++;

			return;
		}

		const Temperature = CorsairLightingController.GetTempSensorInCelsius(ConnectedProbes[this.index]);

		if(Temperature !== 0){
			device.log(`Temperature Probe ${ConnectedProbes[this.index] + 1} is currently at ${Temperature}c`);
			// Do something later
			device.SetTemperature(`Temperature Probe ${ConnectedProbes[this.index] + 1}`, Temperature);

		}else{
			device.log(`Temperature Probe ${ConnectedProbes[this.index] + 1} returned a bad read!`);

		}

		// This device has VERY slow reads and writes for probes control so we're doing one probe each pass.
		// When all probes are done we reset and shift to the next state
		this.index++;

		if(this.index === ConnectedProbes.length){
			this.index = 0;
			this.controller.Shift();

		}

	};
};

class PolledFunction{
	constructor(callback, interval){
		this.callback = callback;
		this.interval = interval;
		this.lastPollTime = Date.now();
	}
	SetInterval(interval){
		this.interval = interval;
	};

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
 * Protocol Library for Corsair's Legacy Lighting Controllers
 *
 * @class CorsairLightingControllerProtocol
 */
class CorsairLightingControllerProtocol{
	/** @typedef {1 | 2} ModeId */
	/** @typedef {0 | 1} ChannelId*/
	/** @typedef {0 | 1 | 2 | 3 | 4 | 5} FanId*/

	constructor(){
		this.writeLength = 65;
		this.readLength = 17;
		this.maxFanCount = 6;
		this.maxProbeCount = 4;

		this.modes = Object.freeze({
			hardware: 1,
			1: "hardware",
			software: 2,
			2: "software"
		});

		this.commandIds = Object.freeze({
			firmware: 0x02,
			getConnectedProbes: 0x10,
			getTemperatureReading: 0x11,

			getFanStates: 0x20,
			getFanRPM: 0x21,
			getFanSpeedPercentage: 0x22,
			setfanSpeedPercentage: 0x23,
			setFanRPM: 0x24,
			directColors: 0x032,
			commit: 0x33,
			startDirect: 0x34,
			reset: 0x37,
			mode: 0x38
		});

		this.fanStates = Object.freeze({
			disconnected: 0x00,
			dc: 0x01,
			pwm: 0x02,
			deviceBooting: 0x03,
		});
	}

	FetchFirmwareVersion(){
		const packet = [0x00, this.commandIds.firmware];
		ClearReadBuffer(1);

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
		//device.read([0x00], this.readLength, 1);
	}
	/**
	 * @param {ChannelId} ChannelId
	 * @param {number[][]} RGBData
	 */
	SetDirectColors(ChannelId, RGBData){
		CorsairLightingController.SetChannelToSoftwareMode(ChannelId);

		CorsairLightingController.StartDirectColorSend(ChannelId);
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
	/**
	 *
	 * @param {ChannelId} ChannelId
	 */
	StartDirectColorSend(ChannelId){
		const packet = [0x00, this.commandIds.startDirect, ChannelId];

		device.write(packet, this.writeLength);
		//device.read([0x00], this.readLength, 1);
	}
	/**
	 * @param {number} startIdx
	 * @param {number} count
	 * @param {number} colorChannelId
	 * @param {number[]} data
	 * @param {ChannelId} channelId
	 */
	StreamDirectColors(startIdx, count, colorChannelId, data, channelId) {
		let packet = [0x00, this.commandIds.directColors, channelId, startIdx, count, colorChannelId];
		packet = packet.concat(data);

		device.write(packet, this.writeLength);
		//device.read([0x00], this.readLength, 1);

	}
	CommitColors(){
		const packet = [0x00, this.commandIds.commit, 0xFF];

		device.write(packet, this.writeLength);
		//device.read([0x00], this.readLength, 1);
	}
	FetchFanStates(){
		let packet = [0x00, this.commandIds.getFanStates];
		ClearReadBuffer(1);

		device.write(packet, this.writeLength);
		packet = device.read([0x00], this.readLength);

		return packet.slice(2, 2 + this.maxFanCount);
	}
	/**
	 * @param {FanId} fanId
	 */
	GetFanRPM(fanId){
		let packet = [0x00, this.commandIds.getFanRPM, fanId];
		ClearReadBuffer(1);

		device.write(packet, this.writeLength);
		packet = device.read([0x00], this.readLength);

		return (packet[2] << 8) + packet[3];
	}
	/**
	 * @param {FanId} fanId
	 * @param {number} percent
	 */
	SetFanPercent(fanId, percent){
		//device.log(`Setting Fan: ${fan} Percent to ${percent}.`)
		const packet = [0x00, this.commandIds.setfanSpeedPercentage, fanId, percent];

		device.write(packet, this.writeLength);
		//device.read([0x00], this.readLength, 1);
	}
	/**
	 * @param {FanId} fanId
	 * @param rpm
	 */
	SetFanRPM(fanId, rpm){
		const low = rpm & 0xFF;
		const high = rpm >> 8;
		//device.log(`Setting Fan: ${fanId+1} RPM.  high: ${high}, Low:${low}`);

		const packet = [0x00, this.commandIds.setFanRPM, fanId, high, low];

		device.write(packet, this.writeLength);
		//device.read([0x00], this.readLength, 1);
	}
	GetTempConfiguration(){
		let packet = [0x00, this.commandIds.getConnectedProbes];
		ClearReadBuffer(1);

		device.write(packet, this.writeLength);
		packet = device.read([0x00], this.readLength);

		return packet.slice(2, 2 + this.maxProbeCount);
	}

	GetTempSensorReading(sensorId){
		let packet = [0x00, this.commandIds.getTemperatureReading, sensorId];
		ClearReadBuffer(1);

		device.write(packet, this.writeLength);
		packet = device.read([0x00], this.readLength);

		let reading = (packet[2] << 8) + packet[3];

		if(reading === 0){
			device.log(`Failed to read temp sensor! retrying...`);
			packet = device.read([0x00], this.readLength);
			reading = (packet[2] << 8) + packet[3];
		}

		return reading;
	}
	GetTempSensorInCelsius(sensorId){
		const reading = this.GetTempSensorReading(sensorId);

		return reading / 100;
	}
}
const CorsairLightingController = new CorsairLightingControllerProtocol();

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/controllers/commander-pro.png";
}