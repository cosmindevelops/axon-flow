#!/usr/bin/env node
/**
 * Smart TypeScript Type Checker for lint-staged
 *
 * This script intelligently runs TypeScript type checking on affected files:
 * - Detects which workspace packages are affected by staged TypeScript files
 * - Uses Turborepo's --filter flag for package-aware type checking when packages exist
 * - Falls back to root-level type checking when only root files are affected
 * - Optimizes for monorepo performance (<10s target for typical commits)
 *
 * Usage: Called automatically by lint-staged during pre-commit
 * Manual: node scripts/lint-staged-typecheck.js <file1> <file2> ...
 *
 * Related: docs/draft/story/01.001-story-design-20251003.md (IU-1, AC12)
 * Validation: V1.20 - Pre-commit hooks enforce quality checks
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const WORKSPACE_PREFIXES = new Set(['apps', 'packages', 'services', 'infrastructure']);

/**
 * Detect which workspace packages are affected by the given files
 * @param {string[]} files - Staged TypeScript files
 * @returns {Set<string>} Set of affected package names
 */
function detectAffectedPackages(files) {
  const affectedPackages = new Set();

  for (const file of files) {
    const absoluteFile = path.isAbsolute(file) ? file : path.join(rootDir, file);
    const packageDir = findNearestPackageDir(absoluteFile);

    if (!packageDir) {
      continue;
    }

    const relativePackage = path.relative(rootDir, packageDir).split(path.sep).join('/');

    const [prefix] = relativePackage.split('/');
    if (!WORKSPACE_PREFIXES.has(prefix)) {
      continue;
    }

    affectedPackages.add(relativePackage);
  }

  return affectedPackages;
}

function findNearestPackageDir(filePath) {
  let currentDir = path.dirname(filePath);

  while (currentDir.startsWith(rootDir)) {
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

/**
 * Run type checking using the most efficient strategy
 * @param {string[]} files - Staged TypeScript files
 * @returns {number} Exit code (0 = success, non-zero = type errors)
 */
function runTypeCheck(files) {
  // Filter to only TypeScript files
  const tsFiles = files.filter(file => /\.(ts|tsx|mts|cts)$/.test(file) && !file.endsWith('.d.ts'));

  if (tsFiles.length === 0) {
    console.log('✓ No TypeScript files to check');
    return 0;
  }

  console.log(`\n🔍 Type checking ${tsFiles.length} TypeScript file(s)...\n`);

  const affectedPackages = detectAffectedPackages(tsFiles);
  const rootTsFiles = tsFiles.filter(file => isRootTypeFile(file));
  const hasRootTypeFiles = rootTsFiles.length > 0;

  try {
    if (affectedPackages.size > 0) {
      // Strategy 1: Package-aware type checking with Turborepo
      console.log(`📦 Affected packages: ${Array.from(affectedPackages).join(', ')}`);

      // Build filter string for Turborepo (e.g., --filter=apps/web --filter=packages/core)
      const filterArgs = Array.from(affectedPackages)
        .map(pkg => `--filter=${pkg}`)
        .join(' ');

      const turboCmd = `pnpm turbo run typecheck ${filterArgs}`;
      console.log(`Running: ${turboCmd}\n`);

      execSync(turboCmd, {
        cwd: rootDir,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      console.log('\n✓ Package type checking passed\n');
    }

    if (hasRootTypeFiles || affectedPackages.size === 0) {
      // Strategy 2: Root-level type checking (no workspace packages affected)
      console.log('📋 Checking root-level TypeScript files...\n');

      const filesForRootCheck = hasRootTypeFiles ? rootTsFiles : tsFiles;
      const tempTsConfig = createTemporaryTsConfig(filesForRootCheck);
      const tscCmd = `pnpm exec tsc --noEmit --pretty false --project "${tempTsConfig}"`;
      console.log(`Running: ${tscCmd}\n`);

      try {
        execSync(tscCmd, {
          cwd: rootDir,
          stdio: 'inherit',
          env: { ...process.env, FORCE_COLOR: '1' },
        });
      } finally {
        cleanupTemporaryTsConfig(tempTsConfig);
      }

      console.log('\n✓ Root type checking passed\n');
    }

    return 0;
  } catch (error) {
    console.error('\n❌ Type checking failed\n');
    return error.status || 1;
  }
}

function isRootTypeFile(file) {
  const absoluteFile = path.isAbsolute(file) ? file : path.join(rootDir, file);
  const relativePath = path.relative(rootDir, absoluteFile).split(path.sep).filter(Boolean);
  const [prefix] = relativePath;
  return !prefix || !WORKSPACE_PREFIXES.has(prefix);
}

function createTemporaryTsConfig(files) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axon-lint-staged-'));
  const tempConfigPath = path.join(tempDir, 'tsconfig.json');

  const config = {
    extends: path.relative(tempDir, path.join(rootDir, 'tsconfig.json')), // reuse root project references
    files: files.map(file => {
      const absoluteFile = path.isAbsolute(file) ? file : path.join(rootDir, file);
      return path.relative(tempDir, absoluteFile);
    }),
  };

  fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));
  return tempConfigPath;
}

function cleanupTemporaryTsConfig(tempConfigPath) {
  try {
    const tempDir = path.dirname(tempConfigPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('⚠️  Failed to clean up temporary tsconfig:', error);
  }
}

// Main execution
const stagedFiles = process.argv.slice(2);

if (stagedFiles.length === 0) {
  console.log('⚠️  No files provided to type checker');
  process.exit(0);
}

const exitCode = runTypeCheck(stagedFiles);
process.exit(exitCode);
