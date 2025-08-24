/**
 * Container schemas validation tests
 *
 * Tests for Zod schemas and validation functions
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  CONTAINER_LIFECYCLE_SCHEMA,
  DI_TOKEN_SCHEMA,
  CONTAINER_REGISTRATION_OPTIONS_SCHEMA,
  CONTAINER_CONFIG_SCHEMA,
  RESOLUTION_CONTEXT_SCHEMA,
  CONTAINER_METRICS_SCHEMA,
  DEFAULT_CONTAINER_CONFIG,
  validateContainerConfig,
  validateRegistrationOptions,
  validateDIToken,
  createDefaultRegistrationOptions,
} from "../../../src/container/container.schemas.js";

describe("Container Schemas", () => {
  describe("CONTAINER_LIFECYCLE_SCHEMA", () => {
    it("should validate valid lifecycle values", () => {
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse("singleton")).not.toThrow();
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse("transient")).not.toThrow();
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse("scoped")).not.toThrow();
    });

    it("should reject invalid lifecycle values", () => {
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse("invalid")).toThrow();
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse(null)).toThrow();
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse(undefined)).toThrow();
      expect(() => CONTAINER_LIFECYCLE_SCHEMA.parse(123)).toThrow();
    });
  });

  describe("DI_TOKEN_SCHEMA", () => {
    it("should validate string tokens", () => {
      expect(() => DI_TOKEN_SCHEMA.parse("valid-token")).not.toThrow();
      expect(() => DI_TOKEN_SCHEMA.parse("IService")).not.toThrow();
    });

    it("should reject empty string tokens", () => {
      expect(() => DI_TOKEN_SCHEMA.parse("")).toThrow(z.ZodError);
      expect(() => DI_TOKEN_SCHEMA.parse("   ")).toThrow(z.ZodError); // Only whitespace should fail
    });

    it("should validate symbol tokens", () => {
      const symbolToken = Symbol("test-token");
      expect(() => DI_TOKEN_SCHEMA.parse(symbolToken)).not.toThrow();
    });

    it("should validate function tokens", () => {
      class TestService {}
      function TestFactory() {
        return {};
      }

      expect(() => DI_TOKEN_SCHEMA.parse(TestService)).not.toThrow();
      expect(() => DI_TOKEN_SCHEMA.parse(TestFactory)).not.toThrow();
    });

    it("should reject invalid token types", () => {
      expect(() => DI_TOKEN_SCHEMA.parse(null)).toThrow();
      expect(() => DI_TOKEN_SCHEMA.parse(undefined)).toThrow();
      expect(() => DI_TOKEN_SCHEMA.parse(123)).toThrow();
      expect(() => DI_TOKEN_SCHEMA.parse({})).toThrow();
      expect(() => DI_TOKEN_SCHEMA.parse([])).toThrow();
    });
  });

  describe("CONTAINER_REGISTRATION_OPTIONS_SCHEMA", () => {
    it("should validate valid registration options", () => {
      const validOptions = {
        lifecycle: "singleton" as const,
        dependencies: ["dep1", "dep2"],
        metadata: { key: "value" },
      };

      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(validOptions)).not.toThrow();
    });

    it("should validate options with factory function", () => {
      const optionsWithFactory = {
        lifecycle: "transient" as const,
        factory: () => ({ test: true }),
        dependencies: [],
      };

      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(optionsWithFactory)).not.toThrow();
    });

    it("should validate empty options object", () => {
      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse({})).not.toThrow();
    });

    it("should reject invalid lifecycle in options", () => {
      const invalidOptions = {
        lifecycle: "invalid-lifecycle",
      };

      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(invalidOptions)).toThrow();
    });

    it("should reject non-function factory", () => {
      const invalidOptions = {
        factory: "not-a-function",
      };

      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(invalidOptions)).toThrow();
    });

    it("should reject invalid dependencies array", () => {
      const invalidOptions = {
        dependencies: ["valid-token", 123], // Mixed valid and invalid tokens
      };

      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(invalidOptions)).toThrow();
    });

    it("should reject invalid metadata type", () => {
      const invalidOptions = {
        metadata: "should-be-object",
      };

      expect(() => CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(invalidOptions)).toThrow();
    });
  });

  describe("CONTAINER_CONFIG_SCHEMA", () => {
    it("should validate valid container configuration", () => {
      const validConfig = {
        name: "TestContainer",
        strictMode: true,
        defaultLifecycle: "singleton" as const,
        enableMetrics: false,
        maxResolutionDepth: 15,
        enableCache: true,
        autoDispose: false,
      };

      expect(() => CONTAINER_CONFIG_SCHEMA.parse(validConfig)).not.toThrow();
    });

    it("should validate empty configuration object", () => {
      expect(() => CONTAINER_CONFIG_SCHEMA.parse({})).not.toThrow();
    });

    it("should reject empty name", () => {
      const invalidConfig = {
        name: "",
      };

      expect(() => CONTAINER_CONFIG_SCHEMA.parse(invalidConfig)).toThrow();
      expect(() => CONTAINER_CONFIG_SCHEMA.parse(invalidConfig)).toThrow("Container name cannot be empty");
    });

    it("should reject invalid maxResolutionDepth values", () => {
      const negativeDepth = { maxResolutionDepth: -1 };
      const zeroDepth = { maxResolutionDepth: 0 };
      const tooLargeDepth = { maxResolutionDepth: 200 };

      expect(() => CONTAINER_CONFIG_SCHEMA.parse(negativeDepth)).toThrow("Resolution depth must be positive");
      expect(() => CONTAINER_CONFIG_SCHEMA.parse(zeroDepth)).toThrow("Resolution depth must be positive");
      expect(() => CONTAINER_CONFIG_SCHEMA.parse(tooLargeDepth)).toThrow("Resolution depth too large");
    });

    it("should reject non-integer maxResolutionDepth", () => {
      const floatDepth = { maxResolutionDepth: 10.5 };

      expect(() => CONTAINER_CONFIG_SCHEMA.parse(floatDepth)).toThrow();
    });

    it("should reject invalid boolean fields", () => {
      expect(() => CONTAINER_CONFIG_SCHEMA.parse({ strictMode: "true" })).toThrow();
      expect(() => CONTAINER_CONFIG_SCHEMA.parse({ enableMetrics: 1 })).toThrow();
      expect(() => CONTAINER_CONFIG_SCHEMA.parse({ enableCache: "false" })).toThrow();
      expect(() => CONTAINER_CONFIG_SCHEMA.parse({ autoDispose: null })).toThrow();
    });

    it("should reject invalid defaultLifecycle", () => {
      const invalidConfig = {
        defaultLifecycle: "invalid-lifecycle",
      };

      expect(() => CONTAINER_CONFIG_SCHEMA.parse(invalidConfig)).toThrow();
    });
  });

  describe("RESOLUTION_CONTEXT_SCHEMA", () => {
    it("should validate valid resolution context", () => {
      const validContext = {
        resolutionPath: ["token1", Symbol("token2")],
        depth: 3,
        startTime: performance.now(),
        scopedInstances: new Map(),
      };

      expect(() => RESOLUTION_CONTEXT_SCHEMA.parse(validContext)).not.toThrow();
    });

    it("should validate context with parent", () => {
      const parentContext = {
        resolutionPath: ["parent"],
        depth: 1,
        startTime: performance.now(),
      };

      const childContext = {
        resolutionPath: ["parent", "child"],
        depth: 2,
        startTime: performance.now(),
        parent: parentContext,
      };

      expect(() => RESOLUTION_CONTEXT_SCHEMA.parse(childContext)).not.toThrow();
    });

    it("should reject negative depth", () => {
      const invalidContext = {
        resolutionPath: [],
        depth: -1,
        startTime: performance.now(),
      };

      expect(() => RESOLUTION_CONTEXT_SCHEMA.parse(invalidContext)).toThrow("Depth cannot be negative");
    });

    it("should reject non-positive start time", () => {
      const invalidContext = {
        resolutionPath: [],
        depth: 0,
        startTime: -1,
      };

      expect(() => RESOLUTION_CONTEXT_SCHEMA.parse(invalidContext)).toThrow("Start time must be positive");
    });

    it("should reject invalid resolution path tokens", () => {
      const invalidContext = {
        resolutionPath: ["valid", null, "also-valid"],
        depth: 0,
        startTime: performance.now(),
      };

      expect(() => RESOLUTION_CONTEXT_SCHEMA.parse(invalidContext)).toThrow();
    });
  });

  describe("CONTAINER_METRICS_SCHEMA", () => {
    it("should validate valid container metrics", () => {
      const validMetrics = {
        totalRegistrations: 10,
        totalResolutions: 50,
        averageResolutionTime: 1.5,
        peakResolutionTime: 5.2,
        cacheHitRatio: 0.8,
        memoryUsage: {
          singletonCount: 5,
          estimatedBytes: 10240,
        },
      };

      expect(() => CONTAINER_METRICS_SCHEMA.parse(validMetrics)).not.toThrow();
    });

    it("should validate zero values", () => {
      const zeroMetrics = {
        totalRegistrations: 0,
        totalResolutions: 0,
        averageResolutionTime: 0,
        peakResolutionTime: 0,
        cacheHitRatio: 0,
        memoryUsage: {
          singletonCount: 0,
          estimatedBytes: 0,
        },
      };

      expect(() => CONTAINER_METRICS_SCHEMA.parse(zeroMetrics)).not.toThrow();
    });

    it("should reject negative integer values", () => {
      const negativeRegistrations = { totalRegistrations: -1 };
      const negativeResolutions = { totalResolutions: -1 };

      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...negativeRegistrations })).toThrow(
        "Total registrations cannot be negative",
      );
      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...negativeResolutions })).toThrow(
        "Total resolutions cannot be negative",
      );
    });

    it("should reject negative time values", () => {
      const negativeAverage = { averageResolutionTime: -1 };
      const negativePeak = { peakResolutionTime: -1 };

      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...negativeAverage })).toThrow(
        "Average resolution time cannot be negative",
      );
      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...negativePeak })).toThrow(
        "Peak resolution time cannot be negative",
      );
    });

    it("should reject invalid cache hit ratio values", () => {
      const negativeCacheRatio = { cacheHitRatio: -0.1 };
      const tooLargeCacheRatio = { cacheHitRatio: 1.5 };

      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...negativeCacheRatio })).toThrow(
        "Cache hit ratio cannot be negative",
      );
      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...tooLargeCacheRatio })).toThrow(
        "Cache hit ratio cannot exceed 1",
      );
    });

    it("should reject negative memory usage values", () => {
      const invalidMemoryUsage = {
        memoryUsage: {
          singletonCount: -1,
          estimatedBytes: -100,
        },
      };

      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...invalidMemoryUsage })).toThrow(
        "Singleton count cannot be negative",
      );
    });

    it("should reject non-integer count values", () => {
      const floatCount = {
        totalRegistrations: 10.5,
      };

      expect(() => CONTAINER_METRICS_SCHEMA.parse({ ...validMetrics(), ...floatCount })).toThrow();
    });

    function validMetrics() {
      return {
        totalRegistrations: 10,
        totalResolutions: 50,
        averageResolutionTime: 1.5,
        peakResolutionTime: 5.2,
        cacheHitRatio: 0.8,
        memoryUsage: {
          singletonCount: 5,
          estimatedBytes: 10240,
        },
      };
    }
  });
});

describe("Validation Functions", () => {
  describe("validateContainerConfig", () => {
    it("should validate and return valid configuration", () => {
      const config = {
        name: "TestContainer",
        strictMode: true,
        maxResolutionDepth: 10,
      };

      const result = validateContainerConfig(config);

      expect(result).toEqual(config);
    });

    it("should throw ZodError for invalid configuration", () => {
      const invalidConfig = {
        name: "",
        maxResolutionDepth: -1,
      };

      expect(() => validateContainerConfig(invalidConfig)).toThrow(z.ZodError);
    });

    it("should validate empty configuration", () => {
      const result = validateContainerConfig({});
      expect(result).toEqual({});
    });
  });

  describe("validateRegistrationOptions", () => {
    it("should validate and return valid options", () => {
      const options = {
        lifecycle: "singleton" as const,
        dependencies: ["dep1"],
        metadata: { key: "value" },
      };

      const result = validateRegistrationOptions(options);

      expect(result).toEqual(options);
    });

    it("should throw ZodError for invalid options", () => {
      const invalidOptions = {
        lifecycle: "invalid",
        factory: "not-a-function",
      };

      expect(() => validateRegistrationOptions(invalidOptions)).toThrow(z.ZodError);
    });

    it("should validate empty options", () => {
      const result = validateRegistrationOptions({});
      expect(result).toEqual({});
    });
  });

  describe("validateDIToken", () => {
    it("should validate and return valid tokens", () => {
      const stringToken = "TestService";
      const symbolToken = Symbol("test");
      const functionToken = class TestService {};

      expect(validateDIToken(stringToken)).toBe(stringToken);
      expect(validateDIToken(symbolToken)).toBe(symbolToken);
      expect(validateDIToken(functionToken)).toBe(functionToken);
    });

    it("should throw ZodError for invalid tokens", () => {
      expect(() => validateDIToken(null)).toThrow(z.ZodError);
      expect(() => validateDIToken(undefined)).toThrow(z.ZodError);
      expect(() => validateDIToken(123)).toThrow(z.ZodError);
      expect(() => validateDIToken("")).toThrow(z.ZodError);
    });
  });

  describe("createDefaultRegistrationOptions", () => {
    it("should create default options with specified lifecycle", () => {
      const result = createDefaultRegistrationOptions("singleton");

      expect(result).toEqual({
        lifecycle: "singleton",
        dependencies: [],
        metadata: {},
      });
    });

    it("should create default options with default lifecycle when none specified", () => {
      const result = createDefaultRegistrationOptions();

      expect(result).toEqual({
        lifecycle: DEFAULT_CONTAINER_CONFIG.defaultLifecycle,
        dependencies: [],
        metadata: {},
      });
    });

    it("should create options for each valid lifecycle", () => {
      const singletonOptions = createDefaultRegistrationOptions("singleton");
      const transientOptions = createDefaultRegistrationOptions("transient");
      const scopedOptions = createDefaultRegistrationOptions("scoped");

      expect(singletonOptions.lifecycle).toBe("singleton");
      expect(transientOptions.lifecycle).toBe("transient");
      expect(scopedOptions.lifecycle).toBe("scoped");

      // All should have same structure otherwise
      expect(singletonOptions.dependencies).toEqual([]);
      expect(transientOptions.dependencies).toEqual([]);
      expect(scopedOptions.dependencies).toEqual([]);

      expect(singletonOptions.metadata).toEqual({});
      expect(transientOptions.metadata).toEqual({});
      expect(scopedOptions.metadata).toEqual({});
    });
  });
});

describe("DEFAULT_CONTAINER_CONFIG", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_CONTAINER_CONFIG).toEqual({
      strictMode: true,
      defaultLifecycle: "transient",
      enableMetrics: true,
      maxResolutionDepth: 20,
      enableCache: true,
      autoDispose: false,
    });
  });

  it("should have valid values according to schema", () => {
    expect(() => CONTAINER_CONFIG_SCHEMA.parse(DEFAULT_CONTAINER_CONFIG)).not.toThrow();
  });

  it("should be immutable (readonly)", () => {
    expect(Object.isFrozen(DEFAULT_CONTAINER_CONFIG)).toBe(true);
  });
});

describe("Schema Error Messages", () => {
  it("should provide meaningful error messages for container config", () => {
    try {
      validateContainerConfig({ name: "" });
    } catch (error) {
      expect((error as z.ZodError).issues[0].message).toBe("Container name cannot be empty");
    }
  });

  it("should provide meaningful error messages for resolution depth", () => {
    try {
      validateContainerConfig({ maxResolutionDepth: -1 });
    } catch (error) {
      expect((error as z.ZodError).issues[0].message).toBe("Resolution depth must be positive");
    }

    try {
      validateContainerConfig({ maxResolutionDepth: 200 });
    } catch (error) {
      expect((error as z.ZodError).issues[0].message).toBe("Resolution depth too large");
    }
  });

  it("should provide meaningful error messages for DI tokens", () => {
    try {
      validateDIToken("");
    } catch (error) {
      expect((error as z.ZodError).issues[0].message).toBe("Token string cannot be empty");
    }
  });

  it("should provide path information for nested validation errors", () => {
    const invalidMetrics = {
      totalRegistrations: -1,
      memoryUsage: {
        singletonCount: -1,
      },
    };

    try {
      CONTAINER_METRICS_SCHEMA.parse(invalidMetrics);
    } catch (error) {
      const zodError = error as z.ZodError;
      const paths = zodError.issues.map((issue) => issue.path.join("."));

      expect(paths).toContain("totalRegistrations");
      expect(paths).toContain("memoryUsage.singletonCount");
    }
  });
});
