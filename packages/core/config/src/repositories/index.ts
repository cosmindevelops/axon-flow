/**
 * Configuration Repository Domain
 *
 * Comprehensive repository implementations for configuration data management
 * organized into specialized subdomains for different storage mechanisms
 * and architectural patterns.
 */

// Export base repository patterns and utilities (excluding CachedConfigRepository to avoid collision)
export type * from "./base/base.types.js";
export * from "./base/base.schemas.js";
export { BaseConfigRepository, CachedConfigRepository as AbstractCachedConfigRepository } from "./base/base.classes.js";

// Export memory-based repositories (caching and volatile storage)
export * from "./memory/index.js";

// Export storage-based repositories (persistent storage)
export * from "./storage/index.js";

// Export environment-based repositories (system configuration)
export * from "./environment/index.js";

// Export composite repositories (multi-source orchestration)
export * from "./composite/index.js";
