export function Name() { return "ASUS Monitor"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return Object.keys(ASUSdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/asus"; }
export function Size() { return [1, 1]; }
export function DeviceType(){ return "other"; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
export function Validate(endpoint) { return endpoint.interface === 0; }
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
	ASUS.Initialize();
}

export function Render() {
	ASUS.sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	ASUS.sendColors(color);
}

class ASUS_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "ASUS Monitor",
			DeviceEndpoint: { "interface": 0, "usage": 0x0001, "usage_page": 0xFFA0, "collection": 0x0000 },
			LedNames: [],
			LedPositions: [],
			Leds: [],
		};
	}

	getDeviceProperties(deviceID) { return ASUSdeviceLibrary.PIDLibrary[deviceID];};

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

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

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

		device.log("Device model found: " + this.getDeviceName());
		device.setName("ASUS " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLedNames(), this.getLedPositions());
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(
			DeviceProperties.endpoint[`interface`],
			DeviceProperties.endpoint[`usage`],
			DeviceProperties.endpoint[`usage_page`],
			DeviceProperties.endpoint[`collection`]
		);
	}

	controlCommand(packet) {

		if(packet.length > 4 ){
			return;
		}
		const data = [0x03, 0x02, 0xA1, 0x80].concat(packet);
		device.send_report(data, 8);
	}

	sendColors(overrideColor) {

		this.controlCommand([0x20, 0x01, 0x00, 0x00]);
		this.controlCommand([0x30, 0x01, 0x00, 0x00]);
		this.controlCommand([0xA0, 0x01, 0x00, 0x00]);

		const deviceLedPositions	= this.getLedPositions();
		const deviceLeds			= this.getLeds();

		for (let i = 0; i < deviceLeds.length; i++) {
			const iPxX = deviceLedPositions[i][0];
			const iPxY = deviceLedPositions[i][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else {
				color = device.color(iPxX, iPxY);
			}

			this.controlCommand([(i*3),	color[0], 0x00, 0x00]);		// R
			this.controlCommand([(i*3)+1, color[2], 0x00, 0x00]);	// B
			this.controlCommand([(i*3)+2, color[1], 0x00, 0x00]);	// G
		}
	}
}

class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x186E: {
				name: "PG27UQ",
				size: [3, 1],
				LedNames: ["LED 1", "LED 2", "LED 3"],
				LedPositions: [ [0, 0], [1, 0], [2, 0] ],
				Leds: [0, 1, 2],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFA0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/misc/pg27uq.png"
			},
			0x1931: {
				name: "PG43UQ",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [ [0, 0] ],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFA0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/misc/pg27uq.png"
			},
			0x1AC5: {
				name: "PG248QP",
				size: [1, 1],
				LedNames: ["LED 1"],
				LedPositions: [ [0, 0] ],
				Leds: [0],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFA0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/misc/pg27uq.png"
			},
			0x1941: {
				name: "PG32UQX",
				size: [5, 3],
				LedNames: ["LED 1", "LED 2", "LED 3", "LED 4", "Logo"],
				LedPositions: [
					[0, 0], [1, 0], 		[3, 0], [4, 0],
								    [2, 2]
				],
				Leds: [0, 1, 2, 3, 4],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFA0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/misc/pg27uq.png"
			},
			0x18d4: {
				name: "PG35VQ",
				size: [5, 3],
				LedNames: ["LED 1", "LED 2", "LED 3", "LED 4", "Logo"],
				LedPositions: [
					[0, 0], [1, 0], 		[3, 0], [4, 0],
								    [2, 2]
				],
				Leds: [0, 1, 2, 3, 4],
				endpoint : { "interface": 0, "usage": 0x0001, "usage_page": 0xFFA0, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/misc/pg27uq.png"
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
