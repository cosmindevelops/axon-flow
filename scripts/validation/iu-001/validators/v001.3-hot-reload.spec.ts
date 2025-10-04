import { describe, it, expect } from 'vitest';

import { runCommand, findWorkspacePackages } from '../../shared/utils';
import { resolveProjectPath } from '../helpers/workspace-validator';

interface TurboDryRun {
  tasks: Array<{
    taskId: string;
    command: string;
    resolvedTaskDefinition: {
      persistent?: boolean;
      cache?: boolean;
    };
  }>;
}

/**
 * V1.3 — Hot reload functionality works for any package when running `turbo run dev`.
 * Source: docs/main/003-validation_criteria.md (IU-1 V1.3)
 */
describe('[IU-1][V1.3] Hot reload configuration', () => {
  const projectRoot = resolveProjectPath();

  it('provides persistent dev tasks for each workspace package with a dev script', () => {
    const packages = findWorkspacePackages(projectRoot).filter(pkg => {
      if (pkg.dir === projectRoot) {
        return false;
      }
      if (!pkg.manifest) {
        return false;
      }
      const scripts = pkg.manifest.scripts as Record<string, string> | undefined;
      return Boolean(scripts?.dev);
    });

    const result = runCommand('pnpm', ['turbo', 'run', 'dev', '--dry-run=json'], {
      cwd: projectRoot,
      env: { ...process.env, CI: '1' },
    });

    expect(result.exitCode).toBe(0);

    const dryRun = JSON.parse(result.stdout) as TurboDryRun;
    const taskIndex = new Map<string, TurboDryRun['tasks'][number]>();
    for (const task of dryRun.tasks) {
      taskIndex.set(task.taskId, task);
    }

    for (const workspacePackage of packages) {
      const name = workspacePackage.manifest.name as string | undefined;
      expect(name, `package at ${workspacePackage.dir} must declare a name`).toBeDefined();
      if (!name) {
        continue;
      }

      const taskId = `${name}#dev`;
      const task = taskIndex.get(taskId);
      expect(task, `Missing turbo dev task for workspace ${name}`).toBeDefined();
      if (!task) {
        continue;
      }

      expect(task.resolvedTaskDefinition.persistent).toBe(true);
      expect(task.resolvedTaskDefinition.cache).toBe(false);
      expect(task.command.toLowerCase()).toMatch(/dev|watch/);
    }
  });
});
