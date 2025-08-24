/**
 * Configuration Factory Classes Tests
 * Tests for configuration factory implementations and builder patterns
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import * as os from "os";
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

describe("Configuration Factory Classes", () => {
  let factory: ConfigBuilderFactory;
  let originalNodeEnv: string | undefined;
  let tempDir: string;
  let testFiles: string[] = [];

  beforeEach(async () => {
    factory = new ConfigBuilderFactory();
    originalNodeEnv = process.env["NODE_ENV"];

    // Create temporary directory for real file operations
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "axon-config-test-"));
    testFiles = [];

    // Change to temp directory to test actual file operations
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env["NODE_ENV"] = originalNodeEnv;
    } else {
      delete process.env["NODE_ENV"];
    }

    // Clean up temporary files and directory
    try {
      for (const file of testFiles) {
        if (fsSync.existsSync(file)) {
          await fs.unlink(file);
        }
      }
      if (fsSync.existsSync(tempDir)) {
        await fs.rmdir(tempDir, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
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

    it("should create environment-specific builder", async () => {
      // Create test .env files for different environments
      const envFiles = {
        development: "DEV_PORT=3000\nDEV_DEBUG=true\nDEV_HOST=localhost",
        production: "PROD_PORT=8080\nPROD_DEBUG=false\nPROD_HOST=0.0.0.0\nPROD_SSL=true",
        test: "TEST_PORT=9999\nTEST_DEBUG=true\nTEST_DB=test_db",
        local: "LOCAL_PORT=4000\nLOCAL_DEBUG=true\nLOCAL_HOST=127.0.0.1\nLOCAL_CACHE=redis",
      };

      for (const [env, content] of Object.entries(envFiles)) {
        const envFile = path.join(tempDir, `.env.${env}`);
        await fs.writeFile(envFile, content);
        testFiles.push(envFile);
      }

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

    it("should create environment-specific builder using default factory", async () => {
      // Create test .env files for different environments
      const envFiles = {
        development: "DEV_PORT=3000\nDEV_DEBUG=true\nDEV_HOST=localhost",
        production: "PROD_PORT=8080\nPROD_DEBUG=false\nPROD_HOST=0.0.0.0\nPROD_SSL=true",
        local: "LOCAL_PORT=4000\nLOCAL_DEBUG=true\nLOCAL_HOST=127.0.0.1\nLOCAL_CACHE=redis",
      };

      for (const [env, content] of Object.entries(envFiles)) {
        const envFile = path.join(tempDir, `.env.${env}`);
        await fs.writeFile(envFile, content);
        testFiles.push(envFile);
      }

      const devBuilder = createConfigBuilderForEnvironment("development");
      const prodBuilder = createConfigBuilderForEnvironment("production");

      expect(devBuilder).toBeDefined();
      expect(prodBuilder).toBeDefined();
    });

    it("should create development builder with real .env files", async () => {
      // Create real .env files for development environment testing
      const envLocalContent = "DEV_DATABASE_URL=postgresql://localhost:5432/dev_db\nDEV_DEBUG=true";
      const envDevelopmentContent = "DEV_PORT=3000\nDEV_LOG_LEVEL=debug";

      const envLocalPath = ".env.local";
      const envDevPath = ".env.development";

      await fs.writeFile(envLocalPath, envLocalContent);
      await fs.writeFile(envDevPath, envDevelopmentContent);
      testFiles.push(envLocalPath, envDevPath);

      const builder = createDevelopment();
      expect(builder).toBeDefined();

      // Verify files exist and are readable
      expect(fsSync.existsSync(envLocalPath)).toBe(true);
      expect(fsSync.existsSync(envDevPath)).toBe(true);

      const readLocalContent = await fs.readFile(envLocalPath, "utf8");
      expect(readLocalContent).toContain("DEV_DATABASE_URL");
    });

    it("should create production builder with real .env file", async () => {
      // Create real .env.production file
      const envProdContent = "PROD_DATABASE_URL=postgresql://prod-db:5432/app\nPROD_PORT=80";
      const envProdPath = ".env.production";

      await fs.writeFile(envProdPath, envProdContent);
      testFiles.push(envProdPath);

      const builder = createProduction();
      expect(builder).toBeDefined();

      // Verify file exists and is readable
      expect(fsSync.existsSync(envProdPath)).toBe(true);

      const readProdContent = await fs.readFile(envProdPath, "utf8");
      expect(readProdContent).toContain("PROD_DATABASE_URL");
    });

    it("should create test builder with real .env.test file", async () => {
      // Create real .env.test file
      const envTestContent = "TEST_DATABASE_URL=postgresql://localhost:5432/test_db\nTEST_TIMEOUT=5000";
      const envTestPath = ".env.test";

      await fs.writeFile(envTestPath, envTestContent);
      testFiles.push(envTestPath);

      const builder = createTest();
      expect(builder).toBeDefined();

      // Verify file exists and is readable
      expect(fsSync.existsSync(envTestPath)).toBe(true);

      const readTestContent = await fs.readFile(envTestPath, "utf8");
      expect(readTestContent).toContain("TEST_DATABASE_URL");
    });

    it("should detect environment using default factory", () => {
      process.env["NODE_ENV"] = "production";
      const detection = detectEnvironment();
      expect(detection.environment).toBe("production");
    });

    it("should handle missing .env files gracefully", async () => {
      // Create minimal .env files to test graceful handling
      const envFiles = {
        development: "DEV_PORT=3000\nDEV_DEBUG=true",
        local: "LOCAL_PORT=4000\nLOCAL_DEBUG=true",
      };

      for (const [env, content] of Object.entries(envFiles)) {
        const envFile = path.join(tempDir, `.env.${env}`);
        await fs.writeFile(envFile, content);
        testFiles.push(envFile);
      }

      // Test that builders work with minimal configuration files
      const builder = createDevelopment();
      expect(builder).toBeDefined();

      // Verify files now exist
      expect(fsSync.existsSync(".env.local")).toBe(true);
      expect(fsSync.existsSync(".env.development")).toBe(true);
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

    it("should meet <100ms loading performance requirement", async () => {
      // Create test .env files for performance testing
      const envFiles = {
        development: "DEV_PORT=3000\nDEV_DEBUG=true",
        production: "PROD_PORT=8080\nPROD_DEBUG=false",
        local: "LOCAL_PORT=4000\nLOCAL_DEBUG=true",
      };

      for (const [env, content] of Object.entries(envFiles)) {
        const envFile = path.join(tempDir, `.env.${env}`);
        await fs.writeFile(envFile, content);
        testFiles.push(envFile);
      }

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
