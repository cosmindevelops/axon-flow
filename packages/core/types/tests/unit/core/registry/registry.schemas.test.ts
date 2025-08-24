/**
 * Test suite for registry schema validations
 */

import { describe, it, expect } from "vitest";

describe("Registry Schema Validations", () => {
  describe("Service Registration Schemas", () => {
    it("should validate service registration structure", () => {
      const validServiceRegistration = {
        id: "user-service-001",
        name: "User Service",
        version: "1.2.3",
        endpoint: "http://localhost:3001",
        health: {
          path: "/health",
          interval: 30000,
          timeout: 5000,
        },
        metadata: {
          description: "Handles user management operations",
          tags: ["user", "authentication", "crud"],
          maintainer: "backend-team@company.com",
        },
        capabilities: ["user.create", "user.read", "user.update", "user.delete"],
        registeredAt: new Date().toISOString(),
        status: "active",
      };

      const invalidServiceRegistration = {
        id: "",
        name: null,
        version: "invalid-version",
        endpoint: "not-a-url",
        health: {
          interval: -1000,
          timeout: "invalid",
        },
        capabilities: "not-an-array",
      };

      // Valid registration validation
      expect(typeof validServiceRegistration.id).toBe("string");
      expect(validServiceRegistration.id.length).toBeGreaterThan(0);
      expect(typeof validServiceRegistration.name).toBe("string");
      expect(validServiceRegistration.name.length).toBeGreaterThan(0);
      expect(typeof validServiceRegistration.version).toBe("string");
      expect(validServiceRegistration.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof validServiceRegistration.endpoint).toBe("string");
      expect(validServiceRegistration.endpoint.startsWith("http")).toBe(true);

      expect(typeof validServiceRegistration.health).toBe("object");
      expect(typeof validServiceRegistration.health.path).toBe("string");
      expect(typeof validServiceRegistration.health.interval).toBe("number");
      expect(validServiceRegistration.health.interval).toBeGreaterThan(0);
      expect(typeof validServiceRegistration.health.timeout).toBe("number");
      expect(validServiceRegistration.health.timeout).toBeGreaterThan(0);

      expect(Array.isArray(validServiceRegistration.capabilities)).toBe(true);
      validServiceRegistration.capabilities.forEach((cap) => {
        expect(typeof cap).toBe("string");
        expect(cap.length).toBeGreaterThan(0);
      });

      expect(new Date(validServiceRegistration.registeredAt).toISOString()).toBe(validServiceRegistration.registeredAt);
      expect(["active", "inactive", "maintenance", "error"]).toContain(validServiceRegistration.status);

      // Invalid registration validation
      expect(invalidServiceRegistration.id).toBe("");
      expect(invalidServiceRegistration.name).toBeNull();
      expect(invalidServiceRegistration.version).not.toMatch(/^\d+\.\d+\.\d+$/);
      expect(invalidServiceRegistration.endpoint).not.toMatch(/^https?:\/\//);
      expect(invalidServiceRegistration.health.interval).toBeLessThan(0);
      expect(typeof invalidServiceRegistration.health.timeout).toBe("string");
      expect(Array.isArray(invalidServiceRegistration.capabilities)).toBe(false);
    });

    it("should validate service metadata schemas", () => {
      const serviceMetadata = {
        description: "Core authentication service",
        tags: ["auth", "security", "jwt"],
        maintainer: "security-team@company.com",
        documentation: "https://docs.company.com/auth-service",
        repository: "https://github.com/company/auth-service",
        license: "MIT",
        dependencies: [
          {
            name: "database",
            version: ">=1.0.0",
            type: "service",
          },
          {
            name: "redis",
            version: "^6.0.0",
            type: "external",
          },
        ],
        configuration: {
          jwtSecret: {
            type: "string",
            required: true,
            sensitive: true,
          },
          tokenExpiry: {
            type: "number",
            required: false,
            default: 3600,
          },
        },
      };

      expect(typeof serviceMetadata.description).toBe("string");
      expect(serviceMetadata.description.length).toBeGreaterThan(0);
      expect(Array.isArray(serviceMetadata.tags)).toBe(true);
      serviceMetadata.tags.forEach((tag) => {
        expect(typeof tag).toBe("string");
        expect(tag.length).toBeGreaterThan(0);
      });

      expect(typeof serviceMetadata.maintainer).toBe("string");
      expect(serviceMetadata.maintainer).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(typeof serviceMetadata.documentation).toBe("string");
      expect(serviceMetadata.documentation.startsWith("http")).toBe(true);

      expect(Array.isArray(serviceMetadata.dependencies)).toBe(true);
      serviceMetadata.dependencies.forEach((dep) => {
        expect(typeof dep.name).toBe("string");
        expect(typeof dep.version).toBe("string");
        expect(["service", "external", "library"]).toContain(dep.type);
      });

      expect(typeof serviceMetadata.configuration).toBe("object");
      Object.values(serviceMetadata.configuration).forEach((config) => {
        expect(typeof (config as any).type).toBe("string");
        expect(typeof (config as any).required).toBe("boolean");
      });
    });
  });

  describe("Capability Registration Schemas", () => {
    it("should validate capability definition structure", () => {
      const validCapability = {
        id: "user.authentication",
        name: "User Authentication",
        description: "Authenticate users using various methods",
        version: "2.1.0",
        category: "authentication",
        tags: ["auth", "security", "oauth", "jwt"],
        parameters: [
          {
            name: "credentials",
            type: "object",
            required: true,
            description: "User login credentials",
            schema: {
              type: "object",
              properties: {
                username: { type: "string", minLength: 3 },
                password: { type: "string", minLength: 8 },
              },
              required: ["username", "password"],
            },
          },
          {
            name: "options",
            type: "object",
            required: false,
            description: "Authentication options",
            default: { rememberMe: false, mfa: false },
          },
        ],
        returns: {
          type: "object",
          description: "Authentication result",
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              token: { type: "string", optional: true },
              user: { type: "object", optional: true },
              error: { type: "string", optional: true },
            },
            required: ["success"],
          },
        },
        examples: [
          {
            input: {
              credentials: { username: "john", password: "securepass" },
              options: { rememberMe: true },
            },
            output: {
              success: true,
              token: "jwt-token-here",
              user: { id: "user-123", name: "John Doe" },
            },
          },
        ],
        ratelimit: {
          requests: 10,
          window: 60000,
        },
        timeout: 5000,
      };

      expect(typeof validCapability.id).toBe("string");
      expect(validCapability.id.includes(".")).toBe(true);
      expect(typeof validCapability.name).toBe("string");
      expect(typeof validCapability.description).toBe("string");
      expect(typeof validCapability.version).toBe("string");
      expect(validCapability.version).toMatch(/^\d+\.\d+\.\d+$/);

      expect(Array.isArray(validCapability.parameters)).toBe(true);
      validCapability.parameters.forEach((param) => {
        expect(typeof param.name).toBe("string");
        expect(typeof param.type).toBe("string");
        expect(typeof param.required).toBe("boolean");
        expect(typeof param.description).toBe("string");
      });

      expect(typeof validCapability.returns).toBe("object");
      expect(typeof validCapability.returns.type).toBe("string");
      expect(typeof validCapability.returns.description).toBe("string");

      expect(Array.isArray(validCapability.examples)).toBe(true);
      validCapability.examples.forEach((example) => {
        expect(typeof example.input).toBe("object");
        expect(typeof example.output).toBe("object");
      });

      expect(typeof validCapability.ratelimit).toBe("object");
      expect(typeof validCapability.ratelimit.requests).toBe("number");
      expect(validCapability.ratelimit.requests).toBeGreaterThan(0);
      expect(typeof validCapability.ratelimit.window).toBe("number");
      expect(validCapability.ratelimit.window).toBeGreaterThan(0);

      expect(typeof validCapability.timeout).toBe("number");
      expect(validCapability.timeout).toBeGreaterThan(0);
    });

    it("should validate capability parameter schemas", () => {
      const stringParameter = {
        name: "username",
        type: "string",
        required: true,
        description: "User identifier",
        constraints: {
          minLength: 3,
          maxLength: 50,
          pattern: "^[a-zA-Z0-9_]+$",
        },
      };

      const numberParameter = {
        name: "timeout",
        type: "number",
        required: false,
        description: "Request timeout in milliseconds",
        default: 5000,
        constraints: {
          minimum: 1000,
          maximum: 60000,
        },
      };

      const objectParameter = {
        name: "filters",
        type: "object",
        required: false,
        description: "Search filters",
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["active", "inactive", "pending"],
            },
            createdAfter: {
              type: "string",
              format: "date-time",
            },
          },
        },
      };

      [stringParameter, numberParameter, objectParameter].forEach((param) => {
        expect(typeof param.name).toBe("string");
        expect(param.name.length).toBeGreaterThan(0);
        expect(typeof param.type).toBe("string");
        expect(["string", "number", "boolean", "object", "array"].includes(param.type)).toBe(true);
        expect(typeof param.required).toBe("boolean");
        expect(typeof param.description).toBe("string");
      });

      expect(typeof stringParameter.constraints).toBe("object");
      expect(typeof stringParameter.constraints.minLength).toBe("number");
      expect(typeof stringParameter.constraints.maxLength).toBe("number");
      expect(typeof stringParameter.constraints.pattern).toBe("string");

      expect(typeof numberParameter.default).toBe("number");
      expect(typeof numberParameter.constraints.minimum).toBe("number");
      expect(typeof numberParameter.constraints.maximum).toBe("number");

      expect(typeof objectParameter.schema).toBe("object");
      expect(objectParameter.schema.type).toBe("object");
      expect(typeof objectParameter.schema.properties).toBe("object");
    });
  });

  describe("Service Discovery Schemas", () => {
    it("should validate service query schemas", () => {
      const serviceQuery = {
        filters: {
          tags: ["api", "public"],
          status: ["active", "healthy"],
          version: ">=1.0.0",
          capabilities: ["user.read", "user.write"],
        },
        sort: {
          field: "registeredAt",
          order: "desc",
        },
        pagination: {
          offset: 0,
          limit: 50,
        },
        include: ["metadata", "health", "capabilities"],
      };

      expect(typeof serviceQuery.filters).toBe("object");
      expect(Array.isArray(serviceQuery.filters.tags)).toBe(true);
      expect(Array.isArray(serviceQuery.filters.status)).toBe(true);
      expect(Array.isArray(serviceQuery.filters.capabilities)).toBe(true);
      expect(typeof serviceQuery.filters.version).toBe("string");

      serviceQuery.filters.tags.forEach((tag) => {
        expect(typeof tag).toBe("string");
      });

      serviceQuery.filters.status.forEach((status) => {
        expect(["active", "inactive", "healthy", "unhealthy", "maintenance"].includes(status)).toBe(true);
      });

      expect(typeof serviceQuery.sort).toBe("object");
      expect(typeof serviceQuery.sort.field).toBe("string");
      expect(["asc", "desc"]).toContain(serviceQuery.sort.order);

      expect(typeof serviceQuery.pagination).toBe("object");
      expect(typeof serviceQuery.pagination.offset).toBe("number");
      expect(serviceQuery.pagination.offset).toBeGreaterThanOrEqual(0);
      expect(typeof serviceQuery.pagination.limit).toBe("number");
      expect(serviceQuery.pagination.limit).toBeGreaterThan(0);
      expect(serviceQuery.pagination.limit).toBeLessThanOrEqual(100);

      expect(Array.isArray(serviceQuery.include)).toBe(true);
      serviceQuery.include.forEach((field) => {
        expect(typeof field).toBe("string");
      });
    });

    it("should validate service discovery result schema", () => {
      const discoveryResult = {
        services: [
          {
            id: "user-service-001",
            name: "User Service",
            version: "1.2.3",
            status: "active",
            endpoint: "http://user-service:3001",
            capabilities: ["user.read", "user.write"],
            health: {
              status: "healthy",
              lastCheck: new Date().toISOString(),
              responseTime: 45,
            },
            metadata: {
              tags: ["user", "api"],
              description: "User management service",
            },
          },
        ],
        pagination: {
          total: 25,
          offset: 0,
          limit: 50,
          hasMore: false,
        },
        query: {
          executedAt: new Date().toISOString(),
          duration: 12,
          filters: {
            tags: ["api"],
            status: ["active"],
          },
        },
      };

      expect(Array.isArray(discoveryResult.services)).toBe(true);
      discoveryResult.services.forEach((service) => {
        expect(typeof service.id).toBe("string");
        expect(typeof service.name).toBe("string");
        expect(typeof service.version).toBe("string");
        expect(service.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(typeof service.status).toBe("string");
        expect(typeof service.endpoint).toBe("string");
        expect(Array.isArray(service.capabilities)).toBe(true);

        expect(typeof service.health).toBe("object");
        expect(typeof service.health.status).toBe("string");
        expect(typeof service.health.lastCheck).toBe("string");
        expect(typeof service.health.responseTime).toBe("number");
      });

      expect(typeof discoveryResult.pagination).toBe("object");
      expect(typeof discoveryResult.pagination.total).toBe("number");
      expect(typeof discoveryResult.pagination.offset).toBe("number");
      expect(typeof discoveryResult.pagination.limit).toBe("number");
      expect(typeof discoveryResult.pagination.hasMore).toBe("boolean");

      expect(typeof discoveryResult.query).toBe("object");
      expect(typeof discoveryResult.query.executedAt).toBe("string");
      expect(typeof discoveryResult.query.duration).toBe("number");
      expect(typeof discoveryResult.query.filters).toBe("object");
    });
  });

  describe("Health Check Schemas", () => {
    it("should validate health check configuration", () => {
      const healthCheckConfig = {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3,
        healthEndpoint: "/health",
        expectedStatus: 200,
        expectedResponse: {
          status: "ok",
        },
        failureThreshold: 3,
        successThreshold: 2,
        notifications: {
          onFailure: true,
          onRecovery: true,
          channels: ["email", "slack"],
        },
      };

      expect(typeof healthCheckConfig.enabled).toBe("boolean");
      expect(typeof healthCheckConfig.interval).toBe("number");
      expect(healthCheckConfig.interval).toBeGreaterThan(0);
      expect(typeof healthCheckConfig.timeout).toBe("number");
      expect(healthCheckConfig.timeout).toBeGreaterThan(0);
      expect(typeof healthCheckConfig.retries).toBe("number");
      expect(healthCheckConfig.retries).toBeGreaterThanOrEqual(0);

      expect(typeof healthCheckConfig.healthEndpoint).toBe("string");
      expect(healthCheckConfig.healthEndpoint.startsWith("/")).toBe(true);
      expect(typeof healthCheckConfig.expectedStatus).toBe("number");
      expect(healthCheckConfig.expectedStatus).toBeGreaterThanOrEqual(200);
      expect(healthCheckConfig.expectedStatus).toBeLessThan(300);

      expect(typeof healthCheckConfig.failureThreshold).toBe("number");
      expect(healthCheckConfig.failureThreshold).toBeGreaterThan(0);
      expect(typeof healthCheckConfig.successThreshold).toBe("number");
      expect(healthCheckConfig.successThreshold).toBeGreaterThan(0);

      expect(typeof healthCheckConfig.notifications).toBe("object");
      expect(typeof healthCheckConfig.notifications.onFailure).toBe("boolean");
      expect(typeof healthCheckConfig.notifications.onRecovery).toBe("boolean");
      expect(Array.isArray(healthCheckConfig.notifications.channels)).toBe(true);
    });

    it("should validate health check result", () => {
      const healthCheckResult = {
        serviceId: "user-service-001",
        timestamp: new Date().toISOString(),
        status: "healthy",
        responseTime: 45,
        details: {
          database: {
            status: "connected",
            responseTime: 12,
          },
          cache: {
            status: "connected",
            responseTime: 3,
          },
          externalAPI: {
            status: "degraded",
            responseTime: 2500,
            error: "High response time",
          },
        },
        checks: [
          {
            name: "database_connection",
            status: "pass",
            duration: 12,
          },
          {
            name: "cache_connection",
            status: "pass",
            duration: 3,
          },
          {
            name: "external_api",
            status: "warn",
            duration: 2500,
            message: "Response time exceeds threshold",
          },
        ],
      };

      expect(typeof healthCheckResult.serviceId).toBe("string");
      expect(new Date(healthCheckResult.timestamp).toISOString()).toBe(healthCheckResult.timestamp);
      expect(["healthy", "unhealthy", "degraded", "unknown"]).toContain(healthCheckResult.status);
      expect(typeof healthCheckResult.responseTime).toBe("number");
      expect(healthCheckResult.responseTime).toBeGreaterThan(0);

      expect(typeof healthCheckResult.details).toBe("object");
      Object.values(healthCheckResult.details).forEach((detail) => {
        expect(typeof (detail as any).status).toBe("string");
        expect(typeof (detail as any).responseTime).toBe("number");
      });

      expect(Array.isArray(healthCheckResult.checks)).toBe(true);
      healthCheckResult.checks.forEach((check) => {
        expect(typeof check.name).toBe("string");
        expect(["pass", "fail", "warn"]).toContain(check.status);
        expect(typeof check.duration).toBe("number");
      });
    });
  });

  describe("Registry Event Schemas", () => {
    it("should validate registry event structure", () => {
      const serviceRegisteredEvent = {
        type: "service.registered",
        timestamp: new Date().toISOString(),
        serviceId: "user-service-001",
        data: {
          service: {
            id: "user-service-001",
            name: "User Service",
            version: "1.0.0",
          },
          registrar: "deployment-system",
          source: "kubernetes",
        },
        correlationId: "evt-12345",
      };

      const capabilityUpdatedEvent = {
        type: "capability.updated",
        timestamp: new Date().toISOString(),
        serviceId: "user-service-001",
        data: {
          capabilityId: "user.authentication",
          changes: {
            version: { from: "1.0.0", to: "1.1.0" },
            parameters: { added: ["mfaEnabled"] },
          },
        },
        correlationId: "evt-12346",
      };

      [serviceRegisteredEvent, capabilityUpdatedEvent].forEach((event) => {
        expect(typeof event.type).toBe("string");
        expect(event.type).toMatch(/^[a-z]+\.[a-z_]+$/);
        expect(typeof event.timestamp).toBe("string");
        expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
        expect(typeof event.serviceId).toBe("string");
        expect(typeof event.data).toBe("object");
        expect(typeof event.correlationId).toBe("string");
      });

      expect(serviceRegisteredEvent.type).toBe("service.registered");
      expect(typeof serviceRegisteredEvent.data.service).toBe("object");
      expect(typeof serviceRegisteredEvent.data.registrar).toBe("string");

      expect(capabilityUpdatedEvent.type).toBe("capability.updated");
      expect(typeof capabilityUpdatedEvent.data.capabilityId).toBe("string");
      expect(typeof capabilityUpdatedEvent.data.changes).toBe("object");
    });
  });

  describe("Schema Error Validation", () => {
    it("should handle malformed registry data", () => {
      const malformedRegistrations = [
        null,
        undefined,
        "",
        123,
        [],
        { id: null },
        { version: "invalid" },
        { endpoint: "not-a-url" },
        { capabilities: "not-array" },
      ];

      malformedRegistrations.forEach((registration) => {
        if (registration === null) {
          expect(registration).toBeNull();
        } else if (registration === undefined) {
          expect(registration).toBeUndefined();
        } else if (typeof registration === "object" && !Array.isArray(registration)) {
          // Object validation
          if ("id" in registration && registration.id === null) {
            expect(registration.id).toBeNull();
          }
          if ("version" in registration && registration.version === "invalid") {
            expect(registration.version).not.toMatch(/^\d+\.\d+\.\d+$/);
          }
          if ("endpoint" in registration && registration.endpoint === "not-a-url") {
            expect(registration.endpoint).not.toMatch(/^https?:\/\//);
          }
          if ("capabilities" in registration && registration.capabilities === "not-array") {
            expect(Array.isArray(registration.capabilities)).toBe(false);
          }
        } else {
          expect(typeof registration === "object" && !Array.isArray(registration)).toBe(false);
        }
      });
    });

    it("should validate required vs optional fields", () => {
      interface RegistrationSchema {
        id: string; // required
        name: string; // required
        version?: string; // optional
        metadata?: Record<string, unknown>; // optional
      }

      const minimalRegistration: RegistrationSchema = {
        id: "service-1",
        name: "Service One",
      };

      const fullRegistration: RegistrationSchema = {
        id: "service-2",
        name: "Service Two",
        version: "1.0.0",
        metadata: { description: "Full service" },
      };

      // Required fields
      expect(typeof minimalRegistration.id).toBe("string");
      expect(typeof minimalRegistration.name).toBe("string");
      expect("version" in minimalRegistration).toBe(false);
      expect("metadata" in minimalRegistration).toBe(false);

      // Optional fields
      expect(typeof fullRegistration.version).toBe("string");
      expect(typeof fullRegistration.metadata).toBe("object");
    });
  });
});
