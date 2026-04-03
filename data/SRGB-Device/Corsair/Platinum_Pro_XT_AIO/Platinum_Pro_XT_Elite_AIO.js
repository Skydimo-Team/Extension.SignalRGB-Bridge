export function Name() { return "Corsair Platinum/Pro XT/Elite Cooler"; }
export function VendorId() { return  0x1b1c; }
export function ProductId() { return Object.keys(PlatCooler.PIDLibrary); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [5, 5]; }
export function DefaultPosition(){return [165, 60];}
export function DefaultScale(){return 6.0;}
export function DeviceType(){return "aio";}

/* global
LightingMode:readonly
shutdownColor:readonly
forcedColor:readonly
fanProfile:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"fanProfile",  "group":"", "label":"Pump Mode", description: "Sets the pump cooling mode", "type":"combobox", "values":["Quiet", "Balanced", "Extreme"], "default":"Balanced"},
	];
}
export function DefaultComponentBrand() { return "Corsair";}
export function Documentation(){ return "troubleshooting/corsair"; }
// Use the CorsairLink mutex any time this device is rendering.
// if we don't our reads may be ruined by other programs
export function UsesCorsairMutex(){ return true;}
export function SupportsFanControl(){ return true; }
const ConnectedFans = [];
const ConnectedProbes = [];
const DeviceMaxLedLimit = 32;

//Channel Name, Led Limit
const ChannelArray = [
	["Channel 1", 32],
];

function SetupChannels(){
	device.SetLedLimit(DeviceMaxLedLimit);

	for(let i = 0; i < ChannelArray.length; i++){
		device.addChannel(ChannelArray[i][0], ChannelArray[i][1]);
	}
}

export function LedNames() {
	return PlatCooler.getvLedNames();
}

export function LedPositions() {
	return PlatCooler.getvLedPositions();
}

export function Initialize() {
	SetupChannels();

	device.clearReadBuffer();
	PlatCooler.findSequence();
	PlatCooler.fetchLibrarySetup();
	PlatCooler.EnableSoftwareControl();
	burstFanTimer = Date.now(); //reset the Burst Fan Timer.
	burstFans(true); //send burst packet.
}

export function Render() {
	if (!PlatCooler.getFansInitialized()) {
		burstFans();

		return;
	}

	sendColors();
	PollFans();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

export function onfanProfileChanged() {
	if(device.fanControlDisabled()){
		PlatCooler.sendCoolingProfile(PlatCooler.coolingProfiles[fanProfile]);
	} // This catches the fanMode prop not being present.
}

let savedPollFanTimer = Date.now();
let burstFanTimer = Date.now();
const PollModeInternal = 3000;

function burstFans(firstRun = false) {
	if(device.fanControlDisabled()){
		PlatCooler.setFansInitialized(true); //Makes it so that non-pro users can y'know use the aio with Signal.

		return;
	}

	if(firstRun) { //Only send this command once. No need to abuse the device.
		device.log("Bursting Fans!");
		PlatCooler.sendCoolingPacket(PlatCooler.deviceFanModes.fixedPWMWithFallback, 0xff, PlatCooler.deviceFanModes.fixedPWMWithFallback, 0xff, PlatCooler.coolingModes.balanced, true);
		PlatCooler.sendCoolingPacket(PlatCooler.deviceFanModes.fixedPWMWithFallback, 0xff, PlatCooler.deviceFanModes.fixedPWMWithFallback, 0xff, PlatCooler.coolingModes.balanced);
	}

	if(Date.now() - burstFanTimer > 15000) {
		PlatCooler.setFansInitialized(true);
	}
}

function PollFans() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	const fanData = PlatCooler.getCoolingInfo(); //Why are we doing this you may ask? Because if I don't send a packet every like 10 seconds the cooler just nopes out.
	const liquidTemp = fanData[8];

	if(device.fanControlDisabled()){
		return;
	} // This catches the fanMode prop not being present.

	if(!ConnectedProbes.includes(0)){
		ConnectedProbes.push(0);
		device.createTemperatureSensor(`Liquid Temperature`);
	}

	if(liquidTemp !== 0) {
		device.SetTemperature(`Liquid Temperature`, liquidTemp);
	}

	const fanOutputData = [];


	for(let fan = 0; fan < PlatCooler.getNumberOfFans(); fan++) {
		const offset = 2* fan + 1;
		const rpm = fanData[offset];
		device.log(`Fan ${fan}: ${rpm}rpm`);

		if(rpm > 0 && !ConnectedFans.includes(`Fan ${fan}`)) {
			ConnectedFans.push(`Fan ${fan}`);
			device.createFanControl(`Fan ${fan}`);
		}

		if(ConnectedFans.includes(`Fan ${fan}`)) {
			device.setRPM(`Fan ${fan}`, rpm);

			const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
			fanOutputData.push(newSpeed);
		}
	}

	if(PlatCooler.getNumberOfFans() === 3) {
		PlatCooler.sendCoolingPacket(PlatCooler.deviceFanModes.fixedPWMWithFallback, Math.round(fanOutputData[2] /100 * 255), 0x00, 0x00, PlatCooler.coolingModes[fanProfile], true);
	}

	PlatCooler.sendCoolingPacket(PlatCooler.deviceFanModes.fixedPWMWithFallback, Math.round(fanOutputData[0] /100 * 255), PlatCooler.deviceFanModes.fixedPWMWithFallback, Math.round(fanOutputData[1] * 255 / 100), PlatCooler.coolingModes[fanProfile]);
}

let lastLoopRGBData = [];

function CompareArrays(array1, array2) {
	return array1.length === array2.length &&
    array1.every(function(value, index) { return value === array2[index];});
}

function sendColors(overrideColor) {
	let RGBdata = [];
	let TotalLedCount = 0;
	const vLedPositions = PlatCooler.getvLedPositions();
	const vLedIndexes = PlatCooler.getvLedIndexes();

	//Pump

	for(let iIdx = 0; iIdx < vLedIndexes.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];
		let col;

		if (overrideColor) {
			col = hexToRgb(overrideColor);
		}else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else{
			col = device.color(iPxX, iPxY);
		}

		RGBdata[vLedIndexes[iIdx]*3] = col[2];
		RGBdata[vLedIndexes[iIdx]*3+1] = col[1];
		RGBdata[vLedIndexes[iIdx]*3+2] = col[0];
		TotalLedCount += 1;
	}

	//Fans
	let ChannelLedCount = device.channel(ChannelArray[0][0]).LedCount();
	const componentChannel = device.channel(ChannelArray[0][0]);

	let ColorData = [];

	if(overrideColor) {
		ColorData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", "BGR");
	} else if(LightingMode === "Forced"){
		ColorData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "BGR");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 32;

		const pulseColor = device.getChannelPulseColor(ChannelArray[0][0]);
		ColorData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "BGR");

	}else{
		ColorData = device.channel(ChannelArray[0][0]).getColors("Inline", "BGR");
	}

	RGBdata = RGBdata.concat(ColorData);
	TotalLedCount += ChannelLedCount;

	if (!CompareArrays(lastLoopRGBData, RGBdata)) {
		lastLoopRGBData = RGBdata;

		PlatCooler.SendColorPacket(0b100, RGBdata.slice(0, 60));

		if (TotalLedCount > 20) {
			PlatCooler.SendColorPacket(0b101, RGBdata.slice(60, 120));
		}

		if (TotalLedCount > 40) {
			PlatCooler.SendColorPacket(0b110, RGBdata.slice(120, 180));
		}
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

export function Validate(endpoint) {
	return endpoint.interface === -1 || endpoint.interface === 0;
}

class RollingAverageCalculator {
	constructor(windowSize, defaultAverage) {
		this._windowSize = windowSize;
		this._sum = 0;
		this._values = Array.from({ length: windowSize }, () => defaultAverage);

		for (let i = 0; i < this._windowSize; i++) {
			this._sum += defaultAverage;
		}
	}

	update(newValue) {
		if (this._values.length === this._windowSize) {
			const removedValue = this._values.shift();
			this._sum -= removedValue;
		}

		this._values.push(newValue);
		this._sum += newValue;

		return this._sum / this._values.length;
	}
}

class DeviceMetrics {
	constructor(defaultWriteDelayAverage) {
		this._writeDelayRollingAverageCalculator = new RollingAverageCalculator(30, defaultWriteDelayAverage);
		this._writeStart = 0;
	}

	writeStart() {
		this._writeStart = new Date().getTime();
	}

	writeEnd() {
		const now = new Date().getTime();
		const result = now - this._writeStart;

		return ( Math.floor(this._writeDelayRollingAverageCalculator.update(result)) + 1 );
	}
}

class PlatinumProtocol {
	constructor() {

		this.PIDLibrary = {
			0x0C15 : "H100I Platinum",
			0x0C18 : "H100I Platinum",
			0x0C19 : "H100I Platinum SE",
			0x0C17 : "H115I Platinum",
			//0x0C13 : "H115I Platinum", // 1st gen Old RAWUSB
			//0x0C12 : "H150I Platinum", // 1st gen Old RAWUSB

			0x0C29 : "H60I Pro XT",
			0x0C20 : "H100I Pro XT",
			0x0C2D : "H100I Pro XT",
			0x0C21 : "H115I Pro XT",
			0x0C2E : "H115I Pro XT",
			0x0C2F : "H150I Pro XT",
			0x0C22 : "H150I Pro XT",

			0x0C35 : "H100I RGB Elite",
			0x0C40 : "H100I RGB Elite",
			0x0C36 : "H115I RGB Elite",
			0x0C37 : "H150I RGB Elite",
			0x0C41 : "H150I RGB Elite" // White Edition
		};

		this.deviceLibrary = {
			"H60I Pro XT" : {
				name: "H60I Pro XT",
				numberOfFans : 1,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/pro-xt.png"
			},
			"H100I Platinum" : {
				name: "H100I Platinum",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/platinum.png"
			},
			"H100I Platinum SE" : {
				name: "H100I Platinum SE",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/platinum-se.png"
			},
			"H115I Platinum" : {
				name: "H115I Platinum",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/platinum.png"
			},
			"H150I Platinum" : {
				name: "H150I Platinum",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/platinum.png"
			},
			"H100I RGB Elite" : {
				name: "H100I RGB Elite",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/rgb-elite.png"
			},
			"H100I Pro XT" : {
				name: "H100I Pro XT",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/pro-xt.png"
			},
			"H115I Pro XT" : {
				name: "H115I Pro XT",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/pro-xt.png"
			},
			"H115I RGB Elite" : {
				name: "H115I RGB Elite",
				numberOfFans : 2,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					  "Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/rgb-elite.png"
			},
			"H150I Pro XT" : {
				name: "H150I Pro XT",
				numberOfFans : 3,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					      	"Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/pro-xt.png"
			},
			"H150I RGB Elite" : {
				name: "H150I RGB Elite",
				numberOfFans : 3,
				vLedNames : [
					"Ring 1", "Ring 2", "Ring 3",
					"Ring 4",           "Logo 1",           "Ring 5",
					"Ring 6",  "Logo 2",       "Logo 3",    "Ring 7",
					"Ring 8",  			"Logo 4",			"Ring 9",
					      	"Ring 10", "Ring 11", "Ring 12"
				],
				vLedPositions : [
					[1, 0], [2, 0], [3, 0],
					[0, 1],         [2, 1],          [4, 1],
					[0, 2], [1, 2],         [3, 2],  [4, 2],
					[0, 3],         [2, 3],          [4, 3],
					[1, 4], [2, 4], [3, 4]
				],
				vLedIndexes : [
					10,  11,  12,
					9,      0,       13,
					8,    3,   1,    14,
					7,      2,       15,
					6,  5,  4,
				],
				size: [5, 5],
				image: "https://assets.signalrgb.com/devices/brands/corsair/aio/rgb-elite.png"
			}
		};

		this.deviceFanModes = {
			defaultLiquidTemp : 0x00,
			defaultExternalProbe : 0x01,
			fixedPWM : 0x02,
			fixedPWMWithFallback : 0x03,
			fixedRPM : 0x04,
			fixedRPMWithFallback : 0x05,
			defaultCPUTempLiquid : 0x06,
			defaultCPUTempExternalProbe : 0x07,
			null : 0xff,
			0x00 : "Default Liquid Temp Probe",
			0x01 : "Default External Probe",
			0x02 : "Fixed PWM",
			0x03 : "Fixed PWM With Safety Fallback",
			0x04 : "Fixed RPM",
			0x05 : "Fixed RPM With Safety Fallback",
			0x06 : "Default CPU/GPU + Liquid Temp Probe",
			0x07 : "Default CPU/GPU + External Temp Probe"
		};

		this.settingsType = {
			undefined : 0x00,
			watchdog : 0x01,
			pump : 0x02,
			fan : 0x03,
			fanSafetyProfile : 0x08,
			saveToFlash : 0x10
		};

		this.packetStatusCodes = {
			success : 0x00,
			tempFail : 0x01,
			tumpFail : 0x02,
			savingSettings : 0x08,
			sequenceError : 0x10,
			crcError : 0x20,
			cipherError : 0x40,
			0x00 : "Success",
			0x01 : "Temperature Failure",
			0x02 : "Pump Failure",
			0x08 : "Saving Settings",
			0x10 : "Sequence Error", //Ergo you screwed up the sequence system
			0x20 : "CRC Error",
			0x40 : "Cipher Error"
		};

		this.coolingModes = {
			"Quiet" : 0x00,
			"Balanced" : 0x01,
			"Extreme" : 0x02,
			0x00 : "Quiet",
			0x01 : "Balanced",
			0x02 : "Extreme/Performance"
		};

		this.responseTypes = {
			deviceName : 0x00,
			firmwareVersion : 0x01,
			failsafeState : 0x02,
			temp : 0x03,
			pumpMode : 0x04,
			pumpPower : 0x05,
			pumpSpeed : 0x06,
			fanMode : 0x07,
			fanPower : 0x08,
			fanSpeed : 0x09,
			firmwarePercent : 0x0A,
			firmwareError : 0x0B,
			led : 0x0C,
			cujoGPUStatus : 0x0D,
			model : 0x0E,
			notifyLongRunningTask : 0x0F,
			switchToHardwareModeComplete : 0x10
		};

		this.coolingProfiles = {
			"Balanced" : [0x01, 0xFF, 0xFF, 0x00, 0x00, 0xFF, 0x07, 0x1D, 0x33, 0x1E, 0x40, 0x1F, 0x4D, 0x20, 0x73, 0x21, 0xAD, 0x22, 0xD9, 0x23, 0xFF, 0x1D, 0x33, 0x1E, 0x40, 0x1F, 0x4D, 0x20, 0x73, 0x21, 0xAD, 0x22, 0xD9, 0x23, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x5F],
			"Extreme"  : [0x02, 0xFF, 0xFF, 0x00, 0x00, 0xFF, 0x07, 0x1C, 0x4D, 0x1D, 0x59, 0x1E, 0x80, 0x1F, 0xB3, 0x20, 0xCC, 0x21, 0xE6, 0x22, 0xFF, 0x1C, 0x4D, 0x1D, 0x59, 0x1E, 0x80, 0x1F, 0xB3, 0x20, 0xCC, 0x21, 0xE6, 0x22, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
			"Quiet"    : [0x00, 0xFF, 0xFF, 0x00, 0x00, 0xFF, 0x07, 0x1E, 0x33, 0x20, 0x40, 0x23, 0x73, 0x25, 0xA1, 0x27, 0xB8, 0x29, 0xCF, 0x2A, 0xFF, 0x1E, 0x33, 0x20, 0x40, 0x23, 0x73, 0x25, 0xA1, 0x27, 0xB8, 0x29, 0xCF, 0x2A, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x03] //These are all of the profile points for temp.
		};

		this.config = {
			numberOfFans : 0,
			vLedNames : [],
			vLedPositions : [],
			vLedIndexes : [],
			deviceSize : [0, 0],
			seq : 8,
			fansInitialized : false,
		};

		this.crcTable = [ 0, 7, 14, 9, 28, 27, 18, 21, 56, 63, 54, 49, 36, 35, 42, 45, 112, 119, 126, 121, 108, 107, 98, 101, 72, 79, 70, 65, 84, 83, 90, 93, 224, 231, 238, 233, 252, 251, 242, 245, 216, 223, 214, 209, 196, 195, 202, 205, 144, 151, 158, 153, 140, 139, 130, 133, 168, 175, 166, 161, 180, 179, 186, 189, 199, 192, 201, 206, 219, 220, 213, 210, 255, 248, 241, 246, 227, 228, 237, 234, 183, 176, 185, 190, 171, 172, 165, 162, 143, 136, 129, 134, 147, 148, 157, 154, 39, 32, 41, 46, 59, 60, 53, 50, 31, 24, 17, 22, 3, 4, 13, 10, 87, 80, 89, 94, 75, 76, 69, 66, 111, 104, 97, 102, 115, 116, 125, 122, 137, 142, 135, 128, 149, 146, 155, 156, 177, 182, 191, 184, 173, 170, 163, 164, 249, 254, 247, 240, 229, 226, 235, 236, 193, 198, 207, 200, 221, 218, 211, 212, 105, 110, 103, 96, 117, 114, 123, 124, 81, 86, 95, 88, 77, 74, 67, 68, 25, 30, 23, 16, 5, 2, 11, 12, 33, 38, 47, 40, 61, 58, 51, 52, 78, 73, 64, 71, 82, 85, 92, 91, 118, 113, 120, 127, 106, 109, 100, 99, 62, 57, 48, 55, 34, 37, 44, 43, 6, 1, 8, 15, 26, 29, 20, 19, 174, 169, 160, 167, 178, 181, 188, 187, 150, 145, 152, 159, 138, 141, 132, 131, 222, 217, 208, 215, 194, 197, 204, 203, 230, 225, 232, 239, 250, 253, 244, 243 ];
		//we love CRC's

		this.deviceMetrics = new DeviceMetrics(60);
	}

	getDeviceName() { return this.config.name; }
	setDeviceName(name) { this.config.name = name; }

	getNumberOfFans() { return this.config.numberOfFans; }
	setNumberOfFans(numberOfFans) { this.config.numberOfFans = numberOfFans; }

	getvLedNames() { return this.config.vLedNames; }
	setvLedNames(vLedNames) { this.config.vLedNames = vLedNames; }

	getvLedPositions() { return this.config.vLedPositions; }
	setvLedPositions(vLedPositions) { this.config.vLedPositions = vLedPositions; }

	getvLedIndexes() { return this.config.vLedIndexes; }
	setvLedIndexes(vLedIndexes) { this.config.vLedIndexes = vLedIndexes; }

	getSize() { return this.config.deviceSize; }
	setSize(deviceSize) { this.config.deviceSize = deviceSize; }

	getDeviceImage() { return this.config.image; }
	setDeviceImage(image) { this.config.image = image; }

	getFansInitialized() { return this.config.fansInitialized; }
	setFansInitialized(fansInitialized) { this.config.fansInitialized = fansInitialized; }

	fetchLibrarySetup() {
		const library = this.deviceLibrary[this.PIDLibrary[device.productId()]];
		this.setDeviceName(library.name);
		this.setvLedNames(library.vLedNames);
		this.setvLedPositions(library.vLedPositions);
		this.setvLedIndexes(library.vLedIndexes);
		this.setNumberOfFans(library.numberOfFans);
		this.setSize(library.size);
		this.setDeviceImage(library.image);

		device.setControllableLeds(this.config.vLedNames, this.config.vLedPositions);
		device.setSize(this.getSize());
		device.setName(this.getDeviceName());
		device.setImageFromUrl(this.getDeviceImage());
	}

	calculateCRC(data, start, end) {
		let crcResult = 0;

		for(let index = start; index <= end; index++) {
			crcResult = this.crcTable[crcResult ^ data[index]];
		}

		return crcResult;
	}

	getPacketSequence() {
		this.config.seq += 8;

		if(this.config.seq === 256) {
			this.config.seq = 8;
		}

		return this.config.seq;
	}

	// EvanMulawski
	writeToDevice(packet) {
		device.clearReadBuffer();
		this.deviceMetrics.writeStart();

		try {
			device.write(packet, 65);

			// not sure why the write is 1-2ms - should be about 12-15ms
			const delay = this.deviceMetrics.writeEnd();
			//device.log(`Write Delay: ${delay} ms`);
			device.pause(Math.max(10, delay));
		} catch (error) {
			this.deviceMetrics.writeEnd();
			throw error;
		}
	}

	sendPacketWithResponse(packet, callingFunction) {
		packet[64] = this.calculateCRC(packet, 2, 63);
		this.writeToDevice(packet);

		// const returnPacket = device.read(packet, 65);

		// if (returnPacket[5] !== 0) {
		//   device.log(
		//     `Device Status: ${
		//       this.packetStatusCodes[returnPacket[5]]
		//     } from ${callingFunction}`
		//   );
		//   //device.clearReadBuffer();
		//   //device.pause(50);
		// }
	}

	findSequence() {
		let attempts = 0;
		let errorCode = this.fetchDeviceInfo();

		while(errorCode !== 0 && attempts < 10) {
			errorCode = this.fetchDeviceInfo();
			attempts++;
		}

		if(attempts < 32) {
			device.log("Successfully Found Device Sequence!", {toFile : true});
		} else { device.log("Failed to find Device Sequence.", {toFile : true}); }
	}

	fetchDeviceInfo() {
		const packet = [0x00, 0x3f, this.getPacketSequence(), 0xff, 0x00];
		packet[64] = this.calculateCRC(packet, 2, 63);

		device.write(packet, 65);

		const returnPacket = device.read(packet, 65);

		device.log(`Device Firmware Version: ${returnPacket[3] >> 4}.0${returnPacket[3] & 0xf}.${returnPacket[4] & 15}`);
		device.log(`Device Status: ${this.packetStatusCodes[returnPacket[5]]}`);
		device.log(`Packet Count: ${returnPacket[6]}`);
		device.log(`Packet Countdown Timeout: ${returnPacket[7]}`);
		device.log(`Liquid Temp: ${((BinaryUtils.ReadInt16LittleEndian([returnPacket[8], returnPacket[9]]) / 25.6 + 0.5) / 10).toFixed(2)} C`);
		device.log(`Fan 1 Index: ${returnPacket[10]}`);
		device.log(`Fan 1 Mode: ${this.deviceFanModes[returnPacket[11]]}`);
		device.log(`Fan 1 Set Duty: ${(returnPacket[12] / 255 * 100).toFixed(2)}%`);
		device.log(`Fan 1 Set RPM: ${returnPacket[13] + (returnPacket[14] << 8)}`);
		device.log(`Fan 1 Duty: ${(returnPacket[15] / 255 * 100).toFixed(2)}%`);
		device.log(`Fan 1 RPM: ${returnPacket[16] + (returnPacket[17] << 8)}`);
		device.log(`Fan 2 Index: ${returnPacket[17]}`);
		device.log(`Fan 2 Mode: ${this.deviceFanModes[returnPacket[18]]}`);
		device.log(`Fan 2 Set Duty: ${(returnPacket[19] / 255 * 100).toFixed(2)}%`);
		device.log(`Fan 2 Set RPM: ${returnPacket[20] + (returnPacket[21] << 8)}`);
		device.log(`Fan 2 Duty: ${(returnPacket[22] / 255 * 100).toFixed(2)}%`);
		device.log(`Fan 2 RPM: ${returnPacket[23] + (returnPacket[24] << 8)}`);
		device.log(`Pump Mode: ${this.coolingModes[returnPacket[25]]}`);
		device.log(`Pump Set Duty: ${(returnPacket[26] / 255 * 100).toFixed(2)}%`);
		device.log(`Pump Set RPM: ${returnPacket[27] + (returnPacket[28] << 8)}`);
		device.log(`Pump Duty: ${(returnPacket[29] / 255 * 100).toFixed(2)}%`);
		device.log(`Pump RPM: ${returnPacket[30] + (returnPacket[31] << 8)}`);
		device.log(`Fan 3 Index: ${returnPacket[38]}`);
		device.log(`Fan 3 Mode: ${this.deviceFanModes[returnPacket[39]]}`);
		device.log(`Fan 3 Set Duty: ${(returnPacket[40] / 255 * 100).toFixed(2)}%`);
		device.log(`Fan 3 Set RPM: ${returnPacket[41] + (returnPacket[42] << 8)}`);
		device.log(`Fan 3 Duty: ${(returnPacket[43] / 255 * 100).toFixed(2)}%`);
		device.log(`Fan 3 RPM: ${returnPacket[44] + (returnPacket[45] << 8)}`);
		device.log(`Device go Boom State: ${returnPacket[63]}`);

		return returnPacket[5];
	}

	getCoolingInfo() {
		const packet = [0x00, 0x3f, this.getPacketSequence(), 0xff, 0x00];
		packet[64] = this.calculateCRC(packet, 2, 63);

		device.write(packet, 65);

		const returnPacket = device.read(packet, 65);
		const fan1Duty = (returnPacket[15] / 255 * 100).toFixed(2);
		const fan1RPM = returnPacket[16] + (returnPacket[17] << 8);
		const fan2Duty = (returnPacket[22] / 255 * 100).toFixed(2);
		const fan2RPM = returnPacket[23] + (returnPacket[24] << 8);
		const fan3Duty = (returnPacket[43] / 255 * 100).toFixed(2);
		const fan3RPM = returnPacket[44] + (returnPacket[45] << 8);
		const pumpMode = this.coolingModes[returnPacket[25]];
		const pumpRPM = returnPacket[30] + (returnPacket[31] << 8);
		const liquidTemp = ((BinaryUtils.ReadInt16LittleEndian([returnPacket[8], returnPacket[9]]) / 25.6 + 0.5) / 10).toFixed(2);
		device.log(`Device Status: ${this.packetStatusCodes[returnPacket[5]]}`);
		device.log(`Liquid Temp: ${liquidTemp} C`);

		device.log(`Fan 1 Duty: ${fan1Duty}%`);
		device.log(`Fan 1 RPM: ${fan1RPM}`);

		if(PlatCooler.getNumberOfFans() > 1) {

			device.log(`Fan 2 Duty: ${fan2Duty}%`);
			device.log(`Fan 2 RPM: ${fan2RPM}`);

			if(PlatCooler.getNumberOfFans() > 2) {

				device.log(`Fan 3 Duty: ${fan3Duty}%`);
				device.log(`Fan 3 RPM: ${fan3RPM}`);

			}
		}

		device.log(`Pump Mode: ${pumpMode}`);
		device.log(`Pump RPM: ${pumpRPM}`);

		return [fan1Duty, fan1RPM, fan2Duty, fan2RPM, fan3Duty, fan3RPM, pumpMode, pumpRPM, liquidTemp];
	}

	sendCoolingProfile(profileData){
		const packet = [0x00, 0x3F, this.getPacketSequence(), 0x14, 0x00, 0xFF, 0x05, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00].concat(profileData);

		this.sendPacketWithResponse(packet, "Cooling Profile Set");
	}

	SendColorPacket(command, data){
		const packet = [0x00, 0x3F, this.getPacketSequence() | command].concat(data);
		this.sendPacketWithResponse(packet, "Color Packet");
	}

	sendCoolingPacket(fan1Mode, fan1Duty, fan2Mode, fan2Duty, pumpMode, fan3 = false) {
		if(fan3) {
			const packetFill = new Array(65).fill(0xff);
			const packet = [0x00, 0x3F, this.getPacketSequence() | 0b011, 0x14, 0x00, 0xFF, 0x05, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, fan1Mode, 0x00, 0x00, 0x00, 0x00, fan1Duty].concat(packetFill);
			this.sendPacketWithResponse(packet, "3rd Fan Cooling Packet");
		} else {
			const packetFill = new Array(65).fill(0xff);

			const packet = [0x00, 0x3F, this.getPacketSequence() | 0b000, 0x14, 0x00, 0xFF, 0x05, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, fan1Mode, 0x00, 0x00, 0x00, 0x00, fan1Duty, fan2Mode, 0x00, 0x00, 0x00, 0x00, fan2Duty, pumpMode, 0xff, 0xff, 0x00, 0x00].concat(packetFill);
			packet[30] = 0x07;
			this.sendPacketWithResponse(packet, "Cooling Packet");
		}

	}

	EnableSoftwareControl() {
		this.SendColorPacket(0b001,
			[ 0x01, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F, 0x7F, 0x7F, 0x7F, 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0xFF,
				0xFF, 0xFF, 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
				0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
		this.SendColorPacket(0b010,
			[ 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A,
				0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
				0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
		this.SendColorPacket(0b011,
			[ 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F, 0x40, 0x41, 0x42,
				0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
				0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
	}
}

const PlatCooler = new PlatinumProtocol();

class BinaryUtils {
	static WriteInt16LittleEndian(value) {
		return [value & 0xFF, (value >> 8) & 0xFF];
	}
	static WriteInt16BigEndian(value) {
		return this.WriteInt16LittleEndian(value).reverse();
	}
	static ReadInt16LittleEndian(array) {
		return (array[0] & 0xFF) | (array[1] & 0xFF) << 8;
	}
	static ReadInt16BigEndian(array) {
		return this.ReadInt16LittleEndian(array.slice(0, 2).reverse());
	}
	static ReadInt32LittleEndian(array) {
		return (array[0] & 0xFF) | ((array[1] << 8) & 0xFF00) | ((array[2] << 16) & 0xFF0000) | ((array[3] << 24) & 0xFF000000);
	}
	static ReadInt32BigEndian(array) {
		if (array.length < 4) {
			array.push(...new Array(4 - array.length).fill(0));
		}

		return this.ReadInt32LittleEndian(array.slice(0, 4).reverse());
	}
	static WriteInt32LittleEndian(value) {
		return [value & 0xFF, ((value >> 8) & 0xFF), ((value >> 16) & 0xFF), ((value >> 24) & 0xFF)];
	}
	static WriteInt32BigEndian(value) {
		return this.WriteInt32LittleEndian(value).reverse();
	}
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/corsair/aio/platinum.png";
}
