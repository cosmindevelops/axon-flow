# @axon/di

Lightweight dependency injection container for Axon Flow with factory pattern support, lifecycle management, and cross-platform compatibility.

## Features

- 🚀 High-performance DI container with <1ms resolution time
- 🔄 Lifecycle management (Singleton, Transient, Scoped)
- 🏭 Factory pattern integration
- 🔍 Circular dependency detection
- 🎯 TypeScript decorators for clean registration
- 🧪 Comprehensive testing utilities
- 🌐 Cross-platform compatibility (Node.js 18/20/22 + Browser)
- 📦 Object pooling for memory efficiency

## Quick Start

```typescript
import { Container } from '@axon/di';

// Create container
const container = new Container();

// Register services
container.register('IAuthProvider', JWTAuthProvider, { lifecycle: 'singleton' });

// Resolve dependencies
const auth = container.resolve<IAuthProvider>('IAuthProvider');
```

## Installation

```bash
pnpm add @axon/di
```

## Documentation

Coming soon...
