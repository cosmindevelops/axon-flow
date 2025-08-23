/**
 * Validation schemas for simple error factory implementation
 */

import { z } from "zod";
import {
  ERROR_SEVERITY_SCHEMA,
  ERROR_CATEGORY_SCHEMA,
  ENHANCED_ERROR_CONTEXT_SCHEMA,
} from "../../base/base-error.schemas.js";

/**
 * Schema for simple factory configuration options
 */
export const simpleFactoryOptionsSchema = z.object({
  defaultSeverity: ERROR_SEVERITY_SCHEMA.optional(),
  defaultCategory: ERROR_CATEGORY_SCHEMA.optional(),
});

/**
 * Schema for system error creation options
 */
export const systemErrorOptionsSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  systemComponent: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  context: ENHANCED_ERROR_CONTEXT_SCHEMA.partial().optional(),
});

/**
 * Schema for application error creation options
 */
export const applicationErrorOptionsSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  module: z.string().optional(),
  operation: z.string().optional(),
  businessRule: z.string().optional(),
  context: ENHANCED_ERROR_CONTEXT_SCHEMA.partial().optional(),
});

/**
 * Schema for validation error creation options
 */
export const validationErrorOptionsSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
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
  context: ENHANCED_ERROR_CONTEXT_SCHEMA.partial().optional(),
});

/**
 * Schema for configuration error creation options
 */
export const configurationErrorOptionsSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  configKey: z.string().optional(),
  configValue: z.unknown().optional(),
  expectedType: z.string().optional(),
  configSource: z.string().optional(),
  context: ENHANCED_ERROR_CONTEXT_SCHEMA.partial().optional(),
});

/**
 * Schema for network error creation options
 */
export const networkErrorOptionsSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  url: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  timeout: z.number().optional(),
  retryCount: z.number().optional(),
  context: ENHANCED_ERROR_CONTEXT_SCHEMA.partial().optional(),
});

/**
 * Validation function for simple factory options
 */
export function validateSimpleFactoryOptions(options: unknown) {
  return simpleFactoryOptionsSchema.parse(options);
}

/**
 * Validation function for system error options
 */
export function validateSystemErrorOptions(options: unknown) {
  return systemErrorOptionsSchema.parse(options);
}

/**
 * Validation function for application error options
 */
export function validateApplicationErrorOptions(options: unknown) {
  return applicationErrorOptionsSchema.parse(options);
}

/**
 * Validation function for validation error options
 */
export function validateValidationErrorOptions(options: unknown) {
  return validationErrorOptionsSchema.parse(options);
}
