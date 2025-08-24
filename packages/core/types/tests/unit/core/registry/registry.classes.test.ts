/**
 * Test suite for registry management classes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Registry Management Classes", () => {
  describe("ServiceRegistry", () => {
    let serviceRegistry: any;

    beforeEach(() => {
      // Mock ServiceRegistry class implementation
      class ServiceRegistry {
        private services = new Map<string, any>();
        private healthChecks = new Map<string, () => Promise<boolean>>();
        private listeners = new Set<(event: any) => void>();

        register(serviceId: string, serviceInfo: any): void {
          if (this.services.has(serviceId)) {
            throw new Error(`Service ${serviceId} is already registered`);
          }

          const registration = {
            ...serviceInfo,
            id: serviceId,
            registeredAt: new Date().toISOString(),
            status: "active",
          };

          this.services.set(serviceId, registration);
          this.notifyListeners({
            type: "service.registered",
            serviceId,
            service: registration,
          });
        }

        unregister(serviceId: string): boolean {
          const service = this.services.get(serviceId);
          if (!service) {
            return false;
          }

          this.services.delete(serviceId);
          this.healthChecks.delete(serviceId);

          this.notifyListeners({
            type: "service.unregistered",
            serviceId,
            service,
          });

          return true;
        }

        get(serviceId: string): any | undefined {
          return this.services.get(serviceId);
        }

        getAll(): Record<string, any> {
          return Object.fromEntries(this.services);
        }

        find(predicate: (service: any) => boolean): any[] {
          const results: any[] = [];
          for (const service of this.services.values()) {
            if (predicate(service)) {
              results.push(service);
            }
          }
          return results;
        }

        has(serviceId: string): boolean {
          return this.services.has(serviceId);
        }

        count(): number {
          return this.services.size;
        }

        clear(): void {
          const serviceIds = Array.from(this.services.keys());
          this.services.clear();
          this.healthChecks.clear();

          serviceIds.forEach((serviceId) => {
            this.notifyListeners({
              type: "service.unregistered",
              serviceId,
            });
          });
        }

        updateStatus(serviceId: string, status: string): boolean {
          const service = this.services.get(serviceId);
          if (!service) {
            return false;
          }

          service.status = status;
          service.lastUpdated = new Date().toISOString();

          this.notifyListeners({
            type: "service.status_changed",
            serviceId,
            status,
            service,
          });

          return true;
        }

        addHealthCheck(serviceId: string, healthCheck: () => Promise<boolean>): void {
          if (!this.services.has(serviceId)) {
            throw new Error(`Service ${serviceId} is not registered`);
          }
          this.healthChecks.set(serviceId, healthCheck);
        }

        async checkHealth(serviceId: string): Promise<boolean | null> {
          const healthCheck = this.healthChecks.get(serviceId);
          if (!healthCheck) {
            return null;
          }

          try {
            const isHealthy = await healthCheck();
            this.updateStatus(serviceId, isHealthy ? "healthy" : "unhealthy");
            return isHealthy;
          } catch (error) {
            this.updateStatus(serviceId, "error");
            return false;
          }
        }

        async checkAllHealth(): Promise<Record<string, boolean | null>> {
          const results: Record<string, boolean | null> = {};

          for (const serviceId of this.services.keys()) {
            results[serviceId] = await this.checkHealth(serviceId);
          }

          return results;
        }

        addListener(listener: (event: any) => void): void {
          this.listeners.add(listener);
        }

        removeListener(listener: (event: any) => void): void {
          this.listeners.delete(listener);
        }

        private notifyListeners(event: any): void {
          this.listeners.forEach((listener) => {
            try {
              listener(event);
            } catch (error) {
              console.error("Registry listener error:", error);
            }
          });
        }
      }

      serviceRegistry = new ServiceRegistry();
    });

    it("should initialize empty registry", () => {
      expect(serviceRegistry.count()).toBe(0);
      expect(Object.keys(serviceRegistry.getAll())).toHaveLength(0);
    });

    it("should register and retrieve services", () => {
      const serviceInfo = {
        name: "user-service",
        version: "1.0.0",
        endpoint: "http://localhost:3001",
      };

      serviceRegistry.register("user-service", serviceInfo);

      expect(serviceRegistry.has("user-service")).toBe(true);
      expect(serviceRegistry.count()).toBe(1);

      const retrieved = serviceRegistry.get("user-service");
      expect(retrieved.id).toBe("user-service");
      expect(retrieved.name).toBe("user-service");
      expect(retrieved.version).toBe("1.0.0");
      expect(retrieved.endpoint).toBe("http://localhost:3001");
      expect(retrieved.status).toBe("active");
      expect(typeof retrieved.registeredAt).toBe("string");
    });

    it("should prevent duplicate registrations", () => {
      const serviceInfo = { name: "duplicate-service" };

      serviceRegistry.register("service-1", serviceInfo);

      expect(() => {
        serviceRegistry.register("service-1", serviceInfo);
      }).toThrow("Service service-1 is already registered");
    });

    it("should unregister services", () => {
      const serviceInfo = { name: "temp-service" };

      serviceRegistry.register("temp-service", serviceInfo);
      expect(serviceRegistry.has("temp-service")).toBe(true);

      const unregistered = serviceRegistry.unregister("temp-service");
      expect(unregistered).toBe(true);
      expect(serviceRegistry.has("temp-service")).toBe(false);
      expect(serviceRegistry.count()).toBe(0);

      const unregisteredAgain = serviceRegistry.unregister("temp-service");
      expect(unregisteredAgain).toBe(false);
    });

    it("should find services by predicate", () => {
      serviceRegistry.register("service-1", { name: "Service One", version: "1.0.0" });
      serviceRegistry.register("service-2", { name: "Service Two", version: "1.0.0" });
      serviceRegistry.register("service-3", { name: "Service Three", version: "2.0.0" });

      const v1Services = serviceRegistry.find((service: any) => service.version === "1.0.0");
      const v2Services = serviceRegistry.find((service: any) => service.version === "2.0.0");
      const nameMatches = serviceRegistry.find((service: any) => service.name.includes("One"));

      expect(v1Services.length).toBe(2);
      expect(v2Services.length).toBe(1);
      expect(nameMatches.length).toBe(1);
      expect(nameMatches[0].name).toBe("Service One");
    });

    it("should update service status", () => {
      serviceRegistry.register("test-service", { name: "Test Service" });

      const updated = serviceRegistry.updateStatus("test-service", "maintenance");
      expect(updated).toBe(true);

      const service = serviceRegistry.get("test-service");
      expect(service.status).toBe("maintenance");
      expect(typeof service.lastUpdated).toBe("string");

      const notUpdated = serviceRegistry.updateStatus("non-existent", "active");
      expect(notUpdated).toBe(false);
    });

    it("should handle health checks", async () => {
      const healthyCheck = vi.fn().mockResolvedValue(true);
      const unhealthyCheck = vi.fn().mockResolvedValue(false);
      const errorCheck = vi.fn().mockRejectedValue(new Error("Health check failed"));

      serviceRegistry.register("healthy-service", { name: "Healthy Service" });
      serviceRegistry.register("unhealthy-service", { name: "Unhealthy Service" });
      serviceRegistry.register("error-service", { name: "Error Service" });

      serviceRegistry.addHealthCheck("healthy-service", healthyCheck);
      serviceRegistry.addHealthCheck("unhealthy-service", unhealthyCheck);
      serviceRegistry.addHealthCheck("error-service", errorCheck);

      const healthyResult = await serviceRegistry.checkHealth("healthy-service");
      const unhealthyResult = await serviceRegistry.checkHealth("unhealthy-service");
      const errorResult = await serviceRegistry.checkHealth("error-service");
      const noCheckResult = await serviceRegistry.checkHealth("test-service");

      expect(healthyResult).toBe(true);
      expect(unhealthyResult).toBe(false);
      expect(errorResult).toBe(false);
      expect(noCheckResult).toBeNull();

      expect(serviceRegistry.get("healthy-service").status).toBe("healthy");
      expect(serviceRegistry.get("unhealthy-service").status).toBe("unhealthy");
      expect(serviceRegistry.get("error-service").status).toBe("error");
    });

    it("should check all services health", async () => {
      const healthyCheck = vi.fn().mockResolvedValue(true);
      const unhealthyCheck = vi.fn().mockResolvedValue(false);

      serviceRegistry.register("service-1", { name: "Service 1" });
      serviceRegistry.register("service-2", { name: "Service 2" });
      serviceRegistry.register("service-3", { name: "Service 3" });

      serviceRegistry.addHealthCheck("service-1", healthyCheck);
      serviceRegistry.addHealthCheck("service-2", unhealthyCheck);
      // service-3 has no health check

      const results = await serviceRegistry.checkAllHealth();

      expect(results["service-1"]).toBe(true);
      expect(results["service-2"]).toBe(false);
      expect(results["service-3"]).toBeNull();
    });

    it("should notify listeners of registry events", () => {
      const listener = vi.fn();
      serviceRegistry.addListener(listener);

      serviceRegistry.register("test-service", { name: "Test Service" });
      serviceRegistry.updateStatus("test-service", "maintenance");
      serviceRegistry.unregister("test-service");

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "service.registered" }));
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "service.status_changed" }));
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "service.unregistered" }));
    });

    it("should handle listener errors gracefully", () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });
      const normalListener = vi.fn();

      serviceRegistry.addListener(errorListener);
      serviceRegistry.addListener(normalListener);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      serviceRegistry.register("test-service", { name: "Test Service" });

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Registry listener error:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should clear all services", () => {
      const listener = vi.fn();
      serviceRegistry.addListener(listener);

      serviceRegistry.register("service-1", { name: "Service 1" });
      serviceRegistry.register("service-2", { name: "Service 2" });
      serviceRegistry.addHealthCheck("service-1", () => Promise.resolve(true));

      expect(serviceRegistry.count()).toBe(2);

      serviceRegistry.clear();

      expect(serviceRegistry.count()).toBe(0);
      expect(Object.keys(serviceRegistry.getAll())).toHaveLength(0);

      // Should notify unregistration for each service
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "service.unregistered" }));
    });
  });

  describe("CapabilityRegistry", () => {
    let capabilityRegistry: any;

    beforeEach(() => {
      // Mock CapabilityRegistry class implementation
      class CapabilityRegistry {
        private capabilities = new Map<string, any>();
        private serviceCapabilities = new Map<string, Set<string>>();

        registerCapability(capabilityId: string, capability: any): void {
          this.capabilities.set(capabilityId, {
            ...capability,
            id: capabilityId,
            registeredAt: new Date().toISOString(),
          });
        }

        unregisterCapability(capabilityId: string): boolean {
          const removed = this.capabilities.delete(capabilityId);

          // Remove from service mappings
          for (const [serviceId, caps] of this.serviceCapabilities) {
            caps.delete(capabilityId);
            if (caps.size === 0) {
              this.serviceCapabilities.delete(serviceId);
            }
          }

          return removed;
        }

        getCapability(capabilityId: string): any | undefined {
          return this.capabilities.get(capabilityId);
        }

        getAllCapabilities(): any[] {
          return Array.from(this.capabilities.values());
        }

        associateWithService(serviceId: string, capabilityId: string): boolean {
          if (!this.capabilities.has(capabilityId)) {
            return false;
          }

          if (!this.serviceCapabilities.has(serviceId)) {
            this.serviceCapabilities.set(serviceId, new Set());
          }

          this.serviceCapabilities.get(serviceId)!.add(capabilityId);
          return true;
        }

        disassociateFromService(serviceId: string, capabilityId: string): boolean {
          const serviceCaps = this.serviceCapabilities.get(serviceId);
          if (!serviceCaps) {
            return false;
          }

          const removed = serviceCaps.delete(capabilityId);
          if (serviceCaps.size === 0) {
            this.serviceCapabilities.delete(serviceId);
          }

          return removed;
        }

        getServiceCapabilities(serviceId: string): any[] {
          const capabilityIds = this.serviceCapabilities.get(serviceId);
          if (!capabilityIds) {
            return [];
          }

          return Array.from(capabilityIds)
            .map((id) => this.capabilities.get(id))
            .filter((cap) => cap !== undefined);
        }

        findCapabilitiesByTag(tag: string): any[] {
          return Array.from(this.capabilities.values()).filter((cap) => cap.tags && cap.tags.includes(tag));
        }

        findServicesByCapability(capabilityId: string): string[] {
          const services: string[] = [];

          for (const [serviceId, caps] of this.serviceCapabilities) {
            if (caps.has(capabilityId)) {
              services.push(serviceId);
            }
          }

          return services;
        }
      }

      capabilityRegistry = new CapabilityRegistry();
    });

    it("should register and retrieve capabilities", () => {
      const capability = {
        name: "data-processing",
        description: "Process user data",
        version: "1.0.0",
        tags: ["data", "processing"],
      };

      capabilityRegistry.registerCapability("data-proc-1", capability);

      const retrieved = capabilityRegistry.getCapability("data-proc-1");
      expect(retrieved.id).toBe("data-proc-1");
      expect(retrieved.name).toBe("data-processing");
      expect(retrieved.tags).toEqual(["data", "processing"]);
      expect(typeof retrieved.registeredAt).toBe("string");
    });

    it("should associate capabilities with services", () => {
      capabilityRegistry.registerCapability("cap-1", { name: "Capability 1" });
      capabilityRegistry.registerCapability("cap-2", { name: "Capability 2" });

      const associated1 = capabilityRegistry.associateWithService("service-1", "cap-1");
      const associated2 = capabilityRegistry.associateWithService("service-1", "cap-2");
      const associatedInvalid = capabilityRegistry.associateWithService("service-1", "non-existent");

      expect(associated1).toBe(true);
      expect(associated2).toBe(true);
      expect(associatedInvalid).toBe(false);

      const serviceCaps = capabilityRegistry.getServiceCapabilities("service-1");
      expect(serviceCaps.length).toBe(2);
      expect(serviceCaps.map((cap: any) => cap.name)).toEqual(["Capability 1", "Capability 2"]);
    });

    it("should find capabilities by tag", () => {
      capabilityRegistry.registerCapability("cap-1", {
        name: "Cap 1",
        tags: ["data", "processing"],
      });
      capabilityRegistry.registerCapability("cap-2", {
        name: "Cap 2",
        tags: ["data", "storage"],
      });
      capabilityRegistry.registerCapability("cap-3", {
        name: "Cap 3",
        tags: ["processing", "analytics"],
      });

      const dataCapabilities = capabilityRegistry.findCapabilitiesByTag("data");
      const processingCapabilities = capabilityRegistry.findCapabilitiesByTag("processing");
      const nonExistentCapabilities = capabilityRegistry.findCapabilitiesByTag("non-existent");

      expect(dataCapabilities.length).toBe(2);
      expect(processingCapabilities.length).toBe(2);
      expect(nonExistentCapabilities.length).toBe(0);
    });

    it("should find services by capability", () => {
      capabilityRegistry.registerCapability("shared-cap", { name: "Shared Capability" });

      capabilityRegistry.associateWithService("service-1", "shared-cap");
      capabilityRegistry.associateWithService("service-2", "shared-cap");
      capabilityRegistry.associateWithService("service-3", "shared-cap");

      const services = capabilityRegistry.findServicesByCapability("shared-cap");
      expect(services).toEqual(["service-1", "service-2", "service-3"]);

      const noServices = capabilityRegistry.findServicesByCapability("non-existent");
      expect(noServices).toEqual([]);
    });
  });
});
