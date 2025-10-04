import semverRegex from 'semver-regex';
import { describe, it, expect } from 'vitest';

import { findWorkspacePackages } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.9 — Package versioning follows semantic versioning (semver) conventions.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.9)
 */
describe('[IU-1][V1.9] Package versioning', () => {
  const projectRoot = resolveProjectPath();
  const packages = findWorkspacePackages(projectRoot);

  it('ensures each package declares a semver-compliant version', () => {
    for (const workspacePackage of packages) {
      const version = workspacePackage.manifest.version as string | undefined;
      expect(version, `Package ${workspacePackage.dir} must declare a version`).toBeDefined();
      if (!version) {
        continue;
      }
      expect(
        semverRegex().test(version),
        `Package ${workspacePackage.dir} version must follow semver`
      ).toBe(true);
    }
  });
});
