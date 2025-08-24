/**
 * Vitest configuration for @axon/config package
 */

import { defineProject, mergeConfig } from "vitest/config";
import { baseConfig } from "../../../tools/config/vitest/base.ts";

export default defineProject(
  mergeConfig(baseConfig, {
    test: {
      name: "@axon/config",
      root: "./",
      include: ["tests/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      coverage: {
        enabled: true,
        include: ["src/**/*.{ts,tsx}"],
      },
    },
  }),
);
