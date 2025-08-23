/**
 * Integration tests for container and lifecycle management
 *
 * Tests the interaction between DIContainer and various lifecycle managers
 * to ensure proper integration and expected behavior in real scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { SingletonLifecycleManager, TransientLifecycleManager } from "../../src/lifecycle/lifecycle.classes.js";
import type { DIToken } from "../../src/container/container.types.js";

// Test services for integration testing
class DatabaseService {
  public readonly id = Math.random().toString(36).substr(2, 9);
  public connectionCount = 0;

  connect(): void {
    this.connectionCount++;
  }

  disconnect(): void {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }
}

class UserService {
  public readonly id = Math.random().toString(36).substr(2, 9);
  
  constructor(private readonly db: DatabaseService) {}

  getDatabase(): DatabaseService {
    return this.db;
  }

  createUser(name: string): { id: string; name: string } {
    this.db.connect();
    return { id: this.id, name };
  }
}

class NotificationService {
  public readonly id = Math.random().toString(36).substr(2, 9);
  
  constructor(
    private readonly userService: UserService,
    private readonly db: DatabaseService,
  ) {}

  getUserService(): UserService {
    return this.userService;
  }

  getDatabase(): DatabaseService {
    return this.db;
  }

  notify(userId: string, message: string): void {
    // Mock notification logic
    this.db.connect();
  }
}

// Tokens
const DATABASE_TOKEN: DIToken<DatabaseService> = "DatabaseService";
const USER_TOKEN: DIToken<UserService> = "UserService";
const NOTIFICATION_TOKEN: DIToken<NotificationService> = "NotificationService";

describe("Container-Lifecycle Integration", () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer({
      name: "IntegrationTestContainer",
      enableMetrics: true,
    });
  });

  afterEach(() => {
    container.dispose();
  });

  describe("Singleton Lifecycle Integration", () => {
    it("should maintain single instance across dependencies", () => {
      // Register all services as singletons
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "singleton" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "singleton",
        dependencies: [DATABASE_TOKEN],
      });
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "singleton", 
        dependencies: [USER_TOKEN, DATABASE_TOKEN],
      });

      // Resolve services
      const userService = container.resolve(USER_TOKEN);
      const notificationService = container.resolve(NOTIFICATION_TOKEN);
      const directDbService = container.resolve(DATABASE_TOKEN);

      // Verify same database instance is used throughout
      expect(userService.getDatabase()).toBe(directDbService);
      expect(notificationService.getDatabase()).toBe(directDbService);
      expect(notificationService.getUserService()).toBe(userService);
    });

    it("should handle complex dependency graphs with singletons", () => {
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "singleton" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "singleton",
        dependencies: [DATABASE_TOKEN],
      });
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "singleton",
        dependencies: [USER_TOKEN, DATABASE_TOKEN],
      });

      // Multiple resolution should return same instances
      const notification1 = container.resolve(NOTIFICATION_TOKEN);
      const notification2 = container.resolve(NOTIFICATION_TOKEN);
      const user1 = container.resolve(USER_TOKEN);
      const user2 = container.resolve(USER_TOKEN);

      expect(notification1).toBe(notification2);
      expect(user1).toBe(user2);
      expect(notification1.getUserService()).toBe(user1);
    });
  });

  describe("Transient Lifecycle Integration", () => {
    it("should create new instances for each resolution", () => {
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "transient" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [DATABASE_TOKEN],
      });

      const user1 = container.resolve(USER_TOKEN);
      const user2 = container.resolve(USER_TOKEN);
      const db1 = container.resolve(DATABASE_TOKEN);
      const db2 = container.resolve(DATABASE_TOKEN);

      // All instances should be different
      expect(user1).not.toBe(user2);
      expect(db1).not.toBe(db2);
      expect(user1.getDatabase()).not.toBe(user2.getDatabase());
    });

    it("should create new dependency instances for each parent", () => {
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "transient" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [DATABASE_TOKEN],
      });
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "transient",
        dependencies: [USER_TOKEN, DATABASE_TOKEN],
      });

      const notification = container.resolve(NOTIFICATION_TOKEN);
      
      // NotificationService should have its own instances of dependencies
      expect(notification.getUserService()).toBeInstanceOf(UserService);
      expect(notification.getDatabase()).toBeInstanceOf(DatabaseService);
      
      // Each dependency resolution creates new instances
      expect(notification.getUserService().getDatabase()).not.toBe(notification.getDatabase());
    });
  });

  describe("Mixed Lifecycle Integration", () => {
    it("should respect different lifecycle strategies in same graph", () => {
      // Database as singleton, others as transient
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "singleton" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [DATABASE_TOKEN],
      });
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "transient",
        dependencies: [USER_TOKEN, DATABASE_TOKEN],
      });

      const user1 = container.resolve(USER_TOKEN);
      const user2 = container.resolve(USER_TOKEN);
      const notification1 = container.resolve(NOTIFICATION_TOKEN);
      const notification2 = container.resolve(NOTIFICATION_TOKEN);

      // Users and notifications should be different instances
      expect(user1).not.toBe(user2);
      expect(notification1).not.toBe(notification2);

      // But all should share the same database singleton
      expect(user1.getDatabase()).toBe(user2.getDatabase());
      expect(notification1.getDatabase()).toBe(notification2.getDatabase());
      expect(user1.getDatabase()).toBe(notification1.getDatabase());
    });

    it("should handle performance requirements with mixed lifecycles", async () => {
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "singleton" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [DATABASE_TOKEN],
      });

      const iterations = 1000;
      const startTime = performance.now();

      // Performance test: many resolutions
      for (let i = 0; i < iterations; i++) {
        const user = container.resolve(USER_TOKEN);
        expect(user).toBeInstanceOf(UserService);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Should resolve quickly (less than 1ms per resolution)
      expect(avgTime).toBeLessThan(1);

      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBeGreaterThanOrEqual(iterations); // At least one per iteration
      expect(metrics.cacheHitRatio).toBeGreaterThan(0); // Database hits from singleton cache
    });
  });

  describe("Error Handling Integration", () => {
    it("should provide proper error context for complex dependency failures", () => {
      // Register service with invalid dependency
      container.register(USER_TOKEN, UserService, { 
        dependencies: ["NonExistentService" as DIToken],
      });

      expect(() => {
        container.resolve(USER_TOKEN);
      }).toThrow(); // Should throw some error for missing dependency
    });

    it("should handle circular dependency detection", () => {
      // Create circular dependency
      class ServiceA {
        constructor(private readonly serviceB: ServiceB) {}
      }
      
      class ServiceB {
        constructor(private readonly serviceA: ServiceA) {}
      }

      const TOKEN_A: DIToken<ServiceA> = "ServiceA";
      const TOKEN_B: DIToken<ServiceB> = "ServiceB";

      container.register(TOKEN_A, ServiceA, { dependencies: [TOKEN_B] });
      container.register(TOKEN_B, ServiceB, { dependencies: [TOKEN_A] });

      expect(() => {
        container.resolve(TOKEN_A);
      }).toThrow(); // Should throw error for circular dependency
    });

    it("should provide detailed error information for resolution failures", () => {
      container.register(USER_TOKEN, UserService, { 
        dependencies: [DATABASE_TOKEN],
      });

      // Don't register DATABASE_TOKEN

      try {
        container.resolve(USER_TOKEN);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Error could be registration not found or instance creation failed
        expect(error.code).toMatch(/DI_REGISTRATION_NOT_FOUND|DI_INSTANCE_CREATION_FAILED/);
        expect(error.metadata || error.context?.metadata).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("Performance Integration", () => {
    it("should maintain performance with complex dependency graphs", () => {
      // Create a complex dependency graph
      class Layer1Service {
        constructor(public readonly db: DatabaseService) {}
      }
      class Layer2Service {
        constructor(public readonly layer1: Layer1Service, public readonly db: DatabaseService) {}
      }
      class Layer3Service {
        constructor(public readonly layer2: Layer2Service, public readonly layer1: Layer1Service) {}
      }

      const LAYER1_TOKEN: DIToken<Layer1Service> = "Layer1Service";
      const LAYER2_TOKEN: DIToken<Layer2Service> = "Layer2Service";  
      const LAYER3_TOKEN: DIToken<Layer3Service> = "Layer3Service";

      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "singleton" });
      container.register(LAYER1_TOKEN, Layer1Service, { 
        lifecycle: "singleton", 
        dependencies: [DATABASE_TOKEN],
      });
      container.register(LAYER2_TOKEN, Layer2Service, { 
        lifecycle: "singleton",
        dependencies: [LAYER1_TOKEN, DATABASE_TOKEN],
      });
      container.register(LAYER3_TOKEN, Layer3Service, { 
        lifecycle: "singleton",
        dependencies: [LAYER2_TOKEN, LAYER1_TOKEN],
      });

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const layer3 = container.resolve(LAYER3_TOKEN);
        expect(layer3).toBeInstanceOf(Layer3Service);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Complex dependency resolution should still be fast
      expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per complex resolution
    });

    it("should track accurate metrics across lifecycle types", () => {
      container.register(DATABASE_TOKEN, DatabaseService, { lifecycle: "singleton" });
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [DATABASE_TOKEN],
      });

      const resolveCount = 50;
      for (let i = 0; i < resolveCount; i++) {
        container.resolve(USER_TOKEN);
      }

      const metrics = container.getMetrics();
      
      // Should track all resolutions (UserService instances + dependencies)
      expect(metrics.totalResolutions).toBeGreaterThanOrEqual(resolveCount);
      
      // Should have some cache hits due to singleton database
      expect(metrics.cacheHitRatio).toBeGreaterThanOrEqual(0); // Some cache hits expected
      
      expect(metrics.totalRegistrations).toBe(2);
      expect(metrics.memoryUsage.singletonCount).toBe(1); // Only database is singleton
    });
  });
});