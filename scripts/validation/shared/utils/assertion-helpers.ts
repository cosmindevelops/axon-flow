/**
 * Domain specific assertion helpers for IU validators.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect } from 'vitest';

const DEFAULT_ENCODING = 'utf-8';

function resolvePath(filePath: string, baseDir: string): string {
  return resolve(baseDir, filePath);
}

export function assertFileExists(filePath: string, baseDir: string = process.cwd()): void {
  const fullPath = resolvePath(filePath, baseDir);
  if (!existsSync(fullPath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

export function assertDirectoryExists(dirPath: string, baseDir: string = process.cwd()): void {
  const fullPath = resolvePath(dirPath, baseDir);
  if (!existsSync(fullPath)) {
    throw new Error(`Expected directory to exist: ${dirPath}`);
  }
  const stats = statSync(fullPath);
  if (!stats.isDirectory()) {
    throw new Error(`Expected path to be directory: ${dirPath}`);
  }
}

export function assertJsonFileContains(
  filePath: string,
  expected: Record<string, unknown>,
  baseDir: string = process.cwd()
): void {
  assertFileExists(filePath, baseDir);
  const fullPath = resolvePath(filePath, baseDir);
  const parsed = JSON.parse(readFileSync(fullPath, DEFAULT_ENCODING));

  for (const [key, value] of Object.entries(expected)) {
    expect(parsed).toHaveProperty(key);
    if (typeof value === 'object' && value !== null) {
      expect(parsed[key]).toMatchObject(value as Record<string, unknown>);
    } else {
      expect(parsed[key]).toEqual(value);
    }
  }
}

export function assertPackageJsonValid(
  packageDir: string,
  requiredFields: readonly string[] = ['name', 'version'],
  baseDir: string = process.cwd()
): void {
  const fullPath = resolvePath(join(packageDir, 'package.json'), baseDir);
  if (!existsSync(fullPath)) {
    throw new Error(`package.json missing in ${packageDir}`);
  }

  const pkg = JSON.parse(readFileSync(fullPath, DEFAULT_ENCODING));
  for (const field of requiredFields) {
    expect(pkg).toHaveProperty(field);
  }
}

export function assertTypeScriptCompiles(
  tsconfigPath: string,
  baseDir: string = process.cwd()
): void {
  const projectConfig = resolvePath(tsconfigPath, baseDir);
  try {
    execSync(`pnpm exec tsc --project "${projectConfig}" --noEmit`, {
      cwd: baseDir,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
  } catch (error) {
    const stdout = error instanceof Error && 'stdout' in error ? String((error as any).stdout) : '';
    const stderr = error instanceof Error && 'stderr' in error ? String((error as any).stderr) : '';
    throw new Error(`TypeScript compilation failed for ${tsconfigPath}\n${stdout}${stderr}`);
  }
}

export function assertEslintClean(target: string, baseDir: string = process.cwd()): void {
  try {
    execSync(`pnpm exec eslint ${target} --max-warnings 0`, {
      cwd: baseDir,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
  } catch (error) {
    const stdout = error instanceof Error && 'stdout' in error ? String((error as any).stdout) : '';
    const stderr = error instanceof Error && 'stderr' in error ? String((error as any).stderr) : '';
    throw new Error(`ESLint violations detected for ${target}\n${stdout}${stderr}`);
  }
}
