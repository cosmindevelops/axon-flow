/**
 * Real-world integration scenarios
 *
 * Tests practical, production-like scenarios using the DI container
 * including web service patterns, database connections, authentication
 * providers, and microservice communication patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { ObjectPool } from "../../src/pool/pool.classes.js";
import { SimpleFactory, CachedFactory } from "../../src/factory/factory.classes.js";
import type { DIToken } from "../../src/container/container.types.js";

// Authentication provider interfaces and implementations
interface IAuthProvider {
  authenticate(token: string): Promise<{ userId: string; roles: string[] } | null>;
  validatePermission(userId: string, resource: string): Promise<boolean>;
}

class JWTAuthProvider implements IAuthProvider {
  private readonly secretKey = "jwt-secret-key";

  async authenticate(token: string): Promise<{ userId: string; roles: string[] } | null> {
    // Simplified JWT validation
    if (token.startsWith("valid-jwt-")) {
      const userId = token.replace("valid-jwt-", "");
      return { userId, roles: ["user"] };
    }
    if (token === "admin-jwt-token") {
      return { userId: "admin", roles: ["admin", "user"] };
    }
    return null;
  }

  async validatePermission(userId: string, resource: string): Promise<boolean> {
    if (userId === "admin") return true;
    return resource.startsWith("/public/") || resource.startsWith(`/user/${userId}/`);
  }
}

class OAuth2AuthProvider implements IAuthProvider {
  private readonly clientId = "oauth2-client-id";

  async authenticate(token: string): Promise<{ userId: string; roles: string[] } | null> {
    if (token.startsWith("oauth2-")) {
      const userId = token.replace("oauth2-", "");
      return { userId, roles: ["user", "oauth2"] };
    }
    return null;
  }

  async validatePermission(userId: string, resource: string): Promise<boolean> {
    // OAuth2 users have limited permissions
    return resource.startsWith("/api/v1/public/");
  }
}

// Database provider interfaces and implementations
interface IDatabaseProvider {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  beginTransaction(): Promise<ITransaction>;
  getHealth(): Promise<{ status: string; latency: number }>;
}

interface ITransaction {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class PostgreSQLProvider implements IDatabaseProvider {
  private connectionCount = 0;
  private queryCount = 0;

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.queryCount++;
    // Simulate database query
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

    if (sql.includes("users")) {
      return [{ id: 1, name: "John Doe", email: "john@example.com" }] as T[];
    }
    return [] as T[];
  }

  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }> {
    this.queryCount++;
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
    return { affectedRows: sql.includes("INSERT") ? 1 : 0 };
  }

  async beginTransaction(): Promise<ITransaction> {
    return new PostgreSQLTransaction();
  }

  async getHealth(): Promise<{ status: string; latency: number }> {
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 1));
    const latency = performance.now() - start;

    return {
      status: this.connectionCount < 100 ? "healthy" : "degraded",
      latency,
    };
  }

  getStats(): { connections: number; queries: number } {
    return { connections: this.connectionCount, queries: this.queryCount };
  }
}

class PostgreSQLTransaction implements ITransaction {
  private committed = false;
  private rolledBack = false;

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureActive();
    return [] as T[];
  }

  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }> {
    this.ensureActive();
    return { affectedRows: 1 };
  }

  async commit(): Promise<void> {
    this.ensureActive();
    this.committed = true;
  }

  async rollback(): Promise<void> {
    this.ensureActive();
    this.rolledBack = true;
  }

  private ensureActive(): void {
    if (this.committed || this.rolledBack) {
      throw new Error("Transaction is no longer active");
    }
  }
}

// Cache provider interface and implementation
interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): { hits: number; misses: number; size: number };
}

class RedisProvider implements ICacheProvider {
  private storage = new Map<string, { value: unknown; expires?: number }>();
  private hits = 0;
  private misses = 0;

  async get<T>(key: string): Promise<T | null> {
    const item = this.storage.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    if (item.expires && Date.now() > item.expires) {
      this.storage.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const expires = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
    this.storage.set(key, { value, expires });
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.storage.size,
    };
  }
}

// Business logic services
class UserService {
  constructor(
    private readonly database: IDatabaseProvider,
    private readonly cache: ICacheProvider,
  ) {}

  async getUser(userId: string): Promise<{ id: number; name: string; email: string } | null> {
    // Try cache first
    const cacheKey = `user:${userId}`;
    let user = await this.cache.get<{ id: number; name: string; email: string }>(cacheKey);

    if (!user) {
      // Query database
      const users = await this.database.query<{ id: number; name: string; email: string }>(
        "SELECT id, name, email FROM users WHERE id = $1",
        [userId],
      );

      user = users[0] || null;

      if (user) {
        // Cache for 5 minutes
        await this.cache.set(cacheKey, user, 300);
      }
    }

    return user;
  }

  async createUser(userData: { name: string; email: string }): Promise<number> {
    const result = await this.database.execute("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id", [
      userData.name,
      userData.email,
    ]);

    // Invalidate related cache entries
    await this.cache.delete(`user:${userData.email}`);

    return result.affectedRows;
  }
}

class OrderService {
  constructor(
    private readonly database: IDatabaseProvider,
    private readonly userService: UserService,
    private readonly authProvider: IAuthProvider,
  ) {}

  async createOrder(
    token: string,
    orderData: { userId: string; items: Array<{ productId: string; quantity: number }> },
  ): Promise<{ orderId: string; total: number } | null> {
    // Authenticate user
    const auth = await this.authProvider.authenticate(token);
    if (!auth) {
      return null;
    }

    // Verify user can access this order
    if (auth.userId !== orderData.userId && !auth.roles.includes("admin")) {
      return null;
    }

    // Get user details
    const user = await this.userService.getUser(orderData.userId);
    if (!user) {
      return null;
    }

    // Create order in transaction
    const transaction = await this.database.beginTransaction();

    try {
      await transaction.execute("INSERT INTO orders (user_id, status) VALUES ($1, $2)", [orderData.userId, "pending"]);

      let total = 0;
      for (const item of orderData.items) {
        const price = 10.0; // Mock price
        total += price * item.quantity;

        await transaction.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
          ["order-123", item.productId, item.quantity, price],
        );
      }

      await transaction.commit();

      return { orderId: "order-123", total };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

// HTTP API layer
class APIController {
  constructor(
    private readonly orderService: OrderService,
    private readonly userService: UserService,
    private readonly authProvider: IAuthProvider,
  ) {}

  async handleGetUser(request: { userId: string; token: string }): Promise<{
    status: number;
    data?: any;
    error?: string;
  }> {
    try {
      const auth = await this.authProvider.authenticate(request.token);
      if (!auth) {
        return { status: 401, error: "Unauthorized" };
      }

      const hasPermission = await this.authProvider.validatePermission(auth.userId, `/user/${request.userId}/profile`);

      if (!hasPermission) {
        return { status: 403, error: "Forbidden" };
      }

      const user = await this.userService.getUser(request.userId);
      if (!user) {
        return { status: 404, error: "User not found" };
      }

      return { status: 200, data: user };
    } catch (error) {
      return { status: 500, error: "Internal server error" };
    }
  }

  async handleCreateOrder(request: {
    token: string;
    orderData: { userId: string; items: Array<{ productId: string; quantity: number }> };
  }): Promise<{ status: number; data?: any; error?: string }> {
    try {
      const result = await this.orderService.createOrder(request.token, request.orderData);

      if (!result) {
        return { status: 401, error: "Unauthorized or invalid request" };
      }

      return { status: 201, data: result };
    } catch (error) {
      return { status: 500, error: "Failed to create order" };
    }
  }
}

// Health monitoring service
class HealthService {
  constructor(
    private readonly database: IDatabaseProvider,
    private readonly cache: ICacheProvider,
  ) {}

  async getSystemHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    components: Record<string, any>;
    timestamp: number;
  }> {
    const checks = await Promise.allSettled([this.checkDatabase(), this.checkCache()]);

    const components: Record<string, any> = {};
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    checks.forEach((check, index) => {
      const componentName = ["database", "cache"][index];

      if (check.status === "fulfilled") {
        components[componentName] = check.value;
        if (check.value.status !== "healthy") {
          overallStatus = "degraded";
        }
      } else {
        components[componentName] = { status: "unhealthy", error: check.reason.message };
        overallStatus = "unhealthy";
      }
    });

    return {
      status: overallStatus,
      components,
      timestamp: Date.now(),
    };
  }

  private async checkDatabase(): Promise<{ status: string; latency: number }> {
    return await this.database.getHealth();
  }

  private async checkCache(): Promise<{ status: string; stats: any }> {
    const stats = this.cache.getStats();
    return {
      status: stats.size < 10000 ? "healthy" : "degraded",
      stats,
    };
  }
}

// Tokens
const AUTH_PROVIDER_TOKEN: DIToken<IAuthProvider> = "IAuthProvider";
const DATABASE_PROVIDER_TOKEN: DIToken<IDatabaseProvider> = "IDatabaseProvider";
const CACHE_PROVIDER_TOKEN: DIToken<ICacheProvider> = "ICacheProvider";
const USER_SERVICE_TOKEN: DIToken<UserService> = "IUserService";
const ORDER_SERVICE_TOKEN: DIToken<OrderService> = "IOrderService";
const API_CONTROLLER_TOKEN: DIToken<APIController> = "IAPIController";
const HEALTH_SERVICE_TOKEN: DIToken<HealthService> = "IHealthService";

describe("Real-World Integration Scenarios", () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer({
      name: "ProductionContainer",
      enableMetrics: true,
    });
  });

  afterEach(() => {
    container.dispose();
  });

  describe("Web Service Dependency Injection", () => {
    it("should handle complete web service dependency graph", async () => {
      // Register all providers and services
      container.register(AUTH_PROVIDER_TOKEN, JWTAuthProvider, { lifecycle: "singleton" });
      container.register(DATABASE_PROVIDER_TOKEN, PostgreSQLProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(USER_SERVICE_TOKEN, UserService, {
        lifecycle: "singleton",
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      container.register(ORDER_SERVICE_TOKEN, OrderService, {
        lifecycle: "singleton",
        dependencies: [DATABASE_PROVIDER_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN],
      });

      container.register(API_CONTROLLER_TOKEN, APIController, {
        lifecycle: "singleton",
        dependencies: [ORDER_SERVICE_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN],
      });

      const apiController = container.resolve(API_CONTROLLER_TOKEN);

      // Test user endpoint
      const userResponse = await apiController.handleGetUser({
        userId: "1",
        token: "valid-jwt-1",
      });

      expect(userResponse.status).toBe(200);
      expect(userResponse.data).toEqual({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      });

      // Test order creation
      const orderResponse = await apiController.handleCreateOrder({
        token: "valid-jwt-1",
        orderData: {
          userId: "1",
          items: [
            { productId: "prod-1", quantity: 2 },
            { productId: "prod-2", quantity: 1 },
          ],
        },
      });

      expect(orderResponse.status).toBe(201);
      expect(orderResponse.data).toEqual({
        orderId: "order-123",
        total: 30, // 2*10 + 1*10
      });
    });

    it("should handle authentication provider switching", async () => {
      // Initially register JWT provider
      container.register(AUTH_PROVIDER_TOKEN, JWTAuthProvider, { lifecycle: "singleton" });
      container.register(DATABASE_PROVIDER_TOKEN, PostgreSQLProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(USER_SERVICE_TOKEN, UserService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      container.register(API_CONTROLLER_TOKEN, APIController, {
        dependencies: [ORDER_SERVICE_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN],
      });

      container.register(ORDER_SERVICE_TOKEN, OrderService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN],
      });

      let apiController = container.resolve(API_CONTROLLER_TOKEN);

      // Test with JWT token
      let response = await apiController.handleGetUser({
        userId: "1",
        token: "valid-jwt-1",
      });
      expect(response.status).toBe(200);

      // Switch to OAuth2 provider (simulating runtime provider switching)
      container.unregister(AUTH_PROVIDER_TOKEN);
      container.register(AUTH_PROVIDER_TOKEN, OAuth2AuthProvider, { lifecycle: "singleton" });

      // Re-resolve controller with new auth provider
      apiController = container.resolve(API_CONTROLLER_TOKEN);

      // Test with OAuth2 token - should fail due to different permissions
      response = await apiController.handleGetUser({
        userId: "1",
        token: "oauth2-1",
      });
      expect(response.status).toBe(403); // OAuth2 provider has stricter permissions
    });
  });

  describe("Database Connection Pooling", () => {
    it("should integrate database connection pool with DI container", async () => {
      // Create connection pool
      const dbPool = new ObjectPool(DATABASE_PROVIDER_TOKEN, () => new PostgreSQLProvider(), {
        minSize: 2,
        maxSize: 10,
        enableMetrics: true,
      });

      await dbPool.warmUp();

      // Use factory to provide pooled connections
      const poolFactory = new SimpleFactory("DatabasePoolFactory", async () => {
        return await dbPool.acquire();
      });

      container.registerFactoryInstance(DATABASE_PROVIDER_TOKEN, poolFactory);
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(USER_SERVICE_TOKEN, UserService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      // Use multiple user services (simulating concurrent requests)
      const services: UserService[] = [];
      for (let i = 0; i < 5; i++) {
        services.push(await container.resolveAsync(USER_SERVICE_TOKEN));
      }

      // All should use pooled database connections
      const users = await Promise.all(services.map((service, i) => service.getUser(`user-${i}`)));

      expect(users).toHaveLength(5);
      users.forEach((user) => {
        expect(user).toEqual({
          id: 1,
          name: "John Doe",
          email: "john@example.com",
        });
      });

      const poolStats = dbPool.getStats();
      expect(poolStats.totalAcquired).toBe(5);

      await dbPool.destroy();
    });

    it("should handle database connection failures gracefully", async () => {
      // Create a failing database provider
      class FailingDatabaseProvider implements IDatabaseProvider {
        async query<T>(): Promise<T[]> {
          throw new Error("Database connection failed");
        }

        async execute(): Promise<{ affectedRows: number }> {
          throw new Error("Database connection failed");
        }

        async beginTransaction(): Promise<ITransaction> {
          throw new Error("Database connection failed");
        }

        async getHealth(): Promise<{ status: string; latency: number }> {
          throw new Error("Database connection failed");
        }
      }

      container.register(DATABASE_PROVIDER_TOKEN, FailingDatabaseProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(HEALTH_SERVICE_TOKEN, HealthService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      const healthService = container.resolve(HEALTH_SERVICE_TOKEN);
      const health = await healthService.getSystemHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.components.database.status).toBe("unhealthy");
      expect(health.components.cache.status).toBe("healthy");
    });
  });

  describe("Microservice Communication Patterns", () => {
    it("should support event-driven microservice patterns", async () => {
      // Event bus simulation
      interface IEventBus {
        publish(event: string, data: any): Promise<void>;
        subscribe(event: string, handler: (data: any) => void): void;
      }

      class EventBus implements IEventBus {
        private handlers = new Map<string, Array<(data: any) => void>>();

        async publish(event: string, data: any): Promise<void> {
          const eventHandlers = this.handlers.get(event) || [];
          await Promise.all(eventHandlers.map((handler) => handler(data)));
        }

        subscribe(event: string, handler: (data: any) => void): void {
          if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
          }
          this.handlers.get(event)!.push(handler);
        }
      }

      // Order service that publishes events
      class EventDrivenOrderService extends OrderService {
        constructor(
          database: IDatabaseProvider,
          userService: UserService,
          authProvider: IAuthProvider,
          private eventBus: IEventBus,
        ) {
          super(database, userService, authProvider);
        }

        async createOrder(token: string, orderData: any): Promise<any> {
          const result = await super.createOrder(token, orderData);

          if (result) {
            await this.eventBus.publish("order.created", {
              orderId: result.orderId,
              userId: orderData.userId,
              total: result.total,
            });
          }

          return result;
        }
      }

      // Notification service that listens to events
      class NotificationService {
        private notifications: any[] = [];

        constructor(private eventBus: IEventBus) {
          this.eventBus.subscribe("order.created", this.handleOrderCreated.bind(this));
        }

        private handleOrderCreated(orderData: any): void {
          this.notifications.push({
            type: "order_created",
            message: `Order ${orderData.orderId} created for user ${orderData.userId}`,
            data: orderData,
          });
        }

        getNotifications(): any[] {
          return [...this.notifications];
        }
      }

      const EVENT_BUS_TOKEN: DIToken<IEventBus> = "IEventBus";
      const NOTIFICATION_SERVICE_TOKEN: DIToken<NotificationService> = "INotificationService";
      const EVENT_ORDER_SERVICE_TOKEN: DIToken<EventDrivenOrderService> = "IEventOrderService";

      // Register services
      container.register(EVENT_BUS_TOKEN, EventBus, { lifecycle: "singleton" });
      container.register(AUTH_PROVIDER_TOKEN, JWTAuthProvider, { lifecycle: "singleton" });
      container.register(DATABASE_PROVIDER_TOKEN, PostgreSQLProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(USER_SERVICE_TOKEN, UserService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      container.register(EVENT_ORDER_SERVICE_TOKEN, EventDrivenOrderService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN, EVENT_BUS_TOKEN],
      });

      container.register(NOTIFICATION_SERVICE_TOKEN, NotificationService, {
        dependencies: [EVENT_BUS_TOKEN],
      });

      // Get services
      const orderService = container.resolve(EVENT_ORDER_SERVICE_TOKEN);
      const notificationService = container.resolve(NOTIFICATION_SERVICE_TOKEN);

      // Create order (should trigger notification)
      const orderResult = await orderService.createOrder("valid-jwt-123", {
        userId: "123",
        items: [{ productId: "prod-1", quantity: 1 }],
      });

      expect(orderResult).toBeDefined();

      // Check that notification was sent
      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("order_created");
      expect(notifications[0].data.orderId).toBe("order-123");
    });
  });

  describe("Performance and Caching Integration", () => {
    it("should implement multi-level caching with performance monitoring", async () => {
      // Performance monitoring wrapper
      class MonitoredCacheProvider implements ICacheProvider {
        private operations: Array<{ operation: string; duration: number }> = [];

        constructor(private underlying: ICacheProvider) {}

        async get<T>(key: string): Promise<T | null> {
          const start = performance.now();
          const result = await this.underlying.get<T>(key);
          const duration = performance.now() - start;

          this.operations.push({ operation: "get", duration });
          return result;
        }

        async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
          const start = performance.now();
          await this.underlying.set(key, value, ttlSeconds);
          const duration = performance.now() - start;

          this.operations.push({ operation: "set", duration });
        }

        async delete(key: string): Promise<boolean> {
          const start = performance.now();
          const result = await this.underlying.delete(key);
          const duration = performance.now() - start;

          this.operations.push({ operation: "delete", duration });
          return result;
        }

        async clear(): Promise<void> {
          const start = performance.now();
          await this.underlying.clear();
          const duration = performance.now() - start;

          this.operations.push({ operation: "clear", duration });
        }

        getStats() {
          return this.underlying.getStats();
        }

        getPerformanceStats() {
          return {
            totalOperations: this.operations.length,
            averageDuration: this.operations.reduce((sum, op) => sum + op.duration, 0) / this.operations.length || 0,
            operations: [...this.operations],
          };
        }
      }

      // Use cached factory for database provider
      const dbFactory = new CachedFactory(
        "CachedDatabaseFactory",
        new SimpleFactory("DatabaseFactory", () => new PostgreSQLProvider()),
        5, // Cache up to 5 instances
      );

      container.registerFactoryInstance(DATABASE_PROVIDER_TOKEN, dbFactory);
      container.registerFactory(CACHE_PROVIDER_TOKEN, () => new MonitoredCacheProvider(new RedisProvider()));

      container.register(USER_SERVICE_TOKEN, UserService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      const userService = container.resolve(USER_SERVICE_TOKEN);
      const cacheProvider = container.resolve(CACHE_PROVIDER_TOKEN) as MonitoredCacheProvider;

      // Perform operations
      const user1 = await userService.getUser("123"); // Should hit database
      const user2 = await userService.getUser("123"); // Should hit cache
      const user3 = await userService.getUser("456"); // Should hit database

      expect(user1).toEqual(user2);

      // Check cache performance
      const cacheStats = cacheProvider.getStats();
      const perfStats = cacheProvider.getPerformanceStats();

      expect(cacheStats.hits).toBeGreaterThan(0);
      expect(perfStats.totalOperations).toBeGreaterThan(0);
      expect(perfStats.averageDuration).toBeGreaterThan(0);

      // Check factory caching
      const dbMetadata = dbFactory.getMetadata();
      expect(dbMetadata.performance?.totalCreated).toBe(1); // Should reuse cached instances
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should implement circuit breaker pattern for external services", async () => {
      // Failing external service
      class FailingExternalService {
        private failureCount = 0;

        async callExternalAPI(): Promise<any> {
          this.failureCount++;
          if (this.failureCount <= 5) {
            throw new Error("External service temporarily unavailable");
          }
          return { success: true, data: "External data" };
        }

        getFailureCount(): number {
          return this.failureCount;
        }
      }

      const EXTERNAL_SERVICE_TOKEN: DIToken<FailingExternalService> = "IExternalService";

      container.register(EXTERNAL_SERVICE_TOKEN, FailingExternalService, { lifecycle: "singleton" });
      container.register(DATABASE_PROVIDER_TOKEN, PostgreSQLProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(HEALTH_SERVICE_TOKEN, HealthService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      const externalService = container.resolve(EXTERNAL_SERVICE_TOKEN);
      const healthService = container.resolve(HEALTH_SERVICE_TOKEN);

      // Try external service calls (should fail initially)
      let attempts = 0;
      let success = false;

      while (attempts < 10 && !success) {
        try {
          await externalService.callExternalAPI();
          success = true;
        } catch (error) {
          attempts++;
          // In real implementation, this would be handled by circuit breaker
        }
      }

      expect(success).toBe(true);
      expect(externalService.getFailureCount()).toBe(6); // 5 failures + 1 success

      // Health service should still report system health despite external failures
      const health = await healthService.getSystemHealth();
      expect(health.status).toMatch(/healthy|degraded/); // Should not be unhealthy due to external service
    });

    it("should handle graceful degradation when services are unavailable", async () => {
      // Degraded user service that falls back when cache fails
      class GracefulUserService extends UserService {
        async getUser(userId: string): Promise<any> {
          try {
            return await super.getUser(userId);
          } catch (error) {
            // Fallback to basic database query without caching
            console.warn("Cache unavailable, using fallback mode");
            return {
              id: parseInt(userId),
              name: "Fallback User",
              email: "fallback@example.com",
            };
          }
        }
      }

      // Failing cache provider
      class FailingCacheProvider implements ICacheProvider {
        async get(): Promise<any> {
          throw new Error("Cache service unavailable");
        }

        async set(): Promise<void> {
          throw new Error("Cache service unavailable");
        }

        async delete(): Promise<boolean> {
          throw new Error("Cache service unavailable");
        }

        async clear(): Promise<void> {
          throw new Error("Cache service unavailable");
        }

        getStats() {
          return { hits: 0, misses: 0, size: 0 };
        }
      }

      container.register(DATABASE_PROVIDER_TOKEN, PostgreSQLProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, FailingCacheProvider, { lifecycle: "singleton" });

      container.register(USER_SERVICE_TOKEN, GracefulUserService, {
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      const userService = container.resolve(USER_SERVICE_TOKEN);

      // Should succeed despite cache failures
      const user = await userService.getUser("789");
      expect(user).toEqual({
        id: 789,
        name: "Fallback User",
        email: "fallback@example.com",
      });
    });
  });

  describe("Container Metrics in Production Scenarios", () => {
    it("should provide comprehensive metrics for production monitoring", async () => {
      // Register full application stack
      container.register(AUTH_PROVIDER_TOKEN, JWTAuthProvider, { lifecycle: "singleton" });
      container.register(DATABASE_PROVIDER_TOKEN, PostgreSQLProvider, { lifecycle: "singleton" });
      container.register(CACHE_PROVIDER_TOKEN, RedisProvider, { lifecycle: "singleton" });

      container.register(USER_SERVICE_TOKEN, UserService, {
        lifecycle: "singleton",
        dependencies: [DATABASE_PROVIDER_TOKEN, CACHE_PROVIDER_TOKEN],
      });

      container.register(ORDER_SERVICE_TOKEN, OrderService, {
        lifecycle: "transient", // New instance per request
        dependencies: [DATABASE_PROVIDER_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN],
      });

      container.register(API_CONTROLLER_TOKEN, APIController, {
        lifecycle: "transient",
        dependencies: [ORDER_SERVICE_TOKEN, USER_SERVICE_TOKEN, AUTH_PROVIDER_TOKEN],
      });

      // Simulate production load
      const controllers: APIController[] = [];
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const controller = container.resolve(API_CONTROLLER_TOKEN);
        controllers.push(controller);

        // Simulate API calls
        if (i % 10 === 0) {
          await controller.handleGetUser({
            userId: `${i}`,
            token: `valid-jwt-${i}`,
          });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const metrics = container.getMetrics();

      // Verify metrics
      expect(metrics.totalRegistrations).toBe(6); // All registered services
      expect(metrics.totalResolutions).toBeGreaterThan(100); // Many resolutions due to dependencies
      expect(metrics.averageResolutionTime).toBeLessThan(5); // Should be fast
      expect(metrics.cacheHitRatio).toBeGreaterThan(0); // Singletons should have cache hits

      expect(metrics.memoryUsage.singletonCount).toBe(3); // Auth, Database, Cache, User services
      expect(metrics.memoryUsage.estimatedBytes).toBeGreaterThan(0);

      // Performance should be reasonable
      const avgTimePerController = totalTime / 100;
      expect(avgTimePerController).toBeLessThan(10); // Less than 10ms per controller creation
    });
  });
});
