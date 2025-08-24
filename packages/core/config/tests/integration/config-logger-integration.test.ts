/**
 * Integration tests for configuration and logger system integration
 * Uses real @axon package interfaces for authentic integration testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConfigRepository } from "../../src/repositories/base/base.classes.js";
import { ConfigFactory } from "../../src/builders/factory/factory.classes.js";
import { ApplicationConfigBuilder } from "../../src/builders/application/application.classes.js";
import type { IConfigRepository, IConfigFactory } from "../../src/index.js";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";

describe("Config-Logger Integration", () => {
  let configRepository: IConfigRepository;
  let configFactory: IConfigFactory;
  let logger: ILogger;
  let testLogOutput: any[];

  beforeEach(async () => {
    // Initialize test log capture
    testLogOutput = [];

    // Create test stream to capture Pino output
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

    // Create logger with real ILoggerConfig interface
    const loggerConfig: Partial<ILoggerConfig> = {
      environment: "test",
      logLevel: "debug",
      transports: [],
      enableCorrelationIds: true,
      timestampFormat: "iso",
      testStream,
      performance: {
        enabled: false,
        sampleRate: 0,
        thresholdMs: 1000,
      },
      circuitBreaker: {
        enabled: false,
        failureThreshold: 10,
        resetTimeoutMs: 60000,
        monitorTimeWindowMs: 120000,
      },
      objectPool: {
        enabled: false,
        initialSize: 0,
        maxSize: 0,
        growthFactor: 1,
      },
    };

    logger = new HighPerformancePinoLogger(loggerConfig);
    await (logger as any).loggerInitPromise;

    // Initialize config system with real interfaces
    configRepository = new ConfigRepository({
      storageProvider: {
        async get(key: string) {
          const configs = {
            "app.database.url": "postgresql://localhost:5432/testdb",
            "app.database.maxConnections": "20",
            "app.logging.level": "debug",
            "app.logging.enableCorrelation": "true",
            "app.service.name": "test-service",
            "app.service.version": "1.0.0",
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

    configFactory = new ConfigFactory(configRepository);
  });

  afterEach(() => {
    testLogOutput = [];
  });

  describe("Configuration System Integration with Logger", () => {
    it("should create application config and log configuration events using real ILogger interface", async () => {
      const appBuilder = new ApplicationConfigBuilder(configRepository);

      // Configure application with database settings
      const appConfig = await appBuilder
        .withName("test-integration-app")
        .withVersion("1.0.0")
        .withEnvironment("test")
        .withDatabaseConfig({
          url: "postgresql://localhost:5432/testdb",
          maxConnections: 20,
          enableSSL: false,
        })
        .build();

      // Log configuration creation using real logger interface
      logger.info("Application configuration created", {
        appName: appConfig.name,
        version: appConfig.version,
        environment: appConfig.environment,
      });

      logger.debug("Database configuration details", {
        databaseUrl: appConfig.database?.url,
        maxConnections: appConfig.database?.maxConnections,
        sslEnabled: appConfig.database?.enableSSL,
      });

      // Verify configuration was created properly
      expect(appConfig.name).toBe("test-integration-app");
      expect(appConfig.version).toBe("1.0.0");
      expect(appConfig.environment).toBe("test");
      expect(appConfig.database?.url).toBe("postgresql://localhost:5432/testdb");

      // Verify logger captured configuration events
      expect(testLogOutput).toHaveLength(2);

      const infoLog = testLogOutput.find((log) => log.msg === "Application configuration created");
      const debugLog = testLogOutput.find((log) => log.msg === "Database configuration details");

      expect(infoLog).toBeDefined();
      expect(infoLog.appName).toBe("test-integration-app");
      expect(infoLog.version).toBe("1.0.0");
      expect(infoLog.environment).toBe("test");

      expect(debugLog).toBeDefined();
      expect(debugLog.databaseUrl).toBe("postgresql://localhost:5432/testdb");
      expect(debugLog.maxConnections).toBe(20);
      expect(debugLog.sslEnabled).toBe(false);
    });

    it("should handle configuration validation errors and log them using real logger methods", async () => {
      const appBuilder = new ApplicationConfigBuilder(configRepository);

      try {
        // Attempt to create invalid configuration
        await appBuilder
          .withName("") // Invalid empty name
          .withVersion("invalid-version-format")
          .withEnvironment("invalid-env" as any)
          .build();
      } catch (error) {
        // Log validation error using real logger interface
        logger.error("Configuration validation failed", {
          error: (error as Error).message,
          errorType: (error as Error).constructor.name,
          validationContext: "application-config",
        });

        logger.warn("Falling back to default configuration", {
          fallbackReason: "validation-error",
          originalError: (error as Error).message,
        });
      }

      // Verify error logging
      expect(testLogOutput.length).toBeGreaterThan(0);

      const errorLog = testLogOutput.find((log) => log.msg === "Configuration validation failed");
      const warnLog = testLogOutput.find((log) => log.msg === "Falling back to default configuration");

      expect(errorLog).toBeDefined();
      expect(errorLog.level).toBe(50); // Error level
      expect(errorLog.errorType).toBeDefined();
      expect(errorLog.validationContext).toBe("application-config");

      expect(warnLog).toBeDefined();
      expect(warnLog.level).toBe(40); // Warn level
      expect(warnLog.fallbackReason).toBe("validation-error");
    });

    it("should integrate config factory with logger for configuration lifecycle tracking", async () => {
      // Create multiple configurations with logging
      const configs = [
        { type: "database", key: "app.database.url", value: "postgresql://localhost:5432/db1" },
        { type: "database", key: "app.database.maxConnections", value: "50" },
        { type: "logging", key: "app.logging.level", value: "info" },
        { type: "service", key: "app.service.timeout", value: "30000" },
      ];

      for (const config of configs) {
        logger.debug("Creating configuration entry", {
          configType: config.type,
          configKey: config.key,
          hasValue: !!config.value,
        });

        const configEntry = await configFactory.createConfig(config.key, config.value);

        logger.info("Configuration entry created successfully", {
          configId: configEntry.key,
          configType: config.type,
          timestamp: configEntry.lastUpdated,
        });
      }

      // Verify all configurations were logged properly
      expect(testLogOutput.length).toBe(configs.length * 2); // Debug + Info for each config

      const debugLogs = testLogOutput.filter((log) => log.msg === "Creating configuration entry");
      const infoLogs = testLogOutput.filter((log) => log.msg === "Configuration entry created successfully");

      expect(debugLogs).toHaveLength(configs.length);
      expect(infoLogs).toHaveLength(configs.length);

      // Verify log content
      debugLogs.forEach((log, index) => {
        expect(log.configType).toBe(configs[index].type);
        expect(log.configKey).toBe(configs[index].key);
        expect(log.hasValue).toBe(true);
      });

      infoLogs.forEach((log, index) => {
        expect(log.configId).toBe(configs[index].key);
        expect(log.configType).toBe(configs[index].type);
        expect(log.timestamp).toBeDefined();
      });
    });
  });

  describe("Logger Configuration Integration", () => {
    it("should configure logger based on config repository settings", async () => {
      // Get logging configuration from config repository
      const logLevel = await configRepository.get("app.logging.level");
      const enableCorrelation = await configRepository.get("app.logging.enableCorrelation");

      // Create new logger with config-driven settings
      const dynamicLoggerConfig: Partial<ILoggerConfig> = {
        environment: "test",
        logLevel: (logLevel as any) || "info",
        enableCorrelationIds: enableCorrelation === "true",
        timestampFormat: "iso",
        testStream: (logger as any).config.testStream,
      };

      const dynamicLogger = new HighPerformancePinoLogger(dynamicLoggerConfig);
      await (dynamicLogger as any).loggerInitPromise;

      // Test logging with config-driven logger
      dynamicLogger.debug("Config-driven logger test", {
        configuredLevel: logLevel,
        correlationEnabled: enableCorrelation === "true",
        source: "config-integration-test",
      });

      dynamicLogger.info("Logger configuration validation", {
        logLevel: dynamicLoggerConfig.logLevel,
        enableCorrelationIds: dynamicLoggerConfig.enableCorrelationIds,
        environment: dynamicLoggerConfig.environment,
      });

      // Verify config-driven logging works
      expect(testLogOutput.length).toBeGreaterThan(0);

      const configuredLogs = testLogOutput.filter(
        (log) => log.source === "config-integration-test" || log.msg === "Logger configuration validation",
      );

      expect(configuredLogs.length).toBeGreaterThan(0);

      configuredLogs.forEach((log) => {
        if (enableCorrelation === "true") {
          expect(log).toHaveProperty("correlationId");
        }
      });
    });

    it("should handle logger configuration changes at runtime", async () => {
      // Log initial configuration
      logger.info("Initial logger configuration", {
        initialLevel: (logger as any).config.logLevel,
        correlationEnabled: (logger as any).config.enableCorrelationIds,
      });

      // Update configuration in repository
      await configRepository.set("app.logging.level", "error");
      await configRepository.set("app.logging.enableCorrelation", "false");

      // Log configuration change
      logger.warn("Logger configuration updated", {
        oldLevel: "debug",
        newLevel: "error",
        correlationPreviouslyEnabled: true,
        correlationNowEnabled: false,
        changeReason: "runtime-update",
      });

      // Create new logger instance with updated config
      const updatedLogLevel = await configRepository.get("app.logging.level");
      const updatedCorrelation = await configRepository.get("app.logging.enableCorrelation");

      const updatedConfig: Partial<ILoggerConfig> = {
        environment: "test",
        logLevel: (updatedLogLevel as any) || "error",
        enableCorrelationIds: updatedCorrelation === "true",
        timestampFormat: "iso",
        testStream: (logger as any).config.testStream,
      };

      const updatedLogger = new HighPerformancePinoLogger(updatedConfig);
      await (updatedLogger as any).loggerInitPromise;

      // Test that debug logs are filtered out with error level
      updatedLogger.debug("This debug log should not appear");
      updatedLogger.error("This error log should appear", {
        testConfigUpdate: true,
        newLogLevel: updatedLogLevel,
        correlationDisabled: updatedCorrelation !== "true",
      });

      // Verify configuration updates worked
      const configUpdateLog = testLogOutput.find((log) => log.msg === "Logger configuration updated");

      const errorLog = testLogOutput.find((log) => log.msg === "This error log should appear");

      const debugLog = testLogOutput.find((log) => log.msg === "This debug log should not appear");

      expect(configUpdateLog).toBeDefined();
      expect(configUpdateLog.oldLevel).toBe("debug");
      expect(configUpdateLog.newLevel).toBe("error");
      expect(configUpdateLog.changeReason).toBe("runtime-update");

      expect(errorLog).toBeDefined();
      expect(errorLog.testConfigUpdate).toBe(true);

      // Debug log should not appear due to error level filtering
      expect(debugLog).toBeUndefined();
    });
  });

  describe("Cross-Package Integration Scenarios", () => {
    it("should integrate config validation with logger error reporting", async () => {
      const invalidConfigs = [
        { key: "app.database.maxConnections", value: "not-a-number" },
        { key: "app.service.timeout", value: "-1000" },
        { key: "app.logging.level", value: "invalid-level" },
      ];

      for (const config of invalidConfigs) {
        try {
          logger.debug("Attempting to create configuration", {
            configKey: config.key,
            configValue: config.value,
            validationStage: "pre-validation",
          });

          // Attempt to create config (this might validate the value)
          await configFactory.createConfig(config.key, config.value);
        } catch (error) {
          logger.error("Configuration creation failed", {
            configKey: config.key,
            error: (error as Error).message,
            errorType: (error as Error).constructor.name,
            invalidValue: config.value,
            validationStage: "creation",
          });

          // Log recovery action
          logger.info("Applying default configuration value", {
            configKey: config.key,
            rejectedValue: config.value,
            recoveryAction: "use-default",
          });
        }
      }

      // Verify error logging and recovery tracking
      const errorLogs = testLogOutput.filter((log) => log.msg === "Configuration creation failed");

      const recoveryLogs = testLogOutput.filter((log) => log.msg === "Applying default configuration value");

      expect(errorLogs.length).toBeGreaterThan(0);
      expect(recoveryLogs.length).toBeGreaterThan(0);

      errorLogs.forEach((log) => {
        expect(log.configKey).toBeDefined();
        expect(log.error).toBeDefined();
        expect(log.invalidValue).toBeDefined();
        expect(log.validationStage).toBe("creation");
      });

      recoveryLogs.forEach((log) => {
        expect(log.configKey).toBeDefined();
        expect(log.rejectedValue).toBeDefined();
        expect(log.recoveryAction).toBe("use-default");
      });
    });
  });
});
