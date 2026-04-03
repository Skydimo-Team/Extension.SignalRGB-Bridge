export function Name() { return "SteelSeries Arena 7"; }
export function VendorId() { return 0x1038; }
export function Documentation(){ return "troubleshooting/steelseries"; }
export function ProductId() { return 0x1A00; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function DeviceType(){return "speakers";}
export function ConflictingProcesses() {
	return ["SteelSeriesGGClient.exe", "SteelSeriesEngine.exe", "SteelSeriesGG.exe","SteelSeriesPrism.exe"];
}
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters(){
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

export function SubdeviceController(){ return true; }

const Arena = {
	Speaker_Left : {
		devicename: "Left Speaker",
		deviceid: 0,
		lednames: [ "Bottom Ring", "Rear" ],
		ledpos:	[ [0, 0], [0, 2] ],
		width: 3,
		height: 3,
		image: "https://assets.signalrgb.com/devices/brands/steelseries/audio/arena-7-left.png"
	},
	Speaker_Right : {
		devicename: "Right Speaker",
		deviceid: 1,
		lednames: [ "Bottom Ring", "Rear" ],
		ledpos:	[ [0, 0], [0, 2] ],
		width: 3,
		height: 3,
		image: "https://assets.signalrgb.com/devices/brands/steelseries/audio/arena-7-right.png"
	}
};

export function Initialize() {
	device.createSubdevice("LeftSpeaker");
	device.setSubdeviceName("LeftSpeaker", `${Arena.Speaker_Left.devicename}`);
	device.setSubdeviceSize("LeftSpeaker", Arena.Speaker_Left.width, Arena.Speaker_Left.height);
	device.setSubdeviceLeds("LeftSpeaker", Arena.Speaker_Left.lednames, Arena.Speaker_Left.ledpos);
	device.setSubdeviceImageUrl("LeftSpeaker", Arena.Speaker_Left.image);

	device.createSubdevice("RightSpeaker");
	device.setSubdeviceName("RightSpeaker", `${Arena.Speaker_Right.devicename}`);
	device.setSubdeviceSize("RightSpeaker", Arena.Speaker_Right.width, Arena.Speaker_Right.height);
	device.setSubdeviceLeds("RightSpeaker", Arena.Speaker_Right.lednames, Arena.Speaker_Right.ledpos);
	device.setSubdeviceImageUrl("RightSpeaker", Arena.Speaker_Right.image);
}

export function Render() {

	SendColorPacket();
}

export function Shutdown() {
	SendColorPacket(true);
}

function SendColorPacket(shutdown = false) {

	let LeftRGBData = [];
	let RightRGBData = [];

	for(let iIdx = 0; iIdx < Arena.Speaker_Left.ledpos.length; iIdx++){

		const iPxX = Arena.Speaker_Left.ledpos[iIdx][0];
		const iPxY = Arena.Speaker_Left.ledpos[iIdx][1];

		let col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.subdeviceColor("LeftSpeaker", iPxX, iPxY);
		}

		LeftRGBData = LeftRGBData.concat(col);
	}

	for(let iIdx = 0; iIdx < Arena.Speaker_Right.ledpos.length; iIdx++){

		const iPxX = Arena.Speaker_Right.ledpos[iIdx][0];
		const iPxY = Arena.Speaker_Right.ledpos[iIdx][1];

		let col;

		if(shutdown) {
			col = hexToRgb(shutdownColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.subdeviceColor("RightSpeaker", iPxX, iPxY);
		}

		RightRGBData = RightRGBData.concat(col);
	}

	const RGBData = LeftRGBData.concat(RightRGBData);

	device.write([0x06, 0xa7, 0x0f].concat(RGBData), 64);

	device.pause(1);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

export function Validate(endpoint) {
	return endpoint.interface === 4 && endpoint.usage_page === 0xffc0;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/steelseries/audio/arena-7.png";
}