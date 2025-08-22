// Enhanced correlation ID - using string for now, Brand type to be added later
export type CorrelationId = string;

export interface ICorrelationIdParts {
  prefix?: string;
  uuid: string;
  timestamp?: number;
}

export interface ICorrelationIdGenerator {
  generate(prefix?: string): CorrelationId;
  validate(id: CorrelationId): boolean;
  parse(id: CorrelationId): ICorrelationIdParts;
}

export interface ICorrelationManager {
  current(): CorrelationId | undefined;
  with<T>(id: CorrelationId, fn: () => T): T;
  withAsync<T>(id: CorrelationId, fn: () => Promise<T>): Promise<T>;
  create(prefix?: string): CorrelationId;
}

export interface ICorrelationContext {
  id: CorrelationId;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced correlation manager with platform-specific implementations
 */
export interface IEnhancedCorrelationManager extends ICorrelationManager {
  /** Get current correlation context with metadata */
  currentContext(): ICorrelationContext | undefined;
  /** Clear all contexts (for testing/cleanup) */
  clearContext(): void;
  /** Get context stack for debugging */
  getContextStack(): readonly ICorrelationContext[];
}

/**
 * Async storage interface for correlation context propagation
 */
export interface IAsyncCorrelationStorage {
  /** Run function with correlation context */
  run<T>(context: ICorrelationContext, fn: () => T): T;
  /** Run async function with correlation context */
  runAsync<T>(context: ICorrelationContext, fn: () => Promise<T>): Promise<T>;
  /** Get current correlation context */
  getContext(): ICorrelationContext | undefined;
  /** Check if storage is available */
  isAvailable(): boolean;
}

/**
 * Configuration for correlation manager
 */
export interface ICorrelationManagerConfig {
  /** Maximum context stack size */
  maxStackSize?: number;
  /** Enable automatic cleanup */
  enableAutoCleanup?: boolean;
  /** Context timeout in milliseconds */
  contextTimeoutMs?: number;
  /** Custom correlation ID generator */
  generator?: ICorrelationIdGenerator;
  /** Platform-specific options */
  platformOptions?: Record<string, unknown>;
}

/**
 * Factory for creating platform-appropriate correlation managers
 */
export interface ICorrelationManagerFactory {
  /** Create correlation manager for current platform */
  create(config?: ICorrelationManagerConfig): IEnhancedCorrelationManager;
  /** Create correlation manager for specific platform */
  createForPlatform(platform: CorrelationPlatform, config?: ICorrelationManagerConfig): IEnhancedCorrelationManager;
}

/**
 * Middleware interface for chain of responsibility pattern
 */
export interface ICorrelationMiddleware {
  /** Process correlation context */
  process(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext>;
  /** Set next middleware in chain */
  setNext(middleware?: ICorrelationMiddleware): void;
  /** Get middleware name for debugging */
  getName(): string;
}

/**
 * Middleware configuration options
 */
export interface ICorrelationMiddlewareConfig {
  /** Middleware name */
  name?: string;
  /** Enable middleware */
  enabled?: boolean;
  /** Middleware-specific options */
  options?: Record<string, unknown>;
}

/**
 * Correlation propagation strategies
 */
export enum CorrelationPropagationStrategy {
  /** Automatic propagation using AsyncLocalStorage (Node.js) */
  ASYNC_LOCAL_STORAGE = "async-local-storage",
  /** Manual propagation using context stack */
  MANUAL_CONTEXT_STACK = "manual-context-stack",
  /** Browser-specific propagation using WeakMap */
  BROWSER_WEAKMAP = "browser-weakmap",
  /** No propagation (disabled) */
  NONE = "none",
}

/**
 * Platform types for correlation management
 */
export enum CorrelationPlatform {
  NODE = "node",
  BROWSER = "browser",
  WEB_WORKER = "web-worker",
  ELECTRON_MAIN = "electron-main",
  ELECTRON_RENDERER = "electron-renderer",
  REACT_NATIVE = "react-native",
}

/**
 * Correlation middleware chain interface
 */
export interface ICorrelationMiddlewareChain {
  /** Add middleware to chain */
  add(middleware: ICorrelationMiddleware): this;
  /** Remove middleware from chain */
  remove(middlewareName: string): boolean;
  /** Process context through entire chain */
  process(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext>;
  /** Get all middleware names in chain */
  getMiddlewareNames(): string[];
  /** Clear all middleware */
  clear(): void;
}
