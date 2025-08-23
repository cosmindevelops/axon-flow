/**
 * Platform type exports
 *
 * Barrel export for all platform-specific and cross-platform types
 * including Node.js, browser, and common abstractions.
 *
 * ## Conditional Platform Loading
 * Tree-shakeable platform-specific exports for optimal bundle size:
 *
 * ```typescript
 * // Node.js-only imports (zero cost in browser bundles)
 * import type { INodeInfo } from '@axon/types/platform/node';
 *
 * // Browser-only imports (zero cost in Node.js bundles)
 * import type { IBrowserInfo } from '@axon/types/platform/browser';
 *
 * // Universal cross-platform types
 * import type { IPlatformInfo } from '@axon/types/platform/common';
 * ```
 */

// Export all subdomain types and schemas with enhanced organization
export * from "./browser/index.js";
export * from "./node/index.js";
export * from "./common/index.js";

// Re-export platform detection utilities for convenience
export { platformDetection } from "./common/common.types.js";
