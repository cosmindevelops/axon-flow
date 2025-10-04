import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
export const VALIDATION_ROOT = resolve(THIS_DIR, '..');
export const REPORTS_DIR = join(VALIDATION_ROOT, 'reports');
export const REPORTS_LATEST_DIR = join(REPORTS_DIR, 'latest');
export const REPORTS_HISTORY_DIR = join(REPORTS_DIR, 'history');

export function resolveIUPath(iu: number): string {
  const segment = `iu-${iu.toString().padStart(3, '0')}`;
  return join(VALIDATION_ROOT, segment);
}
