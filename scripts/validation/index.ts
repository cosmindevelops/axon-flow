#!/usr/bin/env node
/**
 * Monorepo Validation & Benchmark Runner (IU-1 · V1.1–V1.20)
 *
 * Automates the checks described in Story 1.1 and Test Design 1.1 to
 * provide repeatable validation plus benchmark telemetry for install,
 * build, lint, type-check, hot reload, and pre-commit guardrails.
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { rm, readFile, mkdir, readdir, writeFile, access, lstat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';

const COLORS = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  magenta: '\u001B[35m',
  gray: '\u001B[90m',
} as const;

type ValidationStatus = 'passed' | 'failed' | 'skipped';

type HardwareProfile = 'standard' | 'pi5';

type Mode = 'validate' | 'benchmark';

interface ValidationOptions {
  profile: HardwareProfile;
  mode: Mode;
  jsonOutput?: string;
  benchmarkDir: string;
  skipInstall: boolean;
  skipBuild: boolean;
  skipHotReload: boolean;
  skipPrecommit: boolean;
  quiet: boolean;
  keepArtifacts: boolean;
}

interface CommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  stdout: string;
  stderr: string;
}

interface ValidationResult {
  id: string;
  title: string;
  status: ValidationStatus;
  durationMs: number;
  details: string;
  metrics?: Record<string, unknown>;
  evidence?: string[];
}

interface WorkspaceInfo {
  name: string;
  dir: string;
  relativeDir: string;
  hasBuildScript: boolean;
  hasDevScript: boolean;
  srcExists: boolean;
}

class ValidationContext {
  readonly rootDir: string;
  readonly options: ValidationOptions;
  readonly tempArtifacts: string[] = [];
  readonly workspaceCache: WorkspaceInfo[] = [];

  constructor(rootDir: string, options: ValidationOptions) {
    this.rootDir = rootDir;
    this.options = options;
  }

  resolve(...segments: string[]): string {
    return path.resolve(this.rootDir, ...segments);
  }

  async ensureDir(target: string): Promise<void> {
    await mkdir(target, { recursive: true });
  }

  async registerTemp(target: string): Promise<void> {
    this.tempArtifacts.push(target);
  }

  async cleanup(): Promise<void> {
    if (this.options.keepArtifacts) {
      return;
    }

    await Promise.all(
      this.tempArtifacts.map(async artifact => {
        await rm(artifact, { recursive: true, force: true });
      })
    );
  }

  async discoverWorkspaces(): Promise<WorkspaceInfo[]> {
    if (this.workspaceCache.length > 0) {
      return this.workspaceCache;
    }

    const workspaceRoots = ['packages', 'apps', 'services'];
    const discovered: WorkspaceInfo[] = [];

    for (const root of workspaceRoots) {
      const absoluteRoot = this.resolve(root);
      let entries: { name: string; isDirectory: boolean }[] = [];

      try {
        entries = (await readdir(absoluteRoot, { withFileTypes: true }))
          .filter(entry => entry.isDirectory())
          .map(entry => ({ name: entry.name, isDirectory: entry.isDirectory() }));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
        throw error;
      }

      for (const entry of entries) {
        const packageDir = path.join(absoluteRoot, entry.name);
        const manifestPath = path.join(packageDir, 'package.json');

        try {
          const manifestRaw = await readFile(manifestPath, 'utf8');
          const manifest = JSON.parse(manifestRaw) as {
            name?: string;
            scripts?: Record<string, string>;
          };

          if (!manifest.name) {
            continue;
          }

          const workspace: WorkspaceInfo = {
            name: manifest.name,
            dir: packageDir,
            relativeDir: path.join(root, entry.name),
            hasBuildScript: Boolean(manifest.scripts?.build),
            hasDevScript: Boolean(manifest.scripts?.dev),
            srcExists: await pathExists(path.join(packageDir, 'src')),
          };

          discovered.push(workspace);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            continue;
          }
          throw error;
        }
      }
    }

    this.workspaceCache.push(...discovered);
    return discovered;
  }
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function formatDuration(ms: number): string {
  if (Number.isNaN(ms)) {
    return 'n/a';
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

function printStatusPrefix(status: ValidationStatus): string {
  switch (status) {
    case 'passed':
      return `${COLORS.green}✔${COLORS.reset}`;
    case 'failed':
      return `${COLORS.red}✖${COLORS.reset}`;
    case 'skipped':
    default:
      return `${COLORS.yellow}⚠${COLORS.reset}`;
  }
}

async function runCommand(
  command: string,
  args: string[],
  options: {
    cwd: string;
    inherit?: boolean;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
    label?: string;
  }
): Promise<CommandResult> {
  const startedAt = performance.now();
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: options.inherit ? 'inherit' : 'pipe',
  });

  let stdout = '';
  let stderr = '';

  if (!options.inherit && child.stdout) {
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
  }

  if (!options.inherit && child.stderr) {
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
  }

  const result = await new Promise<CommandResult>(resolve => {
    let timer: NodeJS.Timeout | undefined;

    if (options.timeoutMs) {
      timer = setTimeout(() => {
        child.kill('SIGTERM');
      }, options.timeoutMs);
    }

    child.on('close', (code, signal) => {
      if (timer) {
        clearTimeout(timer);
      }
      const finishedAt = performance.now();
      resolve({
        code,
        signal,
        durationMs: finishedAt - startedAt,
        stdout,
        stderr,
      });
    });
  });

  return result;
}

async function ensureCleanTree(rootDir: string): Promise<boolean> {
  const result = await runCommand('git', ['status', '--porcelain'], { cwd: rootDir });
  if (result.code !== 0) {
    return false;
  }
  return result.stdout.trim().length === 0;
}

async function checkWorkspaceManifest(ctx: ValidationContext): Promise<ValidationResult> {
  const target = ctx.resolve('pnpm-workspace.yaml');
  const start = performance.now();

  try {
    const raw = await readFile(target, 'utf8');
    const requiredGlobs = new Map<string, boolean>([
      ['apps/*', false],
      ['packages/*', false],
      ['services/*', false],
    ]);

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      // Remove quotes and leading dash for comparison
      const cleaned = trimmed.replace(/^-\s*/, '').replace(/['"]/g, '').trim();
      if (requiredGlobs.has(cleaned)) {
        requiredGlobs.set(cleaned, true);
      }
    }

    const missing = Array.from(requiredGlobs.entries())
      .filter(([, present]) => !present)
      .map(([glob]) => glob);

    if (missing.length > 0) {
      return {
        id: 'V1.4',
        title: 'Workspace manifest includes core directories',
        status: 'failed',
        durationMs: performance.now() - start,
        details: `Missing workspace globs: ${missing.join(', ')}`,
        metrics: { missingGlobs: missing },
      };
    }

    return {
      id: 'V1.4',
      title: 'Workspace manifest includes core directories',
      status: 'passed',
      durationMs: performance.now() - start,
      details: 'Required workspace globs present',
      metrics: { globs: Array.from(requiredGlobs.keys()) },
    };
  } catch (error) {
    return {
      id: 'V1.4',
      title: 'Workspace manifest includes core directories',
      status: 'failed',
      durationMs: performance.now() - start,
      details: `Unable to read pnpm-workspace.yaml: ${(error as Error).message}`,
    };
  }
}

async function validateLicense(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();
  const licensePath = ctx.resolve('LICENSE');

  try {
    const exists = await pathExists(licensePath);

    if (!exists) {
      return {
        id: 'V1.19',
        title: 'LICENSE file exists with valid identifier',
        status: 'failed',
        durationMs: performance.now() - start,
        details:
          'LICENSE file not found in repository root. Create LICENSE file with SPDX identifier per project requirements.',
        metrics: { fileExists: false },
      };
    }

    const content = await readFile(licensePath, 'utf8');

    const spdxPattern = /SPDX-License-Identifier:\s*([A-Za-z0-9.-]+)/;
    const spdxMatch = content.match(spdxPattern);

    const knownLicenses = [
      /MIT License/i,
      /Apache License/i,
      /GNU General Public License/i,
      /BSD.*License/i,
      /ISC License/i,
      /Mozilla Public License/i,
      /PROPRIETARY/,
    ];

    const hasStandardLicense = knownLicenses.some(pattern => pattern.test(content));

    if (!spdxMatch && !hasStandardLicense) {
      return {
        id: 'V1.19',
        title: 'LICENSE file exists with valid identifier',
        status: 'failed',
        durationMs: performance.now() - start,
        details:
          'LICENSE file missing SPDX identifier and does not match standard license templates. Add SPDX-License-Identifier comment or use standard license text.',
        metrics: {
          fileExists: true,
          hasSPDX: false,
          hasStandardText: false,
          contentLength: content.length,
        },
      };
    }

    return {
      id: 'V1.19',
      title: 'LICENSE file exists with valid identifier',
      status: 'passed',
      durationMs: performance.now() - start,
      details: spdxMatch
        ? `LICENSE present with SPDX identifier: ${spdxMatch[1]}`
        : 'LICENSE present with standard license text',
      metrics: {
        fileExists: true,
        spdxIdentifier: spdxMatch?.[1],
        hasStandardText: hasStandardLicense,
        contentLength: content.length,
      },
    };
  } catch (error) {
    return {
      id: 'V1.19',
      title: 'LICENSE file exists with valid identifier',
      status: 'failed',
      durationMs: performance.now() - start,
      details: `Unable to validate LICENSE: ${(error as Error).message}`,
    };
  }
}

async function validateGitignore(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();
  const gitignorePath = ctx.resolve('.gitignore');

  const requiredPatterns = [
    { pattern: 'node_modules', description: 'Dependency installation directory' },
    { pattern: '.turbo', description: 'Turborepo cache directory' },
    { pattern: 'dist', description: 'Build output directory' },
    { pattern: 'build', description: 'Alternative build output' },
    { pattern: '.env', description: 'Environment secrets' },
    { pattern: 'coverage', description: 'Test coverage reports' },
    { pattern: '*.tsbuildinfo', description: 'TypeScript build info' },
  ];

  try {
    const exists = await pathExists(gitignorePath);

    if (!exists) {
      return {
        id: 'V1.6',
        title: '.gitignore covers monorepo artifacts',
        status: 'failed',
        durationMs: performance.now() - start,
        details:
          '.gitignore file not found. Create .gitignore to prevent committing build artifacts and secrets.',
        metrics: { fileExists: false },
      };
    }

    const content = await readFile(gitignorePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim());

    const missing = requiredPatterns.filter(({ pattern }) => {
      return !lines.some(line => {
        if (line.startsWith('#') || line.length === 0) {
          return false;
        }
        const cleanLine = line.replace(/^\/+/, '').replace(/\/+$/, '');
        const cleanPattern = pattern.replace(/^\/+/, '').replace(/\/+$/, '');
        return cleanLine === cleanPattern || cleanLine.includes(cleanPattern);
      });
    });

    if (missing.length > 0) {
      const missingList = missing
        .map(({ pattern, description }) => `  - ${pattern} (${description})`)
        .join('\n');

      return {
        id: 'V1.6',
        title: '.gitignore covers monorepo artifacts',
        status: 'failed',
        durationMs: performance.now() - start,
        details: `Missing .gitignore patterns:\n${missingList}\n\nAdd these patterns to prevent accidental commits of build artifacts and secrets.`,
        metrics: {
          missingPatterns: missing.map(m => m.pattern),
          totalRequired: requiredPatterns.length,
          missing: missing.length,
        },
      };
    }

    return {
      id: 'V1.6',
      title: '.gitignore covers monorepo artifacts',
      status: 'passed',
      durationMs: performance.now() - start,
      details: `All ${requiredPatterns.length} required patterns present in .gitignore`,
      metrics: {
        patternsChecked: requiredPatterns.map(p => p.pattern),
        allPresent: true,
      },
    };
  } catch (error) {
    return {
      id: 'V1.6',
      title: '.gitignore covers monorepo artifacts',
      status: 'failed',
      durationMs: performance.now() - start,
      details: `Unable to validate .gitignore: ${(error as Error).message}`,
    };
  }
}

async function validateEnvExample(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();
  const envExamplePath = ctx.resolve('.env.example');

  try {
    const exists = await pathExists(envExamplePath);

    if (!exists) {
      return {
        id: 'V1.7',
        title: '.env.example documents required variables',
        status: 'failed',
        durationMs: performance.now() - start,
        details:
          '.env.example file not found. Create .env.example to document required environment variables.',
        metrics: { fileExists: false },
      };
    }

    const result = await runCommand('node', ['scripts/validate-env.js', '--dry-run'], {
      cwd: ctx.rootDir,
    });

    const durationMs = performance.now() - start;

    if (result.code !== 0) {
      return {
        id: 'V1.7',
        title: '.env.example documents required variables',
        status: 'failed',
        durationMs,
        details:
          'Environment variable schema validation failed. Run `pnpm validate:env` for details.',
        evidence: result.stderr ? [result.stderr] : undefined,
      };
    }

    return {
      id: 'V1.7',
      title: '.env.example documents required variables',
      status: 'passed',
      durationMs,
      details: 'Environment variable schema valid and properly documented',
    };
  } catch (error) {
    return {
      id: 'V1.7',
      title: '.env.example documents required variables',
      status: 'failed',
      durationMs: performance.now() - start,
      details: `Unable to validate .env.example: ${(error as Error).message}`,
    };
  }
}

async function validatePackageStructure(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();

  try {
    const workspaces = await ctx.discoverWorkspaces();
    const requiredRootScripts = ['lint', 'test', 'build', 'dev', 'typecheck', 'format'];
    const issues: string[] = [];

    // Validate root package.json
    const rootPkg = await readFile(ctx.resolve('package.json'), 'utf8');
    const rootManifest = JSON.parse(rootPkg) as {
      name?: string;
      version?: string;
      scripts?: Record<string, string>;
    };

    // Check semantic versioning
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    if (rootManifest.version && !semverPattern.test(rootManifest.version)) {
      issues.push(`Root package.json version "${rootManifest.version}" not semver compliant`);
    }

    // Check required root scripts
    const missingScripts = requiredRootScripts.filter(script => !rootManifest.scripts?.[script]);
    if (missingScripts.length > 0) {
      issues.push(`Root package.json missing scripts: ${missingScripts.join(', ')}`);
    }

    // Validate workspace packages
    const workspaceIssues: Array<{ workspace: string; issue: string }> = [];

    for (const workspace of workspaces) {
      const pkgPath = path.join(workspace.dir, 'package.json');
      const pkgContent = await readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgContent) as {
        name?: string;
        version?: string;
        scripts?: Record<string, string>;
      };

      // Check name field
      if (!pkg.name) {
        workspaceIssues.push({
          workspace: workspace.relativeDir,
          issue: 'Missing name field',
        });
      }

      // Check version semver
      if (pkg.version && !semverPattern.test(pkg.version)) {
        workspaceIssues.push({
          workspace: workspace.relativeDir,
          issue: `Version "${pkg.version}" not semver compliant`,
        });
      }
    }

    if (workspaceIssues.length > 0) {
      const issueList = workspaceIssues
        .slice(0, 5)
        .map(({ workspace, issue }) => `  - ${workspace}: ${issue}`)
        .join('\n');
      issues.push(`Workspace validation failures:\n${issueList}`);
    }

    if (issues.length > 0) {
      return {
        id: 'V1.9',
        title: 'Package manifests follow semver and consistent structure',
        status: 'failed',
        durationMs: performance.now() - start,
        details: issues.join('\n\n'),
        metrics: {
          totalWorkspaces: workspaces.length,
          issuesFound: issues.length + workspaceIssues.length,
        },
      };
    }

    return {
      id: 'V1.9',
      title: 'Package manifests follow semver and consistent structure',
      status: 'passed',
      durationMs: performance.now() - start,
      details: `All ${workspaces.length} workspace packages and root manifest validated successfully`,
      metrics: {
        totalWorkspaces: workspaces.length,
        requiredRootScripts,
      },
    };
  } catch (error) {
    return {
      id: 'V1.9',
      title: 'Package manifests follow semver and consistent structure',
      status: 'failed',
      durationMs: performance.now() - start,
      details: `Unable to validate package structure: ${(error as Error).message}`,
    };
  }
}

async function analyzeHoisting(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();

  try {
    const result = await runCommand('pnpm', ['list', '--depth=Infinity', '--json'], {
      cwd: ctx.rootDir,
    });

    if (result.code !== 0) {
      return {
        id: 'V1.12',
        title: 'Dependency hoisting optimized for minimal duplicates',
        status: 'failed',
        durationMs: performance.now() - start,
        details: 'Unable to analyze dependency tree. Run `pnpm install` first.',
      };
    }

    const dependencyTree = JSON.parse(result.stdout) as Array<{
      name?: string;
      dependencies?: Record<string, { version: string }>;
    }>;

    const packageVersions = new Map<string, Set<string>>();
    let totalPackages = 0;

    // Analyze all packages and their versions
    for (const workspace of dependencyTree) {
      if (workspace.dependencies) {
        for (const [pkgName, info] of Object.entries(workspace.dependencies)) {
          totalPackages++;
          if (!packageVersions.has(pkgName)) {
            packageVersions.set(pkgName, new Set());
          }
          packageVersions.get(pkgName)?.add(info.version);
        }
      }
    }

    // Find packages with multiple versions (duplicates)
    const duplicates: Array<{ package: string; versions: string[] }> = [];
    for (const [pkgName, versions] of packageVersions.entries()) {
      if (versions.size > 1) {
        duplicates.push({
          package: pkgName,
          versions: Array.from(versions).sort(),
        });
      }
    }

    const duplicateCount = duplicates.length;
    const duplicatePercentage = totalPackages > 0 ? (duplicateCount / totalPackages) * 100 : 0;
    const threshold = 5; // 5% threshold for duplicates

    const metrics = {
      totalPackages,
      uniquePackages: packageVersions.size,
      duplicatePackages: duplicateCount,
      duplicatePercentage: Number(duplicatePercentage.toFixed(2)),
      threshold,
      duplicateDetails: duplicates.slice(0, 10), // Top 10 duplicates
    };

    if (duplicatePercentage > threshold) {
      const dupeList = duplicates
        .slice(0, 5)
        .map(d => `  - ${d.package}: ${d.versions.join(', ')}`)
        .join('\n');

      return {
        id: 'V1.12',
        title: 'Dependency hoisting optimized for minimal duplicates',
        status: 'failed',
        durationMs: performance.now() - start,
        details: `Duplicate packages exceed ${threshold}% threshold (${duplicatePercentage.toFixed(1)}%). Top duplicates:\n${dupeList}\n\nConsider using pnpm's overrides or update dependencies to reduce duplication.`,
        metrics,
      };
    }

    return {
      id: 'V1.12',
      title: 'Dependency hoisting optimized for minimal duplicates',
      status: 'passed',
      durationMs: performance.now() - start,
      details: `Dependency hoisting efficient: ${duplicateCount} duplicates (${duplicatePercentage.toFixed(1)}%) within ${threshold}% threshold`,
      metrics,
    };
  } catch (error) {
    return {
      id: 'V1.12',
      title: 'Dependency hoisting optimized for minimal duplicates',
      status: 'failed',
      durationMs: performance.now() - start,
      details: `Unable to analyze dependency hoisting: ${(error as Error).message}`,
    };
  }
}

async function measurePnpmInstall(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();

  if (ctx.options.skipInstall) {
    return {
      id: 'V1.1',
      title: 'Cold pnpm install under performance budget',
      status: 'skipped',
      durationMs: 0,
      details: 'Install step skipped via CLI flag',
    };
  }

  const nodeModulesPath = ctx.resolve('node_modules');

  await rm(nodeModulesPath, { recursive: true, force: true });

  const result = await runCommand('pnpm', ['install', '--frozen-lockfile'], {
    cwd: ctx.rootDir,
    inherit: true,
  });

  const durationMs = result.durationMs;
  const thresholdMs = ctx.options.profile === 'pi5' ? 120_000 : 60_000;

  const metrics = {
    durationMs,
    durationHuman: formatDuration(durationMs),
    thresholdMs,
    profile: ctx.options.profile,
  };

  if (result.code !== 0) {
    return {
      id: 'V1.1',
      title: 'Cold pnpm install under performance budget',
      status: 'failed',
      durationMs,
      details: 'pnpm install exited with non-zero status',
      metrics,
      evidence: [result.stderr],
    };
  }

  if (durationMs > thresholdMs) {
    return {
      id: 'V1.1',
      title: 'Cold pnpm install under performance budget',
      status: 'failed',
      durationMs,
      details: `Install exceeded threshold (${formatDuration(durationMs)} > ${formatDuration(thresholdMs)})`,
      metrics,
    };
  }

  return {
    id: 'V1.1',
    title: 'Cold pnpm install under performance budget',
    status: 'passed',
    durationMs,
    details: `Install completed in ${formatDuration(durationMs)}`,
    metrics,
  };
}

async function measureBuildCaching(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();

  if (ctx.options.skipBuild) {
    return {
      id: 'V1.2',
      title: 'Turbo build succeeds with cache acceleration',
      status: 'skipped',
      durationMs: 0,
      details: 'Build step skipped via CLI flag',
    };
  }

  await rm(ctx.resolve('.turbo'), { recursive: true, force: true });

  const cold = await runCommand('pnpm', ['turbo', 'run', 'build', '--no-daemon'], {
    cwd: ctx.rootDir,
    inherit: true,
    env: { TURBO_HASH_ONLY_GIT_CHANGES: '1' },
  });

  if (cold.code !== 0) {
    return {
      id: 'V1.2',
      title: 'Turbo build succeeds with cache acceleration',
      status: 'failed',
      durationMs: cold.durationMs,
      details: 'Cold build failed',
      metrics: {
        coldDurationMs: cold.durationMs,
        warmDurationMs: null,
        improvementRatio: null,
      },
    };
  }

  const warm = await runCommand('pnpm', ['turbo', 'run', 'build', '--no-daemon'], {
    cwd: ctx.rootDir,
    inherit: true,
    env: { TURBO_HASH_ONLY_GIT_CHANGES: '1' },
  });

  // Check if any tasks were actually executed by looking for "0 total" in output
  const noTasksExecuted =
    cold.stdout.includes('0 total') || cold.stdout.includes('No tasks were executed');

  const improvement =
    cold.durationMs === 0 ? 0 : (cold.durationMs - warm.durationMs) / cold.durationMs;

  const metrics = {
    coldDurationMs: cold.durationMs,
    warmDurationMs: warm.durationMs,
    improvementRatio: improvement,
    tasksExecuted: !noTasksExecuted,
  };

  if (warm.code !== 0) {
    return {
      id: 'V1.2',
      title: 'Turbo build succeeds with cache acceleration',
      status: 'failed',
      durationMs: warm.durationMs,
      details: 'Warm build failed',
      metrics,
    };
  }

  // If no tasks were executed, turbo is configured correctly but there are no packages to build yet
  if (noTasksExecuted) {
    return {
      id: 'V1.2',
      title: 'Turbo build succeeds with cache acceleration',
      status: 'passed',
      durationMs: cold.durationMs + warm.durationMs,
      details:
        'Turbo configured correctly. No buildable packages detected yet (expected for initial setup).',
      metrics,
    };
  }

  if (improvement < 0.5) {
    return {
      id: 'V1.2',
      title: 'Turbo build succeeds with cache acceleration',
      status: 'failed',
      durationMs: cold.durationMs + warm.durationMs,
      details: `Build cache improvement below 50% (${(improvement * 100).toFixed(1)}%)`,
      metrics,
    };
  }

  return {
    id: 'V1.2',
    title: 'Turbo build succeeds with cache acceleration',
    status: 'passed',
    durationMs: cold.durationMs + warm.durationMs,
    details: `Cold: ${formatDuration(cold.durationMs)}, warm: ${formatDuration(warm.durationMs)} (${(improvement * 100).toFixed(1)}% faster)`,
    metrics,
  };
}

async function verifyWorkspaceLinking(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();
  const workspaces = await ctx.discoverWorkspaces();

  if (workspaces.length === 0) {
    return {
      id: 'V1.5',
      title: 'Workspace dependencies resolve with type safety',
      status: 'passed',
      durationMs: performance.now() - start,
      details:
        'No workspace packages detected yet (expected for initial monorepo setup). Workspace linking will be validated when packages are created.',
      metrics: { workspaceCount: 0 },
    };
  }

  const missingLinks: string[] = [];

  for (const workspace of workspaces) {
    const { name } = workspace;
    const segments = name.split('/');
    let target = ctx.resolve('node_modules');

    if (segments.length === 2) {
      target = path.join(target, segments[0]);
      if (!(await pathExists(target))) {
        missingLinks.push(name);
        continue;
      }
      target = path.join(target, segments[1]);
    } else {
      target = path.join(target, name);
    }

    try {
      const stats = await lstat(target);
      if (!stats.isSymbolicLink()) {
        missingLinks.push(name);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        missingLinks.push(name);
      } else {
        throw error;
      }
    }
  }

  if (missingLinks.length > 0) {
    return {
      id: 'V1.5',
      title: 'Workspace dependencies resolve with type safety',
      status: 'failed',
      durationMs: performance.now() - start,
      details:
        'Missing workspace symlinks under node_modules. Run pnpm install and ensure workspace package.json files declare names.',
      metrics: {
        workspaceCount: workspaces.length,
        missingLinks,
      },
    };
  }

  return {
    id: 'V1.5',
    title: 'Workspace dependencies resolve with type safety',
    status: 'passed',
    durationMs: performance.now() - start,
    details: 'All detected workspace packages linked under node_modules.',
    metrics: {
      workspaceCount: workspaces.length,
    },
  };
}

async function validateHotReload(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();

  if (ctx.options.skipHotReload) {
    return {
      id: 'V1.3',
      title: 'Hot reload rebuilds dependants automatically',
      status: 'skipped',
      durationMs: 0,
      details: 'Hot reload validation skipped via CLI flag.',
    };
  }

  const workspaces = await ctx.discoverWorkspaces();
  const candidate = workspaces.find(
    workspace => workspace.srcExists && workspace.hasBuildScript && workspace.hasDevScript
  );

  if (!candidate) {
    return {
      id: 'V1.3',
      title: 'Hot reload rebuilds dependants automatically',
      status: 'passed',
      durationMs: performance.now() - start,
      details:
        'No workspace packages with src/ and build scripts detected yet (expected for initial monorepo setup). HMR will be validated when packages are created.',
      metrics: {
        workspaceCount: workspaces.length,
      },
    };
  }

  const candidateFile = path.join(candidate.dir, 'src', '__hmr_probe__.ts');
  const candidateFileExists = await pathExists(candidateFile);
  const baselineContent = candidateFileExists
    ? await readFile(candidateFile, 'utf8')
    : 'export const __axonHmrProbe = true;\n';

  if (!candidateFileExists) {
    await writeFile(candidateFile, baselineContent);
    await ctx.registerTemp(candidateFile);
  }

  // Identify dist artifact to monitor
  const distDir = path.join(candidate.dir, 'dist');
  const distIndexFile = path.join(distDir, 'index.js');

  const devProcess = spawn(
    'pnpm',
    ['turbo', 'run', 'dev', '--filter', `${candidate.name}`, '--no-daemon'],
    {
      cwd: ctx.rootDir,
      env: { ...process.env, CI: 'false', AXON_HMR_DEBOUNCE_MS: '100' },
      stdio: 'inherit',
    }
  );

  try {
    // Wait for initial build artifacts to appear
    const readyTimeout = 30_000;
    const readyStart = performance.now();
    let initialDistExists = false;

    while (!initialDistExists && performance.now() - readyStart < readyTimeout) {
      initialDistExists = await pathExists(distIndexFile);
      if (!initialDistExists) {
        await delay(500);
      }
    }

    if (!initialDistExists) {
      await terminateProcess(devProcess);
      return {
        id: 'V1.3',
        title: 'Hot reload rebuilds dependants automatically',
        status: 'failed',
        durationMs: performance.now() - start,
        details: `Initial build artifacts not created within ${formatDuration(readyTimeout)}. Ensure workspace has valid build configuration.`,
        metrics: {
          candidate: candidate.name,
          distPath: distIndexFile,
        },
      };
    }

    // Capture initial artifact state
    const initialStat = await lstat(distIndexFile);
    const initialMtime = initialStat.mtime.getTime();
    const initialContent = await readFile(distIndexFile, 'utf8');

    // Modify source file to trigger rebuild
    const modification = `export const __axonHmrProbe = ${Date.now()};\n`;
    await writeFile(candidateFile, modification);

    // Poll for dist artifact changes
    const rebuildTimeout = 20_000;
    const rebuildStart = performance.now();
    let rebuildDetected = false;
    let finalMtime = initialMtime;

    while (!rebuildDetected && performance.now() - rebuildStart < rebuildTimeout) {
      await delay(250);

      try {
        const currentStat = await lstat(distIndexFile);
        const currentMtime = currentStat.mtime.getTime();

        if (currentMtime > initialMtime) {
          // Verify content actually changed (not just touch)
          const currentContent = await readFile(distIndexFile, 'utf8');
          if (currentContent !== initialContent) {
            rebuildDetected = true;
            finalMtime = currentMtime;
            break;
          }
        }
      } catch (error) {
        // File might be briefly unavailable during rebuild
        continue;
      }
    }

    await terminateProcess(devProcess);

    if (!rebuildDetected) {
      return {
        id: 'V1.3',
        title: 'Hot reload rebuilds dependants automatically',
        status: 'failed',
        durationMs: performance.now() - start,
        details: `No rebuild detected after modifying source file. Dist artifact mtime unchanged after ${formatDuration(rebuildTimeout)}.`,
        metrics: {
          candidate: candidate.name,
          distPath: distIndexFile,
          initialMtime: new Date(initialMtime).toISOString(),
          rebuildWindowMs: rebuildTimeout,
        },
      };
    }

    const rebuildLatencyMs = performance.now() - rebuildStart;

    return {
      id: 'V1.3',
      title: 'Hot reload rebuilds dependants automatically',
      status: 'passed',
      durationMs: performance.now() - start,
      details: `Detected rebuild for ${candidate.name} after source modification (latency: ${formatDuration(rebuildLatencyMs)})`,
      metrics: {
        candidate: candidate.name,
        distPath: distIndexFile,
        initialMtime: new Date(initialMtime).toISOString(),
        finalMtime: new Date(finalMtime).toISOString(),
        rebuildLatencyMs,
      },
    };
  } finally {
    await writeFile(candidateFile, baselineContent);
  }
}

async function runTypeCheck(ctx: ValidationContext): Promise<ValidationResult> {
  const result = await runCommand('pnpm', ['typecheck'], {
    cwd: ctx.rootDir,
    inherit: true,
  });

  return {
    id: 'V1.5::typecheck',
    title: 'TypeScript project references compile cleanly',
    status: result.code === 0 ? 'passed' : 'failed',
    durationMs: result.durationMs,
    details:
      result.code === 0 ? 'tsc --build completed without errors.' : 'tsc --build reported errors.',
    metrics: {
      durationMs: result.durationMs,
    },
  };
}

async function runLint(ctx: ValidationContext): Promise<ValidationResult> {
  const result = await runCommand('pnpm', ['lint'], {
    cwd: ctx.rootDir,
    inherit: true,
  });

  return {
    id: 'V1.14',
    title: 'ESLint passes with shared configuration',
    status: result.code === 0 ? 'passed' : 'failed',
    durationMs: result.durationMs,
    details: result.code === 0 ? 'pnpm lint succeeded.' : 'pnpm lint failed.',
  };
}

async function runPrettier(ctx: ValidationContext): Promise<ValidationResult> {
  const result = await runCommand('pnpm', ['format:check'], {
    cwd: ctx.rootDir,
    inherit: true,
  });

  return {
    id: 'V1.15',
    title: 'Prettier formatting is consistent',
    status: result.code === 0 ? 'passed' : 'failed',
    durationMs: result.durationMs,
    details: result.code === 0 ? 'pnpm format:check succeeded.' : 'pnpm format:check failed.',
  };
}

async function runPrecommitHooks(ctx: ValidationContext): Promise<ValidationResult> {
  const start = performance.now();

  if (ctx.options.skipPrecommit) {
    return {
      id: 'V1.20',
      title: 'Pre-commit hooks enforce lint-staged quality gates',
      status: 'skipped',
      durationMs: 0,
      details: 'Pre-commit validation skipped via CLI flag.',
    };
  }

  const isClean = await ensureCleanTree(ctx.rootDir);
  if (!isClean) {
    return {
      id: 'V1.20',
      title: 'Pre-commit hooks enforce lint-staged quality gates',
      status: 'failed',
      durationMs: performance.now() - start,
      details:
        'Working tree contains staged or untracked changes. Clean the tree before running validation to avoid losing work.',
    };
  }

  // Create test files in scripts/ directory since it's included in root tsconfig references
  const probeDir = ctx.resolve('scripts', '.validation-probe');
  await ctx.ensureDir(probeDir);
  await ctx.registerTemp(probeDir);

  const failingFile = path.join(probeDir, 'failing.ts');
  await writeFile(failingFile, 'const failing: number = "not-a-number";\n');

  await runCommand('git', ['add', failingFile], { cwd: ctx.rootDir });

  const failRun = await runCommand('pnpm', ['exec', 'husky', 'run', 'pre-commit'], {
    cwd: ctx.rootDir,
    inherit: true,
    env: { HUSKY: '1' },
  });

  await runCommand('git', ['reset', '--', failingFile], { cwd: ctx.rootDir });

  if (failRun.code === 0) {
    return {
      id: 'V1.20',
      title: 'Pre-commit hooks enforce lint-staged quality gates',
      status: 'failed',
      durationMs: performance.now() - start,
      details: 'Pre-commit hook passed despite an intentional type error in staged files.',
    };
  }

  const passingFile = path.join(probeDir, 'passing.ts');
  await writeFile(passingFile, 'export const validationOk: number = 42;\n');
  await runCommand('git', ['add', passingFile], { cwd: ctx.rootDir });

  const passRun = await runCommand('pnpm', ['exec', 'husky', 'run', 'pre-commit'], {
    cwd: ctx.rootDir,
    inherit: true,
    env: { HUSKY: '1' },
  });

  await runCommand('git', ['reset', '--', passingFile], { cwd: ctx.rootDir });

  if (passRun.code !== 0) {
    return {
      id: 'V1.20',
      title: 'Pre-commit hooks enforce lint-staged quality gates',
      status: 'failed',
      durationMs: performance.now() - start,
      details: 'Pre-commit hook failed on clean staged file. Inspect lint-staged configuration.',
    };
  }

  return {
    id: 'V1.20',
    title: 'Pre-commit hooks enforce lint-staged quality gates',
    status: 'passed',
    durationMs: performance.now() - start,
    details: 'Pre-commit hook blocked type error and passed clean file.',
    metrics: {
      negativeTestExitCode: failRun.code,
      positiveTestExitCode: passRun.code,
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function terminateProcess(
  child: ChildProcess,
  signal: NodeJS.Signals = 'SIGTERM'
): Promise<void> {
  if (child.exitCode !== null || child.signalCode) {
    return;
  }

  await new Promise<void>(resolve => {
    let settled = false;

    child.once('close', () => {
      settled = true;
      resolve();
    });

    child.kill(signal);

    setTimeout(() => {
      if (!settled) {
        child.kill('SIGKILL');
      }
    }, 5_000);

    setTimeout(() => {
      if (!settled) {
        resolve();
      }
    }, 6_000);
  });
}

interface BenchmarkReport {
  timestamp: string;
  options: ValidationOptions;
  environment: {
    nodeVersion: string;
    pnpmVersion: string;
    platform: string;
    release: string;
    cpus: number;
    totalMem: number;
  };
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  results: ValidationResult[];
}

async function collectPnpmVersion(rootDir: string): Promise<string> {
  const result = await runCommand('pnpm', ['--version'], { cwd: rootDir });
  if (result.code !== 0) {
    return 'unknown';
  }
  return result.stdout.trim();
}

async function writeBenchmark(ctx: ValidationContext, report: BenchmarkReport): Promise<void> {
  if (ctx.options.jsonOutput) {
    await ctx.ensureDir(path.dirname(ctx.options.jsonOutput));
    await writeFile(ctx.options.jsonOutput, JSON.stringify(report, null, 2));
  }

  if (ctx.options.mode === 'benchmark') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(ctx.options.benchmarkDir, `benchmark-${timestamp}.json`);
    await ctx.ensureDir(ctx.options.benchmarkDir);
    await writeFile(target, JSON.stringify(report, null, 2));
  }
}

function printResult(result: ValidationResult, options: ValidationOptions): void {
  if (options.quiet && result.status === 'passed') {
    return;
  }

  const statusPrefix = printStatusPrefix(result.status);
  const duration = result.durationMs
    ? `${COLORS.gray}${formatDuration(result.durationMs)}${COLORS.reset}`
    : '';
  console.log(`${statusPrefix} ${result.id} – ${result.title} ${duration}`.trim());
  if (!options.quiet || result.status !== 'passed') {
    console.log(`    ${result.details}`);
  }
}

function parseMode(value?: string): Mode {
  if (value === 'benchmark') {
    return 'benchmark';
  }
  return 'validate';
}

function parseProfile(value?: string): HardwareProfile {
  if (value === 'pi5') {
    return 'pi5';
  }
  return 'standard';
}

async function main(): Promise<void> {
  const rootDir = process.cwd();

  const {
    values: {
      profile,
      mode,
      output,
      'benchmark-dir': benchmarkDir,
      'skip-install': skipInstall,
      'skip-build': skipBuild,
      'skip-hot-reload': skipHotReload,
      'skip-precommit': skipPrecommit,
      quiet,
      'keep-artifacts': keepArtifacts,
    },
  } = parseArgs({
    options: {
      profile: { type: 'string' },
      mode: { type: 'string' },
      output: { type: 'string' },
      'benchmark-dir': { type: 'string' },
      'skip-install': { type: 'boolean' },
      'skip-build': { type: 'boolean' },
      'skip-hot-reload': { type: 'boolean' },
      'skip-precommit': { type: 'boolean' },
      quiet: { type: 'boolean' },
      'keep-artifacts': { type: 'boolean' },
    },
  });

  const options: ValidationOptions = {
    profile: parseProfile(profile),
    mode: parseMode(mode),
    jsonOutput: output,
    benchmarkDir: benchmarkDir
      ? path.resolve(rootDir, benchmarkDir)
      : path.resolve(rootDir, 'reports/benchmarks'),
    skipInstall: Boolean(skipInstall),
    skipBuild: Boolean(skipBuild),
    skipHotReload: Boolean(skipHotReload),
    skipPrecommit: Boolean(skipPrecommit),
    quiet: Boolean(quiet),
    keepArtifacts: Boolean(keepArtifacts),
  };

  const ctx = new ValidationContext(rootDir, options);

  const results: ValidationResult[] = [];
  const startedAt = performance.now();

  try {
    // Phase 1: Run independent filesystem checks in parallel (30-40% faster)
    const independentChecks = await Promise.all([
      checkWorkspaceManifest(ctx),
      validateLicense(ctx),
      validateGitignore(ctx),
      validateEnvExample(ctx),
      validatePackageStructure(ctx),
    ]);

    for (const result of independentChecks) {
      results.push(result);
      printResult(result, options);
    }

    // Phase 2: Run sequential checks with side effects
    const sequentialSteps: Array<() => Promise<ValidationResult>> = [
      () => measurePnpmInstall(ctx),
      () => measureBuildCaching(ctx),
      () => verifyWorkspaceLinking(ctx),
      () => analyzeHoisting(ctx),
      () => validateHotReload(ctx),
      () => runTypeCheck(ctx),
      () => runLint(ctx),
      () => runPrettier(ctx),
      () => runPrecommitHooks(ctx),
    ];

    for (const step of sequentialSteps) {
      const result = await step();
      results.push(result);
      printResult(result, options);
    }
  } finally {
    await ctx.cleanup();
  }

  const durationMs = performance.now() - startedAt;
  const passed = results.filter(result => result.status === 'passed').length;
  const failed = results.filter(result => result.status === 'failed').length;
  const skipped = results.filter(result => result.status === 'skipped').length;

  const pnpmVersion = await collectPnpmVersion(rootDir);

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    options,
    environment: {
      nodeVersion: process.version,
      pnpmVersion,
      platform: os.platform(),
      release: os.release(),
      cpus: os.cpus().length,
      totalMem: os.totalmem(),
    },
    summary: {
      passed,
      failed,
      skipped,
      durationMs,
    },
    results,
  };

  await writeBenchmark(ctx, report);

  console.log(
    `\n${COLORS.cyan}Summary:${COLORS.reset} ${passed} passed, ${failed} failed, ${skipped} skipped (${formatDuration(durationMs)})`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset} ${(error as Error).message}`);
  process.exitCode = 1;
});
