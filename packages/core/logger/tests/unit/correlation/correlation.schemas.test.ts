/**
 * Unit tests for correlation schemas
 */

import { describe, it, expect } from "vitest";
import {
  correlationIdSchema,
  correlationIdPartsSchema,
  correlationContextSchema,
  correlationGeneratorConfigSchema,
  correlationManagerConfigSchema,
  correlationConfigSchema,
} from "../../../src/correlation/correlation.schemas.js";
import type { CorrelationId } from "../../../src/correlation/correlation.types.js";

describe("Correlation Schemas", () => {
  describe("correlationIdSchema", () => {
    it("should validate valid correlation ID strings with UUID format", () => {
      const validIds = [
        "axon-12345678-1234-4123-8123-123456789012", // prefix with UUID
        "test-87654321-4321-4987-b987-987654321098", // another valid format
        "service-11111111-2222-4333-9444-555555555555", // service prefix
      ];

      validIds.forEach((id) => {
        const result = correlationIdSchema.safeParse(id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(id);
        }
      });
    });

    it("should reject invalid correlation ID values", () => {
      const invalidIds = [
        "", // empty string
        null,
        undefined,
        123,
        {},
        [],
        true,
        " ", // whitespace only
        "id with spaces",
        "simple-id", // no UUID part
        "invalid-uuid-format", // not a UUID
        "prefix-invalid-uuid-12345", // invalid UUID format
      ];

      invalidIds.forEach((id) => {
        const result = correlationIdSchema.safeParse(id);
        expect(result.success).toBe(false);
      });
    });

    it("should enforce UUID v4 format in correlation ID", () => {
      const result = correlationIdSchema.safeParse("prefix-12345678-1234-3123-8123-123456789012"); // version 3, should fail
      expect(result.success).toBe(false);
    });

    it("should require at least 5 dash-separated parts", () => {
      const result = correlationIdSchema.safeParse("prefix-uuid"); // too few parts
      expect(result.success).toBe(false);
    });
  });

  describe("correlationIdPartsSchema", () => {
    it("should validate valid correlation ID parts", () => {
      const validParts = {
        prefix: "axon",
        uuid: "12345678-1234-4123-8123-123456789012",
        timestamp: 1640995200000,
      };

      const result = correlationIdPartsSchema.safeParse(validParts);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prefix).toBe(validParts.prefix);
        expect(result.data.uuid).toBe(validParts.uuid);
        expect(result.data.timestamp).toBe(validParts.timestamp);
      }
    });

    it("should validate minimal correlation ID parts", () => {
      const minimalParts = {
        uuid: "87654321-4321-4987-b987-987654321098",
      };

      const result = correlationIdPartsSchema.safeParse(minimalParts);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uuid).toBe(minimalParts.uuid);
      }
    });

    it("should reject invalid correlation ID parts", () => {
      const invalidParts = [
        {}, // missing uuid
        { uuid: "" }, // empty uuid
        { uuid: "invalid-uuid-format" }, // invalid UUID
        { uuid: "12345678-1234-4123-8123-123456789012", timestamp: -1 }, // negative timestamp
        { uuid: "12345678-1234-3123-8123-123456789012" }, // invalid UUID version
        null,
        undefined,
        "not-an-object",
      ];

      invalidParts.forEach((parts) => {
        const result = correlationIdPartsSchema.safeParse(parts);
        expect(result.success).toBe(false);
      });
    });

    it("should validate optional fields correctly", () => {
      const partsWithOptionals = {
        uuid: "12345678-1234-4123-8123-123456789012",
        prefix: "test",
        timestamp: undefined, // explicitly undefined optional field
      };

      const result = correlationIdPartsSchema.safeParse(partsWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("correlationContextSchema", () => {
    it("should validate valid correlation context", () => {
      const validContext = {
        id: "context-12345678-1234-4123-8123-123456789012" as CorrelationId,
        createdAt: new Date(),
      };

      const result = correlationContextSchema.safeParse(validContext);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validContext.id);
        expect(result.data.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should validate context with metadata", () => {
      const contextWithMetadata = {
        id: "metadata-12345678-1234-4123-8123-123456789012" as CorrelationId,
        createdAt: new Date(),
        metadata: {
          service: "test-service",
          operation: "test-operation",
          userId: "user-123",
        },
      };

      const result = correlationContextSchema.safeParse(contextWithMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(contextWithMetadata.id);
        expect(result.data.metadata).toEqual(contextWithMetadata.metadata);
      }
    });

    it("should reject invalid correlation context", () => {
      const invalidContexts = [
        {}, // missing required fields
        { id: "invalid-id" }, // missing createdAt, invalid ID format
        { id: "valid-12345678-1234-4123-8123-123456789012", createdAt: "invalid-date" }, // invalid date
        { createdAt: new Date() }, // missing id
        null,
        undefined,
      ];

      invalidContexts.forEach((context) => {
        const result = correlationContextSchema.safeParse(context);
        expect(result.success).toBe(false);
      });
    });

    it("should validate optional metadata field", () => {
      const contextWithUndefinedMetadata = {
        id: "optional-12345678-1234-4123-8123-123456789012" as CorrelationId,
        createdAt: new Date(),
        metadata: undefined,
      };

      const result = correlationContextSchema.safeParse(contextWithUndefinedMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe("correlationGeneratorConfigSchema", () => {
    it("should validate valid generator configuration", () => {
      const validConfig = {
        maxEntropyCache: 5000,
        enableCollisionDetection: true,
      };

      const result = correlationGeneratorConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxEntropyCache).toBe(5000);
        expect(result.data.enableCollisionDetection).toBe(true);
      }
    });

    it("should validate empty configuration with defaults", () => {
      const emptyConfig = {};
      const result = correlationGeneratorConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxEntropyCache).toBe(10000); // default value
        expect(result.data.enableCollisionDetection).toBe(true); // default value
      }
    });

    it("should validate partial configuration", () => {
      const partialConfig = {
        maxEntropyCache: 2000,
      };

      const result = correlationGeneratorConfigSchema.safeParse(partialConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxEntropyCache).toBe(2000);
        expect(result.data.enableCollisionDetection).toBe(true); // default
      }
    });

    it("should reject invalid configuration values", () => {
      const invalidConfigs = [
        { maxEntropyCache: -1 }, // negative value
        { maxEntropyCache: 0 }, // zero value  
        { enableCollisionDetection: "yes" }, // non-boolean
        { maxEntropyCache: "invalid" }, // non-number
        "not-an-object",
        null,
        undefined,
      ];

      invalidConfigs.forEach((config) => {
        const result = correlationGeneratorConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("correlationManagerConfigSchema", () => {
    it("should validate valid manager configuration", () => {
      const validConfig = {
        maxContextStackSize: 50,
        enableContextTracking: true,
        defaultPrefix: "test",
      };

      const result = correlationManagerConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxContextStackSize).toBe(50);
        expect(result.data.enableContextTracking).toBe(true);
        expect(result.data.defaultPrefix).toBe("test");
      }
    });

    it("should validate empty configuration with defaults", () => {
      const emptyConfig = {};
      const result = correlationManagerConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxContextStackSize).toBe(100); // default value
        expect(result.data.enableContextTracking).toBe(true); // default value
      }
    });

    it("should validate configuration without prefix", () => {
      const configWithoutPrefix = {
        maxContextStackSize: 25,
        enableContextTracking: false,
      };

      const result = correlationManagerConfigSchema.safeParse(configWithoutPrefix);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxContextStackSize).toBe(25);
        expect(result.data.enableContextTracking).toBe(false);
      }
    });

    it("should reject invalid manager configuration", () => {
      const invalidConfigs = [
        { maxContextStackSize: -1 }, // negative stack size
        { maxContextStackSize: 0 }, // zero stack size
        { enableContextTracking: "yes" }, // non-boolean
        { defaultPrefix: "" }, // empty prefix
        { maxContextStackSize: "invalid" }, // non-number
        null,
        undefined,
      ];

      invalidConfigs.forEach((config) => {
        const result = correlationManagerConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("correlationConfigSchema", () => {
    it("should validate complete correlation configuration", () => {
      const validConfig = {
        generator: {
          maxEntropyCache: 5000,
          enableCollisionDetection: true,
        },
        manager: {
          maxContextStackSize: 50,
          enableContextTracking: true,
          defaultPrefix: "axon",
        },
      };

      const result = correlationConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.generator?.maxEntropyCache).toBe(5000);
        expect(result.data.manager?.maxContextStackSize).toBe(50);
        expect(result.data.manager?.defaultPrefix).toBe("axon");
      }
    });

    it("should validate minimal correlation configuration", () => {
      const minimalConfig = {
        generator: {
          maxEntropyCache: 1000,
        },
      };

      const result = correlationConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.generator?.maxEntropyCache).toBe(1000);
      }
    });

    it("should validate empty correlation configuration", () => {
      const emptyConfig = {};
      const result = correlationConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);
    });

    it("should reject invalid correlation configuration", () => {
      const invalidConfigs = [
        { generator: { maxEntropyCache: -1 } }, // invalid generator config
        { manager: { maxContextStackSize: 0 } }, // invalid manager config
        null,
        undefined,
      ];

      invalidConfigs.forEach((config) => {
        const result = correlationConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Schema Integration", () => {
    it("should work together for complete validation flow", () => {
      // Test the full validation flow from config to context
      const generatorConfig = {
        maxEntropyCache: 5000,
        enableCollisionDetection: true,
      };

      const generatorResult = correlationGeneratorConfigSchema.safeParse(generatorConfig);
      expect(generatorResult.success).toBe(true);

      const contextData = {
        id: "integration-12345678-1234-4123-8123-123456789012" as CorrelationId,
        createdAt: new Date(),
      };

      const contextResult = correlationContextSchema.safeParse(contextData);
      expect(contextResult.success).toBe(true);

      const partsData = {
        prefix: "integration",
        uuid: "12345678-1234-4123-8123-123456789012",
        timestamp: Date.now(),
      };

      const partsResult = correlationIdPartsSchema.safeParse(partsData);
      expect(partsResult.success).toBe(true);

      if (generatorResult.success && contextResult.success && partsResult.success) {
        expect(generatorResult.data.maxEntropyCache).toBe(5000);
        expect(contextResult.data.id).toBe("integration-12345678-1234-4123-8123-123456789012");
        expect(partsResult.data.prefix).toBe("integration");
      }
    });
  });
});
