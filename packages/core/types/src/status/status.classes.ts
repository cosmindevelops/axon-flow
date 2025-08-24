/**
 * Status management class implementations
 */

/**
 * StatusManager manages application status states with event notification
 */
export class StatusManager {
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

/**
 * HealthChecker manages service health checks with periodic monitoring
 */
export class HealthChecker {
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

    for (const name of Array.from(this.services.keys())) {
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

    for (const [name, service] of Array.from(this.services.entries())) {
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

/**
 * StatusReporter aggregates status information from multiple sources
 */
export class StatusReporter {
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

    for (const [name, sourceFn] of Array.from(this.statusSources.entries())) {
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
