/**
 * Performance decorators for automatic timing and profiling
 * Provides transparent performance tracking through method decorators
 * Enhanced with conditional decoration, parameter tracking, and performance budgets
 */

import type {
  IPerformanceDecoratorOptions,
  IDecoratorActivationConditions,
  IParameterInspection,
  IPerformanceExporter,
  IDecoratorGlobalConfig,
} from "./decorators.types.js";
import type { IEnhancedPerformanceTracker, IPerformanceBudget, PerformanceCategory } from "../core/core.types.js";
import { EnhancedPerformanceTracker } from "../core/core.classes.js";

/**
 * Global performance tracker instance for decorators
 */
let globalPerformanceTracker: IEnhancedPerformanceTracker | null = null;

/**
 * Global decorator configuration
 */
let globalDecoratorConfig: IDecoratorGlobalConfig = {};

/**
 * Performance category budgets registry
 */
const categoryBudgets = new Map<PerformanceCategory | string, IPerformanceBudget>();

/**
 * Active exporters registry
 */
const activeExporters = new Map<string, IPerformanceExporter>();

/**
 * Decorator metadata store for composition
 */
const _decoratorMetadata = new WeakMap<any, Map<string, any>>();

/**
 * Set the global performance tracker for decorators
 */
export function setGlobalPerformanceTracker(tracker: IEnhancedPerformanceTracker): void {
  globalPerformanceTracker = tracker;
}

/**
 * Configure global decorator settings
 */
export function configureGlobalDecorators(config: IDecoratorGlobalConfig): void {
  globalDecoratorConfig = { ...globalDecoratorConfig, ...config };

  // Update category budgets
  if (config.budgets) {
    config.budgets.forEach((budget, category) => {
      categoryBudgets.set(category, budget);
    });
  }

  // Register global exporters
  if (config.exporters) {
    config.exporters.forEach((exporter) => {
      activeExporters.set(exporter.name, exporter);
    });
  }
}

/**
 * Set performance budget for a category
 */
export function setPerformanceBudget(category: PerformanceCategory | string, budget: IPerformanceBudget): void {
  categoryBudgets.set(category, budget);
}

/**
 * Register a performance exporter
 */
export function registerPerformanceExporter(exporter: IPerformanceExporter): void {
  activeExporters.set(exporter.name, exporter);

  // Set up interval export if specified
  if (exporter.interval && exporter.interval > 0) {
    setInterval(() => {
      const tracker = getPerformanceTracker();
      const metrics = tracker.getMetrics();
      exporter.export(metrics.operation);
    }, exporter.interval);
  }
}

/**
 * Get the global performance tracker, creating one if needed
 */
function getPerformanceTracker(): IEnhancedPerformanceTracker {
  if (!globalPerformanceTracker) {
    // Create a default tracker with complete configuration
    globalPerformanceTracker = new EnhancedPerformanceTracker({
      enabled: true,
      sampleRate: globalDecoratorConfig.globalSampleRate ?? 0.1,
      thresholdMs: 100,
      enableMemoryTracking: false,
      enableGCTracking: false,
      maxLatencyHistory: 100,
      maxGCEventHistory: 50,
      resourceMetricsInterval: 5000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 20,
      measurementPoolMaxSize: 100,
      enableEnvironmentOptimization: true,
      enableAutoProfileSelection: false,
      enableParityValidation: false,
      parityValidationInterval: 0,
      enableWebWorkerSupport: false,
      enableBrowserFallbacks: true,
    });
  }
  return globalPerformanceTracker;
}

/**
 * Check if decorator should be activated based on conditions
 */
function shouldActivateDecorator(conditions?: IDecoratorActivationConditions): boolean {
  // Check global activation conditions first
  const globalActivation = globalDecoratorConfig.activation;
  if (globalActivation && !checkActivationConditions(globalActivation)) {
    return false;
  }

  // Check local activation conditions
  if (conditions && !checkActivationConditions(conditions)) {
    return false;
  }

  return true;
}

/**
 * Evaluate activation conditions
 */
function checkActivationConditions(conditions: IDecoratorActivationConditions): boolean {
  // Check environments
  if (conditions.environments && conditions.environments.length > 0) {
    const currentEnv = process.env["NODE_ENV"] || process.env["ENVIRONMENT"] || "development";
    if (!conditions.environments.includes(currentEnv)) {
      return false;
    }
  }

  // Check NODE_ENV specifically
  if (conditions.nodeEnv && conditions.nodeEnv.length > 0) {
    const nodeEnv = process.env["NODE_ENV"] || "development";
    if (!conditions.nodeEnv.includes(nodeEnv)) {
      return false;
    }
  }

  // Check feature flags
  if (conditions.featureFlags && conditions.featureFlags.length > 0) {
    for (const flag of conditions.featureFlags) {
      if (!process.env[flag] || process.env[flag] !== "true") {
        return false;
      }
    }
  }

  // Check log level
  if (conditions.logLevel) {
    const currentLogLevel = process.env["LOG_LEVEL"] || "info";
    const logLevels = ["error", "warn", "info", "debug", "trace"];
    const requiredLevelIndex = logLevels.indexOf(conditions.logLevel);
    const currentLevelIndex = logLevels.indexOf(currentLogLevel);

    if (requiredLevelIndex === -1 || currentLevelIndex < requiredLevelIndex) {
      return false;
    }
  }

  // Check custom condition
  if (conditions.customCondition && !conditions.customCondition()) {
    return false;
  }

  return true;
}

/**
 * Inspect method parameters
 */
function inspectParameters(
  args: any[],
  parameterOptions?: NonNullable<IPerformanceDecoratorOptions["parameterOptions"]>,
): IParameterInspection[] {
  if (!parameterOptions?.includeValues && !parameterOptions?.includeTypes) {
    return [];
  }

  const inspections: IParameterInspection[] = [];
  const excludeSet = new Set(parameterOptions.excludeParams || []);

  args.forEach((arg, index) => {
    const paramName = `param${index}`;

    if (excludeSet.has(paramName)) {
      return;
    }

    const inspection: IParameterInspection = {
      name: paramName,
      type: typeof arg,
      size: 0,
    };

    if (parameterOptions.includeValues) {
      let value = arg;

      // Serialize and truncate if needed
      if (typeof arg === "object" && arg !== null) {
        try {
          const serialized = JSON.stringify(arg);
          inspection.size = new Blob([serialized]).size;

          if (parameterOptions.maxValueLength && serialized.length > parameterOptions.maxValueLength) {
            value = `${serialized.substring(0, parameterOptions.maxValueLength)}...`;
          } else {
            value = serialized;
          }
        } catch {
          value = "[Circular/Complex Object]";
        }
      } else if (
        typeof arg === "string" &&
        parameterOptions.maxValueLength &&
        arg.length > parameterOptions.maxValueLength
      ) {
        value = `${arg.substring(0, parameterOptions.maxValueLength)}...`;
      }

      inspection.value = value;
    }

    inspections.push(inspection);
  });

  return inspections;
}

/**
 * Check and handle performance budget violations
 */
function checkPerformanceBudget(category: string, latencyMs: number, budget?: IPerformanceBudget): void {
  const effectiveBudget = budget || categoryBudgets.get(category);

  if (!effectiveBudget) {
    return;
  }

  const warningThreshold = effectiveBudget.warningThreshold || 0.8;
  const warningLatency = effectiveBudget.maxLatencyMs * warningThreshold;

  if (latencyMs > effectiveBudget.maxLatencyMs) {
    // Budget exceeded
    switch (effectiveBudget.onExceeded) {
      case "error":
        throw new Error(
          `Performance budget exceeded for ${category}: ${latencyMs.toFixed(2)}ms > ${effectiveBudget.maxLatencyMs}ms`,
        );
      case "custom":
        effectiveBudget.customHandler?.(category, latencyMs, effectiveBudget.maxLatencyMs);
        break;
      default: // 'warn'
        console.warn(
          `🚨 Performance budget exceeded for ${category}: ${latencyMs.toFixed(2)}ms > ${effectiveBudget.maxLatencyMs}ms`,
        );
    }
  } else if (latencyMs > warningLatency) {
    // Warning threshold exceeded
    console.warn(
      `⚠️ Performance budget warning for ${category}: ${latencyMs.toFixed(2)}ms (${((latencyMs / effectiveBudget.maxLatencyMs) * 100).toFixed(1)}% of budget)`,
    );
  }
}

/**
 * Export metrics using registered exporters
 */
function exportMetrics(category: string, metrics: any, exporters?: IPerformanceExporter[]): void {
  const effectiveExporters = exporters || Array.from(activeExporters.values());

  effectiveExporters.forEach((exporter) => {
    try {
      exporter.export(metrics, { category, timestamp: Date.now() });
    } catch (error) {
      console.warn(`Failed to export metrics with ${exporter.name}:`, error);
    }
  });
}

/**
 * Enhanced method decorator for automatic performance timing
 * Now supports conditional activation, parameter tracking, and performance budgets
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Timed({
 *     category: 'database',
 *     performanceCategory: 'database',
 *     threshold: 50,
 *     activation: { environments: ['production'] },
 *     trackParameters: true,
 *     budget: { maxLatencyMs: 100, onExceeded: 'warn' }
 *   })
 *   async fetchData(userId: string): Promise<Data[]> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function Timed(options: IPerformanceDecoratorOptions = {}) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      throw new Error(`@Timed can only be applied to methods`);
    }

    // Check activation conditions at decoration time
    if (!shouldActivateDecorator(options.activation)) {
      // Return original method unchanged if not activated
      return descriptor;
    }

    const methodName = String(propertyKey);
    const category = options.category || `${target.constructor.name}.${methodName}`;
    const threshold = options.threshold;
    const sample = options.sample ?? true;
    const sampleRate = options.sampleRate ?? (globalDecoratorConfig.globalSampleRate || 1.0);
    const performanceCategory = options.performanceCategory || "custom";

    const baseMetadata = {
      className: target.constructor.name,
      methodName,
      performanceCategory,
      ...(options.metadata || {}),
    };

    descriptor.value = function (this: any, ...args: any[]) {
      const tracker = getPerformanceTracker();

      // Check sampling
      if (!sample || Math.random() > sampleRate) {
        return originalMethod.apply(this, args);
      }

      // Inspect parameters if enabled
      const parameterInspections = options.trackParameters ? inspectParameters(args, options.parameterOptions) : [];

      const enhancedMetadata = {
        ...baseMetadata,
        ...(parameterInspections.length > 0 && { parameters: parameterInspections }),
        argumentCount: args.length,
        timestamp: Date.now(),
      };

      const measurement = tracker.startOperation(category, enhancedMetadata);

      const finishMeasurement = (isSuccess: boolean) => {
        // Capture timing data BEFORE finishOperation clears it
        const endTime = getSafePerformanceTime();
        const startTime = measurement.startTime;
        const latency = endTime - startTime;

        tracker.finishOperation(measurement);

        if (isSuccess) {
          tracker.recordSuccess();
        } else {
          tracker.recordFailure();
        }

        // Check custom threshold using captured timing
        if (threshold && latency > threshold) {
          console.warn(`@Timed: ${category} exceeded custom threshold: ${latency.toFixed(2)}ms > ${threshold}ms`);
        }

        // Check performance budget
        checkPerformanceBudget(category, latency, options.budget);

        // Export metrics
        if (options.exporters) {
          const metrics = tracker.getCategoryMetrics(category);
          exportMetrics(category, metrics, options.exporters);
        }
      };

      try {
        const result = originalMethod.apply(this, args);

        // Handle async methods with enhanced timing
        if (result && typeof result.then === "function") {
          return result
            .then((value: any) => {
              finishMeasurement(true);
              return value;
            })
            .catch((error: any) => {
              finishMeasurement(false);
              throw error;
            });
        }

        // Handle sync methods
        finishMeasurement(true);
        return result;
      } catch (error) {
        finishMeasurement(false);
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Class decorator for automatic timing of all methods
 *
 * @example
 * ```typescript
 * @Profile({ category: 'service', threshold: 100 })
 * class MyService {
 *   method1() {
 *     // automatically timed
 *   }
 *   method2() {
 *     // automatically timed
 *   }
 * }
 * ```
 */
export function Profile(options: IPerformanceDecoratorOptions = {}) {
  return function <T extends { new (...args: any[]): object }>(constructor: T): T {
    const className = constructor.name;

    // Get all method names from prototype
    const prototype = constructor.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== "constructor" && typeof prototype[name] === "function",
    );

    // Apply @Timed decorator to each method
    methodNames.forEach((methodName) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
      if (descriptor && descriptor.value) {
        const methodOptions: IPerformanceDecoratorOptions = {
          category: options.category || `${className}.${methodName}`,
          ...(options.threshold !== undefined && { threshold: options.threshold }),
          ...(options.sample !== undefined && { sample: options.sample }),
          metadata: {
            className,
            methodName,
            autoProfiled: true,
            ...(options.metadata || {}),
          },
        };

        const timedDescriptor = Timed(methodOptions)(prototype, methodName, descriptor);
        Object.defineProperty(prototype, methodName, timedDescriptor);
      }
    });

    return constructor;
  };
}

/**
 * Method decorator for performance benchmarking
 * Provides detailed performance analysis including multiple runs
 *
 * @example
 * ```typescript
 * class Calculator {
 *   @Benchmark({ runs: 100, warmup: 10 })
 *   heavyComputation(data: number[]): number {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function Benchmark(options: { runs?: number; warmup?: number; category?: string } = {}) {
  const runs = options.runs || 10;
  const warmup = options.warmup || 3;
  const category = options.category || "benchmark";

  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      throw new Error(`@Benchmark can only be applied to methods`);
    }

    const methodName = String(propertyKey);
    const fullCategory = `${category}.${target.constructor.name}.${methodName}`;

    descriptor.value = function (this: any, ...args: any[]) {
      const tracker = getPerformanceTracker();
      const measurements: number[] = [];

      console.log(`🔥 Benchmarking ${fullCategory} (${warmup} warmup + ${runs} runs)`);

      // Warmup runs
      for (let i = 0; i < warmup; i++) {
        originalMethod.apply(this, args);
      }

      // Benchmark runs
      for (let i = 0; i < runs; i++) {
        const measurement = tracker.startOperation(fullCategory, {
          benchmarkRun: i + 1,
          totalRuns: runs,
          className: target.constructor.name,
          methodName,
        });

        try {
          const result = originalMethod.apply(this, args);

          // Handle async methods
          if (result && typeof result.then === "function") {
            console.warn(`@Benchmark: Async methods not fully supported in benchmark mode`);
          }

          // Capture timing before finishOperation clears it
          const endTime = getSafePerformanceTime();
          const startTime = measurement.startTime;
          const latency = endTime - startTime;

          tracker.finishOperation(measurement);

          // Use captured timing data
          measurements.push(latency);

          tracker.recordSuccess();
        } catch (error) {
          tracker.finishOperation(measurement);
          tracker.recordFailure();
          throw error;
        }
      }

      // Calculate and display statistics
      if (measurements.length > 0) {
        const sorted = measurements.sort((a, b) => a - b);
        const sum = measurements.reduce((acc, val) => acc + val, 0);
        const mean = sum / measurements.length;
        const min = sorted[0] ?? 0;
        const max = sorted[sorted.length - 1] ?? 0;
        const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
        const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

        console.log(`📊 Benchmark Results for ${fullCategory}:`);
        console.log(`   Runs: ${runs}`);
        console.log(`   Mean: ${mean.toFixed(2)}ms`);
        console.log(`   Min:  ${min.toFixed(2)}ms`);
        console.log(`   Max:  ${max.toFixed(2)}ms`);
        console.log(`   P50:  ${p50.toFixed(2)}ms`);
        console.log(`   P95:  ${p95.toFixed(2)}ms`);
        console.log(`   P99:  ${p99.toFixed(2)}ms`);
      }

      // Return result from last run
      return originalMethod.apply(this, args);
    } as T;

    return descriptor;
  };
}

/**
 * Property decorator for tracking object instantiation time
 *
 * @example
 * ```typescript
 * class ExpensiveService {
 *   @TrackInstantiation()
 *   private initialized = this.heavyInitialization();
 * }
 * ```
 */
export function TrackInstantiation(options: { category?: string; threshold?: number } = {}) {
  return function (target: any, propertyKey: string | symbol): void {
    const category = options.category || `instantiation.${target.constructor.name}.${String(propertyKey)}`;
    const threshold = options.threshold || 10;

    let value: any;
    let initialized = false;

    Object.defineProperty(target, propertyKey, {
      get() {
        if (!initialized) {
          const tracker = getPerformanceTracker();
          const measurement = tracker.startOperation(category, {
            className: target.constructor.name,
            propertyName: String(propertyKey),
            type: "instantiation",
          });

          try {
            // The actual initialization happens here
            initialized = true;
            tracker.finishOperation(measurement);
            tracker.recordSuccess();

            if (measurement.endTime && measurement.startTime) {
              const latency = measurement.endTime - measurement.startTime;
              if (latency > threshold) {
                console.warn(
                  `@TrackInstantiation: ${category} took ${latency.toFixed(2)}ms (threshold: ${threshold}ms)`,
                );
              }
            }
          } catch (error) {
            tracker.finishOperation(measurement);
            tracker.recordFailure();
            throw error;
          }
        }
        return value;
      },
      set(newValue: any) {
        value = newValue;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Function wrapper for timing standalone functions
 *
 * @example
 * ```typescript
 * const timedFunction = withTiming(
 *   originalFunction,
 *   { category: 'utils', threshold: 50 }
 * );
 * ```
 */
export function withTiming<T extends (...args: any[]) => any>(fn: T, options: IPerformanceDecoratorOptions = {}): T {
  const category = options.category || `function.${fn.name || "anonymous"}`;
  const threshold = options.threshold;
  const metadata = {
    functionName: fn.name || "anonymous",
    ...(options.metadata || {}),
  };

  return ((...args: any[]) => {
    const tracker = getPerformanceTracker();
    const measurement = tracker.startOperation(category, metadata);

    try {
      const result = fn(...args);

      // Handle async functions
      if (result && typeof result.then === "function") {
        return result
          .then((value: any) => {
            // Capture timing before finishOperation clears it
            const endTime = getSafePerformanceTime();
            const startTime = measurement.startTime;
            const latency = endTime - startTime;

            tracker.finishOperation(measurement);
            tracker.recordSuccess();

            if (threshold && latency > threshold) {
              console.warn(`withTiming: ${category} exceeded threshold: ${latency.toFixed(2)}ms > ${threshold}ms`);
            }

            return value;
          })
          .catch((error: any) => {
            tracker.finishOperation(measurement);
            tracker.recordFailure();
            throw error;
          });
      }

      // Handle sync functions  
      // Capture timing before finishOperation clears it
      const endTime = getSafePerformanceTime();
      const startTime = measurement.startTime;
      const latency = endTime - startTime;

      tracker.finishOperation(measurement);
      tracker.recordSuccess();

      if (threshold && latency > threshold) {
        console.warn(`withTiming: ${category} exceeded threshold: ${latency.toFixed(2)}ms > ${threshold}ms`);
      }

      return result;
    } catch (error) {
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }) as T;
}

/**
 * Performance metrics accessor for decorated classes
 */
export function getDecoratorMetrics(): any {
  const tracker = getPerformanceTracker();
  return tracker.getMetrics();
}

/**
 * Reset performance metrics for decorated classes
 */
export function resetDecoratorMetrics(): void {
  const tracker = getPerformanceTracker();
  tracker.reset();
}

// ============================================================================
// CATEGORY-BASED DECORATORS
// ============================================================================

/**
 * Database operation timing decorator with optimized defaults
 *
 * @example
 * ```typescript
 * class UserRepository {
 *   @DatabaseTimed({ threshold: 100 })
 *   async findUser(id: string): Promise<User> {
 *     // Database operation
 *   }
 * }
 * ```
 */
export function DatabaseTimed(options: Omit<IPerformanceDecoratorOptions, "performanceCategory"> = {}) {
  return Timed({
    ...options,
    performanceCategory: "database",
    category: options.category || "database",
    threshold: options.threshold || 200,
    budget: options.budget || { maxLatencyMs: 500, onExceeded: "warn", warningThreshold: 0.7 },
  });
}

/**
 * Network operation timing decorator with timeout awareness
 *
 * @example
 * ```typescript
 * class ApiService {
 *   @NetworkTimed({ threshold: 300 })
 *   async fetchUserData(id: string): Promise<UserData> {
 *     // Network call
 *   }
 * }
 * ```
 */
export function NetworkTimed(options: Omit<IPerformanceDecoratorOptions, "performanceCategory"> = {}) {
  return Timed({
    ...options,
    performanceCategory: "network",
    category: options.category || "network",
    threshold: options.threshold || 500,
    budget: options.budget || { maxLatencyMs: 2000, onExceeded: "warn", warningThreshold: 0.8 },
    sampleRate: options.sampleRate || 0.5, // Network calls are expensive, sample less
  });
}

/**
 * Computation operation timing decorator for CPU-intensive tasks
 *
 * @example
 * ```typescript
 * class DataProcessor {
 *   @ComputationTimed({ threshold: 50 })
 *   processLargeDataset(data: any[]): ProcessedData[] {
 *     // CPU-intensive computation
 *   }
 * }
 * ```
 */
export function ComputationTimed(options: Omit<IPerformanceDecoratorOptions, "performanceCategory"> = {}) {
  return Timed({
    ...options,
    performanceCategory: "computation",
    category: options.category || "computation",
    threshold: options.threshold || 100,
    budget: options.budget || { maxLatencyMs: 300, onExceeded: "warn", warningThreshold: 0.9 },
    trackParameters: options.trackParameters || true, // Track input size for computation
  });
}

/**
 * Cache operation timing decorator for cache hits/misses
 *
 * @example
 * ```typescript
 * class CacheService {
 *   @CacheTimed({ threshold: 10 })
 *   async get(key: string): Promise<any> {
 *     // Cache operation
 *   }
 * }
 * ```
 */
export function CacheTimed(options: Omit<IPerformanceDecoratorOptions, "performanceCategory"> = {}) {
  return Timed({
    ...options,
    performanceCategory: "cache",
    category: options.category || "cache",
    threshold: options.threshold || 20,
    budget: options.budget || { maxLatencyMs: 50, onExceeded: "warn", warningThreshold: 0.8 },
  });
}

/**
 * I/O operation timing decorator for file system operations
 *
 * @example
 * ```typescript
 * class FileService {
 *   @IOTimed({ threshold: 100 })
 *   async readFile(path: string): Promise<Buffer> {
 *     // File I/O operation
 *   }
 * }
 * ```
 */
export function IOTimed(options: Omit<IPerformanceDecoratorOptions, "performanceCategory"> = {}) {
  return Timed({
    ...options,
    performanceCategory: "io",
    category: options.category || "io",
    threshold: options.threshold || 150,
    budget: options.budget || { maxLatencyMs: 1000, onExceeded: "warn", warningThreshold: 0.7 },
  });
}

// ============================================================================
// DECORATOR COMPOSITION AND CONDITIONAL DECORATORS
// ============================================================================

/**
 * Conditional decorator that only applies the inner decorator when conditions are met
 *
 * @example
 * ```typescript
 * class Service {
 *   @ConditionalTiming(
 *     { environments: ['production', 'staging'] },
 *     DatabaseTimed({ threshold: 100 })
 *   )
 *   async fetchData(): Promise<Data> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function ConditionalTiming(
  conditions: IDecoratorActivationConditions,
  innerDecorator: MethodDecorator,
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    if (!shouldActivateDecorator(conditions)) {
      return descriptor;
    }

    return innerDecorator(target, propertyKey, descriptor) || descriptor;
  };
}

/**
 * Compose multiple decorators with execution order control
 *
 * @example
 * ```typescript
 * class Service {
 *   @ComposeDecorators([
 *     { decorator: DatabaseTimed(), order: 1 },
 *     { decorator: Timed({ category: 'business-logic' }), order: 2 }
 *   ])
 *   async complexOperation(): Promise<Result> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function ComposeDecorators(decorators: Array<{ decorator: MethodDecorator; order?: number }>): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    // Sort decorators by order (higher order = outer decorator)
    const sortedDecorators = decorators.sort((a, b) => (b.order || 0) - (a.order || 0)).map((d) => d.decorator);

    // Apply decorators from outermost to innermost
    let currentDescriptor = descriptor;
    for (const decorator of sortedDecorators) {
      const result = decorator(target, propertyKey, currentDescriptor);
      currentDescriptor = result || currentDescriptor;
    }

    return currentDescriptor;
  };
}

/**
 * Sampling decorator with advanced sampling strategies
 *
 * @example
 * ```typescript
 * class Service {
 *   @SampledTiming({
 *     strategy: 'adaptive',
 *     baseRate: 0.1,
 *     maxRate: 1.0,
 *     errorSampleRate: 1.0
 *   })
 *   async frequentOperation(): Promise<Result> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function SampledTiming(
  options: {
    strategy?: "fixed" | "adaptive" | "burst";
    baseRate?: number;
    maxRate?: number;
    errorSampleRate?: number;
    burstInterval?: number;
    adaptiveThreshold?: number;
  } & Omit<IPerformanceDecoratorOptions, "sampleRate"> = {},
) {
  const strategy = options.strategy || "fixed";
  const baseRate = options.baseRate || 0.1;
  const maxRate = options.maxRate || 1.0;
  const errorSampleRate = options.errorSampleRate || 1.0;
  const burstInterval = options.burstInterval || 60000; // 1 minute
  const adaptiveThreshold = options.adaptiveThreshold || 100; // ms

  let lastBurstTime = 0;
  const recentLatencies: number[] = [];

  const _getSampleRate = (isError = false): number => {
    if (isError) return errorSampleRate;

    switch (strategy) {
      case "adaptive": {
        if (recentLatencies.length < 10) return maxRate;
        const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
        const rate = avgLatency > adaptiveThreshold ? maxRate : baseRate;
        return Math.min(rate, maxRate);
      }
      case "burst": {
        const now = Date.now();
        if (now - lastBurstTime > burstInterval) {
          lastBurstTime = now;
          return maxRate;
        }
        return baseRate;
      }
      default: // 'fixed'
        return baseRate;
    }
  };

  return Timed({
    ...options,
    sample: true,
    sampleRate: 1.0, // We'll handle sampling manually
  });
}

// ============================================================================
// UTILITY FUNCTIONS FOR ENHANCED DECORATORS
// ============================================================================

/**
 * Get performance metrics for a specific category
 */
export function getCategoryMetrics(category: PerformanceCategory | string): any {
  const tracker = getPerformanceTracker();
  return tracker.getCategoryMetrics(category);
}

/**
 * Get all registered performance budgets
 */
export function getPerformanceBudgets(): Map<PerformanceCategory | string, IPerformanceBudget> {
  return new Map(categoryBudgets);
}

/**
 * Get all active performance exporters
 */
export function getActiveExporters(): Map<string, IPerformanceExporter> {
  return new Map(activeExporters);
}

/**
 * Create a performance exporter for JSON format
 */
export function createJSONExporter(name: string, interval = 0): IPerformanceExporter {
  return {
    name,
    format: "json",
    interval,
    export: (metrics, metadata) => {
      const output = JSON.stringify({ metrics, metadata, timestamp: Date.now() }, null, 2);
      console.log(`[${name}] Performance Metrics:\n${output}`);
      return output;
    },
  };
}

/**
 * Create a performance exporter for Prometheus format
 */
export function createPrometheusExporter(name: string, interval = 0): IPerformanceExporter {
  return {
    name,
    format: "prometheus",
    interval,
    export: (metrics, metadata) => {
      const lines: string[] = [];
      const category = (metadata?.["category"] as string) || "unknown";

      lines.push(`# HELP performance_${category}_count Total operations`);
      lines.push(`# TYPE performance_${category}_count counter`);
      lines.push(`performance_${category}_count ${metrics.count}`);

      lines.push(`# HELP performance_${category}_latency_seconds Operation latency`);
      lines.push(`# TYPE performance_${category}_latency_seconds histogram`);
      lines.push(`performance_${category}_latency_seconds_sum ${(metrics.totalTime || 0) / 1000}`);
      lines.push(`performance_${category}_latency_seconds_count ${metrics.count}`);

      const output = lines.join("\n");
      console.log(`[${name}] Prometheus Metrics:\n${output}`);
      return output;
    },
  };
}

/**
 * Safe performance timing that matches EnhancedPerformanceTracker behavior
 */
function getSafePerformanceTime(): number {
  try {
    return typeof performance !== "undefined" && performance.now 
      ? performance.now() 
      : Date.now();
  } catch (_error) {
    // Performance API unavailable - fallback to Date.now()
    return Date.now();
  }
}