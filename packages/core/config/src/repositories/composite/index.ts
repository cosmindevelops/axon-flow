/**
 * Composite Repository Domain
 *
 * Composite configuration repositories that combine multiple data sources
 * with priority-based merging, hot-reloading support, and source management.
 * These repositories orchestrate multiple configuration sources.
 */

// Export composite repository implementations
export * from "./composite.classes.js";
export * from "./composite.types.js";
export * from "./composite.schemas.js";
