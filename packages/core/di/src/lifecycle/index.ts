/**
 * Lifecycle module exports
 *
 * Complete lifecycle management system for dependency injection
 */

// Types and interfaces
export type * from "./lifecycle.types.js";

// Core lifecycle implementations
export {
  SingletonLifecycleManager,
  TransientLifecycleManager,
  ScopedLifecycleManager,
  ScopeManager,
  LifecycleFactory,
  defaultLifecycleFactory,
} from "./lifecycle.classes.js";
