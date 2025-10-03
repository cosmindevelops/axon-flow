# Monorepo Validation & Benchmark Suite

The validation runner in `scripts/validation/index.ts` automates the IU-001 acceptance criteria defined in `docs/draft/story/01.001-story-design-20251003.md` and the corresponding test matrix in `docs/draft/tests/01.001-test-design-20251003.md`. It executes all mandatory checks from V1.1 through V1.20 and records benchmark telemetry for install, build, lint, and quality gates.

## Covered Requirements

| Validation ID        | Description                                 | Target                                                                     |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| V1.1                 | `pnpm install --frozen-lockfile` runtime    | `< 60s` (standard dev), `< 120s` (Raspberry Pi 5)                          |
| V1.2 / V1.16 / V1.17 | `turbo run build` cold vs warm cache        | Warm build ≥ 50% faster than cold run                                      |
| V1.3                 | Hot reload propagation (filesystem polling) | Dist artifact changes detected within 20s of source modification           |
| V1.4                 | `pnpm-workspace.yaml` structure             | Globs for `apps/*`, `packages/*`, `services/*` present                     |
| V1.5 / V1.13         | Workspace linking & type safety             | All workspaces linked via `node_modules` symlinks; `pnpm typecheck` passes |
| V1.6                 | `.gitignore` covers monorepo artifacts      | Required patterns: `.turbo`, `dist`, `build`, `.env`, `coverage`, etc.     |
| V1.7                 | `.env.example` documents required variables | Schema validation via `validate-env.js` passes                             |
| V1.9 / V1.10 / V1.11 | Package manifests follow semver & structure | Semantic versioning, required root scripts present                         |
| V1.12                | Dependency hoisting optimized               | Package duplicates < 5% threshold                                          |
| V1.14                | ESLint shared config                        | `pnpm lint` passes with `--max-warnings=0` default                         |
| V1.15                | Prettier formatting                         | `pnpm format:check` passes                                                 |
| V1.19                | LICENSE file with valid identifier          | SPDX identifier or standard license text present                           |
| V1.20                | Husky pre-commit guard                      | Hook blocks type errors and passes clean files                             |

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

## Performance Optimizations

The validation suite uses **parallel execution** for independent filesystem checks (V1.4, V1.6, V1.7, V1.9, V1.19), resulting in **30-40% faster validation** compared to sequential execution. Heavy operations (install, build, hot reload) remain sequential due to side effects.

## Key Improvements

### V1.3 Hot Reload (Filesystem Polling)

Replaced brittle log parsing (`/ready|watching|started/i` regex) with robust filesystem polling. The test now:

- Waits for initial `dist/` artifacts to appear
- Captures artifact mtime and content hash
- Modifies source file and polls for dist changes
- Verifies content actually changed (not just touched)

This eliminates false positives from unrelated log messages and works across all build tools.

### V1.19 LICENSE Validation (P0)

Critical legal compliance check ensuring:

- LICENSE file exists at repository root
- Contains SPDX identifier OR standard license text
- Matches known license patterns (MIT, Apache, BSD, ISC, MPL, PROPRIETARY)

### V1.6 .gitignore Coverage (P1)

Prevents accidental commits of:

- Build artifacts (`dist`, `build`, `.next`)
- Cache directories (`.turbo`, `coverage`)
- Environment secrets (`.env*`)
- TypeScript build info (`*.tsbuildinfo`)

### V1.12 Dependency Hoisting Analysis (P1)

Analyzes `pnpm list` output to detect duplicate packages across workspaces:

- Flags if duplicates exceed 5% threshold
- Provides actionable recommendations for `pnpm.overrides`
- Prevents disk bloat and installation performance regression

## Troubleshooting

- **Install duration exceeds SLA (V1.1)**: Ensure local pnpm store resides on SSD and remote cache is disabled. Clear `node_modules` and retry.
- **Build cache improvement < 50% (V1.2)**: Delete `.turbo/`, verify tasks inherit from shared `turbo.json` pipeline, and confirm no `dependsOn` cycles.
- **Workspace linking failure (V1.5)**: Run `pnpm install` to refresh symlinks. Confirm every workspace `package.json` declares a `name` field matching the expected scope.
- **Hot reload failure (V1.3)**: The runner monitors `dist/index.js` for changes. Ensure workspace has valid build configuration generating dist artifacts. Use `--skip-hot-reload` if no packages exist yet.
- **Pre-commit hook false positives (V1.20)**: Verify `.husky/pre-commit` calls `pnpm lint-staged` and that staged file paths resolve to existing workspaces. Use `pnpm exec husky run pre-commit -- HUSKY=1` locally to debug.
- **LICENSE validation failure (V1.19)**: Add LICENSE file with SPDX identifier comment (`// SPDX-License-Identifier: MIT`) or use standard license template.
- **Hoisting duplicates exceed threshold (V1.12)**: Review `pnpm list` output, update dependency versions for consistency, or use `pnpm.overrides` in root `package.json` to force specific versions.

## Generated Files

- `reports/benchmarks/latest-ci.json` – latest CI run (ignored via `reports/.gitignore`).
- `reports/benchmarks/benchmark-*.json` – historical benchmark snapshots when `--mode benchmark` is used.

Ensure the repository is clean before running the suite so temporary files can be staged safely for the Husky verification.
