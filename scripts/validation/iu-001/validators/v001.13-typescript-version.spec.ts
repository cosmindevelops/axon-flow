import { describe, it, expect } from 'vitest';

import { findWorkspacePackages, type WorkspacePackage } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.13 — TypeScript version is consistent across all packages (5.3+).
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.13)
 */
describe('[IU-1][V1.13] TypeScript version alignment', () => {
  const projectRoot = resolveProjectPath();
  const packages: WorkspacePackage[] = findWorkspacePackages(projectRoot);

  it('ensures TypeScript >= 5.3 and consistent across workspaces', () => {
    const versions = new Set<string>();

    for (const workspacePackage of packages) {
      const devDependencies = workspacePackage.manifest.devDependencies;
      if (!devDependencies?.typescript) {
        continue;
      }
      versions.add(devDependencies.typescript);
      expect(parseFloat(devDependencies.typescript.replace(/[^0-9.]/g, ''))).toBeGreaterThanOrEqual(
        5.3
      );
    }

    expect(versions.size <= 1).toBe(true);
  });
});
