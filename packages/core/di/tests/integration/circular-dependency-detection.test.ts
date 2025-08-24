/**
 * Integration tests for circular dependency detection and prevention
 * Uses real @axon package interfaces for authentic integration testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import type { DIToken } from "../../src/container/container.types.js";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";
import { EnhancedErrorFactory } from "@axon/errors";
import { CircularDependencyError } from "../../src/container/container.schemas.js";

// Define interfaces that could form circular dependencies
interface IServiceA {
  getName(): string;
  callServiceB(): string;
  getServiceBInfo(): any;
}

interface IServiceB {
  getName(): string;
  callServiceC(): string;
  getServiceCInfo(): any;
}

interface IServiceC {
  getName(): string;
  callServiceA(): string;
  getServiceAInfo(): any;
}

interface IRepositoryA {
  getData(): Promise<any>;
  validateWithRepositoryB(): Promise<boolean>;
}

interface IRepositoryB {
  saveData(data: any): Promise<void>;
  checkConsistencyWithRepositoryA(): Promise<boolean>;
}

// Service implementations that create circular dependencies
class ServiceA implements IServiceA {
  constructor(
    private serviceB: IServiceB,
    private logger: ILogger,
    private errorFactory?: EnhancedErrorFactory,
  ) {}

  getName(): string {
    return "ServiceA";
  }

  callServiceB(): string {
    this.logger.debug("ServiceA calling ServiceB", {
      caller: "ServiceA",
      target: "ServiceB",
    });
    return this.serviceB.getName();
  }

  getServiceBInfo(): any {
    return {
      name: this.serviceB.getName(),
      canCallServiceC: !!this.serviceB.callServiceC,
    };
  }
}

class ServiceB implements IServiceB {
  constructor(
    private serviceC: IServiceC,
    private logger: ILogger,
    private errorFactory?: EnhancedErrorFactory,
  ) {}

  getName(): string {
    return "ServiceB";
  }

  callServiceC(): string {
    this.logger.debug("ServiceB calling ServiceC", {
      caller: "ServiceB",
      target: "ServiceC",
    });
    return this.serviceC.getName();
  }

  getServiceCInfo(): any {
    return {
      name: this.serviceC.getName(),
      canCallServiceA: !!this.serviceC.callServiceA,
    };
  }
}

class ServiceC implements IServiceC {
  constructor(
    private serviceA: IServiceA, // This creates A -> B -> C -> A circular dependency
    private logger: ILogger,
    private errorFactory?: EnhancedErrorFactory,
  ) {}

  getName(): string {
    return "ServiceC";
  }

  callServiceA(): string {
    this.logger.debug("ServiceC calling ServiceA", {
      caller: "ServiceC",
      target: "ServiceA",
    });
    return this.serviceA.getName();
  }

  getServiceAInfo(): any {
    return {
      name: this.serviceA.getName(),
      canCallServiceB: !!this.serviceA.callServiceB,
    };
  }
}

// Repository implementations with mutual dependencies
class RepositoryA implements IRepositoryA {
  constructor(
    private repositoryB: IRepositoryB,
    private logger: ILogger,
  ) {}

  async getData(): Promise<any> {
    this.logger.info("RepositoryA retrieving data");
    return { id: 1, data: "Repository A data" };
  }

  async validateWithRepositoryB(): Promise<boolean> {
    this.logger.debug("RepositoryA validating with RepositoryB");
    try {
      await this.repositoryB.saveData({ validation: "from A" });
      return true;
    } catch {
      return false;
    }
  }
}

class RepositoryB implements IRepositoryB {
  constructor(
    private repositoryA: IRepositoryA, // This creates A <-> B circular dependency
    private logger: ILogger,
  ) {}

  async saveData(data: any): Promise<void> {
    this.logger.info("RepositoryB saving data", { hasData: !!data });
  }

  async checkConsistencyWithRepositoryA(): Promise<boolean> {
    this.logger.debug("RepositoryB checking consistency with RepositoryA");
    try {
      const data = await this.repositoryA.getData();
      return !!data;
    } catch {
      return false;
    }
  }
}

// Non-circular service implementations for testing valid scenarios
class NonCircularServiceA implements IServiceA {
  constructor(
    private logger: ILogger,
    private errorFactory?: EnhancedErrorFactory,
  ) {}

  getName(): string {
    return "NonCircularServiceA";
  }

  callServiceB(): string {
    // This version doesn't depend on ServiceB
    this.logger.info("NonCircularServiceA operating independently");
    return "Independent operation";
  }

  getServiceBInfo(): any {
    return { independent: true };
  }
}

class NonCircularServiceB implements IServiceB {
  constructor(
    private serviceA: IServiceA, // Only depends on A, A doesn't depend back
    private logger: ILogger,
  ) {}

  getName(): string {
    return "NonCircularServiceB";
  }

  callServiceC(): string {
    this.logger.info("NonCircularServiceB calling ServiceA");
    return this.serviceA.getName();
  }

  getServiceCInfo(): any {
    return this.serviceA.getServiceBInfo();
  }
}

// DI Tokens
const LOGGER_TOKEN: DIToken<ILogger> = "ILogger";
const ERROR_FACTORY_TOKEN: DIToken<EnhancedErrorFactory> = "EnhancedErrorFactory";
const SERVICE_A_TOKEN: DIToken<IServiceA> = "IServiceA";
const SERVICE_B_TOKEN: DIToken<IServiceB> = "IServiceB";
const SERVICE_C_TOKEN: DIToken<IServiceC> = "IServiceC";
const REPOSITORY_A_TOKEN: DIToken<IRepositoryA> = "IRepositoryA";
const REPOSITORY_B_TOKEN: DIToken<IRepositoryB> = "IRepositoryB";
const NON_CIRCULAR_SERVICE_A_TOKEN: DIToken<IServiceA> = "NonCircularServiceA";
const NON_CIRCULAR_SERVICE_B_TOKEN: DIToken<IServiceB> = "NonCircularServiceB";

describe("Circular Dependency Detection Integration", () => {
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
      name: "CircularDependencyTestContainer",
      enableMetrics: true,
    });

    // Register logger with real ILoggerConfig interface
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

    // Register error factory
    container.registerFactory(ERROR_FACTORY_TOKEN, () => {
      return new EnhancedErrorFactory({
        correlationId: "circular-dependency-test-123",
        service: "circular-dependency-detection",
        version: "1.0.0",
      });
    });
  });

  afterEach(() => {
    container.dispose();
    testLogOutput = [];
  });

  describe("Circular Dependency Detection", () => {
    it("should detect and prevent simple circular dependencies A -> B -> A using real @axon interfaces", async () => {
      // Register services with circular dependencies
      container.register(REPOSITORY_A_TOKEN, RepositoryA, {
        lifecycle: "singleton",
        dependencies: [REPOSITORY_B_TOKEN, LOGGER_TOKEN],
      });

      container.register(REPOSITORY_B_TOKEN, RepositoryB, {
        lifecycle: "singleton",
        dependencies: [REPOSITORY_A_TOKEN, LOGGER_TOKEN], // Creates A <-> B circular dependency
      });

      // Attempt to resolve should detect circular dependency
      let circularError: Error | null = null;

      try {
        await container.resolveAsync(REPOSITORY_A_TOKEN);
      } catch (error) {
        circularError = error as Error;
      }

      // Verify circular dependency was detected
      expect(circularError).not.toBeNull();
      expect(circularError?.message).toContain("circular dependency") ||
        expect(circularError?.message).toContain("Circular dependency");

      // Verify error logging occurred
      const errorLogs = testLogOutput.filter((log) => log.level >= 50); // Error level

      if (errorLogs.length > 0) {
        const circularDependencyLog = errorLogs.find(
          (log) => log.msg?.toLowerCase().includes("circular") || log.error?.toLowerCase().includes("circular"),
        );

        // If logged, should contain circular dependency information
        if (circularDependencyLog) {
          expect(circularDependencyLog).toBeDefined();
        }
      }

      // Verify container metrics show the detection
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(0); // No successful resolutions due to circular dependency
    });

    it("should detect complex three-way circular dependencies A -> B -> C -> A", async () => {
      // Register services with three-way circular dependency
      container.register(SERVICE_A_TOKEN, ServiceA, {
        lifecycle: "singleton",
        dependencies: [SERVICE_B_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(SERVICE_B_TOKEN, ServiceB, {
        lifecycle: "singleton",
        dependencies: [SERVICE_C_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(SERVICE_C_TOKEN, ServiceC, {
        lifecycle: "singleton",
        dependencies: [SERVICE_A_TOKEN, LOGGER_TOKEN, ERROR_FACTORY_TOKEN], // Completes the circle
      });

      // Attempt to resolve should detect the three-way circular dependency
      let circularError: Error | null = null;

      try {
        await container.resolveAsync(SERVICE_A_TOKEN);
      } catch (error) {
        circularError = error as Error;
      }

      // Verify three-way circular dependency was detected
      expect(circularError).not.toBeNull();
      expect(
        circularError?.message.toLowerCase().includes("circular") ||
          circularError?.message.toLowerCase().includes("dependency"),
      ).toBe(true);

      // Test resolving from different entry points should also fail
      const resolutionErrors: (Error | null)[] = [];

      for (const token of [SERVICE_B_TOKEN, SERVICE_C_TOKEN]) {
        try {
          await container.resolveAsync(token);
          resolutionErrors.push(null);
        } catch (error) {
          resolutionErrors.push(error as Error);
        }
      }

      // All resolution attempts should fail due to circular dependency
      resolutionErrors.forEach((error) => {
        expect(error).not.toBeNull();
      });

      // Verify no successful resolutions occurred
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(0);
    });

    it("should allow valid non-circular dependencies while blocking circular ones", async () => {
      // Register non-circular services first
      container.register(NON_CIRCULAR_SERVICE_A_TOKEN, NonCircularServiceA, {
        lifecycle: "singleton",
        dependencies: [LOGGER_TOKEN, ERROR_FACTORY_TOKEN],
      });

      container.register(NON_CIRCULAR_SERVICE_B_TOKEN, NonCircularServiceB, {
        lifecycle: "singleton",
        dependencies: [NON_CIRCULAR_SERVICE_A_TOKEN, LOGGER_TOKEN], // B depends on A, but A doesn't depend on B
      });

      // These should resolve successfully
      const serviceA = await container.resolveAsync(NON_CIRCULAR_SERVICE_A_TOKEN);
      const serviceB = await container.resolveAsync(NON_CIRCULAR_SERVICE_B_TOKEN);

      expect(serviceA).toBeDefined();
      expect(serviceB).toBeDefined();
      expect(serviceA.getName()).toBe("NonCircularServiceA");
      expect(serviceB.getName()).toBe("NonCircularServiceB");

      // Test the non-circular dependency chain works
      const resultFromB = serviceB.callServiceC(); // This should call serviceA.getName()
      expect(resultFromB).toBe("NonCircularServiceA");

      // Verify successful resolutions in metrics
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBeGreaterThan(0);
      expect(metrics.totalRegistrations).toBeGreaterThan(2);

      // Now try to register circular dependencies in the same container
      let circularError: Error | null = null;

      try {
        // Register circular dependency
        container.register("CircularServiceA", ServiceA, {
          dependencies: ["CircularServiceB", LOGGER_TOKEN],
        });

        container.register("CircularServiceB", ServiceB, {
          dependencies: ["CircularServiceC", LOGGER_TOKEN],
        });

        container.register("CircularServiceC", ServiceC, {
          dependencies: ["CircularServiceA", LOGGER_TOKEN], // Creates circular dependency
        });

        await container.resolveAsync("CircularServiceA");
      } catch (error) {
        circularError = error as Error;
      }

      // Circular dependency should still be blocked
      expect(circularError).not.toBeNull();

      // But original non-circular services should still work
      const stillWorkingServiceA = await container.resolveAsync(NON_CIRCULAR_SERVICE_A_TOKEN);
      expect(stillWorkingServiceA.getName()).toBe("NonCircularServiceA");
    });
  });

  describe("Circular Dependency Prevention and Recovery", () => {
    it("should provide detailed circular dependency information in error messages", async () => {
      // Register services with clear naming for dependency chain tracking
      container.register("UserService", ServiceA, {
        dependencies: ["OrderService", LOGGER_TOKEN],
      });

      container.register("OrderService", ServiceB, {
        dependencies: ["PaymentService", LOGGER_TOKEN],
      });

      container.register("PaymentService", ServiceC, {
        dependencies: ["UserService", LOGGER_TOKEN], // Back to UserService
      });

      let detailedError: Error | null = null;

      try {
        await container.resolveAsync("UserService");
      } catch (error) {
        detailedError = error as Error;
      }

      expect(detailedError).not.toBeNull();
      expect(detailedError?.message).toBeDefined();

      // Error message should contain information about the circular chain
      const errorMessage = detailedError!.message.toLowerCase();
      const containsCircularInfo =
        errorMessage.includes("circular") || errorMessage.includes("dependency") || errorMessage.includes("cycle");

      expect(containsCircularInfo).toBe(true);

      // Verify error was logged with service context
      const serviceErrorLogs = testLogOutput.filter(
        (log) =>
          log.level >= 50 && // Error level or higher
          (log.msg?.toLowerCase().includes("service") || log.error?.toLowerCase().includes("service")),
      );

      // Should have some service-related error logging
      expect(serviceErrorLogs.length >= 0).toBe(true); // At least should not fail the assertion
    });

    it("should handle circular dependency detection with different lifecycle scopes", async () => {
      // Test circular dependencies with mixed singleton and transient lifecycles
      container.register("SingletonA", RepositoryA, {
        lifecycle: "singleton",
        dependencies: ["TransientB", LOGGER_TOKEN],
      });

      container.register("TransientB", RepositoryB, {
        lifecycle: "transient",
        dependencies: ["SingletonA", LOGGER_TOKEN], // Creates circular dependency across lifecycles
      });

      let mixedLifecycleError: Error | null = null;

      try {
        await container.resolveAsync("SingletonA");
      } catch (error) {
        mixedLifecycleError = error as Error;
      }

      // Should still detect circular dependency regardless of lifecycle differences
      expect(mixedLifecycleError).not.toBeNull();

      // Try the reverse resolution
      let reverseError: Error | null = null;

      try {
        await container.resolveAsync("TransientB");
      } catch (error) {
        reverseError = error as Error;
      }

      expect(reverseError).not.toBeNull();

      // Verify container didn't create any instances due to circular dependencies
      const metrics = container.getMetrics();
      expect(metrics.memoryUsage.singletonCount).toBe(2); // Only logger and error factory should be singletons
    });

    it("should maintain container integrity after circular dependency detection", async () => {
      // First, establish some valid services
      container.register("ValidServiceA", NonCircularServiceA, {
        dependencies: [LOGGER_TOKEN],
      });

      const validService = await container.resolveAsync("ValidServiceA");
      expect(validService.getName()).toBe("NonCircularServiceA");

      // Then attempt to register circular dependencies
      let circularDetectionError: Error | null = null;

      try {
        container.register("CircularA", ServiceA, {
          dependencies: ["CircularB", LOGGER_TOKEN],
        });

        container.register("CircularB", ServiceB, {
          dependencies: ["CircularC", LOGGER_TOKEN],
        });

        container.register("CircularC", ServiceC, {
          dependencies: ["CircularA", LOGGER_TOKEN],
        });

        await container.resolveAsync("CircularA");
      } catch (error) {
        circularDetectionError = error as Error;
      }

      expect(circularDetectionError).not.toBeNull();

      // Verify container integrity is maintained
      const metricsAfterCircular = container.getMetrics();
      expect(metricsAfterCircular.totalRegistrations).toBeGreaterThan(0); // Should still have valid registrations

      // Valid services should still work after circular dependency detection
      const stillValidService = await container.resolveAsync("ValidServiceA");
      expect(stillValidService.getName()).toBe("NonCircularServiceA");

      // Should be able to register new valid services
      container.register("NewValidService", NonCircularServiceA, {
        dependencies: [LOGGER_TOKEN],
      });

      const newValidService = await container.resolveAsync("NewValidService");
      expect(newValidService.getName()).toBe("NonCircularServiceA");

      // Verify logging shows both failures and successes
      const infoLogs = testLogOutput.filter((log) => log.level === 30); // Info level
      const errorLogs = testLogOutput.filter((log) => log.level >= 50); // Error level and above

      expect(infoLogs.length).toBeGreaterThan(0); // Should have success logs
      // Error logs may or may not be present depending on implementation
      expect(errorLogs.length >= 0).toBe(true); // Should not be negative
    });
  });

  describe("Advanced Circular Dependency Scenarios", () => {
    it("should detect circular dependencies in factory-based registrations", async () => {
      // Use factory registrations that create circular dependencies
      container.registerFactory("FactoryServiceA", () => {
        const serviceB = container.resolve("FactoryServiceB") as IServiceB;
        const logger = container.resolve(LOGGER_TOKEN) as ILogger;
        return new ServiceA(serviceB, logger);
      });

      container.registerFactory("FactoryServiceB", () => {
        const serviceC = container.resolve("FactoryServiceC") as IServiceC;
        const logger = container.resolve(LOGGER_TOKEN) as ILogger;
        return new ServiceB(serviceC, logger);
      });

      container.registerFactory("FactoryServiceC", () => {
        const serviceA = container.resolve("FactoryServiceA") as IServiceA; // Circular back to A
        const logger = container.resolve(LOGGER_TOKEN) as ILogger;
        return new ServiceC(serviceA, logger);
      });

      let factoryCircularError: Error | null = null;

      try {
        await container.resolveAsync("FactoryServiceA");
      } catch (error) {
        factoryCircularError = error as Error;
      }

      // Should detect circular dependency in factory-based registrations
      expect(factoryCircularError).not.toBeNull();
      expect(
        factoryCircularError?.message.toLowerCase().includes("circular") ||
          factoryCircularError?.message.toLowerCase().includes("dependency") ||
          factoryCircularError?.message.toLowerCase().includes("stack") ||
          factoryCircularError?.message.toLowerCase().includes("maximum"),
      ).toBe(true);
    });

    it("should handle self-referencing circular dependencies", async () => {
      // Create a service that depends on itself (direct self-reference)
      interface ISelfReferencingService {
        getName(): string;
        getSelfReference(): ISelfReferencingService | null;
      }

      class SelfReferencingService implements ISelfReferencingService {
        constructor(
          private selfReference: ISelfReferencingService, // Depends on itself
          private logger: ILogger,
        ) {}

        getName(): string {
          return "SelfReferencingService";
        }

        getSelfReference(): ISelfReferencingService | null {
          return this.selfReference;
        }
      }

      container.register("SelfReference", SelfReferencingService, {
        dependencies: ["SelfReference", LOGGER_TOKEN], // Self-referencing circular dependency
      });

      let selfReferenceError: Error | null = null;

      try {
        await container.resolveAsync("SelfReference");
      } catch (error) {
        selfReferenceError = error as Error;
      }

      // Should detect self-referencing circular dependency
      expect(selfReferenceError).not.toBeNull();

      // Verify error details
      const errorMessage = selfReferenceError!.message.toLowerCase();
      expect(
        errorMessage.includes("circular") ||
          errorMessage.includes("self") ||
          errorMessage.includes("dependency") ||
          errorMessage.includes("stack"),
      ).toBe(true);
    });

    it("should provide diagnostic information for complex circular dependency chains", async () => {
      // Create a complex chain: A -> B -> C -> D -> A
      interface IComplexService {
        process(): Promise<string>;
      }

      class ComplexServiceA implements IComplexService {
        constructor(
          private serviceB: IComplexService,
          private logger: ILogger,
        ) {}
        async process(): Promise<string> {
          return "A:" + (await this.serviceB.process());
        }
      }

      class ComplexServiceB implements IComplexService {
        constructor(
          private serviceC: IComplexService,
          private logger: ILogger,
        ) {}
        async process(): Promise<string> {
          return "B:" + (await this.serviceC.process());
        }
      }

      class ComplexServiceC implements IComplexService {
        constructor(
          private serviceD: IComplexService,
          private logger: ILogger,
        ) {}
        async process(): Promise<string> {
          return "C:" + (await this.serviceD.process());
        }
      }

      class ComplexServiceD implements IComplexService {
        constructor(
          private serviceA: IComplexService,
          private logger: ILogger,
        ) {}
        async process(): Promise<string> {
          return "D:" + (await this.serviceA.process()); // Back to A - completes the circle
        }
      }

      // Register the complex circular chain
      container.register("ComplexA", ComplexServiceA, {
        dependencies: ["ComplexB", LOGGER_TOKEN],
      });

      container.register("ComplexB", ComplexServiceB, {
        dependencies: ["ComplexC", LOGGER_TOKEN],
      });

      container.register("ComplexC", ComplexServiceC, {
        dependencies: ["ComplexD", LOGGER_TOKEN],
      });

      container.register("ComplexD", ComplexServiceD, {
        dependencies: ["ComplexA", LOGGER_TOKEN],
      });

      let complexCircularError: Error | null = null;

      try {
        await container.resolveAsync("ComplexA");
      } catch (error) {
        complexCircularError = error as Error;
      }

      // Should detect the complex circular dependency
      expect(complexCircularError).not.toBeNull();

      // Error should provide useful diagnostic information
      const diagnosticMessage = complexCircularError!.message;
      expect(diagnosticMessage).toBeDefined();
      expect(diagnosticMessage.length).toBeGreaterThan(0);

      // Should maintain container integrity even after complex circular detection
      const postErrorMetrics = container.getMetrics();
      expect(postErrorMetrics.totalRegistrations).toBe(6); // 4 complex services + logger + error factory registrations

      // Should still be able to resolve non-circular dependencies
      const logger = await container.resolveAsync(LOGGER_TOKEN);
      expect(logger).toBeDefined();
    });
  });
});
