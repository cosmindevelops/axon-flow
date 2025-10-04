import { describe, it, expect } from 'vitest';

import { runCommand } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.2 — `turbo run build` executes across all workspaces without errors.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.2)
 */
describe('[IU-1][V1.2] Turbo build execution', () => {
  const projectRoot = resolveProjectPath();

  it('runs `pnpm turbo run build` successfully', () => {
    const result = runCommand('pnpm', ['turbo', 'run', 'build'], {
      cwd: projectRoot,
      env: { ...process.env, CI: '1' },
      timeoutMs: 180_000,
    });

    expect(result.exitCode).toBe(0);
  });
});
