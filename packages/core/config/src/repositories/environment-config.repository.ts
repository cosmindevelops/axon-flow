/**
 * Environment-based configuration repository implementation
 * @module @axon/config/repositories/environment-config
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";
import { ZodError } from "zod";
import type { IConfigChangeListener, IConfigRepository, IRepositoryMetadata } from "../types/index.js";
import { detectPlatform } from "../utils/platform-detector.js";

/**
 * Environment variable transformation helper functions
 */

/**
 * Convert environment variable name to camelCase
 */
export function envToCamelCase(envName: string): string {
  return envName.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Parse boolean environment variables
 */
export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Parse numeric environment variables
 */
export function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse JSON environment variables
 */
export function parseJSON(value: string | undefined): unknown {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Parse array environment variables (comma-separated)
 */
export function parseArray(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Environment-based configuration repository with hierarchical loading
 */
export class EnvironmentConfigRepository implements IConfigRepository {
  private config: Record<string, unknown> = {};
  private readonly envPrefix: string;

  constructor(envPrefix = "AXON_") {
    this.envPrefix = envPrefix;
    this.loadHierarchicalConfig();
  }

  /**
   * Load configuration in hierarchical order: defaults → environment → secrets
   */
  private loadHierarchicalConfig(): void {
    // 1. Load base configuration defaults
    const baseConfig = this.loadBaseConfig();

    // 2. Load environment-specific overrides
    const envConfig = this.loadEnvironmentConfig();

    // 3. Load secrets (from environment variables with prefix)
    const secretsConfig = this.loadSecretsConfig();

    // Merge configurations (later sources override earlier ones)
    this.config = this.deepMerge(this.deepMerge(baseConfig, envConfig), secretsConfig);
  }

  /**
   * Load base configuration defaults
   */
  private loadBaseConfig(): Record<string, unknown> {
    return {
      environment: "development",
      logLevel: "info",
      port: 3000,
      service: {
        name: "axon-flow",
        version: "0.0.0",
      },
    };
  }

  /**
   * Load environment-specific configuration
   */
  private loadEnvironmentConfig(): Record<string, unknown> {
    const env = process.env["NODE_ENV"] ?? "development";
    const config: Record<string, unknown> = {
      environment: env,
    };

    // Load common environment variables
    if (process.env["LOG_LEVEL"] !== undefined && process.env["LOG_LEVEL"] !== "") {
      config["logLevel"] = process.env["LOG_LEVEL"];
    }
    if (process.env["PORT"] !== undefined && process.env["PORT"] !== "") {
      config["port"] = parseNumber(process.env["PORT"]);
    }

    // Load service configuration
    if (
      (process.env["SERVICE_NAME"] !== undefined && process.env["SERVICE_NAME"] !== "") ||
      (process.env["SERVICE_VERSION"] !== undefined && process.env["SERVICE_VERSION"] !== "")
    ) {
      const existingService = config["service"] as Record<string, unknown> | undefined;
      config["service"] = {
        ...(existingService ?? {}),
        name: process.env["SERVICE_NAME"] ?? "axon-flow",
        version: process.env["SERVICE_VERSION"] ?? "0.0.0",
      };
    }

    return config;
  }

  /**
   * Load secrets configuration from prefixed environment variables
   */
  private loadSecretsConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Process all environment variables with the configured prefix
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.envPrefix)) {
        const configPath = this.parseEnvKey(key);
        this.setNestedValue(config, configPath, this.parseEnvValue(key, value));
      }
    }

    return config;
  }

  /**
   * Parse environment variable key to configuration path
   */
  private parseEnvKey(envKey: string): string[] {
    // Remove prefix and split by underscore
    const withoutPrefix = envKey.slice(this.envPrefix.length);
    return withoutPrefix.toLowerCase().split("_");
  }

  /**
   * Parse environment variable value based on naming conventions
   */
  private parseEnvValue(key: string, value: string | undefined): unknown {
    if (value === undefined) return undefined;

    // Boolean values
    if (key.includes("_ENABLED") || key.includes("_DISABLED") || key.includes("_SECURE") || key.includes("_DEBUG")) {
      return parseBoolean(value);
    }

    // Numeric values
    if (
      key.includes("_PORT") ||
      key.includes("_TIMEOUT") ||
      key.includes("_SIZE") ||
      key.includes("_COUNT") ||
      key.includes("_TTL") ||
      key.includes("_MAX") ||
      key.includes("_MIN")
    ) {
      return parseNumber(value) ?? value;
    }

    // JSON values
    if (key.includes("_JSON") || key.includes("_CONFIG")) {
      return parseJSON(value) ?? value;
    }

    // Array values
    if (key.includes("_LIST") || key.includes("_ARRAY") || key.includes("_HOSTS")) {
      return parseArray(value);
    }

    return value;
  }

  /**
   * Set nested value in configuration object
   */
  private setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (key === undefined || key === "") continue;
      if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    const lastKey = path[path.length - 1];
    if (lastKey !== undefined && lastKey !== "") {
      current[lastKey] = value;
    }
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
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
          result[key] = this.deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
        } else if (sourceValue !== undefined) {
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }

  load<T extends z.ZodType>(schema: T): z.infer<T> {
    try {
      return schema.parse(this.config);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = this.formatZodErrors(error);
        throw new ConfigurationError("Configuration validation failed", {
          component: "EnvironmentConfigRepository",
          operation: "load",
          metadata: {
            errors: errorMessages,
            suggestions: this.generateSuggestions(error),
          },
        });
      }
      throw new ConfigurationError("Configuration validation failed", {
        component: "EnvironmentConfigRepository",
        operation: "load",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  get(key: string): unknown {
    return this.config[key];
  }

  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T> {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = this.formatZodErrors(error);
        throw new ConfigurationError("Schema validation failed", {
          component: "EnvironmentConfigRepository",
          operation: "validate",
          metadata: {
            errors: errorMessages,
            suggestions: this.generateSuggestions(error),
          },
        });
      }
      throw new ConfigurationError("Schema validation failed", {
        component: "EnvironmentConfigRepository",
        operation: "validate",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Format Zod errors with field paths
   */
  private formatZodErrors(error: ZodError): string[] {
    return error.issues.map((err) => {
      const path = err.path.join(".");
      return `${path}: ${err.message}`;
    });
  }

  /**
   * Generate suggestions for common configuration errors
   */
  private generateSuggestions(error: ZodError): string[] {
    const suggestions: string[] = [];

    for (const err of error.issues) {
      const path = err.path.join("_").toUpperCase();

      if (err.code === "invalid_type" && err.expected === "string") {
        suggestions.push(`Set environment variable: ${this.envPrefix}${path}="your_value"`);
      } else if (err.code === "invalid_type" && err.expected === "number") {
        suggestions.push(`Set environment variable: ${this.envPrefix}${path}=123`);
      } else if (err.code === "invalid_type" && err.expected === "boolean") {
        suggestions.push(`Set environment variable: ${this.envPrefix}${path}=true`);
      } else if (err.code === "too_small") {
        suggestions.push(`Increase value of ${this.envPrefix}${path}`);
      } else if (err.code === "too_big") {
        suggestions.push(`Decrease value of ${this.envPrefix}${path}`);
      }
    }

    return suggestions;
  }

  /**
   * Watch for configuration changes (no-op for environment repository)
   * Environment variables don't change during runtime in most cases
   */
  watch(_listener: IConfigChangeListener): () => void {
    // Environment variables typically don't change during runtime
    // Return a no-op unsubscribe function
    return () => {
      // No-op
    };
  }

  /**
   * Reload configuration from environment variables
   */
  async reload(): Promise<void> {
    this.loadHierarchicalConfig();
    // Add a minimal await to satisfy ESLint
    await Promise.resolve();
  }

  /**
   * Dispose of resources (no-op for environment repository)
   */
  async dispose(): Promise<void> {
    this.config = {};
    // Add a minimal await to satisfy ESLint
    await Promise.resolve();
  }

  /**
   * Get repository metadata
   */
  getMetadata(): IRepositoryMetadata {
    return {
      source: `environment:${this.envPrefix}`,
      type: "environment",
      platform: detectPlatform(),
      lastModified: Date.now(),
      isWatchable: false, // Environment variables typically don't change during runtime
      isWritable: false, // Environment repository is read-only
      version: {
        version: 1,
        timestamp: Date.now(),
        checksum: this.generateChecksum(JSON.stringify(this.config)),
        metadata: {
          envPrefix: this.envPrefix,
          configKeys: Object.keys(this.config),
        },
      },
    };
  }

  /**
   * Generate simple checksum for configuration
   */
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
