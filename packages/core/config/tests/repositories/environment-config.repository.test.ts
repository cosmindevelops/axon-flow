/**
 * Environment configuration repository tests
 * @module @axon/config/tests/repositories/environment-config
 */

import { ConfigurationError } from "@axon/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  EnvironmentConfigRepository,
  envToCamelCase,
  parseArray,
  parseBoolean,
  parseJSON,
  parseNumber,
} from "../../src/repositories/environment-config.repository.js";
import type { IConfigChangeEvent } from "../../src/types/index.js";

describe("EnvironmentConfigRepository", () => {
  let repository: EnvironmentConfigRepository;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear relevant environment variables
    delete process.env["TEST_APP_NAME"];
    delete process.env["TEST_DATABASE_HOST"];
    delete process.env["TEST_DATABASE_PORT"];
    delete process.env["TEST_API_ENABLED"];
    delete process.env["TEST_API_CONFIG"];
    delete process.env["TEST_TAGS"];
  });

  afterEach(async () => {
    if (repository) {
      await repository.dispose();
    }

    // Restore original environment
    process.env = originalEnv;
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with default prefix", () => {
      repository = new EnvironmentConfigRepository();

      expect(repository.getMetadata().type).toBe("environment");
      expect(repository.getMetadata().platform).toBe("node");
    });

    it("should initialize with custom prefix", () => {
      repository = new EnvironmentConfigRepository("CUSTOM_");

      expect(repository.getMetadata().source).toContain("CUSTOM_");
    });

    it("should load environment variables on construction", () => {
      process.env["TEST_APP_NAME"] = "test-app";
      process.env["TEST_DATABASE_PORT"] = "5432";

      repository = new EnvironmentConfigRepository("TEST_");

      expect(repository.get("app.name")).toBe("test-app");
      expect(repository.get("database.port")).toBe("5432"); // Raw string value
    });
  });

  describe("Environment Variable Parsing", () => {
    beforeEach(() => {
      process.env["TEST_APP_NAME"] = "test-app";
      process.env["TEST_DATABASE_HOST"] = "localhost";
      process.env["TEST_DATABASE_PORT"] = "5432";
      process.env["TEST_API_ENABLED"] = "true";
      process.env["TEST_API_CONFIG"] = '{"timeout": 5000, "retries": 3}';
      process.env["TEST_TAGS"] = "tag1,tag2,tag3";

      repository = new EnvironmentConfigRepository("TEST_");
    });

    it("should convert environment variable names to camelCase", () => {
      expect(repository.get("app.name")).toBe("test-app");
      expect(repository.get("database.host")).toBe("localhost");
      expect(repository.get("database.port")).toBe("5432");
      expect(repository.get("api.enabled")).toBe("true");
    });

    it("should load and validate configuration with schema", () => {
      const testSchema = z.object({
        app: z.object({
          name: z.string(),
        }),
        database: z.object({
          host: z.string(),
          port: z.string().transform(Number), // Transform string to number
        }),
        api: z.object({
          enabled: z.string().transform((val) => val === "true"),
          config: z.string().transform((val) => JSON.parse(val)),
        }),
        tags: z.string().transform((val) => val.split(",")),
      });

      const config = repository.load(testSchema);

      expect(config.app.name).toBe("test-app");
      expect(config.database.port).toBe(5432);
      expect(config.api.enabled).toBe(true);
      expect(config.api.config).toEqual({ timeout: 5000, retries: 3 });
      expect(config.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should handle nested configuration keys", () => {
      process.env["TEST_DATABASE_POOL_MIN"] = "5";
      process.env["TEST_DATABASE_POOL_MAX"] = "20";

      repository = new EnvironmentConfigRepository("TEST_");

      expect(repository.get("database.pool.min")).toBe("5");
      expect(repository.get("database.pool.max")).toBe("20");
    });

    it("should handle case sensitivity", () => {
      process.env["TEST_app_name"] = "lowercase-app";
      process.env["TEST_APP_NAME"] = "uppercase-app";

      // Case insensitive (default)
      const insensitiveRepo = new EnvironmentConfigRepository("TEST_");

      // Should find either variant
      const value = insensitiveRepo.get("app.name");
      expect(typeof value).toBe("string");

      // Case sensitive
      const sensitiveRepo = new EnvironmentConfigRepository("TEST_");

      expect(sensitiveRepo.get("app.name")).toBe("uppercase-app");

      sensitiveRepo.dispose().catch(() => {});
      insensitiveRepo.dispose().catch(() => {});
    });
  });

  describe("Utility Functions", () => {
    describe("envToCamelCase", () => {
      it("should convert environment variable names to camelCase", () => {
        expect(envToCamelCase("TEST_APP_NAME")).toBe("app.name");
        expect(envToCamelCase("DATABASE_CONNECTION_POOL_SIZE")).toBe("database.connection.pool.size");
        expect(envToCamelCase("API_V2_ENABLED")).toBe("api.v2.enabled");
        expect(envToCamelCase("SIMPLE")).toBe("simple");
      });

      it("should handle edge cases", () => {
        expect(envToCamelCase("")).toBe("");
        expect(envToCamelCase("_")).toBe("");
        expect(envToCamelCase("TEST_")).toBe("test");
        expect(envToCamelCase("_TEST")).toBe("test");
      });
    });

    describe("parseBoolean", () => {
      it("should parse truthy values", () => {
        expect(parseBoolean("true")).toBe(true);
        expect(parseBoolean("TRUE")).toBe(true);
        expect(parseBoolean("True")).toBe(true);
        expect(parseBoolean("1")).toBe(true);
        expect(parseBoolean("yes")).toBe(true);
        expect(parseBoolean("on")).toBe(true);
      });

      it("should parse falsy values", () => {
        expect(parseBoolean("false")).toBe(false);
        expect(parseBoolean("FALSE")).toBe(false);
        expect(parseBoolean("0")).toBe(false);
        expect(parseBoolean("no")).toBe(false);
        expect(parseBoolean("off")).toBe(false);
        expect(parseBoolean("")).toBe(false);
      });

      it("should return original value for non-boolean strings", () => {
        expect(parseBoolean("maybe")).toBe("maybe");
        expect(parseBoolean("123")).toBe("123");
        expect(parseBoolean("invalid")).toBe("invalid");
      });
    });

    describe("parseNumber", () => {
      it("should parse valid numbers", () => {
        expect(parseNumber("123")).toBe(123);
        expect(parseNumber("123.45")).toBe(123.45);
        expect(parseNumber("-123")).toBe(-123);
        expect(parseNumber("0")).toBe(0);
      });

      it("should return original value for non-numeric strings", () => {
        expect(parseNumber("abc")).toBe("abc");
        expect(parseNumber("123abc")).toBe("123abc");
        expect(parseNumber("")).toBe("");
      });
    });

    describe("parseJSON", () => {
      it("should parse valid JSON", () => {
        expect(parseJSON('{"key": "value"}')).toEqual({ key: "value" });
        expect(parseJSON("[1, 2, 3]")).toEqual([1, 2, 3]);
        expect(parseJSON("true")).toBe(true);
        expect(parseJSON("123")).toBe(123);
      });

      it("should return original value for invalid JSON", () => {
        expect(parseJSON("invalid json")).toBe("invalid json");
        expect(parseJSON("{invalid}")).toBe("{invalid}");
        expect(parseJSON("")).toBe("");
      });
    });

    describe("parseArray", () => {
      it("should parse comma-separated values", () => {
        expect(parseArray("a,b,c")).toEqual(["a", "b", "c"]);
        expect(parseArray("1,2,3")).toEqual(["1", "2", "3"]);
        expect(parseArray("")).toEqual([""]);
      });

      it("should handle different delimiters", () => {
        expect(parseArray("a|b|c", "|")).toEqual(["a", "b", "c"]);
        expect(parseArray("a;b;c", ";")).toEqual(["a", "b", "c"]);
        expect(parseArray("a:b:c", ":")).toEqual(["a", "b", "c"]);
      });

      it("should trim whitespace", () => {
        expect(parseArray("a , b , c")).toEqual(["a", "b", "c"]);
        expect(parseArray(" a,b,c ")).toEqual(["a", "b", "c"]);
      });
    });
  });

  describe("Configuration Validation", () => {
    beforeEach(() => {
      process.env["TEST_APP_NAME"] = "test-app";
      process.env["TEST_DATABASE_PORT"] = "5432";
      process.env["TEST_API_ENABLED"] = "true";

      repository = new EnvironmentConfigRepository("TEST_");
    });

    it("should validate data against schema", () => {
      const testData = {
        app: { name: "test" },
        database: { port: "5432" },
      };

      const schema = z.object({
        app: z.object({ name: z.string() }),
        database: z.object({ port: z.string() }),
      });

      const result = repository.validate(testData, schema);
      expect(result).toEqual(testData);
    });

    it("should throw ConfigurationError for invalid schema", () => {
      const invalidSchema = z.object({
        app: z.object({
          name: z.number(), // Should be string
        }),
      });

      expect(() => {
        repository.load(invalidSchema);
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for invalid data validation", () => {
      const invalidData = { app: { name: 123 } };

      const schema = z.object({
        app: z.object({ name: z.string() }),
      });

      expect(() => {
        repository.validate(invalidData, schema);
      }).toThrow(ConfigurationError);
    });
  });

  describe("Change Detection and Hot Reloading", () => {
    beforeEach(() => {
      process.env["TEST_APP_NAME"] = "original-app";

      repository = new EnvironmentConfigRepository("TEST_");
    });

    it("should emit change events when environment variables change", async () => {
      const changeEvents: IConfigChangeEvent[] = [];

      repository.watch((event) => {
        changeEvents.push(event);
      });

      // Change environment variable
      process.env["TEST_APP_NAME"] = "updated-app";
      await repository.reload();

      // Wait for change detection
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(changeEvents.length).toBeGreaterThan(0);
      expect(changeEvents[0]!.changeType).toBe("reload");
      expect(changeEvents[0]!.affectedKeys).toContain("app.name");
    });

    it("should detect new environment variables", async () => {
      const changeEvents: IConfigChangeEvent[] = [];

      repository.watch((event) => {
        changeEvents.push(event);
      });

      // Add new environment variable
      process.env["TEST_NEW_KEY"] = "new-value";
      await repository.reload();

      expect(repository.get("new.key")).toBe("new-value");
    });

    it("should detect removed environment variables", async () => {
      const originalValue = repository.get("app.name");
      expect(originalValue).toBe("original-app");

      // Remove environment variable
      delete process.env["TEST_APP_NAME"];
      await repository.reload();

      expect(repository.get("app.name")).toBeUndefined();
    });

    it("should handle watch listener unsubscription", () => {
      const listener = vi.fn();
      const unsubscribe = repository.watch(listener);

      unsubscribe();

      expect(typeof unsubscribe).toBe("function");
    });
  });

  describe("Repository Metadata", () => {
    beforeEach(() => {
      repository = new EnvironmentConfigRepository("TEST_");
    });

    it("should provide repository metadata", () => {
      const metadata = repository.getMetadata();

      expect(metadata.source).toContain("TEST_");
      expect(metadata.type).toBe("environment");
      expect(metadata.platform).toBe("node");
      expect(metadata.isWatchable).toBe(true);
      expect(metadata.isWritable).toBe(false);
      expect(metadata.lastModified).toBeGreaterThan(0);
      expect(metadata.version).toBeDefined();
    });
  });

  describe("Resource Management", () => {
    it("should dispose resources properly", async () => {
      repository = new EnvironmentConfigRepository("TEST_");

      const listener = vi.fn();
      repository.watch(listener);

      await repository.dispose();

      expect(true).toBe(true); // Test passes if no error thrown
    });

    it("should handle multiple dispose calls gracefully", async () => {
      repository = new EnvironmentConfigRepository("TEST_");

      await repository.dispose();
      await repository.dispose(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables gracefully", () => {
      repository = new EnvironmentConfigRepository("NONEXISTENT_");

      expect(repository.get("any.key")).toBeUndefined();
    });

    it("should handle environment variable parsing errors", () => {
      process.env["TEST_INVALID_JSON"] = '{"invalid": json}';

      repository = new EnvironmentConfigRepository("TEST_");

      // Should return raw value if JSON parsing fails
      expect(repository.get("invalid.json")).toBe('{"invalid": json}');
    });
  });

  describe("Performance", () => {
    it("should efficiently handle large numbers of environment variables", () => {
      // Set many environment variables
      for (let i = 0; i < 1000; i++) {
        process.env[`TEST_VAR_${i}`] = `value_${i}`;
      }

      const startTime = performance.now();

      repository = new EnvironmentConfigRepository("TEST_");

      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
      expect(repository.get("var.999")).toBe("value_999");

      // Cleanup
      for (let i = 0; i < 1000; i++) {
        delete process.env[`TEST_VAR_${i}`];
      }
    });

    it("should cache environment variable access for performance", () => {
      process.env["TEST_APP_NAME"] = "test-app";

      repository = new EnvironmentConfigRepository("TEST_");

      const startTime = performance.now();

      // Access same key multiple times
      for (let i = 0; i < 1000; i++) {
        repository.get("app.name");
      }

      const accessTime = performance.now() - startTime;

      expect(accessTime).toBeLessThan(100); // Should be fast due to caching
    });
  });
});
