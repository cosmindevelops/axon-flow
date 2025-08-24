/**
 * In-memory transport implementation for testing
 */

import type { ITransportProvider, ITransportMetrics, ITransportHealth } from "../../src/transport/transport.types.js";

export class InMemoryTransport implements ITransportProvider {
  public readonly type = "memory";
  private logs: Record<string, unknown>[] = [];
  private metrics: ITransportMetrics;
  private isOpen = true;
  private writeStartTime = 0;

  constructor() {
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      lastWriteTime: undefined,
      lastErrorTime: undefined,
      averageWriteTime: 0,
    };
  }

  async write(logEntry: Record<string, unknown>): Promise<void> {
    if (!this.isOpen) {
      throw new Error("Transport is closed");
    }

    this.writeStartTime = Date.now();

    try {
      // Simulate real transport behavior by serializing the entry
      const serialized = JSON.stringify(logEntry);
      this.logs.push(logEntry);

      this.metrics.messagesWritten++;
      this.metrics.bytesWritten += serialized.length;
      this.metrics.lastWriteTime = new Date();

      const writeTime = Date.now() - this.writeStartTime;
      this.metrics.averageWriteTime =
        (this.metrics.averageWriteTime * (this.metrics.messagesWritten - 1) + writeTime) / this.metrics.messagesWritten;
    } catch (error) {
      this.metrics.messagesFailed++;
      this.metrics.lastErrorTime = new Date();
      throw error;
    }
  }

  async close(): Promise<void> {
    this.isOpen = false;
  }

  async flush(): Promise<void> {
    // In-memory transport doesn't need flushing
  }

  isHealthy(): boolean {
    return this.isOpen;
  }

  getMetrics(): ITransportMetrics {
    return { ...this.metrics };
  }

  getHealth(): ITransportHealth {
    const errorRate =
      this.metrics.messagesWritten > 0 ? (this.metrics.messagesFailed / this.metrics.messagesWritten) * 100 : 0;

    return {
      status: this.isHealthy() ? "healthy" : "unhealthy",
      lastCheck: new Date(),
      details: {
        canWrite: this.isOpen,
        canFlush: true,
        errorRate,
        avgResponseTime: this.metrics.averageWriteTime,
        consecutiveFailures: 0,
      },
    };
  }

  reset(): void {
    this.logs = [];
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      lastWriteTime: undefined,
      lastErrorTime: undefined,
      averageWriteTime: 0,
    };
    this.isOpen = true;
  }

  // Test utility methods
  getLogs(): Record<string, unknown>[] {
    return [...this.logs];
  }

  getLogCount(): number {
    return this.logs.length;
  }

  getLastLog(): Record<string, unknown> | undefined {
    return this.logs[this.logs.length - 1];
  }

  hasLog(predicate: (log: Record<string, unknown>) => boolean): boolean {
    return this.logs.some(predicate);
  }

  findLogs(predicate: (log: Record<string, unknown>) => boolean): Record<string, unknown>[] {
    return this.logs.filter(predicate);
  }

  clear(): void {
    this.logs = [];
  }
}
