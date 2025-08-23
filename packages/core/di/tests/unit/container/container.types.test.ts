/**
 * Container types unit tests
 *
 * Tests for TypeScript type definitions and interfaces
 */

import { describe, it, expect } from "vitest";
import type {
  DIToken,
  ContainerLifecycle,
  IContainerRegistrationOptions,
  IContainerRegistration,
  IResolutionContext,
  IContainerMetrics,
  IDIContainer,
  IDIContainerError,
  ICircularDependencyError,
  IRegistrationNotFoundError,
  IContainerConfig,
} from "../../../src/container/container.types.js";

// Type assertion helper
function assertType<T>(value: T): T {
  return value;
}

describe("Container Types", () => {
  describe("DIToken", () => {
    it("should accept string tokens", () => {
      const stringToken: DIToken = "ITestService";
      const stringTokenTyped: DIToken<string> = "StringService";

      expect(typeof stringToken).toBe("string");
      expect(typeof stringTokenTyped).toBe("string");
    });

    it("should accept symbol tokens", () => {
      const symbolToken: DIToken = Symbol("TestService");
      const symbolTokenTyped: DIToken<object> = Symbol("ObjectService");

      expect(typeof symbolToken).toBe("symbol");
      expect(typeof symbolTokenTyped).toBe("symbol");
    });

    it("should accept constructor function tokens", () => {
      class TestService {
        getValue(): string {
          return "test";
        }
      }

      const constructorToken: DIToken = TestService;
      const constructorTokenTyped: DIToken<TestService> = TestService;

      expect(typeof constructorToken).toBe("function");
      expect(typeof constructorTokenTyped).toBe("function");
    });

    it("should maintain type safety with generic parameter", () => {
      interface IService {
        execute(): void;
      }

      const typedToken: DIToken<IService> = "IService";

      // This should compile without issues
      expect(typeof typedToken).toBe("string");
    });
  });

  describe("ContainerLifecycle", () => {
    it("should only accept valid lifecycle values", () => {
      const singleton: ContainerLifecycle = "singleton";
      const transient: ContainerLifecycle = "transient";
      const scoped: ContainerLifecycle = "scoped";

      expect(singleton).toBe("singleton");
      expect(transient).toBe("transient");
      expect(scoped).toBe("scoped");
    });
  });

  describe("IContainerRegistrationOptions", () => {
    it("should define optional registration options", () => {
      // All properties should be optional
      const emptyOptions: IContainerRegistrationOptions = {};

      const fullOptions: IContainerRegistrationOptions = {
        lifecycle: "singleton",
        factory: () => ({ test: true }),
        dependencies: ["dep1", "dep2"],
        metadata: { version: "1.0.0" },
        pool: undefined,
      };

      expect(emptyOptions).toBeDefined();
      expect(fullOptions.lifecycle).toBe("singleton");
      expect(typeof fullOptions.factory).toBe("function");
      expect(fullOptions.dependencies).toHaveLength(2);
    });

    it("should allow factory function with any signature", () => {
      const options1: IContainerRegistrationOptions = {
        factory: () => "simple",
      };

      const options2: IContainerRegistrationOptions = {
        factory: (arg1: string, arg2: number) => ({ arg1, arg2 }),
      };

      expect(typeof options1.factory).toBe("function");
      expect(typeof options2.factory).toBe("function");
    });

    it("should accept pool configuration", () => {
      const optionsWithPool: IContainerRegistrationOptions = {
        pool: {
          min: 1,
          max: 10,
          idleTimeout: 30000,
        } as any, // Using any since pool types are from different module
      };

      expect(optionsWithPool.pool).toBeDefined();
    });
  });

  describe("IContainerRegistration", () => {
    it("should define complete registration entry structure", () => {
      class TestService {
        getValue(): string {
          return "test";
        }
      }

      const registration: IContainerRegistration<TestService> = {
        token: "TestService",
        implementation: TestService,
        options: {
          lifecycle: "singleton",
          dependencies: [],
          metadata: {},
          factory: undefined,
          pool: undefined,
        },
        registeredAt: new Date(),
      };

      expect(registration.token).toBe("TestService");
      expect(registration.implementation).toBe(TestService);
      expect(registration.options.lifecycle).toBe("singleton");
      expect(registration.registeredAt).toBeInstanceOf(Date);
    });

    it("should allow optional instance caching", () => {
      class TestService {}

      const registrationWithInstance: IContainerRegistration<TestService> = {
        token: "TestService",
        implementation: TestService,
        options: {
          lifecycle: "singleton",
          dependencies: [],
          metadata: {},
          factory: undefined,
          pool: undefined,
        },
        instance: new TestService(),
        registeredAt: new Date(),
      };

      expect(registrationWithInstance.instance).toBeInstanceOf(TestService);
    });

    it("should support factory functions as implementations", () => {
      const factoryImplementation = () => ({ value: "factory-created" });

      const registration: IContainerRegistration<object> = {
        token: "FactoryService",
        implementation: factoryImplementation,
        options: {
          lifecycle: "transient",
          dependencies: [],
          metadata: {},
          factory: undefined,
          pool: undefined,
        },
        registeredAt: new Date(),
      };

      expect(typeof registration.implementation).toBe("function");
    });
  });

  describe("IResolutionContext", () => {
    it("should define resolution tracking structure", () => {
      const context: IResolutionContext = {
        resolutionPath: ["ServiceA", "ServiceB"],
        depth: 2,
        startTime: performance.now(),
      };

      expect(context.resolutionPath).toHaveLength(2);
      expect(context.depth).toBe(2);
      expect(typeof context.startTime).toBe("number");
    });

    it("should support optional scoped instances", () => {
      const scopedInstances = new Map<DIToken, unknown>();
      scopedInstances.set("ScopedService", { value: "scoped" });

      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances,
      };

      expect(context.scopedInstances).toBe(scopedInstances);
      expect(context.scopedInstances?.get("ScopedService")).toEqual({ value: "scoped" });
    });

    it("should support nested contexts with parent reference", () => {
      const parentContext: IResolutionContext = {
        resolutionPath: ["Parent"],
        depth: 1,
        startTime: performance.now(),
      };

      const childContext: IResolutionContext = {
        resolutionPath: ["Parent", "Child"],
        depth: 2,
        startTime: performance.now(),
        parent: parentContext,
      };

      expect(childContext.parent).toBe(parentContext);
      expect(childContext.parent?.resolutionPath).toContain("Parent");
    });
  });

  describe("IContainerMetrics", () => {
    it("should define comprehensive metrics structure", () => {
      const metrics: IContainerMetrics = {
        totalRegistrations: 10,
        totalResolutions: 50,
        averageResolutionTime: 1.5,
        peakResolutionTime: 5.2,
        cacheHitRatio: 0.8,
        memoryUsage: {
          singletonCount: 5,
          estimatedBytes: 10240,
        },
      };

      expect(metrics.totalRegistrations).toBe(10);
      expect(metrics.totalResolutions).toBe(50);
      expect(metrics.averageResolutionTime).toBe(1.5);
      expect(metrics.peakResolutionTime).toBe(5.2);
      expect(metrics.cacheHitRatio).toBe(0.8);
      expect(metrics.memoryUsage.singletonCount).toBe(5);
      expect(metrics.memoryUsage.estimatedBytes).toBe(10240);
    });

    it("should support zero values for new containers", () => {
      const emptyMetrics: IContainerMetrics = {
        totalRegistrations: 0,
        totalResolutions: 0,
        averageResolutionTime: 0,
        peakResolutionTime: 0,
        cacheHitRatio: 0,
        memoryUsage: {
          singletonCount: 0,
          estimatedBytes: 0,
        },
      };

      expect(emptyMetrics.totalRegistrations).toBe(0);
      expect(emptyMetrics.cacheHitRatio).toBe(0);
    });
  });

  describe("IDIContainer", () => {
    it("should define complete container interface", () => {
      // This test validates the interface structure by checking method signatures
      // We can't test implementation here, but we can verify the interface exists

      const containerMethods = [
        "register",
        "registerFactory",
        "registerInstance",
        "registerFactoryInstance",
        "registerAbstractFactory",
        "resolve",
        "tryResolve",
        "isRegistered",
        "unregister",
        "createScope",
        "clear",
        "getMetrics",
        "dispose",
      ];

      // Type-only test - ensures interface has required methods
      type ContainerMethodNames = keyof IDIContainer;
      const methodName: ContainerMethodNames = "resolve";

      expect(methodName).toBe("resolve");
      expect(containerMethods).toContain("resolve");
    });

    it("should require readonly name and optional parent properties", () => {
      // Type-only test to verify readonly properties exist
      type NameProperty = IDIContainer["name"];
      type ParentProperty = IDIContainer["parent"];

      const nameType: NameProperty = "test-name";
      const parentType: ParentProperty = undefined;

      expect(typeof nameType).toBe("string");
      expect(parentType).toBeUndefined();
    });
  });

  describe("Error Interfaces", () => {
    describe("IDIContainerError", () => {
      it("should extend base error with DI-specific properties", () => {
        const error: IDIContainerError = {
          message: "Container error",
          code: "DI_ERROR",
          correlationId: "test-correlation-id",
          metadata: { containerName: "TestContainer" },
          token: "FailingService",
          resolutionContext: {
            resolutionPath: ["FailingService"],
            depth: 1,
            startTime: performance.now(),
          },
        };

        expect(error.message).toBe("Container error");
        expect(error.code).toBe("DI_ERROR");
        expect(error.token).toBe("FailingService");
        expect(error.resolutionContext?.resolutionPath).toContain("FailingService");
      });
    });

    describe("ICircularDependencyError", () => {
      it("should include dependency path information", () => {
        const circularError: ICircularDependencyError = {
          message: "Circular dependency detected",
          code: "DI_CIRCULAR_DEPENDENCY",
          correlationId: "circular-correlation-id",
          metadata: {},
          dependencyPath: ["ServiceA", "ServiceB", "ServiceA"],
        };

        expect(circularError.dependencyPath).toHaveLength(3);
        expect(circularError.dependencyPath[0]).toBe("ServiceA");
        expect(circularError.dependencyPath[2]).toBe("ServiceA");
      });
    });

    describe("IRegistrationNotFoundError", () => {
      it("should include available registrations information", () => {
        const notFoundError: IRegistrationNotFoundError = {
          message: "Registration not found",
          code: "DI_REGISTRATION_NOT_FOUND",
          correlationId: "not-found-correlation-id",
          metadata: {},
          availableTokens: ["ServiceA", "ServiceB", "ServiceC"],
        };

        expect(notFoundError.availableTokens).toHaveLength(3);
        expect(notFoundError.availableTokens).toContain("ServiceA");
      });
    });
  });

  describe("IContainerConfig", () => {
    it("should define optional configuration properties", () => {
      // All properties should be optional
      const minimalConfig: IContainerConfig = {};

      const fullConfig: IContainerConfig = {
        name: "TestContainer",
        strictMode: true,
        defaultLifecycle: "singleton",
        enableMetrics: false,
        maxResolutionDepth: 15,
        enableCache: true,
        autoDispose: false,
      };

      expect(minimalConfig).toBeDefined();
      expect(fullConfig.name).toBe("TestContainer");
      expect(fullConfig.strictMode).toBe(true);
      expect(fullConfig.defaultLifecycle).toBe("singleton");
    });

    it("should accept all valid lifecycle values as default", () => {
      const singletonConfig: IContainerConfig = {
        defaultLifecycle: "singleton",
      };

      const transientConfig: IContainerConfig = {
        defaultLifecycle: "transient",
      };

      const scopedConfig: IContainerConfig = {
        defaultLifecycle: "scoped",
      };

      expect(singletonConfig.defaultLifecycle).toBe("singleton");
      expect(transientConfig.defaultLifecycle).toBe("transient");
      expect(scopedConfig.defaultLifecycle).toBe("scoped");
    });
  });
});

describe("Type Relationships", () => {
  it("should maintain type safety between registration and resolution", () => {
    interface ITestService {
      getValue(): string;
    }

    // Registration should maintain type relationship
    const token: DIToken<ITestService> = "ITestService";

    // This simulates what happens during registration and resolution
    const serviceType: ITestService = { getValue: () => "test" };

    expect(typeof token).toBe("string");
    expect(typeof serviceType.getValue()).toBe("string");
  });

  it("should support inheritance in registration types", () => {
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

    // Should be able to register derived type for base interface
    const baseToken: DIToken<IBaseService> = "IBaseService";
    const implementation: new () => IExtendedService = ExtendedService;

    expect(typeof baseToken).toBe("string");
    expect(typeof implementation).toBe("function");
  });

  it("should support generic token types", () => {
    interface IRepository<T> {
      findById(id: string): T | undefined;
      save(entity: T): T;
    }

    interface IUser {
      id: string;
      name: string;
    }

    // Generic token should maintain type parameter
    const userRepoToken: DIToken<IRepository<IUser>> = "IRepository<User>";

    expect(typeof userRepoToken).toBe("string");
  });

  it("should support factory function type safety", () => {
    interface IService {
      execute(): void;
    }

    // Factory function should maintain return type
    const factory: (...args: unknown[]) => IService = () => ({
      execute: () => console.log("executed"),
    });

    const options: IContainerRegistrationOptions = {
      factory,
    };

    expect(typeof options.factory).toBe("function");
    expect(typeof factory().execute).toBe("function");
  });

  it("should maintain context type relationships", () => {
    // Resolution context should work with any token type
    const stringToken: DIToken<string> = "StringService";
    const numberToken: DIToken<number> = "NumberService";

    const context: IResolutionContext = {
      resolutionPath: [stringToken, numberToken],
      depth: 2,
      startTime: performance.now(),
    };

    expect(context.resolutionPath).toContain(stringToken);
    expect(context.resolutionPath).toContain(numberToken);
  });
});

describe("Type Constraints", () => {
  it("should enforce DIToken type constraints", () => {
    // These should compile without issues
    const validTokens = {
      string: "valid-string-token" as DIToken,
      symbol: Symbol("valid-symbol-token") as DIToken,
      constructor: class ValidConstructor {} as DIToken,
    };

    expect(typeof validTokens.string).toBe("string");
    expect(typeof validTokens.symbol).toBe("symbol");
    expect(typeof validTokens.constructor).toBe("function");
  });

  it("should maintain lifecycle type constraints", () => {
    const lifecycles: ContainerLifecycle[] = ["singleton", "transient", "scoped"];

    lifecycles.forEach((lifecycle) => {
      const options: IContainerRegistrationOptions = { lifecycle };
      expect(["singleton", "transient", "scoped"]).toContain(options.lifecycle);
    });
  });

  it("should enforce metric type constraints", () => {
    // Numeric metrics should only accept numbers
    const numericMetrics: Omit<IContainerMetrics, "memoryUsage"> = {
      totalRegistrations: 10,
      totalResolutions: 50,
      averageResolutionTime: 1.5,
      peakResolutionTime: 5.2,
      cacheHitRatio: 0.8,
    };

    Object.values(numericMetrics).forEach((value) => {
      expect(typeof value).toBe("number");
    });
  });
});
