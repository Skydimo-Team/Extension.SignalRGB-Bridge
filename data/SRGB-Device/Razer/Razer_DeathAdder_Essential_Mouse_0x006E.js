export function Name() { return "Razer Deathadder Essential"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x006E; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [3, 3]; }
export function Type() { return "Hid"; }
export function DefaultPosition() {return [225, 120]; }
export function DefaultScale(){return 15.0;}
export function DeviceType(){return "mouse";}
/* global
LightingMode:readonly
forcedColor:readonly
DpiControl:readonly
DPIRollover:readonly
OnboardDPI:readonly
dpiStages:readonly
dpi1:readonly
dpi2:readonly
dpi3:readonly
dpi4:readonly
dpi5:readonly
pollingRate:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"DpiControl", "group":"mouse", "label":"Enable Dpi Control", description: "SignalRGB will not attempt to set mouse settings like DPI and Polling Rate while this is disabled", "type":"boolean", "default":"false"},
		{"property":"DPIRollover", "group":"mouse", "label":"DPI Stage Rollover", description: "Allows DPI Stages to loop in a circle, going from last stage to first one on button press", "type":"boolean", "default": "false"},
		{"property":"OnboardDPI", "group":"mouse", "label":"Save DPI to Onboard Storage", description: "Saves the DPI settings to the device memory", "type":"boolean", "default": "false"},
		{"property":"dpiStages", "group":"mouse", "label":"Number of DPI Stages", description: "Sets the number of active DPI stages to cycle though", "step":"1", "type":"number", "min":"1", "max":"5", "default":"5"},
		{"property":"dpi1", "group":"mouse", "label":"DPI 1", "step":"50", "type":"number", "min":"200", "max":"6400", "default":"400"},
		{"property":"dpi2", "group":"mouse", "label":"DPI 2", "step":"50", "type":"number", "min":"200", "max":"6400", "default":"800"},
		{"property":"dpi3", "group":"mouse", "label":"DPI 3", "step":"50", "type":"number", "min":"200", "max":"6400", "default":"1200"},
		{"property":"dpi4", "group":"mouse", "label":"DPI 4", "step":"50", "type":"number", "min":"200", "max":"6400", "default":"1600"},
		{"property":"dpi5", "group":"mouse", "label":"DPI 5", "step":"50", "type":"number", "min":"200", "max":"6400", "default":"2000"},
		{"property":"pollingRate", "group":"mouse", "label":"Polling Rate", description: "Sets the Polling Rate of this device", "type":"combobox", "values":[ "1000", "500", "100" ], "default":"1000"},
	];
}

const transactionID = 0x1f;

export function LacksOnBoardLeds() {return true;}

export function onBrightnessChanged() {
	device.log(`Brightness is now set to: ${device.getBrightness()}`);
}

export function Initialize() {
	device.set_endpoint(0, 0x0002, 0x0001);

	getDeviceMode();
	getDeviceFirmwareVersion();
	getDeviceSerial();

	if(DpiControl) {
		DPIStageControl();
	}

	setDevicePollingRate();
}

export function Render() {
	setDeviceBrightness();
	detectInputs();
}

export function Shutdown() {
	setDeviceMode(0x00);
}

export function onDpiControlChanged() {
	if(DpiControl) {
		DPIStageControl();
	} else {
		setDeviceMode(0x00);
	}
}

export function ondpiStagesChanged() {
	if(DpiControl) {
		DPIStageControl();
	}
}

export function ondpi1Changed() {
	if(DpiControl) {
		DPIStageControl(true, 1);
	}
}

export function ondpi2Changed() {
	if(DpiControl) {
		DPIStageControl(true, 2);
	}
}

export function ondpi3Changed() {
	if(DpiControl) {
		DPIStageControl(true, 3);
	}
}

export function ondpi4Changed() {
	if(DpiControl) {
		DPIStageControl(true, 4);
	}
}

export function ondpi5Changed() {
	if(DpiControl) {
		DPIStageControl(true, 5);
	}
}

export function onOnboardDPIChanged() {
	getDeviceMode();
	DPIStageControl();
}

export function onpollingRateChanged() {
	setDevicePollingRate();
}

function packetSend(packet, length) //Wrapper for always including our CRC
{
	const packetToSend = packet;
	packetToSend[89] = CalculateCrc(packet);
	device.send_report(packetToSend, length);
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function getDeviceMode() {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x00, 0x84];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);

	const deviceMode = returnpacket[9];
	device.log("Current Device Mode: " + deviceMode);

	if(OnboardDPI && deviceMode !== 0x00) {
		setDeviceMode(0x00);
	} else if(OnboardDPI === false) {
		setDeviceMode(0x03);
	}
}

function setDeviceMode(mode) {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x00, 0x04, mode];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);
}

function getDeviceSerial() {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x16, 0x00, 0x82];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);
	device.log(returnpacket);
}

function getDeviceFirmwareVersion() {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x02, 0x00, 0x81];
	packetSend(packet, 91);

	let returnpacket = device.get_report(packet, 91);
	returnpacket = device.get_report(packet, 91);

	const FirmwareByte1 = returnpacket[9];
	const FirmwareByte2 = returnpacket[10];
	device.log("Firmware Version: " + FirmwareByte1 + "." + FirmwareByte2);
}

function setDevicePollingRate() {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x01, 0x00, 0x05, 1000/pollingRate];
	packetSend(packet, 91);
}

function setDeviceBrightness() {
	const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x03, 0x0f, 0x04, 0x01, 0x00, device.getBrightness()];
	packetSend(packet, 91);
}

const DPIStageDict =
{
	1:  function(){ return dpi1; },
	2:  function(){ return dpi2; },
	3:  function(){ return dpi3; },
	4:  function(){ return dpi4; },
	5:  function(){ return dpi5; }
};

let DPIStage = 1;

function DPIStageControl(override, stage) {
	if(override === true) {
		DPIStage = stage;
	}

	if(DPIStage > dpiStages) {
		DPIStage = (DPIRollover ? 1 : dpiStages);
	}

	if(DPIStage < 1) {
		DPIStage = (DPIRollover ? dpiStages : 1);
	}

	if(DpiControl) {
		OnboardDPI ? setDeviceDPI(DPIStage) : setDeviceSoftwareDPI(DPIStageDict[DPIStage]());
	}

	device.log(DPIStage);

}

function setDeviceSoftwareDPI(dpi) {
	const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x07, 0x04, 0x05, 0x00, Math.floor(dpi/256), dpi%256, Math.floor(dpi/256), dpi%256];
	packetSend(packet, 91);
}

function setDeviceDPI(stage) {
	const packet = [0x00, 0x00, transactionID, 0x00, 0x00, 0x00, 0x26, 0x04, 0x06, 0x01, stage, dpiStages, 0x00];

	packet[13] = Math.floor(dpi1/256);
	packet[14] = dpi1%256;
	packet[15] = Math.floor(dpi1/256);
	packet[16] = dpi1%256;
	packet[17] = 0x00;
	packet[18] = 0x00;
	packet[19] = 0x01;
	packet[20] = Math.floor(dpi2/256);
	packet[21] = dpi2%256;
	packet[22] = Math.floor(dpi2/256);
	packet[23] = dpi2%256;
	packet[24] = 0x00;
	packet[25] = 0x00;
	packet[26] = 0x02;
	packet[27] = Math.floor(dpi3/256);
	packet[28] = dpi3%256;
	packet[29] = Math.floor(dpi3/256);
	packet[30] = dpi3%256;
	packet[31] = 0x00;
	packet[32] = 0x00;
	packet[33] = 0x03;
	packet[34] = Math.floor(dpi4/256);
	packet[35] = dpi4%256;
	packet[36] = Math.floor(dpi4/256);
	packet[37] = dpi4%256;
	packet[38] = 0x00;
	packet[39] = 0x00;
	packet[40] = 0x04;
	packet[41] = Math.floor(dpi5/256);
	packet[42] = dpi5%256;
	packet[43] = Math.floor(dpi5/256);
	packet[44] = dpi5%256;

	packetSend(packet, 91);
	device.pause(50);
}

function detectInputs() {
	device.set_endpoint(1, 0x0000, 0x0001);

	const packet = device.read([0x00], 16);
	processInputs(packet);
	device.set_endpoint(0, 0x0002, 0x0001);
}

function processInputs(packet) {
	if(packet[0] === 0x04 && packet[1] === 0x20) {
		device.log("DPI Up");
		device.set_endpoint(0, 0x0002, 0x0001);
		DPIStage++;
		DPIStageControl();
	}

	if(packet[0] === 0x04 && packet[1] === 0x21) {
		device.log("DPI Down");
		device.set_endpoint(0, 0x0002, 0x0001);
		DPIStage--;
		DPIStageControl();
	}
}

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage === 0x0002 || endpoint.interface === 1 && endpoint.usage === 0x0000;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/mice/deathadder-essential.png";
}