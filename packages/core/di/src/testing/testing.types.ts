/**
 * Testing utilities types
 *
 * Type definitions for testing dependency injection containers and mocking providers
 */

import type { DIToken, IDIContainer, IContainerRegistrationOptions } from "../container/container.types.js";

/**
 * Mock container configuration options
 */
export interface IMockContainerOptions {
  /** Container name for identification */
  name?: string;

  /** Whether to track method calls */
  enableCallTracking?: boolean;

  /** Whether to use strict mode */
  strictMode?: boolean;

  /** Default lifecycle for mocked dependencies */
  defaultLifecycle?: "singleton" | "transient" | "scoped";
}

/**
 * Mock provider configuration
 */
export interface IMockProviderConfig<T = unknown> {
  /** Token to mock */
  token: DIToken<T>;

  /** Mock implementation or factory */
  implementation: T | (() => T);

  /** Optional registration options */
  options?: IContainerRegistrationOptions;

  /** Whether to spy on method calls */
  spy?: boolean;
}

/**
 * Call tracking information for testing
 */
export interface IMethodCall {
  /** Method name */
  method: string;

  /** Arguments passed to method */
  args: unknown[];

  /** Timestamp of call */
  timestamp: Date;

  /** Return value (if available) */
  returnValue?: unknown;

  /** Error thrown (if any) */
  error?: Error;
}

/**
 * Mock container call history
 */
export interface IContainerCallHistory {
  /** Register method calls */
  register: IMethodCall[];

  /** Resolve method calls */
  resolve: IMethodCall[];

  /** TryResolve method calls */
  tryResolve: IMethodCall[];

  /** IsRegistered method calls */
  isRegistered: IMethodCall[];

  /** All method calls in chronological order */
  all: IMethodCall[];
}

/**
 * Test fixture configuration
 */
export interface ITestFixtureConfig {
  /** Container configuration */
  container?: IMockContainerOptions;

  /** Mock providers to register */
  providers?: IMockProviderConfig[];

  /** Additional setup function */
  setup?: (container: IDIContainer) => Promise<void> | void;

  /** Teardown function */
  teardown?: (container: IDIContainer) => Promise<void> | void;
}

/**
 * Dependency mock builder interface
 */
export interface IDependencyMockBuilder<T = unknown> {
  /** Set the mock implementation */
  withImplementation(impl: T | (() => T)): IDependencyMockBuilder<T>;

  /** Set lifecycle strategy */
  withLifecycle(lifecycle: "singleton" | "transient" | "scoped"): IDependencyMockBuilder<T>;

  /** Enable method spying */
  withSpy(enabled?: boolean): IDependencyMockBuilder<T>;

  /** Add custom registration options */
  withOptions(options: IContainerRegistrationOptions): IDependencyMockBuilder<T>;

  /** Build and register the mock */
  build(): void;
}

/**
 * Test container builder interface
 */
export interface ITestContainerBuilder {
  /** Add a mock dependency */
  mockDependency<T>(token: DIToken<T>): IDependencyMockBuilder<T>;

  /** Add multiple mock dependencies */
  mockDependencies(configs: IMockProviderConfig[]): ITestContainerBuilder;

  /** Enable call tracking */
  withCallTracking(enabled?: boolean): ITestContainerBuilder;

  /** Set container name */
  withName(name: string): ITestContainerBuilder;

  /** Enable strict mode */
  withStrictMode(enabled?: boolean): ITestContainerBuilder;

  /** Build the test container */
  build(): IDIContainer & ITestContainer;
}

/**
 * Extended container interface for testing
 */
export interface ITestContainer extends IDIContainer {
  /** Get call history for debugging */
  getCallHistory(): IContainerCallHistory;

  /** Clear call history */
  clearCallHistory(): void;

  /** Get all registered mock tokens */
  getMockTokens(): DIToken[];

  /** Check if a token is mocked */
  isMocked(token: DIToken): boolean;

  /** Reset all mocks to initial state */
  resetMocks(): void;

  /** Verify that a dependency was resolved */
  verifyResolved(token: DIToken, times?: number): void;

  /** Verify that a dependency was registered */
  verifyRegistered(token: DIToken): void;
}

/**
 * Assertion utilities for dependency injection testing
 */
export interface IDITestAssertions {
  /** Assert that container has registration */
  toHaveRegistration(container: IDIContainer, token: DIToken): void;

  /** Assert that container can resolve dependency */
  toResolve(container: IDIContainer, token: DIToken): void;

  /** Assert that resolution throws specific error */
  toThrowOnResolve(container: IDIContainer, token: DIToken, errorType?: new (...args: unknown[]) => Error): void;

  /** Assert that dependency has specific lifecycle */
  toHaveLifecycle(container: IDIContainer, token: DIToken, lifecycle: "singleton" | "transient" | "scoped"): void;

  /** Assert that circular dependency is detected */
  toDetectCircularDependency(container: IDIContainer, tokens: DIToken[]): void;
}

/**
 * Mock factory function type
 */
export type MockFactory<T = unknown> = () => T;

/**
 * Spy configuration for method tracking
 */
export interface ISpyConfig {
  /** Methods to spy on */
  methods?: string[];

  /** Whether to call through to original implementation */
  callThrough?: boolean;

  /** Custom spy implementation */
  implementation?: Record<string, (...args: unknown[]) => unknown>;
}

/**
 * Test scenario configuration
 */
export interface ITestScenario {
  /** Scenario name/description */
  name: string;

  /** Dependencies to mock */
  mocks: IMockProviderConfig[];

  /** Test setup function */
  setup?: (container: ITestContainer) => Promise<void> | void;

  /** Test assertions */
  assertions?: (container: ITestContainer) => Promise<void> | void;

  /** Expected behavior description */
  expected?: string;
}
