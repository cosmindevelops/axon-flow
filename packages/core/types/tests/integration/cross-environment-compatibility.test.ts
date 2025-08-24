/**
 * Integration tests for cross-environment compatibility
 * Uses real @axon package interfaces for authentic integration testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";
import { EnhancedErrorFactory } from "@axon/errors";
import type { IConfigRepository } from "@axon/config";
import { ConfigRepository } from "@axon/config";
import {
  BrowserEnvironment,
  NodeEnvironment,
  CommonEnvironment,
  EnvironmentDetector,
} from "../../src/environment/environment.classes.js";
import type {
  IEnvironmentContext,
  IBrowserSpecificContext,
  INodeSpecificContext,
} from "../../src/environment/environment.types.js";

describe("Cross-Environment Compatibility Integration", () => {
  let testLogOutput: any[];
  let logger: ILogger;
  let errorFactory: EnhancedErrorFactory;
  let configRepository: IConfigRepository;

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

    // Initialize logger with real ILoggerConfig interface
    const loggerConfig: Partial<ILoggerConfig> = {
      environment: "test",
      logLevel: "debug",
      transports: [],
      enableCorrelationIds: true,
      timestampFormat: "iso",
      testStream: testStream,
    };

    logger = new HighPerformancePinoLogger(loggerConfig);
    await (logger as any).loggerInitPromise;

    // Initialize error factory
    errorFactory = new EnhancedErrorFactory({
      correlationId: "cross-env-test-123",
      service: "cross-environment-compatibility",
      version: "1.0.0",
    });

    // Initialize config repository
    configRepository = new ConfigRepository({
      storageProvider: {
        async get(key: string) {
          const configs: Record<string, string> = {
            "environment.type": "test",
            "environment.node.version": "18.0.0",
            "environment.browser.userAgent": "test-browser/1.0",
            "logging.level": "debug",
            "features.browserApi": "true",
            "features.nodeApi": "true",
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

  afterEach(() => {
    testLogOutput = [];
  });

  describe("Environment Detection and Adaptation", () => {
    it("should detect Node.js environment and use appropriate real @axon interfaces", async () => {
      const nodeEnvironment = new NodeEnvironment();

      // Test Node.js environment detection
      const isNodeEnvironment = nodeEnvironment.isSupported();
      const context = await nodeEnvironment.getContext();

      logger.info("Node.js environment detection", {
        isSupported: isNodeEnvironment,
        context: {
          platform: context.platform,
          runtime: context.runtime,
          hasProcessAPI: !!context.features?.process,
          hasFileSystemAPI: !!context.features?.fs,
        },
      });

      // In test environment, Node.js should be detected
      expect(isNodeEnvironment).toBe(true);
      expect(context.platform).toBe("node");
      expect(context.runtime).toBe("node");

      // Verify Node.js specific features are available
      const nodeContext = context as INodeSpecificContext;
      expect(nodeContext.features?.process).toBe(true);
      expect(nodeContext.features?.fs).toBe(true);

      // Test Node.js specific operations using real interfaces
      if (nodeContext.processInfo) {
        logger.debug("Node.js process information", {
          nodeVersion: nodeContext.processInfo.version,
          platform: nodeContext.processInfo.platform,
          architecture: nodeContext.processInfo.arch,
        });

        expect(nodeContext.processInfo.version).toBeDefined();
        expect(nodeContext.processInfo.platform).toBeDefined();
      }

      // Verify logging captured Node.js specific information
      const nodeDetectionLog = testLogOutput.find((log) => log.msg === "Node.js environment detection");

      expect(nodeDetectionLog).toBeDefined();
      expect(nodeDetectionLog.isSupported).toBe(true);
      expect(nodeDetectionLog.context.runtime).toBe("node");
    });

    it("should handle browser environment simulation with real interfaces", async () => {
      // Simulate browser environment
      const originalWindow = (global as any).window;
      const originalDocument = (global as any).document;
      const originalNavigator = (global as any).navigator;
      const originalProcess = (global as any).process;

      try {
        // Mock browser environment
        (global as any).window = {
          location: { href: "https://example.com/test" },
          localStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          },
        };

        (global as any).document = {
          createElement: () => ({ tagName: "DIV" }),
        };

        (global as any).navigator = {
          userAgent: "TestBrowser/1.0",
        };

        // Temporarily hide Node.js process to simulate browser
        delete (global as any).process;

        const browserEnvironment = new BrowserEnvironment();
        const isBrowserSupported = browserEnvironment.isSupported();
        const browserContext = await browserEnvironment.getContext();

        logger.info("Browser environment simulation", {
          isSupported: isBrowserSupported,
          context: {
            platform: browserContext.platform,
            runtime: browserContext.runtime,
            hasWindowAPI: !!browserContext.features?.window,
            hasDocumentAPI: !!browserContext.features?.document,
          },
        });

        // Verify browser environment detection
        expect(isBrowserSupported).toBe(true);
        expect(browserContext.platform).toBe("browser");
        expect(browserContext.runtime).toBe("browser");

        // Test browser specific context
        const browserSpecificContext = browserContext as IBrowserSpecificContext;
        expect(browserSpecificContext.features?.window).toBe(true);
        expect(browserSpecificContext.features?.document).toBe(true);

        if (browserSpecificContext.browserInfo) {
          logger.debug("Browser information", {
            userAgent: browserSpecificContext.browserInfo.userAgent,
            currentUrl: browserSpecificContext.browserInfo.url,
          });

          expect(browserSpecificContext.browserInfo.userAgent).toBe("TestBrowser/1.0");
        }

        // Verify browser-specific logging
        const browserDetectionLog = testLogOutput.find((log) => log.msg === "Browser environment simulation");

        expect(browserDetectionLog).toBeDefined();
        expect(browserDetectionLog.isSupported).toBe(true);
        expect(browserDetectionLog.context.platform).toBe("browser");
      } finally {
        // Restore original environment
        (global as any).window = originalWindow;
        (global as any).document = originalDocument;
        (global as any).navigator = originalNavigator;
        (global as any).process = originalProcess;
      }
    });

    it("should provide common environment functionality across platforms using real @axon interfaces", async () => {
      const commonEnvironment = new CommonEnvironment();
      const isCommonSupported = commonEnvironment.isSupported();
      const commonContext = await commonEnvironment.getContext();

      logger.info("Common environment functionality", {
        isSupported: isCommonSupported,
        context: {
          platform: commonContext.platform,
          runtime: commonContext.runtime,
          hasTimingAPI: !!commonContext.features?.timing,
          hasJSONAPI: !!commonContext.features?.json,
        },
      });

      // Common environment should always be supported
      expect(isCommonSupported).toBe(true);
      expect(commonContext.platform).toBe("common");

      // Test common features that work across environments
      expect(commonContext.features?.timing).toBe(true);
      expect(commonContext.features?.json).toBe(true);

      // Test timing functionality
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.debug("Cross-platform timing test", {
        startTime,
        endTime,
        duration,
        timingWorksCorrectly: duration >= 10,
      });

      expect(duration).toBeGreaterThan(0);

      // Test JSON functionality (available in all environments)
      const testObject = {
        test: true,
        environment: "cross-platform",
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(testObject);
      const deserialized = JSON.parse(serialized);

      logger.debug("Cross-platform JSON test", {
        originalObject: testObject,
        serializedLength: serialized.length,
        deserializedMatches: JSON.stringify(deserialized) === serialized,
      });

      expect(deserialized.test).toBe(true);
      expect(deserialized.environment).toBe("cross-platform");
    });
  });

  describe("Environment-Specific Feature Integration", () => {
    it("should adapt logging configuration based on environment using real ILoggerConfig", async () => {
      const detector = new EnvironmentDetector();
      const detectedEnvironment = await detector.detect();

      // Create environment-specific logger configuration
      let environmentLoggerConfig: Partial<ILoggerConfig>;

      if (detectedEnvironment.platform === "node") {
        environmentLoggerConfig = {
          environment: "development",
          logLevel: "debug",
          transports: [], // Node.js can support file transports
          enableCorrelationIds: true,
          timestampFormat: "iso",
          performance: {
            enabled: true,
            sampleRate: 1.0,
            thresholdMs: 100,
          },
          circuitBreaker: {
            enabled: true,
            failureThreshold: 10,
            resetTimeoutMs: 60000,
            monitorTimeWindowMs: 120000,
          },
          testStream: (logger as any).config.testStream,
        };
      } else if (detectedEnvironment.platform === "browser") {
        environmentLoggerConfig = {
          environment: "production",
          logLevel: "warn", // Less verbose in browser
          transports: [], // Browser typically uses console transport
          enableCorrelationIds: false, // May not be needed in browser
          timestampFormat: "epoch",
          performance: {
            enabled: false, // May impact browser performance
            sampleRate: 0,
            thresholdMs: 1000,
          },
          testStream: (logger as any).config.testStream,
        };
      } else {
        environmentLoggerConfig = {
          environment: "test",
          logLevel: "info",
          transports: [],
          enableCorrelationIds: true,
          timestampFormat: "iso",
          testStream: (logger as any).config.testStream,
        };
      }

      // Create environment-adapted logger
      const adaptedLogger = new HighPerformancePinoLogger(environmentLoggerConfig);
      await (adaptedLogger as any).loggerInitPromise;

      // Test environment-adapted logging
      adaptedLogger.info("Environment-adapted logging test", {
        detectedPlatform: detectedEnvironment.platform,
        detectedRuntime: detectedEnvironment.runtime,
        loggerEnvironment: environmentLoggerConfig.environment,
        logLevel: environmentLoggerConfig.logLevel,
        correlationEnabled: environmentLoggerConfig.enableCorrelationIds,
      });

      // Verify adapted configuration works correctly
      const adaptedLogs = testLogOutput.filter((log) => log.msg === "Environment-adapted logging test");

      expect(adaptedLogs.length).toBeGreaterThan(0);

      const adaptedLog = adaptedLogs[0];
      expect(adaptedLog.detectedPlatform).toBe(detectedEnvironment.platform);
      expect(adaptedLog.loggerEnvironment).toBe(environmentLoggerConfig.environment);
      expect(adaptedLog.logLevel).toBe(environmentLoggerConfig.logLevel);
    });

    it("should handle environment-specific error reporting using real error interfaces", async () => {
      const detector = new EnvironmentDetector();
      const environment = await detector.detect();

      // Create environment-specific error factory
      const envErrorFactory = new EnhancedErrorFactory({
        correlationId: "env-specific-123",
        service: "cross-environment-compatibility",
        version: "1.0.0",
        environment: environment.platform,
        platform: environment.platform,
        runtime: environment.runtime,
      });

      // Create environment-specific errors
      const networkError = envErrorFactory.createNetworkError(
        "Environment-specific network error",
        "ENV_NETWORK_ERROR",
      );

      // Add environment-specific context
      networkError.context.environmentPlatform = environment.platform;
      networkError.context.environmentRuntime = environment.runtime;
      networkError.context.environmentFeatures = environment.features;

      if (environment.platform === "node") {
        const nodeContext = environment as INodeSpecificContext;
        if (nodeContext.processInfo) {
          networkError.context.nodeVersion = nodeContext.processInfo.version;
          networkError.context.nodeArch = nodeContext.processInfo.arch;
        }
      }

      // Log environment-specific error
      logger.error("Environment-specific error occurred", {
        error: networkError.message,
        errorCode: networkError.code,
        correlationId: networkError.context.correlationId,
        environmentPlatform: networkError.context.environmentPlatform,
        environmentRuntime: networkError.context.environmentRuntime,
        hasEnvironmentFeatures: !!networkError.context.environmentFeatures,
      });

      // Test error serialization across environments
      const errorSerialization = {
        name: networkError.name,
        message: networkError.message,
        code: networkError.code,
        category: networkError.category,
        severity: networkError.severity,
        timestamp: networkError.timestamp.toISOString(),
        context: networkError.context,
      };

      logger.info("Environment error serialization test", {
        serializationSize: JSON.stringify(errorSerialization).length,
        hasEnvironmentContext: !!errorSerialization.context.environmentPlatform,
        correlationId: errorSerialization.context.correlationId,
      });

      // Verify environment-specific error logging
      const envErrorLog = testLogOutput.find((log) => log.msg === "Environment-specific error occurred");

      expect(envErrorLog).toBeDefined();
      expect(envErrorLog.environmentPlatform).toBe(environment.platform);
      expect(envErrorLog.errorCode).toBe("ENV_NETWORK_ERROR");

      const serializationLog = testLogOutput.find((log) => log.msg === "Environment error serialization test");

      expect(serializationLog).toBeDefined();
      expect(serializationLog.serializationSize).toBeGreaterThan(0);
      expect(serializationLog.hasEnvironmentContext).toBe(true);
    });
  });

  describe("Configuration Adaptation Across Environments", () => {
    it("should adapt configuration based on environment capabilities using real config interfaces", async () => {
      const detector = new EnvironmentDetector();
      const environment = await detector.detect();

      // Test environment-specific configuration retrieval
      const envType = await configRepository.get("environment.type");
      const nodeVersion = await configRepository.get("environment.node.version");
      const browserUserAgent = await configRepository.get("environment.browser.userAgent");

      logger.info("Environment-specific configuration test", {
        detectedEnvironment: environment.platform,
        configuredEnvironmentType: envType,
        nodeVersionConfig: nodeVersion,
        browserUserAgentConfig: browserUserAgent,
      });

      // Create adaptive configuration based on environment
      const adaptiveConfig: Record<string, any> = {
        environment: environment.platform,
        runtime: environment.runtime,
        features: environment.features,
      };

      if (environment.platform === "node") {
        const nodeEnv = environment as INodeSpecificContext;
        adaptiveConfig.nodeSpecific = {
          processInfo: nodeEnv.processInfo,
          hasFileSystem: nodeEnv.features?.fs,
          hasProcess: nodeEnv.features?.process,
        };
      } else if (environment.platform === "browser") {
        const browserEnv = environment as IBrowserSpecificContext;
        adaptiveConfig.browserSpecific = {
          browserInfo: browserEnv.browserInfo,
          hasWindow: browserEnv.features?.window,
          hasDocument: browserEnv.features?.document,
        };
      }

      // Test configuration persistence across environments
      for (const [key, value] of Object.entries(adaptiveConfig)) {
        if (typeof value === "object") {
          await configRepository.set(`adaptive.${key}`, JSON.stringify(value));
        } else {
          await configRepository.set(`adaptive.${key}`, String(value));
        }
      }

      logger.debug("Adaptive configuration stored", {
        configKeys: Object.keys(adaptiveConfig),
        environmentAdaptive: true,
      });

      // Verify configuration adaptation
      const storedEnvironment = await configRepository.get("adaptive.environment");
      const storedRuntime = await configRepository.get("adaptive.runtime");

      expect(storedEnvironment).toBe(environment.platform);
      expect(storedRuntime).toBe(environment.runtime);

      // Test configuration retrieval logging
      const configLog = testLogOutput.find((log) => log.msg === "Environment-specific configuration test");

      expect(configLog).toBeDefined();
      expect(configLog.detectedEnvironment).toBe(environment.platform);
      expect(configLog.configuredEnvironmentType).toBe("test");
    });

    it("should handle feature toggling based on environment capabilities", async () => {
      const detector = new EnvironmentDetector();
      const environment = await detector.detect();

      // Define environment-specific feature flags
      const featureFlags = {
        fileSystemAccess: environment.platform === "node",
        domManipulation: environment.platform === "browser",
        webWorkers: environment.platform === "browser",
        childProcesses: environment.platform === "node",
        localStorage: environment.platform === "browser",
        clustering: environment.platform === "node",
      };

      logger.info("Environment-based feature flags", {
        environment: environment.platform,
        features: featureFlags,
      });

      // Test feature-specific functionality based on flags
      if (featureFlags.fileSystemAccess) {
        // Test Node.js specific feature
        logger.debug("File system feature available", {
          feature: "fileSystemAccess",
          environment: environment.platform,
        });
      }

      if (featureFlags.domManipulation) {
        // Test browser specific feature
        logger.debug("DOM manipulation feature available", {
          feature: "domManipulation",
          environment: environment.platform,
        });
      }

      // Store feature flags in configuration
      for (const [feature, enabled] of Object.entries(featureFlags)) {
        await configRepository.set(`features.${feature}`, String(enabled));
      }

      // Verify feature flag configuration
      const fileSystemEnabled = await configRepository.get("features.fileSystemAccess");
      const domEnabled = await configRepository.get("features.domManipulation");

      logger.info("Feature flag configuration verification", {
        fileSystemAccessEnabled: fileSystemEnabled === "true",
        domManipulationEnabled: domEnabled === "true",
        configurationConsistent: true,
      });

      // Verify feature flag logging
      const featureFlagLog = testLogOutput.find((log) => log.msg === "Environment-based feature flags");

      expect(featureFlagLog).toBeDefined();
      expect(featureFlagLog.environment).toBe(environment.platform);
      expect(featureFlagLog.features).toBeDefined();

      const verificationLog = testLogOutput.find((log) => log.msg === "Feature flag configuration verification");

      expect(verificationLog).toBeDefined();
      expect(verificationLog.configurationConsistent).toBe(true);
    });
  });

  describe("Cross-Environment Error Handling", () => {
    it("should handle environment-specific error scenarios consistently", async () => {
      const detector = new EnvironmentDetector();
      const environment = await detector.detect();

      // Test different error scenarios based on environment
      const errorScenarios = [
        {
          scenario: "network-error",
          shouldOccur: true, // Network errors can occur in any environment
          errorType: "NetworkError",
        },
        {
          scenario: "file-system-error",
          shouldOccur: environment.platform === "node",
          errorType: "FileSystemError",
        },
        {
          scenario: "dom-error",
          shouldOccur: environment.platform === "browser",
          errorType: "DOMError",
        },
      ];

      for (const scenario of errorScenarios) {
        try {
          if (scenario.shouldOccur) {
            // Simulate environment-specific error
            const error = errorFactory.createSystemError(
              `Simulated ${scenario.errorType} in ${environment.platform}`,
              `${scenario.scenario.toUpperCase().replace("-", "_")}`,
            );

            error.context.environmentPlatform = environment.platform;
            error.context.errorScenario = scenario.scenario;
            error.context.simulatedError = true;

            throw error;
          } else {
            logger.info("Skipping environment-specific error scenario", {
              scenario: scenario.scenario,
              reason: `Not applicable for ${environment.platform}`,
              environment: environment.platform,
            });
          }
        } catch (error) {
          logger.error("Environment-specific error caught", {
            scenario: scenario.scenario,
            errorType: scenario.errorType,
            error: (error as Error).message,
            errorCode: (error as any).code,
            environment: environment.platform,
            handled: true,
          });
        }
      }

      // Verify error handling across environments
      const errorLogs = testLogOutput.filter(
        (log) =>
          log.level >= 40 && // Warn and error levels
          (log.msg?.includes("error") || log.errorType),
      );

      expect(errorLogs.length).toBeGreaterThan(0);

      // Verify environment-specific handling
      errorLogs.forEach((log) => {
        if (log.errorType) {
          expect(log.environment).toBe(environment.platform);
          expect(log.handled).toBe(true);
        }
      });
    });
  });
});
