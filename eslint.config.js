import tseslint from "typescript-eslint";
import axonConfig from "./packages/tooling/eslint-config/src/base.js";

export default tseslint.config(
  ...axonConfig,

  {
    files: ["packages/core/**/*.{js,mjs,cjs,ts,tsx}", "apps/**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./packages/core/*/tsconfig.json", "./apps/*/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: [
      "**/tsup.config.ts",
      "**/vite.config.ts",
      "**/vitest.config.ts",
      "**/webpack.config.ts",
      "**/rollup.config.ts",
      "packages/tooling/**/*",
      "tools/scripts/*",
      "**/tooling/**/*",
    ],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },

  // Disable type-aware linting for test files to avoid TSConfig scope issues
  {
    files: ["packages/core/**/tests/**/*.test.ts", "packages/core/**/tests/**/*.test.tsx"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },

  {
    ignores: ["eslint.config.js", "packages/core/types/tests/**/*"],
  },
);
