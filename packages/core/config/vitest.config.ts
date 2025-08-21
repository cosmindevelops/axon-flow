/**
 * Vitest configuration for @axon/config package
 */

import baseConfig from "@axon/vitest-config";
import { defineProject, mergeConfig } from "vitest/config";

export default defineProject(
  mergeConfig(baseConfig, {
    test: {
      name: "@axon/config",
      root: "./",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      setupFiles: ["./tests/test-setup.ts"],
      coverage: {
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
