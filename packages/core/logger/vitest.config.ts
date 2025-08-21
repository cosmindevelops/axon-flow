/**
 * Vitest configuration for @axon/logger package
 */

import { defineProject, mergeConfig } from "vitest/config";
import baseConfig from "@axon/vitest-config/base";

export default defineProject(
  mergeConfig(baseConfig, {
    test: {
      name: "@axon/logger",
      root: "./",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
