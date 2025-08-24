/**
 * Unit tests for GracefulDegradationHandler recovery mechanism
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseAxonError } from "../../../src/base/base-error.classes.js";
import { ErrorSeverity, ErrorCategory } from "../../../src/base/base-error.types.js";
import { GracefulDegradationHandler } from "../../../src/recovery/recovery.classes.js";
import type { IGracefulDegradationConfig } from "../../../src/recovery/recovery.types.js";
import { HandlerPriority } from "../../../src/chain/chain.types.js";
import {
  TestRecoveryStrategies,
  TestOperations,
  TestErrors,
  TestErrorFactory,
} from "../../utils/recovery-test-utils.js";

describe("GracefulDegradationHandler", () => {
  let degradationHandler: GracefulDegradationHandler;
  let testError: BaseAxonError;
  let eventTracker: any;

  beforeEach(() => {
    testError = new BaseAxonError("Service unavailable", "SERVICE_UNAVAILABLE", {
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.EXTERNAL_SERVICE,
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

  describe("constructor", () => {
    it("should create GracefulDegradationHandler with default configuration", () => {
      const config: IGracefulDegradationConfig = {
        fallbackFunction: async () => "default_value",
      };
      const handler = new GracefulDegradationHandler(config);

      expect(handler).toBeInstanceOf(GracefulDegradationHandler);
      expect(handler.name).toBe("GracefulDegradationHandler");
      expect(handler.priority).toBe(HandlerPriority.LOW);
      expect(handler.canHandle(testError)).toBe(true);
    });

    it("should create GracefulDegradationHandler with custom configuration", () => {
      const fallback1 = {
        condition: (error: BaseAxonError) => error.code === "SERVICE_UNAVAILABLE",
        fallback: async () => "service_fallback",
        name: "service-fallback",
      };
      const fallback2 = {
        condition: (error: BaseAxonError) => error.severity === ErrorSeverity.ERROR,
        fallback: async () => "error_fallback",
        name: "error-fallback",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [fallback1, fallback2],
        fallbackTimeout: 2000,
        logFallbackUsage: true,
        qualityMetrics: {
          accuracyThreshold: 0.6,
          performanceThreshold: 1000,
          reliabilityThreshold: 0.8,
        },
      };

      const handler = new GracefulDegradationHandler(config, HandlerPriority.MEDIUM);
      expect(handler.name).toBe("GracefulDegradationHandler");
      expect(handler.priority).toBe(HandlerPriority.MEDIUM);
      expect(handler.canRecover(testError)).toBe(true);
    });
  });

  describe("fallback chain execution", () => {
    it("should execute fallback handlers based on conditions", async () => {
      const fallback1 = {
        condition: (error: BaseAxonError) => error.code === "NETWORK_ERROR",
        fallback: async () => {
          eventTracker.addEvent("fallback1_executed", { priority: 1, quality: 0.9 });
          return "high_quality_fallback";
        },
        name: "network-fallback",
      };

      const fallback2 = {
        condition: (error: BaseAxonError) => error.code === "SERVICE_UNAVAILABLE",
        fallback: async () => {
          eventTracker.addEvent("fallback2_executed", { priority: 0, quality: 0.7 });
          return "service_fallback";
        },
        name: "service-fallback",
      };

      const fallback3 = {
        condition: () => true, // Catch-all
        fallback: async () => {
          eventTracker.addEvent("fallback3_executed", { priority: 2, quality: 0.5 });
          return "default_fallback";
        },
        name: "default-fallback",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [fallback1, fallback2, fallback3],
        logFallbackUsage: true,
      };

      degradationHandler = new GracefulDegradationHandler(config);

      // Test that SERVICE_UNAVAILABLE error triggers fallback2
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("service_fallback");
      expect(eventTracker.getEvents("fallback2_executed")).toHaveLength(1);
      expect(eventTracker.getEvents("fallback1_executed")).toHaveLength(0);
    });

    it("should select appropriate fallback by condition matching", async () => {
      const cacheFallback = {
        condition: (error: BaseAxonError) => error.code === "CACHE_MISS",
        fallback: async () => {
          eventTracker.addEvent("cache_fallback_used", { name: "cache" });
          return "cached_data";
        },
        name: "cache-fallback",
      };

      const defaultFallback = {
        condition: () => true, // Always matches
        fallback: async () => {
          eventTracker.addEvent("default_fallback_used", { name: "default" });
          return "default_data";
        },
        name: "default-fallback",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [cacheFallback, defaultFallback],
      };

      degradationHandler = new GracefulDegradationHandler(config);

      // Test with SERVICE_UNAVAILABLE error - should use default fallback
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("default_data");
      expect(eventTracker.getEvents("cache_fallback_used")).toHaveLength(0);
      expect(eventTracker.getEvents("default_fallback_used")).toHaveLength(1);

      // Test with CACHE_MISS error - should use cache fallback
      eventTracker.reset();
      const cacheError = TestErrorFactory.createNetworkError({ code: "CACHE_MISS" });
      const cacheResult = await degradationHandler.recover(cacheError);

      expect(cacheResult.success).toBe(true);
      expect(cacheResult.result).toBe("cached_data");
      expect(eventTracker.getEvents("cache_fallback_used")).toHaveLength(1);
      expect(eventTracker.getEvents("default_fallback_used")).toHaveLength(0);
    });

    it("should handle first matching fallback in chain order", async () => {
      const executionOrder: string[] = [];

      const primaryFallback = {
        condition: (error: BaseAxonError) => error.severity === ErrorSeverity.ERROR,
        fallback: async () => {
          executionOrder.push("primary");
          eventTracker.addEvent("primary_executed", { name: "primary" });
          return "primary_result";
        },
        name: "primary-fallback",
      };

      const secondaryFallback = {
        condition: () => true, // Always matches but comes second
        fallback: async () => {
          executionOrder.push("secondary");
          eventTracker.addEvent("secondary_executed", { name: "secondary" });
          return "secondary_result";
        },
        name: "secondary-fallback",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [primaryFallback, secondaryFallback],
      };

      degradationHandler = new GracefulDegradationHandler(config);

      // testError has ErrorSeverity.ERROR, so primary should match first
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("primary_result");
      expect(executionOrder).toEqual(["primary"]);
      expect(eventTracker.getEvents("primary_executed")).toHaveLength(1);
      expect(eventTracker.getEvents("secondary_executed")).toHaveLength(0);
    });

    it("should handle fallback chain with failure scenarios", async () => {
      const executionOrder: string[] = [];

      const primaryFallback = {
        condition: (error: BaseAxonError) => error.code === "SERVICE_UNAVAILABLE",
        fallback: async () => {
          executionOrder.push("primary");
          eventTracker.addEvent("primary_attempted", { name: "primary" });
          throw new Error("Primary fallback failed");
        },
        name: "primary-fallback",
      };

      const secondaryFallback = {
        condition: () => true,
        fallback: async () => {
          executionOrder.push("secondary");
          eventTracker.addEvent("secondary_executed", { name: "secondary" });
          return "secondary_result";
        },
        name: "secondary-fallback",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [primaryFallback, secondaryFallback],
        fallbackTimeout: 5000,
      };

      degradationHandler = new GracefulDegradationHandler(config);

      // Primary should match but fail, so handler should return failure
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(false); // First matching fallback failed
      expect(result.error?.message).toContain("Primary fallback failed");
      expect(executionOrder).toEqual(["primary"]);
      expect(eventTracker.getEvents("primary_attempted")).toHaveLength(1);
      expect(eventTracker.getEvents("secondary_executed")).toHaveLength(0);
    });
  });

  describe("quality degradation", () => {
    it("should provide quality metrics for fallback results", async () => {
      const highQualityFallback = {
        condition: (error: BaseAxonError) => error.code === "SERVICE_UNAVAILABLE",
        fallback: async () => {
          eventTracker.addEvent("high_quality_used", { quality: 0.9 });
          return { data: "complete", meta: { fields: 10, quality: "high" } };
        },
        name: "high-quality",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [highQualityFallback],
        qualityMetrics: {
          accuracyThreshold: 0.6,
          performanceThreshold: 1000,
          reliabilityThreshold: 0.8,
        },
      };

      degradationHandler = new GracefulDegradationHandler(config);
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ data: "complete", meta: { fields: 10, quality: "high" } });
      expect(result.context.recoveryData?.qualityMetrics).toBeDefined();
      expect(eventTracker.getEvents("high_quality_used")).toHaveLength(1);
    });

    it("should handle timeout scenarios in fallback execution", async () => {
      const slowFallback = {
        condition: () => true,
        fallback: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          eventTracker.addEvent("slow_fallback_executed", { duration: 100 });
          return "slow_result";
        },
        name: "slow-fallback",
      };

      const config: IGracefulDegradationConfig = {
        fallbackChain: [slowFallback],
        fallbackTimeout: 50, // Very short timeout
      };

      degradationHandler = new GracefulDegradationHandler(config);
      const result = await degradationHandler.recover(testError);

      // Should fail due to timeout
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("timeout");
      expect(eventTracker.getEvents("slow_fallback_executed")).toHaveLength(0);
    });
  });

  describe("fallback functions and default values", () => {
    it("should use primary fallback function when available", async () => {
      const config: IGracefulDegradationConfig = {
        fallbackFunction: async (error) => {
          eventTracker.addEvent("primary_fallback_used", { errorCode: error.code });
          return `fallback_for_${error.code}`;
        },
      };

      degradationHandler = new GracefulDegradationHandler(config);
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("fallback_for_SERVICE_UNAVAILABLE");
      expect(eventTracker.getEvents("primary_fallback_used")).toHaveLength(1);
    });

    it("should use default value when no other fallbacks match", async () => {
      const config: IGracefulDegradationConfig = {
        defaultValue: "emergency_default_value",
      };

      degradationHandler = new GracefulDegradationHandler(config);
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("emergency_default_value");
    });

    it("should use degradation strategies for specific error codes", async () => {
      const config: IGracefulDegradationConfig = {
        degradationStrategies: {
          SERVICE_UNAVAILABLE: async (error) => {
            eventTracker.addEvent("specific_strategy_used", { code: error.code });
            return "service_specific_fallback";
          },
          NETWORK_ERROR: async () => "network_specific_fallback",
        },
      };

      degradationHandler = new GracefulDegradationHandler(config);
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("service_specific_fallback");
      expect(eventTracker.getEvents("specific_strategy_used")).toHaveLength(1);
    });
  });

  describe("real recovery integration", () => {
    it("should integrate with TestRecoveryStrategies for real recovery behavior", async () => {
      // Use the real TestRecoveryStrategies for authentic recovery testing
      const realRecoveryHandler = TestRecoveryStrategies.createGracefulDegradationHandler("real_fallback_result");

      // Set up event observation
      realRecoveryHandler.onAttempt((data) => {
        eventTracker.addEvent("real_attempt", data);
      });

      realRecoveryHandler.onSuccess((data) => {
        eventTracker.addEvent("real_success", data);
      });

      const result = await realRecoveryHandler.recover(testError);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe("graceful_degradation");
      expect(result.value).toBe("real_fallback_result");
      expect(eventTracker.getEvents("real_attempt")).toHaveLength(1);
      expect(eventTracker.getEvents("real_success")).toHaveLength(1);

      // Clean up event listeners
      realRecoveryHandler.removeAllListeners();
    });

    it("should work with real TestOperations for operation observation", async () => {
      const operation = TestOperations.createFailureOperation(testError, 10);

      const config: IGracefulDegradationConfig = {
        fallbackFunction: async () => {
          eventTracker.addEvent("operation_fallback", { 
            calls: operation.callCount,
            lastCall: operation.calls[operation.calls.length - 1]
          });
          return "operation_recovered";
        },
      };

      degradationHandler = new GracefulDegradationHandler(config);

      // The operation itself will fail, but graceful degradation should provide fallback
      const result = await degradationHandler.recover(testError);

      expect(result.success).toBe(true);
      expect(result.result).toBe("operation_recovered");
      expect(eventTracker.getEvents("operation_fallback")).toHaveLength(1);
      
      // The operation wasn't called by the degradation handler (it handles the error directly)
      expect(operation.callCount).toBe(0);
    });
  });

  describe("performance requirements", () => {
    it("should execute fallback within reasonable time", async () => {
      const config: IGracefulDegradationConfig = {
        fallbackFunction: async () => "fast_fallback",
      };

      degradationHandler = new GracefulDegradationHandler(config);

      const startTime = performance.now();
      const result = await degradationHandler.recover(testError);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10); // Should be very fast for simple fallback
    });

    it("should maintain consistent performance across multiple recoveries", async () => {
      const config: IGracefulDegradationConfig = {
        fallbackFunction: async () => "consistent_fallback",
      };

      degradationHandler = new GracefulDegradationHandler(config);

      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        const result = await degradationHandler.recover(testError);
        const endTime = performance.now();

        expect(result.success).toBe(true);
        durations.push(endTime - startTime);
      }

      // All executions should be reasonably fast
      const maxDuration = Math.max(...durations);
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;

      expect(maxDuration).toBeLessThan(20);
      expect(avgDuration).toBeLessThan(10);
    });
  });
});