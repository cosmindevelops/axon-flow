/**
 * Test suite for registry management classes
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ServiceRegistry, CapabilityRegistry } from "../../../../src/core/registry/index.js";

describe("Registry Management Classes", () => {
  describe("ServiceRegistry", () => {
    let serviceRegistry: ServiceRegistry;

    beforeEach(() => {
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
      // Real health check functions that return actual results
      const healthyCheck = async (): Promise<boolean> => true;
      const unhealthyCheck = async (): Promise<boolean> => false;
      const errorCheck = async (): Promise<boolean> => {
        throw new Error("Health check failed");
      };

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
      // Real health check functions
      const healthyCheck = async (): Promise<boolean> => true;
      const unhealthyCheck = async (): Promise<boolean> => false;

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
      let eventCount = 0;
      const events: any[] = [];

      // Real listener function that captures events
      const listener = (event: any) => {
        eventCount++;
        events.push(event);
      };

      serviceRegistry.addListener(listener);

      serviceRegistry.register("test-service", { name: "Test Service" });
      serviceRegistry.updateStatus("test-service", "maintenance");
      serviceRegistry.unregister("test-service");

      expect(eventCount).toBe(3);
      expect(events[0]).toMatchObject({ type: "service.registered" });
      expect(events[1]).toMatchObject({ type: "service.status_changed" });
      expect(events[2]).toMatchObject({ type: "service.unregistered" });
    });

    it("should handle listener errors gracefully", () => {
      let errorCount = 0;
      let normalCount = 0;

      // Real error listener that actually throws
      const errorListener = () => {
        errorCount++;
        throw new Error("Listener error");
      };

      // Real normal listener
      const normalListener = () => {
        normalCount++;
      };

      serviceRegistry.addListener(errorListener);
      serviceRegistry.addListener(normalListener);

      // Mock console.error to capture the error message
      const originalConsoleError = console.error;
      let consoleErrorCalled = false;
      console.error = () => {
        consoleErrorCalled = true;
      };

      serviceRegistry.register("test-service", { name: "Test Service" });

      expect(errorCount).toBe(1);
      expect(normalCount).toBe(1);
      expect(consoleErrorCalled).toBe(true);

      // Restore console.error
      console.error = originalConsoleError;
    });

    it("should clear all services", () => {
      let eventCount = 0;
      const listener = () => {
        eventCount++;
      };
      serviceRegistry.addListener(listener);

      serviceRegistry.register("service-1", { name: "Service 1" });
      serviceRegistry.register("service-2", { name: "Service 2" });
      serviceRegistry.addHealthCheck("service-1", () => Promise.resolve(true));

      expect(serviceRegistry.count()).toBe(2);

      serviceRegistry.clear();

      expect(serviceRegistry.count()).toBe(0);
      expect(Object.keys(serviceRegistry.getAll())).toHaveLength(0);

      // Should notify unregistration for each service (registration + 2 unregistrations = 4 events)
      expect(eventCount).toBe(4);
    });
  });

  describe("CapabilityRegistry", () => {
    let capabilityRegistry: CapabilityRegistry;

    beforeEach(() => {
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
