import { resolve } from 'node:path';

export function resolveProjectPath(...segments: string[]): string {
  return resolve(process.cwd(), '..', '..', ...segments);
}
