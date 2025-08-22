/**
 * Configuration Builder Factory Types
 * Type definitions for the factory pattern implementation
 */

import type { ConfigPlatform } from "../../types/index.js";

/**
 * Supported environment types
 */
export type Environment = "development" | "production" | "test";

/**
 * Factory configuration options
 */
export interface IFactoryOptions {
  /**
   * Override automatic environment detection
   */
  readonly environment?: Environment;

  /**
   * Platform override
   */
  readonly platform?: ConfigPlatform;

  /**
   * Enable strict mode (throws on environment detection failures)
   */
  readonly strictMode?: boolean;

  /**
   * Custom environment detection function
   */
  readonly customDetection?: () => Environment | null;

  /**
   * Validation settings
   */
  readonly validation?: {
    readonly warnOnUnknownEnvironment?: boolean;
    readonly requireExplicitProduction?: boolean;
  };
}

/**
 * Test fixture type for test configuration builders
 */
export interface ITestFixture {
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly description?: string;
}

/**
 * Factory registry entry for custom environment builders
 */
export interface IBuilderRegistryEntry {
  readonly environment: Environment;
  readonly builderClass: new () => unknown;
  readonly priority: number;
}

/**
 * Factory create options for environment-specific builders
 */
export interface IFactoryCreateOptions {
  readonly detectEnvironment?: boolean;
  readonly throwOnMissing?: boolean;
  readonly useCache?: boolean;
}

/**
 * Environment detection result
 */
export interface IEnvironmentDetectionResult {
  readonly environment: Environment;
  readonly confidence: number;
  readonly source: "explicit" | "environment" | "default" | "custom";
  readonly platform: ConfigPlatform;
}
