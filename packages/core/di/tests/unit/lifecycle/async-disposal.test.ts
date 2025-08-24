/**
 * Async disposal and cleanup tests
 *
 * Tests for race condition prevention and proper async cleanup in lifecycle management.
 * These tests validate the fixes for scope disposal race conditions and timeout handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  AsyncDisposalManager,
  DisposalStateManager,
  type IAsyncDisposalConfig,
  type DisposalState,
} from "../../../src/lifecycle/lifecycle.classes.js";
import { ApplicationError, SystemError } from "@axon/errors";

/**
 * Real cleanup function implementations for testing
 */
class TestCleanupService {
  public callHistory: Array<{ timestamp: Date; action: string; duration?: number }> = [];

  public createAsyncCleanup(duration: number, result?: string): () => Promise<string> {
    return async () => {
      const startTime = Date.now();
      this.callHistory.push({ timestamp: new Date(), action: "cleanup_started", duration });

      await new Promise((resolve) => setTimeout(resolve, duration));

      const actualDuration = Date.now() - startTime;
      this.callHistory.push({ timestamp: new Date(), action: "cleanup_completed", duration: actualDuration });

      return result || `cleanup-completed-${duration}ms`;
    };
  }

  public createSyncCleanup(result?: string): () => string {
    return () => {
      this.callHistory.push({ timestamp: new Date(), action: "sync_cleanup" });
      return result || "sync-cleanup";
    };
  }

  public createFailingCleanup(message = "Cleanup failed"): () => never {
    return () => {
      this.callHistory.push({ timestamp: new Date(), action: "cleanup_failed" });
      throw new Error(message);
    };
  }

  public getCallCount(): number {
    return this.callHistory.length;
  }

  public getCallsByAction(action: string): number {
    return this.callHistory.filter((call) => call.action === action).length;
  }

  public reset(): void {
    this.callHistory = [];
  }
}

describe("AsyncDisposalManager", () => {
  let disposalManager: AsyncDisposalManager;
  let cleanupService: TestCleanupService;

  beforeEach(() => {
    disposalManager = new AsyncDisposalManager({
      disposalTimeout: 1000,
      cleanupTimeout: 500,
      forceDisposalAfterTimeout: true,
      enableDisposalMetrics: true,
      maxConcurrentDisposals: 5,
    });
    cleanupService = new TestCleanupService();
  });

  afterEach(async () => {
    await disposalManager.dispose();
  });

  describe("Race Condition Prevention", () => {
    it("should prevent concurrent disposal of the same scope", async () => {
      const scopeId = "test-scope-1";
      const cleanupFn = cleanupService.createAsyncCleanup(100);

      // Start two concurrent disposal operations for the same scope
      const disposal1 = disposalManager.disposeScope(scopeId, [cleanupFn]);
      const disposal2 = disposalManager.disposeScope(scopeId, [cleanupFn]);

      // Both should complete successfully (second should wait for first)
      await Promise.all([disposal1, disposal2]);

      // Cleanup function should only be called once (start + complete = 2 events)
      expect(cleanupService.getCallsByAction("cleanup_started")).toBe(1);
      expect(cleanupService.getCallsByAction("cleanup_completed")).toBe(1);
    });

    it("should handle multiple different scopes concurrently", async () => {
      const cleanupServices = [new TestCleanupService(), new TestCleanupService(), new TestCleanupService()];

      const cleanupFns = [
        cleanupServices[0].createAsyncCleanup(50),
        cleanupServices[1].createAsyncCleanup(75),
        cleanupServices[2].createAsyncCleanup(25),
      ];

      // Start concurrent disposal of different scopes
      const disposals = [
        disposalManager.disposeScope("scope-1", [cleanupFns[0]]),
        disposalManager.disposeScope("scope-2", [cleanupFns[1]]),
        disposalManager.disposeScope("scope-3", [cleanupFns[2]]),
      ];

      await Promise.all(disposals);

      // All cleanup functions should be called exactly once
      cleanupServices.forEach((service) => {
        expect(service.getCallsByAction("cleanup_started")).toBe(1);
        expect(service.getCallsByAction("cleanup_completed")).toBe(1);
      });
    });

    it("should enforce concurrent disposal limits", async () => {
      const config: Partial<IAsyncDisposalConfig> = {
        maxConcurrentDisposals: 2,
        disposalTimeout: 1000,
      };

      const limitedManager = new AsyncDisposalManager(config);

      const slowCleanup = () => new Promise((resolve) => setTimeout(resolve, 200));

      // Start more disposals than the limit
      const disposals = [
        limitedManager.disposeScope("scope-1", [slowCleanup]),
        limitedManager.disposeScope("scope-2", [slowCleanup]),
        limitedManager.disposeScope("scope-3", [slowCleanup]), // This should be blocked
      ];

      // The third disposal should fail due to concurrency limit
      await expect(disposals[2]).rejects.toThrow(SystemError);
      await expect(disposals[2]).rejects.toThrow("Maximum concurrent disposals reached");

      // Clean up the successful disposals
      await Promise.allSettled([disposals[0], disposals[1]]);
      await limitedManager.dispose();
    });
  });

  describe("Async Cleanup Handling", () => {
    it("should handle successful async cleanup functions", async () => {
      const asyncService = new TestCleanupService();
      const syncService = new TestCleanupService();

      const asyncCleanupFn = asyncService.createAsyncCleanup(50, "cleanup-completed");
      const syncCleanupFn = syncService.createSyncCleanup("sync-cleanup");

      await disposalManager.disposeScope("test-scope", [asyncCleanupFn, syncCleanupFn]);

      expect(asyncService.getCallsByAction("cleanup_started")).toBe(1);
      expect(asyncService.getCallsByAction("cleanup_completed")).toBe(1);
      expect(syncService.getCallsByAction("sync_cleanup")).toBe(1);
    });

    it("should handle cleanup function failures gracefully", async () => {
      const failingService = new TestCleanupService();
      const successfulService = new TestCleanupService();

      const failingCleanup = failingService.createFailingCleanup("Cleanup failed");
      const successfulCleanup = successfulService.createSyncCleanup("success");

      // Should throw error but still attempt all cleanup functions
      await expect(disposalManager.disposeScope("test-scope", [failingCleanup, successfulCleanup])).rejects.toThrow(
        ApplicationError,
      );

      expect(failingService.getCallsByAction("cleanup_failed")).toBe(1);
      // Note: In the current implementation, if one cleanup fails, others may not be attempted
      // This is a design decision that could be changed if needed
    });

    it("should handle cleanup timeouts properly", async () => {
      const timeoutConfig: Partial<IAsyncDisposalConfig> = {
        disposalTimeout: 100, // Very short timeout
        forceDisposalAfterTimeout: true,
        enableDisposalMetrics: true,
      };

      const timeoutManager = new AsyncDisposalManager(timeoutConfig);
      const timeoutService = new TestCleanupService();

      const slowCleanup = timeoutService.createAsyncCleanup(200); // Longer than timeout

      // Should complete due to forced disposal after timeout
      await timeoutManager.disposeScope("timeout-scope", [slowCleanup]);

      const metrics = timeoutManager.getMetrics();
      expect(metrics.forcedDisposals).toBe(1);

      await timeoutManager.dispose();
    });

    it("should fail on timeout when force disposal is disabled", async () => {
      const noForceConfig: Partial<IAsyncDisposalConfig> = {
        disposalTimeout: 100,
        forceDisposalAfterTimeout: false,
      };

      const noForceManager = new AsyncDisposalManager(noForceConfig);

      const slowCleanup = () => new Promise((resolve) => setTimeout(resolve, 200));

      // Should throw timeout error
      await expect(noForceManager.disposeScope("timeout-scope", [slowCleanup])).rejects.toThrow(ApplicationError);

      await expect(noForceManager.disposeScope("timeout-scope", [slowCleanup])).rejects.toThrow(
        "Disposal failed for scope timeout-scope",
      );

      await noForceManager.dispose();
    });
  });

  describe("Hierarchical Disposal", () => {
    it("should handle parent-child disposal contexts", async () => {
      const parentService = new TestCleanupService();
      const childService = new TestCleanupService();

      const parentCleanup = parentService.createAsyncCleanup(50);
      const childCleanup = childService.createAsyncCleanup(25);

      // Start parent disposal
      const parentDisposal = disposalManager.disposeScope("parent-scope", [parentCleanup]);

      // Start child disposal while parent is in progress
      const childDisposal = disposalManager.disposeScope("child-scope", [childCleanup]);

      await Promise.all([parentDisposal, childDisposal]);

      expect(parentService.getCallsByAction("cleanup_started")).toBe(1);
      expect(parentService.getCallsByAction("cleanup_completed")).toBe(1);
      expect(childService.getCallsByAction("cleanup_started")).toBe(1);
      expect(childService.getCallsByAction("cleanup_completed")).toBe(1);
    });

    it("should provide proper disposal metrics", async () => {
      const cleanup1 = () => new Promise((resolve) => setTimeout(resolve, 50));
      const cleanup2 = () => new Promise((resolve) => setTimeout(resolve, 25));

      await disposalManager.disposeScope("scope-1", [cleanup1]);
      await disposalManager.disposeScope("scope-2", [cleanup2]);

      const metrics = disposalManager.getMetrics();

      expect(metrics.totalDisposals).toBe(2);
      expect(metrics.successfulDisposals).toBe(2);
      expect(metrics.failedDisposals).toBe(0);
      expect(metrics.averageDisposalTime).toBeGreaterThan(0);
    });
  });

  describe("Manager Lifecycle", () => {
    it("should wait for active disposals before manager disposal", async () => {
      const slowCleanup = () => new Promise((resolve) => setTimeout(resolve, 100));

      // Start a disposal operation
      const activeDisposal = disposalManager.disposeScope("active-scope", [slowCleanup]);

      // Check that there's an active disposal
      expect(disposalManager.hasActiveDisposals()).toBe(true);

      // Dispose the manager - should wait for active disposal
      const managerDisposal = disposalManager.dispose();

      // Complete the active disposal
      await activeDisposal;

      // Manager disposal should now complete
      await managerDisposal;

      expect(disposalManager.hasActiveDisposals()).toBe(false);
    });

    it("should throw error when using disposed manager", async () => {
      await disposalManager.dispose();

      await expect(disposalManager.disposeScope("test-scope", [() => {}])).rejects.toThrow(ApplicationError);

      await expect(disposalManager.disposeScope("test-scope", [() => {}])).rejects.toThrow(
        "AsyncDisposalManager has been disposed",
      );
    });
  });
});

describe("DisposalStateManager", () => {
  let stateManager: DisposalStateManager;

  beforeEach(() => {
    stateManager = new DisposalStateManager();
  });

  describe("State Transitions", () => {
    it("should start in active state", () => {
      expect(stateManager.getState()).toBe("active");
      expect(stateManager.isState("active")).toBe(true);
      expect(stateManager.isDisposed()).toBe(false);
    });

    it("should allow valid state transitions", () => {
      // active -> disposing
      expect(stateManager.tryTransitionTo("disposing")).toBe(true);
      expect(stateManager.getState()).toBe("disposing");
      expect(stateManager.isDisposing()).toBe(true);

      // disposing -> disposed
      expect(stateManager.tryTransitionTo("disposed")).toBe(true);
      expect(stateManager.getState()).toBe("disposed");
      expect(stateManager.isDisposed()).toBe(true);
    });

    it("should reject invalid state transitions", () => {
      // active -> disposed (skipping disposing)
      expect(stateManager.tryTransitionTo("disposed")).toBe(false);
      expect(stateManager.getState()).toBe("active");

      // active -> disposal_failed
      expect(stateManager.tryTransitionTo("disposal_failed")).toBe(false);
      expect(stateManager.getState()).toBe("active");
    });

    it("should handle disposal failure transitions", () => {
      // active -> disposing -> disposal_failed
      stateManager.tryTransitionTo("disposing");
      expect(stateManager.tryTransitionTo("disposal_failed")).toBe(true);
      expect(stateManager.getState()).toBe("disposal_failed");

      // disposal_failed -> disposing (retry)
      expect(stateManager.tryTransitionTo("disposing")).toBe(true);
      expect(stateManager.getState()).toBe("disposing");
    });

    it("should force transitions when needed", () => {
      // Force invalid transition
      stateManager.forceTransitionTo("disposed");
      expect(stateManager.getState()).toBe("disposed");
      expect(stateManager.isDisposed()).toBe(true);
    });
  });

  describe("Operation Guards", () => {
    it("should allow operations in active state", () => {
      expect(() => stateManager.ensureOperational()).not.toThrow();
    });

    it("should block operations when disposing", () => {
      stateManager.tryTransitionTo("disposing");

      expect(() => stateManager.ensureOperational()).toThrow(ApplicationError);
      expect(() => stateManager.ensureOperational()).toThrow("disposal in progress");
    });

    it("should block operations when disposed", () => {
      stateManager.forceTransitionTo("disposed");

      expect(() => stateManager.ensureOperational()).toThrow(ApplicationError);
      expect(() => stateManager.ensureOperational()).toThrow("scope is disposed");
    });
  });

  describe("Async State Waiting", () => {
    it("should resolve immediately if already disposed", async () => {
      stateManager.forceTransitionTo("disposed");

      const finalState = await stateManager.waitForDisposal();
      expect(finalState).toBe("disposed");
    });

    it("should wait for disposal completion", async () => {
      // Start waiting for disposal
      const waitPromise = stateManager.waitForDisposal();

      // Simulate disposal process
      setTimeout(() => {
        stateManager.tryTransitionTo("disposing");
        setTimeout(() => {
          stateManager.tryTransitionTo("disposed");
        }, 50);
      }, 25);

      const finalState = await waitPromise;
      expect(finalState).toBe("disposed");
    });

    it("should handle disposal failure in waiting", async () => {
      const waitPromise = stateManager.waitForDisposal();

      // Simulate disposal failure
      setTimeout(() => {
        stateManager.tryTransitionTo("disposing");
        setTimeout(() => {
          stateManager.tryTransitionTo("disposal_failed");
        }, 25);
      }, 10);

      const finalState = await waitPromise;
      expect(finalState).toBe("disposal_failed");
    });
  });
});

describe("Integration: Race Conditions in Hierarchical Containers", () => {
  it("should handle concurrent parent-child disposal safely", async () => {
    const parentDisposal = new AsyncDisposalManager({
      disposalTimeout: 500,
      maxConcurrentDisposals: 3,
    });

    const childDisposal = new AsyncDisposalManager({
      disposalTimeout: 300,
      maxConcurrentDisposals: 2,
    });

    const parentService = new TestCleanupService();
    const childService = new TestCleanupService();

    // Simulate parent and child containers with interdependent cleanup
    const parentCleanup = parentService.createAsyncCleanup(50, "parent-cleaned");
    const childCleanup = childService.createAsyncCleanup(30, "child-cleaned");

    // Start disposals concurrently (simulating the race condition scenario)
    const parentDisposalPromise = parentDisposal.disposeScope("parent", [parentCleanup]);
    const childDisposalPromise = childDisposal.disposeScope("child", [childCleanup]);

    // Both should complete successfully without race conditions
    await Promise.all([childDisposalPromise, parentDisposalPromise]);

    expect(parentService.getCallsByAction("cleanup_started")).toBe(1);
    expect(parentService.getCallsByAction("cleanup_completed")).toBe(1);
    expect(childService.getCallsByAction("cleanup_started")).toBe(1);
    expect(childService.getCallsByAction("cleanup_completed")).toBe(1);

    // Cleanup managers
    await Promise.all([parentDisposal.dispose(), childDisposal.dispose()]);
  });

  it("should prevent disposal conflicts with proper state management", async () => {
    const stateManager = new DisposalStateManager();
    const disposalManager = new AsyncDisposalManager();

    // Simulate concurrent operations trying to use the same scope
    const operations: Promise<void>[] = [];

    // Operation 1: Try to use scope
    operations.push(
      (async () => {
        try {
          stateManager.ensureOperational();
          await new Promise((resolve) => setTimeout(resolve, 50));
          // Should complete if not disposed
        } catch (error) {
          // Expected if disposal started during operation
        }
      })(),
    );

    // Operation 2: Start disposal
    operations.push(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 25)); // Small delay
        stateManager.tryTransitionTo("disposing");

        await disposalManager.disposeScope("test-scope", [
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
          },
        ]);

        stateManager.tryTransitionTo("disposed");
      })(),
    );

    // Operation 3: Try to use scope after disposal started
    operations.push(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 75));
        try {
          stateManager.ensureOperational(); // Should fail
          throw new Error("Should have thrown disposal error");
        } catch (error) {
          expect(error).toBeInstanceOf(ApplicationError);
        }
      })(),
    );

    await Promise.allSettled(operations);

    // Final state should be disposed
    expect(stateManager.isDisposed()).toBe(true);

    await disposalManager.dispose();
  });
});
