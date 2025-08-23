# Performance Tuning Guide

This guide provides environment-specific optimization recommendations for the enhanced performance tracker to achieve optimal performance across different deployment scenarios.

## Table of Contents

- [Environment-Specific Configurations](#environment-specific-configurations)
- [Memory Optimization](#memory-optimization)
- [Sampling Strategies](#sampling-strategies)
- [Pool Configuration](#pool-configuration)
- [Platform-Specific Tuning](#platform-specific-tuning)
- [Production Optimization](#production-optimization)
- [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

## Environment-Specific Configurations

### Development Environment

**Goals**: Maximum visibility, easy debugging, comprehensive monitoring

```typescript
import { EnhancedPerformanceTracker } from "@axon/logger/performance";

const developmentConfig = {
  enabled: true,
  sampleRate: 1.0, // Monitor 100% of operations
  thresholdMs: 50, // Lower threshold for development
  enableMemoryTracking: true,
  enableGCTracking: true,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 25,
  measurementPoolMaxSize: 100,
  maxLatencyHistory: 500,
  maxGCEventHistory: 100,
  resourceMetricsInterval: 2000, // More frequent monitoring
  enableEnvironmentOptimization: true,
  enableParityValidation: true,
  parityValidationInterval: 60000,
};

const devTracker = new EnhancedPerformanceTracker(developmentConfig);

// Development-specific alerting
setInterval(() => {
  const metrics = devTracker.getMetrics();
  const memoryAnalysis = devTracker.getMemoryAnalysis();

  // Log detailed performance info in development
  console.log("🔧 Dev Performance Metrics:", {
    avgLatency: metrics.operation.averageLatency.toFixed(2),
    p95Latency: metrics.operation.p95Latency.toFixed(2),
    memoryHealth: memoryAnalysis.health,
    poolEfficiency: devTracker.getPoolEfficiency().toFixed(1),
  });
}, 10000); // Every 10 seconds
```

### Staging Environment

**Goals**: Production-like monitoring with enhanced debugging capabilities

```typescript
const stagingConfig = {
  enabled: true,
  sampleRate: 0.5, // Monitor 50% of operations
  thresholdMs: 75,
  enableMemoryTracking: true,
  enableGCTracking: true,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 50,
  measurementPoolMaxSize: 200,
  maxLatencyHistory: 1000,
  maxGCEventHistory: 50,
  resourceMetricsInterval: 5000,
  enableEnvironmentOptimization: true,
  enableParityValidation: true,
  parityValidationInterval: 300000, // 5 minutes
};

const stagingTracker = new EnhancedPerformanceTracker(stagingConfig);

// Staging-specific performance validation
setInterval(() => {
  const parityReport = stagingTracker.validatePerformanceParity();

  if (!parityReport.parityMaintained) {
    console.warn(`⚠️ Staging Performance Variance: ${parityReport.variance.toFixed(1)}%`);
    console.log("Recommendations:", parityReport.recommendations);
  }
}, 120000); // Every 2 minutes
```

### Production Environment

**Goals**: Minimal overhead, efficient monitoring, automated alerting

```typescript
const productionConfig = {
  enabled: true,
  sampleRate: 0.1, // Monitor 10% of operations
  thresholdMs: 100,
  enableMemoryTracking: true,
  enableGCTracking: true,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 100,
  measurementPoolMaxSize: 500,
  maxLatencyHistory: 2000,
  maxGCEventHistory: 100,
  resourceMetricsInterval: 10000,
  enableEnvironmentOptimization: true,
  enableParityValidation: false, // Disable in production for performance
  parityValidationInterval: 0,
};

const productionTracker = new EnhancedPerformanceTracker(productionConfig);

// Production monitoring with alerting
setInterval(() => {
  const memoryAnalysis = productionTracker.getMemoryAnalysis();

  if (memoryAnalysis.leakDetected) {
    // Send alert to monitoring system
    alertingSystem.sendCriticalAlert("Memory leak detected in production", {
      recommendations: memoryAnalysis.recommendations,
      growthRate: memoryAnalysis.growthRate,
    });
  }

  if (memoryAnalysis.pressure === "critical") {
    // Trigger auto-scaling or remediation
    scalingService.triggerAutoScale("memory-pressure");
  }
}, 60000); // Every minute
```

## Memory Optimization

### Low-Memory Environments

**Configuration for memory-constrained environments (containers, edge computing)**

```typescript
const lowMemoryConfig = {
  enabled: true,
  sampleRate: 0.05, // Minimal sampling
  thresholdMs: 200,
  enableMemoryTracking: false, // Disable to save memory
  enableGCTracking: false,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 10,
  measurementPoolMaxSize: 25,
  maxLatencyHistory: 100,
  maxGCEventHistory: 10,
  resourceMetricsInterval: 30000,
  enableEnvironmentOptimization: true,
};

const lowMemoryTracker = new EnhancedPerformanceTracker(lowMemoryConfig);

// Periodic memory cleanup
setInterval(() => {
  // Force pool compaction
  const pool = lowMemoryTracker["measurementPool"]; // Access private field carefully
  if (pool && typeof pool.compact === "function") {
    pool.compact();
  }
}, 300000); // Every 5 minutes
```

### High-Memory Environments

**Configuration for high-memory environments (dedicated servers, cloud instances)**

```typescript
const highMemoryConfig = {
  enabled: true,
  sampleRate: 1.0, // Full monitoring capability
  thresholdMs: 50,
  enableMemoryTracking: true,
  enableGCTracking: true,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 200,
  measurementPoolMaxSize: 1000,
  maxLatencyHistory: 5000,
  maxGCEventHistory: 500,
  resourceMetricsInterval: 2000,
  enableEnvironmentOptimization: true,
  enableParityValidation: true,
  parityValidationInterval: 60000,
};

const highMemoryTracker = new EnhancedPerformanceTracker(highMemoryConfig);

// Advanced memory analysis
setInterval(() => {
  const metrics = highMemoryTracker.getMetrics();
  const memoryAnalysis = highMemoryTracker.getMemoryAnalysis();

  // Detailed memory reporting
  console.log("🧠 Advanced Memory Analysis:", {
    heapUtilization: metrics.resource.memory.utilization.toFixed(1) + "%",
    growthRate: memoryAnalysis.growthRate.toFixed(2) + " MB/min",
    trend: memoryAnalysis.trend,
    gcEventCount: metrics.gcEvents.length,
    avgGCDuration:
      metrics.gcEvents.length > 0
        ? (metrics.gcEvents.reduce((sum, gc) => sum + gc.duration, 0) / metrics.gcEvents.length).toFixed(2) + "ms"
        : "N/A",
    poolEfficiency: highMemoryTracker.getPoolEfficiency().toFixed(1) + "%",
  });
}, 30000);
```

## Sampling Strategies

### Fixed Sampling

**Best for**: Predictable load, consistent performance requirements

```typescript
// Simple fixed sampling
const fixedSamplingConfig = {
  enabled: true,
  sampleRate: 0.1, // 10% of operations
  // ... other config
};
```

### Adaptive Sampling

**Best for**: Variable load, performance-sensitive applications

```typescript
import { SampledTiming } from "@axon/logger/performance";

class AdaptiveSamplingService {
  @SampledTiming({
    strategy: "adaptive",
    baseRate: 0.05, // 5% base sampling
    maxRate: 1.0, // Up to 100% when performance degrades
    adaptiveThreshold: 200, // Switch to higher sampling when latency > 200ms
    errorSampleRate: 1.0, // Always sample errors
  })
  async criticalOperation(): Promise<void> {
    // Operation with adaptive sampling
  }

  @SampledTiming({
    strategy: "burst",
    baseRate: 0.02, // 2% normal sampling
    maxRate: 0.5, // 50% during burst periods
    burstInterval: 300000, // 5-minute burst intervals
  })
  async batchOperation(): Promise<void> {
    // Burst sampling for periodic monitoring
  }
}
```

### Performance-Based Sampling

**Best for**: Applications with strict performance requirements

```typescript
class PerformanceBasedSampling {
  private tracker: EnhancedPerformanceTracker;
  private currentSampleRate = 0.1;

  constructor() {
    this.tracker = new EnhancedPerformanceTracker({
      enabled: true,
      sampleRate: this.currentSampleRate,
      // ... other config
    });

    this.adjustSamplingBasedOnPerformance();
  }

  private adjustSamplingBasedOnPerformance() {
    setInterval(() => {
      const metrics = this.tracker.getMetrics();

      // Adjust sampling based on system performance
      if (metrics.operation.p95Latency > 500) {
        // High latency - increase sampling for better visibility
        this.currentSampleRate = Math.min(this.currentSampleRate * 2, 1.0);
      } else if (metrics.operation.p95Latency < 100) {
        // Low latency - reduce sampling to save resources
        this.currentSampleRate = Math.max(this.currentSampleRate * 0.8, 0.01);
      }

      // Update tracker configuration
      this.tracker.updateConfig({ sampleRate: this.currentSampleRate });

      console.log(`📊 Adjusted sampling rate to ${(this.currentSampleRate * 100).toFixed(1)}%`);
    }, 120000); // Every 2 minutes
  }
}
```

## Pool Configuration

### High-Throughput Configuration

**For applications with >10,000 operations/second**

```typescript
const highThroughputConfig = {
  enabled: true,
  sampleRate: 0.05, // Lower sampling to reduce overhead
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 500,
  measurementPoolMaxSize: 2000,
  // Pool optimization settings
  enableEnvironmentOptimization: true,
};

const highThroughputTracker = new EnhancedPerformanceTracker(highThroughputConfig);

// Monitor pool efficiency under high load
setInterval(() => {
  const poolMetrics = highThroughputTracker["measurementPool"].getEfficiencyMetrics();

  console.log("🏊 Pool Efficiency Metrics:", {
    reuseRate: poolMetrics.reuseRate.toFixed(1) + "%",
    hitRate: poolMetrics.hitRate.toFixed(1) + "%",
    poolSize: poolMetrics.poolSize,
    activeCount: poolMetrics.activeCount,
    availableCount: poolMetrics.availableCount,
  });

  // Alert if pool efficiency drops
  if (poolMetrics.hitRate < 70) {
    console.warn("⚠️ Low pool hit rate detected, consider increasing pool size");
  }
}, 60000);
```

### Low-Throughput Configuration

**For applications with <1,000 operations/second**

```typescript
const lowThroughputConfig = {
  enabled: true,
  sampleRate: 1.0, // Can afford full sampling
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 25,
  measurementPoolMaxSize: 100,
  enableEnvironmentOptimization: true,
};

const lowThroughputTracker = new EnhancedPerformanceTracker(lowThroughputConfig);

// Periodic pool optimization for low-throughput scenarios
setInterval(() => {
  const pool = lowThroughputTracker["measurementPool"];
  if (pool && typeof pool.compact === "function") {
    pool.compact(); // Remove unused pooled objects
  }
}, 600000); // Every 10 minutes
```

## Platform-Specific Tuning

### Node.js Optimization

#### Node.js 18 LTS

```typescript
const node18Config = {
  enabled: true,
  sampleRate: 0.5,
  enableMemoryTracking: true,
  enableGCTracking: true,
  measurementPoolInitialSize: 50,
  measurementPoolMaxSize: 200,
  resourceMetricsInterval: 5000,
};
```

#### Node.js 20+ LTS (Recommended)

```typescript
const node20Config = {
  enabled: true,
  sampleRate: 1.0, // Can handle full monitoring
  enableMemoryTracking: true,
  enableGCTracking: true,
  measurementPoolInitialSize: 100,
  measurementPoolMaxSize: 500,
  resourceMetricsInterval: 2000,
  enableEnvironmentOptimization: true,
};

// Take advantage of Node.js 20+ performance improvements
const node20Tracker = new EnhancedPerformanceTracker(node20Config);

// Enhanced GC monitoring for Node.js 20+
setInterval(() => {
  const gcEvents = node20Tracker.getMetrics().gcEvents;
  const recentEvents = gcEvents.slice(-10);

  if (recentEvents.length > 0) {
    const avgGCTime = recentEvents.reduce((sum, event) => sum + event.duration, 0) / recentEvents.length;

    console.log("🗑️ Node.js 20+ GC Performance:", {
      recentEventCount: recentEvents.length,
      avgGCTime: avgGCTime.toFixed(2) + "ms",
      gcTypes: [...new Set(recentEvents.map((e) => e.type))],
    });
  }
}, 30000);
```

### Browser Optimization

#### Modern Browsers (Chrome 100+, Firefox 100+, Safari 15+)

```typescript
const modernBrowserConfig = {
  enabled: true,
  sampleRate: 0.1, // Conservative sampling for browsers
  enableMemoryTracking: true,
  enableGCTracking: false, // GC tracking not available in browsers
  measurementPoolInitialSize: 25,
  measurementPoolMaxSize: 100,
  resourceMetricsInterval: 10000,
  enableEnvironmentOptimization: true,
  enableBrowserFallbacks: true,
};

// Browser-specific performance monitoring
class BrowserPerformanceMonitor {
  private tracker: EnhancedPerformanceTracker;

  constructor() {
    this.tracker = new EnhancedPerformanceTracker(modernBrowserConfig);
    this.setupBrowserSpecificMonitoring();
  }

  private setupBrowserSpecificMonitoring() {
    // Use Performance Observer API if available
    if (typeof PerformanceObserver !== "undefined") {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            console.log("🌐 Navigation Performance:", {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
            });
          }
        });
      });

      observer.observe({ entryTypes: ["navigation", "resource"] });
    }

    // Monitor browser-specific memory if available
    if (typeof (performance as any).memory !== "undefined") {
      setInterval(() => {
        const memory = (performance as any).memory;
        console.log("🧠 Browser Memory:", {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + " MB",
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + " MB",
          utilization: ((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(1) + "%",
        });
      }, 30000);
    }
  }
}
```

### Web Worker Optimization

```typescript
const webWorkerConfig = {
  enabled: true,
  sampleRate: 0.05, // Minimal sampling to avoid blocking worker
  enableMemoryTracking: false, // Not available in workers
  enableGCTracking: false,
  measurementPoolInitialSize: 15,
  measurementPoolMaxSize: 50,
  resourceMetricsInterval: 30000,
  enableWebWorkerSupport: true,
};

// Web Worker performance tracker
class WebWorkerPerformanceTracker {
  private tracker: EnhancedPerformanceTracker;

  constructor() {
    this.tracker = new EnhancedPerformanceTracker(webWorkerConfig);
    this.setupWorkerMonitoring();
  }

  private setupWorkerMonitoring() {
    // Minimal overhead monitoring for web workers
    setInterval(() => {
      const metrics = this.tracker.getMetrics();

      // Post performance data to main thread
      if (typeof self !== "undefined" && self.postMessage) {
        self.postMessage({
          type: "performance-metrics",
          data: {
            avgLatency: metrics.operation.averageLatency,
            throughput: metrics.operation.throughput,
            poolUtilization: metrics.measurementPoolUtilization,
          },
        });
      }
    }, 120000); // Every 2 minutes
  }
}
```

## Production Optimization

### Automated Performance Tuning

```typescript
class AutoTuningPerformanceTracker {
  private tracker: EnhancedPerformanceTracker;
  private baseConfig: any;
  private tuningInterval: NodeJS.Timeout;

  constructor(baseConfig: any) {
    this.baseConfig = baseConfig;
    this.tracker = new EnhancedPerformanceTracker(baseConfig);
    this.startAutoTuning();
  }

  private startAutoTuning() {
    this.tuningInterval = setInterval(() => {
      this.adjustConfiguration();
    }, 300000); // Every 5 minutes
  }

  private adjustConfiguration() {
    const metrics = this.tracker.getMetrics();
    const memoryAnalysis = this.tracker.getMemoryAnalysis();
    const platformInfo = this.tracker.getPlatformInfo();

    let newConfig = { ...this.baseConfig };

    // Adjust sampling based on performance
    if (metrics.operation.p95Latency > 1000) {
      // High latency - reduce sampling to decrease overhead
      newConfig.sampleRate = Math.max(newConfig.sampleRate * 0.8, 0.01);
      console.log("🔧 Reduced sampling rate due to high latency");
    } else if (metrics.operation.p95Latency < 100) {
      // Low latency - can afford higher sampling
      newConfig.sampleRate = Math.min(newConfig.sampleRate * 1.2, 1.0);
      console.log("🔧 Increased sampling rate due to low latency");
    }

    // Adjust pool size based on utilization
    const poolUtilization = metrics.measurementPoolUtilization;
    if (poolUtilization > 90) {
      // High utilization - increase pool size
      newConfig.measurementPoolMaxSize = Math.min(
        newConfig.measurementPoolMaxSize * 1.5,
        platformInfo.capabilities.recommendedPoolSize * 2,
      );
      console.log("🏊 Increased pool size due to high utilization");
    } else if (poolUtilization < 30) {
      // Low utilization - decrease pool size
      newConfig.measurementPoolMaxSize = Math.max(
        newConfig.measurementPoolMaxSize * 0.8,
        newConfig.measurementPoolInitialSize * 2,
      );
      console.log("🏊 Decreased pool size due to low utilization");
    }

    // Adjust resource metrics interval based on memory pressure
    if (memoryAnalysis.pressure === "high" || memoryAnalysis.pressure === "critical") {
      // Increase monitoring frequency during memory pressure
      newConfig.resourceMetricsInterval = Math.max(newConfig.resourceMetricsInterval * 0.5, 1000);
    } else if (memoryAnalysis.pressure === "low") {
      // Decrease monitoring frequency when memory is stable
      newConfig.resourceMetricsInterval = Math.min(newConfig.resourceMetricsInterval * 1.2, 30000);
    }

    // Apply new configuration
    this.tracker.updateConfig(newConfig);
    this.baseConfig = newConfig;
  }

  stop() {
    if (this.tuningInterval) {
      clearInterval(this.tuningInterval);
    }
  }
}

// Usage
const autoTuning = new AutoTuningPerformanceTracker({
  enabled: true,
  sampleRate: 0.1,
  enableMemoryTracking: true,
  enableGCTracking: true,
  measurementPoolInitialSize: 100,
  measurementPoolMaxSize: 500,
  resourceMetricsInterval: 5000,
});
```

## Troubleshooting Performance Issues

### Common Performance Problems

#### 1. High Memory Usage

```typescript
// Diagnostic code for memory issues
function diagnoseMemoryIssues(tracker: EnhancedPerformanceTracker) {
  const memoryAnalysis = tracker.getMemoryAnalysis();
  const metrics = tracker.getMetrics();

  console.log("🔍 Memory Diagnostic Report:");

  if (memoryAnalysis.leakDetected) {
    console.error("❌ Memory leak detected:");
    console.log("- Growth rate:", memoryAnalysis.growthRate.toFixed(2), "MB/min");
    console.log("- Trend:", memoryAnalysis.trend);
    console.log("- Recommendations:");
    memoryAnalysis.recommendations.forEach((rec) => console.log("  •", rec));
  }

  if (memoryAnalysis.pressure === "high" || memoryAnalysis.pressure === "critical") {
    console.warn("⚠️ High memory pressure:");
    console.log("- Heap utilization:", metrics.resource.memory.utilization.toFixed(1) + "%");
    console.log("- RSS:", Math.round(metrics.resource.memory.rss / 1024 / 1024), "MB");

    // Suggest remediation
    console.log("💡 Suggested actions:");
    console.log("- Reduce pool sizes");
    console.log("- Decrease sampling rate");
    console.log("- Enable pool compaction");
  }

  // Pool efficiency check
  const poolEfficiency = tracker.getPoolEfficiency();
  if (poolEfficiency < 60) {
    console.warn("⚠️ Low pool efficiency:", poolEfficiency.toFixed(1) + "%");
    console.log("💡 Consider increasing pool initial size");
  }
}
```

#### 2. High Latency

```typescript
// Diagnostic code for latency issues
function diagnoseLatencyIssues(tracker: EnhancedPerformanceTracker) {
  const metrics = tracker.getMetrics();

  console.log("🔍 Latency Diagnostic Report:");

  if (metrics.operation.p99Latency > 1000) {
    console.error("❌ High P99 latency:", metrics.operation.p99Latency.toFixed(2) + "ms");

    // Check GC impact
    const recentGCEvents = metrics.gcEvents.slice(-10);
    const longGCEvents = recentGCEvents.filter((event) => event.duration > 50);

    if (longGCEvents.length > 3) {
      console.warn("⚠️ Frequent long GC events detected:");
      longGCEvents.forEach((event) => {
        console.log(`- ${event.type}: ${event.duration.toFixed(2)}ms`);
      });
      console.log("💡 Consider GC tuning or reducing memory allocation");
    }

    // Check resource utilization
    if (metrics.resource.cpuUsage > 80) {
      console.warn("⚠️ High CPU usage:", metrics.resource.cpuUsage.toFixed(1) + "%");
      console.log("💡 Consider reducing sampling rate or performance monitoring overhead");
    }

    // Check event loop delay (Node.js)
    if (metrics.resource.eventLoopDelay && metrics.resource.eventLoopDelay > 10) {
      console.warn("⚠️ High event loop delay:", metrics.resource.eventLoopDelay.toFixed(2) + "ms");
      console.log("💡 Consider reducing synchronous operations or increasing concurrency");
    }
  }
}
```

#### 3. Performance Variance

```typescript
// Diagnostic code for performance variance
function diagnosePerformanceVariance(tracker: EnhancedPerformanceTracker) {
  const parityReport = tracker.validatePerformanceParity();

  console.log("🔍 Performance Variance Diagnostic:");

  if (!parityReport.parityMaintained) {
    console.error("❌ Performance parity not maintained:");
    console.log("- Variance:", parityReport.variance.toFixed(1) + "%");
    console.log("- Environment:", parityReport.environment);
    console.log("- Recommendations:");
    parityReport.recommendations.forEach((rec) => console.log("  •", rec));

    // Platform-specific diagnostics
    const platformInfo = tracker.getPlatformInfo();
    console.log("🔧 Platform Information:");
    console.log("- Environment:", platformInfo.isNode ? "Node.js" : "Browser");
    console.log("- Node version:", platformInfo.nodeVersion || "N/A");
    console.log("- Browser:", platformInfo.browserName || "N/A");
    console.log("- GC support:", platformInfo.hasGCSupport);
    console.log("- Memory API:", platformInfo.hasMemoryAPI);
    console.log("- Recommended pool size:", platformInfo.capabilities.recommendedPoolSize);
    console.log("- Optimal sample rate:", platformInfo.capabilities.optimalSampleRate);
  }
}
```

### Performance Health Check

```typescript
// Comprehensive performance health check
function performHealthCheck(tracker: EnhancedPerformanceTracker): HealthCheckResult {
  const metrics = tracker.getMetrics();
  const memoryAnalysis = tracker.getMemoryAnalysis();
  const parityReport = tracker.validatePerformanceParity();
  const platformInfo = tracker.getPlatformInfo();

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check latency
  if (metrics.operation.p95Latency > 500) {
    issues.push(`High P95 latency: ${metrics.operation.p95Latency.toFixed(2)}ms`);
    recommendations.push("Consider optimizing slow operations or reducing sampling");
  }

  // Check memory
  if (memoryAnalysis.leakDetected) {
    issues.push("Memory leak detected");
    recommendations.push("Investigate object retention and memory usage patterns");
  }

  if (memoryAnalysis.pressure === "critical") {
    issues.push("Critical memory pressure");
    recommendations.push("Reduce memory usage or increase available memory");
  }

  // Check performance parity
  if (!parityReport.parityMaintained) {
    issues.push(`Performance variance too high: ${parityReport.variance.toFixed(1)}%`);
    recommendations.push("Consider environment-specific optimization");
  }

  // Check pool efficiency
  const poolEfficiency = tracker.getPoolEfficiency();
  if (poolEfficiency < 70) {
    issues.push(`Low pool efficiency: ${poolEfficiency.toFixed(1)}%`);
    recommendations.push("Consider increasing pool size or adjusting configuration");
  }

  const healthScore = Math.max(0, 100 - issues.length * 20);

  return {
    healthy: issues.length === 0,
    healthScore,
    issues,
    recommendations,
    metrics: {
      avgLatency: metrics.operation.averageLatency,
      p95Latency: metrics.operation.p95Latency,
      memoryHealth: memoryAnalysis.health,
      poolEfficiency,
      parityMaintained: parityReport.parityMaintained,
    },
  };
}

interface HealthCheckResult {
  healthy: boolean;
  healthScore: number;
  issues: string[];
  recommendations: string[];
  metrics: {
    avgLatency: number;
    p95Latency: number;
    memoryHealth: string;
    poolEfficiency: number;
    parityMaintained: boolean;
  };
}
```

This performance tuning guide provides comprehensive optimization strategies for different environments and scenarios, helping you achieve optimal performance with the enhanced performance tracker.
