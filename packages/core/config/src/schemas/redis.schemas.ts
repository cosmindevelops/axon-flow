/**
 * Redis configuration schema with caching and pub/sub support
 */

import { z } from "zod";

/**
 * Redis connection pool settings
 */
const REDIS_POOL_SCHEMA = z.object({
  min: z.coerce.number().int().min(0).default(2).describe("Minimum pool size"),
  max: z.coerce.number().int().min(1).default(10).describe("Maximum pool size"),
  acquireTimeoutMillis: z.coerce.number().min(0).default(3000).describe("Acquire timeout in milliseconds"),
  destroyTimeoutMillis: z.coerce.number().min(0).default(5000).describe("Destroy timeout in milliseconds"),
  idleTimeoutMillis: z.coerce.number().min(0).default(30000).describe("Idle timeout in milliseconds"),
  evictionRunIntervalMillis: z.coerce.number().min(0).default(10000).describe("Eviction run interval in milliseconds"),
});

/**
 * Cache TTL settings for different cache types
 */
const CACHE_TTL_SCHEMA = z.object({
  default: z.coerce.number().min(0).default(3600).describe("Default TTL in seconds"),
  session: z.coerce.number().min(0).default(86400).describe("Session cache TTL in seconds"),
  query: z.coerce.number().min(0).default(300).describe("Query cache TTL in seconds"),
  metadata: z.coerce.number().min(0).default(7200).describe("Metadata cache TTL in seconds"),
  temporary: z.coerce.number().min(0).default(60).describe("Temporary cache TTL in seconds"),
});

/**
 * Redis cluster configuration
 */
const REDIS_CLUSTER_SCHEMA = z.object({
  enabled: z.boolean().default(false),
  nodes: z
    .array(
      z.object({
        host: z.string().min(1),
        port: z.coerce.number().int().min(1).max(65535),
      }),
    )
    .min(1)
    .describe("Cluster nodes"),
  maxRedirections: z.coerce.number().int().min(1).default(16).describe("Max redirections"),
  retryDelayOnFailover: z.coerce.number().min(0).default(100).describe("Retry delay on failover in milliseconds"),
  retryDelayOnClusterDown: z.coerce
    .number()
    .min(0)
    .default(300)
    .describe("Retry delay on cluster down in milliseconds"),
  slotsRefreshTimeout: z.coerce.number().min(0).default(1000).describe("Slots refresh timeout in milliseconds"),
  clusterRetryStrategy: z.any().optional(),
});

/**
 * Redis pub/sub configuration
 */
const REDIS_PUBSUB_SCHEMA = z.object({
  enabled: z.boolean().default(true),
  subscriber: z.object({
    retryStrategy: z.any().optional(),
    enableOfflineQueue: z.boolean().default(true).describe("Enable offline queue"),
    maxRetriesPerRequest: z.coerce.number().int().min(0).default(3).describe("Max retries per request"),
  }),
  publisher: z.object({
    enableOfflineQueue: z.boolean().default(true).describe("Enable offline queue"),
    maxRetriesPerRequest: z.coerce.number().int().min(0).default(3).describe("Max retries per request"),
  }),
});

/**
 * Main Redis configuration schema
 */
export const REDIS_CONFIG_SCHEMA = z.object({
  host: z.string().min(1).default("localhost").describe("Redis host"),
  port: z.coerce.number().int().min(1).max(65535).default(6379).describe("Redis port"),
  password: z.string().optional().describe("Redis password"),
  db: z.coerce.number().int().min(0).max(15).default(0).describe("Redis database index"),
  username: z.string().optional().describe("Redis username for ACL"),
  keyPrefix: z.string().default("axon:").describe("Key prefix for all Redis keys"),
  connectionName: z.string().default("axon-flow").describe("Connection name"),
  sentinels: z
    .array(
      z.object({
        host: z.string().min(1),
        port: z.coerce.number().int().min(1).max(65535),
      }),
    )
    .optional()
    .describe("Redis Sentinel nodes"),
  name: z.string().optional().describe("Sentinel master name"),
  pool: REDIS_POOL_SCHEMA,
  cacheTTL: CACHE_TTL_SCHEMA,
  cluster: REDIS_CLUSTER_SCHEMA.optional(),
  pubsub: REDIS_PUBSUB_SCHEMA.default({
    enabled: true,
    subscriber: {
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    },
    publisher: {
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    },
  }),
  connectTimeout: z.coerce.number().min(0).default(10000).describe("Connection timeout in milliseconds"),
  commandTimeout: z.coerce.number().min(0).default(5000).describe("Command timeout in milliseconds"),
  enableReadyCheck: z.boolean().default(true).describe("Enable ready check"),
  enableOfflineQueue: z.boolean().default(true).describe("Enable offline queue"),
  lazyConnect: z.boolean().default(false).describe("Lazy connect on first command"),
  maxRetriesPerRequest: z.coerce.number().int().min(0).default(3).describe("Max retries per request"),
  retryStrategy: z.any().optional(),
  reconnectOnError: z.any().optional().describe("Reconnect on error function"),
});

/**
 * Environment-specific Redis configurations
 */
export const ENVIRONMENT_REDIS_SCHEMA = z.discriminatedUnion("environment", [
  z.object({
    environment: z.literal("development"),
    redis: REDIS_CONFIG_SCHEMA.extend({
      host: z.string().default("localhost"),
      pool: REDIS_POOL_SCHEMA.extend({
        min: z.coerce.number().default(1),
        max: z.coerce.number().default(5),
      }),
      cluster: z.object({ enabled: z.boolean().default(false) }).optional(),
    }),
  }),
  z.object({
    environment: z.literal("staging"),
    redis: REDIS_CONFIG_SCHEMA.extend({
      pool: REDIS_POOL_SCHEMA.extend({
        min: z.coerce.number().default(2),
        max: z.coerce.number().default(10),
      }),
    }),
  }),
  z.object({
    environment: z.literal("production"),
    redis: REDIS_CONFIG_SCHEMA.extend({
      pool: REDIS_POOL_SCHEMA.extend({
        min: z.coerce.number().default(5),
        max: z.coerce.number().default(20),
      }),
      cluster: REDIS_CLUSTER_SCHEMA.optional(),
      maxRetriesPerRequest: z.coerce.number().default(5),
    }),
  }),
]);

/**
 * Type exports for Redis configuration
 */
export type RedisConfig = z.infer<typeof REDIS_CONFIG_SCHEMA>;
export type RedisPoolConfig = z.infer<typeof REDIS_POOL_SCHEMA>;
export type CacheTTLConfig = z.infer<typeof CACHE_TTL_SCHEMA>;
export type RedisClusterConfig = z.infer<typeof REDIS_CLUSTER_SCHEMA>;
export type RedisPubSubConfig = z.infer<typeof REDIS_PUBSUB_SCHEMA>;
