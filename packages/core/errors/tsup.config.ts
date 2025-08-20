import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  sourcemap: true,
  clean: false,
  splitting: true,
  treeshake: true,
  minify: process.env["NODE_ENV"] === "production",
  metafile: true,
  target: ["node24", "es2024"],
  platform: "neutral",
  bundle: true,
  skipNodeModulesBundle: true,
  keepNames: true,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
