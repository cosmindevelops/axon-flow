# Troubleshooting Guide: Enhanced Performance Tracking

This guide helps you diagnose and resolve common issues with the enhanced performance tracking system in @axon/logger.

## Table of Contents

1. [Configuration Issues](#configuration-issues)
2. [Performance Impact](#performance-impact)
3. [Memory Issues](#memory-issues)
4. [TypeScript & Decorator Problems](#typescript--decorator-problems)
5. [Cross-Environment Issues](#cross-environment-issues)
6. [Metrics & Monitoring Issues](#metrics--monitoring-issues)
7. [Common Error Messages](#common-error-messages)

## Configuration Issues

### Problem: Performance Tracking Not Working

**Symptoms:**

- No performance metrics being collected
- Decorators appear to have no effect
- Manual tracking returns empty results

**Diagnosis:**

```typescript
// Check if tracking is enabled
const tracker = new EnhancedPerformanceTracker(config);
console.log("Tracker enabled:", tracker.isEnabled());

// Check global tracker setup
import { getDecoratorMetrics } from "@axon/logger";
const metrics = getDecoratorMetrics();
console.log("Decorator metrics:", metrics);
```

**Solutions:**

1. **Ensure tracking is enabled:**

   ```typescript
   const config: IEnhancedPerformanceConfig = {
     enabled: true, // Make sure this is true
     sampleRate: 1.0, // Set to 1.0 for debugging
     // ... other config
   };
   ```

2. **Set global tracker for decorators:**

   ```typescript
   import { setGlobalPerformanceTracker } from "@axon/logger";

   const tracker = new EnhancedPerformanceTracker(config);
   setGlobalPerformanceTracker(tracker); // Required for decorators
   ```

3. **Check sampling configuration:**
   ```typescript
   // Temporarily disable sampling for debugging
   const debugConfig = {
     ...config,
     sampleRate: 1.0, // Track everything
     sample: true,
   };
   ```

### Problem: Configuration Validation Errors

**Symptoms:**

- `Invalid configuration` errors on startup
- TypeScript compilation errors for config

**Diagnosis:**

```typescript
import { PerformanceConfigSchema } from "@axon/logger";

try {
  PerformanceConfigSchema.parse(yourConfig);
  console.log("Configuration is valid");
} catch (error) {
  console.error("Configuration errors:", error.errors);
}
```

**Solutions:**

1. **Use complete configuration:**

   ```typescript
   import { createDefaultPerformanceConfig } from "@axon/logger";

   const config = createDefaultPerformanceConfig({
     // Override only what you need
     enabled: true,
     sampleRate: 0.1,
   });
   ```

2. **Check required properties:**
   ```typescript
   const config: IEnhancedPerformanceConfig = {
     enabled: true,
     sampleRate: 0.1,
     thresholdMs: 100,
     enableMemoryTracking: true,
     enableGCTracking: true,
     maxLatencyHistory: 1000,
     maxGCEventHistory: 50,
     resourceMetricsInterval: 5000,
     enableMeasurementPooling: true,
     measurementPoolInitialSize: 50,
     measurementPoolMaxSize: 200,
     enableEnvironmentOptimization: true,
     enableAutoProfileSelection: false,
     enableParityValidation: false,
     parityValidationInterval: 0,
     enableWebWorkerSupport: false,
     enableBrowserFallbacks: true,
   };
   ```

## Performance Impact

### Problem: High CPU Usage

**Symptoms:**

- Application CPU usage increased significantly
- Slower response times after adding performance tracking

**Diagnosis:**

```typescript
// Monitor tracker overhead
const tracker = new EnhancedPerformanceTracker(config);

setInterval(() => {
  const metrics = tracker.getMetrics();
  const poolUtilization = metrics.measurementPoolUtilization;

  console.log("Pool utilization:", poolUtilization);
  console.log("Operations per second:", metrics.operation.throughput);
}, 5000);
```

**Solutions:**

1. **Reduce sampling rate:**

   ```typescript
   const optimizedConfig = {
     ...config,
     sampleRate: 0.05, // Sample only 5% of operations
     enableParityValidation: false,
   };
   ```

2. **Optimize pool settings:**

   ```typescript
   const optimizedConfig = {
     ...config,
     measurementPoolInitialSize: 20,
     measurementPoolMaxSize: 100,
     maxLatencyHistory: 500, // Reduce history size
   };
   ```

3. **Disable expensive features:**
   ```typescript
   const lightweightConfig = {
     ...config,
     enableGCTracking: false,
     enableMemoryTracking: false,
     resourceMetricsInterval: 10000, // Less frequent metrics
   };
   ```

### Problem: High Memory Usage

**Symptoms:**

- Memory usage grows continuously
- Out of memory errors
- GC pressure warnings

**Diagnosis:**

```typescript
const tracker = new EnhancedPerformanceTracker(config);

setInterval(() => {
  const memoryAnalysis = tracker.getMemoryAnalysis();

  console.log("Memory health:", memoryAnalysis.health);
  console.log("Memory pressure:", memoryAnalysis.pressure);
  console.log("Leak detected:", memoryAnalysis.leakDetected);

  if (memoryAnalysis.leakDetected) {
    console.log("Recommendations:", memoryAnalysis.recommendations);
  }
}, 10000);
```

**Solutions:**

1. **Reduce history limits:**

   ```typescript
   const memoryOptimizedConfig = {
     ...config,
     maxLatencyHistory: 200,
     maxGCEventHistory: 25,
     measurementPoolMaxSize: 50,
   };
   ```

2. **Clear metrics periodically:**

   ```typescript
   // Reset metrics every hour
   setInterval(() => {
     tracker.reset();
   }, 3600000);
   ```

3. **Use streaming metrics:**

   ```typescript
   import { registerPerformanceExporter } from "@axon/logger";

   // Export metrics instead of accumulating
   registerPerformanceExporter({
     name: "streaming-exporter",
     format: "json",
     interval: 30000,
     export: (metrics) => {
       // Send to external system
       sendToMetricsService(metrics);
       return JSON.stringify(metrics);
     },
   });
   ```

## Memory Issues

### Problem: Memory Leaks Detected

**Symptoms:**

- `memoryAnalysis.leakDetected = true`
- Continuous memory growth
- Performance degradation over time

**Diagnosis:**

```typescript
const tracker = new EnhancedPerformanceTracker(config);

// Enable comprehensive memory tracking
const debugConfig = {
  ...config,
  enableMemoryTracking: true,
  enableGCTracking: true,
  parityValidationInterval: 30000,
  enableParityValidation: true,
};

const debugTracker = new EnhancedPerformanceTracker(debugConfig);
```

**Solutions:**

1. **Check for unclosed measurements:**

   ```typescript
   // Make sure all measurements are properly finished
   class SafeService {
     async processData(data: any[]) {
       const measurement = tracker.startOperation("data-processing");

       try {
         const result = await this.process(data);
         tracker.finishOperation(measurement); // Always finish
         tracker.recordSuccess();
         return result;
       } catch (error) {
         tracker.finishOperation(measurement); // Finish on error too
         tracker.recordFailure();
         throw error;
       }
     }
   }
   ```

2. **Use try-finally blocks:**

   ```typescript
   async function withSafeTracking(operation: string, fn: () => Promise<any>) {
     const measurement = tracker.startOperation(operation);
     try {
       const result = await fn();
       tracker.recordSuccess();
       return result;
     } catch (error) {
       tracker.recordFailure();
       throw error;
     } finally {
       tracker.finishOperation(measurement);
     }
   }
   ```

3. **Enable automatic cleanup:**
   ```typescript
   const config = {
     ...baseConfig,
     enableEnvironmentOptimization: true,
     enableAutoProfileSelection: true,
   };
   ```

### Problem: GC Pressure

**Symptoms:**

- Frequent garbage collection events
- High GC duration times
- Application pauses

**Diagnosis:**

```typescript
const tracker = new EnhancedPerformanceTracker({
  ...config,
  enableGCTracking: true,
});

setInterval(() => {
  const metrics = tracker.getMetrics();
  const gcEvents = metrics.gcEvents.slice(-10); // Last 10 events

  const avgGCTime = gcEvents.reduce((sum, gc) => sum + gc.duration, 0) / gcEvents.length;

  console.log("Average GC time:", avgGCTime);
  console.log("GC frequency:", gcEvents.length);
}, 30000);
```

**Solutions:**

1. **Optimize object creation:**

   ```typescript
   const config = {
     ...baseConfig,
     enableMeasurementPooling: true,
     measurementPoolInitialSize: 100,
     measurementPoolMaxSize: 500,
   };
   ```

2. **Reduce memory allocations:**
   ```typescript
   // Use decorators instead of manual tracking to reduce object creation
   @DatabaseTimed({ category: 'user-ops' })
   async fetchUser(id: string) {
     return await this.db.findById(id);
   }
   ```

## TypeScript & Decorator Problems

### Problem: TypeScript Decorator Errors

**Symptoms:**

- `TS1241: Unable to resolve signature` errors
- Decorator compilation errors
- Runtime decorator failures

**Diagnosis:**

```bash
# Check TypeScript configuration
cat tsconfig.json | grep -A5 -B5 "experimentalDecorators"
```

**Solutions:**

1. **Update tsconfig.json:**

   ```json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true,
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "node"
     }
   }
   ```

2. **Use explicit decorator types:**

   ```typescript
   import type { IPerformanceDecoratorOptions } from '@axon/logger';

   const decoratorOptions: IPerformanceDecoratorOptions = {
     category: 'user-service',
     threshold: 100,
   };

   @Timed(decoratorOptions)
   async fetchUser(id: string) {
     // Implementation
   }
   ```

3. **Fallback to manual tracking:**

   ```typescript
   // If decorators don't work, use manual tracking
   import { withTiming } from "@axon/logger";

   const timedFetchUser = withTiming(this.fetchUser.bind(this), { category: "user-service", threshold: 100 });
   ```

### Problem: Import/Export Issues

**Symptoms:**

- Module not found errors
- Import type errors
- Runtime import failures

**Solutions:**

1. **Use correct import paths:**

   ```typescript
   // Correct imports
   import { EnhancedPerformanceTracker, Timed, DatabaseTimed, type IEnhancedPerformanceConfig } from "@axon/logger";

   // Or specific imports
   import { EnhancedPerformanceTracker } from "@axon/logger/performance";
   ```

2. **Check module resolution:**
   ```json
   // package.json
   {
     "type": "module",
     "exports": {
       ".": "./dist/index.js",
       "./performance": "./dist/performance/index.js"
     }
   }
   ```

## Cross-Environment Issues

### Problem: Browser Compatibility

**Symptoms:**

- Performance tracking not working in browsers
- Undefined PerformanceObserver errors
- Missing Node.js APIs

**Solutions:**

1. **Enable browser fallbacks:**

   ```typescript
   const browserConfig: IEnhancedPerformanceConfig = {
     ...baseConfig,
     enableBrowserFallbacks: true,
     enableEnvironmentOptimization: true,
     enableAutoProfileSelection: true,
   };
   ```

2. **Check platform capabilities:**

   ```typescript
   const tracker = new EnhancedPerformanceTracker(config);
   const platformInfo = tracker.getPlatformInfo();

   console.log("Platform:", platformInfo);
   console.log("Capabilities:", platformInfo.capabilities);
   ```

3. **Use conditional features:**
   ```typescript
   const config: IEnhancedPerformanceConfig = {
     ...baseConfig,
     enableGCTracking: typeof process !== "undefined" && process.version,
     enableMemoryTracking: typeof performance !== "undefined",
   };
   ```

### Problem: Node.js Version Compatibility

**Symptoms:**

- Performance APIs not available
- Version-specific errors
- Missing performance features

**Diagnosis:**

```typescript
console.log("Node.js version:", process.version);
console.log("Performance API available:", typeof performance !== "undefined");
console.log("PerformanceObserver available:", typeof PerformanceObserver !== "undefined");
```

**Solutions:**

1. **Check Node.js version requirements:**

   ```typescript
   // Ensure Node.js 18+ for full feature support
   const nodeVersion = process.version;
   const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

   if (majorVersion < 18) {
     console.warn("Performance tracking requires Node.js 18+ for full features");
   }
   ```

2. **Use version-specific configs:**

   ```typescript
   const nodeVersion = parseInt(process.version.slice(1).split(".")[0]);

   const config: IEnhancedPerformanceConfig = {
     ...baseConfig,
     enableGCTracking: nodeVersion >= 18,
     enableAdvancedMetrics: nodeVersion >= 20,
   };
   ```

## Metrics & Monitoring Issues

### Problem: Missing or Incorrect Metrics

**Symptoms:**

- Empty metrics objects
- Incorrect performance measurements
- Missing category data

**Diagnosis:**

```typescript
const tracker = new EnhancedPerformanceTracker(config);

// Test basic functionality
const measurement = tracker.startOperation("test-operation");
setTimeout(() => {
  tracker.finishOperation(measurement);
  tracker.recordSuccess();

  const metrics = tracker.getMetrics();
  console.log("Test metrics:", metrics);
}, 100);
```

**Solutions:**

1. **Ensure proper measurement lifecycle:**

   ```typescript
   // Always follow this pattern
   const measurement = tracker.startOperation(category, metadata);
   // ... do work ...
   tracker.finishOperation(measurement);
   tracker.recordSuccess(); // or recordFailure()
   ```

2. **Check category filtering:**

   ```typescript
   // Get metrics for specific category
   const categoryMetrics = tracker.getCategoryMetrics("database");
   const allMetrics = tracker.getMetrics();

   console.log("Category metrics:", categoryMetrics);
   console.log("All metrics:", allMetrics);
   ```

3. **Verify sampling settings:**
   ```typescript
   const config = {
     ...baseConfig,
     sampleRate: 1.0, // Ensure all operations are tracked
     sample: true,
   };
   ```

### Problem: Performance Budget Violations Not Triggering

**Symptoms:**

- No warnings for slow operations
- Budget handlers not called
- Threshold violations ignored

**Diagnosis:**

```typescript
import { setPerformanceBudget } from '@axon/logger';

// Set a test budget
setPerformanceBudget('test-category', {
  maxLatencyMs: 50, // Very low threshold for testing
  onExceeded: 'warn',
  warningThreshold: 0.5,
});

// Create a slow operation
@Timed({
  category: 'test-category',
  budget: { maxLatencyMs: 50, onExceeded: 'warn' }
})
async testSlowOperation() {
  await new Promise(resolve => setTimeout(resolve, 100)); // Slow operation
}
```

**Solutions:**

1. **Check budget configuration:**

   ```typescript
   import { getPerformanceBudgets } from "@axon/logger";

   const budgets = getPerformanceBudgets();
   console.log("Configured budgets:", budgets);
   ```

2. **Use custom handlers:**
   ```typescript
   setPerformanceBudget("critical-ops", {
     maxLatencyMs: 100,
     onExceeded: "custom",
     customHandler: (category, latency, budget) => {
       console.error(`BUDGET VIOLATION: ${category} took ${latency}ms (budget: ${budget}ms)`);
       // Add custom alerting logic
     },
   });
   ```

## Common Error Messages

### `Performance tracker not initialized`

**Cause:** Global performance tracker not set for decorators.

**Solution:**

```typescript
import { setGlobalPerformanceTracker } from "@axon/logger";

const tracker = new EnhancedPerformanceTracker(config);
setGlobalPerformanceTracker(tracker);
```

### `Invalid configuration: missing required property`

**Cause:** Incomplete configuration object.

**Solution:**

```typescript
import { createDefaultPerformanceConfig } from "@axon/logger";

const config = createDefaultPerformanceConfig({
  // Your overrides here
});
```

### `PerformanceObserver is not defined`

**Cause:** Environment doesn't support PerformanceObserver API.

**Solution:**

```typescript
const config: IEnhancedPerformanceConfig = {
  ...baseConfig,
  enableBrowserFallbacks: true,
  enableEnvironmentOptimization: true,
};
```

### `Cannot read property 'startTime' of undefined`

**Cause:** Measurement object is not properly initialized.

**Solution:**

```typescript
// Always check measurement before using
const measurement = tracker.startOperation("operation");
if (measurement && measurement.startTime) {
  // Safe to use measurement
  tracker.finishOperation(measurement);
}
```

### `Memory leak detected in performance tracker`

**Cause:** Unclosed measurements or excessive metric accumulation.

**Solution:**

```typescript
// Implement periodic cleanup
setInterval(() => {
  tracker.reset(); // Clear accumulated metrics
}, 3600000); // Every hour

// Or use streaming exporters
registerPerformanceExporter({
  name: "cleanup-exporter",
  interval: 300000, // 5 minutes
  export: (metrics) => {
    // Export and clear
    return JSON.stringify(metrics);
  },
});
```

## Debug Mode

### Enable Debug Logging

```typescript
const debugConfig: IEnhancedPerformanceConfig = {
  ...baseConfig,
  enabled: true,
  sampleRate: 1.0,
  enableParityValidation: true,
  parityValidationInterval: 10000,
  thresholdMs: 0, // Log all operations
};

const tracker = new EnhancedPerformanceTracker(debugConfig);

// Monitor all operations
setInterval(() => {
  const metrics = tracker.getMetrics();
  console.log("Debug metrics:", {
    operationCount: metrics.operation.count,
    avgLatency: metrics.operation.averageLatency,
    memoryHealth: tracker.getMemoryAnalysis().health,
    poolUtilization: metrics.measurementPoolUtilization,
  });
}, 5000);
```

### Performance Health Check

```typescript
function performHealthCheck(tracker: EnhancedPerformanceTracker) {
  const metrics = tracker.getMetrics();
  const memoryAnalysis = tracker.getMemoryAnalysis();
  const platformInfo = tracker.getPlatformInfo();

  const health = {
    status: "healthy",
    issues: [] as string[],
    recommendations: [] as string[],
  };

  // Check memory
  if (memoryAnalysis.leakDetected) {
    health.status = "critical";
    health.issues.push("Memory leak detected");
    health.recommendations.push(...memoryAnalysis.recommendations);
  }

  // Check performance
  if (metrics.operation.p95Latency > 1000) {
    health.status = "warning";
    health.issues.push("High P95 latency");
    health.recommendations.push("Consider optimizing slow operations");
  }

  // Check pool utilization
  if (metrics.measurementPoolUtilization > 90) {
    health.status = "warning";
    health.issues.push("High pool utilization");
    health.recommendations.push("Increase measurement pool size");
  }

  return health;
}
```

If you continue to experience issues after following this troubleshooting guide, please check the [API Reference](./api-reference.md) for detailed configuration options or review the [Integration Guide](./integration-guide.md) for framework-specific implementations.
