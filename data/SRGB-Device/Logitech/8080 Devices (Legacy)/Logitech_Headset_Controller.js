export function Name() { return "Logitech Headset Device"; }
export function VendorId() { return 0x046D; }
export function ProductId() { return Object.keys(LOGITECHdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/logitech"; }
export function Size() { return [1, 1]; }
export function SubdeviceController() { return true; }
export function DeviceType(){return "headphones";}
export function Validate(endpoint) { return endpoint.interface === 3; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
SidetoneAmount:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"SidetoneAmount", group:"", label:"Sidetone", description: "Sets the sidetone level amount", step:"1", type:"number", min:"0", max:"100", default:"0", live : false},
	];
}

export function Initialize() {
	LOGITECH.Initialize();
}

export function Render() {
	LOGITECH.sendColors();

	if(LOGITECH.getBatterySupport()){
		LOGITECH.fetchBattery();
	}
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	LOGITECH.sendColors(color);
}

export function onSidetoneAmountChanged() {
	LOGITECH.setSidetone();
}

export class LOGITECH_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Logitech Headset Device",
			DeviceEndpoint: { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
			Wireless: false, // True equals to 0x01 multipoint dongle, false to 0xFF and is a wired/singlepoint device
			pollingInterval: 500,
			battery: false,
			lastBatteryPolling: 0,
			pollingBatteryInterval: 10000, // 10 seconds
		};

		this.chargingStates = Object.freeze({
			1: "Discharging",
			3: "Charging",
		});

		this.chargingStateDictionary = Object.freeze({
			1 : 1,
			3 : 2
		});

		this.LogitechBatteryVoltageDict = Object.freeze({
			4057:	100,
			4027:	99,
			4012:	98,
			4001:	97,
			3990:	96,
			3978:	95,
			3967:	94,
			3958:	93,
			3948:	92,
			3940:	91,
			3933:	90,
			3925:	89,
			3918:	88,
			3907:	87,
			3895:	86,
			3883:	85,
			3868:	84,
			3858:	83,
			3852:	82,
			3841:	81,
			3837:	80,
			3828:	79,
			3821:	78,
			3827:	77,
			3814:	76,
			3801:	75,
			3796:	74,
			3789:	73,
			3782:	72,
			3776:	71,
			3767:	70,
			3762:	69,
			3754:	68,
			3746:	67,
			3739:	66,
			3732:	65,
			3726:	64,
			3719:	63,
			3716:	62,
			3709:	61,
			3703:	60,
			3697:	59,
			3693:	58,
			3687:	57,
			3683:	56,
			3679:	55,
			3673:	54,
			3671:	53,
			3666:	52,
			3661:	51,
			3658:	50,
			3655:	49,
			3653:	48,
			3650:	47,
			3646:	46,
			3642:	45,
			3638:	44,
			3637:	43,
			3634:	42,
			3632:	41,
			3629:	40,
			3628:	39,
			3625:	38,
			3624:	37,
			3621:	36,
			3619:	35,
			3617:	34,
			3616:	33,
			3612:	32,
			3610:	31,
			3609:	30,
			3605:	29,
			3603:	28,
			3600:	27,
			3597:	26,
			3695:	25,
			3593:	24,
			3590:	23,
			3586:	22,
			3582:	21,
			3578:	20,
			3573:	19,
			3567:	18,
			3564:	17,
			3559:	16,
			3554:	15,
			3585:	13,
			3576:	11,
			3571:	10,
			3565:	8,
			3560:	7,
			3552:	6,
			3537:	5,
			3509:	4,
			3463:	3,
			3402:	2,
			3320:	1,
			3300:	0
		});
	}

	getDeviceProperties(deviceID) { return LOGITECHdeviceLibrary.PIDLibrary[deviceID];};

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

	getSubdevices() { return this.Config.subdevices; }
	setSubdevices(subdevices) { this.Config.subdevices = subdevices; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	getWirelessSupport() { return this.Config.Wireless === true ? 0x01 : 0xFF; }
	setWirelessSupport(wireless) { this.Config.Wireless = wireless; }

	getBatterySupport() { return this.Config.battery; }
	setBatterySupport(battery) { this.Config.battery = battery; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const DeviceProperties = this.getDeviceProperties(this.getDeviceProductId());
		this.setDeviceName(DeviceProperties.name);
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setLedNames(DeviceProperties.LedNames);
		this.setLedPositions(DeviceProperties.LedPositions);
		this.setLeds(DeviceProperties.Leds);
		this.setDeviceImage(DeviceProperties.image);

		if(DeviceProperties.subdevices){
			this.setSubdevices(DeviceProperties.subdevices);

			const subdevices = this.getSubdevices();

			for(let i = 0; i < subdevices.length; i++){
				device.createSubdevice(subdevices[i].name);
				device.setSubdeviceName(subdevices[i].name, `${subdevices[i].name}`);
				device.setSubdeviceImageUrl(subdevices[i].name, subdevices[i].image);
				device.setSubdeviceSize(subdevices[i].name, subdevices[i].size[0], subdevices[i].size[1]);
				device.setSubdeviceLeds(subdevices[i].name, subdevices[i].LedNames, subdevices[i].LedPositions);
			}
		}

		if(DeviceProperties.battery){
			this.setBatterySupport(DeviceProperties.battery);
			device.addFeature("battery");
		}

		device.log("Device model found: " + this.getDeviceName());
		device.setName("Logitech " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(
			DeviceProperties.endpoint[`interface`],
			DeviceProperties.endpoint[`usage`],
			DeviceProperties.endpoint[`usage_page`],
			DeviceProperties.endpoint[`collection`]
		);

		this.modernDirectLightingMode();
	}

	modernDirectLightingMode() {
		console.log("Setting Software Mode!");

		const packet = [0x11, 0xFF, 0x04, 0x80, 0x01, 0x01];
		device.write(packet, 20);
	}

	sendColors(overrideColor) {

		const subdevices = this.getSubdevices();

		if (subdevices) {
			for (let iIdx = 0; iIdx < subdevices.length; iIdx++) {

				const RGBData		= [];
				const subDeviceID	= subdevices[iIdx].id;
				const subDeviceName	= subdevices[iIdx].name;
				const subDeviceLeds	= subdevices[iIdx].Leds;
				const subDeviceLedPositions = subdevices[iIdx].LedPositions;

				for(let iiIdx = 0; iiIdx < subDeviceLedPositions.length; iiIdx++){
					const iPxX = subDeviceLedPositions[iiIdx][0];
					const iPxY = subDeviceLedPositions[iiIdx][1];
					let color;

					if (overrideColor){
						color = hexToRgb(overrideColor);
					}else if (LightingMode === "Forced") {
						color = hexToRgb(forcedColor);
					}else {
						color = device.subdeviceColor(subDeviceName, iPxX, iPxY);
					}

					RGBData[(subDeviceLeds[iiIdx]*3)]	= color[0];
					RGBData[(subDeviceLeds[iiIdx]*3)+1]	= color[1];
					RGBData[(subDeviceLeds[iiIdx]*3)+2]	= color[2];
				}

				this.writeRGB(subDeviceID, RGBData);
			}
		}

	}

	writeRGB(zone, RGBData) {
		device.write([0x11, 0xFF, 0x04, 0x30, zone, 0x01].concat(RGBData).concat([0x02]), 20);
		device.pause(5);
	}

	// Test purpose
	fetchProp(prop){

		const readPacket = [0x11, 0xFF, 0x00, 0x00].concat(prop);

		device.read([0x11, 0x01], 20);

    	while(device.getLastReadSize() > 0) {
			device.read([0x10, 0x01], 20);
    	}

		device.pause(10);
		device.write(readPacket, 20);
		device.pause(10);

		const readResult = device.read(readPacket, 20);

		console.log(`Result for ${prop}: ` + readResult.slice(4, 7));
	}

	setSidetone() {
		console.log("Setting Sidetone to: " + SidetoneAmount);
		device.write([0x11, 0xFF, 0x07, 0x10, SidetoneAmount], 20);
		device.pause(1000);
	}

	fetchBattery(){

		if(Date.now() - this.Config.lastBatteryPolling < this.Config.pollingBatteryInterval) {
			return;
		}

		const batteryStatusPacket = [0x11, 0xFF, 0x08, 0x00, 0x00];

		device.pause(50);
		device.read([0x11, 0x01], 20);

    	while(device.getLastReadSize() > 0) {
			device.read([0x10, 0x01], 20);
    	}

		device.write(batteryStatusPacket, 64);

		const batteryStatusData = device.read(batteryStatusPacket, 64);

		const batteryVoltage = (batteryStatusData[4] << 8) + batteryStatusData[5];
		const batteryStatus = batteryStatusData[6];

		this.Config.lastBatteryPolling	= Date.now();

		const roundBatteryVoltage= Object.keys(this.LogitechBatteryVoltageDict).reduce((prev, curr) => {
			return (Math.abs(curr - batteryVoltage) < Math.abs(prev - batteryVoltage) ? curr : prev);
		});

		device.log(`Battery Level is [${this.LogitechBatteryVoltageDict[roundBatteryVoltage ?? 3300]}%]`);
		device.log(`Battery Status is [${this.chargingStates[batteryStatus ?? 0]}]`);

		battery.setBatteryLevel(this.LogitechBatteryVoltageDict[roundBatteryVoltage ?? 3300]);
		battery.setBatteryState(this.chargingStateDictionary[batteryStatus ?? 0]);
	}

	detectInputs() { // Future use on macros
		do {
			let packet = [];
			packet = device.read([0x00], 9, 2);
			this.processInputs(packet);
		}
		while(device.getLastReadSize() > 0);
	}

	processInputs(packet) {
		if(
			packet[0] === 0x11 &&
			packet[1] === 0xFF &&
			packet[2] === 0x08 &&
			packet[3] === 0x00 &&
			packet[4] === 0x0F &&
			packet[6] === 0x01) {

			device.log("Waking From Sleep");
			device.pause(5000); //Wait five seconds before Handoff. Allows device boot time.
			this.Initialize();
		}
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			/*
			0x0ADF: {  // This model has no RGB and no battery report from software
				name: "G435",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				battery: true,
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFF00, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g435.png"
			},*/
			0x0A5C: {
				name: "G633",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Logo",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Logo"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Light Strip",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Light Strip"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g633.png"
			},
			0x0A89: {
				name: "G635",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Logo",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Logo"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Light Strip",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Light Strip"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g635.png"
			},
			0x0AB5: {
				name: "G733",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Bottom LED",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Bottom LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Top LED",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Top LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				battery: true,
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g733.png"
			},
			0x0AFE: {
				name: "G733",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Bottom LED",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Bottom LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Top LED",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Top LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				battery: true,
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0002 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g733.png"
			},
			0x0B1F: {
				name: "G733",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Bottom LED",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Bottom LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Top LED",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Top LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				battery: true,
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0002 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g733.png"
			},
			0x0AD8: {
				name: "G735",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Bottom LED",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Bottom LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Top LED",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Top LED"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				battery: true,
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g735.png"
			},
			0x0A5B: {
				name: "G933",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Logo",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Logo"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Light Strip",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Light Strip"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				battery: true,
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g933.png"
			},
			0x0A87: {
				name: "G935",
				size: [1, 1],
				LedNames: [],
				LedPositions: [],
				Leds: [],
				subdevices: [
					{
						name: "Logo",
						id: 0x00,
						size: [1, 1],
						LedNames: ["Logo"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
					{
						name: "Light Strip",
						id: 0x01,
						size: [1, 1],
						LedNames: ["Light Strip"],
						LedPositions: [[0, 0]],
						Leds: [0],
						image: ""
					},
				],
				battery: true,
				endpoint : { "interface": 3, "usage": 0x0202, "usage_page": 0xFF43, "collection": 0x0003 },
				image: "https://assets.signalrgb.com/devices/brands/logitech/audio/g935.png"
			},
		};
	}
}

const LOGITECHdeviceLibrary = new deviceLibrary();
const LOGITECH = new LOGITECH_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
