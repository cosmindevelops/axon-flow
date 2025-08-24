/**
 * Cross-Package Integration Test - Test Configuration
 *
 * Central configuration for cross-package integration tests including
 * test suite definitions, environment settings, and performance targets.
 */

import type {
  ICrossPackageIntegrationConfig,
  IPackageInteractionScenario,
  IPerformanceBenchmarkConfig,
  ITestSuiteBuilder,
} from "../types/test-types.js";
import type { ITestEnvironmentConfig, ICrossEnvironmentConfig } from "../utils/test-environment.js";
import { DEFAULT_TEST_ENVIRONMENTS } from "../utils/test-environment.js";
import { PERFORMANCE_TARGETS } from "../utils/performance-helpers.js";

/**
 * Default cross-package integration test configuration
 */
export const DEFAULT_CROSS_PACKAGE_CONFIG: ICrossPackageIntegrationConfig = {
  name: "cross-package-integration",
  description: "Comprehensive cross-package integration tests for Axon Flow core packages",
  environment: {
    ...DEFAULT_TEST_ENVIRONMENTS.integration,
    nodeVersions: [...DEFAULT_TEST_ENVIRONMENTS.integration.nodeVersions],
    platforms: [...DEFAULT_TEST_ENVIRONMENTS.integration.platforms],
  },
  scenarios: [],
  timeout: 300000, // 5 minutes
  enableBenchmarks: true,
  generateReports: true,
};

/**
 * Cross-environment testing configurations
 */
export const CROSS_ENVIRONMENT_CONFIGS: Record<string, ICrossEnvironmentConfig> = {
  nodeVersions: {
    testName: "node-version-compatibility",
    environments: ["node18", "node20", "node22"],
    packageCombinations: [
      ["@axon/types", "@axon/errors"],
      ["@axon/types", "@axon/config"],
      ["@axon/config", "@axon/logger"],
      ["@axon/errors", "@axon/logger"],
    ],
    expectedBehavior: "identical",
  },
  crossPlatform: {
    testName: "cross-platform-compatibility",
    environments: ["node22", "browser"],
    packageCombinations: [["@axon/types"], ["@axon/errors"]],
    expectedBehavior: "platform-specific",
  },
};

/**
 * Package interaction scenarios for integration testing
 */
export const PACKAGE_INTERACTION_SCENARIOS: IPackageInteractionScenario[] = [
  {
    name: "config-logger-integration",
    description: "Test configuration loading and logger setup integration",
    packages: ["@axon/types", "@axon/config", "@axon/logger"],
    expectedDependencyFlow: [
      { from: "@axon/config", to: "@axon/types", type: "direct" },
      { from: "@axon/logger", to: "@axon/types", type: "direct" },
      { from: "@axon/logger", to: "@axon/config", type: "direct" },
    ],
    test: async (context) => {
      // Test will be implemented by actual test files
      context.performance.measure("config-load", () => {
        // Mock config loading
        return Promise.resolve({ logLevel: "info", format: "json" });
      });
    },
    performance: {
      maxDuration: 100, // 100ms
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    },
  },
  {
    name: "error-logger-correlation",
    description: "Test error handling with logger correlation tracking",
    packages: ["@axon/types", "@axon/errors", "@axon/logger"],
    expectedDependencyFlow: [
      { from: "@axon/errors", to: "@axon/types", type: "direct" },
      { from: "@axon/logger", to: "@axon/types", type: "direct" },
      { from: "@axon/logger", to: "@axon/errors", type: "transitive" },
    ],
    test: async (context) => {
      await context.performance.measure("error-correlation", async () => {
        // Test error creation and logging correlation using real packages
        const correlationId = "test-correlation-id";
        const errorFactory = context.realPackages.createErrorFactory("test-errors");
        const logger = context.realPackages.createLogger("test-logger");

        // Use real error factory method instead of mock report
        const error = errorFactory.createSystemError("Test error", "TEST_ERROR");

        // Use real logger interface instead of mock write
        logger.error("Error occurred", {
          correlationId,
          errorMessage: error.message,
          errorName: error.name,
        });
      });
    },
    performance: {
      maxDuration: 50, // 50ms
      maxMemoryUsage: 10 * 1024 * 1024, // 10MB
    },
  },
  {
    name: "type-validation-across-packages",
    description: "Test type compatibility and validation across all packages",
    packages: ["@axon/types", "@axon/config", "@axon/logger", "@axon/errors"],
    expectedDependencyFlow: [
      { from: "@axon/config", to: "@axon/types", type: "direct" },
      { from: "@axon/logger", to: "@axon/types", type: "direct" },
      { from: "@axon/errors", to: "@axon/types", type: "direct" },
    ],
    test: async (context) => {
      // Validate that types are properly exported and importable
      const typesPackage = context.packageAnalyzer.getPackage("@axon/types");
      if (!typesPackage) {
        throw new Error("Types package not found");
      }

      // Validate dependency layering
      const validationResults = context.packageAnalyzer.validateDependencyLayering();
      const failed = validationResults.filter((result) => !result.isValid);
      if (failed.length > 0) {
        throw new Error(`Dependency layering violations: ${failed.map((f) => f.packageName).join(", ")}`);
      }
    },
    performance: {
      maxDuration: 20, // 20ms
      maxMemoryUsage: 5 * 1024 * 1024, // 5MB
    },
  },
  {
    name: "circular-dependency-detection",
    description: "Test circular dependency detection and prevention",
    packages: ["@axon/types", "@axon/config", "@axon/logger", "@axon/errors"],
    expectedDependencyFlow: [],
    test: async (context) => {
      // This test validates that no circular dependencies exist
      // and that the detection system works
      const canImportCircular = context.packageAnalyzer.canImport("@axon/types", "@axon/logger");
      if (canImportCircular) {
        throw new Error("Circular dependency detected: types should not import logger");
      }
    },
    performance: {
      maxDuration: 10, // 10ms
      maxMemoryUsage: 2 * 1024 * 1024, // 2MB
    },
  },
];

/**
 * Performance benchmark configurations
 */
export const PERFORMANCE_BENCHMARKS: IPerformanceBenchmarkConfig[] = [
  {
    name: "config-loading-benchmark",
    operation: "configuration loading and validation",
    targets: {
      averageDuration: PERFORMANCE_TARGETS.config.load,
      p95Duration: PERFORMANCE_TARGETS.config.load * 1.5,
      maxMemoryUsage: 10 * 1024 * 1024, // 10MB
    },
    config: {
      iterations: 100,
      warmupIterations: 10,
      collectGarbagePerIteration: true,
    },
    packageCombinations: [["@axon/types", "@axon/config"]],
  },
  {
    name: "logger-throughput-benchmark",
    operation: "logger throughput and performance",
    targets: {
      averageDuration: PERFORMANCE_TARGETS.logger.singleLog,
      p95Duration: PERFORMANCE_TARGETS.logger.singleLog * 2,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    },
    config: {
      iterations: 1000,
      warmupIterations: 100,
      collectGarbagePerIteration: false,
    },
    packageCombinations: [
      ["@axon/types", "@axon/logger"],
      ["@axon/config", "@axon/logger"],
    ],
  },
  {
    name: "error-handling-benchmark",
    operation: "error creation and handling",
    targets: {
      averageDuration: PERFORMANCE_TARGETS.errors.creation,
      p95Duration: PERFORMANCE_TARGETS.errors.creation * 3,
      maxMemoryUsage: 5 * 1024 * 1024, // 5MB
    },
    config: {
      iterations: 500,
      warmupIterations: 50,
      collectGarbagePerIteration: true,
    },
    packageCombinations: [
      ["@axon/types", "@axon/errors"],
      ["@axon/errors", "@axon/logger"],
    ],
  },
];

/**
 * Test suite builder implementation
 */
export class CrossPackageTestSuiteBuilder implements ITestSuiteBuilder {
  private config: Partial<ICrossPackageIntegrationConfig> = {};
  private scenarios: IPackageInteractionScenario[] = [];
  private benchmarks: IPerformanceBenchmarkConfig[] = [];

  constructor(baseConfig: Partial<ICrossPackageIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CROSS_PACKAGE_CONFIG, ...baseConfig };
  }

  addScenario(scenario: IPackageInteractionScenario): ITestSuiteBuilder {
    this.scenarios.push(scenario);
    return this;
  }

  addBenchmark(benchmark: IPerformanceBenchmarkConfig): ITestSuiteBuilder {
    this.benchmarks.push(benchmark);
    return this;
  }

  addCrossEnvironmentTest(test: ICrossEnvironmentConfig): ITestSuiteBuilder {
    this.config.crossEnvironment = test;
    return this;
  }

  withEnvironment(config: ITestEnvironmentConfig): ITestSuiteBuilder {
    this.config.environment = config;
    return this;
  }

  withReports(enabled: boolean): ITestSuiteBuilder {
    this.config.generateReports = enabled;
    return this;
  }

  build(): ICrossPackageIntegrationConfig {
    return {
      ...this.config,
      scenarios: this.scenarios,
    } as ICrossPackageIntegrationConfig;
  }
}

/**
 * Create a test suite builder with default configuration
 */
export function createTestSuiteBuilder(name?: string, description?: string): CrossPackageTestSuiteBuilder {
  const baseConfig: Partial<ICrossPackageIntegrationConfig> = {};

  if (name) {
    baseConfig.name = name;
  }

  if (description) {
    baseConfig.description = description;
  }

  return new CrossPackageTestSuiteBuilder(baseConfig);
}

/**
 * Pre-configured test suite for comprehensive cross-package integration
 */
export function createComprehensiveTestSuite(): ICrossPackageIntegrationConfig {
  return createTestSuiteBuilder(
    "comprehensive-cross-package-integration",
    "Comprehensive integration tests for all Axon Flow core packages",
  )
    .withEnvironment({
      ...DEFAULT_TEST_ENVIRONMENTS.integration,
      nodeVersions: [...DEFAULT_TEST_ENVIRONMENTS.integration.nodeVersions],
      platforms: [...DEFAULT_TEST_ENVIRONMENTS.integration.platforms],
    })
    .addCrossEnvironmentTest(CROSS_ENVIRONMENT_CONFIGS.nodeVersions)
    .withReports(true)
    .build();
}

/**
 * Pre-configured test suite for performance benchmarking
 */
export function createPerformanceTestSuite(): ICrossPackageIntegrationConfig {
  const builder = createTestSuiteBuilder(
    "performance-cross-package-benchmarks",
    "Performance benchmarks for cross-package operations",
  )
    .withEnvironment({
      ...DEFAULT_TEST_ENVIRONMENTS.performance,
      nodeVersions: [...DEFAULT_TEST_ENVIRONMENTS.performance.nodeVersions],
      platforms: [...DEFAULT_TEST_ENVIRONMENTS.performance.platforms],
    })
    .withReports(true);

  // Add all performance benchmarks as scenarios
  for (const benchmark of PERFORMANCE_BENCHMARKS) {
    builder.addScenario({
      name: benchmark.name,
      description: `Performance benchmark: ${benchmark.operation}`,
      packages: benchmark.packageCombinations.flat(),
      expectedDependencyFlow: [],
      test: async (context) => {
        await context.performance.benchmark(
          benchmark.operation,
          () => Promise.resolve(), // Actual implementation would be provided
          benchmark.config,
        );
      },
      performance: {
        maxDuration: benchmark.targets.averageDuration * 2,
        maxMemoryUsage: benchmark.targets.maxMemoryUsage,
      },
    });
  }

  return builder.build();
}

/**
 * Pre-configured test suite for cross-environment compatibility
 */
export function createCrossEnvironmentTestSuite(): ICrossPackageIntegrationConfig {
  return createTestSuiteBuilder(
    "cross-environment-compatibility",
    "Cross-environment compatibility tests for Node.js versions and browser",
  )
    .withEnvironment({
      ...DEFAULT_TEST_ENVIRONMENTS.crossPlatform,
      nodeVersions: [...DEFAULT_TEST_ENVIRONMENTS.crossPlatform.nodeVersions],
      platforms: [...DEFAULT_TEST_ENVIRONMENTS.crossPlatform.platforms],
    })
    .addCrossEnvironmentTest(CROSS_ENVIRONMENT_CONFIGS.crossPlatform)
    .withReports(true)
    .build();
}

/**
 * Test configuration validation
 */
export function validateTestConfig(config: ICrossPackageIntegrationConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate basic configuration
  if (!config.name || config.name.length === 0) {
    errors.push("Test suite name is required");
  }

  if (!config.description || config.description.length === 0) {
    warnings.push("Test suite description is recommended");
  }

  if (!config.scenarios || config.scenarios.length === 0) {
    errors.push("At least one test scenario is required");
  }

  // Validate scenarios
  for (const scenario of config.scenarios || []) {
    if (!scenario.name || scenario.name.length === 0) {
      errors.push("Scenario name is required");
    }

    if (!scenario.packages || scenario.packages.length === 0) {
      errors.push(`Scenario "${scenario.name}" must specify at least one package`);
    }

    if (!scenario.test) {
      errors.push(`Scenario "${scenario.name}" must have a test function`);
    }
  }

  // Validate environment configuration
  if (!config.environment) {
    errors.push("Environment configuration is required");
  } else {
    if (!config.environment.nodeVersions || config.environment.nodeVersions.length === 0) {
      warnings.push("No Node.js versions specified for testing");
    }

    if (config.environment.timeout && config.environment.timeout < 5000) {
      warnings.push("Test timeout is very low (<5s), consider increasing");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
