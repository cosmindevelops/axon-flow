/**
 * Test suite for environment class implementations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EnvironmentDetector, EnvironmentConfig, FeatureFlags, SystemInfo, EnvironmentValidator } from "../../../src/environment/index.js";

describe("Environment Classes", () => {
  describe("Environment Detection", () => {
    let environmentDetector: EnvironmentDetector;

    beforeEach(() => {
      environmentDetector = new EnvironmentDetector();
    });

    it("should detect current environment", () => {
      const environment = environmentDetector.detect();
      expect(typeof environment).toBe("string");
      expect(environment.length).toBeGreaterThan(0);

      const retrieved = environmentDetector.getEnvironment();
      expect(retrieved).toBe(environment);
    });

    it("should provide environment type checks", () => {
      // Test with the current environment
      const currentEnv = environmentDetector.detect();
      
      if (currentEnv === "test") {
        expect(environmentDetector.isTest()).toBe(true);
        expect(environmentDetector.isProduction()).toBe(false);
        expect(environmentDetector.isDevelopment()).toBe(false);
      } else {
        expect(typeof environmentDetector.isProduction()).toBe("boolean");
        expect(typeof environmentDetector.isDevelopment()).toBe("boolean");
        expect(typeof environmentDetector.isTest()).toBe("boolean");
      }
    });
  });

  describe("Environment Configuration", () => {
    it("should manage environment-specific configuration", () => {
      const environmentConfig = new EnvironmentConfig();

      // Set configurations
      environmentConfig.setConfig("default", {
        database: { host: "localhost", port: 5432 },
        logging: { level: "info" },
      });

      environmentConfig.setConfig("production", {
        database: { host: "prod-db.example.com", ssl: true },
        logging: { level: "warn" },
      });

      environmentConfig.setConfig("development", {
        database: { host: "dev-db.example.com" },
        logging: { level: "debug" },
      });

      // Test configuration retrieval
      const prodConfig = environmentConfig.getCurrentConfig("production");
      expect(prodConfig.database.host).toBe("prod-db.example.com");
      expect(prodConfig.database.port).toBe(5432); // From default
      expect(prodConfig.database.ssl).toBe(true); // From production
      expect(prodConfig.logging.level).toBe("warn");

      const devConfig = environmentConfig.getCurrentConfig("development");
      expect(devConfig.database.host).toBe("dev-db.example.com");
      expect(devConfig.logging.level).toBe("debug");
    });
  });

  describe("Feature Flags", () => {
    it("should manage environment-based feature flags", () => {
      const featureFlags = new FeatureFlags();

      // Set feature flags
      featureFlags.enableFlag("new-ui", ["development", "staging"]);
      featureFlags.enableFlag("advanced-analytics", ["production"]);
      featureFlags.setFlag("experimental-feature", {
        enabled: true,
        environments: ["development"],
        description: "Experimental feature for testing",
      });

      // Test flag evaluation
      expect(featureFlags.isEnabled("new-ui", "development")).toBe(true);
      expect(featureFlags.isEnabled("new-ui", "production")).toBe(false);
      expect(featureFlags.isEnabled("advanced-analytics", "production")).toBe(true);
      expect(featureFlags.isEnabled("advanced-analytics", "development")).toBe(false);
      expect(featureFlags.isEnabled("nonexistent-flag")).toBe(false);

      // Test flag listing
      const devFlags = featureFlags.getAllFlags("development");
      expect(devFlags["new-ui"]).toBe(true);
      expect(devFlags["advanced-analytics"]).toBe(false);
      expect(devFlags["experimental-feature"]).toBe(true);

      const prodFlags = featureFlags.getAllFlags("production");
      expect(prodFlags["new-ui"]).toBe(false);
      expect(prodFlags["advanced-analytics"]).toBe(true);
      expect(prodFlags["experimental-feature"]).toBe(false);
    });
  });

  describe("System Information", () => {
    it("should collect system environment information", () => {
      const systemInfo = new SystemInfo();
      const systemInfoResult = systemInfo.getSystemInfo();
      expect(systemInfoResult).toBeDefined();
      expect(typeof systemInfoResult.platform).toBe("string");

      const runtimeInfo = systemInfo.getRuntimeInfo();
      expect(runtimeInfo.timestamp).toBeDefined();
      expect(runtimeInfo.timezone).toBeDefined();
      expect(runtimeInfo.features).toBeDefined();
      expect(typeof runtimeInfo.features).toBe("object");
    });
  });

  describe("Environment Validation", () => {
    it("should validate environment configuration", () => {
      const environmentValidator = new EnvironmentValidator();

      // Valid production configuration
      const validProdConfig = {
        environment: "production",
        database: {
          host: "prod-db.example.com",
          port: 5432,
          ssl: true,
        },
        security: {
          enabled: true,
        },
        logging: {
          level: "warn",
        },
      };

      const validResult = environmentValidator.validate(validProdConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.score).toBe(100);

      // Invalid configuration
      const invalidConfig = {
        // Missing environment
        database: {
          // Missing host
          port: 70000, // Invalid port
        },
        logging: {
          level: "debug", // Warning for production
        },
      };

      const invalidResult = environmentValidator.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.score).toBeLessThan(100);
    });
  });
});
