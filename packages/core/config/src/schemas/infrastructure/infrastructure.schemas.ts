/**
 * Infrastructure Configuration Schemas
 * Zod validation schemas for infrastructure-level configuration management
 */

import { z } from "zod";

/**
 * Base configuration schema with common fields
 */
export const BASE_CONFIG_SCHEMA = z.object({
  environment: z.enum(["development", "staging", "production"]).default("development"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
});

// === DATABASE SCHEMAS ===

/**
 * SSL/TLS configuration for database connections
 */
const SSL_CONFIG_SCHEMA = z
  .object({
    enabled: z.boolean().default(false),
    rejectUnauthorized: z.boolean().default(true),
    ca: z.string().optional().describe("CA certificate"),
    cert: z.string().optional().describe("Client certificate"),
    key: z.string().optional().describe("Client key"),
  })
  .optional();

/**
 * Connection pool configuration for database
 */
const CONNECTION_POOL_SCHEMA = z.object({
  min: z.coerce.number().int().min(0).default(2).describe("Minimum pool size"),
  max: z.coerce.number().int().min(1).default(10).describe("Maximum pool size"),
  idleTimeoutMillis: z.coerce.number().min(0).default(30000).describe("Idle connection timeout in milliseconds"),
  connectionTimeoutMillis: z.coerce.number().min(0).default(2000).describe("Connection timeout in milliseconds"),
  acquireTimeoutMillis: z.coerce.number().min(0).default(30000).describe("Acquire timeout in milliseconds"),
});

/**
 * pgvector extension configuration
 */
const PGVECTOR_SCHEMA = z.object({
  enabled: z.boolean().default(false),
  dimensions: z.coerce.number().int().min(1).default(1536).describe("Vector dimensions"),
  indexMethod: z.enum(["ivfflat", "hnsw"]).default("hnsw").describe("Vector index method"),
  lists: z.coerce.number().int().min(1).default(100).describe("Number of lists for IVF"),
  probes: z.coerce.number().int().min(1).default(1).describe("Number of probes for search"),
  efConstruction: z.coerce.number().int().min(4).default(200).describe("HNSW ef_construction"),
  m: z.coerce.number().int().min(2).default(16).describe("HNSW M parameter"),
});

/**
 * Main PostgreSQL database configuration schema
 */
export const DATABASE_CONFIG_SCHEMA = z.object({
  host: z.string().min(1).default("localhost").describe("Database host"),
  port: z.coerce.number().int().min(1).max(65535).default(5432).describe("Database port"),
  database: z.string().min(1).default("axon_flow").describe("Database name"),
  username: z.string().min(1).default("postgres").describe("Database username"),
  password: z.string().min(1).describe("Database password"),
  schema: z.string().default("public").describe("Database schema"),
  ssl: SSL_CONFIG_SCHEMA,
  pool: CONNECTION_POOL_SCHEMA.default(() => ({
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    acquireTimeoutMillis: 30000,
  })),
  pgvector: PGVECTOR_SCHEMA.default(() => ({
    enabled: false,
    dimensions: 1536,
    indexMethod: "hnsw" as const,
    lists: 100,
    probes: 1,
    efConstruction: 200,
    m: 16,
  })),
  statementTimeout: z.coerce.number().min(0).default(30000).describe("Statement timeout in milliseconds"),
  queryTimeout: z.coerce.number().min(0).default(30000).describe("Query timeout in milliseconds"),
  applicationName: z.string().default("axon-flow").describe("Application name for pg_stat_activity"),
  retryAttempts: z.coerce.number().int().min(0).default(3).describe("Connection retry attempts"),
  retryDelay: z.coerce.number().min(0).default(1000).describe("Delay between retry attempts in milliseconds"),
});

/**
 * Environment-specific database configurations
 */
export const ENVIRONMENT_DATABASE_SCHEMA = z.discriminatedUnion("environment", [
  z.object({
    environment: z.literal("development"),
    database: DATABASE_CONFIG_SCHEMA.extend({
      host: z.string().default("localhost"),
      pool: CONNECTION_POOL_SCHEMA.extend({
        min: z.coerce.number().default(1),
        max: z.coerce.number().default(5),
      }).default(() => ({
        min: 1,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        acquireTimeoutMillis: 30000,
      })),
      ssl: z.object({ enabled: z.boolean().default(false) }).optional(),
    }),
  }),
  z.object({
    environment: z.literal("staging"),
    database: DATABASE_CONFIG_SCHEMA.extend({
      pool: CONNECTION_POOL_SCHEMA.extend({
        min: z.coerce.number().default(2),
        max: z.coerce.number().default(10),
      }).default(() => ({
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        acquireTimeoutMillis: 30000,
      })),
      ssl: z.object({ enabled: z.boolean().default(true) }).optional(),
    }),
  }),
  z.object({
    environment: z.literal("production"),
    database: DATABASE_CONFIG_SCHEMA.extend({
      pool: CONNECTION_POOL_SCHEMA.extend({
        min: z.coerce.number().default(5),
        max: z.coerce.number().default(20),
      }).default(() => ({
        min: 5,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        acquireTimeoutMillis: 30000,
      })),
      ssl: z
        .object({
          enabled: z.boolean().default(true),
          rejectUnauthorized: z.boolean().default(true),
        })
        .optional(),
      retryAttempts: z.coerce.number().default(5),
    }),
  }),
]);

// === RABBITMQ SCHEMAS ===

/**
 * Exchange configuration for RabbitMQ
 */
const EXCHANGE_CONFIG_SCHEMA = z.object({
  name: z.string().min(1).describe("Exchange name"),
  type: z.enum(["direct", "topic", "fanout", "headers"]).describe("Exchange type"),
  durable: z.boolean().default(true).describe("Persist exchange on broker restart"),
  autoDelete: z.boolean().default(false).describe("Delete when no queues bound"),
  internal: z.boolean().default(false).describe("Internal exchange"),
  alternateExchange: z.string().optional().describe("Alternate exchange for unroutable messages"),
  arguments: z.record(z.string(), z.unknown()).optional().describe("Additional exchange arguments"),
});

/**
 * Queue configuration for RabbitMQ
 */
const QUEUE_CONFIG_SCHEMA = z.object({
  name: z.string().min(1).describe("Queue name"),
  durable: z.boolean().default(true).describe("Persist queue on broker restart"),
  exclusive: z.boolean().default(false).describe("Exclusive to connection"),
  autoDelete: z.boolean().default(false).describe("Delete when last consumer disconnects"),
  messageTtl: z.coerce.number().min(0).optional().describe("Message TTL in milliseconds"),
  expires: z.coerce.number().min(0).optional().describe("Queue expiration in milliseconds"),
  maxLength: z.coerce.number().int().min(0).optional().describe("Maximum queue length"),
  maxLengthBytes: z.coerce.number().int().min(0).optional().describe("Maximum queue size in bytes"),
  maxPriority: z.coerce.number().int().min(1).max(255).optional().describe("Maximum priority level"),
  arguments: z.record(z.string(), z.unknown()).optional().describe("Additional queue arguments"),
});

/**
 * Dead letter queue configuration
 */
const DEAD_LETTER_CONFIG_SCHEMA = z.object({
  enabled: z.boolean().default(true),
  exchange: z.string().default("dlx").describe("Dead letter exchange name"),
  routingKey: z.string().optional().describe("Dead letter routing key"),
  ttl: z.coerce.number().min(0).default(86400000).describe("Dead letter TTL in milliseconds (24h default)"),
  maxRetries: z.coerce.number().int().min(0).default(3).describe("Max retry attempts before dead lettering"),
});

/**
 * Retry policy configuration
 */
const RETRY_POLICY_SCHEMA = z.object({
  enabled: z.boolean().default(true),
  maxRetries: z.coerce.number().int().min(0).default(3).describe("Maximum retry attempts"),
  initialDelay: z.coerce.number().min(0).default(1000).describe("Initial retry delay in milliseconds"),
  maxDelay: z.coerce.number().min(0).default(30000).describe("Maximum retry delay in milliseconds"),
  multiplier: z.coerce.number().min(1).default(2).describe("Backoff multiplier"),
  retryOnRequeue: z.boolean().default(true).describe("Retry on requeue"),
});

/**
 * Connection configuration for RabbitMQ
 */
const RABBITMQ_CONNECTION_CONFIG_SCHEMA = z.object({
  heartbeat: z.coerce.number().min(0).default(60).describe("Heartbeat interval in seconds"),
  connectionTimeout: z.coerce.number().min(0).default(30000).describe("Connection timeout in milliseconds"),
  channelMax: z.coerce.number().int().min(0).default(0).describe("Maximum number of channels (0 = unlimited)"),
  frameMax: z.coerce.number().int().min(0).default(0).describe("Maximum frame size (0 = unlimited)"),
  locale: z.string().default("en_US").describe("Locale for error messages"),
});

/**
 * Publisher configuration
 */
const PUBLISHER_CONFIG_SCHEMA = z.object({
  confirmChannel: z.boolean().default(true).describe("Use publisher confirms"),
  maxUnconfirmed: z.coerce.number().int().min(1).default(100).describe("Max unconfirmed messages"),
  persistent: z.boolean().default(true).describe("Make messages persistent"),
  mandatory: z.boolean().default(true).describe("Return unroutable messages"),
  immediate: z.boolean().default(false).describe("Return if no consumers"),
  priority: z.coerce.number().int().min(0).max(255).optional().describe("Default message priority"),
  expiration: z.coerce.number().min(0).optional().describe("Default message expiration in milliseconds"),
});

/**
 * Consumer configuration
 */
const CONSUMER_CONFIG_SCHEMA = z.object({
  prefetch: z.coerce.number().int().min(0).default(10).describe("Prefetch count (0 = unlimited)"),
  noAck: z.boolean().default(false).describe("Auto-acknowledge messages"),
  exclusive: z.boolean().default(false).describe("Exclusive consumer"),
  priority: z.coerce.number().int().min(0).optional().describe("Consumer priority"),
  consumerTag: z.string().optional().describe("Consumer tag"),
  arguments: z.record(z.string(), z.unknown()).optional().describe("Additional consumer arguments"),
});

/**
 * Main RabbitMQ configuration schema
 */
export const RABBITMQ_CONFIG_SCHEMA = z.object({
  protocol: z.enum(["amqp", "amqps"]).default("amqp").describe("AMQP protocol"),
  hostname: z.string().min(1).default("localhost").describe("RabbitMQ hostname"),
  port: z.coerce.number().int().min(1).max(65535).default(5672).describe("RabbitMQ port"),
  username: z.string().min(1).default("guest").describe("RabbitMQ username"),
  password: z.string().min(1).default("guest").describe("RabbitMQ password"),
  vhost: z.string().default("/").describe("Virtual host"),
  connectionName: z.string().default("axon-flow").describe("Connection name for management UI"),
  connection: RABBITMQ_CONNECTION_CONFIG_SCHEMA.default(() => ({
    heartbeat: 60,
    connectionTimeout: 30000,
    channelMax: 0,
    frameMax: 0,
    locale: "en_US",
  })),
  exchanges: z.array(EXCHANGE_CONFIG_SCHEMA).default([]).describe("Exchange configurations"),
  queues: z.array(QUEUE_CONFIG_SCHEMA).default([]).describe("Queue configurations"),
  deadLetter: DEAD_LETTER_CONFIG_SCHEMA.default(() => ({
    enabled: true,
    exchange: "dlx",
    ttl: 86400000,
    maxRetries: 3,
  })),
  retryPolicy: RETRY_POLICY_SCHEMA.default(() => ({
    enabled: true,
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    retryOnRequeue: true,
  })),
  publisher: PUBLISHER_CONFIG_SCHEMA.default(() => ({
    confirmChannel: true,
    maxUnconfirmed: 100,
    persistent: true,
    mandatory: true,
    immediate: false,
  })),
  consumer: CONSUMER_CONFIG_SCHEMA.default(() => ({
    prefetch: 10,
    noAck: false,
    exclusive: false,
  })),
  socketOptions: z
    .object({
      noDelay: z.boolean().default(true).describe("Disable Nagle's algorithm"),
      keepAlive: z.boolean().default(true).describe("Enable keep-alive"),
      keepAliveDelay: z.coerce.number().min(0).default(60000).describe("Keep-alive delay in milliseconds"),
      timeout: z.coerce.number().min(0).default(0).describe("Socket timeout (0 = no timeout)"),
    })
    .optional(),
  reconnect: z
    .object({
      enabled: z.boolean().default(true).describe("Enable automatic reconnection"),
      maxAttempts: z.coerce.number().int().min(0).default(0).describe("Max reconnection attempts (0 = unlimited)"),
      interval: z.coerce.number().min(0).default(5000).describe("Reconnection interval in milliseconds"),
    })
    .default(() => ({
      enabled: true,
      maxAttempts: 0,
      interval: 5000,
    })),
});

/**
 * Environment-specific RabbitMQ configurations
 */
export const ENVIRONMENT_RABBITMQ_SCHEMA = z.discriminatedUnion("environment", [
  z.object({
    environment: z.literal("development"),
    rabbitmq: RABBITMQ_CONFIG_SCHEMA.extend({
      hostname: z.string().default("localhost"),
      connection: RABBITMQ_CONNECTION_CONFIG_SCHEMA.extend({
        heartbeat: z.coerce.number().default(30),
      }),
      consumer: CONSUMER_CONFIG_SCHEMA.extend({
        prefetch: z.coerce.number().default(5),
      }),
    }),
  }),
  z.object({
    environment: z.literal("staging"),
    rabbitmq: RABBITMQ_CONFIG_SCHEMA.extend({
      connection: RABBITMQ_CONNECTION_CONFIG_SCHEMA.extend({
        heartbeat: z.coerce.number().default(60),
      }),
      consumer: CONSUMER_CONFIG_SCHEMA.extend({
        prefetch: z.coerce.number().default(10),
      }),
      retryPolicy: RETRY_POLICY_SCHEMA.extend({
        maxRetries: z.coerce.number().default(5),
      }),
    }),
  }),
  z.object({
    environment: z.literal("production"),
    rabbitmq: RABBITMQ_CONFIG_SCHEMA.extend({
      protocol: z.literal("amqps").default("amqps"),
      connection: RABBITMQ_CONNECTION_CONFIG_SCHEMA.extend({
        heartbeat: z.coerce.number().default(120),
        channelMax: z.coerce.number().default(100),
      }),
      consumer: CONSUMER_CONFIG_SCHEMA.extend({
        prefetch: z.coerce.number().default(20),
      }),
      retryPolicy: RETRY_POLICY_SCHEMA.extend({
        maxRetries: z.coerce.number().default(10),
        maxDelay: z.coerce.number().default(60000),
      }),
      reconnect: z.object({
        enabled: z.boolean().default(true),
        maxAttempts: z.coerce.number().default(10),
        interval: z.coerce.number().default(10000),
      }),
    }),
  }),
]);

// === REDIS SCHEMAS ===

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
  subscriber: z
    .object({
      retryStrategy: z.any().optional(),
      enableOfflineQueue: z.boolean().default(true).describe("Enable offline queue"),
      maxRetriesPerRequest: z.coerce.number().int().min(0).default(3).describe("Max retries per request"),
    })
    .default(() => ({
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    })),
  publisher: z
    .object({
      enableOfflineQueue: z.boolean().default(true).describe("Enable offline queue"),
      maxRetriesPerRequest: z.coerce.number().int().min(0).default(3).describe("Max retries per request"),
    })
    .default(() => ({
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    })),
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
  pool: REDIS_POOL_SCHEMA.default(() => ({
    min: 2,
    max: 10,
    acquireTimeoutMillis: 3000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    evictionRunIntervalMillis: 10000,
  })),
  cacheTTL: CACHE_TTL_SCHEMA.default(() => ({
    default: 3600,
    session: 86400,
    query: 300,
    metadata: 7200,
    temporary: 60,
  })),
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
 * Complete infrastructure configuration combining all infrastructure schemas
 */
export const INFRASTRUCTURE_CONFIG_SCHEMA = z.object({
  base: BASE_CONFIG_SCHEMA,
  database: DATABASE_CONFIG_SCHEMA.optional(),
  rabbitmq: RABBITMQ_CONFIG_SCHEMA.optional(),
  redis: REDIS_CONFIG_SCHEMA.optional(),
});

/**
 * Partial infrastructure configuration schema
 * For scenarios where only some infrastructure components are needed
 */
export const PARTIAL_INFRASTRUCTURE_CONFIG_SCHEMA = z
  .object({
    base: BASE_CONFIG_SCHEMA.optional(),
    database: DATABASE_CONFIG_SCHEMA.optional(),
    redis: REDIS_CONFIG_SCHEMA.optional(),
    rabbitmq: RABBITMQ_CONFIG_SCHEMA.optional(),
  })
  .refine((config) => Object.values(config).some((value) => value !== undefined), {
    message: "At least one infrastructure component must be configured",
  });

/**
 * Infrastructure validation metadata schema
 */
export const INFRASTRUCTURE_VALIDATION_SCHEMA = z.object({
  strict: z.boolean().default(true),
  allowUnknown: z.boolean().default(false),
  stripUnknown: z.boolean().default(false),
  requiredComponents: z.array(z.enum(["base", "database", "redis", "rabbitmq"])).optional(),
});
