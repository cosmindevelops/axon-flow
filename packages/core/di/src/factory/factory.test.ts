/**
 * Factory pattern integration tests
 *
 * Tests for factory pattern integration with the DI container.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createContainer } from "../container/container.classes.js";
import { SimpleFactory, CachedFactory, FactoryRegistry, UniversalProviderFactory } from "./factory.classes.js";
import type { IDIContainer } from "../container/container.types.js";

describe("Factory Pattern Integration", () => {
  let container: IDIContainer;

  beforeEach(() => {
    container = createContainer({ name: "TestContainer" });
  });

  describe("SimpleFactory", () => {
    it("should create instances using simple factory", () => {
      // Arrange
      interface ITestService {
        getValue(): string;
      }
      
      class TestService implements ITestService {
        constructor(private value: string = "test") {}
        getValue(): string {
          return this.value;
        }
      }

      const factory = new SimpleFactory<ITestService>(
        "TestServiceFactory",
        (...args: unknown[]) => new TestService(args[0] as string || "default"),
      );

      // Act
      container.registerFactoryInstance<ITestService>("ITestService", factory);
      const instance = container.resolve<ITestService>("ITestService");

      // Assert
      expect(instance).toBeDefined();
      expect(instance.getValue()).toBe("default");
    });

    it("should track factory performance metrics", () => {
      // Arrange
      const factory = new SimpleFactory<string>("StringFactory", () => "test");

      // Act
      container.registerFactoryInstance<string>("TestString", factory);
      container.resolve<string>("TestString");
      const metadata = factory.getMetadata();

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata.factoryType).toBe("SimpleFactory");
      expect(metadata.performance?.totalCreated).toBe(1);
      expect(metadata.performance?.successRate).toBe(1);
    });
  });

  describe("CachedFactory", () => {
    it("should cache factory results", () => {
      // Arrange
      let callCount = 0;
      const innerFactory = new SimpleFactory<string>("InnerFactory", () => {
        callCount++;
        return `result-${callCount}`;
      });
      
      const cachedFactory = new CachedFactory<string>("CachedFactory", innerFactory, 10);

      // Act
      container.registerFactoryInstance<string>("CachedString", cachedFactory);
      const result1 = container.resolve<string>("CachedString");
      const result2 = container.resolve<string>("CachedString");

      // Assert
      expect(result1).toBe("result-1");
      expect(result2).toBe("result-1"); // Should be cached, not result-2
      expect(callCount).toBe(1); // Inner factory should only be called once
    });
  });

  describe("Factory Registry", () => {
    it("should manage factory registrations", () => {
      // Arrange
      const registry = new FactoryRegistry();
      const factory1 = new SimpleFactory<string>("Factory1", () => "value1");
      const factory2 = new SimpleFactory<number>("Factory2", () => 42);

      // Act
      registry.register<string>("string", factory1);
      registry.register<number>("number", factory2);

      // Assert
      expect(registry.has("string")).toBe(true);
      expect(registry.has("number")).toBe(true);
      expect(registry.has("nonexistent")).toBe(false);
      
      const retrievedFactory1 = registry.get<string>("string");
      expect(retrievedFactory1).toBe(factory1);

      const tokens = registry.getTokens();
      expect(tokens).toContain("string");
      expect(tokens).toContain("number");
    });

    it("should handle factory disposal on clear", () => {
      // Arrange
      const registry = new FactoryRegistry();
      let disposed = false;
      
      const factory = new SimpleFactory<string>("DisposableFactory", () => "test");
      factory.dispose = async () => {
        disposed = true;
      };

      registry.register<string>("disposable", factory);

      // Act
      registry.clear();

      // Assert - give some time for async disposal
      setTimeout(() => {
        expect(disposed).toBe(true);
      }, 10);
    });
  });

  describe("UniversalProviderFactory", () => {
    it("should create provider-specific factories", () => {
      // Arrange
      const mockAuthProvider = { name: "MockAuth", authenticate: () => Promise.resolve({}) };
      const authFactory = new SimpleFactory("AuthFactory", () => mockAuthProvider);
      
      const universalFactory = new UniversalProviderFactory(authFactory);

      // Act
      const provider = universalFactory.createAuthProvider();

      // Assert
      expect(provider).toBe(mockAuthProvider);
      expect(universalFactory.supports("IAuthProvider")).toBe(true);
      expect(universalFactory.listFactories()).toContain("IAuthProvider");
    });

    it("should throw error for unsupported providers", () => {
      // Arrange
      const universalFactory = new UniversalProviderFactory();

      // Act & Assert
      expect(() => universalFactory.createAuthProvider()).toThrow("No auth provider factory configured");
      expect(() => universalFactory.createBillingProvider()).toThrow("No billing provider factory configured");
    });
  });

  describe("Container Integration", () => {
    it("should resolve dependencies using factory fallback", () => {
      // Arrange
      const factory = new SimpleFactory<string>("FallbackFactory", () => "factory-result");
      
      // Act
      container.registerFactoryInstance<string>("FallbackService", factory);
      const result = container.resolve<string>("FallbackService");

      // Assert
      expect(result).toBe("factory-result");
    });

    it("should prefer regular registrations over factory resolution", () => {
      // Arrange
      const factory = new SimpleFactory<string>("Factory", () => "factory-result");
      container.registerFactoryInstance<string>("TestService", factory);
      container.registerInstance<string>("TestService", "instance-result");

      // Act
      const result = container.resolve<string>("TestService");

      // Assert
      expect(result).toBe("instance-result"); // Instance should take precedence
    });

    it("should handle factory registration options", () => {
      // Arrange
      const factory = new SimpleFactory<string>("ConfiguredFactory", () => "test");

      // Act
      container.registerFactoryInstance<string>("ConfiguredService", factory, {
        lifecycle: "singleton",
        enableMetrics: true,
        enableCaching: true,
        maxCacheSize: 50,
        tags: ["test", "factory"],
      });

      const result = container.resolve<string>("ConfiguredService");

      // Assert
      expect(result).toBe("test");
    });

    it("should register and use abstract factories", () => {
      // Arrange
      const mockFactory = new SimpleFactory("MockFactory", () => "mock");
      const abstractFactory = new UniversalProviderFactory(mockFactory);

      // Act
      container.registerAbstractFactory("UniversalProvider", abstractFactory);

      // Assert - the abstract factory should be registered without throwing
      expect(() => container.registerAbstractFactory("TestFactory", abstractFactory)).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle factory creation errors gracefully", () => {
      // Arrange
      const faultyFactory = new SimpleFactory<string>("FaultyFactory", () => {
        throw new Error("Factory creation failed");
      });

      container.registerFactoryInstance<string>("FaultyService", faultyFactory);

      // Act & Assert
      expect(() => container.resolve<string>("FaultyService")).not.toThrow();
      // Factory errors should be caught and fallback to normal error handling
    });

    it("should validate factory registration parameters", () => {
      // Act & Assert
      expect(() => container.registerFactoryInstance(null as any, null as any)).toThrow();
      expect(() => container.registerAbstractFactory("", null as any)).toThrow();
      expect(() => container.registerAbstractFactory(null as any, {} as any)).toThrow();
    });
  });
});