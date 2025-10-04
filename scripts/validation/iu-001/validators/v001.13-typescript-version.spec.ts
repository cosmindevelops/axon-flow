import { describe, it, expect } from 'vitest';

import { findWorkspacePackages } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.13 — TypeScript version is consistent across all packages (5.3+).
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.13)
 */
describe('[IU-1][V1.13] TypeScript version alignment', () => {
  const projectRoot = resolveProjectPath();
  const packages = findWorkspacePackages(projectRoot);

  it('ensures TypeScript >= 5.3 and consistent across workspaces', () => {
    const versions = new Set<string>();

    for (const workspacePackage of packages) {
      const devDependencies = workspacePackage.manifest.devDependencies as
        | Record<string, string>
        | undefined;
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
