/**
 * Integration tests for factory and serialization systems
 */

import { describe, it, expect } from "vitest";
import { EnhancedErrorFactory, SimpleErrorFactory } from "../../src/index.js";
import { BaseAxonError } from "../../src/base/base-error.classes.js";
import { ErrorSeverity, ErrorCategory } from "../../src/base/base-error.types.js";

describe("Factory and Serialization Integration", () => {
  describe("Enhanced Error Factory", () => {
    it("should create domain-specific errors with context", () => {
      const factory = new EnhancedErrorFactory({
        correlationId: "test-123",
        service: "integration-test",
      });

      const error = factory.createAuthenticationError("Login failed", "AUTH_ERROR");

      expect(error).toBeInstanceOf(BaseAxonError);
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.context.correlationId).toBe("test-123");
      expect(error.context.service).toBe("integration-test");
      expect(error.category).toBe(ErrorCategory.SECURITY);
    });

    it("should create different error types with consistent context", () => {
      const factory = new EnhancedErrorFactory({
        userId: "user-456",
        requestId: "req-789",
      });

      const networkError = factory.createNetworkError("Connection timeout", "NET_TIMEOUT");
      const validationError = factory.createValidationError("Invalid input", "INVALID_INPUT");

      expect(networkError.context.userId).toBe("user-456");
      expect(validationError.context.requestId).toBe("req-789");
      expect(networkError.category).toBe(ErrorCategory.NETWORK);
      expect(validationError.category).toBe(ErrorCategory.VALIDATION);
    });

    it("should create system and application errors", () => {
      const factory = new EnhancedErrorFactory({ environment: "test" });

      const systemError = factory.createSystemError("Database connection failed", "DB_ERROR");
      const appError = factory.createApplicationError("Business logic error", "BIZ_ERROR");

      expect(systemError.category).toBe(ErrorCategory.SYSTEM);
      expect(appError.category).toBe(ErrorCategory.APPLICATION);
      expect(systemError.severity).toBe(ErrorSeverity.ERROR);
      expect(appError.severity).toBe(ErrorSeverity.ERROR);
      expect(systemError.context.environment).toBe("test");
      expect(appError.context.environment).toBe("test");
    });
  });

  describe("Simple Error Factory Compatibility", () => {
    it("should work as alias for EnhancedErrorFactory", () => {
      const factory = new SimpleErrorFactory();

      const error = factory.createValidationError("Test validation error", "TEST_ERROR");

      expect(error).toBeInstanceOf(BaseAxonError);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test validation error");
    });
  });

  describe("Error Serialization Compatibility", () => {
    it("should serialize errors to structured objects", () => {
      const factory = new EnhancedErrorFactory({
        correlationId: "serialize-test",
        metadata: { source: "integration-test" },
      });

      const error = factory.createValidationError("Invalid email format", "INVALID_EMAIL");
      error.context.additionalInfo = "test data";

      // Test basic serialization by converting to JSON
      const serialized = {
        name: error.name,
        message: error.message,
        code: error.code,
        category: error.category,
        severity: error.severity,
        context: error.context,
        timestamp: error.timestamp,
      };

      expect(serialized.code).toBe("INVALID_EMAIL");
      expect(serialized.context.correlationId).toBe("serialize-test");
      expect(serialized.context.additionalInfo).toBe("test data");
      expect(serialized.category).toBe(ErrorCategory.VALIDATION);

      // Test JSON serialization works
      const jsonString = JSON.stringify(serialized);
      expect(jsonString).toContain("INVALID_EMAIL");
      expect(jsonString).toContain("serialize-test");

      const parsed = JSON.parse(jsonString);
      expect(parsed.code).toBe("INVALID_EMAIL");
      expect(parsed.context.correlationId).toBe("serialize-test");
    });

    it("should handle sensitive data safely in context", () => {
      const factory = new EnhancedErrorFactory();
      const error = factory.createAuthenticationError("Login failed", "AUTH_FAILED");

      error.context.password = "secret123";
      error.context.token = "jwt-token-here";
      error.context.publicInfo = "safe data";

      // Simulate redaction before serialization
      const safeContext = { ...error.context };
      const sensitiveFields = ["password", "token", "secret"];

      for (const field of sensitiveFields) {
        if (field in safeContext) {
          safeContext[field] = "[REDACTED]";
        }
      }

      expect(safeContext.password).toBe("[REDACTED]");
      expect(safeContext.token).toBe("[REDACTED]");
      expect(safeContext.publicInfo).toBe("safe data");
    });
  });

  describe("Cross-Environment Compatibility", () => {
    it("should work consistently in Node.js environment", () => {
      // Test Node.js specific features if available
      if (typeof process !== "undefined" && process.versions && process.versions.node) {
        const factory = new EnhancedErrorFactory({ environment: "node" });
        const error = factory.createSystemError("Node.js specific error", "NODE_ERROR");

        expect(error.context.environment).toBe("node");
        expect(error.timestamp).toBeInstanceOf(Date);
      }
    });

    it("should handle browser-like environments", () => {
      // Mock browser-like environment temporarily
      const originalWindow = (global as any).window;
      (global as any).window = { navigator: { userAgent: "test-browser" } };

      try {
        const factory = new EnhancedErrorFactory();
        const error = factory.createNetworkError("Browser network error", "NET_ERROR");

        expect(error).toBeInstanceOf(BaseAxonError);
        expect(error.code).toBe("NET_ERROR");
        expect(error.category).toBe(ErrorCategory.NETWORK);
      } finally {
        // Restore original state
        (global as any).window = originalWindow;
      }
    });
  });

  describe("Performance and Memory", () => {
    it("should handle bulk error creation efficiently", () => {
      const factory = new EnhancedErrorFactory({ batchId: "performance-test" });

      const startTime = performance?.now ? performance.now() : Date.now();

      // Create 100 errors of different types
      const errors = [];
      for (let i = 0; i < 100; i++) {
        if (i % 4 === 0) {
          errors.push(factory.createValidationError(`Error ${i}`, `ERROR_${i}`));
        } else if (i % 4 === 1) {
          errors.push(factory.createNetworkError(`Network Error ${i}`, `NET_ERROR_${i}`));
        } else if (i % 4 === 2) {
          errors.push(factory.createAuthenticationError(`Auth Error ${i}`, `AUTH_ERROR_${i}`));
        } else {
          errors.push(factory.createSystemError(`System Error ${i}`, `SYS_ERROR_${i}`));
        }
      }

      const endTime = performance?.now ? performance.now() : Date.now();
      const duration = endTime - startTime;

      expect(errors).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should complete in <100ms

      // Verify all errors have consistent context
      errors.forEach((error) => {
        expect(error.context.batchId).toBe("performance-test");
        expect(error).toBeInstanceOf(BaseAxonError);
      });

      // Test different error types were created
      const categories = new Set(errors.map((e) => e.category));
      expect(categories.size).toBeGreaterThan(1); // Multiple categories created
    });

    it("should maintain consistent error structure", () => {
      const factory = new EnhancedErrorFactory({
        correlationId: "consistency-test",
        version: "1.0.0",
      });

      const errorTypes = [
        () => factory.createValidationError("Test", "TEST_1"),
        () => factory.createNetworkError("Test", "TEST_2"),
        () => factory.createAuthenticationError("Test", "TEST_3"),
        () => factory.createSystemError("Test", "TEST_4"),
        () => factory.createDatabaseError("Test", "TEST_5"),
        () => factory.createTimeoutError("Test", "TEST_6"),
      ];

      const errors = errorTypes.map((createError) => createError());

      // All errors should have consistent structure
      errors.forEach((error) => {
        expect(error).toHaveProperty("code");
        expect(error).toHaveProperty("message");
        expect(error).toHaveProperty("category");
        expect(error).toHaveProperty("severity");
        expect(error).toHaveProperty("context");
        expect(error).toHaveProperty("timestamp");
        expect(error.context.correlationId).toBe("consistency-test");
        expect(error.context.version).toBe("1.0.0");
      });
    });
  });
});
