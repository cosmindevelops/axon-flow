/**
 * Integration tests for transport circuit breaker functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransportCircuitBreakerFactory } from "../../src/circuit-breaker/circuit-breaker.classes.js";
import { MultiTransportManager, RemoteTransportProvider } from "../../src/transport/transport.classes.js";
import type {
  ILogEntry,
  IMultiTransportConfig,
  IRemoteTransportOptions,
  ITransportConfig,
} from "../../src/transport/transport.types.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("Transport Circuit Breaker Integration", () => {
  let mockLogEntry: ILogEntry;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogEntry = {
      level: "info",
      message: "Test message",
      timestamp: Date.now(),
      correlationId: "test-correlation-id",
      meta: { source: "test-service" },
    };

    mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockClear();
  });

  afterEach(async () => {
    // Enhanced cleanup to prevent memory leaks
    TransportCircuitBreakerFactory.clear();
    vi.clearAllTimers();
    vi.useRealTimers();

    // Increase max listeners temporarily to prevent warnings during cleanup
    if (typeof process !== "undefined" && process.stdout && process.stdout.setMaxListeners) {
      process.stdout.setMaxListeners(20);
      process.stderr.setMaxListeners(20);
    }

    // Force garbage collection if available
    if (typeof (global as any).gc === "function") {
      (global as any).gc();
    }

    // Small delay to allow cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Reset max listeners back to default
    if (typeof process !== "undefined" && process.stdout && process.stdout.setMaxListeners) {
      process.stdout.setMaxListeners(10);
      process.stderr.setMaxListeners(10);
    }
  });

  describe("Remote Transport Circuit Breaker", () => {
    it("should open circuit after failure threshold", async () => {
      const config: ITransportConfig = {
        name: "remote",
        type: "remote",
        options: {
          url: "https://logs.example.com/api/logs",
          circuitBreaker: {
            enabled: true,
            failureThreshold: 3,
            resetTimeoutMs: 5000,
            monitorTimeWindowMs: 1000,
          },
          batchSize: 1, // Force immediate flush
        } as IRemoteTransportOptions,
      };

      const transport = new RemoteTransportProvider(config);

      // Mock fetch to always fail
      mockFetch.mockRejectedValue(new Error("Network error"));

      // First 3 failures should be attempted
      for (let i = 0; i < 3; i++) {
        await expect(transport.write(mockLogEntry)).rejects.toThrow();
        await transport.flush(); // Force flush to trigger circuit breaker
      }

      // Add small delay to ensure circuit breaker state updates
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Circuit should now be open
      const metrics = transport.getMetrics();
      expect(metrics.circuitBreakerMetrics?.state).toBe("open");

      // Next attempt should fail immediately without network call
      const callCountBefore = mockFetch.mock.calls.length;
      await expect(transport.write(mockLogEntry)).rejects.toThrow();
      await transport.flush();

      // Should not make additional network calls when circuit is open
      expect(mockFetch.mock.calls.length).toBe(callCountBefore);

      // Clean up transport to prevent memory leaks
      await transport.close();
    });

    it("should transition to half-open after reset timeout", async () => {
      vi.useFakeTimers();

      try {
        const config: ITransportConfig = {
          name: "remote",
          type: "remote",
          options: {
            url: "https://logs.example.com/api/logs",
            circuitBreaker: {
              enabled: true,
              failureThreshold: 2,
              resetTimeoutMs: 1000,
              monitorTimeWindowMs: 1000,
            },
            batchSize: 1,
          } as IRemoteTransportOptions,
        };

        const transport = new RemoteTransportProvider(config);

        // Trigger circuit breaker opening
        mockFetch.mockRejectedValueOnce(new Error("Network error"));
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        await expect(transport.write(mockLogEntry)).rejects.toThrow();
        await transport.flush();
        await expect(transport.write(mockLogEntry)).rejects.toThrow();
        await transport.flush();

        expect(transport.getMetrics().circuitBreakerMetrics?.state).toBe("open");

        // Wait for reset timeout
        vi.advanceTimersByTime(1500);

        // Give time for async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Mock successful response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        });

        // Should transition to half-open and allow one attempt
        await transport.write(mockLogEntry);
        await transport.flush();

        expect(transport.getMetrics().circuitBreakerMetrics?.state).toBe("closed");

        // Clean up transport
        await transport.close();
      } finally {
        vi.useRealTimers();
      }
    }, 15000); // Increase timeout to 15 seconds

    it("should handle retry logic with exponential backoff", async () => {
      vi.useFakeTimers();

      try {
        const config: ITransportConfig = {
          name: "remote",
          type: "remote",
          options: {
            url: "https://logs.example.com/api/logs",
            circuitBreaker: {
              enabled: true,
              failureThreshold: 5,
              resetTimeoutMs: 5000,
              monitorTimeWindowMs: 1000,
            },
            retryAttempts: 3,
            retryDelay: 100,
            batchSize: 1,
          } as IRemoteTransportOptions,
        };

        const transport = new RemoteTransportProvider(config);

        // Mock transient failures followed by success
        mockFetch
          .mockRejectedValueOnce(new Error("Temporary failure"))
          .mockRejectedValueOnce(new Error("Temporary failure"))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: "OK",
          });

        await transport.write(mockLogEntry);

        // Advance timers to trigger retries
        vi.advanceTimersByTime(100); // First retry
        vi.advanceTimersByTime(200); // Second retry with exponential backoff

        // Give time for async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        await transport.flush();

        // Should eventually succeed after retries
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(transport.isHealthy()).toBe(true);

        // Clean up transport
        await transport.close();
      } finally {
        vi.useRealTimers();
      }
    }, 15000); // Increase timeout to 15 seconds
  });

  describe("Multi-Transport Failure Handling", () => {
    it("should handle partial transport failures gracefully", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "console",
            type: "console",
            options: {},
          },
          {
            name: "remote",
            type: "remote",
            options: {
              url: "https://logs.example.com/api/logs",
              circuitBreaker: {
                enabled: true,
                failureThreshold: 1,
                resetTimeoutMs: 5000,
                monitorTimeWindowMs: 1000,
              },
              batchSize: 1,
            } as IRemoteTransportOptions,
          },
        ],
        routing: {
          rules: {},
          fallbackBehavior: "continue",
          failureThreshold: 0.5, // Allow up to 50% transport failures
        },
      };

      const manager = new MultiTransportManager(config);

      // Mock remote transport failure
      mockFetch.mockRejectedValue(new Error("Remote service down"));

      // Should continue even if remote transport fails
      await expect(manager.write(mockLogEntry)).resolves.not.toThrow();

      // Console transport should still be healthy
      const healthyTransports = manager.getHealthyTransports();
      expect(healthyTransports.length).toBe(1);
      expect(healthyTransports[0].type).toBe("console");

      // Clean up manager
      await manager.close();
    });

    it("should stop on high failure rate when configured", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "remote1",
            type: "remote",
            options: {
              url: "https://logs1.example.com/api/logs",
              batchSize: 1,
            } as IRemoteTransportOptions,
          },
          {
            name: "remote2",
            type: "remote",
            options: {
              url: "https://logs2.example.com/api/logs",
              batchSize: 1,
            } as IRemoteTransportOptions,
          },
        ],
        routing: {
          rules: {},
          fallbackBehavior: "stop",
          failureThreshold: 0.3, // Stop if >30% transports fail
        },
      };

      const manager = new MultiTransportManager(config);

      // Mock both transports failing (100% failure rate)
      mockFetch.mockRejectedValue(new Error("All services down"));

      // Should throw due to high failure rate
      await expect(manager.write(mockLogEntry)).rejects.toThrow();

      // Clean up manager
      await manager.close();
    });
  });

  describe("Circuit Breaker Factory", () => {
    it("should create transport-specific circuit breakers", () => {
      const config1 = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        monitorTimeWindowMs: 1000,
      };

      const config2 = {
        enabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 10000,
        monitorTimeWindowMs: 2000,
      };

      const breaker1 = TransportCircuitBreakerFactory.create("transport1", config1);
      const breaker2 = TransportCircuitBreakerFactory.create("transport2", config2);

      expect(breaker1).toBeDefined();
      expect(breaker2).toBeDefined();
      expect(breaker1).not.toBe(breaker2);

      // Should return same instance for same transport name
      const breaker1Again = TransportCircuitBreakerFactory.create("transport1", config1);
      expect(breaker1Again).toBe(breaker1);
    });

    it("should collect metrics from all circuit breakers", () => {
      const config = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        monitorTimeWindowMs: 1000,
      };

      TransportCircuitBreakerFactory.create("transport1", config);
      TransportCircuitBreakerFactory.create("transport2", config);

      const allMetrics = TransportCircuitBreakerFactory.getAllMetrics();

      expect(allMetrics).toHaveProperty("transport:transport1");
      expect(allMetrics).toHaveProperty("transport:transport2");

      expect(allMetrics["transport:transport1"]).toMatchObject({
        state: "closed",
        failures: 0,
        successes: 0,
        totalCalls: 0,
      });
    });

    it("should reset all circuit breakers", () => {
      const config = {
        enabled: true,
        failureThreshold: 1,
        resetTimeoutMs: 5000,
        monitorTimeWindowMs: 1000,
      };

      const breaker1 = TransportCircuitBreakerFactory.create("transport1", config);
      const breaker2 = TransportCircuitBreakerFactory.create("transport2", config);

      // Trigger some failures
      breaker1.recordFailure();
      breaker2.recordFailure();

      expect(breaker1.getMetrics().failureCount).toBe(1);
      expect(breaker2.getMetrics().failureCount).toBe(1);

      // Reset all
      TransportCircuitBreakerFactory.resetAll();

      expect(breaker1.getMetrics().failureCount).toBe(0);
      expect(breaker2.getMetrics().failureCount).toBe(0);
    });
  });

  describe("Performance Monitoring Integration", () => {
    it("should track performance metrics with circuit breaker state", async () => {
      const config: IMultiTransportConfig = {
        transports: [
          {
            name: "remote",
            type: "remote",
            options: {
              url: "https://logs.example.com/api/logs",
              circuitBreaker: {
                enabled: true,
                failureThreshold: 2,
                resetTimeoutMs: 5000,
                monitorTimeWindowMs: 1000,
              },
              batchSize: 1,
            } as IRemoteTransportOptions,
          },
        ],
        performanceMonitoring: true,
      };

      const manager = new MultiTransportManager(config);

      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      // Write some logs
      await manager.write(mockLogEntry);
      await manager.write(mockLogEntry);

      const metrics = manager.getTransportMetrics();
      expect(metrics.remote.messagesWritten).toBe(2);
      expect(metrics.remote.circuitBreakerMetrics?.state).toBe("closed");
      expect(metrics.remote.circuitBreakerMetrics?.totalCalls).toBeGreaterThan(0);

      // Clean up manager
      await manager.close();
    });
  });
});
