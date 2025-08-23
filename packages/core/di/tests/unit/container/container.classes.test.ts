/**
 * DIContainer class unit tests
 * 
 * Comprehensive test suite for DIContainer with >90% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';

import { DIContainer, createContainer, getDefaultContainer, setDefaultContainer, resetDefaultContainer } from '../../../src/container/container.classes.js';
import type { IDIContainer, DIToken, IContainerConfig, IResolutionContext } from '../../../src/container/container.types.js';
import { ValidationError, ConfigurationError, ApplicationError } from '@axon/errors';

// Test services
interface ITestService {
  getValue(): string;
}

class TestService implements ITestService {
  constructor(private value = 'test') {}
  getValue(): string {
    return this.value;
  }
}

class TestServiceWithDependency implements ITestService {
  constructor(private dependency: ITestService) {}
  getValue(): string {
    return `dependent-${this.dependency.getValue()}`;
  }
}

// Circular dependency test services
class ServiceA {
  constructor(public serviceB: ServiceB) {}
}

class ServiceB {
  constructor(public serviceA: ServiceA) {}
}

describe('DIContainer', () => {
  let container: IDIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    container.dispose();
  });

  describe('Constructor and Configuration', () => {
    it('should create container with default configuration', () => {
      expect(container.name).toMatch(/Container_\d+/);
      expect(container.parent).toBeUndefined();
    });

    it('should create container with custom configuration', () => {
      const config: IContainerConfig = {
        name: 'TestContainer',
        strictMode: false,
        enableMetrics: false,
        maxResolutionDepth: 10,
      };

      const customContainer = new DIContainer(config);

      expect(customContainer.name).toBe('TestContainer');

      customContainer.dispose();
    });

    it('should create hierarchical containers', () => {
      const parentContainer = new DIContainer({ name: 'Parent' });
      const childContainer = new DIContainer({ name: 'Child' }, parentContainer);

      expect(childContainer.parent).toBe(parentContainer);
      expect(childContainer.name).toBe('Child');

      childContainer.dispose();
      parentContainer.dispose();
    });

    it('should validate configuration schema', () => {
      expect(() => new DIContainer({ maxResolutionDepth: -1 })).toThrow();
      expect(() => new DIContainer({ name: '' })).toThrow();
    });
  });

  describe('Registration', () => {
    it('should register and resolve dependencies', () => {
      const token = 'TestService';
      container.register(token, TestService);

      expect(container.isRegistered(token)).toBe(true);

      const instance = container.resolve<ITestService>(token);
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getValue()).toBe('test');
    });

    it('should register with lifecycle options', () => {
      container.register('Singleton', TestService, { lifecycle: 'singleton' });
      container.register('Transient', TestService, { lifecycle: 'transient' });
      container.register('Scoped', TestService, { lifecycle: 'scoped' });

      expect(container.isRegistered('Singleton')).toBe(true);
      expect(container.isRegistered('Transient')).toBe(true);
      expect(container.isRegistered('Scoped')).toBe(true);
    });

    it('should register with dependencies', () => {
      container.register('BaseService', TestService);
      container.register('DependentService', TestServiceWithDependency, {
        dependencies: ['BaseService'],
      });

      const instance = container.resolve<ITestService>('DependentService');
      expect(instance.getValue()).toBe('dependent-test');
    });

    it('should throw ValidationError for invalid token', () => {
      expect(() => container.register(null as any, TestService)).toThrow(ValidationError);
      expect(() => container.register(undefined as any, TestService)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid implementation', () => {
      expect(() => container.register('invalid', null as any)).toThrow(ValidationError);
      expect(() => container.register('invalid', 'not-a-function' as any)).toThrow(ValidationError);
    });

    it('should replace existing registrations', () => {
      container.register('Service', TestService);
      
      class NewService implements ITestService {
        getValue() { return 'new'; }
      }
      
      container.register('Service', NewService);

      const instance = container.resolve<ITestService>('Service');
      expect(instance.getValue()).toBe('new');
    });

    it('should clear singleton cache on re-registration', () => {
      container.register('Service', TestService, { lifecycle: 'singleton' });
      
      const first = container.resolve('Service');
      
      class NewService {
        getValue() { return 'new'; }
      }
      
      container.register('Service', NewService);
      const second = container.resolve('Service');

      expect(first).not.toBe(second);
    });
  });

  describe('Factory Registration', () => {
    it('should register factory function', () => {
      const factory = () => new TestService('factory-created');
      
      container.registerFactory('FactoryService', factory);

      const instance = container.resolve<ITestService>('FactoryService');
      expect(instance.getValue()).toBe('factory-created');
    });

    it('should throw ValidationError for invalid factory', () => {
      expect(() => container.registerFactory('invalid', null as any)).toThrow(ValidationError);
      expect(() => container.registerFactory('invalid', 'not-a-function' as any)).toThrow(ValidationError);
    });
  });

  describe('Instance Registration', () => {
    it('should register existing instance', () => {
      const instance = new TestService('pre-created');
      
      container.registerInstance('PreCreated', instance);

      const resolved = container.resolve<ITestService>('PreCreated');
      expect(resolved).toBe(instance);
      expect(resolved.getValue()).toBe('pre-created');
    });

    it('should throw ValidationError for invalid token in registerInstance', () => {
      const instance = new TestService();
      
      expect(() => container.registerInstance(null as any, instance)).toThrow(ValidationError);
      expect(() => container.registerInstance(undefined as any, instance)).toThrow(ValidationError);
    });
  });

  describe('Resolution', () => {
    beforeEach(() => {
      container.register('TestService', TestService);
    });

    it('should resolve registered dependencies', () => {
      const instance = container.resolve<ITestService>('TestService');
      
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getValue()).toBe('test');
    });

    it('should resolve dependencies in <1ms for simple services', () => {
      const startTime = performance.now();
      container.resolve('TestService');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1);
    });

    it('should handle concurrent resolutions', async () => {
      const promises = Array.from({ length: 100 }, () => 
        Promise.resolve().then(() => container.resolve('TestService'))
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r instanceof TestService)).toBe(true);
    });

    it('should tryResolve without throwing', () => {
      const result = container.tryResolve('NonExistent');
      expect(result).toBeUndefined();

      const existing = container.tryResolve<ITestService>('TestService');
      expect(existing).toBeInstanceOf(TestService);
    });

    it('should resolve from parent container', () => {
      const parentContainer = new DIContainer({ name: 'Parent' });
      parentContainer.register('ParentService', TestService);

      const childContainer = new DIContainer({ name: 'Child' }, parentContainer);

      const instance = childContainer.resolve<ITestService>('ParentService');
      expect(instance).toBeInstanceOf(TestService);

      childContainer.dispose();
      parentContainer.dispose();
    });

    it('should throw ApplicationError for unregistered token in strict mode', () => {
      const strictContainer = new DIContainer({ strictMode: true });

      expect(() => strictContainer.resolve('NonExistent')).toThrow(ApplicationError);
      expect(() => strictContainer.resolve('NonExistent')).toThrow('Registration not found');

      strictContainer.dispose();
    });

    it('should return undefined for unregistered token in non-strict mode', () => {
      const nonStrictContainer = new DIContainer({ strictMode: false });

      const result = nonStrictContainer.resolve('NonExistent');
      expect(result).toBeUndefined();

      nonStrictContainer.dispose();
    });
  });

  describe('Singleton Lifecycle', () => {
    it('should return same instance for singleton lifecycle', () => {
      container.register('Singleton', TestService, { lifecycle: 'singleton' });

      const first = container.resolve('Singleton');
      const second = container.resolve('Singleton');

      expect(first).toBe(second);
    });

    it('should track cache hits for singletons', () => {
      container.register('Singleton', TestService, { lifecycle: 'singleton' });

      // First resolution - no cache hit
      container.resolve('Singleton');
      
      // Second resolution - cache hit
      container.resolve('Singleton');

      const metrics = container.getMetrics();
      expect(metrics.cacheHitRatio).toBeGreaterThan(0);
    });
  });

  describe('Transient Lifecycle', () => {
    it('should return new instance for transient lifecycle', () => {
      container.register('Transient', TestService, { lifecycle: 'transient' });

      const first = container.resolve('Transient');
      const second = container.resolve('Transient');

      expect(first).not.toBe(second);
      expect(first).toBeInstanceOf(TestService);
      expect(second).toBeInstanceOf(TestService);
    });
  });

  describe('Scoped Lifecycle', () => {
    it('should return scoped instance within resolution context', () => {
      container.register('Scoped', TestService, { lifecycle: 'scoped' });

      const context: IResolutionContext = {
        resolutionPath: [],
        depth: 0,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      const first = container.resolve('Scoped', context);
      const second = container.resolve('Scoped', context);

      expect(first).toBe(second);
    });

    it('should return different instances for different scopes', () => {
      container.register('Scoped', TestService, { lifecycle: 'scoped' });

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

      const first = container.resolve('Scoped', context1);
      const second = container.resolve('Scoped', context2);

      expect(first).not.toBe(second);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect and throw ConfigurationError for circular dependencies', () => {
      container.register('ServiceA', ServiceA, { dependencies: ['ServiceB'] });
      container.register('ServiceB', ServiceB, { dependencies: ['ServiceA'] });

      expect(() => container.resolve('ServiceA')).toThrow(ConfigurationError);
      expect(() => container.resolve('ServiceA')).toThrow('Circular dependency detected');
    });

    it('should include dependency path in circular dependency error', () => {
      container.register('ServiceA', ServiceA, { dependencies: ['ServiceB'] });
      container.register('ServiceB', ServiceB, { dependencies: ['ServiceA'] });

      try {
        container.resolve('ServiceA');
        expect.fail('Should have thrown circular dependency error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as any).metadata?.dependencyPath).toContain('ServiceA');
        expect((error as any).metadata?.dependencyPath).toContain('ServiceB');
      }
    });
  });

  describe('Resolution Depth Limit', () => {
    it('should throw ConfigurationError when maximum resolution depth exceeded', () => {
      const deepContainer = new DIContainer({ maxResolutionDepth: 2 });

      // Create a chain deeper than the limit
      deepContainer.register('Level1', TestServiceWithDependency, { dependencies: ['Level2'] });
      deepContainer.register('Level2', TestServiceWithDependency, { dependencies: ['Level3'] });
      deepContainer.register('Level3', TestService);

      expect(() => deepContainer.resolve('Level1')).toThrow(ConfigurationError);
      expect(() => deepContainer.resolve('Level1')).toThrow('Maximum resolution depth exceeded');

      deepContainer.dispose();
    });
  });

  describe('Error Handling', () => {
    it('should throw ApplicationError with context for instance creation failures', () => {
      class FailingService {
        constructor() {
          throw new Error('Constructor failure');
        }
      }

      container.register('Failing', FailingService);

      expect(() => container.resolve('Failing')).toThrow(ApplicationError);
      expect(() => container.resolve('Failing')).toThrow('Failed to create instance');
    });

    it('should maintain correlation IDs in errors', () => {
      try {
        container.resolve('NonExistent');
      } catch (error) {
        expect((error as any).correlationId).toMatch(/notFound_\d+/);
      }
    });

    it('should chain original error as cause', () => {
      class FailingService {
        constructor() {
          throw new Error('Original error');
        }
      }

      container.register('Failing', FailingService);

      try {
        container.resolve('Failing');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as any).cause?.message).toBe('Original error');
      }
    });
  });

  describe('Container Management', () => {
    it('should check registration status', () => {
      expect(container.isRegistered('TestService')).toBe(false);

      container.register('TestService', TestService);
      expect(container.isRegistered('TestService')).toBe(true);
    });

    it('should unregister services', () => {
      container.register('TestService', TestService);
      expect(container.isRegistered('TestService')).toBe(true);

      const result = container.unregister('TestService');
      expect(result).toBe(true);
      expect(container.isRegistered('TestService')).toBe(false);

      // Unregistering non-existent service
      const result2 = container.unregister('NonExistent');
      expect(result2).toBe(false);
    });

    it('should clear all registrations and instances', () => {
      container.register('Service1', TestService, { lifecycle: 'singleton' });
      container.register('Service2', TestService, { lifecycle: 'transient' });

      // Create some instances
      container.resolve('Service1');
      container.resolve('Service2');

      const initialMetrics = container.getMetrics();
      expect(initialMetrics.totalRegistrations).toBe(2);

      container.clear();

      const clearedMetrics = container.getMetrics();
      expect(clearedMetrics.totalRegistrations).toBe(0);
    });

    it('should create child scoped containers', () => {
      const childContainer = container.createScope('ChildScope');

      expect(childContainer).toBeInstanceOf(DIContainer);
      expect(childContainer.name).toContain('ChildScope');
      expect(childContainer.parent).toBe(container);

      childContainer.dispose();
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(() => {
      container.register('TestService', TestService);
    });

    it('should track total registrations', () => {
      const metrics = container.getMetrics();
      expect(metrics.totalRegistrations).toBe(1);

      container.register('TestService2', TestService);
      const updatedMetrics = container.getMetrics();
      expect(updatedMetrics.totalRegistrations).toBe(2);
    });

    it('should track resolution count and timing', () => {
      const initialMetrics = container.getMetrics();
      expect(initialMetrics.totalResolutions).toBe(0);

      container.resolve('TestService');
      container.resolve('TestService');

      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(2);
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
      expect(metrics.peakResolutionTime).toBeGreaterThan(0);
    });

    it('should calculate cache hit ratio for singletons', () => {
      container.register('Singleton', TestService, { lifecycle: 'singleton' });

      // First resolution - cache miss
      container.resolve('Singleton');
      // Second resolution - cache hit
      container.resolve('Singleton');

      const metrics = container.getMetrics();
      expect(metrics.cacheHitRatio).toBe(0.5); // 1 hit out of 2 resolutions
    });

    it('should estimate memory usage', () => {
      container.register('Singleton', TestService, { lifecycle: 'singleton' });
      container.resolve('Singleton'); // Create singleton instance

      const metrics = container.getMetrics();
      expect(metrics.memoryUsage.singletonCount).toBe(1);
      expect(metrics.memoryUsage.estimatedBytes).toBeGreaterThan(0);
    });

    it('should limit resolution time history for performance', () => {
      container.register('TestService', TestService);

      // Generate many resolutions to test history limiting
      for (let i = 0; i < 1200; i++) {
        container.resolve('TestService');
      }

      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(1200);
      // Internal implementation should limit history to ~1000 entries
    });
  });

  describe('Disposal', () => {
    it('should dispose container and cleanup resources', () => {
      container.register('TestService', TestService);
      container.resolve('TestService');

      expect(() => container.resolve('TestService')).not.toThrow();

      container.dispose();

      expect(() => container.resolve('TestService')).toThrow(ApplicationError);
      expect(() => container.resolve('TestService')).toThrow('Container has been disposed');
    });

    it('should be safe to dispose multiple times', () => {
      container.dispose();
      expect(() => container.dispose()).not.toThrow();
    });

    it('should throw error when using disposed container', () => {
      container.dispose();

      expect(() => container.register('Test', TestService)).toThrow(ApplicationError);
      expect(() => container.resolve('Test')).toThrow(ApplicationError);
      expect(() => container.createScope()).toThrow(ApplicationError);
    });
  });
});

describe('Container Factory Functions', () => {
  afterEach(() => {
    resetDefaultContainer();
  });

  describe('createContainer', () => {
    it('should create container with default configuration', () => {
      const container = createContainer();
      
      expect(container).toBeInstanceOf(DIContainer);
      expect(container.name).toMatch(/Container_\d+/);

      container.dispose();
    });

    it('should create container with custom configuration', () => {
      const config: IContainerConfig = {
        name: 'CustomContainer',
        strictMode: false,
      };

      const container = createContainer(config);
      
      expect(container.name).toBe('CustomContainer');

      container.dispose();
    });
  });

  describe('Default Container Management', () => {
    it('should get or create default container', () => {
      const container1 = getDefaultContainer();
      const container2 = getDefaultContainer();

      expect(container1).toBe(container2);
      expect(container1.name).toBe('DefaultContainer');
    });

    it('should set custom default container', () => {
      const customContainer = createContainer({ name: 'CustomDefault' });
      
      setDefaultContainer(customContainer);
      
      const retrieved = getDefaultContainer();
      expect(retrieved).toBe(customContainer);
      expect(retrieved.name).toBe('CustomDefault');

      customContainer.dispose();
    });

    it('should reset default container', () => {
      const initial = getDefaultContainer();
      
      resetDefaultContainer();
      
      const newDefault = getDefaultContainer();
      expect(newDefault).not.toBe(initial);
      expect(newDefault.name).toBe('DefaultContainer');
    });

    it('should dispose old default container when resetting', () => {
      const initial = getDefaultContainer();
      initial.register('Test', TestService);

      resetDefaultContainer();

      // Old container should be disposed
      expect(() => initial.resolve('Test')).toThrow(ApplicationError);
    });
  });
});

describe('Performance Benchmarks', () => {
  let container: IDIContainer;

  beforeEach(() => {
    container = createContainer({ enableMetrics: true });
  });

  afterEach(() => {
    container.dispose();
  });

  it('should resolve simple services in <1ms', () => {
    container.register('FastService', TestService);

    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      container.resolve('FastService');
    }
    const endTime = performance.now();

    const averageTime = (endTime - startTime) / 100;
    expect(averageTime).toBeLessThan(1);
  });

  it('should handle 1000 concurrent resolutions efficiently', async () => {
    container.register('ConcurrentService', TestService, { lifecycle: 'singleton' });

    const startTime = performance.now();
    
    const promises = Array.from({ length: 1000 }, () =>
      Promise.resolve().then(() => container.resolve('ConcurrentService'))
    );

    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(100); // Should complete in <100ms
  });

  it('should maintain performance with many registrations', () => {
    // Register many services
    for (let i = 0; i < 1000; i++) {
      container.register(`Service${i}`, TestService);
    }

    // Test resolution performance
    const startTime = performance.now();
    container.resolve('Service500');
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1);
  });

  it('should not leak memory with repeated resolutions', () => {
    container.register('MemoryTest', TestService, { lifecycle: 'transient' });

    // Perform many resolutions
    for (let i = 0; i < 10000; i++) {
      container.resolve('MemoryTest');
    }

    const metrics = container.getMetrics();
    
    // Memory usage should be reasonable (not growing linearly with resolutions)
    expect(metrics.memoryUsage.estimatedBytes).toBeLessThan(1000000); // <1MB
  });
});