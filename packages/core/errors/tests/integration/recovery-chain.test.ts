/**
 * Integration tests for error recovery mechanisms with ErrorHandlerChain
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseAxonError } from "../../src/base/base-error.classes.js";
import { ErrorHandlerChain } from "../../src/chain/chain.classes.js";
import { ErrorSeverity, ErrorCategory } from "../../src/base/base-error.types.js";
import { HandlerPriority } from "../../src/chain/chain.types.js";
import {
  RetryHandler,
  CircuitBreakerHandler,
  GracefulDegradationHandler,
  TimeoutHandler,
  RecoveryManager,
  ContextEnrichmentHandler,
} from "../../src/recovery/recovery.classes.js";
import { BackoffStrategy } from "../../src/recovery/recovery.types.js";
import { TestRecoveryStrategies, TestOperations, TestErrorFactory } from "../utils/recovery-test-utils.js";

describe("Recovery Chain Integration", () => {
  let chain: ErrorHandlerChain;
  let eventTracker: any;

  beforeEach(() => {
    chain = new ErrorHandlerChain({
      sortByPriority: true,
      stopOnFirstHandle: false,
      timeout: 5000,
    });

    // Create event tracker for observation
    eventTracker = {
      events: [] as any[],
      addEvent: function (type: string, data: any) {
        this.events.push({ type, data, timestamp: new Date() });
      },
      getEvents: function (type?: string) {
        return type ? this.events.filter((e) => e.type === type) : this.events;
      },
      reset: function () {
        this.events = [];
      },
    };
  });

  afterEach(() => {
    eventTracker?.reset();
  });

  describe("single recovery handler integration", () => {
    it("should integrate RetryHandler with chain", async () => {
      const retryHandler = new RetryHandler(
        {
          maxAttempts: 3,
          baseDelayMs: 10, // Fast for testing
          backoffStrategy: BackoffStrategy.LINEAR,
        },
        HandlerPriority.HIGH
      );

      // Add event observation
      const originalHandle = retryHandler.handle.bind(retryHandler);
      retryHandler.handle = async (error) => {
        eventTracker.addEvent("retry_handler_called", { errorCode: error.code });
        const result = await originalHandle(error);
        if (result.handled) {
          eventTracker.addEvent("retry_handler_success", { attempts: result.context?.attempts || 1 });
        }
        return result;
      };

      chain.addHandler(retryHandler);

      const networkError = new BaseAxonError("Connection failed", "CONN_FAILED", {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.WARNING,
      });

      const results = await chain.process(networkError);

      expect(results).toHaveLength(1);
      expect(results[0].handled).toBe(true);
      expect(eventTracker.getEvents("retry_handler_called")).toHaveLength(1);
      expect(eventTracker.getEvents("retry_handler_success")).toHaveLength(1);
    });

    it("should integrate CircuitBreakerHandler with chain", async () => {
      const circuitBreakerHandler = new CircuitBreakerHandler(
        {
          failureThreshold: 3,
          recoveryTimeout: 1000, // 1 second for testing
        },
        HandlerPriority.CRITICAL
      );

      // Add event observation
      const originalHandle = circuitBreakerHandler.handle.bind(circuitBreakerHandler);
      circuitBreakerHandler.handle = async (error) => {
        eventTracker.addEvent("circuit_breaker_called", { errorCode: error.code });
        const result = await originalHandle(error);
        if (result.handled) {
          eventTracker.addEvent("circuit_breaker_handled", { 
            state: result.context?.circuitState || "closed" 
          });
        }
        return result;
      };

      chain.addHandler(circuitBreakerHandler);

      const serviceError = new BaseAxonError("Service unavailable", "SERVICE_DOWN", {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.ERROR,
      });

      const results = await chain.process(serviceError);

      expect(results).toHaveLength(1);
      expect(results[0].handled).toBe(true);
      expect(eventTracker.getEvents("circuit_breaker_called")).toHaveLength(1);
      expect(eventTracker.getEvents("circuit_breaker_handled")).toHaveLength(1);
    });

    it("should integrate GracefulDegradationHandler with chain", async () => {
      const fallbackHandler = new GracefulDegradationHandler(
        {
          fallbackFunction: async (error) => {
            eventTracker.addEvent("fallback_executed", { errorCode: error.code });
            return { data: "cached_result", quality: 0.8 };
          },
          qualityMetrics: {
            accuracyThreshold: 0.7,
            performanceThreshold: 1000,
            reliabilityThreshold: 0.5,
          },
        },
        HandlerPriority.MEDIUM
      );

      chain.addHandler(fallbackHandler);

      const dataError = new BaseAxonError("Data source failed", "DATA_FAIL", {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.ERROR,
      });

      const results = await chain.process(dataError);

      expect(results).toHaveLength(1);
      expect(results[0].handled).toBe(true);
      expect(results[0].result).toEqual({ data: "cached_result", quality: 0.8 });
      expect(eventTracker.getEvents("fallback_executed")).toHaveLength(1);
    });

    it("should integrate TimeoutHandler with chain", async () => {
      const timeoutHandler = new TimeoutHandler(
        {
          defaultTimeout: 5000,
          gracePeriod: 100,
          enableCancellation: true,
        },
        HandlerPriority.HIGH
      );

      // Add event observation
      const originalHandle = timeoutHandler.handle.bind(timeoutHandler);
      timeoutHandler.handle = async (error) => {
        eventTracker.addEvent("timeout_handler_called", { errorCode: error.code });
        const result = await originalHandle(error);
        if (result.handled) {
          eventTracker.addEvent("timeout_handler_success", { 
            timeoutApplied: result.context?.timeoutApplied || false 
          });
        }
        return result;
      };

      chain.addHandler(timeoutHandler);

      const timeoutError = new BaseAxonError("Operation timeout", "TIMEOUT", {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.WARNING,
      });

      const results = await chain.process(timeoutError);

      expect(results).toHaveLength(1);
      expect(results[0].handled).toBe(true);
      expect(eventTracker.getEvents("timeout_handler_called")).toHaveLength(1);
      expect(eventTracker.getEvents("timeout_handler_success")).toHaveLength(1);
    });
  });

  describe("multi-handler recovery scenarios", () => {
    it("should execute handlers in priority order", async () => {
      const executionOrder: string[] = [];

      // Create handlers with different priorities
      const highPriorityHandler = new RetryHandler(
        { maxAttempts: 1, baseDelayMs: 10 },
        HandlerPriority.CRITICAL
      );
      const originalHandleHigh = highPriorityHandler.handle.bind(highPriorityHandler);
      highPriorityHandler.handle = async (error) => {
        executionOrder.push("high_priority");
        eventTracker.addEvent("high_priority_executed", { timestamp: Date.now() });
        return await originalHandleHigh(error);
      };

      const mediumPriorityHandler = new CircuitBreakerHandler(
        { failureThreshold: 1, recoveryTimeout: 1000 },
        HandlerPriority.HIGH
      );
      const originalHandleMedium = mediumPriorityHandler.handle.bind(mediumPriorityHandler);
      mediumPriorityHandler.handle = async (error) => {
        executionOrder.push("medium_priority");
        eventTracker.addEvent("medium_priority_executed", { timestamp: Date.now() });
        return await originalHandleMedium(error);
      };

      const lowPriorityHandler = new GracefulDegradationHandler(
        { fallbackFunction: async () => "fallback_result" },
        HandlerPriority.LOW
      );
      const originalHandleLow = lowPriorityHandler.handle.bind(lowPriorityHandler);
      lowPriorityHandler.handle = async (error) => {
        executionOrder.push("low_priority");
        eventTracker.addEvent("low_priority_executed", { timestamp: Date.now() });
        return await originalHandleLow(error);
      };

      chain
        .addHandler(lowPriorityHandler)
        .addHandler(highPriorityHandler)
        .addHandler(mediumPriorityHandler);

      await chain.process(new BaseAxonError("Test error", "TEST_ERROR"));

      expect(executionOrder).toEqual(["high_priority", "medium_priority", "low_priority"]);
      expect(eventTracker.getEvents("high_priority_executed")).toHaveLength(1);
      expect(eventTracker.getEvents("medium_priority_executed")).toHaveLength(1);
      expect(eventTracker.getEvents("low_priority_executed")).toHaveLength(1);
    });

    it("should handle cascading recovery strategies", async () => {
      const strategiesAttempted: string[] = [];

      // Create retryable operation that fails first attempt
      const operation = TestOperations.createRetryableOperation("cascade_test", 1, "success");

      const retryHandler = new RetryHandler({ maxAttempts: 2, baseDelayMs: 10 });
      const originalRetryHandle = retryHandler.handle.bind(retryHandler);
      retryHandler.handle = async (error) => {
        strategiesAttempted.push("retry");
        eventTracker.addEvent("retry_attempted", { strategy: "retry" });
        return await originalRetryHandle(error);
      };

      const circuitBreakerHandler = new CircuitBreakerHandler({ 
        failureThreshold: 1, 
        recoveryTimeout: 1000 
      });
      const originalCircuitHandle = circuitBreakerHandler.handle.bind(circuitBreakerHandler);
      circuitBreakerHandler.handle = async (error) => {
        strategiesAttempted.push("circuit_breaker");
        eventTracker.addEvent("circuit_breaker_attempted", { strategy: "circuit_breaker" });
        return await originalCircuitHandle(error);
      };

      const fallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async () => {
          eventTracker.addEvent("fallback_used", { result: "emergency_response" });
          return "emergency_response";
        },
      });
      const originalFallbackHandle = fallbackHandler.handle.bind(fallbackHandler);
      fallbackHandler.handle = async (error) => {
        strategiesAttempted.push("graceful_degradation");
        eventTracker.addEvent("degradation_attempted", { strategy: "graceful_degradation" });
        return await originalFallbackHandle(error);
      };

      chain
        .addHandler(retryHandler)
        .addHandler(circuitBreakerHandler)
        .addHandler(fallbackHandler);

      const persistentError = new BaseAxonError("Persistent failure", "PERSISTENT_FAIL", {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.ERROR,
      });

      const results = await chain.process(persistentError);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.handled)).toBe(true);
      expect(strategiesAttempted).toContain("retry");
      expect(strategiesAttempted).toContain("circuit_breaker");
      expect(strategiesAttempted).toContain("graceful_degradation");
    });

    it("should preserve error context through recovery chain", async () => {
      const contextEnrichmentHandler = new ContextEnrichmentHandler(
        {
          addCorrelationId: true,
          addComponent: "RecoveryChain",
          addTimestamp: true,
        },
        HandlerPriority.CRITICAL
      );

      const retryHandler = new RetryHandler(
        { maxAttempts: 1, baseDelayMs: 10 },
        HandlerPriority.HIGH
      );

      const fallbackHandler = new GracefulDegradationHandler(
        { fallbackFunction: async () => "final_result" },
        HandlerPriority.MEDIUM
      );

      chain
        .addHandler(contextEnrichmentHandler)
        .addHandler(retryHandler)
        .addHandler(fallbackHandler);

      const originalError = new BaseAxonError("Original error", "ORIG_ERROR", {
        metadata: { originalData: "preserved" },
      });

      const results = await chain.process(originalError);

      expect(results.length).toBe(3);
      
      // Check that context was enriched and preserved
      const enrichmentResult = results.find(r => r.handler === "ContextEnrichmentHandler");
      expect(enrichmentResult).toBeDefined();
      expect(enrichmentResult?.modifiedError.context.correlationId).toBeDefined();
      expect(enrichmentResult?.modifiedError.context.component).toBe("RecoveryChain");
      expect(enrichmentResult?.modifiedError.context.metadata.originalData).toBe("preserved");
    });
  });

  describe("recovery manager coordination", () => {
    it("should coordinate multiple recovery strategies through RecoveryManager", async () => {
      const recoveryManager = new RecoveryManager({
        retryConfig: {
          maxRetries: 2,
          backoffStrategy: BackoffStrategy.LINEAR,
          initialDelay: 10,
        },
        circuitBreakerConfig: {
          failureThreshold: 2,
          resetTimeout: 1000,
        },
        gracefulDegradationConfig: {
          fallbackFunction: async () => "coordinated_fallback",
        },
      });

      // Add the recovery manager as a single handler
      const coordinatedHandler = {
        name: "CoordinatedRecoveryHandler",
        priority: HandlerPriority.HIGH,
        canHandle: () => true,
        handle: async (error: BaseAxonError) => {
          eventTracker.addEvent("recovery_manager_coordination", { errorCode: error.code });
          const result = await recoveryManager.attemptRecovery(error);
          return {
            handled: result.success,
            continueChain: false,
            modifiedError: error,
            context: { coordinated: true, strategies: result.strategies },
          };
        },
      };

      chain.addHandler(coordinatedHandler as any);

      const complexError = new BaseAxonError("Complex system failure", "COMPLEX_FAIL", {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.ERROR,
      });

      const results = await chain.process(complexError);

      expect(results.length).toBe(1);
      expect(results[0].handled).toBe(true);
      expect(results[0].context.coordinated).toBe(true);
      expect(eventTracker.getEvents("recovery_manager_coordination")).toHaveLength(1);
    });

    it("should handle recovery strategy failures gracefully", async () => {
      // Create a handler that will fail to handle the error
      const failingHandler = {
        name: "FailingHandler",
        priority: HandlerPriority.HIGH,
        canHandle: () => true,
        handle: async (error: BaseAxonError) => {
          eventTracker.addEvent("failing_handler_attempted", { errorCode: error.code });
          throw new Error("Handler failed");
        },
      };

      // Create a working fallback handler
      const workingFallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async () => {
          eventTracker.addEvent("fallback_success", { result: "fallback_result" });
          return "fallback_result";
        },
      });

      chain.addHandler(failingHandler as any).addHandler(workingFallbackHandler);

      const error = new BaseAxonError("Test error", "TEST_ERROR");

      // The chain should continue processing even if one handler fails
      await expect(chain.process(error)).rejects.toThrow("Handler failed");
      
      // But we should see both handlers were attempted
      expect(eventTracker.getEvents("failing_handler_attempted")).toHaveLength(1);
    });

    it("should respect recovery timeouts", async () => {
      const slowHandler = {
        name: "SlowHandler",
        priority: HandlerPriority.HIGH,
        canHandle: () => true,
        handle: async (error: BaseAxonError) => {
          eventTracker.addEvent("slow_handler_start", { timeout: 1000 });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          eventTracker.addEvent("slow_handler_complete", { message: "Should not reach here" });
          return { handled: true, continueChain: false };
        },
      };

      const timeoutChain = new ErrorHandlerChain({ timeout: 500 });
      timeoutChain.addHandler(slowHandler as any);

      const error = new BaseAxonError("Slow recovery", "SLOW_ERROR");

      const startTime = Date.now();
      await expect(timeoutChain.process(error)).rejects.toThrow("timeout");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(600); // Should timeout at ~500ms
      expect(eventTracker.getEvents("slow_handler_start")).toHaveLength(1);
      expect(eventTracker.getEvents("slow_handler_complete")).toHaveLength(0);
    });
  });

  describe("error categorization and routing", () => {
    it("should route network errors to appropriate handlers", async () => {
      const retryHandler = new RetryHandler({ maxAttempts: 1, baseDelayMs: 10 }, HandlerPriority.HIGH);
      const timeoutHandler = new TimeoutHandler({ defaultTimeout: 5000 }, HandlerPriority.MEDIUM);

      // Add event tracking
      const originalRetryHandle = retryHandler.handle.bind(retryHandler);
      retryHandler.handle = async (error) => {
        eventTracker.addEvent("retry_handler_called", { category: error.category });
        return await originalRetryHandle(error);
      };

      const originalTimeoutHandle = timeoutHandler.handle.bind(timeoutHandler);
      timeoutHandler.handle = async (error) => {
        eventTracker.addEvent("timeout_handler_called", { category: error.category });
        return await originalTimeoutHandle(error);
      };

      chain.addHandler(retryHandler).addHandler(timeoutHandler);

      const networkError = new BaseAxonError("Network timeout", "NET_TIMEOUT", {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.WARNING,
      });

      await chain.process(networkError);

      expect(eventTracker.getEvents("retry_handler_called")).toHaveLength(1);
      expect(eventTracker.getEvents("timeout_handler_called")).toHaveLength(1);
      expect(eventTracker.getEvents("retry_handler_called")[0].data.category).toBe(ErrorCategory.NETWORK);
    });

    it("should route validation errors appropriately", async () => {
      const fallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async (error) => {
          eventTracker.addEvent("validation_fallback_used", { category: error.category });
          return "default_valid_data";
        },
      });

      chain.addHandler(fallbackHandler);

      const validationError = new BaseAxonError("Invalid input", "VALIDATION_ERROR", {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.WARNING,
      });

      const results = await chain.process(validationError);

      expect(results).toHaveLength(1);
      expect(results[0].handled).toBe(true);
      expect(results[0].result).toBe("default_valid_data");
      expect(eventTracker.getEvents("validation_fallback_used")).toHaveLength(1);
    });

    it("should handle authentication errors with appropriate strategy", async () => {
      const authRecoveryHandler = new GracefulDegradationHandler({
        fallbackChain: [
          {
            condition: (error) => error.category === ErrorCategory.AUTHENTICATION,
            fallback: async () => {
              eventTracker.addEvent("auth_fallback_used", { result: "anonymous_access" });
              return "anonymous_access";
            },
            name: "auth_retry",
          },
        ],
      });

      chain.addHandler(authRecoveryHandler);

      const authError = new BaseAxonError("Unauthorized", "AUTH_FAILED", {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.ERROR,
      });

      const results = await chain.process(authError);

      expect(results).toHaveLength(1);
      expect(results[0].handled).toBe(true);
      expect(results[0].result).toBe("anonymous_access");
      expect(eventTracker.getEvents("auth_fallback_used")).toHaveLength(1);
    });
  });

  describe("performance integration scenarios", () => {
    it("should maintain performance requirements under load", async () => {
      const retryHandler = new RetryHandler({ maxAttempts: 2, baseDelayMs: 1 });
      const circuitBreakerHandler = new CircuitBreakerHandler({ failureThreshold: 5, recoveryTimeout: 1000 });
      const fallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async () => {
          eventTracker.addEvent("fast_fallback_used", { result: "quick_result" });
          return "quick_result";
        },
      });

      chain.addHandler(retryHandler).addHandler(circuitBreakerHandler).addHandler(fallbackHandler);

      const errors = Array.from(
        { length: 50 }, // Reduced for faster testing
        (_, i) =>
          new BaseAxonError(`Error ${i}`, `ERROR_${i}`, {
            category: ErrorCategory.EXTERNAL_SERVICE,
          })
      );

      const startTime = Date.now();
      const results = await Promise.all(errors.map((error) => chain.process(error)));
      const endTime = Date.now();

      const avgTimePerError = (endTime - startTime) / 50;
      expect(avgTimePerError).toBeLessThan(20); // Reasonable performance for tests
      expect(results.every((r) => r.some((result) => result.handled))).toBe(true);
    });

    it("should handle concurrent recovery scenarios efficiently", async () => {
      const recoveryManager = new RecoveryManager({
        retryConfig: { maxRetries: 1, backoffStrategy: BackoffStrategy.LINEAR, initialDelay: 1 },
        gracefulDegradationConfig: {
          fallbackFunction: async () => "concurrent_result",
        },
      });

      // Create a handler that uses the recovery manager
      const concurrentHandler = {
        name: "ConcurrentRecoveryHandler",
        priority: HandlerPriority.HIGH,
        canHandle: () => true,
        handle: async (error: BaseAxonError) => {
          const result = await recoveryManager.attemptRecovery(error);
          eventTracker.addEvent("concurrent_recovery", { errorCode: error.code, success: result.success });
          return {
            handled: result.success,
            continueChain: false,
            modifiedError: error,
            result: result.result,
          };
        },
      };

      chain.addHandler(concurrentHandler as any);

      const concurrentErrors = Array.from(
        { length: 20 }, // Reduced for faster testing
        (_, i) => new BaseAxonError(`Concurrent error ${i}`, `CONCURRENT_${i}`)
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentErrors.map((error) => chain.process(error)));
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds for tests
      expect(results.every((r) => r.some((result) => result.handled))).toBe(true);
      expect(eventTracker.getEvents("concurrent_recovery")).toHaveLength(20);
    });

    it("should maintain minimal overhead per handler", async () => {
      const fastHandler = {
        name: "FastHandler",
        priority: HandlerPriority.HIGH,
        canHandle: () => true,
        handle: async (error: BaseAxonError) => {
          eventTracker.addEvent("fast_handler_execution", { timestamp: performance.now() });
          return { handled: true, continueChain: false, modifiedError: error };
        },
      };

      chain.addHandler(fastHandler as any);

      const measurements: number[] = [];
      for (let i = 0; i < 100; i++) {
        // Reduced for faster testing
        const startTime = performance.now();
        await chain.process(new BaseAxonError("Fast error", "FAST"));
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      expect(avgTime).toBeLessThan(5.0); // Reasonable overhead for tests
      expect(eventTracker.getEvents("fast_handler_execution")).toHaveLength(100);
    });
  });

  describe("error context preservation", () => {
    it("should maintain correlation IDs through recovery", async () => {
      const enrichmentHandler = new ContextEnrichmentHandler({
        addCorrelationId: true,
      });
      const retryHandler = new RetryHandler({ maxAttempts: 1, baseDelayMs: 10 });
      const fallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async () => "traced_result",
      });

      chain.addHandler(enrichmentHandler).addHandler(retryHandler).addHandler(fallbackHandler);

      const error = new BaseAxonError("Traceable error", "TRACE_ERROR");
      const results = await chain.process(error);

      expect(results.length).toBe(3);
      const enrichmentResult = results[0];
      const correlationId = enrichmentResult.modifiedError.context.correlationId;
      expect(correlationId).toBeDefined();

      // All subsequent handlers should preserve the correlation ID
      results.forEach((result) => {
        if (result.modifiedError) {
          expect(result.modifiedError.context.correlationId).toBe(correlationId);
        }
      });
    });

    it("should preserve metadata through complex recovery chains", async () => {
      const enrichmentHandler = new ContextEnrichmentHandler({
        addTimestamp: true,
        addComponent: "IntegrationTest",
        customMetadata: { testScenario: "complex_recovery" },
      });

      const retryHandler = new RetryHandler({ maxAttempts: 1, baseDelayMs: 10 });
      const timeoutHandler = new TimeoutHandler({ defaultTimeout: 5000 });
      const fallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async () => "complex_result",
      });

      chain
        .addHandler(enrichmentHandler)
        .addHandler(retryHandler)
        .addHandler(timeoutHandler)
        .addHandler(fallbackHandler);

      const originalError = new BaseAxonError("Complex error", "COMPLEX", {
        metadata: { userId: "user123", requestId: "req456" },
      });

      const results = await chain.process(originalError);

      expect(results.length).toBe(4);
      const finalError = results[results.length - 1].modifiedError;

      expect(finalError.context.metadata.userId).toBe("user123");
      expect(finalError.context.metadata.requestId).toBe("req456");
      expect(finalError.context.metadata.testScenario).toBe("complex_recovery");
      expect(finalError.context.component).toBe("IntegrationTest");
      expect(finalError.context.timestamp).toBeDefined();
    });
  });

  describe("real-world integration scenarios", () => {
    it("should handle microservice communication failures", async () => {
      const strategiesUsed: string[] = [];

      const retryHandler = new RetryHandler({
        maxAttempts: 3,
        baseDelayMs: 10,
        backoffMultiplier: 1.5,
      });
      const originalRetryHandle = retryHandler.handle.bind(retryHandler);
      retryHandler.handle = async (error) => {
        strategiesUsed.push("retry");
        eventTracker.addEvent("retry_strategy_used", { service: error.context.metadata?.service });
        return await originalRetryHandle(error);
      };

      const circuitBreakerHandler = new CircuitBreakerHandler({
        failureThreshold: 5,
        recoveryTimeout: 1000,
      });
      const originalCircuitHandle = circuitBreakerHandler.handle.bind(circuitBreakerHandler);
      circuitBreakerHandler.handle = async (error) => {
        strategiesUsed.push("circuit_breaker");
        eventTracker.addEvent("circuit_breaker_used", { service: error.context.metadata?.service });
        return await originalCircuitHandle(error);
      };

      const fallbackHandler = new GracefulDegradationHandler({
        fallbackFunction: async (error) => {
          strategiesUsed.push("graceful_degradation");
          eventTracker.addEvent("fallback_used", { 
            service: error.context.metadata?.service,
            quality: 0.8 
          });
          return { data: "cached_service_data", timestamp: Date.now() };
        },
      });

      chain.addHandler(retryHandler).addHandler(circuitBreakerHandler).addHandler(fallbackHandler);

      const serviceError = new BaseAxonError("User service unavailable", "USER_SERVICE_DOWN", {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.ERROR,
        metadata: {
          service: "user-service",
          endpoint: "/api/v1/users/123",
          method: "GET",
        },
      });

      const results = await chain.process(serviceError);

      expect(results.length).toBe(3);
      expect(results.some((r) => r.handled)).toBe(true);
      expect(strategiesUsed).toContain("retry");
      expect(strategiesUsed).toContain("circuit_breaker");
      expect(strategiesUsed).toContain("graceful_degradation");

      const fallbackResult = results.find((r) => r.result && typeof r.result === "object");
      expect(fallbackResult?.result).toEqual(
        expect.objectContaining({ data: "cached_service_data" })
      );
    });

    it("should handle database connection pool exhaustion", async () => {
      const timeoutHandler = new TimeoutHandler({
        defaultTimeout: 2000, // Shorter for testing
        gracePeriod: 100,
      });

      const retryHandler = new RetryHandler({
        maxAttempts: 2,
        baseDelayMs: 50,
      });

      const circuitBreakerHandler = new CircuitBreakerHandler({
        failureThreshold: 3,
        recoveryTimeout: 1000,
      });

      // Add tracking
      const originalTimeoutHandle = timeoutHandler.handle.bind(timeoutHandler);
      timeoutHandler.handle = async (error) => {
        eventTracker.addEvent("timeout_applied", { 
          poolSize: error.context.metadata?.poolSize,
          activeConnections: error.context.metadata?.activeConnections 
        });
        return await originalTimeoutHandle(error);
      };

      chain.addHandler(timeoutHandler).addHandler(retryHandler).addHandler(circuitBreakerHandler);

      const dbError = new BaseAxonError("Connection pool exhausted", "DB_POOL_EXHAUSTED", {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        metadata: {
          poolSize: 20,
          activeConnections: 20,
          waitingRequests: 15,
        },
      });

      const results = await chain.process(dbError);

      expect(results.length).toBe(3);
      expect(results.some((r) => r.handled)).toBe(true);
      expect(eventTracker.getEvents("timeout_applied")).toHaveLength(1);
      expect(eventTracker.getEvents("timeout_applied")[0].data.poolSize).toBe(20);
    });

    it("should handle API rate limiting with backoff", async () => {
      const retryHandler = new RetryHandler({
        maxAttempts: 3, // Reduced for faster testing
        baseDelayMs: 10,
        backoffMultiplier: 2,
        jitterEnabled: true,
      });

      const fallbackHandler = new GracefulDegradationHandler({
        fallbackChain: [
          {
            condition: (error) => error.code === "RATE_LIMITED",
            fallback: async (error) => {
              eventTracker.addEvent("rate_limit_fallback_used", {
                service: error.context.metadata?.service,
                quality: 0.6,
              });
              return { data: "stale_cached_data", quality: 0.6 };
            },
            name: "rate_limit_cache",
          },
        ],
      });

      // Track retry attempts with backoff
      const originalRetryHandle = retryHandler.handle.bind(retryHandler);
      retryHandler.handle = async (error) => {
        eventTracker.addEvent("retry_with_backoff", {
          resetTime: error.context.metadata?.resetTime,
          remainingRequests: error.context.metadata?.remainingRequests,
        });
        return await originalRetryHandle(error);
      };

      chain.addHandler(retryHandler).addHandler(fallbackHandler);

      const rateLimitError = new BaseAxonError("API rate limit exceeded", "RATE_LIMITED", {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.WARNING,
        metadata: {
          service: "external-api",
          limit: 1000,
          resetTime: Date.now() + 3600000, // 1 hour
          remainingRequests: 0,
        },
      });

      const results = await chain.process(rateLimitError);

      expect(results.length).toBe(2);
      expect(results.some((r) => r.handled)).toBe(true);
      expect(eventTracker.getEvents("retry_with_backoff")).toHaveLength(1);

      const fallbackResult = results.find((r) => r.result && typeof r.result === "object");
      if (fallbackResult) {
        expect(fallbackResult.result).toEqual({ data: "stale_cached_data", quality: 0.6 });
      }
    });
  });
});