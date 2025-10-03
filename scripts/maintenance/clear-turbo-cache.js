#!/usr/bin/env node
'use strict';

const path = require('node:path');
import fs from 'node:fs/promises';

const ROOT = process.cwd();
const CACHE_CANDIDATES = [
  path.join(ROOT, '.turbo'),
  path.join(ROOT, 'node_modules', '.cache', 'turbo'),
];

async function removeCacheDirectory(targetPath) {
  try {
    await fs.access(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
  const relative = path.relative(ROOT, targetPath) || '.';
  process.stdout.write(`[clean:cache] removed ${relative}\n`);
}

async function main() {
  try {
    for (const candidate of CACHE_CANDIDATES) {
      await removeCacheDirectory(candidate);
    }
  } catch (error) {
    process.stderr.write(`[clean:cache] failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
