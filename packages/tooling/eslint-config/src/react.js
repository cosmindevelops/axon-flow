/**
 * @axon/eslint-config/react
 *
 * React specific ESLint configuration for Axon Flow.
 * Extends base configuration with React, JSX, and accessibility rules.
 */

import baseConfig from "./base.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

export default [
  // Include base configuration
  ...baseConfig,

  // React specific configuration
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    languageOptions: {
      globals: {
        // Browser globals for React applications
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
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
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React Core Rules
      "react/jsx-uses-react": "off", // Not needed with new JSX transform
      "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off", // Using TypeScript for prop validation
      "react/display-name": "warn",
      "react/no-children-prop": "error",
      "react/no-danger": "warn",
      "react/no-danger-with-children": "error",
      "react/no-deprecated": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-find-dom-node": "error",
      "react/no-is-mounted": "error",
      "react/no-render-return-value": "error",
      "react/no-string-refs": "error",
      "react/no-unescaped-entities": "error",
      "react/no-unknown-property": "error",
      "react/no-unsafe": "warn",
      "react/require-render-return": "error",

      // JSX Rules
      "react/jsx-boolean-value": ["warn", "never"],
      "react/jsx-closing-bracket-location": "warn",
      "react/jsx-closing-tag-location": "warn",
      "react/jsx-curly-spacing": ["warn", "never"],
      "react/jsx-equals-spacing": ["warn", "never"],
      "react/jsx-first-prop-new-line": ["warn", "multiline-multiprop"],
      "react/jsx-indent": ["warn", 2],
      "react/jsx-indent-props": ["warn", 2],
      "react/jsx-key": "error",
      "react/jsx-max-props-per-line": ["warn", { maximum: 1, when: "multiline" }],
      "react/jsx-no-bind": ["warn", { allowArrowFunctions: true, allowBind: false, ignoreRefs: true }],
      "react/jsx-no-comment-textnodes": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-pascal-case": "warn",
      "react/jsx-tag-spacing": "warn",
      "react/jsx-wrap-multilines": "warn",

      // React Hooks Rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Accessibility Rules
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/img-redundant-alt": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/mouse-events-have-key-events": "error",
      "jsx-a11y/no-access-key": "error",
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/scope": "error",
      "jsx-a11y/tabindex-no-positive": "error",

      // React performance rules
      "react/jsx-no-constructed-context-values": "warn",
      "react/no-array-index-key": "warn",
      "react/no-object-type-as-default-prop": "error",
      "react/no-unstable-nested-components": "error",
    },
  },

  // TypeScript + React specific rules
  {
    files: ["**/*.tsx"],
    rules: {
      // TypeScript specific overrides for React
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^React$",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Next.js specific rules (if using Next.js)
  {
    files: ["**/pages/**/*.{jsx,tsx}", "**/app/**/*.{jsx,tsx}", "**/src/app/**/*.{jsx,tsx}"],
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      // Allow default exports for Next.js pages
      "import/no-default-export": "off",
    },
  },
];
