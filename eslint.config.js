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
    files: ["packages/core/**/tests/**/*.test.ts", "packages/core/**/tests/**/*.test.tsx", "**/tests/**/*.ts", "**/tests/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-for-in-array": "off",
      "@typescript-eslint/no-implied-eval": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/prefer-includes": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/prefer-readonly": "off",
      "@typescript-eslint/prefer-string-starts-ends-with": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    ignores: ["eslint.config.js", "packages/core/types/tests/**/*"],
  },
);
