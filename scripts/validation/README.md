# Monorepo Validation & Benchmark Suite

The validation runner in `scripts/validation/index.ts` automates the IU-001 acceptance criteria defined in `docs/draft/story/01.001-story-design-20251003.md` and the corresponding test matrix in `docs/draft/tests/01.001-test-design-20251003.md`. It executes all mandatory checks from V1.1 through V1.20 and records benchmark telemetry for install, build, lint, and quality gates.

## Covered Requirements

| Validation ID        | Description                              | Target                                                                     |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| V1.1                 | `pnpm install --frozen-lockfile` runtime | `< 60s` (standard dev), `< 120s` (Raspberry Pi 5)                          |
| V1.2 / V1.16 / V1.17 | `turbo run build` cold vs warm cache     | Warm build ≥ 50% faster than cold run                                      |
| V1.3                 | Hot reload propagation                   | Build/log event detected within 20s of change                              |
| V1.4                 | `pnpm-workspace.yaml` structure          | Globs for `apps/*`, `packages/*`, `services/*` present                     |
| V1.5 / V1.13         | Workspace linking & type safety          | All workspaces linked via `node_modules` symlinks; `pnpm typecheck` passes |
| V1.9 – V1.11         | Root scripts available                   | Implicit via build/typecheck execution                                     |
| V1.14                | ESLint shared config                     | `pnpm lint` passes with `--max-warnings=0` default                         |
| V1.15                | Prettier formatting                      | `pnpm format:check` passes                                                 |
| V1.20                | Husky pre-commit guard                   | Hook blocks type errors and passes clean files                             |

## Usage

```bash
# Run full validation locally (may mutate node_modules and .turbo)
pnpm validate

# Generate a benchmark report with timestamped JSON artifacts
pnpm benchmark

# Skip expensive checks (e.g., hot reload) when iterating
pnpm exec tsx scripts/validation/index.ts --skip-hot-reload --skip-precommit
```

### CLI Options

| Flag                                                                      | Description                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `--profile <standard                                                      | pi5>`                                                             | Adjusts install duration SLA (default: `standard`).                              |
| `--mode <validate                                                         | benchmark>`                                                       | In `benchmark` mode the runner archives JSON reports under `reports/benchmarks`. |
| `--output <path>`                                                         | Writes the latest run to a fixed JSON file path.                  |
| `--benchmark-dir <path>`                                                  | Overrides the default `reports/benchmarks` directory.             |
| `--skip-install`, `--skip-build`, `--skip-hot-reload`, `--skip-precommit` | Bypass individual checks when partial verification is acceptable. |
| `--quiet`                                                                 | Suppresses successful step logs.                                  |
| `--keep-artifacts`                                                        | Retains temporary files created during validation.                |

## Benchmark Artifacts

Reports are JSON documents containing:

- Hardware profile (Node, pnpm versions, CPU count, memory)
- Pass/fail/skip counts and total duration
- Per-validation metrics (durations, ratio improvements, hook exit codes)

CI publishes the artifact as `validation-report` for each run (`.github/workflows/validation.yml`).

## Troubleshooting

- **Install duration exceeds SLA (V1.1)**: Ensure local pnpm store resides on SSD and remote cache is disabled. Clear `node_modules` and retry.
- **Build cache improvement < 50% (V1.2)**: Delete `.turbo/`, verify tasks inherit from shared `turbo.json` pipeline, and confirm no `dependsOn` cycles.
- **Workspace linking failure (V1.5)**: Run `pnpm install` to refresh symlinks. Confirm every workspace `package.json` declares a `name` field matching the expected scope.
- **Hot reload failure (V1.3)**: The runner looks for a workspace with a `src/` folder and `build` script. Create at least one baseline package (e.g., `packages/core-example`) or run with `--skip-hot-reload` until packages exist.
- **Pre-commit hook false positives (V1.20)**: Verify `.husky/pre-commit` calls `pnpm lint-staged` and that staged file paths resolve to existing workspaces. Use `pnpm exec husky run pre-commit -- HUSKY=1` locally to debug.

## Generated Files

- `reports/benchmarks/latest-ci.json` – latest CI run (ignored via `reports/.gitignore`).
- `reports/benchmarks/benchmark-*.json` – historical benchmark snapshots when `--mode benchmark` is used.

Ensure the repository is clean before running the suite so temporary files can be staged safely for the Husky verification.
