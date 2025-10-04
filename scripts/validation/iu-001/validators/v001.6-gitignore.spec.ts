import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.6 — `.gitignore` includes all necessary exclusions for monorepo development.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.6)
 */
describe('[IU-1][V1.6] Git ignore policy', () => {
  const projectRoot = resolveProjectPath();
  const gitignore = readFileSync(`${projectRoot}/.gitignore`, 'utf-8');

  const requiredEntries = ['node_modules/', '.turbo/', 'dist', 'coverage', '.env', '.pnpm'];

  it('contains required patterns', () => {
    for (const entry of requiredEntries) {
      expect(gitignore.includes(entry), `Missing ${entry} entry`).toBe(true);
    }
  });
});
