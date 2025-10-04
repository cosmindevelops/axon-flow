import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

/**
 * V1.5 — TypeScript path aliases are properly configured in `tsconfig` files.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.5)
 */
describe('[IU-1][V1.5] TypeScript configuration', () => {
  const projectRoot = resolveProjectPath();
  const tsconfig = JSON.parse(readFileSync(`${projectRoot}/tsconfig.base.json`, 'utf-8')) as {
    compilerOptions?: {
      paths?: Record<string, string[]>;
      composite?: boolean;
    };
  };

  it('enables composite project references', () => {
    expect(tsconfig.compilerOptions?.composite).toBe(true);
  });

  it('defines path aliases for shared packages', () => {
    const paths = tsconfig.compilerOptions?.paths ?? {};
    expect(Object.keys(paths).length).toBeGreaterThan(0);
    expect(paths).toHaveProperty('@axon/core-*');
    expect(paths).toHaveProperty('@axon/application-*');
  });
});
