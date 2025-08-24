/**
 * Axon Flow TypeScript Configuration
 *
 * Consolidated TypeScript configuration for the Axon Flow monorepo.
 * Provides optimized configuration supporting both Node.js and React environments.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentFileUrl = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFileUrl);

// Export configuration path for easy consumption
export const configPath = join(currentDir, "base.json");

// Default export provides the base configuration path
export default configPath;
