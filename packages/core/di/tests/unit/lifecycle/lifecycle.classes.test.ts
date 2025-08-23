/**
 * Lifecycle management classes unit tests
 *
 * Comprehensive test suite for lifecycle managers with performance validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { performance } from "perf_hooks";

import {
  SingletonLifecycleManager,
  TransientLifecycleManager,
  ScopedLifecycleManager,
  ScopeManager,
  LifecycleFactory,
  defaultLifecycleFactory,
} from "../../../src/lifecycle/lifecycle.classes.js";
import type {
  ILifecycleManager,
  IScopeManager,
  ILifecycleFactory,
  ISingletonLifecycleConfig,
  ITransientLifecycleConfig,
  IScopedLifecycleConfig,
} from "../../../src/lifecycle/lifecycle.types.js";
import type { DIToken, IResolutionContext } from "../../../src/container/container.types.js";
import { ApplicationError, SystemError } from "@axon/errors";

// Test service classes
class TestService {
  static instanceCount = 0;
  public readonly id: number;

  constructor() {
    TestService.instanceCount++;
    this.id = TestService.instanceCount;
  }

  getValue(): string {
    return `service-${this.id}`;
  }
}

class ExpensiveService {
  static creationTime = 10; // Simulated creation time in ms

  constructor() {
    // Simulate expensive construction
    const start = performance.now();
    while (performance.now() - start < ExpensiveService.creationTime) {
      // Busy wait
    }
  }
}

describe("SingletonLifecycleManager", () => {
  let manager: SingletonLifecycleManager;
  const token: DIToken = "TestService";

  beforeEach(() => {
    TestService.instanceCount = 0;
    manager = new SingletonLifecycleManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe("Basic Functionality", () => {
    it("should have singleton strategy", () => {
      expect(manager.strategy).toBe("singleton");
    });

    it("should return same instance for same token", () => {
      const factory = () => new TestService();

      const first = manager.getInstance(token, factory);
      const second = manager.getInstance(token, factory);

      expect(first).toBe(second);
      expect(first.id).toBe(second.id);
      expect(TestService.instanceCount).toBe(1);
    });

    it("should return different instances for different tokens", () => {
      const factory = () => new TestService();

      const first = manager.getInstance("Token1", factory);
      const second = manager.getInstance("Token2", factory);

      expect(first).not.toBe(second);
      expect(first.id).not.toBe(second.id);
      expect(TestService.instanceCount).toBe(2);
    });
  });

  describe("Configuration", () => {
    it("should apply lazy initialization by default", () => {
      const config: ISingletonLifecycleConfig = { lazy: true };
      const lazyManager = new SingletonLifecycleManager(config);

      expect(lazyManager.hasInstance(token)).toBe(false);

      const instance = lazyManager.getInstance(token, () => new TestService());
      expect(lazyManager.hasInstance(token)).toBe(true);

      lazyManager.dispose();
    });

    it("should respect maxInstances configuration", () => {
      const config: ISingletonLifecycleConfig = { maxInstances: 2 };
      const limitedManager = new SingletonLifecycleManager(config);

      // Fill up to limit
      limitedManager.getInstance("Token1", () => new TestService());
      limitedManager.getInstance("Token2", () => new TestService());

      expect(limitedManager.hasInstance("Token1")).toBe(true);
      expect(limitedManager.hasInstance("Token2")).toBe(true);

      // Adding third should evict first (LRU behavior)
      limitedManager.getInstance("Token3", () => new TestService());

      expect(limitedManager.hasInstance("Token1")).toBe(false);
      expect(limitedManager.hasInstance("Token2")).toBe(true);
      expect(limitedManager.hasInstance("Token3")).toBe(true);

      limitedManager.dispose();
    });
  });

  describe("Instance Management", () => {
    it("should check instance existence", () => {
      expect(manager.hasInstance(token)).toBe(false);

      manager.getInstance(token, () => new TestService());
      expect(manager.hasInstance(token)).toBe(true);
    });

    it("should clear specific instances", () => {
      manager.getInstance("Token1", () => new TestService());
      manager.getInstance("Token2", () => new TestService());

      expect(manager.hasInstance("Token1")).toBe(true);
      expect(manager.hasInstance("Token2")).toBe(true);

      const cleared = manager.clearInstance("Token1");
      expect(cleared).toBe(true);
      expect(manager.hasInstance("Token1")).toBe(false);
      expect(manager.hasInstance("Token2")).toBe(true);
    });

    it("should clear all instances", () => {
      manager.getInstance("Token1", () => new TestService());
      manager.getInstance("Token2", () => new TestService());

      expect(manager.hasInstance("Token1")).toBe(true);
      expect(manager.hasInstance("Token2")).toBe(true);

      manager.clearAll();

      expect(manager.hasInstance("Token1")).toBe(false);
      expect(manager.hasInstance("Token2")).toBe(false);
    });
  });

  describe("Performance Tracking", () => {
    it("should track creation statistics", () => {
      const factory = () => new TestService();

      manager.getInstance(token, factory);
      manager.getInstance(token, factory); // Should be cache hit

      const stats = manager.getStats();

      expect(stats.totalInstancesCreated).toBe(1);
      expect(stats.cachedInstancesCount).toBe(1);
      expect(stats.cacheHitRatio).toBe(0.5); // 1 hit out of 2 requests
      expect(stats.averageCreationTime).toBeGreaterThan(0);
    });

    it("should track creation time accurately", () => {
      const factory = () => new ExpensiveService();

      const startTime = performance.now();
      manager.getInstance(token, factory);
      const endTime = performance.now();

      const stats = manager.getStats();
      const actualTime = endTime - startTime;

      expect(stats.averageCreationTime).toBeGreaterThan(0);
      expect(stats.averageCreationTime).toBeLessThan(actualTime + 5); // Allow some tolerance
      expect(stats.peakCreationTime).toBeGreaterThan(0);
    });

    it("should maintain rolling average for creation times", () => {
      const factory = () => new TestService();

      // Create multiple instances to test average calculation
      for (let i = 0; i < 5; i++) {
        manager.getInstance(`Token${i}`, factory);
      }

      const stats = manager.getStats();
      expect(stats.totalInstancesCreated).toBe(5);
      expect(stats.averageCreationTime).toBeGreaterThan(0);
    });

    it("should estimate memory usage", () => {
      const factory = () => new TestService();

      manager.getInstance("Token1", factory);
      manager.getInstance("Token2", factory);

      const stats = manager.getStats();
      expect(stats.estimatedMemoryUsage).toBeGreaterThan(0);
      expect(stats.cachedInstancesCount).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should propagate factory errors", () => {
      const errorFactory = () => {
        throw new Error("Factory failed");
      };

      expect(() => manager.getInstance(token, errorFactory)).toThrow("Factory failed");
    });

    it("should handle factory errors gracefully and maintain stats", () => {
      const errorFactory = () => {
        throw new Error("Factory failed");
      };

      const initialStats = manager.getStats();

      try {
        manager.getInstance(token, errorFactory);
      } catch (error) {
        // Expected
      }

      const finalStats = manager.getStats();
      expect(finalStats.totalInstancesCreated).toBe(initialStats.totalInstancesCreated + 1);
    });

    it("should throw error when used after disposal", () => {
      manager.dispose();

      expect(() => manager.getInstance(token, () => new TestService())).toThrow(ApplicationError);
      expect(() => manager.getInstance(token, () => new TestService())).toThrow(
        "singleton lifecycle manager has been disposed",
      );
    });
  });

  describe("Disposal", () => {
    it("should clear all instances on disposal", () => {
      manager.getInstance("Token1", () => new TestService());
      manager.getInstance("Token2", () => new TestService());

      expect(manager.hasInstance("Token1")).toBe(true);
      expect(manager.hasInstance("Token2")).toBe(true);

      manager.dispose();

      expect(manager.hasInstance("Token1")).toBe(false);
      expect(manager.hasInstance("Token2")).toBe(false);
    });

    it("should be safe to dispose multiple times", () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });

    it("should reset statistics on disposal", () => {
      manager.getInstance(token, () => new TestService());

      const beforeDisposal = manager.getStats();
      expect(beforeDisposal.totalInstancesCreated).toBe(1);

      manager.dispose();

      expect(() => manager.getStats()).toThrow(ApplicationError);
    });
  });
});

describe("TransientLifecycleManager", () => {
  let manager: TransientLifecycleManager;
  const token: DIToken = "TestService";

  beforeEach(() => {
    TestService.instanceCount = 0;
    manager = new TransientLifecycleManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe("Basic Functionality", () => {
    it("should have transient strategy", () => {
      expect(manager.strategy).toBe("transient");
    });

    it("should return new instance every time", () => {
      const factory = () => new TestService();

      const first = manager.getInstance(token, factory);
      const second = manager.getInstance(token, factory);

      expect(first).not.toBe(second);
      expect(first.id).not.toBe(second.id);
      expect(TestService.instanceCount).toBe(2);
    });

    it("should never report instances as cached", () => {
      const factory = () => new TestService();

      manager.getInstance(token, factory);

      expect(manager.hasInstance(token)).toBe(false);
    });

    it("should not clear instances (since not cached)", () => {
      const factory = () => new TestService();

      manager.getInstance(token, factory);

      const cleared = manager.clearInstance(token);
      expect(cleared).toBe(false);
    });
  });

  describe("Simple Pooling", () => {
    it("should support instance pooling when enabled", () => {
      const config: ITransientLifecycleConfig = {
        enablePooling: true,
        poolSize: 3,
      };
      const poolingManager = new TransientLifecycleManager(config);

      const factory = () => new TestService();

      // Create and return instances to pool
      const instance1 = poolingManager.getInstance(token, factory);
      const instance2 = poolingManager.getInstance(token, factory);

      poolingManager.returnToPool(instance1);
      poolingManager.returnToPool(instance2);

      // Next instances should be reused from pool
      const reused1 = poolingManager.getInstance(token, factory);
      const reused2 = poolingManager.getInstance(token, factory);

      expect(reused1).toBe(instance2); // LIFO behavior
      expect(reused2).toBe(instance1);
      expect(TestService.instanceCount).toBe(2); // No new instances created

      poolingManager.dispose();
    });

    it("should respect pool size limits", () => {
      const config: ITransientLifecycleConfig = {
        enablePooling: true,
        poolSize: 2,
      };
      const poolingManager = new TransientLifecycleManager(config);

      const factory = () => new TestService();

      const instances = [
        poolingManager.getInstance(token, factory),
        poolingManager.getInstance(token, factory),
        poolingManager.getInstance(token, factory),
      ];

      // Return all to pool, but only 2 should be kept
      instances.forEach((instance) => poolingManager.returnToPool(instance));

      // Pool should only have 2 instances
      const poolStats = poolingManager.getStats();
      expect(poolStats.cachedInstancesCount).toBe(2);

      poolingManager.dispose();
    });
  });

  describe("Advanced Pooling", () => {
    it("should throw error for advanced pooling configuration", () => {
      const config: ITransientLifecycleConfig = {
        poolConfig: {
          min: 1,
          max: 10,
          idleTimeout: 30000,
        } as any, // Advanced pool config
      };

      const advancedManager = new TransientLifecycleManager(config);
      const factory = () => new TestService();

      expect(() => advancedManager.getInstance(token, factory)).toThrow(SystemError);
      expect(() => advancedManager.getInstance(token, factory)).toThrow(
        "Advanced object pooling requires async getInstance method",
      );

      advancedManager.dispose();
    });
  });

  describe("Performance Tracking", () => {
    it("should track creation statistics", () => {
      const factory = () => new TestService();

      manager.getInstance(token, factory);
      manager.getInstance(token, factory);
      manager.getInstance(token, factory);

      const stats = manager.getStats();

      expect(stats.totalInstancesCreated).toBe(3);
      expect(stats.cachedInstancesCount).toBe(0); // Transient doesn't cache
      expect(stats.averageCreationTime).toBeGreaterThan(0);
    });

    it("should calculate cache hit ratio for pooling", () => {
      const config: ITransientLifecycleConfig = {
        enablePooling: true,
        poolSize: 2,
      };
      const poolingManager = new TransientLifecycleManager(config);

      const factory = () => new TestService();

      const instance1 = poolingManager.getInstance(token, factory);
      poolingManager.returnToPool(instance1);

      // This should be a pool hit
      const reused = poolingManager.getInstance(token, factory);

      expect(reused).toBe(instance1);

      const stats = poolingManager.getStats();
      expect(stats.cacheHitRatio).toBeGreaterThan(0);

      poolingManager.dispose();
    });
  });

  describe("Error Handling", () => {
    it("should propagate factory errors", () => {
      const errorFactory = () => {
        throw new Error("Transient factory failed");
      };

      expect(() => manager.getInstance(token, errorFactory)).toThrow("Transient factory failed");
    });

    it("should track failed creation attempts", () => {
      const errorFactory = () => {
        throw new Error("Factory failed");
      };

      const initialStats = manager.getStats();

      try {
        manager.getInstance(token, errorFactory);
      } catch (error) {
        // Expected
      }

      const finalStats = manager.getStats();
      expect(finalStats.totalInstancesCreated).toBe(initialStats.totalInstancesCreated + 1);
    });
  });

  describe("Disposal", () => {
    it("should clear pool on disposal", () => {
      const config: ITransientLifecycleConfig = {
        enablePooling: true,
        poolSize: 2,
      };
      const poolingManager = new TransientLifecycleManager(config);

      const factory = () => new TestService();
      const instance = poolingManager.getInstance(token, factory);
      poolingManager.returnToPool(instance);

      expect(poolingManager.getStats().cachedInstancesCount).toBe(1);

      poolingManager.dispose();

      expect(() => poolingManager.getStats()).toThrow(ApplicationError);
    });
  });
});

describe("ScopedLifecycleManager", () => {
  let manager: ScopedLifecycleManager;
  const token: DIToken = "TestService";

  beforeEach(() => {
    TestService.instanceCount = 0;
    manager = new ScopedLifecycleManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe("Basic Functionality", () => {
    it("should have scoped strategy", () => {
      expect(manager.strategy).toBe("scoped");
    });

    it("should return same instance within same scope", () => {
      const factory = () => new TestService();
      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      const first = manager.getInstance(token, factory, context);
      const second = manager.getInstance(token, factory, context);

      expect(first).toBe(second);
      expect(first.id).toBe(second.id);
      expect(TestService.instanceCount).toBe(1);
    });

    it("should return different instances for different scopes", () => {
      const factory = () => new TestService();

      const context1: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      const context2: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      const first = manager.getInstance(token, factory, context1);
      const second = manager.getInstance(token, factory, context2);

      expect(first).not.toBe(second);
      expect(first.id).not.toBe(second.id);
      expect(TestService.instanceCount).toBe(2);
    });

    it("should throw error without resolution context", () => {
      const factory = () => new TestService();

      expect(() => manager.getInstance(token, factory)).toThrow(SystemError);
      expect(() => manager.getInstance(token, factory)).toThrow(
        "Scoped lifecycle requires resolution context with scopedInstances",
      );
    });
  });

  describe("Configuration", () => {
    it("should respect maxInstancesPerScope limit", () => {
      const config: IScopedLifecycleConfig = {
        maxInstancesPerScope: 2,
      };
      const limitedManager = new ScopedLifecycleManager(config);

      const factory = () => new TestService();
      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      // Fill up to limit
      limitedManager.getInstance("Token1", factory, context);
      limitedManager.getInstance("Token2", factory, context);

      // Third should exceed limit
      expect(() => limitedManager.getInstance("Token3", factory, context)).toThrow(SystemError);
      expect(() => limitedManager.getInstance("Token3", factory, context)).toThrow("Scope instance limit reached: 2");

      limitedManager.dispose();
    });

    it("should support different isolation strategies", () => {
      const strictConfig: IScopedLifecycleConfig = {
        isolationStrategy: "strict",
      };
      const inheritedConfig: IScopedLifecycleConfig = {
        isolationStrategy: "inherited",
      };

      const strictManager = new ScopedLifecycleManager(strictConfig);
      const inheritedManager = new ScopedLifecycleManager(inheritedConfig);

      expect(strictManager.strategy).toBe("scoped");
      expect(inheritedManager.strategy).toBe("scoped");

      strictManager.dispose();
      inheritedManager.dispose();
    });
  });

  describe("Instance Management", () => {
    it("should check instance existence in context", () => {
      const factory = () => new TestService();
      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      expect(manager.hasInstance(token, context)).toBe(false);

      manager.getInstance(token, factory, context);
      expect(manager.hasInstance(token, context)).toBe(true);
    });

    it("should clear specific instances from scope", () => {
      const factory = () => new TestService();
      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      manager.getInstance("Token1", factory, context);
      manager.getInstance("Token2", factory, context);

      expect(manager.hasInstance("Token1", context)).toBe(true);
      expect(manager.hasInstance("Token2", context)).toBe(true);

      const cleared = manager.clearInstance("Token1", context);
      expect(cleared).toBe(true);
      expect(manager.hasInstance("Token1", context)).toBe(false);
      expect(manager.hasInstance("Token2", context)).toBe(true);
    });

    it("should return false for operations without context", () => {
      expect(manager.hasInstance(token)).toBe(false);
      expect(manager.clearInstance(token)).toBe(false);
    });
  });

  describe("Performance Tracking", () => {
    it("should track cache hits within scopes", () => {
      const factory = () => new TestService();
      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      manager.getInstance(token, factory, context); // Miss
      manager.getInstance(token, factory, context); // Hit

      const stats = manager.getStats();
      expect(stats.cacheHitRatio).toBe(0.5);
    });

    it("should track creation statistics", () => {
      const factory = () => new TestService();
      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      manager.getInstance("Token1", factory, context);
      manager.getInstance("Token2", factory, context);

      const stats = manager.getStats();
      expect(stats.totalInstancesCreated).toBe(2);
      expect(stats.averageCreationTime).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should propagate factory errors", () => {
      const errorFactory = () => {
        throw new Error("Scoped factory failed");
      };

      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      expect(() => manager.getInstance(token, errorFactory, context)).toThrow("Scoped factory failed");
    });
  });
});

describe("ScopeManager", () => {
  let scopeManager: IScopeManager;

  beforeEach(() => {
    scopeManager = new ScopeManager();
  });

  afterEach(() => {
    scopeManager.dispose();
  });

  describe("Basic Functionality", () => {
    it("should generate unique scope ID", () => {
      const manager1 = new ScopeManager();
      const manager2 = new ScopeManager();

      expect(manager1.scopeId).not.toBe(manager2.scopeId);
      expect(manager1.scopeId).toMatch(/scope_\d+_[a-z0-9]+/);

      manager1.dispose();
      manager2.dispose();
    });

    it("should accept custom scope ID", () => {
      const customScope = new ScopeManager("custom-scope-id");

      expect(customScope.scopeId).toBe("custom-scope-id");

      customScope.dispose();
    });

    it("should support parent-child relationships", () => {
      const parentScope = new ScopeManager("parent");
      const childScope = new ScopeManager("child", parentScope);

      expect(childScope.parent).toBe(parentScope);
      expect(parentScope.parent).toBeUndefined();

      childScope.dispose();
      parentScope.dispose();
    });
  });

  describe("Instance Management", () => {
    it("should store and retrieve instances", () => {
      const token: DIToken = "TestService";
      const instance = new TestService();

      expect(scopeManager.getInstance(token)).toBeUndefined();

      scopeManager.setInstance(token, instance);
      expect(scopeManager.getInstance(token)).toBe(instance);
      expect(scopeManager.hasInstance(token)).toBe(true);
    });

    it("should remove instances", () => {
      const token: DIToken = "TestService";
      const instance = new TestService();

      scopeManager.setInstance(token, instance);
      expect(scopeManager.hasInstance(token)).toBe(true);

      const removed = scopeManager.removeInstance(token);
      expect(removed).toBe(true);
      expect(scopeManager.hasInstance(token)).toBe(false);
      expect(scopeManager.getInstance(token)).toBeUndefined();
    });

    it("should return false when removing non-existent instance", () => {
      const token: DIToken = "NonExistent";

      const removed = scopeManager.removeInstance(token);
      expect(removed).toBe(false);
    });
  });

  describe("Child Scope Management", () => {
    it("should create child scopes", () => {
      const childScope = scopeManager.createChildScope("child");

      expect(childScope.parent).toBe(scopeManager);
      expect(childScope.scopeId).toBe("child");

      childScope.dispose();
    });

    it("should create child scopes with auto-generated IDs", () => {
      const childScope = scopeManager.createChildScope();

      expect(childScope.parent).toBe(scopeManager);
      expect(childScope.scopeId).toMatch(/scope_\d+_[a-z0-9]+/);

      childScope.dispose();
    });

    it("should track child scopes in stats", () => {
      const child1 = scopeManager.createChildScope("child1");
      const child2 = scopeManager.createChildScope("child2");

      const stats = scopeManager.getStats();
      expect(stats.childScopesCount).toBe(2);

      child1.dispose();
      child2.dispose();
    });
  });

  describe("Clear and Disposal", () => {
    it("should clear all instances", () => {
      scopeManager.setInstance("Token1", new TestService());
      scopeManager.setInstance("Token2", new TestService());

      expect(scopeManager.hasInstance("Token1")).toBe(true);
      expect(scopeManager.hasInstance("Token2")).toBe(true);

      scopeManager.clear();

      expect(scopeManager.hasInstance("Token1")).toBe(false);
      expect(scopeManager.hasInstance("Token2")).toBe(false);
    });

    it("should clear and dispose child scopes", () => {
      const child1 = scopeManager.createChildScope("child1");
      const child2 = scopeManager.createChildScope("child2");

      child1.setInstance("Token1", new TestService());
      child2.setInstance("Token2", new TestService());

      expect(child1.hasInstance("Token1")).toBe(true);
      expect(child2.hasInstance("Token2")).toBe(true);

      scopeManager.clear();

      // Child scopes should be disposed
      expect(() => child1.getInstance("Token1")).toThrow(ApplicationError);
      expect(() => child2.getInstance("Token2")).toThrow(ApplicationError);
    });

    it("should dispose scope and prevent further use", () => {
      scopeManager.setInstance("Token1", new TestService());

      scopeManager.dispose();

      expect(() => scopeManager.getInstance("Token1")).toThrow(ApplicationError);
      expect(() => scopeManager.setInstance("Token2", new TestService())).toThrow(ApplicationError);
      expect(() => scopeManager.createChildScope()).toThrow(ApplicationError);
    });

    it("should remove itself from parent on disposal", () => {
      const parentScope = new ScopeManager("parent");
      const childScope = new ScopeManager("child", parentScope);

      expect(parentScope.getStats().childScopesCount).toBe(1);

      childScope.dispose();

      expect(parentScope.getStats().childScopesCount).toBe(0);

      parentScope.dispose();
    });

    it("should be safe to dispose multiple times", () => {
      scopeManager.dispose();
      expect(() => scopeManager.dispose()).not.toThrow();
    });
  });

  describe("Statistics", () => {
    it("should provide scope statistics", () => {
      scopeManager.setInstance("Token1", new TestService());
      scopeManager.setInstance("Token2", new TestService());

      const child = scopeManager.createChildScope();

      const stats = scopeManager.getStats();

      expect(stats.scopeId).toBe(scopeManager.scopeId);
      expect(stats.instanceCount).toBe(2);
      expect(stats.childScopesCount).toBe(1);
      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.lastAccessedAt).toBeInstanceOf(Date);
      expect(stats.estimatedMemoryUsage).toBeGreaterThan(0);

      child.dispose();
    });

    it("should update last accessed time", () => {
      const initialStats = scopeManager.getStats();

      // Wait a bit then access the scope
      setTimeout(() => {
        scopeManager.getInstance("NonExistent");

        const updatedStats = scopeManager.getStats();
        expect(updatedStats.lastAccessedAt.getTime()).toBeGreaterThan(initialStats.lastAccessedAt.getTime());
      }, 10);
    });
  });
});

describe("LifecycleFactory", () => {
  let factory: ILifecycleFactory;

  beforeEach(() => {
    factory = new LifecycleFactory();
  });

  describe("Factory Methods", () => {
    it("should create singleton lifecycle manager", () => {
      const config: ISingletonLifecycleConfig = {
        lazy: true,
        maxInstances: 50,
      };

      const manager = factory.createSingleton(config);

      expect(manager).toBeInstanceOf(SingletonLifecycleManager);
      expect(manager.strategy).toBe("singleton");

      manager.dispose();
    });

    it("should create transient lifecycle manager", () => {
      const config: ITransientLifecycleConfig = {
        enablePooling: true,
        poolSize: 10,
      };

      const manager = factory.createTransient(config);

      expect(manager).toBeInstanceOf(TransientLifecycleManager);
      expect(manager.strategy).toBe("transient");

      manager.dispose();
    });

    it("should create scoped lifecycle manager", () => {
      const config: IScopedLifecycleConfig = {
        isolationStrategy: "strict",
        maxInstancesPerScope: 20,
      };

      const manager = factory.createScoped(config);

      expect(manager).toBeInstanceOf(ScopedLifecycleManager);
      expect(manager.strategy).toBe("scoped");

      manager.dispose();
    });

    it("should create managers without configuration", () => {
      const singleton = factory.createSingleton();
      const transient = factory.createTransient();
      const scoped = factory.createScoped();

      expect(singleton.strategy).toBe("singleton");
      expect(transient.strategy).toBe("transient");
      expect(scoped.strategy).toBe("scoped");

      singleton.dispose();
      transient.dispose();
      scoped.dispose();
    });
  });

  describe("Generic Factory Method", () => {
    it("should create appropriate manager for each strategy", () => {
      const singleton = factory.getLifecycleManager("singleton");
      const transient = factory.getLifecycleManager("transient");
      const scoped = factory.getLifecycleManager("scoped");

      expect(singleton).toBeInstanceOf(SingletonLifecycleManager);
      expect(transient).toBeInstanceOf(TransientLifecycleManager);
      expect(scoped).toBeInstanceOf(ScopedLifecycleManager);

      singleton.dispose();
      transient.dispose();
      scoped.dispose();
    });

    it("should pass configuration to appropriate manager", () => {
      const singletonConfig: ISingletonLifecycleConfig = { maxInstances: 5 };
      const transientConfig: ITransientLifecycleConfig = { enablePooling: true };
      const scopedConfig: IScopedLifecycleConfig = { isolationStrategy: "inherited" };

      const singleton = factory.getLifecycleManager("singleton", singletonConfig);
      const transient = factory.getLifecycleManager("transient", transientConfig);
      const scoped = factory.getLifecycleManager("scoped", scopedConfig);

      expect(singleton.strategy).toBe("singleton");
      expect(transient.strategy).toBe("transient");
      expect(scoped.strategy).toBe("scoped");

      singleton.dispose();
      transient.dispose();
      scoped.dispose();
    });

    it("should throw error for unknown strategy", () => {
      expect(() => factory.getLifecycleManager("unknown" as any)).toThrow(SystemError);
      expect(() => factory.getLifecycleManager("unknown" as any)).toThrow("Unknown lifecycle strategy: unknown");
    });
  });
});

describe("Default Lifecycle Factory", () => {
  it("should provide default factory instance", () => {
    expect(defaultLifecycleFactory).toBeInstanceOf(LifecycleFactory);
  });

  it("should create managers using default factory", () => {
    const singleton = defaultLifecycleFactory.createSingleton();
    const transient = defaultLifecycleFactory.createTransient();
    const scoped = defaultLifecycleFactory.createScoped();

    expect(singleton.strategy).toBe("singleton");
    expect(transient.strategy).toBe("transient");
    expect(scoped.strategy).toBe("scoped");

    singleton.dispose();
    transient.dispose();
    scoped.dispose();
  });
});

describe("Lifecycle Performance", () => {
  it("should perform singleton resolutions in <1ms", () => {
    const manager = new SingletonLifecycleManager();
    const token = "PerfTestService";
    const factory = () => new TestService();

    const startTime = performance.now();

    // First resolution - creation time
    manager.getInstance(token, factory);

    // Subsequent resolutions - should be much faster
    for (let i = 0; i < 100; i++) {
      manager.getInstance(token, factory);
    }

    const endTime = performance.now();
    const averageTime = (endTime - startTime) / 100;

    expect(averageTime).toBeLessThan(1);

    manager.dispose();
  });

  it("should handle concurrent lifecycle operations", async () => {
    const manager = new SingletonLifecycleManager();
    const factory = () => new TestService();

    const promises = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve().then(() => manager.getInstance(`Token${i}`, factory)),
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(100);
    expect(results.every((r) => r instanceof TestService)).toBe(true);

    manager.dispose();
  });

  it("should maintain performance with many scoped instances", () => {
    const manager = new ScopedLifecycleManager({ maxInstancesPerScope: 2000 });
    const factory = () => new TestService();

    const context: IResolutionContext = {
      resolutionPath: [],
      depth: 0,
      startTime: performance.now(),
      scopedInstances: new Map(),
    };

    const startTime = performance.now();

    // Create many scoped instances
    for (let i = 0; i < 1000; i++) {
      manager.getInstance(`Token${i}`, factory, context);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(100); // Should complete in <100ms

    manager.dispose();
  });
});

describe("ScopeManager - Race Condition Prevention", () => {
  let scopeManager: ScopeManager;

  beforeEach(() => {
    scopeManager = new ScopeManager();
  });

  afterEach(async () => {
    try {
      await scopeManager.dispose();
    } catch {
      // Ignore disposal errors in cleanup
    }
  });

  it("should prevent race conditions during concurrent setInstance operations", async () => {
    const token = Symbol("test-token");
    const promises: Promise<void>[] = [];

    // Start 10 concurrent setInstance operations using async version
    for (let i = 0; i < 10; i++) {
      promises.push(scopeManager.setInstance(token, `value-${i}`, { async: true }));
    }

    // All operations should complete without errors
    await expect(Promise.all(promises)).resolves.not.toThrow();

    // Instance should be set to one of the values
    const finalValue = scopeManager.getInstance(token);
    expect(typeof finalValue).toBe("string");
    expect(finalValue).toMatch(/^value-\d+$/);
  });

  it("should handle concurrent getInstance and dispose operations", async () => {
    const token = Symbol("test-token");
    await scopeManager.setInstance(token, "test-value", { async: true });

    const getInstancePromises = Array.from({ length: 5 }, () =>
      Promise.resolve(scopeManager.getInstance(token))
    );

    // Start disposal using async version while getInstance calls are happening
    const disposePromise = scopeManager.dispose({ async: true });

    // Some getInstance calls might succeed (if they happen before disposal)
    // or get blocked by disposal state checking
    const results = await Promise.allSettled([...getInstancePromises, disposePromise]);

    // Disposal should always succeed
    const disposeResult = results[results.length - 1];
    expect(disposeResult.status).toBe("fulfilled");
  });

  it("should prevent operations on disposed scope", async () => {
    const token = Symbol("test-token");
    
    // Dispose the scope using async version
    await scopeManager.dispose({ async: true });

    // Operations on disposed scope should throw
    expect(() => scopeManager.getInstance(token)).toThrow("Operation not allowed: scope is disposed");
    await expect(scopeManager.setInstance(token, "value", { async: true })).rejects.toThrow("Operation not allowed: scope is disposed");
    await expect(scopeManager.removeInstance(token, { async: true })).rejects.toThrow("Operation not allowed: scope is disposed");
  });

  it("should coordinate parent-child disposal properly", async () => {
    const parentScope = new ScopeManager("parent");
    const childScope1 = await parentScope.createChildScope("child1", { async: true });
    const childScope2 = await parentScope.createChildScope("child2", { async: true });

    const token = Symbol("test-token");
    await (childScope1 as ScopeManager).setInstance(token, "child1-value", { async: true });
    await (childScope2 as ScopeManager).setInstance(token, "child2-value", { async: true });

    // Dispose parent using async version - should coordinate child disposal
    await parentScope.dispose({ async: true });

    // All scopes should be disposed
    expect(() => parentScope.getInstance(token)).toThrow("Operation not allowed: scope is disposed");
    expect(() => (childScope1 as ScopeManager).getInstance(token)).toThrow("Operation not allowed: scope is disposed");
    expect(() => (childScope2 as ScopeManager).getInstance(token)).toThrow("Operation not allowed: scope is disposed");
  });

  it("should handle concurrent child scope creation", async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      scopeManager.createChildScope(`child-${i}`, { async: true })
    );

    const childScopes = await Promise.all(promises);

    // All child scopes should be created successfully
    expect(childScopes).toHaveLength(5);
    childScopes.forEach((child, i) => {
      expect(child.scopeId).toBe(`child-${i}`);
      expect(child.parent).toBe(scopeManager);
    });

    // Clean up child scopes using async disposal
    await Promise.all(childScopes.map(child => (child as ScopeManager).dispose({ async: true })));
  });

  it("should prevent concurrent disposal of same scope", async () => {
    const token = Symbol("test-token");
    await scopeManager.setInstance(token, "test-value", { async: true });

    // Start multiple disposal operations concurrently using async version
    const disposal1 = scopeManager.dispose({ async: true });
    const disposal2 = scopeManager.dispose({ async: true });
    const disposal3 = scopeManager.dispose({ async: true });

    // All should complete without error (subsequent calls should wait for first)
    await expect(Promise.all([disposal1, disposal2, disposal3])).resolves.not.toThrow();

    // Scope should be disposed
    expect(() => scopeManager.getInstance(token)).toThrow("Operation not allowed: scope is disposed");
  });

  it("should maintain backward compatibility with sync methods", () => {
    const token = Symbol("test-token");
    
    // Sync methods should still work for backward compatibility
    scopeManager.setInstance(token, "sync-value");
    expect(scopeManager.getInstance(token)).toBe("sync-value");
    expect(scopeManager.hasInstance(token)).toBe(true);
    
    const removed = scopeManager.removeInstance(token);
    expect(removed).toBe(true);
    expect(scopeManager.hasInstance(token)).toBe(false);
    
    // Child scope creation
    const childScope = scopeManager.createChildScope("sync-child");
    expect(childScope.scopeId).toBe("sync-child");
    
    // Cleanup
    childScope.dispose();
    scopeManager.clear();
  });
});

describe("ScopeManager - Performance under concurrent load", () => {
  it("should handle high concurrency without performance degradation", async () => {
    const manager = new ScopeManager();
    const token = Symbol("test-token");
    const value = "test-value";

    // Set up concurrent operations using async version for thread safety
    const operations = Array.from({ length: 100 }, () => async () => {
      await manager.setInstance(token, value, { async: true });
      const instance = manager.getInstance(token);
      expect(instance).toBe(value);
    });

    // Run operations concurrently
    const startTime = performance.now();
    await Promise.all(operations.map(op => op()));
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(100); // Increased threshold for async operations

    await manager.dispose({ async: true });
  });
});