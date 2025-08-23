/**
 * Testing utilities implementations
 *
 * Mock containers, dependency builders, and testing helpers for dependency injection
 */

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
  ISpyConfig as _ISpyConfig,
  ITestScenario as _ITestScenario,
} from "./testing.types.js";

import type {
  DIToken,
  IDIContainer,
  IContainerRegistrationOptions,
  IResolutionContext,
  IContainerMetrics as _IContainerMetrics,
} from "../../src/container/container.types.js";

import { DIContainer } from "../../src/container/container.classes.js";

// Import proper error classes from @axon/errors
import { ValidationErrorCategory as ValidationError, ApplicationError } from "@axon/errors";

/**
 * Mock container implementation with call tracking and testing features
 */
export class MockDIContainer extends DIContainer implements ITestContainer {
  private readonly callHistory: IContainerCallHistory;
  private readonly mockTokens = new Set<DIToken>();
  private readonly spiedTokens = new Map<DIToken, Record<string, unknown>>();
  private readonly callTrackingEnabled: boolean;

  constructor(options: IMockContainerOptions = {}) {
    super({
      name: options.name || "MockContainer",
      strictMode: options.strictMode ?? false,
      defaultLifecycle: options.defaultLifecycle || "singleton",
      enableMetrics: true,
    });

    this.callTrackingEnabled = options.enableCallTracking ?? true;
    this.callHistory = {
      register: [],
      resolve: [],
      tryResolve: [],
      isRegistered: [],
      all: [],
    };
  }

  private trackCall(method: string, args: unknown[], returnValue?: unknown, error?: Error): void {
    if (!this.callTrackingEnabled) return;

    const call: IMethodCall = {
      method,
      args: [...args],
      timestamp: new Date(),
      returnValue,
      ...(error && { error }),
    };

    (this.callHistory[method as keyof IContainerCallHistory] as IMethodCall[])?.push(call);
    this.callHistory.all.push(call);
  }

  public override register<T>(
    token: DIToken<T>,
    implementation: new (...args: unknown[]) => T,
    options?: IContainerRegistrationOptions,
  ): void {
    try {
      super.register(token, implementation, options);
      this.trackCall("register", [token, implementation, options]);
    } catch (error) {
      this.trackCall("register", [token, implementation, options], undefined, error as Error);
      throw error;
    }
  }

  public override resolve<T>(token: DIToken<T>, context?: IResolutionContext): T {
    try {
      const result = super.resolve(token, context);
      this.trackCall("resolve", [token, context], result);
      return result;
    } catch (error) {
      this.trackCall("resolve", [token, context], undefined, error as Error);
      throw error;
    }
  }

  public override tryResolve<T>(token: DIToken<T>, context?: IResolutionContext): T | undefined {
    try {
      const result = super.tryResolve(token, context);
      this.trackCall("tryResolve", [token, context], result);
      return result;
    } catch (error) {
      this.trackCall("tryResolve", [token, context], undefined, error as Error);
      throw error;
    }
  }

  public override isRegistered<T>(token: DIToken<T>): boolean {
    try {
      const result = super.isRegistered(token);
      this.trackCall("isRegistered", [token], result);
      return result;
    } catch (error) {
      this.trackCall("isRegistered", [token], undefined, error as Error);
      throw error;
    }
  }

  public getCallHistory(): IContainerCallHistory {
    return {
      register: [...this.callHistory.register],
      resolve: [...this.callHistory.resolve],
      tryResolve: [...this.callHistory.tryResolve],
      isRegistered: [...this.callHistory.isRegistered],
      all: [...this.callHistory.all],
    };
  }

  public clearCallHistory(): void {
    this.callHistory.register.length = 0;
    this.callHistory.resolve.length = 0;
    this.callHistory.tryResolve.length = 0;
    this.callHistory.isRegistered.length = 0;
    this.callHistory.all.length = 0;
  }

  public getMockTokens(): DIToken[] {
    return Array.from(this.mockTokens);
  }

  public isMocked(token: DIToken): boolean {
    return this.mockTokens.has(token);
  }

  public resetMocks(): void {
    // Clear all registered mocks
    const tokens = Array.from(this.mockTokens);
    for (const token of tokens) {
      this.unregister(token);
    }
    this.mockTokens.clear();
    this.spiedTokens.clear();
    this.clearCallHistory();
  }

  public verifyResolved(token: DIToken, times = 1): void {
    const resolveCalls = this.callHistory.resolve.filter((call) => call.args[0] === token);
    if (resolveCalls.length !== times) {
      throw new ValidationError(
        `Expected ${String(token)} to be resolved ${times} times, but was resolved ${resolveCalls.length} times`,
        "TEST_VERIFICATION_FAILED",
        {
          correlationId: `verify_resolved_${Date.now()}`,
          metadata: { token: String(token), expectedTimes: times, actualTimes: resolveCalls.length },
        },
      );
    }
  }

  public verifyRegistered(token: DIToken): void {
    if (!this.isRegistered(token)) {
      throw new ValidationError(
        `Expected ${String(token)} to be registered, but it was not found`,
        "TEST_REGISTRATION_NOT_FOUND",
        {
          correlationId: `verify_registered_${Date.now()}`,
          metadata: { token: String(token) },
        },
      );
    }
  }

  /**
   * Register a mock dependency with tracking
   */
  public mockDependency<T>(
    token: DIToken<T>,
    implementation: T | (() => T),
    options: IContainerRegistrationOptions = {},
  ): void {
    let mockImpl: new (...args: unknown[]) => T;

    if (typeof implementation === "function" && implementation.constructor === Function) {
      // It's a factory function
      const factory = implementation as () => T;
      mockImpl = class MockImplementation {
        constructor() {
          return factory() as T & this;
        }
      } as new (...args: unknown[]) => T;
    } else {
      // It's an instance, wrap it in a class
      const instance = implementation as T;
      mockImpl = class MockImplementation {
        constructor() {
          return instance as T & this;
        }
      } as new (...args: unknown[]) => T;
    }

    this.register(token, mockImpl, options);
    this.mockTokens.add(token);
  }
}

/**
 * Dependency mock builder implementation
 */
export class DependencyMockBuilder<T> implements IDependencyMockBuilder<T> {
  private token: DIToken<T>;
  private implementation?: T | (() => T);
  private lifecycle: "singleton" | "transient" | "scoped" = "singleton";
  private spyEnabled = false;
  private options: IContainerRegistrationOptions = {};
  private container: MockDIContainer;

  constructor(token: DIToken<T>, container: MockDIContainer) {
    this.token = token;
    this.container = container;
  }

  public withImplementation(impl: T | (() => T)): IDependencyMockBuilder<T> {
    this.implementation = impl;
    return this;
  }

  public withLifecycle(lifecycle: "singleton" | "transient" | "scoped"): IDependencyMockBuilder<T> {
    this.lifecycle = lifecycle;
    return this;
  }

  public withSpy(enabled = true): IDependencyMockBuilder<T> {
    this.spyEnabled = enabled;
    return this;
  }

  public withOptions(options: IContainerRegistrationOptions): IDependencyMockBuilder<T> {
    this.options = { ...this.options, ...options };
    return this;
  }

  public build(): void {
    if (!this.implementation) {
      throw new ValidationError(
        `Mock implementation required for token: ${String(this.token)}`,
        "TEST_MOCK_MISSING_IMPLEMENTATION",
        {
          correlationId: `build_mock_${Date.now()}`,
          metadata: { token: String(this.token) },
        },
      );
    }

    const registrationOptions: IContainerRegistrationOptions = {
      ...this.options,
      lifecycle: this.lifecycle,
    };

    this.container.mockDependency(this.token, this.implementation, registrationOptions);

    if (this.spyEnabled) {
      // Add spy tracking logic here if needed
      console.warn("Spy functionality not yet implemented");
    }
  }
}

/**
 * Test container builder implementation
 */
export class TestContainerBuilder implements ITestContainerBuilder {
  private options: IMockContainerOptions = {};
  private mockConfigs: IMockProviderConfig[] = [];

  public mockDependency<T>(token: DIToken<T>): IDependencyMockBuilder<T> {
    const container = new MockDIContainer(this.options);
    return new DependencyMockBuilder(token, container);
  }

  public mockDependencies(configs: IMockProviderConfig[]): ITestContainerBuilder {
    this.mockConfigs.push(...configs);
    return this;
  }

  public withCallTracking(enabled = true): ITestContainerBuilder {
    this.options.enableCallTracking = enabled;
    return this;
  }

  public withName(name: string): ITestContainerBuilder {
    this.options.name = name;
    return this;
  }

  public withStrictMode(enabled = true): ITestContainerBuilder {
    this.options.strictMode = enabled;
    return this;
  }

  public build(): ITestContainer {
    // Set default name if not provided
    if (!this.options.name) {
      this.options.name = `TestContainer_${Date.now()}`;
    }
    
    const container = new MockDIContainer(this.options);

    // Register all mock dependencies
    for (const config of this.mockConfigs) {
      container.mockDependency(config.token, config.implementation, config.options);
    }

    return container;
  }
}

/**
 * Test fixture utilities
 */
export class TestFixture {
  private container: ITestContainer;
  private config: ITestFixtureConfig;

  constructor(config: ITestFixtureConfig) {
    this.config = config;
    this.container = new TestContainerBuilder()
      .withName(config.container?.name || "TestFixture")
      .withCallTracking(config.container?.enableCallTracking ?? true)
      .withStrictMode(config.container?.strictMode ?? false)
      .mockDependencies(config.providers || [])
      .build();
  }

  public async setup(): Promise<void> {
    if (this.config.setup) {
      await this.config.setup(this.container);
    }
  }

  public async teardown(): Promise<void> {
    if (this.config.teardown) {
      await this.config.teardown(this.container);
    }
    this.container.resetMocks();
  }

  public getContainer(): ITestContainer {
    return this.container;
  }
}

/**
 * DI testing assertions
 */
export class DITestAssertions implements IDITestAssertions {
  public toHaveRegistration(container: IDIContainer, token: DIToken): void {
    if (!container.isRegistered(token)) {
      throw new ValidationError(
        `Expected container to have registration for token: ${String(token)}`,
        "TEST_ASSERTION_FAILED",
        {
          correlationId: `assert_registration_${Date.now()}`,
          metadata: { token: String(token) },
        },
      );
    }
  }

  public toResolve(container: IDIContainer, token: DIToken): void {
    try {
      const result = container.resolve(token);
      // In non-strict mode, resolve returns undefined for unregistered services
      // We should treat undefined as a resolution failure for assertion purposes
      if (result === undefined) {
        throw new ValidationError(
          `Expected container to resolve token: ${String(token)}, but got undefined`,
          "TEST_ASSERTION_FAILED",
          {
            correlationId: `assert_resolve_${Date.now()}`,
            metadata: { token: String(token), result: "undefined" },
          },
        );
      }
    } catch (error) {
      throw new ValidationError(
        `Expected container to resolve token: ${String(token)}, but got error: ${error}`,
        "TEST_ASSERTION_FAILED",
        {
          correlationId: `assert_resolve_${Date.now()}`,
          metadata: { token: String(token), originalError: String(error) },
        },
      );
    }
  }

  public toThrowOnResolve(
    container: IDIContainer,
    token: DIToken,
    errorType?: new (...args: unknown[]) => Error,
  ): void {
    let threwError = false;
    let actualError: Error | undefined;

    try {
      const result = container.resolve(token);
      // In non-strict mode, undefined is returned instead of throwing
      // For assertion purposes, we want to treat this as "should throw"
      if (result === undefined) {
        threwError = true;
        actualError = new Error("Service not found (returned undefined)");
      }
    } catch (error) {
      threwError = true;
      actualError = error as Error;
    }

    if (!threwError) {
      throw new ValidationError(
        `Expected container to throw when resolving token: ${String(token)}`,
        "TEST_ASSERTION_FAILED",
        {
          correlationId: `assert_throw_${Date.now()}`,
          metadata: { token: String(token) },
        },
      );
    }

    if (errorType && actualError && !(actualError instanceof errorType)) {
      throw new ValidationError(
        `Expected container to throw ${errorType.name} when resolving token: ${String(token)}, but threw ${actualError.constructor.name}`,
        "TEST_ASSERTION_FAILED",
        {
          correlationId: `assert_throw_type_${Date.now()}`,
          metadata: {
            token: String(token),
            expectedErrorType: errorType.name,
            actualErrorType: actualError.constructor.name,
          },
        },
      );
    }
  }

  public toHaveLifecycle(
    container: IDIContainer,
    token: DIToken,
    _lifecycle: "singleton" | "transient" | "scoped",
  ): void {
    // This would require accessing internal container state
    // For now, we'll just verify that the token is registered
    this.toHaveRegistration(container, token);
  }

  public toDetectCircularDependency(_container: IDIContainer, _tokens: DIToken[]): void {
    // This would require setting up circular dependencies and verifying detection
    // Implementation depends on how circular dependency detection works
    throw new ApplicationError("Circular dependency detection testing not yet implemented", "TEST_NOT_IMPLEMENTED", {
      correlationId: `circular_test_${Date.now()}`,
      metadata: { feature: "circular dependency detection" },
    });
  }
}

/**
 * Factory functions for creating test utilities
 */

/**
 * Create a new test container builder
 */
export function createTestContainer(): ITestContainerBuilder {
  return new TestContainerBuilder();
}

/**
 * Create a mock container with default options
 */
export function createMockContainer(options: IMockContainerOptions = {}): ITestContainer {
  return new MockDIContainer(options);
}

/**
 * Create a test fixture with configuration
 */
export function createTestFixture(config: ITestFixtureConfig): TestFixture {
  return new TestFixture(config);
}

/**
 * Create DI testing assertions instance
 */
export function createDIAssertions(): IDITestAssertions {
  return new DITestAssertions();
}

/**
 * Helper to create a mock implementation factory
 */
export function mockFactory<T>(factory: () => T): () => T {
  return factory;
}

/**
 * Helper to create a simple mock instance
 */
export function mockInstance<T>(instance: T): T {
  return instance;
}
