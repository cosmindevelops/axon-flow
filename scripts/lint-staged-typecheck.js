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

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Detect which workspace packages are affected by the given files
 * @param {string[]} files - Staged TypeScript files
 * @returns {Set<string>} Set of affected package names
 */
function detectAffectedPackages(files) {
  const affectedPackages = new Set();
  const workspaceDirs = ['apps', 'packages', 'services', 'infrastructure'];

  for (const file of files) {
    const relativePath = path.relative(rootDir, file);

    // Check if file is in a workspace directory
    for (const dir of workspaceDirs) {
      if (relativePath.startsWith(`${dir}/`)) {
        // Extract package name (e.g., "apps/web" from "apps/web/src/index.ts")
        const parts = relativePath.split('/');
        if (parts.length >= 2) {
          const packagePath = path.join(rootDir, dir, parts[1]);
          // Verify package.json exists
          if (existsSync(path.join(packagePath, 'package.json'))) {
            affectedPackages.add(`${dir}/${parts[1]}`);
          }
        }
        break;
      }
    }
  }

  return affectedPackages;
}

/**
 * Run type checking using the most efficient strategy
 * @param {string[]} files - Staged TypeScript files
 * @returns {number} Exit code (0 = success, non-zero = type errors)
 */
function runTypeCheck(files) {
  // Filter to only TypeScript files
  const tsFiles = files.filter(file =>
    /\.(ts|tsx|mts|cts)$/.test(file) && !file.endsWith('.d.ts')
  );

  if (tsFiles.length === 0) {
    console.log('✓ No TypeScript files to check');
    return 0;
  }

  console.log(`\n🔍 Type checking ${tsFiles.length} TypeScript file(s)...\n`);

  const affectedPackages = detectAffectedPackages(tsFiles);

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
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      console.log('\n✓ Package type checking passed\n');
    } else {
      // Strategy 2: Root-level type checking (no workspace packages affected)
      console.log('📋 Checking root-level TypeScript files...\n');

      const tscCmd = 'pnpm exec tsc --noEmit';
      console.log(`Running: ${tscCmd}\n`);

      execSync(tscCmd, {
        cwd: rootDir,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      console.log('\n✓ Root type checking passed\n');
    }

    return 0;
  } catch (error) {
    console.error('\n❌ Type checking failed\n');
    return error.status || 1;
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
