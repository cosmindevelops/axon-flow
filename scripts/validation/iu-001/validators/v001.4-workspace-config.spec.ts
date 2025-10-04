import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.4 — Workspace dependencies are correctly configured in `pnpm-workspace.yaml`.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.4)
 */
describe('[IU-1][V1.4] pnpm workspace configuration', () => {
  const projectRoot = resolveProjectPath();
  const workspaceFile = readFileSync(`${projectRoot}/pnpm-workspace.yaml`, 'utf-8');

  it('includes required workspace globs', () => {
    const requiredGlobs = [
      "'apps/*'",
      "'packages/*'",
      "'services/*'",
      "'infrastructure/*'",
      "'scripts/*'",
    ];
    for (const glob of requiredGlobs) {
      expect(workspaceFile.includes(glob), `Workspace config missing ${glob}`).toBe(true);
    }
  });
});
