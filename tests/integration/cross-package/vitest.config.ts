import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    passWithNoTests: true,
    include: ["**/*.test.ts"],
    testTimeout: 30000,
    // No setup files to avoid path issues
    setupFiles: [],
  },
});
