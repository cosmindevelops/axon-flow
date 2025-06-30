import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  shims: true,
  external: ['zod', 'nanoid'],
  esbuildOptions(options) {
    options.platform = 'node';
    options.target = 'node20';
  },
});
