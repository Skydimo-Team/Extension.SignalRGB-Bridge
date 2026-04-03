import {ContextError, globalContext, Assert} from "@SignalRGB/Errors.js";
export function Name() { return "Nuvoton Device"; }
export function VendorId() { return 0x0416; }
export function ProductId() { return Object.keys(NuvotondeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/nuvoton"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 1.0;}
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 0x0091 && endpoint.usage_page === 0xFF1B && endpoint.collection === 0x0000; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", min:"0", max:"360", type:"color", default:"#009bde"},
	];
}

export function Initialize() {
	Nuvoton.InitializeNuvoton();
}

export function Render() {
	Nuvoton.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	Nuvoton.sendColors(color); // Go Dark on System Sleep/Shutdown
}

export class Nuvoton_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Nuvoton Device",
			DeviceEndpoint: { "interface": 2, "usage": 0x0091, "usage_page": 0xFF1B, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [], // 0x00 (first zone) is keyboard and 0x01 (second is for models with special leds)
		};
	}

	getDeviceProperties(id) {

		const deviceConfig = NuvotondeviceLibrary.LEDLibrary[id];

		Assert.isOk(deviceConfig, `Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our Discord to get it added.`);

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

	getDeviceImage(deviceModel) { return NuvotondeviceLibrary.LEDLibrary[deviceModel].image; }

	InitializeNuvoton() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		// Fetch model
		const modelID	=	this.fetchFirmwareData();

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setModelID(modelID);
			this.setDeviceName(DeviceProperties.name);
			this.setLedLayout(DeviceProperties.layout);
			this.setLedNames(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].vLedNames);
			this.setLedPositions(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].vLedPositions);
			this.setLeds(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].vLeds);

			device.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setSize(NuvotondeviceLibrary.LEDLayout[this.getLedLayout()].size);
			device.setControllableLeds(this.getLedNames(), this.getLedPositions());
			device.setImageFromUrl(this.getDeviceImage(modelID));

			// Set Direct mode
			this.DirectLightingMode();
		}else{
			device.notify("Unknown device", `Reach out to support@signalrgb.com, or visit our Discord to get it added.`, 0);
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

				const header	= [0x01, 0x0F, zone, 0x00, packetCount, ledsToSend*3];
				const data		= RGBData[zone].splice(0, ledsToSend*3);
				const packet	= header.concat(data);

				this.writeRGBPackage(packet);
				zoneTotalLEDs	-= ledsToSend;
				packetCount++;
				device.pause(1);
			}
		}

		// We need to send a blank array to the next zone even if there's no LEDs on it
		if(deviceLeds.length === 1){
			device.write([0x01, 0x0F, 0x01, 0x00, 0x00, 0x36], 65);
			device.write([0x01, 0x0F, 0x01, 0x00, 0x01, 0x2D], 65);

			if (this.getDeviceName() === "Ajazz AK820 MAX") {
				device.write([0x01, 0x0f, 0x00, 0x00, 0x07, 0x12], 65); // Only needed on AK820 MAX ??
			}

			device.pause(1);
		}
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
			0xB23C: "Nuvoton Device",
			0xC345: "Nuvoton Device",
			0x7372: "Nuvoton Device",
		};

		this.LEDLibrary	=	{

			XS61BRGB: {
				name: "Fantech MAXFIT61",
				image: "https://assets.signalrgb.com/devices/brands/fantech/keyboards/maxfit61-standard.png",
				layout:	"60%"
			},
			XS62SKRGB: {
				name: "Fantech MAXFIT61",
				image: "https://assets.signalrgb.com/devices/brands/fantech/keyboards/maxfit61-standard.png",
				layout:	"60%"
			},
			TY69SKRGB: {
				name: "Husky HAILSTORM",
				image: "https://assets.signalrgb.com/devices/brands/husky/keyboards/hailstorm.png",
				layout:	"65%"
			},
			XS63RGB: {
				name: "Husky Blizzard",
				image: "https://assets.signalrgb.com/devices/brands/husky/keyboards/hailstorm.png",
				layout:	"Husky Blizzard"
			},
			K210RGB: {
				name: "FL-ESPORTS MK870TKL",
				image: "https://assets.signalrgb.com/devices/brands/fantech/keyboards/mk876-tkl.png",
				layout:	"TKL"
			},
			K24RGB: {
				name: "Motospeed K24",
				image: "https://assets.signalrgb.com/devices/brands/motospeed/keyboards/k24.png",
				layout:	"Numpad"
			},
			GK5000RGB: {
				name: "Cougar LUXLIM",
				image: "https://assets.signalrgb.com/devices/brands/cougar/keyboards/luxlim.png",
				layout:	"Full"
			},
			K191DPLRGB: {
				name: "DeepCool TKL",
				image: "https://assets.signalrgb.com/devices/brands/deepcool/keyboards/kg722.png",
				layout:	"TKL"
			},
			K212DPLRGB: {
				name: "DeepCool KG722",
				image: "https://assets.signalrgb.com/devices/brands/deepcool/keyboards/kg722.png",
				layout:	"DeepCool KG722"
			},
			K180CVRGB: {
				name: "Pulsar",
				image: "https://assets.signalrgb.com/devices/brands/pulsar/keyboards/fullsize.png",
				layout:	"Full"
			},
			K221UKCVRGB: {
				name: "Pulsar TKL",
				image: "https://assets.signalrgb.com/devices/brands/pulsar/keyboards/tkl.png",
				layout:	"Pulsar TKL"
			},
			K188BRGB: {
				name: "HATOR Rockfall 2 MECHA",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-2.png",
				layout:	"Full"
			},
			GK8120SKRGB: {
				name: "Dark Project KD104A",
				image: "https://assets.signalrgb.com/devices/brands/dark-project/keyboards/kd104a.png",
				layout:	"Full"
			},
			GK8170MDPRGB: {
				name: "Dark Project KD83A",
				image: "https://assets.signalrgb.com/devices/brands/dark-project/keyboards/kd83a.png",
				layout:	"KD83A"
			},
			GK8110SKRGB: {
				name: "Dark Project KD87A",
				image: "https://assets.signalrgb.com/devices/brands/dark-project/keyboards/kd87a.png",
				layout:	"TKL"
			},
			GK8110IRRGB: {
				name: "Dark Project KD87A",
				image: "https://assets.signalrgb.com/devices/brands/dark-project/keyboards/kd87a.png",
				layout:	"TKL"
			},
			GK8110DPRGB: {
				name: "Dark Project KD87A",
				image: "https://assets.signalrgb.com/devices/brands/dark-project/keyboards/kd87a.png",
				layout:	"TKL"
			},
			GK8150SKRGB: {
				name: "Dark Project KD68B",
				image: "https://assets.signalrgb.com/devices/brands/dark-project/keyboards/kd68b.png",
				layout:	"68%v2"
			},
			ZK87DrevoRGB: {
				name: "Drevo Tyrfing v2",
				image: "https://assets.signalrgb.com/devices/brands/drevo/keyboards/tyrfing-v2.png",
				layout:	"TKL"
			},
			GK8110RGB: {
				name: "Keyrox TKL",
				image: "https://assets.signalrgb.com/devices/brands/red-square/keyboards/keyrox-tkl.png",
				layout:	"TKL"
			},
			K205RGB: {
				name: "Rapture Alpha",
				image: "https://assets.signalrgb.com/devices/brands/rapture/keyboards/alpha.png",
				layout:	"Rapture Alpha"
			},
			K215RGB: {
				name: "CAPTURER KT87",
				image: "https://assets.signalrgb.com/devices/brands/capturer/keyboards/kt87.png",
				layout:	"TKL"
			},
			RTK61RGB: {
				name: "Ractous RTK61P",
				image: "https://assets.signalrgb.com/devices/brands/ractous/keyboards/rtk61p.png",
				layout:	"60%"
			},
			K220RGB: {
				name: "FL-ESPORTS FL980",
				image: "https://assets.signalrgb.com/devices/brands/fl-esports/keyboards/fl980.png",
				layout:	"TKL"
			},
			TK61BIRRGB: {
				name: "Tezarre TK61",
				image: "https://assets.signalrgb.com/devices/brands/tezarre/keyboards/tk61.png",
				layout:	"60%"
			},
			K669HSTKLRGB: {
				name: "Hator Skyfall TKL Pro",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/skyfall-tkl-pro.png",
				layout:	"TKL"
			},
			XS87RGB: {
				name: "BlitzWolf KBW2",
				image: "https://assets.signalrgb.com/devices/brands/blitzwolf/keyboards/bw-kb2.png",
				layout:	"TKL"
			},
			K181ZETRGB: {
				name: "Zet Gaming Blade 2",
				image: "https://assets.signalrgb.com/devices/brands/zet-gaming/keyboards/blade-2.png",
				layout:	"Full"
			},
			K660ZETRGB: {
				name:  "ARDOR GAMING Immortality TKL",
				image: "https://assets.signalrgb.com/devices/brands/ardor-gaming/keyboards/immortality-tkl.png",
				layout:"Full"
			},
			V75XHERGB: {
				name:  "CIDOO C75",
				image: "https://assets.signalrgb.com/devices/brands/cidoo/keyboards/c75.png",
				layout:"Cidoo C75"
			},
			K202MechaRGB: {
				name: "HATOR Rockfall 2 MECHA TKL",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-2-tkl.png",
				layout:	"HATOR Rockfall 2 MECHA TKL"
			},
			K202MechaIRRGB: {
				name: "HATOR Rockfall 2 Optica TKL",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-2-tkl.png",
				layout:	"TKLv2"
			},
			K202EVORGB: {
				name: "HATOR Rockfall EVO TKL",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-evo-tkl.png",
				layout:	"TKLv2"
			},
			K202HRMTKLRGB: {
				name: "HATOR Rockfall Mecha TKL",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-2-tkl.png",
				layout:	"TKLv2"
			},
			K202HTK520RGB: {
				name: "HATOR Rockfall 2 Mecha TKL Signature",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-2-tkl-signature.png",
				layout:	"TKLv2"
			},
			K202HTK521RGB: {
				name: "HATOR Rockfall 2 Mecha TKL Signature W",
				image: "https://assets.signalrgb.com/devices/brands/hator/keyboards/rockfall-2-tkl-signature-white.png",
				layout:	"TKLv2"
			},
			SG8994HERGB : {
				name:  "Ajazz AK820 MAX",
				image: "https://assets.signalrgb.com/devices/brands/ajazz/keyboards/ak820-max.png",
				layout:"Ajazz AK820 MAX"
			},
			K191UKDPLRGB: {
				name: "Deepcool KB500",
				image: "https://assets.signalrgb.com/devices/brands/deepcool/keyboards/kb500.png",
				layout:	"TKLv2"
			},
			K182MRGB: {
				name: "ARDOR GAMING Blade",
				image: "https://assets.signalrgb.com/devices/brands/ardor-gaming/keyboards/blade.png",
				layout: "Full"
			},
			X82HERGB: {
				name: "MCHOSE Ace 68HE",
				image: "https://assets.signalrgb.com/devices/brands/mchose/keyboards/ace-68.png",
				layout: "68%v2"
			},
			MK104RGB: {
				name: "Dream Machines Dreamkey",
				image: "https://assets.signalrgb.com/devices/brands/dream-machines/keyboards/dreamkey.png",
				layout: "Full"
			},
			GM081XHERGB: {
				name: "Wraith W75",
				image: "https://assets.signalrgb.com/devices/brands/wraith/keyboards/w75.png",
				layout: "75%"
			},
			K205UKRGB: {
				name: "Techno Zone E 26",
				image: "https://assets.signalrgb.com/devices/brands/techno-zone/keyboards/e26.png",
				layout: "Full"
			},
			K198UKRGB: {
				name: "Techno Zone E 36",
				image: "https://assets.signalrgb.com/devices/brands/techno-zone/keyboards/e36.png",
				layout: "Full"
			},
			T68SEUSXYXNHJHERGB: {
				name: "Kemove T68",
				image: "https://assets.signalrgb.com/devices/brands/kemove/keyboards/t68.png",
				layout: "68%"
			},

		};

		this.LEDLayout = {
			"Full": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up", "NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",			"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",	"Num 0", "Num ."
				],
				vLeds:  [
					[
						0,  2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14, 			15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 	37, 38, 39, 		40, 41, 42, 43,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 	59, 60, 61, 		62, 63, 64, 65,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,								84, 85, 86,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99,		102,		104,			106, 107, 108, 109,
						110, 111, 112,		116,		120, 121, 122, 123,			125, 126, 127, 		128,	130,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2], [20, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],								 [17, 3], [18, 3], [19, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],			 [17, 4], [18, 4], [19, 4], [20, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5], [17, 5], 		   [19, 5],
				],
				size: [21, 6],
			},
			"TKL": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",								"Logo 1", "Logo 2", "Logo 3",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,     15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,		84, 85, 86,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102,	   104,
						110, 111, 112,		116,		120, 121, 122, 123,	  125, 126, 127,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],	  [14, 3], [15, 3], [16, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],
				],
				size: [17, 6],
			},
			"TKLv2": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,     15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102,	   104,
						110, 111, 112,		116,		120, 121, 122, 123,	  125, 126, 127,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],
				],
				size: [17, 6],
			},
			"75%": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Insert",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "PgUp",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "PgDn",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,     15,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,		81,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 103,
						110, 111, 112,		116,		120, 121, 122,  123, 124, 127,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],          [12, 4], [13, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},
			"68%": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "'", //15
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", //15
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", "PgUp", //15
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", "Up Arrow", "PgDn", //13
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow" //8
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 	80, 81,
						88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  102, 103, 104,
						110, 111, 112,		116,	  120, 121, 122, 123, 125, 126,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], 	      [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                 [5, 4],                 [8, 4], [9, 4], [10, 4], 		  [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"68%v2": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "'", //15
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", //15
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", "PgUp", //15
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", "Up Arrow", "PgDn", //13
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow" //8
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 38,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 60,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,     80, 82,
						88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  102, 103, 104,
						110, 111, 112,        116,      120, 123, 122, 124, 125, 126,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], 	      [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                 [5, 4],                 [8, 4], [9, 4], [10, 4], 		  [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"65%": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Del",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "'", "[", "Home",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç", "~", "]", "Enter", "PgUp",
					"Left Shift", "\\", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PgDn",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",      "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow"
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36, 37,
						44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
						88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 102, 103,
						111, 112, 116,         120,          121, 122, 123, 124, 125, 126,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],   [13, 0], [14, 0],
					[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],  		  [14, 1],
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],  [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                         [6, 4],                [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"60%": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",  "ISO_#",  "Enter",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",      "Right Alt", "Menu", "Right Ctrl", "Fn"
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36,
						44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58,
						66,   68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
						88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,      102,
						110, 111, 112,         116,          120, 121, 122, 123
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],   [13, 0],
					[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],  [13, 1],
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],
					[0, 3],  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],             [13, 3],
					[0, 4], [1, 4], [2, 4],                         [6, 4],                            [10, 4], [11, 4], [12, 4], [13, 4]
				],
				size: [14, 5],
			},
			"Numpad": {
				vLedNames: [
					"Esc", "Tab", "Backspace", "FN",
					"Numlock", "/", "*", "-",
					"Num 7", "Num 8", "Num 9", "Num +",
					"Num 4", "Num 5", "Num 6",
					"Num 1", "Num 2", "Num 3", "Num Enter",
					"Num 0", "."
				],
				vLeds: [
					[
						18, 19, 20, 21,
						40, 41, 42, 43,
						62, 63, 64, 65,
						84, 85, 86,
						106, 107, 108, 109,
						128, 130
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0],
					[0, 1], [1, 1], [2, 1], [3, 1],
					[0, 2], [1, 2], [2, 2], [3, 2],
					[0, 3], [1, 3], [2, 3],
					[0, 4], [1, 4], [2, 4], [3, 4],
					[0, 5],			[2, 5],
				],
				size: [4, 6],
			},
			// Custom mappings
			"FL980": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del", "Ins", "Page Up", "Page Down",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."
				],
				vLeds:  [
					[
						0,  2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,	15, 16, 17, 18,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39, 40,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61, 62,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80, 84, 85, 86,
						88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102, 104, 106, 107, 108, 109,
						110, 111, 112,		116,		120, 121, 122, 123, 125, 126, 127, 128,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],			 [15, 0], [16, 0], [17, 0], [18, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],			 [15, 1], [16, 1], [17, 1], [18, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],			 [15, 2], [16, 2], [17, 2], [18, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],			 [15, 3], [16, 3], [17, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], 		  [12, 4],			[14, 4], [15, 4], [16, 4], [17, 4], [18, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],							[10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5],
				],
				size: [19, 6],
			},
			"Pulsar TKL": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "ISO_#", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",

					"Logo", "Logo 2", "Logo 3", "Logo 4"
				],
				vLeds:  [
					[
						0,   2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,     15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
						88, 89,	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102,	   104,
						110, 111, 112,		116,		120, 121, 122, 123,	  125, 126, 127,
					],
					[
						13, 14, 15, 25
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 4],          [13, 4],            [15, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],

					[14, 3], [15, 3], [16, 3], [16, 3],
				],
				size: [17, 6],
			},
			"Rapture Alpha": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up", "NumLock", "Num /", "Num *", "Num -",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",	"Num 7", "Num 8", "Num 9", "Num +",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",															"Num 4", "Num 5", "Num 6",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",			"Num 1", "Num 2", "Num 3", "Num Enter",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",	"Num 0", "Num .",

					"Left 1", "Left 2", "Left 3", "Left 4", "Left 5", "Left 6", "Left 7",
					"Right 1", "Right 2", "Right 3", "Right 4", "Right 5", "Right 6", "Right 7",
				],
				vLeds:  [
					[
						0,  2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14, 			15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 	37, 38, 39, 		40, 41, 42, 43,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 	59, 60, 61, 		62, 63, 64, 65,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,								84, 85, 86,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99,		102,		104,			106, 107, 108, 109,
						110, 111, 112,		116,		120, 121, 122, 123,			125, 126, 127, 		128,	130,
					],
					[
						13, 12, 11, 10, 9, 8, 7,
						14, 15, 16, 17,	18, 19, 20
					]
				],
				vLedPositions: [
					[1, 0], [2, 0], [3, 0], [4, 0], [5, 0],         [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],   [15, 0], [16, 0], [17, 0],
					[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],   [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1], [21, 1],
					[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],   [15, 2], [16, 2], [17, 2], [18, 2], [19, 2], [20, 2], [21, 2],
					[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],          [14, 3],							  [18, 3], [19, 3], [20, 3],
					[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],                   [14, 4],            [16, 4],		  [18, 4], [19, 4], [20, 4], [21, 4],
					[1, 5], [2, 5], [3, 5],                         [7, 5],                          [11, 5], [12, 5], [13, 5], [14, 5],   [15, 5], [16, 5], [17, 5], [18, 5], 		    [20, 5],

					[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
					[22, 0], [22, 1], [22, 2], [22, 3], [22, 4], [22, 5], [22, 6],
				],
				size: [23, 7],
			},
			"DeepCool KG722": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "'", //15
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", //15
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",       "Enter", "PgUp", //15
					"Left Shift",      "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", "Up Arrow", "PgDn", //13
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow" //8
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 	80, 81,
						88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,  101, 102, 103,
						110, 111, 112,		116,	  120, 121, 122, 123, 124, 125,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],          [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], 	      [12, 3], [13, 3], [14, 3],
					[0, 4], [1, 4], [2, 4],                 [5, 4],                 [8, 4], [9, 4], [10, 4], 		  [12, 4], [13, 4], [14, 4]
				],
				size: [15, 5],
			},
			"Husky Blizzard": {
				vLedNames: [
					"Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ISO_#", "Enter",
					"Left Shift", "ISO_<", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift",
					"Left Ctrl", "Left Win", "Left Alt",        "Space",      "Right Alt", "Menu", "Right Ctrl", "Fn"
				],
				vLeds:  [
					[
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,  36,
						44,  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58,
						66,   68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
						88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,      102,
						110, 111, 112,         116,          120, 121, 122, 123
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],   [13, 0],
					[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],  [13, 1],
					[0, 2],   [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],
					[0, 3],  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],            [13, 3],
					[0, 4], [1, 4], [2, 4],                         [6, 4],                            [10, 4], [11, 4], [12, 4], [13, 4]
				],
				size: [14, 5],
			},
			"Cidoo C75": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", 			"Backspace", 						"Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", 				 "\\", 						    "PgUp",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",			 "Enter", 						    "PgDn",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/",     "Right Shift", 	   			"Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", 	  "Left Arrow", "Down Arrow", "Right Arrow",

					"Ambient1", "Ambient 2", "Ambient3"
				],
				vLeds:  [
					[
						0,  2,  3,  4,  5,  7,  8,  9,  10, 11, 12, 13, 14, 15,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36,	  37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58,   59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,		  81,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101,   102,
						110, 111, 112,		116,		120, 121, 122,    123, 124, 126,
					],
					[
						130, 131, 132 //ambient
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],          [14, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],

					[15, 0], [15, 1], [15, 2] //ambient leds
				],
				size: [16, 6],
			},
			"HATOR Rockfall 2 MECHA TKL": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",					   "PrtSc", "ScrLk", "Pause",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2, 3, 4, 5,    7, 8, 9, 10,    11, 12, 13, 14,     15, 16, 17,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102,	   104,
						110, 111, 112,		116,		120, 121, 122, 123,	  125, 126, 127,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0],         [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],
					[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                   [13, 4],            [15, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],
				],
				size: [17, 6],
			},
			"Ajazz AK820 MAX": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Insert",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "PgUp",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "PgDn",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "End",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2,  3,  4,  5,  7,  8,  9, 10, 11, 12, 13, 14, 15,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,     80, 81,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 102, 103,
						110, 111, 112,		116,		120, 121, 122,  123, 124, 125,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},
			"KD83A": {
				vLedNames: [
					"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "PrtSc", "Del",
					"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace", "Home",
					"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "End",
					"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "PgUp",
					"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow", "PgDn",
					"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Left Arrow", "Down Arrow", "Right Arrow",
				],
				vLeds:  [
					[
						0,   2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
						22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37,
						44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59,
						66, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,     80, 81,
						88, 	90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 101, 102, 103,
						110, 111, 112,		116,		120, 121, 122,  123, 124, 125,
					]
				],
				vLedPositions: [
					[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
					[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1],
					[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3], [14, 3],
					[0, 4], 		[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4],
					[0, 5], [1, 5], [2, 5],                         [6, 5],					[9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
				],
				size: [15, 6],
			},
		};
	}
}

const NuvotondeviceLibrary = new deviceLibrary();
const Nuvoton = new Nuvoton_Device_Protocol();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
