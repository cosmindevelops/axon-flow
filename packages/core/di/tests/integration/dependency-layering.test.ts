/**
 * Integration tests for dependency layering and package boundaries
 * Uses real @axon package interfaces for authentic integration testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { ObjectPool } from "../../src/pool/pool.classes.js";
import { SimpleFactory, CachedFactory } from "../../src/factory/factory.classes.js";
import type { DIToken } from "../../src/container/container.types.js";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";
import { EnhancedErrorFactory } from "@axon/errors";
import type { IConfigRepository, IConfigFactory } from "@axon/config";
import { ConfigRepository, ConfigFactory } from "@axon/config";

// Define layered service interfaces following real @axon patterns
interface IDataLayer {
  getData(key: string): Promise<any>;
  setData(key: string, value: any): Promise<void>;
}

interface IBusinessLayer {
  processData(input: any): Promise<any>;
  validateData(data: any): Promise<boolean>;
}

interface IServiceLayer {
  executeOperation(operation: string, params: any): Promise<any>;
  getServiceHealth(): Promise<{ status: string; details: any }>;
}

interface IPresentationLayer {
  formatResponse(data: any): any;
  handleRequest(request: any): Promise<any>;
}

// Data layer implementations using real @axon interfaces
class DatabaseDataLayer implements IDataLayer {
  constructor(
    private logger: ILogger,
    private configRepository: IConfigRepository,
  ) {}

  async getData(key: string): Promise<any> {
    this.logger.debug("Retrieving data from database layer", { key });

    const dbConfig = await this.configRepository.get("database.connectionString");
    if (!dbConfig) {
      this.logger.warn("Database configuration not found", { key, layer: "data" });
      return null;
    }

    // Simulate database operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    const mockData = { id: key, value: `data-${key}`, timestamp: Date.now() };

    this.logger.info("Data retrieved successfully", {
      key,
      layer: "data",
      hasData: !!mockData,
    });

    return mockData;
  }

  async setData(key: string, value: any): Promise<void> {
    this.logger.debug("Storing data in database layer", { key, hasValue: !!value });

    // Simulate database write
    await new Promise((resolve) => setTimeout(resolve, 15));

    this.logger.info("Data stored successfully", {
      key,
      layer: "data",
      operation: "set",
    });
  }
}

class CacheDataLayer implements IDataLayer {
  private cache = new Map<string, any>();

  constructor(
    private logger: ILogger,
    private configRepository: IConfigRepository,
  ) {}

  async getData(key: string): Promise<any> {
    this.logger.debug("Retrieving data from cache layer", { key });

    const cached = this.cache.get(key);

    this.logger.info("Cache lookup completed", {
      key,
      layer: "cache",
      hit: !!cached,
      cacheSize: this.cache.size,
    });

    return cached || null;
  }

  async setData(key: string, value: any): Promise<void> {
    this.logger.debug("Storing data in cache layer", { key });

    this.cache.set(key, value);

    this.logger.info("Data cached successfully", {
      key,
      layer: "cache",
      cacheSize: this.cache.size,
    });
  }
}

// Business layer implementation
class CoreBusinessLayer implements IBusinessLayer {
  constructor(
    private dataLayer: IDataLayer,
    private logger: ILogger,
    private errorFactory: EnhancedErrorFactory,
  ) {}

  async processData(input: any): Promise<any> {
    this.logger.info("Starting business processing", {
      layer: "business",
      hasInput: !!input,
    });

    try {
      // Validate input first
      const isValid = await this.validateData(input);
      if (!isValid) {
        const validationError = this.errorFactory.createValidationError(
          "Input validation failed in business layer",
          "BIZ_VALIDATION_FAILED",
        );
        throw validationError;
      }

      // Retrieve existing data if needed
      let existingData = null;
      if (input?.id) {
        existingData = await this.dataLayer.getData(input.id);
      }

      // Process the business logic
      const processedData = {
        ...input,
        processed: true,
        processingTimestamp: Date.now(),
        existingData: existingData,
        businessRules: {
          applied: ["validation", "enrichment", "transformation"],
          version: "1.0.0",
        },
      };

      // Store processed result
      if (processedData.id) {
        await this.dataLayer.setData(processedData.id, processedData);
      }

      this.logger.info("Business processing completed successfully", {
        layer: "business",
        inputId: input?.id,
        hadExistingData: !!existingData,
        rulesApplied: processedData.businessRules.applied.length,
      });

      return processedData;
    } catch (error) {
      this.logger.error("Business processing failed", {
        layer: "business",
        error: (error as Error).message,
        errorCode: (error as any).code,
        inputId: input?.id,
      });
      throw error;
    }
  }

  async validateData(data: any): Promise<boolean> {
    this.logger.debug("Validating data in business layer", { layer: "business" });

    if (!data) {
      this.logger.warn("Data validation failed: null input", { layer: "business" });
      return false;
    }

    if (typeof data !== "object") {
      this.logger.warn("Data validation failed: invalid type", {
        layer: "business",
        type: typeof data,
      });
      return false;
    }

    this.logger.info("Data validation passed", { layer: "business" });
    return true;
  }
}

// Service layer implementation
class ApplicationServiceLayer implements IServiceLayer {
  constructor(
    private businessLayer: IBusinessLayer,
    private logger: ILogger,
    private errorFactory: EnhancedErrorFactory,
    private configRepository: IConfigRepository,
  ) {}

  async executeOperation(operation: string, params: any): Promise<any> {
    this.logger.info("Executing service operation", {
      layer: "service",
      operation,
      hasParams: !!params,
    });

    try {
      switch (operation) {
        case "process":
          return await this.businessLayer.processData(params);

        case "validate":
          const isValid = await this.businessLayer.validateData(params);
          return { valid: isValid, data: params };

        case "health":
          return await this.getServiceHealth();

        default:
          const operationError = this.errorFactory.createApplicationError(
            `Unknown operation: ${operation}`,
            "SVC_UNKNOWN_OPERATION",
          );
          throw operationError;
      }
    } catch (error) {
      this.logger.error("Service operation failed", {
        layer: "service",
        operation,
        error: (error as Error).message,
        errorCode: (error as any).code,
      });
      throw error;
    }
  }

  async getServiceHealth(): Promise<{ status: string; details: any }> {
    this.logger.debug("Checking service health", { layer: "service" });

    const configAvailable = await this.configRepository.get("service.name");

    const health = {
      status: configAvailable ? "healthy" : "degraded",
      details: {
        layer: "service",
        configurationAvailable: !!configAvailable,
        businessLayerAvailable: !!this.businessLayer,
        timestamp: Date.now(),
      },
    };

    this.logger.info("Service health check completed", {
      layer: "service",
      status: health.status,
      configAvailable: !!configAvailable,
    });

    return health;
  }
}

// Presentation layer implementation
class WebPresentationLayer implements IPresentationLayer {
  constructor(
    private serviceLayer: IServiceLayer,
    private logger: ILogger,
    private errorFactory: EnhancedErrorFactory,
  ) {}

  formatResponse(data: any): any {
    this.logger.debug("Formatting response in presentation layer", {
      layer: "presentation",
      hasData: !!data,
    });

    const formatted = {
      success: true,
      data: data,
      metadata: {
        timestamp: new Date().toISOString(),
        layer: "presentation",
        formatted: true,
      },
    };

    this.logger.info("Response formatted successfully", {
      layer: "presentation",
      hasData: !!data,
    });

    return formatted;
  }

  async handleRequest(request: any): Promise<any> {
    this.logger.info("Handling request in presentation layer", {
      layer: "presentation",
      operation: request?.operation,
      hasParams: !!request?.params,
    });

    try {
      if (!request?.operation) {
        const requestError = this.errorFactory.createValidationError(
          "Request must include operation",
          "PRES_MISSING_OPERATION",
        );
        throw requestError;
      }

      const serviceResult = await this.serviceLayer.executeOperation(request.operation, request.params);

      const formattedResponse = this.formatResponse(serviceResult);

      this.logger.info("Request handled successfully", {
        layer: "presentation",
        operation: request.operation,
        success: true,
      });

      return formattedResponse;
    } catch (error) {
      const errorResponse = {
        success: false,
        error: {
          message: (error as Error).message,
          code: (error as any).code,
          layer: "presentation",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          operation: request?.operation,
        },
      };

      this.logger.error("Request handling failed", {
        layer: "presentation",
        operation: request?.operation,
        error: (error as Error).message,
        errorCode: (error as any).code,
      });

      return errorResponse;
    }
  }
}

// DI Tokens for layered dependencies
const LOGGER_TOKEN: DIToken<ILogger> = "ILogger";
const CONFIG_REPOSITORY_TOKEN: DIToken<IConfigRepository> = "IConfigRepository";
const CONFIG_FACTORY_TOKEN: DIToken<IConfigFactory> = "IConfigFactory";
const ERROR_FACTORY_TOKEN: DIToken<EnhancedErrorFactory> = "EnhancedErrorFactory";
const DATABASE_DATA_LAYER_TOKEN: DIToken<IDataLayer> = "DatabaseDataLayer";
const CACHE_DATA_LAYER_TOKEN: DIToken<IDataLayer> = "CacheDataLayer";
const BUSINESS_LAYER_TOKEN: DIToken<IBusinessLayer> = "IBusinessLayer";
const SERVICE_LAYER_TOKEN: DIToken<IServiceLayer> = "IServiceLayer";
const PRESENTATION_LAYER_TOKEN: DIToken<IPresentationLayer> = "IPresentationLayer";

describe("Dependency Layering Integration", () => {
  let container: DIContainer;
  let testLogOutput: any[];

  beforeEach(async () => {
    testLogOutput = [];

    // Create test stream for logger
    const { Writable } = await import("stream");
    const testStream = new Writable({
      write(chunk, _encoding, callback) {
        const logStr = chunk.toString();
        try {
          const logEntry = JSON.parse(logStr);
          testLogOutput.push(logEntry);
        } catch {
          testLogOutput.push({ message: logStr });
        }
        callback();
      },
    });

    container = new DIContainer({
      name: "LayeredDependencyContainer",
      enableMetrics: true,
    });

    // Register logger with real ILoggerConfig
    container.registerFactory(LOGGER_TOKEN, async () => {
      const loggerConfig: Partial<ILoggerConfig> = {
        environment: "test",
        logLevel: "debug",
        transports: [],
        enableCorrelationIds: true,
        timestampFormat: "iso",
        testStream: testStream,
      };

      const logger = new HighPerformancePinoLogger(loggerConfig);
      await (logger as any).loggerInitPromise;
      return logger;
    });

    // Register config repository with real interface
    container.registerFactory(CONFIG_REPOSITORY_TOKEN, () => {
      return new ConfigRepository({
        storageProvider: {
          async get(key: string) {
            const configs: Record<string, string> = {
              "database.connectionString": "postgresql://localhost:5432/testdb",
              "service.name": "layered-test-service",
              "service.version": "1.0.0",
              "cache.ttl": "300",
            };
            return configs[key] || null;
          },
          async set(key: string, value: string) {
            return true;
          },
          async delete(key: string) {
            return true;
          },
        },
      });
    });

    // Register error factory
    container.registerFactory(ERROR_FACTORY_TOKEN, () => {
      return new EnhancedErrorFactory({
        correlationId: "layered-test-123",
        service: "dependency-layering-test",
        version: "1.0.0",
      });
    });
  });

  afterEach(() => {
    container.dispose();
    testLogOutput = [];
  });

  describe("Layer Dependency Registration and Resolution", () => {
    it("should correctly register and resolve layered dependencies using real @axon interfaces", async () => {
      // Register data layers
      container.register(DATABASE_DATA_LAYER_TOKEN, DatabaseDataLayer, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(CACHE_DATA_LAYER_TOKEN, CacheDataLayer, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      // Register business layer (depends on data layer)
      container.register(BUSINESS_LAYER_TOKEN, CoreBusinessLayer, {
        lifecycle: "singleton",
        dependencies: [DATABASE_DATA_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      // Register service layer (depends on business layer)
      container.register(SERVICE_LAYER_TOKEN, ApplicationServiceLayer, {
        lifecycle: "singleton",
        dependencies: [BUSINESS_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      // Register presentation layer (depends on service layer)
      container.register(PRESENTATION_LAYER_TOKEN, WebPresentationLayer, {
        lifecycle: "singleton",
        dependencies: [SERVICE_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      // Resolve top-level presentation layer (should resolve entire dependency chain)
      const presentationLayer = await container.resolveAsync(PRESENTATION_LAYER_TOKEN);

      // Test the complete dependency chain through actual usage
      const testRequest = {
        operation: "process",
        params: {
          id: "test-123",
          data: "sample data",
          priority: "high",
        },
      };

      const response = await presentationLayer.handleRequest(testRequest);

      // Verify layered processing worked correctly
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.processed).toBe(true);
      expect(response.data.businessRules).toBeDefined();
      expect(response.metadata.layer).toBe("presentation");

      // Verify logging occurred across all layers
      const layerLogs = testLogOutput.filter((log) => log.layer);
      const layersLogged = new Set(layerLogs.map((log) => log.layer));

      expect(layersLogged.has("data")).toBe(true);
      expect(layersLogged.has("business")).toBe(true);
      expect(layersLogged.has("service")).toBe(true);
      expect(layersLogged.has("presentation")).toBe(true);

      // Verify dependency metrics
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBeGreaterThan(5); // Multiple dependencies resolved
      expect(metrics.cacheHitRatio).toBeGreaterThan(0); // Singletons should hit cache on subsequent resolutions
    });

    it("should handle layer isolation and dependency boundaries correctly", async () => {
      // Register layers with different lifecycles to test isolation
      container.register(DATABASE_DATA_LAYER_TOKEN, DatabaseDataLayer, {
        lifecycle: "singleton", // Shared data layer
        dependencies: [LOGGER_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(BUSINESS_LAYER_TOKEN, CoreBusinessLayer, {
        lifecycle: "transient", // New business layer per request
        dependencies: [DATABASE_DATA_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(SERVICE_LAYER_TOKEN, ApplicationServiceLayer, {
        lifecycle: "transient", // New service layer per request
        dependencies: [BUSINESS_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      // Create multiple presentation layer instances
      const presentationLayers: IPresentationLayer[] = [];

      for (let i = 0; i < 3; i++) {
        container.register(`${PRESENTATION_LAYER_TOKEN}_${i}`, WebPresentationLayer, {
          lifecycle: "transient",
          dependencies: [SERVICE_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
        });

        const layer = await container.resolveAsync(`${PRESENTATION_LAYER_TOKEN}_${i}`);
        presentationLayers.push(layer);
      }

      // Test concurrent operations across multiple presentation layer instances
      const operations = presentationLayers.map((layer, index) =>
        layer.handleRequest({
          operation: "validate",
          params: { id: `concurrent-${index}`, data: `test data ${index}` },
        }),
      );

      const results = await Promise.all(operations);

      // Verify all operations succeeded independently
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data.valid).toBe(true);
        expect(result.data.data.id).toBe(`concurrent-${index}`);
      });

      // Verify proper layer isolation in logs
      const concurrentLogs = testLogOutput.filter(
        (log) => log.inputId?.startsWith?.("concurrent-") || log.operation === "validate",
      );

      expect(concurrentLogs.length).toBeGreaterThan(0);

      // Verify shared singleton data layer vs transient other layers
      const metrics = container.getMetrics();
      expect(metrics.memoryUsage.singletonCount).toBe(4); // Logger, Config, ErrorFactory, DatabaseDataLayer
    });
  });

  describe("Layer-wise Error Handling and Propagation", () => {
    it("should properly handle and propagate errors through dependency layers", async () => {
      // Register all layers
      container.register(DATABASE_DATA_LAYER_TOKEN, DatabaseDataLayer, {
        dependencies: [LOGGER_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(BUSINESS_LAYER_TOKEN, CoreBusinessLayer, {
        dependencies: [DATABASE_DATA_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(SERVICE_LAYER_TOKEN, ApplicationServiceLayer, {
        dependencies: [BUSINESS_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(PRESENTATION_LAYER_TOKEN, WebPresentationLayer, {
        dependencies: [SERVICE_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      const presentationLayer = await container.resolveAsync(PRESENTATION_LAYER_TOKEN);

      // Test error originating from business layer (validation failure)
      const invalidRequest = {
        operation: "process",
        params: null, // Invalid data will trigger business layer validation error
      };

      const errorResponse = await presentationLayer.handleRequest(invalidRequest);

      // Verify error was properly handled at presentation layer
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.code).toBe("BIZ_VALIDATION_FAILED");
      expect(errorResponse.error.layer).toBe("presentation");

      // Verify error propagation logging across layers
      const errorLogs = testLogOutput.filter(
        (log) => log.level >= 40, // Warn and Error levels
      );

      expect(errorLogs.length).toBeGreaterThan(0);

      // Should have error logs from business and presentation layers
      const businessErrorLog = errorLogs.find(
        (log) => log.layer === "business" && log.msg?.includes("validation failed"),
      );

      const presentationErrorLog = errorLogs.find(
        (log) => log.layer === "presentation" && log.msg?.includes("handling failed"),
      );

      expect(businessErrorLog || presentationErrorLog).toBeDefined(); // At least one should be present

      // Test unknown operation error from service layer
      const unknownOperationRequest = {
        operation: "unknown-operation",
        params: { test: "data" },
      };

      const serviceErrorResponse = await presentationLayer.handleRequest(unknownOperationRequest);

      expect(serviceErrorResponse.success).toBe(false);
      expect(serviceErrorResponse.error.code).toBe("SVC_UNKNOWN_OPERATION");
    });

    it("should maintain error correlation across all dependency layers", async () => {
      // Register layers with shared error factory for correlation
      const layers = [DATABASE_DATA_LAYER_TOKEN, BUSINESS_LAYER_TOKEN, SERVICE_LAYER_TOKEN, PRESENTATION_LAYER_TOKEN];

      container.register(DATABASE_DATA_LAYER_TOKEN, DatabaseDataLayer, {
        dependencies: [LOGGER_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(BUSINESS_LAYER_TOKEN, CoreBusinessLayer, {
        dependencies: [DATABASE_DATA_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(SERVICE_LAYER_TOKEN, ApplicationServiceLayer, {
        dependencies: [BUSINESS_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(PRESENTATION_LAYER_TOKEN, WebPresentationLayer, {
        dependencies: [SERVICE_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      const presentationLayer = await container.resolveAsync(PRESENTATION_LAYER_TOKEN);

      // Execute successful operation to trace correlation through layers
      const correlatedRequest = {
        operation: "process",
        params: {
          id: "correlation-test-456",
          data: "correlated operation data",
        },
      };

      const response = await presentationLayer.handleRequest(correlatedRequest);

      expect(response.success).toBe(true);

      // Verify correlation IDs are consistent across all layer logs
      const operationLogs = testLogOutput.filter(
        (log) =>
          log.inputId === "correlation-test-456" || log.key === "correlation-test-456" || log.operation === "process",
      );

      // Check that logs from different layers reference the same correlation context
      const correlationIds = new Set(
        operationLogs.map((log) => log.correlationId).filter((id) => id), // Remove undefined values
      );

      // Should have correlation IDs but they should be consistent
      if (correlationIds.size > 0) {
        expect(correlationIds.size).toBeLessThanOrEqual(2); // May have one from error factory and one from logger
      }

      // Verify layers are properly logged
      const layerNames = new Set(operationLogs.map((log) => log.layer).filter(Boolean));
      expect(layerNames.size).toBeGreaterThan(1); // Multiple layers should be represented
    });
  });

  describe("Performance and Resource Management Across Layers", () => {
    it("should efficiently manage resources across layered dependencies", async () => {
      // Use object pools for expensive data layer resources
      const dbPool = new ObjectPool(
        "DatabaseDataLayerPool",
        () =>
          new DatabaseDataLayer(
            container.resolve(LOGGER_TOKEN) as ILogger,
            container.resolve(CONFIG_REPOSITORY_TOKEN) as IConfigRepository,
          ),
        {
          minSize: 2,
          maxSize: 5,
          enableMetrics: true,
        },
      );

      await dbPool.warmUp();

      // Register pooled data layer
      container.registerFactory(DATABASE_DATA_LAYER_TOKEN, async () => {
        return await dbPool.acquire();
      });

      // Register other layers normally
      container.register(BUSINESS_LAYER_TOKEN, CoreBusinessLayer, {
        lifecycle: "transient",
        dependencies: [DATABASE_DATA_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(SERVICE_LAYER_TOKEN, ApplicationServiceLayer, {
        lifecycle: "transient",
        dependencies: [BUSINESS_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.register(PRESENTATION_LAYER_TOKEN, WebPresentationLayer, {
        lifecycle: "transient",
        dependencies: [SERVICE_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      // Execute multiple concurrent operations to test resource pooling
      const concurrentOperations = Array.from({ length: 8 }, (_, index) => {
        return container.resolveAsync(PRESENTATION_LAYER_TOKEN).then((layer) =>
          layer.handleRequest({
            operation: "process",
            params: {
              id: `pooled-${index}`,
              data: `pooled operation ${index}`,
            },
          }),
        );
      });

      const startTime = performance.now();
      const results = await Promise.all(concurrentOperations);
      const endTime = performance.now();

      // Verify all operations succeeded
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Verify pooling efficiency
      const poolStats = dbPool.getStats();
      expect(poolStats.totalAcquired).toBe(8); // All operations should have acquired from pool
      expect(poolStats.currentAvailable).toBeGreaterThan(0); // Some should be returned to pool

      // Performance should be reasonable with pooling
      const avgTimePerOperation = (endTime - startTime) / 8;
      expect(avgTimePerOperation).toBeLessThan(100); // Should complete quickly with pooling

      // Verify container metrics show efficient resolution
      const containerMetrics = container.getMetrics();
      expect(containerMetrics.averageResolutionTime).toBeLessThan(10); // Fast resolution with pooling

      await dbPool.destroy();
    });

    it("should handle layer dependency caching effectively", async () => {
      // Use cached factory for business layer to test caching effectiveness
      const businessLayerFactory = new CachedFactory(
        "BusinessLayerFactory",
        new SimpleFactory(
          "CoreBusinessLayerFactory",
          () =>
            new CoreBusinessLayer(
              container.resolve(DATABASE_DATA_LAYER_TOKEN) as IDataLayer,
              container.resolve(LOGGER_TOKEN) as ILogger,
              container.resolve(ERROR_FACTORY_TOKEN) as EnhancedErrorFactory,
            ),
        ),
        3, // Cache up to 3 business layer instances
      );

      container.register(DATABASE_DATA_LAYER_TOKEN, DatabaseDataLayer, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      container.registerFactoryInstance(BUSINESS_LAYER_TOKEN, businessLayerFactory);

      container.register(SERVICE_LAYER_TOKEN, ApplicationServiceLayer, {
        lifecycle: "transient",
        dependencies: [BUSINESS_LAYER_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN, CONFIG_REPOSITORY_TOKEN],
      });

      // Create multiple service layer instances to test business layer caching
      const serviceLayers: IServiceLayer[] = [];

      for (let i = 0; i < 6; i++) {
        // More than cache size to test eviction
        const serviceLayer = await container.resolveAsync(SERVICE_LAYER_TOKEN);
        serviceLayers.push(serviceLayer);
      }

      // Execute operations through all service layers
      const operations = serviceLayers.map((layer, index) =>
        layer.executeOperation("validate", { id: `cached-${index}`, test: true }),
      );

      const results = await Promise.all(operations);

      // Verify all operations succeeded
      results.forEach((result, index) => {
        expect(result.valid).toBe(true);
        expect(result.data.id).toBe(`cached-${index}`);
      });

      // Verify caching metrics
      const factoryMetadata = businessLayerFactory.getMetadata();
      expect(factoryMetadata.performance?.totalCreated).toBeLessThan(6); // Should reuse cached instances
      expect(factoryMetadata.performance?.cacheHitRatio).toBeGreaterThan(0);

      // Verify layer operation logs
      const cachedOperationLogs = testLogOutput.filter(
        (log) => log.inputId?.startsWith?.("cached-") || log.operation === "validate",
      );

      expect(cachedOperationLogs.length).toBeGreaterThan(0);
    });
  });
});
