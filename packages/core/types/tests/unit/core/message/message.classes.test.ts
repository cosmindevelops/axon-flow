/**
 * Test suite for core message class implementations
 */

import { describe, it, expect, beforeEach } from "vitest";

describe("Core Message Classes", () => {
  describe("Message Bus Implementation", () => {
    let mockMessageBus: any;

    beforeEach(() => {
      mockMessageBus = {
        subscribers: new Map<string, Set<Function>>(),
        messageQueue: [] as any[],

        subscribe: function (topic: string, handler: Function) {
          if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set());
          }
          this.subscribers.get(topic)?.add(handler);
          return () => this.unsubscribe(topic, handler);
        },

        unsubscribe: function (topic: string, handler: Function) {
          const handlers = this.subscribers.get(topic);
          if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
              this.subscribers.delete(topic);
            }
          }
        },

        publish: function (topic: string, message: any) {
          const handlers = this.subscribers.get(topic) || new Set();
          const messageObj = {
            id: `msg-${Date.now()}`,
            topic,
            message,
            timestamp: new Date().toISOString(),
            delivered: false,
          };

          this.messageQueue.push(messageObj);

          handlers.forEach((handler) => {
            try {
              handler(messageObj);
              messageObj.delivered = true;
            } catch (error) {
              console.error(`Error delivering message to handler:`, error);
            }
          });

          return messageObj;
        },

        getSubscriberCount: function (topic: string) {
          return this.subscribers.get(topic)?.size || 0;
        },

        getMessageHistory: function () {
          return [...this.messageQueue];
        },

        clear: function () {
          this.subscribers.clear();
          this.messageQueue.length = 0;
        },
      };
    });

    it("should handle message subscription and publishing", () => {
      let receivedMessage: any = null;
      const handler = (msg: any) => {
        receivedMessage = msg;
      };

      // Subscribe to topic
      const unsubscribe = mockMessageBus.subscribe("task.completed", handler);
      expect(mockMessageBus.getSubscriberCount("task.completed")).toBe(1);

      // Publish message
      const published = mockMessageBus.publish("task.completed", {
        taskId: "task-123",
        result: "success",
        duration: 2500,
      });

      expect(published.topic).toBe("task.completed");
      expect(published.delivered).toBe(true);
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.message.taskId).toBe("task-123");

      // Unsubscribe
      unsubscribe();
      expect(mockMessageBus.getSubscriberCount("task.completed")).toBe(0);
    });

    it("should support multiple subscribers per topic", () => {
      const results: any[] = [];
      const handler1 = (msg: any) => results.push(`handler1: ${msg.message.data}`);
      const handler2 = (msg: any) => results.push(`handler2: ${msg.message.data}`);
      const handler3 = (msg: any) => results.push(`handler3: ${msg.message.data}`);

      mockMessageBus.subscribe("broadcast.test", handler1);
      mockMessageBus.subscribe("broadcast.test", handler2);
      mockMessageBus.subscribe("broadcast.test", handler3);

      expect(mockMessageBus.getSubscriberCount("broadcast.test")).toBe(3);

      mockMessageBus.publish("broadcast.test", { data: "test-message" });

      expect(results).toHaveLength(3);
      expect(results).toContain("handler1: test-message");
      expect(results).toContain("handler2: test-message");
      expect(results).toContain("handler3: test-message");
    });

    it("should maintain message history", () => {
      mockMessageBus.publish("event.1", { data: "first" });
      mockMessageBus.publish("event.2", { data: "second" });
      mockMessageBus.publish("event.1", { data: "third" });

      const history = mockMessageBus.getMessageHistory();
      expect(history).toHaveLength(3);
      expect(history[0].topic).toBe("event.1");
      expect(history[1].topic).toBe("event.2");
      expect(history[2].topic).toBe("event.1");
    });
  });

  describe("Message Router Implementation", () => {
    it("should route messages based on patterns", () => {
      const mockMessageRouter = {
        routes: new Map<string, any>(),

        addRoute: function (pattern: string, handler: Function) {
          this.routes.set(pattern, {
            pattern,
            handler,
            regex: new RegExp(pattern.replace(/\*/g, ".*")),
          });
        },

        removeRoute: function (pattern: string) {
          this.routes.delete(pattern);
        },

        route: function (topic: string, message: any) {
          const results: any[] = [];

          for (const [pattern, route] of this.routes) {
            if (route.regex.test(topic)) {
              try {
                const result = route.handler(topic, message);
                results.push({ pattern, result });
              } catch (error) {
                results.push({ pattern, error: error.message });
              }
            }
          }

          return results;
        },

        getRouteCount: function () {
          return this.routes.size;
        },
      };

      // Add routes
      mockMessageRouter.addRoute("agent.*", (topic: string, msg: any) => `Agent route: ${topic}`);
      mockMessageRouter.addRoute("task.*.completed", (topic: string, msg: any) => `Task completion: ${topic}`);
      mockMessageRouter.addRoute("system.*", (topic: string, msg: any) => `System route: ${topic}`);

      expect(mockMessageRouter.getRouteCount()).toBe(3);

      // Test routing
      const results1 = mockMessageRouter.route("agent.registered", { agentId: "agent-001" });
      expect(results1).toHaveLength(1);
      expect(results1[0].pattern).toBe("agent.*");
      expect(results1[0].result).toBe("Agent route: agent.registered");

      const results2 = mockMessageRouter.route("task.process-data.completed", { result: "success" });
      expect(results2).toHaveLength(1);
      expect(results2[0].pattern).toBe("task.*.completed");

      const results3 = mockMessageRouter.route("system.health.check", { status: "ok" });
      expect(results3).toHaveLength(1);
      expect(results3[0].pattern).toBe("system.*");

      // Test no matching routes
      const results4 = mockMessageRouter.route("unknown.topic", {});
      expect(results4).toHaveLength(0);
    });
  });

  describe("Message Queue Implementation", () => {
    it("should manage message queuing with priorities", () => {
      const mockMessageQueue = {
        queues: {
          high: [] as any[],
          normal: [] as any[],
          low: [] as any[],
        },

        enqueue: function (message: any, priority: "high" | "normal" | "low" = "normal") {
          const queuedMessage = {
            ...message,
            id: `msg-${Date.now()}-${Math.random()}`,
            priority,
            enqueuedAt: new Date().toISOString(),
          };

          this.queues[priority].push(queuedMessage);
          return queuedMessage;
        },

        dequeue: function () {
          // Process by priority: high -> normal -> low
          for (const priority of ["high", "normal", "low"] as const) {
            const queue = this.queues[priority];
            if (queue.length > 0) {
              const message = queue.shift();
              if (message) {
                message.dequeuedAt = new Date().toISOString();
                return message;
              }
            }
          }
          return null;
        },

        peek: function () {
          for (const priority of ["high", "normal", "low"] as const) {
            const queue = this.queues[priority];
            if (queue.length > 0) {
              return queue[0];
            }
          }
          return null;
        },

        size: function () {
          return this.queues.high.length + this.queues.normal.length + this.queues.low.length;
        },

        clear: function () {
          this.queues.high.length = 0;
          this.queues.normal.length = 0;
          this.queues.low.length = 0;
        },
      };

      // Test enqueueing with different priorities
      const lowMsg = mockMessageQueue.enqueue({ data: "low priority" }, "low");
      const highMsg = mockMessageQueue.enqueue({ data: "high priority" }, "high");
      const normalMsg = mockMessageQueue.enqueue({ data: "normal priority" }, "normal");

      expect(mockMessageQueue.size()).toBe(3);
      expect(lowMsg.priority).toBe("low");
      expect(highMsg.priority).toBe("high");
      expect(normalMsg.priority).toBe("normal");

      // Test priority-based dequeuing
      const first = mockMessageQueue.dequeue();
      expect(first?.data).toBe("high priority");
      expect(first?.priority).toBe("high");

      const second = mockMessageQueue.dequeue();
      expect(second?.data).toBe("normal priority");
      expect(second?.priority).toBe("normal");

      const third = mockMessageQueue.dequeue();
      expect(third?.data).toBe("low priority");
      expect(third?.priority).toBe("low");

      expect(mockMessageQueue.size()).toBe(0);
      expect(mockMessageQueue.dequeue()).toBeNull();
    });

    it("should support peeking without removing messages", () => {
      const mockMessageQueue = {
        messages: [] as any[],

        enqueue: function (message: any) {
          this.messages.push({ ...message, id: `msg-${Date.now()}` });
        },

        peek: function () {
          return this.messages.length > 0 ? this.messages[0] : null;
        },

        dequeue: function () {
          return this.messages.shift() || null;
        },

        size: function () {
          return this.messages.length;
        },
      };

      mockMessageQueue.enqueue({ data: "first" });
      mockMessageQueue.enqueue({ data: "second" });

      expect(mockMessageQueue.size()).toBe(2);

      const peeked = mockMessageQueue.peek();
      expect(peeked?.data).toBe("first");
      expect(mockMessageQueue.size()).toBe(2); // Should not remove

      const dequeued = mockMessageQueue.dequeue();
      expect(dequeued?.data).toBe("first");
      expect(mockMessageQueue.size()).toBe(1); // Should remove

      const peekedAgain = mockMessageQueue.peek();
      expect(peekedAgain?.data).toBe("second");
    });
  });

  describe("Message Serializer Implementation", () => {
    it("should serialize and deserialize messages", () => {
      const mockSerializer = {
        serialize: function (message: any) {
          try {
            return JSON.stringify({
              ...message,
              serializedAt: new Date().toISOString(),
            });
          } catch (error) {
            throw new Error(`Serialization failed: ${error.message}`);
          }
        },

        deserialize: function (serializedMessage: string) {
          try {
            const parsed = JSON.parse(serializedMessage);
            return {
              ...parsed,
              deserializedAt: new Date().toISOString(),
            };
          } catch (error) {
            throw new Error(`Deserialization failed: ${error.message}`);
          }
        },

        isValid: function (serializedMessage: string) {
          try {
            JSON.parse(serializedMessage);
            return true;
          } catch {
            return false;
          }
        },
      };

      const originalMessage = {
        id: "msg-123",
        type: "command",
        from: "agent-001",
        to: "agent-002",
        payload: { action: "process", data: [1, 2, 3] },
      };

      // Test serialization
      const serialized = mockSerializer.serialize(originalMessage);
      expect(typeof serialized).toBe("string");
      expect(mockSerializer.isValid(serialized)).toBe(true);

      // Test deserialization
      const deserialized = mockSerializer.deserialize(serialized);
      expect(deserialized.id).toBe("msg-123");
      expect(deserialized.type).toBe("command");
      expect(deserialized.payload.action).toBe("process");
      expect(deserialized.payload.data).toEqual([1, 2, 3]);
      expect(deserialized.serializedAt).toBeDefined();
      expect(deserialized.deserializedAt).toBeDefined();

      // Test invalid serialized message
      expect(mockSerializer.isValid("invalid json")).toBe(false);
      expect(() => mockSerializer.deserialize("invalid json")).toThrow("Deserialization failed");
    });
  });

  describe("Message Validator Implementation", () => {
    it("should validate message structure and content", () => {
      const mockValidator = {
        validateStructure: function (message: any) {
          const errors: string[] = [];

          if (!message || typeof message !== "object") {
            errors.push("Message must be an object");
            return { valid: false, errors };
          }

          const requiredFields = ["id", "type", "from", "to", "timestamp"];
          requiredFields.forEach((field) => {
            if (!(field in message)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          if ("type" in message) {
            const validTypes = ["command", "query", "event", "reply", "heartbeat"];
            if (!validTypes.includes(message.type)) {
              errors.push(`Invalid message type: ${message.type}`);
            }
          }

          return { valid: errors.length === 0, errors };
        },

        validatePayload: function (message: any) {
          const errors: string[] = [];

          if ("payload" in message && message.type === "command") {
            if (!message.payload || typeof message.payload !== "object") {
              errors.push("Command messages must have an object payload");
            } else if (!message.payload.action) {
              errors.push("Command payload must have an action field");
            }
          }

          return { valid: errors.length === 0, errors };
        },

        validate: function (message: any) {
          const structureResult = this.validateStructure(message);
          if (!structureResult.valid) {
            return structureResult;
          }

          const payloadResult = this.validatePayload(message);
          return payloadResult;
        },
      };

      // Test valid message
      const validMessage = {
        id: "msg-123",
        type: "command",
        from: "agent-001",
        to: "agent-002",
        timestamp: new Date().toISOString(),
        payload: {
          action: "process-data",
          parameters: { input: "test" },
        },
      };

      const validResult = mockValidator.validate(validMessage);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid message structure
      const invalidMessage = {
        id: "msg-456",
        type: "invalid-type",
        // missing required fields
        payload: "not an object",
      };

      const invalidResult = mockValidator.validate(invalidMessage);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors).toContain("Missing required field: from");
      expect(invalidResult.errors).toContain("Invalid message type: invalid-type");
    });
  });
});
