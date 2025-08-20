/**
 * Base configuration schemas with common fields
 * @module @axon/config/schemas/base
 */

import { z } from "zod";

/**
 * Base configuration schema with common fields
 */
export const BASE_CONFIG_SCHEMA = z.object({
  environment: z.enum(["development", "staging", "production"]).default("development"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
});
