/**
 * Vitest configuration for @axon/di package
 */

import path from "node:path";
import { defineProject, mergeConfig } from "vitest/config";
import { baseConfig } from "../../../tools/config/vitest/base.ts";

export default defineProject(
  mergeConfig(baseConfig, {
    test: {
      name: "@axon/di",
      root: "./",
      include: ["tests/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      coverage: {
        enabled: true,
        include: ["src/**/*.{ts,tsx}"],
        thresholds: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
    },
    resolve: {
      alias: {
        "@axon/config": path.resolve(__dirname, "../config/src"),
        "@axon/types": path.resolve(__dirname, "../types/src"),
        "@axon/logger": path.resolve(__dirname, "../logger/src"),
        "@axon/errors": path.resolve(__dirname, "../errors/src"),
        "@axon/di": path.resolve(__dirname, "./src"),
      },
    },
  }),
);
