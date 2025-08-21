/**
 * @axon/typescript-config
 *
 * Centralized TypeScript configurations for Axon Flow monorepo.
 * Provides optimized configurations for different environments.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const currentFileUrl = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFileUrl);

// Export configuration paths for easy consumption
export const configs = {
  // Base configuration - core TypeScript settings with strict mode
  base: join(currentDir, "base.json"),

  // Node.js configuration - extends base with Node.js specific settings
  node: join(currentDir, "node.json"),

  // React configuration - extends base with JSX and DOM support
  react: join(currentDir, "react.json"),
};

// Default export provides the base configuration
export default configs.base;
