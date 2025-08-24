/**
 * End-to-end integration test for multiple sink configuration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransportCircuitBreakerFactory } from "../../src/circuit-breaker/circuit-breaker.classes.js";
import { MultiTransportManager } from "../../src/transport/transport.classes.js";
import type { ILogEntry, IMultiTransportConfig } from "../../src/transport/transport.types.js";

// Mock fetch and filesystem
global.fetch = vi.fn();

vi.mock("fs", () => {
  const mockCreateWriteStream = vi.fn(() => ({
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  }));

  return {
    createWriteStream: mockCreateWriteStream,
    promises: {
      mkdir: vi.fn(),
      stat: vi.fn(),
      appendFile: vi.fn(),
      readdir: vi.fn(),
      unlink: vi.fn(),
    },
  };
});

describe("Multiple Sink Configuration E2E", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockClear();

    // Reset fs mock to default state
    const createWriteStreamMock = (await import("fs")).createWriteStream as ReturnType<typeof vi.fn>;
    createWriteStreamMock.mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
    } as any);

    const fsMock = (await vi.importMock("fs")) as any;
    const mkdirMock = fsMock.promises.mkdir as ReturnType<typeof vi.fn>;
    const statMock = fsMock.promises.stat as ReturnType<typeof vi.fn>;
    const appendFileMock = fsMock.promises.appendFile as ReturnType<typeof vi.fn>;
    const readdirMock = fsMock.promises.readdir as ReturnType<typeof vi.fn>;
    
    mkdirMock.mockResolvedValue(undefined);
    statMock.mockResolvedValue({ size: 1024 } as any);
    appendFileMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue([]);
  });

  afterEach(async () => {
    TransportCircuitBreakerFactory.clear();
    vi.clearAllTimers();
    
    // Enhanced cleanup with proper async handling
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // Ensure any pending promises are resolved
    await Promise.resolve();
  });

  it("should demonstrate complete multiple sink workflow", async () => {
    // Complete configuration showcasing all features
    const config: IMultiTransportConfig = {
      transports: [
        {
          name: "console-dev",
          type: "console",
          options: {
            prettyPrint: true,
            colorize: true,
            includeMetadata: true,
          },
          routing: {
            levels: ["debug", "info", "warn", "error"],
            sources: ["dev", "test"],
          },
          priority: 10,
          enabled: true,
        },
        {
          name: "file-app",
          type: "file",
          options: {
            path: "/var/log/app/application.log",
            rotation: {
              strategy: "size",
              maxSize: 10 * 1024 * 1024, // 10MB
              maxFiles: 5,
              compress: false,
            },
            bufferSize: 1000,
            flushInterval: 5000,
            encoding: "utf8",
            ensureDirectory: true,
          },
          routing: {
            levels: ["info", "warn", "error"],
          },
          priority: 8,
        },
        {
          name: "file-error",
          type: "file",
          options: {
            path: "/var/log/app/error.log",
            rotation: {
              strategy: "daily",
              maxFiles: 30,
              dateFormat: "YYYY-MM-DD",
            },
          },
          routing: {
            levels: ["error"],
            exclude: false,
          },
          priority: 9,
        },
        {
          name: "remote-centralized",
          type: "remote",
          options: {
            url: "https://logs.company.com/api/v1/logs",
            headers: {
              "X-API-Key": "secret-key",
              "X-Service": "axon-flow",
            },
            batchSize: 50,
            flushInterval: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            circuitBreaker: {
              enabled: true,
              failureThreshold: 5,
              resetTimeoutMs: 60000,
              monitorTimeWindowMs: 30000,
            },
            timeout: 15000,
            authToken: "bearer-token",
          },
          routing: {
            levels: ["warn", "error"],
            sources: ["production"],
          },
          priority: 5,
        },
      ],
      routing: {
        rules: {
          security: {
            levels: ["warn", "error"],
            sources: ["auth", "security"],
          },
          performance: {
            levels: ["info"],
            sources: ["perf", "metrics"],
          },
        },
        defaultTransports: ["console-dev", "file-app"],
        fallbackBehavior: "continue",
        failureThreshold: 0.3,
      },
      globalCircuitBreaker: {
        enabled: true,
        failureThreshold: 10,
        resetTimeoutMs: 30000,
        monitorTimeWindowMs: 5000,
      },
      performanceMonitoring: true,
      metricsInterval: 60000,
    };

    // Initialize manager
    const manager = new MultiTransportManager(config);

    // Mock console write
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Mock file stream
    const mockFileStream = {
      write: vi.fn((_, callback) => {
        if (callback) callback();
        return true;
      }),
      end: vi.fn((callback) => callback && callback()),
      on: vi.fn(),
    };
    const fs = (await vi.importMock("fs")) as any;
    const createWriteStreamMock = fs.createWriteStream as ReturnType<typeof vi.fn>;
    createWriteStreamMock.mockReturnValue(mockFileStream);

    // Mock successful remote response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    // Test scenarios
    const testCases = [
      {
        description: "Debug log from dev environment",
        entry: {
          level: "debug",
          message: "Debug information",
          timestamp: Date.now(),
          correlationId: "debug-001",
          meta: { source: "dev", component: "auth" },
        },
        expectedTransports: ["console-dev"], // Only console accepts debug
      },
      {
        description: "Info log from production",
        entry: {
          level: "info",
          message: "User login successful",
          timestamp: Date.now(),
          correlationId: "info-001",
          meta: { source: "production", userId: "user123" },
        },
        expectedTransports: ["file-app"], // Console excludes production, remote needs warn/error
      },
      {
        description: "Error log from production",
        entry: {
          level: "error",
          message: "Database connection failed",
          timestamp: Date.now(),
          correlationId: "error-001",
          meta: { source: "production", component: "database" },
        },
        expectedTransports: ["file-app", "file-error", "remote-centralized"], // All accept errors from production
      },
      {
        description: "Security warning",
        entry: {
          level: "warn",
          message: "Failed login attempt",
          timestamp: Date.now(),
          correlationId: "security-001",
          meta: { source: "auth", ip: "192.168.1.100", attempts: 3 },
        },
        expectedTransports: ["file-app", "remote-centralized"], // Matches security rule
      },
    ];

    // Execute test cases
    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.description}`);

      await expect(manager.write(testCase.entry as ILogEntry)).resolves.not.toThrow();

      // Verify metrics are being tracked
      const metrics = manager.getTransportMetrics();
      expect(Object.keys(metrics)).toHaveLength(4);

      for (const [, metric] of Object.entries(metrics)) {
        expect(metric).toMatchObject({
          messagesWritten: expect.any(Number),
          messagesFailed: expect.any(Number),
          bytesWritten: expect.any(Number),
          averageWriteTime: expect.any(Number),
        });
      }
    }

    // Test circuit breaker functionality
    console.log("Testing circuit breaker with remote failures");

    // Mock remote failures
    mockFetch.mockRejectedValue(new Error("Service unavailable"));

    const errorEntry: ILogEntry = {
      level: "error",
      message: "Circuit breaker test",
      timestamp: Date.now(),
      correlationId: "cb-test",
      meta: { source: "production" },
    };

    // Should handle remote failure gracefully - write multiple times to trigger circuit breaker
    await expect(manager.write(errorEntry)).resolves.not.toThrow();
    await expect(manager.write(errorEntry)).resolves.not.toThrow();
    await expect(manager.write(errorEntry)).resolves.not.toThrow();

    // Force flush to ensure all writes are attempted
    await manager.flush();

    // Small delay to allow async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify circuit breaker metrics - should have failed messages now
    const remoteMetrics = manager.getTransportMetrics()["remote-centralized"];
    expect(remoteMetrics).toBeDefined();
    expect(remoteMetrics?.circuitBreakerMetrics).toBeDefined();

    // Check that fetch was called (indicating attempts were made)
    expect(mockFetch).toHaveBeenCalled();

    // The messagesFailed count should be greater than 0 after flush and delay
    expect(remoteMetrics?.messagesFailed).toBeGreaterThan(0);

    // Test file rotation trigger
    console.log("Testing file rotation");

    // Mock large file size to trigger rotation
    const fsMockForRotation = (await vi.importMock("fs")) as any;
    const statMockForRotation = fsMockForRotation.promises.stat as ReturnType<typeof vi.fn>;
    statMockForRotation.mockResolvedValue({ size: 11 * 1024 * 1024 }); // 11MB > 10MB limit

    const largeEntry: ILogEntry = {
      level: "info",
      message: "Large log entry to trigger rotation",
      timestamp: Date.now(),
      correlationId: "rotation-test",
      meta: { source: "test", data: "x".repeat(1000) },
    };

    await manager.write(largeEntry);

    // Should have created multiple streams due to rotation
    const createWriteStreamMockForRotation = fsMockForRotation.createWriteStream as ReturnType<typeof vi.fn>;
    expect(createWriteStreamMockForRotation).toHaveBeenCalledTimes(2);

    // Test performance monitoring
    console.log("Testing performance monitoring");

    // Write multiple entries rapidly
    const performanceEntries = Array.from({ length: 10 }, (_, i) => ({
      level: "info",
      message: `Performance test ${i}`,
      timestamp: Date.now(),
      correlationId: `perf-${i}`,
      meta: { source: "perf" },
    }));

    for (const entry of performanceEntries) {
      await manager.write(entry as ILogEntry);
    }

    // Verify all transports are still healthy
    const healthyTransports = manager.getHealthyTransports();
    expect(healthyTransports.length).toBeGreaterThan(0);

    // Test graceful shutdown
    console.log("Testing graceful shutdown");

    await manager.flush();
    await manager.close();

    // Verify proper cleanup
    expect(mockFileStream.end).toHaveBeenCalled();

    console.log("✅ Multiple sink configuration E2E test completed successfully!");
  });

  it("should handle cross-environment compatibility", async () => {
    // Test browser vs Node.js compatibility
    const config: IMultiTransportConfig = {
      transports: [
        {
          name: "console",
          type: "console",
          options: {
            prettyPrint: false, // Browser-friendly
          },
        },
      ],
      performanceMonitoring: true,
    };

    const manager = new MultiTransportManager(config);

    const entry: ILogEntry = {
      level: "info",
      message: "Cross-environment test",
      timestamp: Date.now(),
      correlationId: "cross-env-001",
      meta: { environment: "test" },
    };

    // Should work regardless of environment
    await expect(manager.write(entry)).resolves.not.toThrow();

    const metrics = manager.getTransportMetrics();
    expect(metrics["console"]?.messagesWritten).toBe(1);
  });

  it("should validate schema compliance", async () => {
    // Import and test schema validation
    const { MULTI_TRANSPORT_CONFIG_SCHEMA } = await import("../../src/transport/transport.schemas.js");

    const validConfig: IMultiTransportConfig = {
      transports: [
        {
          name: "test",
          type: "console",
          options: { prettyPrint: true },
        },
      ],
    };

    // Should pass validation
    expect(() => MULTI_TRANSPORT_CONFIG_SCHEMA.parse(validConfig)).not.toThrow();

    // Invalid config should fail
    const invalidConfig = {
      transports: [
        {
          // Missing required name field
          type: "console",
        },
      ],
    };

    expect(() => MULTI_TRANSPORT_CONFIG_SCHEMA.parse(invalidConfig)).toThrow();
  });
});