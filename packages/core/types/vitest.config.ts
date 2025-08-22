/**
 * Vitest configuration for @axon/types package
 */

import { defineProject, mergeConfig } from "vitest/config";
import { baseConfig } from "../../../tools/config/vitest/base.js";

export default defineProject(
  mergeConfig(baseConfig, {
    test: {
      name: "@axon/types",
      root: "./",
      include: ["tests/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      coverage: {
        enabled: true,
        include: ["src/**/*.{ts,tsx}"],
        thresholds: {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
      },
    },
  }),
);
