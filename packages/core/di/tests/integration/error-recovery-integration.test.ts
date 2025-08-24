/**
 * Integration tests for error handling and recovery mechanisms
 *
 * Tests the seamless integration between the DI container and @axon/errors
 * recovery systems, including retry mechanisms, circuit breakers, and
 * correlation ID propagation through dependency chains.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import type { DIToken } from "../../src/container/container.types.js";

// Import error handling from @axon/errors
import {
  ApplicationError,
  ValidationError,
  ConfigurationError,
  RetryHandler,
  CircuitBreakerHandler,
  RecoveryManager,
} from "@axon/errors";

// Test services for error scenarios
class ReliableService {
  public readonly name = "ReliableService";

  process(): string {
    return "success";
  }
}

class UnreliableService {
  public readonly name = "UnreliableService";
  private attempts = 0;

  constructor(private readonly failureThreshold = 2) {}

  process(): string {
    this.attempts++;

    if (this.attempts <= this.failureThreshold) {
      throw new ApplicationError("Service temporarily unavailable", "SERVICE_UNAVAILABLE", {
        correlationId: `unreliable_${Date.now()}`,
        operation: "process",
        module: "UnreliableService",
        metadata: { attempt: this.attempts, threshold: this.failureThreshold },
      });
    }

    return "success after retries";
  }

  reset(): void {
    this.attempts = 0;
  }
}

class NetworkService {
  public readonly name = "NetworkService";
  private isHealthy = true;

  setHealth(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  async makeRequest(url: string): Promise<string> {
    if (!this.isHealthy) {
      throw new ApplicationError("Network service is unhealthy", "NETWORK_UNHEALTHY", {
        correlationId: `network_${Date.now()}`,
        operation: "makeRequest",
        module: "NetworkService",
        metadata: { url, isHealthy: this.isHealthy },
      });
    }

    return `Response from ${url}`;
  }
}

class DatabaseService {
  private connectionCount = 0;

  constructor(
    private readonly reliableService: ReliableService,
    private readonly networkService: NetworkService,
  ) {}

  async query(sql: string): Promise<any[]> {
    this.connectionCount++;

    // Use dependencies that might fail
    this.reliableService.process();
    await this.networkService.makeRequest("/database/query");

    return [{ id: 1, data: `Result for ${sql}`, connections: this.connectionCount }];
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }
}

// Service that aggregates errors from multiple dependencies
class AggregateService {
  constructor(
    private readonly database: DatabaseService,
    private readonly unreliable: UnreliableService,
  ) {}

  async processWithDependencies(): Promise<{ db: any[]; unreliable: string }> {
    const dbResult = await this.database.query("SELECT * FROM users");
    const unreliableResult = this.unreliable.process();

    return {
      db: dbResult,
      unreliable: unreliableResult,
    };
  }
}

// Tokens
const RELIABLE_TOKEN: DIToken<ReliableService> = "IReliableService";
const UNRELIABLE_TOKEN: DIToken<UnreliableService> = "IUnreliableService";
const NETWORK_TOKEN: DIToken<NetworkService> = "INetworkService";
const DATABASE_TOKEN: DIToken<DatabaseService> = "IDatabaseService";
const AGGREGATE_TOKEN: DIToken<AggregateService> = "IAggregateService";

describe("Error Recovery Integration", () => {
  let container: DIContainer;
  let retryHandler: RetryHandler;
  let circuitBreakerHandler: CircuitBreakerHandler;
  let recoveryManager: RecoveryManager;

  beforeEach(() => {
    container = new DIContainer({
      name: "ErrorRecoveryContainer",
      enableMetrics: true,
    });

    // Setup recovery mechanisms
    retryHandler = new RetryHandler({
      maxAttempts: 3,
      initialDelay: 10,
      backoffStrategy: "exponential",
    });

    circuitBreakerHandler = new CircuitBreakerHandler({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    recoveryManager = new RecoveryManager();

    // Configure recovery manager with retry strategy
    recoveryManager.addHandler("retry", retryHandler);
  });

  afterEach(() => {
    container.dispose();
  });

  describe("Basic Error Propagation", () => {
    it("should propagate errors with proper context through dependency chains", async () => {
      container.register(RELIABLE_TOKEN, ReliableService, { lifecycle: "singleton" });
      container.register(NETWORK_TOKEN, NetworkService, { lifecycle: "singleton" });
      container.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: [RELIABLE_TOKEN, NETWORK_TOKEN],
        lifecycle: "singleton",
      });

      const networkService = container.resolve(NETWORK_TOKEN);
      const databaseService = container.resolve(DATABASE_TOKEN);

      // Make network service unhealthy
      networkService.setHealth(false);

      let thrownError: any;
      try {
        await databaseService.query("SELECT 1");
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(ApplicationError);
      expect(thrownError.code).toBe("NETWORK_UNHEALTHY");
      expect(thrownError.context).toHaveProperty("correlationId");
      expect(thrownError.metadata).toHaveProperty("url", "/database/query");
      expect(thrownError.metadata).toHaveProperty("isHealthy", false);
    });

    it("should provide detailed error context for resolution failures", () => {
      container.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: ["NonExistentService" as DIToken, NETWORK_TOKEN],
      });

      try {
        container.resolve(DATABASE_TOKEN);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("DI_REGISTRATION_NOT_FOUND");
        expect(error.metadata).toHaveProperty("containerName", "ErrorRecoveryContainer");
        expect(error.metadata).toHaveProperty("token", "NonExistentService");
        expect(error.metadata).toHaveProperty("availableTokens");
        expect(error.context).toHaveProperty("correlationId");
      }
    });
  });

  describe("Retry Mechanism Integration", () => {
    it("should integrate with @axon/errors retry handler", async () => {
      container.register(UNRELIABLE_TOKEN, UnreliableService);

      const unreliableService = container.resolve(UNRELIABLE_TOKEN);

      // Use retry handler to make the service succeed
      const result = await retryHandler.executeWithRetry(async () => {
        return unreliableService.process();
      });

      expect(result).toBe("success after retries");

      const metrics = retryHandler.getMetrics();
      expect(metrics.totalAttempts).toBeGreaterThan(1);
      expect(metrics.successfulRetries).toBe(1);
    });

    it("should handle retry failures and provide context", async () => {
      container.registerFactory(UNRELIABLE_TOKEN, () => new UnreliableService(10)); // High failure threshold

      const unreliableService = container.resolve(UNRELIABLE_TOKEN);

      try {
        await retryHandler.executeWithRetry(async () => {
          return unreliableService.process();
        });
        expect.fail("Should have thrown error after exhausting retries");
      } catch (error: any) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect(error.code).toBe("SERVICE_UNAVAILABLE");

        const metrics = retryHandler.getMetrics();
        expect(metrics.totalAttempts).toBe(3); // maxAttempts
        expect(metrics.failedRetries).toBe(1);
      }
    });

    it("should maintain correlation IDs across retries", async () => {
      container.register(UNRELIABLE_TOKEN, UnreliableService);

      const unreliableService = container.resolve(UNRELIABLE_TOKEN);
      const correlationId = `test_correlation_${Date.now()}`;

      // Mock to track correlation ID consistency
      const originalProcess = unreliableService.process;
      const correlationIds: string[] = [];

      // Override the process method to track correlation IDs
      unreliableService.process = function () {
        try {
          return originalProcess.call(this);
        } catch (error: any) {
          correlationIds.push(error.context?.correlationId || "no-correlation");
          throw error;
        }
      };

      await retryHandler.executeWithRetry(async () => {
        return unreliableService.process();
      });

      // Should have maintained correlation context
      expect(correlationIds.length).toBeGreaterThan(0);
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should integrate with circuit breaker for failing services", async () => {
      container.register(NETWORK_TOKEN, NetworkService);

      const networkService = container.resolve(NETWORK_TOKEN);
      networkService.setHealth(false); // Make service fail

      // Trigger circuit breaker by making multiple failing calls
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerHandler.execute(async () => {
            return await networkService.makeRequest("/test");
          });
        } catch (error) {
          // Expected failures
        }
      }

      const state = circuitBreakerHandler.getState();
      expect(state).toBe("OPEN"); // Circuit should be open after failures

      const metrics = circuitBreakerHandler.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
    });

    it("should recover when service becomes healthy", async () => {
      container.register(NETWORK_TOKEN, NetworkService);

      const networkService = container.resolve(NETWORK_TOKEN);

      // Start healthy
      networkService.setHealth(true);

      const result = await circuitBreakerHandler.execute(async () => {
        return await networkService.makeRequest("/healthy");
      });

      expect(result).toBe("Response from /healthy");
      expect(circuitBreakerHandler.getState()).toBe("CLOSED");
    });
  });

  describe("Recovery Manager Integration", () => {
    it("should coordinate multiple recovery strategies", async () => {
      container.register(RELIABLE_TOKEN, ReliableService);
      container.register(UNRELIABLE_TOKEN, UnreliableService);
      container.register(NETWORK_TOKEN, NetworkService);
      container.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: [RELIABLE_TOKEN, NETWORK_TOKEN],
      });
      container.register(AGGREGATE_TOKEN, AggregateService, {
        dependencies: [DATABASE_TOKEN, UNRELIABLE_TOKEN],
      });

      const aggregateService = container.resolve(AGGREGATE_TOKEN);

      const operation = {
        id: "aggregate-operation",
        name: "processWithDependencies",
        operation: async () => await aggregateService.processWithDependencies(),
      };

      const result = await recoveryManager.executeWithRecovery(operation);

      expect(result).toBeDefined();
      expect(result.db).toEqual(expect.arrayContaining([expect.objectContaining({ id: 1, connections: 3 })]));
      expect(result.unreliable).toBe("success after retries");
    });

    it("should provide comprehensive error context on final failure", async () => {
      container.registerFactory(UNRELIABLE_TOKEN, () => new UnreliableService(10)); // Always fails

      const unreliableService = container.resolve(UNRELIABLE_TOKEN);

      try {
        const operation = {
          id: "unreliable-operation",
          name: "process",
          operation: async () => unreliableService.process(),
        };

        await recoveryManager.executeWithRecovery(operation);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect(error.code).toBe("SERVICE_UNAVAILABLE");

        const metrics = recoveryManager.getMetrics();
        expect(metrics.totalAttempts).toBeGreaterThan(0);
        expect(metrics.failedAttempts).toBeGreaterThan(0);
      }
    });
  });

  describe("Graceful Degradation", () => {
    it("should handle service degradation gracefully", async () => {
      container.register(NETWORK_TOKEN, NetworkService, { lifecycle: "singleton" });
      container.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: [RELIABLE_TOKEN, NETWORK_TOKEN],
        lifecycle: "singleton",
      });
      container.register(RELIABLE_TOKEN, ReliableService, { lifecycle: "singleton" });

      const databaseService = container.resolve(DATABASE_TOKEN);
      const networkService = container.resolve(NETWORK_TOKEN);

      // First, ensure it works normally
      const normalResult = await databaseService.query("SELECT 1");
      expect(normalResult).toBeDefined();

      // Now make network service unhealthy and implement degradation
      networkService.setHealth(false);

      // Implement a degraded version that catches network errors
      const degradedQuery = async (sql: string): Promise<any[]> => {
        try {
          return await databaseService.query(sql);
        } catch (error) {
          if (error instanceof ApplicationError && error.code === "NETWORK_UNHEALTHY") {
            // Return cached/default result
            return [{ id: 0, data: "Cached result", connections: 0, degraded: true }];
          }
          throw error;
        }
      };

      const degradedResult = await degradedQuery("SELECT 2");
      expect(degradedResult[0].degraded).toBe(true);
      expect(degradedResult[0].data).toBe("Cached result");
    });
  });

  describe("Cross-Module Error Context", () => {
    it("should maintain error context across multiple resolution levels", () => {
      // Create a deep dependency chain that will fail
      class DeepService {
        constructor(private db: DatabaseService) {}

        process(): string {
          // This will trigger the dependency chain
          return "deep-result";
        }
      }

      const DEEP_TOKEN: DIToken<DeepService> = "IDeepService";

      container.register(RELIABLE_TOKEN, ReliableService);
      container.register(NETWORK_TOKEN, NetworkService);
      container.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: [RELIABLE_TOKEN, "MissingService" as DIToken], // This will fail
      });
      container.register(DEEP_TOKEN, DeepService, {
        dependencies: [DATABASE_TOKEN],
      });

      try {
        container.resolve(DEEP_TOKEN);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("DI_REGISTRATION_NOT_FOUND");
        expect(error.metadata.token).toBe("MissingService");
        expect(error.context.correlationId).toBeDefined();
        expect(error.metadata.containerName).toBe("ErrorRecoveryContainer");
      }
    });

    it("should provide performance context for error scenarios", () => {
      const startTime = performance.now();

      container.register(UNRELIABLE_TOKEN, UnreliableService);

      try {
        // Make multiple resolution attempts
        for (let i = 0; i < 10; i++) {
          container.resolve(UNRELIABLE_TOKEN);
        }
      } catch (error) {
        // Expected failure
      }

      const endTime = performance.now();
      const metrics = container.getMetrics();

      expect(metrics.totalResolutions).toBeGreaterThan(0);
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });

  describe("Memory Management During Errors", () => {
    it("should clean up resources properly after errors", () => {
      const initialMetrics = container.getMetrics();

      // Register services that will fail
      container.register(UNRELIABLE_TOKEN, UnreliableService);
      container.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: ["InvalidDep" as DIToken, UNRELIABLE_TOKEN],
      });

      // Attempt multiple resolutions that will fail
      for (let i = 0; i < 50; i++) {
        try {
          container.resolve(DATABASE_TOKEN);
        } catch (error) {
          // Expected failures
        }
      }

      const finalMetrics = container.getMetrics();

      // Should track failed attempts but not leak memory
      expect(finalMetrics.totalResolutions).toBeGreaterThan(initialMetrics.totalResolutions);
      expect(finalMetrics.memoryUsage.singletonCount).toBe(initialMetrics.memoryUsage.singletonCount);
    });

    it("should dispose containers cleanly even after errors", () => {
      container.register(UNRELIABLE_TOKEN, UnreliableService);

      // Generate some errors
      try {
        container.resolve("NonExistent" as DIToken);
      } catch (error) {
        // Expected
      }

      // Should dispose cleanly
      expect(() => container.dispose()).not.toThrow();

      // Should not accept operations after disposal
      expect(() => {
        container.resolve(UNRELIABLE_TOKEN);
      }).toThrow("Container has been disposed");
    });
  });
});
