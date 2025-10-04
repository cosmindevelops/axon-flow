/**
 * Lint-staged Configuration for Turborepo Monorepo
 *
 * Manual execution: pnpm lint-staged
 * Bypass (use sparingly): git commit --no-verify
 */

export default {
  '**/*.{js,jsx,ts,tsx,cjs,mjs}': [
    'pnpm exec prettier --cache --write',
    'node scripts/lint-staged-typecheck.js',
  ],

  // Other files: Format only
  '**/*.{json,jsonc,md,mdx,yml,yaml,graphql,css,scss,less,html}': [
    'pnpm exec prettier --cache --write',
  ],
};
