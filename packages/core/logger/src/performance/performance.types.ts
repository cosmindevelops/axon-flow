/**
 * Enhanced performance tracking types for comprehensive monitoring
 * Supports memory tracking, GC monitoring, and operation profiling
 */

import type { CircuitBreakerState } from "../types/index.js";

/**
 * Memory usage metrics for heap, RSS, and external memory
 */
export interface IMemoryMetrics {
  /** Resident Set Size - total memory allocated for the process */
  rss: number;
  /** Heap total size */
  heapTotal: number;
  /** Heap used size */
  heapUsed: number;
  /** External memory used by C++ objects bound to JavaScript objects */
  external: number;
  /** Array buffers allocated */
  arrayBuffers: number;
  /** Memory utilization percentage (heapUsed / heapTotal) */
  utilization: number;
}

/**
 * Garbage collection event information
 */
export interface IGCEvent {
  /** GC event type (scavenge, mark-sweep, etc.) */
  type: string;
  /** Duration of GC event in milliseconds */
  duration: number;
  /** Timestamp when GC occurred */
  timestamp: number;
  /** Memory freed during GC */
  memoryFreed?: number;
}

/**
 * Operation timing metrics with statistical analysis
 */
export interface IOperationMetrics {
  /** Total number of operations */
  count: number;
  /** Operations per second */
  throughput: number;
  /** Average operation latency */
  averageLatency: number;
  /** Minimum latency observed */
  minLatency: number;
  /** Maximum latency observed */
  maxLatency: number;
  /** 50th percentile latency */
  p50Latency: number;
  /** 95th percentile latency */
  p95Latency: number;
  /** 99th percentile latency */
  p99Latency: number;
  /** Standard deviation of latencies */
  standardDeviation: number;
  /** Total time spent in operations */
  totalTime: number;
}

/**
 * Resource utilization metrics
 */
export interface IResourceMetrics {
  /** CPU usage percentage (0-100) */
  cpuUsage: number;
  /** Memory metrics */
  memory: IMemoryMetrics;
  /** Event loop delay in milliseconds */
  eventLoopDelay?: number;
  /** Process uptime in seconds */
  uptime: number;
  /** System load average */
  loadAverage?: number[];
}

/**
 * Enhanced performance metrics combining all tracking data
 */
export interface IEnhancedPerformanceMetrics {
  /** Legacy performance metrics for compatibility */
  logsPerSecond: number;
  averageLatencyMs: number;
  peakLatencyMs: number;
  totalLogs: number;
  failedLogs: number;
  circuitBreakerState: CircuitBreakerState;
  objectPoolUtilization: number;

  /** Enhanced metrics */
  operation: IOperationMetrics;
  resource: IResourceMetrics;
  gcEvents: IGCEvent[];
  measurementPoolUtilization: number;

  /** Timestamp when metrics were collected */
  timestamp: number;
  /** Duration since tracking started */
  uptimeSeconds: number;
}

/**
 * Configuration for enhanced performance tracking
 */
export interface IEnhancedPerformanceConfig {
  /** Enable performance tracking */
  enabled: boolean;
  /** Sample rate for measurements (0-1) */
  sampleRate: number;
  /** Latency threshold for warnings in milliseconds */
  thresholdMs: number;
  /** Enable memory monitoring */
  enableMemoryTracking: boolean;
  /** Enable garbage collection tracking */
  enableGCTracking: boolean;
  /** Maximum number of latency samples to keep */
  maxLatencyHistory: number;
  /** Maximum number of GC events to keep */
  maxGCEventHistory: number;
  /** Interval for collecting resource metrics in milliseconds */
  resourceMetricsInterval: number;
  /** Enable object pooling for measurements */
  enableMeasurementPooling: boolean;
  /** Initial size of measurement object pool */
  measurementPoolInitialSize: number;
  /** Maximum size of measurement object pool */
  measurementPoolMaxSize: number;
  /** Enable cross-environment optimizations */
  enableEnvironmentOptimization: boolean;
  /** Enable automatic profile selection */
  enableAutoProfileSelection: boolean;
  /** Custom environment profile */
  customProfile?: IEnvironmentProfile;
  /** Enable performance parity validation */
  enableParityValidation: boolean;
  /** Parity validation interval in milliseconds */
  parityValidationInterval: number;
  /** Enable Web Worker support */
  enableWebWorkerSupport: boolean;
  /** Enable browser fallbacks */
  enableBrowserFallbacks: boolean;
}

/**
 * Performance measurement object for pooling
 */
export interface IPerformanceMeasurement {
  /** Unique identifier for the measurement */
  id: string;
  /** Operation start time (high resolution) */
  startTime: number;
  /** Operation end time (high resolution) */
  endTime?: number;
  /** Operation category (logging, transport, etc.) */
  category: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Whether measurement is currently in use */
  inUse: boolean;
}

/**
 * Enhanced performance tracker interface
 */
export interface IEnhancedPerformanceTracker {
  /** Start timing an operation */
  startOperation(category?: string, metadata?: Record<string, unknown>): IPerformanceMeasurement;

  /** Finish timing an operation */
  finishOperation(measurement: IPerformanceMeasurement): void;

  /** Record a successful operation */
  recordSuccess(): void;

  /** Record a failed operation */
  recordFailure(): void;

  /** Get current performance metrics */
  getMetrics(): IEnhancedPerformanceMetrics;

  /** Get metrics for specific operation category */
  getCategoryMetrics(category: string): IOperationMetrics;

  /** Reset all metrics */
  reset(): void;

  /** Enable/disable tracking */
  setEnabled(enabled: boolean): void;

  /** Update configuration */
  updateConfig(config: Partial<IEnhancedPerformanceConfig>): void;

  /** Get platform information */
  getPlatformInfo(): IPlatformInfo;

  /** Get environment profile */
  getEnvironmentProfile(): IEnvironmentProfile;

  /** Validate performance parity across environments */
  validatePerformanceParity(): IPerformanceParityReport;
}

/**
 * Performance parity validation report
 */
export interface IPerformanceParityReport {
  /** Environment being tested */
  environment: string;
  /** Baseline performance metrics */
  baseline: IOperationMetrics;
  /** Current performance metrics */
  current: IOperationMetrics;
  /** Performance variance percentage */
  variance: number;
  /** Whether parity is maintained (<10% variance) */
  parityMaintained: boolean;
  /** Recommendations for optimization */
  recommendations: string[];
  /** Test timestamp */
  timestamp: number;
}

/**
 * Memory monitor interface with advanced leak detection and analysis
 */
export interface IMemoryMonitor {
  /** Get current memory metrics */
  getMemoryMetrics(): IMemoryMetrics;

  /** Start monitoring memory usage */
  startMonitoring(): void;

  /** Stop monitoring memory usage */
  stopMonitoring(): void;

  /** Check if memory usage is healthy */
  isMemoryHealthy(): boolean;

  /** Get memory usage trend */
  getMemoryTrend(): "increasing" | "decreasing" | "stable";

  /** Detect potential memory leaks using sliding window analysis */
  detectMemoryLeak(): boolean;

  /** Get memory pressure level */
  getMemoryPressure(): "low" | "medium" | "high" | "critical";

  /** Get memory growth rate in MB/minute */
  getMemoryGrowthRate(): number;

  /** Get comprehensive memory analysis with recommendations */
  getMemoryAnalysis(): {
    health: "healthy" | "warning" | "critical";
    trend: "increasing" | "decreasing" | "stable";
    pressure: "low" | "medium" | "high" | "critical";
    leakDetected: boolean;
    growthRate: number;
    recommendations: string[];
  };
}

/**
 * Measurement pool interface for object pooling with advanced optimization
 */
export interface IMeasurementPool {
  /** Get a measurement object from the pool */
  acquire(): IPerformanceMeasurement;

  /** Return a measurement object to the pool */
  release(measurement: IPerformanceMeasurement): void;

  /** Get pool utilization metrics */
  getUtilization(): number;

  /** Get total pool size */
  getSize(): number;

  /** Get number of active measurements */
  getActiveCount(): number;

  /** Get pool efficiency metrics */
  getEfficiencyMetrics(): {
    reuseRate: number;
    hitRate: number;
    totalAcquisitions: number;
    totalCreations: number;
    poolSize: number;
    activeCount: number;
    availableCount: number;
  };

  /** Resize the pool */
  resize(newSize: number): void;

  /** Clear all pooled objects */
  clear(): void;

  /** Preemptively warm up the pool */
  warmUp(targetSize?: number): void;

  /** Compact the pool by removing unused objects */
  compact(): void;
}

/**
 * Performance categories for method classification
 */
export type PerformanceCategory =
  | "database"
  | "network"
  | "computation"
  | "io"
  | "cache"
  | "auth"
  | "validation"
  | "serialization"
  | "custom";

/**
 * Environment-based decorator activation conditions
 */
export interface IDecoratorActivationConditions {
  /** Enable only in specific environments */
  environments?: string[];
  /** Enable only when NODE_ENV matches */
  nodeEnv?: string[];
  /** Enable only when specific feature flags are set */
  featureFlags?: string[];
  /** Custom activation function */
  customCondition?: () => boolean;
  /** Enable based on log level */
  logLevel?: string;
}

/**
 * Performance budget configuration for method categories
 */
export interface IPerformanceBudget {
  /** Maximum allowed latency in milliseconds */
  maxLatencyMs: number;
  /** Warning threshold as percentage of max latency */
  warningThreshold?: number;
  /** Action to take when budget is exceeded */
  onExceeded?: "warn" | "error" | "custom";
  /** Custom handler for budget exceeded */
  customHandler?: (category: string, actualMs: number, budgetMs: number) => void;
}

/**
 * Enhanced performance decorator options
 */
export interface IPerformanceDecoratorOptions {
  /** Operation category */
  category?: string;
  /** Performance category for classification */
  performanceCategory?: PerformanceCategory;
  /** Custom threshold for this operation */
  threshold?: number;
  /** Enable sampling for this operation */
  sample?: boolean;
  /** Sampling rate (0-1) for this specific decorator */
  sampleRate?: number;
  /** Metadata to include with measurements */
  metadata?: Record<string, unknown>;
  /** Activation conditions */
  activation?: IDecoratorActivationConditions;
  /** Performance budget for this operation */
  budget?: IPerformanceBudget;
  /** Enable parameter inspection */
  trackParameters?: boolean;
  /** Parameter serialization options */
  parameterOptions?: {
    /** Include parameter values in metadata */
    includeValues?: boolean;
    /** Include parameter types in metadata */
    includeTypes?: boolean;
    /** Maximum parameter value length for logging */
    maxValueLength?: number;
    /** Parameter names to exclude from tracking */
    excludeParams?: string[];
  };
  /** Custom metric exporters */
  exporters?: IPerformanceExporter[];
}

/**
 * Performance exporter interface for custom metrics
 */
export interface IPerformanceExporter {
  /** Exporter name */
  name: string;
  /** Export format */
  format: "json" | "prometheus" | "csv" | "custom";
  /** Export function */
  export: (metrics: IOperationMetrics, metadata?: Record<string, unknown>) => string | void;
  /** Export interval in milliseconds (0 for manual export) */
  interval?: number;
}

/**
 * Decorator composition configuration
 */
export interface IDecoratorComposition {
  /** Order of decorator execution */
  executionOrder?: number;
  /** Dependencies on other decorators */
  dependencies?: string[];
  /** Whether this decorator can be combined with others */
  combinable?: boolean;
  /** Shared context between composed decorators */
  sharedContext?: Record<string, unknown>;
}

/**
 * Method parameter inspection result
 */
export interface IParameterInspection {
  /** Parameter name */
  name: string;
  /** Parameter value (if enabled) */
  value?: unknown;
  /** Parameter type */
  type: string;
  /** Parameter index */
  index: number;
  /** Serialized size in bytes */
  serializedSize?: number;
}

/**
 * Metrics aggregator interface
 */
export interface IMetricsAggregator {
  /** Add a measurement to aggregation */
  addMeasurement(latency: number, category?: string): void;

  /** Get aggregated metrics */
  getAggregatedMetrics(): IOperationMetrics;

  /** Get metrics for specific category */
  getCategoryMetrics(category: string): IOperationMetrics;

  /** Reset aggregation data */
  reset(): void;

  /** Export metrics in specified format */
  exportMetrics(format: "json" | "prometheus"): string;
}

/**
 * Platform detection for cross-environment support
 */
export interface IPlatformInfo {
  /** Whether running in Node.js */
  isNode: boolean;
  /** Whether running in browser */
  isBrowser: boolean;
  /** Whether running in Web Worker */
  isWebWorker: boolean;
  /** Whether running in Service Worker */
  isServiceWorker: boolean;
  /** Whether running in Shared Worker */
  isSharedWorker: boolean;
  /** Whether running in Dedicated Worker */
  isDedicatedWorker: boolean;
  /** Whether running in Electron */
  isElectron: boolean;
  /** Whether running in React Native */
  isReactNative: boolean;
  /** Whether running in Deno */
  isDeno: boolean;
  /** Whether running in Bun */
  isBun: boolean;
  /** Whether GC tracking is available */
  hasGCSupport: boolean;
  /** Whether high-resolution timing is available */
  hasPerformanceNow: boolean;
  /** Whether memory usage APIs are available */
  hasMemoryAPI: boolean;
  /** Whether Performance Observer is available */
  hasPerformanceObserver: boolean;
  /** Whether Web Performance Timeline is available */
  hasPerformanceTimeline: boolean;
  /** Whether Resource Timing API is available */
  hasResourceTiming: boolean;
  /** Whether User Timing API is available */
  hasUserTiming: boolean;
  /** Whether Navigation Timing is available */
  hasNavigationTiming: boolean;
  /** Node.js version if applicable */
  nodeVersion?: string;
  /** Browser name if applicable */
  browserName?: string;
  /** Browser version if applicable */
  browserVersion?: string;
  /** Environment capabilities */
  capabilities: IPlatformCapabilities;
}

/**
 * Platform-specific capabilities for performance optimization
 */
export interface IPlatformCapabilities {
  /** Maximum number of concurrent performance observations */
  maxConcurrentObservations: number;
  /** Whether async operations are supported */
  supportsAsyncOperations: boolean;
  /** Whether advanced memory metrics are available */
  supportsAdvancedMemory: boolean;
  /** Whether CPU profiling is supported */
  supportsCPUProfiling: boolean;
  /** Whether heap snapshots are supported */
  supportsHeapSnapshots: boolean;
  /** Recommended measurement pool size */
  recommendedPoolSize: number;
  /** Optimal sampling rate */
  optimalSampleRate: number;
  /** Performance budget multiplier */
  performanceBudgetMultiplier: number;
}

/**
 * Environment-specific configuration profile
 */
export interface IEnvironmentProfile {
  /** Profile name */
  name: string;
  /** Target environment */
  environment: string;
  /** Optimized configuration */
  config: Partial<IEnhancedPerformanceConfig>;
  /** Feature flags */
  features: {
    memoryTracking: boolean;
    gcTracking: boolean;
    resourceMetrics: boolean;
    advancedProfiling: boolean;
  };
  /** Performance thresholds */
  thresholds: {
    warning: number;
    critical: number;
    sampling: number;
  };
}

