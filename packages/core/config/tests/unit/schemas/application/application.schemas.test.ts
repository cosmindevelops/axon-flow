/**
 * Application Configuration Schema Tests
 * Comprehensive validation tests for service, auth, and application configurations
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  SERVICE_CONFIG_SCHEMA,
  AUTH_CONFIG_SCHEMA,
  APPLICATION_CONFIG_SCHEMA,
} from "../../../../src/schemas/application/application.schemas.js";

describe("Application Configuration Schemas", () => {
  describe("SERVICE_CONFIG_SCHEMA", () => {
    it("should validate minimal service config", () => {
      const config = {
        name: "test-service",
        environment: "development" as const,
      };
      const result = SERVICE_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject({
        name: "test-service",
        version: "1.0.0",
        environment: "development",
        port: 3000,
        host: "localhost",
      });
    });

    it("should validate complete service config", () => {
      const config = {
        name: "api-service",
        version: "2.1.0",
        environment: "production" as const,
        port: 8080,
        host: "0.0.0.0",
        baseUrl: "https://api.example.com",
        cors: {
          enabled: true,
          origins: ["https://app.example.com", "https://admin.example.com"],
          credentials: true,
        },
        logging: {
          level: "error" as const,
          pretty: false,
        },
      };
      const result = SERVICE_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject(config);
      expect(result.cors?.origins).toHaveLength(2);
    });

    it("should handle wildcard CORS origins", () => {
      const config = {
        name: "dev-service",
        environment: "development" as const,
        cors: {
          origins: "*" as const,
        },
      };
      const result = SERVICE_CONFIG_SCHEMA.parse(config);
      expect(result.cors?.origins).toBe("*");
    });

    it("should require service name", () => {
      const config = {
        environment: "test" as const,
      };
      expect(() => SERVICE_CONFIG_SCHEMA.parse(config)).toThrow();
    });

    it("should validate port range", () => {
      const invalidPorts = [0, 65536, -1];
      invalidPorts.forEach((port) => {
        const config = {
          name: "test",
          environment: "test" as const,
          port,
        };
        expect(() => SERVICE_CONFIG_SCHEMA.parse(config)).toThrow();
      });
    });

    it("should validate baseUrl format", () => {
      const config = {
        name: "test",
        environment: "test" as const,
        baseUrl: "not-a-url",
      };
      expect(() => SERVICE_CONFIG_SCHEMA.parse(config)).toThrow();
    });

    it("should validate logging levels", () => {
      const validLevels = ["error", "warn", "info", "debug"];
      validLevels.forEach((level) => {
        const config = {
          name: "test",
          environment: "test" as const,
          logging: { level: level as any },
        };
        const result = SERVICE_CONFIG_SCHEMA.parse(config);
        expect(result.logging.level).toBe(level);
      });
    });
  });

  describe("AUTH_CONFIG_SCHEMA", () => {
    it("should validate minimal JWT config", () => {
      const config = {
        jwt: {
          secret: "a-very-long-secret-key-that-is-at-least-32-characters-long",
        },
      };
      const result = AUTH_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject({
        jwt: {
          secret: config.jwt.secret,
          algorithm: "HS256",
          expiresIn: "15m",
        },
        bcryptRounds: 10,
      });
    });

    it("should validate complete auth config with session", () => {
      const config = {
        jwt: {
          secret: "jwt-secret-key-that-is-long-enough-for-security-requirements",
          algorithm: "HS512" as const,
          expiresIn: "1h",
        },
        session: {
          secret: "session-secret-key-also-very-long-for-security",
          maxAge: 3600000, // 1 hour
        },
        bcryptRounds: 12,
      };
      const result = AUTH_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject(config);
    });

    it("should reject short JWT secrets", () => {
      const config = {
        jwt: {
          secret: "too-short", // Less than 32 characters
        },
      };
      expect(() => AUTH_CONFIG_SCHEMA.parse(config)).toThrow();
    });

    it("should reject short session secrets", () => {
      const config = {
        jwt: {
          secret: "jwt-secret-key-that-is-long-enough-for-security-requirements",
        },
        session: {
          secret: "short", // Less than 32 characters
        },
      };
      expect(() => AUTH_CONFIG_SCHEMA.parse(config)).toThrow();
    });

    it("should validate JWT algorithms", () => {
      const validAlgorithms = ["HS256", "HS384", "HS512"];
      validAlgorithms.forEach((algorithm) => {
        const config = {
          jwt: {
            secret: "a-very-long-secret-key-that-is-at-least-32-characters-long",
            algorithm: algorithm as any,
          },
        };
        const result = AUTH_CONFIG_SCHEMA.parse(config);
        expect(result.jwt.algorithm).toBe(algorithm);
      });
    });

    it("should validate bcrypt rounds range", () => {
      const validRounds = [4, 10, 31];
      const invalidRounds = [3, 32];

      validRounds.forEach((rounds) => {
        const config = {
          jwt: {
            secret: "a-very-long-secret-key-that-is-at-least-32-characters-long",
          },
          bcryptRounds: rounds,
        };
        const result = AUTH_CONFIG_SCHEMA.parse(config);
        expect(result.bcryptRounds).toBe(rounds);
      });

      invalidRounds.forEach((rounds) => {
        const config = {
          jwt: {
            secret: "a-very-long-secret-key-that-is-at-least-32-characters-long",
          },
          bcryptRounds: rounds,
        };
        expect(() => AUTH_CONFIG_SCHEMA.parse(config)).toThrow();
      });
    });
  });

  describe("APPLICATION_CONFIG_SCHEMA", () => {
    it("should validate minimal application config", () => {
      const config = {
        service: {
          name: "app",
          environment: "development" as const,
        },
      };
      const result = APPLICATION_CONFIG_SCHEMA.parse(config);
      expect(result.service.name).toBe("app");
      expect(result.auth).toBeUndefined();
      expect(result.database).toBeUndefined();
    });

    it("should validate complete application config", () => {
      const config = {
        service: {
          name: "full-app",
          version: "3.0.0",
          environment: "production" as const,
          port: 9000,
        },
        auth: {
          jwt: {
            secret: "application-jwt-secret-key-that-meets-minimum-length-requirements",
            algorithm: "HS384" as const,
          },
          bcryptRounds: 14,
        },
        database: {
          host: "db.example.com",
          port: 5432,
          database: "app_production",
          username: "app_user",
          password: "secure-db-password",
          ssl: true,
        },
        redis: {
          host: "redis.example.com",
          port: 6380,
          password: "redis-password",
          database: 1,
        },
      };
      const result = APPLICATION_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject(config);
    });

    it("should validate application with only database", () => {
      const config = {
        service: {
          name: "db-app",
          environment: "staging" as const,
        },
        database: {
          database: "staging_db",
          username: "staging_user",
          password: "staging-password",
        },
      };
      const result = APPLICATION_CONFIG_SCHEMA.parse(config);
      expect(result.database).toBeDefined();
      expect(result.database?.host).toBe("localhost"); // Default
      expect(result.redis).toBeUndefined();
    });

    it("should validate application with only Redis", () => {
      const config = {
        service: {
          name: "cache-app",
          environment: "test" as const,
        },
        redis: {
          host: "test-redis",
        },
      };
      const result = APPLICATION_CONFIG_SCHEMA.parse(config);
      expect(result.redis).toBeDefined();
      expect(result.redis?.port).toBe(6379); // Default
      expect(result.database).toBeUndefined();
    });

    it("should require database name and credentials when database config present", () => {
      const config = {
        service: {
          name: "test-app",
          environment: "test" as const,
        },
        database: {
          host: "localhost",
          // Missing database, username, password
        },
      };
      expect(() => APPLICATION_CONFIG_SCHEMA.parse(config)).toThrow();
    });
  });

  describe("Performance and Error Handling", () => {
    it("should validate application config efficiently", () => {
      const config = {
        service: {
          name: "perf-test",
          environment: "production" as const,
        },
        auth: {
          jwt: {
            secret: "performance-test-secret-key-that-is-sufficiently-long",
          },
        },
      };

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        APPLICATION_CONFIG_SCHEMA.parse(config);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // Should average much less than 1ms per validation
    });

    it("should provide detailed error messages for invalid application config", () => {
      const invalidConfig = {
        service: {
          name: "", // Invalid: empty name
          environment: "invalid", // Invalid: not in enum
          port: 99999, // Invalid: port out of range
        },
        auth: {
          jwt: {
            secret: "short", // Invalid: too short
            algorithm: "invalid", // Invalid: not in enum
          },
          bcryptRounds: 50, // Invalid: out of range
        },
        database: {
          // Missing required fields
          port: "not-a-number",
        },
      };

      try {
        APPLICATION_CONFIG_SCHEMA.parse(invalidConfig);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        expect(zodError.issues.length).toBeGreaterThan(0);

        // Check that error includes field paths
        const paths = zodError.issues.map((issue) => issue.path.join("."));
        expect(paths.some((path) => path.includes("service"))).toBe(true);
        expect(paths.some((path) => path.includes("auth"))).toBe(true);
      }
    });
  });
});
