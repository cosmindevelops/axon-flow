/**
 * Decorators module exports
 *
 * TypeScript decorators for dependency injection with cross-platform metadata handling
 */

// Types and interfaces
export type * from "./decorators.types.js";

// Constants
export { DECORATOR_METADATA_KEYS } from "./decorators.types.js";

// Validation schemas
export * from "./decorators.schemas.js";

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
