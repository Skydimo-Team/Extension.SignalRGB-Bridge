export function Name() { return "ASUS Ryuo Device"; }
export function VendorId() { return 0x0B05; }
export function ProductId() { return Object.keys(ASUSdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx & svenigan"; }
export function Documentation(){ return "troubleshooting/ASUS"; }
export function Size() { return [1, 1]; }
export function SupportsFanControl(){ return true; }
export function DeviceType(){return "aio";}
export function Type() {return "hybrid"; }
export function Validate(endpoint) { return endpoint.interface === 1 ; }
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
		{property:"forcedColor", group:"lighting", label:"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabLED", min:"0", max:"360", type:"color", default:"#009bde"},
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

export class ASUS_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "ASUS Ryuo Device",
			LEDNames: [],
			LEDPositions: [],
			LEDs: [],
			DeviceEndpoint: { "interface": 1, "usage": 0x00A1, "usage_page": 0xFF72, "collection": 0x0000 }
		};
	}

	getDeviceProperties(deviceID) { return ASUSdeviceLibrary.PIDLibrary[deviceID];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceEndpoint() { return this.Config.DeviceEndpoint; }
	setDeviceEndpoint(deviceEndpoint) { this.Config.DeviceEndpoint = deviceEndpoint; }

	getLEDNames() { return this.Config.LEDNames; }
	setLEDNames(LEDNames) { this.Config.LEDNames = LEDNames; }

	getLEDPositions() { return this.Config.LEDPositions; }
	setLEDPositions(LEDPositions) { this.Config.LEDPositions = LEDPositions; }

	getLEDs() { return this.Config.LEDs; }
	setLEDs(LEDs) { this.Config.LEDs = LEDs; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	Initialize() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const DeviceProperties = this.getDeviceProperties(this.getDeviceProductId());
		this.setDeviceName(DeviceProperties.name);
		this.setDeviceEndpoint(DeviceProperties.endpoint);
		this.setLEDNames(DeviceProperties.LEDNames);
		this.setLEDPositions(DeviceProperties.LEDPositions);
		this.setLEDs(DeviceProperties.LEDs);
		this.setDeviceImage(DeviceProperties.image);

		device.log(`Device model found: ` + this.getDeviceName());
		device.setName("ASUS " + this.getDeviceName());
		device.setSize(DeviceProperties.size);
		device.setControllableLeds(this.getLEDNames(), this.getLEDPositions());
		device.setImageFromUrl(this.getDeviceImage());
		device.set_endpoint(
			DeviceProperties.endpoint[`interface`],
			DeviceProperties.endpoint[`usage`],
			DeviceProperties.endpoint[`usage_page`],
			DeviceProperties.endpoint[`collection`]
		);
	}

	sendColors(overrideColor) {

		const deviceLEDPositions	= this.getLEDPositions();
		const RGBData				= [];

		for (let iIdx = 0; iIdx < deviceLEDPositions.length; iIdx++) {
			const iPxX = deviceLEDPositions[iIdx][0];
			const iPxY = deviceLEDPositions[iIdx][1];
			let color;

			if(overrideColor){
				color = hexToRgb(overrideColor);
			}else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			}else{
				color = device.color(iPxX, iPxY);
			}

			// Calculate which chunk this LED belongs to
			const chunkIndex = Math.floor(iIdx / 16);
			const positionInChunk = iIdx % 16;

			// Calculate the base index for this chunk (each chunk is 48 bytes: 16R + 16G + 16B)
			const chunkBaseIndex = chunkIndex * 16 * 3;

			// Store RGB values in the chunk format
			RGBData[chunkBaseIndex + positionInChunk] = color[0];
			RGBData[chunkBaseIndex + 16 + positionInChunk] = color[1];
			RGBData[chunkBaseIndex + (16 * 2) + positionInChunk] = color[2];
		}

		this.writeColors(RGBData);
	}

	writeColors(RGBData) {

		device.write([0xEC, 0xC1], 65);
		device.pause(1);

		device.write([0xEC, 0x7F, 0x04, 0x00, 0x03], 65);
		device.pause(1);

		device.bulk_transfer(0x01, RGBData, 768);
		device.pause(1);
	}
}

export class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x1A51: {
				name: "Ryuo III",
				size: [17, 19],
				LEDNames: [
					"LED 1", "LED 2", "LED 3",
					"LED 4", "LED 5", "LED 6", "LED 7", "LED 8", "LED 9", "LED 10", "LED 11", "LED 12",
					"LED 13", "LED 14", "LED 15", "LED 16", "LED 17", "LED 18", "LED 19", "LED 20", "LED 21", "LED 22", "LED 23", "LED 24",
					"LED 25", "LED 26", "LED 27", "LED 28", "LED 29", "LED 30", "LED 31", "LED 32", "LED 33", "LED 34", "LED 35", "LED 36", "LED 37",
					"LED 38", "LED 39", "LED 40", "LED 41", "LED 42", "LED 43", "LED 44", "LED 45", "LED 46", "LED 47", "LED 48", "LED 49", "LED 50", "LED 51", "LED 52",
					"LED 53", "LED 54", "LED 55", "LED 56", "LED 57", "LED 58", "LED 59", "LED 60", "LED 61", "LED 62", "LED 63", "LED 64", "LED 65", "LED 66", "LED 67", "LED 68",
					"LED 69", "LED 70", "LED 71", "LED 72", "LED 73", "LED 74", "LED 75", "LED 76", "LED 77", "LED 78", "LED 79", "LED 80", "LED 81", "LED 82", "LED 83", "LED 84", "LED 85",
					"LED 86", "LED 87", "LED 88", "LED 89", "LED 90", "LED 91", "LED 92", "LED 93", "LED 94", "LED 95", "LED 96", "LED 97", "LED 98", "LED 99", "LED 100", "LED 101", "LED 102",
					"LED 103", "LED 104", "LED 105", "LED 106", "LED 107", "LED 108", "LED 109", "LED 110", "LED 111", "LED 112", "LED 113", "LED 114", "LED 115", "LED 116", "LED 117", "LED 118", "LED 119",
					"LED 120", "LED 121", "LED 122", "LED 123", "LED 124", "LED 125", "LED 126", "LED 127", "LED 128", "LED 129", "LED 130", "LED 131", "LED 132", "LED 133", "LED 134", "LED 135", "LED 136",
					"LED 137", "LED 138", "LED 139", "LED 140", "LED 141", "LED 142", "LED 143", "LED 144", "LED 145", "LED 146", "LED 147", "LED 148", "LED 149", "LED 150", "LED 151", "LED 152", "LED 153",
					"LED 154", "LED 155", "LED 156", "LED 157", "LED 158", "LED 159", "LED 160", "LED 161", "LED 162", "LED 163", "LED 164", "LED 165", "LED 166", "LED 167", "LED 168", "LED 169", "LED 170",
					"LED 171", "LED 172", "LED 173", "LED 174", "LED 175", "LED 176", "LED 177", "LED 178", "LED 179", "LED 180", "LED 181", "LED 182", "LED 183", "LED 184", "LED 185", "LED 186", "LED 187",
					"LED 188", "LED 189", "LED 190", "LED 191", "LED 192", "LED 193", "LED 194", "LED 195", "LED 196", "LED 197", "LED 198", "LED 199", "LED 200", "LED 201", "LED 202", "LED 203",
					"LED 204", "LED 205", "LED 206", "LED 207", "LED 208", "LED 209", "LED 210", "LED 211", "LED 212", "LED 213", "LED 214", "LED 215", "LED 216", "LED 217", "LED 218",
					"LED 219", "LED 220", "LED 221", "LED 222", "LED 223", "LED 224", "LED 225", "LED 226", "LED 227", "LED 228", "LED 229", "LED 230", "LED 231",
					"LED 232", "LED 234", "LED 235", "LED 236", "LED 237", "LED 238", "LED 239", "LED 240", "LED 241", "LED 242", "LED 243", "LED 244",
					"LED 245", "LED 246", "LED 247", "LED 248", "LED 249", "LED 250", "LED 251", "LED 252", "LED 253",
					"LED 254", "LED 255", "LED 256"
				],
				LEDPositions: [
					[7, 0], [8, 0], [9, 0],
					[4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1],
					[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
					[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
					[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4],
					[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5],
					[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [15, 6], [16, 6],
					[0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [16, 7],
					[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8],
					[0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9],
					[0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10], [16, 10],
					[0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11],
					[0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12],
					[0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13],
					[1, 14], [2, 14], [3, 14], [4, 14], [5, 14], [6, 14], [7, 14], [8, 14], [9, 14], [10, 14], [11, 14], [12, 14], [13, 14], [14, 14], [15, 14],
					[2, 15], [3, 15], [4, 15], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [14, 15],
					[3, 16], [4, 16], [5, 16], [6, 16], [7, 16], [8, 16], [9, 16], [10, 16], [11, 16], [12, 16], [13, 16], [14, 16],
					[4, 17], [5, 17], [6, 17], [7, 17], [8, 17], [9, 17], [10, 17], [11, 17], [12, 17],
					[7, 18], [8, 18], [9, 18],
				],
				LEDs: [
					0, 1, 2,
					3, 4, 5, 6, 7, 8, 9, 10, 11,
					12,	13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
					24,	25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
					37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
					52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67,
					68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
					85,	86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101,
					102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
					119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135,
					136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152,
					153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169,
					170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186,
					187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202,
					203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217,
					218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230,
					231, 232, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243,
					244, 245, 246, 247, 248, 249, 250, 251, 252,
					253, 254, 255
				],
				endpoint : { "interface": 1, "usage": 0x00A1, "usage_page": 0xFF72, "collection": 0x0000 },
				image: "https://assets.signalrgb.com/devices/brands/asus/aios/ryuo-3.png",
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
