/**
 * Zod validation schemas for performance logging types
 *
 * Runtime validation schemas for performance metrics and monitoring.
 */

import { z } from "zod";
import type { MetricType } from "./performance.types.js";

// Enum schemas
export const metricTypeSchema = z.enum([
  "counter",
  "gauge",
  "histogram",
  "summary",
  "timer",
]) satisfies z.ZodType<MetricType>;

export const resourceTypeSchema = z.enum(["cpu", "memory", "disk", "network", "handle", "thread"]);

// Timing metrics schema
export const timingMetricsSchema = z.object({
  start: z.number(),
  end: z.number(),
  duration: z.number(),
  dns: z.number().optional(),
  tcp: z.number().optional(),
  tls: z.number().optional(),
  firstByte: z.number().optional(),
  download: z.number().optional(),
  total: z.number().optional(),
});

// Resource usage schema
export const resourceUsageSchema = z.object({
  type: resourceTypeSchema,
  value: z.number(),
  unit: z.string(),
  percentage: z.number().optional(),
  limit: z.number().optional(),
  available: z.number().optional(),
  timestamp: z.string(),
});

// Performance metrics schema
export const performanceMetricsSchema = z.object({
  timing: timingMetricsSchema.optional(),
  resources: z.array(resourceUsageSchema).optional(),
  throughput: z.number().optional(),
  errorRate: z.number().optional(),
  successRate: z.number().optional(),
  p50: z.number().optional(),
  p90: z.number().optional(),
  p95: z.number().optional(),
  p99: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  mean: z.number().optional(),
  stdDev: z.number().optional(),
});

// Performance entry schema
export const performanceEntrySchema = z.object({
  name: z.string(),
  type: metricTypeSchema,
  value: z.number(),
  unit: z.string(),
  timestamp: z.string(),
  labels: z.record(z.string()).optional(),
  metrics: performanceMetricsSchema.optional(),
  correlationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Type inference helpers
export type InferredPerformanceEntry = z.infer<typeof performanceEntrySchema>;
export type InferredPerformanceMetrics = z.infer<typeof performanceMetricsSchema>;
export type InferredResourceUsage = z.infer<typeof resourceUsageSchema>;
