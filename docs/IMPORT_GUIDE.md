# Axon Flow Import Guide

## Overview

This guide documents the comprehensive barrel export system implemented across all Axon Flow packages, featuring optimal tree-shaking, cross-environment compatibility, and zero-overhead type abstractions.

## 🎯 Key Optimizations

### ✅ Type/Runtime Separation

- **Type-only imports**: Zero runtime cost with `import type`
- **Runtime imports**: Validation schemas and utilities only when needed
- **Selective exports**: Optimal tree-shaking with granular imports

### ✅ Platform Conditional Loading

- **Sub-path exports**: Platform-specific imports for better bundle optimization
- **Cross-environment compatibility**: Node.js, browser, and universal types
- **Environment detection**: Runtime platform detection utilities

### ✅ Enhanced Schema Validation

- **Type guard functions**: Runtime type validation for all schemas
- **Validation helpers**: Both throwing and safe parsing utilities
- **Type inference**: Automatic TypeScript type inference from Zod schemas

## 📦 Package Structure

```
@axon/types        - Core type definitions and validation schemas
@axon/config       - Configuration management types and builders
@axon/logger       - Logging system types and performance utilities
@axon/errors       - Error handling types and recovery mechanisms
```

## 🔥 Import Patterns

### Type-Only Imports (Zero Runtime Cost)

```typescript
// ✅ Best Practice: Type-only imports for zero bundle impact
import type { IAgentMetadata, TaskStatus, LogLevel, INodeInfo, IBrowserInfo } from "@axon/types";

// ✅ Platform-specific type imports (tree-shakeable)
import type { INodeInfo, IProcessInfo } from "@axon/types/platform/node";
import type { IBrowserInfo, INavigatorInfo } from "@axon/types/platform/browser";
import type { IPlatformInfo } from "@axon/types/platform/common";
```

### Runtime Imports (Validation & Utilities)

```typescript
// ✅ Schema validation imports
import { agentMetadataSchema, taskStatusSchema, nodeInfoSchema, browserInfoSchema } from "@axon/types";

// ✅ Type guard functions for runtime validation
import { isNodeInfo, isBrowserInfo, isProcessInfo } from "@axon/types";

// ✅ Validation helpers (throwing and safe variants)
import { parseNodeInfo, safeParseNodeInfo, parseBrowserInfo, safeParseBrowserInfo } from "@axon/types";
```

### Platform-Specific Imports

```typescript
// ✅ Node.js-only imports (zero cost in browser bundles)
import type { INodeInfo, IProcessInfo, IFileSystemInfo } from "@axon/types/platform/node";

import { nodeInfoSchema, processInfoSchema, isNodeInfo, parseProcessInfo } from "@axon/types/platform/node";

// ✅ Browser-only imports (zero cost in Node.js bundles)
import type { IBrowserInfo, INavigatorInfo, IWindowInfo } from "@axon/types/platform/browser";

import { browserInfoSchema, navigatorInfoSchema, isBrowserInfo, parseWindowInfo } from "@axon/types/platform/browser";

// ✅ Universal cross-platform types
import type { IPlatformInfo, IEnvironment, PlatformType } from "@axon/types/platform/common";

import { platformDetection } from "@axon/types/platform/common";
```

### Schema Inference Pattern

```typescript
// ✅ Schema-first development with automatic type inference
import { agentMetadataSchema, type InferredAgentMetadata } from "@axon/types";

// Equivalent to importing the original interface
// InferredAgentMetadata === IAgentMetadata
const validateAgent = (data: unknown): InferredAgentMetadata => {
  return agentMetadataSchema.parse(data);
};
```

## 🏗️ Cross-Package Integration

### Logger Package Integration

```typescript
// ✅ Clean cross-package imports
import type { ILogger, LogLevel } from "@axon/logger";
import type { ICorrelationContext } from "@axon/types";
import { createLogger } from "@axon/logger";

const logger = createLogger({
  level: "info" as LogLevel,
  correlationId: "task-123",
});
```

### Config Package Integration

```typescript
// ✅ Configuration with type validation
import type { IConfigSchema, IEnvironmentConfig } from "@axon/config";
import { ConfigBuilder, environmentConfigSchema } from "@axon/config";
import { safeParseEnvironmentConfig } from "@axon/types";

const config = new ConfigBuilder().withEnvironment("production").withValidation(environmentConfigSchema).build();
```

### Error Handling Integration

```typescript
// ✅ Comprehensive error handling
import type { IRecoveryContext, IErrorMetadata } from "@axon/errors";
import { BaseAxonError, RecoveryChain } from "@axon/errors";
import { isValidationError } from "@axon/types";

try {
  // Operation that might fail
} catch (error) {
  if (isValidationError(error)) {
    // Handle validation errors specifically
  }
  throw new BaseAxonError("Operation failed", "OP_ERROR", {
    correlationId: "task-123",
  });
}
```

## 🚀 Performance Optimization

### Tree-Shaking Optimization

```typescript
// ✅ Optimal: Only import what you need
import type { INodeInfo } from "@axon/types/platform/node";
import { isNodeInfo } from "@axon/types/platform/node";

// ❌ Suboptimal: Imports entire package
import { INodeInfo, isNodeInfo } from "@axon/types";
```

### Bundle Size Impact

| Import Pattern            | Node.js Bundle | Browser Bundle | Overhead |
| ------------------------- | -------------- | -------------- | -------- |
| Type-only imports         | 0 bytes        | 0 bytes        | None     |
| Platform-specific runtime | ~2KB           | 0 bytes        | Minimal  |
| Full package runtime      | ~15KB          | ~12KB          | Moderate |
| Selective imports         | ~1-3KB         | ~1-2KB         | Optimal  |

### Development vs Production

```typescript
// ✅ Development: Full validation and type guards
import { parseNodeInfo, isProcessInfo, safeParseNetworkInfo } from "@axon/types/platform/node";

// ✅ Production: Minimal runtime imports
import type { INodeInfo } from "@axon/types/platform/node";
import { nodeInfoSchema } from "@axon/types/platform/node";

// Use schema.parse() directly in production for better performance
```

## 🛠️ Environment-Specific Patterns

### Node.js Environment

```typescript
import type { INodeProcess, IFileSystemInfo, IModuleInfo } from "@axon/types/platform/node";

import { platformDetection, isNodeInfo, parseProcessInfo } from "@axon/types";

if (platformDetection.isNode()) {
  // Node.js-specific logic
  const processInfo = parseProcessInfo(process);
}
```

### Browser Environment

```typescript
import type { IBrowserInfo, IWindowInfo, INavigatorInfo } from "@axon/types/platform/browser";

import { platformDetection, isBrowserInfo, parseWindowInfo } from "@axon/types";

if (platformDetection.isBrowser()) {
  // Browser-specific logic
  const windowInfo = parseWindowInfo(window);
}
```

### Universal Code

```typescript
import type { IPlatformInfo, IEnvironment } from "@axon/types/platform/common";
import { platformDetection } from "@axon/types";

const getPlatformInfo = (): IPlatformInfo => {
  const type = platformDetection.getPlatformType();

  return {
    type,
    version: "1.0.0",
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
    environment: process.env.NODE_ENV || "development",
  };
};
```

## 🔍 Validation Patterns

### Type Guards in Action

```typescript
import type { INodeInfo } from "@axon/types";
import { isNodeInfo, safeParseNodeInfo } from "@axon/types";

// ✅ Type guard pattern
const handleUnknownData = (data: unknown): void => {
  if (isNodeInfo(data)) {
    // TypeScript knows 'data' is INodeInfo here
    console.log(`Node version: ${data.version}`);
  }
};

// ✅ Safe parsing pattern
const processNodeInfo = (rawData: unknown) => {
  const result = safeParseNodeInfo(rawData);

  if (result.success) {
    // TypeScript knows result.data is INodeInfo
    return result.data;
  } else {
    // Handle validation errors
    console.error("Invalid node info:", result.error);
    return null;
  }
};
```

### Schema Validation Best Practices

```typescript
import { nodeInfoSchema, parseNodeInfo, safeParseNodeInfo } from "@axon/types/platform/node";

// ✅ Throwing validation (fail fast)
try {
  const nodeInfo = parseNodeInfo(unknownData);
  // Process valid data
} catch (error) {
  // Handle validation error
}

// ✅ Safe validation (graceful handling)
const result = safeParseNodeInfo(unknownData);
if (result.success) {
  // Process valid data
} else {
  // Handle invalid data gracefully
}

// ✅ Custom validation with additional context
const validateWithContext = (data: unknown, context: string) => {
  const result = nodeInfoSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed in ${context}: ${result.error.message}`);
  }
  return result.data;
};
```

## 🎯 Migration Guide

### From v0.0.x to v0.1.x

```typescript
// ❌ Old pattern (v0.0.x)
import { IAgentMetadata, agentSchema } from "@axon/types";

// ✅ New pattern (v0.1.x)
import type { IAgentMetadata } from "@axon/types";
import { agentMetadataSchema, isAgentMetadata } from "@axon/types";
```

### Upgrading Import Statements

1. **Separate type and runtime imports**:

   ```typescript
   // Before
   import { ILogger, createLogger } from "@axon/logger";

   // After
   import type { ILogger } from "@axon/logger";
   import { createLogger } from "@axon/logger";
   ```

2. **Use platform-specific imports**:

   ```typescript
   // Before
   import { INodeInfo } from "@axon/types";

   // After
   import type { INodeInfo } from "@axon/types/platform/node";
   ```

3. **Leverage new type guards**:

   ```typescript
   // Before
   const isValid = schema.safeParse(data).success;

   // After
   const isValid = isNodeInfo(data);
   ```

## 📊 Performance Monitoring

### Bundle Analysis Commands

```bash
# Analyze bundle size impact
npm run analyze:bundle

# Check tree-shaking effectiveness
npm run analyze:tree-shake

# Validate import patterns
npm run lint:imports
```

### Recommended Patterns Summary

| Pattern             | Use Case             | Performance | Maintainability |
| ------------------- | -------------------- | ----------- | --------------- |
| `import type`       | Type definitions     | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐      |
| Sub-path exports    | Platform-specific    | ⭐⭐⭐⭐    | ⭐⭐⭐⭐        |
| Type guards         | Runtime validation   | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐      |
| Schema inference    | Type-safe validation | ⭐⭐⭐      | ⭐⭐⭐⭐⭐      |
| Cross-package types | Package integration  | ⭐⭐⭐⭐    | ⭐⭐⭐⭐        |

## 🎉 Conclusion

The enhanced barrel export system provides:

- **Zero runtime cost** for type-only imports
- **Optimal tree-shaking** with platform-specific sub-exports
- **Type-safe validation** with comprehensive type guards
- **Cross-environment compatibility** with conditional loading
- **Developer-friendly** import patterns with clear documentation

This architecture ensures maximum performance while maintaining excellent developer experience across the entire Axon Flow monorepo.
