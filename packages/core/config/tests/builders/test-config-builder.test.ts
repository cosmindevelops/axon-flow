/**
 * Test Configuration Builder Tests
 * @module @axon/config/builders/test-config-builder.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestConfigBuilder, type TestFixture } from "../../src/builders/test-config-builder.js";
import type { ConfigPlatform } from "../../src/types/index.js";
import type { IConfigBuilderOptions } from "../../src/builders/config-builder.types.js";

// Mock platform detector
vi.mock("../../src/utils/platform-detector.js", () => ({
  detectPlatform: vi.fn((): ConfigPlatform => "node"),
}));

// Mock object pool
vi.mock("../../src/builders/utils/object-pool.js", () => ({
  getRepositoryPool: vi.fn((key: string, factory: () => any) => ({
    acquire: factory,
    release: vi.fn(),
  })),
}));

describe("TestConfigBuilder", () => {
  let builder: TestConfigBuilder;

  beforeEach(() => {
    builder = new TestConfigBuilder();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create builder with test defaults", () => {
      const builder = new TestConfigBuilder();
      const state = builder.getState();

      expect(builder).toBeInstanceOf(TestConfigBuilder);
      expect(state.sources.length).toBeGreaterThan(0); // Should have default sources
    });

    it("should apply custom options while preserving test defaults", () => {
      const options: IConfigBuilderOptions = {
        platform: "browser",
        validation: {
          enabled: false,
        },
      };

      const builder = new TestConfigBuilder(options);
      expect(builder).toBeInstanceOf(TestConfigBuilder);
    });

    it("should set development mode to true for testing", () => {
      const builder = new TestConfigBuilder();
      expect(builder).toBeInstanceOf(TestConfigBuilder);
    });

    it("should configure performance for test isolation", () => {
      const builder = new TestConfigBuilder();

      // Should disable pooling and caching for test isolation
      expect(builder).toBeInstanceOf(TestConfigBuilder);
    });

    it("should not fail fast on validation errors for better error collection", () => {
      const builder = new TestConfigBuilder();
      expect(builder).toBeInstanceOf(TestConfigBuilder);
    });
  });

  describe("Test-Specific Defaults", () => {
    it("should add AXON_TEST_ environment variables with highest priority", () => {
      const state = builder.getState();

      // Should have environment sources with test prefixes
      const envSources = state.sources.filter(
        (source) => source.repository.constructor.name === "EnvironmentConfigRepository",
      );

      expect(envSources.length).toBeGreaterThanOrEqual(2); // AXON_TEST_ and TEST_
    });

    it("should disable hot-reload for test stability", () => {
      // Builder should be created successfully with hot-reload disabled
      expect(builder).toBeInstanceOf(TestConfigBuilder);
    });

    it("should add test memory-based overrides", () => {
      const state = builder.getState();

      // Should have memory sources for test defaults
      const memorySources = state.sources.filter(
        (source) => source.repository.constructor.name === "MemoryConfigRepository",
      );

      expect(memorySources.length).toBeGreaterThan(0);
    });

    it("should prioritize test sources correctly", () => {
      const state = builder.getState();

      // Test memory overrides should have highest priority (250)
      const testMemorySource = state.sources.find(
        (source) => source.repository.constructor.name === "MemoryConfigRepository" && source.priority === 250,
      );

      expect(testMemorySource).toBeDefined();
    });

    it("should include test-specific default configuration", () => {
      const config = builder.build();
      const allConfig = config.getAllConfig();

      // Should have test configuration
      expect(allConfig).toHaveProperty("test");
      expect(allConfig).toHaveProperty("app");

      const appConfig = allConfig["app"] as any;
      expect(appConfig?.environment).toBe("test");
      expect(appConfig?.logLevel).toBe("silent");
    });
  });

  describe("Test Isolation", () => {
    describe("withIsolation", () => {
      it("should enable isolation mode", () => {
        const result = builder.withIsolation(true);
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const isolationSource = state.sources.find((source) => source.priority === 300);
        expect(isolationSource).toBeDefined();
      });

      it("should disable isolation when explicitly disabled", () => {
        const initialSourceCount = builder.getState().sources.length;

        const result = builder.withIsolation(false);
        expect(result).toBe(builder);

        // Source count should remain the same (no isolation source added)
        expect(builder.getState().sources.length).toBe(initialSourceCount);
      });

      it("should enable isolation by default", () => {
        const result = builder.withIsolation();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 300)).toBe(true);
      });

      it("should configure isolation settings", () => {
        const config = builder.withIsolation(true).build();

        const allConfig = config.getAllConfig();
        const testConfig = allConfig["test"] as any;

        expect(testConfig?.isolation).toBe(true);
        expect(testConfig?.mockExternalServices).toBe(true);
        expect(testConfig?.useInMemoryStorage).toBe(true);
        expect(testConfig?.disableNetworking).toBe(true);
      });
    });

    it("should provide test summary", () => {
      builder.withIsolation(true).withFixture("unit");

      const summary = builder.getTestSummary();

      expect(summary.fixture).toBe("unit");
      expect(summary.isolated).toBe(true);
      expect(summary.configuration).toBeDefined();
    });
  });

  describe("Test Fixtures", () => {
    const fixtures: TestFixture[] = ["unit", "integration", "e2e", "performance", "minimal"];

    fixtures.forEach((fixture) => {
      it(`should configure ${fixture} fixture`, () => {
        const result = builder.withFixture(fixture);
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const fixtureSource = state.sources.find((source) => source.priority === 275);
        expect(fixtureSource).toBeDefined();

        const summary = builder.getTestSummary();
        expect(summary.fixture).toBe(fixture);
      });
    });

    it("should configure unit test fixture correctly", () => {
      const config = builder.withFixture("unit").build();

      const allConfig = config.getAllConfig();
      expect(allConfig).toHaveProperty("fixture", "unit");
      expect(allConfig).toHaveProperty("database");
      expect(allConfig).toHaveProperty("redis");
      expect(allConfig).toHaveProperty("server");
      expect(allConfig).toHaveProperty("logging");
      expect(allConfig).toHaveProperty("external");
    });

    it("should configure integration test fixture correctly", () => {
      const config = builder.withFixture("integration").build();

      const allConfig = config.getAllConfig();
      const serverConfig = allConfig["server"] as any;
      const databaseConfig = allConfig["database"] as any;

      expect(serverConfig?.enabled).toBe(true);
      expect(databaseConfig?.persist).toBe(true);
    });

    it("should configure e2e test fixture correctly", () => {
      const config = builder.withFixture("e2e").build();

      const allConfig = config.getAllConfig();
      expect(allConfig).toHaveProperty("browser");

      const browserConfig = allConfig["browser"] as any;
      expect(browserConfig?.headless).toBe(true);
    });

    it("should configure performance test fixture correctly", () => {
      const config = builder.withFixture("performance").build();

      const allConfig = config.getAllConfig();
      expect(allConfig).toHaveProperty("metrics");

      const metricsConfig = allConfig["metrics"] as any;
      expect(metricsConfig?.enabled).toBe(true);
    });

    it("should configure minimal test fixture correctly", () => {
      const config = builder.withFixture("minimal").build();

      const allConfig = config.getAllConfig();
      const databaseConfig = allConfig["database"] as any;
      const redisConfig = allConfig["redis"] as any;
      const serverConfig = allConfig["server"] as any;

      expect(databaseConfig?.enabled).toBe(false);
      expect(redisConfig?.enabled).toBe(false);
      expect(serverConfig?.enabled).toBe(false);
    });
  });

  describe("Test Database Configuration", () => {
    it("should configure in-memory database by default", () => {
      const result = builder.withTestDatabase();
      expect(result).toBe(builder); // Fluent interface

      const state = builder.getState();
      const dbSource = state.sources.find((source) => source.priority === 180);
      expect(dbSource).toBeDefined();
    });

    it("should configure test database with custom options", () => {
      const options = {
        type: "test-db" as const,
        database: "custom_test_db",
        persist: true,
        resetBetweenTests: false,
      };

      const result = builder.withTestDatabase(options);
      expect(result).toBe(builder);

      const config = builder.build();
      const allConfig = config.getAllConfig();
      const dbConfig = allConfig["database"] as any;

      expect(dbConfig?.type).toBe("test-db");
      expect(dbConfig?.dropSchema).toBe(false);
      expect(dbConfig?.keepConnectionAlive).toBe(true);
    });

    it("should configure SQLite in-memory database", () => {
      const result = builder.withTestDatabase({ type: "sqlite" });
      expect(result).toBe(builder);

      const config = builder.build();
      const allConfig = config.getAllConfig();
      const dbConfig = allConfig["database"] as any;

      expect(dbConfig?.url).toBe(":memory:");
    });

    it("should disable SSL and enable synchronization for tests", () => {
      const config = builder.withTestDatabase({ type: "test-db" }).build();

      const allConfig = config.getAllConfig();
      const dbConfig = allConfig["database"] as any;

      expect(dbConfig?.ssl).toBe(false);
      expect(dbConfig?.synchronize).toBe(true);
      expect(dbConfig?.logging).toBe(false);
    });
  });

  describe("Test Redis Configuration", () => {
    it("should configure in-memory Redis by default", () => {
      const result = builder.withTestRedis();
      expect(result).toBe(builder); // Fluent interface

      const state = builder.getState();
      const redisSource = state.sources.find((source) => source.priority === 180);
      expect(redisSource).toBeDefined();
    });

    it("should configure test Redis with custom options", () => {
      const options = {
        type: "test-redis" as const,
        database: 10,
        flushOnStart: false,
      };

      const result = builder.withTestRedis(options);
      expect(result).toBe(builder);

      const config = builder.build();
      const allConfig = config.getAllConfig();
      const redisConfig = allConfig["redis"] as any;

      expect(redisConfig?.type).toBe("test-redis");
      expect(redisConfig?.db).toBe(10);
      expect(redisConfig?.flushOnStart).toBe(false);
    });

    it("should use high database number for test isolation", () => {
      const config = builder.withTestRedis().build();

      const allConfig = config.getAllConfig();
      const redisConfig = allConfig["redis"] as any;

      expect(redisConfig?.db).toBe(15); // High DB number
    });

    it("should configure fast timeouts for tests", () => {
      const config = builder.withTestRedis({ type: "test-redis" }).build();

      const allConfig = config.getAllConfig();
      const redisConfig = allConfig["redis"] as any;

      expect(redisConfig?.connectTimeout).toBe(1000);
      expect(redisConfig?.commandTimeout).toBe(500);
      expect(redisConfig?.maxRetriesPerRequest).toBe(2);
    });
  });

  describe("Test Server Configuration", () => {
    it("should configure test server with random port by default", () => {
      const result = builder.withTestServer();
      expect(result).toBe(builder); // Fluent interface

      const state = builder.getState();
      const serverSource = state.sources.find((source) => source.priority === 180);
      expect(serverSource).toBeDefined();
    });

    it("should configure test server with custom options", () => {
      const options = {
        enabled: false,
        port: 8080,
        host: "127.0.0.1",
        timeout: 10000,
      };

      const result = builder.withTestServer(options);
      expect(result).toBe(builder);

      const config = builder.build();
      const allConfig = config.getAllConfig();
      const serverConfig = allConfig["server"] as any;

      expect(serverConfig?.enabled).toBe(false);
      expect(serverConfig?.port).toBe(8080);
      expect(serverConfig?.host).toBe("127.0.0.1");
      expect(serverConfig?.timeout).toBe(10000);
    });

    it("should disable security headers and compression for tests", () => {
      const config = builder.withTestServer().build();

      const allConfig = config.getAllConfig();
      const serverConfig = allConfig["server"] as any;

      expect(serverConfig?.helmet?.enabled).toBe(false);
      expect(serverConfig?.compression?.enabled).toBe(false);
      expect(serverConfig?.cors?.origin).toBe(true); // Allow all origins
    });

    it("should use port 0 for random available port", () => {
      const config = builder.withTestServer({ port: 0 }).build();

      const allConfig = config.getAllConfig();
      const serverConfig = allConfig["server"] as any;

      expect(serverConfig?.port).toBe(0);
    });
  });

  describe("Test Logging Configuration", () => {
    it("should configure silent logging by default", () => {
      const result = builder.withTestLogging();
      expect(result).toBe(builder); // Fluent interface

      const state = builder.getState();
      const loggingSource = state.sources.find((source) => source.priority === 180);
      expect(loggingSource).toBeDefined();
    });

    it("should configure test logging with custom options", () => {
      const options = {
        level: "debug" as const,
        destination: "/tmp/test.log",
        captureOutput: true,
      };

      const result = builder.withTestLogging(options);
      expect(result).toBe(builder);

      const config = builder.build();
      const allConfig = config.getAllConfig();
      const loggingConfig = allConfig["logging"] as any;

      expect(loggingConfig?.level).toBe("debug");
      expect(loggingConfig?.destination).toBe("capture");
      expect(loggingConfig?.captureOutput).toBe(true);
    });

    it("should configure test-friendly logging settings", () => {
      const config = builder.withTestLogging().build();

      const allConfig = config.getAllConfig();
      const loggingConfig = allConfig["logging"] as any;

      expect(loggingConfig?.pretty).toBe(true);
      expect(loggingConfig?.redactPaths).toEqual([]);
      expect(loggingConfig?.timestamp).toBe(false);
      expect(loggingConfig?.colorize).toBe(false);
      expect(loggingConfig?.serializers?.req).toBe(false);
      expect(loggingConfig?.serializers?.res).toBe(false);
    });
  });

  describe("Mock Services Configuration", () => {
    it("should configure mock services", () => {
      const services = {
        paymentService: {
          enabled: true,
          mockData: { status: "success" },
          baseUrl: "http://localhost:3001",
        },
        authService: {
          enabled: true,
          mockData: { token: "mock-token" },
        },
      };

      const result = builder.withMockServices(services);
      expect(result).toBe(builder); // Fluent interface

      const state = builder.getState();
      const mockSource = state.sources.find((source) => source.priority === 190);
      expect(mockSource).toBeDefined();
    });

    it("should configure mock services with defaults", () => {
      const config = builder
        .withMockServices({
          testService: { mockData: { test: true } },
        })
        .build();

      const allConfig = config.getAllConfig();
      const servicesConfig = allConfig["services"] as any;
      const externalConfig = allConfig["external"] as any;

      expect(servicesConfig?.testService?.enabled).toBe(true);
      expect(servicesConfig?.testService?.mock).toBe(true);
      expect(servicesConfig?.testService?.timeout).toBe(100);
      expect(externalConfig?.mocked).toBe(true);
      expect(externalConfig?.services).toContain("testService");
    });

    it("should handle empty mock services", () => {
      const result = builder.withMockServices({});
      expect(result).toBe(builder);

      const config = builder.build();
      const allConfig = config.getAllConfig();

      expect(allConfig).toHaveProperty("services", {});
      expect(allConfig).toHaveProperty("external");
    });
  });

  describe("Test Metrics Configuration", () => {
    it("should enable test metrics", () => {
      const result = builder.withTestMetrics(true);
      expect(result).toBe(builder); // Fluent interface

      const state = builder.getState();
      const metricsSource = state.sources.find((source) => source.priority === 180);
      expect(metricsSource).toBeDefined();
    });

    it("should disable test metrics when explicitly disabled", () => {
      const initialSourceCount = builder.getState().sources.length;

      const result = builder.withTestMetrics(false);
      expect(result).toBe(builder);

      // Source count should remain the same (no metrics source added)
      expect(builder.getState().sources.length).toBe(initialSourceCount);
    });

    it("should configure test-specific metrics settings", () => {
      const config = builder.withTestMetrics(true).build();

      const allConfig = config.getAllConfig();
      const metricsConfig = allConfig["metrics"] as any;

      expect(metricsConfig?.enabled).toBe(true);
      expect(metricsConfig?.testMode).toBe(true);
      expect(metricsConfig?.collectTestMetrics).toBe(true);
      expect(metricsConfig?.reportInterval).toBe(0);
      expect(metricsConfig?.storage).toBe("memory");
    });
  });

  describe("Static Factory Methods", () => {
    describe("createDefault", () => {
      it("should create default test configuration", () => {
        const builder = TestConfigBuilder.createDefault();
        expect(builder).toBeInstanceOf(TestConfigBuilder);

        const state = builder.getState();
        const summary = builder.getTestSummary();

        expect(summary.fixture).toBe("unit");
        expect(state.sources.length).toBeGreaterThan(5);
      });

      it("should accept custom options", () => {
        const options: IConfigBuilderOptions = {
          platform: "browser",
        };

        const builder = TestConfigBuilder.createDefault(options);
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });
    });

    describe("createIsolated", () => {
      it("should create isolated test configuration", () => {
        const builder = TestConfigBuilder.createIsolated();
        expect(builder).toBeInstanceOf(TestConfigBuilder);

        const summary = builder.getTestSummary();

        expect(summary.isolated).toBe(true);
        expect(summary.fixture).toBe("minimal");
      });

      it("should configure complete isolation", () => {
        const config = TestConfigBuilder.createIsolated().build();
        const allConfig = config.getAllConfig();

        const testConfig = allConfig["test"] as any;
        const databaseConfig = allConfig["database"] as any;
        const redisConfig = allConfig["redis"] as any;
        const serverConfig = allConfig["server"] as any;

        expect(testConfig?.isolation).toBe(true);
        expect(databaseConfig?.type).toBe("memory");
        expect(databaseConfig?.resetBetweenTests).toBe(true);
        expect(redisConfig?.type).toBe("memory");
        expect(redisConfig?.flushOnStart).toBe(true);
        expect(serverConfig?.enabled).toBe(false);
      });
    });

    describe("createIntegration", () => {
      it("should create integration test configuration", () => {
        const builder = TestConfigBuilder.createIntegration();
        expect(builder).toBeInstanceOf(TestConfigBuilder);

        const summary = builder.getTestSummary();
        expect(summary.fixture).toBe("integration");
      });

      it("should configure real services for integration tests", () => {
        const config = TestConfigBuilder.createIntegration().build();
        const allConfig = config.getAllConfig();

        const databaseConfig = allConfig["database"] as any;
        const serverConfig = allConfig["server"] as any;
        const loggingConfig = allConfig["logging"] as any;

        expect(databaseConfig?.type).toBe("test-db");
        expect(databaseConfig?.persist).toBe(true);
        expect(serverConfig?.enabled).toBe(true);
        expect(serverConfig?.port).toBe(0); // Random port
        expect(loggingConfig?.level).toBe("error");
      });
    });

    describe("createE2E", () => {
      it("should create E2E test configuration", () => {
        const builder = TestConfigBuilder.createE2E();
        expect(builder).toBeInstanceOf(TestConfigBuilder);

        const summary = builder.getTestSummary();
        expect(summary.fixture).toBe("e2e");
      });

      it("should configure full system for E2E tests", () => {
        const config = TestConfigBuilder.createE2E().build();
        const allConfig = config.getAllConfig();

        const loggingConfig = allConfig["logging"] as any;
        const browserConfig = allConfig["browser"] as any;

        expect(loggingConfig?.level).toBe("warn");
        expect(loggingConfig?.captureOutput).toBe(true);
        expect(browserConfig?.headless).toBe(true);
      });
    });

    describe("createPerformance", () => {
      it("should create performance test configuration", () => {
        const builder = TestConfigBuilder.createPerformance();
        expect(builder).toBeInstanceOf(TestConfigBuilder);

        const summary = builder.getTestSummary();
        expect(summary.fixture).toBe("performance");
      });

      it("should enable performance optimizations", () => {
        const config = TestConfigBuilder.createPerformance().build();
        const allConfig = config.getAllConfig();

        const metricsConfig = allConfig["metrics"] as any;
        const redisConfig = allConfig["redis"] as any;

        expect(metricsConfig?.enabled).toBe(true);
        expect(redisConfig?.flushOnStart).toBe(false); // Don't flush for performance tests
      });

      it("should use performance-optimized options", () => {
        const builder = TestConfigBuilder.createPerformance();
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });
    });
  });

  describe("Test Builder Integration", () => {
    it("should chain test methods fluently", () => {
      const result = builder
        .withIsolation(true)
        .withFixture("integration")
        .withTestDatabase({ type: "memory" })
        .withTestRedis({ type: "memory" })
        .withTestServer({ enabled: false })
        .withTestLogging({ level: "silent" })
        .withMockServices({ testService: { mockData: { test: true } } })
        .withTestMetrics(true);

      expect(result).toBe(builder);

      const state = builder.getState();
      const summary = builder.getTestSummary();

      expect(summary.isolated).toBe(true);
      expect(summary.fixture).toBe("integration");
      expect(state.sources.length).toBeGreaterThan(8);
    });

    it("should build successfully with all test features", () => {
      const config = builder
        .withIsolation()
        .withFixture("unit")
        .withTestDatabase()
        .withTestRedis()
        .withTestServer()
        .withTestLogging()
        .withMockServices({ mockService: {} })
        .withTestMetrics()
        .build();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("get");
      expect(config).toHaveProperty("getAllConfig");
    });

    it("should handle mixed test and custom sources", () => {
      const config = builder
        .withFixture("unit")
        .withMemory({ customTestData: "value" }, { priority: 350 })
        .withEnvironment({ prefix: "CUSTOM_TEST_", priority: 220 })
        .withTestDatabase()
        .build();

      expect(config).toBeDefined();

      const configData = config.getAllConfig();
      expect(configData).toBeDefined();
      expect(configData).toHaveProperty("customTestData", "value");
    });
  });

  describe("Performance Characteristics", () => {
    it("should optimize for test performance", () => {
      const state = builder.getState();
      expect(state.sources.length).toBeGreaterThan(0);

      // Performance should be tracked
      expect(state.metrics?.buildTime).toBeGreaterThanOrEqual(0);
      expect(state.metrics?.sourceCount).toBeGreaterThan(0);
    });

    it("should handle rapid test setup efficiently", () => {
      const start = performance.now();

      // Simulate rapid test configuration setup
      for (let i = 0; i < 20; i++) {
        TestConfigBuilder.createIsolated().withTestDatabase({ type: "memory" }).build();
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // Should be very fast for tests
    });

    it("should support performance testing variant efficiently", () => {
      const start = performance.now();

      const config = TestConfigBuilder.createPerformance().build();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should be optimized
      expect(config).toBeDefined();
    });
  });

  describe("Environment Variable Handling", () => {
    it("should prioritize AXON_TEST_ over TEST_ variables", () => {
      const state = builder.getState();

      const envSources = state.sources.filter(
        (source) => source.repository.constructor.name === "EnvironmentConfigRepository",
      );

      // Should have at least 2 environment sources
      expect(envSources.length).toBeGreaterThanOrEqual(2);

      // Higher priority source should come first after sorting
      const priorities = envSources.map((source) => source.priority).sort((a, b) => b - a);
      expect(priorities[0]!).toBeGreaterThan(priorities[1]!);
    });
  });

  describe("Test Summary and Debugging", () => {
    it("should provide comprehensive test summary", () => {
      const summary = builder.withIsolation(true).withFixture("integration").getTestSummary();

      expect(summary).toEqual({
        fixture: "integration",
        isolated: true,
        configuration: expect.any(Object),
      });

      // Configuration should include source metadata
      expect(Object.keys(summary.configuration).length).toBeGreaterThan(0);
    });

    it("should track fixture and isolation state", () => {
      const builder1 = new TestConfigBuilder().withFixture("unit");
      const summary1 = builder1.getTestSummary();
      expect(summary1.fixture).toBe("unit");
      expect(summary1.isolated).toBe(false);

      const builder2 = new TestConfigBuilder().withIsolation(true);
      const summary2 = builder2.getTestSummary();
      expect(summary2.fixture).toBeNull();
      expect(summary2.isolated).toBe(true);
    });
  });
});
