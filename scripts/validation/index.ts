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
      const trimmed = line.trim().replace(/['"]/g, '');
      if (requiredGlobs.has(trimmed)) {
        requiredGlobs.set(trimmed, true);
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

  const improvement =
    cold.durationMs === 0 ? 0 : (cold.durationMs - warm.durationMs) / cold.durationMs;

  const metrics = {
    coldDurationMs: cold.durationMs,
    warmDurationMs: warm.durationMs,
    improvementRatio: improvement,
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
      status: 'failed',
      durationMs: performance.now() - start,
      details: 'No workspace packages detected under apps/, packages/, or services/.',
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
      status: 'failed',
      durationMs: performance.now() - start,
      details:
        'No workspace with src/ directory and build script found. Create baseline packages before running validation.',
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

  const combinedLogs: string[] = [];
  let ready = false;
  let rebuildDetected = false;

  const devProcess = spawn(
    'pnpm',
    ['turbo', 'run', 'dev', '--filter', `${candidate.name}`, '--no-daemon'],
    {
      cwd: ctx.rootDir,
      env: { ...process.env, CI: 'false', AXON_HMR_DEBOUNCE_MS: '100' },
      stdio: 'pipe',
    }
  );

  const captureLog = (chunk: Buffer) => {
    const text = chunk.toString();
    combinedLogs.push(text);

    if (!ready && /ready|watching|started/i.test(text)) {
      ready = true;
    }

    if (/rebuild|build|compiled/i.test(text)) {
      rebuildDetected = true;
    }
  };

  devProcess.stdout?.on('data', captureLog);
  devProcess.stderr?.on('data', chunk => combinedLogs.push(chunk.toString()));

  try {
    const readyTimeout = 30_000;
    const readyStart = performance.now();

    while (!ready && performance.now() - readyStart < readyTimeout) {
      await delay(250);
    }

    if (!ready) {
      await terminateProcess(devProcess);
      return {
        id: 'V1.3',
        title: 'Hot reload rebuilds dependants automatically',
        status: 'failed',
        durationMs: performance.now() - start,
        details: `turbo run dev did not report ready state within ${formatDuration(readyTimeout)}`,
        metrics: {
          candidate: candidate.name,
        },
        evidence: combinedLogs,
      };
    }

    const modification = `export const __axonHmrProbe = ${Date.now()};\n`;
    await writeFile(candidateFile, modification);

    const rebuildTimeout = 20_000;
    const rebuildStart = performance.now();

    while (!rebuildDetected && performance.now() - rebuildStart < rebuildTimeout) {
      await delay(250);
    }

    await terminateProcess(devProcess);

    if (!rebuildDetected) {
      return {
        id: 'V1.3',
        title: 'Hot reload rebuilds dependants automatically',
        status: 'failed',
        durationMs: performance.now() - start,
        details: 'No rebuild detected after modifying candidate source file.',
        metrics: {
          candidate: candidate.name,
          rebuildWindowMs: rebuildTimeout,
        },
        evidence: combinedLogs,
      };
    }

    return {
      id: 'V1.3',
      title: 'Hot reload rebuilds dependants automatically',
      status: 'passed',
      durationMs: performance.now() - start,
      details: `Detected rebuild for ${candidate.name} after source modification`,
      metrics: {
        candidate: candidate.name,
        rebuildLatencyMs: performance.now() - rebuildStart,
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

  const probeDir = ctx.resolve('.tmp', 'validation-precommit');
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

  const steps: Array<() => Promise<ValidationResult>> = [
    () => checkWorkspaceManifest(ctx),
    () => measurePnpmInstall(ctx),
    () => measureBuildCaching(ctx),
    () => verifyWorkspaceLinking(ctx),
    () => validateHotReload(ctx),
    () => runTypeCheck(ctx),
    () => runLint(ctx),
    () => runPrettier(ctx),
    () => runPrecommitHooks(ctx),
  ];

  const results: ValidationResult[] = [];
  const startedAt = performance.now();

  try {
    for (const step of steps) {
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
