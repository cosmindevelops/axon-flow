import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

interface TurboConfig {
  remoteCache?: {
    enabled?: boolean;
  };
}

/**
 * V1.17 — Remote caching is configurable but disabled by default for local development.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.17)
 */
describe('[IU-1][V1.17] Remote cache controls', () => {
  const projectRoot = resolveProjectPath();
  const turboConfig = JSON.parse(
    readFileSync(join(projectRoot, 'turbo.json'), 'utf-8')
  ) as TurboConfig;

  it('disables remote cache by default', () => {
    expect(turboConfig.remoteCache?.enabled ?? false).toBe(false);
  });

  it('documents cache toggles in `.env.example`', () => {
    const envFile = readFileSync(join(projectRoot, '.env.example'), 'utf-8');
    expect(envFile.includes('ENABLE_REMOTE_CACHE')).toBe(true);
    expect(envFile.includes('TURBO_TOKEN')).toBe(true);
  });
});
