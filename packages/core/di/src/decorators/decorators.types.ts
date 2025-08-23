/**
 * Decorator system types
 *
 * Type definitions for dependency injection decorators and metadata handling
 */

import type { DIToken, ContainerLifecycle } from "../container/container.types.js";

/**
 * Decorator metadata keys used for storing injection information
 */
export const DECORATOR_METADATA_KEYS = {
  /** Class-level injectable metadata */
  INJECTABLE: Symbol("axon:di:injectable"),

  /** Constructor parameter injection metadata */
  INJECT_PARAMS: Symbol("axon:di:inject:params"),

  /** Property injection metadata */
  INJECT_PROPERTIES: Symbol("axon:di:inject:properties"),

  /** Lifecycle metadata */
  LIFECYCLE: Symbol("axon:di:lifecycle"),

  /** Factory metadata */
  FACTORY: Symbol("axon:di:factory"),

  /** Scope metadata */
  SCOPE: Symbol("axon:di:scope"),
} as const;

/**
 * Injectable decorator options
 */
export interface IInjectableOptions {
  /** Instance lifecycle (singleton, transient, scoped) */
  lifecycle?: ContainerLifecycle;

  /** Dependency injection token (if different from class) */
  token?: DIToken;

  /** Factory function for custom instance creation */
  factory?: (...args: unknown[]) => unknown;

  /** Dependencies to inject into constructor */
  dependencies?: DIToken[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Inject decorator options for parameters
 */
export interface IInjectOptions {
  /** Dependency token to inject */
  token?: DIToken;

  /** Whether injection is optional */
  optional?: boolean;

  /** Default value if injection fails and optional is true */
  defaultValue?: unknown;
}

/**
 * Property injection options
 */
export interface IPropertyInjectOptions extends IInjectOptions {
  /** Lazy initialization - inject when first accessed */
  lazy?: boolean;
}

/**
 * Parameter injection metadata
 */
export interface IParameterInjectMetadata {
  /** Parameter index */
  parameterIndex: number;

  /** Injection token */
  token?: DIToken;

  /** Parameter type from design metadata */
  parameterType?: unknown;

  /** Whether injection is optional */
  optional: boolean;

  /** Default value for optional injection */
  defaultValue?: unknown;
}

/**
 * Property injection metadata
 */
export interface IPropertyInjectMetadata {
  /** Property key */
  propertyKey: string | symbol;

  /** Injection token */
  token?: DIToken;

  /** Property type from design metadata */
  propertyType?: unknown;

  /** Whether injection is optional */
  optional: boolean;

  /** Default value for optional injection */
  defaultValue?: unknown;

  /** Lazy initialization */
  lazy: boolean;
}

/**
 * Injectable class metadata
 */
export interface IInjectableMetadata {
  /** Injectable options */
  options: IInjectableOptions;

  /** Constructor parameter injection metadata */
  parameterMetadata: IParameterInjectMetadata[];

  /** Property injection metadata */
  propertyMetadata: IPropertyInjectMetadata[];

  /** Constructor parameter types from design metadata */
  parameterTypes?: unknown[];

  /** Class type */
  target: new (...args: unknown[]) => unknown;
}

/**
 * Factory decorator options
 */
export interface IFactoryOptions {
  /** Factory function */
  factory: (...args: unknown[]) => unknown;

  /** Dependencies for factory function */
  dependencies?: DIToken[];

  /** Instance lifecycle */
  lifecycle?: ContainerLifecycle;
}

/**
 * Scope decorator options
 */
export interface IScopeOptions {
  /** Scope identifier */
  scopeId?: string;

  /** Scope isolation strategy */
  isolation?: "strict" | "inherited";
}

/**
 * Metadata reader interface for extracting decorator information
 */
export interface IMetadataReader {
  /**
   * Check if class is decorated with @Injectable
   */
  isInjectable(target: new (...args: unknown[]) => unknown): boolean;

  /**
   * Get injectable metadata from class
   */
  getInjectableMetadata(target: new (...args: unknown[]) => unknown): IInjectableMetadata | undefined;

  /**
   * Get parameter injection metadata
   */
  getParameterMetadata(target: new (...args: unknown[]) => unknown): IParameterInjectMetadata[];

  /**
   * Get property injection metadata
   */
  getPropertyMetadata(target: new (...args: unknown[]) => unknown): IPropertyInjectMetadata[];

  /**
   * Get constructor parameter types from design metadata
   */
  getParameterTypes(target: new (...args: unknown[]) => unknown): unknown[];

  /**
   * Get property type from design metadata
   */
  getPropertyType(target: new (...args: unknown[]) => unknown, propertyKey: string | symbol): unknown;
}

/**
 * Metadata writer interface for storing decorator information
 */
export interface IMetadataWriter {
  /**
   * Set injectable metadata on class
   */
  setInjectableMetadata(target: new (...args: unknown[]) => unknown, metadata: IInjectableOptions): void;

  /**
   * Add parameter injection metadata
   */
  addParameterMetadata(
    target: new (...args: unknown[]) => unknown,
    parameterIndex: number,
    options: IInjectOptions,
  ): void;

  /**
   * Add property injection metadata
   */
  addPropertyMetadata(
    target: new (...args: unknown[]) => unknown,
    propertyKey: string | symbol,
    options: IPropertyInjectOptions,
  ): void;
}

/**
 * Cross-platform metadata manager
 */
export interface IMetadataManager extends IMetadataReader, IMetadataWriter {
  /**
   * Clear all metadata for target
   */
  clearMetadata(target: new (...args: unknown[]) => unknown): void;

  /**
   * Check if Reflect API is available
   */
  hasReflectSupport(): boolean;

  /**
   * Get metadata statistics
   */
  getStats(): IMetadataStats;
}

/**
 * Metadata statistics
 */
export interface IMetadataStats {
  /** Number of classes with injectable metadata */
  injectableClasses: number;

  /** Total parameter injections */
  parameterInjections: number;

  /** Total property injections */
  propertyInjections: number;

  /** Whether design type metadata is available */
  hasDesignTypeSupport: boolean;

  /** Platform information */
  platform: "node" | "browser" | "unknown";
}

/**
 * Dependency resolution context for decorators
 */
export interface IDecoratorResolutionContext {
  /** Target class being instantiated */
  target: new (...args: unknown[]) => unknown;

  /** Container instance */
  container?: unknown; // Avoid circular dependency with container types

  /** Resolution metadata */
  metadata: IInjectableMetadata;

  /** Whether to resolve optional dependencies */
  resolveOptional: boolean;
}

/**
 * Decorator configuration options
 */
export interface IDecoratorConfig {
  /** Enable automatic registration of injectable classes */
  autoRegister?: boolean;

  /** Default lifecycle for injectable classes */
  defaultLifecycle?: ContainerLifecycle;

  /** Enable strict mode (fail on missing dependencies) */
  strictMode?: boolean;

  /** Enable property injection */
  enablePropertyInjection?: boolean;

  /** Enable lazy property injection */
  enableLazyInjection?: boolean;

  /** Warn about missing design type metadata */
  warnMissingDesignTypes?: boolean;
}
