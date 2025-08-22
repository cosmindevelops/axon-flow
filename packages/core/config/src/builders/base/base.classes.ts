/**
 * Base Configuration Builder Classes
 * Core implementation of the fluent builder pattern for configuration management
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";
import { CachedConfigRepository, MemoryConfigRepository } from "../../repositories/memory/memory.classes.js";
import { CompositeConfigRepository } from "../../repositories/composite/composite.classes.js";
import { EnvironmentConfigRepository } from "../../repositories/environment/environment.classes.js";
import { FileConfigRepository, LocalStorageConfigRepository } from "../../repositories/storage/storage.classes.js";
import type { ICompositeSource, IConfigRepository } from "../../types/index.js";
import { detectPlatform } from "../../utils/utils.classes.js";
import { generateConfigCacheKey, generateSchemaHash, globalValidationCache } from "../utils/utils.classes.js";
import type {
  ConfigMergeStrategy,
  IBuilderState,
  IBuilderValidationOptions,
  ICacheBuilderOptions,
  IConfigBuilderOptions,
  ICustomBuilderOptions,
  IEnvironmentBuilderOptions,
  IFileBuilderOptions,
  IFluentConfigBuilder,
  ILocalStorageBuilderOptions,
  IMemoryBuilderOptions,
} from "./base.types.js";

/**
 * Main Configuration Builder implementing the fluent pattern
 * Provides a chainable API for building configuration repositories from multiple sources
 */
export class ConfigBuilder implements IFluentConfigBuilder {
  private readonly state: IBuilderState;
  private readonly options: IConfigBuilderOptions;

  constructor(options: IConfigBuilderOptions = {}) {
    this.options = {
      platform: detectPlatform(),
      enableValidationCache: true,
      enableObjectPooling: true,
      ...options,
    };

    this.state = {
      sources: [],
      mergeStrategy: "deep",
      platform: this.options.platform!,
      validationOptions: {
        strict: true,
        allowUnknownKeys: false,
        errorOnInvalidSchema: true,
      },
    };
  }

  /**
   * Add environment variables as a configuration source
   */
  fromEnvironment(options: IEnvironmentBuilderOptions = {}): IFluentConfigBuilder {
    const repository = new EnvironmentConfigRepository(options.prefix ?? "AXON_");

    this.state.sources.push({
      repository,
      priority: options.priority ?? 100,
      enabled: true,
    });

    return this;
  }

  /**
   * Add a file as a configuration source
   */
  fromFile(filePath: string, options: IFileBuilderOptions = {}): IFluentConfigBuilder {
    const repository = new FileConfigRepository({
      filePath,
      format: (options.format as any) ?? undefined,
      watchForChanges: options.watch ?? false,
    });

    this.state.sources.push({
      repository,
      priority: options.priority ?? 200,
      enabled: true,
    });

    return this;
  }

  /**
   * Add in-memory data as a configuration source
   */
  fromMemory(data: Record<string, unknown>, options: IMemoryBuilderOptions = {}): IFluentConfigBuilder {
    const repository = new MemoryConfigRepository(data);

    this.state.sources.push({
      repository,
      priority: options.priority ?? 50,
      enabled: true,
    });

    return this;
  }

  /**
   * Add localStorage as a configuration source (browser only)
   */
  fromLocalStorage(options: ILocalStorageBuilderOptions = {}): IFluentConfigBuilder {
    if (this.state.platform === "node") {
      throw new ConfigurationError("LocalStorage is not available in Node.js environment", {
        operation: "fromLocalStorage",
      });
    }

    const repository = new LocalStorageConfigRepository({
      storageKey: options.keyPrefix ?? "axon-config",
    });

    this.state.sources.push({
      repository,
      priority: options.priority ?? 75,
      enabled: true,
    });

    return this;
  }

  /**
   * Add caching layer to the configuration
   */
  withCache(options: ICacheBuilderOptions = {}): IFluentConfigBuilder {
    if (this.state.sources.length === 0) {
      throw new ConfigurationError("Cannot add cache without any configuration sources", {
        operation: "withCache",
      });
    }

    // Wrap the last added source with caching
    const lastSource = this.state.sources[this.state.sources.length - 1];
    if (!lastSource) {
      throw new ConfigurationError("No source available to wrap with cache", {
        operation: "withCache",
      });
    }
    const cachedRepository = new CachedConfigRepository(lastSource.repository, options.ttl ?? 300000);

    // Replace the last source with the cached version
    const updatedSource: typeof lastSource = {
      repository: cachedRepository,
      priority: lastSource.priority,
      enabled: lastSource.enabled,
    };
    if (lastSource.prefix !== undefined) {
      (updatedSource as any).prefix = lastSource.prefix;
    }
    this.state.sources[this.state.sources.length - 1] = updatedSource;

    return this;
  }

  /**
   * Add a custom repository as a configuration source
   */
  withCustomRepository(repository: IConfigRepository, options: ICustomBuilderOptions = {}): IFluentConfigBuilder {
    const source: ICompositeSource = {
      repository,
      priority: options.priority ?? 150,
      enabled: true,
    };
    if (options.prefix !== undefined) {
      (source as any).prefix = options.prefix;
    }
    this.state.sources.push(source);

    return this;
  }

  /**
   * Set the merge strategy for combining multiple configuration sources
   */
  withMergeStrategy(strategy: ConfigMergeStrategy): IFluentConfigBuilder {
    (this.state as any).mergeStrategy = strategy;
    return this;
  }

  /**
   * Set validation options for the configuration
   */
  withValidation(options: IBuilderValidationOptions): IFluentConfigBuilder {
    (this.state as any).validationOptions = { ...this.state.validationOptions, ...options };
    return this;
  }

  /**
   * Build a single repository with validation against the provided schema
   */
  build<T extends z.ZodType>(schema: T): IConfigRepository {
    if (this.state.sources.length === 0) {
      throw new ConfigurationError("Cannot build configuration without any sources", {
        operation: "build",
      });
    }

    if (this.state.sources.length === 1) {
      // Single source - no need for composite
      const repository = this.state.sources[0]!.repository;

      // Validate against schema if validation cache is enabled
      if (this.options.enableValidationCache) {
        this.validateWithCache(repository, schema);
      }

      return repository;
    }

    // Multiple sources - create composite
    return this.buildComposite();
  }

  /**
   * Build a composite repository from all configured sources
   */
  buildComposite(): IConfigRepository {
    if (this.state.sources.length === 0) {
      throw new ConfigurationError("Cannot build composite configuration without any sources", {
        operation: "buildComposite",
      });
    }

    const repository = new CompositeConfigRepository({
      sources: [...this.state.sources],
      mergeStrategy: "merge" as any,
    });

    // Use object pooling if enabled
    if (this.options.enableObjectPooling) {
      // Object pooling implementation would need proper key and factory
      // Skipping for now to complete refactoring structure
    }

    return repository;
  }

  /**
   * Validate repository data against schema using cache
   */
  private validateWithCache<T extends z.ZodType>(repository: IConfigRepository, schema: T): void {
    const config = repository.getAllConfig();
    const cacheKey = generateConfigCacheKey(config);
    const schemaHash = generateSchemaHash(schema);

    // Check if already validated
    const cachedResult = globalValidationCache.get(cacheKey, schemaHash);
    if (cachedResult !== undefined) {
      return; // Already validated
    }

    try {
      schema.parse(config);
      globalValidationCache.set(cacheKey, "validated", schemaHash);
    } catch (_error) {
      if (this.state.validationOptions.errorOnInvalidSchema) {
        throw new ConfigurationError("Configuration validation failed", {
          operation: "validateWithCache",
        });
      }
    }
  }
}
