/**
 * Testing utilities classes unit tests
 * 
 * Comprehensive test suite for mock containers and testing helpers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  MockDIContainer,
  DependencyMockBuilder,
  TestContainerBuilder,
  TestFixture,
  DITestAssertions,
  createTestContainer,
  createMockContainer,
  createTestFixture,
  createDIAssertions,
  mockFactory,
  mockInstance,
} from '../../../src/testing/testing.classes.js';
import type {
  IMockContainerOptions,
  IMockProviderConfig,
  ITestContainer,
  ITestContainerBuilder,
  IDITestAssertions,
  ITestFixtureConfig,
  IContainerCallHistory,
} from '../../../src/testing/testing.types.js';
import type { DIToken, IContainerRegistrationOptions } from '../../../src/container/container.types.js';
import { ValidationError, ApplicationError } from '@axon/errors';

// Test service classes
interface ITestService {
  getValue(): string;
}

class TestService implements ITestService {
  constructor(private value = 'test') {}
  getValue(): string {
    return this.value;
  }
}

class DependentService implements ITestService {
  constructor(private dependency: ITestService) {}
  getValue(): string {
    return `dependent-${this.dependency.getValue()}`;
  }
}

interface IDatabaseService {
  query(sql: string): Promise<any[]>;
}

class MockDatabaseService implements IDatabaseService {
  private queries: string[] = [];

  async query(sql: string): Promise<any[]> {
    this.queries.push(sql);
    return [{ id: 1, name: 'mock-result' }];
  }

  getQueriesExecuted(): string[] {
    return [...this.queries];
  }
}

describe('MockDIContainer', () => {
  let mockContainer: MockDIContainer;

  beforeEach(() => {
    mockContainer = new MockDIContainer();
  });

  afterEach(() => {
    mockContainer.dispose();
  });

  describe('Basic Container Functionality', () => {
    it('should extend DIContainer with mock capabilities', () => {
      expect(mockContainer).toBeInstanceOf(MockDIContainer);
      expect(mockContainer.name).toContain('MockContainer');
      expect(typeof mockContainer.register).toBe('function');
      expect(typeof mockContainer.resolve).toBe('function');
    });

    it('should work as regular container for basic operations', () => {
      mockContainer.register('TestService', TestService);
      
      expect(mockContainer.isRegistered('TestService')).toBe(true);
      
      const instance = mockContainer.resolve<ITestService>('TestService');
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getValue()).toBe('test');
    });

    it('should use non-strict mode by default', () => {
      // Should not throw for unregistered services in non-strict mode
      const result = mockContainer.resolve('NonExistent');
      expect(result).toBeUndefined();
    });

    it('should support custom configuration', () => {
      const options: IMockContainerOptions = {
        name: 'CustomMockContainer',
        strictMode: true,
        enableCallTracking: false,
        defaultLifecycle: 'singleton',
      };

      const customMockContainer = new MockDIContainer(options);
      
      expect(customMockContainer.name).toBe('CustomMockContainer');
      
      // Should throw in strict mode
      expect(() => customMockContainer.resolve('NonExistent')).toThrow();

      customMockContainer.dispose();
    });
  });

  describe('Call Tracking', () => {
    it('should track register calls', () => {
      mockContainer.register('Service1', TestService);
      mockContainer.register('Service2', TestService, { lifecycle: 'singleton' });

      const history = mockContainer.getCallHistory();
      
      expect(history.register).toHaveLength(2);
      expect(history.register[0].method).toBe('register');
      expect(history.register[0].args[0]).toBe('Service1');
      expect(history.register[1].args[2]).toEqual({ lifecycle: 'singleton' });
      expect(history.all).toHaveLength(2);
    });

    it('should track resolve calls', () => {
      mockContainer.register('TestService', TestService);
      
      const instance1 = mockContainer.resolve('TestService');
      const instance2 = mockContainer.resolve('TestService');

      const history = mockContainer.getCallHistory();
      
      expect(history.resolve).toHaveLength(2);
      expect(history.resolve[0].method).toBe('resolve');
      expect(history.resolve[0].args[0]).toBe('TestService');
      expect(history.resolve[0].returnValue).toBe(instance1);
      expect(history.resolve[1].returnValue).toBe(instance2);
    });

    it('should track tryResolve calls', () => {
      mockContainer.register('TestService', TestService);
      
      mockContainer.tryResolve('TestService');
      mockContainer.tryResolve('NonExistent');

      const history = mockContainer.getCallHistory();
      
      expect(history.tryResolve).toHaveLength(2);
      expect(history.tryResolve[0].returnValue).toBeInstanceOf(TestService);
      expect(history.tryResolve[1].returnValue).toBeUndefined();
    });

    it('should track isRegistered calls', () => {
      mockContainer.register('TestService', TestService);
      
      mockContainer.isRegistered('TestService');
      mockContainer.isRegistered('NonExistent');

      const history = mockContainer.getCallHistory();
      
      expect(history.isRegistered).toHaveLength(2);
      expect(history.isRegistered[0].returnValue).toBe(true);
      expect(history.isRegistered[1].returnValue).toBe(false);
    });

    it('should track method errors', () => {
      // Force an error by registering invalid implementation
      try {
        mockContainer.register('Invalid', null as any);
      } catch (error) {
        // Expected to fail
      }

      const history = mockContainer.getCallHistory();
      
      expect(history.register).toHaveLength(1);
      expect(history.register[0].error).toBeInstanceOf(ValidationError);
    });

    it('should include timestamps in call history', () => {
      const startTime = Date.now();
      
      mockContainer.register('TestService', TestService);
      
      const endTime = Date.now();
      const history = mockContainer.getCallHistory();
      
      expect(history.register[0].timestamp).toBeInstanceOf(Date);
      expect(history.register[0].timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(history.register[0].timestamp.getTime()).toBeLessThanOrEqual(endTime);
    });

    it('should maintain chronological order in all calls', () => {
      mockContainer.register('Service1', TestService);
      mockContainer.register('Service2', TestService);
      mockContainer.resolve('Service1');
      mockContainer.isRegistered('Service2');

      const history = mockContainer.getCallHistory();
      
      expect(history.all).toHaveLength(4);
      expect(history.all[0].method).toBe('register');
      expect(history.all[1].method).toBe('register');
      expect(history.all[2].method).toBe('resolve');
      expect(history.all[3].method).toBe('isRegistered');

      // Check chronological order
      for (let i = 1; i < history.all.length; i++) {
        expect(history.all[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history.all[i - 1].timestamp.getTime()
        );
      }
    });

    it('should allow disabling call tracking', () => {
      const noTrackingContainer = new MockDIContainer({
        enableCallTracking: false,
      });

      noTrackingContainer.register('TestService', TestService);
      noTrackingContainer.resolve('TestService');

      const history = noTrackingContainer.getCallHistory();
      
      expect(history.all).toHaveLength(0);
      expect(history.register).toHaveLength(0);
      expect(history.resolve).toHaveLength(0);

      noTrackingContainer.dispose();
    });
  });

  describe('Call History Management', () => {
    it('should clear call history', () => {
      mockContainer.register('TestService', TestService);
      mockContainer.resolve('TestService');

      expect(mockContainer.getCallHistory().all).toHaveLength(2);

      mockContainer.clearCallHistory();

      const history = mockContainer.getCallHistory();
      expect(history.all).toHaveLength(0);
      expect(history.register).toHaveLength(0);
      expect(history.resolve).toHaveLength(0);
    });

    it('should return defensive copies of call history', () => {
      mockContainer.register('TestService', TestService);
      
      const history1 = mockContainer.getCallHistory();
      const history2 = mockContainer.getCallHistory();

      expect(history1).not.toBe(history2);
      expect(history1.all).not.toBe(history2.all);
      expect(history1.register).not.toBe(history2.register);
    });
  });

  describe('Mock Management', () => {
    it('should track mocked dependencies', () => {
      const mockImplementation = new TestService('mocked');
      
      mockContainer.mockDependency('MockedService', mockImplementation);

      expect(mockContainer.isMocked('MockedService')).toBe(true);
      expect(mockContainer.getMockTokens()).toContain('MockedService');

      const instance = mockContainer.resolve<ITestService>('MockedService');
      expect(instance).toBe(mockImplementation);
    });

    it('should support factory function mocks', () => {
      const factory = () => new TestService('factory-mocked');
      
      mockContainer.mockDependency('FactoryMocked', factory);

      expect(mockContainer.isMocked('FactoryMocked')).toBe(true);

      const instance = mockContainer.resolve<ITestService>('FactoryMocked');
      expect(instance.getValue()).toBe('factory-mocked');
    });

    it('should support mock with registration options', () => {
      const mockImplementation = new TestService('singleton-mock');
      
      mockContainer.mockDependency('SingletonMock', mockImplementation, {
        lifecycle: 'singleton',
      });

      const instance1 = mockContainer.resolve('SingletonMock');
      const instance2 = mockContainer.resolve('SingletonMock');

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(mockImplementation);
    });

    it('should reset all mocks', () => {
      mockContainer.mockDependency('Mock1', new TestService('mock1'));
      mockContainer.mockDependency('Mock2', new TestService('mock2'));
      mockContainer.register('Regular', TestService);

      expect(mockContainer.getMockTokens()).toHaveLength(2);
      expect(mockContainer.isRegistered('Mock1')).toBe(true);
      expect(mockContainer.isRegistered('Regular')).toBe(true);

      mockContainer.resetMocks();

      expect(mockContainer.getMockTokens()).toHaveLength(0);
      expect(mockContainer.isRegistered('Mock1')).toBe(false);
      expect(mockContainer.isRegistered('Mock2')).toBe(false);
      expect(mockContainer.isRegistered('Regular')).toBe(true); // Regular registrations preserved
    });

    it('should clear call history when resetting mocks', () => {
      mockContainer.mockDependency('MockedService', new TestService('mocked'));
      mockContainer.resolve('MockedService');

      expect(mockContainer.getCallHistory().all).toHaveLength(2); // mock + resolve

      mockContainer.resetMocks();

      expect(mockContainer.getCallHistory().all).toHaveLength(0);
    });
  });

  describe('Verification Methods', () => {
    beforeEach(() => {
      mockContainer.register('TestService', TestService);
    });

    it('should verify resolution count', () => {
      mockContainer.resolve('TestService');
      mockContainer.resolve('TestService');

      expect(() => mockContainer.verifyResolved('TestService', 2)).not.toThrow();
      expect(() => mockContainer.verifyResolved('TestService', 1)).toThrow(ValidationError);
      expect(() => mockContainer.verifyResolved('TestService', 3)).toThrow(ValidationError);
    });

    it('should verify resolution count with detailed error message', () => {
      mockContainer.resolve('TestService');

      try {
        mockContainer.verifyResolved('TestService', 3);
        expect.fail('Should have thrown verification error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Expected TestService to be resolved 3 times');
        expect((error as ValidationError).message).toContain('but was resolved 1 times');
      }
    });

    it('should verify registration status', () => {
      expect(() => mockContainer.verifyRegistered('TestService')).not.toThrow();
      expect(() => mockContainer.verifyRegistered('NonExistent')).toThrow(ValidationError);
    });

    it('should provide detailed error for registration verification', () => {
      try {
        mockContainer.verifyRegistered('NonExistent');
        expect.fail('Should have thrown verification error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Expected NonExistent to be registered');
      }
    });

    it('should handle verification of unresolved services', () => {
      // Service is registered but never resolved
      expect(() => mockContainer.verifyResolved('TestService', 0)).not.toThrow();
      expect(() => mockContainer.verifyResolved('TestService', 1)).toThrow(ValidationError);
    });
  });

  describe('Error Scenarios', () => {
    it('should track errors in call history', () => {
      // Attempt to register invalid service
      try {
        mockContainer.register(null as any, TestService);
      } catch (error) {
        // Expected
      }

      const history = mockContainer.getCallHistory();
      expect(history.register).toHaveLength(1);
      expect(history.register[0].error).toBeInstanceOf(ValidationError);
      expect(history.register[0].returnValue).toBeUndefined();
    });

    it('should handle resolve errors gracefully', () => {
      // Register a service that throws during construction
      class FailingService {
        constructor() {
          throw new Error('Construction failed');
        }
      }

      mockContainer.register('FailingService', FailingService);

      try {
        mockContainer.resolve('FailingService');
      } catch (error) {
        // Expected
      }

      const history = mockContainer.getCallHistory();
      const resolveCall = history.resolve.find(call => call.args[0] === 'FailingService');
      
      expect(resolveCall).toBeDefined();
      expect(resolveCall!.error).toBeInstanceOf(ApplicationError);
    });
  });
});

describe('DependencyMockBuilder', () => {
  let mockContainer: MockDIContainer;
  let builder: DependencyMockBuilder<ITestService>;

  beforeEach(() => {
    mockContainer = new MockDIContainer();
    builder = new DependencyMockBuilder('TestService', mockContainer);
  });

  afterEach(() => {
    mockContainer.dispose();
  });

  describe('Fluent Interface', () => {
    it('should provide fluent interface for building mocks', () => {
      const mockImplementation = new TestService('fluent');

      const result = builder
        .withImplementation(mockImplementation)
        .withLifecycle('singleton')
        .withSpy(true)
        .withOptions({ metadata: { test: true } });

      expect(result).toBe(builder);
    });

    it('should build mock with implementation', () => {
      const mockImplementation = new TestService('builder-mock');

      builder
        .withImplementation(mockImplementation)
        .build();

      expect(mockContainer.isMocked('TestService')).toBe(true);
      
      const instance = mockContainer.resolve<ITestService>('TestService');
      expect(instance).toBe(mockImplementation);
    });

    it('should build mock with factory function', () => {
      const factory = () => new TestService('factory-builder');

      builder
        .withImplementation(factory)
        .withLifecycle('transient')
        .build();

      const instance1 = mockContainer.resolve<ITestService>('TestService');
      const instance2 = mockContainer.resolve<ITestService>('TestService');

      expect(instance1.getValue()).toBe('factory-builder');
      expect(instance2.getValue()).toBe('factory-builder');
      expect(instance1).not.toBe(instance2); // Transient lifecycle
    });

    it('should apply lifecycle configuration', () => {
      const mockImplementation = new TestService('singleton-builder');

      builder
        .withImplementation(mockImplementation)
        .withLifecycle('singleton')
        .build();

      const instance1 = mockContainer.resolve('TestService');
      const instance2 = mockContainer.resolve('TestService');

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(mockImplementation);
    });

    it('should apply additional options', () => {
      const mockImplementation = new TestService('options-builder');
      const options: IContainerRegistrationOptions = {
        metadata: { builderTest: true },
        dependencies: [],
      };

      builder
        .withImplementation(mockImplementation)
        .withOptions(options)
        .build();

      expect(mockContainer.isMocked('TestService')).toBe(true);
      
      const instance = mockContainer.resolve('TestService');
      expect(instance).toBe(mockImplementation);
    });

    it('should warn about unimplemented spy functionality', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      builder
        .withImplementation(new TestService('spy-test'))
        .withSpy(true)
        .build();

      expect(consoleSpy).toHaveBeenCalledWith('Spy functionality not yet implemented');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when building without implementation', () => {
      expect(() => builder.build()).toThrow(ValidationError);
      expect(() => builder.build()).toThrow('Mock implementation required for token: TestService');
    });

    it('should provide detailed error information', () => {
      try {
        builder.build();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).metadata?.token).toBe('TestService');
      }
    });

    it('should handle empty implementation gracefully', () => {
      expect(() => builder.withImplementation(null as any).build()).toThrow();
      expect(() => builder.withImplementation(undefined as any).build()).toThrow();
    });
  });
});

describe('TestContainerBuilder', () => {
  let builder: ITestContainerBuilder;

  beforeEach(() => {
    builder = new TestContainerBuilder();
  });

  describe('Container Configuration', () => {
    it('should build test container with default options', () => {
      const container = builder.build();

      expect(container).toBeInstanceOf(MockDIContainer);
      expect(container.name).toContain('Container_');
      expect(typeof container.getCallHistory).toBe('function');

      container.dispose();
    });

    it('should configure container name', () => {
      const container = builder
        .withName('CustomTestContainer')
        .build();

      expect(container.name).toBe('CustomTestContainer');

      container.dispose();
    });

    it('should configure call tracking', () => {
      const container = builder
        .withCallTracking(false)
        .build();

      // Register and resolve to test tracking
      container.register('TestService', TestService);
      container.resolve('TestService');

      const history = container.getCallHistory();
      expect(history.all).toHaveLength(0); // Tracking disabled

      container.dispose();
    });

    it('should configure strict mode', () => {
      const strictContainer = builder
        .withStrictMode(true)
        .build();

      expect(() => strictContainer.resolve('NonExistent')).toThrow();

      strictContainer.dispose();
    });

    it('should chain configuration methods', () => {
      const result = builder
        .withName('ChainedContainer')
        .withCallTracking(true)
        .withStrictMode(false);

      expect(result).toBe(builder);
    });
  });

  describe('Mock Dependencies', () => {
    it('should support single mock dependency', () => {
      const mockDep = new TestService('single-mock');

      const mockBuilder = builder.mockDependency<ITestService>('SingleMock');
      expect(mockBuilder).toBeInstanceOf(DependencyMockBuilder);
      expect(typeof mockBuilder.withImplementation).toBe('function');
    });

    it('should support multiple mock dependencies', () => {
      const mockConfigs: IMockProviderConfig[] = [
        {
          token: 'Service1',
          implementation: new TestService('mock1'),
          options: { lifecycle: 'singleton' },
        },
        {
          token: 'Service2',
          implementation: () => new TestService('mock2'),
          options: { lifecycle: 'transient' },
          spy: true,
        },
      ];

      const container = builder
        .mockDependencies(mockConfigs)
        .build();

      expect(container.isMocked('Service1')).toBe(true);
      expect(container.isMocked('Service2')).toBe(true);

      const service1a = container.resolve<ITestService>('Service1');
      const service1b = container.resolve<ITestService>('Service1');
      expect(service1a).toBe(service1b); // Singleton

      const service2a = container.resolve<ITestService>('Service2');
      const service2b = container.resolve<ITestService>('Service2');
      expect(service2a).not.toBe(service2b); // Transient

      container.dispose();
    });

    it('should accumulate multiple mockDependencies calls', () => {
      const config1: IMockProviderConfig[] = [
        { token: 'Service1', implementation: new TestService('mock1') },
      ];
      
      const config2: IMockProviderConfig[] = [
        { token: 'Service2', implementation: new TestService('mock2') },
      ];

      const container = builder
        .mockDependencies(config1)
        .mockDependencies(config2)
        .build();

      expect(container.isMocked('Service1')).toBe(true);
      expect(container.isMocked('Service2')).toBe(true);
      expect(container.getMockTokens()).toHaveLength(2);

      container.dispose();
    });
  });
});

describe('TestFixture', () => {
  let fixture: TestFixture;

  afterEach(() => {
    if (fixture) {
      fixture.teardown();
    }
  });

  describe('Basic Functionality', () => {
    it('should create fixture with minimal configuration', () => {
      const config: ITestFixtureConfig = {
        container: { name: 'FixtureContainer' },
      };

      fixture = new TestFixture(config);

      const container = fixture.getContainer();
      expect(container.name).toBe('FixtureContainer');
    });

    it('should create fixture with mock providers', () => {
      const config: ITestFixtureConfig = {
        providers: [
          {
            token: 'DatabaseService',
            implementation: new MockDatabaseService(),
          },
          {
            token: 'TestService',
            implementation: () => new TestService('fixture'),
          },
        ],
      };

      fixture = new TestFixture(config);
      const container = fixture.getContainer();

      expect(container.isMocked('DatabaseService')).toBe(true);
      expect(container.isMocked('TestService')).toBe(true);

      const dbService = container.resolve<IDatabaseService>('DatabaseService');
      expect(dbService).toBeInstanceOf(MockDatabaseService);

      const testService = container.resolve<ITestService>('TestService');
      expect(testService.getValue()).toBe('fixture');
    });
  });

  describe('Setup and Teardown', () => {
    it('should execute setup function', async () => {
      let setupExecuted = false;

      const config: ITestFixtureConfig = {
        setup: async (container) => {
          setupExecuted = true;
          container.register('SetupService', TestService);
        },
      };

      fixture = new TestFixture(config);
      await fixture.setup();

      expect(setupExecuted).toBe(true);
      
      const container = fixture.getContainer();
      expect(container.isRegistered('SetupService')).toBe(true);
    });

    it('should execute teardown function', async () => {
      let teardownExecuted = false;

      const config: ITestFixtureConfig = {
        teardown: async (container) => {
          teardownExecuted = true;
          // Custom teardown logic
        },
      };

      fixture = new TestFixture(config);
      await fixture.teardown();

      expect(teardownExecuted).toBe(true);
    });

    it('should reset mocks during teardown', async () => {
      const config: ITestFixtureConfig = {
        providers: [
          { token: 'MockService', implementation: new TestService('mock') },
        ],
      };

      fixture = new TestFixture(config);
      const container = fixture.getContainer();

      expect(container.isMocked('MockService')).toBe(true);

      await fixture.teardown();

      expect(container.getMockTokens()).toHaveLength(0);
    });

    it('should handle setup errors gracefully', async () => {
      const config: ITestFixtureConfig = {
        setup: async () => {
          throw new Error('Setup failed');
        },
      };

      fixture = new TestFixture(config);

      await expect(fixture.setup()).rejects.toThrow('Setup failed');
    });

    it('should handle teardown errors gracefully', async () => {
      const config: ITestFixtureConfig = {
        teardown: async () => {
          throw new Error('Teardown failed');
        },
      };

      fixture = new TestFixture(config);

      await expect(fixture.teardown()).rejects.toThrow('Teardown failed');
    });
  });

  describe('Complex Scenarios', () => {
    it('should support complete test workflow', async () => {
      let setupData: any = null;

      const config: ITestFixtureConfig = {
        container: {
          name: 'WorkflowFixture',
          strictMode: false,
        },
        providers: [
          {
            token: 'DatabaseService',
            implementation: new MockDatabaseService(),
            options: { lifecycle: 'singleton' },
          },
        ],
        setup: async (container) => {
          // Setup test data
          const db = container.resolve<MockDatabaseService>('DatabaseService');
          await db.query('CREATE TABLE test_data');
          setupData = 'initialized';
        },
        teardown: async (container) => {
          // Cleanup
          const db = container.resolve<MockDatabaseService>('DatabaseService');
          expect(db.getQueriesExecuted()).toContain('CREATE TABLE test_data');
          setupData = 'cleaned';
        },
      };

      fixture = new TestFixture(config);

      // Setup phase
      await fixture.setup();
      expect(setupData).toBe('initialized');

      // Test phase
      const container = fixture.getContainer();
      const db = container.resolve<MockDatabaseService>('DatabaseService');
      await db.query('SELECT * FROM test_data');

      // Teardown phase
      await fixture.teardown();
      expect(setupData).toBe('cleaned');
    });
  });
});

describe('DITestAssertions', () => {
  let assertions: IDITestAssertions;
  let mockContainer: MockDIContainer;

  beforeEach(() => {
    assertions = new DITestAssertions();
    mockContainer = new MockDIContainer();
  });

  afterEach(() => {
    mockContainer.dispose();
  });

  describe('Registration Assertions', () => {
    it('should assert service registration', () => {
      mockContainer.register('TestService', TestService);

      expect(() => assertions.toHaveRegistration(mockContainer, 'TestService')).not.toThrow();
    });

    it('should fail assertion for unregistered service', () => {
      expect(() => assertions.toHaveRegistration(mockContainer, 'NonExistent')).toThrow(ValidationError);
      expect(() => assertions.toHaveRegistration(mockContainer, 'NonExistent')).toThrow('Expected container to have registration for token: NonExistent');
    });
  });

  describe('Resolution Assertions', () => {
    beforeEach(() => {
      mockContainer.register('TestService', TestService);
    });

    it('should assert successful resolution', () => {
      expect(() => assertions.toResolve(mockContainer, 'TestService')).not.toThrow();
    });

    it('should fail assertion for failed resolution', () => {
      expect(() => assertions.toResolve(mockContainer, 'NonExistent')).toThrow(ValidationError);
      expect(() => assertions.toResolve(mockContainer, 'NonExistent')).toThrow('Expected container to resolve token: NonExistent');
    });

    it('should include original error in assertion failure', () => {
      try {
        assertions.toResolve(mockContainer, 'NonExistent');
        expect.fail('Should have thrown assertion error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('but got error:');
      }
    });
  });

  describe('Error Assertions', () => {
    it('should assert that resolution throws error', () => {
      expect(() => assertions.toThrowOnResolve(mockContainer, 'NonExistent')).not.toThrow();
    });

    it('should fail assertion when resolution succeeds', () => {
      mockContainer.register('TestService', TestService);

      expect(() => assertions.toThrowOnResolve(mockContainer, 'TestService')).toThrow(ValidationError);
      expect(() => assertions.toThrowOnResolve(mockContainer, 'TestService')).toThrow('Expected container to throw when resolving token: TestService');
    });

    it('should assert specific error type', () => {
      // Create a service that throws specific error
      class FailingService {
        constructor() {
          throw new ApplicationError('Service construction failed', 'SERVICE_FAILED', {});
        }
      }

      mockContainer.register('FailingService', FailingService);

      expect(() => assertions.toThrowOnResolve(mockContainer, 'FailingService', ApplicationError)).not.toThrow();
    });

    it('should fail assertion for wrong error type', () => {
      mockContainer.register('FailingService', class {
        constructor() {
          throw new Error('Generic error');
        }
      });

      expect(() => assertions.toThrowOnResolve(mockContainer, 'FailingService', ValidationError)).toThrow(ValidationError);
      expect(() => assertions.toThrowOnResolve(mockContainer, 'FailingService', ValidationError)).toThrow('Expected container to throw ValidationError');
    });
  });

  describe('Lifecycle Assertions', () => {
    it('should assert lifecycle configuration', () => {
      mockContainer.register('SingletonService', TestService, { lifecycle: 'singleton' });

      // Currently just verifies registration exists
      expect(() => assertions.toHaveLifecycle(mockContainer, 'SingletonService', 'singleton')).not.toThrow();
    });

    it('should fail lifecycle assertion for unregistered service', () => {
      expect(() => assertions.toHaveLifecycle(mockContainer, 'NonExistent', 'singleton')).toThrow(ValidationError);
    });
  });

  describe('Circular Dependency Assertions', () => {
    it('should indicate circular dependency detection is not implemented', () => {
      expect(() => assertions.toDetectCircularDependency(mockContainer, ['ServiceA', 'ServiceB'])).toThrow(ApplicationError);
      expect(() => assertions.toDetectCircularDependency(mockContainer, ['ServiceA', 'ServiceB'])).toThrow('Circular dependency detection testing not yet implemented');
    });
  });
});

describe('Factory Functions', () => {
  describe('createTestContainer', () => {
    it('should create new test container builder', () => {
      const builder = createTestContainer();

      expect(builder).toBeInstanceOf(TestContainerBuilder);
      expect(typeof builder.build).toBe('function');
      expect(typeof builder.withName).toBe('function');
    });
  });

  describe('createMockContainer', () => {
    it('should create mock container with default options', () => {
      const container = createMockContainer();

      expect(container).toBeInstanceOf(MockDIContainer);
      expect(container.name).toContain('MockContainer');

      container.dispose();
    });

    it('should create mock container with custom options', () => {
      const options: IMockContainerOptions = {
        name: 'FactoryMockContainer',
        strictMode: true,
      };

      const container = createMockContainer(options);

      expect(container.name).toBe('FactoryMockContainer');
      expect(() => container.resolve('NonExistent')).toThrow();

      container.dispose();
    });
  });

  describe('createTestFixture', () => {
    it('should create test fixture with configuration', () => {
      const config: ITestFixtureConfig = {
        container: { name: 'FactoryFixture' },
        providers: [
          { token: 'TestService', implementation: new TestService('factory') },
        ],
      };

      const fixture = createTestFixture(config);

      expect(fixture).toBeInstanceOf(TestFixture);
      
      const container = fixture.getContainer();
      expect(container.name).toBe('FactoryFixture');
      expect(container.isMocked('TestService')).toBe(true);

      fixture.teardown();
    });
  });

  describe('createDIAssertions', () => {
    it('should create DI test assertions instance', () => {
      const assertions = createDIAssertions();

      expect(assertions).toBeInstanceOf(DITestAssertions);
      expect(typeof assertions.toHaveRegistration).toBe('function');
      expect(typeof assertions.toResolve).toBe('function');
    });
  });

  describe('mockFactory', () => {
    it('should return factory function unchanged', () => {
      const originalFactory = () => new TestService('factory');
      const wrappedFactory = mockFactory(originalFactory);

      expect(wrappedFactory).toBe(originalFactory);
      expect(wrappedFactory().getValue()).toBe('factory');
    });

    it('should maintain factory function signature', () => {
      const parameterizedFactory = (value: string) => new TestService(value);
      const wrappedFactory = mockFactory(parameterizedFactory);

      expect(wrappedFactory).toBe(parameterizedFactory);
      expect(wrappedFactory('parameterized').getValue()).toBe('parameterized');
    });
  });

  describe('mockInstance', () => {
    it('should return instance unchanged', () => {
      const originalInstance = new TestService('instance');
      const wrappedInstance = mockInstance(originalInstance);

      expect(wrappedInstance).toBe(originalInstance);
      expect(wrappedInstance.getValue()).toBe('instance');
    });

    it('should work with any object type', () => {
      const complexObject = {
        data: [1, 2, 3],
        nested: { value: 'nested' },
        method: () => 'method-result',
      };

      const wrappedObject = mockInstance(complexObject);

      expect(wrappedObject).toBe(complexObject);
      expect(wrappedObject.data).toEqual([1, 2, 3]);
      expect(wrappedObject.method()).toBe('method-result');
    });
  });
});

describe('Integration Testing', () => {
  it('should support complete testing workflow', async () => {
    // Create test fixture with mocked dependencies
    const fixture = createTestFixture({
      container: {
        name: 'IntegrationTestContainer',
        enableCallTracking: true,
      },
      providers: [
        {
          token: 'DatabaseService',
          implementation: new MockDatabaseService(),
          options: { lifecycle: 'singleton' },
        },
      ],
      setup: async (container) => {
        // Register additional services needed for test
        container.register('TestService', TestService);
        container.register('DependentService', DependentService, {
          dependencies: ['TestService'],
        });
      },
    });

    await fixture.setup();

    const container = fixture.getContainer();
    const assertions = createDIAssertions();

    // Test registrations
    assertions.toHaveRegistration(container, 'DatabaseService');
    assertions.toHaveRegistration(container, 'TestService');
    assertions.toHaveRegistration(container, 'DependentService');

    // Test resolutions
    assertions.toResolve(container, 'DatabaseService');
    assertions.toResolve(container, 'TestService');
    assertions.toResolve(container, 'DependentService');

    // Test actual functionality
    const dbService = container.resolve<MockDatabaseService>('DatabaseService');
    const results = await dbService.query('SELECT * FROM users');
    expect(results).toEqual([{ id: 1, name: 'mock-result' }]);

    const dependentService = container.resolve<DependentService>('DependentService');
    expect(dependentService.getValue()).toBe('dependent-test');

    // Verify call tracking
    const history = container.getCallHistory();
    expect(history.resolve.length).toBeGreaterThan(0);

    // Verify mocks
    expect(container.isMocked('DatabaseService')).toBe(true);
    expect(container.getMockTokens()).toContain('DatabaseService');

    await fixture.teardown();
  });

  it('should support mock verification in complex scenarios', () => {
    const container = createMockContainer({ enableCallTracking: true });

    // Set up mock dependencies
    container.mockDependency('Service1', new TestService('mock1'));
    container.mockDependency('Service2', () => new TestService('mock2'));

    // Simulate application usage
    container.resolve('Service1');
    container.resolve('Service1'); // Resolve twice
    container.resolve('Service2');

    // Verify usage patterns
    container.verifyResolved('Service1', 2);
    container.verifyResolved('Service2', 1);
    container.verifyRegistered('Service1');
    container.verifyRegistered('Service2');

    // Check call history for detailed verification
    const history = container.getCallHistory();
    const service1Resolutions = history.resolve.filter(call => call.args[0] === 'Service1');
    const service2Resolutions = history.resolve.filter(call => call.args[0] === 'Service2');

    expect(service1Resolutions).toHaveLength(2);
    expect(service2Resolutions).toHaveLength(1);

    container.dispose();
  });
});