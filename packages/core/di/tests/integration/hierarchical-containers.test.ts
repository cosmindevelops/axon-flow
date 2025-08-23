/**
 * Hierarchical container integration tests
 *
 * Tests the parent-child container relationships, scope inheritance,
 * service resolution delegation, and lifecycle management across
 * container hierarchies in complex multi-level scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import type { DIToken, IDIContainer } from "../../src/container/container.types.js";

// Test services for hierarchical testing
class GlobalConfigService {
  public readonly environment = "production";
  public readonly version = "1.0.0";
  public readonly globalTimeout = 30000;
}

class DatabaseService {
  public readonly connectionString: string;
  public readonly poolSize: number;
  
  constructor(config: GlobalConfigService) {
    this.connectionString = `db://${config.environment}/main`;
    this.poolSize = config.environment === "production" ? 10 : 3;
  }
}

class CacheService {
  public readonly ttl: number;
  public readonly size: number;
  
  constructor(config: GlobalConfigService) {
    this.ttl = config.globalTimeout / 10;
    this.size = config.environment === "production" ? 1000 : 100;
  }
}

// Application-level service
class ApplicationService {
  public readonly name: string;
  public readonly feature: string;
  
  constructor(
    name: string,
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
  ) {
    this.name = name;
    this.feature = "base";
  }
  
  getInfo(): Record<string, unknown> {
    return {
      name: this.name,
      feature: this.feature,
      database: {
        connectionString: this.database.connectionString,
        poolSize: this.database.poolSize,
      },
      cache: {
        ttl: this.cache.ttl,
        size: this.cache.size,
      },
    };
  }
}

// Feature-specific services
class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
  ) {}
  
  authenticate(token: string): boolean {
    // Use database and cache from parent container
    return token === "valid-token";
  }
  
  getDependencies(): { db: string; cache: number } {
    return {
      db: this.database.connectionString,
      cache: this.cache.size,
    };
  }
}

class PaymentService {
  public readonly provider = "stripe";
  
  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService, // Cross-scope dependency
  ) {}
  
  processPayment(token: string, amount: number): boolean {
    if (!this.auth.authenticate(token)) {
      return false;
    }
    // Process payment logic
    return amount > 0;
  }
  
  getServiceInfo(): Record<string, unknown> {
    return {
      provider: this.provider,
      database: this.database.connectionString,
      auth: this.auth.getDependencies(),
    };
  }
}

// Request-scoped service
class RequestContextService {
  public readonly requestId: string;
  public readonly timestamp: number;
  
  constructor(requestId: string) {
    this.requestId = requestId;
    this.timestamp = Date.now();
  }
  
  getContext(): Record<string, unknown> {
    return {
      requestId: this.requestId,
      timestamp: this.timestamp,
      elapsed: Date.now() - this.timestamp,
    };
  }
}

// Scoped application service
class ScopedApplicationService {
  constructor(
    private readonly context: RequestContextService,
    private readonly payment: PaymentService,
    private readonly app: ApplicationService,
  ) {}
  
  processRequest(token: string, amount: number): Record<string, unknown> {
    const paymentResult = this.payment.processPayment(token, amount);
    
    return {
      context: this.context.getContext(),
      payment: {
        result: paymentResult,
        info: this.payment.getServiceInfo(),
      },
      application: this.app.getInfo(),
    };
  }
}

// Tokens
const GLOBAL_CONFIG_TOKEN: DIToken<GlobalConfigService> = "IGlobalConfigService";
const DATABASE_TOKEN: DIToken<DatabaseService> = "IDatabaseService";
const CACHE_TOKEN: DIToken<CacheService> = "ICacheService";
const APPLICATION_TOKEN: DIToken<ApplicationService> = "IApplicationService";
const AUTH_TOKEN: DIToken<AuthService> = "IAuthService";
const PAYMENT_TOKEN: DIToken<PaymentService> = "IPaymentService";
const REQUEST_CONTEXT_TOKEN: DIToken<RequestContextService> = "IRequestContextService";
const SCOPED_APP_TOKEN: DIToken<ScopedApplicationService> = "IScopedApplicationService";

describe("Hierarchical Containers Integration", () => {
  let rootContainer: IDIContainer;
  let appContainer: IDIContainer;
  let featureContainer: IDIContainer;
  let requestContainer: IDIContainer;

  beforeEach(() => {
    // Create container hierarchy: Root -> App -> Feature -> Request
    rootContainer = new DIContainer({
      name: "RootContainer",
      enableMetrics: true,
    });
    
    appContainer = rootContainer.createScope("ApplicationContainer");
    featureContainer = appContainer.createScope("FeatureContainer");
    requestContainer = featureContainer.createScope("RequestContainer");
  });

  afterEach(() => {
    requestContainer.dispose();
    featureContainer.dispose();
    appContainer.dispose();
    rootContainer.dispose();
  });

  describe("Basic Hierarchy Setup", () => {
    it("should create nested container hierarchy", () => {
      expect(rootContainer.name).toBe("RootContainer");
      expect(appContainer.name).toBe("ApplicationContainer");
      expect(featureContainer.name).toBe("FeatureContainer");
      expect(requestContainer.name).toBe("RequestContainer");
      
      // Check parent relationships
      expect(appContainer.parent).toBe(rootContainer);
      expect(featureContainer.parent).toBe(appContainer);
      expect(requestContainer.parent).toBe(featureContainer);
    });

    it("should allow registration at different levels", () => {
      // Root level - global services
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      
      // App level - application infrastructure
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      appContainer.register(CACHE_TOKEN, CacheService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      
      // Feature level - business logic
      featureContainer.register(AUTH_TOKEN, AuthService, {
        dependencies: [DATABASE_TOKEN, CACHE_TOKEN],
      });
      
      // Request level - per-request context
      requestContainer.registerFactory(REQUEST_CONTEXT_TOKEN, () => 
        new RequestContextService(`req_${Date.now()}`)
      );
      
      // Verify registrations exist at correct levels
      expect(rootContainer.isRegistered(GLOBAL_CONFIG_TOKEN)).toBe(true);
      expect(appContainer.isRegistered(DATABASE_TOKEN)).toBe(true);
      expect(featureContainer.isRegistered(AUTH_TOKEN)).toBe(true);
      expect(requestContainer.isRegistered(REQUEST_CONTEXT_TOKEN)).toBe(true);
    });
  });

  describe("Service Resolution Delegation", () => {
    beforeEach(() => {
      // Setup complete hierarchy
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      appContainer.register(CACHE_TOKEN, CacheService, {
        lifecycle: "singleton", 
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      appContainer.registerFactory(APPLICATION_TOKEN, () => 
        new ApplicationService("MyApp", appContainer.resolve(DATABASE_TOKEN), appContainer.resolve(CACHE_TOKEN))
      );
      
      featureContainer.register(AUTH_TOKEN, AuthService, {
        dependencies: [DATABASE_TOKEN, CACHE_TOKEN],
      });
      featureContainer.register(PAYMENT_TOKEN, PaymentService, {
        dependencies: [DATABASE_TOKEN, AUTH_TOKEN],
      });
      
      requestContainer.registerFactory(REQUEST_CONTEXT_TOKEN, () => 
        new RequestContextService(`req_${Date.now()}`)
      );
    });

    it("should resolve services from parent containers", () => {
      // Request container should find services in parent hierarchy
      const globalConfig = requestContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const database = requestContainer.resolve(DATABASE_TOKEN);
      const cache = requestContainer.resolve(CACHE_TOKEN);
      const auth = requestContainer.resolve(AUTH_TOKEN);
      const context = requestContainer.resolve(REQUEST_CONTEXT_TOKEN);
      
      expect(globalConfig).toBeInstanceOf(GlobalConfigService);
      expect(database).toBeInstanceOf(DatabaseService);
      expect(cache).toBeInstanceOf(CacheService);
      expect(auth).toBeInstanceOf(AuthService);
      expect(context).toBeInstanceOf(RequestContextService);
      
      // Verify dependency chain works
      expect(database.connectionString).toBe("db://production/main");
      expect(cache.ttl).toBe(3000); // globalTimeout / 10
    });

    it("should maintain singleton consistency across hierarchy", () => {
      // Global config should be the same instance everywhere
      const rootConfig = rootContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const appConfig = appContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const featureConfig = featureContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const requestConfig = requestContainer.resolve(GLOBAL_CONFIG_TOKEN);
      
      expect(rootConfig).toBe(appConfig);
      expect(appConfig).toBe(featureConfig);
      expect(featureConfig).toBe(requestConfig);
      
      // Database should be singleton at app level and below
      const appDatabase = appContainer.resolve(DATABASE_TOKEN);
      const featureDatabase = featureContainer.resolve(DATABASE_TOKEN);
      const requestDatabase = requestContainer.resolve(DATABASE_TOKEN);
      
      expect(appDatabase).toBe(featureDatabase);
      expect(featureDatabase).toBe(requestDatabase);
    });

    it("should handle transient services with parent dependencies", () => {
      // Auth service is transient but depends on singletons
      const auth1 = requestContainer.resolve(AUTH_TOKEN);
      const auth2 = requestContainer.resolve(AUTH_TOKEN);
      
      expect(auth1).not.toBe(auth2); // Different instances
      
      const deps1 = auth1.getDependencies();
      const deps2 = auth2.getDependencies();
      
      // But should use same singleton dependencies
      expect(deps1.db).toBe(deps2.db);
      expect(deps1.cache).toBe(deps2.cache);
    });
  });

  describe("Cross-Scope Dependencies", () => {
    beforeEach(() => {
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      appContainer.register(CACHE_TOKEN, CacheService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      
      featureContainer.register(AUTH_TOKEN, AuthService, {
        dependencies: [DATABASE_TOKEN, CACHE_TOKEN],
      });
      featureContainer.register(PAYMENT_TOKEN, PaymentService, {
        dependencies: [DATABASE_TOKEN, AUTH_TOKEN], // Auth from same level, DB from parent
      });
    });

    it("should resolve cross-scope dependencies correctly", () => {
      const payment = featureContainer.resolve(PAYMENT_TOKEN);
      
      expect(payment).toBeInstanceOf(PaymentService);
      
      const serviceInfo = payment.getServiceInfo();
      expect(serviceInfo.provider).toBe("stripe");
      expect(serviceInfo.database).toBe("db://production/main");
      expect(serviceInfo.auth).toEqual({
        db: "db://production/main",
        cache: 1000,
      });
    });

    it("should handle complex dependency graphs across scopes", () => {
      // Register application service at app level
      appContainer.registerFactory(APPLICATION_TOKEN, () => 
        new ApplicationService(
          "ComplexApp",
          appContainer.resolve(DATABASE_TOKEN),
          appContainer.resolve(CACHE_TOKEN)
        )
      );
      
      // Register scoped service that depends on services from multiple levels
      requestContainer.registerFactory(REQUEST_CONTEXT_TOKEN, () => 
        new RequestContextService(`complex_req_${Date.now()}`)
      );
      
      requestContainer.register(SCOPED_APP_TOKEN, ScopedApplicationService, {
        dependencies: [REQUEST_CONTEXT_TOKEN, PAYMENT_TOKEN, APPLICATION_TOKEN],
      });
      
      const scopedApp = requestContainer.resolve(SCOPED_APP_TOKEN);
      const result = scopedApp.processRequest("valid-token", 100);
      
      expect(result.context.requestId).toMatch(/^complex_req_/);
      expect(result.payment.result).toBe(true);
      expect(result.application.name).toBe("ComplexApp");
    });
  });

  describe("Scope Isolation and Override", () => {
    it("should allow child containers to override parent services", () => {
      // Register base config in root
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      
      // Override with development config in feature container
      class DevelopmentConfigService {
        public readonly environment = "development";
        public readonly version = "1.0.0-dev";
        public readonly globalTimeout = 5000;
      }
      
      featureContainer.register(GLOBAL_CONFIG_TOKEN, DevelopmentConfigService, { lifecycle: "singleton" });
      
      // Root should still have production config
      const rootConfig = rootContainer.resolve(GLOBAL_CONFIG_TOKEN);
      expect((rootConfig as any).environment).toBe("production");
      
      // Feature and below should have development config
      const featureConfig = featureContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const requestConfig = requestContainer.resolve(GLOBAL_CONFIG_TOKEN);
      
      expect((featureConfig as any).environment).toBe("development");
      expect((requestConfig as any).environment).toBe("development");
      expect(featureConfig).toBe(requestConfig); // Same singleton in child scope
    });

    it("should isolate transient services between scopes", () => {
      // Register same token as transient in different containers
      featureContainer.registerFactory(REQUEST_CONTEXT_TOKEN, () => 
        new RequestContextService("feature-context")
      );
      
      requestContainer.registerFactory(REQUEST_CONTEXT_TOKEN, () => 
        new RequestContextService("request-context")
      );
      
      const featureContext = featureContainer.resolve(REQUEST_CONTEXT_TOKEN);
      const requestContext = requestContainer.resolve(REQUEST_CONTEXT_TOKEN);
      
      expect(featureContext.requestId).toBe("feature-context");
      expect(requestContext.requestId).toBe("request-context");
    });
  });

  describe("Lifecycle Management in Hierarchy", () => {
    it("should manage singleton lifecycle across container hierarchy", () => {
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      
      // Multiple resolutions should return same instances
      const config1 = requestContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const config2 = featureContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const config3 = appContainer.resolve(GLOBAL_CONFIG_TOKEN);
      
      expect(config1).toBe(config2);
      expect(config2).toBe(config3);
      
      const db1 = requestContainer.resolve(DATABASE_TOKEN);
      const db2 = featureContainer.resolve(DATABASE_TOKEN);
      
      expect(db1).toBe(db2);
    });

    it("should handle disposal cascade through hierarchy", () => {
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        lifecycle: "singleton",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      
      // Resolve services to create instances
      appContainer.resolve(DATABASE_TOKEN);
      featureContainer.resolve(DATABASE_TOKEN);
      
      // Get metrics before disposal
      const appMetrics = appContainer.getMetrics();
      const featureMetrics = featureContainer.getMetrics();
      
      expect(appMetrics.totalResolutions).toBeGreaterThan(0);
      expect(featureMetrics.totalResolutions).toBeGreaterThan(0);
      
      // Dispose feature container
      featureContainer.dispose();
      
      // Feature container should be disposed
      expect(() => {
        featureContainer.resolve(DATABASE_TOKEN);
      }).toThrow("Container has been disposed");
      
      // Parent containers should still work
      expect(() => {
        appContainer.resolve(DATABASE_TOKEN);
      }).not.toThrow();
      
      expect(() => {
        rootContainer.resolve(GLOBAL_CONFIG_TOKEN);
      }).not.toThrow();
    });
  });

  describe("Performance in Hierarchical Resolution", () => {
    it("should maintain performance with deep container hierarchies", () => {
      // Create deeper hierarchy
      let currentContainer = rootContainer;
      const containers: IDIContainer[] = [rootContainer];
      
      for (let i = 0; i < 5; i++) {
        const child = currentContainer.createScope(`Level${i}Container`);
        containers.push(child);
        currentContainer = child;
      }
      
      // Register service at root
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      
      const deepestContainer = containers[containers.length - 1];
      
      const iterations = 100;
      const startTime = performance.now();
      
      // Resolve from deepest container multiple times
      for (let i = 0; i < iterations; i++) {
        const config = deepestContainer.resolve(GLOBAL_CONFIG_TOKEN);
        expect(config).toBeInstanceOf(GlobalConfigService);
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      // Should still resolve quickly despite deep hierarchy
      expect(avgTime).toBeLessThan(1); // Less than 1ms per resolution
      
      const metrics = deepestContainer.getMetrics();
      expect(metrics.totalResolutions).toBe(iterations);
      expect(metrics.cacheHitRatio).toBeGreaterThan(0.9); // High cache hit ratio for singletons
      
      // Cleanup
      containers.reverse().forEach(c => {
        if (c !== rootContainer) c.dispose();
      });
    });

    it("should track metrics accurately across hierarchy levels", () => {
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        lifecycle: "transient",
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      
      // Resolve from different levels
      const config1 = rootContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const config2 = appContainer.resolve(GLOBAL_CONFIG_TOKEN);
      const db1 = appContainer.resolve(DATABASE_TOKEN);
      const db2 = featureContainer.resolve(DATABASE_TOKEN);
      const config3 = requestContainer.resolve(GLOBAL_CONFIG_TOKEN);
      
      // Check metrics at each level
      const rootMetrics = rootContainer.getMetrics();
      const appMetrics = appContainer.getMetrics();
      const featureMetrics = featureContainer.getMetrics();
      const requestMetrics = requestContainer.getMetrics();
      
      // Root should show direct resolutions
      expect(rootMetrics.totalResolutions).toBeGreaterThan(0);
      
      // App should show its resolutions plus delegated ones
      expect(appMetrics.totalResolutions).toBeGreaterThan(rootMetrics.totalResolutions);
      
      // Feature should show delegated resolutions
      expect(featureMetrics.totalResolutions).toBeGreaterThan(0);
      
      // Request should show delegated resolutions
      expect(requestMetrics.totalResolutions).toBeGreaterThan(0);
    });
  });

  describe("Error Handling in Hierarchical Containers", () => {
    it("should provide clear error context for missing services in hierarchy", () => {
      // Register some services but not all
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      appContainer.register(DATABASE_TOKEN, DatabaseService, {
        dependencies: [GLOBAL_CONFIG_TOKEN],
      });
      
      // Try to resolve non-existent service
      try {
        requestContainer.resolve("NonExistentService" as DIToken);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("DI_REGISTRATION_NOT_FOUND");
        expect(error.metadata.containerName).toBe("RequestContainer");
        expect(error.metadata.token).toBe("NonExistentService");
      }
    });

    it("should handle circular dependencies across container levels", () => {
      // Create circular dependency across containers
      class ServiceA {
        constructor(private serviceB: ServiceB) {}
      }
      
      class ServiceB {
        constructor(private serviceA: ServiceA) {}
      }
      
      const TOKEN_A: DIToken<ServiceA> = "ServiceA";
      const TOKEN_B: DIToken<ServiceB> = "ServiceB";
      
      // Register A in app container, B in feature container with circular deps
      appContainer.register(TOKEN_A, ServiceA, { dependencies: [TOKEN_B] });
      featureContainer.register(TOKEN_B, ServiceB, { dependencies: [TOKEN_A] });
      
      expect(() => {
        featureContainer.resolve(TOKEN_A);
      }).toThrow(/Circular dependency detected/);
    });

    it("should provide helpful error when parent container is disposed", () => {
      rootContainer.register(GLOBAL_CONFIG_TOKEN, GlobalConfigService, { lifecycle: "singleton" });
      
      // Dispose parent
      rootContainer.dispose();
      
      // Child container should handle this gracefully
      try {
        appContainer.resolve(GLOBAL_CONFIG_TOKEN);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Should indicate parent container issue or registration not found
        expect(error.code).toMatch(/DI_|CONTAINER_/);
      }
    });
  });
});