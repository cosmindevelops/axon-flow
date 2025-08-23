/**
 * Testing types unit tests
 *
 * Tests for TypeScript type definitions and interfaces in testing utilities
 */

import { describe, it, expect } from "vitest";
import type {
  IMockContainerOptions,
  IMockProviderConfig,
  IMethodCall,
  IContainerCallHistory,
  ITestFixtureConfig,
  IDependencyMockBuilder,
  ITestContainerBuilder,
  ITestContainer,
  IDITestAssertions,
  MockFactory,
  ISpyConfig,
  ITestScenario,
} from "../../utils/testing.types.js";
import type { DIToken, IDIContainer, IContainerRegistrationOptions } from "../../../src/container/container.types.js";

// Type assertion helper
function assertType<T>(value: T): T {
  return value;
}

describe("Testing Types", () => {
  describe("IMockContainerOptions", () => {
    it("should define optional mock container configuration", () => {
      // All properties should be optional
      const emptyOptions: IMockContainerOptions = {};

      const fullOptions: IMockContainerOptions = {
        name: "TestMockContainer",
        enableCallTracking: true,
        strictMode: false,
        defaultLifecycle: "singleton",
      };

      expect(emptyOptions).toBeDefined();
      expect(fullOptions.name).toBe("TestMockContainer");
      expect(fullOptions.enableCallTracking).toBe(true);
      expect(fullOptions.strictMode).toBe(false);
      expect(fullOptions.defaultLifecycle).toBe("singleton");
    });

    it("should accept all valid lifecycle values", () => {
      const singletonOptions: IMockContainerOptions = { defaultLifecycle: "singleton" };
      const transientOptions: IMockContainerOptions = { defaultLifecycle: "transient" };
      const scopedOptions: IMockContainerOptions = { defaultLifecycle: "scoped" };

      expect(singletonOptions.defaultLifecycle).toBe("singleton");
      expect(transientOptions.defaultLifecycle).toBe("transient");
      expect(scopedOptions.defaultLifecycle).toBe("scoped");
    });

    it("should support boolean flags", () => {
      const trackingEnabled: IMockContainerOptions = { enableCallTracking: true };
      const trackingDisabled: IMockContainerOptions = { enableCallTracking: false };
      const strictEnabled: IMockContainerOptions = { strictMode: true };
      const strictDisabled: IMockContainerOptions = { strictMode: false };

      expect(trackingEnabled.enableCallTracking).toBe(true);
      expect(trackingDisabled.enableCallTracking).toBe(false);
      expect(strictEnabled.strictMode).toBe(true);
      expect(strictDisabled.strictMode).toBe(false);
    });
  });

  describe("IMockProviderConfig", () => {
    it("should define mock provider configuration structure", () => {
      interface ITestService {
        getValue(): string;
      }

      const instanceConfig: IMockProviderConfig<ITestService> = {
        token: "TestService",
        implementation: { getValue: () => "mock" },
        options: { lifecycle: "singleton" },
        spy: true,
      };

      const factoryConfig: IMockProviderConfig<ITestService> = {
        token: Symbol("TestService"),
        implementation: () => ({ getValue: () => "factory-mock" }),
        options: { metadata: { mock: true } },
        spy: false,
      };

      expect(instanceConfig.token).toBe("TestService");
      expect(instanceConfig.implementation.getValue()).toBe("mock");
      expect(instanceConfig.options?.lifecycle).toBe("singleton");
      expect(instanceConfig.spy).toBe(true);

      expect(typeof factoryConfig.token).toBe("symbol");
      expect(typeof factoryConfig.implementation).toBe("function");
      expect(factoryConfig.spy).toBe(false);
    });

    it("should support different token types", () => {
      const stringToken: IMockProviderConfig = {
        token: "StringToken",
        implementation: "mock",
      };

      const symbolToken: IMockProviderConfig = {
        token: Symbol("SymbolToken"),
        implementation: "mock",
      };

      const functionToken: IMockProviderConfig = {
        token: class TokenClass {},
        implementation: "mock",
      };

      expect(typeof stringToken.token).toBe("string");
      expect(typeof symbolToken.token).toBe("symbol");
      expect(typeof functionToken.token).toBe("function");
    });

    it("should support instance and factory implementations", () => {
      const instanceImpl: IMockProviderConfig = {
        token: "InstanceService",
        implementation: { value: "instance" },
      };

      const factoryImpl: IMockProviderConfig = {
        token: "FactoryService",
        implementation: () => ({ value: "factory" }),
      };

      expect(typeof instanceImpl.implementation).toBe("object");
      expect(typeof factoryImpl.implementation).toBe("function");
    });

    it("should make options and spy optional", () => {
      const minimal: IMockProviderConfig = {
        token: "MinimalService",
        implementation: "minimal",
      };

      expect(minimal.options).toBeUndefined();
      expect(minimal.spy).toBeUndefined();
    });
  });

  describe("IMethodCall", () => {
    it("should define method call tracking structure", () => {
      const methodCall: IMethodCall = {
        method: "resolve",
        args: ["TestService", { context: true }],
        timestamp: new Date(),
        returnValue: { service: "instance" },
        error: undefined,
      };

      expect(methodCall.method).toBe("resolve");
      expect(methodCall.args).toEqual(["TestService", { context: true }]);
      expect(methodCall.timestamp).toBeInstanceOf(Date);
      expect(methodCall.returnValue).toEqual({ service: "instance" });
      expect(methodCall.error).toBeUndefined();
    });

    it("should handle method calls with errors", () => {
      const errorCall: IMethodCall = {
        method: "register",
        args: [null, "InvalidImplementation"],
        timestamp: new Date(),
        error: new Error("Registration failed"),
      };

      expect(errorCall.method).toBe("register");
      expect(errorCall.args).toContain(null);
      expect(errorCall.error).toBeInstanceOf(Error);
      expect(errorCall.returnValue).toBeUndefined();
    });

    it("should support calls without return values", () => {
      const voidCall: IMethodCall = {
        method: "clear",
        args: [],
        timestamp: new Date(),
      };

      expect(voidCall.method).toBe("clear");
      expect(voidCall.args).toEqual([]);
      expect(voidCall.returnValue).toBeUndefined();
      expect(voidCall.error).toBeUndefined();
    });

    it("should accept unknown argument and return types", () => {
      const flexibleCall: IMethodCall = {
        method: "customMethod",
        args: ["string", 42, { complex: "object" }, [1, 2, 3]],
        timestamp: new Date(),
        returnValue: new Map([["key", "value"]]),
      };

      expect(flexibleCall.args).toHaveLength(4);
      expect(flexibleCall.returnValue).toBeInstanceOf(Map);
    });
  });

  describe("IContainerCallHistory", () => {
    it("should define call history structure for all tracked methods", () => {
      const mockCall: IMethodCall = {
        method: "resolve",
        args: ["TestService"],
        timestamp: new Date(),
        returnValue: {},
      };

      const history: IContainerCallHistory = {
        register: [mockCall],
        resolve: [mockCall, mockCall],
        tryResolve: [],
        isRegistered: [mockCall],
        all: [mockCall, mockCall, mockCall, mockCall],
      };

      expect(history.register).toHaveLength(1);
      expect(history.resolve).toHaveLength(2);
      expect(history.tryResolve).toHaveLength(0);
      expect(history.isRegistered).toHaveLength(1);
      expect(history.all).toHaveLength(4);

      // All should be arrays of method calls
      expect(Array.isArray(history.register)).toBe(true);
      expect(Array.isArray(history.resolve)).toBe(true);
      expect(Array.isArray(history.tryResolve)).toBe(true);
      expect(Array.isArray(history.isRegistered)).toBe(true);
      expect(Array.isArray(history.all)).toBe(true);
    });

    it("should maintain chronological order in all calls", () => {
      const call1: IMethodCall = {
        method: "register",
        args: ["Service1"],
        timestamp: new Date(Date.now() - 3000),
      };

      const call2: IMethodCall = {
        method: "resolve",
        args: ["Service1"],
        timestamp: new Date(Date.now() - 2000),
      };

      const call3: IMethodCall = {
        method: "isRegistered",
        args: ["Service2"],
        timestamp: new Date(Date.now() - 1000),
      };

      const history: IContainerCallHistory = {
        register: [call1],
        resolve: [call2],
        tryResolve: [],
        isRegistered: [call3],
        all: [call1, call2, call3],
      };

      // Verify chronological order in 'all' array
      for (let i = 1; i < history.all.length; i++) {
        expect(history.all[i].timestamp.getTime()).toBeGreaterThanOrEqual(history.all[i - 1].timestamp.getTime());
      }
    });
  });

  describe("ITestFixtureConfig", () => {
    it("should define optional test fixture configuration", () => {
      const emptyConfig: ITestFixtureConfig = {};

      const fullConfig: ITestFixtureConfig = {
        container: {
          name: "FixtureContainer",
          enableCallTracking: true,
        },
        providers: [
          {
            token: "TestService",
            implementation: "mock",
          },
        ],
        setup: async (container) => {
          container.register("SetupService", class {});
        },
        teardown: async (container) => {
          container.clear();
        },
      };

      expect(emptyConfig).toBeDefined();
      expect(fullConfig.container?.name).toBe("FixtureContainer");
      expect(fullConfig.providers).toHaveLength(1);
      expect(typeof fullConfig.setup).toBe("function");
      expect(typeof fullConfig.teardown).toBe("function");
    });

    it("should support sync and async setup/teardown functions", () => {
      const syncConfig: ITestFixtureConfig = {
        setup: (container) => {
          container.register("SyncService", class {});
        },
        teardown: (container) => {
          container.clear();
        },
      };

      const asyncConfig: ITestFixtureConfig = {
        setup: async (container) => {
          await Promise.resolve();
          container.register("AsyncService", class {});
        },
        teardown: async (container) => {
          await Promise.resolve();
          container.clear();
        },
      };

      expect(typeof syncConfig.setup).toBe("function");
      expect(typeof syncConfig.teardown).toBe("function");
      expect(typeof asyncConfig.setup).toBe("function");
      expect(typeof asyncConfig.teardown).toBe("function");
    });

    it("should accept container that conforms to IDIContainer interface", () => {
      const config: ITestFixtureConfig = {
        setup: (container: IDIContainer) => {
          // Should accept any IDIContainer
          container.register("Service", class {});
          const instance = container.resolve("Service");
          const isRegistered = container.isRegistered("Service");
          const metrics = container.getMetrics();

          expect(typeof container.register).toBe("function");
          expect(typeof container.resolve).toBe("function");
          expect(typeof container.isRegistered).toBe("function");
          expect(typeof container.getMetrics).toBe("function");
        },
      };

      expect(typeof config.setup).toBe("function");
    });
  });

  describe("Builder Interfaces", () => {
    describe("IDependencyMockBuilder", () => {
      it("should define fluent interface for building mocks", () => {
        // Type-only test to verify interface structure
        type BuilderMethods = keyof IDependencyMockBuilder;

        const expectedMethods: BuilderMethods[] = [
          "withImplementation",
          "withLifecycle",
          "withSpy",
          "withOptions",
          "build",
        ];

        expectedMethods.forEach((method) => {
          expect(typeof method).toBe("string");
        });
      });

      it("should support method chaining with return types", () => {
        const mockBuilder = {} as IDependencyMockBuilder<string>;

        // All methods except build should return the builder for chaining
        type WithImplReturn = ReturnType<IDependencyMockBuilder<string>["withImplementation"]>;
        type WithLifecycleReturn = ReturnType<IDependencyMockBuilder<string>["withLifecycle"]>;
        type WithSpyReturn = ReturnType<IDependencyMockBuilder<string>["withSpy"]>;
        type WithOptionsReturn = ReturnType<IDependencyMockBuilder<string>["withOptions"]>;
        type BuildReturn = ReturnType<IDependencyMockBuilder<string>["build"]>;

        const chainable1: WithImplReturn = mockBuilder;
        const chainable2: WithLifecycleReturn = mockBuilder;
        const chainable3: WithSpyReturn = mockBuilder;
        const chainable4: WithOptionsReturn = mockBuilder;
        const buildResult: BuildReturn = undefined;

        expect(chainable1).toBe(mockBuilder);
        expect(chainable2).toBe(mockBuilder);
        expect(chainable3).toBe(mockBuilder);
        expect(chainable4).toBe(mockBuilder);
        expect(buildResult).toBeUndefined();
      });

      it("should support generic type parameter", () => {
        interface ICustomService {
          customMethod(): string;
        }

        const typedBuilder = {} as IDependencyMockBuilder<ICustomService>;
        const implementation: ICustomService = { customMethod: () => "custom" };

        // withImplementation should accept the correct type
        type ImplParam = Parameters<IDependencyMockBuilder<ICustomService>["withImplementation"]>[0];
        const implParam: ImplParam = implementation;

        expect(implParam.customMethod()).toBe("custom");
      });
    });

    describe("ITestContainerBuilder", () => {
      it("should define test container builder interface", () => {
        type BuilderMethods = keyof ITestContainerBuilder;

        const expectedMethods: BuilderMethods[] = [
          "mockDependency",
          "mockDependencies",
          "withCallTracking",
          "withName",
          "withStrictMode",
          "build",
        ];

        expectedMethods.forEach((method) => {
          expect(typeof method).toBe("string");
        });
      });

      it("should support fluent interface pattern", () => {
        const mockBuilder = {} as ITestContainerBuilder;

        // Methods should return builder for chaining
        type MockDepsReturn = ReturnType<ITestContainerBuilder["mockDependencies"]>;
        type WithTrackingReturn = ReturnType<ITestContainerBuilder["withCallTracking"]>;
        type WithNameReturn = ReturnType<ITestContainerBuilder["withName"]>;
        type WithStrictReturn = ReturnType<ITestContainerBuilder["withStrictMode"]>;

        const chainable1: MockDepsReturn = mockBuilder;
        const chainable2: WithTrackingReturn = mockBuilder;
        const chainable3: WithNameReturn = mockBuilder;
        const chainable4: WithStrictReturn = mockBuilder;

        expect(chainable1).toBe(mockBuilder);
        expect(chainable2).toBe(mockBuilder);
        expect(chainable3).toBe(mockBuilder);
        expect(chainable4).toBe(mockBuilder);
      });

      it("should build test containers with extended interface", () => {
        const builder = {} as ITestContainerBuilder;

        type BuildResult = ReturnType<ITestContainerBuilder["build"]>;

        // Should return intersection of IDIContainer & ITestContainer
        const testContainer: BuildResult = {} as IDIContainer & ITestContainer;

        expect(typeof testContainer.register).toBe("function"); // IDIContainer method
        expect(typeof testContainer.getCallHistory).toBe("function"); // ITestContainer method
      });
    });
  });

  describe("ITestContainer", () => {
    it("should extend IDIContainer with testing capabilities", () => {
      // Type-only test to verify interface extension
      const mockTestContainer = {} as ITestContainer;

      // Should have all IDIContainer methods
      const register = mockTestContainer.register;
      const resolve = mockTestContainer.resolve;
      const isRegistered = mockTestContainer.isRegistered;

      // Should have ITestContainer-specific methods
      const getCallHistory = mockTestContainer.getCallHistory;
      const clearCallHistory = mockTestContainer.clearCallHistory;
      const getMockTokens = mockTestContainer.getMockTokens;
      const isMocked = mockTestContainer.isMocked;
      const resetMocks = mockTestContainer.resetMocks;
      const verifyResolved = mockTestContainer.verifyResolved;
      const verifyRegistered = mockTestContainer.verifyRegistered;

      expect(typeof register).toBe("function");
      expect(typeof resolve).toBe("function");
      expect(typeof isRegistered).toBe("function");
      expect(typeof getCallHistory).toBe("function");
      expect(typeof clearCallHistory).toBe("function");
      expect(typeof getMockTokens).toBe("function");
      expect(typeof isMocked).toBe("function");
      expect(typeof resetMocks).toBe("function");
      expect(typeof verifyResolved).toBe("function");
      expect(typeof verifyRegistered).toBe("function");
    });

    it("should maintain type safety for verification methods", () => {
      const mockTestContainer = {} as ITestContainer;

      // verifyResolved should accept DIToken and optional times
      type VerifyResolvedParams = Parameters<ITestContainer["verifyResolved"]>;
      const token: VerifyResolvedParams[0] = "TestToken";
      const times: VerifyResolvedParams[1] = 3;

      expect(typeof token).toBe("string");
      expect(typeof times).toBe("number");
    });

    it("should return appropriate types for mock-related methods", () => {
      const mockTestContainer = {} as ITestContainer;

      type GetMockTokensReturn = ReturnType<ITestContainer["getMockTokens"]>;
      type IsModifiedReturn = ReturnType<ITestContainer["isMocked"]>;
      type ResetMocksReturn = ReturnType<ITestContainer["resetMocks"]>;

      const tokens: GetMockTokensReturn = ["token1", "token2"];
      const isMocked: IsModifiedReturn = true;
      const resetResult: ResetMocksReturn = undefined;

      expect(Array.isArray(tokens)).toBe(true);
      expect(typeof isMocked).toBe("boolean");
      expect(resetResult).toBeUndefined();
    });
  });

  describe("IDITestAssertions", () => {
    it("should define assertion methods for DI testing", () => {
      type AssertionMethods = keyof IDITestAssertions;

      const expectedMethods: AssertionMethods[] = [
        "toHaveRegistration",
        "toResolve",
        "toThrowOnResolve",
        "toHaveLifecycle",
        "toDetectCircularDependency",
      ];

      expectedMethods.forEach((method) => {
        expect(typeof method).toBe("string");
      });
    });

    it("should accept container and token parameters", () => {
      const mockAssertions = {} as IDITestAssertions;
      const mockContainer = {} as IDIContainer;

      // All assertion methods should accept container and token
      type ToHaveRegParams = Parameters<IDITestAssertions["toHaveRegistration"]>;
      type ToResolveParams = Parameters<IDITestAssertions["toResolve"]>;
      type ToThrowParams = Parameters<IDITestAssertions["toThrowOnResolve"]>;

      const container1: ToHaveRegParams[0] = mockContainer;
      const token1: ToHaveRegParams[1] = "TestToken";

      const container2: ToResolveParams[0] = mockContainer;
      const token2: ToResolveParams[1] = "TestToken";

      const container3: ToThrowParams[0] = mockContainer;
      const token3: ToThrowParams[1] = "TestToken";

      expect(container1).toBe(mockContainer);
      expect(typeof token1).toBe("string");
      expect(container2).toBe(mockContainer);
      expect(typeof token2).toBe("string");
      expect(container3).toBe(mockContainer);
      expect(typeof token3).toBe("string");
    });

    it("should support optional error type parameter in toThrowOnResolve", () => {
      const mockAssertions = {} as IDITestAssertions;

      type ToThrowParams = Parameters<IDITestAssertions["toThrowOnResolve"]>;
      type ErrorTypeParam = ToThrowParams[2];

      const errorType: ErrorTypeParam = Error;
      const customErrorType: ErrorTypeParam = class CustomError extends Error {};

      expect(typeof errorType).toBe("function");
      expect(typeof customErrorType).toBe("function");
    });

    it("should return void for all assertion methods", () => {
      const mockAssertions = {} as IDITestAssertions;

      type ToHaveRegReturn = ReturnType<IDITestAssertions["toHaveRegistration"]>;
      type ToResolveReturn = ReturnType<IDITestAssertions["toResolve"]>;
      type ToThrowReturn = ReturnType<IDITestAssertions["toThrowOnResolve"]>;
      type ToHaveLifecycleReturn = ReturnType<IDITestAssertions["toHaveLifecycle"]>;
      type ToDetectCircularReturn = ReturnType<IDITestAssertions["toDetectCircularDependency"]>;

      const result1: ToHaveRegReturn = undefined;
      const result2: ToResolveReturn = undefined;
      const result3: ToThrowReturn = undefined;
      const result4: ToHaveLifecycleReturn = undefined;
      const result5: ToDetectCircularReturn = undefined;

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      expect(result4).toBeUndefined();
      expect(result5).toBeUndefined();
    });
  });

  describe("Utility Types", () => {
    describe("MockFactory", () => {
      it("should define factory function type", () => {
        const stringFactory: MockFactory<string> = () => "mock-string";
        const objectFactory: MockFactory<object> = () => ({ mock: true });
        const numberFactory: MockFactory<number> = () => 42;

        expect(typeof stringFactory).toBe("function");
        expect(typeof objectFactory).toBe("function");
        expect(typeof numberFactory).toBe("function");
        expect(stringFactory()).toBe("mock-string");
        expect(objectFactory()).toEqual({ mock: true });
        expect(numberFactory()).toBe(42);
      });

      it("should support generic type parameter", () => {
        interface ICustomType {
          value: string;
          method(): number;
        }

        const customFactory: MockFactory<ICustomType> = () => ({
          value: "custom",
          method: () => 123,
        });

        const result = customFactory();
        expect(result.value).toBe("custom");
        expect(result.method()).toBe(123);
      });

      it("should be assignable to general function type", () => {
        const factory: MockFactory<string> = () => "test";
        const generalFunction: () => string = factory;

        expect(generalFunction()).toBe("test");
      });
    });

    describe("ISpyConfig", () => {
      it("should define spy configuration options", () => {
        const emptyConfig: ISpyConfig = {};

        const fullConfig: ISpyConfig = {
          methods: ["method1", "method2"],
          callThrough: true,
          implementation: {
            method1: () => "spy-result1",
            method2: (arg: string) => `spy-${arg}`,
          },
        };

        expect(emptyConfig).toBeDefined();
        expect(fullConfig.methods).toEqual(["method1", "method2"]);
        expect(fullConfig.callThrough).toBe(true);
        expect(typeof fullConfig.implementation?.method1).toBe("function");
        expect(fullConfig.implementation?.method1()).toBe("spy-result1");
      });

      it("should support flexible implementation signatures", () => {
        const config: ISpyConfig = {
          implementation: {
            noArgs: () => "no-args",
            oneArg: (a: string) => `one-${a}`,
            multiArgs: (a: string, b: number) => `multi-${a}-${b}`,
            returnVoid: () => {},
            returnPromise: async () => Promise.resolve("async"),
          },
        };

        expect(typeof config.implementation?.noArgs).toBe("function");
        expect(typeof config.implementation?.oneArg).toBe("function");
        expect(typeof config.implementation?.multiArgs).toBe("function");
        expect(typeof config.implementation?.returnVoid).toBe("function");
        expect(typeof config.implementation?.returnPromise).toBe("function");
      });
    });

    describe("ITestScenario", () => {
      it("should define test scenario structure", () => {
        const scenario: ITestScenario = {
          name: "User Registration Flow",
          mocks: [
            {
              token: "DatabaseService",
              implementation: { query: () => Promise.resolve([]) },
            },
            {
              token: "EmailService",
              implementation: () => ({ send: () => Promise.resolve(true) }),
            },
          ],
          setup: async (container) => {
            container.register("UserService", class {});
          },
          assertions: async (container) => {
            const userService = container.resolve("UserService");
            expect(userService).toBeDefined();
          },
          expected: "User should be created and confirmation email sent",
        };

        expect(scenario.name).toBe("User Registration Flow");
        expect(scenario.mocks).toHaveLength(2);
        expect(typeof scenario.setup).toBe("function");
        expect(typeof scenario.assertions).toBe("function");
        expect(scenario.expected).toContain("User should be created");
      });

      it("should make setup, assertions, and expected optional", () => {
        const minimalScenario: ITestScenario = {
          name: "Minimal Scenario",
          mocks: [],
        };

        expect(minimalScenario.name).toBe("Minimal Scenario");
        expect(minimalScenario.mocks).toEqual([]);
        expect(minimalScenario.setup).toBeUndefined();
        expect(minimalScenario.assertions).toBeUndefined();
        expect(minimalScenario.expected).toBeUndefined();
      });

      it("should support async and sync functions", () => {
        const asyncScenario: ITestScenario = {
          name: "Async Scenario",
          mocks: [],
          setup: async (container) => {
            await Promise.resolve();
            container.register("AsyncService", class {});
          },
          assertions: async (container) => {
            await Promise.resolve();
            expect(container.isRegistered("AsyncService")).toBe(true);
          },
        };

        const syncScenario: ITestScenario = {
          name: "Sync Scenario",
          mocks: [],
          setup: (container) => {
            container.register("SyncService", class {});
          },
          assertions: (container) => {
            expect(container.isRegistered("SyncService")).toBe(true);
          },
        };

        expect(typeof asyncScenario.setup).toBe("function");
        expect(typeof asyncScenario.assertions).toBe("function");
        expect(typeof syncScenario.setup).toBe("function");
        expect(typeof syncScenario.assertions).toBe("function");
      });
    });
  });
});

describe("Type Relationships and Constraints", () => {
  it("should maintain type safety between mock config and container", () => {
    interface ITestService {
      getValue(): string;
    }

    const mockConfig: IMockProviderConfig<ITestService> = {
      token: "TestService",
      implementation: { getValue: () => "mock" },
    };

    // Implementation should be assignable to the service interface
    const implementation: ITestService = mockConfig.implementation as ITestService;
    expect(implementation.getValue()).toBe("mock");
  });

  it("should support inheritance in mock configurations", () => {
    interface IBaseService {
      getType(): string;
    }

    interface IExtendedService extends IBaseService {
      getValue(): string;
    }

    class ExtendedService implements IExtendedService {
      getType(): string {
        return "extended";
      }
      getValue(): string {
        return "value";
      }
    }

    // Should be able to mock derived type for base interface
    const baseConfig: IMockProviderConfig<IBaseService> = {
      token: "IBaseService",
      implementation: new ExtendedService(),
    };

    const extendedConfig: IMockProviderConfig<IExtendedService> = {
      token: "IExtendedService",
      implementation: new ExtendedService(),
    };

    expect(baseConfig.implementation.getType()).toBe("extended");
    expect((extendedConfig.implementation as IExtendedService).getValue()).toBe("value");
  });

  it("should maintain consistency between builder types and container types", () => {
    // Builder should work with same types as container
    const mockBuilder = {} as IDependencyMockBuilder<string>;
    const testContainer = {} as ITestContainer;

    // Builder should produce registrations compatible with container
    type BuilderImpl = Parameters<IDependencyMockBuilder<string>["withImplementation"]>[0];
    type ContainerToken = Parameters<ITestContainer["register"]>[0];

    const implementation: BuilderImpl = "mock-string";
    const token: ContainerToken = "StringService";

    expect(typeof implementation).toBe("string");
    expect(typeof token).toBe("string");
  });

  it("should support generic constraints in test scenarios", () => {
    interface IRepository<T> {
      find(id: string): T | undefined;
      save(entity: T): T;
    }

    interface IUser {
      id: string;
      name: string;
    }

    const repositoryMock: IMockProviderConfig<IRepository<IUser>> = {
      token: "IRepository<User>",
      implementation: {
        find: (id: string) => ({ id, name: "Mock User" }),
        save: (user: IUser) => user,
      },
    };

    const mockRepo = repositoryMock.implementation;
    const user = mockRepo.find("123");
    expect(user?.name).toBe("Mock User");
  });

  it("should enforce call history type consistency", () => {
    const methodCall: IMethodCall = {
      method: "resolve",
      args: ["TestService"],
      timestamp: new Date(),
      returnValue: { service: true },
    };

    const callHistory: IContainerCallHistory = {
      register: [],
      resolve: [methodCall],
      tryResolve: [],
      isRegistered: [],
      all: [methodCall],
    };

    // All arrays should contain IMethodCall objects
    const allCalls = [
      ...callHistory.register,
      ...callHistory.resolve,
      ...callHistory.tryResolve,
      ...callHistory.isRegistered,
    ];

    allCalls.forEach((call) => {
      expect(typeof call.method).toBe("string");
      expect(Array.isArray(call.args)).toBe(true);
      expect(call.timestamp).toBeInstanceOf(Date);
    });
  });

  it("should support conditional types in mock configurations", () => {
    // Conditional factory type based on whether it's sync or async
    type MockImplementation<T> = T | (() => T) | (() => Promise<T>);

    const syncMock: IMockProviderConfig<string> = {
      token: "SyncService",
      implementation: "sync-mock" as MockImplementation<string>,
    };

    const factoryMock: IMockProviderConfig<string> = {
      token: "FactoryService",
      implementation: (() => "factory-mock") as MockImplementation<string>,
    };

    const asyncFactoryMock: IMockProviderConfig<string> = {
      token: "AsyncFactoryService",
      implementation: (async () => "async-mock") as MockImplementation<string>,
    };

    expect(typeof syncMock.implementation).toBe("string");
    expect(typeof factoryMock.implementation).toBe("function");
    expect(typeof asyncFactoryMock.implementation).toBe("function");
  });
});

describe("Advanced Type Scenarios", () => {
  it("should handle complex generic scenarios", () => {
    interface IEventHandler<TEvent> {
      handle(event: TEvent): Promise<void>;
    }

    interface IUserEvent {
      userId: string;
      action: string;
    }

    const eventHandlerMock: IMockProviderConfig<IEventHandler<IUserEvent>> = {
      token: Symbol("UserEventHandler"),
      implementation: {
        handle: async (event: IUserEvent) => {
          console.log(`Handling ${event.action} for user ${event.userId}`);
        },
      },
    };

    expect(typeof eventHandlerMock.token).toBe("symbol");
    expect(typeof eventHandlerMock.implementation.handle).toBe("function");
  });

  it("should support factory functions with dependency injection", () => {
    interface IDependency {
      getValue(): string;
    }

    interface IService {
      process(): string;
    }

    const factoryConfig: IMockProviderConfig<IService> = {
      token: "IService",
      implementation: (dep: IDependency) => ({
        process: () => `processed-${dep.getValue()}`,
      }),
      options: {
        dependencies: ["IDependency"],
      },
    };

    expect(typeof factoryConfig.implementation).toBe("function");
    expect(factoryConfig.options?.dependencies).toContain("IDependency");
  });

  it("should maintain type safety in test fixture configurations", () => {
    interface ITestDatabase {
      query<T>(sql: string): Promise<T[]>;
      transaction<T>(fn: () => Promise<T>): Promise<T>;
    }

    const fixtureConfig: ITestFixtureConfig = {
      providers: [
        {
          token: "ITestDatabase",
          implementation: {
            query: async <T>(sql: string): Promise<T[]> => [],
            transaction: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
          } as ITestDatabase,
        },
      ],
      setup: async (container) => {
        const db = container.resolve<ITestDatabase>("ITestDatabase");
        await db.query("CREATE TABLE test");
      },
    };

    expect(fixtureConfig.providers).toHaveLength(1);
    expect(typeof fixtureConfig.setup).toBe("function");
  });
});
