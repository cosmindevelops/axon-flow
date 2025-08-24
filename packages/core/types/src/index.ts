/**
 * @axon/types - Comprehensive TypeScript definitions for Axon Flow
 *
 * Core type system for the multi-agent orchestration platform providing zero-overhead
 * type abstractions with optimal tree-shaking and cross-environment compatibility.
 *
 * ## Type-Only Imports (Zero Runtime Cost)
 * ```typescript
 * import type { IAgentMetadata, TaskStatus, LogLevel } from '@axon/types';
 * ```
 *
 * ## Runtime Imports (Validation & Schemas)
 * ```typescript
 * import { agentMetadataSchema, taskStatusSchema } from '@axon/types';
 * ```
 *
 * ## Schema Inference Pattern
 * ```typescript
 * import { agentMetadataSchema, type InferredAgentMetadata } from '@axon/types';
 * ```
 *
 * @since 0.1.0
 * @version 0.1.0
 * @module @axon/types
 */

// ============================================================================
// TYPE-ONLY EXPORTS - Zero Runtime Impact
// ============================================================================

// Core platform identifiers and base types
export type { PlatformId, CorrelationId, Timestamp, Version } from "./core/index.js";

// Core platform types - Agent orchestration & messaging
export type * from "./core/agent/agent.types.js";
export type * from "./core/message/message.types.js";
export type * from "./core/registry/registry.types.js";
export type * from "./core/task/task.types.js";
export type * from "./core/workflow/workflow.types.js";

// Status and state management types
export type * from "./status/status.types.js";

// Environment configuration types
export type * from "./environment/environment.types.js";

// Configuration hierarchy and provider types
export type * from "./config/hierarchy/hierarchy.types.js";
export type * from "./config/provider/provider.types.js";
export type * from "./config/schema/schema.types.js";

// Logging system types
export type * from "./logging/entry/entry.types.js";
export type * from "./logging/error/error.types.js";
export type * from "./logging/performance/performance.types.js";

// Platform-specific types
export type * from "./platform/browser/browser.types.js";
export type * from "./platform/node/node.types.js";
export type * from "./platform/common/common.types.js";

// Utility types - Branded types and type guards
export type * from "./utils/branded/branded.types.js";
export type * from "./utils/guards/guards.types.js";

// ============================================================================
// RUNTIME EXPORTS - Validation Schemas & Type Guards
// ============================================================================

// Core platform schemas - Agent orchestration & messaging
export * from "./core/agent/agent.schemas.js";
export * from "./core/message/message.schemas.js";
export * from "./core/registry/registry.schemas.js";
export * from "./core/task/task.schemas.js";
export * from "./core/workflow/workflow.schemas.js";

// Status and state management schemas
export * from "./status/status.schemas.js";

// Environment configuration schemas
export * from "./environment/environment.schemas.js";

// Configuration hierarchy and provider schemas
export * from "./config/hierarchy/hierarchy.schemas.js";
export * from "./config/provider/provider.schemas.js";
export * from "./config/schema/schema.schemas.js";

// Logging system schemas
export * from "./logging/entry/entry.schemas.js";
export * from "./logging/error/error.schemas.js";
export * from "./logging/performance/performance.schemas.js";

// Platform-specific schemas
export * from "./platform/browser/browser.schemas.js";
export * from "./platform/node/node.schemas.js";
export * from "./platform/common/common.schemas.js";

// Utility schemas and type guards
export type * from "./utils/branded/branded.schemas.js";
export type * from "./utils/guards/guards.schemas.js";

// ============================================================================
// CLASS EXPORTS - Runtime Implementations
// ============================================================================

// Core platform classes (if any)
export type * from "./core/agent/agent.classes.js";
export type * from "./core/message/message.classes.js";
export type * from "./core/registry/registry.classes.js";
export type * from "./core/task/task.classes.js";
export type * from "./core/workflow/workflow.classes.js";

// Status and state management classes
export type * from "./status/status.classes.js";

// Environment configuration classes
export type * from "./environment/environment.classes.js";

// Configuration hierarchy and provider classes
export type * from "./config/hierarchy/hierarchy.classes.js";
export type * from "./config/provider/provider.classes.js";
export type * from "./config/schema/schema.classes.js";

// Logging system classes
export type * from "./logging/entry/entry.classes.js";
export type * from "./logging/error/error.classes.js";
export type * from "./logging/performance/performance.classes.js";

// Platform-specific classes
export type * from "./platform/browser/browser.classes.js";
export type * from "./platform/node/node.classes.js";
export type * from "./platform/common/common.classes.js";

// Utility classes and type guards
export type * from "./utils/branded/branded.classes.js";
export * from "./utils/guards/guards.classes.js";