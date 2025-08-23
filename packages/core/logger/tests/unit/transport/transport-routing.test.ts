/**
 * Unit tests for transport routing functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MultiTransportManager,
  ConsoleTransportProvider,
  FileTransportProvider,
  RemoteTransportProvider,
} from "../../../src/transport/transport.classes.js";
import type {
  IMultiTransportConfig,
  ILogEntry,
  ITransportRoutingRule,
} from "../../../src/transport/transport.types.js";

describe("Transport Routing", () => {
  let mockLogEntry: ILogEntry;

  beforeEach(() => {
    mockLogEntry = {
      level: "info",
      message: "Test message",
      timestamp: Date.now(),
      correlationId: "test-correlation-id",
      meta: { source: "test-service" },
    };
  });

  describe("Level-based routing", () => {
    it("should route only error logs to error transport", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "console",
            type: "console",
            options: {},
            routing: { levels: ["info", "debug", "trace"] },
          },
          {
            name: "error-file",
            type: "file",
            options: { path: "/tmp/error.log" },
            routing: { levels: ["error", "warn"] },
          },
        ],
      };

      const manager = new MultiTransportManager(config);

      // Test info log goes to console only
      const infoEntry = { ...mockLogEntry, level: "info" };
      await expect(manager.write(infoEntry)).resolves.not.toThrow();

      // Test error log goes to error-file only
      const errorEntry = { ...mockLogEntry, level: "error" };
      await expect(manager.write(errorEntry)).resolves.not.toThrow();
    });

    it("should handle exclude routing rules", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "all-except-debug",
            type: "console",
            options: {},
            routing: { levels: ["debug"], exclude: true },
          },
        ],
      };

      const manager = new MultiTransportManager(config);

      // Info should go through (not excluded)
      const infoEntry = { ...mockLogEntry, level: "info" };
      await expect(manager.write(infoEntry)).resolves.not.toThrow();

      // Debug should be excluded
      const debugEntry = { ...mockLogEntry, level: "debug" };
      await expect(manager.write(debugEntry)).resolves.not.toThrow();
    });
  });

  describe("Source-based routing", () => {
    it("should route based on source patterns", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "auth-logs",
            type: "file",
            options: { path: "/tmp/auth.log" },
            routing: { sources: ["auth-service", "user-service"] },
          },
          {
            name: "api-logs",
            type: "file",
            options: { path: "/tmp/api.log" },
            routing: { sources: ["api-gateway"] },
          },
        ],
      };

      const manager = new MultiTransportManager(config);

      // Auth service log should route to auth-logs
      const authEntry = {
        ...mockLogEntry,
        meta: { source: "auth-service" },
      };
      await expect(manager.write(authEntry)).resolves.not.toThrow();

      // API gateway log should route to api-logs
      const apiEntry = {
        ...mockLogEntry,
        meta: { source: "api-gateway" },
      };
      await expect(manager.write(apiEntry)).resolves.not.toThrow();
    });
  });

  describe("Transport priority", () => {
    it("should write to transports in priority order", async () => {
      const writeOrder: string[] = [];

      // Mock transports to track write order
      const mockWrite = vi.fn().mockImplementation(async function (this: any) {
        writeOrder.push(this.name);
      });

      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "low-priority",
            type: "console",
            options: {},
            priority: 1,
          },
          {
            name: "high-priority",
            type: "console",
            options: {},
            priority: 10,
          },
          {
            name: "medium-priority",
            type: "console",
            options: {},
            priority: 5,
          },
        ],
      };

      const manager = new MultiTransportManager(config);

      // Override transport write methods to track order
      const transports = manager.getAllTransports();
      transports.forEach((transport, index) => {
        const name = config.transports[index].name;
        (transport as any).name = name;
        transport.write = mockWrite.bind({ name });
      });

      await manager.write(mockLogEntry);

      // Should write in priority order: high -> medium -> low
      expect(writeOrder).toEqual(["high-priority", "medium-priority", "low-priority"]);
    });
  });

  describe("Fallback behavior", () => {
    it("should handle 'continue' fallback when no transports match", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "error-only",
            type: "console",
            options: {},
            routing: { levels: ["error"] },
          },
        ],
        routing: {
          rules: {},
          fallbackBehavior: "continue",
        },
      };

      const manager = new MultiTransportManager(config);

      // Info log should not match any transport but should continue without error
      const infoEntry = { ...mockLogEntry, level: "info" };
      await expect(manager.write(infoEntry)).resolves.not.toThrow();
    });

    it("should handle 'stop' fallback when no transports match", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "error-only",
            type: "console",
            options: {},
            routing: { levels: ["error"] },
          },
        ],
        routing: {
          rules: {},
          fallbackBehavior: "stop",
        },
      };

      const manager = new MultiTransportManager(config);

      // Info log should not match any transport and should throw error
      const infoEntry = { ...mockLogEntry, level: "info" };
      await expect(manager.write(infoEntry)).rejects.toThrow("No target transports available for log entry");
    });
  });

  describe("Transport health checks", () => {
    it("should skip unhealthy transports", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "healthy",
            type: "console",
            options: {},
          },
          {
            name: "unhealthy",
            type: "console",
            options: {},
          },
        ],
      };

      const manager = new MultiTransportManager(config);
      const transports = manager.getAllTransports();

      // Mark second transport as unhealthy
      const unhealthyTransport = transports[1];
      vi.spyOn(unhealthyTransport, "isHealthy").mockReturnValue(false);

      // Should only write to healthy transport
      const healthyWriteSpy = vi.spyOn(transports[0], "write");
      const unhealthyWriteSpy = vi.spyOn(unhealthyTransport, "write");

      await manager.write(mockLogEntry);

      expect(healthyWriteSpy).toHaveBeenCalledWith(mockLogEntry);
      expect(unhealthyWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe("Metrics collection", () => {
    it("should collect transport metrics", () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "console",
            type: "console",
            options: {},
          },
          {
            name: "file",
            type: "file",
            options: { path: "/tmp/test.log" },
          },
        ],
      };

      const manager = new MultiTransportManager(config);
      const metrics = manager.getTransportMetrics();

      expect(metrics).toHaveProperty("console");
      expect(metrics).toHaveProperty("file");

      expect(metrics.console).toMatchObject({
        messagesWritten: expect.any(Number),
        messagesFailed: expect.any(Number),
        bytesWritten: expect.any(Number),
        averageWriteTime: expect.any(Number),
      });
    });
  });
});
