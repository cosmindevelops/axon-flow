import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { runCommand } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

interface TurboConfig {
  tasks: Record<
    string,
    {
      cache?: boolean;
      dependsOn?: string[];
      outputs?: string[];
    }
  >;
  remoteCache?: {
    enabled?: boolean;
  };
}

/**
 * V1.8 — Build cache is properly configured and functional in `.turbo` directory.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.8)
 */
describe('[IU-1][V1.8] Turborepo caching', () => {
  const projectRoot = resolveProjectPath();
  const turboConfig = JSON.parse(
    readFileSync(join(projectRoot, 'turbo.json'), 'utf-8')
  ) as TurboConfig;

  it('enables caching for build-critical tasks', () => {
    expect(turboConfig.tasks.build?.cache).toBe(true);
    expect(turboConfig.tasks.lint?.cache).toBe(true);
    expect(turboConfig.tasks.test?.cache).toBe(true);
  });

  it('produces local turbo cache directory after builds', { timeout: 150_000 }, () => {
    const turboDir = join(projectRoot, '.turbo');

    // Run a simple build to ensure cache directory is created
    if (!existsSync(turboDir)) {
      runCommand('pnpm', ['turbo', 'run', 'build', '--filter=@axon/validation'], {
        cwd: projectRoot,
        env: { ...process.env, CI: '1' },
        timeoutMs: 120_000,
      });
    }

    expect(existsSync(turboDir)).toBe(true);
  });
});
