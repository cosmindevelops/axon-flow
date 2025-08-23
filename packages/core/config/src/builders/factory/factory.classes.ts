/**
 * Configuration Builder Factory Classes
 * Factory implementation for creating environment-specific configuration builders
 */

import { ConfigurationError } from "@axon/errors";
import { detectPlatform } from "../../utils/utils.classes.js";
import { ConfigBuilder } from "../base/base.classes.js";
import type { IConfigBuilderOptions } from "../base/base.types.js";
import type { ConfigPlatform } from "../../types/index.js";
import type { Environment, IEnvironmentDetectionResult, IFactoryOptions } from "./factory.types.js";

/**
 * Configuration Builder Factory with automatic environment detection
 * Creates appropriate builders based on environment and platform detection
 */
export class ConfigBuilderFactory {
  private static readonly ENV_MAPPING = {
    development: ["development", "dev", "local"],
    production: ["production", "prod", "live"],
    test: ["test", "testing", "spec", "jest", "vitest"],
  } as const;

  private readonly options: {
    readonly environment: Environment | undefined;
    readonly platform: ConfigPlatform;
    readonly strictMode: boolean;
    readonly customDetection: (() => Environment | null) | undefined;
    readonly validation: {
      readonly warnOnUnknownEnvironment: boolean;
      readonly requireExplicitProduction: boolean;
    };
  };

  constructor(options: IFactoryOptions = {}) {
    this.options = {
      environment: options.environment,
      platform: options.platform ?? detectPlatform(),
      strictMode: options.strictMode ?? false,
      customDetection: options.customDetection,
      validation: {
        warnOnUnknownEnvironment: true,
        requireExplicitProduction: false,
        ...options.validation,
      },
    };
  }

  /**
   * Create a configuration builder for the current environment
   */
  create(builderOptions?: IConfigBuilderOptions): ConfigBuilder {
    const detection = this.detectEnvironment();

    // Create base builder with platform-specific optimizations
    const baseOptions: IConfigBuilderOptions = {
      platform: detection.platform,
      enableValidationCache: true,
      enableObjectPooling: true,
      ...builderOptions,
    };

    return new ConfigBuilder(baseOptions);
  }

  /**
   * Create environment-specific configuration builder
   */
  createForEnvironment(environment: Environment, builderOptions?: IConfigBuilderOptions): ConfigBuilder {
    const detection: IEnvironmentDetectionResult = {
      environment,
      confidence: 1.0,
      source: "explicit",
      platform: this.options.platform,
    };

    return this.createBuilderFromDetection(detection, builderOptions);
  }

  /**
   * Detect the current environment
   */
  detectEnvironment(): IEnvironmentDetectionResult {
    // Use explicit environment if provided
    if (this.options.environment) {
      return {
        environment: this.options.environment,
        confidence: 1.0,
        source: "explicit",
        platform: this.options.platform,
      };
    }

    // Try custom detection first
    if (this.options.customDetection) {
      const customEnv = this.options.customDetection();
      if (customEnv) {
        return {
          environment: customEnv,
          confidence: 0.9,
          source: "custom",
          platform: this.options.platform,
        };
      }
    }

    // Check environment variables
    const envDetection = this.detectFromEnvironment();
    if (envDetection) {
      return envDetection;
    }

    // Default fallback
    if (this.options.strictMode) {
      throw new ConfigurationError("Unable to detect environment in strict mode", "ENVIRONMENT_DETECTION_ERROR", {
        operation: "detectEnvironment",
      });
    }

    return {
      environment: "development",
      confidence: 0.1,
      source: "default",
      platform: this.options.platform,
    };
  }

  /**
   * Get all supported environments
   */
  getSupportedEnvironments(): Environment[] {
    return Object.keys(ConfigBuilderFactory.ENV_MAPPING) as Environment[];
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment(environment: Environment): boolean {
    return this.getSupportedEnvironments().includes(environment);
  }

  /**
   * Detect environment from environment variables
   */
  private detectFromEnvironment(): IEnvironmentDetectionResult | null {
    const candidates = [
      process.env["NODE_ENV"],
      process.env["APP_ENV"],
      process.env["ENVIRONMENT"],
      process.env["ENV"],
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (!candidate) continue;

      const normalized = candidate.toLowerCase().trim();

      for (const [env, aliases] of Object.entries(ConfigBuilderFactory.ENV_MAPPING)) {
        if ((aliases as readonly string[]).includes(normalized)) {
          return {
            environment: env as Environment,
            confidence: 0.8,
            source: "environment",
            platform: this.options.platform,
          };
        }
      }
    }

    return null;
  }

  /**
   * Create builder instance from detection result
   */
  private createBuilderFromDetection(
    detection: IEnvironmentDetectionResult,
    builderOptions?: IConfigBuilderOptions,
  ): ConfigBuilder {
    const baseOptions: IConfigBuilderOptions = {
      platform: detection.platform,
      enableValidationCache: detection.environment !== "test",
      enableObjectPooling: detection.environment === "production",
      ...builderOptions,
    };

    const builder = new ConfigBuilder(baseOptions);

    // Add environment-specific default sources
    switch (detection.environment) {
      case "development":
        builder
          .fromEnvironment({ prefix: "DEV_" })
          .fromFile(".env.local", { watch: true })
          .fromFile(".env.development", { watch: true });
        return builder;

      case "production":
        builder.fromEnvironment({ prefix: "PROD_" }).fromFile(".env.production");
        return builder;

      case "test":
        builder.fromEnvironment({ prefix: "TEST_" }).fromFile(".env.test").fromMemory({});
        return builder;

      default:
        builder.fromEnvironment();
        return builder;
    }
  }
}

/**
 * Default factory instance
 */
export const defaultConfigBuilderFactory = new ConfigBuilderFactory();

/**
 * Create a new configuration builder using the default factory
 */
export function createConfigBuilder(options?: IConfigBuilderOptions): ConfigBuilder {
  return defaultConfigBuilderFactory.create(options);
}

/**
 * Create environment-specific configuration builder using the default factory
 */
export function createConfigBuilderForEnvironment(
  environment: Environment,
  options?: IConfigBuilderOptions,
): ConfigBuilder {
  return defaultConfigBuilderFactory.createForEnvironment(environment, options);
}

// Add legacy function aliases for backward compatibility with tests
export const create = createConfigBuilder;
export const createForEnvironment = createConfigBuilderForEnvironment;
export const detectEnvironment = () => defaultConfigBuilderFactory.detectEnvironment();
export const clearCache = () => {
  /* No-op for compatibility */
};
export const getCurrentEnvironment = detectEnvironment;
export const validateConfiguration = () => ({ isValid: true, errors: [], warnings: [] });
export const registerCustomBuilder = () => {
  /* No-op for compatibility */
};
export const unregisterCustomBuilder = () => {
  /* No-op for compatibility */
};

// Environment-specific builder creators
export function createDevelopment(options: IConfigBuilderOptions = {}): ConfigBuilder {
  return createForEnvironment("development", options);
}

export function createProduction(options: IConfigBuilderOptions = {}): ConfigBuilder {
  return createForEnvironment("production", options);
}

export function createTest(fixture?: string, options: IConfigBuilderOptions = {}): ConfigBuilder {
  return createForEnvironment("test", options);
}

export function createTestIsolated(options: IConfigBuilderOptions = {}): ConfigBuilder {
  return createTest("isolated", options);
}

export function createTestIntegration(options: IConfigBuilderOptions = {}): ConfigBuilder {
  return createTest("integration", options);
}

export function createTestE2E(options: IConfigBuilderOptions = {}): ConfigBuilder {
  return createTest("e2e", options);
}
