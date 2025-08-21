/**
 * @axon/eslint-config
 * 
 * Centralized ESLint configurations for Axon Flow monorepo.
 * Provides optimized configurations for different environments.
 */

// Export all configurations
export { default as base } from "./base.js";
export { default as node } from "./node.js";
export { default as react } from "./react.js";

// Export configurations by name for easy consumption
export const configs = {
  base: "./base.js",
  node: "./node.js",
  react: "./react.js",
};

// Default export provides the base configuration
export { default } from "./base.js";