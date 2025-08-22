import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
    only: false,
  },
  clean: true,
  treeshake: true,
  sourcemap: true,
});
