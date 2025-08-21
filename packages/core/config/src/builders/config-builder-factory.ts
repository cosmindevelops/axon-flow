/**
 * Configuration Builder Factory with automatic environment detection
 * @module @axon/config/builders/config-builder-factory
 */

import { ConfigurationError } from "@axon/errors";
import type { ConfigPlatform } from "../types/index.js";
import { detectPlatform } from "../utils/platform-detector.js";
import type { ConfigBuilder } from "./config-builder.js";
import type { IConfigBuilderOptions } from "./config-builder.types.js";
import { DevelopmentConfigBuilder } from "./development-config-builder.js";
import { ProductionConfigBuilder } from "./production-config-builder.js";
import { TestConfigBuilder, type TestFixture } from "./test-config-builder.js";

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
 * Environment detection result
 */
export interface IEnvironmentDetection {
  readonly environment: Environment;
  readonly source: string;
  readonly confidence: number;
  readonly platform: ConfigPlatform;
  readonly warnings: string[];
}

/**
 * Custom builder registration
 */
export interface ICustomBuilderRegistration<T extends ConfigBuilder = ConfigBuilder> {
  readonly name: string;
  readonly environment: Environment;
  readonly factory: (options: IConfigBuilderOptions) => T;
  readonly priority?: number;
}

// Private state for factory
const customBuilders = new Map<string, ICustomBuilderRegistration>();
const environmentCache = new Map<string, IEnvironmentDetection>();

/**
 * Create a configuration builder with automatic environment detection
 */
export function create(options: IConfigBuilderOptions & IFactoryOptions = {}): ConfigBuilder {
  const detection = detectEnvironment(options);
  const builderOptions = prepareBuilderOptions(options, detection);

  // Check for custom builder first
  const customBuilder = getCustomBuilder(detection.environment, builderOptions);
  if (customBuilder) {
    return customBuilder;
  }

  // Use standard builders
  switch (detection.environment) {
    case "development":
      return new DevelopmentConfigBuilder(builderOptions);
    case "production":
      return new ProductionConfigBuilder(builderOptions);
    case "test":
      return new TestConfigBuilder(builderOptions);
    default:
      throw new ConfigurationError(`Unsupported environment: ${String(detection.environment)}`, {
        component: "ConfigBuilderFactory",
        operation: "create",
        metadata: {
          environment: detection.environment,
          detection,
        },
      });
  }
}

/**
 * Create a builder for a specific environment
 */
export function createForEnvironment(
  environment: Environment,
  options: IConfigBuilderOptions & IFactoryOptions = {},
): ConfigBuilder {
  const explicitOptions = { ...options, environment };
  return create(explicitOptions);
}

/**
 * Create a development configuration builder
 */
export function createDevelopment(options: IConfigBuilderOptions = {}): DevelopmentConfigBuilder {
  return new DevelopmentConfigBuilder(options);
}

/**
 * Create a production configuration builder
 */
export function createProduction(options: IConfigBuilderOptions = {}): ProductionConfigBuilder {
  return new ProductionConfigBuilder(options);
}

/**
 * Create a test configuration builder
 */
export function createTest(fixture?: TestFixture, options: IConfigBuilderOptions = {}): TestConfigBuilder {
  const builder = new TestConfigBuilder(options);
  return fixture ? builder.withFixture(fixture) : builder;
}

/**
 * Create a test builder with isolation
 */
export function createTestIsolated(options: IConfigBuilderOptions = {}): TestConfigBuilder {
  return TestConfigBuilder.createIsolated(options);
}

/**
 * Create an integration test builder
 */
export function createTestIntegration(options: IConfigBuilderOptions = {}): TestConfigBuilder {
  return TestConfigBuilder.createIntegration(options);
}

/**
 * Create an E2E test builder
 */
export function createTestE2E(options: IConfigBuilderOptions = {}): TestConfigBuilder {
  return TestConfigBuilder.createE2E(options);
}

/**
 * Detect the current environment
 */
export function detectEnvironment(options: IFactoryOptions = {}): IEnvironmentDetection {
  // Generate cache key
  const cacheKey = JSON.stringify({
    env: process.env["NODE_ENV"],
    axonEnv: process.env["AXON_ENV"],
    test: process.env["NODE_ENV"] === "test" || isTestRunner(),
    ci: isCIEnvironment(),
    override: options.environment,
  });

  // Check cache first
  const cached = environmentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const warnings: string[] = [];
  let environment: Environment;
  let source: string;
  let confidence: number;

  // 1. Explicit environment override (highest priority)
  if (options.environment) {
    environment = options.environment;
    source = "explicit-override";
    confidence = 1.0;
  }
  // 2. Custom detection function
  else if (options.customDetection) {
    const customResult = options.customDetection();
    if (customResult) {
      environment = customResult;
      source = "custom-detection";
      confidence = 0.9;
    } else {
      // Fall through to standard detection
      const standardResult = performStandardDetection();
      environment = standardResult.environment;
      source = standardResult.source;
      confidence = standardResult.confidence;
    }
  }
  // 3. Standard detection
  else {
    const standardResult = performStandardDetection();
    environment = standardResult.environment;
    source = standardResult.source;
    confidence = standardResult.confidence;
  }

  // Validation checks
  if (options.validation?.requireExplicitProduction && environment === "production" && source !== "explicit-override") {
    if (options.strictMode) {
      throw new ConfigurationError("Production environment must be explicitly specified for safety", {
        component: "ConfigBuilderFactory",
        operation: "detectEnvironment",
        metadata: { environment, source, confidence },
      });
    } else {
      warnings.push(
        "Production environment detected but not explicitly specified - consider using explicit configuration",
      );
    }
  }

  if (options.validation?.warnOnUnknownEnvironment && confidence < 0.7) {
    warnings.push(
      `Environment detection confidence is low (${confidence.toFixed(2)}) - consider explicit configuration`,
    );
  }

  const detection: IEnvironmentDetection = {
    environment,
    source,
    confidence,
    platform: options.platform ?? detectPlatform(),
    warnings,
  };

  // Cache the result
  environmentCache.set(cacheKey, detection);

  return detection;
}

/**
 * Perform standard environment detection
 */
function performStandardDetection(): {
  environment: Environment;
  source: string;
  confidence: number;
} {
  // Check AXON_ENV first (highest priority for Axon Flow)
  const axonEnv = process.env["AXON_ENV"];
  if (axonEnv && isValidEnvironment(axonEnv)) {
    return {
      environment: axonEnv as Environment,
      source: "AXON_ENV",
      confidence: 0.95,
    };
  }

  // Check NODE_ENV
  const nodeEnv = process.env["NODE_ENV"];
  if (nodeEnv && isValidEnvironment(nodeEnv)) {
    return {
      environment: nodeEnv as Environment,
      source: "NODE_ENV",
      confidence: 0.9,
    };
  }

  // Test runner detection
  if (isTestRunner()) {
    return {
      environment: "test",
      source: "test-runner-detection",
      confidence: 0.95,
    };
  }

  // CI environment detection
  if (isCIEnvironment()) {
    // CI is usually production-like, but could be test
    const ciEnv = detectCIEnvironment();
    return {
      environment: ciEnv,
      source: "ci-environment-detection",
      confidence: 0.8,
    };
  }

  // Default to development
  return {
    environment: "development",
    source: "default",
    confidence: 0.5,
  };
}

/**
 * Check if environment string is valid
 */
function isValidEnvironment(env: string): boolean {
  return ["development", "production", "test"].includes(env.toLowerCase());
}

/**
 * Detect if running in a test runner
 */
function isTestRunner(): boolean {
  // Check for common test runner indicators
  return (
    Boolean(process.env["JEST_WORKER_ID"]) || // Jest
    Boolean(process.env["VITEST"]) || // Vitest
    Boolean(process.env["MOCHA_FILE"]) || // Mocha
    Boolean(process.env["AVA_VERSION"]) || // AVA
    Boolean(process.env["CYPRESS_INTERNAL_ENV"]) || // Cypress
    Boolean(process.env["PLAYWRIGHT_TEST_BASE_URL"]) || // Playwright
    // Generic test indicators
    process.env["NODE_ENV"] === "test" ||
    // Check for test in argv
    process.argv.some((arg) => arg.includes("test") || arg.includes("spec"))
  );
}

/**
 * Detect if running in CI environment
 */
function isCIEnvironment(): boolean {
  return (
    Boolean(process.env["CI"]) || // Generic CI
    Boolean(process.env["CONTINUOUS_INTEGRATION"]) || // Generic
    Boolean(process.env["GITHUB_ACTIONS"]) || // GitHub Actions
    Boolean(process.env["GITLAB_CI"]) || // GitLab CI
    Boolean(process.env["JENKINS_URL"]) || // Jenkins
    Boolean(process.env["BUILDKITE"]) || // Buildkite
    Boolean(process.env["CIRCLECI"]) || // CircleCI
    Boolean(process.env["TRAVIS"]) || // Travis CI
    Boolean(process.env["DRONE"]) // Drone CI
  );
}

/**
 * Detect specific CI environment type
 */
function detectCIEnvironment(): Environment {
  // Check for production-like CI indicators
  if (
    process.env["PRODUCTION"] ||
    process.env["NODE_ENV"] === "production" ||
    process.env["DEPLOY_ENV"] === "production" ||
    process.env["GITHUB_REF"] === "refs/heads/main" ||
    process.env["GITLAB_CI_COMMIT_REF_NAME"] === "main"
  ) {
    return "production";
  }

  // Check for test-like CI indicators
  if (
    process.env["NODE_ENV"] === "test" ||
    process.env["CI_TEST"] ||
    process.argv.some((arg) => arg.includes("test"))
  ) {
    return "test";
  }

  // Default CI to production for safety
  return "production";
}

/**
 * Register a custom builder
 */
export function registerCustomBuilder<T extends ConfigBuilder>(registration: ICustomBuilderRegistration<T>): void {
  const key = `${registration.environment}:${registration.name}`;
  customBuilders.set(key, registration);
}

/**
 * Unregister a custom builder
 */
export function unregisterCustomBuilder(name: string, environment: Environment): void {
  const key = `${environment}:${name}`;
  customBuilders.delete(key);
}

/**
 * Get custom builder if available
 */
function getCustomBuilder(environment: Environment, options: IConfigBuilderOptions): ConfigBuilder | null {
  // Find all custom builders for this environment
  const candidates: ICustomBuilderRegistration[] = [];

  for (const [key, registration] of Array.from(customBuilders.entries())) {
    if (key.startsWith(`${environment}:`)) {
      candidates.push(registration);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by priority (higher first)
  candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  // Use the highest priority builder
  const topCandidate = candidates[0];
  if (!topCandidate) {
    return null;
  }
  return topCandidate.factory(options);
}

/**
 * Prepare builder options from factory options
 */
function prepareBuilderOptions(
  options: IConfigBuilderOptions & IFactoryOptions,
  detection: IEnvironmentDetection,
): IConfigBuilderOptions {
  const {
    environment: _env,
    strictMode: _strict,
    customDetection: _custom,
    validation: _validation,
    ...builderOptions
  } = options;

  return {
    platform: detection.platform,
    ...builderOptions,
  };
}

/**
 * Clear environment detection cache
 */
export function clearCache(): void {
  environmentCache.clear();
}

/**
 * Get current environment detection result
 */
export function getCurrentEnvironment(options: IFactoryOptions = {}): IEnvironmentDetection {
  return detectEnvironment(options);
}

/**
 * Validate factory configuration
 */
export function validateConfiguration(options: IFactoryOptions = {}): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const detection = detectEnvironment({ ...options, strictMode: false });
    warnings.push(...detection.warnings);

    if (detection.confidence < 0.5) {
      warnings.push("Very low confidence in environment detection - consider explicit configuration");
    }

    if (detection.environment === "production" && detection.source === "default") {
      errors.push("Production environment should never be detected by default - explicit configuration required");
    }
  } catch (error: unknown) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}
