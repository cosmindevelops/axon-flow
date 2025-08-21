/**
 * Development-specific configuration builder with dev-friendly defaults
 * @module @axon/config/builders/development-config-builder
 */

import { ConfigBuilder } from "./config-builder.js";
import type { IConfigBuilderOptions, IFluentConfigBuilder } from "./config-builder.types.js";

/**
 * Development configuration builder with opinionated defaults for development workflow
 *
 * Features:
 * - Hot-reload enabled by default
 * - File watching enabled
 * - Verbose error reporting
 * - Environment variables with AXON_DEV_ prefix
 * - Local development file paths
 * - Memory cache for fast iteration
 */
export class DevelopmentConfigBuilder extends ConfigBuilder {
  constructor(options: IConfigBuilderOptions = {}) {
    const devDefaults: IConfigBuilderOptions = {
      validation: {
        enabled: true,
        failFast: false, // Continue on validation errors for development
        errorMessage: "Development configuration validation failed - check your config files and environment variables",
      },
      performance: {
        useObjectPool: true,
        lazyLoading: true,
        cacheBuildResults: true,
        maxCachedBuilders: 10, // Lower cache for development
      },
      developmentMode: true,
      ...options,
    };
    // Only assign platform if defined to satisfy exactOptionalPropertyTypes
    if (options.platform !== undefined) {
      Object.assign(devDefaults, { platform: options.platform });
    }

    super(devDefaults);

    // Apply development-specific configuration
    this._setupDevelopmentDefaults();
  }

  /**
   * Setup development-specific defaults
   */
  private _setupDevelopmentDefaults(): void {
    // Add environment variables with development prefix
    this.withEnvironment({
      prefix: "AXON_DEV_",
      priority: 150, // Higher priority than standard env vars
      transformKeys: true,
      parseValues: true,
    });

    // Add standard environment variables as fallback
    this.withEnvironment({
      prefix: "AXON_",
      priority: 100,
      transformKeys: true,
      parseValues: true,
    });

    // Add common development configuration files (if they exist)
    this._addDevelopmentFiles();

    // Enable hot-reload with shorter debounce for faster feedback
    this.withHotReload(true, 100);

    // Add memory-based overrides for development
    this.withMemory(
      {
        app: {
          logLevel: "debug",
          enableDebugMode: true,
          enableHotReload: true,
        },
      },
      {
        priority: 200, // Highest priority for dev overrides
      },
    );
  }

  /**
   * Add common development configuration files
   */
  private _addDevelopmentFiles(): IFluentConfigBuilder {
    // Try common development configuration file paths
    const devFiles = [
      "./config/development.json",
      "./config/dev.json",
      "./config.development.json",
      "./config.dev.json",
      "./.env.development",
      "./.env.dev",
      "./.env.local",
    ];

    for (const filePath of devFiles) {
      try {
        this.withFile(filePath, {
          priority: 75,
          watchForChanges: true,
          debounceMs: 100, // Fast reload for development
        });
      } catch (_error) {
        // Silently ignore missing files in development
        continue;
      }
    }

    return this;
  }

  /**
   * Enable development debugging features
   */
  withDevDebugging(enabled = true): this {
    if (enabled) {
      this.withMemory(
        {
          debug: {
            enabled: true,
            level: "verbose",
            showConfigSources: true,
            validateOnLoad: true,
          },
        },
        {
          priority: 250, // Very high priority for debug overrides
        },
      );
    }

    return this;
  }

  /**
   * Add development-specific database configuration
   */
  withDevDatabase(databaseUrl?: string): this {
    this.withMemory(
      {
        database: {
          url: databaseUrl ?? "postgresql://localhost:5432/axon_dev",
          ssl: false,
          logging: true,
          synchronize: true, // Auto-sync schema in development
          dropSchema: false, // Safety: don't drop by default
        },
      },
      {
        priority: 180,
      },
    );

    return this;
  }

  /**
   * Add development-specific Redis configuration
   */
  withDevRedis(redisUrl?: string): this {
    this.withMemory(
      {
        redis: {
          url: redisUrl ?? "redis://localhost:6379/0",
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        },
      },
      {
        priority: 180,
      },
    );

    return this;
  }

  /**
   * Add development-specific server configuration
   */
  withDevServer(port?: number): this {
    this.withMemory(
      {
        server: {
          port: port ?? 3000,
          host: "localhost",
          cors: {
            origin: true, // Allow all origins in development
            credentials: true,
          },
          helmet: {
            enabled: false, // Disable security headers for easier development
          },
        },
      },
      {
        priority: 180,
      },
    );

    return this;
  }

  /**
   * Add development-specific logging configuration
   */
  withDevLogging(): this {
    this.withMemory(
      {
        logging: {
          level: "debug",
          pretty: true, // Pretty print logs in development
          redactPaths: [], // Don't redact in development for easier debugging
          destination: "console",
          timestamp: true,
          colorize: true,
        },
      },
      {
        priority: 180,
      },
    );

    return this;
  }

  /**
   * Create a fully configured development builder with all defaults
   */
  static createDefault(options: IConfigBuilderOptions = {}): DevelopmentConfigBuilder {
    const builder = new DevelopmentConfigBuilder(options);

    return builder.withDevDebugging().withDevDatabase().withDevRedis().withDevServer().withDevLogging();
  }

  /**
   * Create a minimal development builder with only essential configuration
   */
  static createMinimal(options: IConfigBuilderOptions = {}): DevelopmentConfigBuilder {
    const builder = new DevelopmentConfigBuilder(options);

    return builder.withDevServer().withDevLogging();
  }
}
