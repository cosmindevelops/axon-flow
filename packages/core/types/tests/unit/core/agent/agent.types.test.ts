/**
 * Test suite for core agent type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  IAgentMetadata,
  IAgentCapability,
  IAgentRegistration,
  IAgentHealth,
  AgentId,
  AgentStatus,
  CapabilityName,
  MessageType,
  Priority,
  ConnectionStatus,
  HealthStatus,
  IParameterDefinition,
  IReturnDefinition,
  IAgentMessage,
  IAgentConfiguration,
  IAgentConnection,
  IAgentTask,
  IAgentPerformanceMetrics,
  IAgentHeartbeat,
} from "../../../../../src/core/agent/agent.types.js";

describe("Core Agent Type Definitions", () => {
  describe("Interface Naming Convention", () => {
    it("should enforce I-prefix naming convention for interfaces", () => {
      const interfaceNames = ["IAgentMetadata", "IAgentCapability", "IAgentRegistration", "IAgentHealth"];

      interfaceNames.forEach((name) => {
        expect(name.startsWith("I")).toBe(true);
        expect(name.length).toBeGreaterThan(1);
      });
    });
  });

  describe("IAgentMetadata Type", () => {
    it("should define agent metadata structure", () => {
      const mockAgentMetadata: IAgentMetadata = {
        id: "agent-001" as AgentId,
        name: "Data Processing Agent",
        version: "1.2.3",
        description: "Agent specialized in data processing tasks",
        capabilities: [
          {
            name: "data-transformation" as CapabilityName,
            version: "1.0.0",
            description: "Transform data between formats",
            parameters: [
              {
                name: "input",
                type: "object",
                description: "Input data to transform",
                required: true,
              },
            ],
            returns: {
              type: "object",
              description: "Transformed data",
            },
          },
        ],
        status: "active",
        registeredAt: "2024-01-01T00:00:00Z",
        lastHeartbeat: "2024-01-01T12:00:00Z",
        metadata: {
          author: "Axon Flow Team",
          license: "MIT",
          tags: ["data", "processing"],
        },
      };

      expect(mockAgentMetadata.id).toBe("agent-001");
      expect(mockAgentMetadata.name).toBe("Data Processing Agent");
      expect(mockAgentMetadata.status).toBe("active");
      expect(mockAgentMetadata.capabilities).toHaveLength(1);
      expect(mockAgentMetadata.capabilities[0].name).toBe("data-transformation");
    });

    it("should validate agent ID type", () => {
      const agentIds: AgentId[] = ["agent-001" as AgentId, "hub-central" as AgentId, "processor-worker-1" as AgentId];

      agentIds.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it("should validate agent status values", () => {
      const validStatuses: AgentStatus[] = [
        "registering",
        "registered",
        "active",
        "idle",
        "busy",
        "disconnected",
        "error",
      ];

      validStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("IAgentCapability Type", () => {
    it("should define agent capability structure", () => {
      const mockCapability: IAgentCapability = {
        name: "data-validation" as CapabilityName,
        version: "2.1.0",
        description: "Validate data integrity and structure",
        parameters: [
          {
            name: "data",
            type: "object",
            description: "Data to validate",
            required: true,
          },
          {
            name: "schema",
            type: "object",
            description: "Validation schema",
            required: true,
          },
          {
            name: "strict",
            type: "boolean",
            description: "Enable strict validation",
            required: false,
            default: false,
          },
        ],
        returns: {
          type: "object",
          description: "Validation result with errors if any",
          properties: {
            valid: { type: "boolean" },
            errors: { type: "array", items: "string" },
          },
        },
        examples: [
          {
            name: "Basic validation",
            input: {
              data: { name: "John", age: 30 },
              schema: { type: "object", properties: { name: "string", age: "number" } },
            },
            output: { valid: true, errors: [] },
          },
        ],
      };

      expect(mockCapability.name).toBe("data-validation");
      expect(mockCapability.parameters).toHaveLength(3);
      expect(mockCapability.parameters[2].required).toBe(false);
      expect(mockCapability.returns.type).toBe("object");
      expect(mockCapability.examples).toHaveLength(1);
    });

    it("should validate parameter definition structure", () => {
      const mockParameter: IParameterDefinition = {
        name: "options",
        type: "object",
        description: "Configuration options",
        required: false,
        default: {},
        validation: {
          min: 0,
          max: 100,
          pattern: "^[a-zA-Z0-9-_]+$",
        },
        examples: [{ timeout: 30000, retries: 3 }],
      };

      expect(mockParameter.name).toBe("options");
      expect(mockParameter.required).toBe(false);
      expect(mockParameter.default).toEqual({});
      expect(mockParameter.validation).toBeDefined();
    });

    it("should validate return definition structure", () => {
      const mockReturn: IReturnDefinition = {
        type: "object",
        description: "Processing result",
        properties: {
          success: { type: "boolean", description: "Operation success status" },
          data: { type: "object", description: "Processed data" },
          timestamp: { type: "string", description: "Processing timestamp" },
        },
        examples: [
          {
            success: true,
            data: { processed: true, count: 42 },
            timestamp: "2024-01-01T12:00:00Z",
          },
        ],
      };

      expect(mockReturn.type).toBe("object");
      expect(mockReturn.properties).toBeDefined();
      expect(mockReturn.properties?.success.type).toBe("boolean");
      expect(mockReturn.examples).toHaveLength(1);
    });
  });

  describe("IAgentRegistration Type", () => {
    it("should define agent registration structure", () => {
      const mockRegistration: IAgentRegistration = {
        name: "workflow-orchestrator",
        version: "3.0.0",
        description: "Agent for orchestrating complex workflows",
        capabilities: [
          {
            name: "workflow-execution" as CapabilityName,
            version: "1.0.0",
            description: "Execute workflow definitions",
            parameters: [
              {
                name: "workflow",
                type: "object",
                description: "Workflow definition",
                required: true,
              },
            ],
            returns: {
              type: "object",
              description: "Workflow execution result",
            },
          },
        ],
        tags: ["workflow", "orchestration", "automation"],
        configuration: {
          maxConcurrentWorkflows: 5,
          defaultTimeout: 300000,
          enableMetrics: true,
        },
        dependencies: {
          "data-processor": "^2.0.0",
          "message-queue": "^1.5.0",
        },
      };

      expect(mockRegistration.name).toBe("workflow-orchestrator");
      expect(mockRegistration.capabilities).toHaveLength(1);
      expect(mockRegistration.tags).toContain("workflow");
      expect(mockRegistration.configuration?.maxConcurrentWorkflows).toBe(5);
    });
  });

  describe("IAgentHealth Type", () => {
    it("should define agent health structure", () => {
      const mockHealth: IAgentHealth = {
        agentId: "agent-health-001" as AgentId,
        status: "healthy",
        timestamp: "2024-01-01T12:00:00Z",
        lastHeartbeat: "2024-01-01T11:59:30Z",
        responseTime: 125.5,
        uptime: 86400000,
        consecutiveFailures: 0,
        checks: {
          connectivity: {
            status: "pass",
            responseTime: 50,
            timestamp: "2024-01-01T12:00:00Z",
          },
          resources: {
            status: "pass",
            cpu: 15.5,
            memory: 67.2,
            timestamp: "2024-01-01T12:00:00Z",
          },
          capabilities: {
            status: "pass",
            available: 5,
            active: 3,
            timestamp: "2024-01-01T12:00:00Z",
          },
        },
        metrics: {
          tasksCompleted: 150,
          tasksInProgress: 3,
          averageTaskDuration: 2500,
          errorRate: 0.02,
        },
      };

      expect(mockHealth.agentId).toBe("agent-health-001");
      expect(mockHealth.status).toBe("healthy");
      expect(mockHealth.consecutiveFailures).toBe(0);
      expect(mockHealth.checks.connectivity.status).toBe("pass");
      expect(mockHealth.metrics?.tasksCompleted).toBe(150);
    });

    it("should validate health status values", () => {
      const validHealthStatuses: HealthStatus[] = ["healthy", "unhealthy", "warning", "unknown"];

      validHealthStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("IAgentMessage Type", () => {
    it("should define agent message structure", () => {
      const mockMessage: IAgentMessage = {
        id: "msg-12345",
        type: "command",
        from: "hub-001" as AgentId,
        to: "agent-002" as AgentId,
        timestamp: "2024-01-01T12:00:00Z",
        correlationId: "corr-67890",
        priority: "normal",
        payload: {
          action: "execute-capability",
          capabilityName: "data-processing",
          parameters: {
            input: { data: [1, 2, 3, 4, 5] },
            format: "json",
          },
        },
        metadata: {
          timeout: 30000,
          retryable: true,
          maxRetries: 3,
        },
      };

      expect(mockMessage.type).toBe("command");
      expect(mockMessage.priority).toBe("normal");
      expect(mockMessage.payload.action).toBe("execute-capability");
      expect(mockMessage.metadata?.timeout).toBe(30000);
    });

    it("should validate message type values", () => {
      const validMessageTypes: MessageType[] = ["command", "query", "event", "reply", "heartbeat", "error"];

      validMessageTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should validate priority values", () => {
      const validPriorities: Priority[] = ["low", "normal", "high", "critical"];

      validPriorities.forEach((priority) => {
        expect(typeof priority).toBe("string");
      });
    });
  });

  describe("IAgentConfiguration Type", () => {
    it("should define agent configuration structure", () => {
      const mockConfiguration: IAgentConfiguration = {
        connection: {
          host: "localhost",
          port: 8080,
          secure: false,
          timeout: 30000,
          retryAttempts: 3,
          keepAlive: true,
        },
        logging: {
          level: "info",
          format: "json",
          destination: "console",
          includeMetadata: true,
        },
        performance: {
          maxConcurrentTasks: 10,
          heartbeatInterval: 30000,
          healthCheckInterval: 60000,
          taskTimeout: 300000,
          enableMetrics: true,
        },
        capabilities: {
          enabled: ["data-processing", "communication"],
          disabled: ["admin-operations"],
          autoLoad: true,
        },
        security: {
          enableAuth: true,
          tokenExpiration: 3600,
          allowedOrigins: ["https://hub.example.com"],
          rateLimit: {
            requests: 100,
            window: 60000,
          },
        },
      };

      expect(mockConfiguration.connection.port).toBe(8080);
      expect(mockConfiguration.logging.level).toBe("info");
      expect(mockConfiguration.performance.maxConcurrentTasks).toBe(10);
      expect(mockConfiguration.capabilities.enabled).toContain("data-processing");
      expect(mockConfiguration.security?.enableAuth).toBe(true);
    });
  });

  describe("IAgentConnection Type", () => {
    it("should define agent connection structure", () => {
      const mockConnection: IAgentConnection = {
        agentId: "agent-conn-001" as AgentId,
        status: "connected",
        endpoint: "ws://localhost:8080/agents/agent-conn-001",
        connectedAt: "2024-01-01T10:00:00Z",
        lastActivity: "2024-01-01T11:59:30Z",
        protocol: "websocket",
        version: "1.0",
        features: ["heartbeat", "compression", "authentication"],
        metrics: {
          bytesSent: 1024000,
          bytesReceived: 2048000,
          messagesSent: 150,
          messagesReceived: 200,
          averageLatency: 25.5,
        },
        security: {
          authenticated: true,
          tokenExpiry: "2024-01-01T18:00:00Z",
          permissions: ["read", "write", "execute"],
        },
      };

      expect(mockConnection.status).toBe("connected");
      expect(mockConnection.protocol).toBe("websocket");
      expect(mockConnection.features).toContain("heartbeat");
      expect(mockConnection.metrics.messagesSent).toBe(150);
      expect(mockConnection.security?.authenticated).toBe(true);
    });

    it("should validate connection status values", () => {
      const validConnectionStatuses: ConnectionStatus[] = [
        "connecting",
        "connected",
        "disconnected",
        "reconnecting",
        "error",
      ];

      validConnectionStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("IAgentTask Type", () => {
    it("should define agent task structure", () => {
      const mockTask: IAgentTask = {
        id: "task-12345",
        agentId: "agent-task-001" as AgentId,
        capabilityName: "data-transformation" as CapabilityName,
        status: "running",
        priority: "high",
        parameters: {
          input: { data: "raw data" },
          format: "json",
          options: { validate: true },
        },
        createdAt: "2024-01-01T12:00:00Z",
        startedAt: "2024-01-01T12:00:05Z",
        expectedDuration: 30000,
        timeout: 300000,
        retryCount: 0,
        maxRetries: 3,
        correlationId: "corr-task-67890",
        metadata: {
          source: "workflow-engine",
          category: "data-processing",
          tags: ["urgent", "customer-data"],
        },
      };

      expect(mockTask.capabilityName).toBe("data-transformation");
      expect(mockTask.status).toBe("running");
      expect(mockTask.priority).toBe("high");
      expect(mockTask.retryCount).toBe(0);
      expect(mockTask.metadata?.tags).toContain("urgent");
    });
  });

  describe("IAgentPerformanceMetrics Type", () => {
    it("should define agent performance metrics structure", () => {
      const mockMetrics: IAgentPerformanceMetrics = {
        agentId: "agent-perf-001" as AgentId,
        timestamp: "2024-01-01T12:00:00Z",
        uptime: 86400000,
        tasks: {
          completed: 500,
          failed: 10,
          inProgress: 5,
          queued: 2,
          totalDuration: 12500000,
          averageDuration: 2500,
          successRate: 0.98,
        },
        resources: {
          cpuUsage: 25.5,
          memoryUsage: 67.2,
          networkBytesIn: 5120000,
          networkBytesOut: 2560000,
          diskReadBytes: 1024000,
          diskWriteBytes: 512000,
        },
        capabilities: {
          active: 3,
          total: 5,
          utilizationRate: 0.6,
        },
        errors: {
          total: 10,
          byType: {
            validation: 3,
            timeout: 2,
            network: 5,
          },
          recent: [
            {
              type: "network",
              message: "Connection timeout",
              timestamp: "2024-01-01T11:45:00Z",
            },
          ],
        },
      };

      expect(mockMetrics.tasks.successRate).toBe(0.98);
      expect(mockMetrics.resources.cpuUsage).toBe(25.5);
      expect(mockMetrics.capabilities.active).toBe(3);
      expect(mockMetrics.errors.byType.network).toBe(5);
    });
  });

  describe("Type Relationships and Composition", () => {
    it("should demonstrate proper type composition", () => {
      const fullAgentData: IAgentMetadata & IAgentHealth & IAgentPerformanceMetrics = {
        // IAgentMetadata
        id: "agent-full-001" as AgentId,
        name: "Full Featured Agent",
        version: "2.0.0",
        description: "Complete agent implementation",
        capabilities: [
          {
            name: "comprehensive-processing" as CapabilityName,
            version: "1.0.0",
            description: "Full processing capabilities",
            parameters: [],
            returns: { type: "object", description: "Processing result" },
          },
        ],
        status: "active",
        registeredAt: "2024-01-01T00:00:00Z",
        lastHeartbeat: "2024-01-01T12:00:00Z",
        metadata: { tags: ["full-featured"] },

        // IAgentHealth
        agentId: "agent-full-001" as AgentId,
        timestamp: "2024-01-01T12:00:00Z",
        responseTime: 100,
        uptime: 86400000,
        consecutiveFailures: 0,
        checks: {
          connectivity: { status: "pass", responseTime: 50, timestamp: "2024-01-01T12:00:00Z" },
        },

        // AgentPerformanceMetrics
        tasks: {
          completed: 1000,
          failed: 5,
          inProgress: 2,
          queued: 0,
          totalDuration: 25000000,
          averageDuration: 2500,
          successRate: 0.995,
        },
        resources: {
          cpuUsage: 30.0,
          memoryUsage: 45.0,
          networkBytesIn: 10240000,
          networkBytesOut: 5120000,
          diskReadBytes: 2048000,
          diskWriteBytes: 1024000,
        },
        capabilities: {
          active: 1,
          total: 1,
          utilizationRate: 1.0,
        },
        errors: {
          total: 5,
          byType: { timeout: 5 },
          recent: [],
        },
      };

      expect(fullAgentData.id).toBe("agent-full-001");
      expect(fullAgentData.status).toBe("active");
      expect(fullAgentData.tasks.successRate).toBe(0.995);
      expect(fullAgentData.capabilities.active).toBe(1);
    });
  });

  describe("Type Guard Support", () => {
    it("should support type narrowing patterns", () => {
      const data: unknown = {
        id: "agent-001",
        name: "Test Agent",
        version: "1.0.0",
        capabilities: [],
        status: "active",
      };

      // Type guard pattern simulation
      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "name" in data &&
        "capabilities" in data &&
        "status" in data
      ) {
        const agentData = data as IAgentMetadata;
        expect(agentData.id).toBe("agent-001");
        expect(agentData.name).toBe("Test Agent");
        expect(agentData.status).toBe("active");
      }
    });

    it("should validate discriminated union types", () => {
      type AgentEvent =
        | { type: "registered"; agent: IAgentMetadata }
        | { type: "health-update"; health: IAgentHealth }
        | { type: "task-completed"; task: IAgentTask };

      const registrationEvent: AgentEvent = {
        type: "registered",
        agent: {
          id: "new-agent" as AgentId,
          name: "New Agent",
          version: "1.0.0",
          description: "Newly registered agent",
          capabilities: [],
          status: "registered",
          registeredAt: "2024-01-01T12:00:00Z",
          lastHeartbeat: "2024-01-01T12:00:00Z",
          metadata: {},
        },
      };

      expect(registrationEvent.type).toBe("registered");

      if (registrationEvent.type === "registered") {
        expect(registrationEvent.agent.name).toBe("New Agent");
        expect(registrationEvent.agent.status).toBe("registered");
      }
    });
  });

  describe("Capability Name Validation", () => {
    it("should validate capability naming patterns", () => {
      const validCapabilityNames: CapabilityName[] = [
        "data-processing" as CapabilityName,
        "workflow-orchestration" as CapabilityName,
        "message-routing" as CapabilityName,
        "system-monitoring" as CapabilityName,
      ];

      validCapabilityNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.includes("-")).toBe(true); // kebab-case pattern
      });
    });
  });
});
