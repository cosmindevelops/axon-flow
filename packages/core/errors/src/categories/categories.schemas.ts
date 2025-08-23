/**
 * Zod schemas for error category validation
 */

import { z } from "zod";
import { SecurityErrorReason, DatabaseOperation, FileOperation, ConflictType } from "./categories.types.js";

/**
 * Security error reason schema
 */
export const SECURITY_ERROR_REASON_SCHEMA = z.nativeEnum(SecurityErrorReason);

/**
 * Database operation schema
 */
export const DATABASE_OPERATION_SCHEMA = z.nativeEnum(DatabaseOperation);

/**
 * File operation schema
 */
export const FILE_OPERATION_SCHEMA = z.nativeEnum(FileOperation);

/**
 * Conflict type schema
 */
export const CONFLICT_TYPE_SCHEMA = z.nativeEnum(ConflictType);

/**
 * Validation error field schema
 */
export const VALIDATION_ERROR_FIELD_SCHEMA = z.object({
  field: z.string(),
  message: z.string(),
  constraint: z.string(),
});

/**
 * System error options schema
 */
export const SYSTEM_ERROR_OPTIONS_SCHEMA = z.object({
  systemComponent: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
});

/**
 * Application error options schema
 */
export const APPLICATION_ERROR_OPTIONS_SCHEMA = z.object({
  module: z.string().optional(),
  operation: z.string().optional(),
  businessRule: z.string().optional(),
});

/**
 * Validation error options schema
 */
export const VALIDATION_ERROR_OPTIONS_SCHEMA = z.object({
  field: z.string().optional(),
  value: z.unknown().optional(),
  constraint: z.string().optional(),
  validationErrors: z.array(VALIDATION_ERROR_FIELD_SCHEMA).optional(),
});

/**
 * Configuration error options schema
 */
export const CONFIGURATION_ERROR_OPTIONS_SCHEMA = z.object({
  configKey: z.string().optional(),
  configValue: z.unknown().optional(),
  expectedType: z.string().optional(),
  configSource: z.string().optional(),
});

/**
 * Network error options schema
 */
export const NETWORK_ERROR_OPTIONS_SCHEMA = z.object({
  url: z.string().url().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().positive().optional(),
  timeout: z.number().positive().optional(),
  retryCount: z.number().int().nonnegative().optional(),
});

/**
 * Security error options schema
 */
export const SECURITY_ERROR_OPTIONS_SCHEMA = z.object({
  userId: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  reason: SECURITY_ERROR_REASON_SCHEMA.optional(),
});

/**
 * Database error options schema
 */
export const DATABASE_ERROR_OPTIONS_SCHEMA = z.object({
  query: z.string().optional(),
  table: z.string().optional(),
  operation: DATABASE_OPERATION_SCHEMA.optional(),
  constraint: z.string().optional(),
  affectedRows: z.number().int().nonnegative().optional(),
});

/**
 * File system error options schema
 */
export const FILE_SYSTEM_ERROR_OPTIONS_SCHEMA = z.object({
  path: z.string().optional(),
  operation: FILE_OPERATION_SCHEMA.optional(),
  permissions: z.string().optional(),
  diskSpace: z.number().nonnegative().optional(),
});

/**
 * Integration error options schema
 */
export const INTEGRATION_ERROR_OPTIONS_SCHEMA = z.object({
  service: z.string().optional(),
  endpoint: z.string().optional(),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
  retryable: z.boolean().optional(),
});

/**
 * Timeout error options schema
 */
export const TIMEOUT_ERROR_OPTIONS_SCHEMA = z.object({
  operation: z.string().optional(),
  timeout: z.number().positive().optional(),
  elapsed: z.number().nonnegative().optional(),
});

/**
 * Rate limit error options schema
 */
export const RATE_LIMIT_ERROR_OPTIONS_SCHEMA = z.object({
  limit: z.number().int().positive().optional(),
  remaining: z.number().int().nonnegative().optional(),
  resetAt: z.date().optional(),
  resource: z.string().optional(),
});

/**
 * Not found error options schema
 */
export const NOT_FOUND_ERROR_OPTIONS_SCHEMA = z.object({
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  searchCriteria: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Conflict error options schema
 */
export const CONFLICT_ERROR_OPTIONS_SCHEMA = z.object({
  conflictType: CONFLICT_TYPE_SCHEMA.optional(),
  existingValue: z.unknown().optional(),
  attemptedValue: z.unknown().optional(),
  resourceId: z.string().optional(),
});

/**
 * Permission error options schema
 */
export const PERMISSION_ERROR_OPTIONS_SCHEMA = z.object({
  requiredPermission: z.string().optional(),
  actualPermissions: z.array(z.string()).optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
});
