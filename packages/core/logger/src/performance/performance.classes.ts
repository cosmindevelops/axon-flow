/**
 * Enhanced performance tracking classes with memory monitoring and object pooling
 */

import type {
  IEnhancedPerformanceTracker,
  IEnhancedPerformanceConfig,
  IEnhancedPerformanceMetrics,
  IPerformanceMeasurement,
  IOperationMetrics,
  IMemoryMetrics,
  IMemoryMonitor,
  IMeasurementPool,
  IMetricsAggregator,
  IGCEvent,
  IResourceMetrics,
  IPlatformInfo,
  IPlatformCapabilities,
  IEnvironmentProfile,
  IPerformanceParityReport,
} from "./performance.types.js";

/**
 * Platform detection utility for comprehensive cross-environment performance tracking
 */
export class PerformancePlatformDetector {
  private static _instance: PerformancePlatformDetector;
  private _platformInfo: IPlatformInfo;
  private _environmentProfiles: Map<string, IEnvironmentProfile> = new Map();

  private constructor() {
    this._platformInfo = this.detectPlatform();
    this.initializeEnvironmentProfiles();
  }

  static getInstance(): PerformancePlatformDetector {
    if (!PerformancePlatformDetector._instance) {
      PerformancePlatformDetector._instance = new PerformancePlatformDetector();
    }
    return PerformancePlatformDetector._instance;
  }

  getPlatformInfo(): IPlatformInfo {
    return this._platformInfo;
  }

  getEnvironmentProfile(environment?: string): IEnvironmentProfile {
    const targetEnv = environment || this.detectEnvironmentType();
    return this._environmentProfiles.get(targetEnv) || this.getDefaultProfile();
  }

  validateEnvironmentCompatibility(): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    const platform = this._platformInfo;

    // Check for critical missing APIs
    if (!platform.hasPerformanceNow) {
      issues.push("High-resolution timing not available - performance measurements may be inaccurate");
    }

    if (platform.isNode && !platform.hasMemoryAPI) {
      issues.push("Node.js memory API not available - memory tracking disabled");
    }

    if (platform.isBrowser && !platform.hasPerformanceObserver) {
      issues.push("Performance Observer not available - advanced monitoring limited");
    }

    return {
      compatible: issues.length === 0,
      issues,
    };
  }

  private detectPlatform(): IPlatformInfo {
    // Environment detection
    const isNode = typeof process !== "undefined" && process?.versions?.node;
    const isDeno = typeof (globalThis as any).Deno !== "undefined";
    const isBun = typeof (globalThis as any).Bun !== "undefined";
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    const isWebWorker = typeof self !== "undefined" && typeof (self as any).importScripts !== "undefined" && !isBrowser;

    // Web Worker type detection
    const isServiceWorker = isWebWorker && typeof (self as any).registration !== "undefined";
    const isSharedWorker = isWebWorker && typeof (self as any).SharedWorkerGlobalScope !== "undefined";
    const isDedicatedWorker = isWebWorker && !isServiceWorker && !isSharedWorker;

    // Electron detection
    const isElectron = Boolean(typeof process !== "undefined" && process.versions && process.versions["electron"]);

    // React Native detection
    const isReactNative = Boolean(typeof navigator !== "undefined" && navigator.product === "ReactNative");

    // Performance API detection
    const hasPerformanceNow = typeof performance !== "undefined" && typeof performance.now === "function";
    const hasPerformanceObserver = typeof PerformanceObserver !== "undefined";
    const hasPerformanceTimeline = typeof performance !== "undefined" && typeof performance.getEntries === "function";
    const hasResourceTiming = hasPerformanceTimeline && typeof performance.getEntriesByType === "function";
    const hasUserTiming = hasPerformanceTimeline && typeof performance.mark === "function";
    const hasNavigationTiming =
      typeof performance !== "undefined" && typeof (performance as any).navigation !== "undefined";

    // Memory API detection
    const hasMemoryAPI = Boolean(
      (isNode && typeof process !== "undefined" && typeof process.memoryUsage === "function") ||
        (isBrowser && typeof (performance as any).memory !== "undefined"),
    );

    // GC support detection (Node.js with --expose-gc flag or V8 inspector)
    const hasGCSupport = Boolean(
      (isNode && typeof global !== "undefined" && typeof (global as any).gc === "function") ||
        (hasPerformanceObserver && this.detectGCObserverSupport()),
    );

    // Version detection
    const nodeVersion = isNode ? process.versions?.node : undefined;
    const { browserName, browserVersion } = this.detectBrowserInfo();

    // Generate capabilities
    const capabilities = this.generatePlatformCapabilities({
      isNode: Boolean(isNode),
      isDeno,
      isBun,
      isBrowser,
      isWebWorker,
      isElectron,
      isReactNative,
      hasPerformanceNow,
      hasMemoryAPI,
      hasGCSupport,
      hasPerformanceObserver,
    });

    const platformInfo: IPlatformInfo = {
      isNode: Boolean(isNode),
      isBrowser,
      isWebWorker,
      isServiceWorker,
      isSharedWorker,
      isDedicatedWorker,
      isElectron,
      isReactNative,
      isDeno,
      isBun,
      hasGCSupport,
      hasPerformanceNow,
      hasMemoryAPI,
      hasPerformanceObserver,
      hasPerformanceTimeline,
      hasResourceTiming,
      hasUserTiming,
      hasNavigationTiming,
      capabilities,
    };

    // Only add optional string properties if they have values
    if (nodeVersion) {
      platformInfo.nodeVersion = nodeVersion;
    }
    if (browserName) {
      platformInfo.browserName = browserName;
    }
    if (browserVersion) {
      platformInfo.browserVersion = browserVersion;
    }

    return platformInfo;
  }

  private detectGCObserverSupport(): boolean {
    try {
      if (typeof PerformanceObserver !== "undefined") {
        // Test if GC observations are supported
        const observer = new PerformanceObserver(() => {});
        observer.observe({ entryTypes: ["gc"] });
        observer.disconnect();
        return true;
      }
    } catch {
      // GC observation not supported
    }
    return false;
  }

  private detectBrowserInfo(): { browserName?: string; browserVersion?: string } {
    if (typeof navigator === "undefined") {
      return {};
    }

    const userAgent = navigator.userAgent;

    // Chrome/Chromium detection
    if (userAgent.includes("Chrome")) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      const result: { browserName: string; browserVersion?: string } = { browserName: "chrome" };
      if (match?.[1]) {
        result.browserVersion = match[1];
      }
      return result;
    }

    // Firefox detection
    if (userAgent.includes("Firefox")) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      const result: { browserName: string; browserVersion?: string } = { browserName: "firefox" };
      if (match?.[1]) {
        result.browserVersion = match[1];
      }
      return result;
    }

    // Safari detection
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      const match = userAgent.match(/Version\/(\d+)/);
      const result: { browserName: string; browserVersion?: string } = { browserName: "safari" };
      if (match?.[1]) {
        result.browserVersion = match[1];
      }
      return result;
    }

    // Edge detection
    if (userAgent.includes("Edg")) {
      const match = userAgent.match(/Edg\/(\d+)/);
      const result: { browserName: string; browserVersion?: string } = { browserName: "edge" };
      if (match?.[1]) {
        result.browserVersion = match[1];
      }
      return result;
    }

    return { browserName: "unknown" };
  }

  private generatePlatformCapabilities(context: Record<string, boolean>): IPlatformCapabilities {
    // Node.js optimizations
    if (context["isNode"]) {
      const nodeVersion = process.versions?.node;
      const majorVersion = nodeVersion ? parseInt(nodeVersion.split(".")[0]!, 10) : 18;

      return {
        maxConcurrentObservations: majorVersion >= 20 ? 1000 : 500,
        supportsAsyncOperations: true,
        supportsAdvancedMemory: true,
        supportsCPUProfiling: majorVersion >= 19,
        supportsHeapSnapshots: true,
        recommendedPoolSize: majorVersion >= 20 ? 100 : 50,
        optimalSampleRate: 1.0,
        performanceBudgetMultiplier: 1.0,
      };
    }

    // Browser optimizations
    if (context["isBrowser"]) {
      return {
        maxConcurrentObservations: 200,
        supportsAsyncOperations: true,
        supportsAdvancedMemory: Boolean((performance as any)?.memory),
        supportsCPUProfiling: false,
        supportsHeapSnapshots: false,
        recommendedPoolSize: 25,
        optimalSampleRate: 0.1, // Lower sampling for browsers
        performanceBudgetMultiplier: 1.5, // More lenient thresholds
      };
    }

    // Web Worker optimizations
    if (context["isWebWorker"]) {
      return {
        maxConcurrentObservations: 100,
        supportsAsyncOperations: true,
        supportsAdvancedMemory: false,
        supportsCPUProfiling: false,
        supportsHeapSnapshots: false,
        recommendedPoolSize: 15,
        optimalSampleRate: 0.05, // Even lower sampling for workers
        performanceBudgetMultiplier: 2.0, // Very lenient for workers
      };
    }

    // Default fallback
    return {
      maxConcurrentObservations: 50,
      supportsAsyncOperations: false,
      supportsAdvancedMemory: false,
      supportsCPUProfiling: false,
      supportsHeapSnapshots: false,
      recommendedPoolSize: 10,
      optimalSampleRate: 0.01,
      performanceBudgetMultiplier: 5.0,
    };
  }

  private detectEnvironmentType(): string {
    const platform = this._platformInfo;

    if (platform.isNode) {
      if (platform.isElectron) return "electron";
      if (platform.nodeVersion) {
        const major = parseInt(platform.nodeVersion.split(".")[0]!, 10);
        return `node-${major}`;
      }
      return "node";
    }

    if (platform.isReactNative) return "react-native";
    if (platform.isDeno) return "deno";
    if (platform.isBun) return "bun";

    if (platform.isServiceWorker) return "service-worker";
    if (platform.isSharedWorker) return "shared-worker";
    if (platform.isDedicatedWorker) return "dedicated-worker";

    if (platform.isBrowser) {
      return `browser-${platform.browserName || "unknown"}`;
    }

    return "unknown";
  }

  private initializeEnvironmentProfiles(): void {
    // Node.js profiles for different versions
    this.addProfile({
      name: "Node.js 18 LTS",
      environment: "node-18",
      config: {
        enableMemoryTracking: true,
        enableGCTracking: true,
        measurementPoolInitialSize: 50,
        measurementPoolMaxSize: 200,
        sampleRate: 1.0,
        resourceMetricsInterval: 5000,
      },
      features: {
        memoryTracking: true,
        gcTracking: true,
        resourceMetrics: true,
        advancedProfiling: false,
      },
      thresholds: {
        warning: 100,
        critical: 500,
        sampling: 1.0,
      },
    });

    this.addProfile({
      name: "Node.js 20+ LTS",
      environment: "node-20",
      config: {
        enableMemoryTracking: true,
        enableGCTracking: true,
        measurementPoolInitialSize: 100,
        measurementPoolMaxSize: 500,
        sampleRate: 1.0,
        resourceMetricsInterval: 2000,
      },
      features: {
        memoryTracking: true,
        gcTracking: true,
        resourceMetrics: true,
        advancedProfiling: true,
      },
      thresholds: {
        warning: 50,
        critical: 250,
        sampling: 1.0,
      },
    });

    // Browser profiles
    this.addProfile({
      name: "Modern Browser",
      environment: "browser-chrome",
      config: {
        enableMemoryTracking: true,
        enableGCTracking: false,
        measurementPoolInitialSize: 25,
        measurementPoolMaxSize: 100,
        sampleRate: 0.1,
        resourceMetricsInterval: 10000,
      },
      features: {
        memoryTracking: true,
        gcTracking: false,
        resourceMetrics: false,
        advancedProfiling: false,
      },
      thresholds: {
        warning: 150,
        critical: 750,
        sampling: 0.1,
      },
    });

    // Web Worker profiles
    this.addProfile({
      name: "Service Worker",
      environment: "service-worker",
      config: {
        enableMemoryTracking: false,
        enableGCTracking: false,
        measurementPoolInitialSize: 15,
        measurementPoolMaxSize: 50,
        sampleRate: 0.05,
        resourceMetricsInterval: 30000,
      },
      features: {
        memoryTracking: false,
        gcTracking: false,
        resourceMetrics: false,
        advancedProfiling: false,
      },
      thresholds: {
        warning: 300,
        critical: 1500,
        sampling: 0.05,
      },
    });

    // Add more profiles for other environments
    this.addProfile({
      name: "React Native",
      environment: "react-native",
      config: {
        enableMemoryTracking: true,
        enableGCTracking: false,
        measurementPoolInitialSize: 20,
        measurementPoolMaxSize: 75,
        sampleRate: 0.2,
        resourceMetricsInterval: 15000,
      },
      features: {
        memoryTracking: true,
        gcTracking: false,
        resourceMetrics: false,
        advancedProfiling: false,
      },
      thresholds: {
        warning: 200,
        critical: 1000,
        sampling: 0.2,
      },
    });
  }

  private addProfile(profile: IEnvironmentProfile): void {
    this._environmentProfiles.set(profile.environment, profile);
  }

  private getDefaultProfile(): IEnvironmentProfile {
    return {
      name: "Default Fallback",
      environment: "unknown",
      config: {
        enableMemoryTracking: false,
        enableGCTracking: false,
        measurementPoolInitialSize: 10,
        measurementPoolMaxSize: 25,
        sampleRate: 0.01,
        resourceMetricsInterval: 60000,
      },
      features: {
        memoryTracking: false,
        gcTracking: false,
        resourceMetrics: false,
        advancedProfiling: false,
      },
      thresholds: {
        warning: 500,
        critical: 2500,
        sampling: 0.01,
      },
    };
  }
}

/**
 * Memory monitoring implementation with advanced leak detection and GC tracking
 */
export class MemoryMonitor implements IMemoryMonitor {
  private readonly platform: IPlatformInfo;
  private monitoringActive = false;
  private memoryHistory: IMemoryMetrics[] = [];
  private readonly maxHistorySize = 100;
  private monitoringInterval?: NodeJS.Timeout;
  private readonly memoryThresholds = {
    warning: 75, // 75% heap utilization warning
    critical: 85, // 85% heap utilization critical
    leakDetection: 90, // 90% sustained usage triggers leak detection
  };
  private memoryBaseline?: IMemoryMetrics;
  private leakDetectionWindow: number[] = []; // Track utilization over time
  private readonly leakWindowSize = 20; // Number of samples for leak detection
  private gcObserver?: PerformanceObserver;

  constructor() {
    this.platform = PerformancePlatformDetector.getInstance().getPlatformInfo();
    this.setupGCTracking();
  }

  getMemoryMetrics(): IMemoryMetrics {
    if (this.platform.hasMemoryAPI && this.platform.isNode) {
      const memUsage = process.memoryUsage();
      const utilization = memUsage.heapTotal > 0 ? (memUsage.heapUsed / memUsage.heapTotal) * 100 : 0;

      const metrics: IMemoryMetrics = {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers || 0,
        utilization,
      };

      // Set baseline on first measurement
      if (!this.memoryBaseline && this.monitoringActive) {
        this.memoryBaseline = { ...metrics };
      }

      return metrics;
    }

    // Browser fallback using performance.memory if available
    if (this.platform.isBrowser && typeof performance !== "undefined" && (performance as any).memory) {
      const mem = (performance as any).memory;
      const utilization = mem.totalJSHeapSize > 0 ? (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100 : 0;

      return {
        rss: mem.totalJSHeapSize || 0,
        heapTotal: mem.totalJSHeapSize || 0,
        heapUsed: mem.usedJSHeapSize || 0,
        external: 0,
        arrayBuffers: 0,
        utilization,
      };
    }

    // Fallback for environments without memory APIs
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
      utilization: 0,
    };
  }

  startMonitoring(): void {
    this.monitoringActive = true;

    // Start periodic memory snapshots (every 5 seconds)
    this.monitoringInterval = setInterval(() => {
      this.recordMemorySnapshot();
      this.analyzeMemoryHealth();
    }, 5000) as NodeJS.Timeout;

    // Take initial snapshot
    this.recordMemorySnapshot();
  }

  stopMonitoring(): void {
    this.monitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined as any;
    }
  }

  isMemoryHealthy(): boolean {
    const current = this.getMemoryMetrics();
    return current.utilization < this.memoryThresholds.warning;
  }

  getMemoryTrend(): "increasing" | "decreasing" | "stable" {
    if (this.memoryHistory.length < 2) {
      return "stable";
    }

    const recent = this.memoryHistory.slice(-10); // Use more samples for better trend analysis
    if (recent.length < 3) return "stable";

    // Calculate linear regression to determine trend
    const x = recent.map((_, i) => i);
    const y = recent.map((m) => m.heapUsed);

    const n = recent.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i]!, 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Convert slope to percentage change per measurement
    const avgMemory = sumY / n;
    const slopePercent = (slope / avgMemory) * 100;

    if (slopePercent > 2) return "increasing";
    if (slopePercent < -2) return "decreasing";
    return "stable";
  }

  /**
   * Detect potential memory leaks using sliding window analysis
   */
  detectMemoryLeak(): boolean {
    if (this.leakDetectionWindow.length < this.leakWindowSize) {
      return false;
    }

    const recentWindow = this.leakDetectionWindow.slice(-this.leakWindowSize);
    const sustainedHighUsage = recentWindow.every((util) => util > this.memoryThresholds.leakDetection);

    if (sustainedHighUsage) {
      // Additional check: memory should be consistently growing
      const firstHalf = recentWindow.slice(0, this.leakWindowSize / 2);
      const secondHalf = recentWindow.slice(this.leakWindowSize / 2);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      return secondAvg > firstAvg + 5; // 5% increase indicates potential leak
    }

    return false;
  }

  /**
   * Get memory pressure level
   */
  getMemoryPressure(): "low" | "medium" | "high" | "critical" {
    const current = this.getMemoryMetrics();
    const util = current.utilization;

    if (util >= this.memoryThresholds.critical) return "critical";
    if (util >= this.memoryThresholds.warning) return "high";
    if (util >= 50) return "medium";
    return "low";
  }

  /**
   * Get memory growth rate in MB/minute
   */
  getMemoryGrowthRate(): number {
    if (this.memoryHistory.length < 2) return 0;

    const recent = this.memoryHistory.slice(-6); // Last 30 seconds of data
    if (recent.length < 2) return 0;

    const timeSpan = 30; // seconds
    const memoryGrowth = recent[recent.length - 1]!.heapUsed - recent[0]!.heapUsed;
    const growthPerMinute = (memoryGrowth / timeSpan) * 60;

    return growthPerMinute / (1024 * 1024); // Convert to MB/minute
  }

  /**
   * Get comprehensive memory analysis
   */
  getMemoryAnalysis(): {
    health: "healthy" | "warning" | "critical";
    trend: "increasing" | "decreasing" | "stable";
    pressure: "low" | "medium" | "high" | "critical";
    leakDetected: boolean;
    growthRate: number;
    recommendations: string[];
  } {
    const health = this.isMemoryHealthy()
      ? "healthy"
      : this.getMemoryMetrics().utilization >= this.memoryThresholds.critical
        ? "critical"
        : "warning";
    const trend = this.getMemoryTrend();
    const pressure = this.getMemoryPressure();
    const leakDetected = this.detectMemoryLeak();
    const growthRate = this.getMemoryGrowthRate();

    const recommendations: string[] = [];

    if (pressure === "high" || pressure === "critical") {
      recommendations.push("Consider reducing memory usage or increasing heap size");
    }

    if (leakDetected) {
      recommendations.push("Potential memory leak detected - review object retention");
    }

    if (trend === "increasing" && growthRate > 10) {
      recommendations.push("High memory growth rate detected - monitor for leaks");
    }

    if (this.memoryHistory.length > 50 && this.getMemoryTrend() === "increasing") {
      recommendations.push("Sustained memory growth - consider garbage collection tuning");
    }

    return {
      health,
      trend,
      pressure,
      leakDetected,
      growthRate,
      recommendations,
    };
  }

  private recordMemorySnapshot(): void {
    if (!this.monitoringActive) return;

    const snapshot = this.getMemoryMetrics();
    this.memoryHistory.push(snapshot);

    // Track utilization for leak detection
    this.leakDetectionWindow.push(snapshot.utilization);
    if (this.leakDetectionWindow.length > this.leakWindowSize) {
      this.leakDetectionWindow.shift();
    }

    // Keep history size manageable
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
  }

  private analyzeMemoryHealth(): void {
    const current = this.getMemoryMetrics();
    const pressure = this.getMemoryPressure();

    if (pressure === "critical") {
      console.warn(`Critical memory pressure detected: ${current.utilization.toFixed(1)}% heap utilization`);
    } else if (pressure === "high") {
      console.warn(`High memory pressure detected: ${current.utilization.toFixed(1)}% heap utilization`);
    }

    if (this.detectMemoryLeak()) {
      console.error("Potential memory leak detected - sustained high memory usage with growth pattern");
    }
  }

  private setupGCTracking(): void {
    // Only set up GC tracking in Node.js environments
    if (!this.platform.isNode) return;

    try {
      // Check if PerformanceObserver is available (Node.js 8.5+)
      if (typeof PerformanceObserver !== "undefined") {
        this.gcObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === "gc") {
              this.handleGCEvent(entry as any);
            }
          }
        });

        this.gcObserver.observe({ entryTypes: ["gc"] });
      }
    } catch (_error) {
      // GC tracking not available, continue without it
      // Debug: GC tracking not available
    }
  }

  private handleGCEvent(entry: any): void {
    const memoryFreed = this.calculateMemoryFreed();
    const gcEvent: IGCEvent = {
      type: this.getGCType(entry.kind),
      duration: entry.duration,
      timestamp: Date.now(),
      ...(memoryFreed !== undefined && { memoryFreed }),
    };

    // Log significant GC events
    if (gcEvent.duration > 50) {
      // GC events longer than 50ms
      console.warn(`Long GC event detected: ${gcEvent.type} took ${gcEvent.duration.toFixed(2)}ms`);
    }
  }

  private getGCType(kind: number): string {
    // GC kinds from Node.js perf_hooks
    switch (kind) {
      case 1:
        return "scavenge";
      case 2:
        return "mark-sweep-compact";
      case 4:
        return "incremental-marking";
      case 8:
        return "weak-processing";
      case 15:
        return "all";
      default:
        return "unknown";
    }
  }

  private calculateMemoryFreed(): number | undefined {
    if (this.memoryHistory.length < 2) return undefined;

    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const previous = this.memoryHistory[this.memoryHistory.length - 2];

    if (!current || !previous) return 0;

    const freed = previous.heapUsed - current.heapUsed;
    return freed > 0 ? freed : 0;
  }
}

/**
 * Object pool for performance measurements with advanced optimization
 */
export class MeasurementPool implements IMeasurementPool {
  private pool: IPerformanceMeasurement[] = [];
  private active: Set<string> = new Set();
  private nextId = 1;
  private readonly platform: IPlatformInfo;
  private acquisitionCount = 0;
  private reuseCount = 0;
  private creationCount = 0;
  private readonly growthFactor = 1.5; // Pool growth multiplier
  private lastResizeTime = 0;
  private readonly resizeCooldownMs = 5000; // 5 second cooldown between resizes

  constructor(
    private initialSize: number = 50,
    private maxSize: number = 500,
  ) {
    this.platform = PerformancePlatformDetector.getInstance().getPlatformInfo();
    this.initializePool();
  }

  acquire(): IPerformanceMeasurement {
    this.acquisitionCount++;

    let measurement = this.pool.pop();

    if (!measurement) {
      // Pool is empty, create new measurement
      measurement = this.createMeasurement();
      this.creationCount++;

      // Consider growing pool if we're frequently creating new objects
      this.considerPoolGrowth();
    } else {
      // Successfully reused pooled object
      this.reuseCount++;
    }

    measurement.inUse = true;
    measurement.startTime = this.platform.hasPerformanceNow ? performance.now() : Date.now();
    delete measurement.endTime;
    delete measurement.metadata;
    measurement.category = "default"; // Reset to default

    this.active.add(measurement.id);
    return measurement;
  }

  release(measurement: IPerformanceMeasurement): void {
    if (!this.active.has(measurement.id)) {
      return; // Already released or invalid
    }

    measurement.inUse = false;
    this.active.delete(measurement.id);

    // Clean up measurement object for reuse
    this.cleanMeasurement(measurement);

    // Return to pool if not at capacity
    if (this.pool.length < this.maxSize) {
      this.pool.push(measurement);
    } else {
      // Pool is full, consider if we should resize
      this.considerPoolShrink();
    }
  }

  getUtilization(): number {
    const totalCapacity = this.pool.length + this.active.size;
    return totalCapacity > 0 ? (this.active.size / totalCapacity) * 100 : 0;
  }

  getSize(): number {
    return this.pool.length + this.active.size;
  }

  getActiveCount(): number {
    return this.active.size;
  }

  /**
   * Get pool efficiency metrics
   */
  getEfficiencyMetrics(): {
    reuseRate: number;
    hitRate: number;
    totalAcquisitions: number;
    totalCreations: number;
    poolSize: number;
    activeCount: number;
    availableCount: number;
  } {
    const reuseRate = this.acquisitionCount > 0 ? (this.reuseCount / this.acquisitionCount) * 100 : 0;
    const hitRate =
      this.acquisitionCount > 0 ? ((this.acquisitionCount - this.creationCount) / this.acquisitionCount) * 100 : 0;

    return {
      reuseRate,
      hitRate,
      totalAcquisitions: this.acquisitionCount,
      totalCreations: this.creationCount,
      poolSize: this.getSize(),
      activeCount: this.active.size,
      availableCount: this.pool.length,
    };
  }

  resize(newSize: number): void {
    if (newSize < this.active.size) {
      // Cannot resize below active count
      console.warn(`Cannot resize pool to ${newSize}, ${this.active.size} measurements are active`);
      return;
    }

    const oldMaxSize = this.maxSize;
    this.maxSize = Math.max(newSize, this.initialSize);

    if (newSize < oldMaxSize) {
      // Shrinking pool - remove excess pooled objects
      while (this.pool.length > newSize - this.active.size) {
        this.pool.pop();
      }
    } else if (newSize > oldMaxSize) {
      // Growing pool - pre-populate with new objects
      const targetPoolSize = Math.min(this.initialSize, newSize - this.active.size);
      while (this.pool.length < targetPoolSize) {
        this.pool.push(this.createMeasurement());
      }
    }

    this.lastResizeTime = Date.now();
  }

  clear(): void {
    this.pool.length = 0;
    this.active.clear();
    this.nextId = 1;
    this.acquisitionCount = 0;
    this.reuseCount = 0;
    this.creationCount = 0;

    // Repopulate with initial size
    this.initializePool();
  }

  /**
   * Preemptively warm up the pool based on usage patterns
   */
  warmUp(targetSize: number = this.initialSize): void {
    const currentAvailable = this.pool.length;
    const neededObjects = Math.min(targetSize - currentAvailable, this.maxSize - this.getSize());

    for (let i = 0; i < neededObjects; i++) {
      this.pool.push(this.createMeasurement());
    }
  }

  /**
   * Compact the pool by removing oldest unused objects if efficiency is low
   */
  compact(): void {
    const efficiency = this.getEfficiencyMetrics();

    // If reuse rate is below 60%, consider compacting
    if (efficiency.reuseRate < 60 && this.pool.length > this.initialSize) {
      const targetSize = Math.max(this.initialSize, Math.floor(this.pool.length * 0.75));
      this.resize(targetSize);
    }
  }

  private initializePool(): void {
    this.pool.length = 0; // Clear existing

    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this.createMeasurement());
    }
  }

  private createMeasurement(): IPerformanceMeasurement {
    return {
      id: `perf-${this.nextId++}`,
      startTime: 0,
      category: "default",
      inUse: false,
    };
  }

  private cleanMeasurement(measurement: IPerformanceMeasurement): void {
    // Reset measurement to clean state for reuse
    measurement.startTime = 0;
    measurement.category = "default";
    delete measurement.endTime;
    delete measurement.metadata;
    measurement.inUse = false;
  }

  private considerPoolGrowth(): void {
    const now = Date.now();
    const efficiency = this.getEfficiencyMetrics();

    // Only consider growth if:
    // 1. We're not at max capacity
    // 2. Cooldown period has passed
    // 3. Hit rate is low (lots of new object creation)
    // 4. Pool utilization is high
    if (
      this.getSize() < this.maxSize &&
      now - this.lastResizeTime > this.resizeCooldownMs &&
      efficiency.hitRate < 80 &&
      this.getUtilization() > 70
    ) {
      const currentSize = this.getSize();
      const newSize = Math.min(this.maxSize, Math.floor(currentSize * this.growthFactor));

      // Only grow if we can actually increase the size meaningfully
      if (newSize > currentSize && newSize <= this.maxSize) {
        // Debug: Growing measurement pool
        this.resize(newSize);
      }
    }
  }

  private considerPoolShrink(): void {
    const now = Date.now();
    const _efficiency = this.getEfficiencyMetrics();

    // Only consider shrinking if:
    // 1. Pool is significantly larger than initial size
    // 2. Cooldown period has passed
    // 3. Utilization is consistently low
    // 4. We have excess capacity
    if (
      this.getSize() > this.initialSize * 2 &&
      now - this.lastResizeTime > this.resizeCooldownMs * 2 && // Longer cooldown for shrinking
      this.getUtilization() < 30 &&
      this.pool.length > this.initialSize
    ) {
      const newSize = Math.max(this.initialSize, Math.floor(this.getSize() * 0.75));

      // Debug: Shrinking measurement pool
      this.resize(newSize);
    }
  }
}

/**
 * Metrics aggregator for statistical analysis
 */
export class MetricsAggregator implements IMetricsAggregator {
  private measurements: Map<string, number[]> = new Map();
  private globalMeasurements: number[] = [];
  private maxHistory: number;

  constructor(config: { maxHistory?: number } = {}) {
    this.maxHistory = config.maxHistory ?? 1000;
  }

  addMeasurement(latency: number, category = "default"): void {
    // Add to global measurements
    this.globalMeasurements.push(latency);

    // Add to category-specific measurements
    if (!this.measurements.has(category)) {
      this.measurements.set(category, []);
    }
    this.measurements.get(category)!.push(latency);

    // Keep measurements manageable
    this.trimMeasurements();
  }

  getAggregatedMetrics(): IOperationMetrics {
    return this.calculateMetrics(this.globalMeasurements);
  }

  getCategoryMetrics(category: string): IOperationMetrics {
    const measurements = this.measurements.get(category) || [];
    return this.calculateMetrics(measurements);
  }

  reset(): void {
    this.measurements.clear();
    this.globalMeasurements.length = 0;
  }

  exportMetrics(format: "json" | "prometheus"): string {
    if (format === "json") {
      return JSON.stringify({
        global: this.getAggregatedMetrics(),
        categories: Object.fromEntries(
          Array.from(this.measurements.keys()).map((cat) => [cat, this.getCategoryMetrics(cat)]),
        ),
      });
    }

    // Prometheus format
    const metrics = this.getAggregatedMetrics();
    return [
      `# HELP performance_operations_total Total number of operations`,
      `# TYPE performance_operations_total counter`,
      `performance_operations_total ${metrics.count}`,
      `# HELP performance_latency_seconds Operation latency in seconds`,
      `# TYPE performance_latency_seconds histogram`,
      `performance_latency_seconds_sum ${metrics.totalTime / 1000}`,
      `performance_latency_seconds_count ${metrics.count}`,
    ].join("\n");
  }

  private calculateMetrics(measurements: number[]): IOperationMetrics {
    if (measurements.length === 0) {
      return {
        count: 0,
        throughput: 0,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        standardDeviation: 0,
        totalTime: 0,
      };
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    const average = sum / measurements.length;

    // Calculate standard deviation
    const variance = measurements.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / measurements.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      count: measurements.length,
      throughput: measurements.length, // Simplified - would need time window for accurate rate
      averageLatency: average,
      minLatency: sorted[0] ?? 0,
      maxLatency: sorted[sorted.length - 1] ?? 0,
      p50Latency: this.percentile(sorted, 0.5),
      p95Latency: this.percentile(sorted, 0.95),
      p99Latency: this.percentile(sorted, 0.99),
      standardDeviation,
      totalTime: sum,
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (sortedArray.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower] ?? 0;
    }

    const lowerValue = sortedArray[lower] ?? 0;
    const upperValue = sortedArray[upper] ?? 0;
    return lowerValue * (upper - index) + upperValue * (index - lower);
  }

  private trimMeasurements(): void {
    if (this.globalMeasurements.length > this.maxHistory) {
      this.globalMeasurements.splice(0, this.globalMeasurements.length - this.maxHistory);
    }

    this.measurements.forEach((measurements) => {
      if (measurements.length > this.maxHistory) {
        measurements.splice(0, measurements.length - this.maxHistory);
      }
    });
  }
}

/**
 * Enhanced performance tracker implementation with full GC tracking and memory optimization
 */
export class EnhancedPerformanceTracker implements IEnhancedPerformanceTracker {
  private readonly startTime = Date.now();
  private totalOperations = 0;
  private failedOperations = 0;
  private readonly memoryMonitor: MemoryMonitor;
  private readonly measurementPool: IMeasurementPool;
  private readonly metricsAggregator: IMetricsAggregator;
  private readonly gcEvents: IGCEvent[] = [];
  private readonly platform: IPlatformInfo;
  private config: IEnhancedPerformanceConfig;
  private gcObserver?: PerformanceObserver;
  private resourceMetricsInterval?: NodeJS.Timeout;
  private readonly maxGCEvents = 100;

  constructor(config: IEnhancedPerformanceConfig) {
    this.config = config;
    this.platform = PerformancePlatformDetector.getInstance().getPlatformInfo();
    this.memoryMonitor = new MemoryMonitor();
    this.measurementPool = new MeasurementPool(config.measurementPoolInitialSize, config.measurementPoolMaxSize);
    this.metricsAggregator = new MetricsAggregator({ maxHistory: config.maxLatencyHistory });

    if (config.enableMemoryTracking) {
      this.memoryMonitor.startMonitoring();
    }

    if (config.enableGCTracking && this.platform.hasGCSupport) {
      this.setupGCTracking();
    }

    // Start resource metrics collection if interval is specified
    if (config.resourceMetricsInterval > 0) {
      this.startResourceMetricsCollection();
    }
  }

  startOperation(category = "default", metadata?: Record<string, unknown>): IPerformanceMeasurement {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      // Return a no-op measurement for disabled/unsampled operations
      return {
        id: "noop",
        startTime: 0,
        category,
        ...(metadata && { metadata }),
        inUse: false,
      };
    }

    const measurement = this.config.enableMeasurementPooling
      ? this.measurementPool.acquire()
      : this.createDirectMeasurement();

    measurement.category = category;
    if (metadata) {
      measurement.metadata = metadata;
    } else {
      delete measurement.metadata;
    }

    return measurement;
  }

  finishOperation(measurement: IPerformanceMeasurement): void {
    if (measurement.id === "noop" || !this.config.enabled) {
      return;
    }

    const endTime = this.platform.hasPerformanceNow ? performance.now() : Date.now();
    measurement.endTime = endTime;

    const latency = endTime - measurement.startTime;

    // Record metrics
    this.metricsAggregator.addMeasurement(latency, measurement.category);

    // Check threshold
    if (latency > this.config.thresholdMs) {
      console.warn(
        `Slow operation detected: ${latency.toFixed(2)}ms (threshold: ${this.config.thresholdMs}ms) [${measurement.category}]`,
      );
    }

    // Return to pool if using pooling
    if (this.config.enableMeasurementPooling && measurement.id !== "direct") {
      this.measurementPool.release(measurement);
    }
  }

  recordSuccess(): void {
    this.totalOperations++;
  }

  recordFailure(): void {
    this.totalOperations++;
    this.failedOperations++;
  }

  getMetrics(): IEnhancedPerformanceMetrics {
    const now = Date.now();
    const uptimeSeconds = (now - this.startTime) / 1000;
    const operationMetrics = this.metricsAggregator.getAggregatedMetrics();

    // Legacy metrics for compatibility
    const logsPerSecond = uptimeSeconds > 0 ? this.totalOperations / uptimeSeconds : 0;

    return {
      // Legacy compatibility
      logsPerSecond,
      averageLatencyMs: operationMetrics.averageLatency,
      peakLatencyMs: operationMetrics.maxLatency,
      totalLogs: this.totalOperations,
      failedLogs: this.failedOperations,
      circuitBreakerState: "closed", // Would need circuit breaker reference
      objectPoolUtilization: this.getPoolEfficiency(),

      // Enhanced metrics
      operation: operationMetrics,
      resource: this.getResourceMetrics(),
      gcEvents: this.getRecentGCEvents(),
      measurementPoolUtilization: this.config.enableMeasurementPooling ? this.measurementPool.getUtilization() : 0,
      timestamp: now,
      uptimeSeconds,
    };
  }

  getCategoryMetrics(category: string): IOperationMetrics {
    return this.metricsAggregator.getCategoryMetrics(category);
  }

  reset(): void {
    this.totalOperations = 0;
    this.failedOperations = 0;
    this.metricsAggregator.reset();
    this.gcEvents.length = 0;
    if (this.config.enableMeasurementPooling) {
      this.measurementPool.clear();
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  updateConfig(newConfig: Partial<IEnhancedPerformanceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    if (newConfig.enableMemoryTracking !== undefined) {
      if (newConfig.enableMemoryTracking) {
        this.memoryMonitor.startMonitoring();
      } else {
        this.memoryMonitor.stopMonitoring();
      }
    }

    if (newConfig.enableGCTracking !== undefined && newConfig.enableGCTracking !== oldConfig.enableGCTracking) {
      if (newConfig.enableGCTracking && this.platform.hasGCSupport) {
        this.setupGCTracking();
      } else if (this.gcObserver) {
        this.gcObserver.disconnect();
        this.gcObserver = undefined as any;
      }
    }

    // Update resource metrics collection interval
    if (
      newConfig.resourceMetricsInterval !== undefined &&
      newConfig.resourceMetricsInterval !== oldConfig.resourceMetricsInterval
    ) {
      if (this.resourceMetricsInterval) {
        clearInterval(this.resourceMetricsInterval);
        this.resourceMetricsInterval = undefined as any;
      }

      if (newConfig.resourceMetricsInterval > 0) {
        this.startResourceMetricsCollection();
      }
    }
  }

  /**
   * Get memory analysis from enhanced memory monitor
   */
  getMemoryAnalysis() {
    return this.memoryMonitor.getMemoryAnalysis();
  }

  /**
   * Get object pool efficiency percentage
   */
  getPoolEfficiency(): number {
    if (!this.config.enableMeasurementPooling) return 0;

    const totalCapacity = this.measurementPool.getSize();
    const activeCount = this.measurementPool.getActiveCount();
    const pooledCount = totalCapacity - activeCount;

    // Efficiency = how often we reuse pooled objects vs creating new ones
    return totalCapacity > 0 ? (pooledCount / totalCapacity) * 100 : 0;
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): IPlatformInfo {
    return this.platform;
  }

  /**
   * Get environment profile
   */
  getEnvironmentProfile(): IEnvironmentProfile {
    const detector = PerformancePlatformDetector.getInstance();
    return detector.getEnvironmentProfile();
  }

  /**
   * Validate performance parity across environments
   */
  validatePerformanceParity(): IPerformanceParityReport {
    const baseline = this.getBaselineMetrics();
    const current = this.getMetrics().operation;
    const variance = this.calculateVariance(baseline, current);

    return {
      environment: this.detectCurrentEnvironment(),
      baseline,
      current,
      variance,
      parityMaintained: variance < 10, // <10% variance requirement
      recommendations: this.generateParityRecommendations(variance),
      timestamp: Date.now(),
    };
  }

  /**
   * Force garbage collection if available (for testing/debugging)
   */
  forceGC(): void {
    if (this.platform.hasGCSupport && typeof (global as any).gc === "function") {
      (global as any).gc();
    }
  }

  private createDirectMeasurement(): IPerformanceMeasurement {
    return {
      id: "direct",
      startTime: this.platform.hasPerformanceNow ? performance.now() : Date.now(),
      category: "default",
      inUse: true,
    };
  }

  private getResourceMetrics(): IResourceMetrics {
    const memory = this.memoryMonitor.getMemoryMetrics();

    // Enhanced CPU usage calculation for Node.js
    const cpuUsage = this.calculateCPUUsage();

    // Enhanced event loop delay calculation
    const eventLoopDelay = this.platform.isNode ? this.getEventLoopDelay() : undefined;

    // Load average - Node.js only
    const loadAverage =
      this.platform.isNode && typeof process !== "undefined" && typeof (process as any).loadavg === "function"
        ? (process as any).loadavg()
        : undefined;

    const resourceMetrics: IResourceMetrics = {
      cpuUsage,
      memory,
      uptime: process?.uptime?.() || 0,
    };

    if (eventLoopDelay !== undefined) {
      resourceMetrics.eventLoopDelay = eventLoopDelay;
    }

    if (loadAverage !== undefined) {
      resourceMetrics.loadAverage = loadAverage;
    }

    return resourceMetrics;
  }

  private calculateCPUUsage(): number {
    // Enhanced CPU usage calculation
    if (this.platform.isNode && typeof process !== "undefined" && process.cpuUsage) {
      try {
        const cpuUsage = process.cpuUsage();
        const totalTime = cpuUsage.user + cpuUsage.system;
        // Convert microseconds to percentage (simplified)
        return (totalTime / 1000000) * 100; // Very rough estimate
      } catch (_error) {
        // Fallback to 0 if CPU usage calculation fails
      }
    }
    return 0;
  }

  private getEventLoopDelay(): number {
    // Simplified event loop delay measurement
    // In production, you'd use something like '@nodejs/clinic-doctor' or similar
    if (this.platform.isNode) {
      const start = Date.now();
      setImmediate(() => {
        const delay = Date.now() - start;
        return Math.max(0, delay - 1); // Subtract expected minimum delay
      });
    }
    return 0;
  }

  private setupGCTracking(): void {
    // Only set up GC tracking in Node.js environments with PerformanceObserver
    if (!this.platform.isNode || typeof PerformanceObserver === "undefined") return;

    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === "gc") {
            this.recordGCEvent(entry as any);
          }
        }
      });

      this.gcObserver.observe({ entryTypes: ["gc"] });
    } catch (_error) {
      // GC tracking not available, continue without it
      // Debug: GC tracking setup failed
    }
  }

  private recordGCEvent(entry: any): void {
    const _memoryMetrics = this.memoryMonitor.getMemoryMetrics();
    const memoryFreed = this.calculateMemoryFreed();
    const gcEvent: IGCEvent = {
      type: this.getGCType(entry.kind || entry.detail?.kind),
      duration: entry.duration,
      timestamp: Date.now(),
      ...(memoryFreed !== undefined && { memoryFreed }),
    };

    this.gcEvents.push(gcEvent);

    // Keep GC events history manageable
    if (this.gcEvents.length > this.maxGCEvents) {
      this.gcEvents.shift();
    }

    // Log significant GC events that might impact performance
    if (gcEvent.duration > 50) {
      console.warn(
        `Long GC event: ${gcEvent.type} took ${gcEvent.duration.toFixed(2)}ms, freed ~${
          gcEvent.memoryFreed ? `${(gcEvent.memoryFreed / (1024 * 1024)).toFixed(1)}MB` : "unknown"
        }`,
      );
    }
  }

  private getGCType(kind: number): string {
    // GC kinds from Node.js perf_hooks
    switch (kind) {
      case 1:
        return "scavenge";
      case 2:
        return "mark-sweep-compact";
      case 4:
        return "incremental-marking";
      case 8:
        return "weak-processing";
      case 15:
        return "all";
      default:
        return "unknown";
    }
  }

  private calculateMemoryFreed(): number | undefined {
    const history = this.memoryMonitor["memoryHistory"]; // Access private field
    if (!history || history.length < 2) return undefined;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    if (!current || !previous) return undefined;

    const freed = previous.heapUsed - current.heapUsed;
    return freed > 0 ? freed : 0;
  }

  private getRecentGCEvents(): IGCEvent[] {
    // Return recent GC events, limited by configuration
    const maxEvents = Math.min(this.config.maxGCEventHistory || 50, this.gcEvents.length);
    return this.gcEvents.slice(-maxEvents);
  }

  private startResourceMetricsCollection(): void {
    this.resourceMetricsInterval = setInterval(() => {
      // Trigger resource metrics update
      this.getResourceMetrics();

      // Periodic memory health analysis
      if (this.config.enableMemoryTracking) {
        const analysis = this.getMemoryAnalysis();
        if (analysis.leakDetected) {
          console.error("Memory leak detected in performance tracker:", analysis.recommendations.join(", "));
        }
      }
    }, this.config.resourceMetricsInterval);
  }

  private getBaselineMetrics(): IOperationMetrics {
    // Return baseline metrics for comparison
    // In a real implementation, this would be loaded from persistent storage
    return {
      count: 1000,
      throughput: 100,
      averageLatency: 50,
      minLatency: 10,
      maxLatency: 200,
      p50Latency: 45,
      p95Latency: 120,
      p99Latency: 180,
      standardDeviation: 15,
      totalTime: 50000,
    };
  }

  private calculateVariance(baseline: IOperationMetrics, current: IOperationMetrics): number {
    if (baseline.averageLatency === 0) return 0;
    return Math.abs((current.averageLatency - baseline.averageLatency) / baseline.averageLatency) * 100;
  }

  private detectCurrentEnvironment(): string {
    const detector = PerformancePlatformDetector.getInstance();
    return detector.getEnvironmentProfile().environment;
  }

  private generateParityRecommendations(variance: number): string[] {
    const recommendations: string[] = [];

    if (variance > 10) {
      recommendations.push(`Performance variance of ${variance.toFixed(1)}% exceeds 10% threshold`);

      if (variance > 25) {
        recommendations.push("Consider environment-specific optimization profile");
      }

      if (variance > 50) {
        recommendations.push("Significant performance degradation detected - review platform capabilities");
      }
    }

    return recommendations;
  }
}
