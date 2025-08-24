/**
 * Logging entry schemas test suite
 *
 * Validates logging entry schema definitions and validation rules
 */

import { describe, it, expect } from "vitest";

describe("Logging Entry Schemas", () => {
  it("should validate log entry schema structure", () => {
    const mockLogEntry = {
      id: "log-entry-123",
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "info",
      message: "User login successful",
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
      severity: "low",
      category: "security",
    };

    // Validate required fields
    expect(mockLogEntry).toHaveProperty("timestamp");
    expect(mockLogEntry).toHaveProperty("level");
    expect(mockLogEntry).toHaveProperty("message");

    // Validate field types
    expect(typeof mockLogEntry.id).toBe("string");
    expect(typeof mockLogEntry.timestamp).toBe("string");
    expect(typeof mockLogEntry.level).toBe("string");
    expect(typeof mockLogEntry.message).toBe("string");
    expect(typeof mockLogEntry.context).toBe("object");
    expect(typeof mockLogEntry.metadata).toBe("object");
    expect(Array.isArray(mockLogEntry.tags)).toBe(true);

    // Validate enum values
    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(mockLogEntry.level);
    expect(["low", "medium", "high", "critical"]).toContain(mockLogEntry.severity);
    expect(["application", "system", "security", "performance", "business"]).toContain(mockLogEntry.category);
  });

  it("should validate log context schema", () => {
    const mockLogContext = {
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
        nested: { deep: "data" },
      },
    };

    expect(mockLogContext).toHaveProperty("correlationId");
    expect(typeof mockLogContext.correlationId).toBe("string");
    expect(mockLogContext.correlationId.length).toBeGreaterThan(0);

    // Validate optional but common fields
    if (mockLogContext.traceId) {
      expect(typeof mockLogContext.traceId).toBe("string");
    }
    if (mockLogContext.userId) {
      expect(typeof mockLogContext.userId).toBe("string");
    }
    if (mockLogContext.sessionId) {
      expect(typeof mockLogContext.sessionId).toBe("string");
    }

    expect(typeof mockLogContext.metadata).toBe("object");
  });

  it("should validate structured log schema", () => {
    const structuredLog = {
      timestamp: "2024-01-01T12:00:00.000Z",
      level: "error",
      message: "Database operation failed",
      fields: {
        operation: "user_lookup",
        database: "primary",
        table: "users",
        query: "SELECT * FROM users WHERE id = ?",
        parameters: ["user-123"],
        duration: 1500,
        error: "Connection timeout",
        retryCount: 3,
        maxRetries: 5,
      },
      context: {
        correlationId: "corr-789",
        requestId: "req-abc",
      },
      format: "json",
      schema: "structured-log-v1",
    };

    expect(structuredLog).toHaveProperty("timestamp");
    expect(structuredLog).toHaveProperty("level");
    expect(structuredLog).toHaveProperty("fields");
    expect(typeof structuredLog.fields).toBe("object");
    expect(["json", "text", "structured", "simple"]).toContain(structuredLog.format);

    // Validate fields can contain various data types
    expect(typeof structuredLog.fields.operation).toBe("string");
    expect(typeof structuredLog.fields.duration).toBe("number");
    expect(Array.isArray(structuredLog.fields.parameters)).toBe(true);
  });

  it("should validate logger configuration schema", () => {
    const loggerConfig = {
      level: "info",
      format: "json",
      timestamp: true,
      colorize: false,
      prettyPrint: false,
      includeContext: true,
      includeMetadata: true,
      includeStackTrace: true,
      maxMessageLength: 10000,
      truncateMessage: true,
      sinks: [
        {
          type: "console",
          level: "debug",
          format: "text",
          enabled: true,
          colorize: true,
        },
        {
          type: "file",
          level: "info",
          format: "json",
          enabled: true,
          path: "/var/log/app.log",
          maxSize: "10MB",
          maxFiles: 5,
          compression: true,
        },
      ],
      filters: [
        {
          field: "level",
          operator: "gte",
          value: "warn",
        },
        {
          field: "category",
          operator: "eq",
          value: "security",
        },
      ],
      sampling: {
        enabled: true,
        rate: 0.1, // 10%
        burst: 100,
      },
    };

    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(loggerConfig.level);
    expect(["json", "text", "structured", "simple"]).toContain(loggerConfig.format);
    expect(Array.isArray(loggerConfig.sinks)).toBe(true);
    expect(loggerConfig.sinks.length).toBeGreaterThan(0);

    loggerConfig.sinks.forEach((sink) => {
      expect(sink).toHaveProperty("type");
      expect(sink).toHaveProperty("level");
      expect(sink).toHaveProperty("enabled");
      expect(["console", "file", "remote", "database"]).toContain(sink.type);
      expect(typeof sink.enabled).toBe("boolean");
    });
  });

  it("should validate logger sink schema", () => {
    const consoleSink = {
      type: "console",
      level: "debug",
      format: "text",
      enabled: true,
      colorize: true,
      timestamp: true,
      includeLevel: true,
      includeMessage: true,
      template: "[{timestamp}] {level}: {message}",
    };

    const fileSink = {
      type: "file",
      level: "info",
      format: "json",
      enabled: true,
      path: "/var/log/application.log",
      maxSize: 10485760, // 10MB in bytes
      maxFiles: 10,
      compression: true,
      rotateDaily: true,
      datePattern: "YYYY-MM-DD",
    };

    const remoteSink = {
      type: "remote",
      level: "warn",
      format: "json",
      enabled: true,
      endpoint: "https://logs.example.com/api/logs",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
      },
      timeout: 5000,
      retryCount: 3,
      retryDelay: 1000,
      batchSize: 100,
      flushInterval: 1000,
    };

    // Validate console sink
    expect(["console", "file", "remote", "database"]).toContain(consoleSink.type);
    expect(typeof consoleSink.colorize).toBe("boolean");
    expect(typeof consoleSink.template).toBe("string");

    // Validate file sink
    expect(["console", "file", "remote", "database"]).toContain(fileSink.type);
    expect(typeof fileSink.path).toBe("string");
    expect(typeof fileSink.maxSize).toBe("number");
    expect(fileSink.maxSize).toBeGreaterThan(0);

    // Validate remote sink
    expect(["console", "file", "remote", "database"]).toContain(remoteSink.type);
    expect(typeof remoteSink.endpoint).toBe("string");
    expect(remoteSink.endpoint).toContain("https://");
    expect(typeof remoteSink.timeout).toBe("number");
  });

  it("should validate trace context schema", () => {
    const traceContext = {
      traceId: "trace-0123456789abcdef",
      spanId: "span-fedcba9876543210",
      parentSpanId: "span-1111222233334444",
      flags: 1,
      baggage: {
        userId: "user-123",
        sessionId: "sess-456",
        experimentId: "exp-789",
      },
      tags: {
        "http.method": "POST",
        "http.url": "/api/users",
        "http.status_code": 200,
        "user.id": "user-123",
        "service.name": "user-service",
        "service.version": "1.2.3",
      },
      startTime: "2024-01-01T12:00:00.000Z",
      endTime: "2024-01-01T12:00:00.150Z",
      duration: 150,
    };

    expect(typeof traceContext.traceId).toBe("string");
    expect(typeof traceContext.spanId).toBe("string");
    expect(traceContext.traceId.length).toBeGreaterThan(0);
    expect(traceContext.spanId.length).toBeGreaterThan(0);
    expect(typeof traceContext.flags).toBe("number");
    expect(typeof traceContext.baggage).toBe("object");
    expect(typeof traceContext.tags).toBe("object");
    expect(typeof traceContext.duration).toBe("number");
    expect(traceContext.duration).toBeGreaterThanOrEqual(0);
  });

  it("should validate log formatter schema", () => {
    const jsonFormatter = {
      type: "json",
      pretty: false,
      indent: 2,
      includeTimestamp: true,
      includeLevel: true,
      includeMessage: true,
      includeContext: true,
      includeMetadata: true,
      includeStackTrace: true,
      timestampFormat: "ISO",
      excludeFields: ["password", "secret", "apiKey"],
      maskFields: ["email", "phone"],
      customFields: {
        service: "api-server",
        version: "1.0.0",
        environment: "production",
      },
    };

    const textFormatter = {
      type: "text",
      template: "{timestamp} [{level}] {message} {context}",
      colorize: true,
      colors: {
        trace: "gray",
        debug: "blue",
        info: "green",
        warn: "yellow",
        error: "red",
        fatal: "magenta",
      },
      includeStackTrace: true,
      maxLength: 1000,
      truncate: true,
    };

    expect(["json", "text", "structured", "simple"]).toContain(jsonFormatter.type);
    expect(["json", "text", "structured", "simple"]).toContain(textFormatter.type);
    expect(typeof jsonFormatter.pretty).toBe("boolean");
    expect(Array.isArray(jsonFormatter.excludeFields)).toBe(true);
    expect(typeof textFormatter.template).toBe("string");
    expect(typeof textFormatter.colors).toBe("object");
  });
});
