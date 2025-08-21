/**
 * RabbitMQ configuration schema with AMQP support
 */

import { z } from "zod";

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
const CONNECTION_CONFIG_SCHEMA = z.object({
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
  connection: CONNECTION_CONFIG_SCHEMA,
  exchanges: z.array(EXCHANGE_CONFIG_SCHEMA).default([]).describe("Exchange configurations"),
  queues: z.array(QUEUE_CONFIG_SCHEMA).default([]).describe("Queue configurations"),
  deadLetter: DEAD_LETTER_CONFIG_SCHEMA,
  retryPolicy: RETRY_POLICY_SCHEMA,
  publisher: PUBLISHER_CONFIG_SCHEMA,
  consumer: CONSUMER_CONFIG_SCHEMA,
  socketOptions: z
    .object({
      noDelay: z.boolean().default(true).describe("Disable Nagle's algorithm"),
      keepAlive: z.boolean().default(true).describe("Enable keep-alive"),
      keepAliveDelay: z.coerce.number().min(0).default(60000).describe("Keep-alive delay in milliseconds"),
      timeout: z.coerce.number().min(0).default(0).describe("Socket timeout (0 = no timeout)"),
    })
    .optional(),
  reconnect: z.object({
    enabled: z.boolean().default(true).describe("Enable automatic reconnection"),
    maxAttempts: z.coerce.number().int().min(0).default(0).describe("Max reconnection attempts (0 = unlimited)"),
    interval: z.coerce.number().min(0).default(5000).describe("Reconnection interval in milliseconds"),
  }),
});

/**
 * Environment-specific RabbitMQ configurations
 */
export const ENVIRONMENT_RABBITMQ_SCHEMA = z.discriminatedUnion("environment", [
  z.object({
    environment: z.literal("development"),
    rabbitmq: RABBITMQ_CONFIG_SCHEMA.extend({
      hostname: z.string().default("localhost"),
      connection: CONNECTION_CONFIG_SCHEMA.extend({
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
      connection: CONNECTION_CONFIG_SCHEMA.extend({
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
      connection: CONNECTION_CONFIG_SCHEMA.extend({
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

/**
 * Type exports for RabbitMQ configuration
 */
export type RabbitMQConfig = z.infer<typeof RABBITMQ_CONFIG_SCHEMA>;
export type ExchangeConfig = z.infer<typeof EXCHANGE_CONFIG_SCHEMA>;
export type QueueConfig = z.infer<typeof QUEUE_CONFIG_SCHEMA>;
export type DeadLetterConfig = z.infer<typeof DEAD_LETTER_CONFIG_SCHEMA>;
export type RetryPolicyConfig = z.infer<typeof RETRY_POLICY_SCHEMA>;
export type ConnectionConfig = z.infer<typeof CONNECTION_CONFIG_SCHEMA>;
export type PublisherConfig = z.infer<typeof PUBLISHER_CONFIG_SCHEMA>;
export type ConsumerConfig = z.infer<typeof CONSUMER_CONFIG_SCHEMA>;
