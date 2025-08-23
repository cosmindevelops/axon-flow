/**
 * Unit tests for correlation types
 */

import { describe, it, expect } from "vitest";
import type {
  CorrelationId,
  CorrelationIdParts,
  CorrelationContext,
  CorrelationGeneratorConfig,
  CorrelationManagerConfig,
  ICorrelationIdGenerator,
  ICorrelationManager,
} from "../../../src/correlation/core/core.types.js";

describe("Correlation Types", () => {
  describe("CorrelationId", () => {
    it("should be a string type", () => {
      const correlationId: CorrelationId = "test-correlation-id";
      expect(typeof correlationId).toBe("string");
    });

    it("should accept branded string values", () => {
      const id = "correlation-123" as CorrelationId;
      const testFn = (cid: CorrelationId) => cid;
      expect(testFn(id)).toBe("correlation-123");
    });
  });

  describe("CorrelationIdParts", () => {
    it("should have required properties", () => {
      const parts: CorrelationIdParts = {
        correlationId: "test-id" as CorrelationId,
        prefix: "test",
        timestamp: new Date(),
        nodeId: "node-123",
        sequence: 1,
      };

      expect(parts.correlationId).toBeDefined();
      expect(parts.prefix).toBeDefined();
      expect(parts.timestamp).toBeInstanceOf(Date);
      expect(parts.nodeId).toBeDefined();
      expect(parts.sequence).toBeTypeOf("number");
    });

    it("should support optional properties", () => {
      const minimalParts: CorrelationIdParts = {
        correlationId: "test-id" as CorrelationId,
      };

      expect(minimalParts.correlationId).toBeDefined();
      expect(minimalParts.prefix).toBeUndefined();
    });
  });

  describe("CorrelationContext", () => {
    it("should have required properties", () => {
      const context: CorrelationContext = {
        correlationId: "test-id" as CorrelationId,
        timestamp: new Date(),
        depth: 0,
      };

      expect(context.correlationId).toBeDefined();
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.depth).toBeTypeOf("number");
    });

    it("should support optional properties", () => {
      const contextWithParent: CorrelationContext = {
        correlationId: "child-id" as CorrelationId,
        timestamp: new Date(),
        depth: 1,
        parentId: "parent-id" as CorrelationId,
        metadata: { service: "test-service" },
      };

      expect(contextWithParent.parentId).toBeDefined();
      expect(contextWithParent.metadata).toBeDefined();
      expect(contextWithParent.metadata?.service).toBe("test-service");
    });

    it("should support nested context hierarchy", () => {
      const rootContext: CorrelationContext = {
        correlationId: "root-id" as CorrelationId,
        timestamp: new Date(),
        depth: 0,
      };

      const childContext: CorrelationContext = {
        correlationId: "child-id" as CorrelationId,
        timestamp: new Date(),
        depth: 1,
        parentId: rootContext.correlationId,
      };

      const grandChildContext: CorrelationContext = {
        correlationId: "grandchild-id" as CorrelationId,
        timestamp: new Date(),
        depth: 2,
        parentId: childContext.correlationId,
      };

      expect(rootContext.depth).toBe(0);
      expect(childContext.depth).toBe(1);
      expect(grandChildContext.depth).toBe(2);
      expect(childContext.parentId).toBe(rootContext.correlationId);
      expect(grandChildContext.parentId).toBe(childContext.correlationId);
    });
  });

  describe("CorrelationGeneratorConfig", () => {
    it("should support all optional properties", () => {
      const config: CorrelationGeneratorConfig = {
        prefix: "axon",
        timestampEnabled: true,
        nodeIdEnabled: true,
        sequenceEnabled: false,
      };

      expect(config.prefix).toBe("axon");
      expect(config.timestampEnabled).toBe(true);
      expect(config.nodeIdEnabled).toBe(true);
      expect(config.sequenceEnabled).toBe(false);
    });

    it("should allow empty configuration", () => {
      const config: CorrelationGeneratorConfig = {};
      expect(config).toBeDefined();
      expect(Object.keys(config).length).toBe(0);
    });
  });

  describe("CorrelationManagerConfig", () => {
    it("should require generator property", () => {
      const mockGenerator = {} as ICorrelationIdGenerator;
      const config: CorrelationManagerConfig = {
        generator: mockGenerator,
      };

      expect(config.generator).toBeDefined();
    });

    it("should support optional properties", () => {
      const mockGenerator = {} as ICorrelationIdGenerator;
      const config: CorrelationManagerConfig = {
        generator: mockGenerator,
        contextTimeout: 30000,
        maxContextDepth: 10,
        enableMetrics: true,
      };

      expect(config.contextTimeout).toBe(30000);
      expect(config.maxContextDepth).toBe(10);
      expect(config.enableMetrics).toBe(true);
    });
  });

  describe("ICorrelationIdGenerator interface", () => {
    it("should define required methods", () => {
      const mockGenerator: ICorrelationIdGenerator = {
        generate: () => "test-id" as CorrelationId,
        validate: (id: CorrelationId) => true,
        parse: (id: CorrelationId) => ({ correlationId: id }),
      };

      expect(typeof mockGenerator.generate).toBe("function");
      expect(typeof mockGenerator.validate).toBe("function");
      expect(typeof mockGenerator.parse).toBe("function");
    });

    it("should support method signatures", () => {
      const mockGenerator: ICorrelationIdGenerator = {
        generate: () => "generated-id" as CorrelationId,
        validate: (id: CorrelationId) => id.length > 0,
        parse: (id: CorrelationId) => ({
          correlationId: id,
          timestamp: new Date(),
        }),
      };

      const id = mockGenerator.generate();
      const isValid = mockGenerator.validate(id);
      const parts = mockGenerator.parse(id);

      expect(id).toBe("generated-id");
      expect(isValid).toBe(true);
      expect(parts.correlationId).toBe(id);
    });
  });

  describe("ICorrelationManager interface", () => {
    it("should define required methods", () => {
      const mockManager: ICorrelationManager = {
        create: async (id?: CorrelationId) => ({
          correlationId: id || ("new-id" as CorrelationId),
          timestamp: new Date(),
          depth: 0,
        }),
        get: () => undefined,
        run: async (fn: () => Promise<any>, id?: CorrelationId) => await fn(),
        clear: () => {},
        bind: (fn: () => any) => fn,
      };

      expect(typeof mockManager.create).toBe("function");
      expect(typeof mockManager.get).toBe("function");
      expect(typeof mockManager.run).toBe("function");
      expect(typeof mockManager.clear).toBe("function");
      expect(typeof mockManager.bind).toBe("function");
    });

    it("should support async method signatures", async () => {
      const mockContext: CorrelationContext = {
        correlationId: "test-id" as CorrelationId,
        timestamp: new Date(),
        depth: 0,
      };

      const mockManager: ICorrelationManager = {
        create: async (id?: CorrelationId) => mockContext,
        get: () => mockContext,
        run: async <T>(fn: () => Promise<T>, id?: CorrelationId) => await fn(),
        clear: () => {},
        bind: <T>(fn: () => T) => fn,
      };

      const context = await mockManager.create();
      const result = await mockManager.run(async () => "test-result");
      const boundFn = mockManager.bind(() => "bound-result");

      expect(context).toEqual(mockContext);
      expect(result).toBe("test-result");
      expect(boundFn()).toBe("bound-result");
    });
  });
});
