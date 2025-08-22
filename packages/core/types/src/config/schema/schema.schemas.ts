/**
 * Zod validation schemas for configuration schema types
 *
 * Runtime validation schemas for configuration schema definitions and validation.
 */

import { z } from "zod";
import type { ConfigSourceType, PropertyType, SchemaType, ValidationType } from "./schema.types.js";

// Enum schemas
export const schemaTypeSchema = z.enum([
  "object",
  "array",
  "string",
  "number",
  "boolean",
  "null",
  "union",
  "intersection",
]) satisfies z.ZodType<SchemaType>;

export const propertyTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "null",
  "any",
]) satisfies z.ZodType<PropertyType>;

export const validationTypeSchema = z.enum([
  "required",
  "email",
  "url",
  "uuid",
  "date",
  "regex",
  "range",
  "length",
  "custom",
]) satisfies z.ZodType<ValidationType>;

export const configSourceTypeSchema = z.enum([
  "file",
  "environment",
  "database",
  "remote",
  "default",
]) satisfies z.ZodType<ConfigSourceType>;

// Property schema (using lazy for recursive type)
export const propertySchemaSchema: z.ZodLazy<
  z.ZodObject<{
    type: typeof propertyTypeSchema;
    description: z.ZodOptional<z.ZodString>;
    default: z.ZodOptional<z.ZodUnknown>;
    enum: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    format: z.ZodOptional<z.ZodString>;
    minimum: z.ZodOptional<z.ZodNumber>;
    maximum: z.ZodOptional<z.ZodNumber>;
    minLength: z.ZodOptional<z.ZodNumber>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    pattern: z.ZodOptional<z.ZodString>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<any>>>;
    items: z.ZodOptional<z.ZodLazy<any>>;
  }>
> = z.lazy(() =>
  z.object({
    type: propertyTypeSchema,
    description: z.string().optional(),
    default: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
    format: z.string().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    properties: z
      .record(
        z.string(),
        z.lazy(() => propertySchemaSchema),
      )
      .optional(),
    items: z.lazy(() => propertySchemaSchema).optional(),
  }),
);

// Schema definition
export const schemaDefinitionSchema = z.object({
  type: schemaTypeSchema,
  properties: z.record(z.string(), propertySchemaSchema).optional(),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
  items: propertySchemaSchema.optional(),
  constraints: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      length: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          exact: z.number().optional(),
        })
        .optional(),
      pattern: z.string().optional(),
      custom: z.string().optional(),
    })
    .optional(),
});

// Field validation schema
export const fieldValidationSchema = z.object({
  type: validationTypeSchema,
  params: z.record(z.string(), z.unknown()).optional(),
  message: z.string().optional(),
  required: z.boolean().optional(),
});

// Cross-field validation schema
export const crossFieldValidationSchema = z.object({
  fields: z.array(z.string()),
  rule: z.string(),
  message: z.string(),
});

// Custom validation schema
export const customValidationSchema = z.object({
  name: z.string(),
  fields: z.array(z.string()).optional(),
  logic: z.string(),
  message: z.string(),
});

// Validation rules schema
export const validationRulesSchema = z.object({
  fields: z.record(z.string(), fieldValidationSchema).optional(),
  crossField: z.array(crossFieldValidationSchema).optional(),
  custom: z.array(customValidationSchema).optional(),
});

// Config source schema
export const configSourceSchema = z.object({
  type: configSourceTypeSchema,
  path: z.string(),
  priority: z.number(),
  optional: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Config schema
export const configSchemaSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  schema: schemaDefinitionSchema,
  defaults: z.record(z.string(), z.unknown()),
  validation: validationRulesSchema,
  environment: z.record(z.string(), z.record(z.string(), z.unknown())),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Layered config schema
export const layeredConfigSchema = z.object({
  base: z.unknown(),
  environment: z.record(z.string(), z.unknown()).optional(),
  user: z.record(z.string(), z.unknown()).optional(),
  runtime: z.record(z.string(), z.unknown()).optional(),
  computed: z.unknown(),
  sources: z.array(configSourceSchema),
});

// Config change event schema
export const configChangeEventSchema = z.object({
  key: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  source: configSourceSchema,
  timestamp: z.string(),
});

// Type inference helpers
export type InferredConfigSchema = z.infer<typeof configSchemaSchema>;
export type InferredPropertySchema = z.infer<typeof propertySchemaSchema>;
export type InferredValidationRules = z.infer<typeof validationRulesSchema>;
