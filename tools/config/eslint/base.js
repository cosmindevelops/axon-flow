/**
 * Axon Flow ESLint Configuration
 *
 * Consolidated ESLint configuration for the Axon Flow monorepo.
 * Provides relaxed, TDD-friendly rules with architecture compliance.
 */

import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript ESLint configuration - using recommended only (no type-aware initially)
  ...tseslint.configs.recommended,

  // Add type-aware configuration for files that need it (excluding test files)
  {
    files: [
      "packages/core/**/*.{js,mjs,cjs,ts,tsx}",
      "apps/**/*.{js,mjs,cjs,ts,tsx}",
      "!**/*.test.{js,ts,tsx,jsx}",
      "!**/*.spec.{js,ts,tsx,jsx}",
      "!**/*.config.{js,ts,mjs}",
      "!**/tools/**/*",
      "!**/tooling/**/*",
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Universal globals
        console: "readonly",
        process: "readonly",
        global: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Browser globals for React/Frontend
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URLSearchParams: "readonly",
        URL: "readonly",
        FormData: "readonly",
        File: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        EventTarget: "readonly",
        HTMLElement: "readonly",
        Element: "readonly",
        Node: "readonly",
        // Node.js globals
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^React$",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-exports": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",

      // Naming conventions - preserved for architecture compliance
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "interface",
          format: ["PascalCase"],
          prefix: ["I"],
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "enum",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },
        {
          selector: "class",
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
      ],

      // Axon Flow Architecture Compliance
      "no-restricted-imports": [
        "warn", // Changed from error to warn for relaxed approach
        {
          patterns: [
            {
              group: ["@axon/agents/*", "**/agents/**"],
              message:
                "Direct agent imports violate Hub-centric architecture. Use message-based communication through RabbitMQ.",
            },
            {
              group: ["aws-sdk", "azure-*", "gcp-*", "@google-cloud/*"],
              message: "Direct cloud service imports violate Provider Pattern. Use I*Provider interfaces instead.",
            },
          ],
          paths: [
            {
              name: "lodash",
              message:
                "Use native JavaScript methods instead of lodash for better performance and smaller bundle size.",
            },
            {
              name: "moment",
              message: "Use native Date API or date-fns for better performance and tree-shaking.",
            },
          ],
        },
      ],

      // Performance and quality rules - kept minimal
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // General JavaScript rules
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "prefer-const": "warn",
      "no-var": "error",
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-duplicate-imports": "off",
      "no-useless-rename": "warn",
      "prefer-destructuring": "off",

      // Node.js specific rules
      "no-sync": "warn",
      "no-process-exit": "warn",
      "no-buffer-constructor": "error",
      "no-new-require": "error",
      "no-path-concat": "error",
    },
  },

  // Test files configuration - relaxed but still with meaningful checks
  {
    files: ["**/*.test.{js,ts,tsx,jsx}", "**/*.spec.{js,ts,tsx,jsx}", "tests/**/*", "**/tests/**/*"],
    languageOptions: {
      parserOptions: {
        project: false, // Disable type-aware linting for tests to avoid tsconfig issues
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        vitest: "readonly",
        // Node.js testing globals
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      // Enable basic TypeScript checking but relaxed
      "@typescript-eslint/no-explicit-any": "warn", // Changed from "off" to "warn"
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }], // Enable unused vars checking
      
      // Keep these off for test flexibility
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      
      // Disable type-aware rules since we can't use project: true for tests
      "@typescript-eslint/consistent-type-exports": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-import-type-side-effects": "off",
      
      // General rules
      "no-console": "off",
      "prefer-const": "warn",
      "no-var": "error",
      "prefer-destructuring": "off",
    },
  },

  // Configuration files - very relaxed
  {
    files: ["*.config.{js,ts,mjs}", "**/*.config.{js,ts,mjs}", ".eslintrc.{js,cjs}", "tools/**/*", "**/tooling/**/*"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "no-console": "off",
    },
  },

  // CommonJS files
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "prefer-const": "warn",
      "no-var": "warn",
    },
  },

  // Global ignores - only ignore auto-generated and build artifacts
  {
    ignores: [
      // Build artifacts and dependencies
      "**/node_modules/",
      "**/dist/",
      "**/build/",
      "**/.next/",
      "**/lib/",
      "**/.turbo/",
      "**/.changeset/",
      
      // Test artifacts and coverage reports
      "**/coverage/",
      "**/test-results/",
      "**/junit.xml",
      "**/test-report.html",
      "**/.nyc_output/",
      "**/storybook-static/",
      
      // Temporary and cache files
      "**/.cache/",
      "**/tmp/",
      "**/temp/",
      "**/logs/",
      "**/*.log",
      "**/.tsbuildinfo",
      
      // Environment files (except example)
      "**/.env*",
      "!**/.env.example",
      
      // Auto-generated files
      "**/generated/",
      "**/auto-generated/",
      "**/*.generated.{js,ts,tsx}",
      "**/schema.prisma.ts", // Prisma generated files
      "**/graphql-types.ts", // GraphQL generated types
    ],
  },

  // Prettier integration - MUST be last to override conflicting rules
  eslintConfigPrettier,
);
