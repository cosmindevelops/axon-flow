/**
 * Platform type exports
 *
 * Barrel export for all platform-specific and cross-platform types
 * including Node.js, browser, and common abstractions.
 */

// Export all subdomain types and schemas
export * from "./browser/index.js";
export * from "./node/index.js";
export * from "./common/index.js";
