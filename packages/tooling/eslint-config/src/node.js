/**
 * @axon/eslint-config/node
 * 
 * Node.js specific ESLint configuration for Axon Flow.
 * Extends base configuration with Node.js patterns and rules.
 */

import baseConfig from "./base.js";

export default [
  // Include base configuration
  ...baseConfig,
  
  // Node.js specific configuration
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
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
      // Node.js specific architectural patterns
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

      // Provider Pattern Enforcement for Node.js services
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

      // Node.js performance and best practices
      "no-sync": "warn",
      "no-process-exit": "warn",
      "no-buffer-constructor": "error",
      "no-new-require": "error",
      "no-path-concat": "error",
    },
  },

  // CommonJS files specific rules
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
];