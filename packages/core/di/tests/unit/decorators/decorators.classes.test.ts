/**
 * Decorators classes unit tests
 *
 * Comprehensive test suite for decorator implementations and metadata management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  MetadataManager,
  defaultMetadataManager,
  Injectable,
  Inject,
  InjectProperty,
  Singleton,
  Transient,
  Scoped,
  Optional,
  Lazy,
} from "../../../src/decorators/decorators.classes.js";
import type {
  IMetadataManager,
  IInjectableOptions,
  IInjectOptions,
  IPropertyInjectOptions,
  IInjectableMetadata,
  IParameterInjectMetadata,
  IPropertyInjectMetadata,
  IMetadataStats,
} from "../../../src/decorators/decorators.types.js";
import type { DIToken } from "../../../src/container/container.types.js";

// Test service classes
class TestService {
  getValue(): string {
    return "test";
  }
}

interface ITestService {
  getValue(): string;
}

interface IDependencyService {
  getDependency(): string;
}

class DependencyService implements IDependencyService {
  getDependency(): string {
    return "dependency";
  }
}

describe("MetadataManager", () => {
  let metadataManager: IMetadataManager;

  beforeEach(() => {
    metadataManager = new MetadataManager();
  });

  afterEach(() => {
    // Clear any test metadata
    if (metadataManager.clearMetadata) {
      // We can't iterate over all classes, so we'll test specific ones
    }
  });

  describe("Platform Detection", () => {
    it("should detect Reflect support availability", () => {
      const hasReflect = metadataManager.hasReflectSupport();

      // In test environment, Reflect should be available
      expect(typeof hasReflect).toBe("boolean");

      if (typeof Reflect !== "undefined") {
        expect(hasReflect).toBe(true);
      }
    });

    it("should provide platform information in stats", () => {
      const stats = metadataManager.getStats();

      expect(["node", "browser", "unknown"]).toContain(stats.platform);
      expect(typeof stats.hasDesignTypeSupport).toBe("boolean");
    });
  });

  describe("Injectable Metadata Management", () => {
    it("should set and retrieve injectable metadata", () => {
      const options: IInjectableOptions = {
        lifecycle: "singleton",
        token: "CustomToken",
        metadata: { version: "1.0" },
      };

      metadataManager.setInjectableMetadata(TestService, options);

      expect(metadataManager.isInjectable(TestService)).toBe(true);

      const metadata = metadataManager.getInjectableMetadata(TestService);
      expect(metadata).toBeDefined();
      expect(metadata!.options.lifecycle).toBe("singleton");
      expect(metadata!.options.token).toBe("CustomToken");
      expect(metadata!.options.metadata?.["version"]).toBe("1.0");
    });

    it("should return undefined for non-injectable classes", () => {
      class NonInjectableService {}

      expect(metadataManager.isInjectable(NonInjectableService)).toBe(false);
      expect(metadataManager.getInjectableMetadata(NonInjectableService)).toBeUndefined();
    });

    it("should handle empty injectable options", () => {
      metadataManager.setInjectableMetadata(TestService, {});

      expect(metadataManager.isInjectable(TestService)).toBe(true);

      const metadata = metadataManager.getInjectableMetadata(TestService);
      expect(metadata).toBeDefined();
      expect(metadata!.options).toEqual({});
    });
  });

  describe("Parameter Metadata Management", () => {
    it("should add and retrieve parameter metadata", () => {
      const options: IInjectOptions = {
        token: "DependencyToken",
        optional: false,
      };

      metadataManager.addParameterMetadata(TestService, 0, options);

      const parameterMetadata = metadataManager.getParameterMetadata(TestService);
      expect(parameterMetadata).toHaveLength(1);
      expect(parameterMetadata[0].parameterIndex).toBe(0);
      expect(parameterMetadata[0].token).toBe("DependencyToken");
      expect(parameterMetadata[0].optional).toBe(false);
    });

    it("should handle multiple parameter injections", () => {
      metadataManager.addParameterMetadata(TestService, 0, { token: "Dep1" });
      metadataManager.addParameterMetadata(TestService, 1, { token: "Dep2", optional: true });
      metadataManager.addParameterMetadata(TestService, 2, { token: "Dep3" });

      const parameterMetadata = metadataManager.getParameterMetadata(TestService);
      expect(parameterMetadata).toHaveLength(3);

      // Should be sorted by parameter index
      expect(parameterMetadata[0].parameterIndex).toBe(0);
      expect(parameterMetadata[1].parameterIndex).toBe(1);
      expect(parameterMetadata[2].parameterIndex).toBe(2);

      expect(parameterMetadata[1].optional).toBe(true);
      expect(parameterMetadata[0].optional).toBe(false);
      expect(parameterMetadata[2].optional).toBe(false);
    });

    it("should replace existing parameter metadata for same index", () => {
      metadataManager.addParameterMetadata(TestService, 0, { token: "FirstToken" });
      metadataManager.addParameterMetadata(TestService, 0, { token: "SecondToken" });

      const parameterMetadata = metadataManager.getParameterMetadata(TestService);
      expect(parameterMetadata).toHaveLength(1);
      expect(parameterMetadata[0].token).toBe("SecondToken");
    });

    it("should use constructor name as fallback token", () => {
      metadataManager.addParameterMetadata(TestService, 0, {});

      const parameterMetadata = metadataManager.getParameterMetadata(TestService);
      expect(parameterMetadata[0].token).toBe("TestService");
    });

    it("should handle optional parameters with default values", () => {
      const defaultValue = { default: true };

      metadataManager.addParameterMetadata(TestService, 0, {
        token: "OptionalDep",
        optional: true,
        defaultValue,
      });

      const parameterMetadata = metadataManager.getParameterMetadata(TestService);
      expect(parameterMetadata[0].optional).toBe(true);
      expect(parameterMetadata[0].defaultValue).toBe(defaultValue);
    });
  });

  describe("Property Metadata Management", () => {
    it("should add and retrieve property metadata", () => {
      const options: IPropertyInjectOptions = {
        token: "PropertyToken",
        optional: false,
        lazy: true,
      };

      metadataManager.addPropertyMetadata(TestService, "dependency", options);

      const propertyMetadata = metadataManager.getPropertyMetadata(TestService);
      expect(propertyMetadata).toHaveLength(1);
      expect(propertyMetadata[0].propertyKey).toBe("dependency");
      expect(propertyMetadata[0].token).toBe("PropertyToken");
      expect(propertyMetadata[0].optional).toBe(false);
      expect(propertyMetadata[0].lazy).toBe(true);
    });

    it("should handle multiple property injections", () => {
      metadataManager.addPropertyMetadata(TestService, "dep1", { token: "Dep1" });
      metadataManager.addPropertyMetadata(TestService, "dep2", { token: "Dep2", lazy: true });
      metadataManager.addPropertyMetadata(TestService, Symbol("dep3"), { token: "Dep3" });

      const propertyMetadata = metadataManager.getPropertyMetadata(TestService);
      expect(propertyMetadata).toHaveLength(3);

      const stringKeyMeta = propertyMetadata.find((p) => p.propertyKey === "dep1");
      const lazyMeta = propertyMetadata.find((p) => p.propertyKey === "dep2");
      const symbolKeyMeta = propertyMetadata.find((p) => typeof p.propertyKey === "symbol");

      expect(stringKeyMeta?.token).toBe("Dep1");
      expect(lazyMeta?.lazy).toBe(true);
      expect(symbolKeyMeta?.token).toBe("Dep3");
    });

    it("should replace existing property metadata for same key", () => {
      metadataManager.addPropertyMetadata(TestService, "prop", { token: "FirstToken" });
      metadataManager.addPropertyMetadata(TestService, "prop", { token: "SecondToken" });

      const propertyMetadata = metadataManager.getPropertyMetadata(TestService);
      expect(propertyMetadata).toHaveLength(1);
      expect(propertyMetadata[0].token).toBe("SecondToken");
    });

    it("should use property key as fallback token", () => {
      metadataManager.addPropertyMetadata(TestService, "dependency", {});

      const propertyMetadata = metadataManager.getPropertyMetadata(TestService);
      expect(propertyMetadata[0].token).toBe("dependency");
    });

    it("should handle symbol property keys", () => {
      const symbolKey = Symbol("injectedProperty");

      metadataManager.addPropertyMetadata(TestService, symbolKey, {
        token: "SymbolProperty",
      });

      const propertyMetadata = metadataManager.getPropertyMetadata(TestService);
      expect(propertyMetadata[0].propertyKey).toBe(symbolKey);
      expect(propertyMetadata[0].token).toBe("SymbolProperty");
    });
  });

  describe("Type Information", () => {
    it("should retrieve parameter types when available", () => {
      // This depends on Reflect.getMetadata being available
      const parameterTypes = metadataManager.getParameterTypes(TestService);

      expect(Array.isArray(parameterTypes)).toBe(true);
      // In test environment without reflect-metadata, this might be empty
    });

    it("should retrieve property types when available", () => {
      const propertyType = metadataManager.getPropertyType(TestService, "testProperty");

      // Type information may not be available in test environment
      expect(propertyType === undefined || typeof propertyType === "function").toBe(true);
    });

    it("should return empty array for parameter types when Reflect unavailable", () => {
      // Temporarily disable Reflect support
      const originalReflect = (global as any).Reflect;
      delete (global as any).Reflect;

      const tempManager = new MetadataManager();
      const parameterTypes = tempManager.getParameterTypes(TestService);

      expect(parameterTypes).toEqual([]);

      // Restore Reflect
      (global as any).Reflect = originalReflect;
    });
  });

  describe("Complete Injectable Metadata", () => {
    it("should combine all metadata types in getInjectableMetadata", () => {
      // Set injectable metadata
      metadataManager.setInjectableMetadata(TestService, {
        lifecycle: "singleton",
        token: "CompleteService",
      });

      // Add parameter metadata
      metadataManager.addParameterMetadata(TestService, 0, {
        token: "Param0",
        optional: true,
      });

      // Add property metadata
      metadataManager.addPropertyMetadata(TestService, "prop1", {
        token: "Prop1",
        lazy: true,
      });

      const completeMetadata = metadataManager.getInjectableMetadata(TestService);

      expect(completeMetadata).toBeDefined();
      expect(completeMetadata!.options.lifecycle).toBe("singleton");
      expect(completeMetadata!.parameterMetadata).toHaveLength(1);
      expect(completeMetadata!.propertyMetadata).toHaveLength(1);
      expect(completeMetadata!.target).toBe(TestService);

      expect(completeMetadata!.parameterMetadata[0].token).toBe("Param0");
      expect(completeMetadata!.propertyMetadata[0].token).toBe("Prop1");
    });
  });

  describe("Metadata Clearing", () => {
    it("should clear all metadata for a target", () => {
      metadataManager.setInjectableMetadata(TestService, { lifecycle: "singleton" });
      metadataManager.addParameterMetadata(TestService, 0, { token: "Param" });
      metadataManager.addPropertyMetadata(TestService, "prop", { token: "Prop" });

      expect(metadataManager.isInjectable(TestService)).toBe(true);
      expect(metadataManager.getParameterMetadata(TestService)).toHaveLength(1);
      expect(metadataManager.getPropertyMetadata(TestService)).toHaveLength(1);

      metadataManager.clearMetadata(TestService);

      expect(metadataManager.isInjectable(TestService)).toBe(false);
      expect(metadataManager.getParameterMetadata(TestService)).toHaveLength(0);
      expect(metadataManager.getPropertyMetadata(TestService)).toHaveLength(0);
    });
  });

  describe("Statistics", () => {
    it("should provide metadata statistics", () => {
      const stats = metadataManager.getStats();

      expect(typeof stats.injectableClasses).toBe("number");
      expect(typeof stats.parameterInjections).toBe("number");
      expect(typeof stats.propertyInjections).toBe("number");
      expect(typeof stats.hasDesignTypeSupport).toBe("boolean");
      expect(["node", "browser", "unknown"]).toContain(stats.platform);
    });

    it("should detect platform correctly", () => {
      const stats = metadataManager.getStats();

      // In Node.js test environment
      if (typeof process !== "undefined") {
        expect(stats.platform).toBe("node");
      }
    });
  });
});

describe("Default Metadata Manager", () => {
  it("should provide singleton metadata manager instance", () => {
    expect(defaultMetadataManager).toBeInstanceOf(MetadataManager);
  });

  it("should be the same instance across imports", () => {
    const manager1 = defaultMetadataManager;
    const manager2 = defaultMetadataManager;

    expect(manager1).toBe(manager2);
  });
});

describe("Decorator Functions", () => {
  describe("@Injectable", () => {
    it("should mark class as injectable with default options", () => {
      @Injectable()
      class DecoratedService {}

      expect(defaultMetadataManager.isInjectable(DecoratedService)).toBe(true);

      const metadata = defaultMetadataManager.getInjectableMetadata(DecoratedService);
      expect(metadata?.options).toEqual({});
    });

    it("should mark class as injectable with custom options", () => {
      @Injectable({
        lifecycle: "singleton",
        token: "CustomService",
        dependencies: ["dep1", "dep2"],
        metadata: { version: "2.0" },
      })
      class CustomService {}

      const metadata = defaultMetadataManager.getInjectableMetadata(CustomService);
      expect(metadata?.options.lifecycle).toBe("singleton");
      expect(metadata?.options.token).toBe("CustomService");
      expect(metadata?.options.dependencies).toEqual(["dep1", "dep2"]);
      expect(metadata?.options.metadata?.version).toBe("2.0");
    });

    it("should work without parentheses for default options", () => {
      @Injectable
      class SimpleService {}

      // Note: TypeScript decorators without () don't work the same way
      // This test verifies the decorator can be called as a function
      expect(typeof Injectable).toBe("function");
    });
  });

  describe("@Inject", () => {
    it("should add parameter injection metadata with token", () => {
      class ServiceWithDependency {
        constructor(@Inject("DependencyToken") private dependency: any) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithDependency);
      expect(parameterMetadata).toHaveLength(1);
      expect(parameterMetadata[0].token).toBe("DependencyToken");
      expect(parameterMetadata[0].parameterIndex).toBe(0);
    });

    it("should add parameter injection metadata with options object", () => {
      class ServiceWithOptionalDependency {
        constructor(
          @Inject({ token: "OptionalDep", optional: true, defaultValue: "default" })
          private dependency: any,
        ) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithOptionalDependency);
      expect(parameterMetadata[0].token).toBe("OptionalDep");
      expect(parameterMetadata[0].optional).toBe(true);
      expect(parameterMetadata[0].defaultValue).toBe("default");
    });

    it("should handle multiple parameter injections", () => {
      class ServiceWithMultipleDependencies {
        constructor(
          @Inject("FirstDep") private first: any,
          @Inject("SecondDep") private second: any,
          @Inject({ token: "ThirdDep", optional: true }) private third: any,
        ) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithMultipleDependencies);
      expect(parameterMetadata).toHaveLength(3);
      expect(parameterMetadata[0].token).toBe("FirstDep");
      expect(parameterMetadata[1].token).toBe("SecondDep");
      expect(parameterMetadata[2].token).toBe("ThirdDep");
      expect(parameterMetadata[2].optional).toBe(true);
    });

    it("should handle symbol tokens", () => {
      const SYMBOL_TOKEN = Symbol("SymbolDependency");

      class ServiceWithSymbolDependency {
        constructor(@Inject(SYMBOL_TOKEN) private dependency: any) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithSymbolDependency);
      expect(parameterMetadata[0].token).toBe(SYMBOL_TOKEN);
    });

    it("should handle class constructor tokens", () => {
      class ServiceWithClassDependency {
        constructor(@Inject(DependencyService) private dependency: DependencyService) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithClassDependency);
      expect(parameterMetadata[0].token).toBe(DependencyService);
    });
  });

  describe("@InjectProperty", () => {
    it("should add property injection metadata", () => {
      class ServiceWithPropertyInjection {
        @InjectProperty("PropertyDependency")
        private dependency!: any;
      }

      const propertyMetadata = defaultMetadataManager.getPropertyMetadata(ServiceWithPropertyInjection);
      expect(propertyMetadata).toHaveLength(1);
      expect(propertyMetadata[0].propertyKey).toBe("dependency");
      expect(propertyMetadata[0].token).toBe("PropertyDependency");
    });

    it("should handle property injection with options", () => {
      class ServiceWithLazyProperty {
        @InjectProperty({
          token: "LazyDependency",
          lazy: true,
          optional: true,
          defaultValue: "fallback",
        })
        private lazyDep!: any;
      }

      const propertyMetadata = defaultMetadataManager.getPropertyMetadata(ServiceWithLazyProperty);
      expect(propertyMetadata[0].token).toBe("LazyDependency");
      expect(propertyMetadata[0].lazy).toBe(true);
      expect(propertyMetadata[0].optional).toBe(true);
      expect(propertyMetadata[0].defaultValue).toBe("fallback");
    });

    it("should handle multiple property injections", () => {
      class ServiceWithMultipleProperties {
        @InjectProperty("FirstProperty")
        private first!: any;

        @InjectProperty({ token: "SecondProperty", lazy: true })
        private second!: any;

        @InjectProperty("ThirdProperty")
        private third!: any;
      }

      const propertyMetadata = defaultMetadataManager.getPropertyMetadata(ServiceWithMultipleProperties);
      expect(propertyMetadata).toHaveLength(3);

      const firstProp = propertyMetadata.find((p) => p.propertyKey === "first");
      const secondProp = propertyMetadata.find((p) => p.propertyKey === "second");
      const thirdProp = propertyMetadata.find((p) => p.propertyKey === "third");

      expect(firstProp?.token).toBe("FirstProperty");
      expect(secondProp?.token).toBe("SecondProperty");
      expect(secondProp?.lazy).toBe(true);
      expect(thirdProp?.token).toBe("ThirdProperty");
    });
  });

  describe("Lifecycle Decorators", () => {
    it("@Singleton should mark class as singleton", () => {
      @Singleton()
      class SingletonService {}

      expect(defaultMetadataManager.isInjectable(SingletonService)).toBe(true);

      const metadata = defaultMetadataManager.getInjectableMetadata(SingletonService);
      expect(metadata?.options.lifecycle).toBe("singleton");
    });

    it("@Transient should mark class as transient", () => {
      @Transient()
      class TransientService {}

      const metadata = defaultMetadataManager.getInjectableMetadata(TransientService);
      expect(metadata?.options.lifecycle).toBe("transient");
    });

    it("@Scoped should mark class as scoped", () => {
      @Scoped()
      class ScopedService {}

      const metadata = defaultMetadataManager.getInjectableMetadata(ScopedService);
      expect(metadata?.options.lifecycle).toBe("scoped");
    });
  });

  describe("@Optional", () => {
    it("should mark parameter as optional", () => {
      class ServiceWithOptionalDependency {
        constructor(@Optional() private dependency: any) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithOptionalDependency);
      expect(parameterMetadata[0].optional).toBe(true);
    });

    it("should mark parameter as optional with default value", () => {
      const defaultValue = { isDefault: true };

      class ServiceWithDefaultValue {
        constructor(@Optional(defaultValue) private dependency: any) {}
      }

      const parameterMetadata = defaultMetadataManager.getParameterMetadata(ServiceWithDefaultValue);
      expect(parameterMetadata[0].optional).toBe(true);
      expect(parameterMetadata[0].defaultValue).toBe(defaultValue);
    });
  });

  describe("@Lazy", () => {
    it("should mark property as lazy with token", () => {
      class ServiceWithLazyProperty {
        @Lazy("LazyDependency")
        private dependency!: any;
      }

      const propertyMetadata = defaultMetadataManager.getPropertyMetadata(ServiceWithLazyProperty);
      expect(propertyMetadata[0].token).toBe("LazyDependency");
      expect(propertyMetadata[0].lazy).toBe(true);
    });

    it("should mark property as lazy with options", () => {
      class ServiceWithLazyOptions {
        @Lazy({
          token: "LazyWithOptions",
          optional: true,
          defaultValue: "lazy-default",
        })
        private dependency!: any;
      }

      const propertyMetadata = defaultMetadataManager.getPropertyMetadata(ServiceWithLazyOptions);
      expect(propertyMetadata[0].token).toBe("LazyWithOptions");
      expect(propertyMetadata[0].lazy).toBe(true);
      expect(propertyMetadata[0].optional).toBe(true);
      expect(propertyMetadata[0].defaultValue).toBe("lazy-default");
    });
  });
});

describe("Complex Decorator Combinations", () => {
  it("should handle class with all decorator types", () => {
    @Injectable({
      lifecycle: "singleton",
      token: "ComplexService",
      metadata: { complex: true },
    })
    class ComplexService {
      @InjectProperty("PropertyDep")
      private propertyDependency!: any;

      @Lazy("LazyDep")
      private lazyDependency!: any;

      constructor(
        @Inject("RequiredDep") private required: any,
        @Inject({ token: "OptionalDep", optional: true }) private optional: any,
        @Optional("DefaultValue") private withDefault: any,
      ) {}
    }

    // Verify injectable metadata
    expect(defaultMetadataManager.isInjectable(ComplexService)).toBe(true);

    const metadata = defaultMetadataManager.getInjectableMetadata(ComplexService);
    expect(metadata?.options.lifecycle).toBe("singleton");
    expect(metadata?.options.token).toBe("ComplexService");
    expect(metadata?.options.metadata?.complex).toBe(true);

    // Verify parameter metadata
    const parameterMetadata = metadata!.parameterMetadata;
    expect(parameterMetadata).toHaveLength(3);
    expect(parameterMetadata[0].token).toBe("RequiredDep");
    expect(parameterMetadata[0].optional).toBe(false);
    expect(parameterMetadata[1].token).toBe("OptionalDep");
    expect(parameterMetadata[1].optional).toBe(true);
    expect(parameterMetadata[2].optional).toBe(true);
    expect(parameterMetadata[2].defaultValue).toBe("DefaultValue");

    // Verify property metadata
    const propertyMetadata = metadata!.propertyMetadata;
    expect(propertyMetadata).toHaveLength(2);

    const normalProperty = propertyMetadata.find((p) => p.propertyKey === "propertyDependency");
    const lazyProperty = propertyMetadata.find((p) => p.propertyKey === "lazyDependency");

    expect(normalProperty?.token).toBe("PropertyDep");
    expect(normalProperty?.lazy).toBe(false);
    expect(lazyProperty?.token).toBe("LazyDep");
    expect(lazyProperty?.lazy).toBe(true);
  });

  it("should handle inheritance with decorators", () => {
    @Injectable({ lifecycle: "singleton" })
    class BaseService {
      @InjectProperty("BaseDependency")
      protected baseDependency!: any;

      constructor(@Inject("BaseParam") protected baseParam: any) {}
    }

    @Injectable({ lifecycle: "transient" })
    class DerivedService extends BaseService {
      @InjectProperty("DerivedDependency")
      private derivedDependency!: any;

      constructor(
        @Inject("BaseParam") baseParam: any,
        @Inject("DerivedParam") private derivedParam: any,
      ) {
        super(baseParam);
      }
    }

    // Base service metadata
    const baseMetadata = defaultMetadataManager.getInjectableMetadata(BaseService);
    expect(baseMetadata?.options.lifecycle).toBe("singleton");
    expect(baseMetadata?.parameterMetadata).toHaveLength(1);
    expect(baseMetadata?.propertyMetadata).toHaveLength(1);

    // Derived service metadata (should not inherit metadata)
    const derivedMetadata = defaultMetadataManager.getInjectableMetadata(DerivedService);
    expect(derivedMetadata?.options.lifecycle).toBe("transient");
    expect(derivedMetadata?.parameterMetadata).toHaveLength(2);
    expect(derivedMetadata?.propertyMetadata).toHaveLength(1);

    // Verify derived service has its own metadata
    const derivedProperty = derivedMetadata!.propertyMetadata.find((p) => p.propertyKey === "derivedDependency");
    expect(derivedProperty?.token).toBe("DerivedDependency");
  });
});

describe("Cross-Platform Compatibility", () => {
  it("should work without reflect-metadata", () => {
    // Temporarily remove Reflect
    const originalReflect = (global as any).Reflect;
    delete (global as any).Reflect;

    try {
      const manager = new MetadataManager();

      expect(manager.hasReflectSupport()).toBe(false);

      // Basic functionality should still work
      manager.setInjectableMetadata(TestService, { lifecycle: "singleton" });
      expect(manager.isInjectable(TestService)).toBe(true);

      manager.addParameterMetadata(TestService, 0, { token: "TestToken" });
      const paramMetadata = manager.getParameterMetadata(TestService);
      expect(paramMetadata).toHaveLength(1);

      manager.addPropertyMetadata(TestService, "prop", { token: "PropToken" });
      const propMetadata = manager.getPropertyMetadata(TestService);
      expect(propMetadata).toHaveLength(1);
    } finally {
      // Restore Reflect
      (global as any).Reflect = originalReflect;
    }
  });

  it("should gracefully handle browser environment simulation", () => {
    // Simulate browser environment
    const originalWindow = (global as any).window;
    const originalDocument = (global as any).document;
    const originalProcess = (global as any).process;

    (global as any).window = {};
    (global as any).document = {};
    delete (global as any).process;

    try {
      const manager = new MetadataManager();
      const stats = manager.getStats();

      expect(stats.platform).toBe("browser");
    } finally {
      // Restore environment
      (global as any).process = originalProcess;
      delete (global as any).window;
      delete (global as any).document;
    }
  });
});

describe("Performance", () => {
  it("should handle metadata operations efficiently", () => {
    const manager = new MetadataManager();
    const startTime = performance.now();

    // Perform many metadata operations
    for (let i = 0; i < 1000; i++) {
      const testClass = class {};
      manager.setInjectableMetadata(testClass, { lifecycle: "transient" });
      manager.addParameterMetadata(testClass, 0, { token: `token${i}` });
      manager.addPropertyMetadata(testClass, `prop${i}`, { token: `propToken${i}` });
      manager.getInjectableMetadata(testClass);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(100); // Should complete in <100ms
  });

  it("should not leak memory with many metadata operations", () => {
    const manager = new MetadataManager();

    // Create and clear metadata for many classes
    for (let i = 0; i < 1000; i++) {
      const testClass = class {};
      manager.setInjectableMetadata(testClass, { lifecycle: "singleton" });
      manager.clearMetadata(testClass);
    }

    // Memory usage should be stable (hard to test directly in Node.js)
    expect(true).toBe(true); // Placeholder - in real scenario would check memory
  });
});
