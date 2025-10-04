# Packages Workspace

Authoritative guidance: `docs/architecture/project-structure.md` §§2–3 define the layered package topology and naming scheme. Consult the Binding Authority Manual Section 8 for coding standards and Section 6 for provider governance before committing changes.

## Purpose

- Houses reusable libraries shared across apps and services, organised by layer (`core/`, `application/`, `infrastructure/`, `contracts/`, `tooling/`).
- Encapsulates domain logic, policies, adapters, schemas, and tooling configurations that must remain framework-agnostic and type-safe.
- Enables pnpm/Turborepo incremental builds via project references rooted in `packages/tsconfig.base.json`.

## Conventions

- Package names follow `@axon/<layer>-<module>` and increment semantic versions. All dependencies on sibling packages use `workspace:*` ranges.
- Each package folder must contain the standard scaffold (`package.json`, `tsconfig.json`, `tsup.config.ts`, `jest.config.ts`, `.eslintrc.cjs`, `.prettierrc.cjs`, `src/`, `tests/`, `README.md`, `CHANGELOG.md`).
- Source exports flow top-down: core → application → infrastructure → services/apps. Cross-layer imports in the opposite direction are forbidden without ADR approval.
- Tests annotate validation IDs (e.g., `// Covers V15.3`) and respect IU responsibilities (`docs/main/003-validation_criteria.md`).
- Provider adapters in `infrastructure/*` must implement the interfaces defined in `docs/main/002-technical-specification.md` Book II §5.4 and §5.9.

## When to Create a New Package

Create a package when functionality:

1. Serves multiple services/apps and must remain technology-agnostic.
2. Implements a discrete IU deliverable or validation criterion.
3. Requires its own release cadence or bundling strategy.
   If logic is specific to a single service or app, keep it within that deployable’s `src/` tree to avoid unnecessary indirection.

## Shared TypeScript Configuration

Use `packages/tsconfig.base.json` as the base for every package `tsconfig.json`. It enforces composite builds, strict type checking, and consistent output folders per the Turborepo foundation requirements.

## Example Package Template

Start from `packages/template.package.json` when bootstrapping a new library. Update the metadata (name, description, IU references) and adjust default dependencies to match the target layer.
