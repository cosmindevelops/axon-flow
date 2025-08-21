/**
 * Configuration Builder Pattern
 *
 * Provides a fluent API for composing configuration repositories
 * with environment-specific builders and performance optimizations.
 */

// Main builder exports
export * from "./config-builder.js";
export * from "./config-builder-factory.js";

// Environment-specific builders
export * from "./development-config-builder.js";
export * from "./production-config-builder.js";
export * from "./test-config-builder.js";

// Type definitions
export type * from "./config-builder.types.js";

// Utilities
export type * from "./utils/index.js";
