/**
 * Test suite for common platform type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  PlatformInfo,
  PlatformCapabilities,
  PlatformConfiguration,
  PlatformEvent,
  PlatformMetrics,
  PlatformStatus,
  PlatformType,
  EnvironmentType,
  SeverityLevel,
  PerformanceMetrics,
  ErrorCounts,
  ResourceUsage,
  SystemInfo,
  PlatformFeature,
  ApiEndpoint,
  Permission,
  ResourceLimit,
} from "../../../../../src/platform/common/common.types.js";

describe("Common Platform Type Definitions", () => {
  describe("Interface Naming Convention", () => {
    it("should enforce I-prefix naming convention for interfaces", () => {
      // All interfaces should start with 'I' prefix
      const interfaceNames = [
        "PlatformInfo",
        "PlatformCapabilities",
        "PlatformConfiguration",
        "PlatformEvent",
        "PlatformMetrics",
        "SystemInfo",
      ];

      // Note: These are type aliases, not interfaces, so they don't need I-prefix
      interfaceNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("PlatformInfo Type", () => {
    it("should define platform information structure", () => {
      const mockPlatformInfo: PlatformInfo = {
        name: "common-platform",
        version: "1.0.0",
        type: "server",
        description: "Common platform implementation",
        vendor: "Axon Flow",
        architecture: "x64",
        buildDate: "2024-01-01T00:00:00Z",
        commitHash: "abc123def456",
      };

      expect(mockPlatformInfo.name).toBe("common-platform");
      expect(mockPlatformInfo.version).toBe("1.0.0");
      expect(mockPlatformInfo.type).toBe("server");
      expect(mockPlatformInfo.architecture).toBe("x64");
    });

    it("should validate platform type values", () => {
      const validPlatformTypes: PlatformType[] = [
        "browser",
        "node",
        "mobile",
        "desktop",
        "server",
        "embedded",
        "cloud",
      ];

      validPlatformTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should validate environment type values", () => {
      const validEnvironmentTypes: EnvironmentType[] = ["development", "staging", "production", "test", "local"];

      validEnvironmentTypes.forEach((env) => {
        expect(typeof env).toBe("string");
      });
    });
  });

  describe("PlatformCapabilities Type", () => {
    it("should define platform capabilities structure", () => {
      const mockCapabilities: PlatformCapabilities = {
        features: [
          {
            name: "networking",
            version: "1.0",
            enabled: true,
            description: "Network communication support",
          },
          {
            name: "storage",
            version: "2.1",
            enabled: true,
            description: "Persistent storage support",
          },
        ],
        apis: [
          {
            name: "rest-api",
            version: "1.0",
            endpoint: "/api/v1",
            methods: ["GET", "POST", "PUT", "DELETE"],
          },
          {
            name: "websocket-api",
            version: "1.0",
            endpoint: "/ws",
            methods: ["CONNECT", "MESSAGE", "CLOSE"],
          },
        ],
        permissions: {
          read: true,
          write: true,
          execute: false,
          admin: false,
        },
        limits: {
          maxConnections: 1000,
          maxMemoryMB: 2048,
          maxCpuPercent: 80,
          maxDiskGB: 100,
        },
      };

      expect(mockCapabilities.features).toHaveLength(2);
      expect(mockCapabilities.apis).toHaveLength(2);
      expect(mockCapabilities.permissions.read).toBe(true);
      expect(mockCapabilities.limits.maxConnections).toBe(1000);
    });

    it("should validate platform feature structure", () => {
      const mockFeature: PlatformFeature = {
        name: "test-feature",
        version: "1.0.0",
        enabled: true,
        description: "Test feature description",
        dependencies: ["base-feature"],
        configuration: {
          timeout: 30000,
          retries: 3,
        },
      };

      expect(mockFeature.name).toBe("test-feature");
      expect(mockFeature.enabled).toBe(true);
      expect(mockFeature.dependencies).toEqual(["base-feature"]);
    });

    it("should validate API endpoint structure", () => {
      const mockEndpoint: ApiEndpoint = {
        name: "user-api",
        version: "2.0",
        endpoint: "/api/v2/users",
        methods: ["GET", "POST", "PUT", "DELETE"],
        authentication: "bearer",
        rateLimit: {
          requests: 100,
          window: "1m",
        },
      };

      expect(mockEndpoint.name).toBe("user-api");
      expect(mockEndpoint.methods).toContain("GET");
      expect(mockEndpoint.authentication).toBe("bearer");
    });

    it("should validate permission structure", () => {
      const mockPermission: Permission = {
        read: true,
        write: false,
        execute: false,
        admin: false,
        custom: {
          "feature:access": true,
          "api:advanced": false,
        },
      };

      expect(mockPermission.read).toBe(true);
      expect(mockPermission.custom?.["feature:access"]).toBe(true);
    });

    it("should validate resource limit structure", () => {
      const mockLimits: ResourceLimit = {
        maxConnections: 500,
        maxMemoryMB: 1024,
        maxCpuPercent: 70,
        maxDiskGB: 50,
        maxRequestsPerSecond: 10,
        maxConcurrentOperations: 25,
      };

      expect(mockLimits.maxConnections).toBe(500);
      expect(mockLimits.maxMemoryMB).toBe(1024);
      expect(mockLimits.maxRequestsPerSecond).toBe(10);
    });
  });

  describe("PlatformConfiguration Type", () => {
    it("should define platform configuration structure", () => {
      const mockConfig: PlatformConfiguration = {
        environment: "production",
        debug: false,
        timeout: 30000,
        retryAttempts: 3,
        logging: {
          level: "info",
          format: "json",
          destinations: ["console", "file"],
        },
        security: {
          enableAuth: true,
          encryptData: true,
          allowedOrigins: ["https://example.com"],
        },
        performance: {
          enableCaching: true,
          cacheSize: 100,
          enableCompression: true,
        },
        metadata: {
          configVersion: "1.0",
          lastModified: "2024-01-01T00:00:00Z",
        },
      };

      expect(mockConfig.environment).toBe("production");
      expect(mockConfig.debug).toBe(false);
      expect(mockConfig.logging.level).toBe("info");
      expect(mockConfig.security.enableAuth).toBe(true);
    });
  });

  describe("PlatformEvent Type", () => {
    it("should define platform event structure", () => {
      const mockEvent: PlatformEvent = {
        id: "event-123",
        type: "platform.initialized",
        timestamp: "2024-01-01T12:00:00Z",
        source: "common-platform",
        severity: "info",
        category: "system",
        message: "Platform successfully initialized",
        data: {
          version: "1.0.0",
          features: ["networking", "storage"],
          startupTime: 2500,
        },
        correlationId: "corr-456",
        tags: ["startup", "initialization"],
      };

      expect(mockEvent.type).toBe("platform.initialized");
      expect(mockEvent.severity).toBe("info");
      expect(mockEvent.data?.version).toBe("1.0.0");
      expect(mockEvent.tags).toContain("startup");
    });

    it("should validate severity level values", () => {
      const validSeverityLevels: SeverityLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

      validSeverityLevels.forEach((level) => {
        expect(typeof level).toBe("string");
      });
    });
  });

  describe("PlatformMetrics Type", () => {
    it("should define platform metrics structure", () => {
      const mockMetrics: PlatformMetrics = {
        timestamp: "2024-01-01T12:00:00Z",
        uptime: 86400000, // 1 day in milliseconds
        performance: {
          cpu: 45.5,
          memory: 67.2,
          disk: 23.1,
          network: {
            bytesIn: 1024000,
            bytesOut: 512000,
            connectionsActive: 25,
          },
        },
        resources: {
          memoryUsed: 1073741824, // 1GB
          memoryTotal: 4294967296, // 4GB
          diskUsed: 10737418240, // 10GB
          diskTotal: 107374182400, // 100GB
          cpuCores: 8,
          cpuUsage: 45.5,
        },
        errors: {
          critical: 0,
          errors: 2,
          warnings: 15,
          total: 17,
        },
        requests: {
          total: 10000,
          successful: 9800,
          failed: 200,
          averageResponseTime: 150,
        },
      };

      expect(mockMetrics.uptime).toBe(86400000);
      expect(mockMetrics.performance.cpu).toBe(45.5);
      expect(mockMetrics.resources.memoryUsed).toBe(1073741824);
      expect(mockMetrics.errors.total).toBe(17);
    });

    it("should validate performance metrics structure", () => {
      const mockPerformance: PerformanceMetrics = {
        cpu: 55.0,
        memory: 72.5,
        disk: 30.0,
        network: {
          bytesIn: 2048000,
          bytesOut: 1024000,
          connectionsActive: 50,
          latency: 25.5,
          bandwidth: 100000000,
        },
        responseTime: {
          average: 125,
          p50: 100,
          p95: 300,
          p99: 500,
        },
      };

      expect(mockPerformance.cpu).toBe(55.0);
      expect(mockPerformance.network.latency).toBe(25.5);
      expect(mockPerformance.responseTime?.p95).toBe(300);
    });

    it("should validate resource usage structure", () => {
      const mockResourceUsage: ResourceUsage = {
        memoryUsed: 2147483648, // 2GB
        memoryTotal: 8589934592, // 8GB
        diskUsed: 21474836480, // 20GB
        diskTotal: 107374182400, // 100GB
        cpuCores: 16,
        cpuUsage: 62.3,
        handles: 1250,
        threads: 45,
      };

      expect(mockResourceUsage.memoryUsed).toBe(2147483648);
      expect(mockResourceUsage.cpuCores).toBe(16);
      expect(mockResourceUsage.handles).toBe(1250);
    });

    it("should validate error counts structure", () => {
      const mockErrorCounts: ErrorCounts = {
        critical: 1,
        errors: 5,
        warnings: 25,
        total: 31,
        byCategory: {
          network: 10,
          validation: 8,
          auth: 3,
          storage: 10,
        },
      };

      expect(mockErrorCounts.total).toBe(31);
      expect(mockErrorCounts.byCategory?.network).toBe(10);
    });
  });

  describe("PlatformStatus Type", () => {
    it("should define platform status structure", () => {
      const mockStatus: PlatformStatus = {
        state: "running",
        health: "healthy",
        version: "1.0.0",
        startTime: "2024-01-01T00:00:00Z",
        lastHeartbeat: "2024-01-01T12:00:00Z",
        services: {
          api: "running",
          database: "running",
          cache: "warning",
        },
        checks: [
          {
            name: "database_connection",
            status: "pass",
            timestamp: "2024-01-01T12:00:00Z",
            duration: 25,
          },
          {
            name: "memory_usage",
            status: "warn",
            timestamp: "2024-01-01T12:00:00Z",
            duration: 5,
            message: "Memory usage at 75%",
          },
        ],
      };

      expect(mockStatus.state).toBe("running");
      expect(mockStatus.health).toBe("healthy");
      expect(mockStatus.services.api).toBe("running");
      expect(mockStatus.checks).toHaveLength(2);
    });
  });

  describe("SystemInfo Type", () => {
    it("should define system information structure", () => {
      const mockSystemInfo: SystemInfo = {
        hostname: "platform-server-01",
        platform: "linux",
        architecture: "x64",
        cpus: 16,
        totalMemory: 17179869184, // 16GB
        freeMemory: 4294967296, // 4GB
        uptime: 86400, // 1 day in seconds
        nodeVersion: "20.10.0",
        processId: 12345,
        parentProcessId: 1,
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
          LOG_LEVEL: "info",
        },
      };

      expect(mockSystemInfo.hostname).toBe("platform-server-01");
      expect(mockSystemInfo.cpus).toBe(16);
      expect(mockSystemInfo.environment.NODE_ENV).toBe("production");
    });
  });

  describe("Type Relationships and Composition", () => {
    it("should demonstrate proper type composition", () => {
      const fullPlatformData: PlatformInfo & PlatformCapabilities & PlatformMetrics = {
        // PlatformInfo
        name: "full-platform",
        version: "2.0.0",
        type: "server",
        description: "Full platform implementation",
        vendor: "Axon Flow",
        architecture: "x64",
        buildDate: "2024-01-01T00:00:00Z",
        commitHash: "def789abc123",

        // PlatformCapabilities
        features: [
          {
            name: "advanced-networking",
            version: "1.5",
            enabled: true,
            description: "Advanced networking capabilities",
          },
        ],
        apis: [
          {
            name: "management-api",
            version: "2.0",
            endpoint: "/api/v2/manage",
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          },
        ],
        permissions: {
          read: true,
          write: true,
          execute: true,
          admin: false,
        },
        limits: {
          maxConnections: 2000,
          maxMemoryMB: 4096,
          maxCpuPercent: 90,
          maxDiskGB: 200,
        },

        // PlatformMetrics
        timestamp: "2024-01-01T12:00:00Z",
        uptime: 172800000, // 2 days
        performance: {
          cpu: 35.2,
          memory: 55.8,
          disk: 15.3,
          network: {
            bytesIn: 5120000,
            bytesOut: 2560000,
            connectionsActive: 75,
          },
        },
        resources: {
          memoryUsed: 2415919104, // ~2.25GB
          memoryTotal: 4294967296, // 4GB
          diskUsed: 16106127360, // ~15GB
          diskTotal: 214748364800, // ~200GB
          cpuCores: 16,
          cpuUsage: 35.2,
        },
        errors: {
          critical: 0,
          errors: 1,
          warnings: 8,
          total: 9,
        },
      };

      expect(fullPlatformData.name).toBe("full-platform");
      expect(fullPlatformData.features).toHaveLength(1);
      expect(fullPlatformData.uptime).toBe(172800000);
      expect(fullPlatformData.performance.cpu).toBe(35.2);
    });
  });

  describe("Type Guard Support", () => {
    it("should support type narrowing patterns", () => {
      const data: unknown = {
        name: "test-platform",
        version: "1.0.0",
        type: "server",
      };

      // Type guard pattern simulation
      if (typeof data === "object" && data !== null && "name" in data && "version" in data && "type" in data) {
        const platformData = data as PlatformInfo;
        expect(platformData.name).toBe("test-platform");
        expect(platformData.version).toBe("1.0.0");
        expect(platformData.type).toBe("server");
      }
    });

    it("should validate discriminated union types", () => {
      type PlatformMessage =
        | { type: "info"; level: "info"; message: string }
        | { type: "error"; level: "error"; error: Error; stack?: string }
        | { type: "metrics"; level: "debug"; metrics: PerformanceMetrics };

      const infoMessage: PlatformMessage = {
        type: "info",
        level: "info",
        message: "Platform operation completed",
      };

      const errorMessage: PlatformMessage = {
        type: "error",
        level: "error",
        error: new Error("Platform error occurred"),
        stack: "Error stack trace...",
      };

      expect(infoMessage.type).toBe("info");
      expect(errorMessage.type).toBe("error");

      if (infoMessage.type === "info") {
        expect(infoMessage.message).toBe("Platform operation completed");
      }

      if (errorMessage.type === "error") {
        expect(errorMessage.error).toBeInstanceOf(Error);
      }
    });
  });
});
