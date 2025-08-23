/**
 * @axon/logger - High-performance structured logging with Pino
 *
 * High-performance structured JSON logging with:
 * - Object pooling for reduced GC pressure
 * - Circuit breaker pattern for resilient logging
 * - Multiple transport support (console, file, remote)
 * - Performance monitoring and metrics
 * - Environment-specific optimizations
 * - Correlation ID support
 * - 10,000+ logs/second throughput
 */

// Logger types and interfaces
export type * from "./types/index.js";

// Logger implementation classes
export * from "./logger/logger.classes.js";

// Transport providers
export * from "./transport/transport.classes.js";

// Object pooling utilities
export * from "./pool/pool.classes.js";

// Circuit breaker implementation
export * from "./circuit-breaker/circuit-breaker.classes.js";

// Correlation ID management
export * from "./correlation/index.js";

// Utilities
export * from "./utils/index.js";

// Enhanced performance tracking
export * from "./performance/index.js";

// Optimized logger instances
export * from "./instances/index.js";
