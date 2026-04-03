import {ContextError, globalContext, Assert} from "@SignalRGB/Errors.js";
export function Name() { return "KBM! Gaming Device"; }
export function VendorId() { return 0x4A4C; }
export function ProductId() { return Object.keys(KBMdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/kbmgaming"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 0x0091 && endpoint.usage_page === 0xFF1B && endpoint.collection === 0x0000; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/keyboards/full-size-keyboard-render.png"; }
export function ConflictingProcesses() { return ["TECLADO MECANICO GAMER.exe"]; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

export function Initialize() {
	KBM.Initialize();
}

export function Render() {
	KBM.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	KBM.sendColors(color); // Go Dark on System Sleep/Shutdown
}

export class KBM_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "KBM! Device",
			DeviceEndpoint: { "interface": 2, "usage": 0x0091, "usage_page": 0xFF1B, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [], // 0x00 (first zone) is keyboard and 0x01 (second is for models with special leds)
		};
	}

	getDeviceProperties(id) {

		const deviceConfig = KBMdeviceLibrary.LEDLibrary[id];

		Assert.isOk(deviceConfig, `Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our discord to get it added.`);

		return deviceConfig;
	};

	getModelID() { return this.Config.ModelID; }
	setModelID(modelid) { this.Config.ModelID = modelid; }

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLedLayout() { return this.Config.layout; }
	setLedLayout(layout) { this.Config.layout = layout; }

	getLedNames() { return this.Config.LedNames; }
	setLedNames(ledNames) { this.Config.LedNames = ledNames; }

	getLedPositions() { return this.Config.LedPositions; }
	setLedPositions(ledPositions) { this.Config.LedPositions = ledPositions; }

	getLeds() { return this.Config.Leds; }
	setLeds(leds) { this.Config.Leds = leds; }

	getDeviceImage(deviceModel) { return KBMdeviceLibrary.LEDLibrary[deviceModel].image; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		// Fetch model
		const modelID	=	this.fetchFirmwareData();

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setModelID(modelID);
			this.setDeviceName(DeviceProperties.name);
			this.setLedLayout(DeviceProperties.layout);
			this.setLedNames(KBMdeviceLibrary.LEDLayout[this.getLedLayout()].vLedNames);
			this.setLedPositions(KBMdeviceLibrary.LEDLayout[this.getLedLayout()].vLedPositions);
			this.setLeds(KBMdeviceLibrary.LEDLayout[this.getLedLayout()].vLeds);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setSize(KBMdeviceLibrary.LEDLayout[this.getLedLayout()].size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage(modelID));

			// Set Direct mode
			this.DirectLightingMode();
		}else{
			console.log("Model not found in library!");
			console.log("Unknown protocol for "+ modelID);
		}
	}

	DirectLightingMode() {
		device.write([0x01, 0x07, 0x00, 0x00, 0x00, 0x0E, 0x00, 0x04, 0x03, 0xFF], 64);
		device.write([0x01, 0x17, 0x00, 0x00, 0x00, 0x01, 0x01], 64);
		device.write([0x01, 0x08, 0x00, 0x00, 0x00, 0x0D, 0x02, 0x03, 0x03, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01], 64);
	}

	sendColors(overrideColor) {

		if(!this.getModelID()){
			return;
		}

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();
		const RGBData				= [[0], [0]];
		let zoneOffset = 0;

		for (let zone = 0; zone < deviceLeds.length; zone++){

			for (let iIdx = 0; iIdx < deviceLeds[zone].length; iIdx++) {
				const iPxX = deviceLedPositions[iIdx + zoneOffset][0];
				const iPxY = deviceLedPositions[iIdx + zoneOffset][1];
				let color;

				if(overrideColor){
					color = hexToRgb(overrideColor);
				}else if (LightingMode === "Forced") {
					color = hexToRgb(forcedColor);
				}else{
					color = device.color(iPxX, iPxY);
				}

				RGBData[zone][(deviceLeds[zone][iIdx]*3)]   = color[0];
				RGBData[zone][(deviceLeds[zone][iIdx]*3)+1] = color[1];
				RGBData[zone][(deviceLeds[zone][iIdx]*3)+2] = color[2];
			}

			zoneOffset += deviceLeds[zone].length;
		}

		for (let zone = 0; zone < deviceLeds.length; zone++) {
			let packetCount		= 0;
			let	zoneTotalLEDs	= RGBData[zone].length / 3;

			while(zoneTotalLEDs > 0) {
				const ledsToSend = zoneTotalLEDs >= 18 ? 18 : zoneTotalLEDs;

				const header = [0x01, 0x0F, zone, 0x00, packetCount, ledsToSend*3];

				const data = RGBData[zone].splice(0, ledsToSend*3);

				const packet = header.concat(data);

				this.writeRGBPackage(packet);
				zoneTotalLEDs	-= ledsToSend;
				packetCount++;
			}
		}

		device.write([0x01, 0x0F, 0x01, 0x00, 0x02, 0x1B], 65); // Apply
	}

	writePackage(data, read = false){
		const packet = data.concat(Array(62).fill(0));

		if (read) {
			device.write(packet, 65);

			return device.read(packet, 65);
		}

		return device.write(packet, 65);
	}

	writeRGBPackage(data){
		const packet = data;
		device.write(packet, 65);
	}

	fetchFirmwareData() {
		const packet = [0x01, 0x0D];

		device.write(packet, 64);

		const firmwareData	= device.read(packet, 64);

		const modelID		= String.fromCharCode(...firmwareData).split(",")[4];
		const firmwareVer	= String.fromCharCode(...firmwareData).split(",")[5];

		console.log(`ModelID: ${modelID} `);
		console.log(`Firmware Version: ${firmwareVer}`);

		return modelID;
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0xE987: "TG700 Preto",
			0xE989: "TG600 Branco",
		};

		this.LEDLibrary	=	{

			MK69_JLRGB: {
				name: "KBM! TG700 Preto",
				image: "https://assets.signalrgb.com/devices/brands/kbm-gaming/keyboards/tg700-preto.png",
				layout:	"TG700"
			},

			JLMK60V2RGB: {
				name: "KBM! TG600 Branco",
				image: "https://assets.signalrgb.com/devices/brands/kbm-gaming/keyboards/tg600-branco.png",
				layout:	"TG600"
			},

		};

		this.LEDLayout = {
			"TG600": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\´", "]",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç", "~", "]", "Enter",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", ".", "/", "Right Shift",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",       "Right Alt", "Menu", "Fn", "Right Ctrl",
				],
				vLeds:  [
					[
						22,	23, 24,	25,	26,	27,	28,	29,	30,	31,	32,	33,	34,	36,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
						88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101,
						110, 111, 112,          	116,         	119, 120, 121, 122,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],
					[0, 4], [1, 4], [2, 4],                 		[6, 4],                 		[10, 4], [11, 4], [12, 4], [13, 4],
				],
				size: [14, 5],
			},
			"TG700": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\´", "]",	"Home",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç", "~", "]", "Enter", "PgUp",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PgDn",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",       "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						22,	23, 24,	25,	26,	27,	28,	29,	30,	31,	32,	33,	34,	36, 38,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,		60,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 82,
						88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 103, 104,
						110, 111, 112,          	116,         	119, 120, 121, 122, 125, 126
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],			[14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                 		[6, 4],                 [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
				],
				size: [15, 5],
			},
		};
	}
}

const KBMdeviceLibrary = new deviceLibrary();
const KBM = new KBM_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
