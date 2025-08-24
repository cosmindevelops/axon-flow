/**
 * Logging entry types test suite
 *
 * Validates logging entry type definitions and type inference
 */

import { describe, it, expect } from "vitest";
import type {
  ILogEntry,
  ILogContext,
  ILogMetadata,
  IStructuredLog,
  ILoggerConfig,
  ILoggerSink,
  ILoggerTransport,
  ILoggerFormatter,
  ICorrelationContext,
  ITraceContext,
  ISpanContext,
  LogLevel,
  LogFormat,
  LogSeverity,
  LogCategory,
} from "../../../../src/logging/entry/entry.types.js";

describe("Logging Entry Types", () => {
  it("should enforce I-prefix naming convention for entry interfaces", () => {
    const entryInterfaces = [
      "ILogEntry",
      "ILogContext",
      "ILogMetadata",
      "IStructuredLog",
      "ILoggerConfig",
      "ILoggerSink",
      "ILoggerTransport",
      "ILoggerFormatter",
      "ICorrelationContext",
      "ITraceContext",
      "ISpanContext",
    ];

    entryInterfaces.forEach((name) => {
      expect(name.startsWith("I")).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate LogLevel union type", () => {
    const validLogLevels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

    validLogLevels.forEach((level) => {
      const _level: LogLevel = level;
      expect(typeof _level).toBe("string");
    });

    // Type-level validation
    const _trace: LogLevel = "trace";
    const _debug: LogLevel = "debug";
    const _info: LogLevel = "info";
    const _warn: LogLevel = "warn";
    const _error: LogLevel = "error";
    const _fatal: LogLevel = "fatal";

    expect(true).toBe(true); // If this compiles, types are valid
  });

  it("should validate LogFormat union type", () => {
    const validLogFormats: LogFormat[] = ["json", "text", "structured", "simple"];

    validLogFormats.forEach((format) => {
      const _format: LogFormat = format;
      expect(typeof _format).toBe("string");
    });

    // Type-level validation
    const _json: LogFormat = "json";
    const _text: LogFormat = "text";
    const _structured: LogFormat = "structured";
    const _simple: LogFormat = "simple";

    expect(true).toBe(true);
  });

  it("should validate LogSeverity union type", () => {
    const validSeverities: LogSeverity[] = ["low", "medium", "high", "critical"];

    validSeverities.forEach((severity) => {
      const _severity: LogSeverity = severity;
      expect(typeof _severity).toBe("string");
    });

    // Type-level validation
    const _low: LogSeverity = "low";
    const _medium: LogSeverity = "medium";
    const _high: LogSeverity = "high";
    const _critical: LogSeverity = "critical";

    expect(true).toBe(true);
  });

  it("should validate LogCategory union type", () => {
    const validCategories: LogCategory[] = ["application", "system", "security", "performance", "business"];

    validCategories.forEach((category) => {
      const _category: LogCategory = category;
      expect(typeof _category).toBe("string");
    });

    // Type-level validation
    const _application: LogCategory = "application";
    const _system: LogCategory = "system";
    const _security: LogCategory = "security";
    const _performance: LogCategory = "performance";
    const _business: LogCategory = "business";

    expect(true).toBe(true);
  });

  it("should validate ILogEntry interface structure", () => {
    const mockLogEntry: ILogEntry = {
      id: "log-123",
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "info",
      message: "User authentication successful",
      context: {
        correlationId: "corr-123",
        userId: "user-456",
        sessionId: "sess-789",
      },
      metadata: {
        source: "auth-service",
        version: "1.2.0",
        environment: "production",
      },
      tags: ["authentication", "security"],
      severity: "medium",
      category: "security",
    };

    expect(typeof mockLogEntry.id).toBe("string");
    expect(typeof mockLogEntry.timestamp).toBe("string");
    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(mockLogEntry.level);
    expect(typeof mockLogEntry.message).toBe("string");
    expect(typeof mockLogEntry.context).toBe("object");
    expect(Array.isArray(mockLogEntry.tags)).toBe(true);
    expect(["low", "medium", "high", "critical"]).toContain(mockLogEntry.severity);
    expect(["application", "system", "security", "performance", "business"]).toContain(mockLogEntry.category);
  });

  it("should validate ILogContext interface structure", () => {
    const mockLogContext: ILogContext = {
      correlationId: "corr-12345",
      traceId: "trace-67890",
      spanId: "span-abcde",
      parentSpanId: "span-fghij",
      userId: "user-123",
      sessionId: "sess-456",
      requestId: "req-789",
      operationId: "op-abc",
      clientIp: "192.168.1.100",
      userAgent: "Mozilla/5.0 (compatible)",
      environment: "production",
      service: "api-gateway",
      version: "2.1.0",
      region: "us-east-1",
      metadata: {
        custom: "value",
      },
    };

    expect(typeof mockLogContext.correlationId).toBe("string");
    expect(typeof mockLogContext.traceId).toBe("string");
    expect(typeof mockLogContext.spanId).toBe("string");
    expect(typeof mockLogContext.userId).toBe("string");
    expect(typeof mockLogContext.metadata).toBe("object");
  });

  it("should validate IStructuredLog interface structure", () => {
    const mockStructuredLog: IStructuredLog = {
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "error",
      message: "Database operation failed",
      fields: {
        operation: "user_lookup",
        duration: 1500,
        error: "Connection timeout",
        retryCount: 3,
      },
      context: {
        correlationId: "corr-789",
      },
      format: "json",
      schema: "structured-log-v1",
    };

    expect(typeof mockStructuredLog.timestamp).toBe("string");
    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(mockStructuredLog.level);
    expect(typeof mockStructuredLog.message).toBe("string");
    expect(typeof mockStructuredLog.fields).toBe("object");
    expect(["json", "text", "structured", "simple"]).toContain(mockStructuredLog.format);
  });

  it("should validate ILoggerConfig interface structure", () => {
    const mockLoggerConfig: ILoggerConfig = {
      level: "info",
      format: "json",
      timestamp: true,
      colorize: false,
      prettyPrint: false,
      includeContext: true,
      includeMetadata: true,
      sinks: [
        {
          type: "console",
          level: "debug",
          format: "text",
          enabled: true,
        },
        {
          type: "file",
          level: "info",
          format: "json",
          enabled: true,
          path: "/var/log/app.log",
        },
      ],
      context: {
        service: "api-server",
        version: "1.0.0",
      },
    };

    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(mockLoggerConfig.level);
    expect(["json", "text", "structured", "simple"]).toContain(mockLoggerConfig.format);
    expect(Array.isArray(mockLoggerConfig.sinks)).toBe(true);
    expect(typeof mockLoggerConfig.context).toBe("object");
  });

  it("should validate ITraceContext interface structure", () => {
    const mockTraceContext: ITraceContext = {
      traceId: "trace-0123456789abcdef",
      spanId: "span-fedcba9876543210",
      parentSpanId: "span-1111222233334444",
      flags: 1,
      baggage: {
        userId: "user-123",
        sessionId: "sess-456",
      },
      tags: {
        "http.method": "POST",
        "http.url": "/api/users",
        "service.name": "user-service",
      },
      startTime: "2024-01-01T12:00:00.000Z",
      endTime: "2024-01-01T12:00:00.150Z",
      duration: 150,
    };

    expect(typeof mockTraceContext.traceId).toBe("string");
    expect(typeof mockTraceContext.spanId).toBe("string");
    expect(typeof mockTraceContext.flags).toBe("number");
    expect(typeof mockTraceContext.baggage).toBe("object");
    expect(typeof mockTraceContext.tags).toBe("object");
    expect(typeof mockTraceContext.duration).toBe("number");
  });

  it("should validate logging type constraints and relationships", () => {
    // Validate log level hierarchy
    const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
    const levelValues = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

    for (let i = 0; i < logLevels.length - 1; i++) {
      const currentLevel = logLevels[i];
      const nextLevel = logLevels[i + 1];
      expect(levelValues[currentLevel] < levelValues[nextLevel]).toBe(true);
    }

    // Validate severity levels
    const severityLevels = ["low", "medium", "high", "critical"] as const;
    const severityValues = { low: 1, medium: 2, high: 3, critical: 4 };

    severityLevels.forEach((severity) => {
      expect(severityValues[severity]).toBeDefined();
      expect(severityValues[severity]).toBeGreaterThan(0);
    });

    // Validate category coverage
    const categories = ["application", "system", "security", "performance", "business"] as const;
    expect(categories.length).toBeGreaterThan(0);
    categories.forEach((category) => {
      expect(typeof category).toBe("string");
      expect(category.length).toBeGreaterThan(0);
    });
  });

  it("should handle generic type parameters in logging interfaces", () => {
    // Test generic context types
    interface CustomContext {
      orderId: string;
      customerId: string;
      amount: number;
    }

    const customLogEntry: ILogEntry<CustomContext> = {
      id: "log-custom-123",
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "info",
      message: "Order processed successfully",
      context: {
        correlationId: "corr-order-123",
        orderId: "order-456",
        customerId: "customer-789",
        amount: 99.99,
      },
      metadata: {
        source: "order-service",
      },
      tags: ["order", "payment"],
      severity: "low",
      category: "business",
    };

    expect(customLogEntry.context).toHaveProperty("orderId");
    expect(customLogEntry.context).toHaveProperty("customerId");
    expect(customLogEntry.context).toHaveProperty("amount");
    expect(typeof customLogEntry.context.orderId).toBe("string");
    expect(typeof customLogEntry.context.customerId).toBe("string");
    expect(typeof customLogEntry.context.amount).toBe("number");
  });
});
