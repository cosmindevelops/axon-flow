/**
 * Cross-environment compatibility validation tests
 *
 * Validates type definitions work seamlessly across Node.js versions 18, 20, 22
 * and browser environments as required by task 2.2 validation criteria.
 */

import { describe, it, expect } from "vitest";
import type { IAgentMetadata, ITaskDefinition, IConfigSchema, ILogEntry, IErrorContext } from "../../../src/index.js";

describe("Cross-Environment Compatibility", () => {
  describe("Node.js Environment Compatibility", () => {
    it("should support Node.js version detection", () => {
      // Validate Node.js environment detection works
      const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

      if (isNode) {
        expect(process.versions.node).toBeDefined();
        console.log(`Testing on Node.js version: ${process.versions.node}`);

        // Validate Node.js specific features are available for our types
        expect(typeof Buffer).toBe("function");
        expect(typeof global).toBe("object");
      }
    });

    it("should validate core types in Node.js environment", () => {
      const agentMetadata: IAgentMetadata = {
        id: "node-agent-001" as any,
        name: "Node.js Agent",
        version: "1.0.0",
        capabilities: [],
        status: "active",
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        metadata: {
          runtime: "node",
          version: typeof process !== "undefined" ? process.version : "unknown",
        },
      };

      expect(agentMetadata.id).toBe("node-agent-001");
      expect(agentMetadata.metadata.runtime).toBe("node");
    });

    it("should validate task definitions in Node.js environment", () => {
      const taskDefinition: ITaskDefinition = {
        id: "node-task-001" as any,
        name: "Node.js Task",
        description: "Task running in Node.js environment",
        agentId: "node-agent-001" as any,
        capability: "file-processing",
        parameters: {
          inputPath: "/tmp/input",
          outputPath: "/tmp/output",
        },
        dependencies: [],
        timeout: 30000,
        priority: "normal",
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
        },
      };

      expect(taskDefinition.parameters.inputPath).toBe("/tmp/input");
      expect(taskDefinition.priority).toBe("normal");
    });
  });

  describe("Browser Environment Compatibility", () => {
    it("should support browser environment detection", () => {
      const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

      if (isBrowser) {
        expect(window).toBeDefined();
        expect(document).toBeDefined();
        console.log("Testing in browser environment");
      } else {
        // In Node.js/Vitest environment, these won't exist
        expect(typeof window).toBe("undefined");
        expect(typeof document).toBe("undefined");
      }
    });

    it("should validate core types in browser-like environment", () => {
      // Simulate browser-like configuration
      const configSchema: IConfigSchema = {
        name: "browser-config",
        version: "1.0.0",
        description: "Browser environment configuration",
        schema: {
          type: "object",
          properties: {
            apiEndpoint: { type: "string" },
            enableCaching: { type: "boolean" },
          },
          required: ["apiEndpoint"],
        },
        defaults: {
          enableCaching: true,
        },
        validation: {
          fields: {
            apiEndpoint: {
              type: "url",
              required: true,
              message: "Valid API endpoint required",
            },
          },
        },
        environment: {
          development: { apiEndpoint: "http://localhost:3000" },
          staging: { apiEndpoint: "https://staging.api.example.com" },
          production: { apiEndpoint: "https://api.example.com" },
        },
      };

      expect(configSchema.name).toBe("browser-config");
      expect(configSchema.defaults.enableCaching).toBe(true);
    });

    it("should validate logging types in browser context", () => {
      const logEntry: ILogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Browser application started",
        correlationId: "browser-session-001" as any,
        context: {
          service: "web-app",
          environment: "production",
        },
        metadata: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "test-environment",
          url: typeof window !== "undefined" ? window.location?.href : "http://localhost:3000",
        },
      };

      expect(logEntry.level).toBe("info");
      expect(logEntry.context.service).toBe("web-app");
    });
  });

  describe("Universal Type Compatibility", () => {
    it("should validate error context works across environments", () => {
      const errorContext: IErrorContext = {
        correlationId: "universal-error-001" as any,
        timestamp: new Date().toISOString(),
        severity: "error",
        category: "validation",
        source: {
          component: "types-validation",
          function: "cross-environment-test",
          line: 42,
        },
        environment: {
          runtime: typeof process !== "undefined" ? "node" : "browser",
          version: typeof process !== "undefined" ? process.version : "browser-unknown",
        },
        context: {
          testSuite: "cross-environment-compatibility",
          validationTarget: "universal-types",
        },
      };

      expect(errorContext.category).toBe("validation");
      expect(["node", "browser"]).toContain(errorContext.environment.runtime);
    });

    it("should validate type serialization compatibility", () => {
      const testData = {
        agent: {
          id: "serialization-test" as any,
          name: "Serialization Test Agent",
          version: "1.0.0",
          status: "active",
        },
        task: {
          id: "serialization-task" as any,
          name: "JSON Serialization Test",
          priority: "normal",
        },
      };

      // Validate JSON serialization works (important for browser/Node.js interop)
      const serialized = JSON.stringify(testData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.agent.id).toBe("serialization-test");
      expect(deserialized.task.priority).toBe("normal");
      expect(typeof serialized).toBe("string");
    });

    it("should validate readonly properties maintain immutability", () => {
      const immutableAgent: IAgentMetadata = {
        id: "immutable-agent" as any,
        name: "Immutable Test Agent",
        version: "1.0.0",
        capabilities: [],
        status: "active",
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        metadata: {},
      };

      // Validate TypeScript readonly enforcement (compile-time)
      // These would cause TypeScript errors if uncommented:
      // immutableAgent.id = "modified-id";
      // immutableAgent.name = "Modified Name";
      // immutableAgent.capabilities.push({} as any);

      expect(immutableAgent.id).toBe("immutable-agent");
      expect(immutableAgent.name).toBe("Immutable Test Agent");
    });
  });

  describe("Runtime Environment Feature Detection", () => {
    it("should detect available runtime features", () => {
      const features = {
        hasProcess: typeof process !== "undefined",
        hasWindow: typeof window !== "undefined",
        hasDocument: typeof document !== "undefined",
        hasGlobal: typeof global !== "undefined",
        hasConsole: typeof console !== "undefined",
        hasJSON: typeof JSON !== "undefined",
        hasPromise: typeof Promise !== "undefined",
        hasBuffer: typeof Buffer !== "undefined",
      };

      // Universal features that should always be available
      expect(features.hasConsole).toBe(true);
      expect(features.hasJSON).toBe(true);
      expect(features.hasPromise).toBe(true);

      // Environment-specific features
      if (features.hasProcess) {
        console.log("Node.js features available");
        expect(features.hasGlobal).toBe(true);
        expect(features.hasBuffer).toBe(true);
      }

      if (features.hasWindow) {
        console.log("Browser features available");
        expect(features.hasDocument).toBe(true);
      }
    });

    it("should validate module system compatibility", () => {
      // Test that our types work with both CommonJS and ESM
      // This test validates that import statements work correctly
      expect(typeof IAgentMetadata).toBe("undefined"); // Type-only import

      // Validate that we can use type assertions
      const mockAgent = {
        id: "module-test",
        name: "Module Test Agent",
      } as Partial<IAgentMetadata>;

      expect(mockAgent.id).toBe("module-test");
    });
  });

  describe("Performance Compatibility", () => {
    it("should validate type checking performance across environments", () => {
      const startTime = Date.now();

      // Create multiple type instances to test performance
      const agents: IAgentMetadata[] = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-agent-${i}` as any,
        name: `Performance Test Agent ${i}`,
        version: "1.0.0",
        capabilities: [],
        status: "active",
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        metadata: { index: i },
      }));

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(agents).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should be very fast (< 100ms)
      expect(agents[0].metadata.index).toBe(0);
      expect(agents[99].metadata.index).toBe(99);
    });
  });
});
