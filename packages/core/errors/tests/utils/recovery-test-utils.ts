/**
 * Test utilities for error recovery mechanism testing
 * Provides common scenarios, mocks, and helper functions
 */

import { EventEmitter } from "node:events";
import { BaseAxonError } from "../../src/base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../../src/base/base-error.types.js";

/**
 * Collection of predefined test errors for common scenarios
 */
export const TestErrors = {
  NETWORK_TIMEOUT: new BaseAxonError("Network operation timed out", "NET_TIMEOUT", {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    metadata: {
      endpoint: "https://api.example.com/data",
      timeout: 5000,
      attempt: 1,
    },
  }),

  SERVICE_UNAVAILABLE: new BaseAxonError("External service unavailable", "SERVICE_DOWN", {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.ERROR,
    metadata: {
      service: "user-service",
      statusCode: 503,
      retryAfter: 60,
    },
  }),

  DATABASE_CONNECTION_FAILED: new BaseAxonError("Database connection failed", "DB_CONN_FAIL", {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    metadata: {
      host: "localhost",
      port: 5432,
      database: "test_db",
      connectionPool: "exhausted",
    },
  }),

  AUTHENTICATION_FAILED: new BaseAxonError("Authentication failed", "AUTH_FAILED", {
    category: ErrorCategory.APPLICATION,
    severity: ErrorSeverity.ERROR,
    metadata: {
      userId: "user123",
      reason: "invalid_token",
      tokenExpired: true,
    },
  }),

  VALIDATION_ERROR: new BaseAxonError("Input validation failed", "VALIDATION_ERROR", {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    metadata: {
      field: "email",
      value: "invalid-email",
      constraint: "email_format",
    },
  }),

  RATE_LIMIT_EXCEEDED: new BaseAxonError("Rate limit exceeded", "RATE_LIMITED", {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    metadata: {
      limit: 1000,
      window: 3600,
      remaining: 0,
      resetTime: Date.now() + 3600000,
    },
  }),

  CIRCUIT_BREAKER_OPEN: new BaseAxonError("Circuit breaker is open", "CIRCUIT_OPEN", {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.ERROR,
    metadata: {
      circuitName: "external-api",
      failureCount: 5,
      lastFailureTime: Date.now() - 30000,
    },
  }),
} as const;

/**
 * Factory for creating test errors with variations
 */
export class TestErrorFactory {
  /**
   * Create a network error with customizable properties
   */
  static createNetworkError(
    overrides?: Partial<{
      message: string;
      code: string;
      endpoint: string;
      timeout: number;
      statusCode: number;
    }>,
  ): BaseAxonError {
    return new BaseAxonError(overrides?.message ?? "Network request failed", overrides?.code ?? "NETWORK_ERROR", {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.WARNING,
      metadata: {
        endpoint: overrides?.endpoint ?? "https://api.example.com",
        timeout: overrides?.timeout ?? 5000,
        statusCode: overrides?.statusCode ?? 0,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Create a service error with customizable properties
   */
  static createServiceError(
    overrides?: Partial<{
      service: string;
      statusCode: number;
      retryable: boolean;
    }>,
  ): BaseAxonError {
    return new BaseAxonError(`Service ${overrides?.service ?? "unknown"} is unavailable`, "SERVICE_ERROR", {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.ERROR,
      metadata: {
        service: overrides?.service ?? "unknown-service",
        statusCode: overrides?.statusCode ?? 500,
        retryable: overrides?.retryable ?? true,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Create a timeout error with customizable timeout value
   */
  static createTimeoutError(timeoutMs?: number): BaseAxonError {
    return new BaseAxonError(`Operation timed out after ${timeoutMs ?? 30000}ms`, "TIMEOUT", {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.WARNING,
      metadata: {
        timeout: timeoutMs ?? 30000,
        startTime: Date.now() - (timeoutMs ?? 30000),
        endTime: Date.now(),
      },
    });
  }

  /**
   * Create a batch of similar errors for testing
   */
  static createErrorBatch(count: number, baseError?: BaseAxonError): BaseAxonError[] {
    const base = baseError ?? TestErrors.NETWORK_TIMEOUT;
    return Array.from(
      { length: count },
      (_, i) =>
        new BaseAxonError(`${base.message} #${i}`, `${base.code}_${i}`, {
          ...base.context,
          metadata: {
            ...base.context.metadata,
            batchIndex: i,
            timestamp: Date.now() + i,
          },
        }),
    );
  }
}

/**
 * Real operation implementations with observation capabilities for testing recovery mechanisms
 */
export class TestOperations {
  /**
   * Create a real operation that always succeeds with observation
   */
  static createSuccessOperation<T>(
    result: T,
    delayMs = 0,
  ): (() => Promise<T>) & { callCount: number; calls: any[]; reset: () => void } {
    let callCount = 0;
    const calls: any[] = [];

    const operation = async () => {
      callCount++;
      const callData = { timestamp: new Date(), args: [], delayMs };
      calls.push(callData);

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return result;
    };

    // Add observation properties
    (operation as any).callCount = 0;
    (operation as any).calls = calls;
    (operation as any).reset = () => {
      callCount = 0;
      calls.length = 0;
    };

    // Update callCount getter
    Object.defineProperty(operation, "callCount", {
      get: () => callCount,
    });

    return operation as any;
  }

  /**
   * Create a real operation that always fails with observation
   */
  static createFailureOperation(
    error: Error,
    delayMs = 0,
  ): (() => Promise<never>) & { callCount: number; calls: any[]; reset: () => void } {
    let callCount = 0;
    const calls: any[] = [];

    const operation = async () => {
      callCount++;
      const callData = { timestamp: new Date(), args: [], delayMs, error: error.message };
      calls.push(callData);

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      throw error;
    };

    // Add observation properties
    (operation as any).callCount = 0;
    (operation as any).calls = calls;
    (operation as any).reset = () => {
      callCount = 0;
      calls.length = 0;
    };

    // Update callCount getter
    Object.defineProperty(operation, "callCount", {
      get: () => callCount,
    });

    return operation as any;
  }

  /**
   * Create a real operation that fails N times then succeeds with observation
   */
  static createEventualSuccessOperation<T>(
    failureCount: number,
    result: T,
    error?: Error,
  ): (() => Promise<T>) & { callCount: number; calls: any[]; reset: () => void } {
    let attempts = 0;
    const failureError = error ?? TestErrors.NETWORK_TIMEOUT;
    const calls: any[] = [];

    const operation = async () => {
      attempts++;
      const callData = {
        timestamp: new Date(),
        attempt: attempts,
        willFail: attempts <= failureCount,
      };
      calls.push(callData);

      if (attempts <= failureCount) {
        throw failureError;
      }
      return result;
    };

    // Add observation properties
    (operation as any).callCount = 0;
    (operation as any).calls = calls;
    (operation as any).reset = () => {
      attempts = 0;
      calls.length = 0;
    };

    // Update callCount getter
    Object.defineProperty(operation, "callCount", {
      get: () => attempts,
    });

    return operation as any;
  }

  /**
   * Create a real operation with intermittent failures and observation
   */
  static createIntermittentOperation<T>(
    result: T,
    failureRate = 0.3,
    error?: Error,
  ): (() => Promise<T>) & { callCount: number; calls: any[]; reset: () => void } {
    const failureError = error ?? TestErrors.SERVICE_UNAVAILABLE;
    let callCount = 0;
    const calls: any[] = [];

    const operation = async () => {
      callCount++;
      const willFail = Math.random() < failureRate;
      const callData = {
        timestamp: new Date(),
        attempt: callCount,
        failureRate,
        willFail,
      };
      calls.push(callData);

      if (willFail) {
        throw failureError;
      }
      return result;
    };

    // Add observation properties
    (operation as any).callCount = 0;
    (operation as any).calls = calls;
    (operation as any).reset = () => {
      callCount = 0;
      calls.length = 0;
    };

    // Update callCount getter
    Object.defineProperty(operation, "callCount", {
      get: () => callCount,
    });

    return operation as any;
  }

  /**
   * Create a real operation that times out with observation
   */
  static createTimeoutOperation(
    timeoutMs: number,
  ): (() => Promise<never>) & { callCount: number; calls: any[]; reset: () => void } {
    let callCount = 0;
    const calls: any[] = [];

    const operation = async () => {
      callCount++;
      const callData = {
        timestamp: new Date(),
        timeoutMs,
        actualDelay: timeoutMs * 2,
      };
      calls.push(callData);

      await new Promise((resolve) => setTimeout(resolve, timeoutMs * 2));
      throw TestErrorFactory.createTimeoutError(timeoutMs);
    };

    // Add observation properties
    (operation as any).callCount = 0;
    (operation as any).calls = calls;
    (operation as any).reset = () => {
      callCount = 0;
      calls.length = 0;
    };

    // Update callCount getter
    Object.defineProperty(operation, "callCount", {
      get: () => callCount,
    });

    return operation as any;
  }

  /**
   * Create a real cancellable operation with observation
   */
  static createCancellableOperation<T>(
    result: T,
    operationDuration = 1000,
  ): ((signal?: AbortSignal) => Promise<T>) & { callCount: number; calls: any[]; reset: () => void } {
    let callCount = 0;
    const calls: any[] = [];

    const operation = async (signal?: AbortSignal) => {
      callCount++;
      const callData = {
        timestamp: new Date(),
        operationDuration,
        hasAbortSignal: !!signal,
      };
      calls.push(callData);

      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => resolve(result), operationDuration);

        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("Operation cancelled"));
          });
        }
      });
    };

    // Add observation properties
    (operation as any).callCount = 0;
    (operation as any).calls = calls;
    (operation as any).reset = () => {
      callCount = 0;
      calls.length = 0;
    };

    // Update callCount getter
    Object.defineProperty(operation, "callCount", {
      get: () => callCount,
    });

    return operation as any;
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceMeasurement {
  private measurements: number[] = [];

  /**
   * Measure execution time of a function
   */
  async measure<T>(fn: () => Promise<T> | T): Promise<T> {
    const startTime = process.hrtime.bigint();
    const result = await fn();
    const endTime = process.hrtime.bigint();

    const durationMs = Number(endTime - startTime) / 1_000_000;
    this.measurements.push(durationMs);

    return result;
  }

  /**
   * Get statistics from all measurements
   */
  getStats() {
    if (this.measurements.length === 0) {
      return null;
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / sorted.length;

    return {
      count: sorted.length,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      mean,
      median: sorted[Math.floor(sorted.length / 2)] ?? 0,
      p90: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    };
  }

  /**
   * Reset measurements
   */
  reset(): void {
    this.measurements = [];
  }
}

/**
 * Recovery scenario test helpers
 */
export class RecoveryScenarios {
  /**
   * Test scenario: Microservice cascade failure
   */
  static createCascadeFailureScenario() {
    return {
      name: "Microservice Cascade Failure",
      description: "Multiple dependent services failing in sequence",
      errors: [
        TestErrorFactory.createServiceError({ service: "user-service", statusCode: 503 }),
        TestErrorFactory.createServiceError({ service: "auth-service", statusCode: 502 }),
        TestErrorFactory.createServiceError({ service: "data-service", statusCode: 504 }),
      ],
      expectedRecoveryStrategies: ["retry", "circuit_breaker", "graceful_degradation"],
      maxAcceptableRecoveryTime: 5000,
    };
  }

  /**
   * Test scenario: Database connection pool exhaustion
   */
  static createDatabasePoolExhaustionScenario() {
    return {
      name: "Database Pool Exhaustion",
      description: "Database connection pool is exhausted under high load",
      errors: [
        new BaseAxonError("Connection pool exhausted", "DB_POOL_EXHAUSTED", {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.CRITICAL,
          metadata: {
            poolSize: 20,
            activeConnections: 20,
            waitingRequests: 50,
          },
        }),
      ],
      expectedRecoveryStrategies: ["timeout", "retry", "circuit_breaker"],
      maxAcceptableRecoveryTime: 10000,
    };
  }

  /**
   * Test scenario: API rate limiting
   */
  static createRateLimitingScenario() {
    return {
      name: "API Rate Limiting",
      description: "External API rate limits being exceeded",
      errors: [TestErrors.RATE_LIMIT_EXCEEDED],
      expectedRecoveryStrategies: ["retry", "graceful_degradation"],
      maxAcceptableRecoveryTime: 65000, // Should wait for rate limit reset
    };
  }

  /**
   * Test scenario: Network partition
   */
  static createNetworkPartitionScenario() {
    return {
      name: "Network Partition",
      description: "Temporary network connectivity issues",
      errors: [
        TestErrorFactory.createNetworkError({ statusCode: 0, timeout: 30000 }),
        TestErrorFactory.createNetworkError({ statusCode: 0, timeout: 30000 }),
        TestErrorFactory.createNetworkError({ statusCode: 0, timeout: 30000 }),
      ],
      expectedRecoveryStrategies: ["retry", "timeout", "circuit_breaker"],
      maxAcceptableRecoveryTime: 120000,
    };
  }
}

/**
 * Real recovery strategy implementations with observation capabilities for testing
 */
export class TestRecoveryStrategies {
  /**
   * Create a real retry strategy with event observation
   */
  static createRetryHandler(config?: { maxAttempts?: number; shouldSucceedOnAttempt?: number }) {
    let attempts = 0;
    const eventEmitter = new EventEmitter();

    const handler = {
      name: "RetryHandler",
      eventEmitter,
      async recover(error: BaseAxonError) {
        attempts++;

        // Emit attempt event for observation
        eventEmitter.emit("retry:attempt", {
          attempt: attempts,
          error,
          timestamp: new Date(),
        });

        if (config?.shouldSucceedOnAttempt && attempts >= config.shouldSucceedOnAttempt) {
          const result = {
            recovered: true,
            strategy: "retry",
            attempts,
            value: "retry_success",
          };
          eventEmitter.emit("retry:success", { result, timestamp: new Date() });
          return result;
        }

        if (attempts >= (config?.maxAttempts ?? 3)) {
          const failureError = new Error(`Retry failed after ${attempts} attempts`);
          eventEmitter.emit("retry:failure", { error: failureError, attempts, timestamp: new Date() });
          throw failureError;
        }

        eventEmitter.emit("retry:continue", { attempts, error, timestamp: new Date() });
        throw error;
      },
      getAttempts: () => attempts,
      reset: () => {
        attempts = 0;
        eventEmitter.emit("retry:reset", { timestamp: new Date() });
      },
      // Event observation methods
      onAttempt: (listener: (data: any) => void) => eventEmitter.on("retry:attempt", listener),
      onSuccess: (listener: (data: any) => void) => eventEmitter.on("retry:success", listener),
      onFailure: (listener: (data: any) => void) => eventEmitter.on("retry:failure", listener),
      removeAllListeners: () => eventEmitter.removeAllListeners(),
    };

    return handler;
  }

  /**
   * Create a real circuit breaker strategy with event observation
   */
  static createCircuitBreakerHandler(config?: { failureThreshold?: number; recoveryTime?: number }) {
    let failureCount = 0;
    let state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
    let lastFailureTime = 0;
    const eventEmitter = new EventEmitter();

    const handler = {
      name: "CircuitBreakerHandler",
      eventEmitter,
      async recover(error: BaseAxonError) {
        const threshold = config?.failureThreshold ?? 5;
        const recoveryTime = config?.recoveryTime ?? 30000;

        eventEmitter.emit("circuit:attempt", { state, failureCount, timestamp: new Date() });

        if (state === "OPEN") {
          if (Date.now() - lastFailureTime > recoveryTime) {
            state = "HALF_OPEN";
            eventEmitter.emit("circuit:halfOpen", { timestamp: new Date() });
          } else {
            const openError = new Error("Circuit breaker is OPEN");
            eventEmitter.emit("circuit:blocked", { error: openError, timestamp: new Date() });
            throw openError;
          }
        }

        if (state === "HALF_OPEN") {
          // Simulate successful recovery
          state = "CLOSED";
          failureCount = 0;
          const result = {
            recovered: true,
            strategy: "circuit_breaker",
            state: "CLOSED",
            value: "circuit_breaker_recovery",
          };
          eventEmitter.emit("circuit:closed", { result, timestamp: new Date() });
          return result;
        }

        // Simulate failure
        failureCount++;
        lastFailureTime = Date.now();

        if (failureCount >= threshold) {
          state = "OPEN";
          eventEmitter.emit("circuit:opened", { failureCount, threshold, timestamp: new Date() });
        }

        eventEmitter.emit("circuit:failure", { failureCount, state, error, timestamp: new Date() });
        throw error;
      },
      getState: () => state,
      getFailureCount: () => failureCount,
      reset: () => {
        failureCount = 0;
        state = "CLOSED";
        lastFailureTime = 0;
        eventEmitter.emit("circuit:reset", { timestamp: new Date() });
      },
      // Event observation methods
      onAttempt: (listener: (data: any) => void) => eventEmitter.on("circuit:attempt", listener),
      onOpened: (listener: (data: any) => void) => eventEmitter.on("circuit:opened", listener),
      onClosed: (listener: (data: any) => void) => eventEmitter.on("circuit:closed", listener),
      removeAllListeners: () => eventEmitter.removeAllListeners(),
    };

    return handler;
  }

  /**
   * Create a real graceful degradation strategy with event observation
   */
  static createGracefulDegradationHandler(fallbackValue: any = "fallback_result") {
    const eventEmitter = new EventEmitter();
    const fallbacks: any[] = [];

    const handler = {
      name: "GracefulDegradationHandler",
      eventEmitter,
      async recover(error: BaseAxonError) {
        // Simulate fallback logic
        const quality = 0.7; // Reduced quality fallback

        eventEmitter.emit("degradation:attempt", {
          error,
          fallbacksAvailable: fallbacks.length,
          timestamp: new Date(),
        });

        const result = {
          recovered: true,
          strategy: "graceful_degradation",
          quality,
          value: fallbackValue,
          fallbackUsed: "emergency_fallback",
        };

        eventEmitter.emit("degradation:success", { result, timestamp: new Date() });
        return result;
      },
      addFallback: (fallback: any) => {
        fallbacks.push(fallback);
        eventEmitter.emit("degradation:fallbackAdded", {
          fallback,
          totalFallbacks: fallbacks.length,
          timestamp: new Date(),
        });
      },
      getFallbacks: () => [...fallbacks],
      // Event observation methods
      onAttempt: (listener: (data: any) => void) => eventEmitter.on("degradation:attempt", listener),
      onSuccess: (listener: (data: any) => void) => eventEmitter.on("degradation:success", listener),
      removeAllListeners: () => eventEmitter.removeAllListeners(),
    };

    return handler;
  }

  /**
   * Create a real timeout strategy with event observation
   */
  static createTimeoutHandler(config?: { timeoutMs?: number }) {
    const eventEmitter = new EventEmitter();
    const activeTimeouts = new Map<number, NodeJS.Timeout>();
    let timeoutIdCounter = 0;

    const handler = {
      name: "TimeoutHandler",
      eventEmitter,
      async recover(error: BaseAxonError) {
        const timeoutMs = config?.timeoutMs ?? 5000;

        eventEmitter.emit("timeout:attempt", { timeoutMs, error, timestamp: new Date() });

        const result = {
          recovered: true,
          strategy: "timeout",
          timeoutApplied: timeoutMs,
          value: "timeout_handled",
        };

        eventEmitter.emit("timeout:success", { result, timestamp: new Date() });
        return result;
      },
      setTimeout: (callback: () => void, delay: number) => {
        const id = ++timeoutIdCounter;
        const timeout = setTimeout(() => {
          activeTimeouts.delete(id);
          callback();
        }, delay);
        activeTimeouts.set(id, timeout);
        eventEmitter.emit("timeout:set", { id, delay, timestamp: new Date() });
        return id;
      },
      clearTimeout: (id: number) => {
        const timeout = activeTimeouts.get(id);
        if (timeout) {
          clearTimeout(timeout);
          activeTimeouts.delete(id);
          eventEmitter.emit("timeout:cleared", { id, timestamp: new Date() });
        }
      },
      // Event observation methods
      onAttempt: (listener: (data: any) => void) => eventEmitter.on("timeout:attempt", listener),
      onSuccess: (listener: (data: any) => void) => eventEmitter.on("timeout:success", listener),
      removeAllListeners: () => eventEmitter.removeAllListeners(),
    };

    return handler;
  }
}

/**
 * Test assertion helpers
 */
export class RecoveryAssertions {
  /**
   * Assert that recovery result meets expected criteria
   */
  static assertRecoveryResult(
    result: any,
    expected: {
      recovered?: boolean;
      strategy?: string;
      attempts?: number;
      qualityScore?: number;
      timeWithinLimit?: number;
    },
  ) {
    if (expected.recovered !== undefined) {
      if (result.recovered !== expected.recovered) {
        throw new Error(`Expected recovered to be ${expected.recovered}, got ${result.recovered}`);
      }
    }

    if (expected.strategy) {
      if (result.strategy !== expected.strategy) {
        throw new Error(`Expected strategy to be ${expected.strategy}, got ${result.strategy}`);
      }
    }

    if (expected.attempts !== undefined) {
      if (result.attempts !== expected.attempts) {
        throw new Error(`Expected attempts to be ${expected.attempts}, got ${result.attempts}`);
      }
    }

    if (expected.qualityScore !== undefined) {
      const diff = Math.abs(result.qualityScore - expected.qualityScore);
      if (diff > 0.01) {
        throw new Error(`Expected qualityScore to be close to ${expected.qualityScore}, got ${result.qualityScore}`);
      }
    }

    if (expected.timeWithinLimit !== undefined) {
      if (result.executionTime >= expected.timeWithinLimit) {
        throw new Error(
          `Expected executionTime to be less than ${expected.timeWithinLimit}, got ${result.executionTime}`,
        );
      }
    }
  }

  /**
   * Assert that performance metrics meet requirements
   */
  static assertPerformanceRequirements(
    stats: any,
    requirements: {
      maxMeanTime?: number;
      maxP95Time?: number;
      maxP99Time?: number;
      minThroughput?: number;
    },
  ) {
    if (requirements.maxMeanTime !== undefined) {
      if (stats.mean >= requirements.maxMeanTime) {
        throw new Error(`Expected mean time to be less than ${requirements.maxMeanTime}, got ${stats.mean}`);
      }
    }

    if (requirements.maxP95Time !== undefined) {
      if (stats.p95 >= requirements.maxP95Time) {
        throw new Error(`Expected p95 time to be less than ${requirements.maxP95Time}, got ${stats.p95}`);
      }
    }

    if (requirements.maxP99Time !== undefined) {
      if (stats.p99 >= requirements.maxP99Time) {
        throw new Error(`Expected p99 time to be less than ${requirements.maxP99Time}, got ${stats.p99}`);
      }
    }

    if (requirements.minThroughput !== undefined && stats.throughput !== undefined) {
      if (stats.throughput <= requirements.minThroughput) {
        throw new Error(
          `Expected throughput to be greater than ${requirements.minThroughput}, got ${stats.throughput}`,
        );
      }
    }
  }
}

/**
 * Test data generators
 */
export class TestDataGenerators {
  /**
   * Generate a series of errors with different patterns
   */
  static generateErrorPattern(
    pattern: "increasing_severity" | "alternating" | "burst",
    count: number,
  ): BaseAxonError[] {
    switch (pattern) {
      case "increasing_severity":
        return Array.from({ length: count }, (_, i) => {
          const severities = [ErrorSeverity.INFO, ErrorSeverity.WARNING, ErrorSeverity.ERROR, ErrorSeverity.CRITICAL];
          const severity = severities[Math.min(Math.floor(i / 2), severities.length - 1)];
          return new BaseAxonError(`Error ${i}`, `ERROR_${i}`, { severity });
        });

      case "alternating":
        return Array.from({ length: count }, (_, i) => {
          const isNetwork = i % 2 === 0;
          return isNetwork
            ? TestErrorFactory.createNetworkError({ code: `NET_${i}` })
            : TestErrorFactory.createServiceError({ service: `service_${i}` });
        });

      case "burst":
        const burstSize = 5;
        return Array.from({ length: count }, (_, i) => {
          const burstIndex = Math.floor(i / burstSize);
          const categories = Object.values(ErrorCategory);
          const category = categories[burstIndex % categories.length];

          return new BaseAxonError(`Burst error ${i}`, `BURST_${i}`, {
            category: category as ErrorCategory,
            metadata: { burstIndex, position: i % burstSize },
          });
        });

      default:
        throw new Error(`Unknown pattern: ${pattern}`);
    }
  }

  /**
   * Generate load test data
   */
  static generateLoadTestData(concurrent: number, total: number) {
    const batches: BaseAxonError[][] = [];
    let remaining = total;

    while (remaining > 0) {
      const batchSize = Math.min(concurrent, remaining);
      const batch = TestErrorFactory.createErrorBatch(batchSize);
      batches.push(batch);
      remaining -= batchSize;
    }

    return batches;
  }
}

/**
 * Time manipulation utilities for testing
 */
export class TimeUtils {
  private static realSetTimeout = setTimeout;
  private static realClearTimeout = clearTimeout;
  private static realDateNow = Date.now;

  private static currentTime = Date.now();
  private static timeouts: Map<NodeJS.Timeout, { callback: () => void; triggerTime: number }> = new Map();

  /**
   * Mock time for testing time-dependent recovery mechanisms
   */
  static mockTime() {
    this.currentTime = Date.now();
    this.timeouts.clear();

    // Mock setTimeout
    global.setTimeout = ((callback: () => void, delay: number) => {
      const timeoutId = {} as NodeJS.Timeout;
      this.timeouts.set(timeoutId, {
        callback,
        triggerTime: this.currentTime + delay,
      });
      return timeoutId;
    }) as any;

    // Mock clearTimeout
    global.clearTimeout = ((timeoutId: NodeJS.Timeout) => {
      this.timeouts.delete(timeoutId);
    }) as any;

    // Mock Date.now
    Date.now = (() => this.currentTime) as any;
  }

  /**
   * Advance mocked time and trigger pending timeouts
   */
  static advanceTime(ms: number) {
    this.currentTime += ms;

    const triggeredTimeouts: Array<{ callback: () => void; triggerTime: number }> = [];

    // Convert entries to array to avoid iterator issues
    const timeoutEntries = Array.from(this.timeouts.entries());
    for (const [timeoutId, timeout] of timeoutEntries) {
      if (timeout.triggerTime <= this.currentTime) {
        triggeredTimeouts.push(timeout);
        this.timeouts.delete(timeoutId);
      }
    }

    // Execute triggered timeouts
    triggeredTimeouts.sort((a, b) => a.triggerTime - b.triggerTime).forEach((timeout) => timeout.callback());
  }

  /**
   * Restore real time functions
   */
  static restoreTime() {
    global.setTimeout = this.realSetTimeout;
    global.clearTimeout = this.realClearTimeout;
    Date.now = this.realDateNow;
    this.timeouts.clear();
  }
}
