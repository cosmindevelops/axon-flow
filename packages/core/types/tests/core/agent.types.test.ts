/**
 * Tests for agent type definitions
 */

import { describe, expect, it } from "vitest";
import type {
  AgentId,
  AgentStatus,
  IAgentCapability,
  IAgentHealth,
  IAgentMetadata,
  IAgentRegistration
} from "../../src/core/agent.types.js";

describe("Agent Types", () => {
  describe("IAgentMetadata", () => {
    it("should accept valid agent metadata", () => {
      const metadata: IAgentMetadata = {
        id: "agent-123" as AgentId,
        name: "TestAgent",
        version: "1.0.0",
        capabilities: [
          {
            name: "processData",
            version: "1.0.0",
            description: "Processes data",
            parameters: [],
            returns: {
              type: "string",
              description: ""
            },
          },
        ],
        status: "active",
        metadata: {
          custom: "value",
        },
        registeredAt: "2024-01-01T00:00:00Z",
        lastHeartbeat: "2024-01-01T00:01:00Z",
      };

      expect(metadata.id).toBeDefined();
      expect(metadata.name).toBe("TestAgent");
      expect(metadata.capabilities).toHaveLength(1);
    });

    it("should work with minimal required fields", () => {
      const minimal: IAgentMetadata = {
        id: "agent-min" as AgentId,
        name: "MinimalAgent",
        version: "1.0.0",
        capabilities: [],
        status: "inactive",
        registeredAt: "2024-01-01T00:00:00Z",
        lastHeartbeat: "2024-01-01T00:00:00Z",
        metadata: {}
      };

      expect(minimal.name).toBe("MinimalAgent");
      expect(minimal.version).toBe("1.0.0");
      expect(minimal.capabilities).toHaveLength(0);
    });
  });

  describe("IAgentCapability", () => {
    it("should define agent capabilities", () => {
      const capability: IAgentCapability = {
        name: "dataTransform",
        version: "2.0.0",
        description: "Transforms data between formats",
        parameters: [
          {
            name: "input",
            type: "object",
            required: true,
            description: "Input data",
          },
          {
            name: "format",
            type: "string",
            required: false,
            description: "Output format",
            defaultValue: "json",
          },
        ],
        returns: {
          type: "object",
          description: "Transformed data",
        },
        timeout: 30000,
        retryable: true,
      };

      expect(capability.parameters).toHaveLength(2);
      expect(capability.parameters[0].required).toBe(true);
      expect(capability.parameters[1].required).toBe(false);
      expect(capability.timeout).toBe(30000);
    });
  });

  describe("IAgentRegistration", () => {
    it("should handle agent registration", () => {
      const registration: IAgentRegistration = {
        name: "RegistrationAgent",
        version: "1.0.0",
        capabilities: [
          {
            name: "register",
            version: "1.0.0",
            description: "Registration capability",
            parameters: [],
            returns: {
              type: "boolean",
              description: ""
            },
          },
        ],
        metadata: {
          region: "us-east-1",
          zone: "availability-zone-1",
        },
      };

      expect(registration.name).toBe("RegistrationAgent");
      expect(registration.version).toBe("1.0.0");
      expect(registration.metadata?.region).toBe("us-east-1");
    });
  });

  describe("IAgentHealth", () => {
    it("should track agent health status", () => {
      const health: IAgentHealth = {
        agentId: "agent-health" as AgentId,
        status: "active",
        lastHeartbeat: "2024-01-01T00:00:00Z",
        metrics: {
          requestsPerSecond: 100,
          errorRate: 0.01,
          avgResponseTime: 45.5,
          cpuUsage: 50,
          memoryUsage: 512,
          activeTasks: 5,
          completedTasks: 100,
          failedTasks: 1,
          avgExecutionTime: 200,
        },
      };

      expect(health.status).toBe("active");
      expect(health.metrics?.avgResponseTime).toBe(45.5);
      expect(health.metrics?.requestsPerSecond).toBe(100);
      expect(health.metrics?.errorRate).toBe(0.01);
    });
  });

  describe("Type aliases", () => {
    it("should use agent status values", () => {
      const statuses: AgentStatus[] = ["active", "inactive", "registering", "error", "disconnected"];

      statuses.forEach(status => {
        expect(["active", "inactive", "registering", "error", "disconnected"]).toContain(status);
      });
    });
  });
});
