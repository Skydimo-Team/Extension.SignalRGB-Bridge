// Remove until AD mocks the systemInfo module.

// const { CorsairDominatorProtocol } = require("./Corsair_Dominator_Ram.js");
// const { MockDevice, MockBus } = require("../../../tests/mocks.js");

// const pluginPath = "./Corsair_Dominator_Ram.js";

// let Plugin;
// beforeEach(() => {
// 	return import(pluginPath).then(module => {
// 		Plugin = module;
// 		jest.resetModules();

// 		global.forceRam = false;
// 		global.forcedRamType = "Vengeance Pro SL";
// 		global.device = new MockDevice();
// 	});
// });

// describe("Corsair Dominator Ram", () => {
// 	it("Scan of Valid Address", () => {
// 		const bus = new MockBus();
// 		// Mock Implementation to be mimic a valid dominator ram stick
// 		// Only for Address 0x58
// 		bus.IsSystemBus.mockImplementation(() => {
// 			return true;
// 		});
// 		bus.WriteQuick.mockImplementation((address) => {
// 			return address === 0x58 ? 0 : -1;
// 		});
// 		bus.ReadByte.mockImplementation((address, register) => {
// 			if(address !== 0x58){
// 				return -1;
// 			}

// 			if(register === 0x43){
// 				return 0x1B;
// 			}

// 			if(register === 0x44){
// 				return 0x04;
// 			}

// 			return -1;
// 		});

// 		const returnAddress = Plugin.Scan(bus);

// 		expect(returnAddress.length).toBe(1);
// 		expect(returnAddress).toEqual([0x58]);
// 	});

// 	it("Scan with invalid Model Byte", () => {
// 		const bus = new MockBus();
// 		// Mock Implementation to be mimic a dominator stick with an invalid model byte
// 		// Only for Address 0x58
// 		bus.IsSystemBus.mockImplementation(() => {
// 			return true;
// 		});
// 		bus.WriteQuick.mockImplementation((address) => {
// 			return address === 0x58 ? 0 : -1;
// 		});
// 		bus.ReadByte.mockImplementation((address, register) => {
// 			if(address !== 0x58){
// 				return -1;
// 			}

// 			if(register === 0x43){
// 				return 0x1B;
// 			}

// 			if(register === 0x44){
// 				return 0x05;
// 			}

// 			return -1;
// 		});

// 		const returnAddress = Plugin.Scan(bus);

// 		expect(returnAddress.length).toBe(0);
// 	});
// 	it("Scan with invalid Vendor Byte", () => {
// 		const bus = new MockBus();
// 		// Mock Implementation to be mimic a dominator stick with an invalid model byte
// 		// Only for Address 0x58
// 		bus.IsSystemBus.mockImplementation(() => {
// 			return true;
// 		});
// 		bus.WriteQuick.mockImplementation((address) => {
// 			return address === 0x58 ? 0 : -1;
// 		});
// 		bus.ReadByte.mockImplementation((address, register) => {
// 			if(address !== 0x58){
// 				return -1;
// 			}

// 			if(register === 0x43){
// 				return 0x1F;
// 			}

// 			if(register === 0x44){
// 				return 0x04;
// 			}

// 			return -1;
// 		});

// 		const returnAddress = Plugin.Scan(bus);

// 		expect(returnAddress.length).toBe(0);
// 	});
// 	it("Scan with non-system bus", () => {
// 		const bus = new MockBus();
// 		bus.IsNvidiaBus.mockImplementationOnce(() => {return true;});
// 		bus.IsNuvotonBus.mockImplementationOnce(() => {return true;});
// 		bus.WriteQuick.mockImplementation((address) => {
// 			return address === 0x58 ? 0 : -1;
// 		});
// 		bus.ReadByte.mockImplementation((address, register) => {
// 			if(address !== 0x58){
// 				return -1;
// 			}

// 			if(register === 0x43){
// 				return 0x1B;
// 			}

// 			if(register === 0x44){
// 				return 0x04;
// 			}

// 			return -1;
// 		});

// 		const ReturnAddress = [];
// 		// collect address returned by both the nvidia and nuvoton scans
// 		ReturnAddress.push(...Plugin.Scan(bus));
// 		ReturnAddress.push(...Plugin.Scan(bus));

// 		// We Expect no Returned addresses
// 		expect(ReturnAddress.length).toBe(0);
// 		// We Expect no attempts to check addresses for devices
// 		expect(bus.WriteQuick.mock.calls.length).toBe(0);

// 	});

// 	it("Setting Ram Type", () => {
// 		const bus = new MockBus();
// 		bus.FetchRamInfo = jest.fn().mockImplementationOnce(() => { return "CMG";});

// 		const CorsairRam = new CorsairDominatorProtocol();
// 		expect(CorsairRam.Config.Model.name).toBe("Corsair Dominator Platinum RGB"); // Check Default is in place
// 		CorsairRam.SetModelId("CMG");
// 		expect(CorsairRam.Config.Model.name).toBe("Corsair Vengeance RGB RS"); // Model was set to Veng Pro RS
// 		CorsairRam.SetModelId("CMN");
// 		expect(CorsairRam.Config.Model.name).toBe("Corsair Vengeance RGB RT"); // Model was set to Veng Pro RT
// 		CorsairRam.SetModelId("ASDF");
// 		expect(CorsairRam.Config.Model.name).toBe("Corsair Dominator Platinum RGB"); // Model was Unchanged when passing an invalid model type
// 	});
// 	it("SendRGBData", () => {
// 		// 10 Leds
// 		const RGBData = [
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30,
// 			0x10, 0x20, 0x30
// 		];

// 		const CorsairDominator = new CorsairDominatorProtocol();
// 		const bus = new MockBus();
// 		global.bus = bus;
// 		CorsairDominator.SetModelId("");
// 		CorsairDominator.SendRGBData(RGBData);

// 		// 2 packets per frame
// 		expect(bus.WriteBlock.mock.calls.length).toBe(2);

// 		// Expect first call at register 0x31, length 32. Leading command byte of 0x0C.
// 		expect(bus.WriteBlock.mock.calls[0]).toEqual([0x31, 32, [0x0C, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30, 0x10, 0x20, 0x30]]);

// 		// Expect second call at register 0x32, length 6 (38 - 32). Ending byte is a CRC code of 101 for this set of input colors.
// 		// Jest insists that 0's here are undefined.
// 		expect(bus.WriteBlock.mock.calls[1]).toEqual([0x32, 6, [undefined, undefined, undefined, undefined, undefined, 101]]);

// 	});

// 	it("Initialize", () => {
// 		bus.FetchRamInfo = jest.fn()
// 			.mockImplementationOnce(() => { return "CMT";})
// 			.mockImplementationOnce(() => { return "CMH";})
// 			.mockImplementationOnce(() => { return "CMG";});

// 		Plugin.Initialize();
// 		// "CMT" as system ram should return Dominator Plat Info when the system reports it's model id
// 		expect(Plugin.LedNames().length).toBe(12);
// 		expect(Plugin.LedPositions().length).toBe(12);
// 		expect(device.setName.mock.calls.length).toBe(1);
// 		expect(device.setName.mock.calls[0]).toEqual(["Corsair Dominator Platinum RGB"]);

// 		Plugin.Initialize();
// 		// "CMT" as system ram should return Vengeance Pro SL Info when the system reports it's model id
// 		expect(Plugin.LedNames().length).toBe(10);
// 		expect(Plugin.LedPositions().length).toBe(10);
// 		expect(device.setName.mock.calls.length).toBe(2);
// 		expect(device.setName.mock.lastCall).toEqual(["Corsair Vengeance Pro SL"]);

// 		Plugin.Initialize();
// 		// "CMT" as system ram should return Corsair Vengeance Pro SR Info when the system reports it's model id
// 		expect(Plugin.LedNames().length).toBe(6);
// 		expect(Plugin.LedPositions().length).toBe(6);
// 		expect(device.setName.mock.calls.length).toBe(3);
// 		expect(device.setName.mock.lastCall).toEqual(["Corsair Vengeance RGB RS"]);
// 	});

// 	it("SetupForcedRamType Using Forced Mode", () => {
// 		global.forceRam = true;
// 		global.forcedRamType = "Vengeance Pro SL";

// 		Plugin.onforceRamChanged();
// 		// Expect Led Count and name to use the Corsair Vengeance Pro SL config

// 		expect(Plugin.LedNames().length).toBe(10);
// 		expect(Plugin.LedPositions().length).toBe(10);
// 		expect(device.setName.mock.calls.length).toBe(1);
// 		expect(device.setName.mock.calls[0]).toEqual(["Corsair Vengeance Pro SL"]);
// 	});

// 	it("SetupForcedRamType Using FetchRamInfo", () => {

// 		const bus = new MockBus();
// 		bus.FetchRamInfo = jest.fn().mockImplementation(() => { return "CMG";});
// 		global.bus = bus;

// 		Plugin.onforcedRamTypeChanged();

// 		// Expect Led Count and name to use the Corsair Vengeance Pro SL config
// 		expect(Plugin.LedNames().length).toBe(6);
// 		expect(Plugin.LedPositions().length).toBe(6);
// 		expect(device.setName.mock.calls.length).toBe(1);
// 		expect(device.setName.mock.calls[0]).toEqual(["Corsair Vengeance RGB RS"]);
// 	});

// 	it("SetupForcedRamType Using FetchRamInfo With Invalid Type", () => {
// 		const bus = new MockBus();
// 		bus.FetchRamInfo = jest.fn().mockImplementation(() => { return "AWSDF";});
// 		global.bus = bus;

// 		Plugin.onforcedRamTypeChanged();

// 		// Expect Led Count and name to use the Corsair Vengeance Pro SL config
// 		expect(Plugin.LedNames().length).toBe(12);
// 		expect(Plugin.LedPositions().length).toBe(12);
// 		expect(device.setName.mock.calls.length).toBe(1);
// 		expect(device.setName.mock.calls[0]).toEqual(["Corsair Dominator Platinum RGB"]);
// 	});
// });
