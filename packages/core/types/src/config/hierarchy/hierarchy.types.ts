/**
 * Configuration hierarchy type definitions
 *
 * These types support layered configuration management with
 * proper precedence and override mechanisms.
 */

import type { Environment } from "../../environment/index.js";

/**
 * Configuration layer types
 */
export type ConfigLayer = "defaults" | "file" | "environment" | "commandline" | "runtime";

/**
 * Configuration hierarchy management
 */
export interface IConfigHierarchy<T = unknown> {
  /** Configuration layers in precedence order */
  readonly layers: readonly IConfigLayer<T>[];

  /** Merge strategy for combining layers */
  readonly mergeStrategy: MergeStrategy;

  /** Final computed configuration */
  readonly computed: T;

  /** Configuration metadata */
  readonly metadata: IConfigMetadata;
}

/**
 * Individual configuration layer
 */
export interface IConfigLayer<T = unknown> {
  /** Layer type */
  readonly type: ConfigLayer;

  /** Layer name */
  readonly name: string;

  /** Layer priority (higher = more precedence) */
  readonly priority: number;

  /** Configuration values in this layer */
  readonly values: Partial<T>;

  /** Whether this layer is active */
  readonly active: boolean;

  /** Layer source */
  readonly source?: string;
}

/**
 * Merge strategies for configuration layers
 */
export type MergeStrategy =
  | "replace" // Higher priority replaces lower
  | "merge" // Deep merge objects
  | "append" // Append arrays
  | "combine" // Custom combination logic
  | "validate"; // Merge with validation

/**
 * Configuration metadata
 */
export interface IConfigMetadata {
  /** Load time */
  readonly loadedAt: string;

  /** Configuration version */
  readonly version: string;

  /** Environment */
  readonly environment: Environment;

  /** Active profiles */
  readonly profiles?: readonly string[];

  /** Configuration warnings */
  readonly warnings?: readonly IConfigWarning[];
}

/**
 * Configuration warning
 */
export interface IConfigWarning {
  /** Warning level */
  readonly level: "info" | "warning" | "error";

  /** Warning message */
  readonly message: string;

  /** Configuration key involved */
  readonly key?: string;

  /** Warning source */
  readonly source?: string;
}

/**
 * Configuration override
 */
export interface IConfigOverride {
  /** Override key path */
  readonly path: string;

  /** Override value */
  readonly value: unknown;

  /** Override source */
  readonly source: ConfigLayer;

  /** Override priority */
  readonly priority: number;

  /** Whether override is conditional */
  readonly conditional?: IOverrideCondition;
}

/**
 * Override condition
 */
export interface IOverrideCondition {
  /** Condition type */
  readonly type: "environment" | "profile" | "feature" | "custom";

  /** Condition value */
  readonly value: string | boolean;

  /** Condition operator */
  readonly operator?: "equals" | "contains" | "matches" | "exists";
}

/**
 * Configuration transformation
 */
export interface IConfigTransform {
  /** Transform name */
  readonly name: string;

  /** Transform function (as string for serialization) */
  readonly transform: string;

  /** Input type */
  readonly inputType?: string;

  /** Output type */
  readonly outputType?: string;

  /** Transform order */
  readonly order: number;
}

/**
 * Configuration resolution context
 */
export interface IConfigResolutionContext {
  /** Current environment */
  readonly environment: Environment;

  /** Active profiles */
  readonly profiles: readonly string[];

  /** Resolution variables */
  readonly variables: Record<string, unknown>;

  /** Resolution timestamp */
  readonly timestamp: string;
}

/**
 * Configuration value with source tracking
 */
export interface IConfigValue<T = unknown> {
  /** Actual value */
  readonly value: T;

  /** Value source */
  readonly source: IConfigLayer;

  /** Whether value was overridden */
  readonly overridden: boolean;

  /** Original value if overridden */
  readonly original?: T;

  /** Override history */
  readonly history?: readonly IValueHistory[];
}

/**
 * Value history entry
 */
export interface IValueHistory {
  /** Historical value */
  readonly value: unknown;

  /** Change source */
  readonly source: ConfigLayer;

  /** Change timestamp */
  readonly timestamp: string;

  /** Change reason */
  readonly reason?: string;
}

/**
 * Configuration template
 */
export interface IConfigTemplate<T = unknown> {
  /** Template name */
  readonly name: string;

  /** Template description */
  readonly description: string;

  /** Template values */
  readonly template: Partial<T>;

  /** Template variables */
  readonly variables?: readonly ITemplateVariable[];

  /** Template metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Template variable
 */
export interface ITemplateVariable {
  /** Variable name */
  readonly name: string;

  /** Variable type */
  readonly type: "string" | "number" | "boolean" | "array" | "object";

  /** Variable description */
  readonly description: string;

  /** Default value */
  readonly default?: unknown;

  /** Whether variable is required */
  readonly required: boolean;
}

/**
 * Configuration profile
 */
export interface IConfigProfile<T = unknown> {
  /** Profile name */
  readonly name: string;

  /** Profile description */
  readonly description: string;

  /** Profile configuration values */
  readonly values: Partial<T>;

  /** Parent profiles to inherit from */
  readonly extends?: readonly string[];

  /** Profile activation condition */
  readonly activation?: IProfileActivation;
}

/**
 * Profile activation condition
 */
export interface IProfileActivation {
  /** Activation type */
  readonly type: "environment" | "flag" | "auto" | "manual";

  /** Activation condition */
  readonly condition?: string;

  /** Activation priority */
  readonly priority?: number;
}
