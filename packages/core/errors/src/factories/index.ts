/**
 * Factory exports - comprehensive type-safe error factory system
 */

// Export simple factory types (basic functionality)
export type * from "./simple/index.js";

// Export domain factory types (advanced functionality with pooling and metrics)
export type * from "./domain/index.js";

// Export simple factory classes and functions with aliases to avoid conflicts
export {
  EnhancedErrorFactory as SimpleErrorFactory,
  defaultEnhancedFactory as defaultSimpleFactory,
  createEnhancedFactory as createSimpleFactory,
} from "./simple/index.js";

// Export domain factory schemas and validation functions
export * from "./domain/index.js";

// Re-export the simple factory as the default for backward compatibility
export { EnhancedErrorFactory, defaultEnhancedFactory, createEnhancedFactory } from "./simple/index.js";
