/**
 * Zod schemas for domain factory validation
 */

import { z } from "zod";
import { ErrorSeverity, ErrorCategory } from "../base/base-error.types.js";
import {
  SecurityErrorReason,
  DatabaseOperation,
  FileOperation,
  ConflictType,
  AuthMethod,
  AuthFailureReason,
} from "../categories/categories.types.js";

/**
 * Base error creation options schema
 */
export const baseErrorCreationOptionsSchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  severity: z.nativeEnum(ErrorSeverity).optional(),
  category: z.nativeEnum(ErrorCategory).optional(),
  cause: z.instanceof(Error).optional(),
  correlationId: z.string().uuid().optional(),
  component: z.string().optional(),
  operation: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Domain context schemas
 */
export const systemContextSchema = z.object({
  systemComponent: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
});

export const applicationContextSchema = z.object({
  module: z.string().optional(),
  operation: z.string().optional(),
  businessRule: z.string().optional(),
});

export const validationContextSchema = z.object({
  field: z.string().optional(),
  value: z.unknown().optional(),
  constraint: z.string().optional(),
  validationErrors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
        constraint: z.string(),
      }),
    )
    .optional(),
});

export const configurationContextSchema = z.object({
  configKey: z.string().optional(),
  configValue: z.unknown().optional(),
  expectedType: z.string().optional(),
  configSource: z.string().optional(),
});

export const networkContextSchema = z.object({
  url: z.string().url().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  timeout: z.number().positive().optional(),
  retryCount: z.number().int().min(0).optional(),
});

export const securityContextSchema = z.object({
  userId: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  reason: z.nativeEnum(SecurityErrorReason).optional(),
});

export const authenticationContextSchema = z.object({
  userId: z.string().optional(),
  attemptedAction: z.string().optional(),
  authMethod: z.nativeEnum(AuthMethod).optional(),
  failureReason: z.nativeEnum(AuthFailureReason).optional(),
});

export const databaseContextSchema = z.object({
  query: z.string().optional(),
  table: z.string().optional(),
  operation: z.nativeEnum(DatabaseOperation).optional(),
  constraint: z.string().optional(),
  affectedRows: z.number().int().min(0).optional(),
});

export const filesystemContextSchema = z.object({
  path: z.string().optional(),
  operation: z.nativeEnum(FileOperation).optional(),
  permissions: z.string().optional(),
  diskSpace: z.number().optional(),
});

export const integrationContextSchema = z.object({
  service: z.string().optional(),
  endpoint: z.string().optional(),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
  retryable: z.boolean().optional(),
});

export const timeoutContextSchema = z.object({
  operation: z.string().optional(),
  timeout: z.number().positive().optional(),
  elapsed: z.number().positive().optional(),
});

export const ratelimitContextSchema = z.object({
  limit: z.number().int().positive().optional(),
  remaining: z.number().int().min(0).optional(),
  resetAt: z.date().optional(),
  resource: z.string().optional(),
});

export const notfoundContextSchema = z.object({
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  searchCriteria: z.record(z.string(), z.unknown()).optional(),
});

export const conflictContextSchema = z.object({
  conflictType: z.nativeEnum(ConflictType).optional(),
  existingValue: z.unknown().optional(),
  attemptedValue: z.unknown().optional(),
  resourceId: z.string().optional(),
});

export const permissionContextSchema = z.object({
  requiredPermission: z.string().optional(),
  actualPermissions: z.array(z.string()).optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
});

/**
 * Domain error creation options schemas
 */
export const systemErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: systemContextSchema.optional(),
});

export const applicationErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: applicationContextSchema.optional(),
});

export const validationErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: validationContextSchema.optional(),
});

export const configurationErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: configurationContextSchema.optional(),
});

export const networkErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: networkContextSchema.optional(),
});

export const securityErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: securityContextSchema.optional(),
});

export const authenticationErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: authenticationContextSchema.optional(),
});

export const databaseErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: databaseContextSchema.optional(),
});

export const filesystemErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: filesystemContextSchema.optional(),
});

export const integrationErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: integrationContextSchema.optional(),
});

export const timeoutErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: timeoutContextSchema.optional(),
});

export const ratelimitErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: ratelimitContextSchema.optional(),
});

export const notfoundErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: notfoundContextSchema.optional(),
});

export const conflictErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: conflictContextSchema.optional(),
});

export const permissionErrorCreationOptionsSchema = baseErrorCreationOptionsSchema.extend({
  domainContext: permissionContextSchema.optional(),
});

/**
 * Factory configuration schema
 */
export const errorFactoryConfigSchema = z.object({
  defaultSeverity: z.nativeEnum(ErrorSeverity).optional(),
  defaultCategory: z.nativeEnum(ErrorCategory).optional(),
  enableObjectPooling: z.boolean().optional(),
  enableTemplateCache: z.boolean().optional(),
  enableLazyEvaluation: z.boolean().optional(),
  maxPoolSize: z.number().int().positive().max(1000).optional(),
  maxCacheSize: z.number().int().positive().max(10000).optional(),
  trackMetrics: z.boolean().optional(),
});

/**
 * Factory metrics schema
 */
export const factoryMetricsSchema = z.object({
  totalCreations: z.number().int().min(0),
  creationsByDomain: z.record(z.string(), z.number().int().min(0)),
  averageCreationTime: z.number().min(0),
  builderUsageCount: z.number().int().min(0),
  cacheHitRate: z.number().min(0).max(1).optional(),
});

/**
 * Domain key schema
 */
export const domainKeySchema = z.enum([
  "system",
  "application",
  "validation",
  "configuration",
  "network",
  "security",
  "authentication",
  "database",
  "filesystem",
  "integration",
  "timeout",
  "ratelimit",
  "notfound",
  "conflict",
  "permission",
]);

/**
 * Template cache entry schema
 */
export const templateCacheEntrySchema = z.object({
  template: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  lastUsed: z.date(),
  hitCount: z.number().int().min(0),
});

/**
 * Performance measurement schema
 */
export const performanceMeasurementSchema = z.object({
  operation: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number().min(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validation helper functions
 */
export function validateErrorCreationOptions(domain: string, options: unknown): boolean {
  const schemaMap: Record<string, z.ZodSchema> = {
    system: systemErrorCreationOptionsSchema,
    application: applicationErrorCreationOptionsSchema,
    validation: validationErrorCreationOptionsSchema,
    configuration: configurationErrorCreationOptionsSchema,
    network: networkErrorCreationOptionsSchema,
    security: securityErrorCreationOptionsSchema,
    authentication: authenticationErrorCreationOptionsSchema,
    database: databaseErrorCreationOptionsSchema,
    filesystem: filesystemErrorCreationOptionsSchema,
    integration: integrationErrorCreationOptionsSchema,
    timeout: timeoutErrorCreationOptionsSchema,
    ratelimit: ratelimitErrorCreationOptionsSchema,
    notfound: notfoundErrorCreationOptionsSchema,
    conflict: conflictErrorCreationOptionsSchema,
    permission: permissionErrorCreationOptionsSchema,
  };

  const schema = schemaMap[domain];
  if (!schema) {
    return false;
  }

  const result = schema.safeParse(options);
  return result.success;
}

export function validateFactoryConfig(config: unknown): boolean {
  const result = errorFactoryConfigSchema.safeParse(config);
  return result.success;
}

export function validateDomainKey(key: unknown): boolean {
  const result = domainKeySchema.safeParse(key);
  return result.success;
}
