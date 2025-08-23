/**
 * Performance monitoring utilities for high-performance logging
 */

import type {
  ILazyValueConfig,
  TimerPrecision,
  IDebounceConfig,
  IThrottleConfig,
  ICircularBufferStats,
  ITimerState,
  DebouncedFunction,
  ThrottledFunction,
  IPlatformDetection,
  IFileRotationOptions,
  ICompressionOptions,
  IStreamOptions,
  IStorageOptions,
  Platform,
} from "./utils.types.js";

// Import types from the main types module
import type { IPerformanceMetrics, IPerformanceConfig, CircuitBreakerState } from "../types/index.js";

/**
 * Platform detection utility for cross-environment compatibility
 */
export class PlatformDetector {
  private static instance?: PlatformDetector;
  private readonly detection: IPlatformDetection;

  private constructor() {
    this.detection = this.detectPlatform();
  }

  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  private detectPlatform(): IPlatformDetection {
    const isNode = typeof process !== "undefined" && process.versions?.node !== undefined;
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    const isDeno = typeof globalThis !== "undefined" && "Deno" in globalThis;

    let platform: Platform = "unknown";
    if (isNode) platform = "node";
    else if (isBrowser) platform = "browser";
    else if (isDeno) platform = "deno";

    return {
      platform,
      isNode,
      isBrowser,
      isDeno,
      supportsFileSystem: isNode || isDeno,
      supportsStreams: isNode || isDeno || (isBrowser && "ReadableStream" in globalThis),
      supportsCompression: isNode || isDeno || (isBrowser && "CompressionStream" in globalThis),
      supportsHighResTime: typeof performance !== "undefined" && typeof performance.now === "function",
    };
  }

  getDetection(): IPlatformDetection {
    return { ...this.detection };
  }

  isNode(): boolean {
    return this.detection.isNode;
  }

  isBrowser(): boolean {
    return this.detection.isBrowser;
  }

  isDeno(): boolean {
    return this.detection.isDeno;
  }

  getPlatform(): Platform {
    return this.detection.platform;
  }

  supportsFileSystem(): boolean {
    return this.detection.supportsFileSystem;
  }

  supportsStreams(): boolean {
    return this.detection.supportsStreams;
  }

  supportsCompression(): boolean {
    return this.detection.supportsCompression;
  }

  supportsHighResolutionTime(): boolean {
    return this.detection.supportsHighResTime;
  }
}

/**
 * Cross-platform file rotation manager
 */
export class FileRotationManager {
  private currentFile: string;
  private currentSize = 0;
  private rotationCount = 0;
  private stream?: NodeJS.WritableStream;
  private readonly platform = PlatformDetector.getInstance();

  constructor(
    private readonly basePath: string,
    private readonly options: Partial<IFileRotationOptions> = {},
  ) {
    const defaultOptions: IFileRotationOptions = {
      strategy: "size",
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      compress: false,
      compressionFormat: "gzip",
    };
    this.options = { ...defaultOptions, ...options };
    this.currentFile = this.generateFileName();
  }

  private generateFileName(): string {
    if (this.options.strategy === "time" && this.options.dateFormat) {
      const now = new Date();
      const dateStr = this.formatDate(now, this.options.dateFormat);
      return `${this.basePath}.${dateStr}`;
    }
    return this.rotationCount === 0 ? this.basePath : `${this.basePath}.${this.rotationCount}`;
  }

  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");

    return format.replace("YYYY", year.toString()).replace("MM", month).replace("DD", day).replace("HH", hour);
  }

  async createRotatedFilename(): Promise<string> {
    this.rotationCount++;
    return this.generateFileName();
  }

  async rotateFile(): Promise<void> {
    if (!this.platform.supportsFileSystem()) {
      throw new Error("File rotation not supported in current environment");
    }

    // Close current stream
    if (this.stream) {
      await new Promise<void>((resolve, reject) => {
        this.stream!.on("finish", resolve);
        this.stream!.on("error", reject);
        this.stream!.end();
      });
    }

    // Generate new file name
    this.currentFile = await this.createRotatedFilename();
    this.currentSize = 0;

    // Create new stream
    await this.createStream();
  }

  async createStream(): Promise<NodeJS.WritableStream> {
    if (!this.platform.supportsFileSystem()) {
      throw new Error("File system not supported in current environment");
    }

    if (this.platform.isNode()) {
      const { createWriteStream } = await import("fs");
      const { dirname } = await import("path");
      const { promises: fs } = await import("fs");

      // Ensure directory exists
      const dir = dirname(this.currentFile);
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
      }

      this.stream = createWriteStream(this.currentFile, { flags: "a" });

      // Get current file size
      try {
        const stats = await fs.stat(this.currentFile);
        this.currentSize = stats.size;
      } catch {
        this.currentSize = 0;
      }
    }

    if (!this.stream) {
      throw new Error("Failed to create stream for current platform");
    }

    return this.stream;
  }

  async write(data: string): Promise<boolean> {
    if (!this.stream) {
      await this.createStream();
    }

    const dataSize = Buffer.byteLength(data, "utf8");

    // Check if rotation is needed
    if (
      this.options.strategy === "size" &&
      this.options.maxSize &&
      this.currentSize + dataSize > this.options.maxSize
    ) {
      await this.rotateFile();
    }

    return new Promise((resolve, reject) => {
      this.stream!.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          this.currentSize += dataSize;
          resolve(true);
        }
      });
    });
  }

  async listRotatedFiles(): Promise<string[]> {
    if (!this.platform.supportsFileSystem() || !this.platform.isNode()) {
      return [];
    }

    try {
      const { dirname, basename } = await import("path");
      const { promises: fs } = await import("fs");

      const dir = dirname(this.basePath);
      const baseName = basename(this.basePath);
      const files = await fs.readdir(dir);

      return files.filter((file) => file.startsWith(baseName)).sort();
    } catch {
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.stream) {
      await new Promise<void>((resolve) => {
        this.stream!.end(() => resolve());
      });
      delete this.stream;
    }
  }
}

/**
 * Cross-platform compression adapter
 */
export class CompressionAdapter {
  private readonly platform = PlatformDetector.getInstance();

  constructor(private readonly options: Partial<ICompressionOptions> = {}) {
    const defaultOptions: ICompressionOptions = {
      format: "gzip",
      level: 6,
      chunkSize: 16384,
    };
    this.options = { ...defaultOptions, ...options };
  }

  isCompressionSupported(): boolean {
    return this.platform.supportsCompression();
  }

  async compressFile(inputPath: string, outputPath: string): Promise<void> {
    if (!this.isCompressionSupported()) {
      throw new Error("Compression not supported in current environment");
    }

    if (this.platform.isNode()) {
      const { createReadStream, createWriteStream } = await import("fs");
      const { createGzip, createDeflate } = await import("zlib");

      const input = createReadStream(inputPath);
      const output = createWriteStream(outputPath);

      let compressionStream;
      switch (this.options.format) {
        case "gzip":
          compressionStream = createGzip({ level: this.options.level });
          break;
        case "deflate":
          compressionStream = createDeflate({ level: this.options.level });
          break;
        default:
          throw new Error(`Unsupported compression format: ${this.options.format}`);
      }

      return new Promise((resolve, reject) => {
        input.pipe(compressionStream).pipe(output).on("finish", resolve).on("error", reject);
      });
    }

    throw new Error("File compression not implemented for current platform");
  }

  async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    if (!this.isCompressionSupported()) {
      throw new Error("Compression not supported in current environment");
    }

    if (this.platform.isNode()) {
      const { createReadStream, createWriteStream } = await import("fs");
      const { createGunzip, createInflate } = await import("zlib");

      const input = createReadStream(inputPath);
      const output = createWriteStream(outputPath);

      let decompressionStream;
      switch (this.options.format) {
        case "gzip":
          decompressionStream = createGunzip();
          break;
        case "deflate":
          decompressionStream = createInflate();
          break;
        default:
          throw new Error(`Unsupported compression format: ${this.options.format}`);
      }

      return new Promise((resolve, reject) => {
        input.pipe(decompressionStream).pipe(output).on("finish", resolve).on("error", reject);
      });
    }

    throw new Error("File decompression not implemented for current platform");
  }
}

/**
 * Cross-platform stream adapter
 */
export class StreamAdapter {
  private readonly platform = PlatformDetector.getInstance();

  constructor(private readonly options: Partial<IStreamOptions> = {}) {}

  isStreamSupported(): boolean {
    return this.platform.supportsStreams();
  }

  async createWriteStream(path: string): Promise<NodeJS.WritableStream> {
    if (!this.isStreamSupported()) {
      throw new Error("Streams not supported in current environment");
    }

    if (this.platform.isNode()) {
      const { createWriteStream } = await import("fs");
      return createWriteStream(path, this.options);
    }

    throw new Error("Write streams not implemented for current platform");
  }

  async createReadStream(path: string): Promise<NodeJS.ReadableStream> {
    if (!this.isStreamSupported()) {
      throw new Error("Streams not supported in current environment");
    }

    if (this.platform.isNode()) {
      const { createReadStream } = await import("fs");
      return createReadStream(path, this.options);
    }

    throw new Error("Read streams not implemented for current platform");
  }
}

/**
 * Storage adapter interface
 */
export interface IStorageAdapter {
  write(key: string, data: string): Promise<void>;
  read(key: string): Promise<string | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
}

/**
 * Cross-platform storage adapter
 */
export class CrossPlatformIStorageAdapter {
  private readonly platform = PlatformDetector.getInstance();

  constructor(private readonly options: Partial<IStorageOptions> = {}) {}

  getIStorageAdapter(): IStorageAdapter {
    if (this.platform.isBrowser()) {
      return new BrowserIStorageAdapter(this.options);
    }
    return new NodeIStorageAdapter(this.options);
  }
}

/**
 * Browser storage adapter using localStorage and IndexedDB
 */
export class BrowserIStorageAdapter implements IStorageAdapter {
  constructor(private readonly options: Partial<IStorageOptions> = {}) {}

  async write(key: string, data: string): Promise<void> {
    try {
      if (this.options.enableIndexedDB && "indexedDB" in globalThis) {
        // Use IndexedDB for larger data
        await this.writeToIndexedDB(key, data);
      } else {
        localStorage.setItem(key, data);
      }
    } catch (error) {
      if (this.options.fallbackToLocalStorage) {
        localStorage.setItem(key, data);
      } else {
        throw new Error(`Failed to write to storage: ${(error as Error).message}`);
      }
    }
  }

  async read(key: string): Promise<string | null> {
    try {
      if (this.options.enableIndexedDB && "indexedDB" in globalThis) {
        return await this.readFromIndexedDB(key);
      } else {
        return localStorage.getItem(key);
      }
    } catch (error) {
      if (this.options.fallbackToLocalStorage) {
        return localStorage.getItem(key);
      }
      throw new Error(`Failed to read from storage: ${(error as Error).message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const data = await this.read(key);
      return data !== null;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.options.enableIndexedDB && "indexedDB" in globalThis) {
        await this.deleteFromIndexedDB(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      throw new Error(`Failed to delete from storage: ${(error as Error).message}`);
    }
  }

  async mkdir(_path: string): Promise<void> {
    // No-op in browser environment
  }

  async readFile(path: string): Promise<string> {
    return (await this.read(path)) || "";
  }

  async writeFile(path: string, data: string): Promise<void> {
    await this.write(path, data);
  }

  async deleteFile(path: string): Promise<void> {
    await this.delete(path);
  }

  private async writeToIndexedDB(key: string, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("LoggerStorage", 1);

      request.onerror = () => reject(new Error("Failed to open IndexedDB"));

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("data")) {
          db.createObjectStore("data");
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["data"], "readwrite");
        const store = transaction.objectStore("data");
        const putRequest = store.put(data, key);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error("Failed to write to IndexedDB"));
      };
    });
  }

  private async readFromIndexedDB(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("LoggerStorage", 1);

      request.onerror = () => reject(new Error("Failed to open IndexedDB"));

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["data"], "readonly");
        const store = transaction.objectStore("data");
        const getRequest = store.get(key);

        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(new Error("Failed to read from IndexedDB"));
      };
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("LoggerStorage", 1);

      request.onerror = () => reject(new Error("Failed to open IndexedDB"));

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["data"], "readwrite");
        const store = transaction.objectStore("data");
        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(new Error("Failed to delete from IndexedDB"));
      };
    });
  }
}

/**
 * Node.js storage adapter using filesystem
 */
export class NodeIStorageAdapter implements IStorageAdapter {
  private readonly basePath: string;

  constructor(private readonly options: Partial<IStorageOptions> = {}) {
    this.basePath = options.basePath || "./.logger-storage";
  }

  private getFilePath(key: string): string {
    // In Node.js environment, we can safely use path.join
    return `${this.basePath}/${key}.json`;
  }

  async write(key: string, data: string): Promise<void> {
    const { promises: fs, constants: _constants } = await import("fs");
    const { dirname } = await import("path");

    const filePath = this.getFilePath(key);
    const dir = dirname(filePath);

    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, data, "utf8");
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  async read(key: string): Promise<string | null> {
    const { promises: fs } = await import("fs");
    const filePath = this.getFilePath(key);

    try {
      const data = await fs.readFile(filePath, "utf8");
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    const { promises: fs, constants } = await import("fs");
    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    const { promises: fs } = await import("fs");
    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to delete file: ${(error as Error).message}`);
      }
    }
  }

  async mkdir(path: string): Promise<void> {
    const { promises: fs } = await import("fs");
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new Error(`Failed to create directory: ${(error as Error).message}`);
      }
    }
  }

  async readFile(path: string): Promise<string> {
    const { promises: fs } = await import("fs");
    try {
      return await fs.readFile(path, "utf8");
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  async writeFile(path: string, data: string): Promise<void> {
    const { promises: fs } = await import("fs");
    const { dirname } = await import("path");

    const dir = dirname(path);
    await this.mkdir(dir);

    try {
      await fs.writeFile(path, data, "utf8");
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    const { promises: fs } = await import("fs");
    try {
      await fs.unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to delete file: ${(error as Error).message}`);
      }
    }
  }
}

/**
 * Cross-environment adapter for platform-specific functionality
 */
export class CrossEnvironmentAdapter {
  private static instance?: CrossEnvironmentAdapter;
  private readonly platform = PlatformDetector.getInstance();

  private constructor() {}

  static getInstance(): CrossEnvironmentAdapter {
    if (!CrossEnvironmentAdapter.instance) {
      CrossEnvironmentAdapter.instance = new CrossEnvironmentAdapter();
    }
    return CrossEnvironmentAdapter.instance;
  }

  getEnvironment(): Platform {
    return this.platform.getPlatform();
  }

  supportsFileSystem(): boolean {
    return this.platform.supportsFileSystem();
  }

  supportsHighResolutionTime(): boolean {
    return this.platform.supportsHighResolutionTime();
  }

  getCurrentTimestamp(): number {
    if (this.supportsHighResolutionTime()) {
      return performance.now();
    }
    return Date.now();
  }

  formatForEnvironment(data: Record<string, unknown>): string {
    if (this.platform.isBrowser()) {
      // Browser-friendly formatting
      return JSON.stringify(data, null, 2);
    }
    // Node.js structured logging
    return JSON.stringify(data);
  }

  getIStorageAdapter(): IStorageAdapter {
    return new CrossPlatformIStorageAdapter().getIStorageAdapter();
  }

  getFileRotationManager(basePath: string, options?: Partial<IFileRotationOptions>): FileRotationManager {
    return new FileRotationManager(basePath, options);
  }

  getCompressionAdapter(options?: Partial<ICompressionOptions>): CompressionAdapter {
    return new CompressionAdapter(options);
  }

  getStreamAdapter(options?: Partial<IStreamOptions>): StreamAdapter {
    return new StreamAdapter(options);
  }
}

/**
 * Performance tracker for monitoring logging operations
 */
export class PerformanceTracker {
  private startTime = Date.now();
  private totalLogs = 0;
  private failedLogs = 0;
  private latencies: number[] = [];
  private readonly config: IPerformanceConfig;
  private readonly maxLatencyHistory = 1000; // Keep last 1000 latency measurements

  constructor(config: IPerformanceConfig) {
    this.config = config;
  }

  /**
   * Start timing a logging operation
   */
  startOperation(): () => void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      // No-op for disabled or unsampled operations
      return () => {
        // Intentionally empty for performance when monitoring is disabled
      };
    }

    const operationStart = performance.now();

    return () => {
      const latency = performance.now() - operationStart;
      this.recordLatency(latency);

      if (latency > this.config.thresholdMs) {
        console.warn(
          `Slow logging operation detected: ${latency.toFixed(2)}ms (threshold: ${this.config.thresholdMs.toString()}ms)`,
        );
      }
    };
  }

  /**
   * Record a successful log operation
   */
  recordSuccess(): void {
    this.totalLogs++;
  }

  /**
   * Record a failed log operation
   */
  recordFailure(): void {
    this.totalLogs++;
    this.failedLogs++;
  }

  /**
   * Record operation latency
   */
  private recordLatency(latency: number): void {
    this.latencies.push(latency);

    // Keep only recent latencies to prevent memory growth
    if (this.latencies.length > this.maxLatencyHistory) {
      this.latencies.shift();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(circuitBreakerState: CircuitBreakerState, objectPoolUtilization: number): IPerformanceMetrics {
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;

    const logsPerSecond = elapsedSeconds > 0 ? this.totalLogs / elapsedSeconds : 0;
    const averageLatencyMs =
      this.latencies.length > 0 ? this.latencies.reduce((sum, lat) => sum + lat, 0) / this.latencies.length : 0;
    const peakLatencyMs = this.latencies.length > 0 ? Math.max(...this.latencies) : 0;

    return {
      logsPerSecond,
      averageLatencyMs,
      peakLatencyMs,
      totalLogs: this.totalLogs,
      failedLogs: this.failedLogs,
      circuitBreakerState,
      objectPoolUtilization,
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  reset(): void {
    this.startTime = Date.now();
    this.totalLogs = 0;
    this.failedLogs = 0;
    this.latencies.length = 0;
  }
}

/**
 * Lazy evaluation utility for expensive operations
 */
export class LazyValue<T> {
  private value: T | undefined = undefined;
  private computed = false;
  private readonly config: ILazyValueConfig<T>;

  constructor(config: ILazyValueConfig<T>) {
    this.config = config;
  }

  get(): T {
    if (!this.computed || this.config.resetOnAccess) {
      this.value = this.config.factory();
      this.computed = true;

      if (this.config.resetOnAccess) {
        this.computed = false;
      }
    }

    if (this.value === undefined) {
      throw new Error("LazyValue factory returned undefined");
    }
    return this.value;
  }

  reset(): void {
    this.value = undefined;
    this.computed = false;
  }

  hasValue(): boolean {
    return this.computed && this.value !== undefined;
  }
}

/**
 * High-resolution timer for precise performance measurements
 */
export class HighResolutionTimer {
  private state: ITimerState;
  private readonly precision: TimerPrecision;

  constructor(precision: TimerPrecision = "millisecond") {
    this.precision = precision;
    this.state = {
      startTime: this.getCurrentTime(),
      isRunning: true,
    };
  }

  private getCurrentTime(): number {
    const adapter = CrossEnvironmentAdapter.getInstance();

    if (adapter.supportsHighResolutionTime()) {
      const time = performance.now();
      switch (this.precision) {
        case "microsecond":
          return time * 1000;
        case "nanosecond":
          return time * 1000000;
        default:
          return time;
      }
    }

    return Date.now();
  }

  /**
   * Get elapsed time with specified precision
   */
  elapsed(): number {
    if (!this.state.isRunning) {
      return this.state.elapsedTime || 0;
    }

    return this.getCurrentTime() - this.state.startTime;
  }

  /**
   * Stop the timer and return elapsed time
   */
  stop(): number {
    if (this.state.isRunning) {
      this.state.elapsedTime = this.elapsed();
      this.state.isRunning = false;
    }
    return this.state.elapsedTime || 0;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.state = {
      startTime: this.getCurrentTime(),
      isRunning: true,
    };
  }

  /**
   * Get elapsed time and reset in one operation
   */
  lap(): number {
    const elapsed = this.elapsed();
    this.reset();
    return elapsed;
  }

  getState(): ITimerState {
    return {
      ...this.state,
      elapsedTime: this.elapsed(),
    };
  }
}

/**
 * Enhanced debounce utility with cancellation and flushing
 */
export function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  config: IDebounceConfig,
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: T | null = null;
  let lastCallTime = 0;

  const debouncedFn = (...args: T) => {
    lastArgs = args;
    lastCallTime = Date.now();

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const shouldCallImmediately = config.leading && timeoutId === null;

    timeoutId = setTimeout(() => {
      if (config.trailing !== false && lastArgs) {
        func(...lastArgs);
      }
      timeoutId = null;
      lastArgs = null;
    }, config.waitMs);

    if (shouldCallImmediately) {
      func(...args);
    }

    // Handle maxWait
    if (config.maxWait && lastCallTime > 0) {
      const timeSinceLastCall = Date.now() - lastCallTime;
      if (timeSinceLastCall >= config.maxWait) {
        debouncedFn.flush();
      }
    }
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debouncedFn.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debouncedFn;
}

/**
 * Enhanced throttle utility with leading and trailing options
 */
export function throttle<T extends unknown[]>(
  func: (...args: T) => void,
  config: IThrottleConfig,
): ThrottledFunction<T> {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: T | null = null;

  const throttledFn = (...args: T) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    lastArgs = args;

    if (timeSinceLastCall >= config.limitMs) {
      if (config.leading !== false) {
        lastCallTime = now;
        func(...args);
      }

      if (config.trailing !== false && !timeoutId) {
        timeoutId = setTimeout(() => {
          if (lastArgs && Date.now() - lastCallTime >= config.limitMs) {
            lastCallTime = Date.now();
            func(...lastArgs);
          }
          timeoutId = null;
        }, config.limitMs - timeSinceLastCall);
      }
    } else if (config.trailing !== false && !timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        if (lastArgs) {
          func(...lastArgs);
        }
        timeoutId = null;
      }, config.limitMs - timeSinceLastCall);
    }
  };

  throttledFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  throttledFn.flush = () => {
    if (lastArgs) {
      func(...lastArgs);
      lastArgs = null;
      lastCallTime = Date.now();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFn;
}

/**
 * Memory-efficient circular buffer with statistics
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly bufferCapacity: number;

  constructor(capacity: number) {
    this.bufferCapacity = capacity;
    this.buffer = new Array<T>(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.bufferCapacity;

    if (this.count < this.bufferCapacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.bufferCapacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.bufferCapacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  size(): number {
    return this.count;
  }

  capacity(): number {
    return this.bufferCapacity;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  getStats(): ICircularBufferStats {
    const items = this.toArray();
    const numericItems = items.filter((item) => typeof item === "number") as number[];

    const stats: ICircularBufferStats = {
      size: this.count,
      capacity: this.bufferCapacity,
      utilization: this.count / this.bufferCapacity,
    };

    if (numericItems.length > 0) {
      stats.averageValue = numericItems.reduce((sum, val) => sum + val, 0) / numericItems.length;
      stats.minValue = Math.min(...numericItems);
      stats.maxValue = Math.max(...numericItems);
    }

    return stats;
  }

  peek(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    return this.buffer[this.head];
  }

  peekLast(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    const lastIndex = this.tail === 0 ? this.bufferCapacity - 1 : this.tail - 1;
    return this.buffer[lastIndex];
  }
}

/**
 * Memory cleanup utilities for test environments
 *
 * Provides utilities to prevent memory pressure during testing by
 * cleaning up resources and forcing garbage collection when available.
 */

/**
 * Force garbage collection if available (Node.js with --expose-gc flag)
 */
export function forceGC(): void {
  if (typeof (global as any).gc === "function") {
    try {
      (global as any).gc();
    } catch (error) {
      // GC not available or failed, continue silently
      console.warn("Garbage collection failed:", error);
    }
  }
}

/**
 * Clean up arrays and maps to prevent memory leaks
 */
export function cleanupCollections(...collections: (unknown[] | Map<unknown, unknown> | Set<unknown>)[]): void {
  collections.forEach((collection) => {
    if (Array.isArray(collection)) {
      collection.length = 0;
    } else if (collection instanceof Map) {
      collection.clear();
    } else if (collection instanceof Set) {
      collection.clear();
    }
  });
}

/**
 * Comprehensive cleanup for test environments
 */
export async function performTestCleanup(
  options: {
    forceGC?: boolean;
    delay?: number;
    collections?: (unknown[] | Map<unknown, unknown> | Set<unknown>)[];
  } = {},
): Promise<void> {
  const { forceGC: shouldForceGC = true, delay = 10, collections = [] } = options;

  // Clean up provided collections
  if (collections.length > 0) {
    cleanupCollections(...collections);
  }

  // Force garbage collection if requested
  if (shouldForceGC) {
    forceGC();
  }

  // Small delay to allow cleanup operations to complete
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Memory-safe test wrapper that automatically cleans up after test execution
 */
export function withMemoryCleanup<T extends (...args: any[]) => any>(
  testFn: T,
  cleanupOptions?: Parameters<typeof performTestCleanup>[0],
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      const result = await testFn(...args);
      return result;
    } finally {
      await performTestCleanup(cleanupOptions);
    }
  };
}

/**
 * Create a memory-optimized configuration for performance trackers in test environments
 */
export function createTestPerformanceConfig() {
  return {
    enabled: true,
    sampleRate: 0.1, // Very low sampling rate for tests
    thresholdMs: 1000, // Higher threshold to reduce noise
    enableMemoryTracking: false, // Disable to prevent circular memory pressure
    enableGCTracking: false,
    maxLatencyHistory: 10, // Minimal history
    maxGCEventHistory: 5,
    resourceMetricsInterval: 0, // Disable periodic collection
    enableMeasurementPooling: true,
    measurementPoolInitialSize: 5, // Very small initial pool
    measurementPoolMaxSize: 20, // Very small max pool
  };
}
