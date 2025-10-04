import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginPrettier from 'eslint-plugin-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsconfigPath = path.resolve(__dirname, 'tsconfig.json');
const prettierRcPath = path.resolve(__dirname, '.prettierrc.json');
const prettierRuleConfig = JSON.parse(readFileSync(prettierRcPath, 'utf-8'));

const ignorePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.turbo/**',
  '**/.next/**',
  '**/coverage/**',
  '**/generated/**',
  '**/.pnpm/**',
  '**/*.d.ts',
];

const recommendedTypeScriptRuleSets = [
  ...tseslint.configs.recommended.slice(1),
  ...tseslint.configs.recommendedTypeChecked.slice(1),
];

const recommendedTypeScriptRules = recommendedTypeScriptRuleSets.reduce(
  (rules, config) => ({
    ...rules,
    ...(config.rules ?? {}),
  }),
  {}
);

export const baseConfigLayers = tseslint.config(
  {
    ignores: ignorePatterns,
  },
  {
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        ...globals.es2024,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          tsconfigPath,
          './scripts/tsconfig.json',
          './scripts/validation/tsconfig.eslint.json',
          './packages/tsconfig.json',
          './apps/tsconfig.json',
          './services/tsconfig.json',
        ],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.es2024,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: tsconfigPath,
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      ...recommendedTypeScriptRules,
      'no-console': ['warn', { allow: ['error'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: '@axon/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  }
);

export const prettierConfigLayers = [
  eslintConfigPrettier,
  {
    name: 'axon/prettier-plugin',
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': ['error', prettierRuleConfig],
    },
  },
];

const validationSpecOverrides = {
  files: ['scripts/validation/**/*.spec.ts', 'scripts/validation/orchestrator/**/*.ts'],
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
  },
};

export const baseConfig = [...baseConfigLayers, ...prettierConfigLayers, validationSpecOverrides];

export default baseConfig;
