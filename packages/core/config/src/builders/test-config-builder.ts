/**
 * Test-specific configuration builder with isolation and performance optimizations
 * @module @axon/config/builders/test-config-builder
 */

import { ConfigBuilder } from "./config-builder.js";
import type { IConfigBuilderOptions } from "./config-builder.types.js";

/**
 * Test fixture type for pre-configured test scenarios
 */
export type TestFixture = "unit" | "integration" | "e2e" | "performance" | "minimal";

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
  private _testFixture: TestFixture | null = null;
  private _isolated = false;

  constructor(options: IConfigBuilderOptions = {}) {
    const testDefaults: IConfigBuilderOptions = {
      validation: {
        enabled: true,
        failFast: false, // Don't fail fast in tests for better error collection
        errorMessage: "Test configuration validation failed - check your test setup",
      },
      performance: {
        useObjectPool: false, // Disable pooling for test isolation
        lazyLoading: false, // Eager loading for predictable test behavior
        cacheBuildResults: false, // No caching for fresh config per test
        maxCachedBuilders: 0,
      },
      developmentMode: true, // Enable development features for testing
      ...options,
    };

    // Only assign platform if defined to satisfy exactOptionalPropertyTypes
    if (options.platform !== undefined) {
      Object.assign(testDefaults, { platform: options.platform });
    }

    super(testDefaults);

    // Apply test-specific configuration
    this._setupTestDefaults();
  }

  /**
   * Setup test-specific defaults
   */
  private _setupTestDefaults(): void {
    // Add test environment variables with highest priority
    this.withEnvironment({
      prefix: "AXON_TEST_",
      priority: 200, // Highest priority for test overrides
      transformKeys: true,
      parseValues: true,
    });

    // Add standard test environment variables
    this.withEnvironment({
      prefix: "TEST_",
      priority: 150,
      transformKeys: true,
      parseValues: true,
    });

    // Disable hot-reload for test stability
    this.withHotReload(false);

    // Add base test configuration
    this.withMemory(
      {
        app: {
          logLevel: "silent", // Silent by default for clean test output
          enableDebugMode: true,
          enableHotReload: false,
          environment: "test",
        },
        test: {
          isolation: true,
          deterministic: true,
          fastTeardown: true,
        },
      },
      {
        priority: 250, // Very high priority for test overrides
      },
    );
  }

  /**
   * Enable test isolation mode (no external dependencies)
   */
  withIsolation(enabled = true): this {
    this._isolated = enabled;

    if (enabled) {
      this.withMemory(
        {
          test: {
            isolation: true,
            mockExternalServices: true,
            useInMemoryStorage: true,
            disableNetworking: true,
          },
        },
        {
          priority: 300, // Highest priority for isolation
        },
      );
    }

    return this;
  }

  /**
   * Set test fixture configuration
   */
  withFixture(fixture: TestFixture): this {
    this._testFixture = fixture;

    const fixtureConfigs = {
      unit: {
        database: { type: "memory", persist: false },
        redis: { type: "memory" },
        server: { enabled: false },
        logging: { level: "silent" },
        external: { mock: true },
      },
      integration: {
        database: { type: "test-db", persist: true },
        redis: { type: "test-redis" },
        server: { enabled: true, port: 0 }, // Random port
        logging: { level: "error" },
        external: { mock: false },
      },
      e2e: {
        database: { type: "test-db", persist: true },
        redis: { type: "test-redis" },
        server: { enabled: true, port: 0 },
        logging: { level: "warn" },
        external: { mock: false },
        browser: { headless: true },
      },
      performance: {
        database: { type: "test-db", poolSize: 5 },
        redis: { type: "test-redis" },
        server: { enabled: true, port: 0 },
        logging: { level: "silent" },
        metrics: { enabled: true },
      },
      minimal: {
        database: { enabled: false },
        redis: { enabled: false },
        server: { enabled: false },
        logging: { level: "silent" },
      },
    };

    this.withMemory(
      {
        fixture,
        ...fixtureConfigs[fixture],
      },
      {
        priority: 275,
      },
    );

    return this;
  }

  /**
   * Add test-specific database configuration
   */
  withTestDatabase(
    options: {
      type?: "memory" | "test-db" | "sqlite";
      database?: string;
      persist?: boolean;
      resetBetweenTests?: boolean;
    } = {},
  ): this {
    const dbConfig = {
      database: {
        type: options.type ?? "memory",
        url:
          options.type === "sqlite"
            ? ":memory:"
            : options.type === "test-db"
              ? `postgresql://localhost:5432/${options.database ?? "axon_test"}`
              : undefined,
        ssl: false, // Never use SSL in tests
        logging: false, // No query logging in tests
        synchronize: true, // Auto-sync schema for tests
        dropSchema: options.resetBetweenTests ?? true, // Reset between tests by default
        migrationsRun: options.type === "test-db",
        keepConnectionAlive: options.persist ?? false,
        maxQueryExecutionTime: 1000, // Fast queries in tests
      },
    };

    this.withMemory(dbConfig, {
      priority: 180,
    });

    return this;
  }

  /**
   * Add test-specific Redis configuration
   */
  withTestRedis(
    options: {
      type?: "memory" | "test-redis" | "mock";
      database?: number;
      flushOnStart?: boolean;
    } = {},
  ): this {
    const redisConfig = {
      redis: {
        type: options.type ?? "memory",
        url: options.type === "test-redis" ? "redis://localhost:6379" : undefined,
        db: options.database ?? 15, // Use high DB number for tests
        lazyConnect: false,
        connectTimeout: 1000, // Fast connection for tests
        commandTimeout: 500, // Fast commands in tests
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 2,
        flushOnStart: options.flushOnStart ?? true,
      },
    };

    this.withMemory(redisConfig, {
      priority: 180,
    });

    return this;
  }

  /**
   * Add test-specific server configuration
   */
  withTestServer(
    options: {
      enabled?: boolean;
      port?: number;
      host?: string;
      timeout?: number;
    } = {},
  ): this {
    this.withMemory(
      {
        server: {
          enabled: options.enabled ?? true,
          port: options.port ?? 0, // Use random available port
          host: options.host ?? "localhost",
          timeout: options.timeout ?? 5000,
          cors: {
            origin: true, // Allow all origins in tests
            credentials: true,
          },
          helmet: {
            enabled: false, // Disable security headers in tests
          },
          compression: {
            enabled: false, // No compression in tests for speed
          },
        },
      },
      {
        priority: 180,
      },
    );

    return this;
  }

  /**
   * Add test-specific logging configuration
   */
  withTestLogging(
    options: {
      level?: "silent" | "error" | "warn" | "info" | "debug";
      destination?: string;
      captureOutput?: boolean;
    } = {},
  ): this {
    this.withMemory(
      {
        logging: {
          level: options.level ?? "silent",
          pretty: true, // Pretty print for better test debugging
          redactPaths: [], // Don't redact in tests
          destination: options.destination ?? (options.captureOutput ? "capture" : "console"),
          timestamp: false, // No timestamps in test logs for cleaner output
          colorize: false, // No colors for consistent test output
          captureOutput: options.captureOutput ?? false,
          serializers: {
            err: true,
            req: false, // Don't serialize requests in tests
            res: false, // Don't serialize responses in tests
          },
        },
      },
      {
        priority: 180,
      },
    );

    return this;
  }

  /**
   * Add mock external service configurations
   */
  withMockServices(services: Record<string, { enabled?: boolean; mockData?: unknown; baseUrl?: string }> = {}): this {
    const mockConfigs: Record<string, unknown> = {};

    for (const [serviceName, config] of Object.entries(services)) {
      mockConfigs[serviceName] = {
        enabled: config.enabled ?? true,
        mock: true,
        baseUrl: config.baseUrl ?? `http://localhost:0/${serviceName}`,
        mockData: config.mockData ?? {},
        timeout: 100, // Fast mock responses
      };
    }

    this.withMemory(
      {
        services: mockConfigs,
        external: {
          mocked: true,
          services: Object.keys(services),
        },
      },
      {
        priority: 190,
      },
    );

    return this;
  }

  /**
   * Add test performance monitoring
   */
  withTestMetrics(enabled = true): this {
    if (enabled) {
      this.withMemory(
        {
          metrics: {
            enabled: true,
            testMode: true,
            collectTestMetrics: true,
            reportInterval: 0, // No automatic reporting in tests
            storage: "memory", // In-memory metrics storage
          },
        },
        {
          priority: 180,
        },
      );
    }

    return this;
  }

  /**
   * Get current test configuration summary
   */
  getTestSummary(): {
    fixture: TestFixture | null;
    isolated: boolean;
    configuration: Record<string, unknown>;
  } {
    return {
      fixture: this._testFixture,
      isolated: this._isolated,
      configuration: this.getState().sources.reduce(
        (acc, source) => ({
          ...acc,
          [source.repository.getMetadata().source]: {
            priority: source.priority,
            enabled: source.enabled,
          },
        }),
        {},
      ),
    };
  }

  /**
   * Create a standard test configuration
   */
  static createDefault(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);

    return builder
      .withFixture("unit")
      .withTestDatabase()
      .withTestRedis()
      .withTestServer({ enabled: false })
      .withTestLogging()
      .withMockServices({});
  }

  /**
   * Create a fully isolated test configuration
   */
  static createIsolated(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);

    return builder
      .withIsolation(true)
      .withFixture("minimal")
      .withTestDatabase({ type: "memory", resetBetweenTests: true })
      .withTestRedis({ type: "memory", flushOnStart: true })
      .withTestServer({ enabled: false })
      .withTestLogging({ level: "silent" })
      .withMockServices();
  }

  /**
   * Create an integration test configuration
   */
  static createIntegration(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);

    return builder
      .withFixture("integration")
      .withTestDatabase({ type: "test-db", persist: true })
      .withTestRedis({ type: "test-redis", flushOnStart: true })
      .withTestServer({ port: 0 }) // Random available port
      .withTestLogging({ level: "error" })
      .withTestMetrics(true);
  }

  /**
   * Create an E2E test configuration
   */
  static createE2E(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const builder = new TestConfigBuilder(options);

    return builder
      .withFixture("e2e")
      .withTestDatabase({ type: "test-db", persist: true })
      .withTestRedis({ type: "test-redis" })
      .withTestServer({ port: 0 })
      .withTestLogging({ level: "warn", captureOutput: true })
      .withTestMetrics(true);
  }

  /**
   * Create a performance test configuration
   */
  static createPerformance(options: IConfigBuilderOptions = {}): TestConfigBuilder {
    const performanceOptions: IConfigBuilderOptions = {
      performance: {
        useObjectPool: true, // Enable pooling for performance tests
        lazyLoading: true,
        cacheBuildResults: true,
        maxCachedBuilders: 20,
      },
      ...options,
    };

    const builder = new TestConfigBuilder(performanceOptions);

    return builder
      .withFixture("performance")
      .withTestDatabase({ type: "test-db", persist: true })
      .withTestRedis({ type: "test-redis", flushOnStart: false })
      .withTestServer({ port: 0 })
      .withTestLogging({ level: "silent" })
      .withTestMetrics(true);
  }
}
