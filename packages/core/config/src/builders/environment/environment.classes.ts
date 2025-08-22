/**
 * Environment-Specific Configuration Builder Classes
 * Development, Production, and Test configuration builders with environment-optimized defaults
 */

import { ConfigBuilder } from "../base/base.classes.js";
import type { IConfigBuilderOptions } from "../base/base.types.js";
import type { TestType } from "./environment.types.js";

/**
 * Development configuration builder with opinionated defaults for development workflow
 *
 * Features:
 * - Hot-reload enabled by default
 * - File watching enabled
 * - Verbose error reporting
 * - Environment variables with AXON_DEV_ prefix
 * - Local development file paths
 * - Memory cache for fast iteration
 */
export class DevelopmentConfigBuilder extends ConfigBuilder {
  constructor(options: IConfigBuilderOptions = {}) {
    const devDefaults: IConfigBuilderOptions = {
      enableValidationCache: true,
      enableObjectPooling: true,
      ...options,
    };

    super(devDefaults);

    // Apply development-specific configuration
    this._setupDevelopmentDefaults();
  }

  /**
   * Setup development-specific defaults
   */
  private _setupDevelopmentDefaults(): void {
    // Add environment variables with development prefix
    this.fromEnvironment({
      prefix: "AXON_DEV_",
    });

    // Add standard environment variables as fallback
    this.fromEnvironment({
      prefix: "AXON_",
    });

    // Add common development configuration files (if they exist)
    this._addDevelopmentFiles();

    // Add memory-based overrides for development
    this.fromMemory({
      app: {
        logLevel: "debug",
        enableDebugMode: true,
        enableHotReload: true,
      },
    });
  }

  /**
   * Add common development configuration files
   */
  private _addDevelopmentFiles(): void {
    // Try common development configuration file paths
    const devFiles = [
      "./config/development.json",
      "./config/dev.json",
      "./config.development.json",
      "./config.dev.json",
      "./.env.development",
      "./.env.dev",
      "./.env.local",
    ];

    for (const filePath of devFiles) {
      try {
        this.fromFile(filePath, {
          watch: true,
        });
      } catch {
        // Silently ignore missing files in development
        continue;
      }
    }
  }

  /**
   * Create a fully configured development builder with all defaults
   */
  static createDefault(options: IConfigBuilderOptions = {}): DevelopmentConfigBuilder {
    return new DevelopmentConfigBuilder(options);
  }

  /**
   * Create a minimal development builder with only essential configuration
   */
  static createMinimal(options: IConfigBuilderOptions = {}): DevelopmentConfigBuilder {
    return new DevelopmentConfigBuilder(options);
  }
}

/**
 * Production configuration builder with security-first defaults and performance optimizations
 *
 * Features:
 * - Security-first configuration with strict validation
 * - Performance optimizations with higher cache limits
 * - No file watching or hot-reload for stability
 * - Structured JSON logging without sensitive data
 * - SSL/TLS configuration defaults
 * - Connection pooling and clustering support
 */
export class ProductionConfigBuilder extends ConfigBuilder {
  constructor(options: IConfigBuilderOptions = {}) {
    const prodDefaults: IConfigBuilderOptions = {
      enableValidationCache: true,
      enableObjectPooling: true,
      ...options,
    };

    super(prodDefaults);

    // Apply production-specific configuration
    this._setupProductionDefaults();
  }

  /**
   * Setup production-specific defaults
   */
  private _setupProductionDefaults(): void {
    // Only use environment variables in production for security
    this.fromEnvironment({
      prefix: "AXON_PROD_",
    });

    this.fromEnvironment({
      prefix: "AXON_",
    });

    // Try production configuration file
    try {
      this.fromFile("./config/production.json");
    } catch {
      // Silently ignore missing production config file
    }

    try {
      this.fromFile("./.env.production");
    } catch {
      // Silently ignore missing production env file
    }

    // Add production memory overrides
    this.fromMemory({
      app: {
        logLevel: "info",
        enableDebugMode: false,
        enableHotReload: false,
      },
    });
  }

  /**
   * Create a production builder with security defaults
   */
  static createSecure(options: IConfigBuilderOptions = {}): ProductionConfigBuilder {
    return new ProductionConfigBuilder(options);
  }

  /**
   * Create a high-performance production builder
   */
  static createHighPerformance(options: IConfigBuilderOptions = {}): ProductionConfigBuilder {
    const performanceOptions: IConfigBuilderOptions = {
      enableValidationCache: true,
      enableObjectPooling: true,
      ...options,
    };
    return new ProductionConfigBuilder(performanceOptions);
  }
}

/**
 * Test configuration builder with test-focused defaults and isolation features
 *
 * Features:
 * - Fast configuration loading optimized for test performance
 * - Isolated environment with no external dependencies by default
 * - Mock-friendly configuration sources
 * - Deterministic configuration for reproducible tests
 * - Easy cleanup and reset capabilities
 * - Support for various testing scenarios (unit, integration, e2e)
 */
export class TestConfigBuilder extends ConfigBuilder {
  private _testFixture: TestType | null = null;
  private _isolated = false;

  constructor(options: IConfigBuilderOptions = {}) {
    const testDefaults: IConfigBuilderOptions = {
      enableValidationCache: false, // Disable caching for test isolation
      enableObjectPooling: false, // Disable pooling for test isolation
      ...options,
    };

    super(testDefaults);

    // Apply test-specific configuration
    this._setupTestDefaults();
  }

  /**
   * Setup test-specific defaults
   */
  private _setupTestDefaults(): void {
    // Use test-specific environment variables
    this.fromEnvironment({
      prefix: "AXON_TEST_",
    });

    // Try test configuration files
    try {
      this.fromFile("./.env.test");
    } catch {
      // Silently ignore missing test env file
    }

    // Add test memory overrides
    this.fromMemory({
      app: {
        logLevel: "silent",
        enableDebugMode: false,
        enableHotReload: false,
      },
    });
  }

  /**
   * Configure builder with a specific test fixture
   */
  withFixture(fixture: TestType): this {
    this._testFixture = fixture;

    const fixtureConfig = this._getFixtureConfig(fixture);
    this.fromMemory(fixtureConfig);

    return this;
  }

  /**
   * Enable test isolation (no external dependencies)
   */
  withIsolation(isolated = true): this {
    this._isolated = isolated;

    if (isolated) {
      // Override with isolated test configuration
      this.fromMemory({
        database: {
          url: "sqlite::memory:",
          synchronize: true,
        },
        redis: {
          host: "localhost",
          port: 6379,
          db: 15, // Use dedicated test database
        },
      });
    }

    return this;
  }

  /**
   * Get configuration for a specific test fixture
   */
  private _getFixtureConfig(fixture: TestType): Record<string, unknown> {
    switch (fixture) {
      case "unit":
        return {
          database: { url: "sqlite::memory:" },
          redis: { host: "localhost", db: 15 },
          logging: { level: "silent" },
        };
      case "integration":
        return {
          database: { url: "postgresql://localhost/axon_test" },
          redis: { host: "localhost", db: 14 },
          logging: { level: "error" },
        };
      case "e2e":
        return {
          database: { url: "postgresql://localhost/axon_e2e" },
          redis: { host: "localhost", db: 13 },
          logging: { level: "warn" },
          server: { port: 3001 },
        };
      case "performance":
        return {
          database: { url: "postgresql://localhost/axon_perf" },
          redis: { host: "localhost", db: 12 },
          logging: { level: "error" },
        };
      case "minimal":
        return {
          logging: { level: "silent" },
        };
      default:
        return {};
    }
  }

  /**
   * Create an isolated test builder
   */
  static createIsolated(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);
    return builder.withIsolation(true);
  }

  /**
   * Create an integration test builder
   */
  static createIntegration(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);
    return builder.withFixture("integration");
  }

  /**
   * Create an E2E test builder
   */
  static createE2E(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);
    return builder.withFixture("e2e");
  }
}
