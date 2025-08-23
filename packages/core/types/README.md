# @axon/types

> Core TypeScript type definitions and runtime validation schemas for the Axon Flow platform

## Overview

`@axon/types` provides comprehensive TypeScript type definitions and Zod validation schemas for the entire Axon Flow multi-agent orchestration platform. This package serves as the foundation for type safety and runtime validation across all platform components.

## Features

- 🎯 **Complete Type Coverage**: Comprehensive TypeScript types for all platform components
- ✅ **Runtime Validation**: Zod schemas for runtime type checking and validation
- 🏗️ **Domain-Driven Organization**: Types organized by functional domains
- 🔧 **Zero Runtime Overhead**: Type definitions have no runtime cost
- 🛡️ **Type Guards**: Utility functions for runtime type narrowing
- 📦 **Branded Types**: Type-safe identifiers with nominal typing

## Installation

```bash
# Using pnpm (recommended)
pnpm add @axon/types

# Using npm
npm install @axon/types

# Using yarn
yarn add @axon/types
```

## Usage

### Importing Types

```typescript
import type { IAgentMetadata, ITaskDefinition, IMessage } from "@axon/types";

// Use the types in your code
const agent: IAgentMetadata = {
  id: "agent-123" as AgentId,
  name: "DataProcessor",
  version: "1.0.0",
  // ... other properties
};
```

### Using Zod Schemas for Validation

```typescript
import { AgentMetadataSchema, TaskDefinitionSchema } from "@axon/types";

// Validate data at runtime
const result = AgentMetadataSchema.safeParse(incomingData);

if (result.success) {
  // Data is valid and typed
  const agent = result.data;
} else {
  // Handle validation errors
  console.error(result.error);
}
```

### Using Type Guards

```typescript
import { isAgentMetadata, isTaskDefinition, isMessage } from "@axon/types";

// Runtime type checking
function processData(data: unknown) {
  if (isAgentMetadata(data)) {
    // TypeScript knows data is IAgentMetadata here
    console.log(`Agent ${data.name} is ${data.status}`);
  }
}
```

## Package Structure

```
src/
├── core/              # Core platform types
│   ├── agent.types.ts      # Agent definitions and metadata
│   ├── agent.schemas.ts    # Agent validation schemas
│   ├── registry.types.ts   # Registry and discovery types
│   ├── registry.schemas.ts # Registry validation schemas
│   ├── task.types.ts       # Task and workflow definitions
│   ├── task.schemas.ts     # Task validation schemas
│   ├── message.types.ts    # Message bus types
│   ├── message.schemas.ts  # Message validation schemas
│   ├── workflow.types.ts   # Workflow and saga types
│   ├── workflow.schemas.ts # Workflow validation schemas
│   └── index.ts            # Core barrel export
│
├── config/            # Configuration types
│   ├── schema.types.ts     # Config schema definitions
│   ├── schema.schemas.ts   # Config schema validation
│   ├── provider.types.ts   # Provider abstractions
│   ├── provider.schemas.ts # Provider validation
│   ├── hierarchy.types.ts  # Config hierarchy types
│   ├── hierarchy.schemas.ts# Hierarchy validation
│   └── index.ts            # Config barrel export
│
├── logging/           # Logging and monitoring types
│   ├── entry.types.ts      # Log entry types
│   ├── entry.schemas.ts    # Log entry validation
│   ├── error.types.ts      # Enhanced error types
│   ├── error.schemas.ts    # Error validation
│   ├── performance.types.ts# Performance metrics
│   ├── performance.schemas.ts# Metrics validation
│   └── index.ts            # Logging barrel export
│
├── platform/          # Platform-specific types
│   ├── common.types.ts     # Cross-platform types
│   ├── common.schemas.ts   # Common validation
│   ├── node.types.ts       # Node.js specific
│   ├── node.schemas.ts     # Node.js validation
│   ├── browser.types.ts    # Browser specific
│   ├── browser.schemas.ts  # Browser validation
│   └── index.ts            # Platform barrel export
│
├── status/            # Status and state types
│   ├── index.ts            # Status types
│   └── status.schemas.ts   # Status validation
│
├── environment/       # Environment types
│   ├── index.ts            # Environment types
│   └── environment.schemas.ts # Environment validation
│
├── utils/             # Utility types and guards
│   ├── branded.types.ts    # Branded type utilities
│   └── guards.ts           # Type guard functions
│
└── index.ts           # Main barrel export
```

## Type Categories

### Core Types

- **Agent Types**: Agent metadata, capabilities, health, and registration
- **Registry Types**: Service discovery and agent registry management
- **Task Types**: Task definitions, executions, and workflow orchestration
- **Message Types**: Commands, queries, events, and replies for message bus
- **Workflow Types**: Saga patterns and distributed transaction management

### Configuration Types

- **Schema Types**: Configuration schema definitions and validation rules
- **Provider Types**: Configuration provider abstractions and sources
- **Hierarchy Types**: Layered configuration management and resolution

### Logging Types

- **Entry Types**: Structured log entries with context and metadata
- **Error Types**: Enhanced errors with context, severity, and recovery info
- **Performance Types**: Performance metrics and resource usage tracking

### Platform Types

- **Common Types**: Platform-agnostic types for cross-platform code
- **Node.js Types**: Node.js specific platform features and APIs
- **Browser Types**: Browser-specific features and Web APIs

### Utility Types

- **Branded Types**: Type-safe identifiers using nominal typing
- **Type Guards**: Runtime type checking functions for safe narrowing

## Examples

### Working with Agent Types

```typescript
import { IAgentRegistration, AgentRegistrationSchema, isAgentHealth } from "@axon/types";

// Define an agent registration
const registration: IAgentRegistration = {
  name: "DataProcessor",
  version: "1.0.0",
  capabilities: [
    {
      name: "processData",
      version: "1.0.0",
      description: "Processes incoming data",
      parameters: [],
      returns: { type: "object", description: "Processed data" },
    },
  ],
};

// Validate registration data
const validated = AgentRegistrationSchema.parse(registration);

// Type guard usage
function checkHealth(data: unknown) {
  if (isAgentHealth(data)) {
    console.log(`Agent ${data.agentId} status: ${data.status}`);
  }
}
```

### Working with Message Types

```typescript
import { ICommand, CommandSchema, MessageIdSchema } from "@axon/types";

// Create a command message
const command: ICommand = {
  id: MessageIdSchema.parse("msg-123"),
  correlationId: "corr-456",
  type: "command",
  commandName: "ProcessData",
  expectsReply: true,
  payload: { data: "example" },
  metadata: {
    source: "hub",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  },
  timestamp: new Date().toISOString(),
};

// Validate command
const validCommand = CommandSchema.parse(command);
```

### Working with Configuration Types

```typescript
import { IConfigSchema, ConfigSchemaSchema, ConfigFieldTypeSchema } from "@axon/types";

// Define a configuration schema
const configSchema: IConfigSchema = {
  name: "DatabaseConfig",
  version: "1.0.0",
  description: "Database configuration schema",
  fields: [
    {
      name: "url",
      type: "url",
      description: "Database connection URL",
      required: true,
      sensitive: true,
      env: "DATABASE_URL",
    },
  ],
};

// Validate schema
const validSchema = ConfigSchemaSchema.parse(configSchema);
```

## Best Practices

1. **Always use type imports for types**: `import type { ... }` for zero runtime overhead
2. **Validate external data**: Use Zod schemas to validate data from external sources
3. **Leverage type guards**: Use provided type guards for runtime type narrowing
4. **Use branded types**: Leverage branded types for type-safe identifiers
5. **Domain organization**: Import from specific domains rather than root for better tree-shaking

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## API Reference

### Type Exports

All TypeScript type definitions are exported from their respective domain modules and re-exported from the main index.

### Schema Exports

All Zod schemas are exported alongside their corresponding types with the `Schema` suffix.

### Type Guard Exports

Type guards are exported from `utils/guards.ts` and follow the pattern `is[TypeName]`.

### Branded Type Utilities

Branded type utilities are exported from `utils/branded.types.ts`.
