export function Name() { return "NZXT Smart Device V1"; }
export function VendorId() { return 0x1E71; }
export function ProductId() { return 0x1714;}
export function Publisher() { return "WhirlwindFX"; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function Size() { return [1, 1]; }
export function SubdeviceController(){ return true; }
export function DefaultComponentBrand() { return "NZXT";}
export function SupportsFanControl(){ return false; } // TODO
export function DeviceType(){return "lightingcontroller";}
export function Validate(endpoint) { return endpoint.interface === 0 && endpoint.usage === 0x0001 && endpoint.usage_page === 0xFF00 && endpoint.collection === 0x0000; }
export function ImageUrl(){	return "https://assets.signalrgb.com/devices/brands/nzxt/fan-controllers/rgb-fan-controller.png"; }
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

const vKeyNames = [];
const vKeyPositions = [];
const ConnectedFans = [];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {

	// Set ARGB Channel
	device.addChannel(`Channel 1`, 40);
	device.SetLedLimit(40);

	// Set Fan channels
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	const componentChannel = device.channel("Channel 1");

	if(componentChannel === null){
		return;
	}

	let ChannelLedCount = componentChannel.LedCount();
	let RGBData = [];

	if(overrideColor){
		RGBData = device.createColorArray(overrideColor, ChannelLedCount, "Inline", "GRB");
	}else if(LightingMode === "Forced"){
		RGBData = device.createColorArray(forcedColor, ChannelLedCount, "Inline", "GRB");

	}else if(componentChannel.shouldPulseColors()){
		ChannelLedCount = 40;

		const pulseColor = device.getChannelPulseColor("Channel 1");
		RGBData = device.createColorArray(pulseColor, ChannelLedCount, "Inline", "GRB");

	}else{
		RGBData = componentChannel.getColors("Inline", "GRB");
	}

	if(!RGBData.length) {return;}

	// Write RGB
	device.write([0x02, 0x4B, 0x00, 0x00, 0x00].concat(RGBData.splice(0, 20*3)), 65);
	device.write([0x03].concat(RGBData), 65);
}

// TODO
/*
function HandleFanPacket(data){
	if(device.fanControlDisabled()){
		return;
	}

	for(let fanId = 0; fanId < 3;fanId++){

		device.log(`Fan ${fanId}, Mode: ${mode}, ${duty}% Duty, ${rpm} rpm`);

		if(rpm > 0 && !ConnectedFans.includes(`Fan ${fanId + 1}`)){
			ConnectedFans.push(`Fan ${fanId + 1}`);
			device.createFanControl(`Fan ${fanId + 1}`);
		}

		if(ConnectedFans.includes(`Fan ${fanId + 1}`)){
			device.setRPM(`Fan ${fanId + 1}`, rpm);

			const newSpeed = device.getNormalizedFanlevel(`Fan ${fanId + 1}`) * 100;
		}

	}
}
*/