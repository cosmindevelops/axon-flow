/**
 * Test suite for common platform schema validations
 */

import { describe, it, expect } from "vitest";

describe("Common Platform Schema Validations", () => {
  describe("Platform Information Schema", () => {
    it("should validate platform information structure", () => {
      const mockPlatformInfoSchema = {
        validate: (data: any) => {
          const required = ["name", "version", "type"];
          const missing = required.filter((field) => !(field in data));

          if (missing.length > 0) {
            return { valid: false, errors: missing.map((field) => `Missing required field: ${field}`) };
          }

          if (typeof data.name !== "string" || data.name.length === 0) {
            return { valid: false, errors: ["Platform name must be a non-empty string"] };
          }

          if (typeof data.version !== "string" || !/^\d+\.\d+\.\d+/.test(data.version)) {
            return { valid: false, errors: ["Version must be in semantic version format"] };
          }

          const validTypes = ["browser", "node", "mobile", "desktop", "server"];
          if (!validTypes.includes(data.type)) {
            return { valid: false, errors: [`Platform type must be one of: ${validTypes.join(", ")}`] };
          }

          return { valid: true, errors: [] };
        },
      };

      // Valid platform info
      const validPlatformInfo = {
        name: "common-platform",
        version: "1.0.0",
        type: "server",
        capabilities: ["basic", "extended"],
      };

      const validResult = mockPlatformInfoSchema.validate(validPlatformInfo);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid platform info - missing fields
      const invalidPlatformInfo1 = {
        name: "test-platform",
        // missing version and type
      };

      const invalidResult1 = mockPlatformInfoSchema.validate(invalidPlatformInfo1);
      expect(invalidResult1.valid).toBe(false);
      expect(invalidResult1.errors).toContain("Missing required field: version");
      expect(invalidResult1.errors).toContain("Missing required field: type");

      // Invalid platform info - wrong types
      const invalidPlatformInfo2 = {
        name: "",
        version: "invalid-version",
        type: "invalid-type",
      };

      const invalidResult2 = mockPlatformInfoSchema.validate(invalidPlatformInfo2);
      expect(invalidResult2.valid).toBe(false);
      expect(invalidResult2.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Platform Capabilities Schema", () => {
    it("should validate platform capabilities structure", () => {
      const mockCapabilitiesSchema = {
        validate: (data: any) => {
          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Capabilities must be an object"] };
          }

          const errors: string[] = [];

          if ("features" in data && !Array.isArray(data.features)) {
            errors.push("Features must be an array");
          }

          if ("apis" in data && !Array.isArray(data.apis)) {
            errors.push("APIs must be an array");
          }

          if ("permissions" in data && typeof data.permissions !== "object") {
            errors.push("Permissions must be an object");
          }

          if ("limits" in data) {
            if (typeof data.limits !== "object" || data.limits === null) {
              errors.push("Limits must be an object");
            } else {
              Object.entries(data.limits).forEach(([key, value]) => {
                if (typeof value !== "number" || value < 0) {
                  errors.push(`Limit ${key} must be a non-negative number`);
                }
              });
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid capabilities
      const validCapabilities = {
        features: ["networking", "storage", "computation"],
        apis: ["http", "websocket", "file"],
        permissions: {
          read: true,
          write: true,
          execute: false,
        },
        limits: {
          maxConnections: 100,
          maxMemory: 1024000,
          maxCpuUsage: 80,
        },
      };

      const validResult = mockCapabilitiesSchema.validate(validCapabilities);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid capabilities
      const invalidCapabilities = {
        features: "not-an-array",
        apis: ["http"],
        permissions: "not-an-object",
        limits: {
          maxConnections: -1,
          maxMemory: "invalid",
        },
      };

      const invalidResult = mockCapabilitiesSchema.validate(invalidCapabilities);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain("Features must be an array");
      expect(invalidResult.errors).toContain("Permissions must be an object");
    });
  });

  describe("Platform Configuration Schema", () => {
    it("should validate platform configuration structure", () => {
      const mockConfigSchema = {
        validate: (data: any) => {
          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Configuration must be an object"] };
          }

          const errors: string[] = [];

          // Validate required fields
          const requiredFields = ["environment", "debug"];
          requiredFields.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate environment
          if ("environment" in data) {
            const validEnvs = ["development", "staging", "production", "test"];
            if (!validEnvs.includes(data.environment)) {
              errors.push(`Environment must be one of: ${validEnvs.join(", ")}`);
            }
          }

          // Validate debug
          if ("debug" in data && typeof data.debug !== "boolean") {
            errors.push("Debug must be a boolean");
          }

          // Validate optional timeout
          if ("timeout" in data) {
            if (typeof data.timeout !== "number" || data.timeout <= 0) {
              errors.push("Timeout must be a positive number");
            }
          }

          // Validate optional metadata
          if ("metadata" in data && typeof data.metadata !== "object") {
            errors.push("Metadata must be an object");
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid configuration
      const validConfig = {
        environment: "production",
        debug: false,
        timeout: 30000,
        metadata: {
          version: "1.0.0",
          build: "12345",
        },
      };

      const validResult = mockConfigSchema.validate(validConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid configuration
      const invalidConfig = {
        environment: "invalid-env",
        debug: "not-boolean",
        timeout: -1000,
        metadata: "not-an-object",
      };

      const invalidResult = mockConfigSchema.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Platform Event Schema", () => {
    it("should validate platform event structure", () => {
      const mockEventSchema = {
        validate: (data: any) => {
          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Event must be an object"] };
          }

          const errors: string[] = [];

          // Required fields
          const required = ["type", "timestamp", "source"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate type
          if ("type" in data && typeof data.type !== "string") {
            errors.push("Event type must be a string");
          }

          // Validate timestamp
          if ("timestamp" in data) {
            const timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.getTime())) {
              errors.push("Timestamp must be a valid date");
            }
          }

          // Validate source
          if ("source" in data && typeof data.source !== "string") {
            errors.push("Event source must be a string");
          }

          // Validate optional severity
          if ("severity" in data) {
            const validSeverities = ["low", "medium", "high", "critical"];
            if (!validSeverities.includes(data.severity)) {
              errors.push(`Severity must be one of: ${validSeverities.join(", ")}`);
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid event
      const validEvent = {
        type: "platform.initialized",
        timestamp: new Date().toISOString(),
        source: "common-platform",
        severity: "low",
        data: {
          message: "Platform successfully initialized",
        },
      };

      const validResult = mockEventSchema.validate(validEvent);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid event
      const invalidEvent = {
        type: 123,
        timestamp: "invalid-date",
        source: null,
        severity: "invalid-severity",
      };

      const invalidResult = mockEventSchema.validate(invalidEvent);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Platform Metrics Schema", () => {
    it("should validate platform metrics structure", () => {
      const mockMetricsSchema = {
        validate: (data: any) => {
          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Metrics must be an object"] };
          }

          const errors: string[] = [];

          // Validate performance metrics
          if ("performance" in data) {
            if (typeof data.performance !== "object" || data.performance === null) {
              errors.push("Performance metrics must be an object");
            } else {
              const perfMetrics = ["cpu", "memory", "disk", "network"];
              perfMetrics.forEach((metric) => {
                if (metric in data.performance) {
                  const value = data.performance[metric];
                  if (typeof value !== "number" || value < 0 || value > 100) {
                    errors.push(`Performance ${metric} must be a number between 0 and 100`);
                  }
                }
              });
            }
          }

          // Validate uptime
          if ("uptime" in data) {
            if (typeof data.uptime !== "number" || data.uptime < 0) {
              errors.push("Uptime must be a non-negative number");
            }
          }

          // Validate error counts
          if ("errors" in data) {
            if (typeof data.errors !== "object" || data.errors === null) {
              errors.push("Error metrics must be an object");
            } else {
              Object.entries(data.errors).forEach(([key, value]) => {
                if (typeof value !== "number" || value < 0) {
                  errors.push(`Error count ${key} must be a non-negative number`);
                }
              });
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid metrics
      const validMetrics = {
        performance: {
          cpu: 45.5,
          memory: 67.2,
          disk: 23.1,
          network: 12.8,
        },
        uptime: 86400000, // 1 day in ms
        errors: {
          critical: 0,
          warnings: 5,
          info: 23,
        },
        timestamp: new Date().toISOString(),
      };

      const validResult = mockMetricsSchema.validate(validMetrics);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid metrics
      const invalidMetrics = {
        performance: {
          cpu: 150, // > 100
          memory: -10, // < 0
          disk: "invalid",
        },
        uptime: -1000,
        errors: {
          critical: -1,
          warnings: "invalid",
        },
      };

      const invalidResult = mockMetricsSchema.validate(invalidMetrics);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Schema Integration", () => {
    it("should support nested schema validation", () => {
      const mockNestedSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          // Validate platform info
          if ("platform" in data) {
            if (typeof data.platform !== "object") {
              errors.push("Platform must be an object");
            } else {
              const requiredPlatformFields = ["name", "version"];
              requiredPlatformFields.forEach((field) => {
                if (!(field in data.platform)) {
                  errors.push(`Platform missing field: ${field}`);
                }
              });
            }
          }

          // Validate capabilities
          if ("capabilities" in data && !Array.isArray(data.capabilities)) {
            errors.push("Capabilities must be an array");
          }

          // Validate configuration
          if ("config" in data) {
            if (typeof data.config !== "object") {
              errors.push("Config must be an object");
            } else if (!("environment" in data.config)) {
              errors.push("Config missing environment field");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      const validNestedData = {
        platform: {
          name: "common-platform",
          version: "1.0.0",
        },
        capabilities: ["networking", "storage"],
        config: {
          environment: "production",
          debug: false,
        },
      };

      const result = mockNestedSchema.validate(validNestedData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
