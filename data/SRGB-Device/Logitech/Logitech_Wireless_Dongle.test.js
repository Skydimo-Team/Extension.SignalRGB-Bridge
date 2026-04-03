const { MockDevice } = require("../../tests/mocks.js");
const { LogitechProtocol } = require("./Logitech_Modern_Device.js");
const { LogitechMouseDevice } = require("./Logitech_Modern_Device.js");
const { LogitechDongleDevice } = require("./Logitech_Modern_Device.js");
const { LogitechExtras } = require("./Logitech_Modern_Device.js");
const { LogitechResponse } = require("./Logitech_Modern_Device.js");

const pluginPath = "./Logitech_Modern_Device.js";


let Plugin;
beforeEach(() => {
	return import(pluginPath).then(module => {
		Plugin = module;
		jest.resetModules();

		global.device = new MockDevice();
	});
});

describe("Logitech Dongle", () => {
	it("SetDpiLightAlwaysOnDoesNothingIfNoDpiLights", () => {
		const Logitech = new LogitechProtocol();
		const LogitechMouse = new LogitechMouseDevice();
		LogitechMouse.Config.HasDPILights = false;
		LogitechMouse.SetDpiLightAlwaysOn(true);
		LogitechMouse.SetDpiLightAlwaysOn(false);

		Logitech.Config.IsHeroProtocol = true;
		LogitechMouse.SetDpiLightAlwaysOn(true);
		LogitechMouse.SetDpiLightAlwaysOn(false);

		// Calling all potential branches should do nothing if the device lacks DPI lights
		expect(global.device.write.mock.calls.length).toBe(0);

	});
	it("SetDpi", () => {
		const Logitech = new LogitechProtocol();
		const LogitechMouse = new LogitechMouseDevice();

		const DPI = Math.round(Math.random() * 10000 / 50)*50;
		const Stage = Math.round(Math.random() * 5);
		const MockFeatureID = 0;//Math.round(Math.random() * 255);
		Logitech.FeatureIDs.DPIID = MockFeatureID;
		LogitechMouse.setDpi(DPI, Stage);

		expect(global.device.write).toBeCalledTimes(1);

		expect(global.device.write.mock.calls[0]).toEqual([[0x11, Logitech.Config.ConnectionMode, MockFeatureID, 0x30, 0x00, Math.floor(DPI/256), DPI%256, Stage], 20]);

	});
	it('SetHasDPILights', () => {
		const LogitechMouse = new LogitechMouseDevice();

		// Default should be false
		expect(LogitechMouse.getHasDPILights()).toBe(false);

		LogitechMouse.setHasDPILights(true);
		expect(LogitechMouse.getHasDPILights()).toBe(true);

		LogitechMouse.setHasDPILights(false);
		expect(LogitechMouse.getHasDPILights()).toBe(false);

	});

	it.each([true, false])(
		'SetDirectMode-Legacy(%d)',
		(onboardState) => {
			const Logitech = new LogitechProtocol();
			Logitech.Config.IsHeroProtocol = false;

			const MockFeatureID = Math.round(Math.random() * 255);
			Logitech.FeatureIDs.RGB8070ID = MockFeatureID;

			const MockFeatureID2 = Math.round(Math.random() * 255);
			Logitech.FeatureIDs.LEDControlID = MockFeatureID2;

			Logitech.SetDirectMode(onboardState);

			expect(global.device.write).toBeCalledTimes(2);

			const ExpectedSnapshot = [
				[[0x10, Logitech.Config.ConnectionMode, MockFeatureID, 0x80, 0x01, 0x01], 7],
				[[0x10, Logitech.Config.ConnectionMode, MockFeatureID2, 0x30, +!onboardState], 7] // + to convert bool to int
			];

			expect(global.device.write.mock.calls[0]).toEqual(ExpectedSnapshot[0]);
			expect(global.device.write.mock.calls[1]).toEqual(ExpectedSnapshot[1]);

		}
	);

	it.each([[true]])(
		'SetDirectMode-Hero(%d)',
		(onboardState) => {
			const Logitech = new LogitechProtocol();
			Logitech.Config.IsHeroProtocol = true;

			const MockFeatureID = Math.round(Math.random() * 255);
			Logitech.FeatureIDs.RGB8071ID = MockFeatureID;

			Logitech.SetDirectMode(onboardState);

			expect(global.device.write).toBeCalledTimes(4);

			const ExpectedSnapshot = [
				[[0x10, Logitech.Config.ConnectionMode, MockFeatureID, 0x50, 0x01, 0x03, 0x05], 7],
			];

			expect(global.device.write.mock.calls[0]).toEqual(ExpectedSnapshot[0]);

		}
	);

	test("Device Connection Check", () => {
	    const Logitech = new LogitechProtocol();
		const Dongle = new LogitechDongleDevice();
		global.device.read.mockImplementationOnce(() => { return [0x10, 0xff, 0x80, 0x00, 0x00, 0x01, 0x00]; });
		Dongle.SetHidppNotifications(true);
		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.read.mock.calls.length).toBe(1);
		//expect(global.device.write.mock.calls[0]).toEqual([[0x10, 0xff, 0x80, 0x00, 0x00, 0x01, 0x00], 91]);
		//expect(Dongle.SetHidppNotifications()).toBe(0);
	});

	test.each(
		[
			[
				0x8071,
				1,
				1
			],
			[
				0x8070,
				128,
				0
			],
			[
				0x8000,
				0,
				0
			]
		])("Feature ID Mock Test", (featurePage, returnFeatureID, expectedReturnFeatureID) => {
		const Logitech = new LogitechProtocol();
		Logitech.Config.ConnectionMode = Logitech.ConnectionType["Wireless"];
		global.device.read.mockImplementationOnce(() => { return [0x11, 0x01, 0x00, 0x00, returnFeatureID, 0x00, 0x00]; }); //Running twice because we run the function twice.
		global.device.read.mockImplementationOnce(() => { return [0x11, 0x01, 0x00, 0x00, returnFeatureID, 0x00, 0x00]; });

		Logitech.FetchFeatureIdFromPage(featurePage);
		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.read.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0]).toEqual([[0x11, 0x01, 0x00, 0x00, (featurePage >> 8) & 0xFF, featurePage & 0xFF], 20]);
		expect(Logitech.FetchFeatureIdFromPage()).toBe(expectedReturnFeatureID);
	});

	test.each([0, 5, 10])("Feature ID Count Mock Test", (FeatureIDCount) => {
		const LogitechDevelopmentTools = new LogitechExtras();
		global.device.read.mockImplementationOnce(() => { return [0x11, 0xff, 0x00, 0x00, FeatureIDCount, 0x00, 0x00]; });

		expect(LogitechDevelopmentTools.FetchFeatureCount()).toBe(FeatureIDCount);
		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.read.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0]).toEqual([[0x11, 0xff, 0x01, 0x00], 20]);
	});

});
