/**
 * @axon/vitest-config/base
 *
 * Core Vitest configuration for Axon Flow monorepo.
 * Provides performance-optimized settings with TypeScript support.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Performance optimizations
    globals: true,
    passWithNoTests: true,

    // Modern pool configuration - use 'forks' as default for better stability
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        maxForks: "50%", // Use percentage for better scaling
        minForks: 1,
      },
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: false, // Disabled by default for stability
        maxThreads: "50%",
        minThreads: 1,
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

    // Timeouts and retries
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    retry: 1,

    // Reporter configuration with modern options
    reporters: ["default", "json", "html"],
    outputFile: {
      json: "./test-results/vitest-report.json",
      html: "./test-results/vitest-report.html",
    },

    // Coverage configuration (disabled by default, enabled per project)
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
      // Modern coverage options
      clean: true,
      cleanOnRerun: true,
      reportsDirectory: "./coverage",
    },

    // Environment-specific settings (overridden by specific configs)
    environment: "node",

    // Watch mode optimizations
    watch: true,

    // Vitest UI integration
    open: false,
    ui: true,

    // Type checking integration with modern settings
    typecheck: {
      enabled: false, // Enable per package as needed
      tsconfig: "./tsconfig.json",
      checker: "tsc",
      allowJs: false,
      ignoreSourceErrors: false,
    },

    // Setup files (to be overridden by specific configs)
    setupFiles: [],

    // Modern snapshot configuration with better path handling
    resolveSnapshotPath: (testPath, snapExtension) => testPath.replace(/\.test\.([jt]sx?)$/, `.test${snapExtension}`),

    // Sequence configuration for better test ordering
    sequence: {
      concurrent: false,
      shuffle: {
        files: false,
        tests: false,
      },
    },

    // Modern diff configuration for better error display
    diff: {
      contextLines: 5,
      expand: false,
      omitAnnotationLines: false,
    },
  },
});
