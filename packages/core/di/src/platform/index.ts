/**
 * Platform compatibility module exports
 *
 * Cross-platform detection, validation, and optimization for dependency injection
 */

// Types and interfaces
export type * from "./platform.types.js";

// Core platform implementations
export {
  PlatformCompat,
  PlatformValidator,
  PlatformError,
  platformCompat,
  platformValidator,
  createPlatformCompat,
  createPlatformValidator,
  validateCurrentPlatform,
  getCurrentPlatformCapabilities,
  isPlatformSupported,
} from "./platform.classes.js";
