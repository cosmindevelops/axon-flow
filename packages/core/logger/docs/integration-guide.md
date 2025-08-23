# Performance Tracker Integration Guide

This guide demonstrates how to integrate the enhanced performance tracker with popular frameworks and libraries.

## Table of Contents

- [Express.js Integration](#expressjs-integration)
- [Nest.js Integration](#nestjs-integration)
- [Database Integration](#database-integration)
- [Redis Cache Integration](#redis-cache-integration)
- [Microservices Architecture](#microservices-architecture)
- [Testing Integration](#testing-integration)
- [Monitoring & Alerting](#monitoring--alerting)

## Express.js Integration

### Basic Express.js Setup

```typescript
import express from 'express';
import { EnhancedPerformanceTracker, NetworkTimed, DatabaseTimed } from '@axon/logger/performance';

const app = express();
const tracker = new EnhancedPerformanceTracker({
  enabled: true,
  enableMemoryTracking: true,
  enableGCTracking: true,
  resourceMetricsInterval: 5000,
});

// Performance middleware for all routes
app.use((req, res, next) => {
  const measurement = tracker.startOperation('http-request', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  });
  
  // Track response time
  res.on('finish', () => {
    tracker.finishOperation(measurement);
    tracker.recordSuccess();
  });
  
  res.on('error', () => {
    tracker.finishOperation(measurement);
    tracker.recordFailure();
  });
  
  next();
});

// Performance dashboard endpoint
app.get('/performance', (req, res) => {
  const metrics = tracker.getMetrics();
  const memoryAnalysis = tracker.getMemoryAnalysis();
  
  res.json({
    performance: {
      throughput: metrics.operation.throughput,
      avgLatency: metrics.operation.averageLatency,
      p95Latency: metrics.operation.p95Latency,
      p99Latency: metrics.operation.p99Latency,
    },
    memory: {
      health: memoryAnalysis.health,
      pressure: memoryAnalysis.pressure,
      trend: memoryAnalysis.trend,
      leakDetected: memoryAnalysis.leakDetected,
    },
    pool: {
      utilization: metrics.measurementPoolUtilization,
      efficiency: tracker.getPoolEfficiency(),
    }
  });
});

class UserController {
  @DatabaseTimed({ 
    threshold: 200,
    trackParameters: true,
    budget: { maxLatencyMs: 500, onExceeded: 'warn' }
  })
  async getUser(req: express.Request, res: express.Response) {
    const userId = req.params.id;
    const user = await userRepository.findById(userId);
    res.json(user);
  }

  @NetworkTimed({ 
    threshold: 1000,
    activation: { environments: ['production', 'staging'] }
  })
  async getUserProfile(req: express.Request, res: express.Response) {
    const userId = req.params.id;
    const profile = await externalApiClient.fetchProfile(userId);
    res.json(profile);
  }
}

app.listen(3000, () => {
  console.log('Server running with enhanced performance tracking');
});
```

### Express.js Route-Level Performance Budgets

```typescript
import { setPerformanceBudget, NetworkTimed } from '@axon/logger/performance';

// Set route-specific budgets
setPerformanceBudget('api-users', {
  maxLatencyMs: 300,
  onExceeded: 'warn',
  warningThreshold: 0.8
});

setPerformanceBudget('api-payments', {
  maxLatencyMs: 1000,
  onExceeded: 'error',
  warningThreshold: 0.7
});

class ApiController {
  @NetworkTimed({ 
    category: 'api-users',
    performanceCategory: 'network',
    trackParameters: true
  })
  async handleUserRequest(req: express.Request, res: express.Response) {
    // Automatically monitored against api-users budget
  }

  @DatabaseTimed({ 
    category: 'api-payments',
    performanceCategory: 'database'
  })
  async handlePayment(req: express.Request, res: express.Response) {
    // Automatically monitored against api-payments budget
  }
}
```

## Nest.js Integration

### Nest.js Performance Module

```typescript
// performance.module.ts
import { Module, Global } from '@nestjs/common';
import { EnhancedPerformanceTracker } from '@axon/logger/performance';

@Global()
@Module({
  providers: [
    {
      provide: 'PERFORMANCE_TRACKER',
      useFactory: () => {
        return new EnhancedPerformanceTracker({
          enabled: process.env.NODE_ENV === 'production',
          enableMemoryTracking: true,
          enableGCTracking: true,
          enableEnvironmentOptimization: true,
          sampleRate: parseFloat(process.env.PERF_SAMPLE_RATE || '0.1'),
          thresholdMs: parseInt(process.env.PERF_THRESHOLD_MS || '100'),
        });
      },
    },
  ],
  exports: ['PERFORMANCE_TRACKER'],
})
export class PerformanceModule {}
```

### Nest.js Performance Interceptor

```typescript
// performance.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnhancedPerformanceTracker } from '@axon/logger/performance';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    @Inject('PERFORMANCE_TRACKER') 
    private readonly tracker: EnhancedPerformanceTracker
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    
    const measurement = this.tracker.startOperation(`${className}.${methodName}`, {
      className,
      methodName,
      path: request?.path,
      method: request?.method,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.tracker.finishOperation(measurement);
          this.tracker.recordSuccess();
        },
        error: () => {
          this.tracker.finishOperation(measurement);
          this.tracker.recordFailure();
        },
      }),
    );
  }
}
```

### Nest.js Service with Performance Decorators

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseTimed, ComputationTimed } from '@axon/logger/performance';

@Injectable()
export class UserService {
  @DatabaseTimed({ 
    threshold: 150,
    trackParameters: true,
    budget: { maxLatencyMs: 300, onExceeded: 'warn' }
  })
  async findUserById(id: string): Promise<User> {
    return await this.userRepository.findOne({ where: { id } });
  }

  @DatabaseTimed({ 
    category: 'user-search',
    threshold: 500,
    activation: { logLevel: 'debug' }
  })
  async searchUsers(query: SearchQuery): Promise<User[]> {
    return await this.userRepository.search(query);
  }

  @ComputationTimed({ 
    category: 'user-analytics',
    trackParameters: true
  })
  generateUserAnalytics(users: User[]): UserAnalytics {
    // CPU-intensive computation
    return this.computeAnalytics(users);
  }
}
```

## Database Integration

### TypeORM Integration

```typescript
import { DataSource } from 'typeorm';
import { DatabaseTimed, EnhancedPerformanceTracker } from '@axon/logger/performance';

// Enhanced TypeORM repository with performance tracking
export class PerformanceAwareRepository<T> {
  constructor(
    private repository: any,
    private tracker: EnhancedPerformanceTracker
  ) {}

  @DatabaseTimed({ 
    threshold: 100,
    trackParameters: true,
    budget: { maxLatencyMs: 200, onExceeded: 'warn' }
  })
  async findOne(criteria: any): Promise<T> {
    return await this.repository.findOne(criteria);
  }

  @DatabaseTimed({ 
    threshold: 200,
    trackParameters: true,
    budget: { maxLatencyMs: 500, onExceeded: 'warn' }
  })
  async find(criteria: any): Promise<T[]> {
    return await this.repository.find(criteria);
  }

  @DatabaseTimed({ 
    threshold: 300,
    performanceCategory: 'database',
    trackParameters: true
  })
  async save(entity: T): Promise<T> {
    return await this.repository.save(entity);
  }

  @DatabaseTimed({ 
    threshold: 150,
    category: 'database-delete'
  })
  async delete(criteria: any): Promise<void> {
    return await this.repository.delete(criteria);
  }
}

// Usage with dependency injection
@Injectable()
export class UserService {
  private userRepo: PerformanceAwareRepository<User>;

  constructor(dataSource: DataSource, tracker: EnhancedPerformanceTracker) {
    this.userRepo = new PerformanceAwareRepository(
      dataSource.getRepository(User),
      tracker
    );
  }

  async getUser(id: string): Promise<User> {
    return await this.userRepo.findOne({ where: { id } });
  }
}
```

### Prisma Integration

```typescript
import { PrismaClient } from '@prisma/client';
import { DatabaseTimed } from '@axon/logger/performance';

class PrismaService {
  private prisma = new PrismaClient();

  @DatabaseTimed({ 
    threshold: 100,
    trackParameters: true,
    parameterOptions: {
      includeValues: false, // Don't log sensitive data
      includeTypes: true,
    }
  })
  async findUser(id: string) {
    return await this.prisma.user.findUnique({
      where: { id }
    });
  }

  @DatabaseTimed({ 
    threshold: 200,
    budget: { maxLatencyMs: 400, onExceeded: 'warn' }
  })
  async createUser(data: CreateUserInput) {
    return await this.prisma.user.create({
      data
    });
  }

  @DatabaseTimed({ 
    threshold: 500,
    category: 'complex-query',
    activation: { environments: ['production'] }
  })
  async getUsersWithAnalytics() {
    return await this.prisma.user.findMany({
      include: {
        posts: {
          include: {
            comments: true,
            likes: true
          }
        },
        profile: true,
        analytics: true
      }
    });
  }
}
```

## Redis Cache Integration

### Redis Performance Monitoring

```typescript
import Redis from 'ioredis';
import { CacheTimed, EnhancedPerformanceTracker } from '@axon/logger/performance';

class CacheService {
  private redis: Redis;
  private tracker: EnhancedPerformanceTracker;

  constructor() {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
    });

    this.tracker = new EnhancedPerformanceTracker({
      enabled: true,
      enableMemoryTracking: true,
    });
  }

  @CacheTimed({ 
    threshold: 10,
    trackParameters: true,
    budget: { maxLatencyMs: 25, onExceeded: 'warn' }
  })
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  @CacheTimed({ 
    threshold: 15,
    category: 'cache-write',
    trackParameters: true
  })
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  @CacheTimed({ 
    threshold: 50,
    category: 'cache-complex',
    performanceCategory: 'cache'
  })
  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.redis.mget(keys);
  }

  // Cache performance analytics
  getCacheMetrics() {
    const cacheMetrics = this.tracker.getCategoryMetrics('cache');
    const cacheWriteMetrics = this.tracker.getCategoryMetrics('cache-write');
    
    return {
      reads: {
        avgLatency: cacheMetrics.averageLatency,
        p95Latency: cacheMetrics.p95Latency,
        count: cacheMetrics.count,
        throughput: cacheMetrics.throughput,
      },
      writes: {
        avgLatency: cacheWriteMetrics.averageLatency,
        p95Latency: cacheWriteMetrics.p95Latency,
        count: cacheWriteMetrics.count,
        throughput: cacheWriteMetrics.throughput,
      },
      hitRate: this.calculateHitRate(),
    };
  }

  private calculateHitRate(): number {
    // Custom hit rate calculation based on cache metrics
    const reads = this.tracker.getCategoryMetrics('cache');
    const misses = this.tracker.getCategoryMetrics('cache-miss');
    
    if (reads.count === 0) return 0;
    return ((reads.count - misses.count) / reads.count) * 100;
  }
}
```

## Microservices Architecture

### Service-to-Service Communication

```typescript
import axios from 'axios';
import { NetworkTimed, setPerformanceBudget } from '@axon/logger/performance';

// Set budgets for different service types
setPerformanceBudget('user-service', { maxLatencyMs: 200, onExceeded: 'warn' });
setPerformanceBudget('payment-service', { maxLatencyMs: 1000, onExceeded: 'warn' });
setPerformanceBudget('notification-service', { maxLatencyMs: 500, onExceeded: 'warn' });

class ApiClient {
  @NetworkTimed({ 
    category: 'user-service',
    threshold: 150,
    trackParameters: true,
    activation: { environments: ['production', 'staging'] }
  })
  async getUser(id: string): Promise<User> {
    const response = await axios.get(`${this.userServiceUrl}/users/${id}`);
    return response.data;
  }

  @NetworkTimed({ 
    category: 'payment-service',
    threshold: 800,
    budget: { maxLatencyMs: 2000, onExceeded: 'error' }
  })
  async processPayment(paymentData: PaymentRequest): Promise<PaymentResult> {
    const response = await axios.post(`${this.paymentServiceUrl}/payments`, paymentData);
    return response.data;
  }

  @NetworkTimed({ 
    category: 'notification-service',
    threshold: 300,
    activation: { logLevel: 'info' }
  })
  async sendNotification(notification: NotificationRequest): Promise<void> {
    await axios.post(`${this.notificationServiceUrl}/notify`, notification);
  }
}

// Service mesh integration
class ServiceDiscovery {
  private tracker: EnhancedPerformanceTracker;

  @NetworkTimed({ 
    category: 'service-discovery',
    threshold: 50,
    budget: { maxLatencyMs: 100, onExceeded: 'warn' }
  })
  async discoverService(serviceName: string): Promise<ServiceEndpoint> {
    // Service discovery logic with performance tracking
    return await this.consul.getService(serviceName);
  }

  getServicePerformanceReport(): ServicePerformanceReport {
    const userServiceMetrics = this.tracker.getCategoryMetrics('user-service');
    const paymentServiceMetrics = this.tracker.getCategoryMetrics('payment-service');
    const notificationServiceMetrics = this.tracker.getCategoryMetrics('notification-service');
    
    return {
      services: {
        'user-service': {
          avgLatency: userServiceMetrics.averageLatency,
          p95Latency: userServiceMetrics.p95Latency,
          errorRate: this.calculateErrorRate('user-service'),
          availability: this.calculateAvailability('user-service'),
        },
        'payment-service': {
          avgLatency: paymentServiceMetrics.averageLatency,
          p95Latency: paymentServiceMetrics.p95Latency,
          errorRate: this.calculateErrorRate('payment-service'),
          availability: this.calculateAvailability('payment-service'),
        },
        'notification-service': {
          avgLatency: notificationServiceMetrics.averageLatency,
          p95Latency: notificationServiceMetrics.p95Latency,
          errorRate: this.calculateErrorRate('notification-service'),
          availability: this.calculateAvailability('notification-service'),
        }
      }
    };
  }
}
```

## Testing Integration

### Performance Testing with Vitest

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedPerformanceTracker, Benchmark } from '@axon/logger/performance';

describe('Performance Integration Tests', () => {
  let tracker: EnhancedPerformanceTracker;

  beforeEach(() => {
    tracker = new EnhancedPerformanceTracker({
      enabled: true,
      enableMemoryTracking: true,
      enableGCTracking: true,
    });
  });

  afterEach(() => {
    // Clean up tracker resources
    tracker.reset();
  });

  it('should maintain performance under load', async () => {
    const iterations = 1000;
    const measurements: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const measurement = tracker.startOperation('load-test');
      
      // Simulate work
      await simulateWork(10);
      
      tracker.finishOperation(measurement);
      tracker.recordSuccess();
      
      if (measurement.endTime && measurement.startTime) {
        measurements.push(measurement.endTime - measurement.startTime);
      }
    }

    const metrics = tracker.getMetrics();
    
    // Performance assertions
    expect(metrics.operation.averageLatency).toBeLessThan(50);
    expect(metrics.operation.p95Latency).toBeLessThan(100);
    expect(metrics.operation.p99Latency).toBeLessThan(200);
    
    // Memory health checks
    const memoryAnalysis = tracker.getMemoryAnalysis();
    expect(memoryAnalysis.leakDetected).toBe(false);
    expect(memoryAnalysis.health).not.toBe('critical');
  });

  it('should detect performance regressions', async () => {
    // Baseline performance
    const baselineMetrics = await runPerformanceBaseline();
    
    // Current performance
    const currentMetrics = tracker.getMetrics().operation;
    
    // Regression detection
    const regressionThreshold = 0.2; // 20% performance degradation
    const latencyRegression = (currentMetrics.averageLatency - baselineMetrics.averageLatency) / baselineMetrics.averageLatency;
    
    expect(latencyRegression).toBeLessThan(regressionThreshold);
  });

  it('should validate cross-environment parity', () => {
    const parityReport = tracker.validatePerformanceParity();
    
    expect(parityReport.parityMaintained).toBe(true);
    expect(parityReport.variance).toBeLessThan(10); // <10% variance
  });
});

// Benchmark testing for critical methods
class CriticalService {
  @Benchmark({ runs: 100, warmup: 10 })
  criticalMethod(data: any[]): ProcessedData[] {
    return data.map(item => this.processItem(item));
  }

  // Benchmark results will be automatically logged
  processItem(item: any): ProcessedData {
    // Complex processing logic
    return this.transform(item);
  }
}
```

## Monitoring & Alerting

### Prometheus Integration

```typescript
import { createPrometheusExporter, registerPerformanceExporter } from '@axon/logger/performance';
import { register, Gauge, Histogram, Counter } from 'prom-client';

class PrometheusMetrics {
  private performanceHistogram: Histogram<string>;
  private memoryGauge: Gauge<string>;
  private gcCounter: Counter<string>;

  constructor(private tracker: EnhancedPerformanceTracker) {
    // Create Prometheus metrics
    this.performanceHistogram = new Histogram({
      name: 'performance_operation_duration_seconds',
      help: 'Duration of operations in seconds',
      labelNames: ['category', 'method', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.memoryGauge = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
    });

    this.gcCounter = new Counter({
      name: 'gc_events_total',
      help: 'Total number of GC events',
      labelNames: ['type'],
    });

    // Register custom exporter
    registerPerformanceExporter({
      name: 'prometheus-custom',
      format: 'custom',
      interval: 5000,
      export: this.exportToPrometheus.bind(this),
    });
  }

  private exportToPrometheus(metrics: any, metadata?: any) {
    // Export operation metrics
    this.performanceHistogram
      .labels({
        category: metadata?.category || 'unknown',
        method: metadata?.methodName || 'unknown',
        status: 'success',
      })
      .observe(metrics.averageLatency / 1000); // Convert to seconds

    // Export memory metrics
    const memoryMetrics = this.tracker.getMemoryAnalysis();
    this.memoryGauge.labels({ type: 'heap_used' }).set(memoryMetrics.growthRate);
    this.memoryGauge.labels({ type: 'heap_total' }).set(this.tracker.getMetrics().resource.memory.heapTotal);

    // Export GC metrics
    const gcEvents = this.tracker.getMetrics().gcEvents;
    gcEvents.forEach(event => {
      this.gcCounter.labels({ type: event.type }).inc();
    });
  }

  getMetrics(): string {
    return register.metrics();
  }
}

// Usage
const tracker = new EnhancedPerformanceTracker({
  enabled: true,
  enableMemoryTracking: true,
  enableGCTracking: true,
});

const prometheusMetrics = new PrometheusMetrics(tracker);

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(prometheusMetrics.getMetrics());
});
```

### Alerting Integration

```typescript
import { EnhancedPerformanceTracker } from '@axon/logger/performance';

class AlertingService {
  constructor(
    private tracker: EnhancedPerformanceTracker,
    private alertManager: AlertManager
  ) {
    this.setupAlerts();
  }

  private setupAlerts() {
    // Memory leak detection
    setInterval(() => {
      const memoryAnalysis = this.tracker.getMemoryAnalysis();
      
      if (memoryAnalysis.leakDetected) {
        this.alertManager.sendAlert({
          severity: 'critical',
          title: 'Memory Leak Detected',
          description: `Memory leak detected with growth rate: ${memoryAnalysis.growthRate.toFixed(2)} MB/min`,
          recommendations: memoryAnalysis.recommendations,
        });
      }

      if (memoryAnalysis.pressure === 'critical') {
        this.alertManager.sendAlert({
          severity: 'high',
          title: 'Critical Memory Pressure',
          description: `Memory pressure is critical: ${memoryAnalysis.pressure}`,
          action: 'Scale up or investigate memory usage',
        });
      }
    }, 30000);

    // Performance degradation detection
    setInterval(() => {
      const parityReport = this.tracker.validatePerformanceParity();
      
      if (!parityReport.parityMaintained) {
        this.alertManager.sendAlert({
          severity: 'medium',
          title: 'Performance Variance Exceeded',
          description: `Performance variance: ${parityReport.variance.toFixed(1)}%`,
          recommendations: parityReport.recommendations,
        });
      }
    }, 300000); // 5 minutes

    // GC performance impact
    setInterval(() => {
      const metrics = this.tracker.getMetrics();
      const recentGCEvents = metrics.gcEvents.slice(-10);
      
      const longGCEvents = recentGCEvents.filter(event => event.duration > 100);
      
      if (longGCEvents.length > 5) {
        this.alertManager.sendAlert({
          severity: 'medium',
          title: 'Frequent Long GC Events',
          description: `${longGCEvents.length} GC events >100ms in recent history`,
          action: 'Consider GC tuning or memory optimization',
        });
      }
    }, 60000);
  }

  // Custom alert conditions
  setupCustomAlert(condition: AlertCondition, alertConfig: AlertConfig) {
    setInterval(() => {
      const metrics = this.tracker.getMetrics();
      const memoryAnalysis = this.tracker.getMemoryAnalysis();
      
      if (condition({ metrics, memoryAnalysis })) {
        this.alertManager.sendAlert(alertConfig);
      }
    }, alertConfig.interval || 60000);
  }
}

// Usage
const alerting = new AlertingService(tracker, alertManager);

// Custom alert for high P99 latency
alerting.setupCustomAlert(
  ({ metrics }) => metrics.operation.p99Latency > 1000,
  {
    severity: 'high',
    title: 'High P99 Latency',
    description: 'P99 latency exceeded 1000ms',
    interval: 30000,
  }
);
```

## Best Practices

### 1. Performance Budget Configuration

```typescript
// Set appropriate budgets per operation category
setPerformanceBudget('database', { maxLatencyMs: 200, onExceeded: 'warn' });
setPerformanceBudget('network', { maxLatencyMs: 1000, onExceeded: 'warn' });
setPerformanceBudget('computation', { maxLatencyMs: 100, onExceeded: 'warn' });
setPerformanceBudget('cache', { maxLatencyMs: 50, onExceeded: 'error' });
```

### 2. Sampling Strategy

```typescript
// Use adaptive sampling in production
const tracker = new EnhancedPerformanceTracker({
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enableEnvironmentOptimization: true,
});
```

### 3. Memory Management

```typescript
// Monitor memory health regularly
setInterval(() => {
  const analysis = tracker.getMemoryAnalysis();
  if (analysis.leakDetected || analysis.health === 'critical') {
    // Take corrective action
    logger.error('Memory issue detected', analysis);
  }
}, 60000);
```

### 4. Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  // Export final metrics before shutdown
  const finalMetrics = tracker.getMetrics();
  await exportMetrics(finalMetrics);
  
  // Clean up tracker resources
  tracker.reset();
  process.exit(0);
});
```

This integration guide provides comprehensive examples for incorporating the enhanced performance tracker into real-world applications and frameworks.