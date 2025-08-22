/**
 * Base Repository Domain
 *
 * Abstract base classes and shared types for all configuration repository implementations.
 * This subdomain provides the foundation for repository patterns including performance
 * tracking, caching, error handling, and change notification systems.
 */

// Export all base types
export type * from "./base.types.js";

// Export all base classes (abstract base classes for inheritance)
export * from "./base.classes.js";

// Export all base schemas
export * from "./base.schemas.js";
