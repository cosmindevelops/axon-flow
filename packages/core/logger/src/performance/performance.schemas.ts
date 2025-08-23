/**
 * Zod validation schemas for enhanced performance tracking
 */

import { z } from "zod";

/**
 * Memory metrics validation schema
 */
export const memoryMetricsSchema = z.object({
  rss: z.number().min(0),
  heapTotal: z.number().min(0),
  heapUsed: z.number().min(0),
  external: z.number().min(0),
  arrayBuffers: z.number().min(0),
  utilization: z.number().min(0).max(100),
});

/**
 * Garbage collection event validation schema
 */
export const gcEventSchema = z.object({
  type: z.string().min(1),
  duration: z.number().min(0),
  timestamp: z.number().min(0),
  memoryFreed: z.number().min(0).optional(),
});

/**
 * Operation metrics validation schema
 */
export const operationMetricsSchema = z.object({
  count: z.number().min(0),
  throughput: z.number().min(0),
  averageLatency: z.number().min(0),
  minLatency: z.number().min(0),
  maxLatency: z.number().min(0),
  p50Latency: z.number().min(0),
  p95Latency: z.number().min(0),
  p99Latency: z.number().min(0),
  standardDeviation: z.number().min(0),
  totalTime: z.number().min(0),
});

/**
 * Resource metrics validation schema
 */
export const resourceMetricsSchema = z.object({
  cpuUsage: z.number().min(0).max(100),
  memory: memoryMetricsSchema,
  eventLoopDelay: z.number().min(0).optional(),
  uptime: z.number().min(0),
  loadAverage: z.array(z.number()).optional(),
});

/**
 * Enhanced performance metrics validation schema
 */
export const enhancedPerformanceMetricsSchema = z.object({
  // Legacy compatibility fields
  logsPerSecond: z.number().min(0),
  averageLatencyMs: z.number().min(0),
  peakLatencyMs: z.number().min(0),
  totalLogs: z.number().min(0),
  failedLogs: z.number().min(0),
  circuitBreakerState: z.enum(["closed", "open", "half-open"]),
  objectPoolUtilization: z.number().min(0).max(100),

  // Enhanced fields
  operation: operationMetricsSchema,
  resource: resourceMetricsSchema,
  gcEvents: z.array(gcEventSchema),
  measurementPoolUtilization: z.number().min(0).max(100),
  timestamp: z.number().min(0),
  uptimeSeconds: z.number().min(0),
});

/**
 * Enhanced performance configuration validation schema
 */
export const enhancedPerformanceConfigSchema = z.object({
  enabled: z.boolean(),
  sampleRate: z.number().min(0).max(1),
  thresholdMs: z.number().min(0),
  enableMemoryTracking: z.boolean(),
  enableGCTracking: z.boolean(),
  maxLatencyHistory: z.number().min(10).max(10000),
  maxGCEventHistory: z.number().min(10).max(1000),
  resourceMetricsInterval: z.number().min(100).max(60000),
  enableMeasurementPooling: z.boolean(),
  measurementPoolInitialSize: z.number().min(1).max(1000),
  measurementPoolMaxSize: z.number().min(10).max(10000),
});

/**
 * Performance measurement validation schema
 */
export const performanceMeasurementSchema = z.object({
  id: z.string().min(1),
  startTime: z.number(),
  endTime: z.number().optional(),
  category: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  inUse: z.boolean(),
});

/**
 * Performance decorator options validation schema
 */
export const performanceDecoratorOptionsSchema = z.object({
  category: z.string().min(1).optional(),
  threshold: z.number().min(0).optional(),
  sample: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Platform information validation schema
 */
export const platformInfoSchema = z.object({
  isNode: z.boolean(),
  isBrowser: z.boolean(),
  isWebWorker: z.boolean(),
  hasGCSupport: z.boolean(),
  hasPerformanceNow: z.boolean(),
  hasMemoryAPI: z.boolean(),
});

/**
 * Metrics export format validation schema
 */
export const metricsExportFormatSchema = z.enum(["json", "prometheus"]);

/**
 * Memory trend validation schema
 */
export const memoryTrendSchema = z.enum(["increasing", "decreasing", "stable"]);

// Type exports for use in implementation
export type MemoryMetricsSchema = z.infer<typeof memoryMetricsSchema>;
export type GCEventSchema = z.infer<typeof gcEventSchema>;
export type OperationMetricsSchema = z.infer<typeof operationMetricsSchema>;
export type ResourceMetricsSchema = z.infer<typeof resourceMetricsSchema>;
export type EnhancedPerformanceMetricsSchema = z.infer<typeof enhancedPerformanceMetricsSchema>;
export type EnhancedPerformanceConfigSchema = z.infer<typeof enhancedPerformanceConfigSchema>;
export type PerformanceMeasurementSchema = z.infer<typeof performanceMeasurementSchema>;
export type PerformanceDecoratorOptionsSchema = z.infer<typeof performanceDecoratorOptionsSchema>;
export type PlatformInfoSchema = z.infer<typeof platformInfoSchema>;
export type MetricsExportFormatSchema = z.infer<typeof metricsExportFormatSchema>;
export type MemoryTrendSchema = z.infer<typeof memoryTrendSchema>;
