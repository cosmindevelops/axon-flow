/**
 * Configuration Factory Classes Tests
 * Tests for configuration factory implementations and builder patterns
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as fs from "fs";
import {
  ConfigBuilderFactory,
  defaultConfigBuilderFactory,
  createConfigBuilder,
  createConfigBuilderForEnvironment,
  createDevelopment,
  createProduction,
  createTest,
  detectEnvironment,
} from "../../../../src/builders/factory/factory.classes.js";

// Mock fs to prevent file system dependencies in tests
vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true), // Mock all files as existing
    readFileSync: vi.fn(() => "# Mock env file content\nTEST_VAR=test_value"),
    statSync: vi.fn(() => ({ isFile: () => true, size: 100, mtime: new Date() })),
  };
});

describe("Configuration Factory Classes", () => {
  let factory: ConfigBuilderFactory;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    factory = new ConfigBuilderFactory();
    originalNodeEnv = process.env["NODE_ENV"];
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env["NODE_ENV"] = originalNodeEnv;
    } else {
      delete process.env["NODE_ENV"];
    }
  });

  describe("ConfigBuilderFactory", () => {
    it("should create factory instance with default options", () => {
      expect(factory).toBeInstanceOf(ConfigBuilderFactory);
      expect(factory).toBeDefined();
    });

    it("should create factory with custom options", () => {
      const customFactory = new ConfigBuilderFactory({
        environment: "production",
        strictMode: true,
        validation: {
          requireExplicitProduction: true,
        },
      });
      expect(customFactory).toBeInstanceOf(ConfigBuilderFactory);
    });

    it("should create configuration builder", () => {
      const builder = factory.create();
      expect(builder).toBeDefined();
    });

    it("should create environment-specific builder", () => {
      const devBuilder = factory.createForEnvironment("development");
      const prodBuilder = factory.createForEnvironment("production");
      const testBuilder = factory.createForEnvironment("test");

      expect(devBuilder).toBeDefined();
      expect(prodBuilder).toBeDefined();
      expect(testBuilder).toBeDefined();
    });

    it("should return supported environments", () => {
      const environments = factory.getSupportedEnvironments();
      expect(environments).toContain("development");
      expect(environments).toContain("production");
      expect(environments).toContain("test");
      expect(environments.length).toBeGreaterThanOrEqual(3);
    });

    it("should validate environments", () => {
      expect(factory.validateEnvironment("development")).toBe(true);
      expect(factory.validateEnvironment("production")).toBe(true);
      expect(factory.validateEnvironment("test")).toBe(true);
      expect(factory.validateEnvironment("invalid" as any)).toBe(false);
    });
  });

  describe("Environment Detection", () => {
    it("should detect development environment from NODE_ENV", () => {
      process.env["NODE_ENV"] = "development";
      const detection = factory.detectEnvironment();
      expect(detection.environment).toBe("development");
      expect(detection.source).toBe("environment");
    });

    it("should detect production environment from NODE_ENV", () => {
      process.env["NODE_ENV"] = "production";
      const detection = factory.detectEnvironment();
      expect(detection.environment).toBe("production");
      expect(detection.source).toBe("environment");
    });

    it("should detect test environment from NODE_ENV", () => {
      process.env["NODE_ENV"] = "test";
      const detection = factory.detectEnvironment();
      expect(detection.environment).toBe("test");
      expect(detection.source).toBe("environment");
    });

    it("should handle environment aliases", () => {
      const aliases = [
        { env: "dev", expected: "development" },
        { env: "prod", expected: "production" },
        { env: "testing", expected: "test" },
      ];

      aliases.forEach(({ env, expected }) => {
        process.env["NODE_ENV"] = env;
        const detection = factory.detectEnvironment();
        expect(detection.environment).toBe(expected);
      });
    });

    it("should use APP_ENV when NODE_ENV not available", () => {
      delete process.env["NODE_ENV"];
      process.env["APP_ENV"] = "development"; // Use valid environment instead of staging
      const detection = factory.detectEnvironment();
      expect(detection.source).toBe("environment");
      expect(detection.environment).toBe("development");
    });

    it("should fall back to development when no environment detected", () => {
      delete process.env["NODE_ENV"];
      delete process.env["APP_ENV"];
      delete process.env["ENVIRONMENT"];
      delete process.env["ENV"];

      const detection = factory.detectEnvironment();
      expect(detection.environment).toBe("development");
      expect(detection.source).toBe("default");
      expect(detection.confidence).toBe(0.1);
    });

    it("should throw error in strict mode when environment not detected", () => {
      const strictFactory = new ConfigBuilderFactory({ strictMode: true });
      delete process.env["NODE_ENV"];
      delete process.env["APP_ENV"];

      expect(() => strictFactory.detectEnvironment()).toThrow("Unable to detect environment in strict mode");
    });

    it("should use custom detection when provided", () => {
      const customFactory = new ConfigBuilderFactory({
        customDetection: () => "production",
      });

      const detection = customFactory.detectEnvironment();
      expect(detection.environment).toBe("production");
      expect(detection.source).toBe("custom");
    });

    it("should prefer explicit environment over detection", () => {
      process.env["NODE_ENV"] = "development";
      const explicitFactory = new ConfigBuilderFactory({
        environment: "production",
      });

      const detection = explicitFactory.detectEnvironment();
      expect(detection.environment).toBe("production");
      expect(detection.source).toBe("explicit");
    });
  });

  describe("Default Factory Functions", () => {
    it("should create builder using default factory", () => {
      const builder = createConfigBuilder();
      expect(builder).toBeDefined();
    });

    it("should create environment-specific builder using default factory", () => {
      const devBuilder = createConfigBuilderForEnvironment("development");
      const prodBuilder = createConfigBuilderForEnvironment("production");

      expect(devBuilder).toBeDefined();
      expect(prodBuilder).toBeDefined();
    });

    it("should create development builder", () => {
      const builder = createDevelopment();
      expect(builder).toBeDefined();
    });

    it("should create production builder", () => {
      const builder = createProduction();
      expect(builder).toBeDefined();
    });

    it("should create test builder", () => {
      const builder = createTest();
      expect(builder).toBeDefined();
    });

    it("should detect environment using default factory", () => {
      process.env["NODE_ENV"] = "production";
      const detection = detectEnvironment();
      expect(detection.environment).toBe("production");
    });
  });

  describe("Performance Requirements", () => {
    it("should create factory instances efficiently", () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        new ConfigBuilderFactory();
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // Should be very fast instantiation
    });

    it("should meet <100ms loading performance requirement", () => {
      const start = performance.now();

      // Simulate typical configuration loading scenario
      const factory1 = new ConfigBuilderFactory();
      const builder1 = factory1.create();

      const factory2 = new ConfigBuilderFactory({ environment: "production" });
      const builder2 = factory2.createForEnvironment("development");

      const detection = factory1.detectEnvironment();
      const environments = factory1.getSupportedEnvironments();

      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Must be under 100ms as per requirements
    });

    it("should handle multiple environment detections efficiently", () => {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        factory.detectEnvironment();
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(5); // Should be very fast detection
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables gracefully", () => {
      delete process.env["NODE_ENV"];
      delete process.env["APP_ENV"];
      delete process.env["ENVIRONMENT"];
      delete process.env["ENV"];

      expect(() => factory.detectEnvironment()).not.toThrow();
    });

    it("should handle invalid environment variables", () => {
      process.env["NODE_ENV"] = "invalid-env";
      const detection = factory.detectEnvironment();

      expect(detection.environment).toBe("development"); // Falls back to default
      expect(detection.source).toBe("default");
    });

    it("should validate custom detection results", () => {
      delete process.env["NODE_ENV"];
      delete process.env["APP_ENV"];
      delete process.env["ENVIRONMENT"];
      delete process.env["ENV"];

      const customFactory = new ConfigBuilderFactory({
        customDetection: () => null,
      });

      const detection = customFactory.detectEnvironment();
      expect(detection.environment).toBe("development"); // Falls back when custom returns null
      expect(detection.source).toBe("default");
    });
  });
});
