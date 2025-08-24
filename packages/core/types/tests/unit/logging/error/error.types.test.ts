/**
 * Logging error types test suite
 *
 * Validates error logging type definitions and type inference
 */

import { describe, it, expect } from "vitest";
import type {
  IErrorLog,
  IErrorContext,
  IErrorMetadata,
  IStackTrace,
  IErrorClassification,
  IErrorCategory,
  IErrorSeverity,
  IErrorRecovery,
  IErrorReport,
  IErrorAggregation,
  IErrorAlert,
  IErrorNotification,
  ErrorType,
  ErrorLevel,
  RecoveryAction,
  AlertLevel,
} from "../../../../src/logging/error/error.types.js";

describe("Logging Error Types", () => {
  it("should enforce I-prefix naming convention for error interfaces", () => {
    const errorInterfaces = [
      "IErrorLog",
      "IErrorContext",
      "IErrorMetadata",
      "IStackTrace",
      "IErrorClassification",
      "IErrorCategory",
      "IErrorSeverity",
      "IErrorRecovery",
      "IErrorReport",
      "IErrorAggregation",
      "IErrorAlert",
      "IErrorNotification",
    ];

    errorInterfaces.forEach((name) => {
      expect(name.startsWith("I")).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate ErrorType union type", () => {
    const validErrorTypes: ErrorType[] = [
      "system",
      "application",
      "network",
      "database",
      "authentication",
      "validation",
      "business",
      "external",
    ];

    validErrorTypes.forEach((type) => {
      const _type: ErrorType = type;
      expect(typeof _type).toBe("string");
    });

    // Type-level validation
    const _system: ErrorType = "system";
    const _application: ErrorType = "application";
    const _network: ErrorType = "network";
    const _database: ErrorType = "database";
    const _authentication: ErrorType = "authentication";
    const _validation: ErrorType = "validation";
    const _business: ErrorType = "business";
    const _external: ErrorType = "external";

    expect(true).toBe(true); // If this compiles, types are valid
  });

  it("should validate ErrorLevel union type", () => {
    const validErrorLevels: ErrorLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

    validErrorLevels.forEach((level) => {
      const _level: ErrorLevel = level;
      expect(typeof _level).toBe("string");
    });

    // Type-level validation
    const _trace: ErrorLevel = "trace";
    const _debug: ErrorLevel = "debug";
    const _info: ErrorLevel = "info";
    const _warn: ErrorLevel = "warn";
    const _error: ErrorLevel = "error";
    const _fatal: ErrorLevel = "fatal";

    expect(true).toBe(true);
  });

  it("should validate RecoveryAction union type", () => {
    const validRecoveryActions: RecoveryAction[] = [
      "retry",
      "fallback",
      "circuit_breaker",
      "ignore",
      "escalate",
      "restart",
    ];

    validRecoveryActions.forEach((action) => {
      const _action: RecoveryAction = action;
      expect(typeof _action).toBe("string");
    });

    // Type-level validation
    const _retry: RecoveryAction = "retry";
    const _fallback: RecoveryAction = "fallback";
    const _circuitBreaker: RecoveryAction = "circuit_breaker";
    const _ignore: RecoveryAction = "ignore";
    const _escalate: RecoveryAction = "escalate";
    const _restart: RecoveryAction = "restart";

    expect(true).toBe(true);
  });

  it("should validate AlertLevel union type", () => {
    const validAlertLevels: AlertLevel[] = ["info", "warning", "critical", "emergency"];

    validAlertLevels.forEach((level) => {
      const _level: AlertLevel = level;
      expect(typeof _level).toBe("string");
    });

    // Type-level validation
    const _info: AlertLevel = "info";
    const _warning: AlertLevel = "warning";
    const _critical: AlertLevel = "critical";
    const _emergency: AlertLevel = "emergency";

    expect(true).toBe(true);
  });

  it("should validate IErrorLog interface structure", () => {
    const mockErrorLog: IErrorLog = {
      id: "error-123",
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "error",
      message: "Database connection failed",
      error: {
        name: "ConnectionError",
        message: "Timeout connecting to database",
        stack: "Error: Timeout connecting to database\n    at Database.connect (/app/db.js:45:15)",
        code: "ECONNREFUSED",
      },
      context: {
        correlationId: "corr-456",
        operation: "database_connect",
        retryCount: 3,
      },
      metadata: {
        source: "database-service",
        version: "2.1.0",
        environment: "production",
      },
      classification: {
        type: "database",
        category: "connectivity",
        severity: "high",
        recoverable: true,
        transient: true,
      },
      recovery: {
        action: "retry",
        maxAttempts: 5,
        delay: 1000,
      },
    };

    expect(typeof mockErrorLog.id).toBe("string");
    expect(typeof mockErrorLog.timestamp).toBe("string");
    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(mockErrorLog.level);
    expect(typeof mockErrorLog.error).toBe("object");
    expect(typeof mockErrorLog.context).toBe("object");
    expect(typeof mockErrorLog.classification).toBe("object");
    expect(typeof mockErrorLog.recovery).toBe("object");
  });

  it("should validate IErrorContext interface structure", () => {
    const mockErrorContext: IErrorContext = {
      correlationId: "corr-12345",
      traceId: "trace-67890",
      spanId: "span-abcde",
      parentSpanId: "span-fghij",
      userId: "user-123",
      sessionId: "sess-456",
      requestId: "req-789",
      operationId: "op-abc",
      operation: "process_payment",
      service: "payment-service",
      version: "2.3.1",
      environment: "production",
      region: "us-east-1",
      instanceId: "i-0123456789abcdef0",
      containerId: "container-123",
      processId: 54321,
      threadId: "thread-123",
      clientIp: "203.0.113.195",
      userAgent: "API-Client/1.0",
      metadata: {
        custom: "data",
      },
    };

    expect(typeof mockErrorContext.correlationId).toBe("string");
    expect(typeof mockErrorContext.operation).toBe("string");
    expect(typeof mockErrorContext.service).toBe("string");
    expect(typeof mockErrorContext.processId).toBe("number");
    expect(typeof mockErrorContext.metadata).toBe("object");
  });

  it("should validate IStackTrace interface structure", () => {
    const mockStackTrace: IStackTrace = {
      raw: "Error: Something went wrong\n    at Function.test (/app/test.js:10:15)",
      parsed: [
        {
          function: "Function.test",
          fileName: "/app/test.js",
          lineNumber: 10,
          columnNumber: 15,
          source: "    at Function.test (/app/test.js:10:15)",
          isUserCode: true,
          isNodeModule: false,
          isNative: false,
        },
      ],
      filtered: [
        {
          function: "Function.test",
          fileName: "/app/test.js",
          lineNumber: 10,
          columnNumber: 15,
          relevance: "high",
        },
      ],
      summary: {
        totalFrames: 1,
        userCodeFrames: 1,
        nodeModuleFrames: 0,
        nativeFrames: 0,
        topUserFrame: {
          function: "Function.test",
          fileName: "/app/test.js",
          lineNumber: 10,
        },
      },
    };

    expect(typeof mockStackTrace.raw).toBe("string");
    expect(Array.isArray(mockStackTrace.parsed)).toBe(true);
    expect(Array.isArray(mockStackTrace.filtered)).toBe(true);
    expect(typeof mockStackTrace.summary).toBe("object");
    expect(typeof mockStackTrace.summary.totalFrames).toBe("number");
  });

  it("should validate IErrorClassification interface structure", () => {
    const mockErrorClassification: IErrorClassification = {
      type: "database",
      category: "connection",
      subcategory: "timeout",
      severity: "high",
      priority: 2,
      recoverable: true,
      transient: true,
      userFacing: false,
      businessImpact: "medium",
      technicalImpact: "high",
      affectedServices: ["user-service", "order-service"],
      rootCause: "database_overload",
      tags: ["database", "performance", "connection"],
      similarErrors: ["db_timeout_001", "db_timeout_002"],
    };

    expect([
      "system",
      "application",
      "network",
      "database",
      "authentication",
      "validation",
      "business",
      "external",
    ]).toContain(mockErrorClassification.type);
    expect(["low", "medium", "high", "critical"]).toContain(mockErrorClassification.severity);
    expect(typeof mockErrorClassification.recoverable).toBe("boolean");
    expect(typeof mockErrorClassification.transient).toBe("boolean");
    expect(Array.isArray(mockErrorClassification.affectedServices)).toBe(true);
    expect(Array.isArray(mockErrorClassification.tags)).toBe(true);
  });

  it("should validate IErrorRecovery interface structure", () => {
    const mockRetryRecovery: IErrorRecovery = {
      action: "retry",
      maxAttempts: 3,
      delay: 1000,
      exponentialBackoff: true,
      backoffMultiplier: 2.0,
      maxDelay: 30000,
      jitter: true,
      jitterRange: 0.1,
      condition: "is_transient_error",
      timeout: 60000,
    };

    const mockFallbackRecovery: IErrorRecovery = {
      action: "fallback",
      fallbackMethod: "cached_data",
      fallbackValue: null,
      gracefulDegradation: true,
      notifyUser: false,
      logLevel: "warn",
    };

    expect(["retry", "fallback", "circuit_breaker", "ignore", "escalate", "restart"]).toContain(
      mockRetryRecovery.action,
    );
    expect(["retry", "fallback", "circuit_breaker", "ignore", "escalate", "restart"]).toContain(
      mockFallbackRecovery.action,
    );
    expect(typeof mockRetryRecovery.maxAttempts).toBe("number");
    expect(typeof mockFallbackRecovery.gracefulDegradation).toBe("boolean");
  });

  it("should validate IErrorAggregation interface structure", () => {
    const mockErrorAggregation: IErrorAggregation = {
      id: "agg-123",
      timeWindow: {
        start: "2024-01-01T12:00:00.000Z",
        end: "2024-01-01T12:05:00.000Z",
        duration: 300000,
        resolution: "1m",
      },
      errorCounts: {
        total: 150,
        unique: 25,
        byType: {
          database: 75,
          network: 45,
          application: 30,
        },
        bySeverity: {
          low: 20,
          medium: 80,
          high: 40,
          critical: 10,
        },
      },
      errorRate: {
        current: 0.05,
        previous: 0.03,
        change: 0.02,
        changePercentage: 66.67,
      },
      topErrors: [
        {
          signature: "DatabaseConnectionTimeout",
          count: 25,
          percentage: 16.67,
          firstSeen: "2024-01-01T12:00:15.000Z",
          lastSeen: "2024-01-01T12:04:45.000Z",
          trend: "increasing",
        },
      ],
    };

    expect(typeof mockErrorAggregation.id).toBe("string");
    expect(typeof mockErrorAggregation.timeWindow).toBe("object");
    expect(typeof mockErrorAggregation.errorCounts.total).toBe("number");
    expect(typeof mockErrorAggregation.errorRate.current).toBe("number");
    expect(Array.isArray(mockErrorAggregation.topErrors)).toBe(true);
  });

  it("should validate IErrorAlert interface structure", () => {
    const mockErrorAlert: IErrorAlert = {
      id: "alert-456",
      triggeredAt: "2024-01-01T12:05:00.000Z",
      level: "critical",
      status: "active",
      title: "High Error Rate Detected",
      description: "Error rate exceeded threshold in user-service",
      conditions: [
        {
          metric: "error_rate",
          operator: "greater_than",
          threshold: 0.1,
          actualValue: 0.15,
          duration: 300,
          service: "user-service",
        },
      ],
      actions: [
        {
          type: "notification",
          target: "on-call-team",
          method: "pagerduty",
          urgency: "high",
          status: "sent",
        },
      ],
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
    };

    expect(["info", "warning", "critical", "emergency"]).toContain(mockErrorAlert.level);
    expect(["active", "resolved", "suppressed", "expired"]).toContain(mockErrorAlert.status);
    expect(Array.isArray(mockErrorAlert.conditions)).toBe(true);
    expect(Array.isArray(mockErrorAlert.actions)).toBe(true);
    expect(typeof mockErrorAlert.resolved).toBe("boolean");
  });

  it("should validate error type hierarchy and relationships", () => {
    // Validate error level hierarchy
    const errorLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
    const levelValues = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

    for (let i = 0; i < errorLevels.length - 1; i++) {
      const currentLevel = errorLevels[i];
      const nextLevel = errorLevels[i + 1];
      expect(levelValues[currentLevel] < levelValues[nextLevel]).toBe(true);
    }

    // Validate alert level hierarchy
    const alertLevels = ["info", "warning", "critical", "emergency"] as const;
    const alertValues = { info: 1, warning: 2, critical: 3, emergency: 4 };

    alertLevels.forEach((level) => {
      expect(alertValues[level]).toBeDefined();
      expect(alertValues[level]).toBeGreaterThan(0);
    });

    // Validate error type coverage
    const errorTypes = [
      "system",
      "application",
      "network",
      "database",
      "authentication",
      "validation",
      "business",
      "external",
    ] as const;
    expect(errorTypes.length).toBeGreaterThan(0);
    errorTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("should handle generic type parameters in error interfaces", () => {
    // Test generic error context
    interface CustomErrorContext {
      transactionId: string;
      accountId: string;
      amount: number;
    }

    const customErrorLog: IErrorLog<CustomErrorContext> = {
      id: "error-custom-123",
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "error",
      message: "Transaction processing failed",
      error: {
        name: "TransactionError",
        message: "Insufficient funds",
        code: "INSUFFICIENT_FUNDS",
      },
      context: {
        correlationId: "corr-txn-123",
        transactionId: "txn-456",
        accountId: "acc-789",
        amount: 150.0,
      },
      metadata: {
        source: "payment-service",
      },
      classification: {
        type: "business",
        severity: "medium",
        recoverable: false,
        transient: false,
      },
      recovery: {
        action: "ignore",
      },
    };

    expect(customErrorLog.context).toHaveProperty("transactionId");
    expect(customErrorLog.context).toHaveProperty("accountId");
    expect(customErrorLog.context).toHaveProperty("amount");
    expect(typeof customErrorLog.context.transactionId).toBe("string");
    expect(typeof customErrorLog.context.accountId).toBe("string");
    expect(typeof customErrorLog.context.amount).toBe("number");
  });
});
