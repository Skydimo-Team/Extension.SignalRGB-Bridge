export function Name() { return "NZXT Keyboard"; }
export function VendorId() { return 0x1E71; }
export function ProductId() { return Object.keys(NZXTdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/keyboards/full-size-keyboard-render.png"; }
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
	NZXT.fetchFWVersion();

	if(compareVersion(NZXT.getFWVersion(), "1.3.71")) {
		NZXT.setUsesNewProtocol(true);
	}

	NZXT.InitializeNZXT();
}

export function Render() {
	NZXT.sendColors();
}

export function Shutdown(SystemSuspending) {


	if(SystemSuspending){
		NZXT.sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		NZXT.sendColors(shutdownColor);
	}

}

function compareVersion(a, b) {
	return compareVersionRecursive(a.split("."), b.split(".")) >= 0;
}

function compareVersionRecursive(a, b) {
	if (a.length === 0) { a = [0]; }

	if (b.length === 0) { b = [0]; }

	if (a[0] !== b[0] || (a.length === 1 && b.length === 1)) {
		return a[0] - b[0];
	}

	return compareVersionRecursive(a.slice(1), b.slice(1));
}

export class NZXT_Keyboard_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "NZXT Keyboard",
			DeviceEndpoint: { "interface": 1, "usage": 0x0001, "usage_page": 0xFF01, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			lastRGBData : new Array(30, 0x00),
			FWVersion : [],
			usesNewProtocol :false
		};
	}

	getDeviceProperties(deviceName) { return NZXTdeviceLibrary.LEDLibrary[deviceName];};

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

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	getFWVersion() { return this.Config.FWVersion; }
	setFWVersion(FWVersion) { this.Config.FWVersion = FWVersion; }

	getUsesNewProtocol() { return this.Config.usesNewProtocol; }
	setUsesNewProtocol(usesNewProtocol) { this.Config.usesNewProtocol = usesNewProtocol; }

	getISO() { return this.Config.isISO; }
	setISO(iso) { this.Config.isISO = iso; }

	getMTKL() { return this.Config.isMTKL; }
	setMTKL(mtkl) { this.Config.isMTKL = mtkl; }

	InitializeNZXT() {
		//Initializing vars
		this.setDeviceProductId(device.productId());
		this.setDeviceName(NZXTdeviceLibrary.PIDLibrary[this.getDeviceProductId()]);

		const DeviceProperties = this.getDeviceProperties(this.getDeviceName());
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setLedNames(DeviceProperties.vLedNames);
		this.setLedPositions(DeviceProperties.vLedPositions);
		this.setDeviceImage(DeviceProperties.image);

		if([0x2107, 0x2108, 0x2131].includes(this.getDeviceProductId())){
			this.setISO(true);
		}

		if(this.getDeviceName() === "Function MiniTKL"){
			this.setMTKL(true);
		}

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName("NZXT " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(DeviceProperties.endpoint[`interface`], DeviceProperties.endpoint[`usage`], DeviceProperties.endpoint[`usage_page`], DeviceProperties.endpoint[`collection`]);
		this.setSoftwareMode();
	}

	setSoftwareMode() {
		device.write([0x43, 0x81, 0x00, 0x84], 64);
		device.write([0x43, 0x81, 0x00, 0x86], 64);
		device.write([0x43, 0x82, 0x00, 0x41, 0x64], 64); //Brightness packet go brr
		device.write([0x43, 0x97, 0x00, 0x10, 0x01], 64);
		device.clearReadBuffer();
	}

	fetchFWVersion() {
		device.clearReadBuffer();
		device.write([0x43, 0x81, 0x00, 0x01], 64);
		device.read([0x43, 0x81, 0x00, 0x01], 64); //no idea what this is for, but honestly we do not care.

		const FWVersion = device.read([0x43, 0x81, 0x00, 0x01], 64).slice(3, 6);

		this.setFWVersion(`${FWVersion[0]}.${FWVersion[1]}.${FWVersion[2]}`);
		device.log(`Firmware Version is ${this.getFWVersion()}`);
	}

	sendColors(overrideColor) {
		if(this.getUsesNewProtocol()) {
			this.sendNewColors(overrideColor);
		} else {
			this.sendOldColors(overrideColor);
		}
	}

	sendOldColors(overrideColor) {

		const deviceLedPositions = this.getLedPositions();

		let packet = [];
		const RGBData = [];

		for(let idx = 0; idx < deviceLedPositions.length; idx++) {
			const iPxX = deviceLedPositions[idx][0];
			const iPxY = deviceLedPositions[idx][1];
			let col;

			if(overrideColor) {
				col = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.color(iPxX, iPxY);
			}

			RGBData[idx * 3] 		= col[0];
			RGBData[idx * 3 + 1] 	= col[1];
			RGBData[idx * 3 + 2] 	= col[2];
		}

		// Zone 1 and 2
		packet[0]   = 0x43;
		packet[1]   = 0xbd;
		packet[2]   = 0x03;
		packet[3]   = 0x10;
		packet[4]   = 0x01;
		packet[5]	= 0x01; //Mapping Esc Key
		packet[7]	= 0x03;
		packet[9]	= 0x03;
		packet[11] 	= 0x03;
		packet[13] 	= this.getISO() === true ? 0x03 : 0x01;
		packet[15] 	= 0x03;
		packet[23] 	= RGBData[0]; // R
		packet[24] 	= RGBData[1]; // G
		packet[25] 	= RGBData[2]; // B
		packet[26] 	= 0x01;
		packet[27] 	= 0x06;
		packet[29] 	= 0x0C;
		packet[31] 	= 0x0C;
		packet[33] 	= 0x0C;
		packet[35] 	= 0x0C;
		packet[37] 	= 0x04;
		packet[45] 	= RGBData[3]; // R
		packet[46] 	= RGBData[4]; // G
		packet[47] 	= RGBData[5]; // B
		packet[48] 	= 0x01;
		packet[49] 	= 0x60;
		packet[51] 	= 0xC0;
		packet[53] 	= 0xC0;
		packet[55] 	= 0xC0;
		packet[57] 	= 0xC0;
		packet[59] 	= 0x20;
		device.write(packet, 65);

		// Zone 3, 4 and 5
		packet = [];
		packet[0]	= 0x43;
		packet[1]   = 0x3d;
		packet[2]   = 0x02;
		packet[6] 	= RGBData[6]; // R
		packet[7] 	= RGBData[7]; // G
		packet[8] 	= RGBData[8]; // B
		packet[9]	= 0x01; //Activation Byte
		packet[10]	= 0x80; //Binary Mapping
		packet[11] 	= 0x01;
		packet[13] 	= 0x03;
		packet[15] 	= 0x03;
		packet[17] 	= 0x03;
		packet[19] 	= 0x03;
		packet[28] 	= RGBData[9]; // R
		packet[29] 	= RGBData[10]; // G
		packet[30] 	= RGBData[11]; // B
		packet[31] 	= 0x01;//Activation Byte
		packet[44] 	= 0xC0;
		packet[46] 	= 0x46;
		packet[47] 	= 0x0E;
		packet[50] 	= RGBData[12]; // R
		packet[51] 	= RGBData[13]; // G
		packet[52] 	= RGBData[14]; // B
		packet[53] 	= 0x01;
		device.write(packet, 65);

		// Zone 6, 7 and 8
		packet = [];
		packet[0]   = 0x43;
		packet[1]   = 0x3D;
		packet[2]   = 0x01;
		packet[5] 	= 0x32;
		packet[6] 	= 0x04;
		packet[7] 	= 0xB0;
		packet[8] 	= 0x11;
		packet[11] 	= RGBData[15]; // R
		packet[12] 	= RGBData[16]; // G
		packet[13] 	= RGBData[17]; // B
		packet[14] 	= 0x01;
		packet[16] 	= 0x40;
		packet[24] 	= 0x40;
		packet[26] 	= 0x40;
		packet[27] 	= 0x08;
		packet[28] 	= 0x43;
		packet[29] 	= 0x08;
		packet[30] 	= 0x40;
		packet[33] 	= RGBData[18]; // R
		packet[34] 	= RGBData[19]; // G
		packet[35] 	= RGBData[20]; // B
		packet[36] 	= 0x01;
		packet[38] 	= this.getMTKL() === true ? 0xF0 : 0x30;
		packet[40] 	= 0x40;
		packet[42] 	= this.getMTKL() === true ? 0xE0 : 0x60;
		packet[44] 	= this.getISO() === true ? 0x70 : 0x60;
		packet[46] 	= 0x20;
		packet[48] 	= 0x34;
		packet[55] 	= RGBData[21]; // R
		packet[56] 	= RGBData[22]; // G
		packet[57] 	= RGBData[23]; // B
		packet[58] 	= 0x01;
		packet[60] 	= 0x0E;
		packet[62] 	= 0x1C;
		device.write(packet, 65);

		// Zone 9 and 10
		packet = [];
		packet[0]   = 0x43;
		packet[1]   = 0x26;
		packet[3]   = 0x1c;
		packet[5] 	= 0x0c;
		packet[7] 	= 0x0c;
		packet[9] 	= 0x0A;
		packet[16] 	= RGBData[24]; // R
		packet[17] 	= RGBData[25]; // G
		packet[18] 	= RGBData[26]; // B
		packet[19] 	= 0x01;
		packet[20] 	= 0x18;
		packet[22] 	= 0x30;
		packet[24] 	= 0x30;
		packet[26] 	= 0x30;
		packet[28] 	= 0x30;
		packet[38] 	= RGBData[27]; // R
		packet[39] 	= RGBData[28]; // G
		packet[40] 	= RGBData[29]; // B
		device.write(packet, 65);
	}

	sendNewColors(overrideColor) {
		const deviceLedPositions = this.getLedPositions();

		const packet = [0x43, 0xbd, 0x01, 0x10, 0x02, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x0a]; //This protocol is less stupid than the previous iteration. Current iteration uses a single packet. the 0xff's are setting every key in every bank on. 0x0a is the number of zones.
		const RGBData = [];

		for(let idx = 0; idx < deviceLedPositions.length; idx++) {
			const iPxX = deviceLedPositions[idx][0];
			const iPxY = deviceLedPositions[idx][1];
			let col;

			if(overrideColor) {
				col = hexToRgb(overrideColor);
			} else if (LightingMode === "Forced") {
				col = hexToRgb(forcedColor);
			} else {
				col = device.color(iPxX, iPxY);
			}

			RGBData[idx * 4] = col[0];
			RGBData[idx * 4 + 1] = col[1];
			RGBData[idx * 4 + 2] = col[2];
			RGBData[idx * 4 + 3] = 0;
		}

		if(!CompareArrays(this.Config.lastRGBData, RGBData)) {
			this.Config.lastRGBData = RGBData;
			device.write(packet.concat(RGBData), 64);
			device.write([0x43, 0x01], 64);
		}

		device.clearReadBuffer();
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x2103: "Function",
			0x2106: "Function", // ISO
			0x2104: "Function TKL",
			0x2107: "Function TKL", // ISO
			0x2105: "Function MiniTKL",
			0x2108: "Function MiniTKL", // ISO

			0x2130: "Function 2",
			0x2131: "Function 2", // ISO
			0x2136: "Function 2"
		};

		this.LEDLibrary	=	{
			"Function":
			{
				size: [10, 5],
				vLedNames: [ "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10" ],
				vLedPositions: [ [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1] ],
				endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFFCA, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/nzxt/keyboards/function.png"
			},
			"Function TKL":
			{
				size: [10, 5],
				vLedNames: [ "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10" ],
				vLedPositions: [ [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1] ],
				endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFFCA, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/nzxt/keyboards/function-tkl.png"
			},
			"Function MiniTKL":
			{
				size: [10, 5],
				vLedNames: [ "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10" ],
				vLedPositions: [ [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1] ],
				endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFFCA, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/nzxt/keyboards/function-mini-tkl.png"
			},
			"Function 2":
			{
				size: [10, 5],
				vLedNames: [ "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10" ],
				vLedPositions: [ [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1] ],
				endpoint : { "interface": 1, "usage": 0x0001, "usage_page": 0xFFCA, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/nzxt/keyboards/function-2.png"
			},
		};
	}
}

const NZXTdeviceLibrary = new deviceLibrary();
const NZXT = new NZXT_Keyboard_Protocol();

function CompareArrays(array1, array2){
	return array1.length === array2.length &&
	array1.every(function(value, index) { return value === array2[index];});
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
