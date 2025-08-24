/**
 * Test suite for core message type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  IMessage,
  ICommand,
  IQuery,
  IEvent,
  IReply,
  IErrorMessage,
  MessageId,
  CorrelationId,
  MessageType,
  Priority,
  MessageMetadata,
  CommandPayload,
  QueryPayload,
  EventPayload,
  ReplyPayload,
  ErrorPayload,
  MessageRouting,
  MessageFilter,
  MessageHandler,
  MessageBus,
  MessageQueue,
  RoutingRule,
  MessageSerializer,
} from "../../../../../src/core/message/message.types.js";

describe("Core Message Type Definitions", () => {
  describe("Interface Naming Convention", () => {
    it("should enforce I-prefix naming convention for interfaces", () => {
      const interfaceNames = ["IMessage", "ICommand", "IQuery", "IEvent", "IReply", "IErrorMessage"];

      interfaceNames.forEach((name) => {
        expect(name.startsWith("I")).toBe(true);
        expect(name.length).toBeGreaterThan(1);
      });
    });
  });

  describe("IMessage Type", () => {
    it("should define base message structure", () => {
      const mockMessage: IMessage = {
        id: "msg-12345" as MessageId,
        correlationId: "corr-67890" as CorrelationId,
        type: "command",
        payload: {
          action: "execute-task",
          parameters: { input: "test-data" },
        },
        metadata: {
          source: "hub-001",
          destination: "agent-002",
          priority: "normal",
          timestamp: "2024-01-01T12:00:00Z",
          timeout: 30000,
          retryable: true,
          maxRetries: 3,
        },
        timestamp: "2024-01-01T12:00:00Z",
      };

      expect(mockMessage.id).toBe("msg-12345");
      expect(mockMessage.correlationId).toBe("corr-67890");
      expect(mockMessage.type).toBe("command");
      expect(mockMessage.payload.action).toBe("execute-task");
      expect(mockMessage.metadata.priority).toBe("normal");
    });

    it("should validate message ID type", () => {
      const messageIds: MessageId[] = [
        "msg-001" as MessageId,
        "cmd-12345" as MessageId,
        "evt-system-startup" as MessageId,
      ];

      messageIds.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it("should validate correlation ID type", () => {
      const correlationIds: CorrelationId[] = [
        "corr-001" as CorrelationId,
        "trace-workflow-123" as CorrelationId,
        "session-user-456" as CorrelationId,
      ];

      correlationIds.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it("should validate message type values", () => {
      const validMessageTypes: MessageType[] = ["command", "query", "event", "reply", "error", "heartbeat"];

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

  describe("ICommand Type", () => {
    it("should define command message structure", () => {
      const mockCommand: ICommand = {
        id: "cmd-12345" as MessageId,
        correlationId: "corr-67890" as CorrelationId,
        type: "command",
        payload: {
          action: "execute-capability",
          parameters: {
            capabilityName: "data-transformation",
            input: { data: [1, 2, 3, 4, 5] },
            options: { format: "json", validate: true },
          },
        },
        metadata: {
          source: "workflow-engine",
          destination: "data-processor-agent",
          priority: "high",
          timestamp: "2024-01-01T12:00:00Z",
          timeout: 60000,
          retryable: true,
          maxRetries: 3,
        },
        timestamp: "2024-01-01T12:00:00Z",
        commandName: "execute-capability",
        expectsReply: true,
        timeout: 60000,
        parameters: {
          capabilityName: "data-transformation",
          input: { data: [1, 2, 3, 4, 5] },
          options: { format: "json", validate: true },
        },
      };

      expect(mockCommand.type).toBe("command");
      expect(mockCommand.commandName).toBe("execute-capability");
      expect(mockCommand.expectsReply).toBe(true);
      expect(mockCommand.parameters.capabilityName).toBe("data-transformation");
      expect(mockCommand.timeout).toBe(60000);
    });

    it("should validate command payload structure", () => {
      const mockCommandPayload: CommandPayload = {
        action: "deploy-workflow",
        parameters: {
          workflowId: "workflow-123",
          version: "2.0.0",
          configuration: {
            parallel: true,
            maxConcurrency: 5,
            timeoutPerTask: 30000,
          },
        },
        context: {
          userId: "user-456",
          sessionId: "session-789",
          permissions: ["deploy", "monitor"],
        },
      };

      expect(mockCommandPayload.action).toBe("deploy-workflow");
      expect(mockCommandPayload.parameters.workflowId).toBe("workflow-123");
      expect(mockCommandPayload.context?.userId).toBe("user-456");
    });
  });

  describe("IQuery Type", () => {
    it("should define query message structure", () => {
      const mockQuery: IQuery = {
        id: "qry-12345" as MessageId,
        correlationId: "corr-67890" as CorrelationId,
        type: "query",
        payload: {
          queryName: "get-agent-metrics",
          parameters: {
            agentIds: ["agent-001", "agent-002"],
            timeRange: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-01T23:59:59Z",
            },
            metrics: ["cpu", "memory", "tasks"],
          },
          filters: [
            { field: "status", operator: "equals", value: "active" },
            { field: "uptime", operator: "greaterThan", value: 3600000 },
          ],
        },
        metadata: {
          source: "monitoring-dashboard",
          destination: "metrics-collector",
          priority: "normal",
          timestamp: "2024-01-01T12:00:00Z",
          timeout: 10000,
        },
        timestamp: "2024-01-01T12:00:00Z",
        queryName: "get-agent-metrics",
        resultType: "AgentMetrics[]",
        queryParams: {
          agentIds: ["agent-001", "agent-002"],
          timeRange: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T23:59:59Z",
          },
        },
        filters: [{ field: "status", operator: "equals", value: "active" }],
      };

      expect(mockQuery.type).toBe("query");
      expect(mockQuery.queryName).toBe("get-agent-metrics");
      expect(mockQuery.resultType).toBe("AgentMetrics[]");
      expect(mockQuery.queryParams.agentIds).toHaveLength(2);
      expect(mockQuery.filters).toHaveLength(1);
    });

    it("should validate query payload structure", () => {
      const mockQueryPayload: QueryPayload = {
        queryName: "search-tasks",
        parameters: {
          status: ["pending", "running"],
          assignedTo: "agent-processing-001",
          createdAfter: "2024-01-01T00:00:00Z",
        },
        pagination: {
          page: 1,
          limit: 50,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        include: ["metadata", "history", "dependencies"],
      };

      expect(mockQueryPayload.queryName).toBe("search-tasks");
      expect(mockQueryPayload.pagination?.limit).toBe(50);
      expect(mockQueryPayload.include).toContain("metadata");
    });
  });

  describe("IEvent Type", () => {
    it("should define event message structure", () => {
      const mockEvent: IEvent = {
        id: "evt-12345" as MessageId,
        correlationId: "corr-67890" as CorrelationId,
        type: "event",
        payload: {
          eventName: "task.completed",
          eventData: {
            taskId: "task-789",
            agentId: "agent-001",
            result: {
              status: "success",
              output: "processed data",
              duration: 2500,
            },
            metrics: {
              executionTime: 2500,
              memoryUsed: 1024000,
              cpuUsage: 15.5,
            },
          },
          source: "task-executor",
          category: "task",
        },
        metadata: {
          source: "task-executor",
          priority: "normal",
          timestamp: "2024-01-01T12:00:00Z",
        },
        timestamp: "2024-01-01T12:00:00Z",
        eventName: "task.completed",
        eventData: {
          taskId: "task-789",
          result: { status: "success" },
        },
        source: "task-executor",
        category: "task",
      };

      expect(mockEvent.type).toBe("event");
      expect(mockEvent.eventName).toBe("task.completed");
      expect(mockEvent.category).toBe("task");
      expect(mockEvent.eventData.taskId).toBe("task-789");
    });

    it("should validate event payload structure", () => {
      const mockEventPayload: EventPayload = {
        eventName: "agent.health.warning",
        eventData: {
          agentId: "agent-002",
          healthStatus: "warning",
          issues: [
            {
              type: "high_memory_usage",
              value: 89.5,
              threshold: 85.0,
              severity: "warning",
            },
          ],
          recommendations: ["Consider restarting the agent", "Review memory-intensive tasks"],
        },
        source: "health-monitor",
        category: "system",
        severity: "warning",
        tags: ["health", "monitoring", "warning"],
      };

      expect(mockEventPayload.eventName).toBe("agent.health.warning");
      expect(mockEventPayload.severity).toBe("warning");
      expect(mockEventPayload.tags).toContain("health");
    });
  });

  describe("IReply Type", () => {
    it("should define reply message structure", () => {
      const mockReply: IReply = {
        id: "rpl-12345" as MessageId,
        correlationId: "corr-67890" as CorrelationId,
        type: "reply",
        payload: {
          success: true,
          result: {
            taskId: "task-456",
            status: "completed",
            output: {
              processedRecords: 1000,
              errors: 0,
              warnings: 2,
              duration: 3500,
            },
          },
          metadata: {
            processingTime: 3500,
            resourcesUsed: {
              cpu: 25.5,
              memory: 512000,
            },
          },
        },
        metadata: {
          source: "data-processor-agent",
          destination: "workflow-engine",
          priority: "normal",
          timestamp: "2024-01-01T12:00:30Z",
        },
        timestamp: "2024-01-01T12:00:30Z",
        requestId: "cmd-12345",
        success: true,
        result: {
          taskId: "task-456",
          status: "completed",
        },
      };

      expect(mockReply.type).toBe("reply");
      expect(mockReply.requestId).toBe("cmd-12345");
      expect(mockReply.success).toBe(true);
      expect(mockReply.result.taskId).toBe("task-456");
    });

    it("should validate reply payload structure", () => {
      const mockReplyPayload: ReplyPayload = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input data failed validation",
          details: {
            field: "input.records",
            expected: "array",
            actual: "string",
            value: "invalid data",
          },
          recoverable: true,
          suggestions: ["Ensure input.records is an array", "Check data format specification"],
        },
        metadata: {
          requestProcessingTime: 150,
          validationTime: 50,
          errorOccurredAt: "validation_stage",
        },
      };

      expect(mockReplyPayload.success).toBe(false);
      expect(mockReplyPayload.error?.code).toBe("VALIDATION_ERROR");
      expect(mockReplyPayload.error?.recoverable).toBe(true);
    });
  });

  describe("IErrorMessage Type", () => {
    it("should define error message structure", () => {
      const mockErrorMessage: IErrorMessage = {
        id: "err-12345" as MessageId,
        correlationId: "corr-67890" as CorrelationId,
        type: "error",
        payload: {
          errorCode: "AGENT_UNREACHABLE",
          errorMessage: "Cannot establish connection to agent",
          stackTrace: "ConnectionError: Timeout after 30000ms\n    at connect (network.js:123)",
          context: {
            agentId: "agent-003",
            lastSeen: "2024-01-01T11:45:00Z",
            connectionAttempts: 3,
            errorDetails: {
              host: "agent-003.internal",
              port: 8080,
              protocol: "websocket",
            },
          },
          recoverable: true,
          retryAfter: 30000,
        },
        metadata: {
          source: "connection-manager",
          priority: "high",
          timestamp: "2024-01-01T12:00:00Z",
        },
        timestamp: "2024-01-01T12:00:00Z",
        severity: "high",
        errorCode: "AGENT_UNREACHABLE",
        recoverable: true,
      };

      expect(mockErrorMessage.type).toBe("error");
      expect(mockErrorMessage.severity).toBe("high");
      expect(mockErrorMessage.errorCode).toBe("AGENT_UNREACHABLE");
      expect(mockErrorMessage.recoverable).toBe(true);
    });

    it("should validate error payload structure", () => {
      const mockErrorPayload: ErrorPayload = {
        errorCode: "WORKFLOW_EXECUTION_FAILED",
        errorMessage: "Workflow execution terminated due to critical error",
        stackTrace: "WorkflowError: Task dependency failed\n    at executeTask (workflow.js:456)",
        context: {
          workflowId: "workflow-789",
          failedTaskId: "task-123",
          failureReason: "dependency_timeout",
          affectedTasks: ["task-124", "task-125", "task-126"],
          executionMetrics: {
            totalTasks: 10,
            completedTasks: 6,
            failedTasks: 1,
            pendingTasks: 3,
          },
        },
        recoverable: false,
        category: "workflow",
        impact: "high",
        recommendedAction: "Review task dependencies and timeout configurations",
      };

      expect(mockErrorPayload.errorCode).toBe("WORKFLOW_EXECUTION_FAILED");
      expect(mockErrorPayload.recoverable).toBe(false);
      expect(mockErrorPayload.impact).toBe("high");
    });
  });

  describe("MessageMetadata Type", () => {
    it("should define message metadata structure", () => {
      const mockMetadata: MessageMetadata = {
        source: "orchestration-hub",
        destination: "worker-agent-pool",
        priority: "high",
        timestamp: "2024-01-01T12:00:00Z",
        timeout: 45000,
        retryable: true,
        maxRetries: 5,
        tags: ["workflow", "critical", "user-request"],
        routing: {
          strategy: "round-robin",
          targets: ["agent-001", "agent-002", "agent-003"],
          failover: {
            enabled: true,
            fallbackTarget: "backup-agent",
          },
        },
        security: {
          encrypted: true,
          signature: "sha256:abc123...",
          permissions: ["execute", "read-results"],
        },
        tracing: {
          traceId: "trace-12345",
          spanId: "span-67890",
          parentSpanId: "span-54321",
        },
      };

      expect(mockMetadata.source).toBe("orchestration-hub");
      expect(mockMetadata.priority).toBe("high");
      expect(mockMetadata.routing?.strategy).toBe("round-robin");
      expect(mockMetadata.security?.encrypted).toBe(true);
      expect(mockMetadata.tracing?.traceId).toBe("trace-12345");
    });
  });

  describe("MessageRouting Type", () => {
    it("should define message routing structure", () => {
      const mockRouting: MessageRouting = {
        strategy: "weighted",
        targets: [
          {
            id: "agent-high-perf",
            weight: 70,
            criteria: { cpuUsage: { max: 50 }, memoryUsage: { max: 60 } },
          },
          {
            id: "agent-standard",
            weight: 30,
            criteria: { status: "active" },
          },
        ],
        rules: [
          {
            condition: "message.priority === 'critical'",
            action: "route_to_best_available",
            parameters: { criteria: "lowest_load" },
          },
          {
            condition: "message.payload.size > 1000000",
            action: "route_to_high_capacity",
            parameters: { minMemory: 2048000 },
          },
        ],
        fallback: {
          strategy: "direct",
          target: "default-handler",
          timeout: 5000,
        },
        loadBalancing: {
          algorithm: "least_connections",
          healthCheck: true,
          failureThreshold: 3,
        },
      };

      expect(mockRouting.strategy).toBe("weighted");
      expect(mockRouting.targets).toHaveLength(2);
      expect(mockRouting.rules).toHaveLength(2);
      expect(mockRouting.loadBalancing?.algorithm).toBe("least_connections");
    });
  });

  describe("MessageFilter Type", () => {
    it("should define message filter structure", () => {
      const mockFilter: MessageFilter = {
        field: "metadata.priority",
        operator: "in",
        value: ["high", "critical"],
        caseSensitive: false,
        negate: false,
      };

      expect(mockFilter.field).toBe("metadata.priority");
      expect(mockFilter.operator).toBe("in");
      expect(mockFilter.value).toEqual(["high", "critical"]);
    });

    it("should support complex filter combinations", () => {
      const mockComplexFilter: MessageFilter = {
        field: "payload.eventData.metrics.cpuUsage",
        operator: "greaterThan",
        value: 80,
        combineWith: [
          {
            field: "metadata.source",
            operator: "equals",
            value: "health-monitor",
          },
          {
            field: "type",
            operator: "equals",
            value: "event",
          },
        ],
        logic: "AND",
      };

      expect(mockComplexFilter.combineWith).toHaveLength(2);
      expect(mockComplexFilter.logic).toBe("AND");
    });
  });

  describe("Type Relationships and Composition", () => {
    it("should demonstrate proper type composition", () => {
      const fullMessageData: IMessage & ICommand & MessageMetadata = {
        // IMessage base
        id: "msg-full-001" as MessageId,
        correlationId: "corr-full-001" as CorrelationId,
        type: "command",
        payload: {
          action: "comprehensive-task",
          parameters: { input: "test" },
        },
        metadata: {
          source: "test-source",
          destination: "test-destination",
          priority: "normal",
          timestamp: "2024-01-01T12:00:00Z",
        },
        timestamp: "2024-01-01T12:00:00Z",

        // ICommand specific
        commandName: "comprehensive-task",
        expectsReply: true,
        timeout: 30000,
        parameters: { input: "test" },

        // MessageMetadata
        source: "test-source",
        destination: "test-destination",
        priority: "normal",
        retryable: true,
        maxRetries: 3,
        tags: ["test", "comprehensive"],
      };

      expect(fullMessageData.id).toBe("msg-full-001");
      expect(fullMessageData.commandName).toBe("comprehensive-task");
      expect(fullMessageData.source).toBe("test-source");
      expect(fullMessageData.tags).toContain("test");
    });
  });

  describe("Type Guard Support", () => {
    it("should support type narrowing patterns", () => {
      const data: unknown = {
        id: "msg-001",
        type: "command",
        commandName: "test-command",
        correlationId: "corr-001",
      };

      // Type guard pattern simulation
      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "type" in data &&
        "commandName" in data &&
        (data as any).type === "command"
      ) {
        const commandMessage = data as ICommand;
        expect(commandMessage.commandName).toBe("test-command");
        expect(commandMessage.type).toBe("command");
      }
    });

    it("should validate discriminated union types", () => {
      type MessageUnion = ICommand | IQuery | IEvent | IReply | IErrorMessage;

      const commandMessage: MessageUnion = {
        id: "cmd-001" as MessageId,
        correlationId: "corr-001" as CorrelationId,
        type: "command",
        payload: { action: "test" },
        metadata: { source: "test", priority: "normal", timestamp: "2024-01-01T12:00:00Z" },
        timestamp: "2024-01-01T12:00:00Z",
        commandName: "test-command",
        expectsReply: true,
        parameters: { input: "test" },
      };

      expect(commandMessage.type).toBe("command");

      if (commandMessage.type === "command") {
        expect((commandMessage as ICommand).commandName).toBe("test-command");
        expect((commandMessage as ICommand).expectsReply).toBe(true);
      }
    });
  });

  describe("Message Handler Function Types", () => {
    it("should define message handler signatures", () => {
      const mockMessageHandler: MessageHandler = async (message: IMessage) => {
        return {
          processed: true,
          messageId: message.id,
          processingTime: 100,
          result: "success",
        };
      };

      expect(typeof mockMessageHandler).toBe("function");
    });
  });

  describe("Routing Rule Types", () => {
    it("should define routing rule structure", () => {
      const mockRoutingRule: RoutingRule = {
        id: "rule-001",
        name: "Priority Routing",
        condition: "message.metadata.priority === 'critical'",
        action: "route_to_priority_queue",
        parameters: {
          queueName: "critical-priority",
          timeout: 5000,
          retryAttempts: 5,
        },
        enabled: true,
        order: 1,
      };

      expect(mockRoutingRule.name).toBe("Priority Routing");
      expect(mockRoutingRule.enabled).toBe(true);
      expect(mockRoutingRule.order).toBe(1);
    });
  });
});
