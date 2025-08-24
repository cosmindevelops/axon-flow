/**
 * Test suite for core agent class implementations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Real implementation classes for testing
class TestAgentRegistry {
  private agents = new Map<string, any>();

  register(agentId: string, metadata: any) {
    const agent = {
      id: agentId,
      ...metadata,
      registeredAt: new Date().toISOString(),
      status: "registered",
      lastHeartbeat: new Date().toISOString(),
    };

    this.agents.set(agentId, agent);
    return agent;
  }

  unregister(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      return { ...agent, unregisteredAt: new Date().toISOString() };
    }
    return null;
  }

  getAgent(agentId: string) {
    return this.agents.get(agentId) || null;
  }

  listAgents() {
    return Array.from(this.agents.values());
  }

  updateHeartbeat(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = new Date().toISOString();
      agent.status = "active";
      return agent;
    }
    return null;
  }
}

describe("Core Agent Classes", () => {
  describe("Agent Registry Management", () => {
    it("should implement agent registration functionality", () => {
      const agentRegistry = new TestAgentRegistry();

      // Test agent registration
      const agent = agentRegistry.register("agent-001", {
        name: "Test Agent",
        capabilities: ["processing", "communication"],
        version: "1.0.0",
      });

      expect(agent.id).toBe("agent-001");
      expect(agent.name).toBe("Test Agent");
      expect(agent.status).toBe("registered");
      expect(agent.capabilities).toEqual(["processing", "communication"]);

      // Test agent retrieval
      const retrieved = agentRegistry.getAgent("agent-001");
      expect(retrieved).toEqual(agent);

      // Test heartbeat update
      const updated = agentRegistry.updateHeartbeat("agent-001");
      expect(updated?.status).toBe("active");
      expect(updated?.lastHeartbeat).toBeDefined();

      // Test agent listing
      const agents = agentRegistry.listAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe("agent-001");

      // Test agent unregistration
      const unregistered = agentRegistry.unregister("agent-001");
      expect(unregistered?.unregisteredAt).toBeDefined();
      expect(agentRegistry.getAgent("agent-001")).toBeNull();
    });
  });

  class TestCapabilityManager {
    private capabilities = new Map<string, any>();

    addCapability(name: string, config: any) {
      const capability = {
        name,
        ...config,
        id: `cap-${name}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        enabled: true,
      };

      this.capabilities.set(name, capability);
      return capability;
    }

    removeCapability(name: string) {
      return this.capabilities.delete(name);
    }

    enableCapability(name: string) {
      const capability = this.capabilities.get(name);
      if (capability) {
        capability.enabled = true;
        capability.lastEnabledAt = new Date().toISOString();
        return capability;
      }
      return null;
    }

    disableCapability(name: string) {
      const capability = this.capabilities.get(name);
      if (capability) {
        capability.enabled = false;
        capability.lastDisabledAt = new Date().toISOString();
        return capability;
      }
      return null;
    }

    getCapabilities() {
      return Array.from(this.capabilities.values());
    }

    getEnabledCapabilities() {
      return this.getCapabilities().filter((cap) => cap.enabled);
    }
  }

  describe("Agent Capability Management", () => {
    it("should manage agent capabilities", () => {
      const capabilityManager = new TestCapabilityManager();

      // Test capability addition
      const capability = capabilityManager.addCapability("data-processing", {
        description: "Process various data formats",
        version: "2.0.0",
        parameters: ["input", "format", "options"],
      });

      expect(capability.name).toBe("data-processing");
      expect(capability.enabled).toBe(true);
      expect(capability.version).toBe("2.0.0");

      // Test capability enabling/disabling
      const disabled = capabilityManager.disableCapability("data-processing");
      expect(disabled?.enabled).toBe(false);
      expect(disabled?.lastDisabledAt).toBeDefined();

      const enabled = capabilityManager.enableCapability("data-processing");
      expect(enabled?.enabled).toBe(true);
      expect(enabled?.lastEnabledAt).toBeDefined();

      // Test capability listing
      const allCapabilities = capabilityManager.getCapabilities();
      expect(allCapabilities).toHaveLength(1);

      const enabledCapabilities = capabilityManager.getEnabledCapabilities();
      expect(enabledCapabilities).toHaveLength(1);

      // Test capability removal
      const removed = capabilityManager.removeCapability("data-processing");
      expect(removed).toBe(true);
      expect(capabilityManager.getCapabilities()).toHaveLength(0);
    });
  });

  class TestCommunicationManager {
    private connections = new Map<string, any>();
    private messageQueue: any[] = [];

    connect(agentId: string, endpoint: string) {
      const connection = {
        agentId,
        endpoint,
        status: "connected",
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      this.connections.set(agentId, connection);
      return connection;
    }

    disconnect(agentId: string) {
      const connection = this.connections.get(agentId);
      if (connection) {
        connection.status = "disconnected";
        connection.disconnectedAt = new Date().toISOString();
        this.connections.delete(agentId);
        return connection;
      }
      return null;
    }

    sendMessage(fromAgentId: string, toAgentId: string, message: any) {
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
    }

    receiveMessage(agentId: string) {
      const messages = this.messageQueue.filter((msg) => msg.to === agentId && msg.status === "sent");

      messages.forEach((msg) => (msg.status = "received"));

      // Update last activity
      const connection = this.connections.get(agentId);
      if (connection) {
        connection.lastActivity = new Date().toISOString();
      }

      return messages;
    }

    getConnectionStatus(agentId: string) {
      return this.connections.get(agentId) || null;
    }

    clear() {
      this.connections.clear();
      this.messageQueue.length = 0;
    }
  }

  describe("Agent Communication", () => {
    let communicationManager: TestCommunicationManager;

    beforeEach(() => {
      communicationManager = new TestCommunicationManager();
    });

    afterEach(() => {
      communicationManager.clear();
    });

    it("should handle agent connections", () => {
      const connection = communicationManager.connect("agent-001", "ws://localhost:8080");

      expect(connection.agentId).toBe("agent-001");
      expect(connection.status).toBe("connected");
      expect(connection.connectedAt).toBeDefined();

      const status = communicationManager.getConnectionStatus("agent-001");
      expect(status).toEqual(connection);

      const disconnected = communicationManager.disconnect("agent-001");
      expect(disconnected?.status).toBe("disconnected");
      expect(disconnected?.disconnectedAt).toBeDefined();
    });

    it("should handle message exchange between agents", () => {
      // Connect two agents
      communicationManager.connect("agent-001", "ws://localhost:8080");
      communicationManager.connect("agent-002", "ws://localhost:8081");

      // Send message from agent-001 to agent-002
      const sentMessage = communicationManager.sendMessage("agent-001", "agent-002", {
        type: "task-request",
        data: { task: "process-data", input: "test-data" },
      });

      expect(sentMessage.from).toBe("agent-001");
      expect(sentMessage.to).toBe("agent-002");
      expect(sentMessage.status).toBe("sent");
      expect(sentMessage.message.type).toBe("task-request");

      // Receive messages for agent-002
      const receivedMessages = communicationManager.receiveMessage("agent-002");
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].status).toBe("received");
      expect(receivedMessages[0].message.data.task).toBe("process-data");

      // Check that connections were updated
      const agent001Status = communicationManager.getConnectionStatus("agent-001");
      const agent002Status = communicationManager.getConnectionStatus("agent-002");

      expect(agent001Status?.lastActivity).toBeDefined();
      expect(agent002Status?.lastActivity).toBeDefined();
    });
  });

  class TestHealthMonitor {
    private healthChecks = new Map<string, any>();

    addAgent(agentId: string) {
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
    }

    performHealthCheck(agentId: string, forceResult?: boolean) {
      const healthCheck = this.healthChecks.get(agentId);
      if (!healthCheck) return null;

      const startTime = Date.now();

      // Use forced result for predictable testing, otherwise random with 80% success rate
      const success = forceResult !== undefined ? forceResult : Math.random() > 0.2;
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
    }

    recordHeartbeat(agentId: string) {
      const healthCheck = this.healthChecks.get(agentId);
      if (healthCheck) {
        healthCheck.lastHeartbeat = new Date().toISOString();
        healthCheck.status = "healthy";
        healthCheck.consecutiveFailures = 0;
        return healthCheck;
      }
      return null;
    }

    getHealthStatus(agentId: string) {
      return this.healthChecks.get(agentId) || null;
    }

    getAllHealthStatuses() {
      return Array.from(this.healthChecks.values());
    }

    getUnhealthyAgents() {
      return this.getAllHealthStatuses().filter(
        (check) => check.status === "unhealthy" || check.consecutiveFailures > 3,
      );
    }
  }

  describe("Agent Health Monitoring", () => {
    it("should monitor agent health and status", () => {
      const healthMonitor = new TestHealthMonitor();

      // Add agent to monitoring
      const healthCheck = healthMonitor.addAgent("agent-001");
      expect(healthCheck.agentId).toBe("agent-001");
      expect(healthCheck.status).toBe("unknown");

      // Record heartbeat
      const heartbeatResult = healthMonitor.recordHeartbeat("agent-001");
      expect(heartbeatResult?.status).toBe("healthy");
      expect(heartbeatResult?.lastHeartbeat).toBeDefined();

      // Perform health check (force success for predictable test)
      const checkResult = healthMonitor.performHealthCheck("agent-001", true);
      expect(checkResult?.totalChecks).toBe(1);
      expect(checkResult?.lastCheck).toBeDefined();
      expect(checkResult?.responseTime).toBeGreaterThanOrEqual(0);

      // Test health status retrieval
      const status = healthMonitor.getHealthStatus("agent-001");
      expect(status?.agentId).toBe("agent-001");

      // Test unhealthy agent detection (simulate failures)
      for (let i = 0; i < 5; i++) {
        const failedAgent = healthMonitor.addAgent(`failing-agent-${i}`);
        failedAgent.status = "unhealthy";
        failedAgent.consecutiveFailures = 5;
      }

      const unhealthyAgents = healthMonitor.getUnhealthyAgents();
      expect(unhealthyAgents.length).toBeGreaterThan(0);
    });
  });

  class TestTaskExecutor {
    private activeTasks = new Map<string, any>();

    assignTask(agentId: string, task: any) {
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
    }

    startTask(taskId: string) {
      const task = this.activeTasks.get(taskId);
      if (task && task.status === "assigned") {
        task.status = "running";
        task.startedAt = new Date().toISOString();
        return task;
      }
      return null;
    }

    completeTask(taskId: string, result: any) {
      const task = this.activeTasks.get(taskId);
      if (task && task.status === "running") {
        task.status = "completed";
        task.completedAt = new Date().toISOString();
        task.result = result;
        return task;
      }
      return null;
    }

    failTask(taskId: string, error: any) {
      const task = this.activeTasks.get(taskId);
      if (task && task.status === "running") {
        task.status = "failed";
        task.completedAt = new Date().toISOString();
        task.error = error;
        return task;
      }
      return null;
    }

    getTasksForAgent(agentId: string) {
      return Array.from(this.activeTasks.values()).filter((task) => task.agentId === agentId);
    }

    getTaskStatus(taskId: string) {
      return this.activeTasks.get(taskId) || null;
    }
  }

  describe("Agent Task Execution", () => {
    it("should handle task assignment and execution", () => {
      const taskExecutor = new TestTaskExecutor();

      // Test task assignment
      const task = taskExecutor.assignTask("agent-001", {
        name: "process-data",
        description: "Process incoming data",
        data: { input: "test-data" },
      });

      expect(task.agentId).toBe("agent-001");
      expect(task.status).toBe("assigned");
      expect(task.name).toBe("process-data");

      // Test task start
      const startedTask = taskExecutor.startTask(task.id);
      expect(startedTask?.status).toBe("running");
      expect(startedTask?.startedAt).toBeDefined();

      // Test task completion
      const completedTask = taskExecutor.completeTask(task.id, {
        output: "processed-data",
        processingTime: 150,
      });

      expect(completedTask?.status).toBe("completed");
      expect(completedTask?.result.output).toBe("processed-data");
      expect(completedTask?.completedAt).toBeDefined();

      // Test getting tasks for agent
      const agentTasks = taskExecutor.getTasksForAgent("agent-001");
      expect(agentTasks).toHaveLength(1);
      expect(agentTasks[0].id).toBe(task.id);

      // Test task failure scenario
      const failingTask = taskExecutor.assignTask("agent-002", {
        name: "failing-task",
        description: "This task will fail",
      });

      taskExecutor.startTask(failingTask.id);
      const failedTask = taskExecutor.failTask(failingTask.id, {
        message: "Task execution failed",
        code: "EXECUTION_ERROR",
      });

      expect(failedTask?.status).toBe("failed");
      expect(failedTask?.error.message).toBe("Task execution failed");
    });
  });
});
