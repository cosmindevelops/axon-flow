/**
 * Cross-Package Integration Test - Test Environment Setup
 *
 * Utilities for setting up and managing test environments for cross-package
 * integration tests with cross-platform compatibility support.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

/**
 * Test environment configuration
 */
export interface ITestEnvironmentConfig {
  /** Environment name */
  name: string;
  /** Node.js version compatibility */
  nodeVersions: string[];
  /** Platform compatibility */
  platforms: ("node" | "browser")[];
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Whether to enable memory leak detection */
  enableMemoryLeakDetection: boolean;
  /** Test timeout in milliseconds */
  timeout: number;
  /** Setup hooks */
  hooks: {
    beforeAll?: () => Promise<void> | void;
    afterAll?: () => Promise<void> | void;
    beforeEach?: () => Promise<void> | void;
    afterEach?: () => Promise<void> | void;
  };
}

/**
 * Cross-environment compatibility test configuration
 */
export interface ICrossEnvironmentConfig {
  /** Test name */
  testName: string;
  /** Environments to test */
  environments: ("node18" | "node20" | "node22" | "browser")[];
  /** Package combinations to test */
  packageCombinations: string[][];
  /** Expected behavior across environments */
  expectedBehavior: "identical" | "platform-specific" | "graceful-degradation";
}

/**
 * Test environment manager
 */
export class TestEnvironmentManager {
  private config: ITestEnvironmentConfig;
  private memoryBaseline?: NodeJS.MemoryUsage;
  private performanceMarkers = new Map<string, number>();

  constructor(config: ITestEnvironmentConfig) {
    this.config = config;
  }

  /**
   * Setup test environment
   */
  async setup(): Promise<void> {
    // Set memory baseline for leak detection
    if (this.config.enableMemoryLeakDetection) {
      this.captureMemoryBaseline();
    }

    // Setup performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Run custom setup hook
    if (this.config.hooks.beforeAll) {
      await this.config.hooks.beforeAll();
    }
  }

  /**
   * Teardown test environment
   */
  async teardown(): Promise<void> {
    // Run custom teardown hook
    if (this.config.hooks.afterAll) {
      await this.config.hooks.afterAll();
    }

    // Check for memory leaks
    if (this.config.enableMemoryLeakDetection && this.memoryBaseline) {
      this.checkMemoryLeaks();
    }

    // Clear performance markers
    if (this.config.enablePerformanceMonitoring) {
      this.clearPerformanceMonitoring();
    }
  }

  /**
   * Setup before each test
   */
  async beforeEach(): Promise<void> {
    // Mark test start for performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.markPerformance("test-start");
    }

    // Run custom beforeEach hook
    if (this.config.hooks.beforeEach) {
      await this.config.hooks.beforeEach();
    }
  }

  /**
   * Cleanup after each test
   */
  async afterEach(): Promise<void> {
    // Run custom afterEach hook
    if (this.config.hooks.afterEach) {
      await this.config.hooks.afterEach();
    }

    // Mark test end for performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.markPerformance("test-end");
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Capture memory baseline
   */
  private captureMemoryBaseline(): void {
    // Force garbage collection before baseline
    if (global.gc) {
      global.gc();
    }
    this.memoryBaseline = process.memoryUsage();
  }

  /**
   * Check for memory leaks
   */
  private checkMemoryLeaks(): void {
    if (!this.memoryBaseline) return;

    // Force garbage collection before check
    if (global.gc) {
      global.gc();
    }

    const currentMemory = process.memoryUsage();
    const heapIncrease = currentMemory.heapUsed - this.memoryBaseline.heapUsed;
    const rssIncrease = currentMemory.rss - this.memoryBaseline.rss;

    // Warn if significant memory increase (>10MB heap or >50MB RSS)
    if (heapIncrease > 10 * 1024 * 1024 || rssIncrease > 50 * 1024 * 1024) {
      console.warn(`Potential memory leak detected in ${this.config.name}:`);
      console.warn(`  Heap increase: ${(heapIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.warn(`  RSS increase: ${(rssIncrease / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Clear existing markers
    this.performanceMarkers.clear();
  }

  /**
   * Clear performance monitoring
   */
  private clearPerformanceMonitoring(): void {
    this.performanceMarkers.clear();
  }

  /**
   * Mark performance checkpoint
   */
  markPerformance(label: string): void {
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMarkers.set(label, performance.now());
    }
  }

  /**
   * Get performance duration between markers
   */
  getPerformanceDuration(startLabel: string, endLabel: string): number | null {
    if (!this.config.enablePerformanceMonitoring) return null;

    const startTime = this.performanceMarkers.get(startLabel);
    const endTime = this.performanceMarkers.get(endLabel);

    if (startTime === undefined || endTime === undefined) {
      return null;
    }

    return endTime - startTime;
  }

  /**
   * Validate environment compatibility
   */
  validateEnvironmentCompatibility(): {
    isCompatible: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const isCompatible = true;

    // Check Node.js version compatibility
    const nodeVersion = process.version;
    if (!this.config.nodeVersions.some((version) => nodeVersion.startsWith(version))) {
      warnings.push(`Node.js version ${nodeVersion} not in supported versions: ${this.config.nodeVersions.join(", ")}`);
    }

    // Check platform compatibility
    if (this.config.platforms.includes("browser") && typeof window === "undefined") {
      // Running in Node.js but browser compatibility expected
      warnings.push("Browser compatibility expected but running in Node.js environment");
    }

    // Check for required globals
    if (this.config.enableMemoryLeakDetection && !global.gc) {
      warnings.push("Memory leak detection enabled but gc not available (run with --expose-gc)");
    }

    return { isCompatible, warnings, errors };
  }
}

/**
 * Cross-environment test runner
 */
export class CrossEnvironmentTestRunner {
  private config: ICrossEnvironmentConfig;

  constructor(config: ICrossEnvironmentConfig) {
    this.config = config;
  }

  /**
   * Run tests across multiple environments
   */
  async runCrossEnvironmentTest<T>(testFn: () => Promise<T> | T): Promise<Map<string, { result: T; error?: Error }>> {
    const results = new Map<string, { result: T; error?: Error }>();

    for (const environment of this.config.environments) {
      try {
        // Setup environment-specific configuration
        const envConfig = this.getEnvironmentConfig(environment);
        const envManager = new TestEnvironmentManager(envConfig);

        await envManager.setup();

        try {
          const result = await testFn();
          results.set(environment, { result });
        } finally {
          await envManager.teardown();
        }
      } catch (error) {
        results.set(environment, {
          result: null as unknown as T,
          error: error as Error,
        });
      }
    }

    return results;
  }

  /**
   * Validate cross-environment consistency
   */
  validateCrossEnvironmentConsistency<T>(results: Map<string, { result: T; error?: Error }>): {
    isConsistent: boolean;
    differences: Array<{
      environment1: string;
      environment2: string;
      difference: string;
    }>;
  } {
    const differences: Array<{
      environment1: string;
      environment2: string;
      difference: string;
    }> = [];

    const environments = Array.from(results.keys());
    const successfulResults = Array.from(results.entries()).filter(([, result]) => !result.error);

    // Compare results between environments
    for (let i = 0; i < successfulResults.length; i++) {
      for (let j = i + 1; j < successfulResults.length; j++) {
        const [env1, result1] = successfulResults[i]!;
        const [env2, result2] = successfulResults[j]!;

        if (this.config.expectedBehavior === "identical") {
          // Results should be identical
          if (JSON.stringify(result1.result) !== JSON.stringify(result2.result)) {
            differences.push({
              environment1: env1,
              environment2: env2,
              difference: "Results are not identical",
            });
          }
        }
      }
    }

    // Check for environment-specific errors
    for (const [env, result] of Array.from(results.entries())) {
      if (result.error && this.config.expectedBehavior !== "graceful-degradation") {
        differences.push({
          environment1: env,
          environment2: "expected",
          difference: `Unexpected error: ${result.error.message}`,
        });
      }
    }

    return {
      isConsistent: differences.length === 0,
      differences,
    };
  }

  /**
   * Get environment-specific configuration
   */
  private getEnvironmentConfig(environment: string): ITestEnvironmentConfig {
    return {
      name: `cross-env-${environment}`,
      nodeVersions: [environment.replace("node", "v")],
      platforms: environment === "browser" ? ["browser"] : ["node"],
      enablePerformanceMonitoring: true,
      enableMemoryLeakDetection: environment.startsWith("node"),
      timeout: 30000,
      hooks: {},
    };
  }
}

/**
 * Default test environment configurations
 */
export const DEFAULT_TEST_ENVIRONMENTS = {
  integration: {
    name: "integration",
    nodeVersions: ["v18", "v20", "v22"],
    platforms: ["node"] as const,
    enablePerformanceMonitoring: true,
    enableMemoryLeakDetection: true,
    timeout: 30000,
    hooks: {},
  },
  performance: {
    name: "performance",
    nodeVersions: ["v22"],
    platforms: ["node"] as const,
    enablePerformanceMonitoring: true,
    enableMemoryLeakDetection: true,
    timeout: 60000,
    hooks: {
      beforeAll: () => {
        // Ensure garbage collection is available for performance tests
        if (!global.gc) {
          console.warn("Performance tests require --expose-gc flag");
        }
      },
    },
  },
  crossPlatform: {
    name: "cross-platform",
    nodeVersions: ["v18", "v20", "v22"],
    platforms: ["node", "browser"] as const,
    enablePerformanceMonitoring: false,
    enableMemoryLeakDetection: false,
    timeout: 15000,
    hooks: {},
  },
} as const;

/**
 * Setup test environment with Vitest hooks
 */
export function setupTestEnvironment(config: ITestEnvironmentConfig): TestEnvironmentManager {
  const manager = new TestEnvironmentManager(config);

  beforeAll(async () => {
    await manager.setup();
  });

  afterAll(async () => {
    await manager.teardown();
  });

  beforeEach(async () => {
    await manager.beforeEach();
  });

  afterEach(async () => {
    await manager.afterEach();
  });

  return manager;
}

/**
 * Create cross-environment test suite
 */
export function createCrossEnvironmentTestSuite(config: ICrossEnvironmentConfig): CrossEnvironmentTestRunner {
  return new CrossEnvironmentTestRunner(config);
}

/**
 * Utility to check if running in specific environment
 */
export const environment = {
  isNode: typeof process !== "undefined" && process.versions?.node,
  isBrowser: typeof window !== "undefined",
  nodeVersion: typeof process !== "undefined" ? process.version : null,
  platform: typeof process !== "undefined" ? process.platform : "browser",
} as const;
