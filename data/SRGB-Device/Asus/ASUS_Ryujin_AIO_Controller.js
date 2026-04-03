export function Name() { return "ASUS Ryujin Device"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return Object.keys(ASUSdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/ASUS"; }
export function Size() { return [1, 1]; }
export function SupportsFanControl(){ return true;  }
export function SubdeviceController() { return device.productId() !== 0x18AE; }
export function DeviceType(){return "aio";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [];
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

export function Initialize() {
	ASUS.Initialize();
}

export function Render() {
	ASUS.sendColors();
	ASUS.PollFans();
}

export function Shutdown(SystemSuspending) {
	if(ASUS.getDeviceProductId() === 0x18AE) {
		const color = SystemSuspending ? "#000000" : shutdownColor;
		ASUS.sendColors(color);
	}
}

export class ASUS_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "ASUS Ryujin Device",
			RGBSupport: false,
			LedNames: [],
			LedPositions: [],
			Leds: [],
			controller: false,
			DeviceEndpoint: { "interface": 0, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
		};
	}

	getDeviceProperties(deviceName) { return ASUSdeviceLibrary.LEDLibrary[deviceName];};

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

	getFanController() { return this.Config.controller; }
	setFanController(FanController) { this.Config.controller = FanController; }

	getFans() { return this.Config.fans; }
	setFans(fans) { this.Config.fans = fans; }

	getRGBSupport() { return this.Config.RGBSupport; }
	setRGBSupport(support) { this.Config.RGBSupport = support; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(ASUSdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.endpoint);

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName("ASUS " + this.getDeviceName());
		this.fetchChip();

		this.setDeviceImage(DeviceProperties.image);
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(
			DeviceProperties.endpoint[`interface`],
			DeviceProperties.endpoint[`usage`],
			DeviceProperties.endpoint[`usage_page`],
			DeviceProperties.endpoint[`collection`]
		);

		// RGB setup
		if(DeviceProperties.LedNames) {
			console.log("Device has RGB leds");
			this.setRGBSupport(true);
			this.setLedNames(DeviceProperties.LedNames);
			this.setLedPositions(DeviceProperties.LedPositions);
			this.setLeds(DeviceProperties.Leds);

			device.setSize(DeviceProperties.size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());

			device.addProperty({"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#009bde"});
			device.addProperty({"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"});
			device.addProperty({"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"});

			device.write([0xEC, 0x3B, 0x00, 0xE3, 0xFF], 65); // Software mode

		}

		// Fan Control setup
		if(DeviceProperties.controller){
			console.log("Device has a Fan Controller hub");
			this.setFanController(DeviceProperties.controller);
		}

		if(DeviceProperties.fans){
			console.log("Device has fans.");
			this.setFans(DeviceProperties.fans);
		}

		// Skip iterating other fans and creating FanControllers if the system is disabled.
		if(device.fanControlDisabled()) {
			device.log("Fan Control disabled. No fans created!");

			return;
		}

		for(let fan = 0; fan < DeviceProperties.fans.length; fan++){
			device.createFanControl(`${DeviceProperties.fans[fan]}`);
		}

		this.fetchPump();

		if(this.getFanController()){
			this.fetchController();
		}
	}

	sendColors(overrideColor) {

		if (!this.getRGBSupport()) {
			return;
		}

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [];

		for (let iIdx = 0; iIdx < deviceLedPositions.length; iIdx++) {
			const iPxX = deviceLedPositions[iIdx][0];
			const iPxY = deviceLedPositions[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			RGBData[(deviceLeds[iIdx]*3)]   = color[0];
			RGBData[(deviceLeds[iIdx]*3)+1] = color[1];
			RGBData[(deviceLeds[iIdx]*3)+2] = color[2];
		}

		device.write([0xEC, 0x40, 0x80, 0x00, 0x05].concat(RGBData), 65);
	}

	PollFans() {
		if (Date.now() - savedPollFanTimer < PollModeInternal) {
			return;
		}

		savedPollFanTimer = Date.now();

		if(device.fanControlDisabled()){
			return;
		}

		console.log("Fetching Pump data...");

		this.fetchPump();

		if(this.getFanController()){
			this.fetchController();
		}
	}

	fetchChip(){

		device.clearReadBuffer();
		device.write([0xEC, 0x82], 65);

		const firmwareData = device.read([0x02], 65);

		console.log("Ryujin Chip: " + String.fromCharCode(...firmwareData.slice(3, 18)).split(","));
	}

	fetchPump(){

		if(ASUS.getDeviceProductId() === 0x18AE) {
			device.clearReadBuffer();
			device.write([0xEC, 0xAA], 32);
			device.pause(50);

			const pumpData = device.read([0x2A], 65);

			if (!pumpData || pumpData.length < 6) {
				console.log("WARN: Invalid response from controller");

				return;
			}
			const fanRPM = pumpData[4] * 100;

			device.setRPM("Pump Fan", fanRPM);

			const pumpDuty = Math.round(device.getNormalizedFanlevel("Pump") * 100);
			const fanDuty = Math.round(device.getNormalizedFanlevel("Pump Fan") * 100);
			device.setRPM("Pump", pumpDuty * 20);

			this.setPump(pumpDuty, fanDuty);

			console.log(`Pump RPM: ${pumpDuty * 20} rpm`);
			console.log(`Pump Fan RPM: ${fanRPM} rpm`);
			console.log(`Pump duty: ${pumpDuty}%`);
			console.log(`Pump Fan duty: ${fanDuty}%`);
		}else{
			const offset = this.getDeviceProductId() === 0x1AA2 ? 2 : 0;
			const offset2 = this.getDeviceProductId() === 0x1AA2 ? 3 : 0;

			device.clearReadBuffer();
			device.write([0xEC, 0x99], 65);

			const pumpRPM = device.read([0x19], 65);

			device.clearReadBuffer();
			device.write([0xEC, 0x9A], 65);

			const pumpDuty = device.read([0x1A], 65);

			const pumpArray = [
				[
					this.joinHexArray([pumpRPM[5 + offset], pumpRPM[6 + offset]]), // Pump rpm
					pumpDuty[4] // Pump duty %
				],
				[
					this.joinHexArray([pumpRPM[7 + offset2], pumpRPM[8 + offset2]]), // Pump Fan rpm
					pumpDuty[5] // Pump Fan duty %
				],
				[
					pumpRPM[3 + offset] + pumpRPM[4 + offset] / 10,
				]
			];

			console.log(`Pump RPM: ${pumpArray[0][0]} rpm`);
			console.log(`Pump Fan RPM: ${pumpArray[1][0]} rpm`);
			console.log(`Pump duty: ${pumpArray[0][1]}%`);
			console.log(`Pump Fan duty: ${pumpArray[1][1]}%`);
			console.log(`Liquid Temp: ${pumpArray[2][0]} °C`);

			// Set Pump duty
			device.setRPM(`Pump`, pumpArray[0][0]);

			const pumpSpeed = device.getNormalizedFanlevel(`Pump`) * 100;

			// Set Pump fan duty
			device.setRPM(`Pump Fan`, pumpArray[1][0]);

			const pumpFanSpeed = device.getNormalizedFanlevel(`Pump Fan`) * 100;

			// Send values to hardware
			this.setPump(pumpSpeed, pumpFanSpeed);
		}
	}

	fetchController(){

		device.clearReadBuffer();
		device.write([0xEC, 0xA0], 65);

		const controllerData = device.read([0x20], 65);

		device.clearReadBuffer();
		device.write([0xEC, 0xA1], 65);

		const controllerData2 = device.read([0x21], 65);

		const fansArray = [
			this.joinHexArray([controllerData[5], controllerData[6]]),
			this.joinHexArray([controllerData[7], controllerData[8]]),
			this.joinHexArray([controllerData[9], controllerData[10]]),
			this.joinHexArray([controllerData[3], controllerData[4]]), // I don't know why this is out of order
			controllerData2[4] / 255 * 100
		];

		console.log(`Fan Controller duty: ${fansArray[4]} %`);
		console.log(`Fan 1 Speed: ${fansArray[0]} rpm`);
		console.log(`Fan 2 Speed: ${fansArray[1]} rpm`);
		console.log(`Fan 3 Speed: ${fansArray[2]} rpm`);
		console.log(`Fan 4 Speed: ${fansArray[3]} rpm`);

		// Since the controller won't set RPM per fan, we get the average and set to that
		let fanRPMSum = 0;

		for(let i = 0; i < fansArray.length; i++) {
			fanRPMSum += fansArray[i];
		}

		const fanRPMAvg = fanRPMSum / fansArray.length;

		// Set fans rpm
		device.setRPM(`Fans`, fanRPMAvg);

		const fansSpeed = device.getNormalizedFanlevel(`Fans`) * 100;
		this.setFan(fansSpeed);
	}

	setPump(pump_duty, pump_fan_duty){

		if(ASUS.getDeviceProductId() === 0x18AE) {
			device.write([0xEC, 0x2A, pump_duty, pump_fan_duty], 65);
		}else{
			device.write([0xEC, 0x1A, 0x00, pump_duty, pump_fan_duty], 65);
		}

	}

	setFan(duty) {
		device.write([0xEC, 0x21, 0x00, 0x00, (duty / 100) * 255], 65);
	}

	joinHexArray(hexArray, LittleEndian = false) {
		const returnhexArray = [];

		for(let i = 0; i < hexArray.length; i++){
			returnhexArray.push(hexArray[i].toString(16));
		}

		return LittleEndian ? parseInt(["0x"] + returnhexArray.join("")) : parseInt(["0x"] + returnhexArray.reverse().join(""));
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x18AE: "Ryujin I",
			0x1988: "Ryujin II",
			0x1AA2: "Ryujin III",
		};

		this.LEDLibrary	=	{
			"Ryujin I": // URJ0-S452-0205
			{
				// RGB
				size: [5, 1],
				LedNames: ["LED 1", "LED 2", "LED 3", "LED 4", "LED 5",],
				LedPositions: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],],
				Leds: [0, 1, 2, 3, 4],

				// Fan Control
				fans	 : ["Pump", "Pump Fan"],
				endpoint : { "interface": 0, "usage": 0x00A1, "usage_page": 0xFF72, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/aios/ryujin-1.png",
			},
			"Ryujin II": // AURJ1-S750-0104
			{
				// Fan Control
				controller: true,
				fans	 : ["Pump", "Pump Fan", "Fans"],
				endpoint : { "interface": 1, "usage": 0x00A1, "usage_page": 0xFF72, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/aios/ryujin-2.png",
			},
			"Ryujin III": // AURJ2-S750-0108
			{
				// Fan Control
				fans	 : ["Pump", "Pump Fan"],
				endpoint : { "interface": 1, "usage": 0x00A1, "usage_page": 0xFF72, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/aios/ryujin-3.png",
			},
		};
	}
}

const ASUSdeviceLibrary = new deviceLibrary();
const ASUS = new ASUS_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 0 || endpoint.interface === 1 ;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png";
}
