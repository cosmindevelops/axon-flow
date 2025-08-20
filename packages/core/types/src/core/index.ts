/**
 * Core platform types and identifiers
 */

// Core platform identifiers
export type PlatformId = string;
export type CorrelationId = string;

// Basic utility types for the platform
export type Timestamp = string; // ISO 8601 timestamp
export type Version = string; // Semantic version string

// Export all agent types
export type * from "./agent.types.js";

// Export all registry types
export type * from "./registry.types.js";

// Export all task types
export type * from "./task.types.js";

// Export all message types
export type * from "./message.types.js";

// Export all workflow and saga types
export type * from "./workflow.types.js";
