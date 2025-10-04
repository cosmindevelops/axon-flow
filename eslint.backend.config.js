import globals from 'globals';
import nPlugin from 'eslint-plugin-n';
import tseslint from 'typescript-eslint';
import { baseConfigLayers, prettierConfigLayers } from './eslint.config.js';

const backendConfig = tseslint.config(
  ...baseConfigLayers,
  nPlugin.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      n: nPlugin,
    },
    rules: {
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unpublished-require': 'off',
      'n/no-unsupported-features/es-syntax': [
        'error',
        {
          ignores: ['modules'],
        },
      ],
    },
  },
  ...prettierConfigLayers
);

export default backendConfig;
