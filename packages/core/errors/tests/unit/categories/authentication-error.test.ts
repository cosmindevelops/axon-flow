/**
 * Comprehensive unit tests for AuthenticationError class
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AuthenticationError } from "../../../src/categories/categories.classes.js";
import { AuthMethod, AuthFailureReason } from "../../../src/categories/categories.types.js";
import { ErrorSeverity, ErrorCategory } from "../../../src/base/base-error.types.js";

describe("AuthenticationError", () => {
  describe("Constructor and Basic Properties", () => {
    it("should create basic authentication error with default values", () => {
      const error = new AuthenticationError("Authentication failed");

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Authentication failed");
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.category).toBe(ErrorCategory.SECURITY);
      expect(error.name).toBe("AuthenticationError");
      expect(error.createdAt).toBeInstanceOf(Date);
    });

    it("should create authentication error with custom code and options", () => {
      const userId = "user123";
      const attemptedAction = "login";
      const authMethod = AuthMethod.PASSWORD;
      const failureReason = AuthFailureReason.INVALID_CREDENTIALS;

      const error = new AuthenticationError("Invalid password", "AUTH_LOGIN_FAILED", {
        userId,
        attemptedAction,
        authMethod,
        failureReason,
        severity: ErrorSeverity.WARNING,
        correlationId: "corr-123",
        component: "AuthService",
        operation: "authenticate",
        metadata: {
          attemptCount: 3,
          lastAttempt: new Date().toISOString(),
        },
      });

      expect(error.message).toBe("Invalid password");
      expect(error.code).toBe("AUTH_LOGIN_FAILED");
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.category).toBe(ErrorCategory.SECURITY);
      expect(error.userId).toBe(userId);
      expect(error.attemptedAction).toBe(attemptedAction);
      expect(error.authMethod).toBe(authMethod);
      expect(error.failureReason).toBe(failureReason);
      expect(error.context.correlationId).toBe("corr-123");
      expect(error.context.component).toBe("AuthService");
      expect(error.context.operation).toBe("authenticate");
      expect(error.context.metadata).toEqual({
        attemptCount: 3,
        lastAttempt: expect.any(String),
      });
    });

    it("should handle undefined optional fields correctly", () => {
      const error = new AuthenticationError("Auth error", "AUTH_ERROR", {
        userId: undefined,
        attemptedAction: undefined,
        authMethod: undefined,
        failureReason: undefined,
      });

      expect(error.userId).toBeUndefined();
      expect(error.attemptedAction).toBeUndefined();
      expect(error.authMethod).toBeUndefined();
      expect(error.failureReason).toBeUndefined();
    });
  });

  describe("Factory Methods", () => {
    describe("invalidCredentials", () => {
      it("should create error for invalid credentials without user info", () => {
        const error = AuthenticationError.invalidCredentials();

        expect(error.message).toBe("Invalid credentials provided");
        expect(error.code).toBe("AUTH_INVALID_CREDENTIALS");
        expect(error.severity).toBe(ErrorSeverity.WARNING);
        expect(error.failureReason).toBe(AuthFailureReason.INVALID_CREDENTIALS);
        expect(error.userId).toBeUndefined();
        expect(error.authMethod).toBeUndefined();
      });

      it("should create error for invalid credentials with user info", () => {
        const userId = "user456";
        const authMethod = AuthMethod.PASSWORD;

        const error = AuthenticationError.invalidCredentials(userId, authMethod);

        expect(error.message).toBe("Invalid credentials provided");
        expect(error.code).toBe("AUTH_INVALID_CREDENTIALS");
        expect(error.severity).toBe(ErrorSeverity.WARNING);
        expect(error.failureReason).toBe(AuthFailureReason.INVALID_CREDENTIALS);
        expect(error.userId).toBe(userId);
        expect(error.authMethod).toBe(authMethod);
      });

      it("should handle partial parameters correctly", () => {
        const userId = "user789";
        const error = AuthenticationError.invalidCredentials(userId);

        expect(error.userId).toBe(userId);
        expect(error.authMethod).toBeUndefined();
      });
    });

    describe("tokenExpired", () => {
      it("should create error for expired token with default type", () => {
        const userId = "user123";
        const error = AuthenticationError.tokenExpired(userId);

        expect(error.message).toBe("access token has expired");
        expect(error.code).toBe("AUTH_TOKEN_EXPIRED");
        expect(error.severity).toBe(ErrorSeverity.WARNING);
        expect(error.failureReason).toBe(AuthFailureReason.TOKEN_EXPIRED);
        expect(error.authMethod).toBe(AuthMethod.TOKEN);
        expect(error.userId).toBe(userId);
        expect(error.context.metadata).toEqual({ tokenType: "access" });
      });

      it("should create error for expired refresh token", () => {
        const userId = "user456";
        const error = AuthenticationError.tokenExpired(userId, "refresh");

        expect(error.message).toBe("refresh token has expired");
        expect(error.code).toBe("AUTH_TOKEN_EXPIRED");
        expect(error.context.metadata).toEqual({ tokenType: "refresh" });
      });

      it("should handle undefined userId", () => {
        const error = AuthenticationError.tokenExpired(undefined, "jwt");

        expect(error.userId).toBeUndefined();
        expect(error.message).toBe("jwt token has expired");
        expect(error.context.metadata).toEqual({ tokenType: "jwt" });
      });
    });

    describe("accountLocked", () => {
      it("should create error for locked account", () => {
        const userId = "user123";
        const reason = "Too many failed attempts";

        const error = AuthenticationError.accountLocked(userId, reason);

        expect(error.message).toBe("Account is locked");
        expect(error.code).toBe("AUTH_ACCOUNT_LOCKED");
        expect(error.severity).toBe(ErrorSeverity.ERROR);
        expect(error.failureReason).toBe(AuthFailureReason.ACCOUNT_LOCKED);
        expect(error.userId).toBe(userId);
        expect(error.context.metadata).toEqual({ lockReason: reason });
      });

      it("should create error for locked account without reason", () => {
        const userId = "user456";
        const error = AuthenticationError.accountLocked(userId);

        expect(error.userId).toBe(userId);
        expect(error.context.metadata).toEqual({ lockReason: undefined });
      });
    });

    describe("mfaRequired", () => {
      it("should create error for MFA requirement", () => {
        const userId = "user123";
        const authMethod = AuthMethod.TWO_FACTOR;

        const error = AuthenticationError.mfaRequired(userId, authMethod);

        expect(error.message).toBe("Multi-factor authentication required");
        expect(error.code).toBe("AUTH_MFA_REQUIRED");
        expect(error.severity).toBe(ErrorSeverity.WARNING);
        expect(error.failureReason).toBe(AuthFailureReason.MFA_REQUIRED);
        expect(error.userId).toBe(userId);
        expect(error.authMethod).toBe(authMethod);
      });

      it("should handle MFA requirement without auth method", () => {
        const userId = "user456";
        const error = AuthenticationError.mfaRequired(userId);

        expect(error.userId).toBe(userId);
        expect(error.authMethod).toBeUndefined();
      });
    });

    describe("oauthFailure", () => {
      it("should create error for OAuth failure", () => {
        const provider = "google";
        const oauthError = "invalid_grant";

        const error = AuthenticationError.oauthFailure(provider, oauthError);

        expect(error.message).toBe("OAuth authentication failed for google");
        expect(error.code).toBe("AUTH_OAUTH_FAILED");
        expect(error.severity).toBe(ErrorSeverity.ERROR);
        expect(error.authMethod).toBe(AuthMethod.OAUTH);
        expect(error.failureReason).toBe(AuthFailureReason.INVALID_CREDENTIALS);
        expect(error.context.metadata).toEqual({
          provider,
          oauthError,
        });
      });

      it("should create error for OAuth failure without specific error", () => {
        const provider = "github";
        const error = AuthenticationError.oauthFailure(provider);

        expect(error.message).toBe("OAuth authentication failed for github");
        expect(error.context.metadata).toEqual({
          provider,
          oauthError: undefined,
        });
      });
    });
  });

  describe("Error Inheritance and Interface Compliance", () => {
    it("should properly extend Error class", () => {
      const error = new AuthenticationError("Test error");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AuthenticationError).toBe(true);
      expect(error.stack).toBeDefined();
      expect(typeof error.toString).toBe("function");
    });

    it("should have proper error properties", () => {
      const error = new AuthenticationError("Test error", "TEST_AUTH_ERROR");

      expect(error.name).toBe("AuthenticationError");
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_AUTH_ERROR");
      expect(error.createdAt).toBeInstanceOf(Date);
    });

    it("should be serializable to JSON", () => {
      const userId = "user123";
      const error = new AuthenticationError("Auth failed", "AUTH_FAILED", {
        userId,
        authMethod: AuthMethod.TOKEN,
        failureReason: AuthFailureReason.TOKEN_EXPIRED,
        correlationId: "corr-123",
        metadata: { clientId: "app-123" },
      });

      const serialized = error.toJSON();

      expect(serialized).toEqual({
        name: "AuthenticationError",
        message: "Auth failed",
        code: "AUTH_FAILED",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.SECURITY,
        context: expect.objectContaining({
          timestamp: expect.any(String),
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.SECURITY,
          correlationId: "corr-123",
          metadata: { clientId: "app-123" },
        }),
        timestamp: expect.any(String),
        version: "1.0.0",
        stack: expect.any(String),
      });
    });
  });

  describe("Context and Metadata", () => {
    it("should preserve complex metadata", () => {
      const complexMetadata = {
        clientInfo: {
          userAgent: "Mozilla/5.0...",
          ipAddress: "192.168.1.1",
          sessionId: "sess-123",
        },
        authAttempt: {
          method: "password",
          timestamp: new Date().toISOString(),
          previousAttempts: [
            { timestamp: "2024-01-01T10:00:00Z", result: "failed" },
            { timestamp: "2024-01-01T10:01:00Z", result: "failed" },
          ],
        },
      };

      const error = new AuthenticationError("Complex auth error", "COMPLEX_AUTH_ERROR", {
        userId: "user123",
        metadata: complexMetadata,
      });

      expect(error.context.metadata).toEqual(complexMetadata);
    });

    it("should handle environment detection", () => {
      const error = new AuthenticationError("Environment test");

      // Should detect environment automatically
      expect(error.context.environment).toBeDefined();
      expect(typeof error.context.environment).toBe("object");
      expect(error.context.environment).toHaveProperty("platform");
    });

    it("should preserve correlation context", () => {
      const correlationId = "req-12345";
      const error = new AuthenticationError("Correlation test", "CORR_TEST", {
        correlationId,
      });

      expect(error.context.correlationId).toBe(correlationId);
    });
  });

  describe("Edge Cases and Validation", () => {
    it("should handle empty message gracefully", () => {
      const error = new AuthenticationError("");

      expect(error.message).toBe("");
      expect(error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("should handle very long messages", () => {
      const longMessage = "A".repeat(1000);
      const error = new AuthenticationError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it("should handle special characters in user IDs", () => {
      const specialUserId = "user@domain.com+test123";
      const error = new AuthenticationError("Special char test", "SPECIAL_TEST", {
        userId: specialUserId,
      });

      expect(error.userId).toBe(specialUserId);
    });

    it("should handle null-like values properly", () => {
      const error = new AuthenticationError("Null test", "NULL_TEST", {
        userId: "",
        attemptedAction: null as any,
        metadata: { emptyValue: "", nullValue: null, undefinedValue: undefined },
      });

      expect(error.userId).toBe("");
      expect(error.attemptedAction).toBeNull();
      expect(error.context.metadata).toEqual({
        emptyValue: "",
        nullValue: null,
        undefinedValue: undefined,
      });
    });
  });

  describe("Performance and Memory", () => {
    it("should create errors quickly", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        new AuthenticationError(`Error ${i}`, `CODE_${i}`, {
          userId: `user_${i}`,
          authMethod: AuthMethod.PASSWORD,
        });
      }

      const end = performance.now();
      const elapsed = end - start;

      // Should create 1000 errors in less than 100ms
      expect(elapsed).toBeLessThan(100);
    });

    it("should not leak memory with repeated creation", () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const errors: AuthenticationError[] = [];

      // Create many errors
      for (let i = 0; i < 10000; i++) {
        errors.push(
          new AuthenticationError(`Error ${i}`, `CODE_${i}`, {
            userId: `user_${i}`,
            metadata: { data: new Array(10).fill(i) },
          }),
        );
      }

      const afterCreation = process.memoryUsage().heapUsed;
      const memoryIncrease = (afterCreation - initialMemory) / 1024 / 1024; // MB

      // Clear references
      errors.length = 0;

      // Memory increase should be reasonable (less than 100MB for 10k errors)
      expect(memoryIncrease).toBeLessThan(100);
    });
  });
});
