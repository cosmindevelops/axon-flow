/**
 * Infrastructure Schema Types
 * Type definitions for infrastructure-level configuration schemas
 */

import type { z } from "zod";

// Import schema constants and derive types
import type {
  BASE_CONFIG_SCHEMA,
  DATABASE_CONFIG_SCHEMA,
  REDIS_CONFIG_SCHEMA,
  RABBITMQ_CONFIG_SCHEMA,
  INFRASTRUCTURE_CONFIG_SCHEMA,
} from "./infrastructure.schemas.js";

/**
 * Infrastructure configuration types derived from schemas
 */
export type InfrastructureBaseConfig = z.infer<typeof BASE_CONFIG_SCHEMA>;
export type InfrastructureDatabaseConfig = z.infer<typeof DATABASE_CONFIG_SCHEMA>;
export type InfrastructureRedisConfig = z.infer<typeof REDIS_CONFIG_SCHEMA>;
export type InfrastructureRabbitMQConfig = z.infer<typeof RABBITMQ_CONFIG_SCHEMA>;
export type InfrastructureConfig = z.infer<typeof INFRASTRUCTURE_CONFIG_SCHEMA>;

/**
 * Complete infrastructure configuration combining all infrastructure schemas
 */
export interface IInfrastructureConfig {
  readonly base: InfrastructureBaseConfig;
  readonly database?: InfrastructureDatabaseConfig;
  readonly redis?: InfrastructureRedisConfig;
  readonly rabbitmq?: InfrastructureRabbitMQConfig;
}

/**
 * Infrastructure configuration validation options
 */
export interface IInfrastructureValidationOptions {
  readonly strict?: boolean;
  readonly allowUnknown?: boolean;
  readonly stripUnknown?: boolean;
  readonly requiredServices?: string[];
}
