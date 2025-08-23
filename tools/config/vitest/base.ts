/**
 * Axon Flow Vitest Configuration
 *
 * Consolidated Vitest configuration for the Axon Flow monorepo.
 * Provides performance-optimized settings with workspace configuration.
 */

import { glob } from "glob";
import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";

// Limit Node memory per worker to be WSL-friendly
const currentNodeOptions = process.env["NODE_OPTIONS"] ?? "";
if (!currentNodeOptions.includes("--max-old-space-size")) {
  process.env["NODE_OPTIONS"] = `${currentNodeOptions} --max-old-space-size=1536`.trim();
}

export const baseConfig = defineConfig({
  test: {
    // Performance optimizations
    globals: true,
    passWithNoTests: true,
    // Cap the total number of workers Vitest can spawn
    maxWorkers: 2,

    // Pool configuration - simplified to fix ERR_INVALID_FILE_URL_HOST
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false,
        // Hard cap to avoid overwhelming WSL
        maxForks: 2,
        minForks: 1,
      },
    },

    // File patterns
    include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/.cache/**",
      "**/tmp/**",
    ],

    // Timeouts - reasonable defaults
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    retry: 1,

    // Reporter configuration
    reporters: ["default"],

    // Coverage configuration (disabled by default to avoid URL issues)
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/*.config.*", "**/*.test.*", "**/*.spec.*", "**/types/**", "**/index.ts"],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      clean: true,
      cleanOnRerun: true,
    },

    // Environment
    environment: "node",

    // Watch mode
    watch: false,

    // Vitest UI - disabled by default to avoid dependency issues
    open: false,
    ui: false,

    // Type checking (disabled by default for performance)
    typecheck: {
      enabled: false,
    },

    // Setup files
    setupFiles: [],

    // Sequence configuration
    sequence: {
      concurrent: false,
      shuffle: {
        files: false,
        tests: false,
      },
    },
  },
});

export default defineConfig(async () => {
  const packageConfigs = await glob("packages/*/vitest.config.ts", {
    cwd: process.cwd(),
    absolute: false,
  });

  const testDirs = await glob("tests/*/", {
    cwd: process.cwd(),
    absolute: false,
  });

  const workspaceConfig = {
    projects: [
      ...packageConfigs,

      ...testDirs.map((testDir) => ({
        test: {
          name: `integration-${path.basename(testDir)}`,
          root: testDir,
          include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
          testTimeout: 30000,
        },
      })),
      {
        test: {
          name: "workspace-fallback",
          root: "./",
          include: ["**/*.{test,spec}.{ts,tsx,js,jsx}", "!**/node_modules/**", "!**/packages/**", "!**/tests/**"],
          coverage: {
            enabled: true,
            reportsDirectory: "./coverage",
            include: ["packages/*/src/**/*.{ts,tsx}"],
            thresholds: {
              global: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
              },
            },
          },
        },
      },
    ],
  };

  return mergeConfig(baseConfig, workspaceConfig);
});