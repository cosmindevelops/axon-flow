/**
 * Integration tests for performance benchmarking across @axon packages
 * Uses real @axon package interfaces for authentic performance testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";
import { EnhancedErrorFactory } from "@axon/errors";
import type { IConfigRepository } from "@axon/config";
import { ConfigRepository } from "@axon/config";
import { DIContainer } from "@axon/di";
import { ObjectPool } from "@axon/di";
import type { DIToken } from "@axon/di";

describe("Performance Benchmarks Integration", () => {
  let testLogOutput: any[];
  let logger: ILogger;
  let errorFactory: EnhancedErrorFactory;
  let configRepository: IConfigRepository;
  let container: DIContainer;

  beforeEach(async () => {
    testLogOutput = [];

    // Create high-performance test stream
    const { Writable } = await import("stream");
    const testStream = new Writable({
      write(chunk, _encoding, callback) {
        const logStr = chunk.toString();
        try {
          const logEntry = JSON.parse(logStr);
          testLogOutput.push(logEntry);
        } catch {
          testLogOutput.push({ message: logStr });
        }
        callback();
      },
    });

    // Initialize high-performance logger configuration
    const performanceLoggerConfig: Partial<ILoggerConfig> = {
      environment: "performance-test",
      logLevel: "info", // Reduce verbosity for performance testing
      transports: [],
      enableCorrelationIds: false, // Disable for pure performance testing
      timestampFormat: "epoch", // Faster than ISO format
      testStream: testStream,
      performance: {
        enabled: true,
        sampleRate: 1.0,
        thresholdMs: 1, // Capture all performance metrics
      },
      circuitBreaker: {
        enabled: false, // Disable for consistent performance testing
        failureThreshold: 100,
        resetTimeoutMs: 30000,
        monitorTimeWindowMs: 60000,
      },
      objectPool: {
        enabled: true,
        initialSize: 50,
        maxSize: 200,
        growthFactor: 1.5,
      },
    };

    logger = new HighPerformancePinoLogger(performanceLoggerConfig);
    await (logger as any).loggerInitPromise;

    // Initialize other components for performance testing
    errorFactory = new EnhancedErrorFactory({
      correlationId: "perf-test-123",
      service: "performance-benchmarks",
      version: "1.0.0",
    });

    configRepository = new ConfigRepository({
      storageProvider: {
        async get(key: string) {
          // Fast in-memory storage for performance testing
          const configs: Record<string, string> = {
            "performance.loggingEnabled": "true",
            "performance.errorTrackingEnabled": "true",
            "performance.metricsEnabled": "true",
            "cache.maxSize": "1000",
            "cache.ttl": "300",
          };
          return configs[key] || null;
        },
        async set(key: string, value: string) {
          return true;
        },
        async delete(key: string) {
          return true;
        },
      },
    });

    container = new DIContainer({
      name: "PerformanceBenchmarkContainer",
      enableMetrics: true,
    });
  });

  afterEach(() => {
    container.dispose();
    testLogOutput = [];
  });

  describe("Logging Performance Benchmarks", () => {
    it("should maintain high throughput logging performance using real ILogger interface", async () => {
      const logCount = 1000;
      const startTime = performance.now();

      // High-throughput logging test
      for (let i = 0; i < logCount; i++) {
        logger.info("Performance test log entry", {
          iteration: i,
          timestamp: Date.now(),
          batchId: "perf-batch-1",
          testData: `data-${i}`,
        });
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const logsPerSecond = logCount / (totalDuration / 1000);
      const avgLogTime = totalDuration / logCount;

      // Log performance metrics
      logger.info("High-throughput logging benchmark completed", {
        totalLogs: logCount,
        totalDurationMs: totalDuration,
        logsPerSecond: Math.round(logsPerSecond),
        avgLogTimeMs: avgLogTime,
        benchmarkType: "high-throughput-logging",
      });

      // Verify performance expectations
      expect(totalDuration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(logsPerSecond).toBeGreaterThan(200); // Should achieve >200 logs/second
      expect(avgLogTime).toBeLessThan(5); // Average <5ms per log

      // Verify all logs were captured
      expect(testLogOutput.length).toBeGreaterThan(logCount * 0.95); // Allow 5% loss in test env

      // Verify benchmark metrics log
      const benchmarkLog = testLogOutput.find((log) => log.benchmarkType === "high-throughput-logging");

      expect(benchmarkLog).toBeDefined();
      expect(benchmarkLog.totalLogs).toBe(logCount);
      expect(benchmarkLog.logsPerSecond).toBeGreaterThan(0);
    });

    it("should handle concurrent logging efficiently with real logger performance features", async () => {
      const concurrentWorkers = 10;
      const logsPerWorker = 100;
      const startTime = performance.now();

      // Create concurrent logging workers
      const workers = Array.from({ length: concurrentWorkers }, (_, workerId) =>
        Promise.resolve().then(async () => {
          for (let i = 0; i < logsPerWorker; i++) {
            logger.info("Concurrent logging test", {
              workerId,
              iteration: i,
              timestamp: Date.now(),
              threadIdentifier: `worker-${workerId}-${i}`,
            });

            // Small delay to simulate realistic logging patterns
            if (i % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1));
            }
          }
        }),
      );

      await Promise.all(workers);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const totalLogs = concurrentWorkers * logsPerWorker;
      const concurrentThroughput = totalLogs / (totalDuration / 1000);

      logger.info("Concurrent logging benchmark completed", {
        concurrentWorkers,
        logsPerWorker,
        totalLogs,
        totalDurationMs: totalDuration,
        concurrentThroughput: Math.round(concurrentThroughput),
        benchmarkType: "concurrent-logging",
      });

      // Verify concurrent performance
      expect(totalDuration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(concurrentThroughput).toBeGreaterThan(100); // Should maintain >100 logs/second under concurrency

      // Verify log distribution across workers
      const workerLogs = testLogOutput.filter((log) => log.workerId !== undefined);
      const workerIds = new Set(workerLogs.map((log) => log.workerId));
      expect(workerIds.size).toBe(concurrentWorkers);

      // Verify benchmark completion log
      const concurrentBenchmarkLog = testLogOutput.find((log) => log.benchmarkType === "concurrent-logging");

      expect(concurrentBenchmarkLog).toBeDefined();
      expect(concurrentBenchmarkLog.concurrentWorkers).toBe(concurrentWorkers);
    });

    it("should optimize memory usage during sustained logging with real logger object pooling", async () => {
      const sustainedLogCount = 2000;
      const batchSize = 100;
      const batches = sustainedLogCount / batchSize;

      let initialMemory = 0;
      let peakMemory = 0;
      let finalMemory = 0;

      // Measure initial memory
      if (typeof process !== "undefined" && process.memoryUsage) {
        initialMemory = process.memoryUsage().heapUsed;
      }

      logger.info("Starting sustained logging memory benchmark", {
        sustainedLogCount,
        batchSize,
        totalBatches: batches,
        initialMemoryMB: Math.round(initialMemory / 1024 / 1024),
      });

      // Sustained logging with memory monitoring
      for (let batch = 0; batch < batches; batch++) {
        for (let i = 0; i < batchSize; i++) {
          logger.info("Sustained logging entry", {
            batch,
            entryInBatch: i,
            totalEntry: batch * batchSize + i,
            sustainedTest: true,
          });
        }

        // Check memory usage periodically
        if (batch % 5 === 0 && typeof process !== "undefined" && process.memoryUsage) {
          const currentMemory = process.memoryUsage().heapUsed;
          if (currentMemory > peakMemory) {
            peakMemory = currentMemory;
          }

          logger.debug("Memory checkpoint", {
            batch,
            currentMemoryMB: Math.round(currentMemory / 1024 / 1024),
            peakMemoryMB: Math.round(peakMemory / 1024 / 1024),
          });
        }

        // Allow garbage collection between batches
        if (batch % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Measure final memory
      if (typeof process !== "undefined" && process.memoryUsage) {
        finalMemory = process.memoryUsage().heapUsed;
      }

      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      const memoryPerLog = memoryGrowth / sustainedLogCount;

      logger.info("Sustained logging memory benchmark completed", {
        sustainedLogCount,
        initialMemoryMB: Math.round(initialMemory / 1024 / 1024),
        finalMemoryMB: Math.round(finalMemory / 1024 / 1024),
        peakMemoryMB: Math.round(peakMemory / 1024 / 1024),
        memoryGrowthMB: Math.round(memoryGrowthMB * 100) / 100,
        memoryPerLogBytes: Math.round(memoryPerLog),
        benchmarkType: "memory-usage",
      });

      // Verify memory efficiency
      expect(memoryGrowthMB).toBeLessThan(50); // Should not grow by more than 50MB
      expect(memoryPerLog).toBeLessThan(1000); // Should use less than 1KB per log entry

      const memoryBenchmarkLog = testLogOutput.find((log) => log.benchmarkType === "memory-usage");

      expect(memoryBenchmarkLog).toBeDefined();
      expect(memoryBenchmarkLog.sustainedLogCount).toBe(sustainedLogCount);
    });
  });

  describe("Dependency Injection Performance Benchmarks", () => {
    it("should achieve high-speed dependency resolution using real DIContainer interface", async () => {
      // Define test service interfaces
      interface IFastService {
        process(): string;
      }

      interface ICachedService {
        getValue(): string;
      }

      class FastService implements IFastService {
        process(): string {
          return "fast-processing-result";
        }
      }

      class CachedService implements ICachedService {
        constructor(private fastService: IFastService) {}

        getValue(): string {
          return this.fastService.process();
        }
      }

      const FAST_SERVICE_TOKEN: DIToken<IFastService> = "IFastService";
      const CACHED_SERVICE_TOKEN: DIToken<ICachedService> = "ICachedService";

      // Register services with different lifecycles for performance testing
      container.register(FAST_SERVICE_TOKEN, FastService, { lifecycle: "singleton" });
      container.register(CACHED_SERVICE_TOKEN, CachedService, {
        lifecycle: "transient",
        dependencies: [FAST_SERVICE_TOKEN],
      });

      // Benchmark dependency resolution performance
      const resolutionCount = 1000;
      const startTime = performance.now();

      const resolvedServices: ICachedService[] = [];

      for (let i = 0; i < resolutionCount; i++) {
        const service = await container.resolveAsync(CACHED_SERVICE_TOKEN);
        resolvedServices.push(service);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const resolutionsPerSecond = resolutionCount / (totalDuration / 1000);
      const avgResolutionTime = totalDuration / resolutionCount;

      logger.info("Dependency resolution performance benchmark", {
        resolutionCount,
        totalDurationMs: totalDuration,
        resolutionsPerSecond: Math.round(resolutionsPerSecond),
        avgResolutionTimeMs: avgResolutionTime,
        benchmarkType: "di-resolution-performance",
      });

      // Verify all services work correctly
      resolvedServices.forEach((service) => {
        expect(service.getValue()).toBe("fast-processing-result");
      });

      // Verify performance expectations
      expect(totalDuration).toBeLessThan(1000); // Should complete within 1 second
      expect(resolutionsPerSecond).toBeGreaterThan(1000); // Should achieve >1000 resolutions/second
      expect(avgResolutionTime).toBeLessThan(1); // Average <1ms per resolution

      // Verify container metrics
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(resolutionCount);
      expect(metrics.averageResolutionTime).toBeLessThan(5);
    });

    it("should optimize object pooling performance with real ObjectPool", async () => {
      interface IPooledService {
        execute(data: string): string;
      }

      class PooledService implements IPooledService {
        constructor(private id: string = Math.random().toString(36)) {}

        execute(data: string): string {
          return `${this.id}-processed-${data}`;
        }
      }

      // Create object pool for performance testing
      const servicePool = new ObjectPool("PooledServicePool", () => new PooledService(), {
        minSize: 10,
        maxSize: 50,
        enableMetrics: true,
      });

      await servicePool.warmUp();

      const poolOperations = 1000;
      const startTime = performance.now();

      // Benchmark pool acquisition and release
      const poolOperationPromises = Array.from({ length: poolOperations }, async (_, i) => {
        const service = await servicePool.acquire();
        const result = service.execute(`data-${i}`);
        servicePool.release(service);
        return result;
      });

      const results = await Promise.all(poolOperationPromises);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const operationsPerSecond = poolOperations / (totalDuration / 1000);

      const poolStats = servicePool.getStats();

      logger.info("Object pool performance benchmark", {
        poolOperations,
        totalDurationMs: totalDuration,
        operationsPerSecond: Math.round(operationsPerSecond),
        poolStats: {
          totalAcquired: poolStats.totalAcquired,
          totalReleased: poolStats.totalReleased,
          currentAvailable: poolStats.currentAvailable,
          currentInUse: poolStats.currentInUse,
        },
        benchmarkType: "object-pool-performance",
      });

      // Verify all operations completed successfully
      expect(results.length).toBe(poolOperations);
      results.forEach((result, index) => {
        expect(result).toContain(`processed-data-${index}`);
      });

      // Verify pool performance
      expect(totalDuration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(operationsPerSecond).toBeGreaterThan(500); // Should achieve >500 operations/second

      // Verify pool metrics
      expect(poolStats.totalAcquired).toBe(poolOperations);
      expect(poolStats.totalReleased).toBe(poolOperations);
      expect(poolStats.currentInUse).toBe(0); // All should be released

      await servicePool.destroy();
    });
  });

  describe("Error Handling Performance Benchmarks", () => {
    it("should maintain performance under high error creation rate using real error interfaces", async () => {
      const errorCount = 1000;
      const startTime = performance.now();

      const createdErrors = [];

      for (let i = 0; i < errorCount; i++) {
        const error = errorFactory.createApplicationError(`Performance test error ${i}`, `PERF_ERROR_${i}`);

        // Add context to simulate real usage
        error.context.errorIndex = i;
        error.context.performanceTest = true;
        error.context.batchId = `batch-${Math.floor(i / 100)}`;

        createdErrors.push(error);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const errorsPerSecond = errorCount / (totalDuration / 1000);
      const avgErrorCreationTime = totalDuration / errorCount;

      logger.info("Error creation performance benchmark", {
        errorCount,
        totalDurationMs: totalDuration,
        errorsPerSecond: Math.round(errorsPerSecond),
        avgErrorCreationTimeMs: avgErrorCreationTime,
        benchmarkType: "error-creation-performance",
      });

      // Verify all errors were created correctly
      expect(createdErrors.length).toBe(errorCount);
      createdErrors.forEach((error, index) => {
        expect(error.code).toBe(`PERF_ERROR_${index}`);
        expect(error.context.errorIndex).toBe(index);
        expect(error.context.performanceTest).toBe(true);
      });

      // Verify error creation performance
      expect(totalDuration).toBeLessThan(1000); // Should complete within 1 second
      expect(errorsPerSecond).toBeGreaterThan(1000); // Should create >1000 errors/second
      expect(avgErrorCreationTime).toBeLessThan(1); // Average <1ms per error
    });

    it("should handle error serialization performance efficiently", async () => {
      const serializationCount = 500;
      const complexError = errorFactory.createSystemError(
        "Complex error for serialization testing",
        "COMPLEX_SERIALIZATION_ERROR",
      );

      // Add complex context for realistic serialization test
      complexError.context.complexData = {
        nestedObject: {
          level1: { level2: { level3: "deep data" } },
          array: [1, 2, 3, 4, 5],
          timestamp: Date.now(),
        },
        metadata: {
          source: "performance-test",
          version: "1.0.0",
          correlationId: "perf-correlation-123",
        },
      };

      const startTime = performance.now();
      const serializedErrors = [];

      for (let i = 0; i < serializationCount; i++) {
        const serialized = {
          name: complexError.name,
          message: complexError.message,
          code: complexError.code,
          category: complexError.category,
          severity: complexError.severity,
          timestamp: complexError.timestamp.toISOString(),
          context: complexError.context,
        };

        const jsonString = JSON.stringify(serialized);
        serializedErrors.push(jsonString);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const serializationsPerSecond = serializationCount / (totalDuration / 1000);
      const avgSerializationTime = totalDuration / serializationCount;
      const avgSerializedSize = serializedErrors[0].length;

      logger.info("Error serialization performance benchmark", {
        serializationCount,
        totalDurationMs: totalDuration,
        serializationsPerSecond: Math.round(serializationsPerSecond),
        avgSerializationTimeMs: avgSerializationTime,
        avgSerializedSizeBytes: avgSerializedSize,
        benchmarkType: "error-serialization-performance",
      });

      // Verify serialization quality
      expect(serializedErrors.length).toBe(serializationCount);
      serializedErrors.forEach((serialized) => {
        expect(serialized.length).toBeGreaterThan(0);
        expect(serialized).toContain("COMPLEX_SERIALIZATION_ERROR");
      });

      // Verify serialization performance
      expect(totalDuration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(serializationsPerSecond).toBeGreaterThan(250); // Should serialize >250/second
      expect(avgSerializationTime).toBeLessThan(8); // Average <8ms per serialization
      expect(avgSerializedSize).toBeGreaterThan(0);
    });
  });

  describe("Configuration Performance Benchmarks", () => {
    it("should achieve fast configuration retrieval using real config interfaces", async () => {
      const configReadCount = 1000;
      const configKeys = [
        "performance.loggingEnabled",
        "performance.errorTrackingEnabled",
        "performance.metricsEnabled",
        "cache.maxSize",
        "cache.ttl",
      ];

      const startTime = performance.now();
      const configResults = [];

      for (let i = 0; i < configReadCount; i++) {
        const key = configKeys[i % configKeys.length];
        const value = await configRepository.get(key);
        configResults.push({ key, value });
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const configReadsPerSecond = configReadCount / (totalDuration / 1000);
      const avgConfigReadTime = totalDuration / configReadCount;

      logger.info("Configuration retrieval performance benchmark", {
        configReadCount,
        uniqueKeys: configKeys.length,
        totalDurationMs: totalDuration,
        configReadsPerSecond: Math.round(configReadsPerSecond),
        avgConfigReadTimeMs: avgConfigReadTime,
        benchmarkType: "config-retrieval-performance",
      });

      // Verify all config reads succeeded
      expect(configResults.length).toBe(configReadCount);
      configResults.forEach((result) => {
        expect(result.key).toBeDefined();
        expect(result.value).toBeDefined();
      });

      // Verify configuration performance
      expect(totalDuration).toBeLessThan(1000); // Should complete within 1 second
      expect(configReadsPerSecond).toBeGreaterThan(1000); // Should read >1000 configs/second
      expect(avgConfigReadTime).toBeLessThan(1); // Average <1ms per config read
    });
  });

  describe("Integrated Performance Benchmarks", () => {
    it("should maintain performance with all @axon systems integrated", async () => {
      const integratedOperations = 500;
      const startTime = performance.now();

      interface IIntegratedService {
        performComplexOperation(data: any): Promise<string>;
      }

      class IntegratedService implements IIntegratedService {
        constructor(
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
          private configRepository: IConfigRepository,
        ) {}

        async performComplexOperation(data: any): Promise<string> {
          // Configuration lookup
          const enableLogging = await this.configRepository.get("performance.loggingEnabled");

          if (enableLogging === "true") {
            this.logger.debug("Starting complex operation", { data });
          }

          try {
            // Simulate processing with potential error
            if (data.shouldFail) {
              const error = this.errorFactory.createApplicationError(
                "Simulated operation failure",
                "INTEGRATED_OPERATION_FAILED",
              );
              throw error;
            }

            const result = `processed-${data.id}`;

            if (enableLogging === "true") {
              this.logger.info("Complex operation completed", { result });
            }

            return result;
          } catch (error) {
            if (enableLogging === "true") {
              this.logger.error("Complex operation failed", {
                error: (error as Error).message,
                errorCode: (error as any).code,
              });
            }
            throw error;
          }
        }
      }

      const INTEGRATED_SERVICE_TOKEN: DIToken<IIntegratedService> = "IIntegratedService";

      // Register integrated service with all dependencies
      container.registerFactory(
        INTEGRATED_SERVICE_TOKEN,
        () => new IntegratedService(logger, errorFactory, configRepository),
      );

      // Benchmark integrated operations
      const operationPromises = Array.from({ length: integratedOperations }, async (_, i) => {
        const service = await container.resolveAsync(INTEGRATED_SERVICE_TOKEN);

        try {
          return await service.performComplexOperation({
            id: i,
            shouldFail: i % 50 === 0, // 2% failure rate
          });
        } catch (error) {
          return `failed-${i}`;
        }
      });

      const results = await Promise.all(operationPromises);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const operationsPerSecond = integratedOperations / (totalDuration / 1000);

      const successfulOperations = results.filter((r) => r.startsWith("processed-")).length;
      const failedOperations = results.filter((r) => r.startsWith("failed-")).length;

      logger.info("Integrated performance benchmark completed", {
        integratedOperations,
        totalDurationMs: totalDuration,
        operationsPerSecond: Math.round(operationsPerSecond),
        successfulOperations,
        failedOperations,
        successRate: (successfulOperations / integratedOperations) * 100,
        benchmarkType: "integrated-performance",
      });

      // Verify integrated performance
      expect(totalDuration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(operationsPerSecond).toBeGreaterThan(100); // Should achieve >100 ops/second
      expect(successfulOperations).toBeGreaterThan(integratedOperations * 0.95); // >95% success rate

      // Verify integration worked correctly
      expect(results.length).toBe(integratedOperations);
      expect(successfulOperations + failedOperations).toBe(integratedOperations);
    });
  });
});
