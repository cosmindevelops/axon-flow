#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set(['.git', '.turbo', 'node_modules']);
const TARGET_DIRECTORIES = new Set(['dist', 'build', '.next', 'coverage']);
const TARGET_FILES = new Set([
  'tsconfig.tsbuildinfo',
  'tsconfig.build.tsbuildinfo',
  '.tsbuildinfo',
]);

async function removePath(targetPath) {
  await fs.rm(targetPath, { force: true, recursive: true });
  const relative = path.relative(ROOT, targetPath) || '.';
  process.stdout.write(`[clean] removed ${relative}\n`);
}

async function crawl(directory) {
  const entries = await fs.readdir(path.resolve(ROOT, directory), { withFileTypes: true });

    for (const entry of entries) {
      const { name } = entry;
      if (SKIP_DIRECTORIES.has(name)) {
        continue;
      }

      const entryPath = path.join(directory, name);

      if (entry.isDirectory()) {
        if (TARGET_DIRECTORIES.has(name)) {
          await removePath(entryPath);
          continue;
        }

        await crawl(entryPath);
        continue;
      }

      if (entry.isFile() && TARGET_FILES.has(name)) {
        await removePath(entryPath);
      }
    }
  } catch (error) {
    console.error(`Failed to read directory: ${error.message}`);
  }
}

async function main() {
  try {
    await crawl(ROOT);
  } catch (error) {
    process.stderr.write(`[clean] failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
