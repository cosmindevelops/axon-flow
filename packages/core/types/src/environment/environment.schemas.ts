/**
 * Zod validation schemas for environment types
 *
 * Runtime validation schemas for environment configuration and detection.
 */

import { z } from "zod";
import type { Environment } from "./index.js";

// Environment enum schema
export const environmentSchema = z.enum(["development", "staging", "production"]) satisfies z.ZodType<Environment>;

// Extended environment schema with additional environments
export const extendedEnvironmentSchema = z.union([environmentSchema, z.enum(["test", "ci", "local", "preview"])]);

// Environment configuration schema
export const environmentConfigSchema = z.object({
  name: environmentSchema,
  debug: z.boolean().optional(),
  verbose: z.boolean().optional(),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),
  features: z.record(z.boolean()).optional(),
  apiUrl: z.string().url().optional(),
  cdnUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Environment variables schema
export const environmentVariablesSchema = z.object({
  NODE_ENV: environmentSchema.optional(),
  DEBUG: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  API_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  PORT: z.string().regex(/^\d+$/).optional(),
  HOST: z.string().optional(),
});

// Environment detection schema
export const environmentDetectionSchema = z.object({
  detected: environmentSchema,
  source: z.enum(["env", "config", "default"]),
  confidence: z.number().min(0).max(1),
  overrides: z.array(z.string()).optional(),
});

// Type inference helpers
export type InferredEnvironment = z.infer<typeof environmentSchema>;
export type InferredEnvironmentConfig = z.infer<typeof environmentConfigSchema>;
export type InferredEnvironmentVariables = z.infer<typeof environmentVariablesSchema>;
