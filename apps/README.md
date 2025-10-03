# Apps Workspace

Authoritative guidance: `docs/architecture/project-structure.md` §2 _Monorepo Blueprint_ and §4 _Service & App Templates_ describe the responsibilities and conventions for this directory.

## Purpose

- Hosts deployable user-facing surfaces (e.g., `web-dashboard`, `admin-dashboard`, `mobile-web`) aligned with IU-27 through IU-31 and IU-28/IU-29 validation matrices.
- Implements Next.js applications that consume gateway contracts and SDKs published from `packages/contracts/*` per the hub-centric architecture.
- Provides audited telemetry (FR13) and feature flows required by `docs/prd.md` Epic 9 and Epic 10 personas.

## Conventions

- Every app lives in its own folder (`apps/<app-name>`) using kebab-case naming.
- Each app must include `package.json`, `tsconfig.json`, `next.config.js`, and layered `src/` sub-folders (`app/`, `features/`, `infrastructure/`, `contracts/`, `lib/`, `styles/`).
- App packages are private and named `@axon/app-<surface>` to honour the naming contract defined in the project structure standard.
- Tests are organised under `tests/{unit,component,e2e}` with validation ID annotations (`// Covers V28.4`).
- Observability (logs, metrics, traces) must be wired through `@axon/logger` and the OpenTelemetry presets mandated in Section 11 of the Binding Manual.

## When to Create a New App

Create a new app only when a distinct persona-facing experience is required and documented in `docs/prd.md`. Favour extending existing apps with feature slices over creating parallel surfaces. Ensure dependencies on backend services are routed exclusively through the gateway GraphQL schema (`docs/main/002-technical-specification.md` Book II) and contracts published from the `packages/` layer.

## Example Package Template

Use `apps/template.package.json` as the starting point for new app workspaces. Update the name, description, and IU/validation references before the first commit.
