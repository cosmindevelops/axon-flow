/**
 * Lifecycle types unit tests
 *
 * Tests for TypeScript type definitions and interfaces in lifecycle management
 */

import { describe, it, expect } from "vitest";
import type {
  LifecycleStrategy,
  ILifecycleManager,
  ILifecycleStats,
  ISingletonLifecycleConfig,
  ITransientLifecycleConfig,
  IScopedLifecycleConfig,
  ILifecycleFactory,
  IScopeManager,
  IScopeStats,
  ILifecyclePerformanceMetrics,
} from "../../../src/lifecycle/lifecycle.types.js";
import type { DIToken, IResolutionContext } from "../../../src/container/container.types.js";

// Type assertion helper
function assertType<T>(value: T): T {
  return value;
}

describe("Lifecycle Types", () => {
  describe("LifecycleStrategy", () => {
    it("should only accept valid strategy values", () => {
      const singleton: LifecycleStrategy = "singleton";
      const transient: LifecycleStrategy = "transient";
      const scoped: LifecycleStrategy = "scoped";

      expect(singleton).toBe("singleton");
      expect(transient).toBe("transient");
      expect(scoped).toBe("scoped");
    });

    it("should be used as union type", () => {
      const strategies: LifecycleStrategy[] = ["singleton", "transient", "scoped"];

      strategies.forEach((strategy) => {
        expect(["singleton", "transient", "scoped"]).toContain(strategy);
      });
    });
  });

  describe("ILifecycleManager", () => {
    it("should define complete lifecycle management interface", () => {
      // Type-only test to verify interface structure
      type ManagerMethods = keyof ILifecycleManager;

      const requiredMethods: ManagerMethods[] = [
        "strategy",
        "getInstance",
        "hasInstance",
        "clearInstance",
        "clearAll",
        "getStats",
        "dispose",
      ];

      requiredMethods.forEach((method) => {
        expect(typeof method).toBe("string");
      });
    });

    it("should support generic type parameter", () => {
      interface ITestService {
        getValue(): string;
      }

      // Should compile without issues
      type TypedManager = ILifecycleManager<ITestService>;

      // Verify the generic type is preserved
      const mockManager = {} as TypedManager;
      const mockToken = "TestService" as DIToken<ITestService>;
      const mockFactory = (): ITestService => ({ getValue: () => "test" });

      // This should type-check correctly
      type GetInstanceReturn = ReturnType<TypedManager["getInstance"]>;
      const returnType: GetInstanceReturn = mockFactory();

      expect(returnType.getValue()).toBe("test");
    });

    it("should require readonly strategy property", () => {
      // Verify strategy is readonly by ensuring it's assignable from literal types
      type StrategyProperty = ILifecycleManager["strategy"];

      const singletonStrategy: StrategyProperty = "singleton";
      const transientStrategy: StrategyProperty = "transient";
      const scopedStrategy: StrategyProperty = "scoped";

      expect(singletonStrategy).toBe("singleton");
      expect(transientStrategy).toBe("transient");
      expect(scopedStrategy).toBe("scoped");
    });

    it("should accept optional resolution context", () => {
      interface IService {
        execute(): void;
      }

      const mockManager = {} as ILifecycleManager<IService>;
      const token = "Service" as DIToken<IService>;
      const factory = (): IService => ({ execute: () => {} });

      // Both with and without context should be valid
      type GetInstanceWithContext = (
        token: DIToken<IService>,
        factory: () => IService,
        context: IResolutionContext,
      ) => IService;

      type GetInstanceWithoutContext = (
        token: DIToken<IService>,
        factory: () => IService,
        context?: undefined,
      ) => IService;

      // Method should accept both signatures
      const methodWithContext: GetInstanceWithContext = mockManager.getInstance;
      const methodWithoutContext: GetInstanceWithoutContext = mockManager.getInstance;

      expect(typeof methodWithContext).toBe("function");
      expect(typeof methodWithoutContext).toBe("function");
    });
  });

  describe("ILifecycleStats", () => {
    it("should define comprehensive statistics structure", () => {
      const stats: ILifecycleStats = {
        totalInstancesCreated: 10,
        cachedInstancesCount: 5,
        cacheHitRatio: 0.6,
        estimatedMemoryUsage: 10240,
        averageCreationTime: 1.5,
        peakCreationTime: 5.2,
      };

      expect(stats.totalInstancesCreated).toBe(10);
      expect(stats.cachedInstancesCount).toBe(5);
      expect(stats.cacheHitRatio).toBe(0.6);
      expect(stats.estimatedMemoryUsage).toBe(10240);
      expect(stats.averageCreationTime).toBe(1.5);
      expect(stats.peakCreationTime).toBe(5.2);
    });

    it("should support zero values for new managers", () => {
      const emptyStats: ILifecycleStats = {
        totalInstancesCreated: 0,
        cachedInstancesCount: 0,
        cacheHitRatio: 0,
        estimatedMemoryUsage: 0,
        averageCreationTime: 0,
        peakCreationTime: 0,
      };

      expect(emptyStats.totalInstancesCreated).toBe(0);
      expect(emptyStats.cacheHitRatio).toBe(0);
    });

    it("should require all numeric properties", () => {
      // Verify all properties are numbers
      const stats: ILifecycleStats = {
        totalInstancesCreated: 1,
        cachedInstancesCount: 2,
        cacheHitRatio: 0.5,
        estimatedMemoryUsage: 1024,
        averageCreationTime: 1.0,
        peakCreationTime: 2.0,
      };

      Object.values(stats).forEach((value) => {
        expect(typeof value).toBe("number");
      });
    });
  });

  describe("Configuration Interfaces", () => {
    describe("ISingletonLifecycleConfig", () => {
      it("should define optional singleton configuration", () => {
        // All properties should be optional
        const emptyConfig: ISingletonLifecycleConfig = {};

        const fullConfig: ISingletonLifecycleConfig = {
          lazy: true,
          threadSafe: false,
          maxInstances: 100,
        };

        expect(emptyConfig).toBeDefined();
        expect(fullConfig.lazy).toBe(true);
        expect(fullConfig.threadSafe).toBe(false);
        expect(fullConfig.maxInstances).toBe(100);
      });

      it("should accept boolean flags", () => {
        const lazyConfig: ISingletonLifecycleConfig = { lazy: true };
        const eagerConfig: ISingletonLifecycleConfig = { lazy: false };
        const threadSafeConfig: ISingletonLifecycleConfig = { threadSafe: true };

        expect(lazyConfig.lazy).toBe(true);
        expect(eagerConfig.lazy).toBe(false);
        expect(threadSafeConfig.threadSafe).toBe(true);
      });

      it("should accept numeric maxInstances", () => {
        const limitedConfig: ISingletonLifecycleConfig = { maxInstances: 50 };
        const unlimitedConfig: ISingletonLifecycleConfig = { maxInstances: Infinity };

        expect(limitedConfig.maxInstances).toBe(50);
        expect(unlimitedConfig.maxInstances).toBe(Infinity);
      });
    });

    describe("ITransientLifecycleConfig", () => {
      it("should define optional transient configuration", () => {
        const emptyConfig: ITransientLifecycleConfig = {};

        const fullConfig: ITransientLifecycleConfig = {
          trackInstances: true,
          enablePooling: false,
          poolSize: 10,
          poolConfig: undefined,
          validator: undefined,
          cleanupHandler: undefined,
        };

        expect(emptyConfig).toBeDefined();
        expect(fullConfig.trackInstances).toBe(true);
        expect(fullConfig.enablePooling).toBe(false);
        expect(fullConfig.poolSize).toBe(10);
      });

      it("should support simple pooling configuration", () => {
        const poolingConfig: ITransientLifecycleConfig = {
          enablePooling: true,
          poolSize: 20,
        };

        expect(poolingConfig.enablePooling).toBe(true);
        expect(poolingConfig.poolSize).toBe(20);
      });

      it("should support advanced pool configuration", () => {
        const advancedConfig: ITransientLifecycleConfig = {
          poolConfig: {
            min: 1,
            max: 10,
            idleTimeout: 30000,
          } as any, // Pool config from different module
        };

        expect(advancedConfig.poolConfig).toBeDefined();
      });

      it("should accept validator and cleanup functions", () => {
        const validator = (instance: unknown): boolean => instance !== null;
        const cleanupHandler = (instance: unknown): void => {
          // Cleanup logic
        };

        const config: ITransientLifecycleConfig = {
          validator,
          cleanupHandler,
        };

        expect(typeof config.validator).toBe("function");
        expect(typeof config.cleanupHandler).toBe("function");
      });
    });

    describe("IScopedLifecycleConfig", () => {
      it("should define optional scoped configuration", () => {
        const emptyConfig: IScopedLifecycleConfig = {};

        const fullConfig: IScopedLifecycleConfig = {
          isolationStrategy: "strict",
          autoDispose: true,
          maxInstancesPerScope: 50,
        };

        expect(emptyConfig).toBeDefined();
        expect(fullConfig.isolationStrategy).toBe("strict");
        expect(fullConfig.autoDispose).toBe(true);
        expect(fullConfig.maxInstancesPerScope).toBe(50);
      });

      it("should accept isolation strategy values", () => {
        const strictConfig: IScopedLifecycleConfig = {
          isolationStrategy: "strict",
        };

        const inheritedConfig: IScopedLifecycleConfig = {
          isolationStrategy: "inherited",
        };

        expect(strictConfig.isolationStrategy).toBe("strict");
        expect(inheritedConfig.isolationStrategy).toBe("inherited");
      });

      it("should accept scope limits", () => {
        const limitedConfig: IScopedLifecycleConfig = {
          maxInstancesPerScope: 25,
        };

        expect(limitedConfig.maxInstancesPerScope).toBe(25);
      });
    });
  });

  describe("ILifecycleFactory", () => {
    it("should define factory interface methods", () => {
      // Type-only test to verify interface structure
      type FactoryMethods = keyof ILifecycleFactory;

      const requiredMethods: FactoryMethods[] = [
        "createSingleton",
        "createTransient",
        "createScoped",
        "getLifecycleManager",
      ];

      requiredMethods.forEach((method) => {
        expect(typeof method).toBe("string");
      });
    });

    it("should support generic type parameters", () => {
      interface ITestService {
        execute(): void;
      }

      const mockFactory = {} as ILifecycleFactory;

      // Methods should support generic types
      type CreateSingletonReturn = ReturnType<ILifecycleFactory["createSingleton"]>;
      type CreateTransientReturn = ReturnType<ILifecycleFactory["createTransient"]>;
      type CreateScopedReturn = ReturnType<ILifecycleFactory["createScoped"]>;

      // All should return lifecycle managers
      const singletonManager: CreateSingletonReturn = mockFactory.createSingleton<ITestService>();
      const transientManager: CreateTransientReturn = mockFactory.createTransient<ITestService>();
      const scopedManager: CreateScopedReturn = mockFactory.createScoped<ITestService>();

      // Should maintain type safety
      expect(typeof singletonManager.strategy).toBe("string");
      expect(typeof transientManager.strategy).toBe("string");
      expect(typeof scopedManager.strategy).toBe("string");
    });

    it("should accept optional configuration parameters", () => {
      const mockFactory = {} as ILifecycleFactory;

      // Should work with and without configuration
      type CreateSingletonWithConfig = (config?: ISingletonLifecycleConfig) => ILifecycleManager;
      type CreateTransientWithConfig = (config?: ITransientLifecycleConfig) => ILifecycleManager;
      type CreateScopedWithConfig = (config?: IScopedLifecycleConfig) => ILifecycleManager;

      const singletonMethod: CreateSingletonWithConfig = mockFactory.createSingleton;
      const transientMethod: CreateTransientWithConfig = mockFactory.createTransient;
      const scopedMethod: CreateScopedWithConfig = mockFactory.createScoped;

      expect(typeof singletonMethod).toBe("function");
      expect(typeof transientMethod).toBe("function");
      expect(typeof scopedMethod).toBe("function");
    });

    it("should support strategy-based manager creation", () => {
      const mockFactory = {} as ILifecycleFactory;

      // Generic factory method should accept strategy and optional config
      type GenericFactoryMethod = (strategy: LifecycleStrategy, config?: unknown) => ILifecycleManager;

      const genericMethod: GenericFactoryMethod = mockFactory.getLifecycleManager;

      expect(typeof genericMethod).toBe("function");
    });
  });

  describe("IScopeManager", () => {
    it("should define scope management interface", () => {
      type ScopeManagerMethods = keyof IScopeManager;

      const requiredMethods: ScopeManagerMethods[] = [
        "scopeId",
        "parent",
        "getInstance",
        "setInstance",
        "removeInstance",
        "hasInstance",
        "createChildScope",
        "clear",
        "dispose",
        "getStats",
      ];

      requiredMethods.forEach((method) => {
        expect(typeof method).toBe("string");
      });
    });

    it("should require readonly scopeId and optional parent", () => {
      const mockScopeManager = {} as IScopeManager;

      // Properties should exist and be of correct types
      type ScopeIdType = IScopeManager["scopeId"];
      type ParentType = IScopeManager["parent"];

      const scopeId: ScopeIdType = "test-scope-id";
      const parent: ParentType = undefined;

      expect(typeof scopeId).toBe("string");
      expect(parent).toBeUndefined();
    });

    it("should support generic instance management", () => {
      interface ITestService {
        getValue(): string;
      }

      const mockScopeManager = {} as IScopeManager;
      const token = "TestService" as DIToken<ITestService>;
      const instance: ITestService = { getValue: () => "test" };

      // Methods should maintain type safety
      type GetInstanceReturn = ReturnType<IScopeManager["getInstance"]>;
      type SetInstanceParam = Parameters<IScopeManager["setInstance"]>[1];

      const getInstance: GetInstanceReturn = instance;
      const setInstance: SetInstanceParam = instance;

      expect(getInstance.getValue()).toBe("test");
      expect(setInstance.getValue()).toBe("test");
    });

    it("should support hierarchical scope creation", () => {
      const mockScopeManager = {} as IScopeManager;

      // createChildScope should accept optional scopeId and return IScopeManager
      type CreateChildScopeMethod = (scopeId?: string) => IScopeManager;

      const createChildMethod: CreateChildScopeMethod = mockScopeManager.createChildScope;

      expect(typeof createChildMethod).toBe("function");
    });
  });

  describe("IScopeStats", () => {
    it("should define comprehensive scope statistics", () => {
      const stats: IScopeStats = {
        scopeId: "test-scope",
        instanceCount: 5,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        childScopesCount: 2,
        estimatedMemoryUsage: 2048,
      };

      expect(stats.scopeId).toBe("test-scope");
      expect(stats.instanceCount).toBe(5);
      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.lastAccessedAt).toBeInstanceOf(Date);
      expect(stats.childScopesCount).toBe(2);
      expect(stats.estimatedMemoryUsage).toBe(2048);
    });

    it("should require all properties", () => {
      const currentTime = new Date();

      const stats: IScopeStats = {
        scopeId: "scope",
        instanceCount: 0,
        createdAt: currentTime,
        lastAccessedAt: currentTime,
        childScopesCount: 0,
        estimatedMemoryUsage: 0,
      };

      // Verify all required properties exist
      expect(typeof stats.scopeId).toBe("string");
      expect(typeof stats.instanceCount).toBe("number");
      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.lastAccessedAt).toBeInstanceOf(Date);
      expect(typeof stats.childScopesCount).toBe("number");
      expect(typeof stats.estimatedMemoryUsage).toBe("number");
    });
  });

  describe("ILifecyclePerformanceMetrics", () => {
    it("should define aggregate performance metrics structure", () => {
      const metrics: ILifecyclePerformanceMetrics = {
        byStrategy: {
          singleton: {
            totalInstancesCreated: 10,
            cachedInstancesCount: 8,
            cacheHitRatio: 0.8,
            estimatedMemoryUsage: 4096,
            averageCreationTime: 1.2,
            peakCreationTime: 3.5,
          },
          transient: {
            totalInstancesCreated: 50,
            cachedInstancesCount: 0,
            cacheHitRatio: 0,
            estimatedMemoryUsage: 0,
            averageCreationTime: 0.8,
            peakCreationTime: 2.1,
          },
          scoped: {
            totalInstancesCreated: 20,
            cachedInstancesCount: 15,
            cacheHitRatio: 0.75,
            estimatedMemoryUsage: 2048,
            averageCreationTime: 1.0,
            peakCreationTime: 2.8,
          },
        },
        overall: {
          totalInstances: 80,
          totalMemoryUsage: 6144,
          averageCreationTime: 1.0,
          cacheEfficiency: 0.6875,
        },
      };

      expect(metrics.byStrategy.singleton.totalInstancesCreated).toBe(10);
      expect(metrics.byStrategy.transient.cacheHitRatio).toBe(0);
      expect(metrics.byStrategy.scoped.cachedInstancesCount).toBe(15);
      expect(metrics.overall.totalInstances).toBe(80);
      expect(metrics.overall.cacheEfficiency).toBe(0.6875);
    });

    it("should require statistics for all lifecycle strategies", () => {
      const emptyStats: ILifecycleStats = {
        totalInstancesCreated: 0,
        cachedInstancesCount: 0,
        cacheHitRatio: 0,
        estimatedMemoryUsage: 0,
        averageCreationTime: 0,
        peakCreationTime: 0,
      };

      const metrics: ILifecyclePerformanceMetrics = {
        byStrategy: {
          singleton: emptyStats,
          transient: emptyStats,
          scoped: emptyStats,
        },
        overall: {
          totalInstances: 0,
          totalMemoryUsage: 0,
          averageCreationTime: 0,
          cacheEfficiency: 0,
        },
      };

      // Should have all strategies covered
      expect(metrics.byStrategy.singleton).toBeDefined();
      expect(metrics.byStrategy.transient).toBeDefined();
      expect(metrics.byStrategy.scoped).toBeDefined();
      expect(metrics.overall).toBeDefined();
    });

    it("should maintain consistency between individual and overall metrics", () => {
      const singletonStats: ILifecycleStats = {
        totalInstancesCreated: 10,
        cachedInstancesCount: 8,
        cacheHitRatio: 0.8,
        estimatedMemoryUsage: 1000,
        averageCreationTime: 1.0,
        peakCreationTime: 2.0,
      };

      const transientStats: ILifecycleStats = {
        totalInstancesCreated: 20,
        cachedInstancesCount: 0,
        cacheHitRatio: 0,
        estimatedMemoryUsage: 0,
        averageCreationTime: 0.5,
        peakCreationTime: 1.0,
      };

      const metrics: ILifecyclePerformanceMetrics = {
        byStrategy: {
          singleton: singletonStats,
          transient: transientStats,
          scoped: {
            totalInstancesCreated: 0,
            cachedInstancesCount: 0,
            cacheHitRatio: 0,
            estimatedMemoryUsage: 0,
            averageCreationTime: 0,
            peakCreationTime: 0,
          },
        },
        overall: {
          totalInstances: 30, // 10 + 20 + 0
          totalMemoryUsage: 1000, // 1000 + 0 + 0
          averageCreationTime: 0.75, // Weighted average
          cacheEfficiency: 0.267, // 8 cached out of 30 total
        },
      };

      const totalByStrategy =
        metrics.byStrategy.singleton.totalInstancesCreated +
        metrics.byStrategy.transient.totalInstancesCreated +
        metrics.byStrategy.scoped.totalInstancesCreated;

      expect(totalByStrategy).toBe(metrics.overall.totalInstances);
    });
  });
});

describe("Type Relationships", () => {
  it("should maintain type safety between managers and factories", () => {
    interface IService {
      execute(): void;
    }

    const mockFactory = {} as ILifecycleFactory;

    // Factory methods should return appropriately typed managers
    const typedSingleton: ILifecycleManager<IService> = mockFactory.createSingleton<IService>();
    const typedTransient: ILifecycleManager<IService> = mockFactory.createTransient<IService>();
    const typedScoped: ILifecycleManager<IService> = mockFactory.createScoped<IService>();

    expect(typeof typedSingleton.strategy).toBe("string");
    expect(typeof typedTransient.strategy).toBe("string");
    expect(typeof typedScoped.strategy).toBe("string");
  });

  it("should support inheritance in lifecycle management", () => {
    interface IBaseService {
      getType(): string;
    }

    interface IExtendedService extends IBaseService {
      getValue(): string;
    }

    // Should be able to manage derived types
    const baseManager = {} as ILifecycleManager<IBaseService>;
    const extendedManager = {} as ILifecycleManager<IExtendedService>;

    // Extended manager should be assignable to base manager
    const managerAsBase: ILifecycleManager<IBaseService> = extendedManager;

    expect(typeof managerAsBase.strategy).toBe("string");
  });

  it("should maintain consistency between configuration and manager types", () => {
    // Configuration types should be usable with their corresponding managers
    const singletonConfig: ISingletonLifecycleConfig = { lazy: true };
    const transientConfig: ITransientLifecycleConfig = { enablePooling: true };
    const scopedConfig: IScopedLifecycleConfig = { isolationStrategy: "strict" };

    // Factory should accept these configurations
    const mockFactory = {} as ILifecycleFactory;

    const singletonManager = mockFactory.createSingleton(singletonConfig);
    const transientManager = mockFactory.createTransient(transientConfig);
    const scopedManager = mockFactory.createScoped(scopedConfig);

    expect(singletonManager.strategy).toBe("singleton");
    expect(transientManager.strategy).toBe("transient");
    expect(scopedManager.strategy).toBe("scoped");
  });

  it("should support scope hierarchy types", () => {
    const parentScope = {} as IScopeManager;
    const childScope = {} as IScopeManager;

    // Child scope should reference parent
    type ChildWithParent = IScopeManager & { parent: IScopeManager };
    const typedChild: ChildWithParent = {
      ...childScope,
      parent: parentScope,
    };

    expect(typedChild.parent).toBe(parentScope);
  });

  it("should maintain stats type consistency", () => {
    // Stats should be compatible between different contexts
    const lifecycleStats: ILifecycleStats = {
      totalInstancesCreated: 5,
      cachedInstancesCount: 3,
      cacheHitRatio: 0.6,
      estimatedMemoryUsage: 1024,
      averageCreationTime: 1.0,
      peakCreationTime: 2.5,
    };

    const scopeStats: IScopeStats = {
      scopeId: "test-scope",
      instanceCount: lifecycleStats.cachedInstancesCount,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      childScopesCount: 0,
      estimatedMemoryUsage: lifecycleStats.estimatedMemoryUsage,
    };

    // Should be able to correlate stats between lifecycle and scope
    expect(scopeStats.instanceCount).toBe(lifecycleStats.cachedInstancesCount);
    expect(scopeStats.estimatedMemoryUsage).toBe(lifecycleStats.estimatedMemoryUsage);
  });
});

describe("Type Constraints", () => {
  it("should enforce lifecycle strategy constraints", () => {
    const validStrategies: LifecycleStrategy[] = ["singleton", "transient", "scoped"];

    validStrategies.forEach((strategy) => {
      expect(["singleton", "transient", "scoped"]).toContain(strategy);
    });
  });

  it("should enforce numeric constraints in configurations", () => {
    const singletonConfig: ISingletonLifecycleConfig = {
      maxInstances: 100, // Must be number
    };

    const transientConfig: ITransientLifecycleConfig = {
      poolSize: 20, // Must be number
    };

    const scopedConfig: IScopedLifecycleConfig = {
      maxInstancesPerScope: 50, // Must be number
    };

    expect(typeof singletonConfig.maxInstances).toBe("number");
    expect(typeof transientConfig.poolSize).toBe("number");
    expect(typeof scopedConfig.maxInstancesPerScope).toBe("number");
  });

  it("should enforce return type constraints", () => {
    const mockManager = {} as ILifecycleManager<string>;
    const token = "StringService" as DIToken<string>;
    const factory = (): string => "test-string";

    // getInstance should return string type
    type GetInstanceReturn = ReturnType<typeof mockManager.getInstance>;
    const result: GetInstanceReturn = "typed-result";

    expect(typeof result).toBe("string");
  });

  it("should enforce boolean constraints in configurations", () => {
    const booleanOptions = {
      singletonLazy: true as ISingletonLifecycleConfig["lazy"],
      singletonThreadSafe: false as ISingletonLifecycleConfig["threadSafe"],
      transientTracking: true as ITransientLifecycleConfig["trackInstances"],
      transientPooling: false as ITransientLifecycleConfig["enablePooling"],
      scopedAutoDispose: true as IScopedLifecycleConfig["autoDispose"],
    };

    Object.values(booleanOptions).forEach((value) => {
      expect(typeof value).toBe("boolean");
    });
  });
});
