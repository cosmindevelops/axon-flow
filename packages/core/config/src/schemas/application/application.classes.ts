/**
 * Application Schema Classes
 * Configuration validator classes for application-level schemas
 */

import type { z } from "zod";
import type { IApplicationConfig, IApplicationValidationOptions } from "./application.types.js";

/**
 * Application configuration validator
 */
export class ApplicationConfigValidator {
  private readonly options: IApplicationValidationOptions;

  constructor(options: IApplicationValidationOptions = {}) {
    this.options = {
      strict: true,
      allowUnknown: false,
      stripUnknown: false,
      ...options,
    };
  }

  /**
   * Validate complete application configuration
   */
  validateApplication(config: unknown, schema: z.ZodType<IApplicationConfig>): IApplicationConfig {
    try {
      return schema.parse(config) as IApplicationConfig;
    } catch (error) {
      throw new Error(
        `Application configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate service configuration
   */
  validateService(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("service", config, schema);
  }

  /**
   * Validate authentication configuration
   */
  validateAuth(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("auth", config, schema);
  }

  /**
   * Validate application-specific configuration
   */
  validateAppConfig(config: unknown, schema: z.ZodType): unknown {
    return this.validateSection("app", config, schema);
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
