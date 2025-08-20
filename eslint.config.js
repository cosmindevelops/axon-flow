import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json", "./apps/*/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enhanced TypeScript-specific rules (building on strict configs)
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Additional TypeScript performance and quality rules
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",

      // Additional strict type-checking rules
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/prefer-promise-reject-errors": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],

      // Enhanced naming conventions for Axon Flow patterns
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

      // Semantic Preservation Rules
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "warn",

      // Security and safety enhancements
      "@typescript-eslint/no-base-to-string": "error",
      "@typescript-eslint/no-confusing-void-expression": "error",
      "@typescript-eslint/no-meaningless-void-operator": "error",
      "@typescript-eslint/no-unsafe-unary-minus": "error",

      // Performance and best practices
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/prefer-reduce-type-parameter": "error",

      // General JavaScript/TypeScript rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "no-duplicate-imports": "off", // Disabled in favor of @typescript-eslint/consistent-type-imports
      "no-useless-rename": "error",
      "prefer-destructuring": "warn",
    },
  },
  {
    // Test file configuration with relaxed rules for TDD-friendly development
    files: ["**/*.test.{js,ts,tsx}", "**/*.spec.{js,ts,tsx}", "tests/**/*"],
    rules: {
      // Relaxed rules for test files
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      "no-console": "off",
      // Allow test-specific patterns
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    // Configuration files with relaxed rules
    files: ["*.config.{js,ts,mjs}", "**/*.config.{js,ts,mjs}", ".eslintrc.{js,cjs}"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-console": "off",
    },
  },
  {
    // CommonJS files (.cjs) configuration
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        // Node.js globals
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
      // Disable all TypeScript rules for plain JS CommonJS files
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
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // Basic JavaScript rules
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "prefer-const": "warn",
      "no-var": "warn",
    },
  },
  {
    // Ignore patterns optimized for monorepo structure
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/build/",
      "**/.next/",
      "**/coverage/",
      "**/.turbo/",
      "**/.changeset/",
      "**/storybook-static/",
      // Additional monorepo ignores
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
