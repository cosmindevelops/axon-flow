/**
 * Real HTTP transport implementation for testing using actual HTTP server
 */

import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import type { ITransportProvider, ITransportMetrics, ITransportHealth } from "../../src/transport/transport.types.js";

export interface TestHttpTransportOptions {
  port?: number;
  host?: string;
  path?: string;
  responseDelay?: number;
  shouldFail?: boolean;
  statusCode?: number;
}

export class TestHttpTransport implements ITransportProvider {
  public readonly type = "http";
  private server: Server;
  private port: number;
  private host: string;
  private path: string;
  private isServerRunning = false;
  private metrics: ITransportMetrics;
  private isOpen = true;
  private writeStartTime = 0;

  // Test utilities
  private receivedRequests: Array<{
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    body: string;
    timestamp: Date;
  }> = [];

  private options: TestHttpTransportOptions;

  constructor(options: TestHttpTransportOptions = {}) {
    this.options = {
      port: 0, // Let the system assign a port
      host: "localhost",
      path: "/logs",
      responseDelay: 0,
      shouldFail: false,
      statusCode: 200,
      ...options,
    };

    this.port = this.options.port!;
    this.host = this.options.host!;
    this.path = this.options.path!;

    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      lastWriteTime: undefined,
      lastErrorTime: undefined,
      averageWriteTime: 0,
    };

    this.server = this.createHttpServer();
  }

  private createHttpServer(): Server {
    return createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        // Store the request for test inspection
        this.receivedRequests.push({
          method: req.method || "UNKNOWN",
          url: req.url || "",
          headers: req.headers as Record<string, string | string[]>,
          body,
          timestamp: new Date(),
        });

        // Simulate response delay if configured
        const respond = () => {
          if (this.options.shouldFail) {
            res.writeHead(this.options.statusCode || 500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Simulated server error" }));
          } else {
            res.writeHead(this.options.statusCode || 200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, received: body.length }));
          }
        };

        if (this.options.responseDelay && this.options.responseDelay > 0) {
          setTimeout(respond, this.options.responseDelay);
        } else {
          respond();
        }
      });

      req.on("error", (err) => {
        console.error("HTTP request error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request processing error" }));
      });
    });
  }

  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        const address = this.server.address();
        if (address && typeof address === "object") {
          this.port = address.port;
        }
        this.isServerRunning = true;
        resolve();
      });

      this.server.on("error", (err) => {
        reject(err);
      });
    });
  }

  async stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isServerRunning) {
        this.server.close(() => {
          this.isServerRunning = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async write(logEntry: Record<string, unknown>): Promise<void> {
    if (!this.isOpen) {
      throw new Error("Transport is closed");
    }

    if (!this.isServerRunning) {
      throw new Error("HTTP server is not running");
    }

    this.writeStartTime = Date.now();

    return new Promise((resolve, reject) => {
      try {
        const serialized = JSON.stringify(logEntry);
        const postData = serialized;

        const options = {
          hostname: this.host,
          port: this.port,
          path: this.path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
        };

        const req = require("http").request(options, (res: IncomingMessage) => {
          let responseBody = "";

          res.on("data", (chunk) => {
            responseBody += chunk;
          });

          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              this.metrics.messagesWritten++;
              this.metrics.bytesWritten += serialized.length;
              this.metrics.lastWriteTime = new Date();

              const writeTime = Date.now() - this.writeStartTime;
              this.metrics.averageWriteTime =
                (this.metrics.averageWriteTime * (this.metrics.messagesWritten - 1) + writeTime) /
                this.metrics.messagesWritten;

              resolve();
            } else {
              const error = new Error(`HTTP ${res.statusCode}: ${responseBody}`);
              this.metrics.messagesFailed++;
              this.metrics.lastErrorTime = new Date();
              reject(error);
            }
          });
        });

        req.on("error", (error: Error) => {
          this.metrics.messagesFailed++;
          this.metrics.lastErrorTime = new Date();
          reject(error);
        });

        req.write(postData);
        req.end();
      } catch (error) {
        this.metrics.messagesFailed++;
        this.metrics.lastErrorTime = new Date();
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    this.isOpen = false;
    await this.stopServer();
  }

  async flush(): Promise<void> {
    // HTTP requests are immediate, no buffering to flush
  }

  isHealthy(): boolean {
    return this.isOpen && this.isServerRunning;
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
        canWrite: this.isOpen && this.isServerRunning,
        canFlush: true,
        errorRate,
        avgResponseTime: this.metrics.averageWriteTime,
        consecutiveFailures: 0,
      },
    };
  }

  reset(): void {
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      lastWriteTime: undefined,
      lastErrorTime: undefined,
      averageWriteTime: 0,
    };
    this.receivedRequests = [];
  }

  // Test utility methods
  getServerUrl(): string {
    return `http://${this.host}:${this.port}${this.path}`;
  }

  getPort(): number {
    return this.port;
  }

  getHost(): string {
    return this.host;
  }

  getReceivedRequests(): Array<{
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    body: string;
    timestamp: Date;
  }> {
    return [...this.receivedRequests];
  }

  getRequestCount(): number {
    return this.receivedRequests.length;
  }

  getLastRequest():
    | {
        method: string;
        url: string;
        headers: Record<string, string | string[]>;
        body: string;
        timestamp: Date;
      }
    | undefined {
    return this.receivedRequests[this.receivedRequests.length - 1];
  }

  hasReceivedRequest(predicate?: (request: any) => boolean): boolean {
    if (!predicate) {
      return this.receivedRequests.length > 0;
    }
    return this.receivedRequests.some(predicate);
  }

  findRequests(predicate: (request: any) => boolean): any[] {
    return this.receivedRequests.filter(predicate);
  }

  getParsedRequestBodies(): Record<string, unknown>[] {
    return this.receivedRequests.map((req) => {
      try {
        return JSON.parse(req.body);
      } catch {
        return { raw: req.body };
      }
    });
  }

  clearRequests(): void {
    this.receivedRequests = [];
  }

  // Configuration methods for testing different scenarios
  setShouldFail(shouldFail: boolean): void {
    this.options.shouldFail = shouldFail;
  }

  setStatusCode(statusCode: number): void {
    this.options.statusCode = statusCode;
  }

  setResponseDelay(delay: number): void {
    this.options.responseDelay = delay;
  }

  // Static utility for test setup and cleanup
  static async create(options?: TestHttpTransportOptions): Promise<TestHttpTransport> {
    const transport = new TestHttpTransport(options);
    await transport.startServer();
    return transport;
  }

  static async cleanup(transport: TestHttpTransport): Promise<void> {
    await transport.close();
  }
}
