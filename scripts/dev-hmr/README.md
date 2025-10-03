# @axon/dev-hmr

Hot reload coordinator for IU-001 (V1.3) ensuring packages rebuilt on change propagate to dependant apps and services within `turbo run dev`.

## Responsibilities

- Watch `packages/**/src` and `tsconfig` files via native `fs.watch` (recursive walker) for low-latency rebuild detection.
- Trigger targeted `turbo run build --filter <pkg>...` executions so downstream workspaces receive fresh artifacts without manual restarts.
- Maintain TypeScript project reference state by executing `tsc --build --watch tsconfig.build.json` alongside rebuilds.
- Debounce events (default 250 ms) and ignore heavy directories (`node_modules`, `dist`, `.turbo`, `.next`, `build`, `coverage`) to keep CPU usage predictable on developer laptops.

## Environment Controls

- `AXON_HMR_DEBOUNCE_MS`: override debounce window (ms) when editing large generated files.
- `TURBO_HASH_ONLY_GIT_CHANGES`: honoured during rebuilds; defaults to `1` to minimise hashing load in development.
- `TSC_WATCHFILE`, `TSC_NONPOLLING_WATCHER`: may be set to tune TypeScript watcher behaviour (defaults: `useFsEvents`, `dynamicPriority`).
- Setting `CI=true` disables the watcher entirely so CI jobs remain deterministic per docs/main/002-technical-specification.md §9.2 (IU-1 testing plan).

## Known Limitations

1. **Initial rebuild is cold.** The first change after starting `pnpm dev` runs a full `turbo run build` for the affected package and dependants, which can take several seconds on slow disks.
2. **Packages must expose `build` and `typecheck` scripts.** Workspaces without these scripts are skipped; add them using the templates in `apps/`, `packages/`, or `services/` per `docs/architecture/project-structure.md` §3.
3. **TypeScript-only assets.** Non-TypeScript assets (e.g. protobuf, GraphQL SDL) require layer-specific watchers; add pipelines as new IU tasks demand them.
4. **Nested git worktrees.** If running within nested git worktrees, additional ignore rules may be necessary to avoid duplicate events.

## Troubleshooting

- **Hot reload feels slow (>3 s):** increase debounce (`AXON_HMR_DEBOUNCE_MS=400`) or verify Turbo cache folder is on SSD; confirm no antivirus is scanning `dist/` outputs.
- **Changes ignored:** ensure the target workspace has a `package.json` with `build` script and that source files reside under `src/`. The watcher resolves the nearest workspace by walking up from the changed path.
- **Watcher exits early:** inspect terminal output for TypeScript watcher errors. Validating `tsconfig.build.json` and per-package `tsconfig.json` references typically resolves issues.
- **Rebuild loops:** confirm generated files are excluded via `.gitignore` and `dist/**` remains ignored; loops generally indicate accidental writes under `src/` from tooling.

Document validation references:

- `docs/stories/iu-001-turborepo-monorepo-foundation.md` (Key Results, V1.3)
- `docs/draft/tests/01.001-test-design-20251003.md` (Scenario 1.1-INT-003)
- `docs/main/002-technical-specification.md` §9.2 (IU-1 testing plan)
