/**
 * @axon/logger - High-Performance Structured Logging System
 *
 * Enterprise-grade logging with 10,000+ logs/second throughput featuring tiered
 * performance optimization, lazy loading, and zero-overhead abstractions.
 *
 * ## Lightweight Core Usage (Zero Overhead)
 * ```typescript
 * import type { ILogger } from '@axon/logger';
 * import { createLogger } from '@axon/logger';
 *
 * const logger = createLogger({ level: 'info' });
 * logger.info('Hello world');
 * ```
 *
 * ## High-Performance Usage (Object Pooling)
 * ```typescript
 * import { createHighPerformanceLogger } from '@axon/logger';
 *
 * const logger = createHighPerformanceLogger({
 *   poolSize: 100,
 *   enableCircuitBreaker: true
 * });
 * ```
 *
 * ## Environment-Optimized Usage
 * ```typescript
 * import { createProductionLogger, createDevelopmentLogger } from '@axon/logger';
 *
 * const logger = process.env.NODE_ENV === 'production'
 *   ? createProductionLogger()
 *   : createDevelopmentLogger();
 * ```
 *
 * ## Advanced Features (Lazy Loaded)
 * ```typescript
 * const performance = await import('@axon/logger/performance');
 * const circuitBreaker = await import('@axon/logger/circuit-breaker');
 * ```
 *
 * @since 0.1.0
 * @version 0.1.0
 * @module @axon/logger
 */

// ============================================================================
// TYPE-ONLY EXPORTS - Zero Runtime Impact
// ============================================================================

// Core logger interfaces and types (comprehensive export from main types barrel)
export type * from "./types/index.js";

// ============================================================================
// CORE LAYER - Essential Lightweight Logging
// ============================================================================

// Core logger classes (lightweight, always available)
export { PinoLogger, HighPerformancePinoLogger } from "./logger/logger.classes.js";

// ============================================================================
// PERFORMANCE LAYER - High-Throughput Features
// ============================================================================

// Object pool management (for high-throughput scenarios)
export * from "./pool/pool.classes.js";

// ============================================================================
// ADVANCED FEATURES - Component Systems
// ============================================================================

// Transport system for flexible logging destinations
export * from "./transport/transport.classes.js";

// Circuit breaker for resilient logging
export * from "./circuit-breaker/circuit-breaker.classes.js";

// Correlation ID management system
export * from "./correlation/correlation.classes.js";

// Performance monitoring and metrics
export * from "./performance/performance.classes.js";

// ============================================================================
// UTILITY LAYER - Supporting Functions
// ============================================================================

// Utility functions and helpers
export * from "./utils/utils.classes.js";

// ============================================================================
// SCHEMA LAYER - Runtime Validation
// ============================================================================

// All schemas exported from main logger schemas (avoids duplicate exports)
export * from "./logger/logger.schemas.js";

// ============================================================================
// INSTANCE LAYER - Pre-configured Ready-to-Use Loggers
// ============================================================================

// Default logger instances (tree-shakeable)
export { logger, highPerformanceLogger, productionLogger, developmentLogger } from "./instances/index.js";
