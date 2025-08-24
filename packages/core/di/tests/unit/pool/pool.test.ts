/**
 * Object Pool Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ObjectPool, PoolFactory, PoolManager, PoolError, PoolTimeoutError } from "../../../src/pool/pool.classes.js";
import { DEFAULT_POOL_CONFIG } from "../../../src/pool/pool.schemas.js";
import type { IPoolConfig } from "../../../src/pool/pool.types.js";

// Mock class for testing
class TestService {
  constructor(public readonly id: string = Math.random().toString(36)) {}

  cleanup() {
    // Mock cleanup method
  }
}

describe("ObjectPool", () => {
  let pool: ObjectPool<TestService>;
  let factory: () => TestService;
  const token = "test-service";

  beforeEach(() => {
    factory = () => new TestService();
  });

  afterEach(async () => {
    if (pool) {
      await pool.destroy();
    }
  });

  describe("Basic Pool Operations", () => {
    it("should create pool with default configuration", () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 2,
        maxSize: 10,
      };

      pool = new ObjectPool(token, factory, config);

      expect(pool.config).toEqual(config);
      expect(pool.token).toBe(token);
    });

    it("should acquire and release instances", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
      };

      pool = new ObjectPool(token, factory, config);

      const instance = await pool.acquire();
      expect(instance).toBeInstanceOf(TestService);

      const stats = pool.getStats();
      expect(stats.activeInstances).toBe(1);
      expect(stats.totalAcquired).toBe(1);

      await pool.release(instance);

      const statsAfterRelease = pool.getStats();
      expect(statsAfterRelease.activeInstances).toBe(0);
      expect(statsAfterRelease.totalReleased).toBe(1);
    });

    it("should reuse instances from pool", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
      };

      pool = new ObjectPool(token, factory, config);

      // Acquire and release an instance
      const instance1 = await pool.acquire();
      await pool.release(instance1);

      // Acquire again - should get the same instance
      const instance2 = await pool.acquire();
      expect(instance2).toBe(instance1);

      const stats = pool.getStats();
      expect(stats.poolHits).toBe(1);
      expect(stats.poolMisses).toBe(1); // First acquisition was a miss
    });
  });

  describe("Pool Warmup", () => {
    it("should warm up pool with minimum instances", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 3,
        maxSize: 10,
        enableWarmup: true,
      };

      pool = new ObjectPool(token, factory, config);
      await pool.warmup();

      const stats = pool.getStats();
      expect(stats.poolSize).toBe(3);
    });
  });

  describe("Pool Validation", () => {
    it("should validate instances with custom validator", async () => {
      let validationCount = 0;
      const validator = (instance: TestService) => {
        validationCount++;
        return instance.id !== "invalid";
      };

      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
        validationStrategy: "ON_ACQUIRE",
      };

      pool = new ObjectPool(token, factory, config, validator);

      const instance = await pool.acquire();
      // Real validator function is called during pool operations

      await pool.release(instance);
      await pool.validate();

      expect(validationCount).toBeGreaterThan(0);
    });
  });

  describe("Pool Statistics", () => {
    it("should track comprehensive statistics", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
        enableMetrics: true,
      };

      pool = new ObjectPool(token, factory, config);

      const instance1 = await pool.acquire();
      const instance2 = await pool.acquire();

      await pool.release(instance1);

      const stats = pool.getStats();

      expect(stats.totalAcquired).toBe(2);
      expect(stats.totalReleased).toBe(1);
      expect(stats.activeInstances).toBe(1);
      expect(stats.totalCreated).toBe(2);
      expect(stats.averageAcquireTime).toBeGreaterThanOrEqual(0);
      expect(stats.health).toBe("HEALTHY");
    });

    it("should calculate hit ratio correctly", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
      };

      pool = new ObjectPool(token, factory, config);

      // First acquisition - miss
      const instance1 = await pool.acquire();
      await pool.release(instance1);

      // Second acquisition - hit
      const instance2 = await pool.acquire();

      const stats = pool.getStats();
      expect(stats.hitRatio).toBe(0.5); // 1 hit out of 2 acquisitions
    });
  });

  describe("Pool Resize", () => {
    it("should resize pool correctly", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 2,
        maxSize: 5,
        enableWarmup: true,
      };

      pool = new ObjectPool(token, factory, config);
      await pool.warmup();

      expect(pool.getStats().poolSize).toBe(2);

      // Resize up
      await pool.resize(3, 8);
      expect(pool.config.minSize).toBe(3);
      expect(pool.config.maxSize).toBe(8);
    });
  });

  describe("Error Handling", () => {
    it("should handle factory errors", async () => {
      const errorFactory: () => TestService = () => {
        throw new Error("Factory error");
      };

      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
      };

      pool = new ObjectPool(token, errorFactory, config);

      await expect(pool.acquire()).rejects.toThrow("Failed to create new instance");
    });

    it("should handle timeout errors", async () => {
      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 5,
        createTimeout: 10, // Very short timeout
      };

      // For timeout testing, we need a factory that takes too long
      // We'll use a synchronous factory that simulates delay
      const slowFactory: () => TestService = () => {
        const start = Date.now();
        while (Date.now() - start < 20) {
          // Busy wait longer than the timeout
        }
        return new TestService();
      };

      pool = new ObjectPool(token, slowFactory, config);

      await expect(pool.acquire()).rejects.toThrow(PoolTimeoutError);
    });
  });

  describe("Pool Cleanup", () => {
    it("should call cleanup handler when removing instances", async () => {
      const cleanupCalls: any[] = [];
      const cleanupHandler = (instance: any) => {
        cleanupCalls.push(instance);
      };

      const config: IPoolConfig = {
        ...DEFAULT_POOL_CONFIG,
        minSize: 0,
        maxSize: 1, // Force eviction
      };

      pool = new ObjectPool(token, factory, config, undefined, cleanupHandler);

      const instance1 = await pool.acquire();
      await pool.release(instance1);

      const instance2 = await pool.acquire();
      await pool.release(instance2);

      // This should cause eviction of instance1 due to maxSize=1
      const instance3 = await pool.acquire();

      expect(cleanupCalls.length).toBeGreaterThan(0);
    });
  });
});

describe("PoolFactory", () => {
  let poolFactory: PoolFactory;

  beforeEach(() => {
    poolFactory = new PoolFactory();
  });

  it("should create pool with custom configuration", () => {
    const token = "test";
    const factory = () => new TestService();
    const config: IPoolConfig = {
      ...DEFAULT_POOL_CONFIG,
      minSize: 5,
      maxSize: 20,
    };

    const pool = poolFactory.createPool(token, factory, config);

    expect(pool).toBeInstanceOf(ObjectPool);
    expect(pool.config).toEqual(config);
  });

  it("should create pool with default configuration", () => {
    const token = "test";
    const factory = () => new TestService();

    const pool = poolFactory.createDefaultPool(token, factory);

    expect(pool).toBeInstanceOf(ObjectPool);
    expect(pool.config).toEqual(poolFactory.getDefaultConfig());
  });
});

describe("PoolManager", () => {
  let poolManager: PoolManager;
  let pools: ObjectPool<TestService>[];

  beforeEach(() => {
    poolManager = new PoolManager();
    pools = [];
  });

  afterEach(async () => {
    await poolManager.destroyAllPools();
    for (const pool of pools) {
      await pool.destroy();
    }
  });

  it("should register and retrieve pools", () => {
    const token = "test";
    const factory = () => new TestService();
    const config = DEFAULT_POOL_CONFIG;

    const pool = new ObjectPool(token, factory, config);
    pools.push(pool);

    poolManager.registerPool(pool);

    const retrievedPool = poolManager.getPool(token);
    expect(retrievedPool).toBe(pool);
  });

  it("should prevent duplicate pool registration", () => {
    const token = "test";
    const factory = () => new TestService();
    const config = DEFAULT_POOL_CONFIG;

    const pool1 = new ObjectPool(token, factory, config);
    const pool2 = new ObjectPool(token, factory, config);
    pools.push(pool1, pool2);

    poolManager.registerPool(pool1);

    expect(() => poolManager.registerPool(pool2)).toThrow(PoolError);
  });

  it("should aggregate statistics from multiple pools", async () => {
    const factory = () => new TestService();
    const config = DEFAULT_POOL_CONFIG;

    const pool1 = new ObjectPool("test1", factory, config);
    const pool2 = new ObjectPool("test2", factory, config);
    pools.push(pool1, pool2);

    poolManager.registerPool(pool1);
    poolManager.registerPool(pool2);

    // Acquire instances to generate some stats
    const instance1 = await pool1.acquire();
    const instance2 = await pool2.acquire();

    const aggregatedStats = poolManager.getAggregatedStats();

    expect(aggregatedStats.totalAcquired).toBe(2);
    expect(aggregatedStats.activeInstances).toBe(2);
  });

  it("should validate all pools", async () => {
    const factory = () => new TestService();
    const config = DEFAULT_POOL_CONFIG;

    const pool1 = new ObjectPool("test1", factory, config);
    const pool2 = new ObjectPool("test2", factory, config);
    pools.push(pool1, pool2);

    poolManager.registerPool(pool1);
    poolManager.registerPool(pool2);

    // Should not throw
    await poolManager.validateAllPools();
  });
});
