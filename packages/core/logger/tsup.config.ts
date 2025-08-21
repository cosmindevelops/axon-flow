import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  experimentalDts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: ["@axon/types", "@axon/errors", "@axon/config"],
});
