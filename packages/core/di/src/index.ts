/**
 * @axon/di - Lightweight dependency injection container
 *
 * High-performance DI container with factory pattern support,
 * lifecycle management, and comprehensive testing utilities.
 */

// Core container exports
export * from "./container/index.js";

// Lifecycle management exports
export * from "./lifecycle/index.js";

// Decorator exports
export * from "./decorators/index.js";

// Factory pattern integration
export * from "./factory/index.js";

// Performance optimizations
export * from "./pool/index.js";

// Platform compatibility
export * from "./platform/index.js";

// Shared types integration
export type { Status, Environment } from "@axon/types";
