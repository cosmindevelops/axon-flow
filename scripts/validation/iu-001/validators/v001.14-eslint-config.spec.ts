import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { findWorkspacePackages, type WorkspacePackage } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.14 — ESLint configuration is shared and extends from root config.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.14)
 */
describe('[IU-1][V1.14] ESLint inheritance', () => {
  const projectRoot = resolveProjectPath();
  const packages: WorkspacePackage[] = findWorkspacePackages(projectRoot);

  it('ensures workspace eslint configs delegate to shared presets', () => {
    for (const workspacePackage of packages) {
      if (workspacePackage.dir === projectRoot) {
        continue; // root config is canonical
      }

      const configPath = join(workspacePackage.dir, 'eslint.config.js');
      if (!existsSync(configPath)) {
        continue;
      }

      const configSource = readFileSync(configPath, 'utf-8');
      expect(/\.\.[/\\]eslint/i.test(configSource)).toBe(true);
    }
  });
});
