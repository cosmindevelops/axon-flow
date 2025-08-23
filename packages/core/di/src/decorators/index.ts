/**
 * Decorators module exports
 *
 * TypeScript decorators for dependency injection with cross-platform metadata handling
 */

// Types and interfaces
export type * from "./decorators.types.js";

// Core decorator implementations
export {
  MetadataManager,
  defaultMetadataManager,
  Injectable,
  Inject,
  InjectProperty,
  Singleton,
  Transient,
  Scoped,
  Optional,
  Lazy,
} from "./decorators.classes.js";
