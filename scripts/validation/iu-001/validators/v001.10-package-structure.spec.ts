import { describe, it, expect } from 'vitest';

import { findWorkspacePackages } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.10 — All workspace packages have consistent `package.json` structure.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.10)
 */
describe('[IU-1][V1.10] Package manifest structure', () => {
  const projectRoot = resolveProjectPath();
  const packages = findWorkspacePackages(projectRoot);

  it('ensures each package manifest contains required fields', () => {
    for (const workspacePackage of packages) {
      const manifest = workspacePackage.manifest;
      expect(manifest.name, `Package at ${workspacePackage.dir} missing name`).toBeDefined();
      expect(manifest.version, `Package at ${workspacePackage.dir} missing version`).toBeDefined();
      expect(typeof manifest.private).toBe('boolean');
      expect(typeof manifest.description === 'string').toBe(true);
    }
  });
});
