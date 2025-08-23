# Migration Guide: Enhanced Performance Tracking

This guide helps you migrate from basic logging to the enhanced performance tracking system in @axon/logger.

## Overview

The enhanced performance tracker provides comprehensive monitoring capabilities including:

- Advanced memory leak detection
- Garbage collection tracking
- Cross-environment compatibility
- Object pool optimization
- Performance budgets and alerts
- Detailed statistical metrics

## Quick Migration

### 1. Update Configuration

**Before: Basic Configuration**

```typescript
import { Logger } from "@axon/logger";

const logger = new Logger({
  level: "info",
  transport: {
    type: "console",
  },
});
```

**After: Enhanced Performance Configuration**

```typescript
import { EnhancedPerformanceTracker, setGlobalPerformanceTracker } from "@axon/logger";

// Create enhanced tracker
const performanceTracker = new EnhancedPerformanceTracker({
  enabled: true,
  sampleRate: 0.1, // Monitor 10% of operations
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
});

// Set as global tracker for decorators
setGlobalPerformanceTracker(performanceTracker);
```

### 2. Migrate Manual Timing

**Before: Manual Timing with console.time**

```typescript
class UserService {
  async fetchUser(id: string) {
    console.time("fetchUser");
    try {
      const user = await this.database.findById(id);
      console.timeEnd("fetchUser");
      return user;
    } catch (error) {
      console.timeEnd("fetchUser");
      throw error;
    }
  }
}
```

**After: Enhanced Performance Decorators**

```typescript
import { DatabaseTimed } from "@axon/logger";

class UserService {
  @DatabaseTimed({
    category: "user-operations",
    threshold: 100,
    budget: { maxLatencyMs: 200, onExceeded: "warn" },
  })
  async fetchUser(id: string) {
    return await this.database.findById(id);
  }
}
```

**Alternative: Manual Tracking**

```typescript
class UserService {
  constructor(private performanceTracker: EnhancedPerformanceTracker) {}

  async fetchUser(id: string) {
    const measurement = this.performanceTracker.startOperation("user-fetch", {
      operation: "database",
      userId: id.substring(0, 8) + "...",
    });

    try {
      const user = await this.database.findById(id);
      this.performanceTracker.finishOperation(measurement);
      this.performanceTracker.recordSuccess();
      return user;
    } catch (error) {
      this.performanceTracker.finishOperation(measurement);
      this.performanceTracker.recordFailure();
      throw error;
    }
  }
}
```

## Step-by-Step Migration

### Phase 1: Add Enhanced Tracker

1. **Install dependencies** (if not already installed):

   ```bash
   pnpm add @axon/logger
   ```

2. **Create performance configuration**:

   ```typescript
   // config/performance.ts
   import { EnhancedPerformanceTracker, IEnhancedPerformanceConfig } from "@axon/logger";

   export const performanceConfig: IEnhancedPerformanceConfig = {
     enabled: process.env.NODE_ENV !== "test",
     sampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
     thresholdMs: 100,
     enableMemoryTracking: true,
     enableGCTracking: process.env.NODE_ENV === "production",
     maxLatencyHistory: 1000,
     maxGCEventHistory: 50,
     resourceMetricsInterval: 5000,
     enableMeasurementPooling: true,
     measurementPoolInitialSize: 50,
     measurementPoolMaxSize: 200,
     enableEnvironmentOptimization: true,
     enableAutoProfileSelection: true,
     enableParityValidation: false,
     parityValidationInterval: 0,
     enableWebWorkerSupport: false,
     enableBrowserFallbacks: true,
   };
   ```

3. **Initialize tracker at application startup**:

   ```typescript
   // app.ts
   import { EnhancedPerformanceTracker, setGlobalPerformanceTracker } from "@axon/logger";
   import { performanceConfig } from "./config/performance.js";

   const performanceTracker = new EnhancedPerformanceTracker(performanceConfig);
   setGlobalPerformanceTracker(performanceTracker);
   ```

### Phase 2: Migrate Critical Operations

Start with your most performance-sensitive operations:

1. **Database Operations**:

   ```typescript
   // Before
   class UserRepository {
     async findById(id: string) {
       return await this.db.findOne({ id });
     }
   }

   // After
   import { DatabaseTimed } from "@axon/logger";

   class UserRepository {
     @DatabaseTimed({
       threshold: 200,
       budget: { maxLatencyMs: 500, onExceeded: "warn" },
     })
     async findById(id: string) {
       return await this.db.findOne({ id });
     }
   }
   ```

2. **API Endpoints**:

   ```typescript
   // Before
   app.get("/api/users/:id", async (req, res) => {
     const user = await userService.fetchUser(req.params.id);
     res.json(user);
   });

   // After
   import { NetworkTimed } from "@axon/logger";

   class UserController {
     @NetworkTimed({
       category: "api-endpoints",
       threshold: 300,
     })
     async getUser(id: string) {
       return await this.userService.fetchUser(id);
     }
   }
   ```

3. **Heavy Computations**:

   ```typescript
   // Before
   function processLargeDataset(data: any[]) {
     return data.map((item) => heavyTransformation(item));
   }

   // After
   import { ComputationTimed } from "@axon/logger";

   class DataProcessor {
     @ComputationTimed({
       threshold: 100,
       trackParameters: true,
     })
     processLargeDataset(data: any[]) {
       return data.map((item) => this.heavyTransformation(item));
     }
   }
   ```

### Phase 3: Add Monitoring and Alerting

1. **Set up performance monitoring**:

   ```typescript
   // monitoring.ts
   import { EnhancedPerformanceTracker } from "@axon/logger";

   export function setupPerformanceMonitoring(tracker: EnhancedPerformanceTracker) {
     // Detailed monitoring every 30 seconds
     setInterval(() => {
       const metrics = tracker.getMetrics();
       const memoryAnalysis = tracker.getMemoryAnalysis();

       // Log performance metrics
       console.log("Performance Metrics:", {
         operations: metrics.operation.count,
         avgLatency: `${metrics.operation.averageLatency.toFixed(2)}ms`,
         p95Latency: `${metrics.operation.p95Latency.toFixed(2)}ms`,
         memoryHealth: memoryAnalysis.health,
         memoryPressure: memoryAnalysis.pressure,
       });

       // Alert on issues
       if (memoryAnalysis.leakDetected) {
         console.error("🚨 MEMORY LEAK DETECTED!", memoryAnalysis.recommendations);
       }

       if (metrics.operation.p95Latency > 1000) {
         console.warn("⚠️ HIGH LATENCY DETECTED:", metrics.operation.p95Latency);
       }
     }, 30000);
   }
   ```

2. **Configure performance budgets**:

   ```typescript
   import { setPerformanceBudget } from "@axon/logger";

   // Set budgets for different operation types
   setPerformanceBudget("database", {
     maxLatencyMs: 200,
     onExceeded: "warn",
     warningThreshold: 0.8,
   });

   setPerformanceBudget("network", {
     maxLatencyMs: 500,
     onExceeded: "error",
     warningThreshold: 0.7,
   });

   setPerformanceBudget("computation", {
     maxLatencyMs: 100,
     onExceeded: "custom",
     customHandler: (category, latency, budget) => {
       // Custom alert logic
       sendSlackAlert(`High computation latency: ${latency}ms`);
     },
   });
   ```

### Phase 4: Environment-Specific Optimization

1. **Development Environment**:

   ```typescript
   const developmentConfig: IEnhancedPerformanceConfig = {
     enabled: true,
     sampleRate: 1.0, // Monitor everything in development
     thresholdMs: 50,
     enableMemoryTracking: true,
     enableGCTracking: true,
     enableParityValidation: true,
     parityValidationInterval: 30000,
     // ... other config
   };
   ```

2. **Production Environment**:
   ```typescript
   const productionConfig: IEnhancedPerformanceConfig = {
     enabled: true,
     sampleRate: 0.1, // Sample 10% in production
     thresholdMs: 100,
     enableMemoryTracking: true,
     enableGCTracking: true,
     enableAutoProfileSelection: true,
     enableEnvironmentOptimization: true,
     // ... other config
   };
   ```

## Common Migration Patterns

### Pattern 1: Service Class Migration

```typescript
// Before: No performance tracking
class OrderService {
  async createOrder(data: CreateOrderRequest) {
    const order = await this.processOrder(data);
    await this.saveOrder(order);
    await this.sendNotification(order);
    return order;
  }
}

// After: Comprehensive performance tracking
import { DatabaseTimed, NetworkTimed, Profile } from "@axon/logger";

@Profile({ category: "order-service", threshold: 200 })
class OrderService {
  @DatabaseTimed({ threshold: 100 })
  async processOrder(data: CreateOrderRequest) {
    // Processing logic
  }

  @DatabaseTimed({ threshold: 150 })
  async saveOrder(order: Order) {
    // Database save
  }

  @NetworkTimed({ threshold: 300 })
  async sendNotification(order: Order) {
    // External API call
  }
}
```

### Pattern 2: Function-Based Migration

```typescript
// Before: Standalone functions
async function fetchUserData(userId: string) {
  const user = await db.users.findById(userId);
  return user;
}

// After: Wrapped with performance tracking
import { withTiming } from "@axon/logger";

const fetchUserData = withTiming(
  async (userId: string) => {
    const user = await db.users.findById(userId);
    return user;
  },
  {
    category: "user-data-fetch",
    threshold: 100,
    metadata: { operation: "database" },
  },
);
```

### Pattern 3: Legacy Code Migration

```typescript
// Before: Existing timing logic
class LegacyService {
  async processData(data: any[]) {
    const start = Date.now();
    try {
      const result = await this.heavyProcessing(data);
      const duration = Date.now() - start;
      console.log(`Processing took ${duration}ms`);
      return result;
    } catch (error) {
      console.error("Processing failed:", error);
      throw error;
    }
  }
}

// After: Enhanced tracking
import { ComputationTimed } from "@axon/logger";

class LegacyService {
  @ComputationTimed({
    category: "legacy-processing",
    threshold: 200,
    trackParameters: true,
  })
  async processData(data: any[]) {
    return await this.heavyProcessing(data);
  }
}
```

## Migration Checklist

### Pre-Migration

- [ ] Review current performance monitoring approach
- [ ] Identify critical performance bottlenecks
- [ ] Plan migration phases (critical paths first)
- [ ] Set up testing environment

### Configuration

- [ ] Create performance configuration
- [ ] Set up environment-specific configs
- [ ] Initialize global performance tracker
- [ ] Configure performance budgets

### Code Migration

- [ ] Migrate database operations to `@DatabaseTimed`
- [ ] Migrate API endpoints to `@NetworkTimed`
- [ ] Migrate computations to `@ComputationTimed`
- [ ] Migrate cache operations to `@CacheTimed`
- [ ] Migrate I/O operations to `@IOTimed`

### Monitoring Setup

- [ ] Set up performance metrics collection
- [ ] Configure alerting thresholds
- [ ] Set up memory leak detection
- [ ] Configure GC monitoring

### Testing & Validation

- [ ] Test performance tracking in development
- [ ] Validate metrics collection
- [ ] Test alert mechanisms
- [ ] Performance test under load

### Production Deployment

- [ ] Deploy with conservative sampling rates
- [ ] Monitor performance impact
- [ ] Adjust thresholds based on production data
- [ ] Set up dashboards and alerts

## Troubleshooting

### Common Issues

1. **High Memory Usage**:

   ```typescript
   // Reduce pool sizes
   const config = {
     measurementPoolInitialSize: 20,
     measurementPoolMaxSize: 100,
     maxLatencyHistory: 500,
     maxGCEventHistory: 25,
   };
   ```

2. **Performance Impact**:

   ```typescript
   // Reduce sampling rate
   const config = {
     sampleRate: 0.05, // 5% sampling
     enableParityValidation: false,
     resourceMetricsInterval: 10000, // Less frequent metrics
   };
   ```

3. **TypeScript Decorator Issues**:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true
     }
   }
   ```

### Performance Tuning

1. **Production Optimization**:

   ```typescript
   const productionConfig: IEnhancedPerformanceConfig = {
     enabled: true,
     sampleRate: 0.1,
     enableAutoProfileSelection: true,
     enableEnvironmentOptimization: true,
     measurementPoolMaxSize: 500,
     maxLatencyHistory: 2000,
   };
   ```

2. **Development Optimization**:
   ```typescript
   const developmentConfig: IEnhancedPerformanceConfig = {
     enabled: true,
     sampleRate: 1.0,
     enableParityValidation: true,
     parityValidationInterval: 30000,
     measurementPoolMaxSize: 100,
   };
   ```

## Next Steps

After completing the migration:

1. **Monitor Performance**: Watch for any regression in application performance
2. **Tune Configurations**: Adjust sampling rates and thresholds based on real data
3. **Expand Coverage**: Add performance tracking to additional operations
4. **Set Up Dashboards**: Create visualization for performance metrics
5. **Implement Alerting**: Set up automated alerts for performance issues

The enhanced performance tracking system provides comprehensive insights into your application's behavior while maintaining minimal performance overhead through smart sampling and optimization strategies.
