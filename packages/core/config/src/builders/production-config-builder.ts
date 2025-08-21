/**
 * Production-specific configuration builder with security and performance optimizations
 * @module @axon/config/builders/production-config-builder
 */

import { ConfigBuilder } from "./config-builder.js";
import type { IConfigBuilderOptions } from "./config-builder.types.js";

/**
 * Production configuration builder with security-first defaults and performance optimizations
 *
 * Features:
 * - Security-first configuration with strict validation
 * - Performance optimizations with higher cache limits
 * - No file watching or hot-reload for stability
 * - Structured JSON logging without sensitive data
 * - SSL/TLS configuration defaults
 * - Connection pooling and clustering support
 */
export class ProductionConfigBuilder extends ConfigBuilder {
  constructor(options: IConfigBuilderOptions = {}) {
    const prodDefaults: IConfigBuilderOptions = {
      validation: {
        enabled: true,
        failFast: true, // Fail fast in production for immediate error detection
        errorMessage:
          "Production configuration validation failed - check environment variables and configuration files",
      },
      performance: {
        useObjectPool: true,
        lazyLoading: true,
        cacheBuildResults: true,
        maxCachedBuilders: 100, // Higher cache for production performance
      },
      developmentMode: false,
      ...options,
    };

    // Only assign platform if defined to satisfy exactOptionalPropertyTypes
    if (options.platform !== undefined) {
      Object.assign(prodDefaults, { platform: options.platform });
    }

    super(prodDefaults);

    // Apply production-specific configuration
    this._setupProductionDefaults();
  }

  /**
   * Setup production-specific defaults
   */
  private _setupProductionDefaults(): void {
    // Add environment variables with production precedence
    this.withEnvironment({
      prefix: "AXON_PROD_",
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

    // Add production configuration files (if they exist)
    this._addProductionFiles();

    // Disable hot-reload for production stability
    this.withHotReload(false);

    // Add production memory-based overrides
    this.withMemory(
      {
        app: {
          logLevel: "warn", // Less verbose logging in production
          enableDebugMode: false,
          enableHotReload: false,
          environment: "production",
        },
        security: {
          enableHelmet: true,
          enableCors: false, // Strict CORS by default
          enableRateLimit: true,
        },
      },
      {
        priority: 200, // High priority for production overrides
      },
    );
  }

  /**
   * Add production configuration files
   */
  private _addProductionFiles(): this {
    // Try common production configuration file paths
    const prodFiles = [
      "./config/production.json",
      "./config/prod.json",
      "./config.production.json",
      "./config.prod.json",
      "./.env.production",
      "./.env.prod",
    ];

    for (const filePath of prodFiles) {
      try {
        this.withFile(filePath, {
          priority: 75,
          watchForChanges: false, // No file watching in production
        });
      } catch (_error) {
        // Silently ignore missing files in production
        continue;
      }
    }

    return this;
  }

  /**
   * Enable production security configurations
   */
  withProdSecurity(enabled = true): this {
    if (enabled) {
      this.withMemory(
        {
          security: {
            helmet: {
              enabled: true,
              contentSecurityPolicy: {
                directives: {
                  defaultSrc: ["'self'"],
                  styleSrc: ["'self'", "'unsafe-inline'"],
                  scriptSrc: ["'self'"],
                  imgSrc: ["'self'", "data:", "https:"],
                },
              },
              hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true,
              },
            },
            cors: {
              origin: false, // Disable CORS by default, must be explicitly configured
              credentials: false,
            },
            rateLimit: {
              windowMs: 15 * 60 * 1000, // 15 minutes
              max: 100, // Limit each IP to 100 requests per windowMs
            },
          },
        },
        {
          priority: 250, // Very high priority for security overrides
        },
      );
    }

    return this;
  }

  /**
   * Add production-specific database configuration
   */
  withProdDatabase(databaseUrl?: string, options: { poolSize?: number; ssl?: boolean } = {}): this {
    this.withMemory(
      {
        database: {
          url: databaseUrl ?? process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/axon_prod",
          ssl: options.ssl ?? true, // Enable SSL by default in production
          logging: false, // Disable query logging in production
          synchronize: false, // Never auto-sync schema in production
          dropSchema: false, // Safety: never drop schema
          poolSize: options.poolSize ?? 20, // Connection pooling for performance
          extra: {
            connectionLimit: options.poolSize ?? 20,
            acquireTimeout: 30000, // 30 seconds
            timeout: 60000, // 60 seconds
            reconnect: true,
            reconnectDelay: 5000,
            idleTimeout: 300000, // 5 minutes
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
   * Add production-specific Redis configuration
   */
  withProdRedis(redisUrl?: string, options: { clustering?: boolean; persistence?: boolean } = {}): this {
    const redisConfig = {
      redis: {
        url: redisUrl ?? process.env["REDIS_URL"] ?? "redis://localhost:6379/0",
        retryDelayOnFailover: 1000, // Longer retry delay for production
        maxRetriesPerRequest: 5,
        lazyConnect: false, // Connect immediately in production
        keepAlive: 30000, // Keep connections alive
        connectTimeout: 10000, // 10 second connection timeout
        commandTimeout: 5000, // 5 second command timeout
        db: 0,
        ...(options.clustering && {
          enableAutoPipelining: true,
          maxRetriesPerRequest: 3,
          retryDelayOnClusterDown: 300,
          scaleReads: "slave",
        }),
        ...(options.persistence && {
          enableReadyCheck: true,
          maxLoadTime: 30000,
        }),
      },
    };

    this.withMemory(redisConfig, {
      priority: 180,
    });

    return this;
  }

  /**
   * Add production-specific server configuration
   */
  withProdServer(port?: number, options: { enableCors?: boolean; trustedProxies?: string[] } = {}): this {
    this.withMemory(
      {
        server: {
          port: port ?? parseInt(process.env["PORT"] ?? "8080", 10),
          host: "0.0.0.0", // Listen on all interfaces in production
          trustProxy: options.trustedProxies ?? ["loopback", "linklocal", "uniquelocal"],
          cors: {
            origin: options.enableCors ?? false, // Explicit CORS configuration required
            credentials: false,
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
          },
          helmet: {
            enabled: true,
            contentSecurityPolicy: true,
            frameguard: { action: "deny" },
            hidePoweredBy: true,
            hsts: true,
            noSniff: true,
            xssFilter: true,
          },
          compression: {
            enabled: true,
            level: 6, // Balance between speed and compression ratio
            threshold: 1024, // Only compress responses > 1KB
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
   * Add production-specific logging configuration
   */
  withProdLogging(options: { level?: string; destination?: string } = {}): this {
    this.withMemory(
      {
        logging: {
          level: options.level ?? "warn", // Less verbose in production
          pretty: false, // JSON logging for production
          redactPaths: [
            // Redact sensitive information
            "password",
            "secret",
            "token",
            "key",
            "auth",
            "credential",
            "*.password",
            "*.secret",
            "*.token",
            "database.url",
            "redis.url",
          ],
          destination: options.destination ?? "stdout",
          timestamp: true,
          colorize: false, // No colors in production logs
          serializers: {
            err: true, // Serialize errors properly
            req: true, // Serialize requests
            res: true, // Serialize responses
          },
          formatters: {
            level: (label: string) => ({ level: label }),
            bindings: () => ({}), // Remove default bindings for cleaner logs
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
   * Add production-specific monitoring and metrics configuration
   */
  withProdMonitoring(options: { enableMetrics?: boolean; enableTracing?: boolean } = {}): this {
    this.withMemory(
      {
        monitoring: {
          metrics: {
            enabled: options.enableMetrics ?? true,
            port: 9090, // Prometheus metrics port
            path: "/metrics",
            collectDefaultMetrics: true,
            collectProcessMetrics: true,
            collectHttpMetrics: true,
          },
          tracing: {
            enabled: options.enableTracing ?? true,
            serviceName: process.env["SERVICE_NAME"] ?? "axon-flow",
            serviceVersion: process.env["SERVICE_VERSION"] ?? "unknown",
            jaegerEndpoint: process.env["JAEGER_ENDPOINT"],
            sampleRate: 0.1, // Sample 10% of traces in production
          },
          healthCheck: {
            enabled: true,
            path: "/health",
            checks: ["database", "redis", "external-services"],
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
   * Create a fully configured production builder with all optimizations
   */
  static createDefault(options: IConfigBuilderOptions = {}): ProductionConfigBuilder {
    const builder = new ProductionConfigBuilder(options);

    return builder
      .withProdSecurity()
      .withProdDatabase()
      .withProdRedis(undefined, { clustering: true, persistence: true })
      .withProdServer()
      .withProdLogging()
      .withProdMonitoring();
  }

  /**
   * Create a minimal production builder with essential security only
   */
  static createMinimal(options: IConfigBuilderOptions = {}): ProductionConfigBuilder {
    const builder = new ProductionConfigBuilder(options);

    return builder.withProdSecurity().withProdServer().withProdLogging();
  }

  /**
   * Create a high-performance production builder optimized for scale
   */
  static createHighPerformance(options: IConfigBuilderOptions = {}): ProductionConfigBuilder {
    const performanceOptions: IConfigBuilderOptions = {
      performance: {
        useObjectPool: true,
        lazyLoading: true,
        cacheBuildResults: true,
        maxCachedBuilders: 200, // Higher cache for high-performance scenarios
      },
      ...options,
    };

    const builder = new ProductionConfigBuilder(performanceOptions);

    return builder
      .withProdSecurity()
      .withProdDatabase(undefined, { poolSize: 50 }) // Larger connection pool
      .withProdRedis(undefined, { clustering: true, persistence: true })
      .withProdServer()
      .withProdLogging({ level: "error" }) // Only errors for maximum performance
      .withProdMonitoring({ enableMetrics: true, enableTracing: false }); // Metrics only, no tracing overhead
  }
}
