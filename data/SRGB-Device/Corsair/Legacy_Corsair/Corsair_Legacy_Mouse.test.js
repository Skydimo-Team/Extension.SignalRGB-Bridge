const { MockDevice } = require("../../../tests/mocks.js");
const { LegacyCorsairProtocol } = require("./Corsair_Legacy_Mouse.js");
const { LegacyCorsairLibrary } = require("./Corsair_Legacy_Mouse.js");
const { DPIManager } = require("./Corsair_Legacy_Mouse.js");

const pluginPath = "./Corsair_Legacy_Mouse.js";


let Plugin;
beforeEach(() => {
	return import(pluginPath).then(module => {
		Plugin = module;
		jest.resetModules();

		global.device = new MockDevice();
	});
});

describe("Legacy Corsair Mouse", () => {
	it("CheckBasicSetCommand", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setCommand([0xff, 0x00, 0x00]);

		expect(global.device.write.mock.calls.length).toBe(1);

		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0xff, 0x00, 0x00]); //this is a basic hardcoded test to ensure I don't break our base handlers.
	});
	it("CheckBasicReadCommand", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.getCommand([0xee, 0x00, 0x00]);

		expect(global.device.send_report.mock.calls.length).toBe(1);
		expect(global.device.send_report.mock.calls[0][0]).toEqual([0x00, 0x0E, 0xee, 0x00, 0x00]); //this is a basic hardcoded test to ensure I don't break our base handlers.

		expect(global.device.get_report.mock.calls.length).toBe(1);
	});
	it("CheckBasicStreamCommand", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.streamCommand([0xfe, 0x00, 0x00]);

		expect(global.device.write.mock.calls.length).toBe(1);

		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x7f, 0xfe, 0x00, 0x00]); //this is a basic hardcoded test to ensure I don't break our base handlers.
	});

	it.each([0x01, 0x02])(`SpecialFunctionControlMock`, (mode) => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setSpecialFunctionControlMode(mode);

		expect(global.device.write.mock.calls.length).toBe(1);

		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x04, mode]);
	});

	it.each([0x01, 0x02])(`LightingControlMock`, (mode) => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setDeviceType("Mouse");
		LegacyCorsair.setLightingControlMode(mode);

		expect(global.device.write.mock.calls.length).toBe(1);

		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x05, mode, 0x00, 0x01]);
	});
	it("DarkCoreLightingSendMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setDarkCoreLighting([0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);

		expect(global.device.write.mock.calls.length).toBe(3);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0xaa, 0x00, 0x00, 0x01, 0x07, 0x00, 0x00, 0x64, 0xff, 0xfe, 0xfd, 0x00, 0x00, 0x00, 0x05]);
		expect(global.device.write.mock.calls[1][0]).toEqual([0x00, 0x07, 0xaa, 0x00, 0x00, 0x02, 0x07, 0x00, 0x00, 0x64, 0xfc, 0xfb, 0xfa, 0x00, 0x00, 0x00, 0x04]);
		expect(global.device.write.mock.calls[2][0]).toEqual([0x00, 0x07, 0xaa, 0x00, 0x00, 0x04, 0x07, 0x00, 0x00, 0x64, 0xf9, 0xf8, 0xf7, 0x00, 0x00, 0x00, 0x03]);
	});
	it("softwareMouseLightingMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setvLedPositions([ [1, 1], [1, 1], [1, 1]]); //these functions use the length of this
		LegacyCorsair.setSoftwareMouseLighting([0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x22, 0x03, 0x01, 0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);
	});
	it("softwareMousepadLightingMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setvLedPositions([ [1, 1], [1, 1], [1, 1]]); //these functions use the length of this
		LegacyCorsair.setSoftwareMousepadLighting([0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x22, 0x03, 0x00, 0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);
	});
	it("softwareKeyboardLightingMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setSoftwareLightingStream(0x00, 0x03, [0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x7f, 0x00, 0x03, 0x00, 0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7]);
	});
	it("pollingRateMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setDevicePollingRate(125);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x0a, 0x00, 0x00, 0x08]);
	});
	it("angleSnapMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setDeviceAngleSnap(true);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x13, 0x04, 0x00, 0x01]);
	});
	it("lightingStreamApplyMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol(); //This test is inaccurate as I don't know what finish value is supposed to be offhand.
		LegacyCorsair.ApplyLightingStream(0x01, 0x02, 0x03);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x28, 0x01, 0x02, 0x03]);
	});
	it("keyInputModeSetMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol(); //This is testing using a generic value for mice.
		LegacyCorsair.setKeyOutputType([0x01, 0x80, 0x02, 0x80, 0x03, 0x80, 0x04, 0x80, 0x05, 0x80, 0x06, 0x40, 0x07, 0x40, 0x08, 0x40, 0x09, 0x40, 0x0a, 0x40, 0x0b, 0x40, 0x0c, 0x40, 0x0d, 0x40, 0x0e, 0x40, 0x0f, 0x40, 0x10, 0x40, 0x11, 0x40, 0x12, 0x40, 0x13, 0x40, 0x14, 0x40, 0x15, 0x40, 0x16, 0x40, 0x17, 0x40, 0x18, 0x40, 0x19, 0x40, 0x1a, 0x40]);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x40, 0x1A, 0x00, 0x01, 0x80, 0x02, 0x80, 0x03, 0x80, 0x04, 0x80, 0x05, 0x80, 0x06, 0x40, 0x07, 0x40, 0x08, 0x40, 0x09, 0x40, 0x0a, 0x40, 0x0b, 0x40, 0x0c, 0x40, 0x0d, 0x40, 0x0e, 0x40, 0x0f, 0x40, 0x10, 0x40, 0x11, 0x40, 0x12, 0x40, 0x13, 0x40, 0x14, 0x40, 0x15, 0x40, 0x16, 0x40, 0x17, 0x40, 0x18, 0x40, 0x19, 0x40, 0x1a, 0x40]);
	});
	it("setDPIMock", () => { //TODO: Add Random Values for these at some point.
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setDPI(1000, [0xff, 0xfe, 0xfd]);

		expect(global.device.write.mock.calls.length).toBe(2);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x13, 0xD3, 0x00, 0x00, 1000%256, 1000/256, 1000%256, 1000/256, 0xff, 0xfe, 0xfd]);
		expect(global.device.write.mock.calls[1][0]).toEqual([0x00, 0x07, 0x13, 0x02, 0x00, 0x03]);
	});
	it("idleTimeoutMock", () => { //TODO come back and add attempts at out of bounds values. We can check that it doesn't write to know that it worked properly
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setIdleTimeout(true, 10);

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0xA6, 0x00, 0x01, 0x03, 0x0A]);
	});
	it("liftOffDistanceMock", () => { //TODO come back and add attempts at out of bounds values. We can check that it doesn't write to know that it worked properly
		const LegacyCorsair = new LegacyCorsairProtocol();
		LegacyCorsair.setliftOffDistance("Middle");

		expect(global.device.write.mock.calls.length).toBe(1);
		expect(global.device.write.mock.calls[0][0]).toEqual([0x00, 0x07, 0x13, 0x03, 0x00, 0x03]);
	});
	it("getFirmwareInfoMock", () => { //TODO come back and add attempts at out of bounds values. We can check that it doesn't write to know that it worked properly
		const LegacyCorsair = new LegacyCorsairProtocol();
		global.device.get_report.mockImplementationOnce(() => { return [0x0e, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00, 0x01, 65, 3, 8, 3, 28, 27, 92, 27, 1, 1, 0, 1, 193, 255, 64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; });

		const returnValues = LegacyCorsair.getFirmwareInformation();

		expect(global.device.send_report.mock.calls.length).toBe(1);
		expect(global.device.get_report.mock.calls.length).toBe(1);
		expect(returnValues).toBe[341, 38, "1b1c", "1b5c", "1000", "Mouse"];
	});
	it("getFirmwareInfoFailMock", () => { //This and the one above it should be encased together and given tests to make check every single value in the future.
		const LegacyCorsair = new LegacyCorsairProtocol();
		global.device.get_report.mockImplementationOnce(() => { return [0x0e, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00, 0x01, 0x00, 0x00, 8, 3, 28, 27, 92, 27, 1, 1, 0, 1, 193, 255, 64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; });

		const returnValues = LegacyCorsair.getFirmwareInformation();

		expect(global.device.send_report.mock.calls.length).toBe(1);
		expect(global.device.get_report.mock.calls.length).toBe(1);
		expect(returnValues).toBe[-1, -1, -1, -1, -1, -1];
	});
	it("getBatteryLevelMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01]; });

		const batteryLevel = LegacyCorsair.getBatteryLevel();

		expect(global.device.send_report.mock.calls.length).toBe(1);
		expect(global.device.get_report.mock.calls.length).toBe(1);
		expect(global.device.send_report.mock.calls[0][0]).toEqual([0x00, 0x0E, 0x50]);
		expect(batteryLevel).toEqual([50, 1]);
	});
	it("wirelessDeviceSetupMock", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 28, 27, 81, 27, 54, 3, 32, 82, 67, 1, 1]; });
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01]; }); //battery fill

		const batteryLevel = LegacyCorsair.wirelessDeviceSetup();

		expect(global.device.send_report.mock.calls.length).toBe(2);
		expect(global.device.get_report.mock.calls.length).toBe(2);
		expect(batteryLevel).toEqual([50, 1]);
	});
	it("wirelessDeviceSetupMockFailure", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 27, 81, 27, 54, 3, 32, 82, 67, 1, 1]; });
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01]; }); //battery fill

		const batteryLevel = LegacyCorsair.wirelessDeviceSetup();

		expect(global.device.send_report.mock.calls.length).toBe(1);
		expect(global.device.get_report.mock.calls.length).toBe(1);
		expect(batteryLevel).toEqual([-1, -1]);
	});
	it("deviceInitializationMockFailure", () => {
		const LegacyCorsair = new LegacyCorsairProtocol();
		global.device.productId.mockImplementation(() => { return 0x1B5A; });
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 27, 81, 27, 54, 3, 32, 82, 67, 1, 1]; });
		global.device.get_report.mockImplementationOnce(() => { return [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01]; }); //battery fill

		LegacyCorsair.deviceInitialization();

		expect(global.device.send_report.mock.calls[0][0]).toEqual([0x00, 0x0E, 0x01, 0x00]);
		expect(global.device.send_report.mock.calls[4][0]).toEqual([0x00, 0x0E, 0x01, 0x00]); //these all give empty results purposefully
		expect(global.device.send_report.mock.calls.length).toBe(5);
		expect(global.device.get_report.mock.calls.length).toBe(5);
	});
});