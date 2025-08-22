/**
 * Infrastructure Schema Classes
 * Configuration validator classes for infrastructure-level schemas
 */

import type { z } from "zod";
import type { IInfrastructureConfig, IInfrastructureValidationOptions } from "./infrastructure.types.js";

/**
 * Infrastructure configuration validator
 */
export class InfrastructureConfigValidator {
  private readonly options: IInfrastructureValidationOptions;

  constructor(options: IInfrastructureValidationOptions = {}) {
    this.options = {
      strict: true,
      allowUnknown: false,
      stripUnknown: false,
      ...options,
    };
  }

  /**
   * Validate complete infrastructure configuration
   */
  validateInfrastructure(config: unknown, schema: z.ZodType<IInfrastructureConfig>): IInfrastructureConfig {
    try {
      return schema.parse(config) as IInfrastructureConfig;
    } catch (error) {
      throw new Error(
        `Infrastructure configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate base platform configuration
   */
  validateBase(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("base", config, schema);
  }

  /**
   * Validate database configuration
   */
  validateDatabase(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("database", config, schema);
  }

  /**
   * Validate Redis configuration
   */
  validateRedis(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("redis", config, schema);
  }

  /**
   * Validate RabbitMQ configuration
   */
  validateRabbitMQ(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("rabbitmq", config, schema);
  }

  /**
   * Validate a configuration section
   */
  private validateSection(section: string, config: unknown, schema: z.ZodType): unknown {
    try {
      return schema.parse(config);
    } catch (error) {
      throw new Error(
        `${section} configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
