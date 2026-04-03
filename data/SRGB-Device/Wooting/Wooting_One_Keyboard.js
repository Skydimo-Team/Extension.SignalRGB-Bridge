export function Name() { return "Wooting One Keyboard"; }
export function VendorId() { return 0x03EB; }
export function ProductId() { return 0xFF01; }
export function Publisher() { return "WhirlwindFX"; }
export function Size() { return [17, 6]; }
export function DefaultPosition() { return [75, 70]; }
export function DefaultScale(){ return 4.0; }
export function DeviceType(){return "keyboard";}
export function Validate(endpoint) { return endpoint.interface === 2 && endpoint.usage === 1; }
export function ImageUrl(){ return "https://assets.signalrgb.com/devices/brands/wooting/keyboards/one.png"; }
/* global
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const vKeyNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",		"Print Screen", "Pause", "Mode",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-_", "=+", "Backspace",			"Insert", "Home", "Page Up",					//21
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\",				"Del", "End", "Page Down",						//21
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",																//16
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift",					"Up Arrow",								//17
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Menu", "Fn", "Right Ctrl",	"Left Arrow", "Down Arrow", "Right Arrow"		//13
];

// This array must be the same length as vKeys[], and represents the pixel color position in our pixel matrix that we reference.
const vKeyPositions = [
	[0, 0],		   [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],		[14, 0], [15, 0], [16, 0],		//20
	[0, 1],  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],		[14, 1], [15, 1], [16, 1],		//21
	[0, 2],	[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],		[14, 2], [15, 2], [16, 2],		//20
	[0, 3],	[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],         [13, 3],									//17
	[0, 4],		   [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],		   [13, 4],				[15, 4],				//17
	[0, 5],	[1, 5], [2, 5],                      [6, 5],					   [10, 5], [11, 5], [12, 5], [13, 5],		[14, 5], [15, 5], [16, 5]		//13
];

const gammaFilter = [
	0,   0,   2,   2,   2,   2,   2,   2,   2,   2,   2,   2,   2,   2,   2,
	2,   2,   2,   3,   3,   3,   3,   3,   3,   3,   4,   4,   4,   4,   4,
	5,   5,   5,   5,   6,   6,   6,   6,   7,   7,   7,   7,   8,   8,   8,
	9,   9,   9,   10,  10,  10,  10,  10,  10,  11,  11,  11,  11,  11,  11,
	12,  12,  13,  13,  13,  13,  14,  14,  15,  15,  16,  16,  17,  17,  18,
	18,  18,  18,  19,  19,  20,  20,  21,  21,  22,  22,  22,  22,  23,  24,
	24,  25,  25,  26,  26,  26,  27,  27,  28,  29,  29,  30,  31,  32,  32,
	33,  34,  35,  35,  36,  37,  38,  39,  39,  40,  41,  42,  42,  43,  43,
	44,  44,  45,  45,  46,  47,  48,  49,  50,  50,  51,  51,  52,  52,  53,
	54,  54,  55,  55,  56,  56,  57,  57,  58,  58,  59,  59,  60,  60,  61,
	61,  62,  62,  63,  64,  65,  66,  67,  68,  69,  70,  71,  72,  73,  74,
	75,  77,  78,  79,  81,  82,  83,  85,  86,  87,  89,  90,  92,  93,  95,
	96,  98,  99,  101, 102, 104, 105, 107, 109, 110, 112, 114, 115, 117, 119,
	120, 122, 124, 126, 127, 129, 131, 133, 135, 137, 138, 140, 142, 144, 146,
	148, 150, 152, 154, 156, 158, 160, 162, 164, 167, 169, 171, 173, 175, 177,
	180, 182, 184, 186, 189, 191, 193, 196, 198, 200, 203, 205, 208, 210, 213,
	215, 218, 220, 223, 225, 228, 231, 233, 236, 239, 241, 244, 247, 249, 252,
	255];

const WOOTING_COMMAND_SIZE = 8;
const WOOTING_REPORT_SIZE = 129;
const RGB_RAW_BUFFER_SIZE = 96;

const WOOTING_RAW_COLORS_REPORT = 11;
const WOOTING_SINGLE_COLOR_COMMAND = 30;
const WOOTING_SINGLE_RESET_COMMAND = 31;
const WOOTING_RESET_ALL_COMMAND = 32;
const WOOTING_COLOR_INIT_COMMAND = 33;

const PART0 = 0;
const PART1 = 1;
const PART2 = 2;
const PART3 = 3;
const PART4 = 4;
const NOLED = 255;
const LED_LEFT_SHIFT_ANSI = 9;
const LED_LEFT_SHIFT_ISO = 7;
const LED_ENTER_ANSI = 65;
const LED_ENTER_ISO = 62;

const rgb_buffer0 = [];
const rgb_buffer1 = [];
const rgb_buffer2 = [];
const rgb_buffer3 = [];
const rgb_buffer4 = [];

let rgb_buffer0_changed = false;
let rgb_buffer1_changed = false;
let rgb_buffer2_changed = false;
let rgb_buffer3_changed = false;
let rgb_buffer4_changed = false;

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	wooting_usb_send_feature(WOOTING_COLOR_INIT_COMMAND, 0, 0, 0, 0);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {

	if(SystemSuspending){
		sendColors("#000000"); // Go Dark on System Sleep/Shutdown
	}else{
		wooting_usb_send_feature(WOOTING_RESET_ALL_COMMAND, 0, 0, 0, 0);
	}

}

function sendColors(overrideColor) {
	let iPxX, iPxY, col;

	for(let iIdx = 0; iIdx < vKeyPositions.length; iIdx++) {
		iPxX = vKeyPositions[iIdx][0];
		iPxY = vKeyPositions[iIdx][1];

		if (overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode == "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(iPxX, iPxY);
		}

		wooting_rgb_array_change_single(iPxY, iPxX, col[0], col[1], col[2]);
	}

	wooting_rgb_array_update_keyboard();
}

function getCrc16ccitt(buffer, size) {
	let crc = 0;
	const sizeStart = size - 1;

	while (size--) {
		crc ^= buffer[sizeStart - size] << 8;

		for (let i = 0; i < 8; i++) {
			if (crc & 0x8000) {
				crc = (crc << 1) ^ 0x1021;
			} else {
				crc = crc << 1;
			}
		}
	}

	return crc;
}

function get_safe_led_idex(row, column) {
	const rgb_led_index = [
		[ 0, NOLED, 11, 12, 23, 24, 36, 47, 85, 84, 49, 48, 59, 61, 73, 81, 80, 113, 114, 115, 116 ],
		[ 2, 1, 14, 13, 26, 25, 35, 38, 37, 87, 86, 95, 51, 63, 75, 72, 74, 96, 97, 98, 99 ],
		[ 3, 4, 15, 16, 27, 28, 39, 42, 40, 88, 89, 52, 53, 71, 76, 83, 77, 102, 103, 104, 100 ],
		[ 5, 6, 17, 18, 29, 30, 41, 46, 44, 90, 93, 54, 57, 65, NOLED, NOLED, NOLED, 105, 106, 107, NOLED ],
		[ 9, 8, 19, 20, 31, 34, 32, 45, 43, 91, 92, 55, NOLED, 66, NOLED, 78, NOLED, 108, 109, 110, 101 ],
		[ 10, 22, 21, NOLED, NOLED, NOLED, 33, NOLED, NOLED, NOLED, 94, 58, 67, 68, 70, 79, 82, NOLED, 111, 112, NOLED ]
	];

	if (row < 6 && column < 17) {
		return rgb_led_index[row][column];
	}

	return NOLED;

}

function wooting_usb_send_buffer(part_number, rgb_buffer) {
	let report_buffer = [];

	report_buffer[0] = 0; // HID report index (unused)
	report_buffer[1] = 0xD0; // Magicword 208
	report_buffer[2] = 0xDA; // Magicword 218
	report_buffer[3] = WOOTING_RAW_COLORS_REPORT; // Report ID

	switch (part_number) {
	case PART0: {
		report_buffer[4] = 0; // Slave nr
		report_buffer[5] = 0; // Reg start address
		break;
	}

	case PART1: {
		report_buffer[4] = 0; // Slave nr
		report_buffer[5] = RGB_RAW_BUFFER_SIZE; // Reg start address
		break;
	}

	case PART2: {
		report_buffer[4] = 1; // Slave nr
		report_buffer[5] = 0; // Reg start address
		break;
	}

	case PART3: {
		report_buffer[4] = 1; // Slave nr
		report_buffer[5] = RGB_RAW_BUFFER_SIZE; // Reg start address
		break;
	}

	// wooting_rgb_array_update_keyboard will not run into this
	case PART4: {
		//Wooting One will not have this part of the report
		return false;
		break;
	}

	default: {
		return false;
	}
	}

	report_buffer = report_buffer.slice(0, 6).concat(rgb_buffer, report_buffer.slice(6));

	const crc = getCrc16ccitt(report_buffer, WOOTING_REPORT_SIZE - 2);
	report_buffer[127] = crc & 0xFF;
	report_buffer[128] = crc >> 8;

	device.write(report_buffer, WOOTING_REPORT_SIZE);

	return true;
}

function wooting_usb_send_feature(commandId, parameter0, parameter1, parameter2, parameter3) {
	const report_buffer = [];

	report_buffer[0] = 0; // HID report index (unused)
	report_buffer[1] = 0xD0; // Magic word
	report_buffer[2] = 0xDA; // Magic word
	report_buffer[3] = commandId;
	report_buffer[4] = parameter3;
	report_buffer[5] = parameter2;
	report_buffer[6] = parameter1;
	report_buffer[7] = parameter0;
	device.send_report(report_buffer, WOOTING_COMMAND_SIZE);

	return true;
}

function wooting_rgb_array_update_keyboard() {
	if (rgb_buffer0_changed) {
		if (!wooting_usb_send_buffer(PART0, rgb_buffer0)) {
			return false;
		}

		rgb_buffer0_changed = false;
	}

	if (rgb_buffer1_changed) {
		if (!wooting_usb_send_buffer(PART1, rgb_buffer1)) {
			return false;
		}

		rgb_buffer1_changed = false;
	}

	if (rgb_buffer2_changed) {
		if (!wooting_usb_send_buffer(PART2, rgb_buffer2)) {
			return false;
		}

		rgb_buffer2_changed = false;
	}

	if (rgb_buffer3_changed) {
		if (!wooting_usb_send_buffer(PART3, rgb_buffer3)) {
			return false;
		}

		rgb_buffer3_changed = false;
	}

	//wOne cant do this
	if (rgb_buffer4_changed && false) {
		if (!wooting_usb_send_buffer(PART4, rgb_buffer4)) {
			return false;
		}

		rgb_buffer4_changed = false;
	}

	return true;
}

function wooting_rgb_array_change_single(row, column, red, green, blue) {
	const pwm_mem_map = [
		0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd,
		0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d,
		0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d,
		0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d
	];

	const led_index = get_safe_led_idex(row, column);
	let buffer_pointer;

	// prevent assigning led's that don't exist
	if (led_index > 95) {
		return false;
	}

	if (led_index >= 96) {
		buffer_pointer = rgb_buffer4;
		rgb_buffer4_changed = true;
	} else if (led_index >= 72) {
		buffer_pointer = rgb_buffer3;
		rgb_buffer3_changed = true;
	} else if (led_index >= 48) {
		buffer_pointer = rgb_buffer2;
		rgb_buffer2_changed = true;
	} else if (led_index >= 24) {
		buffer_pointer = rgb_buffer1;
		rgb_buffer1_changed = true;
	} else {
		buffer_pointer = rgb_buffer0;
		rgb_buffer0_changed = true;
	}

	const buffer_index = pwm_mem_map[led_index % 24];
	buffer_pointer[buffer_index] = gammaFilter[red];
	buffer_pointer[buffer_index + 0x10] = gammaFilter[green];
	buffer_pointer[buffer_index + 0x20] = gammaFilter[blue];

	if (led_index == LED_ENTER_ANSI) {
		const iso_enter_index = pwm_mem_map[LED_ENTER_ISO - 48];
		rgb_buffer2[iso_enter_index] = rgb_buffer2[buffer_index];
		rgb_buffer2[iso_enter_index + 0x10] = rgb_buffer2[buffer_index + 0x10];
		rgb_buffer2[iso_enter_index + 0x20] = rgb_buffer2[buffer_index + 0x20];
	} else if (led_index == LED_LEFT_SHIFT_ANSI) {
		const iso_shift_index = pwm_mem_map[LED_LEFT_SHIFT_ISO];
		rgb_buffer0[iso_shift_index] = rgb_buffer0[buffer_index];
		rgb_buffer0[iso_shift_index + 0x10] = rgb_buffer0[buffer_index + 0x10];
		rgb_buffer0[iso_shift_index + 0x20] = rgb_buffer0[buffer_index + 0x20];
	}

	return true;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
