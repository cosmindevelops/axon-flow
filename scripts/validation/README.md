# Axon Flow Validation System (Variant 1)

> Source of truth: `claudedocs/validation-system-variant1-implementation-guide.md`

This workspace hosts the IU-centric validation system scaffold. It aligns with:

- `docs/main/003-validation_criteria.md` — validation criteria catalogue
- `AGENTS.md` Section 9 — Testing & Validation Authority
- `AGENTS.md` Section 16 — Coding Standards & TypeScript Discipline

## Getting Started

```bash
pnpm install --filter @axon/validation
pnpm --filter @axon/validation build
```

Run the orchestrator in development mode:

```bash
pnpm --filter @axon/validation exec tsx orchestrator/cli.ts --help
```

> ⚠️ Validators reference repository state; run from repo root when executing commands.

## Command Reference

- `pnpm --filter @axon/validation run build` — compile TypeScript sources
- `pnpm --filter @axon/validation run test` — execute Vitest suite
- `pnpm --filter @axon/validation run validate:example` — run IU-001 via compiled CLI (placeholder)

Detailed process documentation lives in the implementation guide.
