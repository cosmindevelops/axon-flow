/**
 * Core platform types and identifiers
 */

// Core platform identifiers
export type PlatformId = string;
export type CorrelationId = string;

// Basic utility types for the platform
export type Timestamp = string; // ISO 8601 timestamp
export type Version = string; // Semantic version string

// Export all subdomain types and schemas
export * from "./agent/index.js";
export * from "./message/index.js";
export * from "./registry/index.js";
export * from "./task/index.js";
export * from "./workflow/index.js";
