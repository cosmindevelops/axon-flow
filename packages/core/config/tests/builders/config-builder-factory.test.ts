/**
 * Configuration Builder Factory Tests
 * @module @axon/config/builders/factory.test
 */

import { ConfigurationError } from "@axon/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCache,
  create,
  createDevelopment,
  createForEnvironment,
  createProduction,
  createTest,
  createTestE2E,
  createTestIntegration,
  createTestIsolated,
  detectEnvironment,
  getCurrentEnvironment,
  registerCustomBuilder,
  unregisterCustomBuilder,
  validateConfiguration,
  type Environment,
  type ICustomBuilderRegistration,
  type IEnvironmentDetection,
} from "../../src/builders/config-builder-factory.js";
import { ConfigBuilder } from "../../src/builders/config-builder.js";
import { DevelopmentConfigBuilder } from "../../src/builders/development-config-builder.js";
import { ProductionConfigBuilder } from "../../src/builders/production-config-builder.js";
import { TestConfigBuilder } from "../../src/builders/test-config-builder.js";
import type { ConfigPlatform } from "../../src/types/index.js";

// Mock platform detector
vi.mock("../../src/utils/platform-detector.js", () => ({
  detectPlatform: vi.fn((): ConfigPlatform => "node"),
}));

describe("ConfigBuilderFactory", () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
    clearCache();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    process.argv = originalArgv;
    clearCache();
  });

  describe("Environment Detection", () => {
    describe("detectEnvironment", () => {
      it("should detect explicit environment override with highest priority", () => {
        const result = detectEnvironment({ environment: "production" });
        expect(result.environment).toBe("production");
        expect(result.source).toBe("explicit-override");
        expect(result.confidence).toBe(1.0);
        expect(result.warnings).toHaveLength(0);
      });

      it("should detect AXON_ENV with high priority", () => {
        process.env["AXON_ENV"] = "production";
        const result = detectEnvironment();
        expect(result.environment).toBe("production");
        expect(result.source).toBe("AXON_ENV");
        expect(result.confidence).toBe(0.95);
      });

      it("should detect NODE_ENV as fallback to AXON_ENV", () => {
        process.env["NODE_ENV"] = "test";
        const result = detectEnvironment();
        expect(result.environment).toBe("test");
        expect(result.source).toBe("NODE_ENV");
        expect(result.confidence).toBe(0.9);
      });

      it("should prefer AXON_ENV over NODE_ENV", () => {
        process.env["AXON_ENV"] = "development";
        process.env["NODE_ENV"] = "production";
        const result = detectEnvironment();
        expect(result.environment).toBe("development");
        expect(result.source).toBe("AXON_ENV");
      });

      it("should detect test runner environments", () => {
        process.env["VITEST"] = "true";
        delete process.env["NODE_ENV"];
        delete process.env["AXON_ENV"];
        clearCache();
        const result = detectEnvironment();
        expect(result.environment).toBe("test");
        expect(result.source).toBe("test-runner-detection");
        expect(result.confidence).toBe(0.95);
      });

      it("should detect various test runner indicators", () => {
        const testRunnerEnvs = [
          "JEST_WORKER_ID",
          "VITEST",
          "MOCHA_FILE",
          "AVA_VERSION",
          "CYPRESS_INTERNAL_ENV",
          "PLAYWRIGHT_TEST_BASE_URL",
        ];

        testRunnerEnvs.forEach((envVar) => {
          // Clear environment for each test
          process.env = { ...originalEnv };
          delete process.env["NODE_ENV"];
          delete process.env["AXON_ENV"];
          clearCache();

          process.env[envVar] = "true";
          const result = detectEnvironment();
          expect(result.environment).toBe("test");
          expect(result.source).toBe("test-runner-detection");
        });
      });

      it("should detect test from command line arguments", () => {
        process.argv = [...originalArgv, "npm", "test"];
        delete process.env["NODE_ENV"];
        delete process.env["AXON_ENV"];
        clearCache();
        const result = detectEnvironment();
        expect(result.environment).toBe("test");
        expect(result.source).toBe("test-runner-detection");
      });

      it("should detect CI environments", () => {
        delete process.env["NODE_ENV"];
        delete process.env["AXON_ENV"];
        process.env["CI"] = "true";
        clearCache();
        const result = detectEnvironment();
        expect(result.source).toBe("ci-environment-detection");
        expect(result.confidence).toBe(0.8);
      });

      it("should detect production in CI with production indicators", () => {
        delete process.env["NODE_ENV"];
        delete process.env["AXON_ENV"];
        process.env["CI"] = "true";
        process.env["GITHUB_REF"] = "refs/heads/main";
        clearCache();
        const result = detectEnvironment();
        expect(result.environment).toBe("production");
        expect(result.source).toBe("ci-environment-detection");
      });

      it("should default to development", () => {
        delete process.env["NODE_ENV"];
        delete process.env["AXON_ENV"];
        delete process.env["CI"];
        clearCache();
        const result = detectEnvironment();
        expect(result.environment).toBe("development");
        expect(result.source).toBe("default");
        expect(result.confidence).toBe(0.5);
      });

      it("should use custom detection function", () => {
        const customDetection = vi.fn((): Environment | null => "production");
        const result = detectEnvironment({ customDetection });
        expect(customDetection).toHaveBeenCalled();
        expect(result.environment).toBe("production");
        expect(result.source).toBe("custom-detection");
        expect(result.confidence).toBe(0.9);
      });

      it("should fallback to standard detection when custom returns null", () => {
        const customDetection = vi.fn((): Environment | null => null);
        process.env["NODE_ENV"] = "test";
        const result = detectEnvironment({ customDetection });
        expect(customDetection).toHaveBeenCalled();
        expect(result.environment).toBe("test");
        expect(result.source).toBe("NODE_ENV");
      });
    });

    describe("Environment Detection Validation", () => {
      it("should enforce explicit production in strict mode", () => {
        process.env["GITHUB_REF"] = "refs/heads/main";
        process.env["CI"] = "true";

        expect(() =>
          detectEnvironment({
            validation: { requireExplicitProduction: true },
            strictMode: true,
          }),
        ).toThrow(ConfigurationError);
      });

      it("should warn about production detection without explicit configuration", () => {
        process.env["GITHUB_REF"] = "refs/heads/main";
        process.env["CI"] = "true";

        const result = detectEnvironment({
          validation: { requireExplicitProduction: true },
          strictMode: false,
        });

        expect(result.warnings).toContain(
          expect.stringContaining("Production environment detected but not explicitly specified"),
        );
      });

      it("should warn about low confidence detection", () => {
        const result = detectEnvironment({
          validation: { warnOnUnknownEnvironment: true },
        });

        expect(result.warnings).toContain(expect.stringContaining("Environment detection confidence is low"));
      });
    });

    describe("Environment Detection Caching", () => {
      it("should cache detection results", () => {
        const customDetection = vi.fn((): Environment | null => "production");

        // First call
        detectEnvironment({ customDetection });
        expect(customDetection).toHaveBeenCalledTimes(1);

        // Second call should use cache
        detectEnvironment({ customDetection });
        expect(customDetection).toHaveBeenCalledTimes(1);
      });

      it("should invalidate cache when environment changes", () => {
        // First call
        const result1 = detectEnvironment();
        expect(result1.environment).toBe("development");

        // Change environment
        process.env["NODE_ENV"] = "test";
        clearCache();

        // Second call should detect new environment
        const result2 = detectEnvironment();
        expect(result2.environment).toBe("test");
      });

      it("should generate different cache keys for different options", () => {
        const customDetection1 = vi.fn((): Environment | null => "production");
        const customDetection2 = vi.fn((): Environment | null => "test");

        detectEnvironment({ customDetection: customDetection1 });
        detectEnvironment({ customDetection: customDetection2 });

        expect(customDetection1).toHaveBeenCalledTimes(1);
        expect(customDetection2).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Builder Creation", () => {
    describe("create", () => {
      it("should create development builder by default", () => {
        const builder = create();
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      });

      it("should create production builder for production environment", () => {
        process.env["NODE_ENV"] = "production";
        clearCache();
        const builder = create();
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });

      it("should create test builder for test environment", () => {
        process.env["NODE_ENV"] = "test";
        clearCache();
        const builder = create();
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });

      it("should create builder with explicit environment override", () => {
        const builder = create({ environment: "production" });
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });

      it("should pass options to builder", () => {
        const options = {
          hotReload: true,
          validation: { enabled: true },
        };
        const builder = create(options);
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      });

      it("should throw for unsupported environment", () => {
        expect(() => create({ environment: "invalid" as Environment })).toThrow(ConfigurationError);
      });
    });

    describe("Environment-Specific Creators", () => {
      it("should create development builder", () => {
        const builder = createDevelopment();
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      });

      it("should create production builder", () => {
        const builder = createProduction();
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });

      it("should create test builder", () => {
        const builder = createTest();
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });

      it("should create test builder with fixture", () => {
        const builder = createTest("unit");
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });

      it("should create isolated test builder", () => {
        const builder = createTestIsolated();
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });

      it("should create integration test builder", () => {
        const builder = createTestIntegration();
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });

      it("should create E2E test builder", () => {
        const builder = createTestE2E();
        expect(builder).toBeInstanceOf(TestConfigBuilder);
      });
    });

    describe("createForEnvironment", () => {
      it("should create builder for specified environment", () => {
        const devBuilder = createForEnvironment("development");
        expect(devBuilder).toBeInstanceOf(DevelopmentConfigBuilder);

        const prodBuilder = createForEnvironment("production");
        expect(prodBuilder).toBeInstanceOf(ProductionConfigBuilder);

        const testBuilder = createForEnvironment("test");
        expect(testBuilder).toBeInstanceOf(TestConfigBuilder);
      });

      it("should override automatic detection", () => {
        process.env["NODE_ENV"] = "production";
        clearCache();

        const builder = createForEnvironment("development");
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      });
    });
  });

  describe("Custom Builder Registration", () => {
    class CustomTestBuilder extends ConfigBuilder {
      constructor(options = {}) {
        super(options);
      }
    }

    const mockRegistration: ICustomBuilderRegistration<CustomTestBuilder> = {
      name: "custom-test",
      environment: "test",
      factory: (options) => new CustomTestBuilder(options),
      priority: 100,
    };

    afterEach(() => {
      // Clean up custom builders
      unregisterCustomBuilder("custom-test", "test");
    });

    it("should register custom builder", () => {
      expect(() => registerCustomBuilder(mockRegistration)).not.toThrow();
    });

    it("should use custom builder when creating", () => {
      registerCustomBuilder(mockRegistration);

      const builder = createForEnvironment("test");
      expect(builder).toBeInstanceOf(CustomTestBuilder);
    });

    it("should prioritize higher priority custom builders", () => {
      const highPriorityRegistration: ICustomBuilderRegistration = {
        name: "high-priority",
        environment: "test",
        factory: (options) => new CustomTestBuilder(options),
        priority: 200,
      };

      const lowPriorityRegistration: ICustomBuilderRegistration = {
        name: "low-priority",
        environment: "test",
        factory: (options) => new TestConfigBuilder(options),
        priority: 50,
      };

      registerCustomBuilder(lowPriorityRegistration);
      registerCustomBuilder(highPriorityRegistration);

      const builder = createForEnvironment("test");
      expect(builder).toBeInstanceOf(CustomTestBuilder);
    });

    it("should unregister custom builder", () => {
      registerCustomBuilder(mockRegistration);
      unregisterCustomBuilder("custom-test", "test");

      const builder = createForEnvironment("test");
      expect(builder).toBeInstanceOf(TestConfigBuilder);
    });

    it("should fallback to standard builder when no custom builder matches", () => {
      const builder = createForEnvironment("development");
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });
  });

  describe("Cache Management", () => {
    it("should clear detection cache", () => {
      const customDetection = vi.fn((): Environment | null => "production");

      // Populate cache
      detectEnvironment({ customDetection });
      expect(customDetection).toHaveBeenCalledTimes(1);

      // Clear cache
      clearCache();

      // Should call detection function again
      detectEnvironment({ customDetection });
      expect(customDetection).toHaveBeenCalledTimes(2);
    });

    it("should provide current environment detection", () => {
      process.env["NODE_ENV"] = "test";
      clearCache();

      const current = getCurrentEnvironment();
      expect(current.environment).toBe("test");
      expect(current.source).toBe("NODE_ENV");
    });
  });

  describe("Configuration Validation", () => {
    it("should validate valid configuration", () => {
      const result = validateConfiguration({ environment: "development" });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect low confidence warnings", () => {
      const result = validateConfiguration();
      expect(result.warnings).toContain(expect.stringContaining("Very low confidence"));
    });

    it("should detect production default error", () => {
      // This is a theoretical test since production should never be default
      // but we test the validation logic
      const mockDetectEnvironment = vi.fn(
        (): IEnvironmentDetection => ({
          environment: "production",
          source: "default",
          confidence: 0.5,
          platform: "node",
          warnings: [],
        }),
      );

      // Temporarily replace the detection function for this test
      const originalDetect = detectEnvironment;
      (global as any).detectEnvironment = mockDetectEnvironment;

      try {
        const result = validateConfiguration();
        expect(result.errors).toContain(
          expect.stringContaining("Production environment should never be detected by default"),
        );
      } finally {
        // Restore original
        (global as any).detectEnvironment = originalDetect;
      }
    });

    it("should handle validation errors gracefully", () => {
      const strictOptions = {
        validation: { requireExplicitProduction: true },
        strictMode: true,
      };

      // Set up CI environment that would trigger production
      process.env["CI"] = "true";
      process.env["GITHUB_REF"] = "refs/heads/main";
      clearCache();

      const result = validateConfiguration(strictOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Platform Integration", () => {
    it("should include platform information in detection", () => {
      const result = detectEnvironment();
      expect(result.platform).toBe("node");
    });

    it("should allow platform override", () => {
      const result = detectEnvironment({ platform: "browser" });
      expect(result.platform).toBe("browser");
    });
  });

  describe("Error Handling", () => {
    it("should provide detailed error context for unsupported environments", () => {
      try {
        create({ environment: "invalid" as Environment });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.context.component).toBe("ConfigBuilderFactory");
        expect(configError.context.operation).toBe("create");
        expect(configError.context.metadata).toHaveProperty("environment", "invalid");
      }
    });

    it("should handle invalid environment strings gracefully", () => {
      process.env["NODE_ENV"] = "INVALID";
      clearCache();

      const result = detectEnvironment();
      expect(result.environment).toBe("development"); // Should fallback
      expect(result.source).toBe("default");
    });
  });

  describe("CI Environment Detection", () => {
    const ciEnvVars = [
      "CI",
      "CONTINUOUS_INTEGRATION",
      "GITHUB_ACTIONS",
      "GITLAB_CI",
      "JENKINS_URL",
      "BUILDKITE",
      "CIRCLECI",
      "TRAVIS",
      "DRONE",
    ];

    ciEnvVars.forEach((envVar) => {
      it(`should detect ${envVar} as CI environment`, () => {
        process.env[envVar] = "true";
        clearCache();

        const result = detectEnvironment();
        expect(result.source).toBe("ci-environment-detection");
      });
    });

    it("should detect GitHub Actions production deployment", () => {
      process.env["CI"] = "true";
      process.env["GITHUB_ACTIONS"] = "true";
      process.env["GITHUB_REF"] = "refs/heads/main";
      clearCache();

      const result = detectEnvironment();
      expect(result.environment).toBe("production");
    });

    it("should detect GitLab CI production deployment", () => {
      process.env["CI"] = "true";
      process.env["GITLAB_CI"] = "true";
      process.env["GITLAB_CI_COMMIT_REF_NAME"] = "main";
      clearCache();

      const result = detectEnvironment();
      expect(result.environment).toBe("production");
    });
  });

  describe("Performance Characteristics", () => {
    it("should cache environment detection for performance", () => {
      const start = performance.now();
      detectEnvironment();
      const firstCall = performance.now() - start;

      const start2 = performance.now();
      detectEnvironment(); // Should use cache
      const secondCall = performance.now() - start2;

      // Second call should be significantly faster (cached)
      expect(secondCall).toBeLessThan(firstCall);
    });

    it("should handle rapid successive calls efficiently", () => {
      const calls = Array.from({ length: 100 }, () => () => detectEnvironment());

      const start = performance.now();
      calls.forEach((call) => call());
      const duration = performance.now() - start;

      // Should complete all calls quickly due to caching
      expect(duration).toBeLessThan(50); // 50ms for 100 calls
    });
  });
});
