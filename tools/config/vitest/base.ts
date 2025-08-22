/**
 * Axon Flow Vitest Configuration
 *
 * Consolidated Vitest configuration for the Axon Flow monorepo.
 * Provides performance-optimized settings with workspace configuration.
 */

import { glob } from "glob";
import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";

const baseConfig = defineConfig({
  test: {
    // Performance optimizations
    globals: true,
    passWithNoTests: true,

    // Pool configuration - simplified
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        maxForks: "50%",
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
    reporters: ["default", "json"],
    outputFile: {
      json: "./test-results/vitest-report.json",
    },

    // Coverage configuration (disabled by default)
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.test.*",
        "**/*.spec.*",
        "**/types/**",
        "**/index.ts", // Barrel exports
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
      clean: true,
      cleanOnRerun: true,
      reportsDirectory: "./coverage",
    },

    // Environment
    environment: "node",

    // Watch mode
    watch: true,

    // Vitest UI
    open: false,
    ui: true,

    // Type checking (disabled by default for performance)
    typecheck: {
      enabled: false,
      tsconfig: "./tsconfig.json",
      checker: "tsc",
      allowJs: false,
      ignoreSourceErrors: false,
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
