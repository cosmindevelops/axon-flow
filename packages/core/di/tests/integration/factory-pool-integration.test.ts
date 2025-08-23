/**
 * Integration tests for factory and object pool systems
 *
 * Tests the interaction between factories, object pools, and the DI container
 * to ensure proper integration for high-performance scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { FactoryRegistry, FactoryResolver, SimpleFactory, CachedFactory } from "../../src/factory/factory.classes.js";
import { ObjectPool, PoolFactory, PoolManager } from "../../src/pool/pool.classes.js";
import type { DIToken } from "../../src/container/container.types.js";
import type { IFactory } from "../../src/factory/factory.types.js";

// Test services for integration
class DatabaseConnection {
  public readonly id = Math.random().toString(36).substr(2, 9);
  public isConnected = false;
  public queryCount = 0;

  connect(): void {
    this.isConnected = true;
  }

  disconnect(): void {
    this.isConnected = false;
  }

  query(sql: string): any[] {
    this.queryCount++;
    return [{ id: 1, data: `Result for ${sql}` }];
  }
}

class HttpClient {
  public readonly id = Math.random().toString(36).substr(2, 9);
  public requestCount = 0;

  async request(url: string): Promise<any> {
    this.requestCount++;
    return { status: 200, data: `Response from ${url}` };
  }
}

class ExpensiveResource {
  public readonly id = Math.random().toString(36).substr(2, 9);
  public initTime = Date.now();
  public used = false;

  constructor() {
    // Simulate expensive initialization
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait for 10ms
    }
  }

  use(): void {
    this.used = true;
  }

  reset(): void {
    this.used = false;
  }
}

// Tokens
const DB_CONNECTION_TOKEN: DIToken<DatabaseConnection> = "DatabaseConnection";
const HTTP_CLIENT_TOKEN: DIToken<HttpClient> = "HttpClient";
const EXPENSIVE_RESOURCE_TOKEN: DIToken<ExpensiveResource> = "ExpensiveResource";

describe("Factory-Pool Integration", () => {
  let container: DIContainer;
  let factoryRegistry: FactoryRegistry;
  let factoryResolver: FactoryResolver;
  let poolManager: PoolManager;

  beforeEach(() => {
    container = new DIContainer({
      name: "FactoryPoolIntegrationContainer",
      enableMetrics: true,
    });
    factoryRegistry = new FactoryRegistry();
    factoryResolver = new FactoryResolver();
    factoryResolver.setRegistry(factoryRegistry);
    poolManager = new PoolManager();
  });

  afterEach(async () => {
    await poolManager.destroyAllPools();
    container.dispose();
  });

  describe("Factory Integration with Container", () => {
    it("should integrate factory pattern with DI container", () => {
      // Create factory for database connections
      const dbFactory = new SimpleFactory("DatabaseConnectionFactory", () => {
        const conn = new DatabaseConnection();
        conn.connect();
        return conn;
      });

      // Register factory with container
      container.registerFactoryInstance(DB_CONNECTION_TOKEN, dbFactory);

      // Resolve through container
      const connection1 = container.resolve(DB_CONNECTION_TOKEN);
      const connection2 = container.resolve(DB_CONNECTION_TOKEN);

      expect(connection1).toBeInstanceOf(DatabaseConnection);
      expect(connection2).toBeInstanceOf(DatabaseConnection);
      expect(connection1.isConnected).toBe(true);
      expect(connection2.isConnected).toBe(true);

      // Should create new instances each time (not cached by factory)
      expect(connection1.id).not.toBe(connection2.id);
    });

    it("should support cached factories for performance", () => {
      // Create base factory
      const baseFactory = new SimpleFactory("HttpClientFactory", () => new HttpClient());

      // Wrap with caching
      const cachedFactory = new CachedFactory("CachedHttpClient", baseFactory, 10);

      container.registerFactoryInstance(HTTP_CLIENT_TOKEN, cachedFactory);

      // First resolution creates instance
      const client1 = container.resolve(HTTP_CLIENT_TOKEN);

      // Second resolution should return cached instance (same args)
      const client2 = container.resolve(HTTP_CLIENT_TOKEN);

      expect(client1).toBe(client2); // Same instance due to caching
      expect(client1.id).toBe(client2.id);
    });

    it("should handle factory performance metrics", () => {
      const factory = new SimpleFactory("PerformanceTestFactory", () => {
        // Simulate some work
        return new HttpClient();
      });

      container.registerFactoryInstance(HTTP_CLIENT_TOKEN, factory);

      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        container.resolve(HTTP_CLIENT_TOKEN);
      }

      const metadata = factory.getMetadata();
      expect(metadata.performance?.totalCreated).toBe(iterations);
      expect(metadata.performance?.averageCreationTime).toBeGreaterThan(0);
      expect(metadata.performance?.successRate).toBe(1);
    });
  });

  describe("Object Pool Integration", () => {
    it("should integrate object pool with DI container lifecycle", async () => {
      // Create pool for expensive resources
      const pool = new ObjectPool(
        EXPENSIVE_RESOURCE_TOKEN,
        () => new ExpensiveResource(),
        {
          minSize: 2,
          maxSize: 10,
          enableMetrics: true,
        },
        // Validator
        (resource) => Promise.resolve(!resource.used),
        // Cleanup
        (resource) => Promise.resolve(resource.reset()),
      );

      poolManager.registerPool(pool);

      // Pre-populate pool
      await pool.warmUp();

      // Acquire resources
      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();
      const resource3 = await pool.acquire();

      expect(resource1).toBeInstanceOf(ExpensiveResource);
      expect(resource2).toBeInstanceOf(ExpensiveResource);
      expect(resource3).toBeInstanceOf(ExpensiveResource);

      // Use resources
      resource1.use();
      resource2.use();
      resource3.use();

      // Release back to pool
      await pool.release(resource1);
      await pool.release(resource2);
      await pool.release(resource3);

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(3);
      expect(stats.totalReleased).toBe(3);
      expect(stats.activeInstances).toBe(0);
      expect(stats.hitRatio).toBeGreaterThan(0);
    });

    it("should handle pool performance under load", async () => {
      const pool = new ObjectPool(DB_CONNECTION_TOKEN, () => new DatabaseConnection(), {
        minSize: 5,
        maxSize: 20,
        acquireTimeout: 1000,
        enableMetrics: true,
      });

      poolManager.registerPool(pool);
      await pool.warmUp();

      const iterations = 100;
      const acquisitions: DatabaseConnection[] = [];

      const startTime = performance.now();

      // Rapid acquire/release cycle
      for (let i = 0; i < iterations; i++) {
        const resource = await pool.acquire();
        resource.query(`SELECT * FROM table WHERE id = ${i}`);
        acquisitions.push(resource);

        if (i % 10 === 0) {
          // Release some resources periodically
          const toRelease = acquisitions.splice(0, 5);
          for (const res of toRelease) {
            await pool.release(res);
          }
        }
      }

      // Release remaining
      for (const resource of acquisitions) {
        await pool.release(resource);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(iterations);
      expect(stats.averageAcquireTime).toBeLessThan(10); // Should be fast
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(stats.health).toBe("HEALTHY");
    });

    it("should handle pool eviction and validation", async () => {
      const pool = new ObjectPool(
        EXPENSIVE_RESOURCE_TOKEN,
        () => new ExpensiveResource(),
        {
          minSize: 1,
          maxSize: 5,
          maxIdleTime: 100, // 100ms idle timeout
          validationInterval: 50, // Validate every 50ms
          validationStrategy: "PERIODIC", // Enable periodic validation
          enableMetrics: true,
        },
        // Validator that fails used resources
        (resource) => Promise.resolve(!resource.used),
      );

      poolManager.registerPool(pool);
      await pool.warmUp();

      // Acquire and use resource (making it invalid)
      const resource = await pool.acquire();
      resource.use(); // This makes validation fail
      await pool.release(resource);

      // Wait for validation cycle
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stats = pool.getStats();
      expect(stats.validationFailures).toBeGreaterThan(0);
    });
  });

  describe("Factory-Pool Combined Integration", () => {
    it("should combine factories and pools for optimal performance", async () => {
      // Create a factory that uses pooled resources
      class PooledServiceFactory implements IFactory<DatabaseConnection> {
        public readonly name = "PooledServiceFactory";

        constructor(private readonly pool: ObjectPool<DatabaseConnection>) {}

        async create(): Promise<DatabaseConnection> {
          return await this.pool.acquire();
        }

        // Custom method to return to pool
        async release(instance: DatabaseConnection): Promise<void> {
          await this.pool.release(instance);
        }
      }

      // Setup pool
      const pool = new ObjectPool(DB_CONNECTION_TOKEN, () => new DatabaseConnection(), {
        minSize: 3,
        maxSize: 10,
        enableMetrics: true,
      });

      await pool.warmUp();
      poolManager.registerPool(pool);

      // Setup factory that uses the pool
      const pooledFactory = new PooledServiceFactory(pool);
      container.registerFactoryInstance(DB_CONNECTION_TOKEN, pooledFactory);

      // Use through container
      const connections: DatabaseConnection[] = [];

      // Acquire multiple connections
      for (let i = 0; i < 8; i++) {
        const conn = (await container.resolve(DB_CONNECTION_TOKEN)) as DatabaseConnection;
        conn.connect();
        conn.query(`SELECT ${i}`);
        connections.push(conn);
      }

      // Verify all connections are functional
      for (const conn of connections) {
        expect(conn.queryCount).toBeGreaterThan(0);
        expect(conn.isConnected).toBe(true);
      }

      // Return to pool
      for (const conn of connections) {
        await pooledFactory.release(conn);
      }

      const poolStats = pool.getStats();
      expect(poolStats.totalAcquired).toBe(8);
      expect(poolStats.totalReleased).toBe(8);
      expect(poolStats.activeInstances).toBe(0);
    });

    it("should handle mixed factory and pool strategies", () => {
      // Some services use factories, others use direct registration
      const httpFactory = new SimpleFactory("HttpClientFactory", () => new HttpClient());

      container.registerFactoryInstance(HTTP_CLIENT_TOKEN, httpFactory);
      container.register(DB_CONNECTION_TOKEN, DatabaseConnection, { lifecycle: "singleton" });

      // Service that uses both
      class IntegratedService {
        constructor(
          private readonly httpClient: HttpClient,
          private readonly dbConnection: DatabaseConnection,
        ) {}

        async processRequest(url: string): Promise<any> {
          const response = await this.httpClient.request(url);
          const results = this.dbConnection.query("SELECT * FROM logs");
          return { response, results };
        }
      }

      const INTEGRATED_TOKEN: DIToken<IntegratedService> = "IntegratedService";

      container.register(INTEGRATED_TOKEN, IntegratedService, {
        dependencies: [HTTP_CLIENT_TOKEN, DB_CONNECTION_TOKEN],
        lifecycle: "transient",
      });

      const service1 = container.resolve(INTEGRATED_TOKEN);
      const service2 = container.resolve(INTEGRATED_TOKEN);

      // Services should be different (transient)
      expect(service1).not.toBe(service2);

      // But they should share the same singleton database
      expect((service1 as any).dbConnection).toBe((service2 as any).dbConnection);

      // HTTP clients should be different (created by factory)
      expect((service1 as any).httpClient).not.toBe((service2 as any).httpClient);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle factory creation failures gracefully", async () => {
      const failingFactory = new SimpleFactory("FailingFactory", () => {
        throw new Error("Factory creation failed");
      });

      container.registerFactoryInstance(EXPENSIVE_RESOURCE_TOKEN, failingFactory);

      await expect(async () => {
        container.resolve(EXPENSIVE_RESOURCE_TOKEN);
      }).rejects.toThrow(/Factory creation failed/);
    });

    it("should handle pool exhaustion scenarios", async () => {
      const pool = new ObjectPool(DB_CONNECTION_TOKEN, () => new DatabaseConnection(), {
        minSize: 1,
        maxSize: 2,
        acquireTimeout: 100, // Short timeout
      });

      poolManager.registerPool(pool);

      // Acquire all resources
      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();

      // This should timeout
      await expect(async () => {
        await pool.acquire();
      }).rejects.toThrow(/timeout/);

      // Clean up
      await pool.release(resource1);
      await pool.release(resource2);
    });

    it("should provide detailed error context in integrated scenarios", async () => {
      // Setup complex scenario with factory and pool
      const pool = new ObjectPool(
        EXPENSIVE_RESOURCE_TOKEN,
        () => {
          throw new Error("Resource creation failed");
        },
        { minSize: 1, maxSize: 2 },
      );

      poolManager.registerPool(pool);

      try {
        await pool.acquire();
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("Resource creation failed");
      }
    });
  });
});
