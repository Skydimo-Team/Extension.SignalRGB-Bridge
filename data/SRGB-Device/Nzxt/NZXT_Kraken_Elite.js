export function Name() { return "NZXT Kraken"; }
export function VendorId() { return 0x1E71; }
export function Documentation(){ return "troubleshooting/nzxt"; }
export function ProductId() { return Object.keys(NZXTKrakenProductNames); }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [4, 4]; }
export function DefaultPosition(){return [165, 60];}
export function DefaultScale(){return 7.0;}
export function DeviceType(){return "aio";}
export function Validate(endpoint) { return endpoint.interface === 1; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/nzxt/aio/kraken-z3-aio.png"; }
/* global
*/
export function ControllableParameters(){
	return [ ];
}

export function SupportsFanControl(){ return true; }

const NZXTKrakenProductNames = {
	0x300E: "NZXT Kraken",
	0x300C: "NZXT Kraken Elite",
};

const MinimumSpeed = 25;

//Channel Name, Led Limit
const ConnectedFans = [];

let Pump_RPM;
let Pump_Speed;
let Fan_RPM;
let Fan_Speed;
let Liquid_Temp;
const ConnectedProbes = [];

export function Initialize() {
	const DeviceName = NZXTKrakenProductNames[device.productId()] || "NZXT Kraken";
	device.setName(DeviceName);

	BurstFans();
}

export function Render() {
	PollFans();
}

export function Shutdown(SystemSuspending) {
}

let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

function PollFans() {
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if(device.fanControlDisabled()) {
		return;
	}

	getStatus();//Grab all of our RPM's and make sure stuff is connected.

	if(device.fanControlDisabled()){
		return;
	} // This catches the fanMode prop not being present.

	if(!ConnectedProbes.includes(0) && Liquid_Temp !== 0){
		ConnectedProbes.push(0);
		device.createTemperatureSensor(`Liquid Temperature`);
	}

	if(Liquid_Temp !== 0) {
		device.SetTemperature(`Liquid Temperature`, Liquid_Temp);
	}

	const pump = 1;
	const pumprpm = Pump_RPM;
	device.log(`Pump RPM: ${pumprpm}`);

	if(pumprpm > 0) {
		device.createFanControl(`Pump ${pump}`);
	}

	device.setRPM(`Pump ${pump}`, pumprpm);

	const newSpeed = device.getNormalizedFanlevel(`Pump ${pump}`) * 100;
	setPumpSpeed(newSpeed);

	//We're leaving this here in case a user for some reason doesn't use the fan hub built into the Z series coolers.
	const fan = 1;
	const fanrpm = Fan_RPM;
	device.log(`Fan ${fan}: ${fanrpm}rpm`);

	if(fanrpm > 0 && !ConnectedFans.includes(`Fan ${fan}`)) {
		ConnectedFans.push(`Fan ${fan}`);
		device.createFanControl(`Fan ${fan}`);
	}

	if(ConnectedFans.includes(`Fan ${fan}`)) {
		device.setRPM(`Fan ${fan}`, fanrpm);

		const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
		SetFanSpeed(newSpeed);
	}
}

function BurstFans() {
	const BurstSpeed = 50;

	if(device.fanControlDisabled()) {
		return;
	}

	device.log("Bursting Fans for RPM based Detection");

	setPumpSpeed(BurstSpeed);
	SetFanSpeed(BurstSpeed);
}

function getStatus()//This gets temp, pump, and fan status.
{
	device.write([0x74, 0x01], 64);

	do {
		const packet = device.read([0x0], 64, 10);

		if(packet[0] == 0x75 && packet[1] == 0x01) {
			Liquid_Temp = packet[15] + packet[16]/10;
			Pump_RPM = packet[18] << 8 | packet[17];
			Pump_Speed = packet[19];
			Fan_RPM = packet[24] << 8 | packet[23];
			Fan_Speed = packet[25];
			device.log("Reported Pump Speed: " + Pump_Speed + " %");
			device.log("Reported Fan Speed: " + Fan_Speed + " %");
			device.log("Liquid Temperature: " + Liquid_Temp + " °C");
		}
	}
	while(device.getLastReadSize() > 0);
}

function SetFanSpeed(speed)//I'm leaving this as a separate function because the fans can do zero rpm
{

	const packet = [0x72, 0x02, 0x00, 0x00];

	for(let RPMBytes = 0; RPMBytes < 40; RPMBytes++) {
		const Offset = RPMBytes + 4;
		packet[Offset] = speed;
	}

	device.log(`Setting Kraken Fans to ${Math.round(speed)}% `);
	device.write(packet, 64);
}

function setPumpSpeed(speed) {

	const packet = [0x72, 0x01, 0x00, 0x00];

	for(let RPMBytes = 0; RPMBytes < 40; RPMBytes++) {
		const Offset = RPMBytes + 4;
		packet[Offset] = Math.max(speed, MinimumSpeed);
	}

	device.log(`Setting Kraken Pump to ${Math.round(speed)}% `);
	device.write(packet, 64);
}
