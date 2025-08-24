/**
 * Test suite for task class implementations and type guards
 */

import { describe, it, expect } from "vitest";
import type {
  ITaskDefinition,
  ITaskExecution,
  IWorkflowDefinition,
  TaskStatus,
  TaskId,
  WorkflowId,
  TaskPriority,
} from "../../../../src/core/task/task.types.js";
import {
  isTaskDefinition,
  isTaskExecution,
  isWorkflowDefinition,
  isTaskStatus,
} from "../../../../src/utils/guards/guards.classes.js";

describe("Task Class Implementations", () => {
  describe("isTaskDefinition Type Guard", () => {
    const validTaskDefinition: ITaskDefinition = {
      id: "task-123" as TaskId,
      name: "Test Task",
      description: "A test task",
      agentId: "agent-123" as any,
      capability: "processData",
      parameters: { input: "test" },
      dependencies: [],
      timeout: 30000,
      priority: "normal" as TaskPriority,
      retryPolicy: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
      },
      metadata: {},
    };

    it("should validate correct task definition structure", () => {
      expect(isTaskDefinition(validTaskDefinition)).toBe(true);
    });

    it("should reject invalid task definition", () => {
      expect(isTaskDefinition({})).toBe(false);
      expect(isTaskDefinition({ id: "test" })).toBe(false);
      expect(isTaskDefinition(null)).toBe(false);
      expect(isTaskDefinition(undefined)).toBe(false);
    });

    it("should validate all required fields", () => {
      const { id, name, description, agentId, capability, parameters, dependencies, timeout, priority, retryPolicy } =
        validTaskDefinition;

      expect(
        isTaskDefinition({
          name,
          description,
          agentId,
          capability,
          parameters,
          dependencies,
          timeout,
          priority,
          retryPolicy,
        }),
      ).toBe(false);
      expect(
        isTaskDefinition({
          id,
          description,
          agentId,
          capability,
          parameters,
          dependencies,
          timeout,
          priority,
          retryPolicy,
        }),
      ).toBe(false);
      expect(
        isTaskDefinition({ id, name, agentId, capability, parameters, dependencies, timeout, priority, retryPolicy }),
      ).toBe(false);
      expect(
        isTaskDefinition({
          id,
          name,
          description,
          capability,
          parameters,
          dependencies,
          timeout,
          priority,
          retryPolicy,
        }),
      ).toBe(false);
      expect(
        isTaskDefinition({ id, name, description, agentId, parameters, dependencies, timeout, priority, retryPolicy }),
      ).toBe(false);
    });

    it("should handle tasks with compensation actions", () => {
      const taskWithCompensation = {
        ...validTaskDefinition,
        compensationAction: {
          agentId: "agent-456" as any,
          capability: "undoProcessData",
          parameters: { rollbackId: "123" },
          timeout: 15000,
        },
      };

      expect(isTaskDefinition(taskWithCompensation)).toBe(true);
    });
  });

  describe("isTaskExecution Type Guard", () => {
    const validTaskExecution: ITaskExecution = {
      task: {
        id: "task-123" as TaskId,
        name: "Test Task",
        description: "A test task",
        agentId: "agent-123" as any,
        capability: "processData",
        parameters: { input: "test" },
        dependencies: [],
        timeout: 30000,
        priority: "normal" as TaskPriority,
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
        },
      },
      status: "executing" as TaskStatus,
      correlationId: "corr-123" as any,
      retryCount: 0,
    };

    it("should validate correct task execution structure", () => {
      expect(isTaskExecution(validTaskExecution)).toBe(true);
    });

    it("should handle optional execution properties", () => {
      const executionWithOptionals: ITaskExecution = {
        ...validTaskExecution,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        result: { output: "processed" },
        error: {
          code: "PROCESSING_ERROR",
          message: "Failed to process data",
          retryable: true,
        },
        metrics: {
          duration: 5000,
          queueTime: 1000,
          cpuTime: 2500,
          memoryUsed: 1024000,
        },
      };

      expect(isTaskExecution(executionWithOptionals)).toBe(true);
    });

    it("should reject invalid task execution", () => {
      expect(isTaskExecution({})).toBe(false);
      expect(isTaskExecution({ status: "executing" })).toBe(false);
      expect(isTaskExecution(null)).toBe(false);
    });
  });

  describe("isWorkflowDefinition Type Guard", () => {
    const validWorkflowDefinition: IWorkflowDefinition = {
      id: "workflow-123" as WorkflowId,
      name: "Test Workflow",
      version: "1.0.0",
      description: "A test workflow",
      tasks: [],
      timeout: 300000,
      useSaga: true,
    };

    it("should validate correct workflow definition structure", () => {
      expect(isWorkflowDefinition(validWorkflowDefinition)).toBe(true);
    });

    it("should handle workflow with tasks", () => {
      const workflowWithTasks: IWorkflowDefinition = {
        ...validWorkflowDefinition,
        tasks: [
          {
            id: "task-1" as TaskId,
            name: "First Task",
            description: "First task in workflow",
            agentId: "agent-123" as any,
            capability: "processData",
            parameters: {},
            dependencies: [],
            timeout: 30000,
            priority: "normal" as TaskPriority,
            retryPolicy: {
              maxAttempts: 3,
              initialDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2,
              jitter: true,
            },
          },
        ],
      };

      expect(isWorkflowDefinition(workflowWithTasks)).toBe(true);
    });

    it("should reject invalid workflow definition", () => {
      expect(isWorkflowDefinition({})).toBe(false);
      expect(isWorkflowDefinition({ id: "workflow-123" })).toBe(false);
      expect(isWorkflowDefinition(null)).toBe(false);
    });
  });

  describe("isTaskStatus Type Guard", () => {
    it("should accept all valid status values", () => {
      const validStatuses: TaskStatus[] = [
        "pending",
        "queued",
        "executing",
        "completed",
        "failed",
        "cancelled",
        "retrying",
        "compensating",
      ];

      validStatuses.forEach((status) => {
        expect(isTaskStatus(status)).toBe(true);
      });
    });

    it("should reject invalid status values", () => {
      expect(isTaskStatus("invalid")).toBe(false);
      expect(isTaskStatus("")).toBe(false);
      expect(isTaskStatus(null)).toBe(false);
      expect(isTaskStatus(undefined)).toBe(false);
      expect(isTaskStatus(123)).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(isTaskStatus("PENDING")).toBe(false);
      expect(isTaskStatus("Pending")).toBe(false);
      expect(isTaskStatus("pending")).toBe(true);
    });
  });

  describe("Performance Tests", () => {
    it("should perform type guards efficiently", () => {
      const validTask: ITaskDefinition = {
        id: "task-123" as TaskId,
        name: "Test Task",
        description: "A test task",
        agentId: "agent-123" as any,
        capability: "processData",
        parameters: { input: "test" },
        dependencies: [],
        timeout: 30000,
        priority: "normal" as TaskPriority,
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
        },
      };

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        isTaskDefinition(validTask);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      console.log(`Task type guard performance: ${iterations} iterations in ${duration.toFixed(2)}ms`);
    });
  });
});
