import { describe, expect, it } from 'vitest';

import { runCommand, type CommandResult } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.1 — Running `pnpm install` from the root completes successfully within 60 seconds.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.1)
 */
describe('[IU-1][V1.1] pnpm install performance', () => {
  const projectRoot = resolveProjectPath();

  it('completes `pnpm install --frozen-lockfile` in ≤ 60s', () => {
    const result: CommandResult = runCommand(
      'pnpm',
      ['install', '--frozen-lockfile', '--reporter=silent', '--ignore-scripts'],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          HUSKY: '0',
          SKIP_HUSKY: '1',
          CI: '1',
        },
        timeoutMs: 120_000,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeLessThanOrEqual(60_000);
  });
});
