/**
 * Cross-Package Integration Test - Type Definitions
 *
 * Shared type definitions for cross-package integration tests,
 * test scenarios, and validation interfaces.
 */

import type { IPackageDependencyInfo, ICircularDependency, IImportAnalysis } from "../utils/package-analyzer.js";
import type { IPerformanceMeasurement, IBenchmarkResults } from "../utils/performance-helpers.js";
import type { ITestEnvironmentConfig, ICrossEnvironmentConfig } from "../utils/test-environment.js";
import type {
  ILogger,
  IConfigRepository,
  IDIContainer,
  RealPackageFactory,
  EnhancedErrorFactory,
} from "../utils/real-packages.js";

/**
 * Cross-package integration test result
 */
export interface ICrossPackageTestResult {
  /** Test suite name */
  testSuite: string;
  /** Individual test results */
  tests: Array<{
    name: string;
    passed: boolean;
    duration: number;
    error?: Error;
    performance?: IPerformanceMeasurement;
  }>;
  /** Overall test suite status */
  passed: boolean;
  /** Total execution time */
  totalDuration: number;
  /** Performance benchmarks if collected */
  benchmarks?: IBenchmarkResults[];
  /** Package dependency analysis */
  packageAnalysis?: {
    packages: IPackageDependencyInfo[];
    circularDependencies: ICircularDependency[];
    importAnalysis: IImportAnalysis[];
  };
}

/**
 * Package interaction test scenario
 */
export interface IPackageInteractionScenario {
  /** Scenario name */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Packages involved in the interaction */
  packages: string[];
  /** Expected dependency flow */
  expectedDependencyFlow: Array<{
    from: string;
    to: string;
    type: "direct" | "transitive";
  }>;
  /** Test function to execute */
  test: (context: ITestScenarioContext) => Promise<void> | void;
  /** Performance expectations */
  performance?: {
    maxDuration: number;
    maxMemoryUsage: number;
  };
  /** Validation function */
  validate?: (result: ICrossPackageTestResult) => Promise<boolean> | boolean;
}

/**
 * Test scenario execution context
 */
export interface ITestScenarioContext {
  /** Real package factory for creating actual @axon package instances */
  realPackages: RealPackageFactory;
  /** Real package instances */
  packages: {
    logger: ILogger;
    config: IConfigRepository;
    errors: EnhancedErrorFactory;
    di: IDIContainer;
  };
  /** Performance measurement utilities */
  performance: {
    measure: <T>(
      operation: string,
      fn: () => Promise<T> | T,
    ) => Promise<{ result: T; measurement: IPerformanceMeasurement }>;
    benchmark: <T>(
      operation: string,
      fn: () => Promise<T> | T,
      config: { iterations: number },
    ) => Promise<IBenchmarkResults>;
  };
  /** Package analyzer instance */
  packageAnalyzer: {
    getPackage: (name: string) => IPackageDependencyInfo | undefined;
    canImport: (importer: string, target: string) => boolean;
    validateDependencyLayering: () => Array<{ packageName: string; isValid: boolean; errors: string[] }>;
  };
  /** Environment information */
  environment: {
    nodeVersion: string;
    platform: string;
    isNode: boolean;
    isBrowser: boolean;
  };
}

/**
 * Cross-package integration test configuration
 */
export interface ICrossPackageIntegrationConfig {
  /** Test suite name */
  name: string;
  /** Description of the test suite */
  description: string;
  /** Environment configuration */
  environment: ITestEnvironmentConfig;
  /** Cross-environment testing configuration */
  crossEnvironment?: ICrossEnvironmentConfig;
  /** Package interaction scenarios */
  scenarios: IPackageInteractionScenario[];
  /** Global setup function */
  globalSetup?: () => Promise<void> | void;
  /** Global teardown function */
  globalTeardown?: () => Promise<void> | void;
  /** Timeout for the entire test suite */
  timeout?: number;
  /** Whether to run performance benchmarks */
  enableBenchmarks?: boolean;
  /** Whether to generate reports */
  generateReports?: boolean;
}

/**
 * Configuration-Logger integration test types
 */
export interface IConfigLoggerIntegrationTest {
  /** Configuration to test */
  config: {
    logLevel: string;
    transports: string[];
    format: string;
  };
  /** Expected logger behavior */
  expectedBehavior: {
    logLevel: string;
    transportCount: number;
    formatApplied: boolean;
  };
  /** Test assertions */
  assertions: Array<{
    type: "log-entry" | "transport-config" | "performance";
    description: string;
    validator: (context: ITestScenarioContext) => Promise<boolean> | boolean;
  }>;
}

/**
 * Error-Logger correlation test types
 */
export interface IErrorLoggerCorrelationTest {
  /** Error to generate */
  error: {
    type: string;
    message: string;
    correlationId: string;
    context?: Record<string, unknown>;
  };
  /** Expected logging behavior */
  expectedLogging: {
    logLevel: string;
    includeCorrelationId: boolean;
    includeStackTrace: boolean;
    includeContext: boolean;
  };
  /** Correlation tracking validation */
  correlationValidation: {
    trackedAcrossServices: boolean;
    persistedInLogs: boolean;
    availableForRecovery: boolean;
  };
}

/**
 * Type validation across packages test types
 */
export interface ITypeValidationTest {
  /** Source package */
  sourcePackage: string;
  /** Target package */
  targetPackage: string;
  /** Types to validate */
  types: Array<{
    name: string;
    sourceType: string;
    expectedTargetType: string;
    compatibility: "identical" | "compatible" | "incompatible";
  }>;
  /** Validation rules */
  validationRules: Array<{
    rule: string;
    description: string;
    validator: (sourceType: unknown, targetType: unknown) => boolean;
  }>;
}

/**
 * Performance benchmark test configuration
 */
export interface IPerformanceBenchmarkConfig {
  /** Benchmark name */
  name: string;
  /** Operation to benchmark */
  operation: string;
  /** Target performance metrics */
  targets: {
    averageDuration: number;
    p95Duration: number;
    maxMemoryUsage: number;
  };
  /** Benchmark configuration */
  config: {
    iterations: number;
    warmupIterations: number;
    collectGarbagePerIteration: boolean;
  };
  /** Package combinations to test */
  packageCombinations: string[][];
}

/**
 * Circular dependency detection test types
 */
export interface ICircularDependencyTest {
  /** Test name */
  name: string;
  /** Package dependency setup that should create circular dependency */
  dependencySetup: Array<{
    package: string;
    dependsOn: string[];
  }>;
  /** Expected detection result */
  expectedResult: {
    circularDependencyDetected: boolean;
    cycleDescription: string;
    severity: "error" | "warning" | "info";
  };
  /** Recovery strategy test */
  recoveryStrategy?: {
    strategy: string;
    expectedOutcome: "resolved" | "mitigated" | "reported";
  };
}

/**
 * Export compatibility test types
 */
export interface IExportCompatibilityTest {
  /** Source package */
  sourcePackage: string;
  /** Export to test */
  exportName: string;
  /** Import configurations to test */
  importConfigurations: Array<{
    importerPackage: string;
    importStyle: "named" | "default" | "namespace" | "dynamic";
    expectedResult: "success" | "error" | "warning";
  }>;
  /** Cross-environment compatibility */
  environments: Array<{
    environment: "node18" | "node20" | "node22" | "browser";
    expectedCompatibility: boolean;
  }>;
}

/**
 * End-to-end workflow test types
 */
export interface IEndToEndWorkflowTest {
  /** Workflow name */
  name: string;
  /** Workflow steps */
  steps: Array<{
    step: number;
    description: string;
    package: string;
    operation: string;
    inputData?: unknown;
    expectedOutput?: unknown;
    performance?: {
      maxDuration: number;
      maxMemoryDelta: number;
    };
  }>;
  /** Integration points to validate */
  integrationPoints: Array<{
    betweenPackages: [string, string];
    dataFlow: "bidirectional" | "unidirectional";
    validationFunction: (data: unknown) => boolean;
  }>;
  /** Overall workflow validation */
  workflowValidation: {
    completionTime: number;
    dataConsistency: boolean;
    errorRecovery: boolean;
  };
}

/**
 * Test report generation types
 */
export interface ITestReport {
  /** Report metadata */
  metadata: {
    generatedAt: Date;
    testSuite: string;
    environment: string;
    nodeVersion: string;
    duration: number;
  };
  /** Summary statistics */
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
  /** Performance metrics */
  performance: {
    averageTestDuration: number;
    slowestTest: { name: string; duration: number };
    fastestTest: { name: string; duration: number };
    memoryUsage: {
      peak: number;
      average: number;
    };
  };
  /** Package analysis results */
  packageAnalysis: {
    packagesAnalyzed: string[];
    dependencyViolations: number;
    circularDependencies: number;
    performanceTargetsMet: number;
    performanceTargetsTotal: number;
  };
  /** Detailed test results */
  testResults: ICrossPackageTestResult[];
  /** Recommendations */
  recommendations: Array<{
    type: "performance" | "architecture" | "dependency" | "testing";
    priority: "high" | "medium" | "low";
    description: string;
    suggestion: string;
  }>;
}

/**
 * Test suite builder configuration
 */
export interface ITestSuiteBuilder {
  /** Add a package interaction scenario */
  addScenario(scenario: IPackageInteractionScenario): ITestSuiteBuilder;
  /** Add performance benchmark */
  addBenchmark(benchmark: IPerformanceBenchmarkConfig): ITestSuiteBuilder;
  /** Add cross-environment test */
  addCrossEnvironmentTest(test: ICrossEnvironmentConfig): ITestSuiteBuilder;
  /** Configure environment */
  withEnvironment(config: ITestEnvironmentConfig): ITestSuiteBuilder;
  /** Enable report generation */
  withReports(enabled: boolean): ITestSuiteBuilder;
  /** Build the test configuration */
  build(): ICrossPackageIntegrationConfig;
}

/**
 * Utility types for test assertions
 */
export type TestAssertion<T = unknown> = (actual: T) => void | Promise<void>;

export type TestValidator<T = unknown> = (value: T) => boolean | Promise<boolean>;

export type TestMatcher<T = unknown> = {
  toBe: (expected: T) => void;
  toEqual: (expected: T) => void;
  toContain: (expected: unknown) => void;
  toMatch: (expected: RegExp | string) => void;
  toThrow: (expected?: string | RegExp | Error) => void;
  toBeInstanceOf: (expected: unknown) => void;
};
