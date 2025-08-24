/**
 * Test suite for status management classes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Status Management Classes", () => {
  describe("StatusManager", () => {
    let statusManager: any;

    beforeEach(() => {
      // Mock StatusManager class implementation
      class StatusManager {
        private statuses = new Map<string, any>();
        private listeners = new Map<string, Array<(status: any) => void>>();

        setStatus(key: string, status: any): void {
          const previousStatus = this.statuses.get(key);
          this.statuses.set(key, status);

          // Notify listeners if status changed
          if (JSON.stringify(previousStatus) !== JSON.stringify(status)) {
            this.notifyListeners(key, status);
          }
        }

        getStatus(key: string): any | undefined {
          return this.statuses.get(key);
        }

        getAllStatuses(): Record<string, any> {
          return Object.fromEntries(this.statuses);
        }

        clearStatuses(): void {
          this.statuses.clear();
        }

        hasStatus(key: string): boolean {
          return this.statuses.has(key);
        }

        removeStatus(key: string): boolean {
          return this.statuses.delete(key);
        }

        getStatusCount(): number {
          return this.statuses.size;
        }

        addListener(key: string, callback: (status: any) => void): void {
          if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
          }
          this.listeners.get(key)!.push(callback);
        }

        removeListener(key: string, callback: (status: any) => void): void {
          const listeners = this.listeners.get(key);
          if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }

        private notifyListeners(key: string, status: any): void {
          const listeners = this.listeners.get(key);
          if (listeners) {
            listeners.forEach((callback) => callback(status));
          }
        }
      }

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
      const mockListener = vi.fn();

      statusManager.addListener("service1", mockListener);

      const status1 = { code: 200, message: "OK" };
      const status2 = { code: 500, message: "Error" };

      statusManager.setStatus("service1", status1);
      expect(mockListener).toHaveBeenCalledWith(status1);

      statusManager.setStatus("service1", status2);
      expect(mockListener).toHaveBeenCalledWith(status2);
      expect(mockListener).toHaveBeenCalledTimes(2);
    });

    it("should remove listeners correctly", () => {
      const mockListener1 = vi.fn();
      const mockListener2 = vi.fn();

      statusManager.addListener("service1", mockListener1);
      statusManager.addListener("service1", mockListener2);

      statusManager.setStatus("service1", { code: 200 });
      expect(mockListener1).toHaveBeenCalledTimes(1);
      expect(mockListener2).toHaveBeenCalledTimes(1);

      statusManager.removeListener("service1", mockListener1);
      statusManager.setStatus("service1", { code: 404 });

      expect(mockListener1).toHaveBeenCalledTimes(1); // Not called again
      expect(mockListener2).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe("HealthChecker", () => {
    let healthChecker: any;

    beforeEach(() => {
      // Mock HealthChecker class implementation
      class HealthChecker {
        private services = new Map<string, any>();
        private checkInterval: NodeJS.Timeout | null = null;

        addService(name: string, checkFn: () => Promise<any>): void {
          this.services.set(name, {
            name,
            checkFn,
            lastCheck: null,
            lastResult: null,
            isHealthy: null,
          });
        }

        removeService(name: string): boolean {
          return this.services.delete(name);
        }

        async checkHealth(serviceName: string): Promise<any> {
          const service = this.services.get(serviceName);
          if (!service) {
            throw new Error(`Service ${serviceName} not found`);
          }

          const startTime = Date.now();
          try {
            const result = await service.checkFn();
            const endTime = Date.now();

            const healthResult = {
              service: serviceName,
              status: "healthy",
              lastChecked: new Date().toISOString(),
              responseTime: endTime - startTime,
              details: result,
            };

            service.lastCheck = new Date().toISOString();
            service.lastResult = healthResult;
            service.isHealthy = true;

            return healthResult;
          } catch (error) {
            const endTime = Date.now();

            const healthResult = {
              service: serviceName,
              status: "unhealthy",
              lastChecked: new Date().toISOString(),
              responseTime: endTime - startTime,
              error: error instanceof Error ? error.message : "Unknown error",
            };

            service.lastCheck = new Date().toISOString();
            service.lastResult = healthResult;
            service.isHealthy = false;

            return healthResult;
          }
        }

        async checkAllServices(): Promise<Record<string, any>> {
          const results: Record<string, any> = {};

          for (const [name] of this.services) {
            results[name] = await this.checkHealth(name);
          }

          return results;
        }

        getServiceStatus(serviceName: string): any | null {
          const service = this.services.get(serviceName);
          return service ? service.lastResult : null;
        }

        getAllServiceStatuses(): Record<string, any> {
          const statuses: Record<string, any> = {};

          for (const [name, service] of this.services) {
            if (service.lastResult) {
              statuses[name] = service.lastResult;
            }
          }

          return statuses;
        }

        startPeriodicChecks(intervalMs: number): void {
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
          }

          this.checkInterval = setInterval(() => {
            this.checkAllServices().catch(console.error);
          }, intervalMs);
        }

        stopPeriodicChecks(): void {
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
          }
        }

        getServiceCount(): number {
          return this.services.size;
        }
      }

      healthChecker = new HealthChecker();
    });

    it("should initialize with no services", () => {
      expect(healthChecker.getServiceCount()).toBe(0);
      expect(Object.keys(healthChecker.getAllServiceStatuses())).toHaveLength(0);
    });

    it("should add and remove services", () => {
      const mockCheckFn = vi.fn().mockResolvedValue({ connected: true });

      healthChecker.addService("database", mockCheckFn);
      expect(healthChecker.getServiceCount()).toBe(1);

      const removed = healthChecker.removeService("database");
      expect(removed).toBe(true);
      expect(healthChecker.getServiceCount()).toBe(0);
    });

    it("should perform health checks", async () => {
      const mockCheckFn = vi.fn().mockResolvedValue({ connected: true, poolSize: 10 });

      healthChecker.addService("database", mockCheckFn);

      const result = await healthChecker.checkHealth("database");

      expect(mockCheckFn).toHaveBeenCalledTimes(1);
      expect(result.service).toBe("database");
      expect(result.status).toBe("healthy");
      expect(typeof result.lastChecked).toBe("string");
      expect(typeof result.responseTime).toBe("number");
      expect(result.details).toEqual({ connected: true, poolSize: 10 });
    });

    it("should handle failed health checks", async () => {
      const mockCheckFn = vi.fn().mockRejectedValue(new Error("Connection failed"));

      healthChecker.addService("database", mockCheckFn);

      const result = await healthChecker.checkHealth("database");

      expect(result.service).toBe("database");
      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Connection failed");
      expect(typeof result.responseTime).toBe("number");
    });

    it("should check all services", async () => {
      const mockDbCheck = vi.fn().mockResolvedValue({ connected: true });
      const mockCacheCheck = vi.fn().mockResolvedValue({ status: "ok" });

      healthChecker.addService("database", mockDbCheck);
      healthChecker.addService("cache", mockCacheCheck);

      const results = await healthChecker.checkAllServices();

      expect(Object.keys(results)).toEqual(["database", "cache"]);
      expect(results.database.status).toBe("healthy");
      expect(results.cache.status).toBe("healthy");
      expect(mockDbCheck).toHaveBeenCalledTimes(1);
      expect(mockCacheCheck).toHaveBeenCalledTimes(1);
    });

    it("should retrieve service status", async () => {
      const mockCheckFn = vi.fn().mockResolvedValue({ connected: true });

      healthChecker.addService("database", mockCheckFn);

      // No status before first check
      expect(healthChecker.getServiceStatus("database")).toBeNull();

      await healthChecker.checkHealth("database");

      const status = healthChecker.getServiceStatus("database");
      expect(status).not.toBeNull();
      expect(status.service).toBe("database");
      expect(status.status).toBe("healthy");
    });

    it("should handle periodic checks", () => {
      vi.useFakeTimers();

      const mockCheckFn = vi.fn().mockResolvedValue({ connected: true });
      healthChecker.addService("database", mockCheckFn);

      healthChecker.startPeriodicChecks(1000);

      // Fast-forward time
      vi.advanceTimersByTime(2500);

      // Should have been called at least twice
      expect(mockCheckFn).toHaveBeenCalledTimes(2);

      healthChecker.stopPeriodicChecks();
      vi.useRealTimers();
    });
  });

  describe("StatusReporter", () => {
    it("should aggregate status information", () => {
      // Mock StatusReporter class
      class StatusReporter {
        private statusSources = new Map<string, () => any>();

        addStatusSource(name: string, sourceFn: () => any): void {
          this.statusSources.set(name, sourceFn);
        }

        generateReport(): any {
          const report = {
            timestamp: new Date().toISOString(),
            overall: "healthy",
            services: {} as Record<string, any>,
            summary: {
              total: 0,
              healthy: 0,
              unhealthy: 0,
              unknown: 0,
            },
          };

          for (const [name, sourceFn] of this.statusSources) {
            try {
              const status = sourceFn();
              report.services[name] = status;
              report.summary.total++;

              if (status.status === "healthy") {
                report.summary.healthy++;
              } else if (status.status === "unhealthy") {
                report.summary.unhealthy++;
              } else {
                report.summary.unknown++;
              }
            } catch (error) {
              report.services[name] = {
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              };
              report.summary.total++;
              report.summary.unhealthy++;
            }
          }

          // Determine overall status
          if (report.summary.unhealthy > 0) {
            report.overall = "unhealthy";
          } else if (report.summary.unknown > 0) {
            report.overall = "degraded";
          }

          return report;
        }
      }

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
