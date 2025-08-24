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
      throw new ConfigurationError(
        "LocalStorage is not available in Node.js environment",
        "CONFIG_LOCALSTORAGE_UNAVAILABLE",
        {
          operation: "fromLocalStorage",
        },
      );
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
      throw new ConfigurationError("Cannot add cache without any configuration sources", "CONFIG_CACHE_NO_SOURCES", {
        operation: "withCache",
      });
    }

    // Wrap the last added source with caching
    const lastSource = this.state.sources[this.state.sources.length - 1];
    if (!lastSource) {
      throw new ConfigurationError("No source available to wrap with cache", "CONFIG_CACHE_NO_SOURCE", {
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
      throw new ConfigurationError("Cannot build configuration without any sources", "CONFIG_NO_SOURCES", {
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
      throw new ConfigurationError(
        "Cannot build composite configuration without any sources",
        "CONFIG_COMPOSITE_NO_SOURCES",
        {
          operation: "buildComposite",
        },
      );
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
   * Extract detailed validation error information from Zod errors
   */
  private extractValidationDetails(error: unknown, config: Record<string, unknown>) {
    // Default fallback details
    let summary = "Schema validation error";
    let details = "Unknown validation error";
    let paths: string[] = [];
    let sample: unknown = undefined;
    let expected = "Valid configuration object";

    // Check if it's a Zod error with structured information
    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as { issues: Array<{
        path: (string | number)[];
        message: string;
        code: string;
        expected?: unknown;
        received?: unknown;
      }> };

      if (Array.isArray(zodError.issues) && zodError.issues.length > 0) {
        const firstIssue = zodError.issues[0]!;
        const pathString = firstIssue.path.join(".");
        
        // Create comprehensive summary
        const issueCount = zodError.issues.length;
        summary = issueCount === 1 
          ? `Invalid value at '${pathString}': ${firstIssue.message}`
          : `${issueCount} validation errors, starting with '${pathString}': ${firstIssue.message}`;

        // Extract all failed paths
        paths = zodError.issues.map(issue => issue.path.join(".")).filter(path => path.length > 0);
        if (paths.length === 0) paths = ["<root>"];

        // Get sample of failed value
        if (firstIssue.path.length > 0) {
          try {
            sample = firstIssue.path.reduce((obj: any, key) => obj?.[key], config);
          } catch {
            sample = undefined;
          }
        } else {
          sample = config;
        }

        // Determine expected type
        if (firstIssue.expected !== undefined) {
          expected = String(firstIssue.expected);
        } else if (firstIssue.code) {
          // Map common Zod error codes to readable expected types
          const expectedMap: Record<string, string> = {
            "invalid_type": "Correct data type",
            "invalid_string": "Valid string format",
            "invalid_number": "Valid number",
            "invalid_boolean": "Boolean value",
            "invalid_enum_value": "One of the allowed enum values",
            "too_small": "Value meeting minimum requirements",
            "too_big": "Value meeting maximum requirements",
            "invalid_date": "Valid date",
            "custom": "Value meeting custom validation rules"
          };
          expected = expectedMap[firstIssue.code] || "Valid value according to schema";
        }

        // Format detailed error information
        const errorSummaries = zodError.issues.slice(0, 3).map(issue => {
          const issuePath = issue.path.join(".") || "<root>";
          return `  • ${issuePath}: ${issue.message}`;
        });
        
        if (zodError.issues.length > 3) {
          errorSummaries.push(`  • ... and ${zodError.issues.length - 3} more errors`);
        }
        
        details = `Validation errors:\n${errorSummaries.join("\n")}`;
      }
    } else if (error instanceof Error) {
      // Fallback for generic errors
      summary = error.message;
      details = `Generic error: ${error.message}`;
    }

    return {
      summary,
      details,
      paths,
      sample,
      expected
    };
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
    } catch (error) {
      if (this.state.validationOptions.errorOnInvalidSchema) {
        // Enhanced error reporting with detailed context
        const validationDetails = this.extractValidationDetails(error, config);
        const configSources = this.state.sources
          .map(source => source?.repository?.constructor?.name || "UnknownRepository")
          .join(", ");
        
        // Create enhanced error message with validation details
        const enhancedMessage = `Configuration validation failed: ${validationDetails.summary}\n\nDetails:\n${validationDetails.details}`;
        
        throw new ConfigurationError(
          enhancedMessage,
          "CONFIG_VALIDATION_FAILED",
          {
            operation: "validateWithCache",
            configSource: configSources,
            configKey: validationDetails.paths[0] || "<root>",
            configValue: validationDetails.sample,
            expectedType: validationDetails.expected,
          }
        );
      }
    }
  }
}
