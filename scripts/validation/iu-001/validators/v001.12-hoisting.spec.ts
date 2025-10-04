import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.12 — Dependency hoisting is optimized to reduce duplication.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.12)
 */
describe('[IU-1][V1.12] pnpm hoisting policy', () => {
  const projectRoot = resolveProjectPath();
  const npmrc = readFileSync(`${projectRoot}/.npmrc`, 'utf-8');

  it('configures pnpm to avoid shameful hoisting and prefer workspace packages', () => {
    expect(npmrc.includes('shamefully-hoist=false')).toBe(true);
    expect(npmrc.includes('prefer-workspace-packages=true')).toBe(true);
    expect(npmrc.includes('node-linker=pnpm')).toBe(true);
    expect(npmrc.includes('store-dir=.pnpm/.pnpm-store')).toBe(true);
  });
});
