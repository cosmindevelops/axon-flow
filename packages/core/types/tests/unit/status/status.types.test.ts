/**
 * Test suite for status type definitions
 */

import { describe, it, expect } from "vitest";

describe("Status Type Definitions", () => {
  describe("Status Code Types", () => {
    it("should validate HTTP status code types", () => {
      type HTTPStatusCode =
        | 100
        | 101
        | 102
        | 200
        | 201
        | 202
        | 204
        | 206
        | 300
        | 301
        | 302
        | 304
        | 307
        | 308
        | 400
        | 401
        | 403
        | 404
        | 405
        | 409
        | 422
        | 500
        | 501
        | 502
        | 503
        | 504;

      const validHttpCodes: HTTPStatusCode[] = [200, 404, 500];
      const testCode: HTTPStatusCode = 201;

      expect(validHttpCodes).toContain(200);
      expect(validHttpCodes).toContain(404);
      expect(validHttpCodes).toContain(500);
      expect(testCode).toBe(201);

      // Type-level validation
      const isSuccessCode = (code: HTTPStatusCode): code is 200 | 201 | 202 | 204 => {
        return code >= 200 && code < 300;
      };

      const isErrorCode = (code: HTTPStatusCode): code is 400 | 401 | 403 | 404 | 500 | 502 | 503 => {
        return code >= 400;
      };

      expect(isSuccessCode(200)).toBe(true);
      expect(isSuccessCode(201)).toBe(true);
      expect(isSuccessCode(404)).toBe(false);
      expect(isErrorCode(404)).toBe(true);
      expect(isErrorCode(500)).toBe(true);
      expect(isErrorCode(200)).toBe(false);
    });

    it("should validate custom status code types", () => {
      type CustomStatusCode = 1000 | 2000 | 3000 | 4000;

      const customCodes: CustomStatusCode[] = [1000, 2000, 3000, 4000];
      const currentCode: CustomStatusCode = 2000;

      expect(customCodes.length).toBe(4);
      expect(customCodes).toContain(currentCode);

      // Type guard for custom codes
      const isWarningCode = (code: CustomStatusCode): code is 2000 => code === 2000;
      const isCriticalCode = (code: CustomStatusCode): code is 4000 => code === 4000;

      expect(isWarningCode(2000)).toBe(true);
      expect(isWarningCode(1000)).toBe(false);
      expect(isCriticalCode(4000)).toBe(true);
      expect(isCriticalCode(3000)).toBe(false);
    });
  });

  describe("Status Level Types", () => {
    it("should validate status severity levels", () => {
      type StatusLevel = "low" | "medium" | "high" | "critical";

      const validLevels: StatusLevel[] = ["low", "medium", "high", "critical"];
      const currentLevel: StatusLevel = "medium";

      expect(validLevels.length).toBe(4);
      expect(validLevels).toContain(currentLevel);

      // Type guards for status levels
      const isHighPriority = (level: StatusLevel): level is "high" | "critical" => {
        return level === "high" || level === "critical";
      };

      const isLowPriority = (level: StatusLevel): level is "low" | "medium" => {
        return level === "low" || level === "medium";
      };

      expect(isHighPriority("high")).toBe(true);
      expect(isHighPriority("critical")).toBe(true);
      expect(isHighPriority("medium")).toBe(false);
      expect(isLowPriority("low")).toBe(true);
      expect(isLowPriority("medium")).toBe(true);
      expect(isLowPriority("critical")).toBe(false);
    });

    it("should validate status type enumeration", () => {
      type StatusType = "healthy" | "unhealthy" | "degraded" | "unknown";

      const statusTypes: StatusType[] = ["healthy", "unhealthy", "degraded", "unknown"];
      const currentStatus: StatusType = "healthy";

      expect(statusTypes.length).toBe(4);
      expect(statusTypes).toContain(currentStatus);

      // Type predicates
      const isOperational = (status: StatusType): status is "healthy" | "degraded" => {
        return status === "healthy" || status === "degraded";
      };

      const needsAttention = (status: StatusType): status is "unhealthy" | "unknown" => {
        return status === "unhealthy" || status === "unknown";
      };

      expect(isOperational("healthy")).toBe(true);
      expect(isOperational("degraded")).toBe(true);
      expect(isOperational("unhealthy")).toBe(false);
      expect(needsAttention("unhealthy")).toBe(true);
      expect(needsAttention("unknown")).toBe(true);
      expect(needsAttention("healthy")).toBe(false);
    });
  });

  describe("Health Check Interface Types", () => {
    it("should validate health check result interface", () => {
      interface IHealthCheckResult {
        readonly service: string;
        readonly status: "healthy" | "unhealthy" | "degraded";
        readonly timestamp: string;
        readonly responseTime: number;
        readonly details?: Record<string, unknown>;
        readonly error?: {
          readonly code: string;
          readonly message: string;
          readonly retryable: boolean;
        };
      }

      const healthyResult: IHealthCheckResult = {
        service: "database",
        status: "healthy",
        timestamp: new Date().toISOString(),
        responseTime: 150,
        details: {
          connectionPool: "active",
          activeConnections: 5,
        },
      };

      const unhealthyResult: IHealthCheckResult = {
        service: "api-gateway",
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime: 5000,
        error: {
          code: "TIMEOUT",
          message: "Service response timeout",
          retryable: true,
        },
      };

      // Type-level assertions
      expect(typeof healthyResult.service).toBe("string");
      expect(["healthy", "unhealthy", "degraded"]).toContain(healthyResult.status);
      expect(typeof healthyResult.timestamp).toBe("string");
      expect(typeof healthyResult.responseTime).toBe("number");
      expect(typeof healthyResult.details).toBe("object");
      expect("error" in healthyResult).toBe(false);

      expect(typeof unhealthyResult.service).toBe("string");
      expect(["healthy", "unhealthy", "degraded"]).toContain(unhealthyResult.status);
      expect(typeof unhealthyResult.error).toBe("object");
      expect(typeof unhealthyResult.error!.code).toBe("string");
      expect(typeof unhealthyResult.error!.message).toBe("string");
      expect(typeof unhealthyResult.error!.retryable).toBe("boolean");
    });

    it("should validate service health configuration", () => {
      interface IServiceHealthConfig {
        readonly name: string;
        readonly checkInterval: number;
        readonly timeout: number;
        readonly retries: number;
        readonly checkFunction: () => Promise<Record<string, unknown>>;
      }

      const dbHealthConfig: IServiceHealthConfig = {
        name: "database",
        checkInterval: 30000, // 30 seconds
        timeout: 5000, // 5 seconds
        retries: 3,
        checkFunction: async () => ({ connected: true, poolSize: 10 }),
      };

      expect(typeof dbHealthConfig.name).toBe("string");
      expect(typeof dbHealthConfig.checkInterval).toBe("number");
      expect(typeof dbHealthConfig.timeout).toBe("number");
      expect(typeof dbHealthConfig.retries).toBe("number");
      expect(typeof dbHealthConfig.checkFunction).toBe("function");

      expect(dbHealthConfig.checkInterval).toBeGreaterThan(0);
      expect(dbHealthConfig.timeout).toBeGreaterThan(0);
      expect(dbHealthConfig.retries).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Service Status Types", () => {
    it("should validate service lifecycle states", () => {
      type ServiceState = "starting" | "running" | "stopping" | "stopped" | "error";

      const validStates: ServiceState[] = ["starting", "running", "stopping", "stopped", "error"];
      const currentState: ServiceState = "running";

      expect(validStates.length).toBe(5);
      expect(validStates).toContain(currentState);

      // State transition guards
      const canTransitionTo = (from: ServiceState, to: ServiceState): boolean => {
        const transitions: Record<ServiceState, ServiceState[]> = {
          starting: ["running", "error", "stopped"],
          running: ["stopping", "error"],
          stopping: ["stopped", "error"],
          stopped: ["starting"],
          error: ["starting", "stopped"],
        };

        return transitions[from].includes(to);
      };

      expect(canTransitionTo("starting", "running")).toBe(true);
      expect(canTransitionTo("running", "stopping")).toBe(true);
      expect(canTransitionTo("stopped", "starting")).toBe(true);
      expect(canTransitionTo("running", "starting")).toBe(false);
      expect(canTransitionTo("stopped", "running")).toBe(false);
    });

    it("should validate resource metrics types", () => {
      interface IResourceMetrics {
        readonly memory: {
          readonly used: number;
          readonly total: number;
          readonly percentage: number;
        };
        readonly cpu: {
          readonly usage: number;
          readonly cores: number;
        };
        readonly disk?: {
          readonly used: number;
          readonly total: number;
          readonly percentage: number;
        };
        readonly network?: {
          readonly bytesIn: number;
          readonly bytesOut: number;
          readonly packetsIn: number;
          readonly packetsOut: number;
        };
      }

      const metrics: IResourceMetrics = {
        memory: {
          used: 256 * 1024 * 1024, // 256MB
          total: 1024 * 1024 * 1024, // 1GB
          percentage: 25,
        },
        cpu: {
          usage: 45.5,
          cores: 4,
        },
        disk: {
          used: 10 * 1024 * 1024 * 1024, // 10GB
          total: 100 * 1024 * 1024 * 1024, // 100GB
          percentage: 10,
        },
      };

      expect(typeof metrics.memory.used).toBe("number");
      expect(typeof metrics.memory.total).toBe("number");
      expect(typeof metrics.memory.percentage).toBe("number");
      expect(metrics.memory.used).toBeLessThanOrEqual(metrics.memory.total);
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(100);

      expect(typeof metrics.cpu.usage).toBe("number");
      expect(typeof metrics.cpu.cores).toBe("number");
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.cores).toBeGreaterThan(0);

      expect(typeof metrics.disk).toBe("object");
      expect(metrics.disk!.used).toBeLessThanOrEqual(metrics.disk!.total);
    });
  });

  describe("Alert and Notification Types", () => {
    it("should validate alert severity and priority types", () => {
      type AlertSeverity = "info" | "warning" | "error" | "critical";
      type AlertPriority = "low" | "medium" | "high" | "urgent";

      interface IAlert {
        readonly id: string;
        readonly title: string;
        readonly message: string;
        readonly severity: AlertSeverity;
        readonly priority: AlertPriority;
        readonly source: string;
        readonly timestamp: string;
        readonly resolved: boolean;
        readonly metadata?: Record<string, unknown>;
      }

      const criticalAlert: IAlert = {
        id: "alert-001",
        title: "Database Connection Lost",
        message: "Unable to connect to primary database",
        severity: "critical",
        priority: "urgent",
        source: "health-monitor",
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: {
          service: "postgres",
          retryAttempts: 3,
          lastSuccessfulConnection: new Date(Date.now() - 300000).toISOString(),
        },
      };

      expect(typeof criticalAlert.id).toBe("string");
      expect(typeof criticalAlert.title).toBe("string");
      expect(typeof criticalAlert.message).toBe("string");
      expect(["info", "warning", "error", "critical"]).toContain(criticalAlert.severity);
      expect(["low", "medium", "high", "urgent"]).toContain(criticalAlert.priority);
      expect(typeof criticalAlert.source).toBe("string");
      expect(typeof criticalAlert.resolved).toBe("boolean");
      expect(typeof criticalAlert.metadata).toBe("object");

      // Type guards for alert classification
      const isCriticalAlert = (alert: IAlert): alert is IAlert & { severity: "critical" } => {
        return alert.severity === "critical";
      };

      const isUrgentAlert = (alert: IAlert): alert is IAlert & { priority: "urgent" } => {
        return alert.priority === "urgent";
      };

      expect(isCriticalAlert(criticalAlert)).toBe(true);
      expect(isUrgentAlert(criticalAlert)).toBe(true);
    });

    it("should validate notification channel types", () => {
      type NotificationChannel = "email" | "sms" | "webhook" | "push" | "slack";

      interface INotificationRule {
        readonly id: string;
        readonly name: string;
        readonly channels: readonly NotificationChannel[];
        readonly conditions: {
          readonly severity: readonly ("info" | "warning" | "error" | "critical")[];
          readonly services?: readonly string[];
        };
        readonly enabled: boolean;
      }

      const notificationRule: INotificationRule = {
        id: "rule-001",
        name: "Critical Alerts",
        channels: ["email", "slack", "sms"],
        conditions: {
          severity: ["error", "critical"],
          services: ["database", "api-gateway"],
        },
        enabled: true,
      };

      expect(typeof notificationRule.id).toBe("string");
      expect(typeof notificationRule.name).toBe("string");
      expect(Array.isArray(notificationRule.channels)).toBe(true);
      expect(typeof notificationRule.enabled).toBe("boolean");

      notificationRule.channels.forEach((channel) => {
        expect(["email", "sms", "webhook", "push", "slack"]).toContain(channel);
      });

      notificationRule.conditions.severity.forEach((severity) => {
        expect(["info", "warning", "error", "critical"]).toContain(severity);
      });
    });
  });

  describe("Status Report Types", () => {
    it("should validate comprehensive status report interface", () => {
      interface IStatusReport {
        readonly reportId: string;
        readonly timestamp: string;
        readonly application: {
          readonly name: string;
          readonly version: string;
          readonly environment: "development" | "staging" | "production";
        };
        readonly overall: "healthy" | "degraded" | "unhealthy";
        readonly services: Record<
          string,
          {
            readonly status: "healthy" | "unhealthy" | "degraded";
            readonly responseTime: number;
            readonly lastChecked: string;
            readonly details?: Record<string, unknown>;
          }
        >;
        readonly metrics: {
          readonly uptime: number;
          readonly requestCount: number;
          readonly errorRate: number;
          readonly averageResponseTime: number;
        };
        readonly alerts: readonly {
          readonly id: string;
          readonly severity: "info" | "warning" | "error" | "critical";
          readonly message: string;
          readonly timestamp: string;
        }[];
      }

      const statusReport: IStatusReport = {
        reportId: "report-12345",
        timestamp: new Date().toISOString(),
        application: {
          name: "axon-flow",
          version: "1.0.0",
          environment: "production",
        },
        overall: "healthy",
        services: {
          database: {
            status: "healthy",
            responseTime: 15,
            lastChecked: new Date().toISOString(),
            details: { connectionPool: "active" },
          },
          cache: {
            status: "healthy",
            responseTime: 5,
            lastChecked: new Date().toISOString(),
          },
        },
        metrics: {
          uptime: 86400,
          requestCount: 10000,
          errorRate: 0.01,
          averageResponseTime: 200,
        },
        alerts: [
          {
            id: "alert-001",
            severity: "warning",
            message: "High memory usage detected",
            timestamp: new Date().toISOString(),
          },
        ],
      };

      expect(typeof statusReport.reportId).toBe("string");
      expect(new Date(statusReport.timestamp).toISOString()).toBe(statusReport.timestamp);
      expect(typeof statusReport.application.name).toBe("string");
      expect(typeof statusReport.application.version).toBe("string");
      expect(["development", "staging", "production"]).toContain(statusReport.application.environment);
      expect(["healthy", "degraded", "unhealthy"]).toContain(statusReport.overall);

      Object.values(statusReport.services).forEach((service) => {
        expect(["healthy", "unhealthy", "degraded"]).toContain(service.status);
        expect(typeof service.responseTime).toBe("number");
        expect(typeof service.lastChecked).toBe("string");
      });

      expect(typeof statusReport.metrics.uptime).toBe("number");
      expect(typeof statusReport.metrics.requestCount).toBe("number");
      expect(typeof statusReport.metrics.errorRate).toBe("number");
      expect(typeof statusReport.metrics.averageResponseTime).toBe("number");

      expect(Array.isArray(statusReport.alerts)).toBe(true);
      statusReport.alerts.forEach((alert) => {
        expect(typeof alert.id).toBe("string");
        expect(["info", "warning", "error", "critical"]).toContain(alert.severity);
        expect(typeof alert.message).toBe("string");
        expect(typeof alert.timestamp).toBe("string");
      });
    });
  });

  describe("Union and Discriminated Union Types", () => {
    it("should validate discriminated union for status events", () => {
      type StatusEvent =
        | { type: "health_check"; service: string; result: "healthy" | "unhealthy"; responseTime: number }
        | { type: "service_start"; service: string; pid: number; timestamp: string }
        | { type: "service_stop"; service: string; exitCode: number; timestamp: string }
        | { type: "alert_triggered"; alertId: string; severity: string; message: string };

      const healthEvent: StatusEvent = {
        type: "health_check",
        service: "database",
        result: "healthy",
        responseTime: 150,
      };

      const startEvent: StatusEvent = {
        type: "service_start",
        service: "api-gateway",
        pid: 1234,
        timestamp: new Date().toISOString(),
      };

      const alertEvent: StatusEvent = {
        type: "alert_triggered",
        alertId: "alert-001",
        severity: "critical",
        message: "Service down",
      };

      // Type guards for discriminated union
      const isHealthCheck = (event: StatusEvent): event is Extract<StatusEvent, { type: "health_check" }> => {
        return event.type === "health_check";
      };

      const isServiceStart = (event: StatusEvent): event is Extract<StatusEvent, { type: "service_start" }> => {
        return event.type === "service_start";
      };

      const isAlert = (event: StatusEvent): event is Extract<StatusEvent, { type: "alert_triggered" }> => {
        return event.type === "alert_triggered";
      };

      expect(isHealthCheck(healthEvent)).toBe(true);
      expect(isServiceStart(startEvent)).toBe(true);
      expect(isAlert(alertEvent)).toBe(true);
      expect(isHealthCheck(startEvent)).toBe(false);
      expect(isAlert(healthEvent)).toBe(false);

      if (isHealthCheck(healthEvent)) {
        expect(typeof healthEvent.responseTime).toBe("number");
        expect(["healthy", "unhealthy"]).toContain(healthEvent.result);
      }

      if (isServiceStart(startEvent)) {
        expect(typeof startEvent.pid).toBe("number");
        expect(typeof startEvent.timestamp).toBe("string");
      }

      if (isAlert(alertEvent)) {
        expect(typeof alertEvent.alertId).toBe("string");
        expect(typeof alertEvent.severity).toBe("string");
        expect(typeof alertEvent.message).toBe("string");
      }
    });
  });

  describe("Generic Status Types", () => {
    it("should validate generic status container types", () => {
      interface IStatusContainer<TData = unknown> {
        readonly status: "success" | "error" | "pending";
        readonly data?: TData;
        readonly error?: {
          readonly code: string;
          readonly message: string;
        };
        readonly timestamp: string;
      }

      const successStatus: IStatusContainer<{ count: number }> = {
        status: "success",
        data: { count: 42 },
        timestamp: new Date().toISOString(),
      };

      const errorStatus: IStatusContainer = {
        status: "error",
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to connect to service",
        },
        timestamp: new Date().toISOString(),
      };

      const pendingStatus: IStatusContainer = {
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      expect(successStatus.status).toBe("success");
      expect(typeof successStatus.data).toBe("object");
      expect(successStatus.data!.count).toBe(42);

      expect(errorStatus.status).toBe("error");
      expect(typeof errorStatus.error).toBe("object");
      expect(typeof errorStatus.error!.code).toBe("string");
      expect(typeof errorStatus.error!.message).toBe("string");

      expect(pendingStatus.status).toBe("pending");
      expect("data" in pendingStatus).toBe(false);
      expect("error" in pendingStatus).toBe(false);
    });
  });
});
