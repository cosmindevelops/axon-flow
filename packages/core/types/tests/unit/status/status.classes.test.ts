/**
 * Test suite for status management classes
 */

import { describe, it, expect, beforeEach } from "vitest";
import { StatusManager, HealthChecker, StatusReporter } from "../../../src/status/index.js";

describe("Status Management Classes", () => {
  describe("StatusManager", () => {
    let statusManager: StatusManager;

    beforeEach(() => {
      statusManager = new StatusManager();
    });

    it("should initialize with empty status collection", () => {
      expect(statusManager.getStatusCount()).toBe(0);
      expect(Object.keys(statusManager.getAllStatuses())).toHaveLength(0);
    });

    it("should set and retrieve status correctly", () => {
      const testStatus = {
        code: 200,
        message: "OK",
        timestamp: new Date().toISOString(),
      };

      statusManager.setStatus("service1", testStatus);

      expect(statusManager.getStatus("service1")).toEqual(testStatus);
      expect(statusManager.hasStatus("service1")).toBe(true);
      expect(statusManager.getStatusCount()).toBe(1);
    });

    it("should handle multiple statuses", () => {
      const status1 = { code: 200, message: "OK" };
      const status2 = { code: 500, message: "Error" };
      const status3 = { code: 404, message: "Not Found" };

      statusManager.setStatus("service1", status1);
      statusManager.setStatus("service2", status2);
      statusManager.setStatus("service3", status3);

      expect(statusManager.getStatusCount()).toBe(3);
      expect(statusManager.getStatus("service1")).toEqual(status1);
      expect(statusManager.getStatus("service2")).toEqual(status2);
      expect(statusManager.getStatus("service3")).toEqual(status3);

      const allStatuses = statusManager.getAllStatuses();
      expect(Object.keys(allStatuses)).toEqual(["service1", "service2", "service3"]);
    });

    it("should update existing status", () => {
      const initialStatus = { code: 200, message: "OK" };
      const updatedStatus = { code: 500, message: "Error" };

      statusManager.setStatus("service1", initialStatus);
      expect(statusManager.getStatus("service1")).toEqual(initialStatus);

      statusManager.setStatus("service1", updatedStatus);
      expect(statusManager.getStatus("service1")).toEqual(updatedStatus);
      expect(statusManager.getStatusCount()).toBe(1);
    });

    it("should remove status correctly", () => {
      const testStatus = { code: 200, message: "OK" };

      statusManager.setStatus("service1", testStatus);
      expect(statusManager.hasStatus("service1")).toBe(true);

      const removed = statusManager.removeStatus("service1");
      expect(removed).toBe(true);
      expect(statusManager.hasStatus("service1")).toBe(false);
      expect(statusManager.getStatus("service1")).toBeUndefined();
      expect(statusManager.getStatusCount()).toBe(0);
    });

    it("should clear all statuses", () => {
      statusManager.setStatus("service1", { code: 200 });
      statusManager.setStatus("service2", { code: 404 });
      statusManager.setStatus("service3", { code: 500 });

      expect(statusManager.getStatusCount()).toBe(3);

      statusManager.clearStatuses();

      expect(statusManager.getStatusCount()).toBe(0);
      expect(Object.keys(statusManager.getAllStatuses())).toHaveLength(0);
    });

    it("should handle status listeners", () => {
      let callCount = 0;
      const capturedCalls: any[] = [];
      const mockListener = (status: any) => {
        callCount++;
        capturedCalls.push(status);
      };

      statusManager.addListener("service1", mockListener);

      const status1 = { code: 200, message: "OK" };
      const status2 = { code: 500, message: "Error" };

      statusManager.setStatus("service1", status1);
      expect(capturedCalls).toContain(status1);

      statusManager.setStatus("service1", status2);
      expect(capturedCalls).toContain(status2);
      expect(callCount).toBe(2);
    });

    it("should remove listeners correctly", () => {
      let callCount1 = 0;
      let callCount2 = 0;
      const mockListener1 = () => { callCount1++; };
      const mockListener2 = () => { callCount2++; };

      statusManager.addListener("service1", mockListener1);
      statusManager.addListener("service1", mockListener2);

      statusManager.setStatus("service1", { code: 200 });
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);

      statusManager.removeListener("service1", mockListener1);
      statusManager.setStatus("service1", { code: 404 });

      expect(callCount1).toBe(1); // Not called again
      expect(callCount2).toBe(2); // Called again
    });
  });

  describe("HealthChecker", () => {
    let healthChecker: HealthChecker;

    beforeEach(() => {
      healthChecker = new HealthChecker();
    });

    it("should initialize with no services", () => {
      expect(healthChecker.getServiceCount()).toBe(0);
      expect(Object.keys(healthChecker.getAllServiceStatuses())).toHaveLength(0);
    });

    it("should add and remove services", () => {
      const mockCheckFn = async (): Promise<any> => ({ connected: true });

      healthChecker.addService("database", mockCheckFn);
      expect(healthChecker.getServiceCount()).toBe(1);

      const removed = healthChecker.removeService("database");
      expect(removed).toBe(true);
      expect(healthChecker.getServiceCount()).toBe(0);
    });

    it("should perform health checks", async () => {
      let callCount = 0;
      const mockCheckFn = async (): Promise<any> => {
        callCount++;
        return { connected: true, poolSize: 10 };
      };

      healthChecker.addService("database", mockCheckFn);

      const result = await healthChecker.checkHealth("database");

      expect(callCount).toBe(1);
      expect(result.service).toBe("database");
      expect(result.status).toBe("healthy");
      expect(typeof result.lastChecked).toBe("string");
      expect(typeof result.responseTime).toBe("number");
      expect(result.details).toEqual({ connected: true, poolSize: 10 });
    });

    it("should handle failed health checks", async () => {
      const mockCheckFn = async (): Promise<any> => {
        throw new Error("Connection failed");
      };

      healthChecker.addService("database", mockCheckFn);

      const result = await healthChecker.checkHealth("database");

      expect(result.service).toBe("database");
      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Connection failed");
      expect(typeof result.responseTime).toBe("number");
    });

    it("should check all services", async () => {
      let dbCallCount = 0;
      let cacheCallCount = 0;
      const mockDbCheck = async (): Promise<any> => {
        dbCallCount++;
        return { connected: true };
      };
      const mockCacheCheck = async (): Promise<any> => {
        cacheCallCount++;
        return { status: "ok" };
      };

      healthChecker.addService("database", mockDbCheck);
      healthChecker.addService("cache", mockCacheCheck);

      const results = await healthChecker.checkAllServices();

      expect(Object.keys(results)).toEqual(["database", "cache"]);
      expect(results.database.status).toBe("healthy");
      expect(results.cache.status).toBe("healthy");
      expect(dbCallCount).toBe(1);
      expect(cacheCallCount).toBe(1);
    });

    it("should retrieve service status", async () => {
      const mockCheckFn = async (): Promise<any> => ({ connected: true });

      healthChecker.addService("database", mockCheckFn);

      // No status before first check
      expect(healthChecker.getServiceStatus("database")).toBeNull();

      await healthChecker.checkHealth("database");

      const status = healthChecker.getServiceStatus("database");
      expect(status).not.toBeNull();
      expect(status.service).toBe("database");
      expect(status.status).toBe("healthy");
    });

    it("should handle periodic checks", (done) => {
      let callCount = 0;
      const mockCheckFn = async (): Promise<any> => {
        callCount++;
        return { connected: true };
      };
      
      healthChecker.addService("database", mockCheckFn);
      healthChecker.startPeriodicChecks(100); // Short interval for test

      // Wait long enough for multiple calls
      setTimeout(() => {
        healthChecker.stopPeriodicChecks();
        expect(callCount).toBeGreaterThanOrEqual(2);
        done();
      }, 250);
    });
  });

  describe("StatusReporter", () => {
    it("should aggregate status information", () => {
      const reporter = new StatusReporter();

      reporter.addStatusSource("database", () => ({ status: "healthy", connections: 10 }));
      reporter.addStatusSource("cache", () => ({ status: "healthy", hitRate: 0.95 }));
      reporter.addStatusSource("api", () => ({ status: "unhealthy", error: "High response time" }));

      const report = reporter.generateReport();

      expect(typeof report.timestamp).toBe("string");
      expect(report.overall).toBe("unhealthy");
      expect(report.summary.total).toBe(3);
      expect(report.summary.healthy).toBe(2);
      expect(report.summary.unhealthy).toBe(1);
      expect(report.summary.unknown).toBe(0);
      expect(Object.keys(report.services)).toEqual(["database", "cache", "api"]);
    });
  });
});
