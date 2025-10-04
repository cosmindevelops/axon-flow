import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.19 — License file is present and consistent with project requirements.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.19)
 */
describe('[IU-1][V1.19] License compliance', () => {
  const projectRoot = resolveProjectPath();
  const licensePath = join(projectRoot, 'LICENSE');

  it('includes SPDX identifier and ownership statement', () => {
    expect(existsSync(licensePath)).toBe(true);
    const content = readFileSync(licensePath, 'utf-8');
    expect(content.includes('SPDX-License-Identifier')).toBe(true);
    expect(content.toLowerCase()).toContain('copyright');
  });
});
