/**
 * Decorators types unit tests
 *
 * Tests for TypeScript type definitions and interfaces in decorator system
 */

import { describe, it, expect } from "vitest";
import type {
  DECORATOR_METADATA_KEYS,
  IInjectableOptions,
  IInjectOptions,
  IPropertyInjectOptions,
  IParameterInjectMetadata,
  IPropertyInjectMetadata,
  IInjectableMetadata,
  IFactoryOptions,
  IScopeOptions,
  IMetadataReader,
  IMetadataWriter,
  IMetadataManager,
  IMetadataStats,
  IDecoratorResolutionContext,
  IDecoratorConfig,
} from "../../../src/decorators/decorators.types.js";
import type { DIToken, ContainerLifecycle } from "../../../src/container/container.types.js";

// Type assertion helper
function assertType<T>(value: T): T {
  return value;
}

describe("Decorator Types", () => {
  describe("DECORATOR_METADATA_KEYS", () => {
    it("should define all required metadata keys as symbols", () => {
      const keys = DECORATOR_METADATA_KEYS;

      expect(typeof keys.INJECTABLE).toBe("symbol");
      expect(typeof keys.INJECT_PARAMS).toBe("symbol");
      expect(typeof keys.INJECT_PROPERTIES).toBe("symbol");
      expect(typeof keys.LIFECYCLE).toBe("symbol");
      expect(typeof keys.FACTORY).toBe("symbol");
      expect(typeof keys.SCOPE).toBe("symbol");
    });

    it("should have unique symbol values", () => {
      const keys = DECORATOR_METADATA_KEYS;
      const symbolValues = Object.values(keys);
      const uniqueValues = new Set(symbolValues);

      expect(uniqueValues.size).toBe(symbolValues.length);
    });

    it("should be readonly constant", () => {
      // Type-only test to verify const assertion
      type MetadataKeys = typeof DECORATOR_METADATA_KEYS;

      // Keys should be readonly
      const injectable: MetadataKeys["INJECTABLE"] = DECORATOR_METADATA_KEYS.INJECTABLE;
      const params: MetadataKeys["INJECT_PARAMS"] = DECORATOR_METADATA_KEYS.INJECT_PARAMS;

      expect(typeof injectable).toBe("symbol");
      expect(typeof params).toBe("symbol");
    });
  });

  describe("Injectable Options", () => {
    describe("IInjectableOptions", () => {
      it("should define optional configuration properties", () => {
        // All properties should be optional
        const emptyOptions: IInjectableOptions = {};

        const fullOptions: IInjectableOptions = {
          lifecycle: "singleton",
          token: "CustomToken",
          factory: () => ({ created: true }),
          dependencies: ["dep1", "dep2"],
          metadata: { version: "1.0", author: "test" },
        };

        expect(emptyOptions).toBeDefined();
        expect(fullOptions.lifecycle).toBe("singleton");
        expect(fullOptions.token).toBe("CustomToken");
        expect(typeof fullOptions.factory).toBe("function");
        expect(fullOptions.dependencies).toEqual(["dep1", "dep2"]);
        expect(fullOptions.metadata?.version).toBe("1.0");
      });

      it("should accept all valid lifecycle values", () => {
        const singletonOptions: IInjectableOptions = { lifecycle: "singleton" };
        const transientOptions: IInjectableOptions = { lifecycle: "transient" };
        const scopedOptions: IInjectableOptions = { lifecycle: "scoped" };

        expect(singletonOptions.lifecycle).toBe("singleton");
        expect(transientOptions.lifecycle).toBe("transient");
        expect(scopedOptions.lifecycle).toBe("scoped");
      });

      it("should accept different token types", () => {
        const stringToken: IInjectableOptions = { token: "StringToken" };
        const symbolToken: IInjectableOptions = { token: Symbol("SymbolToken") };
        const functionToken: IInjectableOptions = { token: class TokenClass {} };

        expect(typeof stringToken.token).toBe("string");
        expect(typeof symbolToken.token).toBe("symbol");
        expect(typeof functionToken.token).toBe("function");
      });

      it("should accept factory functions with various signatures", () => {
        const simpleFactory: IInjectableOptions = {
          factory: () => "simple",
        };

        const parameterizedFactory: IInjectableOptions = {
          factory: (arg1: string, arg2: number) => ({ arg1, arg2 }),
        };

        const asyncFactory: IInjectableOptions = {
          factory: async () => Promise.resolve("async"),
        };

        expect(typeof simpleFactory.factory).toBe("function");
        expect(typeof parameterizedFactory.factory).toBe("function");
        expect(typeof asyncFactory.factory).toBe("function");
      });

      it("should accept arbitrary metadata objects", () => {
        const options: IInjectableOptions = {
          metadata: {
            version: "2.0",
            tags: ["service", "core"],
            config: { timeout: 5000 },
            nested: { deep: { value: true } },
          },
        };

        expect(options.metadata?.version).toBe("2.0");
        expect(Array.isArray(options.metadata?.tags)).toBe(true);
        expect(options.metadata?.config?.timeout).toBe(5000);
        expect(options.metadata?.nested?.deep?.value).toBe(true);
      });
    });

    describe("IInjectOptions", () => {
      it("should define parameter injection options", () => {
        const emptyOptions: IInjectOptions = {};

        const fullOptions: IInjectOptions = {
          token: "ParameterToken",
          optional: true,
          defaultValue: { isDefault: true },
        };

        expect(emptyOptions).toBeDefined();
        expect(fullOptions.token).toBe("ParameterToken");
        expect(fullOptions.optional).toBe(true);
        expect(fullOptions.defaultValue).toEqual({ isDefault: true });
      });

      it("should accept various token types", () => {
        const stringOption: IInjectOptions = { token: "StringParam" };
        const symbolOption: IInjectOptions = { token: Symbol("SymbolParam") };
        const classOption: IInjectOptions = { token: class ParamClass {} };

        expect(typeof stringOption.token).toBe("string");
        expect(typeof symbolOption.token).toBe("symbol");
        expect(typeof classOption.token).toBe("function");
      });

      it("should handle different default value types", () => {
        const primitiveDefault: IInjectOptions = { defaultValue: "default" };
        const objectDefault: IInjectOptions = { defaultValue: { key: "value" } };
        const arrayDefault: IInjectOptions = { defaultValue: [1, 2, 3] };
        const functionDefault: IInjectOptions = { defaultValue: () => "computed" };

        expect(primitiveDefault.defaultValue).toBe("default");
        expect(objectDefault.defaultValue).toEqual({ key: "value" });
        expect(Array.isArray(arrayDefault.defaultValue)).toBe(true);
        expect(typeof functionDefault.defaultValue).toBe("function");
      });
    });

    describe("IPropertyInjectOptions", () => {
      it("should extend IInjectOptions with lazy property", () => {
        const options: IPropertyInjectOptions = {
          token: "PropertyToken",
          optional: false,
          defaultValue: "default",
          lazy: true,
        };

        expect(options.token).toBe("PropertyToken");
        expect(options.optional).toBe(false);
        expect(options.defaultValue).toBe("default");
        expect(options.lazy).toBe(true);
      });

      it("should allow lazy property without other options", () => {
        const lazyOnly: IPropertyInjectOptions = { lazy: true };
        const notLazy: IPropertyInjectOptions = { lazy: false };
        const defaultLazy: IPropertyInjectOptions = {}; // lazy should be optional

        expect(lazyOnly.lazy).toBe(true);
        expect(notLazy.lazy).toBe(false);
        expect(defaultLazy.lazy).toBeUndefined();
      });
    });
  });

  describe("Metadata Interfaces", () => {
    describe("IParameterInjectMetadata", () => {
      it("should define complete parameter metadata structure", () => {
        const metadata: IParameterInjectMetadata = {
          parameterIndex: 2,
          token: "ParamToken",
          parameterType: String,
          optional: true,
          defaultValue: "fallback",
        };

        expect(metadata.parameterIndex).toBe(2);
        expect(metadata.token).toBe("ParamToken");
        expect(metadata.parameterType).toBe(String);
        expect(metadata.optional).toBe(true);
        expect(metadata.defaultValue).toBe("fallback");
      });

      it("should handle different parameter types", () => {
        const stringParam: IParameterInjectMetadata = {
          parameterIndex: 0,
          parameterType: String,
          optional: false,
        };

        const numberParam: IParameterInjectMetadata = {
          parameterIndex: 1,
          parameterType: Number,
          optional: false,
        };

        const customParam: IParameterInjectMetadata = {
          parameterIndex: 2,
          parameterType: class CustomType {},
          optional: false,
        };

        expect(stringParam.parameterType).toBe(String);
        expect(numberParam.parameterType).toBe(Number);
        expect(typeof customParam.parameterType).toBe("function");
      });

      it("should require parameterIndex and optional fields", () => {
        // Minimal required fields
        const minimal: IParameterInjectMetadata = {
          parameterIndex: 0,
          optional: false,
        };

        expect(minimal.parameterIndex).toBe(0);
        expect(minimal.optional).toBe(false);
        expect(minimal.token).toBeUndefined();
        expect(minimal.parameterType).toBeUndefined();
      });
    });

    describe("IPropertyInjectMetadata", () => {
      it("should define complete property metadata structure", () => {
        const stringKeyMetadata: IPropertyInjectMetadata = {
          propertyKey: "dependency",
          token: "PropertyToken",
          propertyType: Object,
          optional: false,
          defaultValue: null,
          lazy: true,
        };

        const symbolKeyMetadata: IPropertyInjectMetadata = {
          propertyKey: Symbol("injectedProperty"),
          token: "SymbolPropertyToken",
          propertyType: Array,
          optional: true,
          defaultValue: [],
          lazy: false,
        };

        expect(stringKeyMetadata.propertyKey).toBe("dependency");
        expect(typeof symbolKeyMetadata.propertyKey).toBe("symbol");
        expect(stringKeyMetadata.propertyType).toBe(Object);
        expect(symbolKeyMetadata.propertyType).toBe(Array);
      });

      it("should support both string and symbol property keys", () => {
        const stringKey: IPropertyInjectMetadata["propertyKey"] = "stringProperty";
        const symbolKey: IPropertyInjectMetadata["propertyKey"] = Symbol("symbolProperty");

        expect(typeof stringKey).toBe("string");
        expect(typeof symbolKey).toBe("symbol");
      });

      it("should require propertyKey, optional, and lazy fields", () => {
        const minimal: IPropertyInjectMetadata = {
          propertyKey: "required",
          optional: false,
          lazy: false,
        };

        expect(minimal.propertyKey).toBe("required");
        expect(minimal.optional).toBe(false);
        expect(minimal.lazy).toBe(false);
      });
    });

    describe("IInjectableMetadata", () => {
      it("should combine all metadata types", () => {
        const completeMetadata: IInjectableMetadata = {
          options: {
            lifecycle: "singleton",
            token: "CompleteService",
          },
          parameterMetadata: [
            {
              parameterIndex: 0,
              token: "Param0",
              optional: false,
            },
          ],
          propertyMetadata: [
            {
              propertyKey: "prop1",
              token: "Prop1",
              optional: false,
              lazy: true,
            },
          ],
          parameterTypes: [String, Number],
          target: class CompleteService {},
        };

        expect(completeMetadata.options.lifecycle).toBe("singleton");
        expect(completeMetadata.parameterMetadata).toHaveLength(1);
        expect(completeMetadata.propertyMetadata).toHaveLength(1);
        expect(completeMetadata.parameterTypes).toEqual([String, Number]);
        expect(typeof completeMetadata.target).toBe("function");
      });

      it("should require target and options while allowing empty arrays", () => {
        const minimal: IInjectableMetadata = {
          options: {},
          parameterMetadata: [],
          propertyMetadata: [],
          target: class MinimalService {},
        };

        expect(minimal.options).toEqual({});
        expect(minimal.parameterMetadata).toEqual([]);
        expect(minimal.propertyMetadata).toEqual([]);
        expect(typeof minimal.target).toBe("function");
      });
    });
  });

  describe("Additional Option Interfaces", () => {
    describe("IFactoryOptions", () => {
      it("should define factory decorator options", () => {
        const options: IFactoryOptions = {
          factory: (dep1: string, dep2: number) => ({ dep1, dep2 }),
          dependencies: ["StringDep", "NumberDep"],
          lifecycle: "transient",
        };

        expect(typeof options.factory).toBe("function");
        expect(options.dependencies).toEqual(["StringDep", "NumberDep"]);
        expect(options.lifecycle).toBe("transient");
      });

      it("should require factory function", () => {
        const minimalOptions: IFactoryOptions = {
          factory: () => ({}),
        };

        expect(typeof minimalOptions.factory).toBe("function");
        expect(minimalOptions.dependencies).toBeUndefined();
        expect(minimalOptions.lifecycle).toBeUndefined();
      });

      it("should accept different factory function signatures", () => {
        const noArgsFactory: IFactoryOptions = {
          factory: () => "no-args",
        };

        const withArgsFactory: IFactoryOptions = {
          factory: (a: string, b: number) => `${a}-${b}`,
        };

        const asyncFactory: IFactoryOptions = {
          factory: async () => Promise.resolve("async"),
        };

        expect(typeof noArgsFactory.factory).toBe("function");
        expect(typeof withArgsFactory.factory).toBe("function");
        expect(typeof asyncFactory.factory).toBe("function");
      });
    });

    describe("IScopeOptions", () => {
      it("should define scope decorator options", () => {
        const options: IScopeOptions = {
          scopeId: "custom-scope",
          isolation: "strict",
        };

        expect(options.scopeId).toBe("custom-scope");
        expect(options.isolation).toBe("strict");
      });

      it("should allow both isolation strategies", () => {
        const strictOptions: IScopeOptions = { isolation: "strict" };
        const inheritedOptions: IScopeOptions = { isolation: "inherited" };

        expect(strictOptions.isolation).toBe("strict");
        expect(inheritedOptions.isolation).toBe("inherited");
      });

      it("should make all properties optional", () => {
        const emptyOptions: IScopeOptions = {};

        expect(emptyOptions.scopeId).toBeUndefined();
        expect(emptyOptions.isolation).toBeUndefined();
      });
    });
  });

  describe("Reader/Writer Interfaces", () => {
    describe("IMetadataReader", () => {
      it("should define read-only metadata operations", () => {
        // Type-only test to verify interface structure
        type ReaderMethods = keyof IMetadataReader;

        const expectedMethods: ReaderMethods[] = [
          "isInjectable",
          "getInjectableMetadata",
          "getParameterMetadata",
          "getPropertyMetadata",
          "getParameterTypes",
          "getPropertyType",
        ];

        expectedMethods.forEach((method) => {
          expect(typeof method).toBe("string");
        });
      });

      it("should maintain type safety for generic methods", () => {
        const mockReader = {} as IMetadataReader;

        // Methods should accept constructor functions and return appropriate types
        type IsInjectableMethod = (target: new (...args: unknown[]) => unknown) => boolean;
        type GetInjectableMethod = (target: new (...args: unknown[]) => unknown) => IInjectableMetadata | undefined;

        const isInjectableMethod: IsInjectableMethod = mockReader.isInjectable;
        const getInjectableMethod: GetInjectableMethod = mockReader.getInjectableMetadata;

        expect(typeof isInjectableMethod).toBe("function");
        expect(typeof getInjectableMethod).toBe("function");
      });
    });

    describe("IMetadataWriter", () => {
      it("should define write-only metadata operations", () => {
        type WriterMethods = keyof IMetadataWriter;

        const expectedMethods: WriterMethods[] = [
          "setInjectableMetadata",
          "addParameterMetadata",
          "addPropertyMetadata",
        ];

        expectedMethods.forEach((method) => {
          expect(typeof method).toBe("string");
        });
      });

      it("should accept appropriate parameter types", () => {
        const mockWriter = {} as IMetadataWriter;

        // Methods should accept correct parameter types
        type SetInjectableMethod = (target: new (...args: unknown[]) => unknown, metadata: IInjectableOptions) => void;

        const setMethod: SetInjectableMethod = mockWriter.setInjectableMetadata;
        expect(typeof setMethod).toBe("function");
      });
    });

    describe("IMetadataManager", () => {
      it("should extend both reader and writer interfaces", () => {
        // Type-only test to verify inheritance
        const mockManager = {} as IMetadataManager;

        // Should have reader methods
        const isInjectable = mockManager.isInjectable;
        const getInjectable = mockManager.getInjectableMetadata;

        // Should have writer methods
        const setInjectable = mockManager.setInjectableMetadata;
        const addParameter = mockManager.addParameterMetadata;

        // Should have manager-specific methods
        const clearMetadata = mockManager.clearMetadata;
        const hasReflectSupport = mockManager.hasReflectSupport;
        const getStats = mockManager.getStats;

        expect(typeof isInjectable).toBe("function");
        expect(typeof getInjectable).toBe("function");
        expect(typeof setInjectable).toBe("function");
        expect(typeof addParameter).toBe("function");
        expect(typeof clearMetadata).toBe("function");
        expect(typeof hasReflectSupport).toBe("function");
        expect(typeof getStats).toBe("function");
      });
    });
  });

  describe("Statistics and Configuration", () => {
    describe("IMetadataStats", () => {
      it("should define comprehensive statistics structure", () => {
        const stats: IMetadataStats = {
          injectableClasses: 10,
          parameterInjections: 25,
          propertyInjections: 15,
          hasDesignTypeSupport: true,
          platform: "node",
        };

        expect(stats.injectableClasses).toBe(10);
        expect(stats.parameterInjections).toBe(25);
        expect(stats.propertyInjections).toBe(15);
        expect(stats.hasDesignTypeSupport).toBe(true);
        expect(stats.platform).toBe("node");
      });

      it("should accept all valid platform values", () => {
        const nodeStats: IMetadataStats = {
          injectableClasses: 0,
          parameterInjections: 0,
          propertyInjections: 0,
          hasDesignTypeSupport: true,
          platform: "node",
        };

        const browserStats: IMetadataStats = {
          injectableClasses: 0,
          parameterInjections: 0,
          propertyInjections: 0,
          hasDesignTypeSupport: false,
          platform: "browser",
        };

        const unknownStats: IMetadataStats = {
          injectableClasses: 0,
          parameterInjections: 0,
          propertyInjections: 0,
          hasDesignTypeSupport: false,
          platform: "unknown",
        };

        expect(nodeStats.platform).toBe("node");
        expect(browserStats.platform).toBe("browser");
        expect(unknownStats.platform).toBe("unknown");
      });

      it("should require all numeric and boolean fields", () => {
        const stats: IMetadataStats = {
          injectableClasses: 5,
          parameterInjections: 10,
          propertyInjections: 3,
          hasDesignTypeSupport: true,
          platform: "node",
        };

        expect(typeof stats.injectableClasses).toBe("number");
        expect(typeof stats.parameterInjections).toBe("number");
        expect(typeof stats.propertyInjections).toBe("number");
        expect(typeof stats.hasDesignTypeSupport).toBe("boolean");
        expect(typeof stats.platform).toBe("string");
      });
    });

    describe("IDecoratorResolutionContext", () => {
      it("should define decorator resolution context", () => {
        class TestService {}

        const mockMetadata: IInjectableMetadata = {
          options: { lifecycle: "singleton" },
          parameterMetadata: [],
          propertyMetadata: [],
          target: TestService,
        };

        const context: IDecoratorResolutionContext = {
          target: TestService,
          container: undefined,
          metadata: mockMetadata,
          resolveOptional: true,
        };

        expect(context.target).toBe(TestService);
        expect(context.container).toBeUndefined();
        expect(context.metadata).toBe(mockMetadata);
        expect(context.resolveOptional).toBe(true);
      });

      it("should allow container to be unknown type", () => {
        class TestService {}

        const context: IDecoratorResolutionContext = {
          target: TestService,
          container: { someContainer: true },
          metadata: {
            options: {},
            parameterMetadata: [],
            propertyMetadata: [],
            target: TestService,
          },
          resolveOptional: false,
        };

        expect(context.container).toEqual({ someContainer: true });
      });
    });

    describe("IDecoratorConfig", () => {
      it("should define optional decorator configuration", () => {
        const emptyConfig: IDecoratorConfig = {};

        const fullConfig: IDecoratorConfig = {
          autoRegister: true,
          defaultLifecycle: "singleton",
          strictMode: false,
          enablePropertyInjection: true,
          enableLazyInjection: true,
          warnMissingDesignTypes: false,
        };

        expect(emptyConfig).toBeDefined();
        expect(fullConfig.autoRegister).toBe(true);
        expect(fullConfig.defaultLifecycle).toBe("singleton");
        expect(fullConfig.strictMode).toBe(false);
        expect(fullConfig.enablePropertyInjection).toBe(true);
        expect(fullConfig.enableLazyInjection).toBe(true);
        expect(fullConfig.warnMissingDesignTypes).toBe(false);
      });

      it("should accept all valid lifecycle values as default", () => {
        const singletonConfig: IDecoratorConfig = { defaultLifecycle: "singleton" };
        const transientConfig: IDecoratorConfig = { defaultLifecycle: "transient" };
        const scopedConfig: IDecoratorConfig = { defaultLifecycle: "scoped" };

        expect(singletonConfig.defaultLifecycle).toBe("singleton");
        expect(transientConfig.defaultLifecycle).toBe("transient");
        expect(scopedConfig.defaultLifecycle).toBe("scoped");
      });
    });
  });
});

describe("Type Relationships and Constraints", () => {
  it("should maintain type safety between options and metadata", () => {
    const injectableOptions: IInjectableOptions = {
      lifecycle: "singleton",
      token: "TestToken",
    };

    const metadata: IInjectableMetadata = {
      options: injectableOptions,
      parameterMetadata: [],
      propertyMetadata: [],
      target: class TestService {},
    };

    expect(metadata.options.lifecycle).toBe(injectableOptions.lifecycle);
    expect(metadata.options.token).toBe(injectableOptions.token);
  });

  it("should support inheritance in metadata target types", () => {
    interface IBaseService {
      base(): void;
    }

    interface IExtendedService extends IBaseService {
      extended(): void;
    }

    class BaseService implements IBaseService {
      base(): void {}
    }

    class ExtendedService extends BaseService implements IExtendedService {
      extended(): void {}
    }

    // Metadata should accept both base and extended classes
    const baseMetadata: IInjectableMetadata = {
      options: {},
      parameterMetadata: [],
      propertyMetadata: [],
      target: BaseService,
    };

    const extendedMetadata: IInjectableMetadata = {
      options: {},
      parameterMetadata: [],
      propertyMetadata: [],
      target: ExtendedService,
    };

    expect(baseMetadata.target).toBe(BaseService);
    expect(extendedMetadata.target).toBe(ExtendedService);
  });

  it("should maintain consistency between inject options and metadata", () => {
    const injectOptions: IInjectOptions = {
      token: "TestDependency",
      optional: true,
      defaultValue: "default",
    };

    const parameterMetadata: IParameterInjectMetadata = {
      parameterIndex: 0,
      token: injectOptions.token,
      optional: injectOptions.optional,
      defaultValue: injectOptions.defaultValue,
    };

    expect(parameterMetadata.token).toBe(injectOptions.token);
    expect(parameterMetadata.optional).toBe(injectOptions.optional);
    expect(parameterMetadata.defaultValue).toBe(injectOptions.defaultValue);
  });

  it("should support generic token types in metadata", () => {
    interface IRepository<T> {
      findById(id: string): T | undefined;
    }

    interface IUser {
      id: string;
      name: string;
    }

    // Token should maintain type information
    const genericToken: DIToken<IRepository<IUser>> = "IRepository<User>";

    const metadata: IParameterInjectMetadata = {
      parameterIndex: 0,
      token: genericToken,
      optional: false,
    };

    expect(metadata.token).toBe(genericToken);
  });

  it("should enforce lifecycle constraints in injectable options", () => {
    const lifecycles: ContainerLifecycle[] = ["singleton", "transient", "scoped"];

    lifecycles.forEach((lifecycle) => {
      const options: IInjectableOptions = { lifecycle };
      expect(["singleton", "transient", "scoped"]).toContain(options.lifecycle);
    });
  });

  it("should support method chaining in metadata manager interface", () => {
    // Verify that writer methods return void for chaining compatibility
    const mockWriter = {} as IMetadataWriter;

    type SetInjectableReturn = ReturnType<IMetadataWriter["setInjectableMetadata"]>;
    type AddParameterReturn = ReturnType<IMetadataWriter["addParameterMetadata"]>;
    type AddPropertyReturn = ReturnType<IMetadataWriter["addPropertyMetadata"]>;

    const setReturn: SetInjectableReturn = undefined;
    const paramReturn: AddParameterReturn = undefined;
    const propReturn: AddPropertyReturn = undefined;

    expect(setReturn).toBeUndefined();
    expect(paramReturn).toBeUndefined();
    expect(propReturn).toBeUndefined();
  });
});

describe("Complex Type Scenarios", () => {
  it("should handle nested generic types in factory options", () => {
    interface IService<T> {
      process(item: T): Promise<T>;
    }

    const factoryOptions: IFactoryOptions = {
      factory: <T>(processor: (item: T) => T): IService<T> => ({
        process: async (item: T) => Promise.resolve(processor(item)),
      }),
      dependencies: ["IProcessor"],
    };

    expect(typeof factoryOptions.factory).toBe("function");
  });

  it("should support complex metadata combinations", () => {
    const complexMetadata: IInjectableMetadata = {
      options: {
        lifecycle: "scoped",
        factory: async (dep1: string, dep2: number) => ({
          combined: `${dep1}-${dep2}`,
        }),
        dependencies: [Symbol("StringDep"), class NumberDep {}],
        metadata: {
          tags: ["complex", "async"],
          config: { timeout: 5000 },
        },
      },
      parameterMetadata: [
        {
          parameterIndex: 0,
          token: Symbol("StringDep"),
          parameterType: String,
          optional: false,
        },
        {
          parameterIndex: 1,
          token: class NumberDep {},
          parameterType: Number,
          optional: true,
          defaultValue: 42,
        },
      ],
      propertyMetadata: [
        {
          propertyKey: Symbol("asyncProperty"),
          token: "AsyncDependency",
          propertyType: Promise,
          optional: true,
          lazy: true,
        },
      ],
      parameterTypes: [String, Number],
      target: class ComplexService {},
    };

    expect(complexMetadata.options.lifecycle).toBe("scoped");
    expect(typeof complexMetadata.options.factory).toBe("function");
    expect(complexMetadata.parameterMetadata).toHaveLength(2);
    expect(complexMetadata.propertyMetadata).toHaveLength(1);
    expect(typeof complexMetadata.propertyMetadata[0].propertyKey).toBe("symbol");
  });

  it("should maintain type safety with conditional types", () => {
    // Conditional metadata based on whether property is lazy
    type ConditionalMetadata<T extends IPropertyInjectOptions> = T extends { lazy: true }
      ? IPropertyInjectMetadata & { lazy: true }
      : IPropertyInjectMetadata & { lazy: false };

    const lazyOptions = { lazy: true as const };
    const eagerOptions = { lazy: false as const };

    type LazyMetadata = ConditionalMetadata<typeof lazyOptions>;
    type EagerMetadata = ConditionalMetadata<typeof eagerOptions>;

    const lazyMeta: LazyMetadata = {
      propertyKey: "lazy",
      optional: false,
      lazy: true,
    };

    const eagerMeta: EagerMetadata = {
      propertyKey: "eager",
      optional: false,
      lazy: false,
    };

    expect(lazyMeta.lazy).toBe(true);
    expect(eagerMeta.lazy).toBe(false);
  });
});
