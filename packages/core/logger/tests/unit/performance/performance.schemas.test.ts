/**
 * Unit tests for performance tracking schemas
 */

import { describe, it, expect } from "vitest";
import {
  memoryMetricsSchema,
  gcEventSchema,
  operationMetricsSchema,
  resourceMetricsSchema,
  enhancedPerformanceMetricsSchema,
  enhancedPerformanceConfigSchema,
  performanceMeasurementSchema,
  performanceDecoratorOptionsSchema,
  platformInfoSchema,
  metricsExportFormatSchema,
  memoryTrendSchema,
} from "../../../src/performance/core/core.schemas.js";

describe("Performance Schemas", () => {
  describe("memoryMetricsSchema", () => {
    it("should validate valid memory metrics", () => {
      const validMetrics = {
        rss: 100000,
        heapTotal: 80000,
        heapUsed: 60000,
        external: 10000,
        arrayBuffers: 5000,
        utilization: 75.0,
      };

      const result = memoryMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMetrics);
      }
    });

    it("should reject negative values", () => {
      const invalidMetrics = {
        rss: -100,
        heapTotal: 80000,
        heapUsed: 60000,
        external: 10000,
        arrayBuffers: 5000,
        utilization: 75.0,
      };

      const result = memoryMetricsSchema.safeParse(invalidMetrics);
      expect(result.success).toBe(false);
    });

    it("should reject utilization over 100%", () => {
      const invalidMetrics = {
        rss: 100000,
        heapTotal: 80000,
        heapUsed: 60000,
        external: 10000,
        arrayBuffers: 5000,
        utilization: 150.0,
      };

      const result = memoryMetricsSchema.safeParse(invalidMetrics);
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const incompleteMetrics = {
        rss: 100000,
        heapTotal: 80000,
        // Missing heapUsed, external, arrayBuffers, utilization
      };

      const result = memoryMetricsSchema.safeParse(incompleteMetrics);
      expect(result.success).toBe(false);
    });
  });

  describe("gcEventSchema", () => {
    it("should validate valid GC event", () => {
      const validEvent = {
        type: "major",
        duration: 15.5,
        timestamp: Date.now(),
        memoryFreed: 1024000,
      };

      const result = gcEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validEvent);
      }
    });

    it("should validate GC event without optional memoryFreed", () => {
      const validEvent = {
        type: "minor",
        duration: 5.2,
        timestamp: Date.now(),
      };

      const result = gcEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("should reject empty type", () => {
      const invalidEvent = {
        type: "",
        duration: 15.5,
        timestamp: Date.now(),
      };

      const result = gcEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject negative duration", () => {
      const invalidEvent = {
        type: "major",
        duration: -5.0,
        timestamp: Date.now(),
      };

      const result = gcEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe("operationMetricsSchema", () => {
    it("should validate valid operation metrics", () => {
      const validMetrics = {
        count: 100,
        throughput: 50.5,
        averageLatency: 25.3,
        minLatency: 10.1,
        maxLatency: 150.7,
        p50Latency: 22.5,
        p95Latency: 45.8,
        p99Latency: 120.2,
        standardDeviation: 15.4,
        totalTime: 2530,
      };

      const result = operationMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMetrics);
      }
    });

    it("should reject negative values", () => {
      const invalidMetrics = {
        count: -1,
        throughput: 50.5,
        averageLatency: 25.3,
        minLatency: 10.1,
        maxLatency: 150.7,
        p50Latency: 22.5,
        p95Latency: 45.8,
        p99Latency: 120.2,
        standardDeviation: 15.4,
        totalTime: 2530,
      };

      const result = operationMetricsSchema.safeParse(invalidMetrics);
      expect(result.success).toBe(false);
    });
  });

  describe("resourceMetricsSchema", () => {
    it("should validate valid resource metrics", () => {
      const validMetrics = {
        cpuUsage: 45.2,
        memory: {
          rss: 100000,
          heapTotal: 80000,
          heapUsed: 60000,
          external: 10000,
          arrayBuffers: 5000,
          utilization: 75.0,
        },
        eventLoopDelay: 2.5,
        uptime: 86400,
        loadAverage: [1.5, 1.2, 0.8],
      };

      const result = resourceMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMetrics);
      }
    });

    it("should validate resource metrics without optional fields", () => {
      const minimalMetrics = {
        cpuUsage: 30.0,
        memory: {
          rss: 50000,
          heapTotal: 40000,
          heapUsed: 30000,
          external: 5000,
          arrayBuffers: 2000,
          utilization: 75.0,
        },
        uptime: 3600,
      };

      const result = resourceMetricsSchema.safeParse(minimalMetrics);
      expect(result.success).toBe(true);
    });

    it("should reject CPU usage over 100%", () => {
      const invalidMetrics = {
        cpuUsage: 150.0,
        memory: {
          rss: 100000,
          heapTotal: 80000,
          heapUsed: 60000,
          external: 10000,
          arrayBuffers: 5000,
          utilization: 75.0,
        },
        uptime: 86400,
      };

      const result = resourceMetricsSchema.safeParse(invalidMetrics);
      expect(result.success).toBe(false);
    });
  });

  describe("enhancedPerformanceConfigSchema", () => {
    it("should validate valid configuration", () => {
      const validConfig = {
        enabled: true,
        sampleRate: 0.1,
        thresholdMs: 100,
        enableMemoryTracking: true,
        enableGCTracking: false,
        maxLatencyHistory: 1000,
        maxGCEventHistory: 100,
        resourceMetricsInterval: 5000,
        enableMeasurementPooling: true,
        measurementPoolInitialSize: 20,
        measurementPoolMaxSize: 100,
      };

      const result = enhancedPerformanceConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it("should reject invalid sample rate", () => {
      const invalidConfig = {
        enabled: true,
        sampleRate: 1.5, // Should be between 0 and 1
        thresholdMs: 100,
        enableMemoryTracking: true,
        enableGCTracking: false,
        maxLatencyHistory: 1000,
        maxGCEventHistory: 100,
        resourceMetricsInterval: 5000,
        enableMeasurementPooling: true,
        measurementPoolInitialSize: 20,
        measurementPoolMaxSize: 100,
      };

      const result = enhancedPerformanceConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("should reject history sizes outside bounds", () => {
      const invalidConfig = {
        enabled: true,
        sampleRate: 0.1,
        thresholdMs: 100,
        enableMemoryTracking: true,
        enableGCTracking: false,
        maxLatencyHistory: 5, // Should be min 10
        maxGCEventHistory: 100,
        resourceMetricsInterval: 5000,
        enableMeasurementPooling: true,
        measurementPoolInitialSize: 20,
        measurementPoolMaxSize: 100,
      };

      const result = enhancedPerformanceConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("performanceMeasurementSchema", () => {
    it("should validate valid measurement", () => {
      const validMeasurement = {
        id: "measurement-123",
        startTime: 1000.5,
        endTime: 1025.8,
        category: "database-query",
        metadata: {
          query: "SELECT * FROM users",
          table: "users",
        },
        inUse: false,
      };

      const result = performanceMeasurementSchema.safeParse(validMeasurement);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMeasurement);
      }
    });

    it("should validate measurement without optional fields", () => {
      const minimalMeasurement = {
        id: "test-id",
        startTime: 1000,
        category: "test-category",
        inUse: true,
      };

      const result = performanceMeasurementSchema.safeParse(minimalMeasurement);
      expect(result.success).toBe(true);
    });

    it("should reject empty ID", () => {
      const invalidMeasurement = {
        id: "",
        startTime: 1000,
        category: "test-category",
        inUse: true,
      };

      const result = performanceMeasurementSchema.safeParse(invalidMeasurement);
      expect(result.success).toBe(false);
    });

    it("should reject empty category", () => {
      const invalidMeasurement = {
        id: "test-id",
        startTime: 1000,
        category: "",
        inUse: true,
      };

      const result = performanceMeasurementSchema.safeParse(invalidMeasurement);
      expect(result.success).toBe(false);
    });
  });

  describe("performanceDecoratorOptionsSchema", () => {
    it("should validate valid decorator options", () => {
      const validOptions = {
        category: "api-endpoint",
        threshold: 500,
        sample: true,
        metadata: {
          endpoint: "/users",
          method: "GET",
        },
      };

      const result = performanceDecoratorOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOptions);
      }
    });

    it("should validate options with only optional fields", () => {
      const minimalOptions = {};

      const result = performanceDecoratorOptionsSchema.safeParse(minimalOptions);
      expect(result.success).toBe(true);
    });

    it("should reject negative threshold", () => {
      const invalidOptions = {
        category: "test",
        threshold: -100,
      };

      const result = performanceDecoratorOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });

    it("should reject empty category", () => {
      const invalidOptions = {
        category: "",
        threshold: 100,
      };

      const result = performanceDecoratorOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });
  });

  describe("platformInfoSchema", () => {
    it("should validate valid platform info", () => {
      const validPlatform = {
        isNode: true,
        isBrowser: false,
        isWebWorker: false,
        hasGCSupport: true,
        hasPerformanceNow: true,
        hasMemoryAPI: true,
      };

      const result = platformInfoSchema.safeParse(validPlatform);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPlatform);
      }
    });

    it("should validate browser platform info", () => {
      const browserPlatform = {
        isNode: false,
        isBrowser: true,
        isWebWorker: false,
        hasGCSupport: false,
        hasPerformanceNow: true,
        hasMemoryAPI: false,
      };

      const result = platformInfoSchema.safeParse(browserPlatform);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const incompletePlatform = {
        isNode: true,
        isBrowser: false,
        // Missing other required fields
      };

      const result = platformInfoSchema.safeParse(incompletePlatform);
      expect(result.success).toBe(false);
    });
  });

  describe("metricsExportFormatSchema", () => {
    it("should validate 'json' format", () => {
      const result = metricsExportFormatSchema.safeParse("json");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("json");
      }
    });

    it("should validate 'prometheus' format", () => {
      const result = metricsExportFormatSchema.safeParse("prometheus");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("prometheus");
      }
    });

    it("should reject invalid format", () => {
      const result = metricsExportFormatSchema.safeParse("xml");
      expect(result.success).toBe(false);
    });
  });

  describe("memoryTrendSchema", () => {
    it("should validate 'increasing' trend", () => {
      const result = memoryTrendSchema.safeParse("increasing");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("increasing");
      }
    });

    it("should validate 'decreasing' trend", () => {
      const result = memoryTrendSchema.safeParse("decreasing");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("decreasing");
      }
    });

    it("should validate 'stable' trend", () => {
      const result = memoryTrendSchema.safeParse("stable");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("stable");
      }
    });

    it("should reject invalid trend", () => {
      const result = memoryTrendSchema.safeParse("volatile");
      expect(result.success).toBe(false);
    });
  });

  describe("enhancedPerformanceMetricsSchema", () => {
    it("should validate complete enhanced metrics", () => {
      const validMetrics = {
        // Legacy compatibility fields
        logsPerSecond: 100.5,
        averageLatencyMs: 25.3,
        peakLatencyMs: 150.7,
        totalLogs: 1000,
        failedLogs: 5,
        circuitBreakerState: "closed" as const,
        objectPoolUtilization: 75.2,

        // Enhanced fields
        operation: {
          count: 1000,
          throughput: 100.5,
          averageLatency: 25.3,
          minLatency: 10.1,
          maxLatency: 150.7,
          p50Latency: 22.5,
          p95Latency: 45.8,
          p99Latency: 120.2,
          standardDeviation: 15.4,
          totalTime: 25300,
        },
        resource: {
          cpuUsage: 45.2,
          memory: {
            rss: 100000,
            heapTotal: 80000,
            heapUsed: 60000,
            external: 10000,
            arrayBuffers: 5000,
            utilization: 75.0,
          },
          uptime: 86400,
        },
        gcEvents: [
          {
            type: "major",
            duration: 15.5,
            timestamp: Date.now(),
            memoryFreed: 1024000,
          },
        ],
        measurementPoolUtilization: 50.0,
        timestamp: Date.now(),
        uptimeSeconds: 86400,
      };

      const result = enhancedPerformanceMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logsPerSecond).toBe(100.5);
        expect(result.data.operation.count).toBe(1000);
        expect(result.data.resource.cpuUsage).toBe(45.2);
        expect(result.data.gcEvents).toHaveLength(1);
      }
    });

    it("should reject invalid circuit breaker state", () => {
      const invalidMetrics = {
        logsPerSecond: 100.5,
        averageLatencyMs: 25.3,
        peakLatencyMs: 150.7,
        totalLogs: 1000,
        failedLogs: 5,
        circuitBreakerState: "invalid-state",
        objectPoolUtilization: 75.2,
        operation: {
          count: 1000,
          throughput: 100.5,
          averageLatency: 25.3,
          minLatency: 10.1,
          maxLatency: 150.7,
          p50Latency: 22.5,
          p95Latency: 45.8,
          p99Latency: 120.2,
          standardDeviation: 15.4,
          totalTime: 25300,
        },
        resource: {
          cpuUsage: 45.2,
          memory: {
            rss: 100000,
            heapTotal: 80000,
            heapUsed: 60000,
            external: 10000,
            arrayBuffers: 5000,
            utilization: 75.0,
          },
          uptime: 86400,
        },
        gcEvents: [],
        measurementPoolUtilization: 50.0,
        timestamp: Date.now(),
        uptimeSeconds: 86400,
      };

      const result = enhancedPerformanceMetricsSchema.safeParse(invalidMetrics);
      expect(result.success).toBe(false);
    });
  });
});
