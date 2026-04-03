export function Name() { return "Mountain Macropad"; }
export function VendorId() { return 0x3282; }//
export function ProductId() { return 0x0008; }//0x0001
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [6, 2]; }
export function DefaultPosition(){return [10, 100];}
const DESIRED_HEIGHT = 85;
export function DefaultScale(){return Math.floor(DESIRED_HEIGHT/Size()[1]);}
export function DeviceType(){return "keyboard";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},

	];
}

const vKeys = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
];

const vKeyNames = [
	"M1", "M2", "M3", "M4", "M5", "M6",
	"M7", "M8", "M9", "M10", "M11", "M12"
];

const vKeyPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]
];


export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	device.write([0x00, 0x11], 65); //Mode go brrr
	device.write([0x00, 0x14, 0x00, 0x00, 0x00, 0x01, 0x06], 65); //Mode go brrr
	device.write([0x14, 0x2c, 0x0a, 0x00, 0xff, 0x64, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff], 64); //WHY DOES THIS WORK?
	device.addFeature("keyboard");
	macroInputArray.setCallback(macroHandler);
}

export function Render() {
	sendColors();
	macroEater();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		sendColors(shutdownColor);
	}

}

function macroEater() { //tastes like chicken!
	do {
		const packet = device.read([0x00], 50, 0);

		if(packet[1] === 0x01) {
			macroInputArray.update([packet[43], packet[48]]);
		}

	}
	while(device.getLastReadSize() > 0);
}

const buttonDict = {
	0 : "M1",
	2 : "M2",
	3 : "M3",
	4 : "M4",
	5 : "M5",
	6 : "M6",
	7 : "M7",
	8 : "M8",
	9 : "M9",
	10 : "M10",
	11 : "M11",
	12 : "M12",
};

function macroHandler(buttonCode, isPressed) {

	const buttonName = buttonDict[buttonCode];
	// Send Events for any keys we don't handle above
	const eventData = {
		"keyCode": 0,
		"released": !isPressed,
		"key":buttonName
	};

	device.log(eventData);
	keyboard.sendEvent(eventData, "Key Press");
}

function grabColors(overrideColor) {
	const rgbdata = [];

	for(let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		const iPxX = vKeyPositions[iIdx][0];
		const iPxY = vKeyPositions[iIdx][1];
		let color;

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		const iLedIdx = vKeys[iIdx] * 3;

		rgbdata[iLedIdx] = color[0];
		rgbdata[iLedIdx+1] = color[1];
		rgbdata[iLedIdx+2] = color[2];
	}

	return rgbdata;
}

function sendColors(overrideColor) {

	const rgbdata = grabColors(overrideColor);

	StreamLightingData(rgbdata);
}

function StreamLightingData(RGBData) {

	device.write([0x00, 0x14, 0x2c, 0x00, 0x01, 0x00, 0x4b, 0x00].concat(RGBData), 65);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

/**
 * @callback bitArrayCallback
 * @param {number} bitIdx
 * @param {boolean} state
 */

export class BitArray {
	constructor(length) {
		// Create Backing Array
		this.buffer = new ArrayBuffer(length);
		// Byte View
		this.bitArray = new Uint8Array(this.buffer);
		// Constant for width of each index
		this.byteWidth = 8;

		/** @type {bitArrayCallback} */
		this.callback = (bitIdx, state) => {throw new Error("BitArray(): No Callback Available?");};
	}

	toArray() {
		return [...this.bitArray];
	}

	/** @param {number} bitIdx */
	get(bitIdx) {
		const byte = this.bitArray[bitIdx / this.byteWidth | 0] ?? 0;

		return Boolean(byte & 1 << (bitIdx % this.byteWidth));
	}

	/** @param {number} bitIdx */
	set(bitIdx) {
		this.bitArray[bitIdx / this.byteWidth | 0] |= 1 << (bitIdx % this.byteWidth);
	}

	/** @param {number} bitIdx */
	clear(bitIdx) {
		this.bitArray[bitIdx / this.byteWidth | 0] &= ~(1 << (bitIdx % this.byteWidth));
	}

	/** @param {number} bitIdx */
	toggle(bitIdx) {
		this.bitArray[bitIdx / this.byteWidth | 0] ^= 1 << (bitIdx % this.byteWidth);
	}

	/**
	 * @param {number} bitIdx
	 * @param {boolean} state
	 *  */
	setState(bitIdx, state) {
		if(state) {
			this.set(bitIdx);
		} else {
			this.clear(bitIdx);
		}
	}

	/** @param {bitArrayCallback} callback */
	setCallback(callback){
		this.callback = callback;
	}

	/** @param {number[]} newArray */
	update(newArray) {
		// Check Every Byte
		for(let byteIdx = 0; byteIdx < newArray.length; byteIdx++) {
			const value = newArray[byteIdx] ?? 0;

			if(this.bitArray[byteIdx] === value) {
				continue;
			}

			// Check Every bit of every changed Byte
			for (let bit = 0; bit < this.byteWidth; bit++) {
				const isPressed = Boolean((value) & (1 << (bit)));

				const bitIdx = byteIdx * 8 + bit;

				// Skip if the new bit state matches the old bit state
				if(isPressed === this.get(bitIdx)) {
					continue;
				}

				// Save new State
				this.setState(bitIdx, isPressed);

				// Fire callback
				this.callback(bitIdx, isPressed);
			}

		}
	}
}
/* eslint-enable complexity */
const macroInputArray = new BitArray(2);

export function Validate(endpoint) {
	return endpoint.interface === 2;
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/mountain/misc/macropad.png";
}