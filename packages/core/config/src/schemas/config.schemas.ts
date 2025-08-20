/**
 * Main configuration schema combining all configuration schemas
 */

import { z } from "zod";
import { DATABASE_CONFIG_SCHEMA } from "./database.schemas.js";
import { REDIS_CONFIG_SCHEMA } from "./redis.schemas.js";
import { RABBITMQ_CONFIG_SCHEMA } from "./rabbitmq.schemas.js";
import { AUTH_CONFIG_SCHEMA } from "./auth.schemas.js";
import { SERVICE_CONFIG_SCHEMA } from "./service.schemas.js";

/**
 * Complete application configuration schema
 */
export const APP_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA.optional(),
  redis: REDIS_CONFIG_SCHEMA.optional(),
  rabbitmq: RABBITMQ_CONFIG_SCHEMA.optional(),
  auth: AUTH_CONFIG_SCHEMA.optional(),
});

/**
 * Partial configuration schemas for different service types
 */

/**
 * API service configuration (needs auth, database, redis)
 */
export const API_SERVICE_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA,
  redis: REDIS_CONFIG_SCHEMA,
  auth: AUTH_CONFIG_SCHEMA,
});

/**
 * Worker service configuration (needs rabbitmq, redis, database)
 */
export const WORKER_SERVICE_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA.optional(),
  redis: REDIS_CONFIG_SCHEMA,
  rabbitmq: RABBITMQ_CONFIG_SCHEMA,
});

/**
 * Gateway service configuration (needs auth, redis, minimal database)
 */
export const GATEWAY_SERVICE_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  redis: REDIS_CONFIG_SCHEMA,
  auth: AUTH_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA.pick({
    host: true,
    port: true,
    database: true,
    username: true,
    password: true,
    ssl: true,
    pool: true,
  }).optional(),
});

/**
 * Hub service configuration (needs all services)
 */
export const HUB_SERVICE_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA,
  redis: REDIS_CONFIG_SCHEMA,
  rabbitmq: RABBITMQ_CONFIG_SCHEMA,
  auth: AUTH_CONFIG_SCHEMA,
});

/**
 * Agent service configuration (needs rabbitmq, optional database/redis)
 */
export const AGENT_SERVICE_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  rabbitmq: RABBITMQ_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA.optional(),
  redis: REDIS_CONFIG_SCHEMA.optional(),
});

/**
 * Environment-aware configuration schema
 */
export const ENVIRONMENT_AWARE_CONFIG_SCHEMA = z
  .object({
    environment: z.enum(["development", "staging", "production"]),
  })
  .passthrough()
  .transform((data) => {
    const env = data.environment;

    // Apply environment-specific defaults
    const config = { ...data };

    // Environment-specific transformations can be added here
    if (env === "production") {
      // Ensure security settings in production
      if (config["auth"] !== undefined && config["auth"] !== null && typeof config["auth"] === "object") {
        (config["auth"] as Record<string, unknown>)["secure"] = true;
      }
      if (config["service"] !== undefined && config["service"] !== null && typeof config["service"] === "object") {
        const service = config["service"] as Record<string, unknown>;
        if (service["logging"] !== undefined && service["logging"] !== null && typeof service["logging"] === "object") {
          (service["logging"] as Record<string, unknown>)["level"] = "warn";
        }
      }
    }

    if (env === "development") {
      // Development-friendly settings
      if (config["service"] !== undefined && config["service"] !== null && typeof config["service"] === "object") {
        const service = config["service"] as Record<string, unknown>;
        if (service["logging"] !== undefined && service["logging"] !== null && typeof service["logging"] === "object") {
          (service["logging"] as Record<string, unknown>)["pretty"] = true;
        }
      }
    }

    return config;
  })
  .pipe(APP_CONFIG_SCHEMA);

/**
 * Configuration schema factory for creating custom configurations
 */
export function createConfigSchema<T extends z.ZodRawShape>(
  shape: T,
): z.ZodObject<
  {
    service: typeof SERVICE_CONFIG_SCHEMA;
  } & T
> {
  return z.object({
    service: SERVICE_CONFIG_SCHEMA,
    ...shape,
  });
}

/**
 * Utility function to merge configurations with environment overrides
 */
export function mergeWithEnvironment<T extends z.ZodTypeAny>(
  schema: T,
  baseConfig: z.infer<T>,
  envConfig: Partial<z.infer<T>>,
): z.infer<T> {
  // Deep merge base config with environment overrides
  const merged = deepMerge(baseConfig as Record<string, unknown>, envConfig as Record<string, unknown>);
   
  return schema.parse(merged);
}

/**
 * Deep merge utility for configuration objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        sourceValue !== undefined &&
        targetValue !== null &&
        targetValue !== undefined &&
        typeof sourceValue === "object" &&
        typeof targetValue === "object" &&
        !Array.isArray(sourceValue) &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[typeof key];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[typeof key];
      }
    }
  }

  return result;
}

/**
 * Type exports for configuration
 */
export type AppConfig = z.infer<typeof APP_CONFIG_SCHEMA>;
export type ApiServiceConfig = z.infer<typeof API_SERVICE_CONFIG_SCHEMA>;
export type WorkerServiceConfig = z.infer<typeof WORKER_SERVICE_CONFIG_SCHEMA>;
export type GatewayServiceConfig = z.infer<typeof GATEWAY_SERVICE_CONFIG_SCHEMA>;
export type HubServiceConfig = z.infer<typeof HUB_SERVICE_CONFIG_SCHEMA>;
export type AgentServiceConfig = z.infer<typeof AGENT_SERVICE_CONFIG_SCHEMA>;
