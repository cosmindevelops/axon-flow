import baseConfig from "@axon/vitest-config/base";
import { glob } from "glob";
import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";

export default defineConfig(async () => {
  // Dynamically discover all package configurations
  const packageConfigs = await glob("packages/*/vitest.config.ts", {
    cwd: process.cwd(),
    absolute: false,
  });

  // Dynamically discover test directories
  const testDirs = await glob("tests/*/", {
    cwd: process.cwd(),
    absolute: false,
  });

  // Create workspace-specific configuration that extends the base
  const workspaceConfig = {
    // Projects configuration using the modern projects field
    projects: [
      // Package-specific projects (discovered dynamically)
      ...packageConfigs,

      // Integration and E2E test projects
      ...testDirs.map((testDir) => ({
        test: {
          name: `integration-${path.basename(testDir)}`,
          root: testDir,
          include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
          testTimeout: 30000, // Longer timeout for integration tests
        },
      })),

      // Global configuration fallback for files without specific configs
      {
        test: {
          name: "workspace-fallback",
          root: "./",
          include: [
            "**/*.{test,spec}.{ts,tsx,js,jsx}",
            "!**/node_modules/**",
            "!**/packages/**", // Exclude packages with their own configs
            "!**/tests/**", // Exclude integration tests
          ],
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

  // Merge base configuration with workspace-specific settings
  return mergeConfig(baseConfig, workspaceConfig);
});
