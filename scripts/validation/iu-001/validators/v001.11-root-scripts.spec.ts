import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.11 — The root `package.json` includes all necessary workspace scripts.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.11)
 */
describe('[IU-1][V1.11] Root workspace scripts', () => {
  const projectRoot = resolveProjectPath();
  const rootManifest = JSON.parse(readFileSync(`${projectRoot}/package.json`, 'utf-8')) as {
    scripts?: Record<string, string>;
  };

  const requiredScripts = [
    'lint',
    'build',
    'test',
    'dev',
    'typecheck',
    'format',
    'format:check',
    'validate:env',
    'verify',
    'clean',
    'validate',
    'benchmark',
  ];

  it('declares expected scripts', () => {
    expect(rootManifest.scripts).toBeDefined();
    for (const script of requiredScripts) {
      expect(rootManifest.scripts?.[script], `Missing root script ${script}`).toBeDefined();
    }
  });
});
