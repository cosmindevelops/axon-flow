/**
 * Zod validation schemas for performance decorators
 */

import { z } from "zod";

/**
 * Performance category validation schema
 */
export const performanceCategorySchema = z.enum([
  "database",
  "network",
  "computation",
  "io",
  "cache",
  "auth",
  "validation",
  "serialization",
  "custom",
]);

/**
 * Decorator activation conditions validation schema
 */
export const decoratorActivationConditionsSchema = z
  .object({
    environments: z.array(z.string()).optional(),
    nodeEnv: z.array(z.string()).optional(),
    featureFlags: z.array(z.string()).optional(),
    customCondition: z.function(),
    logLevel: z.string().optional(),
  })
  .partial({ customCondition: true });

/**
 * Performance budget validation schema
 */
export const performanceBudgetSchema = z
  .object({
    maxLatencyMs: z.number().min(0),
    warningThreshold: z.number().min(0).max(100).optional(),
    onExceeded: z.enum(["warn", "error", "custom"]).optional(),
    customHandler: z.function(),
  })
  .partial({ customHandler: true });

/**
 * Performance exporter validation schema
 */
export const performanceExporterSchema = z.object({
  name: z.string().min(1),
  format: z.enum(["json", "prometheus", "csv", "custom"]),
  export: z.function(),
  interval: z.number().min(0).optional(),
});

/**
 * Parameter inspection options validation schema
 */
export const parameterOptionsSchema = z.object({
  includeValues: z.boolean().optional(),
  includeTypes: z.boolean().optional(),
  maxValueLength: z.number().min(0).optional(),
  excludeParams: z.array(z.string()).optional(),
});

/**
 * Enhanced performance decorator options validation schema
 */
export const performanceDecoratorOptionsSchema = z.object({
  category: z.string().min(1).optional(),
  performanceCategory: performanceCategorySchema.optional(),
  threshold: z.number().min(0).optional(),
  sample: z.boolean().optional(),
  sampleRate: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  activation: decoratorActivationConditionsSchema.optional(),
  budget: performanceBudgetSchema.optional(),
  trackParameters: z.boolean().optional(),
  parameterOptions: parameterOptionsSchema.optional(),
  exporters: z.array(performanceExporterSchema).optional(),
});

/**
 * Decorator composition configuration validation schema
 */
export const decoratorCompositionSchema = z.object({
  executionOrder: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  combinable: z.boolean().optional(),
  sharedContext: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parameter inspection result validation schema
 */
export const parameterInspectionSchema = z.object({
  name: z.union([z.string(), z.number()]),
  type: z.string(),
  value: z.unknown().optional(),
  size: z.number().min(0),
});

/**
 * Global decorator configuration validation schema
 */
export const decoratorGlobalConfigSchema = z.object({
  activation: decoratorActivationConditionsSchema.optional(),
  budgets: z.map(z.union([performanceCategorySchema, z.string()]), performanceBudgetSchema).optional(),
  exporters: z.array(performanceExporterSchema).optional(),
  globalSampleRate: z.number().min(0).max(1).optional(),
});

// Type exports for use in implementation
export type PerformanceCategorySchema = z.infer<typeof performanceCategorySchema>;
export type DecoratorActivationConditionsSchema = z.infer<typeof decoratorActivationConditionsSchema>;
export type PerformanceBudgetSchema = z.infer<typeof performanceBudgetSchema>;
export type PerformanceExporterSchema = z.infer<typeof performanceExporterSchema>;
export type ParameterOptionsSchema = z.infer<typeof parameterOptionsSchema>;
export type PerformanceDecoratorOptionsSchema = z.infer<typeof performanceDecoratorOptionsSchema>;
export type DecoratorCompositionSchema = z.infer<typeof decoratorCompositionSchema>;
export type ParameterInspectionSchema = z.infer<typeof parameterInspectionSchema>;
export type DecoratorGlobalConfigSchema = z.infer<typeof decoratorGlobalConfigSchema>;
