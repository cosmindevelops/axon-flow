#!/usr/bin/env node
/**
 * Incremental TypeScript type-checking for lint-staged
 *
 * This script runs type-checking on staged TypeScript files.
 * It uses the existing tsconfig files in the monorepo.
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Get staged files from command line arguments
const stagedFiles = process.argv.slice(2);

if (stagedFiles.length === 0) {
  console.log('No TypeScript files to check');
  process.exit(0);
}

// Filter for TypeScript files
const tsFiles = stagedFiles.filter(
  file => /\.(ts|tsx|mts|cts)$/.test(file) && !file.endsWith('.d.ts')
);

if (tsFiles.length === 0) {
  console.log('No TypeScript files to check');
  process.exit(0);
}

console.log(`Type-checking ${tsFiles.length} TypeScript file(s)...`);

try {
  // Run tsc with noEmit to check types without generating output
  // Using --skipLibCheck to speed up checking
  execSync('pnpm exec tsc --noEmit --skipLibCheck', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  console.log('✓ Type-checking passed');
  process.exit(0);
} catch {
  console.error('✗ Type-checking failed');
  process.exit(1);
}
