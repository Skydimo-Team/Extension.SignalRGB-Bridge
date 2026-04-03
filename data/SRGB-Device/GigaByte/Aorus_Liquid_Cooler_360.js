export function Name() { return "Gigabyte Aorus Liquid Cooler 360"; }
export function VendorId() { return 0x1044; }
export function ProductId() { return 0x7a46; }
export function Publisher() { return "Nogait"; }
export function Size() { return [10, 10]; }
export function DefaultPosition() { return [10, 100]; }
export function DefaultScale() { return 8.0; }
export function ConflictingProcesses() {
	return ["RGBFusion.exe"];
}
export function DeviceType(){return "aio";}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
speed:readonly
tempRpmIndicator:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type": "combobox", "values": ["Forced Static", "Static", "Pulse", "Flash", "Double flash", "Color cycle", "Color shift", "Rainbow loop", "Gradient", "Tricolor", "Wave", "Radiate"], "default": "Static" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min": "0", "max": "360", "type": "color", "default": "#009bde" },
		{ "property": "speed", "group": "lighting", "label": "Speed", description: "Sets the effect speed", "step": "1", "type": "number", "min": "0", "max": "7", "default": "2" },
		{ "property": "tempRpmIndicator", "group": "lighting", "label": "Enable CPU Temp/RPM Indicator", description : "Enable CPU Temp/RPM Indicator", "type": "boolean", "default": "0" }
	];
}

const Mode = {
	'Static': 0x01,
	'Pulse': 0x02,
	'Flash': 0x04,
	'Double flash': 0x05,
	'Color cycle': 0x03,
	'Color shift': 0x07,  // colors for ring leds = colors for shift
	'Gradient': 0x06, // uses color from ring led 1
	'Rainbow loop': 0x0a,
	'Tricolor': 0x0b, // colors for ring leds 1-3 are used
	'Wave': 0x08,
	'Radiate': 0x09,
};

const brightness = 100; // keep native brightness at max, instead use SignalRGB brightness slider that adjusts color values

const vLedNames = ["Ring Led 1", "Ring Led 2", "Ring Led 3", "Ring Led 4", "Ring Led 5", "Ring Led 6", "Ring Led 7", "Ring Led 8", "Ring Led 9"];
const vLedPositions = [[4, 6], [9, 3], [8, 1], [7, 3], [7, 5], [7, 7], [8, 9], [9, 7], [9, 5]];

let currentMode = null;
let currentSpeed = 2; // 0..7
let currentColors = null;

export function Initialize() {
	updateStateIfRequired(false);
	updateTempRgbIndicator();
}

export function onLightingModeChanged() {
	updateStateIfRequired(false);
}

export function onspeedChanged() {
	updateStateIfRequired(false);
}

export function ontempRpmIndicatorChanged() {
	updateTempRgbIndicator();
}

export function Render() {
	updateColorIfRequired(false);
}

export function Shutdown() {
	updateStateIfRequired(true);
	updateColorIfRequired(true);
}

function updateStateIfRequired(shutdown) {
	let mode = Mode[LightingMode];

	if (mode === undefined || shutdown) {
		mode = Mode.Static;
	}

	if (mode !== currentMode || speed !== currentSpeed) {
		device.log('Updating state: mode=' + mode + ', speed=' + speed);

		currentMode = mode;
		currentSpeed = speed;

		updateState();
	}
}

function updateState() {
	switch (currentMode) {
	case Mode["Color shift"]:
		sendUpdateState(currentMode, 0x08, 0x02);
		break;
	case Mode.Tricolor:
		sendUpdateState(currentMode, 0x02, 0x00);
		sendColors(false, false);
		// sendB6Packet();
		sendUpdateState(currentMode, 0x02, 0x01);
		// another colors update will be sent in sendColors

		break;
	case Mode.Gradient:
		updateGradientColor();
		break;
	case Mode.Radiate:
		sendUpdateState(currentMode, 0x00, 0x02);
		break;
	default:
		sendUpdateState(currentMode, 0x00, 0x00);  // logo
		// sendB6Packet();
		sendUpdateState(currentMode, 0x08, 0x01);  // ring
		// sendB6Packet();
		break;
	}

	currentColors = null; // force colors update
}

function updateColorIfRequired(shutdown) {
	const zoneColors = [...Array(9)].map((_, i) => getColorForLed(i, shutdown));

	if (currentColors == null || !deepArraysEquals(zoneColors, currentColors)) {
		device.log('Updating colors: ' + zoneColors);
		currentColors = zoneColors;
		updateColor(shutdown);
	}
}

function updateColor(shutdown) {
	switch (currentMode) {
	case Mode["Color cycle"]:
	case Mode["Rainbow loop"]:
	case Mode.Wave:
		// do nothing, the mode will work by itself
		break;
	case Mode.Gradient:
		updateGradientColor();
		break;
	case Mode.Radiate:
		sendColors(false, shutdown);
		break;
	default:
		sendColors(true, shutdown);
		break;
	}
}

function sendColors(includeLogo) {
	if (includeLogo) {
		sendLogoColor(currentColors[0]);
	}

	sendTwoZoneColorPacket(0, currentMode, currentColors[1], currentColors[2]);
	sendTwoZoneColorPacket(1, currentMode, currentColors[3], currentColors[4]);
	sendTwoZoneColorPacket(2, currentMode, currentColors[5], currentColors[6]);
	sendTwoZoneColorPacket(3, currentMode, currentColors[7], currentColors[8]);

	// sendB6Packet();
}

function getColorForLed(led, shutdown = false) {
	const iX = vLedPositions[led][0];
	const iY = vLedPositions[led][1];
	let col;

	if (shutdown) {
		col = hexToRgb(shutdownColor);
	} else if (LightingMode === "Forced Static") {
		col = hexToRgb(forcedColor);
	} else {
		col = device.color(iX, iY);
	}

	return col;
}

function sendLogoColor(col) {
	const r = col[0];
	const g = col[1];
	const b = col[2];

	const packet = [0x00, 0xbc, r, g, b, 0x00, 0x00, 0x00, 0x00];
	send(packet);
}

function sendB6Packet() {  // unknown purpose
	const packet = [0x00, 0xb6, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
	send(packet);
}

function sendUpdateState(mode, partMark1, partMark2) {
	const packet = [0x00, 0xc9, mode, brightness, currentSpeed, partMark1, partMark2, 0x00, 0x00];
	send(packet);
}

function sendTwoZoneColorPacket(zone, mode, col1, col2) {
	const r1 = col1[0];
	const g1 = col1[1];
	const b1 = col1[2];

	const r2 = col2[0];
	const g2 = col2[1];
	const b2 = col2[2];

	const packet = [0x00, 0xb0 + zone, mode, r1, g1, b1, r2, g2, b2];
	send(packet);
}

function updateGradientColor() {
	sendUpdateState(currentMode, 0x00, 0x00);
	sendGradientColor();
	sendUpdateState(currentMode, 0x0a, 0x00);
	// sendB6Packet();
	sendUpdateState(currentMode, 0x00, 0x01);
	sendGradientColor();
	sendUpdateState(currentMode, 0x0a, 0x01);
	// sendB6Packet();
}

function sendGradientColor() {
	const col = getColorForLed(1, false);

	const r = col[0];
	const g = col[1];
	const b = col[2];

	const packet = [0x00, 0xcd, r, g, b, 0x00, 0x00, 0x00, 0x00];
	send(packet);
}

function updateTempRgbIndicator() {
	if (tempRpmIndicator == 1) {
		sendEnableTempRgbIndicator();
	} else {
		sendDisableTempRgbIndicator();
	}
}

function sendEnableTempRgbIndicator() {
	device.log('Enabling cpu temp/rpm indicator');

	const packet = [0x00, 0xbd, 0x01, 0x05, 0x00, 0x00, 0x00, 0x00, 0xcc];
	send(packet);
}

function sendDisableTempRgbIndicator() {
	device.log('Disabling cpu temp/rpm indicator');

	const packet = [0x00, 0xbe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xcc];
	send(packet);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function send(packet) {
	device.log('SEND: ' + packet.slice(1).map((n) => n.toString(16)));
	device.send_report(packet, 9);
}

export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xff00 && endpoint.collection ===0x0000;
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function deepArraysEquals(a1, a2) {
	return a1.length == a2.length &&
		a1.every(
			(element, index) => arraysEquals(element, a2[index])
		);
}

function arraysEquals(a1, a2) {
	return a1.length == a2.length &&
		a1.every(
			(element, index) => element === a2[index]
		);
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/gigabyte/aios/aorus-liquid-cooler-360.png";
}