# Packages Directory

This directory contains shared packages and libraries for Axon Flow:

## Core Packages (`packages/core/`)

- `config/` - Configuration management with Zod validation
- `types/` - TypeScript type definitions
- `logger/` - Structured logging infrastructure with Pino
- `errors/` - Enhanced error handling utilities

## Services (`packages/services/`)

- Shared logic for backend microservices
- Common patterns and utilities

## Agents (`packages/agents/`)

- Shared logic for agent implementations
- Common agent interfaces and base classes

## Tooling (`packages/tooling/`)

- Development tools and configurations
- Build utilities and scripts

Each package should be independently versioned and follow the Provider Pattern for external dependencies.
