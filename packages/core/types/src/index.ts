/**
 * @axon/types - TypeScript type definitions for Axon Flow
 *
 * Core type definitions for the entire Axon Flow platform.
 * This package provides zero-overhead type abstractions that serve
 * as the foundation for all other packages in the monorepo.
 */

// Core platform types
export type { CorrelationId, Timestamp, PlatformId, Version } from "./core/index.js";
export type * from "./core/agent.types.js";
export type * from "./core/registry.types.js";
export type * from "./core/task.types.js";
export type * from "./core/message.types.js";
export type * from "./core/workflow.types.js";

// Status and state types
export type * from "./status/index.js";

// Environment configuration types
export type * from "./environment/index.js";

// Configuration and provider types
export type * from "./config/index.js";

// Logging and error types
export type * from "./logging/index.js";

// Platform-specific types
export * from "./platform/index.js";

// Utility types and type guards
export * from "./utils/branded.types.js";
export * from "./utils/guards.js";
