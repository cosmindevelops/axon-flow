# Services Workspace

Authoritative guidance: `docs/architecture/project-structure.md` §§2 & 4 describe the NestJS service template, while `docs/main/002-technical-specification.md` Book II §5.4 outlines the agent and hub service contracts enforced here.

## Purpose

- Contains deployable backend services (gateway, hub, registry, auth, billing, orchestrator, notification-agent, observability-gateway) that compose the hub-centric architecture.
- Each service stitches together packages from `packages/` with infrastructure wiring (Nest modules, controllers/resolvers, messaging handlers) and aligns with the Implementation Unit road map (IU-8 through IU-26).
- Services are the only layer permitted to bind to infrastructure runtimes (RabbitMQ, PostgreSQL, Redis) and provider adapters.

## Conventions

- Service directories follow `services/<service-name>` in kebab-case.
- Standard scaffold: `package.json`, `tsconfig.json`, `nest-cli.json`, `.eslintrc.cjs`, `.prettierrc.cjs`, `src/` (split into `app/`, `contracts/`, `application/`, `infrastructure/`, `config/`, `observability/`), and `tests/{unit,integration,contract,e2e}`.
- All runtime code must use dependency injection tokens defined in shared packages; hard-coded provider implementations are prohibited.
- Message handlers publish/consume payloads that match schemas declared in `packages/contracts/events` and must carry correlation IDs (V15.12, V16.7).
- Services emit telemetry through the shared observability pipeline (metrics, traces, structured logs) per Section 11 of the Binding Manual.

## When to Create a New Service

Create a service only when the Implementation Plan introduces a new independently deployable capability with dedicated runtime scaling or bounded context. Reuse existing services by adding modules when the change belongs to an established bounded context. All new services require architecture approval and validation coverage mapped to `docs/main/003-validation_criteria.md`.

## Example Package Template

Use `services/template.package.json` when bootstrapping a NestJS service. Update the `name`, description, and IU references, then wire dependencies to the appropriate packages (application/infrastructure) before enabling CI pipelines.
