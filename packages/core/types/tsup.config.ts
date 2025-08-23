import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "platform/node/index": "src/platform/node/index.ts",
    "platform/browser/index": "src/platform/browser/index.ts",
    "platform/common/index": "src/platform/common/index.ts",
    "core/agent/index": "src/core/agent/index.ts",
    "core/message/index": "src/core/message/index.ts",
    "core/registry/index": "src/core/registry/index.ts",
    "core/task/index": "src/core/task/index.ts",
    "core/workflow/index": "src/core/workflow/index.ts",
  },
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
    only: false,
  },
  clean: true,
  treeshake: true,
  sourcemap: true,
});
