/**
 * Configuration Utility Schemas
 * Validation schemas for configuration utilities and platform detection
 */

import { z } from "zod";

/**
 * Platform detection result schema
 */
export const PLATFORM_DETECTION_SCHEMA = z.object({
  platform: z.enum(["node", "browser", "react-native"]),
  version: z.string().optional(),
  environment: z.enum(["development", "staging", "production"]).optional(),
  features: z.object({
    localStorage: z.boolean(),
    sessionStorage: z.boolean(),
    fileSystem: z.boolean(),
    processEnv: z.boolean(),
    webworkers: z.boolean(),
  }),
});

/**
 * Configuration utility options schema
 */
export const UTILITY_OPTIONS_SCHEMA = z.object({
  enableCaching: z.boolean().default(true),
  enableValidation: z.boolean().default(true),
  enableLogging: z.boolean().default(false),
  timeout: z.number().min(0).default(5000),
});

/**
 * Performance measurement schema
 */
export const PERFORMANCE_MEASUREMENT_SCHEMA = z.object({
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number().min(0),
  operation: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Configuration validation result schema
 */
export const VALIDATION_RESULT_SCHEMA = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  data: z.unknown().optional(),
  timestamp: z.number(),
});
