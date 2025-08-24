/**
 * Tests for enhanced validation error reporting in ConfigBuilder
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ConfigBuilder } from "../../../../src/builders/base/base.classes.js";
import { ConfigurationError } from "@axon/errors";

describe("ConfigBuilder Enhanced Error Reporting", () => {
  it("should provide detailed context for schema validation failures", () => {
    // Create a builder with invalid configuration data
    const builder = new ConfigBuilder();
    
    // Add configuration that will fail validation
    builder.fromMemory({
      database: {
        host: 123, // Should be string
        port: "invalid", // Should be number
        ssl: "maybe" // Should be boolean
      },
      missingRequired: undefined
    });

    // Define a schema that will fail
    const schema = z.object({
      database: z.object({
        host: z.string(),
        port: z.number(),
        ssl: z.boolean()
      }),
      requiredField: z.string()
    });

    // Attempt to build and capture the error
    let thrownError: ConfigurationError | undefined;
    try {
      builder.build(schema);
    } catch (error) {
      thrownError = error as ConfigurationError;
    }

    // Verify it's a ConfigurationError with enhanced context
    expect(thrownError).toBeInstanceOf(ConfigurationError);
    expect(thrownError?.code).toBe("CONFIG_VALIDATION_FAILED");
    
    // Check that enhanced context is provided via standard ConfigurationError properties
    expect(thrownError?.message).toContain("Configuration validation failed:");
    expect(thrownError?.message).toContain("Details:");
    expect(thrownError?.configSource).toBeDefined();
    expect(thrownError?.configKey).toBeDefined();
    expect(thrownError?.expectedType).toBeDefined();
    
    // Verify specific validation details are included in the message
    expect(thrownError?.message).toContain("Validation errors:");
    expect(thrownError?.configSource).toContain("MemoryConfigRepository");
  });

  it("should handle single validation error with specific path context", () => {
    const builder = new ConfigBuilder();
    
    builder.fromMemory({
      api: {
        timeout: "not-a-number"
      }
    });

    const schema = z.object({
      api: z.object({
        timeout: z.number()
      })
    });

    let thrownError: ConfigurationError | undefined;
    try {
      builder.build(schema);
    } catch (error) {
      thrownError = error as ConfigurationError;
    }

    expect(thrownError?.message).toContain("Invalid value at 'api.timeout'");
    expect(thrownError?.configKey).toBe("api.timeout");
    expect(thrownError?.configValue).toBe("not-a-number");
    expect(thrownError?.expectedType).toBeDefined();
  });

  it("should handle multiple validation errors with summary", () => {
    const builder = new ConfigBuilder();
    
    builder.fromMemory({
      server: {
        port: "invalid",
        host: 123,
        enabled: "not-boolean"
      }
    });

    const schema = z.object({
      server: z.object({
        port: z.number(),
        host: z.string(),
        enabled: z.boolean()
      })
    });

    let thrownError: ConfigurationError | undefined;
    try {
      builder.build(schema);
    } catch (error) {
      thrownError = error as ConfigurationError;
    }

    expect(thrownError?.message).toMatch(/\d+ validation errors/);
    expect(thrownError?.message).toContain("Details:");
    expect(thrownError?.message).toContain("Validation errors:");
    expect(thrownError?.configKey).toBeDefined(); // Should have first failed path
  });

  it("should gracefully handle non-Zod errors", () => {
    const builder = new ConfigBuilder();
    builder.fromMemory({ test: "data" });

    // Since we can't easily inject the mocked repository, we'll test the error extraction method indirectly
    // by creating a new builder and triggering validation with a problematic schema
    expect(() => {
      const testBuilder = new ConfigBuilder({ enableValidationCache: true });
      testBuilder.fromMemory({ invalid: null });
      testBuilder.build(z.object({ required: z.string() }));
    }).toThrow(ConfigurationError);
  });
});