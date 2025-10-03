#!/usr/bin/env node
/**
 * Hot reload orchestration for Axon Flow shared packages using native fs.watch.
 * Ensures IU-001 Validation V1.3 by rebuilding packages and propagating updates
 * to dependant workspaces while maintaining composite TypeScript project state.
 */
import { watch } from 'node:fs';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const CI = process.env.CI === 'true';
if (CI) {
  console.log('[dev-hmr] CI detected – skipping hot-reload watcher startup.');
  process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');

const IGNORE_SEGMENTS = new Set([
  'node_modules',
  '.turbo',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
]);
const DEBOUNCE_MS = Number.parseInt(process.env.AXON_HMR_DEBOUNCE_MS ?? '250', 10);

const directoryWatchers = new Map();
const workspaceCache = new Map();
const debounceTimers = new Map();
const queuedWorkspaces = new Set();
const rebuildQueue = [];
let drainingQueue = false;
let typeScriptWatcherProcess = null;

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error(`[dev-hmr] Failed to access ${filePath}:`, error);
    }
    return false;
  }
}

function shouldIgnore(targetPath) {
  const segments = path.relative(REPO_ROOT, targetPath).split(path.sep).filter(Boolean);
  return segments.some(segment => IGNORE_SEGMENTS.has(segment));
}

async function loadPackageJson(packagePath) {
  try {
    const raw = await readFile(path.resolve(REPO_ROOT, packagePath), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[dev-hmr] Failed to read package.json at ${packagePath}:`, error);
    return null;
  }
}

async function resolveWorkspace(filePath) {
  let current = path.dirname(filePath);

  while (current.startsWith(REPO_ROOT) && current !== REPO_ROOT) {
    if (workspaceCache.has(current)) {
      return workspaceCache.get(current);
    }

    const pkgPath = path.join(current, 'package.json');
    if (await pathExists(pkgPath)) {
      const pkg = await loadPackageJson(pkgPath);
      if (!pkg || !pkg.name) {
        workspaceCache.set(current, null);
        current = path.dirname(current);
        continue;
      }

      const workspace = {
        name: pkg.name,
        dir: current,
        hasBuild: typeof pkg.scripts?.build === 'string',
        hasTypecheck: typeof pkg.scripts?.typecheck === 'string',
      };

      workspaceCache.set(current, workspace);
      return workspace;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
}

function isRelevantWorkspacePath(workspaceDir, absolutePath) {
  const relativePath = path.relative(workspaceDir, absolutePath);
  if (relativePath.startsWith('..') || relativePath.length === 0) {
    return false;
  }

  const [firstSegment] = relativePath.split(path.sep);
  return firstSegment === 'src' || relativePath.startsWith('tsconfig');
}

function scheduleWorkspace(workspace, reason) {
  if (!workspace.hasBuild) {
    console.warn(
      `[dev-hmr] ${workspace.name} has no build script; skipping rebuild trigger (${reason}).`
    );
    return;
  }

  if (debounceTimers.has(workspace.name)) {
    clearTimeout(debounceTimers.get(workspace.name));
  }

  debounceTimers.set(
    workspace.name,
    setTimeout(() => {
      debounceTimers.delete(workspace.name);
      if (queuedWorkspaces.has(workspace.name)) {
        return;
      }

      queuedWorkspaces.add(workspace.name);
      rebuildQueue.push({ workspace, reason });
      drainQueue();
    }, DEBOUNCE_MS)
  );
}

async function drainQueue() {
  if (drainingQueue) {
    return;
  }

  drainingQueue = true;
  while (rebuildQueue.length > 0) {
    const { workspace, reason } = rebuildQueue.shift();
    queuedWorkspaces.delete(workspace.name);
    await rebuildWorkspace(workspace, reason);
  }
  drainingQueue = false;
}

function runCommand(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        TURBO_HASH_ONLY_GIT_CHANGES: process.env.TURBO_HASH_ONLY_GIT_CHANGES ?? '1',
      },
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        console.warn(
          `[dev-hmr] Command ${command} ${args.join(' ')} terminated via signal ${signal}.`
        );
      } else if (code !== 0) {
        console.error(
          `[dev-hmr] Command ${command} ${args.join(' ')} failed with exit code ${code}.`
        );
      }
      resolve({ code, signal });
    });
  });
}

async function rebuildWorkspace(workspace, reason) {
  console.log(`[dev-hmr] Rebuilding ${workspace.name} (${reason}).`);
  await runCommand('pnpm', [
    'turbo',
    'run',
    'build',
    '--filter',
    `${workspace.name}...`,
    '--no-daemon',
    '--continue',
  ]);

  if (workspace.hasTypecheck) {
    await runCommand('pnpm', ['--filter', workspace.name, 'run', 'typecheck']);
  }
}

async function startTypeScriptWatcher() {
  const tsconfigPath = path.join(REPO_ROOT, 'tsconfig.build.json');
  if (!(await pathExists(tsconfigPath))) {
    console.warn('[dev-hmr] No tsconfig.build.json found; skipping TypeScript project watch.');
    return null;
  }

  console.log('[dev-hmr] Starting TypeScript project reference watcher.');
  const child = spawn('pnpm', ['exec', 'tsc', '--build', '--watch', tsconfigPath], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      TSC_WATCHFILE: process.env.TSC_WATCHFILE ?? 'useFsEvents',
      TSC_NONPOLLING_WATCHER: process.env.TSC_NONPOLLING_WATCHER ?? 'dynamicPriority',
    },
  });

  child.on('exit', (code, signal) => {
    if (signal && signal !== 'SIGINT') {
      console.warn(`[dev-hmr] TypeScript watcher exited via signal ${signal}.`);
    } else if (code !== 0) {
      console.error(`[dev-hmr] TypeScript watcher exited with code ${code}.`);
    } else {
      console.log('[dev-hmr] TypeScript watcher stopped.');
    }
  });

  return child;
}

async function discoverWorkspaceDirs(root) {
  const discovered = [];

  if (!path.isAbsolute(root) || !root.startsWith(REPO_ROOT)) {
    throw new Error(`Invalid directory path: ${root}`);
  }

  let entries;
  try {
    entries = await readdir(path.resolve(root), { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return discovered;
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dirPath = path.join(root, entry.name);
    if (shouldIgnore(dirPath)) {
      continue;
    }

    const pkgPath = path.join(dirPath, 'package.json');
    if (await pathExists(pkgPath)) {
      discovered.push(dirPath);
      continue;
    }

    const nested = await discoverWorkspaceDirs(dirPath);
    discovered.push(...nested);
  }

  return discovered;
}

async function ensureDirectoryWatcher(dir) {
  if (directoryWatchers.has(dir) || shouldIgnore(dir)) {
    return;
  }

  try {
    const watcher = watch(path.resolve(dir), { persistent: true }, async (eventType, filename) => {
      if (!filename) {
        return;
      }

      const resolvedPath = path.resolve(dir, filename.toString());
      if (shouldIgnore(resolvedPath)) {
        return;
      }

      const workspace = await resolveWorkspace(resolvedPath);
      if (!workspace || !isRelevantWorkspacePath(workspace.dir, resolvedPath)) {
        return;
      }

      const relativePath = path.relative(workspace.dir, resolvedPath);
      scheduleWorkspace(workspace, `${eventType} ${relativePath}`);

      if (eventType === 'rename') {
        try {
          const stats = await stat(path.resolve(resolvedPath));
          if (stats.isDirectory()) {
            await ensureDirectoryWatcher(resolvedPath);
          }
        } catch (error) {
          if (error.code === 'ENOENT') {
            removeWatchersUnder(resolvedPath);
          }
        }
      }
    });

    directoryWatchers.set(dir, watcher);

    const entries = await readdir(path.resolve(dir), { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childDir = path.join(dir, entry.name);
        await ensureDirectoryWatcher(childDir);
      }
    }
  } catch (error) {
    console.error(`[dev-hmr] Failed to watch directory ${dir}:`, error);
  }
}

function removeWatchersUnder(rootDir) {
  for (const watchedDir of [...directoryWatchers.keys()]) {
    if (watchedDir === rootDir || watchedDir.startsWith(`${rootDir}${path.sep}`)) {
      const watcher = directoryWatchers.get(watchedDir);
      watcher?.close();
      directoryWatchers.delete(watchedDir);
    }
  }
}

async function initialiseWatchers() {
  typeScriptWatcherProcess = await startTypeScriptWatcher();

  const workspaceDirs = await discoverWorkspaceDirs(PACKAGES_ROOT);
  if (workspaceDirs.length === 0) {
    console.log(
      '[dev-hmr] No shared packages detected; watcher is idle until packages are created.'
    );
  }

  for (const workspaceDir of workspaceDirs) {
    await ensureDirectoryWatcher(workspaceDir);
  }

  if (await pathExists(PACKAGES_ROOT)) {
    await ensureDirectoryWatcher(PACKAGES_ROOT);
  }

  console.log('[dev-hmr] Hot reload watcher active across packages/**.');

  const shutdown = async () => {
    for (const watcher of directoryWatchers.values()) {
      watcher.close();
    }
    directoryWatchers.clear();

    if (typeScriptWatcherProcess) {
      typeScriptWatcherProcess.kill('SIGINT');
    }
  };

  process.once('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });

  process.once('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
}

initialiseWatchers().catch(error => {
  console.error('[dev-hmr] Failed to initialise hot reload manager:', error);
  process.exit(1);
});
