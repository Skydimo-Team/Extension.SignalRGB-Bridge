export function Name() { return "Razer PWM Controller"; }
export function VendorId() { return   0x1532; }
export function ProductId() { return  0x0F3C; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [1, 1]; }
export function Type() { return "Hid"; }
export function DefaultPosition(){return [0, 0];}
export function DefaultScale(){return 8.0;}
export function ControllableParameters(){
	return [
	];
}

export function DeviceType(){return "lightingcontroller"}
const ConnectedFans = [];
let savedPollFanTimer = Date.now();
const PollModeInternal = 3000;

export function LacksOnBoardLeds() {return true;}
export function SupportsFanControl(){ return true; }


export function Initialize() {
	burstFans(); //1666 0x06 0x82

}

export function Shutdown() {

}

export function Render() {
	PollFans();
}

function packetSend(packet, length) //Wrapper for always including our CRC
{
	const packetToSend = packet;
	packetToSend[89] = CalculateCrc(packet);
	device.send_report(packetToSend, length);
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function PollFans(){
	//Break if were not ready to poll
	if (Date.now() - savedPollFanTimer < PollModeInternal) {
		return;
	}

	savedPollFanTimer = Date.now();

	if(device.fanControlDisabled()){
		return;
	}

	for(let fan = 0; fan < 8; fan++) {
		const rpm = getChannelRPM(fan);

		if(rpm > 0  && !ConnectedFans.includes(`Fan ${fan}`)){
			ConnectedFans.push(`Fan ${fan}`);
			device.createFanControl(`Fan ${fan}`);
		}

		if(ConnectedFans.includes(`Fan ${fan}`)){
			device.setRPM(`Fan ${fan}`, rpm);

			const newSpeed = device.getNormalizedFanlevel(`Fan ${fan}`) * 100;
			setChannelRPM(fan, newSpeed);
		}
	}
}

function burstFans() {
	if(device.fanControlDisabled()) {
		return;
	}

	device.log("Bursting Fans for RPM based Detection");

	for(let Channel = 0; Channel < 8; Channel++){
		setChannelMode(Channel);
	}

	for(let Channel = 0; Channel < 8; Channel++){
		setChannelRPM(Channel, 75);
	}
}

function setChannelMode(channel) {
	const packet = [0x00, 0x00, 0x1f, 0x00, 0x00, 0x00, 0x03, 0x0d, 0x02, 0x01, channel + 0x05, 0x04]; //manual is 0x04
	packetSend(packet, 91);
	device.pause(10);
}

function setChannelRPM(channel, speed) {
	const packet = [0x00, 0x00, 0x1f, 0x00, 0x00, 0x00, 0x03, 0x0d, 0x0d, 0x01, channel + 0x05, speed];
	packetSend(packet, 91);
	device.pause(10);
}

function getChannelRPM(channel) {
	const packet = [0x00, 0x00, 0x1f, 0x00, 0x00, 0x00, 0x06, 0x0d, 0x81, 0x01, channel + 0x05];
	packetSend(packet, 91);
	device.pause(10);

	// Read the response packet containing RPM data
	const returnpacket = device.get_report(packet, 91);
	device.log(returnpacket);

	// Check if the return packet is valid
	if (!returnpacket || returnpacket.length < 15) {
		// Log an error message or handle the invalid response
		device.log("Invalid response packet received for RPM data.");

		return 0; // Return 0 RPM as fallback
	}

	// Extract RPM data from the response packet
	const RPMHighByte = returnpacket[13];
	const RPMLowByte = returnpacket[14];

	// Combine high and low bytes to get the RPM value
	const RPM = (RPMHighByte << 8) | RPMLowByte;

	// Log the obtained RPM value for debugging
	device.log(`Fan ${channel} RPM: ${RPM}`);

	return RPM;
}


export function Validate(endpoint) {
	return endpoint.interface === 0;

}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/fan-controllers/pwm-controller.png";
}