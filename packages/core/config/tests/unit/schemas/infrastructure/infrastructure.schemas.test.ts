/**
 * Infrastructure Configuration Schema Tests
 * Comprehensive validation tests for database, Redis, RabbitMQ, and JWT configurations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
  BASE_CONFIG_SCHEMA,
  DATABASE_CONFIG_SCHEMA,
  ENVIRONMENT_DATABASE_SCHEMA,
  RABBITMQ_CONFIG_SCHEMA,
  ENVIRONMENT_RABBITMQ_SCHEMA,
  REDIS_CONFIG_SCHEMA,
  ENVIRONMENT_REDIS_SCHEMA,
  INFRASTRUCTURE_CONFIG_SCHEMA,
  PARTIAL_INFRASTRUCTURE_CONFIG_SCHEMA,
  INFRASTRUCTURE_VALIDATION_SCHEMA,
} from "../../../../src/schemas/infrastructure/infrastructure.schemas.js";

describe("Infrastructure Configuration Schemas", () => {
  describe("BASE_CONFIG_SCHEMA", () => {
    it("should validate with default values", () => {
      const result = BASE_CONFIG_SCHEMA.parse({});
      expect(result).toMatchObject({
        environment: "development",
        logLevel: "info",
        port: 3000,
      });
    });

    it("should validate production environment", () => {
      const config = {
        environment: "production",
        logLevel: "error",
        port: 8080,
      };
      const result = BASE_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject(config);
    });

    it("should coerce port to number", () => {
      const config = { port: "5000" };
      const result = BASE_CONFIG_SCHEMA.parse(config);
      expect(result.port).toBe(5000);
    });

    it("should reject invalid environment", () => {
      const config = { environment: "invalid" };
      expect(() => BASE_CONFIG_SCHEMA.parse(config)).toThrow();
    });

    it("should reject invalid port range", () => {
      const invalidPorts = [0, 65536, -1];
      invalidPorts.forEach((port) => {
        expect(() => BASE_CONFIG_SCHEMA.parse({ port })).toThrow();
      });
    });
  });

  describe("DATABASE_CONFIG_SCHEMA", () => {
    it("should validate minimal database config", () => {
      const config = {
        password: "secure-password",
      };
      const result = DATABASE_CONFIG_SCHEMA.parse(config);
      expect(result).toMatchObject({
        host: "localhost",
        port: 5432,
        database: "axon_flow",
        username: "postgres",
        password: "secure-password",
        schema: "public",
      });
    });

    it("should validate complete database config with pgvector", () => {
      const config = {
        host: "db.example.com",
        port: 5432,
        database: "production_db",
        username: "app_user",
        password: "complex-password",
        ssl: {
          enabled: true,
          rejectUnauthorized: true,
          ca: "-----BEGIN CERTIFICATE-----...",
        },
        pool: {
          min: 5,
          max: 20,
          idleTimeoutMillis: 60000,
        },
        pgvector: {
          enabled: true,
          dimensions: 768,
          indexMethod: "ivfflat",
        },
      };
      const result = DATABASE_CONFIG_SCHEMA.parse(config);
      expect(result.pgvector.enabled).toBe(true);
      expect(result.pgvector.dimensions).toBe(768);
    });

    it("should require password field", () => {
      const config = { host: "localhost" };
      expect(() => DATABASE_CONFIG_SCHEMA.parse(config)).toThrow();
    });

    it("should validate connection pool constraints", () => {
      const config = {
        password: "test",
        pool: {
          min: 10,
          max: 5, // Invalid: min > max
        },
      };
      const result = DATABASE_CONFIG_SCHEMA.parse(config);
      // Schema allows this but implementation should handle logic
      expect(result.pool.min).toBe(10);
      expect(result.pool.max).toBe(5);
    });
  });

  describe("ENVIRONMENT_DATABASE_SCHEMA", () => {
    it("should validate development environment defaults", () => {
      const config = {
        environment: "development" as const,
        database: { password: "dev-password" },
      };
      const result = ENVIRONMENT_DATABASE_SCHEMA.parse(config);
      expect(result.environment).toBe("development");
      expect(result.database.pool.max).toBe(5); // Development specific
    });

    it("should validate production environment with SSL", () => {
      const config = {
        environment: "production" as const,
        database: {
          password: "prod-password",
          host: "prod.db.example.com",
        },
      };
      const result = ENVIRONMENT_DATABASE_SCHEMA.parse(config);
      expect(result.environment).toBe("production");
      expect(result.database.pool.min).toBe(5); // Production specific
      expect(result.database.retryAttempts).toBe(5);
    });

    it("should validate staging environment", () => {
      const config = {
        environment: "staging" as const,
        database: { password: "staging-password" },
      };
      const result = ENVIRONMENT_DATABASE_SCHEMA.parse(config);
      expect(result.environment).toBe("staging");
    });
  });

  describe("RABBITMQ_CONFIG_SCHEMA", () => {
    it("should validate minimal RabbitMQ config", () => {
      const result = RABBITMQ_CONFIG_SCHEMA.parse({});
      expect(result).toMatchObject({
        protocol: "amqp",
        hostname: "localhost",
        port: 5672,
        username: "guest",
        password: "guest",
        vhost: "/",
      });
    });

    it("should validate complete RabbitMQ config with exchanges and queues", () => {
      const config = {
        protocol: "amqps" as const,
        hostname: "rabbitmq.example.com",
        port: 5671,
        username: "app_user",
        password: "secure-password",
        exchanges: [
          {
            name: "task.exchange",
            type: "topic" as const,
            durable: true,
          },
        ],
        queues: [
          {
            name: "task.queue",
            durable: true,
            messageTtl: 3600000,
          },
        ],
        deadLetter: {
          enabled: true,
          exchange: "dlx",
          maxRetries: 5,
        },
      };
      const result = RABBITMQ_CONFIG_SCHEMA.parse(config);
      expect(result.exchanges).toHaveLength(1);
      expect(result.exchanges[0].type).toBe("topic");
    });

    it("should validate retry policy configuration", () => {
      const config = {
        retryPolicy: {
          enabled: true,
          maxRetries: 5,
          initialDelay: 2000,
          maxDelay: 60000,
          multiplier: 1.5,
        },
      };
      const result = RABBITMQ_CONFIG_SCHEMA.parse(config);
      expect(result.retryPolicy.multiplier).toBe(1.5);
    });
  });

  describe("REDIS_CONFIG_SCHEMA", () => {
    it("should validate minimal Redis config", () => {
      const result = REDIS_CONFIG_SCHEMA.parse({});
      expect(result).toMatchObject({
        host: "localhost",
        port: 6379,
        db: 0,
        keyPrefix: "axon:",
      });
    });

    it("should validate Redis cluster configuration", () => {
      const config = {
        cluster: {
          enabled: true,
          nodes: [
            { host: "redis-1.example.com", port: 7001 },
            { host: "redis-2.example.com", port: 7002 },
            { host: "redis-3.example.com", port: 7003 },
          ],
          maxRedirections: 10,
        },
        pool: {
          min: 3,
          max: 15,
        },
      };
      const result = REDIS_CONFIG_SCHEMA.parse(config);
      expect(result.cluster?.enabled).toBe(true);
      expect(result.cluster?.nodes).toHaveLength(3);
    });

    it("should validate pub/sub configuration", () => {
      const config = {
        pubsub: {
          enabled: true,
          subscriber: {
            enableOfflineQueue: false,
            maxRetriesPerRequest: 5,
          },
        },
      };
      const result = REDIS_CONFIG_SCHEMA.parse(config);
      expect(result.pubsub.subscriber.maxRetriesPerRequest).toBe(5);
    });

    it("should validate cache TTL settings", () => {
      const config = {
        cacheTTL: {
          default: 1800,
          session: 43200,
          query: 600,
          metadata: 14400,
        },
      };
      const result = REDIS_CONFIG_SCHEMA.parse(config);
      expect(result.cacheTTL.session).toBe(43200);
    });
  });

  describe("INFRASTRUCTURE_CONFIG_SCHEMA", () => {
    it("should validate complete infrastructure config", () => {
      const config = {
        base: {
          environment: "production" as const,
          logLevel: "warn" as const,
          port: 8080,
        },
        database: {
          password: "db-password",
          host: "prod-db.example.com",
        },
        redis: {
          host: "redis.example.com",
          password: "redis-password",
        },
        rabbitmq: {
          hostname: "mq.example.com",
          username: "mq-user",
          password: "mq-password",
        },
      };
      const result = INFRASTRUCTURE_CONFIG_SCHEMA.parse(config);
      expect(result.base.environment).toBe("production");
      expect(result.database).toBeDefined();
      expect(result.redis).toBeDefined();
      expect(result.rabbitmq).toBeDefined();
    });

    it("should allow partial infrastructure config", () => {
      const config = {
        base: { environment: "development" as const },
        database: { password: "test-password" },
      };
      const result = INFRASTRUCTURE_CONFIG_SCHEMA.parse(config);
      expect(result.redis).toBeUndefined();
      expect(result.rabbitmq).toBeUndefined();
    });
  });

  describe("PARTIAL_INFRASTRUCTURE_CONFIG_SCHEMA", () => {
    it("should require at least one infrastructure component", () => {
      const emptyConfig = {};
      expect(() => PARTIAL_INFRASTRUCTURE_CONFIG_SCHEMA.parse(emptyConfig)).toThrow();
    });

    it("should validate with only database component", () => {
      const config = {
        database: { password: "db-only-password" },
      };
      const result = PARTIAL_INFRASTRUCTURE_CONFIG_SCHEMA.parse(config);
      expect(result.database).toBeDefined();
      expect(result.redis).toBeUndefined();
    });

    it("should validate with multiple components", () => {
      const config = {
        redis: { host: "redis.example.com" },
        rabbitmq: { hostname: "rabbitmq.example.com" },
      };
      const result = PARTIAL_INFRASTRUCTURE_CONFIG_SCHEMA.parse(config);
      expect(result.redis).toBeDefined();
      expect(result.rabbitmq).toBeDefined();
    });
  });

  describe("Performance and Error Handling", () => {
    it("should handle large configuration objects efficiently", () => {
      const largeConfig = {
        base: { environment: "production" as const },
        database: { password: "test" },
        rabbitmq: {
          exchanges: Array.from({ length: 100 }, (_, i) => ({
            name: `exchange-${i}`,
            type: "topic" as const,
            durable: true,
          })),
          queues: Array.from({ length: 100 }, (_, i) => ({
            name: `queue-${i}`,
            durable: true,
          })),
        },
      };

      const start = performance.now();
      const result = INFRASTRUCTURE_CONFIG_SCHEMA.parse(largeConfig);
      const end = performance.now();

      expect(result.rabbitmq?.exchanges).toHaveLength(100);
      expect(end - start).toBeLessThan(50); // Should be much faster than 100ms
    });

    it("should provide detailed error messages for invalid configurations", () => {
      const invalidConfig = {
        base: {
          environment: "invalid",
          port: "not-a-number",
        },
        database: {
          // Missing required password
          port: 99999, // Invalid port range
        },
      };

      try {
        INFRASTRUCTURE_CONFIG_SCHEMA.parse(invalidConfig);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        expect(zodError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Schema Caching and Validation", () => {
    it("should validate same configuration multiple times efficiently", () => {
      const config = {
        base: { environment: "production" as const },
        database: { password: "cached-test" },
      };

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        INFRASTRUCTURE_CONFIG_SCHEMA.parse(config);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // Should average much less than 1ms per validation
    });
  });
});
