import LCD from "@SignalRGB/lcd";
import Serial from "@SignalRGB/serial";
export function Name() { return "Turzx Device"; }
export function VendorId() { return 0x1A86; }
export function ProductId() { return Object.keys(TURZXdeviceLibrary.PIDLibrary); }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/turzx"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "lcd";}
export function Type() { return "serial"; }
export function SubdeviceController() { return true; }
export function Validate(endpoint) { return endpoint.interface === 0; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
/* global
screenSize:readonly
*/
export function ControllableParameters() { 
	return [
		{ property:"screenSize", group:"", label:"Screen size", description: "Sets your device screen size", type:"combobox", values:["2.1", "3.5", "5.5", "8.8"], default:"2.1" },
	]; 
}

export function Initialize() {
	TURZX.Initialize();
}

export function Render() {
	TURZX.sendColors();
}

export function Shutdown(SystemSuspending) {
	TURZX.turnScreenOff();
}

export function onscreenSizeChanged() {
	TURZX.restartLCD(); // Needs to be restart otherwise the image gets scrambled
	TURZX.Initialize(); // Needs to redo the whole connection flow
}

class TURZX_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceProductID: 0x0000,
			DeviceName: "Turzx Device",
			width: 320,
			height: 480,
			baudRate: 9600,
			dataBits: 8,
			stopBits: "One",
			parity: "None",
			orientation: 0,
			Initialized: false,
			roundedCorners: false,
		};
		
		this.previousFrameData = null;

		this.Commands = {
			RESTART: 0x65, // Restart the display
			SCREEN_OFF : 0x6C,  // Turns the screen off
			SCREEN_ON : 0x6D,  // Turns the screen on
			SET_BRIGHTNESS : 0x6E, // Sets the screen brightness
			SET_IMAGE : 0xC5, // Displays an image on the screen
		};
	}

	getDeviceProperties(deviceID) { return TURZXdeviceLibrary.LCDLibrary[deviceID];};

	getDeviceProductId() { return this.Config.DeviceProductID; }
	setDeviceProductId(productID) { this.Config.DeviceProductID = productID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getWidth() { return this.Config.width; }
	setWidth(width) { this.Config.width = width; }	

	getHeight() { return this.Config.height; }
	setHeight(height) { this.Config.height = height; }

	getBaudRate() { return this.Config.baudRate; }
	setBaudRate(baudRate) { this.Config.baudRate = baudRate; }

	getDataBits() { return this.Config.dataBits; }
	setDataBits(dataBits) { this.Config.dataBits = dataBits; }

	getStopBits() { return this.Config.stopBits; }
	setStopBits(stopBits) { this.Config.stopBits = stopBits; }
	
	getParity() { return this.Config.parity; }
	setParity(parity) { this.Config.parity = parity; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	getRoundedCorners() { return this.Config.roundedCorners; }
	setRoundedCorners(corners) { this.Config.roundedCorners = corners; }

	getInitialized() { return this.Config.Initialized; }
	setInitialized(status) { this.Config.Initialized = status; }

	updateModel() {
		//Initializing vars
		this.setDeviceProductId(device.productId());

		const DeviceProperties = this.getDeviceProperties(screenSize);

		if(DeviceProperties){
			this.setDeviceName(DeviceProperties.name);
			this.setDeviceImage(DeviceProperties.image);
			this.setWidth(DeviceProperties.width);
			this.setHeight(DeviceProperties.height);
			this.setBaudRate(DeviceProperties.baudRate || 9600);
			this.setDataBits(DeviceProperties.dataBits || 8);
			this.setStopBits(DeviceProperties.stopBits || "One");
			this.setParity(DeviceProperties.parity || "None");
			this.setRoundedCorners(DeviceProperties.roundedCorners || false)

			device.log(`Screen size set to: ` + this.getDeviceName());
			device.setName("Turzx " + this.getDeviceName());
			device.setImageFromUrl(this.getDeviceImage());
		}
	}

	Initialize() {

		this.updateModel();

		if(!Serial.isConnected()) {
			console.log("Turzx LCD not connected, attempting to connect...");
			Serial.disconnect();
			Serial.connect(
				{ baudRate: this.getBaudRate(), dataBits: this.getDataBits(), stopBits: this.getStopBits(), parity: this.getParity() }
			);
		}

		if (Serial.isConnected()) {
			console.log("Turzx LCD Initialized");
			this.setInitialized(true);

			LCD.initialize({ width: this.getWidth(), height: this.getHeight(), circularPreview: this.getRoundedCorners() });

			this.startLCD();
		} else {
			console.log("Turzx LCD NOT Initialized. Is there another app controlling the device?");
		}
	}

	sendColors() {

		if(!this.getInitialized()){
			return;
		}

		const imageData = LCD.getFrame({format: "RGB"});
		const imageData565 = this.RGBToRGB565(imageData);
		const width = this.getWidth();
		const height = this.getHeight();
		let chunkSize = width * 8;

		// Check if this is the first frame
		if (this.previousFrameData === null) {
			// First frame - send everything
			this.sendCommand(this.Commands.SET_IMAGE, 0, 0, width - 1, height - 1);

			for (let i = 0; i < imageData565.length; i += chunkSize) {
				Serial.write(imageData565.slice(i, i + chunkSize));
			}
			
			this.previousFrameData = new Uint8Array(imageData565);
		} else {
			// Divide screen into zones and check each zone for changes
			const zoneWidth = 40;  // pixels
			const zoneHeight = 30; // pixels
			const bytesPerPixel = 2; // RGB565 uses 2 bytes per pixel
			
			const zonesX = Math.ceil(width / zoneWidth);
			const zonesY = Math.ceil(height / zoneHeight);
			
			for (let zoneY = 0; zoneY < zonesY; zoneY++) {
				for (let zoneX = 0; zoneX < zonesX; zoneX++) {
					const startX = zoneX * zoneWidth;
					const startY = zoneY * zoneHeight;
					const endX = Math.min(startX + zoneWidth, width);
					const endY = Math.min(startY + zoneHeight, height);
					
					// Check if this zone has changed
					let zoneChanged = false;
					for (let y = startY; y < endY && !zoneChanged; y++) {
						for (let x = startX; x < endX; x++) {
							const pixelIndex = (y * width + x) * bytesPerPixel;
							if (this.previousFrameData[pixelIndex] !== imageData565[pixelIndex] ||
								this.previousFrameData[pixelIndex + 1] !== imageData565[pixelIndex + 1]) {
								zoneChanged = true;
								break;
							}
						}
					}
					
					if (zoneChanged) {

						// Send only this zone
						this.sendCommand(this.Commands.SET_IMAGE, 
						startX, startY, endX - 1, endY - 1);
												
						// Extract zone data
						const zoneData = [];
						for (let y = startY; y < endY; y++) {
							for (let x = startX; x < endX; x++) {
								const pixelIndex = (y * width + x) * bytesPerPixel;
								zoneData.push(imageData565[pixelIndex]);
								zoneData.push(imageData565[pixelIndex + 1]);
							}
						}
						
						// Send the zone data in chunks
						for (let i = 0; i < zoneData.length; i += chunkSize) {
							Serial.write(zoneData.slice(i, i + chunkSize));
						}
						
						// Update previous frame data for this zone
						for (let y = startY; y < endY; y++) {
							for (let x = startX; x < endX; x++) {
								const pixelIndex = (y * width + x) * bytesPerPixel;
								this.previousFrameData[pixelIndex] = imageData565[pixelIndex];
								this.previousFrameData[pixelIndex + 1] = imageData565[pixelIndex + 1];
							}
						}
					}
				}
			}
		}
	}

	startLCD() {
		Serial.write([0xFF, 0, 0, 0, 0]);
		device.pause(1);

		this.setBrightness(100);
		device.pause(1);

		this.turnScreenOn();
		device.pause(1);

		Serial.write([0, 0, 0, 0, 0, 0x7A, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
		device.pause(1);
	}

	restartLCD() {
		console.log("Restarting the screen...")
		this.sendCommand(this.Commands.RESTART, 0, 0, 0, 0)
		device.pause(1)

		Serial.disconnect();

		device.pause(1000)
		device.pause(1000)
		device.pause(1000)
		device.pause(1000)
		device.pause(1000)
	}

	turnScreenOn() {
		this.sendCommand(this.Commands.SCREEN_ON, 0, 0, 0, 0);
		console.log("Turzx LCD Screen On");
	}

	turnScreenOff() {
		this.sendCommand(this.Commands.SCREEN_OFF, 0, 0, 0, 0);
		Serial.disconnect();
		this.setInitialized(false);
		console.log("Turzx LCD Disconnected");
	}

	setBrightness(brightness) {
		const normalizedBrightness = 255 - ((brightness / 100) * 255);

		this.sendCommand(this.Commands.SET_BRIGHTNESS, normalizedBrightness, 0, 0, 0);
		console.log("Brightness set to: " + brightness + "%");
	}
 
	sendCommand(command, x, y, width, height) {

		let packet = [];

		packet[0] = (x >> 2)
		packet[1] = (((x & 3) << 6) + (y >> 4))
		packet[2] = (((y & 15) << 4) + (width >> 6))
		packet[3] = (((width & 63) << 2) + (height >> 8))
		packet[4] = (height & 255)
		packet[5] = command

		Serial.write(packet);
		device.pause(1);
	}

	RGBToRGB565(RGBData) {
	  const byteArray = [];

	  // Process array in groups of 3 (R, G, B)
	  for (let i = 0; i < RGBData.length; i += 3) {
		  const r = RGBData[i] || 0;
		  const g = RGBData[i + 1] || 0;
		  const b = RGBData[i + 2] || 0;

		  // Scale down to 5-6-5 bits
		  const r5 = Math.round(r * 31 / 255);
		  const g6 = Math.round(g * 63 / 255);
		  const b5 = Math.round(b * 31 / 255);

		  // Pack into 16-bit value
		  const rgb565 = (r5 << 11) | (g6 << 5) | b5;

		  // Split into two bytes (little-endian)
		  byteArray.push(rgb565 & 0xFF);        // Low byte
		  byteArray.push((rgb565 >> 8) & 0xFF); // High byte
	  }

	  return byteArray;
  	}
}

class deviceLibrary {
	constructor(){
		this.PIDLibrary	=	{
			0x5722: "Turzx",
		}

		this.LCDLibrary =	{

			"2.1": {
				name: "LCD 2.1",
				width: 480,
				height: 480,
				baudRate: 9600,
				dataBits: 8,
				stopBits: "One",
				parity: "None",
				image: "https://assets.signalrgb.com/devices/brands/turzx/misc/lcd-21.png",
				roundedCorners: true
			},

			"3.5": {
				name: "LCD 3.5",
				width: 320,
				height: 480,
				baudRate: 9600,
				dataBits: 8,
				stopBits: "One",
				parity: "None",
				image: "https://assets.signalrgb.com/devices/brands/turzx/misc/lcd-35.png"
			},

			"5.5": {
				name: "LCD 5.5",
				width: 480,
				height: 800,
				baudRate: 9600,
				dataBits: 8,
				stopBits: "One",
				parity: "None",
				image: "https://assets.signalrgb.com/devices/brands/turzx/misc/lcd-55.png"
			},

			"8.8": {
				name: "LCD 8.8",
				width: 1920,
				height: 480,
				baudRate: 9600,
				dataBits: 8,
				stopBits: "One",
				parity: "None",
				image: "https://assets.signalrgb.com/devices/brands/turzx/misc/lcd-88.png"
			},
		};
	}
}

const TURZXdeviceLibrary = new deviceLibrary();
const TURZX = new TURZX_Device_Protocol();
