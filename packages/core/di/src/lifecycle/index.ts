/**
 * Lifecycle module exports
 *
 * Complete lifecycle management system for dependency injection
 */

// Types and interfaces
export type * from "./lifecycle.types.js";

// Validation schemas
export * from "./lifecycle.schemas.js";

// Core lifecycle implementations
export {
  SingletonLifecycleManager,
  TransientLifecycleManager,
  ScopedLifecycleManager,
  ScopeManager,
  LifecycleFactory,
  defaultLifecycleFactory,
} from "./lifecycle.classes.js";

// Async disposal system
export type { DisposalState, IAsyncDisposalConfig, IDisposalContext, IDisposalMetrics } from "./lifecycle.classes.js";

export { AsyncDisposalManager, DisposalStateManager } from "./lifecycle.classes.js";
