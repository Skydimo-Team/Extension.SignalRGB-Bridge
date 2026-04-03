// Modifying SMBUS Plugins is -DANGEROUS- and can -DESTROY- devices.
export function Name() { return "Patriot Viper Steel RGB RAM"; }
export function Publisher() { return "WhirlwindFX"; }
export function Type() { return "SMBUS"; }
export function DeviceType() {return "ram";}
export function Size() { return [1, 5]; }
export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }
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

export function DeviceMessages() {
	return [
		{
			property	: "Limited Zone",
			message		: "Limited Zone",
			tooltip		: "This device's firmware is limited to a single device for multiple sticks in direct control."
		},
	];
}

/** @param {FreeAddressBus} bus */
export function Scan(bus) {
	const addr = 0x77;

	// Skip any non AMD / Nuvoton Busses
	if(!bus.IsSystemBus()){return[];}

	const result = bus.WriteQuick(addr);

	if(result < 0) {
		bus.log(`Failed Quick Write test on Address: 0x77`, {toFile: true});

		return [];
	}

	bus.log("Master Controller Found on Address: " + addr);

	let validSticks = 0;
	const addressList = [0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57];

	for(const addy of addressList) {
		// Send test write
		bus.WriteByte(0x36, 0x00, 0xff);
		bus.pause(30);

		// Read test response, 0x23 means its a Patriot RAM
		if(bus.ReadByte(addy, 0x00) === 0x23) {
			bus.log("Found Potential Patriot Viper Steel RGB RAM at: " + addy, {toFile: true});

			const registerstoReadFrom	= [0x40, 0x41, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68];
			const registerResponses		= [0xFF, 0xFF, 0x50, 0x44, 0x41, 0x31, 0x00, 0x00, 0x00, 0x00];

			// Send test write for control on Viper Steel RGB RAM
			bus.WriteByte(0x37, 0x00, 0xFF);

			let validResponse = true;

			// Read test control response for each register in the array, all responses needs to be valid to state a valid RAM stick
			for(let bytes = 0; bytes < registerResponses.length; bytes++) {

				const response = bus.ReadByte(addy, registerstoReadFrom[bytes]);

				if(response !== registerResponses[bytes]) {
					bus.log(`Potential Patriot Viper Steel RGB RAM returned: ${response}, expected: ${registerResponses[bytes]} for register: ${registerstoReadFrom[bytes]}`, {toFile: true});
					validResponse = false;
				}
			}

			if(validResponse) {
				bus.log(`Patriot Viper Steel RGB RAM found at: ${addy}`, {toFile: true});
				validSticks++;
			}
		}else{
			bus.log(`Failed Quick Write test on Address: ${addy}`, {toFile: true});
		}
	}

	if(validSticks > 0) {
		return [addr];
	}

	return [];

}

const vLeds			= [ 0, 1, 2, 3, 4 ];
const vLedNames		= [ "LED 1", "LED 2", "LED 3", "LED 4", "LED 5" ];
const vLedPositions = [ [0, 0], [0, 1], [0, 2], [0, 3], [0, 4] ];

export function Initialize() {

}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	let color;

	for(let iIdx = 0; iIdx < vLeds.length; iIdx++) {
		const iPxX = vLedPositions[iIdx][0];
		const iPxY = vLedPositions[iIdx][1];

		if(overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		ViperSteelRGB.writeRegister(ViperSteelRGB.registers[iIdx], color);
	}
}

class PatriotViperSteelRGBController {
	constructor() {
		this.registers = [0x17, 0x18, 0x19, 0x1A, 0x1B];
	}

	writeRegister(register, color) {
		bus.WriteByte(register, color[0]);
		bus.WriteByte(color[1], color[2]);
		device.pause(1);
	}
}

const ViperSteelRGB = new PatriotViperSteelRGBController();

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/patriot/ram/viper-steel-rgb.png";
}
