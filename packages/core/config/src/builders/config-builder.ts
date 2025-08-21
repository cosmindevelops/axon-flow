/**
 * Configuration Builder - Main fluent API for building configuration repositories
 * @module @axon/config/builders/config-builder
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";
import { CachedConfigRepository } from "../repositories/cached-config.repository.js";
import { CompositeConfigRepository } from "../repositories/composite-config.repository.js";
import { EnvironmentConfigRepository } from "../repositories/environment-config.repository.js";
import { FileConfigRepository } from "../repositories/file-config.repository.js";
import { LocalStorageConfigRepository } from "../repositories/localstorage-config.repository.js";
import { MemoryConfigRepository } from "../repositories/memory-config.repository.js";
import type { ConfigPlatform, ICompositeSource, IConfigRepository } from "../types/index.js";
import { detectPlatform } from "../utils/platform-detector.js";
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
} from "./config-builder.types.js";
import { getRepositoryPool } from "./utils/object-pool.js";
import { generateConfigCacheKey, generateSchemaHash, globalValidationCache } from "./utils/validation-cache.js";

/**
 * Main configuration builder class with fluent API
 */
export class ConfigBuilder implements IFluentConfigBuilder {
  private readonly _sources: ICompositeSource[] = [];
  private readonly _options: IConfigBuilderOptions;
  private readonly _platform: ConfigPlatform;
  private _mergeStrategy: ConfigMergeStrategy = "deep";
  private _hotReloadEnabled = true;
  private _hotReloadDebounceMs = 250;
  private _validation?: IBuilderValidationOptions;
  private _isBuilt = false;

  // Performance tracking
  private readonly _startTime = Date.now();
  private _cacheHits = 0;
  private _cacheMisses = 0;

  constructor(options: IConfigBuilderOptions = {}) {
    this._options = {
      platform: detectPlatform(),
      validation: {
        enabled: true,
        failFast: true,
      },
      performance: {
        useObjectPool: true,
        lazyLoading: true,
        cacheBuildResults: true,
        maxCachedBuilders: 50,
      },
      developmentMode: false,
      ...options,
    };

    this._platform = this._options.platform ?? detectPlatform();
    this._validation = this._options.validation ?? {
      enabled: true,
      failFast: true,
    };
  }

  /**
   * Add environment variable source
   */
  withEnvironment(options: IEnvironmentBuilderOptions = {}): this {
    this._ensureNotBuilt();

    const repository = this._createOrGetFromPool(
      `env_${JSON.stringify(options)}`,
      () => new EnvironmentConfigRepository(options.prefix ?? "AXON_"),
    );

    const source: ICompositeSource = {
      repository,
      priority: options.priority ?? 100,
      enabled: true,
    };

    this._sources.push(source);
    return this;
  }

  /**
   * Add file-based configuration source
   */
  withFile(filePath: string, options: IFileBuilderOptions = {}): this {
    this._ensureNotBuilt();

    const repository = this._createOrGetFromPool(
      `file_${filePath}_${JSON.stringify(options)}`,
      () => new FileConfigRepository({ ...options, filePath }),
    );

    const source: ICompositeSource = {
      repository,
      priority: options.priority ?? 50,
      enabled: true,
    };

    this._sources.push(source);
    return this;
  }

  /**
   * Add in-memory configuration source
   */
  withMemory(data: Record<string, unknown>, options: IMemoryBuilderOptions = {}): this {
    this._ensureNotBuilt();

    const repository = this._createOrGetFromPool(
      `memory_${generateConfigCacheKey(data)}_${JSON.stringify(options)}`,
      () => new MemoryConfigRepository(data),
    );

    const source: ICompositeSource = {
      repository,
      priority: options.priority ?? 0,
      enabled: true,
    };

    this._sources.push(source);
    return this;
  }

  /**
   * Add localStorage-based configuration source
   */
  withLocalStorage(options: ILocalStorageBuilderOptions = {}): this {
    this._ensureNotBuilt();

    // Only add localStorage on browser platform
    if (this._platform !== "browser") {
      return this;
    }

    const repository = this._createOrGetFromPool(
      `localstorage_${JSON.stringify(options)}`,
      () => new LocalStorageConfigRepository(options),
    );

    const source: ICompositeSource = {
      repository,
      priority: options.priority ?? 25,
      enabled: true,
    };

    this._sources.push(source);
    return this;
  }

  /**
   * Add caching layer
   */
  withCache(options: ICacheBuilderOptions = {}): this {
    this._ensureNotBuilt();

    // Get the last source to wrap with cache
    if (this._sources.length === 0) {
      throw new ConfigurationError("Cannot add cache without any underlying sources", {
        component: "ConfigBuilder",
        operation: "withCache",
        metadata: {
          sourcesCount: this._sources.length,
        },
      });
    }

    const lastSource = this._sources[this._sources.length - 1];
    if (!lastSource) {
      throw new ConfigurationError("Invalid source state", {
        component: "ConfigBuilder",
        operation: "withCache",
        metadata: {
          sourcesCount: this._sources.length,
        },
      });
    }

    const cachedRepository = this._createOrGetFromPool(
      `cache_${JSON.stringify(options)}`,
      () => new CachedConfigRepository(lastSource.repository, options.maxSize ?? 1000, options.ttl ?? 300000),
    );

    // Replace the last source with cached version
    const updatedSource: ICompositeSource = {
      repository: cachedRepository,
      priority: options.priority ?? lastSource.priority,
      enabled: lastSource.enabled,
    };
    if (lastSource.prefix !== undefined) {
      Object.assign(updatedSource, { prefix: lastSource.prefix });
    }
    this._sources[this._sources.length - 1] = updatedSource;

    return this;
  }

  /**
   * Add custom repository source
   */
  withCustom(options: ICustomBuilderOptions): this {
    this._ensureNotBuilt();

    const source: ICompositeSource = {
      repository: options.repository,
      priority: options.priority,
      enabled: options.enabled ?? true,
    };
    if (options.prefix !== undefined) {
      Object.assign(source, { prefix: options.prefix });
    }

    this._sources.push(source);
    return this;
  }

  /**
   * Set merge strategy for configuration composition
   */
  withMergeStrategy(strategy: ConfigMergeStrategy): this {
    this._ensureNotBuilt();
    this._mergeStrategy = strategy;
    return this;
  }

  /**
   * Enable or disable hot-reload
   */
  withHotReload(enabled: boolean, debounceMs = 250): this {
    this._ensureNotBuilt();
    this._hotReloadEnabled = enabled;
    this._hotReloadDebounceMs = debounceMs;
    return this;
  }

  /**
   * Add validation schema
   */
  withValidation(options: IBuilderValidationOptions): this {
    this._ensureNotBuilt();
    this._validation = { ...this._validation, ...options };
    return this;
  }

  /**
   * Build the composite configuration repository
   */
  build(): IConfigRepository {
    if (this._sources.length === 0) {
      throw new ConfigurationError("Cannot build configuration without any sources", {
        component: "ConfigBuilder",
        operation: "build",
        metadata: {
          sourcesCount: this._sources.length,
        },
      });
    }

    // Sort sources by priority (higher priority first)
    const sortedSources = [...this._sources].sort((a, b) => b.priority - a.priority);

    // Create composite repository
    const composite = new CompositeConfigRepository({
      sources: sortedSources,
      mergeStrategy: this._mergeStrategy === "deep" ? "merge" : "replace",
      enableHotReload: this._hotReloadEnabled,
    });

    // Validate configuration if schema provided
    if (this._validation?.enabled && this._validation.schema) {
      this._validateConfiguration(composite, this._validation.schema);
    }

    this._isBuilt = true;
    return composite;
  }

  /**
   * Get builder state for debugging
   */
  getState(): IBuilderState {
    return {
      sources: [...this._sources],
      isBuilt: this._isBuilt,
      metrics: {
        buildTime: Date.now() - this._startTime,
        sourceCount: this._sources.length,
        cacheHits: this._cacheHits,
        cacheMisses: this._cacheMisses,
      },
    };
  }

  /**
   * Create or get repository from object pool
   */
  private _createOrGetFromPool<T extends object>(key: string, factory: () => T): T {
    if (!this._options.performance?.useObjectPool) {
      return factory();
    }

    try {
      const pool = getRepositoryPool(key, factory);
      const repository = pool.acquire();
      this._cacheHits++;
      return repository;
    } catch (_error) {
      this._cacheMisses++;
      return factory();
    }
  }

  /**
   * Validate configuration against schema
   */
  private _validateConfiguration(repository: IConfigRepository, schema: z.ZodType): void {
    try {
      const config = repository.getAllConfig();
      const configKey = generateConfigCacheKey(config);
      const schemaHash = generateSchemaHash(schema);

      // Check cache first
      const cachedResult = globalValidationCache.get(configKey, schemaHash);
      if (cachedResult !== undefined) {
        this._cacheHits++;
        if (cachedResult === false) {
          throw new ConfigurationError("Configuration validation failed (cached result)", {
            component: "ConfigBuilder",
            operation: "validate",
            metadata: {
              cached: true,
              configHash: configKey,
              schemaHash,
            },
          });
        }
        return;
      }

      // Perform validation
      const result = schema.safeParse(config);
      this._cacheMisses++;

      if (!result.success) {
        // Cache failure result
        globalValidationCache.set(configKey, false, schemaHash);

        const errorMessage = this._validation?.errorMessage ?? "Configuration validation failed";
        throw new ConfigurationError(errorMessage, {
          component: "ConfigBuilder",
          operation: "validate",
          metadata: {
            zodErrors: result.error.issues,
            configHash: configKey,
          },
        });
      }

      // Cache success result
      globalValidationCache.set(configKey, true, schemaHash);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new ConfigurationError("Configuration validation failed", {
        component: "ConfigBuilder",
        operation: "validate",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Ensure builder hasn't been built yet
   */
  private _ensureNotBuilt(): void {
    if (this._isBuilt) {
      throw new ConfigurationError("Cannot modify builder after build() has been called", {
        component: "ConfigBuilder",
        operation: "modify",
        metadata: {
          isBuilt: this._isBuilt,
        },
      });
    }
  }
}
