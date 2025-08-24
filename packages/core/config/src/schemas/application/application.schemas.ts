/**
 * Application Configuration Schemas
 * Zod validation schemas for application-level configuration management
 */

import { z } from "zod";

/**
 * Service configuration schema
 */
export const SERVICE_CONFIG_SCHEMA = z.object({
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  environment: z.enum(["development", "staging", "production", "test"]),
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default("localhost"),
  baseUrl: z.string().url().optional(),
  cors: z
    .object({
      enabled: z.boolean().default(true),
      origins: z.array(z.string()).or(z.literal("*")).default(["*"]),
      credentials: z.boolean().default(true),
    })
    .optional(),
  logging: z
    .object({
      level: z.enum(["error", "warn", "info", "debug"]).default("info"),
      pretty: z.boolean().default(false),
    })
    .default({ level: "info", pretty: false }),
});

/**
 * Authentication configuration schema
 */
export const AUTH_CONFIG_SCHEMA = z.object({
  jwt: z.object({
    secret: z.string().min(32),
    algorithm: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),
    expiresIn: z.string().default("15m"),
  }),
  session: z
    .object({
      secret: z.string().min(32),
      maxAge: z.number().default(86400000),
    })
    .optional(),
  bcryptRounds: z.number().int().min(4).max(31).default(10),
});

/**
 * Application configuration schema
 */
export const APPLICATION_CONFIG_SCHEMA = z.object({
  service: SERVICE_CONFIG_SCHEMA,
  auth: AUTH_CONFIG_SCHEMA.optional(),
  database: z
    .object({
      host: z.string().default("localhost"),
      port: z.number().int().default(5432),
      database: z.string().min(1),
      username: z.string().min(1),
      password: z.string().min(1),
      ssl: z.boolean().default(false),
    })
    .optional(),
  redis: z
    .object({
      host: z.string().default("localhost"),
      port: z.number().int().default(6379),
      password: z.string().optional(),
      database: z.number().int().min(0).default(0),
    })
    .optional(),
});
