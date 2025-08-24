/**
 * Integration tests for error system and logger correlation
 * Uses real @axon package interfaces for authentic integration testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EnhancedErrorFactory } from "../../src/index.js";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";
import { BaseAxonError } from "../../src/base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../../src/base/base-error.types.js";
import { ErrorRecoveryManager } from "../../src/recovery/recovery.classes.js";

describe("Error-Logger Correlation Integration", () => {
  let errorFactory: EnhancedErrorFactory;
  let logger: ILogger;
  let recoveryManager: ErrorRecoveryManager;
  let testLogOutput: any[];

  beforeEach(async () => {
    // Initialize test log capture
    testLogOutput = [];

    // Create test stream to capture Pino output
    const { Writable } = await import("stream");
    const testStream = new Writable({
      write(chunk, _encoding, callback) {
        const logStr = chunk.toString();
        try {
          const logEntry = JSON.parse(logStr);
          testLogOutput.push(logEntry);
        } catch {
          testLogOutput.push({ message: logStr });
        }
        callback();
      },
    });

    // Create logger with real ILogger interface
    const loggerConfig: Partial<ILoggerConfig> = {
      environment: "test",
      logLevel: "debug",
      transports: [],
      enableCorrelationIds: true,
      timestampFormat: "iso",
      testStream: testStream,
      performance: {
        enabled: false,
        sampleRate: 0,
        thresholdMs: 1000,
      },
      circuitBreaker: {
        enabled: false,
        failureThreshold: 10,
        resetTimeoutMs: 60000,
        monitorTimeWindowMs: 120000,
      },
    };

    logger = new HighPerformancePinoLogger(loggerConfig);
    await (logger as any).loggerInitPromise;

    // Initialize error factory with correlation context
    errorFactory = new EnhancedErrorFactory({
      correlationId: "test-correlation-123",
      service: "error-logger-integration",
      version: "1.0.0",
      environment: "test",
    });

    // Initialize recovery manager
    recoveryManager = new ErrorRecoveryManager({
      maxRetries: 3,
      retryDelayMs: 100,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
    });
  });

  afterEach(() => {
    testLogOutput = [];
  });

  describe("Error Creation and Logging Correlation", () => {
    it("should create errors with correlation context and log them using real ILogger interface", () => {
      // Create different types of errors with correlation context
      const authError = errorFactory.createAuthenticationError("Invalid JWT token", "AUTH_INVALID_TOKEN");
      const networkError = errorFactory.createNetworkError("Connection timeout to external API", "NET_TIMEOUT");
      const validationError = errorFactory.createValidationError("Required field missing", "VALIDATION_MISSING_FIELD");

      // Log errors using real logger interface methods
      logger.error("Authentication error occurred", {
        error: authError.message,
        errorCode: authError.code,
        errorCategory: authError.category,
        correlationId: authError.context.correlationId,
        service: authError.context.service,
        severity: authError.severity,
        timestamp: authError.timestamp.toISOString(),
      });

      logger.warn("Network connectivity issue detected", {
        error: networkError.message,
        errorCode: networkError.code,
        errorCategory: networkError.category,
        correlationId: networkError.context.correlationId,
        networkIssue: true,
        retryRecommended: true,
      });

      logger.info("Validation error captured for monitoring", {
        error: validationError.message,
        errorCode: validationError.code,
        correlationId: validationError.context.correlationId,
        validationContext: "user-input",
        userFriendly: true,
      });

      // Verify error creation with proper correlation
      expect(authError.context.correlationId).toBe("test-correlation-123");
      expect(networkError.context.correlationId).toBe("test-correlation-123");
      expect(validationError.context.correlationId).toBe("test-correlation-123");

      expect(authError.category).toBe(ErrorCategory.SECURITY);
      expect(networkError.category).toBe(ErrorCategory.NETWORK);
      expect(validationError.category).toBe(ErrorCategory.VALIDATION);

      // Verify logging captured all error events
      expect(testLogOutput).toHaveLength(3);

      const authLog = testLogOutput.find((log) => log.msg === "Authentication error occurred");
      const networkLog = testLogOutput.find((log) => log.msg === "Network connectivity issue detected");
      const validationLog = testLogOutput.find((log) => log.msg === "Validation error captured for monitoring");

      expect(authLog).toBeDefined();
      expect(authLog.errorCode).toBe("AUTH_INVALID_TOKEN");
      expect(authLog.correlationId).toBe("test-correlation-123");
      expect(authLog.level).toBe(50); // Error level

      expect(networkLog).toBeDefined();
      expect(networkLog.errorCode).toBe("NET_TIMEOUT");
      expect(networkLog.retryRecommended).toBe(true);
      expect(networkLog.level).toBe(40); // Warn level

      expect(validationLog).toBeDefined();
      expect(validationLog.userFriendly).toBe(true);
      expect(validationLog.level).toBe(30); // Info level
    });

    it("should handle error context enrichment and correlation tracking", () => {
      // Create error with enriched context
      const contextualError = errorFactory.createSystemError("Database connection pool exhausted", "DB_POOL_EXHAUSTED");

      // Enrich error context
      contextualError.context.databaseHost = "db.example.com";
      contextualError.context.connectionPoolSize = 20;
      contextualError.context.activeConnections = 20;
      contextualError.context.requestedAction = "user-data-query";
      contextualError.context.userId = "user-456";

      // Log enriched error using real logger methods
      logger.fatal("Critical database error with full context", {
        error: contextualError.message,
        errorCode: contextualError.code,
        correlationId: contextualError.context.correlationId,
        service: contextualError.context.service,

        // Database context
        databaseHost: contextualError.context.databaseHost,
        poolSize: contextualError.context.connectionPoolSize,
        activeConnections: contextualError.context.activeConnections,

        // Request context
        requestedAction: contextualError.context.requestedAction,
        userId: contextualError.context.userId,

        // Error metadata
        category: contextualError.category,
        severity: contextualError.severity,
        timestamp: contextualError.timestamp.toISOString(),

        // Operational context
        environmentInfo: {
          service: contextualError.context.service,
          version: contextualError.context.version,
          environment: contextualError.context.environment,
        },
      });

      // Verify enriched context
      expect(contextualError.context.databaseHost).toBe("db.example.com");
      expect(contextualError.context.connectionPoolSize).toBe(20);
      expect(contextualError.context.userId).toBe("user-456");

      // Verify comprehensive logging
      const criticalLog = testLogOutput.find((log) => log.msg === "Critical database error with full context");

      expect(criticalLog).toBeDefined();
      expect(criticalLog.level).toBe(60); // Fatal level
      expect(criticalLog.correlationId).toBe("test-correlation-123");
      expect(criticalLog.databaseHost).toBe("db.example.com");
      expect(criticalLog.userId).toBe("user-456");
      expect(criticalLog.environmentInfo).toBeDefined();
      expect(criticalLog.environmentInfo.service).toBe("error-logger-integration");
    });
  });

  describe("Error Recovery and Logging Integration", () => {
    it("should integrate error recovery attempts with detailed logging", async () => {
      // Create an operation that will fail and require recovery
      let attemptCount = 0;
      const flakyOperation = async (): Promise<string> => {
        attemptCount++;

        if (attemptCount <= 2) {
          const error = errorFactory.createNetworkError(
            `Network operation failed on attempt ${attemptCount}`,
            "NET_OPERATION_FAILED",
          );
          throw error;
        }

        return "Operation successful";
      };

      // Attempt recovery with logging integration
      logger.info("Starting error recovery operation", {
        correlationId: "test-correlation-123",
        operationName: "flakyOperation",
        maxRetries: 3,
        retryDelayMs: 100,
      });

      let recoveryResult: string | null = null;
      let finalError: BaseAxonError | null = null;

      try {
        recoveryResult = await recoveryManager.executeWithRecovery("flakyOperation", flakyOperation, {
          onRetry: (attempt: number, error: Error) => {
            logger.warn("Recovery attempt in progress", {
              correlationId: "test-correlation-123",
              operationName: "flakyOperation",
              attemptNumber: attempt,
              error: error.message,
              errorCode: (error as BaseAxonError).code,
              nextRetryIn: "100ms",
            });
          },
          onSuccess: (result: string, totalAttempts: number) => {
            logger.info("Operation recovered successfully", {
              correlationId: "test-correlation-123",
              operationName: "flakyOperation",
              result: result,
              totalAttempts: totalAttempts,
              recoveryTime: `${totalAttempts * 100}ms`,
            });
          },
          onFailure: (error: Error, totalAttempts: number) => {
            finalError = error as BaseAxonError;
            logger.error("Operation failed after all recovery attempts", {
              correlationId: "test-correlation-123",
              operationName: "flakyOperation",
              finalError: error.message,
              errorCode: (error as BaseAxonError).code,
              totalAttempts: totalAttempts,
              recoveryAbandoned: true,
            });
          },
        });
      } catch (error) {
        finalError = error as BaseAxonError;
      }

      // Verify successful recovery
      expect(recoveryResult).toBe("Operation successful");
      expect(finalError).toBeNull();
      expect(attemptCount).toBe(3);

      // Verify comprehensive recovery logging
      const startLog = testLogOutput.find((log) => log.msg === "Starting error recovery operation");

      const retryLogs = testLogOutput.filter((log) => log.msg === "Recovery attempt in progress");

      const successLog = testLogOutput.find((log) => log.msg === "Operation recovered successfully");

      expect(startLog).toBeDefined();
      expect(startLog.maxRetries).toBe(3);
      expect(startLog.operationName).toBe("flakyOperation");

      expect(retryLogs).toHaveLength(2); // Two retry attempts before success
      retryLogs.forEach((log, index) => {
        expect(log.attemptNumber).toBe(index + 1);
        expect(log.errorCode).toBe("NET_OPERATION_FAILED");
        expect(log.correlationId).toBe("test-correlation-123");
      });

      expect(successLog).toBeDefined();
      expect(successLog.result).toBe("Operation successful");
      expect(successLog.totalAttempts).toBe(3);
      expect(successLog.correlationId).toBe("test-correlation-123");
    });

    it("should handle recovery failures with comprehensive error correlation", async () => {
      let attemptCount = 0;
      const alwaysFailingOperation = async (): Promise<string> => {
        attemptCount++;

        const error = errorFactory.createSystemError(
          `System operation failed permanently on attempt ${attemptCount}`,
          "SYS_PERMANENT_FAILURE",
        );

        // Add context to error
        error.context.attemptNumber = attemptCount;
        error.context.operationType = "critical-system-operation";
        error.context.failureReason = "resource-exhaustion";

        throw error;
      };

      logger.info("Starting operation with expected recovery failure", {
        correlationId: "test-correlation-123",
        operationName: "alwaysFailingOperation",
        expectedOutcome: "failure-after-retries",
      });

      let finalError: BaseAxonError | null = null;

      try {
        await recoveryManager.executeWithRecovery("alwaysFailingOperation", alwaysFailingOperation, {
          onRetry: (attempt: number, error: Error) => {
            const axonError = error as BaseAxonError;
            logger.warn("Recovery attempt failing as expected", {
              correlationId: axonError.context.correlationId,
              attemptNumber: attempt,
              error: axonError.message,
              errorCode: axonError.code,
              errorCategory: axonError.category,
              failureReason: axonError.context.failureReason,
              retryWillContinue: attempt < 3,
            });
          },
          onFailure: (error: Error, totalAttempts: number) => {
            const axonError = error as BaseAxonError;
            logger.error("Operation permanently failed after all recovery attempts", {
              correlationId: axonError.context.correlationId,
              operationName: "alwaysFailingOperation",
              finalError: axonError.message,
              errorCode: axonError.code,
              errorCategory: axonError.category,
              severity: axonError.severity,
              totalAttempts: totalAttempts,
              permanentFailure: true,
              failureReason: axonError.context.failureReason,
              operationType: axonError.context.operationType,
            });
          },
        });
      } catch (error) {
        finalError = error as BaseAxonError;
      }

      // Verify permanent failure
      expect(finalError).not.toBeNull();
      expect(finalError?.code).toBe("SYS_PERMANENT_FAILURE");
      expect(finalError?.context.correlationId).toBe("test-correlation-123");
      expect(attemptCount).toBe(3); // All retry attempts exhausted

      // Verify comprehensive failure logging
      const retryLogs = testLogOutput.filter((log) => log.msg === "Recovery attempt failing as expected");

      const failureLog = testLogOutput.find(
        (log) => log.msg === "Operation permanently failed after all recovery attempts",
      );

      expect(retryLogs).toHaveLength(3); // All retry attempts logged
      retryLogs.forEach((log, index) => {
        expect(log.attemptNumber).toBe(index + 1);
        expect(log.errorCode).toBe("SYS_PERMANENT_FAILURE");
        expect(log.failureReason).toBe("resource-exhaustion");
        expect(log.retryWillContinue).toBe(index < 2); // Last attempt should be false
      });

      expect(failureLog).toBeDefined();
      expect(failureLog.permanentFailure).toBe(true);
      expect(failureLog.totalAttempts).toBe(3);
      expect(failureLog.errorCategory).toBe(ErrorCategory.SYSTEM);
      expect(failureLog.operationType).toBe("critical-system-operation");
    });
  });

  describe("Cross-Package Error-Logger Integration", () => {
    it("should maintain correlation consistency across error creation and logging", () => {
      // Create multiple related errors with same correlation ID
      const parentError = errorFactory.createApplicationError("Primary business logic failure", "BIZ_PRIMARY_FAILURE");

      // Create child error factory with enhanced context
      const childErrorFactory = new EnhancedErrorFactory({
        correlationId: parentError.context.correlationId, // Same correlation ID
        parentErrorCode: parentError.code,
        service: parentError.context.service,
        operationId: "child-operation-789",
      });

      const childError = childErrorFactory.createValidationError(
        "Input validation failed in child process",
        "CHILD_VALIDATION_FAILURE",
      );

      // Log both errors with correlation relationship
      logger.error("Primary business operation failed", {
        error: parentError.message,
        errorCode: parentError.code,
        correlationId: parentError.context.correlationId,
        errorId: "primary",
        hasChildErrors: true,
        category: parentError.category,
      });

      logger.warn("Child operation validation failed", {
        error: childError.message,
        errorCode: childError.code,
        correlationId: childError.context.correlationId,
        parentErrorCode: childError.context.parentErrorCode,
        operationId: childError.context.operationId,
        errorId: "child",
        relationship: "child-of-primary",
      });

      // Verify correlation consistency
      expect(parentError.context.correlationId).toBe(childError.context.correlationId);
      expect(childError.context.parentErrorCode).toBe(parentError.code);

      // Verify correlated logging
      const parentLog = testLogOutput.find((log) => log.errorId === "primary");
      const childLog = testLogOutput.find((log) => log.errorId === "child");

      expect(parentLog).toBeDefined();
      expect(childLog).toBeDefined();

      expect(parentLog.correlationId).toBe(childLog.correlationId);
      expect(childLog.parentErrorCode).toBe(parentLog.errorCode);
      expect(childLog.relationship).toBe("child-of-primary");
      expect(parentLog.hasChildErrors).toBe(true);
    });

    it("should integrate error serialization with structured logging", () => {
      // Create error with complex context
      const complexError = errorFactory.createDatabaseError("Multi-table transaction failed", "DB_TRANSACTION_FAILED");

      // Add complex context data
      complexError.context.transactionId = "tx-12345";
      complexError.context.affectedTables = ["users", "orders", "inventory"];
      complexError.context.operationMetrics = {
        duration: 1500,
        queriesExecuted: 7,
        rollbackRequired: true,
      };
      complexError.context.sensitiveData = "password123"; // Will be redacted

      // Serialize error for structured logging
      const errorSerialization = {
        name: complexError.name,
        message: complexError.message,
        code: complexError.code,
        category: complexError.category,
        severity: complexError.severity,
        timestamp: complexError.timestamp.toISOString(),
        context: {
          ...complexError.context,
          sensitiveData: "[REDACTED]", // Redact sensitive information
        },
      };

      // Log serialized error using real logger interface
      logger.error("Database transaction error with full serialization", {
        correlationId: complexError.context.correlationId,
        errorSerialization: errorSerialization,
        structuredError: true,
        redactionApplied: true,
      });

      // Also log individual context elements for monitoring
      logger.info("Transaction failure metrics", {
        correlationId: complexError.context.correlationId,
        transactionId: complexError.context.transactionId,
        affectedTables: complexError.context.affectedTables,
        duration: complexError.context.operationMetrics.duration,
        queriesExecuted: complexError.context.operationMetrics.queriesExecuted,
        rollbackRequired: complexError.context.operationMetrics.rollbackRequired,
      });

      // Verify structured error logging
      const structuredErrorLog = testLogOutput.find(
        (log) => log.msg === "Database transaction error with full serialization",
      );

      const metricsLog = testLogOutput.find((log) => log.msg === "Transaction failure metrics");

      expect(structuredErrorLog).toBeDefined();
      expect(structuredErrorLog.errorSerialization).toBeDefined();
      expect(structuredErrorLog.errorSerialization.code).toBe("DB_TRANSACTION_FAILED");
      expect(structuredErrorLog.errorSerialization.context.sensitiveData).toBe("[REDACTED]");
      expect(structuredErrorLog.redactionApplied).toBe(true);

      expect(metricsLog).toBeDefined();
      expect(metricsLog.transactionId).toBe("tx-12345");
      expect(metricsLog.affectedTables).toEqual(["users", "orders", "inventory"]);
      expect(metricsLog.duration).toBe(1500);
      expect(metricsLog.rollbackRequired).toBe(true);
    });
  });
});
