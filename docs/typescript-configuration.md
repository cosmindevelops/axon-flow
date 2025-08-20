# TypeScript Configuration Guide

## Overview

Axon Flow uses a hierarchical TypeScript configuration system optimized for monorepo development. This guide explains the configuration architecture, best practices, and how to work with TypeScript in the project.

## Configuration Architecture

### Base Configuration (`tsconfig.base.json`)

The base configuration defines shared compiler options for the entire workspace:

- **Strict Mode**: Full TypeScript strict mode enabled for maximum type safety
- **ES2024 Target**: Modern JavaScript features with Node.js 24.x compatibility
- **Composite Projects**: Enables incremental builds and project references
- **Module System**: NodeNext for native ESM support

### Root Configuration (`tsconfig.json`)

The root configuration extends the base and:

- Sets up path mappings for workspace packages
- Defines project references for composite builds
- Configures solution-style TypeScript project structure
- Includes Next.js plugin support for potential frontend apps

### Package Configurations

Each package has its own `tsconfig.json` that:

- Extends from `tsconfig.base.json`
- Enables composite mode for incremental builds
- Generates declaration files and source maps
- Configures output directory structure

## Templates

### Package Template (`packages/tsconfig.package.json`)

Use this template when creating new packages:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.*", "**/*.spec.*"]
}
```

### Application Template (`apps/tsconfig.app.json`)

Use this template for applications:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "declaration": false,
    "declarationMap": false,
    "sourceMap": true,
    "noEmit": false,
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["node"],
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "build", "node_modules", "**/*.test.*", "**/*.spec.*", "coverage"]
}
```

## Key Features

### Strict Type Safety

All strict TypeScript checks are enabled:

- `strict`: Enables all strict type-checking options
- `noImplicitAny`: No implicit any types allowed
- `strictNullChecks`: Null and undefined handled explicitly
- `noUncheckedIndexedAccess`: Array/object access requires checks
- `exactOptionalPropertyTypes`: Optional properties must be exact

### Performance Optimizations

- **Incremental Builds**: `.tsbuildinfo` files cache compilation state
- **Composite Projects**: Enables project references for faster rebuilds
- **Skip Lib Check**: Skips type checking of declaration files
- **Isolated Modules**: Each file can be transpiled independently

### Module Resolution

- **NodeNext**: Modern Node.js module resolution
- **ESM Support**: Full ES modules with `.js` extensions
- **Path Mappings**: Clean imports like `@axon/config` instead of relative paths
- **Verbatim Module Syntax**: Explicit import/export declarations

## Working with TypeScript

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @axon/config build

# Build with TypeScript directly
pnpm exec tsc --build

# Watch mode for development
pnpm exec tsc --build --watch
```

### Adding a New Package

1. Create package directory structure:

   ```bash
   mkdir -p packages/[category]/[name]/src
   ```

2. Copy the appropriate template:

   ```bash
   cp packages/tsconfig.package.json packages/[category]/[name]/tsconfig.json
   ```

3. Adjust the `extends` path based on nesting level

4. Add to root `tsconfig.json` references:
   ```json
   "references": [
     { "path": "./packages/[category]/[name]" }
   ]
   ```

### Type Checking

```bash
# Type check without emitting
pnpm exec tsc --noEmit

# Type check specific package
pnpm --filter @axon/[package] exec tsc --noEmit

# Watch mode for continuous checking
pnpm exec tsc --noEmit --watch
```

### Performance Validation

Run the validation script to check configuration performance:

```bash
node scripts/validate-typescript.js
```

This validates:

- Compilation performance
- Incremental build efficiency
- Type safety enforcement
- Cross-architecture compatibility

## Best Practices

### 1. Use Project References

When one package depends on another, use project references:

```json
{
  "references": [{ "path": "../other-package" }]
}
```

### 2. Maintain Strict Mode

Never disable strict mode checks. If you encounter issues:

- Fix the underlying type problems
- Use proper type assertions with validation
- Document any necessary workarounds

### 3. Leverage Path Mappings

Use the configured path mappings for clean imports:

```typescript
// Good
import { Config } from "@axon/config";

// Avoid
import { Config } from "../../../packages/core/config/src";
```

### 4. Enable Incremental Builds

Always include in package `tsconfig.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

### 5. Organize Exports

Use barrel exports (index.ts) for clean package interfaces:

```typescript
// packages/core/types/src/index.ts
export * from "./config.types";
export * from "./error.types";
export type * from "./utility.types";
```

## Troubleshooting

### Common Issues

#### "Referenced project must have setting 'composite': true"

**Solution**: Ensure the referenced package's `tsconfig.json` has `"composite": true`

#### "Cannot find module '@axon/package'"

**Solution**:

1. Check path mappings in root `tsconfig.json`
2. Ensure package is built (`pnpm build`)
3. Verify package.json exports configuration

#### Slow compilation times

**Solution**:

1. Ensure incremental builds are enabled
2. Use `--build` flag for composite projects
3. Clean `.tsbuildinfo` files if corrupted

#### Type errors in IDE but not in build

**Solution**:

1. Restart TypeScript server in IDE
2. Clear IDE cache
3. Ensure IDE uses workspace TypeScript version

## IDE Configuration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsserver.experimental.enableProjectDiagnostics": true
}
```

### WebStorm / IntelliJ

1. Settings → Languages & Frameworks → TypeScript
2. Set TypeScript version to project's `node_modules/typescript`
3. Enable "TypeScript Language Service"

## Migration Guide

### Converting Existing Packages

1. Replace package's `tsconfig.json` with template
2. Adjust paths based on package location
3. Add to root project references
4. Run `pnpm build` to verify

### Upgrading TypeScript Version

1. Update `typescript` in root `package.json`
2. Run `pnpm install`
3. Test with `pnpm build`
4. Run validation script
5. Fix any new type errors

## Performance Benchmarks

Expected performance targets:

- **Initial Compilation**: < 30 seconds for full monorepo
- **Incremental Build**: < 5 seconds for changes
- **Type Checking**: < 10 seconds across boundaries
- **IDE Response**: < 2 seconds for IntelliSense

## Related Documentation

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Node.js ESM Support](https://nodejs.org/api/esm.html)
