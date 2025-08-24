/**
 * Test suite for core agent class implementations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Core Agent Classes", () => {
  describe("Agent Registry Management", () => {
    it("should implement agent registration functionality", () => {
      const mockAgentRegistry = {
        agents: new Map<string, any>(),

        register: function (agentId: string, metadata: any) {
          const agent = {
            id: agentId,
            ...metadata,
            registeredAt: new Date().toISOString(),
            status: "registered",
            lastHeartbeat: new Date().toISOString(),
          };

          this.agents.set(agentId, agent);
          return agent;
        },

        unregister: function (agentId: string) {
          const agent = this.agents.get(agentId);
          if (agent) {
            this.agents.delete(agentId);
            return { ...agent, unregisteredAt: new Date().toISOString() };
          }
          return null;
        },

        getAgent: function (agentId: string) {
          return this.agents.get(agentId) || null;
        },

        listAgents: function () {
          return Array.from(this.agents.values());
        },

        updateHeartbeat: function (agentId: string) {
          const agent = this.agents.get(agentId);
          if (agent) {
            agent.lastHeartbeat = new Date().toISOString();
            agent.status = "active";
            return agent;
          }
          return null;
        },
      };

      // Test agent registration
      const agent = mockAgentRegistry.register("agent-001", {
        name: "Test Agent",
        capabilities: ["processing", "communication"],
        version: "1.0.0",
      });

      expect(agent.id).toBe("agent-001");
      expect(agent.name).toBe("Test Agent");
      expect(agent.status).toBe("registered");
      expect(agent.capabilities).toEqual(["processing", "communication"]);

      // Test agent retrieval
      const retrieved = mockAgentRegistry.getAgent("agent-001");
      expect(retrieved).toEqual(agent);

      // Test heartbeat update
      const updated = mockAgentRegistry.updateHeartbeat("agent-001");
      expect(updated?.status).toBe("active");
      expect(updated?.lastHeartbeat).toBeDefined();

      // Test agent listing
      const agents = mockAgentRegistry.listAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe("agent-001");

      // Test agent unregistration
      const unregistered = mockAgentRegistry.unregister("agent-001");
      expect(unregistered?.unregisteredAt).toBeDefined();
      expect(mockAgentRegistry.getAgent("agent-001")).toBeNull();
    });
  });

  describe("Agent Capability Management", () => {
    it("should manage agent capabilities", () => {
      const mockCapabilityManager = {
        capabilities: new Map<string, any>(),

        addCapability: function (name: string, config: any) {
          const capability = {
            name,
            ...config,
            id: `cap-${name}-${Date.now()}`,
            createdAt: new Date().toISOString(),
            enabled: true,
          };

          this.capabilities.set(name, capability);
          return capability;
        },

        removeCapability: function (name: string) {
          return this.capabilities.delete(name);
        },

        enableCapability: function (name: string) {
          const capability = this.capabilities.get(name);
          if (capability) {
            capability.enabled = true;
            capability.lastEnabledAt = new Date().toISOString();
            return capability;
          }
          return null;
        },

        disableCapability: function (name: string) {
          const capability = this.capabilities.get(name);
          if (capability) {
            capability.enabled = false;
            capability.lastDisabledAt = new Date().toISOString();
            return capability;
          }
          return null;
        },

        getCapabilities: function () {
          return Array.from(this.capabilities.values());
        },

        getEnabledCapabilities: function () {
          return this.getCapabilities().filter((cap) => cap.enabled);
        },
      };

      // Test capability addition
      const capability = mockCapabilityManager.addCapability("data-processing", {
        description: "Process various data formats",
        version: "2.0.0",
        parameters: ["input", "format", "options"],
      });

      expect(capability.name).toBe("data-processing");
      expect(capability.enabled).toBe(true);
      expect(capability.version).toBe("2.0.0");

      // Test capability enabling/disabling
      const disabled = mockCapabilityManager.disableCapability("data-processing");
      expect(disabled?.enabled).toBe(false);
      expect(disabled?.lastDisabledAt).toBeDefined();

      const enabled = mockCapabilityManager.enableCapability("data-processing");
      expect(enabled?.enabled).toBe(true);
      expect(enabled?.lastEnabledAt).toBeDefined();

      // Test capability listing
      const allCapabilities = mockCapabilityManager.getCapabilities();
      expect(allCapabilities).toHaveLength(1);

      const enabledCapabilities = mockCapabilityManager.getEnabledCapabilities();
      expect(enabledCapabilities).toHaveLength(1);

      // Test capability removal
      const removed = mockCapabilityManager.removeCapability("data-processing");
      expect(removed).toBe(true);
      expect(mockCapabilityManager.getCapabilities()).toHaveLength(0);
    });
  });

  describe("Agent Communication", () => {
    let mockCommunicationManager: any;

    beforeEach(() => {
      mockCommunicationManager = {
        connections: new Map<string, any>(),
        messageQueue: [] as any[],

        connect: function (agentId: string, endpoint: string) {
          const connection = {
            agentId,
            endpoint,
            status: "connected",
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          };

          this.connections.set(agentId, connection);
          return connection;
        },

        disconnect: function (agentId: string) {
          const connection = this.connections.get(agentId);
          if (connection) {
            connection.status = "disconnected";
            connection.disconnectedAt = new Date().toISOString();
            this.connections.delete(agentId);
            return connection;
          }
          return null;
        },

        sendMessage: function (fromAgentId: string, toAgentId: string, message: any) {
          const messageObj = {
            id: `msg-${Date.now()}`,
            from: fromAgentId,
            to: toAgentId,
            message,
            timestamp: new Date().toISOString(),
            status: "sent",
          };

          this.messageQueue.push(messageObj);

          // Update last activity
          const fromConnection = this.connections.get(fromAgentId);
          if (fromConnection) {
            fromConnection.lastActivity = new Date().toISOString();
          }

          return messageObj;
        },

        receiveMessage: function (agentId: string) {
          const messages = this.messageQueue.filter((msg) => msg.to === agentId && msg.status === "sent");

          messages.forEach((msg) => (msg.status = "received"));

          // Update last activity
          const connection = this.connections.get(agentId);
          if (connection) {
            connection.lastActivity = new Date().toISOString();
          }

          return messages;
        },

        getConnectionStatus: function (agentId: string) {
          return this.connections.get(agentId) || null;
        },
      };
    });

    afterEach(() => {
      mockCommunicationManager.connections.clear();
      mockCommunicationManager.messageQueue.length = 0;
    });

    it("should handle agent connections", () => {
      const connection = mockCommunicationManager.connect("agent-001", "ws://localhost:8080");

      expect(connection.agentId).toBe("agent-001");
      expect(connection.status).toBe("connected");
      expect(connection.connectedAt).toBeDefined();

      const status = mockCommunicationManager.getConnectionStatus("agent-001");
      expect(status).toEqual(connection);

      const disconnected = mockCommunicationManager.disconnect("agent-001");
      expect(disconnected?.status).toBe("disconnected");
      expect(disconnected?.disconnectedAt).toBeDefined();
    });

    it("should handle message exchange between agents", () => {
      // Connect two agents
      mockCommunicationManager.connect("agent-001", "ws://localhost:8080");
      mockCommunicationManager.connect("agent-002", "ws://localhost:8081");

      // Send message from agent-001 to agent-002
      const sentMessage = mockCommunicationManager.sendMessage("agent-001", "agent-002", {
        type: "task-request",
        data: { task: "process-data", input: "test-data" },
      });

      expect(sentMessage.from).toBe("agent-001");
      expect(sentMessage.to).toBe("agent-002");
      expect(sentMessage.status).toBe("sent");
      expect(sentMessage.message.type).toBe("task-request");

      // Receive messages for agent-002
      const receivedMessages = mockCommunicationManager.receiveMessage("agent-002");
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].status).toBe("received");
      expect(receivedMessages[0].message.data.task).toBe("process-data");

      // Check that connections were updated
      const agent001Status = mockCommunicationManager.getConnectionStatus("agent-001");
      const agent002Status = mockCommunicationManager.getConnectionStatus("agent-002");

      expect(agent001Status?.lastActivity).toBeDefined();
      expect(agent002Status?.lastActivity).toBeDefined();
    });
  });

  describe("Agent Health Monitoring", () => {
    it("should monitor agent health and status", () => {
      const mockHealthMonitor = {
        healthChecks: new Map<string, any>(),

        addAgent: function (agentId: string) {
          const healthCheck = {
            agentId,
            status: "unknown",
            lastCheck: null,
            lastHeartbeat: null,
            responseTime: null,
            consecutiveFailures: 0,
            totalChecks: 0,
            successfulChecks: 0,
          };

          this.healthChecks.set(agentId, healthCheck);
          return healthCheck;
        },

        performHealthCheck: function (agentId: string) {
          const healthCheck = this.healthChecks.get(agentId);
          if (!healthCheck) return null;

          const startTime = Date.now();

          // Simulate health check (randomly succeed/fail for testing)
          const success = Math.random() > 0.2; // 80% success rate
          const endTime = Date.now();

          healthCheck.lastCheck = new Date().toISOString();
          healthCheck.responseTime = endTime - startTime;
          healthCheck.totalChecks++;

          if (success) {
            healthCheck.status = "healthy";
            healthCheck.consecutiveFailures = 0;
            healthCheck.successfulChecks++;
          } else {
            healthCheck.status = "unhealthy";
            healthCheck.consecutiveFailures++;
          }

          return healthCheck;
        },

        recordHeartbeat: function (agentId: string) {
          const healthCheck = this.healthChecks.get(agentId);
          if (healthCheck) {
            healthCheck.lastHeartbeat = new Date().toISOString();
            healthCheck.status = "healthy";
            healthCheck.consecutiveFailures = 0;
            return healthCheck;
          }
          return null;
        },

        getHealthStatus: function (agentId: string) {
          return this.healthChecks.get(agentId) || null;
        },

        getAllHealthStatuses: function () {
          return Array.from(this.healthChecks.values());
        },

        getUnhealthyAgents: function () {
          return this.getAllHealthStatuses().filter(
            (check) => check.status === "unhealthy" || check.consecutiveFailures > 3,
          );
        },
      };

      // Add agent to monitoring
      const healthCheck = mockHealthMonitor.addAgent("agent-001");
      expect(healthCheck.agentId).toBe("agent-001");
      expect(healthCheck.status).toBe("unknown");

      // Record heartbeat
      const heartbeatResult = mockHealthMonitor.recordHeartbeat("agent-001");
      expect(heartbeatResult?.status).toBe("healthy");
      expect(heartbeatResult?.lastHeartbeat).toBeDefined();

      // Perform health check
      const checkResult = mockHealthMonitor.performHealthCheck("agent-001");
      expect(checkResult?.totalChecks).toBe(1);
      expect(checkResult?.lastCheck).toBeDefined();
      expect(checkResult?.responseTime).toBeGreaterThanOrEqual(0);

      // Test health status retrieval
      const status = mockHealthMonitor.getHealthStatus("agent-001");
      expect(status?.agentId).toBe("agent-001");

      // Test unhealthy agent detection (simulate failures)
      for (let i = 0; i < 5; i++) {
        const failedAgent = mockHealthMonitor.addAgent(`failing-agent-${i}`);
        failedAgent.status = "unhealthy";
        failedAgent.consecutiveFailures = 5;
      }

      const unhealthyAgents = mockHealthMonitor.getUnhealthyAgents();
      expect(unhealthyAgents.length).toBeGreaterThan(0);
    });
  });

  describe("Agent Task Execution", () => {
    it("should handle task assignment and execution", () => {
      const mockTaskExecutor = {
        activeTasks: new Map<string, any>(),
        taskQueue: [] as any[],

        assignTask: function (agentId: string, task: any) {
          const assignedTask = {
            id: `task-${Date.now()}`,
            agentId,
            ...task,
            status: "assigned",
            assignedAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
            result: null,
            error: null,
          };

          this.activeTasks.set(assignedTask.id, assignedTask);
          return assignedTask;
        },

        startTask: function (taskId: string) {
          const task = this.activeTasks.get(taskId);
          if (task && task.status === "assigned") {
            task.status = "running";
            task.startedAt = new Date().toISOString();
            return task;
          }
          return null;
        },

        completeTask: function (taskId: string, result: any) {
          const task = this.activeTasks.get(taskId);
          if (task && task.status === "running") {
            task.status = "completed";
            task.completedAt = new Date().toISOString();
            task.result = result;
            return task;
          }
          return null;
        },

        failTask: function (taskId: string, error: any) {
          const task = this.activeTasks.get(taskId);
          if (task && task.status === "running") {
            task.status = "failed";
            task.completedAt = new Date().toISOString();
            task.error = error;
            return task;
          }
          return null;
        },

        getTasksForAgent: function (agentId: string) {
          return Array.from(this.activeTasks.values()).filter((task) => task.agentId === agentId);
        },

        getTaskStatus: function (taskId: string) {
          return this.activeTasks.get(taskId) || null;
        },
      };

      // Test task assignment
      const task = mockTaskExecutor.assignTask("agent-001", {
        name: "process-data",
        description: "Process incoming data",
        data: { input: "test-data" },
      });

      expect(task.agentId).toBe("agent-001");
      expect(task.status).toBe("assigned");
      expect(task.name).toBe("process-data");

      // Test task start
      const startedTask = mockTaskExecutor.startTask(task.id);
      expect(startedTask?.status).toBe("running");
      expect(startedTask?.startedAt).toBeDefined();

      // Test task completion
      const completedTask = mockTaskExecutor.completeTask(task.id, {
        output: "processed-data",
        processingTime: 150,
      });

      expect(completedTask?.status).toBe("completed");
      expect(completedTask?.result.output).toBe("processed-data");
      expect(completedTask?.completedAt).toBeDefined();

      // Test getting tasks for agent
      const agentTasks = mockTaskExecutor.getTasksForAgent("agent-001");
      expect(agentTasks).toHaveLength(1);
      expect(agentTasks[0].id).toBe(task.id);

      // Test task failure scenario
      const failingTask = mockTaskExecutor.assignTask("agent-002", {
        name: "failing-task",
        description: "This task will fail",
      });

      mockTaskExecutor.startTask(failingTask.id);
      const failedTask = mockTaskExecutor.failTask(failingTask.id, {
        message: "Task execution failed",
        code: "EXECUTION_ERROR",
      });

      expect(failedTask?.status).toBe("failed");
      expect(failedTask?.error.message).toBe("Task execution failed");
    });
  });
});
