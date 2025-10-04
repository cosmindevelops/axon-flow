import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.20 — Pre-commit hooks are configured using Husky for code quality checks.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.20)
 */
describe('[IU-1][V1.20] Husky pre-commit hooks', () => {
  const projectRoot = resolveProjectPath();

  it('defines Husky prepare script in package.json', () => {
    const rootManifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    expect(rootManifest.scripts?.prepare).toBe('husky');
  });

  it('configures pre-commit hook executing lint-staged', () => {
    const preCommitPath = join(projectRoot, '.husky', 'pre-commit');
    expect(existsSync(preCommitPath)).toBe(true);
    const contents = readFileSync(preCommitPath, 'utf-8');
    expect(contents.includes('pnpm lint-staged')).toBe(true);
  });
});
