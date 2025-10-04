import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { resolveProjectPath } from '../helpers/workspace-validator';

interface TurboTaskDefinition {
  dependsOn?: string[];
  cache?: boolean;
}

interface TurboConfig {
  tasks: Record<string, TurboTaskDefinition>;
}

/**
 * V1.16 — The `turbo.json` pipeline configuration includes proper task dependencies.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.16)
 */
describe('[IU-1][V1.16] Turborepo pipeline dependencies', () => {
  const projectRoot = resolveProjectPath();
  const turboConfig = JSON.parse(
    readFileSync(join(projectRoot, 'turbo.json'), 'utf-8')
  ) as TurboConfig;

  it('defines dependency graph for build, lint, and test tasks', () => {
    const build = turboConfig.tasks.build;
    const lint = turboConfig.tasks.lint;
    const test = turboConfig.tasks.test;

    expect(build?.dependsOn).toEqual(['^build']);
    expect(lint?.dependsOn).toEqual(['^lint']);
    expect(test?.dependsOn).toContain('build');
  });
});
