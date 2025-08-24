/**
 * Registry management class implementations
 */

/**
 * ServiceRegistry manages service registration and health monitoring
 */
export class ServiceRegistry {
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
    for (const service of Array.from(this.services.values())) {
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

    for (const serviceId of Array.from(this.services.keys())) {
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

/**
 * CapabilityRegistry manages service capabilities and associations
 */
export class CapabilityRegistry {
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
    for (const [serviceId, caps] of Array.from(this.serviceCapabilities.entries())) {
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

    for (const [serviceId, caps] of Array.from(this.serviceCapabilities.entries())) {
      if (caps.has(capabilityId)) {
        services.push(serviceId);
      }
    }

    return services;
  }
}
