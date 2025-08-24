/**
 * Cross-Package Integration Test - Performance Measurement Helpers
 *
 * Utilities for measuring and validating performance of cross-package operations
 * with benchmarking capabilities and performance target validation.
 */

import { performance } from "node:perf_hooks";

/**
 * Performance measurement result
 */
export interface IPerformanceMeasurement {
  /** Operation name */
  operation: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage before operation */
  memoryBefore: NodeJS.MemoryUsage;
  /** Memory usage after operation */
  memoryAfter: NodeJS.MemoryUsage;
  /** Memory delta */
  memoryDelta: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Performance benchmark configuration
 */
export interface IBenchmarkConfig {
  /** Number of iterations to run */
  iterations: number;
  /** Warmup iterations (not counted) */
  warmupIterations?: number;
  /** Target operation time in milliseconds */
  targetTime?: number;
  /** Memory usage target in bytes */
  memoryTarget?: number;
  /** Whether to collect garbage between iterations */
  collectGarbagePerIteration?: boolean;
}

/**
 * Benchmark results
 */
export interface IBenchmarkResults {
  /** Configuration used */
  config: IBenchmarkConfig;
  /** Individual measurements */
  measurements: IPerformanceMeasurement[];
  /** Statistical summary */
  stats: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    p95: number;
    p99: number;
  };
  /** Memory statistics */
  memoryStats: {
    meanHeapUsed: number;
    maxHeapUsed: number;
    meanRss: number;
    maxRss: number;
  };
  /** Whether performance targets were met */
  targetsMetrics: {
    timeTarget: boolean;
    memoryTarget: boolean;
  };
}

/**
 * Cross-package operation performance targets
 */
export const PERFORMANCE_TARGETS = {
  /** Configuration package operations */
  config: {
    /** Configuration loading target: <100ms */
    load: 100,
    /** Configuration validation target: <50ms */
    validation: 50,
    /** Configuration building target: <200ms */
    build: 200,
  },
  /** Logger package operations */
  logger: {
    /** Single log entry: <1ms */
    singleLog: 1,
    /** Batch logging: 10,000 logs/second */
    batchThroughput: 10000,
    /** Transport initialization: <50ms */
    transportInit: 50,
  },
  /** Error handling operations */
  errors: {
    /** Error creation: <1ms */
    creation: 1,
    /** Error serialization: <5ms */
    serialization: 5,
    /** Error recovery: <10ms */
    recovery: 10,
  },
  /** Types package operations */
  types: {
    /** Schema validation: <2ms */
    validation: 2,
    /** Type checking: <5ms */
    typeChecking: 5,
  },
  /** DI container operations */
  di: {
    /** Dependency resolution: <5ms */
    resolution: 5,
    /** Container creation: <20ms */
    containerCreation: 20,
  },
} as const;

/**
 * Performance measurement utility
 */
export class PerformanceMeasurer {
  private measurements = new Map<string, IPerformanceMeasurement[]>();

  /**
   * Measure execution time and memory usage of an operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T> | T,
  ): Promise<{ result: T; measurement: IPerformanceMeasurement }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    try {
      const result = await fn();

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      const measurement: IPerformanceMeasurement = {
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryDelta: {
          rss: memoryAfter.rss - memoryBefore.rss,
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
        },
      };

      // Store measurement
      if (!this.measurements.has(operation)) {
        this.measurements.set(operation, []);
      }
      this.measurements.get(operation)!.push(measurement);

      return { result, measurement };
    } catch (error) {
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      const measurement: IPerformanceMeasurement = {
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryDelta: {
          rss: memoryAfter.rss - memoryBefore.rss,
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
        },
      };

      // Store failed measurement
      if (!this.measurements.has(operation)) {
        this.measurements.set(operation, []);
      }
      this.measurements.get(operation)!.push(measurement);

      throw error;
    }
  }

  /**
   * Run a performance benchmark
   */
  async benchmark<T>(
    operation: string,
    fn: () => Promise<T> | T,
    config: IBenchmarkConfig,
  ): Promise<IBenchmarkResults> {
    const measurements: IPerformanceMeasurement[] = [];

    // Warmup iterations
    if (config.warmupIterations && config.warmupIterations > 0) {
      for (let i = 0; i < config.warmupIterations; i++) {
        await fn();
        if (config.collectGarbagePerIteration && global.gc) {
          global.gc();
        }
      }
    }

    // Actual benchmark iterations
    for (let i = 0; i < config.iterations; i++) {
      const { measurement } = await this.measure(`${operation}-benchmark`, fn);
      measurements.push(measurement);

      if (config.collectGarbagePerIteration && global.gc) {
        global.gc();
      }
    }

    // Calculate statistics
    const durations = measurements.map((m) => m.duration);
    const heapUsages = measurements.map((m) => m.memoryAfter.heapUsed);
    const rssUsages = measurements.map((m) => m.memoryAfter.rss);

    durations.sort((a, b) => a - b);

    const stats = {
      mean: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)] || 0,
      min: durations[0] || 0,
      max: durations[durations.length - 1] || 0,
      stdDev: Math.sqrt(
        durations.reduce(
          (sum, d) => sum + Math.pow(d - durations.reduce((s, v) => s + v, 0) / durations.length, 2),
          0,
        ) / durations.length,
      ),
      p95: durations[Math.floor(durations.length * 0.95)] || 0,
      p99: durations[Math.floor(durations.length * 0.99)] || 0,
    };

    const memoryStats = {
      meanHeapUsed: heapUsages.reduce((sum, h) => sum + h, 0) / heapUsages.length,
      maxHeapUsed: Math.max(...heapUsages),
      meanRss: rssUsages.reduce((sum, r) => sum + r, 0) / rssUsages.length,
      maxRss: Math.max(...rssUsages),
    };

    const targetsMetrics = {
      timeTarget: !config.targetTime || stats.mean <= config.targetTime,
      memoryTarget: !config.memoryTarget || memoryStats.meanHeapUsed <= config.memoryTarget,
    };

    return {
      config,
      measurements,
      stats,
      memoryStats,
      targetsMetrics,
    };
  }

  /**
   * Get all measurements for an operation
   */
  getMeasurements(operation: string): IPerformanceMeasurement[] {
    return this.measurements.get(operation) || [];
  }

  /**
   * Get all stored measurements
   */
  getAllMeasurements(): Map<string, IPerformanceMeasurement[]> {
    return new Map(this.measurements);
  }

  /**
   * Clear measurements for an operation or all operations
   */
  clearMeasurements(operation?: string): void {
    if (operation) {
      this.measurements.delete(operation);
    } else {
      this.measurements.clear();
    }
  }

  /**
   * Validate performance against targets
   */
  validatePerformance(
    operation: string,
    measurement: IPerformanceMeasurement,
    targets: Record<string, number>,
  ): {
    passed: boolean;
    failures: string[];
  } {
    const failures: string[] = [];

    // Extract operation type from operation name
    const operationType = operation.toLowerCase();

    for (const [targetKey, targetValue] of Object.entries(targets)) {
      if (operationType.includes(targetKey.toLowerCase())) {
        if (measurement.duration > targetValue) {
          failures.push(`${operation} took ${measurement.duration.toFixed(2)}ms, target was ${targetValue}ms`);
        }
      }
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    let report = "# Cross-Package Performance Report\n\n";

    report += "## Performance Measurements\n\n";

    for (const [operation, measurements] of Array.from(this.measurements.entries())) {
      const durations = measurements.map((m) => m.duration);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      report += `### ${operation}\n`;
      report += `- Samples: ${measurements.length}\n`;
      report += `- Average: ${avgDuration.toFixed(2)}ms\n`;
      report += `- Min: ${minDuration.toFixed(2)}ms\n`;
      report += `- Max: ${maxDuration.toFixed(2)}ms\n`;
      report += `- Memory Impact: ${measurements[0]?.memoryDelta.heapUsed ? (measurements[0].memoryDelta.heapUsed / 1024).toFixed(2) + "KB" : "N/A"}\n\n`;
    }

    report += "## Performance Targets\n\n";
    report += "| Operation | Target | Current | Status |\n";
    report += "|-----------|---------|---------|--------|\n";

    // Add performance target comparisons
    const allTargets = { ...PERFORMANCE_TARGETS.config, ...PERFORMANCE_TARGETS.logger, ...PERFORMANCE_TARGETS.errors };
    for (const [targetName, targetValue] of Object.entries(allTargets)) {
      const relevantMeasurements = this.measurements.get(targetName) || [];
      if (relevantMeasurements.length > 0) {
        const avgDuration = relevantMeasurements.reduce((sum, m) => sum + m.duration, 0) / relevantMeasurements.length;
        const status = avgDuration <= targetValue ? "✅" : "❌";
        report += `| ${targetName} | ${targetValue}ms | ${avgDuration.toFixed(2)}ms | ${status} |\n`;
      }
    }

    return report;
  }
}

/**
 * Create a performance measurer instance
 */
export function createPerformanceMeasurer(): PerformanceMeasurer {
  return new PerformanceMeasurer();
}

/**
 * Time a function execution
 */
export async function timeExecution<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Memory usage snapshot
 */
export function getMemorySnapshot(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * Force garbage collection if available
 */
export function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

/**
 * Validate operation against performance targets
 */
export function validatePerformanceTarget(
  operationType: keyof typeof PERFORMANCE_TARGETS,
  operation: keyof (typeof PERFORMANCE_TARGETS)[typeof operationType],
  duration: number,
): { passed: boolean; target: number; actual: number } {
  const target = PERFORMANCE_TARGETS[operationType][operation];
  return {
    passed: duration <= target,
    target,
    actual: duration,
  };
}
