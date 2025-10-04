import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PackageManifest {
  readonly name?: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly description?: string;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

export interface WorkspacePackage {
  readonly name: string;
  readonly dir: string;
  readonly manifest: PackageManifest;
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.pnpm',
  'coverage',
  'dist',
  'build',
  '.husky',
  '.github',
  'reports',
  'docs',
  'claudedocs',
]);

const WORKSPACE_FOLDERS = ['apps', 'packages', 'services', 'infrastructure', 'scripts'];

export function findWorkspacePackages(rootDir: string): WorkspacePackage[] {
  const results: WorkspacePackage[] = [];
  const rootManifest = parseManifest(join(rootDir, 'package.json'));
  results.push({ name: rootManifest.name ?? 'root', dir: rootDir, manifest: rootManifest });

  for (const folder of WORKSPACE_FOLDERS) {
    const folderPath = join(rootDir, folder);
    try {
      const entries = readdirSync(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }
        collectPackages(join(folderPath, entry.name), results, 0);
      }
    } catch (error) {
      // Folder may not exist yet; ignore.
    }
  }

  return results;
}

function collectPackages(dir: string, results: WorkspacePackage[], depth: number): void {
  if (depth > 4) {
    return;
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const hasPackageJson = entries.some(entry => entry.isFile() && entry.name === 'package.json');
  if (hasPackageJson) {
    const manifest = parseManifest(join(dir, 'package.json'));
    results.push({ name: manifest.name ?? dir, dir, manifest });
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }
    collectPackages(join(dir, entry.name), results, depth + 1);
  }
}

function parseManifest(path: string): PackageManifest {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as PackageManifest;
  return raw;
}
