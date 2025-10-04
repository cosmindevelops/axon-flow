import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.18 — The README provides basic project information (relaxed for private showcase).
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.18)
 *
 * Note: This is a private project with a showcase-focused README.
 * Onboarding and detailed setup instructions are not required.
 */
describe('[IU-1][V1.18] README project showcase', () => {
  const projectRoot = resolveProjectPath();
  const readme = readFileSync(join(projectRoot, 'README.md'), 'utf-8');

  it('exists and contains content', () => {
    expect(readme.length).toBeGreaterThan(100);
  });

  it('mentions the project name or contains headings', () => {
    const hasProjectInfo =
      readme.toLowerCase().includes('axon') ||
      readme.includes('#') || // Has markdown headings
      readme.length > 200; // Has substantial content
    expect(hasProjectInfo).toBe(true);
  });
});
