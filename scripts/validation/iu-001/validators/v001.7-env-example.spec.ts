import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.7 — Environment variable handling is centralized with `.env.example` files.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.7)
 */
describe('[IU-1][V1.7] Environment template', () => {
  const projectRoot = resolveProjectPath();
  const envPath = join(projectRoot, '.env.example');

  it('provides a root `.env.example` with core variables', () => {
    expect(existsSync(envPath)).toBe(true);
    const envFile = readFileSync(envPath, 'utf-8');
    expect(envFile.includes('NODE_ENV=')).toBe(true);
    expect(envFile.includes('TURBO_TEAM=')).toBe(true);
    expect(envFile.includes('ENABLE_REMOTE_CACHE')).toBe(true);
  });
});
