/**
 * Environment-Specific Builder Types
 * Type definitions for development, production, and test configuration builders
 */

/**
 * Test fixture types for pre-configured test scenarios
 */
export type TestType = "unit" | "integration" | "e2e" | "performance" | "minimal";

/**
 * Environment-specific builder configuration
 */
export interface IEnvironmentBuilderConfig {
  /**
   * Whether to enable development-specific features
   */
  readonly developmentMode?: boolean;

  /**
   * Whether to enable file watching
   */
  readonly enableWatching?: boolean;

  /**
   * Whether to enable hot-reload functionality
   */
  readonly enableHotReload?: boolean;

  /**
   * Maximum number of cached builders for this environment
   */
  readonly maxCachedBuilders?: number;

  /**
   * Whether to fail fast on validation errors
   */
  readonly failFast?: boolean;
}

/**
 * Development-specific configuration options
 */
export interface IDevelopmentBuilderOptions extends IEnvironmentBuilderConfig {
  readonly developmentMode: true;
  readonly enableWatching: true;
  readonly enableHotReload: true;
  readonly failFast: false;
}

/**
 * Production-specific configuration options
 */
export interface IProductionBuilderOptions extends IEnvironmentBuilderConfig {
  readonly developmentMode: false;
  readonly enableWatching: false;
  readonly enableHotReload: false;
  readonly failFast: true;
}

/**
 * Test-specific configuration options
 */
export interface ITestBuilderOptions extends IEnvironmentBuilderConfig {
  readonly developmentMode: true;
  readonly enableWatching: false;
  readonly enableHotReload: false;
  readonly failFast: false;
  readonly testFixture?: TestType;
  readonly isolated?: boolean;
}
