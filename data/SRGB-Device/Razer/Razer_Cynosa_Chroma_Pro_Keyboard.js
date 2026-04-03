export function Name() {
	return "Razer Cynosa Chroma Pro";
}
export function Documentation() {
	return "troubleshooting/razer";
}
export function VendorId() {
	return 0x1532;
}
export function ProductId() {
	return 0x022c;
}
export function Publisher() {
	return "Kashall";
}
export function Size() {
	return [25, 7];
}
export function DefaultPosition() {
	return [10, 100];
}
const DESIRED_HEIGHT = 85;
export function DefaultScale() {
	return Math.floor(DESIRED_HEIGHT / Size()[1]);
}
export function Type() {
	return "Hid";
}
export function DeviceType(){return "keyboard";}
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

const vLeds = [{
	"name": "Underglow 1",
	"position": [0, 0],

}, {
	"name": "Esc",
	"position": [1, 0],
}, {
	"name": "F1",
	"position": [3, 0],
}, {
	"name": "F2",
	"position": [4, 0],
}, {
	"name": "F3",
	"position": [5, 0],
}, {
	"name": "F4",
	"position": [6, 0],
}, {
	"name": "F5",
	"position": [7, 0],
}, {
	"name": "F6",
	"position": [8, 0],
}, {
	"name": "F7",
	"position": [9, 0],
}, {
	"name": "F8",
	"position": [10, 0],
}, {
	"name": "F9",
	"position": [11, 0],
}, {
	"name": "F10",
	"position": [12, 0],
}, {
	"name": "F11",
	"position": [13, 0],
}, {
	"name": "F12",
	"position": [14, 0],
}, {
	"name": "Print Screen",
	"position": [15, 0],
}, {
	"name": "Scroll Lock",
	"position": [16, 0],
}, {
	"name": "Pause Break",
	"position": [17, 0],
}, {
	"name": "Razer Logo",
	"position": [20, 0],
}, {
	"name": "Underglow 22",
	"position": [22, 0],
}, {
	"name": "Underglow 2",
	"position": [0, 1],
}, {
	"name": "`",
	"position": [1, 1],
}, {
	"name": "1",
	"position": [2, 1],
}, {
	"name": "2",
	"position": [3, 1],
}, {
	"name": "3",
	"position": [4, 1],

}, {
	"name": "4",
	"position": [5, 1],

}, {
	"name": "5",
	"position": [6, 1],

}, {
	"name": "6",
	"position": [7, 1],

}, {
	"name": "7",
	"position": [8, 1],

}, {
	"name": "8",
	"position": [9, 1],

}, {
	"name": "9",
	"position": [10, 1],

}, {
	"name": "0",
	"position": [11, 1],

}, {
	"name": "-_",
	"position": [12, 1],

}, {
	"name": "=+",
	"position": [13, 1],

}, {
	"name": "Backspace",
	"position": [14, 1],

}, {
	"name": "Insert",
	"position": [15, 1],

}, {
	"name": "Home",
	"position": [16, 1],

}, {
	"name": "Page Up",
	"position": [17, 1],

}, {
	"name": "NumLock",
	"position": [18, 1],

}, {
	"name": "Num /",
	"position": [19, 1],

}, {
	"name": "Num *",
	"position": [20, 1],

}, {
	"name": "Num -",
	"position": [21, 1],

}, {
	"name": "Underglow 21",
	"position": [22, 1],

}, {
	"name": "Underglow 3",
	"position": [0, 2],

}, {
	"name": "Tab",
	"position": [1, 2],

}, {
	"name": "Q",
	"position": [2, 2],

}, {
	"name": "W",
	"position": [3, 2],

}, {
	"name": "E",
	"position": [4, 2],

}, {
	"name": "R",
	"position": [5, 2],

}, {
	"name": "T",
	"position": [6, 2],

}, {
	"name": "Y",
	"position": [7, 2],

}, {
	"name": "U",
	"position": [8, 2],

}, {
	"name": "I",
	"position": [9, 2],

}, {
	"name": "O",
	"position": [10, 2],

}, {
	"name": "P",
	"position": [11, 2],

}, {
	"name": "[",
	"position": [12, 2],

}, {
	"name": "]",
	"position": [13, 2],

}, {
	"name": "\\",
	"position": [14, 2],

}, {
	"name": "Del",
	"position": [15, 2],

}, {
	"name": "End",
	"position": [16, 2],

}, {
	"name": "Page Down",
	"position": [17, 2],

}, {
	"name": "Num 7",
	"position": [18, 2],

}, {
	"name": "Num 8",
	"position": [19, 2],

}, {
	"name": "Num 9",
	"position": [20, 2],

}, {
	"name": "Num +",
	"position": [21, 2],

}, {
	"name": "Underglow 20",
	"position": [22, 2],

}, {
	"name": "CapsLock",
	"position": [1, 3],

}, {
	"name": "A",
	"position": [2, 3],

}, {
	"name": "S",
	"position": [3, 3],

}, {
	"name": "D",
	"position": [4, 3],

}, {
	"name": "F",
	"position": [5, 3],

}, {
	"name": "G",
	"position": [6, 3],

}, {
	"name": "H",
	"position": [7, 3],

}, {
	"name": "J",
	"position": [8, 3],

}, {
	"name": "K",
	"position": [9, 3],

}, {
	"name": "L",
	"position": [10, 3],

}, {
	"name": ";",
	"position": [11, 3],

}, {
	"name": "'",
	"position": [12, 3],

}, {
	"name": "Enter",
	"position": [14, 3],

}, {
	"name": "Num 4",
	"position": [18, 3],

}, {
	"name": "Num 5",
	"position": [19, 3],

}, {
	"name": "Num 6",
	"position": [20, 3],

}, {
	"name": "Underglow 4",
	"position": [0, 4],

}, {
	"name": "Left Shift",
	"position": [1, 4],

}, {
	"name": "Z",
	"position": [3, 4],

}, {
	"name": "X",
	"position": [4, 4],

}, {
	"name": "C",
	"position": [5, 4],

}, {
	"name": "V",
	"position": [6, 4],

}, {
	"name": "B",
	"position": [7, 4],

}, {
	"name": "N",
	"position": [8, 4],

}, {
	"name": "M",
	"position": [9, 4],

}, {
	"name": ",",
	"position": [10, 4],

}, {
	"name": ".",
	"position": [11, 4],

}, {
	"name": "/",
	"position": [12, 4],

}, {
	"name": "Right Shift",
	"position": [14, 4],

}, {
	"name": "Up Arrow",
	"position": [16, 4],

}, {
	"name": "Num 1",
	"position": [17, 4],

}, {
	"name": "Num 2",
	"position": [18, 4],

}, {
	"name": "Num 3",
	"position": [19, 4],

}, {
	"name": "Num Enter",
	"position": [19, 4],

}, {
	"name": "Underglow 19",
	"position": [21, 4],

}, {
	"name": "Underglow 5",
	"position": [0, 5],

}, {
	"name": "Left Ctrl",
	"position": [1, 5],

}, {
	"name": "Left Win",
	"position": [2, 5],

}, {
	"name": "Left Alt",
	"position": [3, 5],

}, {
	"name": "Space",
	"position": [4, 5],

}, {
	"name": "Right Alt",
	"position": [5, 5],

}, {
	"name": "Fn",
	"position": [6, 5],

}, {
	"name": "Menu",
	"position": [7, 5],

}, {
	"name": "Right Ctrl",
	"position": [8, 5],

}, {
	"name": "Left Arrow",
	"position": [9, 5],

}, {
	"name": "Down Arrow",
	"position": [10, 5],

}, {
	"name": "Right Arrow",
	"position": [11, 5],

}, {
	"name": "Num 0",
	"position": [12, 5],

}, {
	"name": "Num .",
	"position": [13, 5],

}, {
	"name": "Underglow 18",
	"position": [14, 5],

}, {
	"name": "Underglow 6",
	"position": [3, 6],

}, {
	"name": "Underglow 7",
	"position": [5, 6],

}, {
	"name": "Underglow 8",
	"position": [6, 6],

}, {
	"name": "Underglow 9",
	"position": [8, 6],

}, {
	"name": "Underglow 10",
	"position": [9, 6],

}, {
	"name": "Underglow 11",
	"position": [11, 6],

}, {
	"name": "Underglow 12",
	"position": [12, 6],

}, {
	"name": "Underglow 13",
	"position": [14, 6],

}, {
	"name": "Underglow 14",
	"position": [15, 6],

}, {
	"name": "Underglow 15",
	"position": [16, 6],

}, {
	"name": "Underglow 16",
	"position": [17, 6],

}, {
	"name": "Underglow 17",
	"position": [18, 6],

}];

export function LedNames() {
	return vLeds.map((key) => key.name);
}

export function LedPositions() {
	return vLeds.map((key) => key.position);
}

export function Initialize() {
	const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x02, 0x00, 0x04, 0x03];
	packet[89] = CalculateCrc(packet);

	return device.send_report(packet, 91);
}

export function Render() {
	SendPacket();
}

export function Shutdown() {
	SendPacket(true);
}

export function Validate(endpoint) {
	return endpoint.interface === 2;
}

function CalculateCrc(report) {
	let iCrc = 0;

	for (let iIdx = 3; iIdx < 89; iIdx++) {
		iCrc ^= report[iIdx];
	}

	return iCrc;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}

function SendPacket(shutdown = false) {
	let leds = LedPositions();

	for (let iIdy = 0; iIdy < 7; iIdy++) {
		leds = leds.filter((led) => led[1] == iIdy);

		const packet = [0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x4A, 0x0F, 0x03, 0x00, 0x00, iIdy, 0x00, 0x016];

		for (let iIdx = 0; iIdx < 25; iIdx++) {
			let color;

			if (shutdown) {
				color = hexToRgb(shutdownColor);
			} else if (LightingMode === "Forced") {
				color = hexToRgb(forcedColor);
			} else {
				color = device.color(iIdx, iIdy);
			}
			const iLedIdx = iIdx * 3 + 14;
			packet[iLedIdx] = color[0];
			packet[iLedIdx + 1] = color[1];
			packet[iLedIdx + 2] = color[2];
		}

		packet[89] = CalculateCrc(packet);
		device.send_report(packet, 91);
		device.pause(1);
	}
}

export function ImageUrl(){
	return "https://assets.signalrgb.com/devices/brands/razer/keyboards/cyanosa-chroma-pro.png";
}