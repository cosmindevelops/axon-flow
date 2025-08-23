# Enhanced Performance Tracker API Reference

Complete API documentation for the enhanced performance tracking system.

## Table of Contents

- [Core Classes](#core-classes)
- [Decorators](#decorators)
- [Types & Interfaces](#types--interfaces)
- [Configuration](#configuration)
- [Utility Functions](#utility-functions)
- [Error Handling](#error-handling)

## Core Classes

### EnhancedPerformanceTracker

Main performance tracking class with comprehensive monitoring capabilities.

#### Constructor

```typescript
new EnhancedPerformanceTracker(config: IEnhancedPerformanceConfig)
```

**Parameters:**

- `config` - Configuration object defining tracking behavior

**Example:**

```typescript
const tracker = new EnhancedPerformanceTracker({
  enabled: true,
  sampleRate: 0.1,
  thresholdMs: 100,
  enableMemoryTracking: true,
  enableGCTracking: true,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 50,
  measurementPoolMaxSize: 200,
});
```

#### Methods

##### `startOperation(category?: string, metadata?: Record<string, unknown>): IPerformanceMeasurement`

Starts timing an operation and returns a measurement object.

**Parameters:**

- `category` (optional) - Operation category for classification
- `metadata` (optional) - Additional metadata to associate with the measurement

**Returns:** `IPerformanceMeasurement` - Measurement object for tracking the operation

**Example:**

```typescript
const measurement = tracker.startOperation("database", {
  query: "SELECT * FROM users",
  table: "users",
});
```

##### `finishOperation(measurement: IPerformanceMeasurement): void`

Completes timing an operation and records the measurement.

**Parameters:**

- `measurement` - The measurement object returned from `startOperation`

**Example:**

```typescript
tracker.finishOperation(measurement);
```

##### `getMetrics(): IEnhancedPerformanceMetrics`

Returns comprehensive performance metrics including operation, resource, and GC data.

**Returns:** `IEnhancedPerformanceMetrics` - Complete performance metrics object

**Example:**

```typescript
const metrics = tracker.getMetrics();
console.log({
  avgLatency: metrics.operation.averageLatency,
  p95Latency: metrics.operation.p95Latency,
  memoryUtilization: metrics.resource.memory.utilization,
  gcEvents: metrics.gcEvents.length,
});
```

##### `getCategoryMetrics(category: string): IOperationMetrics`

Returns performance metrics for a specific operation category.

**Parameters:**

- `category` - The operation category to retrieve metrics for

**Returns:** `IOperationMetrics` - Category-specific performance metrics

**Example:**

```typescript
const dbMetrics = tracker.getCategoryMetrics("database");
console.log(`Database avg latency: ${dbMetrics.averageLatency}ms`);
```

##### `getMemoryAnalysis(): MemoryAnalysis`

Returns comprehensive memory health analysis including leak detection and recommendations.

**Returns:** Memory analysis object with health status, trends, and recommendations

**Example:**

```typescript
const memoryAnalysis = tracker.getMemoryAnalysis();
if (memoryAnalysis.leakDetected) {
  console.error("Memory leak detected!", memoryAnalysis.recommendations);
}
```

##### `getPlatformInfo(): IPlatformInfo`

Returns detailed platform information and capabilities.

**Returns:** `IPlatformInfo` - Platform detection and capability information

**Example:**

```typescript
const platform = tracker.getPlatformInfo();
console.log(`Running on ${platform.isNode ? "Node.js" : "Browser"}`);
console.log(`Recommended pool size: ${platform.capabilities.recommendedPoolSize}`);
```

##### `validatePerformanceParity(): IPerformanceParityReport`

Validates performance parity across environments and returns variance report.

**Returns:** `IPerformanceParityReport` - Performance parity validation report

**Example:**

```typescript
const parityReport = tracker.validatePerformanceParity();
if (!parityReport.parityMaintained) {
  console.warn(`Performance variance: ${parityReport.variance.toFixed(1)}%`);
}
```

##### `updateConfig(config: Partial<IEnhancedPerformanceConfig>): void`

Updates the tracker configuration dynamically.

**Parameters:**

- `config` - Partial configuration object with properties to update

**Example:**

```typescript
tracker.updateConfig({
  sampleRate: 0.5,
  thresholdMs: 150,
  enableGCTracking: false,
});
```

##### `reset(): void`

Resets all collected metrics and clears measurement history.

**Example:**

```typescript
tracker.reset();
```

##### `setEnabled(enabled: boolean): void`

Enables or disables performance tracking.

**Parameters:**

- `enabled` - Whether to enable performance tracking

**Example:**

```typescript
tracker.setEnabled(false); // Disable tracking
```

---

### MemoryMonitor

Advanced memory monitoring class with leak detection and trend analysis.

#### Methods

##### `getMemoryMetrics(): IMemoryMetrics`

Returns current memory usage metrics.

**Returns:** `IMemoryMetrics` - Current memory utilization data

##### `startMonitoring(): void`

Begins continuous memory monitoring with periodic snapshots.

##### `stopMonitoring(): void`

Stops memory monitoring and clears intervals.

##### `isMemoryHealthy(): boolean`

Checks if current memory usage is within healthy thresholds.

**Returns:** Boolean indicating memory health status

##### `getMemoryTrend(): "increasing" | "decreasing" | "stable"`

Analyzes memory usage trend using linear regression.

**Returns:** String describing memory trend direction

##### `detectMemoryLeak(): boolean`

Detects potential memory leaks using sliding window analysis.

**Returns:** Boolean indicating if a memory leak is detected

##### `getMemoryPressure(): "low" | "medium" | "high" | "critical"`

Determines current memory pressure level.

**Returns:** String indicating memory pressure level

##### `getMemoryGrowthRate(): number`

Calculates memory growth rate in MB/minute.

**Returns:** Memory growth rate as a number

---

### MeasurementPool

High-efficiency object pool for performance measurements with dynamic scaling.

#### Methods

##### `acquire(): IPerformanceMeasurement`

Gets a measurement object from the pool, creating new ones if needed.

**Returns:** `IPerformanceMeasurement` - A measurement object ready for use

##### `release(measurement: IPerformanceMeasurement): void`

Returns a measurement object to the pool for reuse.

**Parameters:**

- `measurement` - The measurement object to return to the pool

##### `getUtilization(): number`

Returns current pool utilization as a percentage.

**Returns:** Pool utilization percentage (0-100)

##### `getEfficiencyMetrics(): PoolEfficiencyMetrics`

Returns detailed pool efficiency metrics including reuse rates.

**Returns:** Object containing efficiency metrics

```typescript
interface PoolEfficiencyMetrics {
  reuseRate: number; // Percentage of objects reused
  hitRate: number; // Percentage of acquisitions from pool
  totalAcquisitions: number;
  totalCreations: number;
  poolSize: number;
  activeCount: number;
  availableCount: number;
}
```

##### `resize(newSize: number): void`

Dynamically resizes the pool to the specified size.

**Parameters:**

- `newSize` - New maximum pool size

##### `warmUp(targetSize?: number): void`

Preemptively populates the pool with objects.

**Parameters:**

- `targetSize` (optional) - Number of objects to pre-create

##### `compact(): void`

Removes unused objects to optimize memory usage.

---

### MetricsAggregator

Statistical analysis engine for performance metrics with export capabilities.

#### Methods

##### `addMeasurement(latency: number, category?: string): void`

Adds a latency measurement for statistical analysis.

**Parameters:**

- `latency` - Operation latency in milliseconds
- `category` (optional) - Operation category

##### `getAggregatedMetrics(): IOperationMetrics`

Returns aggregated metrics with percentiles and statistical analysis.

**Returns:** `IOperationMetrics` - Comprehensive operation metrics

##### `getCategoryMetrics(category: string): IOperationMetrics`

Returns metrics for a specific category.

**Parameters:**

- `category` - Category to retrieve metrics for

**Returns:** `IOperationMetrics` - Category-specific metrics

##### `exportMetrics(format: "json" | "prometheus"): string`

Exports metrics in the specified format.

**Parameters:**

- `format` - Export format ("json" or "prometheus")

**Returns:** Formatted metrics string

##### `reset(): void`

Clears all collected metrics and resets counters.

---

### PerformancePlatformDetector

Cross-environment platform detection and optimization class.

#### Methods

##### `getInstance(): PerformancePlatformDetector`

Returns the singleton instance of the platform detector.

**Returns:** `PerformancePlatformDetector` - Singleton instance

##### `getPlatformInfo(): IPlatformInfo`

Returns detailed platform information and capabilities.

**Returns:** `IPlatformInfo` - Platform detection results

##### `getEnvironmentProfile(environment?: string): IEnvironmentProfile`

Returns optimized configuration profile for the specified environment.

**Parameters:**

- `environment` (optional) - Target environment name

**Returns:** `IEnvironmentProfile` - Optimized configuration profile

##### `validateEnvironmentCompatibility(): CompatibilityReport`

Validates current environment compatibility with performance tracking features.

**Returns:** Compatibility report with issues and recommendations

```typescript
interface CompatibilityReport {
  compatible: boolean;
  issues: string[];
}
```

## Decorators

### @Timed

Method decorator for automatic performance timing with advanced features.

#### Signature

```typescript
@Timed(options?: IPerformanceDecoratorOptions)
```

#### Options

```typescript
interface IPerformanceDecoratorOptions {
  category?: string; // Operation category
  performanceCategory?: PerformanceCategory; // Performance classification
  threshold?: number; // Custom threshold in ms
  sample?: boolean; // Enable sampling
  sampleRate?: number; // Sampling rate (0-1)
  metadata?: Record<string, unknown>; // Additional metadata
  activation?: IDecoratorActivationConditions; // Activation conditions
  budget?: IPerformanceBudget; // Performance budget
  trackParameters?: boolean; // Include parameter inspection
  parameterOptions?: ParameterOptions; // Parameter tracking options
  exporters?: IPerformanceExporter[]; // Custom exporters
}
```

#### Example

```typescript
class UserService {
  @Timed({
    category: "user-service",
    performanceCategory: "database",
    threshold: 100,
    trackParameters: true,
    budget: { maxLatencyMs: 200, onExceeded: "warn" },
    activation: { environments: ["production"] },
  })
  async findUser(id: string): Promise<User> {
    return await this.repository.findById(id);
  }
}
```

---

### @Profile

Class decorator for automatic timing of all methods.

#### Signature

```typescript
@Profile(options?: IPerformanceDecoratorOptions)
```

#### Example

```typescript
@Profile({
  category: "payment-service",
  threshold: 50,
  activation: { nodeEnv: ["production"] },
})
class PaymentService {
  processPayment(amount: number): PaymentResult {
    /*...*/
  }
  validateCard(card: CreditCard): ValidationResult {
    /*...*/
  }
}
```

---

### @Benchmark

Method decorator for performance benchmarking with statistical analysis.

#### Signature

```typescript
@Benchmark(options?: BenchmarkOptions)
```

#### Options

```typescript
interface BenchmarkOptions {
  runs?: number; // Number of benchmark runs (default: 10)
  warmup?: number; // Warmup runs (default: 3)
  category?: string; // Benchmark category
}
```

#### Example

```typescript
class DataProcessor {
  @Benchmark({ runs: 100, warmup: 10, category: "data-processing" })
  processLargeDataset(data: any[]): ProcessedData[] {
    return data.map((item) => this.transform(item));
  }
}
```

---

### Category-Specific Decorators

#### @DatabaseTimed

Optimized decorator for database operations.

```typescript
@DatabaseTimed({ threshold: 200, trackParameters: true })
async findUser(id: string): Promise<User> { }
```

#### @NetworkTimed

Optimized decorator for network operations.

```typescript
@NetworkTimed({ threshold: 1000, budget: { maxLatencyMs: 2000, onExceeded: 'warn' } })
async apiCall(): Promise<ApiResponse> { }
```

#### @ComputationTimed

Optimized decorator for CPU-intensive operations.

```typescript
@ComputationTimed({ threshold: 100, trackParameters: true })
processData(data: any[]): ProcessedData[] { }
```

#### @CacheTimed

Optimized decorator for cache operations.

```typescript
@CacheTimed({ threshold: 25 })
async getCachedValue(key: string): Promise<any> { }
```

#### @IOTimed

Optimized decorator for I/O operations.

```typescript
@IOTimed({ threshold: 150 })
async readFile(path: string): Promise<Buffer> { }
```

---

### Advanced Decorators

#### @ConditionalTiming

Decorator that only applies timing when conditions are met.

```typescript
@ConditionalTiming(
  { environments: ['production'] },
  DatabaseTimed({ threshold: 100 })
)
async heavyQuery(): Promise<Data[]> { }
```

#### @SampledTiming

Decorator with advanced sampling strategies.

```typescript
@SampledTiming({
  strategy: 'adaptive',
  baseRate: 0.1,
  maxRate: 1.0,
  adaptiveThreshold: 200
})
async frequentOperation(): Promise<void> { }
```

#### @ComposeDecorators

Compose multiple decorators with execution order control.

```typescript
@ComposeDecorators([
  { decorator: NetworkTimed(), order: 1 },
  { decorator: Timed({ category: 'business-logic' }), order: 2 }
])
async complexOperation(): Promise<Result> { }
```

## Types & Interfaces

### Core Interfaces

#### IEnhancedPerformanceConfig

```typescript
interface IEnhancedPerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1
  thresholdMs: number;
  enableMemoryTracking: boolean;
  enableGCTracking: boolean;
  maxLatencyHistory: number;
  maxGCEventHistory: number;
  resourceMetricsInterval: number;
  enableMeasurementPooling: boolean;
  measurementPoolInitialSize: number;
  measurementPoolMaxSize: number;
  enableEnvironmentOptimization: boolean;
  enableAutoProfileSelection: boolean;
  customProfile?: IEnvironmentProfile;
  enableParityValidation: boolean;
  parityValidationInterval: number;
  enableWebWorkerSupport: boolean;
  enableBrowserFallbacks: boolean;
}
```

#### IEnhancedPerformanceMetrics

```typescript
interface IEnhancedPerformanceMetrics {
  // Legacy compatibility fields
  logsPerSecond: number;
  averageLatencyMs: number;
  peakLatencyMs: number;
  totalLogs: number;
  failedLogs: number;
  circuitBreakerState: CircuitBreakerState;
  objectPoolUtilization: number;

  // Enhanced fields
  operation: IOperationMetrics;
  resource: IResourceMetrics;
  gcEvents: IGCEvent[];
  measurementPoolUtilization: number;
  timestamp: number;
  uptimeSeconds: number;
}
```

#### IOperationMetrics

```typescript
interface IOperationMetrics {
  count: number;
  throughput: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  standardDeviation: number;
  totalTime: number;
}
```

#### IMemoryMetrics

```typescript
interface IMemoryMetrics {
  rss: number; // Resident Set Size
  heapTotal: number; // Heap total size
  heapUsed: number; // Heap used size
  external: number; // External memory
  arrayBuffers: number; // Array buffers allocated
  utilization: number; // Memory utilization percentage
}
```

#### IResourceMetrics

```typescript
interface IResourceMetrics {
  cpuUsage: number;
  memory: IMemoryMetrics;
  eventLoopDelay?: number;
  uptime: number;
  loadAverage?: number[];
}
```

#### IGCEvent

```typescript
interface IGCEvent {
  type: string; // GC event type
  duration: number; // Duration in milliseconds
  timestamp: number; // Event timestamp
  memoryFreed?: number; // Memory freed during GC
}
```

### Platform & Environment

#### IPlatformInfo

```typescript
interface IPlatformInfo {
  isNode: boolean;
  isBrowser: boolean;
  isWebWorker: boolean;
  isServiceWorker: boolean;
  isSharedWorker: boolean;
  isDedicatedWorker: boolean;
  isElectron: boolean;
  isReactNative: boolean;
  isDeno: boolean;
  isBun: boolean;
  hasGCSupport: boolean;
  hasPerformanceNow: boolean;
  hasMemoryAPI: boolean;
  hasPerformanceObserver: boolean;
  hasPerformanceTimeline: boolean;
  hasResourceTiming: boolean;
  hasUserTiming: boolean;
  hasNavigationTiming: boolean;
  nodeVersion?: string;
  browserName?: string;
  browserVersion?: string;
  capabilities: IPlatformCapabilities;
}
```

#### IPlatformCapabilities

```typescript
interface IPlatformCapabilities {
  maxConcurrentObservations: number;
  supportsAsyncOperations: boolean;
  supportsAdvancedMemory: boolean;
  supportsCPUProfiling: boolean;
  supportsHeapSnapshots: boolean;
  recommendedPoolSize: number;
  optimalSampleRate: number;
  performanceBudgetMultiplier: number;
}
```

#### IEnvironmentProfile

```typescript
interface IEnvironmentProfile {
  name: string;
  environment: string;
  config: Partial<IEnhancedPerformanceConfig>;
  features: {
    memoryTracking: boolean;
    gcTracking: boolean;
    resourceMetrics: boolean;
    advancedProfiling: boolean;
  };
  thresholds: {
    warning: number;
    critical: number;
    sampling: number;
  };
}
```

### Performance Budgets & Categories

#### PerformanceCategory

```typescript
type PerformanceCategory =
  | "database"
  | "network"
  | "computation"
  | "io"
  | "cache"
  | "auth"
  | "validation"
  | "serialization"
  | "custom";
```

#### IPerformanceBudget

```typescript
interface IPerformanceBudget {
  maxLatencyMs: number;
  warningThreshold?: number; // Percentage of max (default: 0.8)
  onExceeded?: "warn" | "error" | "custom";
  customHandler?: (category: string, actualMs: number, budgetMs: number) => void;
}
```

#### IDecoratorActivationConditions

```typescript
interface IDecoratorActivationConditions {
  environments?: string[]; // Enable in specific environments
  nodeEnv?: string[]; // Enable for specific NODE_ENV values
  featureFlags?: string[]; // Enable when feature flags are set
  customCondition?: () => boolean; // Custom activation logic
  logLevel?: string; // Enable based on log level
}
```

### Measurement & Pool

#### IPerformanceMeasurement

```typescript
interface IPerformanceMeasurement {
  id: string;
  startTime: number;
  endTime?: number;
  category: string;
  metadata?: Record<string, unknown>;
  inUse: boolean;
}
```

### Export & Metrics

#### IPerformanceExporter

```typescript
interface IPerformanceExporter {
  name: string;
  format: "json" | "prometheus" | "csv" | "custom";
  export: (metrics: IOperationMetrics, metadata?: Record<string, unknown>) => string | void;
  interval?: number; // Export interval in ms (0 for manual)
}
```

#### IPerformanceParityReport

```typescript
interface IPerformanceParityReport {
  environment: string;
  baseline: IOperationMetrics;
  current: IOperationMetrics;
  variance: number; // Performance variance percentage
  parityMaintained: boolean; // Whether parity is maintained (<10% variance)
  recommendations: string[];
  timestamp: number;
}
```

## Configuration

### Default Configurations by Environment

#### Development

```typescript
const developmentConfig: IEnhancedPerformanceConfig = {
  enabled: true,
  sampleRate: 1.0,
  thresholdMs: 50,
  enableMemoryTracking: true,
  enableGCTracking: true,
  maxLatencyHistory: 500,
  maxGCEventHistory: 100,
  resourceMetricsInterval: 2000,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 25,
  measurementPoolMaxSize: 100,
  enableEnvironmentOptimization: true,
  enableAutoProfileSelection: true,
  enableParityValidation: true,
  parityValidationInterval: 60000,
  enableWebWorkerSupport: false,
  enableBrowserFallbacks: true,
};
```

#### Production

```typescript
const productionConfig: IEnhancedPerformanceConfig = {
  enabled: true,
  sampleRate: 0.1,
  thresholdMs: 100,
  enableMemoryTracking: true,
  enableGCTracking: true,
  maxLatencyHistory: 2000,
  maxGCEventHistory: 100,
  resourceMetricsInterval: 10000,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 100,
  measurementPoolMaxSize: 500,
  enableEnvironmentOptimization: true,
  enableAutoProfileSelection: true,
  enableParityValidation: false,
  parityValidationInterval: 0,
  enableWebWorkerSupport: false,
  enableBrowserFallbacks: true,
};
```

## Utility Functions

### Global Configuration Functions

#### `setGlobalPerformanceTracker(tracker: IEnhancedPerformanceTracker): void`

Sets the global performance tracker instance for decorators.

#### `configureGlobalDecorators(config: IDecoratorGlobalConfig): void`

Configures global decorator settings including budgets and exporters.

#### `setPerformanceBudget(category: PerformanceCategory | string, budget: IPerformanceBudget): void`

Sets a performance budget for a specific category.

#### `registerPerformanceExporter(exporter: IPerformanceExporter): void`

Registers a performance exporter for automated metrics export.

### Exporter Factory Functions

#### `createJSONExporter(name: string, interval?: number): IPerformanceExporter`

Creates a JSON format performance exporter.

#### `createPrometheusExporter(name: string, interval?: number): IPerformanceExporter`

Creates a Prometheus format performance exporter.

### Metrics Access Functions

#### `getCategoryMetrics(category: PerformanceCategory | string): IOperationMetrics`

Gets performance metrics for a specific category.

#### `getPerformanceBudgets(): Map<PerformanceCategory | string, IPerformanceBudget>`

Returns all registered performance budgets.

#### `getActiveExporters(): Map<string, IPerformanceExporter>`

Returns all active performance exporters.

### Function Wrapper

#### `withTiming<T>(fn: T, options?: IPerformanceDecoratorOptions): T`

Wraps a function with performance timing without using decorators.

```typescript
const timedFunction = withTiming(originalFunction, {
  category: "utils",
  threshold: 50,
});
```

## Error Handling

### Common Errors

#### Configuration Errors

- **Invalid sample rate**: Must be between 0 and 1
- **Invalid pool size**: Initial size must be <= max size
- **Invalid threshold**: Must be a positive number

#### Runtime Errors

- **Platform incompatibility**: Feature not supported in current environment
- **Memory pressure**: Critical memory usage detected
- **Pool exhaustion**: Measurement pool cannot allocate new objects

### Error Recovery

The enhanced performance tracker includes built-in error recovery:

1. **Graceful Degradation**: Falls back to basic timing if advanced features fail
2. **Pool Recovery**: Automatically compacts and resizes pools when issues occur
3. **Memory Protection**: Disables memory tracking if memory pressure becomes critical
4. **Platform Adaptation**: Automatically disables unsupported features per platform

### Best Practices

1. **Always check platform capabilities** before enabling advanced features
2. **Monitor pool efficiency** and adjust sizes based on usage patterns
3. **Set appropriate performance budgets** for different operation categories
4. **Use sampling strategies** to balance monitoring detail with performance overhead
5. **Implement proper error handling** for memory pressure and performance degradation scenarios

This API reference provides complete documentation for all classes, methods, types, and configuration options in the enhanced performance tracking system.
