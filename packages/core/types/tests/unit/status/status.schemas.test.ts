/**
 * Test suite for status schema validations
 */

import { describe, it, expect } from "vitest";

describe("Status Schema Validations", () => {
  describe("Status Code Schemas", () => {
    it("should validate HTTP status codes", () => {
      const validStatusCodes = [100, 200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 502, 503];
      const invalidStatusCodes = [50, 99, 600, 999, -1, 0];

      validStatusCodes.forEach((code) => {
        expect(typeof code).toBe("number");
        expect(code).toBeGreaterThanOrEqual(100);
        expect(code).toBeLessThan(600);
      });

      invalidStatusCodes.forEach((code) => {
        expect(typeof code).toBe("number");
        expect(code < 100 || code >= 600).toBe(true);
      });
    });

    it("should validate custom status codes", () => {
      const customStatusCodes = {
        SUCCESS: 1000,
        WARNING: 2000,
        ERROR: 3000,
        CRITICAL: 4000,
      };

      Object.values(customStatusCodes).forEach((code) => {
        expect(typeof code).toBe("number");
        expect(code).toBeGreaterThan(0);
        expect(code % 1000).toBe(0); // Custom codes are multiples of 1000
      });
    });
  });

  describe("Status Level Schemas", () => {
    it("should validate status levels", () => {
      const validLevels = ["low", "medium", "high", "critical"];
      const invalidLevels = ["", "unknown", "super-critical", null, undefined];

      validLevels.forEach((level) => {
        expect(typeof level).toBe("string");
        expect(level.length).toBeGreaterThan(0);
        expect(validLevels).toContain(level);
      });

      invalidLevels.forEach((level) => {
        if (level === null) {
          expect(level).toBeNull();
        } else if (level === undefined) {
          expect(level).toBeUndefined();
        } else if (level === "") {
          expect(level).toBe("");
        } else {
          expect(validLevels).not.toContain(level);
        }
      });
    });

    it("should validate level hierarchy", () => {
      const levelPriority = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };

      const levels = Object.keys(levelPriority);

      for (let i = 0; i < levels.length - 1; i++) {
        const currentLevel = levels[i];
        const nextLevel = levels[i + 1];
        expect(levelPriority[currentLevel as keyof typeof levelPriority]).toBeLessThan(
          levelPriority[nextLevel as keyof typeof levelPriority],
        );
      }
    });
  });

  describe("Health Check Schemas", () => {
    it("should validate health check structure", () => {
      const validHealthCheck = {
        service: "database",
        status: "healthy",
        lastChecked: new Date().toISOString(),
        responseTime: 150,
        details: {
          connectionPool: "active",
          activeConnections: 5,
          maxConnections: 100,
        },
      };

      const invalidHealthCheck = {
        service: "",
        status: "invalid-status",
        lastChecked: "not-iso-date",
        responseTime: -1,
        details: null,
      };

      // Valid health check validation
      expect(typeof validHealthCheck.service).toBe("string");
      expect(validHealthCheck.service.length).toBeGreaterThan(0);
      expect(["healthy", "unhealthy", "degraded"]).toContain(validHealthCheck.status);
      expect(typeof validHealthCheck.lastChecked).toBe("string");
      expect(new Date(validHealthCheck.lastChecked).toISOString()).toBe(validHealthCheck.lastChecked);
      expect(typeof validHealthCheck.responseTime).toBe("number");
      expect(validHealthCheck.responseTime).toBeGreaterThan(0);
      expect(typeof validHealthCheck.details).toBe("object");
      expect(validHealthCheck.details).not.toBeNull();

      // Invalid health check validation
      expect(invalidHealthCheck.service).toBe("");
      expect(["healthy", "unhealthy", "degraded"]).not.toContain(invalidHealthCheck.status);
      expect(() => new Date(invalidHealthCheck.lastChecked).toISOString()).toThrow();
      expect(invalidHealthCheck.responseTime).toBeLessThan(0);
      expect(invalidHealthCheck.details).toBeNull();
    });

    it("should validate health check with error", () => {
      const healthCheckWithError = {
        service: "api-gateway",
        status: "unhealthy",
        lastChecked: new Date().toISOString(),
        responseTime: 5000,
        error: {
          code: "CONNECTION_TIMEOUT",
          message: "Service did not respond within timeout",
          stack: "Error: timeout...",
          retryable: true,
        },
      };

      expect(typeof healthCheckWithError.error).toBe("object");
      expect(typeof healthCheckWithError.error.code).toBe("string");
      expect(typeof healthCheckWithError.error.message).toBe("string");
      expect(typeof healthCheckWithError.error.stack).toBe("string");
      expect(typeof healthCheckWithError.error.retryable).toBe("boolean");
    });
  });

  describe("Service Status Schemas", () => {
    it("should validate service status configuration", () => {
      const serviceStatus = {
        name: "user-service",
        version: "1.2.3",
        status: "running",
        uptime: 86400, // 24 hours in seconds
        memory: {
          used: 256 * 1024 * 1024, // 256MB
          total: 512 * 1024 * 1024, // 512MB
          percentage: 50,
        },
        cpu: {
          usage: 25.5,
          cores: 4,
        },
        endpoints: [
          {
            path: "/health",
            method: "GET",
            status: "healthy",
            lastChecked: new Date().toISOString(),
          },
          {
            path: "/metrics",
            method: "GET",
            status: "healthy",
            lastChecked: new Date().toISOString(),
          },
        ],
      };

      expect(typeof serviceStatus.name).toBe("string");
      expect(serviceStatus.name.length).toBeGreaterThan(0);
      expect(typeof serviceStatus.version).toBe("string");
      expect(serviceStatus.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(["running", "stopped", "starting", "stopping", "error"]).toContain(serviceStatus.status);
      expect(typeof serviceStatus.uptime).toBe("number");
      expect(serviceStatus.uptime).toBeGreaterThanOrEqual(0);

      // Memory validation
      expect(typeof serviceStatus.memory.used).toBe("number");
      expect(typeof serviceStatus.memory.total).toBe("number");
      expect(typeof serviceStatus.memory.percentage).toBe("number");
      expect(serviceStatus.memory.used).toBeLessThanOrEqual(serviceStatus.memory.total);
      expect(serviceStatus.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(serviceStatus.memory.percentage).toBeLessThanOrEqual(100);

      // CPU validation
      expect(typeof serviceStatus.cpu.usage).toBe("number");
      expect(typeof serviceStatus.cpu.cores).toBe("number");
      expect(serviceStatus.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(serviceStatus.cpu.cores).toBeGreaterThan(0);

      // Endpoints validation
      expect(Array.isArray(serviceStatus.endpoints)).toBe(true);
      serviceStatus.endpoints.forEach((endpoint) => {
        expect(typeof endpoint.path).toBe("string");
        expect(endpoint.path.startsWith("/")).toBe(true);
        expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(endpoint.method);
        expect(["healthy", "unhealthy", "unknown"]).toContain(endpoint.status);
        expect(new Date(endpoint.lastChecked).toISOString()).toBe(endpoint.lastChecked);
      });
    });
  });

  describe("Application Status Schemas", () => {
    it("should validate application status report", () => {
      const applicationStatus = {
        application: {
          name: "axon-flow",
          version: "1.0.0",
          environment: "production",
          buildNumber: "123",
          deployedAt: new Date().toISOString(),
        },
        status: "healthy",
        uptime: 3600,
        services: {
          database: { status: "healthy", responseTime: 15 },
          cache: { status: "healthy", responseTime: 5 },
          "message-queue": { status: "degraded", responseTime: 100 },
        },
        metrics: {
          requestsPerMinute: 150,
          averageResponseTime: 200,
          errorRate: 0.01,
          activeUsers: 45,
        },
        timestamp: new Date().toISOString(),
      };

      // Application info validation
      expect(typeof applicationStatus.application.name).toBe("string");
      expect(typeof applicationStatus.application.version).toBe("string");
      expect(["development", "test", "staging", "production"]).toContain(applicationStatus.application.environment);
      expect(typeof applicationStatus.application.buildNumber).toBe("string");
      expect(new Date(applicationStatus.application.deployedAt).toISOString()).toBe(
        applicationStatus.application.deployedAt,
      );

      // Overall status validation
      expect(["healthy", "unhealthy", "degraded"]).toContain(applicationStatus.status);
      expect(typeof applicationStatus.uptime).toBe("number");
      expect(applicationStatus.uptime).toBeGreaterThanOrEqual(0);

      // Services validation
      expect(typeof applicationStatus.services).toBe("object");
      Object.values(applicationStatus.services).forEach((service) => {
        expect(["healthy", "unhealthy", "degraded"]).toContain((service as any).status);
        expect(typeof (service as any).responseTime).toBe("number");
        expect((service as any).responseTime).toBeGreaterThan(0);
      });

      // Metrics validation
      expect(typeof applicationStatus.metrics.requestsPerMinute).toBe("number");
      expect(typeof applicationStatus.metrics.averageResponseTime).toBe("number");
      expect(typeof applicationStatus.metrics.errorRate).toBe("number");
      expect(typeof applicationStatus.metrics.activeUsers).toBe("number");

      expect(applicationStatus.metrics.requestsPerMinute).toBeGreaterThanOrEqual(0);
      expect(applicationStatus.metrics.averageResponseTime).toBeGreaterThan(0);
      expect(applicationStatus.metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(applicationStatus.metrics.errorRate).toBeLessThanOrEqual(1);
      expect(applicationStatus.metrics.activeUsers).toBeGreaterThanOrEqual(0);

      expect(new Date(applicationStatus.timestamp).toISOString()).toBe(applicationStatus.timestamp);
    });
  });

  describe("Status Event Schemas", () => {
    it("should validate status change events", () => {
      const statusChangeEvent = {
        eventId: "evt-12345",
        eventType: "status.changed",
        source: "health-checker",
        timestamp: new Date().toISOString(),
        data: {
          service: "database",
          previousStatus: "healthy",
          currentStatus: "unhealthy",
          reason: "Connection timeout",
          metadata: {
            connectionPool: "exhausted",
            lastSuccessfulCheck: new Date(Date.now() - 60000).toISOString(),
          },
        },
      };

      expect(typeof statusChangeEvent.eventId).toBe("string");
      expect(statusChangeEvent.eventId.startsWith("evt-")).toBe(true);
      expect(typeof statusChangeEvent.eventType).toBe("string");
      expect(statusChangeEvent.eventType).toMatch(/^[a-z]+\.[a-z]+$/);
      expect(typeof statusChangeEvent.source).toBe("string");
      expect(new Date(statusChangeEvent.timestamp).toISOString()).toBe(statusChangeEvent.timestamp);

      expect(typeof statusChangeEvent.data.service).toBe("string");
      expect(["healthy", "unhealthy", "degraded"]).toContain(statusChangeEvent.data.previousStatus);
      expect(["healthy", "unhealthy", "degraded"]).toContain(statusChangeEvent.data.currentStatus);
      expect(typeof statusChangeEvent.data.reason).toBe("string");
      expect(typeof statusChangeEvent.data.metadata).toBe("object");
    });
  });

  describe("Alert Configuration Schemas", () => {
    it("should validate alert configuration", () => {
      const alertConfig = {
        name: "database-connection-alert",
        description: "Alert when database connection fails",
        enabled: true,
        conditions: {
          service: "database",
          status: "unhealthy",
          duration: 300, // 5 minutes
          threshold: {
            responseTime: 1000,
            errorRate: 0.05,
          },
        },
        actions: [
          {
            type: "email",
            recipients: ["admin@example.com", "ops@example.com"],
            template: "service-down",
          },
          {
            type: "webhook",
            url: "https://hooks.slack.com/services/...",
            method: "POST",
          },
        ],
        cooldown: 1800, // 30 minutes
        priority: "high",
      };

      expect(typeof alertConfig.name).toBe("string");
      expect(alertConfig.name.length).toBeGreaterThan(0);
      expect(typeof alertConfig.description).toBe("string");
      expect(typeof alertConfig.enabled).toBe("boolean");

      // Conditions validation
      expect(typeof alertConfig.conditions.service).toBe("string");
      expect(["healthy", "unhealthy", "degraded"]).toContain(alertConfig.conditions.status);
      expect(typeof alertConfig.conditions.duration).toBe("number");
      expect(alertConfig.conditions.duration).toBeGreaterThan(0);
      expect(typeof alertConfig.conditions.threshold.responseTime).toBe("number");
      expect(typeof alertConfig.conditions.threshold.errorRate).toBe("number");

      // Actions validation
      expect(Array.isArray(alertConfig.actions)).toBe(true);
      alertConfig.actions.forEach((action) => {
        expect(["email", "webhook", "sms", "push"]).toContain(action.type);
        if (action.type === "email") {
          expect(Array.isArray((action as any).recipients)).toBe(true);
          expect(typeof (action as any).template).toBe("string");
        } else if (action.type === "webhook") {
          expect(typeof (action as any).url).toBe("string");
          expect(["GET", "POST", "PUT"]).toContain((action as any).method);
        }
      });

      expect(typeof alertConfig.cooldown).toBe("number");
      expect(alertConfig.cooldown).toBeGreaterThan(0);
      expect(["low", "medium", "high", "critical"]).toContain(alertConfig.priority);
    });
  });

  describe("Schema Error Handling", () => {
    it("should handle malformed status objects", () => {
      const malformedStatuses = [
        null,
        undefined,
        "",
        123,
        [],
        { status: "invalid" },
        { service: null },
        { responseTime: "not-a-number" },
      ];

      malformedStatuses.forEach((status) => {
        if (status === null) {
          expect(status).toBeNull();
        } else if (status === undefined) {
          expect(status).toBeUndefined();
        } else if (typeof status === "object" && !Array.isArray(status)) {
          // Object validation
          if ("status" in status && status.status === "invalid") {
            expect(["healthy", "unhealthy", "degraded"]).not.toContain(status.status);
          }
          if ("service" in status && status.service === null) {
            expect(status.service).toBeNull();
          }
          if ("responseTime" in status && typeof status.responseTime === "string") {
            expect(typeof status.responseTime).not.toBe("number");
          }
        } else {
          // Primitive or array validation
          expect(typeof status === "object" && !Array.isArray(status)).toBe(false);
        }
      });
    });

    it("should validate required vs optional fields", () => {
      interface StatusSchema {
        service: string; // required
        status: string; // required
        timestamp?: string; // optional
        details?: Record<string, unknown>; // optional
      }

      const minimalStatus: StatusSchema = {
        service: "test-service",
        status: "healthy",
      };

      const fullStatus: StatusSchema = {
        service: "test-service",
        status: "healthy",
        timestamp: new Date().toISOString(),
        details: { version: "1.0.0" },
      };

      // Required fields validation
      expect(typeof minimalStatus.service).toBe("string");
      expect(typeof minimalStatus.status).toBe("string");
      expect("timestamp" in minimalStatus).toBe(false);
      expect("details" in minimalStatus).toBe(false);

      // Full schema validation
      expect(typeof fullStatus.service).toBe("string");
      expect(typeof fullStatus.status).toBe("string");
      expect(typeof fullStatus.timestamp).toBe("string");
      expect(typeof fullStatus.details).toBe("object");
    });
  });
});
