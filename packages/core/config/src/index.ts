/**
 * @axon/config - Configuration management with type safety and validation
 *
 * Repository pattern for configuration with Zod schema validation,
 * environment variable loading, and hierarchical configuration overrides.
 */

// Zod schemas (includes type exports)
export * from "./schemas/index.js";

// Configuration repository interfaces and base types
export type { IConfigRepository, BaseConfig } from "./types/index.js";

// Repository implementations
export * from "./repositories/index.js";

// Singleton instances
export * from "./instances/index.js";
