/**
 * Decorator implementations
 *
 * Cross-platform TypeScript decorators for dependency injection with metadata handling
 */

import type {
  IInjectableOptions,
  IInjectOptions,
  IPropertyInjectOptions,
  IParameterInjectMetadata,
  IPropertyInjectMetadata,
  IInjectableMetadata,
  IMetadataManager,
  IMetadataStats,
  DECORATOR_METADATA_KEYS,
} from "./decorators.types.js";

import type { DIToken, ContainerLifecycle as _ContainerLifecycle } from "../container/container.types.js";

// Import metadata keys
const METADATA_KEYS: typeof DECORATOR_METADATA_KEYS = {
  INJECTABLE: Symbol("axon:di:injectable"),
  INJECT_PARAMS: Symbol("axon:di:inject:params"),
  INJECT_PROPERTIES: Symbol("axon:di:inject:properties"),
  LIFECYCLE: Symbol("axon:di:lifecycle"),
  FACTORY: Symbol("axon:di:factory"),
  SCOPE: Symbol("axon:di:scope"),
} as const;

/**
 * Cross-platform metadata manager implementation
 */
export class MetadataManager implements IMetadataManager {
  private readonly metadataStore = new WeakMap<object, Map<symbol, unknown>>();

  public hasReflectSupport(): boolean {
    return (
      typeof Reflect !== "undefined" &&
      typeof (Reflect as unknown as { getMetadata?: unknown }).getMetadata === "function"
    );
  }

  private getMetadataMap(target: object): Map<symbol, unknown> {
    let metadataMap = this.metadataStore.get(target);
    if (!metadataMap) {
      metadataMap = new Map();
      this.metadataStore.set(target, metadataMap);
    }
    return metadataMap;
  }

  private setMetadata(target: object, key: symbol, value: unknown): void {
    const metadataMap = this.getMetadataMap(target);
    metadataMap.set(key, value);

    // Also use Reflect if available for compatibility
    if (this.hasReflectSupport()) {
      const reflectWithMetadata = Reflect as unknown as {
        defineMetadata?: (key: symbol, value: unknown, target: object) => void;
      };
      reflectWithMetadata.defineMetadata?.(key, value, target);
    }
  }

  private getMetadata<T>(target: object, key: symbol): T | undefined {
    // Try Reflect first if available
    if (this.hasReflectSupport()) {
      const reflectWithMetadata = Reflect as unknown as {
        getMetadata?: (key: symbol, target: object) => unknown;
      };
      const reflectValue = reflectWithMetadata.getMetadata?.(key, target) as T;
      if (reflectValue !== undefined) {
        return reflectValue;
      }
    }

    // Fallback to internal storage
    const metadataMap = this.metadataStore.get(target);
    return metadataMap?.get(key) as T;
  }

  public isInjectable(target: new (...args: unknown[]) => unknown): boolean {
    return this.getMetadata<IInjectableOptions>(target, METADATA_KEYS.INJECTABLE) !== undefined;
  }

  public getInjectableMetadata(target: new (...args: unknown[]) => unknown): IInjectableMetadata | undefined {
    const options = this.getMetadata<IInjectableOptions>(target, METADATA_KEYS.INJECTABLE);
    if (!options) return undefined;

    const parameterMetadata = this.getParameterMetadata(target);
    const propertyMetadata = this.getPropertyMetadata(target);
    const parameterTypes = this.getParameterTypes(target);

    return {
      options,
      parameterMetadata,
      propertyMetadata,
      parameterTypes,
      target,
    };
  }

  public getParameterMetadata(target: new (...args: unknown[]) => unknown): IParameterInjectMetadata[] {
    return this.getMetadata<IParameterInjectMetadata[]>(target, METADATA_KEYS.INJECT_PARAMS) || [];
  }

  public getPropertyMetadata(target: new (...args: unknown[]) => unknown): IPropertyInjectMetadata[] {
    return this.getMetadata<IPropertyInjectMetadata[]>(target, METADATA_KEYS.INJECT_PROPERTIES) || [];
  }

  public getParameterTypes(target: new (...args: unknown[]) => unknown): unknown[] {
    if (this.hasReflectSupport()) {
      const reflectWithMetadata = Reflect as unknown as {
        getMetadata?: (key: string, target: object) => unknown;
      };
      return (reflectWithMetadata.getMetadata?.("design:paramtypes", target) as unknown[]) || [];
    }
    return [];
  }

  public getPropertyType(target: new (...args: unknown[]) => unknown, propertyKey: string | symbol): unknown {
    if (this.hasReflectSupport()) {
      const reflectWithMetadata = Reflect as unknown as {
        getMetadata?: (key: string, target: object, propertyKey?: string | symbol) => unknown;
      };
      return reflectWithMetadata.getMetadata?.("design:type", target.prototype, propertyKey);
    }
    return undefined;
  }

  public setInjectableMetadata(target: new (...args: unknown[]) => unknown, metadata: IInjectableOptions): void {
    this.setMetadata(target, METADATA_KEYS.INJECTABLE, metadata);
  }

  public addParameterMetadata(
    target: new (...args: unknown[]) => unknown,
    parameterIndex: number,
    options: IInjectOptions,
  ): void {
    const existing = this.getParameterMetadata(target);
    const parameterType = this.getParameterTypes(target)[parameterIndex];

    const metadata: IParameterInjectMetadata = {
      parameterIndex,
      token: options.token ?? target.name, // Use constructor name as fallback token
      parameterType,
      optional: options.optional ?? false,
      defaultValue: options.defaultValue,
    };

    // Remove any existing metadata for this parameter index
    const filtered = existing.filter((param) => param.parameterIndex !== parameterIndex);
    filtered.push(metadata);

    // Sort by parameter index for consistency
    filtered.sort((a, b) => a.parameterIndex - b.parameterIndex);

    this.setMetadata(target, METADATA_KEYS.INJECT_PARAMS, filtered);
  }

  public addPropertyMetadata(
    target: new (...args: unknown[]) => unknown,
    propertyKey: string | symbol,
    options: IPropertyInjectOptions,
  ): void {
    const existing = this.getPropertyMetadata(target);
    const propertyType = this.getPropertyType(target, propertyKey);

    const metadata: IPropertyInjectMetadata = {
      propertyKey,
      token: options.token ?? String(propertyKey), // Use property key as fallback token
      propertyType,
      optional: options.optional ?? false,
      defaultValue: options.defaultValue,
      lazy: options.lazy ?? false,
    };

    // Remove any existing metadata for this property
    const filtered = existing.filter((prop) => prop.propertyKey !== propertyKey);
    filtered.push(metadata);

    this.setMetadata(target, METADATA_KEYS.INJECT_PROPERTIES, filtered);
  }

  public clearMetadata(target: new (...args: unknown[]) => unknown): void {
    this.metadataStore.delete(target);
  }

  public getStats(): IMetadataStats {
    const injectableClasses = 0;
    const parameterInjections = 0;
    const propertyInjections = 0;

    // Note: WeakMap doesn't allow iteration, so we can't provide exact counts
    // This would require maintaining separate counters or using a different storage approach

    return {
      injectableClasses,
      parameterInjections,
      propertyInjections,
      hasDesignTypeSupport: this.hasReflectSupport(),
      platform: this.detectPlatform(),
    };
  }

  private detectPlatform(): "node" | "browser" | "unknown" {
    if (typeof process !== "undefined" && process.versions?.node) {
      return "node";
    }
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      return "browser";
    }
    return "unknown";
  }
}

/**
 * Global metadata manager instance
 */
export const defaultMetadataManager = new MetadataManager();

/**
 * Injectable decorator factory
 */
export function Injectable(options: IInjectableOptions = {}): ClassDecorator {
  return function (target: unknown) {
    const constructorTarget = target as new (...args: unknown[]) => unknown;
    defaultMetadataManager.setInjectableMetadata(constructorTarget, options);
  };
}

/**
 * Parameter injection decorator factory
 */
export function Inject(tokenOrOptions?: DIToken | IInjectOptions): ParameterDecorator {
  return function (target: unknown, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const constructorTarget = target as new (...args: unknown[]) => unknown;

    let options: IInjectOptions;
    if (typeof tokenOrOptions === "object" && tokenOrOptions && "token" in tokenOrOptions) {
      options = tokenOrOptions as IInjectOptions;
    } else {
      options = {
        token: tokenOrOptions as DIToken,
      };
    }

    defaultMetadataManager.addParameterMetadata(constructorTarget, parameterIndex, options);
  };
}

/**
 * Property injection decorator factory
 */
export function InjectProperty(tokenOrOptions?: DIToken | IPropertyInjectOptions): PropertyDecorator {
  return function (target: unknown, propertyKey: string | symbol) {
    const constructorTarget = (target as { constructor: new (...args: unknown[]) => unknown }).constructor;

    let options: IPropertyInjectOptions;
    if (typeof tokenOrOptions === "object" && tokenOrOptions && "token" in tokenOrOptions) {
      options = tokenOrOptions as IPropertyInjectOptions;
    } else {
      options = {
        token: tokenOrOptions as DIToken,
      };
    }

    defaultMetadataManager.addPropertyMetadata(constructorTarget, propertyKey, options);
  };
}

/**
 * Singleton lifecycle decorator
 */
export function Singleton(): ClassDecorator {
  return Injectable({ lifecycle: "singleton" });
}

/**
 * Transient lifecycle decorator
 */
export function Transient(): ClassDecorator {
  return Injectable({ lifecycle: "transient" });
}

/**
 * Scoped lifecycle decorator
 */
export function Scoped(): ClassDecorator {
  return Injectable({ lifecycle: "scoped" });
}

/**
 * Optional injection decorator for parameters
 */
export function Optional(defaultValue?: unknown): ParameterDecorator {
  return function (target: unknown, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const constructorTarget = target as new (...args: unknown[]) => unknown;

    const options: IInjectOptions = {
      optional: true,
      defaultValue,
    };

    defaultMetadataManager.addParameterMetadata(constructorTarget, parameterIndex, options);
  };
}

/**
 * Lazy property injection decorator
 */
export function Lazy(tokenOrOptions?: DIToken | IPropertyInjectOptions): PropertyDecorator {
  return function (target: unknown, propertyKey: string | symbol) {
    const constructorTarget = (target as { constructor: new (...args: unknown[]) => unknown }).constructor;

    let options: IPropertyInjectOptions;
    if (typeof tokenOrOptions === "object" && tokenOrOptions && "token" in tokenOrOptions) {
      options = { ...tokenOrOptions, lazy: true };
    } else {
      options = {
        token: tokenOrOptions as DIToken,
        lazy: true,
      };
    }

    defaultMetadataManager.addPropertyMetadata(constructorTarget, propertyKey, options);
  };
}
