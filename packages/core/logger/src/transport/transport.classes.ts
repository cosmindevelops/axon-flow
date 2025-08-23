/**
 * High-performance transport implementations for different output destinations
 */

import type { SonicBoom } from "sonic-boom";
import { createWriteStream, createReadStream, type WriteStream, promises as fs } from "fs";
import { join, dirname, basename, extname } from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";

import type {
  ITransportProvider,
  ITransportConfig,
  ITransportMetrics,
  IMultiTransportConfig,
  ITransportRoutingRule,
  LogLevel,
  IFileRotationConfig,
  IConsoleTransportOptions,
  IFileTransportOptions,
  IRemoteTransportOptions,
  IRoutingConfig,
  ITransportHealth,
  TransportFilter,
} from "./transport.types.js";

import type { ILogEntry, TransportType } from "../types/index.js";

import { TransportCircuitBreakerFactory, RetryableCircuitBreaker } from "../circuit-breaker/circuit-breaker.classes.js";

import { FileRotationManager, CrossEnvironmentAdapter, PerformanceTracker } from "../utils/utils.classes.js";

import type { ICircuitBreakerConfig } from "../circuit-breaker/circuit-breaker.types.js";

/**
 * Enhanced console transport for development and debugging
 */
export class ConsoleTransportProvider implements ITransportProvider {
  readonly type: string = "console";
  private readonly stream: NodeJS.WriteStream | SonicBoom;
  private healthy = true;
  private metrics: ITransportMetrics;
  private readonly options: IConsoleTransportOptions;
  private readonly adapter: CrossEnvironmentAdapter;

  constructor(config: ITransportConfig) {
    this.options = (config.options as IConsoleTransportOptions) || {};
    this.adapter = CrossEnvironmentAdapter.getInstance();

    // Use stdout for now - will enhance with pino.destination later
    this.stream = process.stdout;

    // Initialize metrics
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };

    // Handle stream errors
    this.stream.on("error", (error) => {
      console.error("Console transport error:", error);
      this.healthy = false;
      this.metrics.lastErrorTime = new Date();
    });
  }

  async write(logEntry: Record<string, unknown>): Promise<void> {
    const entry = logEntry as unknown as ILogEntry;

    if (!this.healthy) {
      this.metrics.messagesFailed++;
      throw new Error("Console transport is not healthy");
    }

    const startTime = this.adapter.getCurrentTimestamp();

    try {
      const logLine = this.formatLogEntry(entry);
      const dataSize = Buffer.byteLength(logLine, "utf8");

      this.stream.write(`${logLine}\n`);

      // Update metrics
      this.metrics.messagesWritten++;
      this.metrics.bytesWritten += dataSize;
      this.metrics.lastWriteTime = new Date();

      const duration = this.adapter.getCurrentTimestamp() - startTime;
      this.updateAverageWriteTime(duration);
    } catch (error) {
      this.metrics.messagesFailed++;
      this.metrics.lastErrorTime = new Date();
      throw error;
    }
  }

  private formatLogEntry(entry: ILogEntry): string {
    const data: Record<string, unknown> = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
    };

    if (entry.correlationId) {
      data["correlationId"] = entry.correlationId;
    }

    if (this.options.includeMetadata !== false) {
      Object.assign(data, entry.meta);
    }

    return this.adapter.formatForEnvironment(data);
  }

  private updateAverageWriteTime(duration: number): void {
    const count = this.metrics.messagesWritten;
    this.metrics.averageWriteTime = (this.metrics.averageWriteTime * (count - 1) + duration) / count;
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

  getMetrics(): ITransportMetrics {
    return { ...this.metrics };
  }

  getHealth(): ITransportHealth {
    const now = new Date();
    const totalMessages = this.metrics.messagesWritten + this.metrics.messagesFailed;
    const errorRate = totalMessages > 0 ? (this.metrics.messagesFailed / totalMessages) * 100 : 0;

    let status: "healthy" | "degraded" | "unhealthy" | "unknown" = "healthy";
    if (!this.healthy) {
      status = "unhealthy";
    } else if (errorRate > 10) {
      status = "degraded";
    }

    const healthData: ITransportHealth = {
      status,
      lastCheck: now,
      details: {
        canWrite: this.healthy,
        canFlush: true,
        errorRate,
        avgResponseTime: this.metrics.averageWriteTime,
        consecutiveFailures: this.healthy ? 0 : 1,
      },
    };

    if (!this.healthy) {
      healthData.error = "Console transport is not healthy";
    }

    return healthData;
  }

  reset(): void {
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };
    this.healthy = true;
  }
}

/**
 * Enhanced file transport with rotation support
 */
export class FileTransportProvider implements ITransportProvider {
  readonly type: string = "file";
  private healthy = true;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private metrics: ITransportMetrics;
  private readonly options: IFileTransportOptions;
  private readonly rotationManager?: FileRotationManager;
  private readonly adapter: CrossEnvironmentAdapter;

  // Enhanced rotation properties
  private rotationConfig?: IFileRotationConfig;
  private currentFileSize = 0;
  private lastRotationCheck = new Date();
  private archiveCount = 0;

  constructor(config: ITransportConfig) {
    this.options = (config.options as IFileTransportOptions) || { path: "app.log" };
    this.adapter = CrossEnvironmentAdapter.getInstance();

    // Parse rotation configuration
    if (this.options.rotation) {
      this.rotationConfig = this.options.rotation;
    }

    // Initialize rotation manager if rotation is configured
    if (this.rotationConfig && this.rotationConfig.strategy !== "none") {
      const rotationOptions: any = {
        strategy: this.rotationConfig.dateFormat ? "time" : "size",
        maxSize: this.rotationConfig.maxSize || 10 * 1024 * 1024, // 10MB default
        maxFiles: this.rotationConfig.maxFiles || 5,
        compressionFormat: "gzip", // Default compression format
      };

      if (this.rotationConfig.dateFormat) {
        rotationOptions.dateFormat = this.rotationConfig.dateFormat;
      }

      if (this.rotationConfig.compress !== undefined) {
        rotationOptions.compress = this.rotationConfig.compress;
      }

      this.rotationManager = new FileRotationManager(this.options.path, rotationOptions);
    }

    // Initialize metrics
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };

    // Set up automatic flushing
    const flushIntervalMs = this.options.flushInterval || 5000;
    this.flushInterval = setInterval(() => {
      void this.flush();
    }, flushIntervalMs);

    // Initialize current file size tracking
    this.initializeFileSizeTracking();
  }

  /**
   * Initialize file size tracking for rotation
   */
  private async initializeFileSizeTracking(): Promise<void> {
    if (!this.rotationConfig || this.rotationConfig.strategy === "none") {
      return;
    }

    try {
      const stats = await fs.stat(this.options.path);
      this.currentFileSize = stats.size;
    } catch {
      // File doesn't exist yet, start with size 0
      this.currentFileSize = 0;
    }
  }

  /**
   * Check if rotation is needed based on strategy
   */
  private checkRotationNeeded(): boolean {
    if (!this.rotationConfig || this.rotationConfig.strategy === "none") {
      return false;
    }

    const now = new Date();

    switch (this.rotationConfig.strategy) {
      case "size":
        return this.currentFileSize >= (this.rotationConfig.maxSize || 10 * 1024 * 1024);

      case "daily":
        return (
          now.getDate() !== this.lastRotationCheck.getDate() ||
          now.getMonth() !== this.lastRotationCheck.getMonth() ||
          now.getFullYear() !== this.lastRotationCheck.getFullYear()
        );

      case "hourly":
        return (
          now.getHours() !== this.lastRotationCheck.getHours() ||
          now.getDate() !== this.lastRotationCheck.getDate() ||
          now.getMonth() !== this.lastRotationCheck.getMonth() ||
          now.getFullYear() !== this.lastRotationCheck.getFullYear()
        );

      default:
        return false;
    }
  }

  /**
   * Perform file rotation
   */
  private async rotateFile(): Promise<void> {
    if (!this.rotationConfig) {
      return;
    }

    try {
      // Archive current file
      await this.archiveCurrentFile();

      // Reset tracking
      this.currentFileSize = 0;
      this.lastRotationCheck = new Date();
      this.archiveCount++;

      // Clean up old files based on retention policy
      await this.cleanupOldFiles();
    } catch (error) {
      this.metrics.lastErrorTime = new Date();
      throw new Error(`File rotation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Archive current file and optionally compress it
   */
  private async archiveCurrentFile(): Promise<void> {
    if (!this.rotationConfig) {
      return;
    }

    const now = new Date();
    const timestamp = this.formatTimestamp(now);
    const parsedPath = this.parsePath(this.options.path);

    let archiveFileName: string;

    // Generate archive filename based on strategy
    switch (this.rotationConfig.strategy) {
      case "daily":
        archiveFileName = `${parsedPath.name}.${timestamp.slice(0, 10)}${parsedPath.ext}`;
        break;
      case "hourly":
        archiveFileName = `${parsedPath.name}.${timestamp.slice(0, 13)}${parsedPath.ext}`;
        break;
      default:
        archiveFileName = `${parsedPath.name}.${timestamp}${parsedPath.ext}`;
    }

    const archivePath = join(parsedPath.dir, archiveFileName);

    try {
      // Check if current file exists and has content
      const stats = await fs.stat(this.options.path);
      if (stats.size === 0) {
        return; // No need to archive empty file
      }

      // Move current file to archive location
      await fs.rename(this.options.path, archivePath);

      // Compress if enabled
      if (this.rotationConfig.compress) {
        await this.compressFile(archivePath);
      }
    } catch (error) {
      // If rename fails, try copy and delete
      try {
        await fs.copyFile(this.options.path, archivePath);
        await fs.unlink(this.options.path);

        if (this.rotationConfig.compress) {
          await this.compressFile(archivePath);
        }
      } catch (fallbackError) {
        throw new Error(
          `Archive operation failed: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
        );
      }
    }
  }

  /**
   * Compress a file using gzip
   */
  private async compressFile(filePath: string): Promise<void> {
    const gzipPath = `${filePath}.gz`;

    try {
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(gzipPath);
      const gzipStream = createGzip();

      await pipeline(readStream, gzipStream, writeStream);

      // Remove original file after successful compression
      await fs.unlink(filePath);
    } catch (error) {
      // Clean up failed compression
      try {
        await fs.unlink(gzipPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Compression failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Clean up old files based on retention policy
   */
  private async cleanupOldFiles(): Promise<void> {
    if (!this.rotationConfig || !this.rotationConfig.maxFiles) {
      return;
    }

    const parsedPath = this.parsePath(this.options.path);
    const maxFiles = this.rotationConfig.maxFiles;

    try {
      const files = await fs.readdir(parsedPath.dir);
      const logFiles = files
        .filter((file) => file.startsWith(parsedPath.name) && file !== parsedPath.base)
        .map((file) => ({
          name: file,
          path: join(parsedPath.dir, file),
          stats: null as any,
        }));

      // Get file stats for sorting
      for (const file of logFiles) {
        try {
          file.stats = await fs.stat(file.path);
        } catch {
          // Skip files that can't be accessed
        }
      }

      // Sort by modification time (newest first)
      const validFiles = logFiles
        .filter((file) => file.stats !== null)
        .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

      // Delete excess files
      if (validFiles.length > maxFiles) {
        const filesToDelete = validFiles.slice(maxFiles);
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
          } catch {
            // Ignore deletion errors
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Parse file path into components
   */
  private parsePath(filePath: string): { dir: string; name: string; ext: string; base: string } {
    const dir = dirname(filePath);
    const ext = extname(filePath);
    const base = basename(filePath);
    const name = basename(filePath, ext);

    return { dir, name, ext, base };
  }

  /**
   * Format timestamp for file naming
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}-${hour}-${minute}`;
  }

  async write(logEntry: Record<string, unknown>): Promise<void> {
    const entry = logEntry as unknown as ILogEntry;

    if (!this.healthy) {
      this.metrics.messagesFailed++;
      throw new Error("File transport is not healthy");
    }

    const startTime = this.adapter.getCurrentTimestamp();

    try {
      // Check for rotation before writing
      if (this.checkRotationNeeded()) {
        await this.rotateFile();
      }

      const logLine = JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        correlationId: entry.correlationId,
        ...entry.meta,
      });

      this.buffer.push(logLine);

      // Update current file size tracking
      const lineSize = Buffer.byteLength(`${logLine}\n`, "utf8");
      this.currentFileSize += lineSize;

      // Auto-flush if buffer gets too large
      const bufferSize = this.options.bufferSize || 1000;
      if (this.buffer.length >= bufferSize) {
        await this.flush();
      }

      // Update metrics
      this.metrics.messagesWritten++;
      this.metrics.lastWriteTime = new Date();

      const duration = this.adapter.getCurrentTimestamp() - startTime;
      this.updateAverageWriteTime(duration);
    } catch (error) {
      this.metrics.messagesFailed++;
      this.metrics.lastErrorTime = new Date();
      throw error;
    }
  }

  private updateAverageWriteTime(duration: number): void {
    const count = this.metrics.messagesWritten;
    this.metrics.averageWriteTime = (this.metrics.averageWriteTime * (count - 1) + duration) / count;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const lines = this.buffer.splice(0);
    const content = `${lines.join("\n")}\n`;
    const dataSize = Buffer.byteLength(content, "utf8");

    try {
      if (this.rotationManager) {
        await this.rotationManager.write(content);
      } else {
        // Fallback to direct file writing
        const fs = await import("fs/promises");
        await fs.appendFile(this.options.path, content, (this.options.encoding as BufferEncoding) || "utf8");
      }

      this.metrics.bytesWritten += dataSize;
    } catch (error) {
      // Return lines to buffer on error
      this.buffer.unshift(...lines);
      this.healthy = false;
      this.metrics.lastErrorTime = new Date();
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();

    if (this.rotationManager) {
      await this.rotationManager.close();
    }
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  getMetrics(): ITransportMetrics {
    return { ...this.metrics };
  }

  getHealth(): ITransportHealth {
    const now = new Date();
    const totalMessages = this.metrics.messagesWritten + this.metrics.messagesFailed;
    const errorRate = totalMessages > 0 ? (this.metrics.messagesFailed / totalMessages) * 100 : 0;

    let status: "healthy" | "degraded" | "unhealthy" | "unknown" = "healthy";
    const healthDetails = {
      canWrite: this.healthy,
      canFlush: this.buffer.length === 0,
      errorRate,
      avgResponseTime: this.metrics.averageWriteTime,
      consecutiveFailures: this.healthy ? 0 : 1,
      fileSystemStatus: "unknown" as "healthy" | "degraded" | "unhealthy" | "unknown",
      rotationStatus: "unknown" as "healthy" | "degraded" | "unhealthy" | "unknown",
      diskSpace: 0,
      currentFileSize: this.currentFileSize,
      archiveCount: this.archiveCount,
    };

    // Perform synchronous file system health checks
    this.performSyncFileSystemHealthChecks(healthDetails);

    // Determine overall status
    if (!this.healthy || healthDetails.fileSystemStatus === "unhealthy") {
      status = "unhealthy";
    } else if (
      errorRate > 10 ||
      healthDetails.fileSystemStatus === "degraded" ||
      healthDetails.rotationStatus === "degraded"
    ) {
      status = "degraded";
    }

    const healthData: ITransportHealth = {
      status,
      lastCheck: now,
      details: healthDetails,
    };

    if (!this.healthy) {
      healthData.error = "File transport is not healthy";
    }

    return healthData;
  }

  /**
   * Perform synchronous file system health checks
   */
  private performSyncFileSystemHealthChecks(details: any): void {
    try {
      const parsedPath = this.parsePath(this.options.path);

      // Basic directory check (synchronous)
      try {
        // We'll assume file system is healthy for now
        // More detailed checks would require async operations
        details.fileSystemStatus = "healthy";
      } catch {
        details.fileSystemStatus = "unhealthy";
        return;
      }

      // Check rotation status
      if (this.rotationConfig && this.rotationConfig.strategy !== "none") {
        details.rotationStatus = "healthy";

        // Check if rotation is overdue for time-based strategies
        if (this.rotationConfig.strategy === "daily" || this.rotationConfig.strategy === "hourly") {
          const timeSinceLastCheck = Date.now() - this.lastRotationCheck.getTime();
          const expectedInterval = this.rotationConfig.strategy === "daily" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

          if (timeSinceLastCheck > expectedInterval * 1.5) {
            details.rotationStatus = "degraded";
          }
        }

        // Check if file size is approaching rotation threshold
        if (this.rotationConfig.strategy === "size" && this.rotationConfig.maxSize) {
          const sizeRatio = this.currentFileSize / this.rotationConfig.maxSize;
          if (sizeRatio > 0.9) {
            details.rotationStatus = "degraded";
          }
        }
      } else {
        details.rotationStatus = "healthy";
      }
    } catch {
      details.fileSystemStatus = "unhealthy";
      details.rotationStatus = "unknown";
    }
  }

  /**
   * Perform comprehensive async file system health checks
   */
  private async performFileSystemHealthChecks(details: any): Promise<void> {
    try {
      const parsedPath = this.parsePath(this.options.path);

      // Check directory accessibility
      try {
        await fs.access(parsedPath.dir, fs.constants.W_OK);
        details.fileSystemStatus = "healthy";
      } catch {
        details.fileSystemStatus = "unhealthy";
        return;
      }

      // Check disk space if possible
      try {
        if (fs.statfs) {
          const stats = await fs.statfs(parsedPath.dir);
          const freeSpace = stats.bavail * stats.bsize;
          const totalSpace = stats.blocks * stats.bsize;
          details.diskSpace = freeSpace;

          // Mark as degraded if less than 100MB free space
          if (freeSpace < 100 * 1024 * 1024) {
            details.fileSystemStatus = "degraded";
          }
        }
      } catch {
        // Disk space check not available on all platforms
      }

      // Check rotation status
      if (this.rotationConfig && this.rotationConfig.strategy !== "none") {
        details.rotationStatus = "healthy";

        // Check if rotation is overdue for time-based strategies
        if (this.rotationConfig.strategy === "daily" || this.rotationConfig.strategy === "hourly") {
          const timeSinceLastCheck = Date.now() - this.lastRotationCheck.getTime();
          const expectedInterval = this.rotationConfig.strategy === "daily" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

          if (timeSinceLastCheck > expectedInterval * 1.5) {
            details.rotationStatus = "degraded";
          }
        }

        // Check if file size is approaching rotation threshold
        if (this.rotationConfig.strategy === "size" && this.rotationConfig.maxSize) {
          const sizeRatio = this.currentFileSize / this.rotationConfig.maxSize;
          if (sizeRatio > 0.9) {
            details.rotationStatus = "degraded";
          }
        }
      } else {
        details.rotationStatus = "healthy";
      }
    } catch {
      details.fileSystemStatus = "unhealthy";
      details.rotationStatus = "unknown";
    }
  }

  reset(): void {
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };
    this.healthy = true;
    this.buffer = [];
  }
}

/**
 * Enhanced remote transport with comprehensive circuit breaker integration
 */
export class RemoteTransportProvider implements ITransportProvider {
  readonly type: string = "remote";
  private healthy = true;
  private buffer: ILogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private metrics: ITransportMetrics;
  private readonly options: IRemoteTransportOptions;
  private readonly circuitBreaker?: RetryableCircuitBreaker;
  private readonly adapter: CrossEnvironmentAdapter;

  // Enhanced circuit breaker integration properties
  private retryQueue: ILogEntry[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private lastSuccessfulWrite = new Date();
  private consecutiveFailures = 0;
  private readonly maxRetryAttempts: number;
  private readonly baseRetryDelay: number;

  constructor(config: ITransportConfig) {
    this.options = (config.options as IRemoteTransportOptions) || { url: "" };
    this.adapter = CrossEnvironmentAdapter.getInstance();

    if (!this.options.url) {
      throw new Error("Remote transport requires an endpoint URL");
    }

    // Enhanced retry configuration
    this.maxRetryAttempts = this.options.retryAttempts || 6;
    this.baseRetryDelay = this.options.retryDelay || 1000;

    // Initialize circuit breaker if configured
    if (this.options.circuitBreaker) {
      this.circuitBreaker = new RetryableCircuitBreaker(
        this.options.circuitBreaker,
        "file-transport",
        this.maxRetryAttempts,
        this.baseRetryDelay,
      );
    }

    // Initialize metrics
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };

    // Set up automatic flushing
    const flushIntervalMs = this.options.flushInterval || 10000;
    this.flushInterval = setInterval(() => {
      void this.flush();
    }, flushIntervalMs);

    // Set up retry queue processing
    this.retryInterval = setInterval(() => {
      void this.retryFailedEntries();
    }, this.baseRetryDelay * 2);
  }

  async write(logEntry: Record<string, unknown>): Promise<void> {
    const entry = logEntry as unknown as ILogEntry;

    if (!this.healthy) {
      this.metrics.messagesFailed++;
      throw new Error("Remote transport is not healthy");
    }

    const startTime = this.adapter.getCurrentTimestamp();

    try {
      // Use circuit breaker if available
      if (this.circuitBreaker) {
        await this.executeWithCircuitBreaker(async () => {
          this.buffer.push(entry);

          // Auto-flush if buffer gets too large
          const bufferSize = this.options.batchSize || 100;
          if (this.buffer.length >= bufferSize) {
            await this.flush();
          }
        });
      } else {
        this.buffer.push(entry);

        // Auto-flush if buffer gets too large
        const bufferSize = this.options.batchSize || 100;
        if (this.buffer.length >= bufferSize) {
          await this.flush();
        }
      }

      // Update metrics
      this.metrics.messagesWritten++;
      this.metrics.lastWriteTime = new Date();
      this.lastSuccessfulWrite = new Date();
      this.consecutiveFailures = 0;

      const duration = this.adapter.getCurrentTimestamp() - startTime;
      this.updateAverageWriteTime(duration);
    } catch (error) {
      // Add to retry queue on failure
      const entryId = this.generateEntryId(entry);
      if (!this.retryAttempts.has(entryId) || this.retryAttempts.get(entryId)! < this.maxRetryAttempts) {
        this.retryQueue.push(entry);
        this.retryAttempts.set(entryId, (this.retryAttempts.get(entryId) || 0) + 1);
      }

      this.metrics.messagesFailed++;
      this.metrics.lastErrorTime = new Date();
      this.consecutiveFailures++;
      throw error;
    }
  }

  private updateAverageWriteTime(duration: number): void {
    const count = this.metrics.messagesWritten;
    this.metrics.averageWriteTime = (this.metrics.averageWriteTime * (count - 1) + duration) / count;
  }

  /**
   * Generate unique ID for log entry to track retry attempts
   */
  private generateEntryId(entry: ILogEntry): string {
    return `${entry.timestamp}-${entry.level}-${entry.message.slice(0, 50)}-${entry.correlationId || "no-correlation"}`;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.circuitBreaker) {
      return operation();
    }
    return this.circuitBreaker.executeWithRetry(operation);
  }

  /**
   * Process failed entries from retry queue with exponential backoff
   */
  private async retryFailedEntries(): Promise<void> {
    if (this.retryQueue.length === 0 || !this.healthy) {
      return;
    }

    // Process a limited number of entries per iteration to avoid overwhelming
    const batchSize = Math.min(this.retryQueue.length, 10);
    const entriesToRetry = this.retryQueue.splice(0, batchSize);

    for (const entry of entriesToRetry) {
      const entryId = this.generateEntryId(entry);
      const attemptCount = this.retryAttempts.get(entryId) || 0;

      // Check if max retry attempts exceeded
      if (attemptCount >= this.maxRetryAttempts) {
        this.retryAttempts.delete(entryId);
        continue;
      }

      try {
        // Calculate exponential backoff delay
        const delay = this.calculateBackoffDelay(attemptCount);

        // Wait for backoff period
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Attempt to send the entry
        await this.sendSingleEntry(entry);

        // Success - remove from retry tracking
        this.retryAttempts.delete(entryId);
        this.lastSuccessfulWrite = new Date();
        this.consecutiveFailures = 0;
      } catch (error) {
        // Failure - increment retry count and add back to queue
        this.retryAttempts.set(entryId, attemptCount + 1);
        this.retryQueue.push(entry);
        this.consecutiveFailures++;

        // Log retry failure for debugging
        console.warn(
          `Remote transport retry failed for entry ${entryId}, attempt ${attemptCount + 1}/${this.maxRetryAttempts}:`,
          error,
        );
      }
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attemptCount: number): number {
    const maxDelay = 32000; // 32 seconds max
    const delay = this.baseRetryDelay * Math.pow(2, attemptCount);
    return Math.min(delay, maxDelay);
  }

  /**
   * Send a single log entry (used for retry operations)
   */
  private async sendSingleEntry(entry: ILogEntry): Promise<void> {
    const payload = {
      logs: [
        {
          timestamp: entry.timestamp,
          level: entry.level,
          message: entry.message,
          correlationId: entry.correlationId,
          ...entry.meta,
        },
      ],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.options.headers,
    };

    if (this.options.authToken) {
      headers["Authorization"] = `Bearer ${this.options.authToken}`;
    }

    const sendRequest = async (): Promise<void> => {
      const controller = new AbortController();
      const timeoutId = this.options.timeout ? setTimeout(() => controller.abort(), this.options.timeout) : null;

      try {
        const response = await fetch(this.options.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error(`Remote logging failed: ${response.status.toString()} ${response.statusText}`);
        }

        const dataSize = Buffer.byteLength(JSON.stringify(payload), "utf8");
        this.metrics.bytesWritten += dataSize;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw error;
      }
    };

    if (this.circuitBreaker) {
      await this.circuitBreaker.executeWithRetry(sendRequest);
    } else {
      await sendRequest();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    // Also process retry queue during flush
    if (this.retryQueue.length > 0) {
      await this.retryFailedEntries();
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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.options.headers,
    };

    if (this.options.authToken) {
      headers["Authorization"] = `Bearer ${this.options.authToken}`;
    }

    const sendRequest = async (): Promise<void> => {
      const controller = new AbortController();
      const timeoutId = this.options.timeout ? setTimeout(() => controller.abort(), this.options.timeout) : null;

      try {
        const response = await fetch(this.options.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error(`Remote logging failed: ${response.status.toString()} ${response.statusText}`);
        }

        const dataSize = Buffer.byteLength(JSON.stringify(payload), "utf8");
        this.metrics.bytesWritten += dataSize;
        this.healthy = true;
        this.lastSuccessfulWrite = new Date();
        this.consecutiveFailures = 0;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Add failed entries to retry queue instead of returning to buffer
        for (const entry of entries) {
          const entryId = this.generateEntryId(entry);
          if (!this.retryAttempts.has(entryId) || this.retryAttempts.get(entryId)! < this.maxRetryAttempts) {
            this.retryQueue.push(entry);
            this.retryAttempts.set(entryId, (this.retryAttempts.get(entryId) || 0) + 1);
          }
        }

        this.healthy = false;
        this.metrics.lastErrorTime = new Date();
        this.consecutiveFailures++;
        throw error;
      }
    };

    try {
      if (this.circuitBreaker) {
        await this.circuitBreaker.executeWithRetry(sendRequest);
        this.metrics.circuitBreakerMetrics = this.circuitBreaker.getDetailedMetrics();
      } else {
        await sendRequest();
      }
    } catch (error) {
      this.metrics.messagesFailed += entries.length;
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // Process remaining retry queue entries before closing
    await this.retryFailedEntries();

    // Flush any remaining buffer
    await this.flush();
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  getMetrics(): ITransportMetrics {
    const metrics = { ...this.metrics };
    if (this.circuitBreaker) {
      metrics.circuitBreakerMetrics = this.circuitBreaker.getDetailedMetrics();
    }
    return metrics;
  }

  getHealth(): ITransportHealth {
    const now = new Date();
    const totalMessages = this.metrics.messagesWritten + this.metrics.messagesFailed;
    const errorRate = totalMessages > 0 ? (this.metrics.messagesFailed / totalMessages) * 100 : 0;

    let status: "healthy" | "degraded" | "unhealthy" | "unknown" = "healthy";
    const circuitBreakerMetrics = this.circuitBreaker?.getMetrics();
    const circuitBreakerOpen = circuitBreakerMetrics?.state === "open";
    const circuitBreakerHalfOpen = circuitBreakerMetrics?.state === "half-open";

    // Determine health status based on multiple factors
    if (!this.healthy || circuitBreakerOpen) {
      status = "unhealthy";
    } else if (
      errorRate > 10 ||
      circuitBreakerHalfOpen ||
      this.consecutiveFailures > 3 ||
      this.retryQueue.length > 50 ||
      (this.lastSuccessfulWrite && now.getTime() - this.lastSuccessfulWrite.getTime() > 300000) // 5 minutes
    ) {
      status = "degraded";
    }

    // Enhanced health details with circuit breaker and retry information
    const healthDetails = {
      canWrite: this.healthy && !circuitBreakerOpen,
      canFlush: this.buffer.length === 0 && this.retryQueue.length === 0,
      errorRate,
      avgResponseTime: this.metrics.averageWriteTime,
      consecutiveFailures: this.consecutiveFailures,
      retryQueueSize: this.retryQueue.length,
      activeRetries: this.retryAttempts.size,
      lastSuccessfulWrite: this.lastSuccessfulWrite,
      circuitBreakerState: circuitBreakerMetrics?.state || "unknown",
      circuitBreakerFailures: circuitBreakerMetrics?.failureCount || 0,
      circuitBreakerSuccesses: circuitBreakerMetrics?.successCount || 0,
      bufferSize: this.buffer.length,
      endpoint: this.options.url,
    };

    let errorMessage: string | undefined;
    if (!this.healthy) {
      errorMessage = "Remote transport is not healthy";
    } else if (circuitBreakerOpen) {
      errorMessage = "Circuit breaker is open - too many failures";
    } else if (this.retryQueue.length > 100) {
      errorMessage = `Large retry queue: ${this.retryQueue.length} entries pending`;
    }

    const healthData: ITransportHealth = {
      status,
      lastCheck: now,
      details: healthDetails,
      circuitBreakerOpen,
    };

    if (errorMessage) {
      healthData.error = errorMessage;
    }

    return healthData;
  }

  reset(): void {
    this.metrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };
    this.healthy = true;
    this.buffer = [];

    // Reset retry tracking
    this.retryQueue = [];
    this.retryAttempts.clear();
    this.lastSuccessfulWrite = new Date();
    this.consecutiveFailures = 0;

    if (this.circuitBreaker) {
      this.circuitBreaker.reset();
    }
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
 * Enhanced multi-transport manager with intelligent routing logic and metrics collection
 */
export class MultiTransportManager {
  private readonly transports: Map<string, ITransportProvider>;
  private readonly config: IMultiTransportConfig;
  private readonly performanceTracker?: PerformanceTracker;
  private metricsInterval?: NodeJS.Timeout;
  private readonly routingConfig?: IRoutingConfig;

  constructor(config: IMultiTransportConfig, routingConfig?: IRoutingConfig) {
    this.config = config;
    if (routingConfig) {
      this.routingConfig = routingConfig;
    }
    this.transports = new Map();

    // Initialize transports
    for (const transportConfig of config.transports) {
      if (transportConfig.enabled !== false) {
        const transport = createTransport(transportConfig);
        this.transports.set(transportConfig.name, transport);
      }
    }

    // Initialize performance tracking
    if (config.performanceMonitoring) {
      this.performanceTracker = new PerformanceTracker({
        enabled: true,
        sampleRate: 1.0,
        thresholdMs: 100,
      });

      if (config.metricsInterval) {
        this.metricsInterval = setInterval(() => {
          this.logMetrics();
        }, config.metricsInterval);
      }
    }
  }

  async write(entry: ILogEntry): Promise<void> {
    const targetTransports = this.getTargetTransports(entry);

    if (targetTransports.length === 0) {
      if (this.config.routing?.fallbackBehavior === "stop") {
        throw new Error("No target transports available for log entry");
      }
      return;
    }

    const endPerformanceTracking = this.performanceTracker?.startOperation() || (() => {});

    try {
      // Write to all target transports in parallel
      const writePromises = targetTransports.map(async (transport) => {
        try {
          await transport.write(entry as unknown as Record<string, unknown>);
          this.performanceTracker?.recordSuccess();
          return { transport: transport.type, success: true };
        } catch (error) {
          this.performanceTracker?.recordFailure();
          return { transport: transport.type, success: false, error };
        }
      });

      const results = await Promise.allSettled(writePromises);
      const failures = results.filter(
        (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success),
      );

      // Handle failures based on configuration
      if (failures.length > 0) {
        const failureThreshold = this.config.routing?.failureThreshold || 0;
        const failureRate = failures.length / targetTransports.length;

        if (failureRate > failureThreshold) {
          if (this.config.routing?.fallbackBehavior === "stop") {
            throw new Error(`Transport failure rate (${failureRate}) exceeds threshold (${failureThreshold})`);
          }
        }
      }
    } finally {
      endPerformanceTracking();
    }
  }

  /**
   * Intelligent transport selection using routing logic
   */
  selectTransports(entry: ILogEntry): ITransportProvider[] {
    return this.getTargetTransports(entry);
  }

  private getTargetTransports(entry: ILogEntry): ITransportProvider[] {
    // Use advanced routing if configured
    if (this.routingConfig) {
      return this.applyRouting(entry, this.routingConfig);
    }

    // Fallback to basic routing logic
    const targets: ITransportProvider[] = [];

    for (const [name, transport] of Array.from(this.transports.entries())) {
      if (!transport.isHealthy()) {
        continue;
      }

      const transportConfig = this.config.transports.find((t) => t.name === name);
      if (!transportConfig) {
        continue;
      }

      if (this.shouldRouteToTransport(entry, transportConfig.routing)) {
        targets.push(transport);
      }
    }

    // Sort by priority if specified
    targets.sort((a, b) => {
      const configA = this.config.transports.find((t) => t.name === this.getTransportName(a));
      const configB = this.config.transports.find((t) => t.name === this.getTransportName(b));

      const priorityA = configA?.priority || 0;
      const priorityB = configB?.priority || 0;

      return priorityB - priorityA; // Higher priority first
    });

    return targets;
  }

  /**
   * Apply advanced routing configuration to select transports
   */
  applyRouting(entry: ILogEntry, config: IRoutingConfig): ITransportProvider[] {
    const targets: ITransportProvider[] = [];
    const logEntry = entry as unknown as Record<string, unknown>;

    for (const [name, transport] of Array.from(this.transports.entries())) {
      if (!transport.isHealthy()) {
        continue;
      }

      let shouldInclude = false;

      // Apply level rules
      if (config.levelRules) {
        const level = entry.level as LogLevel;
        const targetNames = config.levelRules[level];
        if (targetNames && targetNames.includes(name)) {
          shouldInclude = true;
        }
      }

      // Apply source pattern matching
      if (config.sourcePatterns && entry.meta?.["source"]) {
        const source = entry.meta["source"] as string;
        for (const [pattern, targetNames] of Object.entries(config.sourcePatterns)) {
          if (source.includes(pattern) && targetNames.includes(name)) {
            shouldInclude = true;
            break;
          }
        }
      }

      // Apply custom filters
      if (config.customFilters) {
        for (const [filterName, filter] of Object.entries(config.customFilters)) {
          const transportConfig = this.config.transports.find((t) => t.name === name);
          if (transportConfig?.advancedRouting?.customFilters?.[filterName]) {
            if (filter(logEntry)) {
              shouldInclude = true;
              break;
            }
          }
        }
      }

      // Use default targets if no rules matched
      if (!shouldInclude && config.defaultTargets && config.defaultTargets.includes(name)) {
        shouldInclude = true;
      }

      // Apply filter mode (AND vs OR logic)
      if (shouldInclude) {
        targets.push(transport);
      }
    }

    return targets;
  }

  private getTransportName(transport: ITransportProvider): string {
    for (const [name, t] of Array.from(this.transports.entries())) {
      if (t === transport) {
        return name;
      }
    }
    return "";
  }

  private shouldRouteToTransport(entry: ILogEntry, rule?: ITransportRoutingRule): boolean {
    if (!rule) {
      return true; // No routing rule means accept all
    }

    // Check level filtering
    if (rule.levels && rule.levels.length > 0) {
      const matches = rule.levels.includes(entry.level as LogLevel);
      if (rule.exclude ? matches : !matches) {
        return false;
      }
    }

    // Check source filtering
    if (rule.sources && rule.sources.length > 0) {
      const source = entry.meta?.["source"] as string;
      if (source) {
        const matches = rule.sources.some((s) => source.includes(s));
        if (rule.exclude ? matches : !matches) {
          return false;
        }
      }
    }

    return true;
  }

  async flush(): Promise<void> {
    const flushPromises = Array.from(this.transports.values()).map(
      (transport) => transport.flush?.() || Promise.resolve(),
    );
    await Promise.allSettled(flushPromises);
  }

  async close(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      delete this.metricsInterval;
    }

    const closePromises = Array.from(this.transports.values()).map(
      (transport) => transport.close?.() || Promise.resolve(),
    );
    await Promise.allSettled(closePromises);
  }

  getHealthyTransports(): ITransportProvider[] {
    return Array.from(this.transports.values()).filter((transport) => transport.isHealthy());
  }

  getAllTransports(): ITransportProvider[] {
    return Array.from(this.transports.values());
  }

  getTransportMetrics(): Record<string, ITransportMetrics> {
    const metrics: Record<string, ITransportMetrics> = {};

    for (const [name, transport] of Array.from(this.transports.entries())) {
      metrics[name] = transport.getMetrics();
    }

    return metrics;
  }

  /**
   * Get aggregated metrics from all transports
   */
  getMetrics(): ITransportMetrics {
    const allMetrics = this.getTransportMetrics();
    const aggregated: ITransportMetrics = {
      messagesWritten: 0,
      messagesFailed: 0,
      bytesWritten: 0,
      averageWriteTime: 0,
    };

    let totalTransports = 0;
    let totalWriteTime = 0;

    for (const metrics of Object.values(allMetrics)) {
      aggregated.messagesWritten += metrics.messagesWritten;
      aggregated.messagesFailed += metrics.messagesFailed;
      aggregated.bytesWritten += metrics.bytesWritten;

      if (metrics.averageWriteTime > 0) {
        totalWriteTime += metrics.averageWriteTime;
        totalTransports++;
      }

      // Track most recent times
      if (metrics.lastWriteTime) {
        if (!aggregated.lastWriteTime || metrics.lastWriteTime > aggregated.lastWriteTime) {
          aggregated.lastWriteTime = metrics.lastWriteTime;
        }
      }

      if (metrics.lastErrorTime) {
        if (!aggregated.lastErrorTime || metrics.lastErrorTime > aggregated.lastErrorTime) {
          aggregated.lastErrorTime = metrics.lastErrorTime;
        }
      }
    }

    // Calculate average write time across all transports
    if (totalTransports > 0) {
      aggregated.averageWriteTime = totalWriteTime / totalTransports;
    }

    return aggregated;
  }

  /**
   * Get overall health status aggregated from all transports
   */
  getHealth(): ITransportHealth {
    const transportHealths: ITransportHealth[] = [];

    for (const transport of Array.from(this.transports.values())) {
      transportHealths.push(transport.getHealth());
    }

    if (transportHealths.length === 0) {
      return {
        status: "unknown",
        lastCheck: new Date(),
        details: {
          canWrite: false,
          canFlush: false,
          errorRate: 0,
          avgResponseTime: 0,
          consecutiveFailures: 0,
        },
        error: "No transports configured",
      };
    }

    // Determine overall status
    const healthyCount = transportHealths.filter((h) => h.status === "healthy").length;
    const degradedCount = transportHealths.filter((h) => h.status === "degraded").length;
    const unhealthyCount = transportHealths.filter((h) => h.status === "unhealthy").length;

    let status: "healthy" | "degraded" | "unhealthy" | "unknown" = "healthy";
    if (unhealthyCount === transportHealths.length) {
      status = "unhealthy";
    } else if (unhealthyCount > 0 || degradedCount > healthyCount) {
      status = "degraded";
    }

    // Aggregate details
    const totalErrorRate = transportHealths.reduce((sum, h) => sum + h.details.errorRate, 0) / transportHealths.length;
    const avgResponseTime =
      transportHealths.reduce((sum, h) => sum + h.details.avgResponseTime, 0) / transportHealths.length;
    const canWrite = transportHealths.some((h) => h.details.canWrite);
    const canFlush = transportHealths.every((h) => h.details.canFlush);
    const consecutiveFailures = Math.max(...transportHealths.map((h) => h.details.consecutiveFailures));

    // Check for any circuit breakers open
    const circuitBreakerOpen = transportHealths.some((h) => h.circuitBreakerOpen);

    const healthData: ITransportHealth = {
      status: circuitBreakerOpen ? "degraded" : status,
      lastCheck: new Date(),
      details: {
        canWrite,
        canFlush,
        errorRate: totalErrorRate,
        avgResponseTime,
        consecutiveFailures,
      },
      circuitBreakerOpen,
    };

    if (status === "unhealthy") {
      healthData.error = "Multiple transports are unhealthy";
    }

    return healthData;
  }

  private logMetrics(): void {
    if (!this.performanceTracker) {
      return;
    }

    const metrics = this.performanceTracker.getMetrics("closed", 0);
    console.log("Multi-transport performance metrics:", {
      logsPerSecond: metrics.logsPerSecond.toFixed(2),
      averageLatency: `${metrics.averageLatencyMs.toFixed(2)}ms`,
      totalLogs: metrics.totalLogs,
      failedLogs: metrics.failedLogs,
      transportMetrics: this.getTransportMetrics(),
    });
  }

  resetMetrics(): void {
    this.performanceTracker?.reset();

    for (const transport of Array.from(this.transports.values())) {
      transport.reset?.();
    }
  }
}
