/* global
conversion_mode:readonly
minimum_brightness:readonly
maximum_brightness:readonly
*/
export function ControllableParameters() {
	return [
		{ "property": "conversion_mode", "label": "Color To Brightness", description: "Sets the color preference for brightness", "type": "combobox", "default": "Mean Intensity", "values": ["Mean Intensity", "Red Intensity", "Green Intensity", "Blue Intensity"] },
		{ "property": "minimum_brightness", "label": "Minimum Brightness", description: "Sets the lower brightness level","type": "number", "min": "0", "max": "100", "default": "0" },
		{ "property": "maximum_brightness", "label": "Maximum Brightness", description: "Sets the higher brightness level","type": "number", "min": "0", "max": "100", "default": "255" },
	];
}

function GetReport(cmd_class, cmd_id, size) {
	const report = new Array(91).fill(0);

	report[0] = 0;

	// Status.
	report[1] = 0x00;

	// Transaction ID.
	report[2] = 0xFF;

	// Remaining packets.
	report[3] = 0x00;
	report[4] = 0x00;

	// Protocol type.
	report[5] = 0x00;

	// Data size.
	report[6] = size;

	// Command class.
	report[7] = cmd_class;

	// Command id.
	report[8] = cmd_id;

	//report[8-87] = data;

	//report[89] = crc;

	//report[89] = reserved;

	return report;
}


function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}


export function Name() { return "Razer Blackwidow Ultimate 2013/2014"; }
export function VendorId() { return 0x1532; }
export function Documentation(){ return "troubleshooting/razer"; }
export function ProductId() { return 0x011A; }
export function Publisher() { return "BlackSwan"; }
export function Size() { return [21, 6]; }
export function Type() { return "Hid"; }
export function DefaultPosition() { return [75, 70]; }
export function DefaultScale() { return 1.0; }
export function DeviceType(){return "keyboard"}
const vLedNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",         "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",                        "Insert", "Home", "Page Up",       "NumLock", "Num /", "Num *", "Num -",  //21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",                               "Del", "End", "Page Down",         "Num 7", "Num 8", "Num 9", "Num +",    //21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",                                                              "Num 4", "Num 5", "Num 6",             //16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",                                  "Up Arrow",               "Num 1", "Num 2", "Num 3", "Num Enter", //17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl",  "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num ."                       //13
];

const vLedPositions = [
	[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0],           [14, 0], [15, 0], [16, 0],            //20
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],   [17, 1], [18, 1], [19, 1], [20, 1], //21
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],   [17, 2], [18, 2], [19, 2], [20, 2], //20
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],                             [17, 3], [18, 3], [19, 3], // 17
	[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],                 [13, 4],           [15, 4],           [17, 4], [18, 4], [19, 4], [20, 4], // 17
	[0, 5], [1, 5], [2, 5],                      [6, 5],                      [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],   [17, 5], [19, 5] // 13
];
export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

function EnableSoftwareControl() {
}


function ReturnToHardwareControl() {

}


export function Initialize() {

}

function SendPacket() {
	const col = device.color(0, 0);
	let intensity = 0;

	const min = Math.min(minimum_brightness, maximum_brightness);
	const max = Math.max(minimum_brightness, maximum_brightness);

	switch (conversion_mode) {
	case 'Mean Intensity':
		intensity = (col[0] + col[1] + col[2]) / 3;
		break;
	case 'Red Intensity':
		intensity = col[0];
		break;
	case 'Green Intensity':
		intensity = col[1];
		break;
	case 'Blue Intensity':
		intensity = col[2];
		break;
	}

	intensity = Math.ceil(min + intensity * (max - min) / 255);

	const packet = [];
	packet[1] = 0x00;
	packet[2] = 0xFF;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x00;
	packet[6] = 0x03;
	packet[7] = 0x03;
	packet[8] = 0x03;
	packet[9] = 0x01;
	packet[10] = 0x04;
	packet[11] = intensity;

	packet[89] = CalculateCrc(packet);

	device.send_report(packet, 91);
}


function Apply() {
}


export function Render() {
	SendPacket();
}


export function Shutdown() {

}

export function Validate(endpoint) {
	return endpoint.interface === 2;
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/blackwidow-ultimate.png";
}