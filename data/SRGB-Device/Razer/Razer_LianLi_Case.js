export function Name() { return "Razer Lian Li Case"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x0f13; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function DeviceType(){return "case"}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vLedNames = [ ]; //Yay Subdevices!
const vLedPositions = [ ]; //Yay Subdevices!

const Left_Bar =
{
	positioning :
	[
		[16, 0], [12, 0], [8, 0], [4, 0], [0, 0], [17, 0], [13, 0], [9, 0], [5, 0], [1, 0], [18, 0], [14, 0],
		[10, 0], [6, 0], [2, 0], [19, 0], [15, 0], [11, 0], [7, 0], [3, 0]
	],
	names :
	[
		"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20"
	],
	displayName: "LianLi O11 D Razer Edition Left Bar",
	ledCount : 20,
	width: 20,
	height: 2,
	image: ImageUrl()
};

const Right_Bar =
{
	positioning :
	[
		[16, 0], [12, 0], [8, 0], [4, 0], [0, 0], [17, 0], [13, 0], [9, 0], [5, 0], [1, 0], [18, 0], [14, 0],
		[10, 0], [6, 0], [2, 0], [19, 0], [15, 0], [11, 0], [7, 0], [3, 0]
	],
	names :
	[
		"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20"
	],
	displayName: "LianLi O11 D Razer Edition Right Bar",
	ledCount : 20,
	width: 20,
	height: 2,
	image: ImageUrl()
};

const Front_Panel =
{
	positioning :
	[
		[0, 20], [0, 16], [0, 12], [0, 8], [0, 4], [0, 0], [0, 21], [0, 17], [0, 13], [0, 9], [0, 5], [0, 1],
		[0, 22], [0, 18], [0, 14], [0, 10], [0, 6], [0, 2], [0, 23], [0, 19], [0, 15], [0, 11], [0, 7], [0, 3]
	],
	names :
	[
		"Led 1", "Led 2", "Led 3", "Led 4", "Led 5", "Led 6", "Led 7", "Led 8", "Led 9", "Led 10", "Led 11", "Led 12", "Led 13", "Led 14", "Led 15", "Led 16", "Led 17", "Led 18", "Led 19", "Led 20", "Led 21", "Led 22", "Led 23", "Led 24"
	],
	displayName: "LianLi O11 D Razer Edition Front Panel",
	ledCount : 24,
	width: 2,
	height: 24,
	image: ImageUrl()
};

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}


export function SubdeviceController() { return true; }
export function Initialize() {
	Razer.getDeviceTransactionID();
	Razer.getDeviceInfo();
	createSubdevices();

}

export function Render() {
	grabLighting();
}


export function Shutdown() {
	grabLighting(true);
}

function createSubdevices() {
	device.createSubdevice("LeftBar");
	device.setSubdeviceName("LeftBar", `${Left_Bar.displayName}`);
	device.setSubdeviceImageUrl("LeftBar", Left_Bar.image);
	device.setSubdeviceSize("LeftBar", Left_Bar.width, Left_Bar.height);
	device.setSubdeviceLeds("LeftBar", Left_Bar.names, Left_Bar.positioning);

	device.createSubdevice("RightBar");
	device.setSubdeviceName("RightBar", `${Right_Bar.displayName}`);
	device.setSubdeviceImageUrl("RightBar", Right_Bar.image);
	device.setSubdeviceSize("RightBar", Right_Bar.width, Right_Bar.height);
	device.setSubdeviceLeds("RightBar", Right_Bar.names, Right_Bar.positioning);

	device.createSubdevice("FrontPanel");
	device.setSubdeviceName("FrontPanel", `${Front_Panel.displayName}`);
	device.setSubdeviceImageUrl("FrontPanel", Front_Panel.image);
	device.setSubdeviceSize("FrontPanel", Front_Panel.width, Front_Panel.height);
	device.setSubdeviceLeds("FrontPanel", Front_Panel.names, Front_Panel.positioning);

}

function grabLeftBarLighting(shutdown = false) {
	const LeftBarRGBData = [];

	for(let LeftBarLEDs = 0; LeftBarLEDs < Left_Bar.positioning.length; LeftBarLEDs++) {
		const iX = Left_Bar.positioning[LeftBarLEDs][0];
		const iY = Left_Bar.positioning[LeftBarLEDs][1];
		let color;

		if(shutdown) {
			color = hexToRgb(shutdownColor);
		} else if (LightingMode == "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("LeftBar", iX, iY);
		}
		const ledIdx = LeftBarLEDs * 3;
		LeftBarRGBData[ledIdx] = color[0];
		LeftBarRGBData[ledIdx + 1] = color[1];
		LeftBarRGBData[ledIdx + 2] = color[2];
	}

	return LeftBarRGBData;
}

function grabRightBarLighting(shutdown = false) {
	const RightBarRGBData = [];

	for(let RightBarLEDs = 0; RightBarLEDs < Right_Bar.positioning.length; RightBarLEDs++) {
		const iX = Right_Bar.positioning[RightBarLEDs][0];
		const iY = Right_Bar.positioning[RightBarLEDs][1];
		let color;

		if(shutdown) {
			color = hexToRgb(shutdownColor);
		} else if (LightingMode == "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("RightBar", iX, iY);
		}
		const ledIdx = RightBarLEDs * 3;
		RightBarRGBData[ledIdx] = color[0];
		RightBarRGBData[ledIdx + 1] = color[1];
		RightBarRGBData[ledIdx + 2] = color[2];
	}

	return RightBarRGBData;
}

function grabFrontPanelLighting(shutdown = false) {
	const FrontPanelRGBData = [];

	for(let FrontPanelLEDs = 0; FrontPanelLEDs < Front_Panel.positioning.length; FrontPanelLEDs++) {
		const iX = Front_Panel.positioning[FrontPanelLEDs][0];
		const iY = Front_Panel.positioning[FrontPanelLEDs][1];
		let color;

		if(shutdown) {
			color = hexToRgb(shutdownColor);
		} else if (LightingMode == "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.subdeviceColor("FrontPanel", iX, iY);
		}
		const ledIdx = FrontPanelLEDs * 3;
		FrontPanelRGBData[ledIdx] = color[0];
		FrontPanelRGBData[ledIdx + 1] = color[1];
		FrontPanelRGBData[ledIdx + 2] = color[2];
	}

	return FrontPanelRGBData;
}

function grabLighting(shutdown = false) {

	const LeftBarRGBData = grabLeftBarLighting(shutdown);

	const RightBarRGBData = grabRightBarLighting(shutdown);

	const FrontPanelRGBData = grabFrontPanelLighting(shutdown);
	let TotalLedCount =  64;

	let packetCount = 0;

	while(TotalLedCount > 0) {
		const RGBData = [];
		RGBData.push(...FrontPanelRGBData.splice(0, 18));
		RGBData.push(...RightBarRGBData.splice(0, 15));
		RGBData.push(...LeftBarRGBData.splice(0, 15));

		const ledsToSend = TotalLedCount >= 16 ? 16 : TotalLedCount;
		TotalLedCount -= ledsToSend;
		Razer.setLianLiCaseColor(RGBData.splice(0, (ledsToSend+1)*3), packetCount);
		device.pause(2);
		packetCount++;
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

class RazerProtocol {
	constructor() {
		/** Defines for the 3 device modes that a Razer device can be set to. FactoryMode should never be used, but is here as reference. */
		this.DeviceModes =
		{
			"HardwareMode" : 0x00,
			"FactoryMode"  : 0x02,
			"SoftwareMode" : 0x03,
		};

		this.LEDIDs =
		{
			"Scroll_Wheel" : 0x01,
			"Battery"	   : 0x02,
			"Logo"         : 0x03,
			"Backlight"    : 0x04,
			"Macro"        : 0x05,
			"Game"         : 0x06,
			"Red_Profile"  : 0x0C,
			"Green_Profile": 0x0D,
			"Blue_Profile" : 0x0E,
			"Unknown6"     : 0x0F,
			"Right_Side"   : 0x10,
			"Left_Side"    : 0x11,
			"Charging"     : 0x20,
		};

		this.Config =
		{
			/** ID used to tell which device we're talking to. Most devices have a hardcoded one, but hyperspeed devices can have multiple if a dongle has multiple connected devices. */
			TransactionID  		: 0x1f,
			 /** Reserved for Hyperspeed Pairing. Holds additional Transaction ID's for extra paired hyperspeed devices. @type {number[]} */
			AdditionalDeviceTransactionIDs : [],
			 /** Stored Firmware Versions for Hyperspeed dongles. We're keeping an array here in case a device has two nonconsecutive transaction ID's. @type {number[]} */
			AdditionalDeviceFirmwareVersions : [],
			 /** Stored Serials for Hyperspeed dongles. @type {string[]} */
			AdditionalDeviceSerialNumbers : [],
			//TODO: Add backup logic for rechecking firmware versions. I also need to figure out if every device supports firmware version. If every device supports serial numbers, I would much prefer to use those.
			//Proper Serials would allow me to ensure that we can easily crosscheck devices.
			/** Variable defining how many writes a device requires to get the expected result out of it. */
			PacketWrites   		: 1,
			/** Variable defining how many reads a device requires to get the expected result out of it. */
			PacketReads    		: 1,
			/** Variable to tell how many LEDs a device has, used in the color send packet for mice. Does not apply for keyboards. */
			NumberOfLEDs   		: -1,
			/** Variable to tell how many leds should be sent per packet. */
			LEDsPerPacket   	: -1,
			MouseType	   		: "Modern", //if this isn't set default to modern as it is the most common
			/** Variable to tell if a device supports battery percentage. */
			BatterySupport 		: false,
			/** Variable to tell if a dongle has multiple devices paired to it. */
			HyperspeedSupport 	: false,
			 /** Stored Firmware Version to compare against for hyperspeed dongles. We'll update this each time so that we find any and all devices. @type {number[]} */
			LastFirmwareVersion: [],
			 /** Stored Serial Number to compare against for hyperspeed dongles. We'll update this each time so that we find any and all devices.@type {number[]} */
			LastSerial: []
		};
	}
	/** Function to set our TransactionID*/
	setTransactionID(TransactionID) {
		this.Config.TransactionID = TransactionID;
	}
	/** Function to set a device's required number of packet reads.*/
	setPacketReads(PacketReads) {
		this.Config.PacketReads = PacketReads;
	}
	/** Function to set a device's required number of packet reads.*/
	setPacketWrites(PacketWrites) {
		this.Config.PacketWrites = PacketWrites;
	}
	/** Function for setting the number of LEDs a device has on it.*/
	setNumberOfLEDs(NumberOfLEDs) {
		this.Config.NumberOfLEDs = NumberOfLEDs;
	}
	/** Function for setting whether a mouse uses modern or legacy lighting.*/
	setMouseType(MouseType) {
		this.Config.MouseType = MouseType;
	}
	/** Function for setting whether a mouse supports battery percentage or not using autodetection.*/
	setAutomaticBatterySupport() {
		const batterylevel = this.getDeviceBatteryLevel();

		if(batterylevel > 0) {
			device.addFeature("battery");
			this.Config.BatterySupport = true;
		}
	}

	setBatterySupport(BatterySupport) //I could probably make this automatic at some point.
	{
		this.Config.BatterySupport = BatterySupport;

		if(BatterySupport) {
			device.addFeature("battery");
		}
	}
	/** Wrapper function for Writing Config Packets.*/
	ConfigPacketSend(packet, TransactionID = this.Config.TransactionID) {
		for(let packetLoop = 0; packetLoop < this.Config.PacketWrites; packetLoop++) {
			this.StandardPacketSend(packet, TransactionID);
			device.pause(10);
		}
	}
	/** Wrapper function for Reading Config Packets.*/
	ConfigPacketRead(TransactionID = this.Config.TransactionID) {
		let returnpacket = [];

		for(let readLoop = 0; readLoop < this.Config.PacketReads; readLoop++) {
			returnpacket = device.get_report([0x00, 0x00, TransactionID], 91);
		}

		return returnpacket.slice(9, 90);
	}
	/** Wrapper function for Writing Standard Packets, such as RGB Data.*/
	StandardPacketSend(data, TransactionID = this.Config.TransactionID) //Wrapper for always including our CRC
	{
		const packet = [0x00, 0x00, TransactionID, 0x00, 0x00, 0x00];
		data  = data || [ 0x00, 0x00, 0x00 ];
		packet.push(...data);
		packet[89] = this.CalculateCrc(packet);
		device.send_report(packet, 91);
	}
	/**Razer Specific CRC Function that most devices require.*/
	CalculateCrc(report) {
		let iCrc = 0;

		for (let iIdx = 3; iIdx < 89; iIdx++) {
			iCrc ^= report[iIdx];
		}

		return iCrc;
	}
	/**Function to grab a device's transaction ID using the serial mumber command.*/
	getDeviceTransactionID()//Most devices return at minimum 2 Transaction ID's. We throw away any besides the first one.
	{
		const possibleTransactionIDs = [0x1f, 0x2f, 0x3f, 0x4f, 0x5f, 0x6f, 0x7f, 0x8f, 0x9f];
		let devicesFound = 0;

		do {
			for(let testTransactionID = 0x00; testTransactionID < possibleTransactionIDs.length; testTransactionID++) {
				const TransactionID = possibleTransactionIDs[testTransactionID];
				const packet = [ 0x02, 0x00, 0x82 ];
				this.ConfigPacketSend(packet, TransactionID);

				const returnpacket = this.ConfigPacketRead(TransactionID);
				const Serialpacket = returnpacket.slice(0, 15);

				if(Serialpacket.every(item => item !== 0)) {
					const SerialString = String.fromCharCode(...Serialpacket);

					devicesFound = this.checkDeviceTransactionID(TransactionID, SerialString, devicesFound);
				}
			}
		}
		while(devicesFound === 0);
	}
	/**Function to ensure that a grabbed transaction ID is not for a device we've already found a transaction ID for.*/
	checkDeviceTransactionID(TransactionID, SerialString, devicesFound) {
		if(SerialString.length === 15 && devicesFound === 0) {
			this.Config.TransactionID = TransactionID;
			devicesFound++;
			device.log("Valid Serial Returned:" + SerialString);
			device.log("Valid TransactionID Returned: " + TransactionID.toString(16));
			this.Config.LastSerial = SerialString; //Store a serial to compare against later.
		} else if(SerialString.length === 15 && devicesFound > 0 && this.Config.LastSerial !== SerialString) {
			if(SerialString in this.Config.AdditionalDeviceSerialNumbers) {return devicesFound; } //This deals with the edge case of a device having nonconcurrent transaction ID's. We skip this function if the serials match.

			device.log("Multiple Devices Found, Assuming this is a Hyperspeed Dongle and has more than 1 device connected.");
			this.Config.HyperspeedSupport = true;
			this.Config.AdditionalDeviceTransactionIDs.push(TransactionID);
			device.log("Valid Serial Returned:" + SerialString);
			this.Config.AdditionalDeviceSerialNumbers.push(SerialString);
			this.Config.LastSerial = SerialString; //Store a serial to compare against later.
		}

		return devicesFound;
	}
	/**Deprecated function to grab a device's transaction ID using the Firmware Version Command.*/
	getDeviceTransactionIDFirmware()//Hopefully deprecated
	{
		const possibleTransactionIDs = [0x1f, 0x2f, 0x3f, 0x4f, 0x5f, 0x6f, 0x7f, 0x8f, 0x9f];
		let devicesFound = 0;

		do {
			for(let testTransactionID = 0x00; testTransactionID < possibleTransactionIDs.length; testTransactionID++) {
				const TransactionID = possibleTransactionIDs[testTransactionID];
				const packet = [ 0x02, 0x00, 0x81 ];
				this.ConfigPacketSend(packet, TransactionID);

				const returnpacket = this.ConfigPacketRead(TransactionID);
				const FirmwareVersion = returnpacket.slice(0, 2);

				devicesFound = this.checkDeviceTransactionID(TransactionID, FirmwareVersion, devicesFound);
			}
		}
		while(devicesFound === 0);
	}
	/**Deprecated function to ensure that a grabbed transaction ID is not for a device we've already found a transaction ID for. Uses Firmware Version rather than serial, which has the possibility for overlap.*/
	checkDeviceTransactionIDFirmware(TransactionID, FirmwareVersion, devicesFound)//Hopefully deprecated
	{
		if(FirmwareVersion[0] !== 0 && devicesFound === 0|| FirmwareVersion[1] !== 0 && devicesFound === 0) {
			this.Config.TransactionID = TransactionID;
			devicesFound++;
			device.log("Valid Firmware Version Reported:" + FirmwareVersion);
			this.Config.LastFirmwareVersion = FirmwareVersion; //Store a firmware version to compare against later.
		} else if(FirmwareVersion[0] !== 0 && devicesFound > 0 && this.Config.LastFirmwareVersion[0] !== FirmwareVersion[0] || FirmwareVersion[1] !== 0 && devicesFound > 0&& this.Config.LastFirmwareVersion[1] !== FirmwareVersion[1]) {
			if(FirmwareVersion in this.Config.AdditionalDeviceFirmwareVersions) {return devicesFound; } //This deals with the edge case of a device having nonconcurrent transaction ID's. We skip this function if the serials match.

			device.log("Multiple Devices Found, Assuming this is a Hyperspeed Dongle and has more than 1 device connected.");
			this.Config.HyperspeedSupport = true;
			this.Config.AdditionalDeviceTransactionIDs.push(TransactionID);
			this.Config.AdditionalDeviceFirmwareVersions.push(FirmwareVersion);
			device.log("Valid Firmware Version Reported:" + FirmwareVersion);
			this.Config.LastFirmwareVersion = FirmwareVersion; //Store a firmware version to compare against later.
		}

		return devicesFound;
	}

	getDeviceInfo() {
		this.getDeviceFirmwareVersion();
		this.getDeviceSerial();
		this.getDeviceMode();
	}
	/** Function to check if a device is in Hardware Mode or Software Mode. */
	getDeviceMode() {
		const packet = [ 0x02, 0x00, 0x84 ]; //openrazer is 2,3,1
		this.ConfigPacketSend(packet);

		const returnpacket = this.ConfigPacketRead();
		const deviceMode = returnpacket[0];
		device.log("Current Device Mode: " + deviceMode);

		return deviceMode;
	}
	/** Function to check if a device is charging or discharging. */
	getDeviceChargingStatus() {
		const packet = [ 0x02, 0x07, 0x84 ];
		this.ConfigPacketSend(packet);

		const returnpacket = this.ConfigPacketRead();
		const batteryStatus = returnpacket[1];
		device.log("Charging Status: " + batteryStatus);

		return batteryStatus+1;
	}
	/** Function to check a device's battery percentage.*/
	getDeviceBatteryLevel() {
		const packet = [0x02, 0x07, 0x80];
		this.ConfigPacketSend(packet);

		const returnpacket = this.ConfigPacketRead();
		const batteryLevel = Math.floor(((returnpacket[1])*100)/255);
		device.log("Device Battery Level: " + batteryLevel);

		return batteryLevel;
	}
	/** Function to fetch a device's serial number. This serial is the same as the one printed on the physical device.*/
	getDeviceSerial() {
		const packet = [ 0x16, 0x00, 0x82 ];
		this.ConfigPacketSend(packet);

		const returnpacket = this.ConfigPacketRead();


		const Serialpacket = returnpacket.slice(0, 15);
		const SerialString = String.fromCharCode(...Serialpacket);
		device.log("Device Serial: " + SerialString);

		return SerialString;
	}
	/** Function to check a device's firmware version.*/
	getDeviceFirmwareVersion() {
		const packet = [ 0x02, 0x00, 0x81 ];
		this.ConfigPacketSend(packet);

		const returnpacket = this.ConfigPacketRead();
		const FirmwareByte1 = returnpacket[0];
		const FirmwareByte2 = returnpacket[1];
		device.log("Firmware Version: " + FirmwareByte1 + "." + FirmwareByte2);

		return [FirmwareByte1, FirmwareByte2];
	}
	/** Function to fetch a device's onboard DPI levels. We do not currently parse this at all.*/
	getDeviceDPI() //I may be able to use this to find a device's max DPI?
	{
		const packet = [ 0x26, 0x04, 0x86, 0x01 ];
		this.ConfigPacketSend(packet);

		let returnpacket = this.ConfigPacketRead();
		returnpacket = this.ConfigPacketRead();
		device.log(returnpacket);
	}
	/** Function to fetch a device's polling rate. We do not currently parse this at all.*/
	getDevicePollingRate() {
		const packet = [ 0x01, 0x00, 0x85 ];
		this.ConfigPacketSend(packet);

		const returnpacket = this.ConfigPacketRead();
		const pollingRate = returnpacket[0];
		device.log("Polling Rate: " + pollingRate);
	}
	/** Function to set a device's mode between hardware and software.*/
	setDeviceMode(mode) {
		const packet = [0x02, 0x00, 0x04, this.DeviceModes[mode]];
		this.ConfigPacketSend(packet);
		this.ConfigPacketRead();
	}
	/** Function to set whether an led is on or off. I believe this may only apply to legacy devices and requires testing.*/
	setLEDState(led, saving, state) {
		const packet = [0x03, 0x03, 0x00, saving? 0x01 : 0x00, led, state? 0x01 : 0x00];
		this.StandardPacketSend(packet);
	}
	/** Function to set a legacy mouse's led effect.*/
	setStandardLEDEffect(zone) //This should only need set once?
	{
		const packet = [ 0x03, 0x03, 0x02, 0x00, zone ]; //Applies to Deathadder Chroma and older mice 0x00 is save to flash variable
		this.StandardPacketSend(packet);
	}
	/** Function to set a modern device's effect*/
	setExtendedMatrixEffect(data) {
		const packet = [ 0x06, 0x0f, 0x02 ]; //6 is length of argument
		data  = data || [ 0x00, 0x00, 0x00 ];
		packet.push(...data);
		this.StandardPacketSend(packet);
	}
	/** Function to set a modern device's effect to whatever signal uses. I believe it is static. This packet is rarely used.*/
	setSoftwareLightingModeType()//Not all devices require this, but it seems to be sent to all of them?
	{
		this.setExtendedMatrixEffect([ 0x00, 0x00, 0x08, 0x00, 0x00 ]);
	}
	/** Function to set a modern device's effect to whatever signal uses. I believe it is static. Most devices send this packet. */
	setSoftwareLightingModeType2()//Not all devices require this, but it seems to be sent to all of them?
	{
		this.setExtendedMatrixEffect([ 0x00, 0x00, 0x08, 0x01, 0x01 ]);
	}
	/** Handler function to set mouse lighting regardless of protocol.*/
	setMouseLighting(RGBData) {
		if(this.Config.MouseType === "Modern") {
			this.setModernMouseDeviceColor(RGBData);
		} else {
			this.setStandardMouseLEDColor(RGBData);
		}
	}
	/** Function to set a legacy mouse's led color.*/
	setStandardMouseLEDColor(zone, rgbdata) //Color for Deathadder Chroma
	{
		const packet = [ 0x05, 0x03, 0x01, 0x00, zone, rgbdata[0], rgbdata[1], rgbdata[2] ];
		this.StandardPacketSend(packet);
	}
	/** Function to set a modern mouse's led colors.*/
	setModernMouseDeviceColor(RGBData) {
		const packet = [(this.Config.NumberOfLEDs*3 + 5), 0x0F, 0x03, 0x00, 0x00, 0x00, 0x00, this.Config.NumberOfLEDs];
		packet.push(...RGBData);
		this.StandardPacketSend(packet);
	}
	/** Function to set a modern keyboard's led colors.*/
	setKeyboardDeviceColor(NumberOfLEDs, RGBData, packetidx) {
		const packet = [(NumberOfLEDs*3 + 5), 0x0F, 0x03, 0x00, 0x00, packetidx, 0x00, NumberOfLEDs];
		packet.push(...RGBData);
		this.StandardPacketSend(packet);
	}
	/** Function to set the LianLi Edition Case RGB. Yes this is special for now.*/
	setLianLiCaseColor(RGBData, packetidx) {
		const packet = [0x35, 0x0F, 0x03, 0x00, 0x00, packetidx, 0x00, 0x0f];
		packet.push(...RGBData);
		this.StandardPacketSend(packet);
	}
}

const Razer = new RazerProtocol();

export function Validate(endpoint) {
	return endpoint.interface === 2 && endpoint.usage === 0x0002;

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/cases/lian-li-o11-d.png";
}
