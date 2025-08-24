/**
 * Visual regression tests for error outputs
 * 
 * Tests the visual formatting of various error types to ensure
 * consistent output formatting across changes.
 */

import { describe, it } from "vitest";
import { BaseAxonError, AggregateAxonError } from "../../../src/base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../../../src/base/base-error.types.js";

describe("Error Output Visual Regression", () => {
  describe("BaseAxonError toString format", () => {
    it("should maintain consistent formatting for basic error", () => {
      const error = new BaseAxonError(
        "Database connection failed",
        "DB_CONNECTION_ERROR",
        {
          severity: ErrorSeverity.CRITICAL,
          category: ErrorCategory.INFRASTRUCTURE,
          metadata: {
            host: "localhost",
            port: 5432,
          },
        }
      );

      // Test visual regression for toString output
      expect(error).toMatchErrorOutputSnapshot();
    });

    it("should maintain consistent formatting for error with enhanced context", () => {
      const error = new BaseAxonError(
        "User authentication failed",
        { domain: "AUTH", category: "USER", specific: "INVALID_CREDENTIALS" },
        {
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.AUTHENTICATION,
          correlationId: "test-correlation-123",
          metadata: {
            userId: "user-456",
            attemptCount: 3,
          },
        }
      );

      // Test comprehensive formatted output
      expect(error).toMatchFormattedErrorSnapshot();
    });
  });

  describe("AggregateAxonError visual output", () => {
    it("should maintain consistent formatting for aggregate errors", () => {
      const childError1 = new BaseAxonError(
        "Validation failed for field 'email'",
        "VALIDATION_ERROR"
      );
      
      const childError2 = new BaseAxonError(
        "Validation failed for field 'password'", 
        "VALIDATION_ERROR"
      );

      const aggregateError = new AggregateAxonError(
        "Multiple validation errors occurred",
        [childError1, childError2],
        "AGGREGATE_VALIDATION_ERROR",
        {
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.VALIDATION,
        }
      );

      expect(aggregateError).toMatchErrorOutputSnapshot();
    });
  });

  describe("Error chain visual output", () => {
    it("should maintain consistent formatting for error chains", () => {
      const rootCause = new Error("Network timeout");
      
      const wrappedError = new BaseAxonError(
        "Failed to fetch user data",
        "USER_FETCH_ERROR"
      ).withCause(rootCause);

      // Test the full stack trace formatting
      const fullStackOutput = wrappedError.getFullStack();
      expect(fullStackOutput).toMatchErrorOutputSnapshot();
    });
  });
});