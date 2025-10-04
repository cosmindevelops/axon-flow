import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { findWorkspacePackages } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.15 — Prettier configuration is consistent across all workspaces.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.15)
 */
describe('[IU-1][V1.15] Prettier configuration', () => {
  const projectRoot = resolveProjectPath();
  const packages = findWorkspacePackages(projectRoot);

  it('ensures root prettier configuration exists', () => {
    expect(existsSync(join(projectRoot, '.prettierrc.json'))).toBe(true);
  });

  it('ensures workspace overrides (if any) reference the shared preset', () => {
    for (const workspacePackage of packages) {
      if (workspacePackage.dir === projectRoot) {
        continue;
      }

      const configPath = join(workspacePackage.dir, '.prettierrc.cjs');
      if (!existsSync(configPath)) {
        continue;
      }
      const content = readFileSync(configPath, 'utf-8');
      expect(content.includes("require('../../.prettierrc.json')")).toBe(true);
    }
  });
});
