import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: process.env["NODE_ENV"] === "production",
  metafile: true,
  target: "node24",
  platform: "node",
  bundle: true,
  skipNodeModulesBundle: true,
  keepNames: true,
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
