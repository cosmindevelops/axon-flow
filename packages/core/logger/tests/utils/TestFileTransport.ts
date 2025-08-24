/**
 * Real file transport implementation for testing using actual filesystem operations
 */

import { mkdtempSync, writeFileSync, appendFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import type { ITransportProvider, ITransportMetrics, ITransportHealth } from "../../src/transport/transport.types.js";

export class TestFileTransport implements ITransportProvider {
  public readonly type = "file";
  private tempDir: string;
  private filePath: string;
  private metrics: ITransportMetrics;
  private isOpen = true;
  private writeStartTime = 0;

  constructor(filename = "test.log") {
    // Create real temporary directory
    this.tempDir = mkdtempSync(join(tmpdir(), "logger-test-"));
    this.filePath = join(this.tempDir, filename);

    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      lastWriteTime: undefined,
      lastErrorTime: undefined,
      averageWriteTime: 0,
    };

    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async write(logEntry: Record<string, unknown>): Promise<void> {
    if (!this.isOpen) {
      throw new Error("Transport is closed");
    }

    this.writeStartTime = Date.now();

    try {
      // Serialize the log entry as JSON with newline
      const serialized = JSON.stringify(logEntry) + "\n";

      // Use real filesystem operations
      appendFileSync(this.filePath, serialized, { encoding: "utf8" });

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
    // File operations are synchronous and already flushed
  }

  isHealthy(): boolean {
    return this.isOpen && existsSync(this.tempDir);
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
        canWrite: this.isOpen && existsSync(this.tempDir),
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

    // Clear the file content
    if (existsSync(this.filePath)) {
      writeFileSync(this.filePath, "", { encoding: "utf8" });
    }
  }

  // Test utility methods
  getTempDir(): string {
    return this.tempDir;
  }

  getFilePath(): string {
    return this.filePath;
  }

  getFileContents(): string {
    if (!existsSync(this.filePath)) {
      return "";
    }
    return readFileSync(this.filePath, { encoding: "utf8" });
  }

  getLogLines(): string[] {
    const contents = this.getFileContents();
    return contents.split("\n").filter((line) => line.trim() !== "");
  }

  getParsedLogs(): Record<string, unknown>[] {
    return this.getLogLines().map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  }

  hasLogMatching(predicate: (log: Record<string, unknown>) => boolean): boolean {
    return this.getParsedLogs().some(predicate);
  }

  findLogsMatching(predicate: (log: Record<string, unknown>) => boolean): Record<string, unknown>[] {
    return this.getParsedLogs().filter(predicate);
  }

  getLogCount(): number {
    return this.getLogLines().length;
  }

  fileExists(): boolean {
    return existsSync(this.filePath);
  }

  cleanup(): void {
    if (existsSync(this.tempDir)) {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  // Static utility for test cleanup
  static cleanup(transport: TestFileTransport): void {
    transport.cleanup();
  }
}
