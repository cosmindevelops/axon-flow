/**
 * Database configuration schema with PostgreSQL and pgvector support
 */

import { z } from "zod";

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
  pool: CONNECTION_POOL_SCHEMA.default({}),
  pgvector: PGVECTOR_SCHEMA.default({}),
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
      }).default({}),
      ssl: z.object({ enabled: z.boolean().default(false) }).optional(),
    }),
  }),
  z.object({
    environment: z.literal("staging"),
    database: DATABASE_CONFIG_SCHEMA.extend({
      pool: CONNECTION_POOL_SCHEMA.extend({
        min: z.coerce.number().default(2),
        max: z.coerce.number().default(10),
      }).default({}),
      ssl: z.object({ enabled: z.boolean().default(true) }).optional(),
    }),
  }),
  z.object({
    environment: z.literal("production"),
    database: DATABASE_CONFIG_SCHEMA.extend({
      pool: CONNECTION_POOL_SCHEMA.extend({
        min: z.coerce.number().default(5),
        max: z.coerce.number().default(20),
      }).default({}),
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

/**
 * Type exports for database configuration
 */
export type DatabaseConfig = z.infer<typeof DATABASE_CONFIG_SCHEMA>;
export type ConnectionPoolConfig = z.infer<typeof CONNECTION_POOL_SCHEMA>;
export type PgvectorConfig = z.infer<typeof PGVECTOR_SCHEMA>;
export type SSLConfig = z.infer<typeof SSL_CONFIG_SCHEMA>;
