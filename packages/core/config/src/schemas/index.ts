/**
 * Configuration Schema Domain
 *
 * Comprehensive configuration validation schemas organized into
 * infrastructure and application domains for better separation
 * of concerns and maintainability.
 */

// Export infrastructure-level schemas (system/platform)
export * from "./infrastructure/index.js";

// Export application-level schemas (business logic)
export * from "./application/index.js";
