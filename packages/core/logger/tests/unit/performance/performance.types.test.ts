/**
 * Unit tests for performance tracking types
 */

import { describe, it, expect } from "vitest";
import type {
  IMemoryMetrics,
  IGCEvent,
  IOperationMetrics,
  IResourceMetrics,
  IEnhancedPerformanceMetrics,
  IEnhancedPerformanceConfig,
  IPerformanceMeasurement,
  IPerformanceDecoratorOptions,
  IPlatformInfo,
  IMemoryMonitor,
  IMeasurementPool,
  IMetricsAggregator,
  IEnhancedPerformanceTracker,
  MemoryTrend,
  MetricsExportFormat,
} from "../../../src/performance/core/core.types.js";

describe("Performance Types", () => {
  describe("Type Definitions", () => {
    it("should define IMemoryMetrics interface", () => {
      const memoryMetrics: IMemoryMetrics = {
        rss: 100000,
        heapTotal: 80000,
        heapUsed: 60000,
        external: 10000,
        arrayBuffers: 5000,
        utilization: 75.0,
      };

      expect(memoryMetrics.rss).toBe(100000);
      expect(memoryMetrics.heapTotal).toBe(80000);
      expect(memoryMetrics.heapUsed).toBe(60000);
      expect(memoryMetrics.external).toBe(10000);
      expect(memoryMetrics.arrayBuffers).toBe(5000);
      expect(memoryMetrics.utilization).toBe(75.0);
    });

    it("should define IGCEvent interface", () => {
      const gcEvent: IGCEvent = {
        type: "major",
        duration: 15.5,
        timestamp: Date.now(),
        memoryFreed: 1024000,
      };

      expect(gcEvent.type).toBe("major");
      expect(gcEvent.duration).toBe(15.5);
      expect(typeof gcEvent.timestamp).toBe("number");
      expect(gcEvent.memoryFreed).toBe(1024000);
    });

    it("should define IOperationMetrics interface", () => {
      const operationMetrics: IOperationMetrics = {
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

      expect(operationMetrics.count).toBe(100);
      expect(operationMetrics.throughput).toBe(50.5);
      expect(operationMetrics.averageLatency).toBe(25.3);
      expect(operationMetrics.minLatency).toBe(10.1);
      expect(operationMetrics.maxLatency).toBe(150.7);
      expect(operationMetrics.p50Latency).toBe(22.5);
      expect(operationMetrics.p95Latency).toBe(45.8);
      expect(operationMetrics.p99Latency).toBe(120.2);
      expect(operationMetrics.standardDeviation).toBe(15.4);
      expect(operationMetrics.totalTime).toBe(2530);
    });

    it("should define IResourceMetrics interface", () => {
      const resourceMetrics: IResourceMetrics = {
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

      expect(resourceMetrics.cpuUsage).toBe(45.2);
      expect(resourceMetrics.memory).toBeDefined();
      expect(resourceMetrics.eventLoopDelay).toBe(2.5);
      expect(resourceMetrics.uptime).toBe(86400);
      expect(resourceMetrics.loadAverage).toEqual([1.5, 1.2, 0.8]);
    });

    it("should define IEnhancedPerformanceConfig interface", () => {
      const config: IEnhancedPerformanceConfig = {
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

      expect(config.enabled).toBe(true);
      expect(config.sampleRate).toBe(0.1);
      expect(config.thresholdMs).toBe(100);
      expect(config.enableMemoryTracking).toBe(true);
      expect(config.enableGCTracking).toBe(false);
      expect(config.maxLatencyHistory).toBe(1000);
      expect(config.maxGCEventHistory).toBe(100);
      expect(config.resourceMetricsInterval).toBe(5000);
      expect(config.enableMeasurementPooling).toBe(true);
      expect(config.measurementPoolInitialSize).toBe(20);
      expect(config.measurementPoolMaxSize).toBe(100);
    });

    it("should define IPerformanceMeasurement interface", () => {
      const measurement: IPerformanceMeasurement = {
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

      expect(measurement.id).toBe("measurement-123");
      expect(measurement.startTime).toBe(1000.5);
      expect(measurement.endTime).toBe(1025.8);
      expect(measurement.category).toBe("database-query");
      expect(measurement.metadata).toEqual({
        query: "SELECT * FROM users",
        table: "users",
      });
      expect(measurement.inUse).toBe(false);
    });

    it("should define IPerformanceDecoratorOptions interface", () => {
      const decoratorOptions: IPerformanceDecoratorOptions = {
        category: "api-endpoint",
        threshold: 500,
        sample: true,
        metadata: {
          endpoint: "/users",
          method: "GET",
        },
      };

      expect(decoratorOptions.category).toBe("api-endpoint");
      expect(decoratorOptions.threshold).toBe(500);
      expect(decoratorOptions.sample).toBe(true);
      expect(decoratorOptions.metadata).toEqual({
        endpoint: "/users",
        method: "GET",
      });
    });

    it("should define IPlatformInfo interface", () => {
      const platformInfo: IPlatformInfo = {
        isNode: true,
        isBrowser: false,
        isWebWorker: false,
        hasGCSupport: true,
        hasPerformanceNow: true,
        hasMemoryAPI: true,
      };

      expect(platformInfo.isNode).toBe(true);
      expect(platformInfo.isBrowser).toBe(false);
      expect(platformInfo.isWebWorker).toBe(false);
      expect(platformInfo.hasGCSupport).toBe(true);
      expect(platformInfo.hasPerformanceNow).toBe(true);
      expect(platformInfo.hasMemoryAPI).toBe(true);
    });
  });

  describe("Union Types", () => {
    it("should define MemoryTrend union type", () => {
      const trends: MemoryTrend[] = ["increasing", "decreasing", "stable"];

      expect(trends).toContain("increasing");
      expect(trends).toContain("decreasing");
      expect(trends).toContain("stable");
      expect(trends).toHaveLength(3);
    });

    it("should define MetricsExportFormat union type", () => {
      const formats: MetricsExportFormat[] = ["json", "prometheus"];

      expect(formats).toContain("json");
      expect(formats).toContain("prometheus");
      expect(formats).toHaveLength(2);
    });
  });

  describe("Interface Inheritance", () => {
    it("should support optional properties correctly", () => {
      // Test measurement without optional properties
      const minimalMeasurement: IPerformanceMeasurement = {
        id: "test",
        startTime: 1000,
        category: "test-category",
        inUse: true,
      };

      expect(minimalMeasurement.endTime).toBeUndefined();
      expect(minimalMeasurement.metadata).toBeUndefined();

      // Test measurement with optional properties
      const fullMeasurement: IPerformanceMeasurement = {
        ...minimalMeasurement,
        endTime: 1050,
        metadata: { test: true },
      };

      expect(fullMeasurement.endTime).toBe(1050);
      expect(fullMeasurement.metadata).toEqual({ test: true });
    });

    it("should support GC event without optional properties", () => {
      const minimalGCEvent: IGCEvent = {
        type: "minor",
        duration: 5.2,
        timestamp: Date.now(),
      };

      expect(minimalGCEvent.memoryFreed).toBeUndefined();

      const fullGCEvent: IGCEvent = {
        ...minimalGCEvent,
        memoryFreed: 512000,
      };

      expect(fullGCEvent.memoryFreed).toBe(512000);
    });

    it("should support resource metrics with optional properties", () => {
      const minimalResourceMetrics: IResourceMetrics = {
        cpuUsage: 30.5,
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

      expect(minimalResourceMetrics.eventLoopDelay).toBeUndefined();
      expect(minimalResourceMetrics.loadAverage).toBeUndefined();

      const fullResourceMetrics: IResourceMetrics = {
        ...minimalResourceMetrics,
        eventLoopDelay: 1.8,
        loadAverage: [0.5, 0.3, 0.2],
      };

      expect(fullResourceMetrics.eventLoopDelay).toBe(1.8);
      expect(fullResourceMetrics.loadAverage).toEqual([0.5, 0.3, 0.2]);
    });
  });

  describe("Type Compatibility", () => {
    it("should ensure IEnhancedPerformanceMetrics includes all required fields", () => {
      const metrics: IEnhancedPerformanceMetrics = {
        // Legacy compatibility fields
        logsPerSecond: 100.5,
        averageLatencyMs: 25.3,
        peakLatencyMs: 150.7,
        totalLogs: 1000,
        failedLogs: 5,
        circuitBreakerState: "closed",
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
        gcEvents: [],
        measurementPoolUtilization: 50.0,
        timestamp: Date.now(),
        uptimeSeconds: 86400,
      };

      // Legacy fields
      expect(metrics.logsPerSecond).toBe(100.5);
      expect(metrics.averageLatencyMs).toBe(25.3);
      expect(metrics.peakLatencyMs).toBe(150.7);
      expect(metrics.totalLogs).toBe(1000);
      expect(metrics.failedLogs).toBe(5);
      expect(metrics.circuitBreakerState).toBe("closed");
      expect(metrics.objectPoolUtilization).toBe(75.2);

      // Enhanced fields
      expect(metrics.operation).toBeDefined();
      expect(metrics.resource).toBeDefined();
      expect(Array.isArray(metrics.gcEvents)).toBe(true);
      expect(metrics.measurementPoolUtilization).toBe(50.0);
      expect(typeof metrics.timestamp).toBe("number");
      expect(metrics.uptimeSeconds).toBe(86400);
    });
  });
});
