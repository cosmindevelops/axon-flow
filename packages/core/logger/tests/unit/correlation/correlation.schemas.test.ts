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
    it("should validate valid correlation ID strings", () => {
      const validIds = [
        "correlation-123",
        "axon-2024-01-01-abc123",
        "simple-id",
        "complex-correlation-id-with-multiple-parts",
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
      ];

      invalidIds.forEach((id) => {
        const result = correlationIdSchema.safeParse(id);
        expect(result.success).toBe(false);
      });
    });

    it("should enforce minimum length requirements", () => {
      const result = correlationIdSchema.safeParse("a");
      expect(result.success).toBe(false);
    });

    it("should enforce maximum length limits", () => {
      const longId = "x".repeat(1000);
      const result = correlationIdSchema.safeParse(longId);
      expect(result.success).toBe(false);
    });
  });

  describe("correlationIdPartsSchema", () => {
    it("should validate valid correlation ID parts", () => {
      const validParts = {
        correlationId: "test-id" as CorrelationId,
        prefix: "axon",
        timestamp: new Date(),
        nodeId: "node-123",
        sequence: 42,
      };

      const result = correlationIdPartsSchema.safeParse(validParts);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.correlationId).toBe(validParts.correlationId);
        expect(result.data.prefix).toBe(validParts.prefix);
        expect(result.data.timestamp).toBeInstanceOf(Date);
        expect(result.data.nodeId).toBe(validParts.nodeId);
        expect(result.data.sequence).toBe(validParts.sequence);
      }
    });

    it("should validate minimal correlation ID parts", () => {
      const minimalParts = {
        correlationId: "minimal-id" as CorrelationId,
      };

      const result = correlationIdPartsSchema.safeParse(minimalParts);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.correlationId).toBe(minimalParts.correlationId);
      }
    });

    it("should reject invalid correlation ID parts", () => {
      const invalidParts = [
        {}, // missing correlationId
        { correlationId: "" }, // empty correlationId
        { correlationId: "valid-id", timestamp: "invalid-date" }, // invalid timestamp
        { correlationId: "valid-id", sequence: -1 }, // negative sequence
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
        correlationId: "test-id" as CorrelationId,
        prefix: undefined, // explicitly undefined optional field
        timestamp: new Date(),
      };

      const result = correlationIdPartsSchema.safeParse(partsWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("correlationContextSchema", () => {
    it("should validate valid correlation context", () => {
      const validContext = {
        correlationId: "context-id" as CorrelationId,
        timestamp: new Date(),
        depth: 0,
      };

      const result = correlationContextSchema.safeParse(validContext);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.correlationId).toBe(validContext.correlationId);
        expect(result.data.timestamp).toBeInstanceOf(Date);
        expect(result.data.depth).toBe(0);
      }
    });

    it("should validate context with parent and metadata", () => {
      const contextWithExtras = {
        correlationId: "child-id" as CorrelationId,
        timestamp: new Date(),
        depth: 1,
        parentId: "parent-id" as CorrelationId,
        metadata: {
          service: "test-service",
          operation: "test-operation",
          userId: "user-123",
        },
      };

      const result = correlationContextSchema.safeParse(contextWithExtras);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentId).toBe(contextWithExtras.parentId);
        expect(result.data.metadata).toEqual(contextWithExtras.metadata);
      }
    });

    it("should reject invalid correlation context", () => {
      const invalidContexts = [
        {}, // missing required fields
        { correlationId: "valid-id" }, // missing timestamp and depth
        { correlationId: "valid-id", timestamp: new Date(), depth: -1 }, // negative depth
        { correlationId: "", timestamp: new Date(), depth: 0 }, // empty correlationId
        null,
        undefined,
      ];

      invalidContexts.forEach((context) => {
        const result = correlationContextSchema.safeParse(context);
        expect(result.success).toBe(false);
      });
    });

    it("should enforce depth constraints", () => {
      const deepContext = {
        correlationId: "deep-id" as CorrelationId,
        timestamp: new Date(),
        depth: 1000, // very deep nesting
      };

      const result = correlationContextSchema.safeParse(deepContext);
      expect(result.success).toBe(false); // Should reject excessive depth
    });
  });

  describe("correlationGeneratorConfigSchema", () => {
    it("should validate valid generator configuration", () => {
      const validConfig = {
        prefix: "axon",
        timestampEnabled: true,
        nodeIdEnabled: false,
        sequenceEnabled: true,
      };

      const result = correlationGeneratorConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it("should validate empty configuration", () => {
      const emptyConfig = {};
      const result = correlationGeneratorConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);
    });

    it("should validate partial configuration", () => {
      const partialConfig = {
        prefix: "test",
        timestampEnabled: true,
      };

      const result = correlationGeneratorConfigSchema.safeParse(partialConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prefix).toBe("test");
        expect(result.data.timestampEnabled).toBe(true);
      }
    });

    it("should reject invalid configuration values", () => {
      const invalidConfigs = [
        { prefix: "" }, // empty prefix
        { timestampEnabled: "yes" }, // non-boolean
        { nodeIdEnabled: 1 }, // non-boolean
        { sequenceEnabled: null }, // null instead of boolean
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
    const mockGenerator = {
      generate: () => "test-id" as CorrelationId,
      validate: () => true,
      parse: () => ({ correlationId: "test-id" as CorrelationId }),
    };

    it("should validate valid manager configuration", () => {
      const validConfig = {
        generator: mockGenerator,
        contextTimeout: 30000,
        maxContextDepth: 10,
        enableMetrics: true,
      };

      const result = correlationManagerConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.generator).toBe(mockGenerator);
        expect(result.data.contextTimeout).toBe(30000);
        expect(result.data.maxContextDepth).toBe(10);
        expect(result.data.enableMetrics).toBe(true);
      }
    });

    it("should validate minimal manager configuration", () => {
      const minimalConfig = {
        generator: mockGenerator,
      };

      const result = correlationManagerConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.generator).toBe(mockGenerator);
      }
    });

    it("should reject invalid manager configuration", () => {
      const invalidConfigs = [
        {}, // missing generator
        { generator: null }, // null generator
        { generator: mockGenerator, contextTimeout: -1 }, // negative timeout
        { generator: mockGenerator, maxContextDepth: 0 }, // zero max depth
        { generator: mockGenerator, enableMetrics: "yes" }, // non-boolean metrics
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
      const mockGenerator = {
        generate: () => "test-id" as CorrelationId,
        validate: () => true,
        parse: () => ({ correlationId: "test-id" as CorrelationId }),
      };

      const validConfig = {
        generator: {
          prefix: "axon",
          timestampEnabled: true,
          nodeIdEnabled: true,
        },
        manager: {
          generator: mockGenerator,
          contextTimeout: 60000,
          maxContextDepth: 5,
        },
      };

      const result = correlationConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.generator).toEqual(validConfig.generator);
        expect(result.data.manager.generator).toBe(mockGenerator);
      }
    });

    it("should validate minimal correlation configuration", () => {
      const mockGenerator = {
        generate: () => "test-id" as CorrelationId,
        validate: () => true,
        parse: () => ({ correlationId: "test-id" as CorrelationId }),
      };

      const minimalConfig = {
        manager: {
          generator: mockGenerator,
        },
      };

      const result = correlationConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });

    it("should reject invalid correlation configuration", () => {
      const invalidConfigs = [
        {}, // completely empty
        { generator: { prefix: "" } }, // invalid generator config
        { manager: {} }, // manager without generator
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
        prefix: "integration",
        timestampEnabled: true,
      };

      const generatorResult = correlationGeneratorConfigSchema.safeParse(generatorConfig);
      expect(generatorResult.success).toBe(true);

      const contextData = {
        correlationId: "integration-test-id" as CorrelationId,
        timestamp: new Date(),
        depth: 0,
      };

      const contextResult = correlationContextSchema.safeParse(contextData);
      expect(contextResult.success).toBe(true);

      if (generatorResult.success && contextResult.success) {
        expect(generatorResult.data.prefix).toBe("integration");
        expect(contextResult.data.correlationId).toBe("integration-test-id");
      }
    });
  });
});
