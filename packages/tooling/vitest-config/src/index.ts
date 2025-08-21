/**
 * @axon/vitest-config
 *
 * Centralized Vitest configuration for Axon Flow monorepo.
 * Provides a minimalistic, performance-focused base configuration.
 */

import baseConfig from "./base.js";

// Re-export the base configuration
export { default as base } from "./base.js";

// Default export provides the base configuration
export default baseConfig;
