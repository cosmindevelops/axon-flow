/**
 * High-performance transport implementations for different output destinations
 */

import type { SonicBoom } from "sonic-boom";
import { createWriteStream, type WriteStream } from "fs";

import type { ITransportProvider, ILogEntry, TransportType, ITransportConfig } from "../types/index.js";

/**
 * Console transport for development and debugging
 */
export class ConsoleTransportProvider implements ITransportProvider {
  readonly type: TransportType = "console";
  private readonly stream: NodeJS.WriteStream | SonicBoom;
  private healthy = true;

  constructor(_config: ITransportConfig) {
    // Use stdout for now - will enhance with pino.destination later
    this.stream = process.stdout;

    // Handle stream errors
    this.stream.on("error", (error) => {
      console.error("Console transport error:", error);
      this.healthy = false;
    });
  }

  write(entry: ILogEntry): void {
    if (!this.healthy) {
      throw new Error("Console transport is not healthy");
    }

    const logLine = JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      correlationId: entry.correlationId,
      ...entry.meta,
    });

    this.stream.write(`${logLine}\n`);
  }

  async flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ("writable" in this.stream && this.stream.writable) {
        this.stream.write("", (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else if ("flush" in this.stream) {
        // SonicBoom has a flush method
        this.stream.flush();
        resolve();
      } else {
        resolve();
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.stream !== process.stdout && this.stream !== process.stderr) {
        if ("end" in this.stream && typeof this.stream.end === "function") {
          this.stream.end(() => {
            resolve();
          });
        } else if ("destroy" in this.stream && typeof this.stream.destroy === "function") {
          // SonicBoom has a destroy method
          this.stream.destroy();
          resolve();
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}

/**
 * File transport for persistent logging
 */
export class FileTransportProvider implements ITransportProvider {
  readonly type: TransportType = "file";
  private readonly stream: WriteStream;
  private healthy = true;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: ITransportConfig) {
    if (!config.destination) {
      throw new Error("File transport requires a destination path");
    }

    // Create a simple file stream for now - will enhance with pino.destination later
    this.stream = createWriteStream(config.destination, { flags: "a" });

    // Handle stream errors
    this.stream.on("error", (error) => {
      console.error("File transport error:", error);
      this.healthy = false;
    });

    // Set up automatic flushing
    const flushIntervalMs =
      typeof config.options?.["flushIntervalMs"] === "number" ? config.options["flushIntervalMs"] : 5000;
    this.flushInterval = setInterval(() => {
      void this.flush();
    }, flushIntervalMs);
  }

  async write(entry: ILogEntry): Promise<void> {
    if (!this.healthy) {
      throw new Error("File transport is not healthy");
    }

    const logLine = JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      correlationId: entry.correlationId,
      ...entry.meta,
    });

    this.buffer.push(logLine);

    // Auto-flush if buffer gets too large
    const bufferSize = 1000; // Default buffer size
    if (this.buffer.length >= bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const lines = this.buffer.splice(0);
    const content = `${lines.join("\n")}\n`;

    return new Promise((resolve, _reject) => {
      this.stream.write(content);
      // SonicBoom doesn't use callback for write, so we resolve immediately
      resolve();
    });
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();

    return new Promise((resolve) => {
      this.stream.destroy();
      resolve();
    });
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}

/**
 * Remote transport for centralized logging
 */
export class RemoteTransportProvider implements ITransportProvider {
  readonly type: TransportType = "remote";
  private healthy = true;
  private buffer: ILogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(config: ITransportConfig) {
    if (!config.destination) {
      throw new Error("Remote transport requires an endpoint URL");
    }

    this.endpoint = config.destination;
    this.headers = {
      "Content-Type": "application/json",
      ...(typeof config.options?.["headers"] === "object" && config.options["headers"] !== null
        ? (config.options["headers"] as Record<string, string>)
        : {}),
    };

    // Set up automatic flushing
    const flushIntervalMs =
      typeof config.options?.["flushIntervalMs"] === "number" ? config.options["flushIntervalMs"] : 10000;
    this.flushInterval = setInterval(() => {
      void this.flush();
    }, flushIntervalMs);
  }

  async write(entry: ILogEntry): Promise<void> {
    if (!this.healthy) {
      throw new Error("Remote transport is not healthy");
    }

    this.buffer.push(entry);

    // Auto-flush if buffer gets too large
    const bufferSize = this.buffer.length >= 100;
    if (bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0);
    const payload = {
      logs: entries.map((entry) => ({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        correlationId: entry.correlationId,
        ...entry.meta,
      })),
    };

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status.toString()} ${response.statusText}`);
      }

      this.healthy = true;
    } catch (error) {
      // Return entries to buffer on error
      this.buffer.unshift(...entries);
      this.healthy = false;
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}

/**
 * Transport factory function
 */
export function createTransport(config: ITransportConfig): ITransportProvider {
  switch (config.type) {
    case "console":
      return new ConsoleTransportProvider(config);
    case "file":
      return new FileTransportProvider(config);
    case "remote":
      return new RemoteTransportProvider(config);
    default:
      throw new Error(`Unsupported transport type: ${config.type as string}`);
  }
}

/**
 * Multi-transport manager for handling multiple outputs
 */
export class MultiTransportManager {
  private readonly transports: ITransportProvider[];

  constructor(configs: ITransportConfig[]) {
    this.transports = configs.map(createTransport);
  }

  async write(entry: ILogEntry): Promise<void> {
    const writePromises = this.transports
      .filter((transport) => transport.isHealthy())
      .map((transport) => transport.write(entry));

    if (writePromises.length === 0) {
      throw new Error("No healthy transports available");
    }

    // Write to all transports in parallel, don't fail if some transports fail
    await Promise.allSettled(writePromises);
  }

  async flush(): Promise<void> {
    const flushPromises = this.transports.map((transport) => transport.flush());
    await Promise.allSettled(flushPromises);
  }

  async close(): Promise<void> {
    const closePromises = this.transports.map((transport) => transport.close());
    await Promise.allSettled(closePromises);
  }

  getHealthyTransports(): ITransportProvider[] {
    return this.transports.filter((transport) => transport.isHealthy());
  }

  getAllTransports(): ITransportProvider[] {
    return [...this.transports];
  }
}
