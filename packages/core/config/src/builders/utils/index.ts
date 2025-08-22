/**
 * Builder Utilities Domain
 *
 * Performance optimization utilities for configuration builders including object pooling
 * and validation result caching. These utilities help improve performance when building
 * configurations repeatedly or when working with expensive validation operations.
 */

// Export all utility types
export type * from "./utils.types.js";

// Export performance utilities (merged object pooling and validation caching)
export * from "./utils.classes.js";

// Export all utility schemas
export * from "./utils.schemas.js";
