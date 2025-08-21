/**
 * @axon/eslint-config/base
 *
 * Core ESLint configuration for Axon Flow monorepo.
 * Provides strict TypeScript linting with performance optimizations.
 */

import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript ESLint strict configuration
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Core configuration
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/consistent-type-exports": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
      "@typescript-eslint/require-array-sort-compare": "warn",
      "@typescript-eslint/strict-boolean-expressions": [
        "warn",
        {
          allowString: true,
          allowNumber: true,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: true,
          allowNullableNumber: true,
          allowAny: false,
        },
      ],

      // Enhanced naming conventions
      "@typescript-eslint/naming-convention": [
        "warn",
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
        "error",
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

      // Provider Pattern Enforcement
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration[source.value=/^(aws-sdk|@aws-sdk|azure-|@azure|@google-cloud)/] > ImportDefaultSpecifier",
          message:
            "Direct cloud service imports should use Provider Pattern. Create I*Provider interface and implementation.",
        },
        {
          selector: "NewExpression[callee.name=/^(S3|DynamoDB|CosmosDB|Firestore)$/]",
          message:
            "Direct service instantiation violates Provider Pattern. Use dependency injection with I*Provider interface.",
        },
      ],

      // Performance and quality rules
      "@typescript-eslint/explicit-function-return-type": [
        "off",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-confusing-void-expression": "warn",
      "@typescript-eslint/no-meaningless-void-operator": "warn",
      "@typescript-eslint/no-unsafe-unary-minus": "warn",
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/prefer-string-starts-ends-with": "warn",
      "@typescript-eslint/prefer-reduce-type-parameter": "warn",

      // General JavaScript rules
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "prefer-const": "warn",
      "no-var": "error",
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-duplicate-imports": "off",
      "no-useless-rename": "warn",
      "prefer-destructuring": "off",
    },
  },

  // Test files configuration
  {
    files: ["**/*.test.{js,ts,tsx}", "**/*.spec.{js,ts,tsx}", "tests/**/*", "**/tests/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      "no-console": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "prefer-destructuring": "off",
    },
  },

  // Configuration files
  {
    files: ["*.config.{js,ts,mjs}", "**/*.config.{js,ts,mjs}", ".eslintrc.{js,cjs}"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-console": "off",
    },
  },

  // Build configuration files (tsup, vite, etc.)
  {
    files: ["**/tsup.config.ts", "**/vite.config.ts", "**/webpack.config.ts", "**/rollup.config.ts"],
    languageOptions: {
      parserOptions: {
        project: null, // Disable type-aware linting for build configs
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },

  // Tooling package files (eslint-config, typescript-config)
  {
    files: ["packages/tooling/**/*", "**/tooling/**/*"],
    languageOptions: {
      parserOptions: {
        project: null, // Disable type-aware linting for tooling packages
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },

  // CommonJS files
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "prefer-const": "warn",
      "no-var": "warn",
    },
  },

  // Global ignores
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/build/",
      "**/.next/",
      "**/coverage/",
      "**/.turbo/",
      "**/.changeset/",
      "**/storybook-static/",
      "**/lib/",
      "**/.cache/",
      "**/tmp/",
      "**/logs/",
      "**/*.log",
      "**/.env*",
      "!**/.env.example",
    ],
  },

  // Prettier integration - MUST be last to override conflicting rules
  eslintConfigPrettier,
);
