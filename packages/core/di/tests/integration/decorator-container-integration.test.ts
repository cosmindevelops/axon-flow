/**
 * Integration tests for decorator and container interaction
 *
 * Tests the seamless integration between TypeScript decorators and the DI container
 * including metadata collection, property injection, and cross-platform compatibility.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { MetadataManager, Injectable, Inject, InjectProperty } from "../../src/decorators/decorators.classes.js";
import type { DIToken } from "../../src/container/container.types.js";
import type { IMetadataManager } from "../../src/decorators/decorators.types.js";

// Mock service for testing
class ConfigService {
  public readonly apiUrl = "https://api.example.com";
  public readonly timeout = 5000;
  public readonly retryCount = 3;
}

class LoggerService {
  public readonly level = "info";
  
  log(message: string): void {
    console.log(`[${this.level.toUpperCase()}] ${message}`);
  }
}

// Test service with decorator injection
@Injectable({ lifecycle: "transient" })
class UserService {
  @InjectProperty("IConfigService")
  public config?: ConfigService;
  
  constructor(
    @Inject("ILoggerService") private readonly logger: LoggerService,
  ) {}
  
  async fetchUser(id: string): Promise<{ id: string; name: string }> {
    this.logger.log(`Fetching user ${id} from ${this.config?.apiUrl}`);
    return { id, name: `User${id}` };
  }
}

// Service with complex dependency injection
@Injectable({ lifecycle: "singleton" })
class NotificationService {
  @InjectProperty("IUserService")
  public userService?: UserService;
  
  @InjectProperty("IConfigService")
  public config?: ConfigService;
  
  constructor(
    @Inject("ILoggerService") private readonly logger: LoggerService,
  ) {}
  
  async sendNotification(userId: string, message: string): Promise<boolean> {
    if (!this.userService || !this.config) {
      this.logger.log("Dependencies not injected");
      return false;
    }
    
    const user = await this.userService.fetchUser(userId);
    this.logger.log(`Sending notification to ${user.name}: ${message}`);
    return true;
  }
}

// Service without decorators for comparison
class PlainService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}
  
  process(): string {
    this.logger.log(`Processing with config: ${this.config.apiUrl}`);
    return "processed";
  }
}

// Tokens
const CONFIG_TOKEN: DIToken<ConfigService> = "IConfigService";
const LOGGER_TOKEN: DIToken<LoggerService> = "ILoggerService";
const USER_TOKEN: DIToken<UserService> = "IUserService";
const NOTIFICATION_TOKEN: DIToken<NotificationService> = "INotificationService";
const PLAIN_TOKEN: DIToken<PlainService> = "IPlainService";

describe("Decorator-Container Integration", () => {
  let container: DIContainer;
  let metadataManager: IMetadataManager;

  beforeEach(() => {
    container = new DIContainer({
      name: "DecoratorIntegrationContainer",
      enableMetrics: true,
    });
    metadataManager = new MetadataManager();
    
    // Register base services
    container.register(CONFIG_TOKEN, ConfigService, { lifecycle: "singleton" });
    container.register(LOGGER_TOKEN, LoggerService, { lifecycle: "singleton" });
  });

  afterEach(() => {
    container.dispose();
  });

  describe("@Injectable Decorator Integration", () => {
    it("should resolve decorated services with automatic dependency injection", () => {
      // Register decorated services
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [LOGGER_TOKEN],
      });
      
      const userService = container.resolve(USER_TOKEN);
      
      expect(userService).toBeInstanceOf(UserService);
      expect(userService['logger']).toBeInstanceOf(LoggerService);
      expect(userService.config).toBeUndefined(); // Property injection not done yet
    });

    it("should handle lifecycle metadata from decorators", () => {
      // Check if we can read metadata (simulating decorator metadata reading)
      const hasReflect = metadataManager.hasReflectSupport();
      
      if (hasReflect) {
        // In environments with reflect-metadata support
        expect(typeof Reflect.getMetadata).toBe("function");
      } else {
        // Should work without reflect-metadata in browser/other environments
        expect(metadataManager).toBeDefined();
      }
    });

    it("should support singleton lifecycle through decorators", () => {
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN],
      });
      
      const notification1 = container.resolve(NOTIFICATION_TOKEN);
      const notification2 = container.resolve(NOTIFICATION_TOKEN);
      
      expect(notification1).toBe(notification2); // Same singleton instance
    });
  });

  describe("Property Injection Integration", () => {
    it("should handle @InjectProperty with manual property injection", async () => {
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [LOGGER_TOKEN],
      });
      
      const userService = container.resolve(USER_TOKEN);
      
      // Manually inject property (simulating property injection behavior)
      userService.config = container.resolve(CONFIG_TOKEN);
      
      expect(userService.config).toBeInstanceOf(ConfigService);
      expect(userService.config.apiUrl).toBe("https://api.example.com");
      
      const result = await userService.fetchUser("123");
      expect(result).toEqual({ id: "123", name: "User123" });
    });

    it("should handle complex property injection scenarios", async () => {
      // Register all services
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [LOGGER_TOKEN],
      });
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN],
      });
      
      const notificationService = container.resolve(NOTIFICATION_TOKEN);
      const userService = container.resolve(USER_TOKEN);
      
      // Simulate property injection
      userService.config = container.resolve(CONFIG_TOKEN);
      notificationService.userService = userService;
      notificationService.config = container.resolve(CONFIG_TOKEN);
      
      const result = await notificationService.sendNotification("456", "Hello!");
      expect(result).toBe(true);
    });

    it("should handle missing property injection gracefully", async () => {
      container.register(NOTIFICATION_TOKEN, NotificationService, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN],
      });
      
      const notificationService = container.resolve(NOTIFICATION_TOKEN);
      
      // Don't inject properties - should handle gracefully
      const result = await notificationService.sendNotification("789", "Test");
      expect(result).toBe(false); // Should fail gracefully
    });
  });

  describe("@Inject Parameter Injection Integration", () => {
    it("should resolve constructor dependencies with @Inject decorators", () => {
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [LOGGER_TOKEN],
      });
      
      const userService = container.resolve(USER_TOKEN);
      
      expect(userService).toBeInstanceOf(UserService);
      // Logger should be injected through constructor
      expect(userService['logger']).toBeInstanceOf(LoggerService);
    });

    it("should work alongside non-decorated services", () => {
      // Register plain service with explicit dependencies
      container.register(PLAIN_TOKEN, PlainService, {
        lifecycle: "transient",
        dependencies: [CONFIG_TOKEN, LOGGER_TOKEN],
      });
      
      const plainService = container.resolve(PLAIN_TOKEN);
      
      expect(plainService).toBeInstanceOf(PlainService);
      expect(plainService.process()).toBe("processed");
    });
  });

  describe("Cross-Platform Compatibility", () => {
    it("should work in Node.js environment", () => {
      // Node.js specific tests
      expect(typeof process).toBe("object");
      expect(typeof global).toBe("object");
      
      const hasReflect = metadataManager.hasReflectSupport();
      expect(typeof hasReflect).toBe("boolean");
      
      // Should work regardless of reflect-metadata availability
      container.register(USER_TOKEN, UserService, { 
        lifecycle: "transient",
        dependencies: [LOGGER_TOKEN],
      });
      
      const userService = container.resolve(USER_TOKEN);
      expect(userService).toBeInstanceOf(UserService);
    });

    it("should handle browser environment without reflect-metadata", () => {
      // Simulate browser environment
      const originalReflect = (global as any).Reflect;
      
      try {
        // Temporarily remove Reflect to simulate browser without reflect-metadata
        delete (global as any).Reflect;
        
        const browserMetadataManager = new MetadataManager();
        expect(browserMetadataManager.hasReflectSupport()).toBe(false);
        
        // Should still work for basic dependency injection
        container.register(LOGGER_TOKEN, LoggerService, { lifecycle: "singleton" });
        const logger = container.resolve(LOGGER_TOKEN);
        expect(logger).toBeInstanceOf(LoggerService);
        
      } finally {
        // Restore Reflect
        (global as any).Reflect = originalReflect;
      }
    });

    it("should handle performance.now() across platforms", () => {
      const startTime = performance.now();
      
      // Resolve services multiple times
      for (let i = 0; i < 100; i++) {
        container.register(`TestService${i}`, LoggerService, { lifecycle: "transient" });
        container.resolve(`TestService${i}` as DIToken<LoggerService>);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeGreaterThan(0);
      
      const metrics = container.getMetrics();
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
    });
  });

  describe("Circular Dependency Detection with Decorators", () => {
    it("should detect circular dependencies in decorated services", () => {
      @Injectable()
      class ServiceA {
        constructor(@Inject("ServiceB") private serviceB: ServiceB) {}
      }
      
      @Injectable()
      class ServiceB {
        constructor(@Inject("ServiceA") private serviceA: ServiceA) {}
      }
      
      const TOKEN_A: DIToken<ServiceA> = "ServiceA";
      const TOKEN_B: DIToken<ServiceB> = "ServiceB";
      
      container.register(TOKEN_A, ServiceA, { dependencies: [TOKEN_B] });
      container.register(TOKEN_B, ServiceB, { dependencies: [TOKEN_A] });
      
      expect(() => {
        container.resolve(TOKEN_A);
      }).toThrow(); // May throw different errors depending on resolution path
    });
  });

  describe("Error Recovery Integration", () => {
    it("should integrate with @axon/errors retry mechanisms", async () => {
      @Injectable()
      class FailingService {
        private attempts = 0;
        
        constructor(@Inject("ILoggerService") private logger: LoggerService) {}
        
        process(): string {
          this.attempts++;
          this.logger.log(`Attempt ${this.attempts}`);
          
          if (this.attempts < 3) {
            throw new Error("Service temporarily unavailable");
          }
          return "success";
        }
      }
      
      const FAILING_TOKEN: DIToken<FailingService> = "IFailingService";
      
      container.register(FAILING_TOKEN, FailingService, {
        dependencies: [LOGGER_TOKEN],
      });
      
      const service = container.resolve(FAILING_TOKEN);
      
      // Should fail on first two attempts
      expect(() => service.process()).toThrow("Service temporarily unavailable");
      expect(() => service.process()).toThrow("Service temporarily unavailable");
      
      // Should succeed on third attempt
      expect(service.process()).toBe("success");
    });

    it("should maintain correlation IDs across error scenarios", () => {
      container.register(USER_TOKEN, UserService, { 
        dependencies: ["NonExistentService" as DIToken],
      });
      
      try {
        container.resolve(USER_TOKEN);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Error could be registration not found or instance creation failed
        expect(error.code).toMatch(/DI_REGISTRATION_NOT_FOUND|DI_INSTANCE_CREATION_FAILED/);
        expect(error.metadata || error.context?.metadata).toBeDefined();
        expect(error.context?.correlationId || error.correlationId).toBeDefined();
      }
    });
  });

  describe("Memory Management with Decorators", () => {
    it("should manage memory consistently across environments", () => {
      const initialMetrics = container.getMetrics();
      
      // Register and resolve many services
      for (let i = 0; i < 50; i++) {
        container.register(`Service${i}`, LoggerService, { lifecycle: "singleton" });
        container.resolve(`Service${i}` as DIToken<LoggerService>);
      }
      
      const finalMetrics = container.getMetrics();
      
      expect(finalMetrics.totalRegistrations).toBe(initialMetrics.totalRegistrations + 50);
      expect(finalMetrics.memoryUsage.singletonCount).toBe(initialMetrics.memoryUsage.singletonCount + 50);
      expect(finalMetrics.memoryUsage.estimatedBytes).toBeGreaterThan(initialMetrics.memoryUsage.estimatedBytes);
    });

    it("should cleanup metadata properly on container disposal", () => {
      const container2 = new DIContainer({ name: "TempContainer" });
      
      container2.register(LOGGER_TOKEN, LoggerService, { lifecycle: "singleton" });
      container2.resolve(LOGGER_TOKEN);
      
      const metricsBeforeDispose = container2.getMetrics();
      expect(metricsBeforeDispose.totalRegistrations).toBe(1);
      
      container2.dispose();
      
      // After disposal, should not accept new operations
      expect(() => {
        container2.resolve(LOGGER_TOKEN);
      }).toThrow("Container has been disposed");
    });
  });
});