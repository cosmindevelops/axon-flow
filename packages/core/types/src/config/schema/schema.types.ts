/**
 * Configuration schema type definitions
 *
 * These types support hierarchical configuration management
 * with validation and environment-specific overrides.
 */

import type { Environment } from "../../environment/index.js";
import type { Version } from "../../core/index.js";

/**
 * Configuration schema definition
 *
 * Defines the structure and validation rules for configuration objects.
 */
export interface IConfigSchema<T = unknown> {
  /** Schema name */
  readonly name: string;

  /** Schema version */
  readonly version: Version;

  /** Schema description */
  readonly description: string;

  /** Schema definition (typically Zod schema) */
  readonly schema: ISchemaDefinition<T>;

  /** Default values */
  readonly defaults: Partial<T>;

  /** Validation rules */
  readonly validation: IValidationRules<T>;

  /** Environment-specific overrides */
  readonly environment: Record<Environment, Partial<T>>;

  /** Schema metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Schema definition for configuration validation
 */
export interface ISchemaDefinition<T> {
  /** Schema type */
  readonly type: SchemaType;

  /** Properties for object schemas */
  readonly properties?: Record<keyof T, IPropertySchema>;

  /** Required properties */
  readonly required?: readonly (keyof T)[];

  /** Additional properties allowed */
  readonly additionalProperties?: boolean;

  /** Items schema for arrays */
  readonly items?: IPropertySchema;

  /** Validation constraints */
  readonly constraints?: ISchemaConstraints;
}

/**
 * Property schema definition
 */
export interface IPropertySchema {
  /** Property type */
  readonly type: PropertyType;

  /** Property description */
  readonly description?: string;

  /** Default value */
  readonly default?: unknown;

  /** Enum values */
  readonly enum?: readonly unknown[];

  /** Format specification */
  readonly format?: string;

  /** Minimum value (for numbers) */
  readonly minimum?: number;

  /** Maximum value (for numbers) */
  readonly maximum?: number;

  /** Minimum length (for strings/arrays) */
  readonly minLength?: number;

  /** Maximum length (for strings/arrays) */
  readonly maxLength?: number;

  /** Pattern (for strings) */
  readonly pattern?: string;

  /** Nested properties (for objects) */
  readonly properties?: Record<string, IPropertySchema>;

  /** Array items (for arrays) */
  readonly items?: IPropertySchema;
}

/**
 * Schema types
 */
export type SchemaType = "object" | "array" | "string" | "number" | "boolean" | "null" | "union" | "intersection";

/**
 * Property types
 */
export type PropertyType = "string" | "number" | "boolean" | "object" | "array" | "null" | "any";

/**
 * Schema constraints
 */
export interface ISchemaConstraints {
  /** Minimum value */
  readonly min?: number;

  /** Maximum value */
  readonly max?: number;

  /** Length constraints */
  readonly length?: ILengthConstraint;

  /** Pattern constraint */
  readonly pattern?: string;

  /** Custom validation function name */
  readonly custom?: string;
}

/**
 * Length constraint
 */
export interface ILengthConstraint {
  /** Minimum length */
  readonly min?: number;

  /** Maximum length */
  readonly max?: number;

  /** Exact length */
  readonly exact?: number;
}

/**
 * Validation rules for configuration
 */
export interface IValidationRules<T> {
  /** Field-level validation rules */
  readonly fields?: Partial<Record<keyof T, IFieldValidation>>;

  /** Cross-field validation rules */
  readonly crossField?: readonly ICrossFieldValidation[];

  /** Custom validation functions */
  readonly custom?: readonly ICustomValidation[];
}

/**
 * Field validation rule
 */
export interface IFieldValidation {
  /** Validation type */
  readonly type: ValidationType;

  /** Validation parameters */
  readonly params?: Record<string, unknown>;

  /** Error message */
  readonly message?: string;

  /** Whether field is required */
  readonly required?: boolean;
}

/**
 * Cross-field validation rule
 */
export interface ICrossFieldValidation {
  /** Fields involved */
  readonly fields: readonly string[];

  /** Validation rule */
  readonly rule: string;

  /** Error message */
  readonly message: string;
}

/**
 * Custom validation function
 */
export interface ICustomValidation {
  /** Function name */
  readonly name: string;

  /** Fields to validate */
  readonly fields?: readonly string[];

  /** Validation logic (as string for serialization) */
  readonly logic: string;

  /** Error message */
  readonly message: string;
}

/**
 * Validation types
 */
export type ValidationType = "required" | "email" | "url" | "uuid" | "date" | "regex" | "range" | "length" | "custom";

/**
 * Layered configuration with hierarchy
 */
export interface ILayeredConfig<T = unknown> {
  /** Base configuration */
  readonly base: T;

  /** Environment-specific overrides */
  readonly environment?: Partial<T>;

  /** User-specific overrides */
  readonly user?: Partial<T>;

  /** Runtime overrides */
  readonly runtime?: Partial<T>;

  /** Computed final configuration */
  readonly computed: T;

  /** Configuration sources */
  readonly sources: readonly IConfigSource[];
}

/**
 * Configuration source
 */
export interface IConfigSource {
  /** Source type */
  readonly type: ConfigSourceType;

  /** Source path or identifier */
  readonly path: string;

  /** Load order priority */
  readonly priority: number;

  /** Whether source is optional */
  readonly optional: boolean;

  /** Source metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Configuration source types
 */
export type ConfigSourceType = "file" | "environment" | "database" | "remote" | "default";

/**
 * Configuration change event
 */
export interface IConfigChangeEvent<T = unknown> {
  /** Changed configuration key */
  readonly key: keyof T;

  /** Previous value */
  readonly oldValue: unknown;

  /** New value */
  readonly newValue: unknown;

  /** Change source */
  readonly source: IConfigSource;

  /** Change timestamp */
  readonly timestamp: string;
}
