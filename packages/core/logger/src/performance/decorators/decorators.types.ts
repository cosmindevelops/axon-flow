/**
 * Decorator-specific type definitions for performance tracking
 */

import type { IOperationMetrics, IPerformanceBudget, PerformanceCategory } from "../core/core.types.js";

/**
 * Environment-based decorator activation conditions
 */
export interface IDecoratorActivationConditions {
  /** Enable only in specific environments */
  environments?: string[];
  /** Enable only when NODE_ENV matches */
  nodeEnv?: string[];
  /** Enable only when specific feature flags are set */
  featureFlags?: string[];
  /** Custom activation function */
  customCondition?: () => boolean;
  /** Enable based on log level */
  logLevel?: string;
}

/**
 * Performance exporter interface for custom metrics
 */
export interface IPerformanceExporter {
  /** Exporter name */
  name: string;
  /** Export format */
  format: "json" | "prometheus" | "csv" | "custom";
  /** Export function */
  export: (metrics: IOperationMetrics, metadata?: Record<string, unknown>) => string | void;
  /** Export interval in milliseconds (0 for manual export) */
  interval?: number;
}

/**
 * Enhanced performance decorator options
 */
export interface IPerformanceDecoratorOptions {
  /** Operation category */
  category?: string;
  /** Performance category for classification */
  performanceCategory?: PerformanceCategory;
  /** Custom threshold for this operation */
  threshold?: number;
  /** Enable sampling for this operation */
  sample?: boolean;
  /** Sampling rate (0-1) for this specific decorator */
  sampleRate?: number;
  /** Metadata to include with measurements */
  metadata?: Record<string, unknown>;
  /** Activation conditions */
  activation?: IDecoratorActivationConditions;
  /** Performance budget for this operation */
  budget?: IPerformanceBudget;
  /** Enable parameter inspection */
  trackParameters?: boolean;
  /** Parameter serialization options */
  parameterOptions?: {
    /** Include parameter values in metadata */
    includeValues?: boolean;
    /** Include parameter types in metadata */
    includeTypes?: boolean;
    /** Maximum parameter value length for logging */
    maxValueLength?: number;
    /** Parameter names to exclude from tracking */
    excludeParams?: string[];
  };
  /** Custom metric exporters */
  exporters?: IPerformanceExporter[];
}

/**
 * Decorator composition configuration
 */
export interface IDecoratorComposition {
  /** Order of decorator execution */
  executionOrder?: number;
  /** Dependencies on other decorators */
  dependencies?: string[];
  /** Whether this decorator can be combined with others */
  combinable?: boolean;
  /** Shared context between composed decorators */
  sharedContext?: Record<string, unknown>;
}

/**
 * Parameter inspection result
 */
export interface IParameterInspection {
  /** Parameter name or index */
  name: string | number;
  /** Parameter type */
  type: string;
  /** Parameter value (if enabled) */
  value?: unknown;
  /** Serialized length */
  size: number;
}

/**
 * Global decorator configuration
 */
export interface IDecoratorGlobalConfig {
  /** Global activation conditions */
  activation?: IDecoratorActivationConditions;
  /** Performance budgets by category */
  budgets?: Map<PerformanceCategory | string, IPerformanceBudget>;
  /** Global exporters */
  exporters?: IPerformanceExporter[];
  /** Global sampling rate override */
  globalSampleRate?: number;
}
