/**
 * Platform compatibility implementations
 *
 * Cross-platform detection, validation, and optimization for dependency injection
 */

import type {
  IBrowserInfo,
  IFeatureDetection,
  INodeVersionInfo,
  IPlatformCapabilities,
  IPlatformCompat,
  IPlatformConfig,
  IPlatformError,
  IPlatformPerformance,
  IPlatformValidation,
  ITiming,
  PlatformType,
} from "./platform.types.js";

/**
 * Platform detection and compatibility management
 */
export class PlatformCompat implements IPlatformCompat {
  private capabilities: IPlatformCapabilities | undefined;
  private config: IPlatformConfig | undefined;

  public getPlatformCapabilities(): IPlatformCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    const platform = this.detectPlatform();
    const capabilities: IPlatformCapabilities = {
      platform,
      decoratorSupport: this.detectDecoratorSupport(),
      metadataSupport: this.detectMetadataSupport(),
      weakCollectionSupport: this.detectWeakCollectionSupport(),
      symbolSupport: this.detectSymbolSupport(),
      classSupport: this.detectClassSupport(),
      asyncSupport: this.detectAsyncSupport(),
      performanceSupport: this.detectPerformanceSupport(),
      memoryManagement: {
        weakRef: this.detectWeakRef(),
        finalizationRegistry: this.detectFinalizationRegistry(),
        manualGC: this.detectManualGC(),
      },
    };

    if (platform === "node") {
      const nodeInfo = this.detectNodeVersion();
      if (nodeInfo) {
        capabilities.nodeInfo = nodeInfo;
      }
    } else if (platform === "browser") {
      const browserInfo = this.detectBrowserInfo();
      if (browserInfo) {
        capabilities.browserInfo = browserInfo;
      }
    }

    this.capabilities = capabilities;
    return capabilities;
  }

  public isFeatureSupported(feature: keyof IPlatformCapabilities): boolean {
    const capabilities = this.getPlatformCapabilities();
    const value = capabilities[feature];
    return typeof value === "boolean" ? value : Boolean(value);
  }

  public getPlatformConfig(): IPlatformConfig {
    if (this.config) {
      return this.config;
    }

    const capabilities = this.getPlatformCapabilities();

    this.config = {
      platform: capabilities.platform,
      enableMetadataFallback: !capabilities.metadataSupport,
      enablePerformanceOptimization: capabilities.performanceSupport,
      memoryManagement: {
        useWeakReferences: capabilities.memoryManagement.weakRef,
        enableCleanup: capabilities.memoryManagement.finalizationRegistry,
        gcHintInterval: capabilities.platform === "node" ? 30000 : 60000,
      },
      decorators: {
        useLegacySyntax: !capabilities.decoratorSupport,
        enableMetadataPolyfill: !capabilities.metadataSupport,
      },
    };

    return this.config;
  }

  public applyOptimizations(): void {
    const config = this.getPlatformConfig();
    const capabilities = this.getPlatformCapabilities();

    if (config.enablePerformanceOptimization && capabilities.performanceSupport) {
      // Enable performance.now() usage for timing
      this.enablePerformanceTiming();
    }

    if (config.memoryManagement?.useWeakReferences && capabilities.memoryManagement.weakRef) {
      // Enable WeakRef usage for memory optimization
      this.enableWeakReferences();
    }

    if (config.memoryManagement?.enableCleanup && capabilities.memoryManagement.finalizationRegistry) {
      // Enable automatic cleanup
      this.enableCleanupTracking();
    }
  }

  public cleanup(): void {
    this.capabilities = undefined;
    this.config = undefined;
  }

  private detectPlatform(): PlatformType {
    // Node.js detection
    if (typeof process !== "undefined" && process.versions?.node) {
      return "node";
    }

    // Deno detection
    if (typeof (globalThis as { Deno?: unknown }).Deno !== "undefined") {
      return "deno";
    }

    // Bun detection
    if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") {
      return "bun";
    }

    // Worker detection
    if (typeof self !== "undefined" && typeof (globalThis as any).importScripts === "function") {
      return "worker";
    }

    // Browser detection
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      return "browser";
    }

    return "unknown";
  }

  private detectNodeVersion(): INodeVersionInfo | undefined {
    if (typeof process === "undefined" || !process.versions?.node) {
      return undefined;
    }

    const versionString = process.versions.node;
    const parts = versionString.split(".").map(Number);
    const major = parts[0] || 0;
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    return {
      major,
      minor,
      patch,
      version: versionString,
      esModulesSupported: major >= 12,
      weakRefSupported: major >= 14,
      finalizationRegistrySupported: major >= 14,
    };
  }

  private detectBrowserInfo(): IBrowserInfo | undefined {
    if (typeof navigator === "undefined") {
      return undefined;
    }

    const userAgent = navigator.userAgent;
    let name = "unknown";
    let version = "unknown";

    // Simple browser detection
    if (userAgent.includes("Chrome")) {
      name = "chrome";
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match?.[1] ?? "unknown";
    } else if (userAgent.includes("Firefox")) {
      name = "firefox";
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match?.[1] ?? "unknown";
    } else if (userAgent.includes("Safari")) {
      name = "safari";
      const match = userAgent.match(/Safari\/(\d+)/);
      version = match?.[1] ?? "unknown";
    }

    return {
      name,
      version,
      userAgent,
      classSupported: this.detectClassSupport(),
      weakMapSupported: this.detectWeakCollectionSupport(),
      symbolSupported: this.detectSymbolSupport(),
      reflectSupported: typeof Reflect !== "undefined",
      proxySupported: typeof Proxy !== "undefined",
    };
  }

  private detectDecoratorSupport(): boolean {
    // Check if decorators are supported (this is tricky to detect at runtime)
    return typeof Reflect !== "undefined" && typeof (Reflect as { decorate?: unknown }).decorate === "function";
  }

  private detectMetadataSupport(): boolean {
    return typeof Reflect !== "undefined" && typeof (Reflect as { getMetadata?: unknown }).getMetadata === "function";
  }

  private detectWeakCollectionSupport(): boolean {
    return typeof WeakMap !== "undefined" && typeof WeakSet !== "undefined";
  }

  private detectSymbolSupport(): boolean {
    return typeof Symbol !== "undefined" && typeof Symbol.for === "function";
  }

  private detectClassSupport(): boolean {
    // ES6 classes are universally supported in environments that support other modern features
    // If we can run this code, class syntax is supported
    return typeof class {} === "function";
  }

  private detectAsyncSupport(): boolean {
    return typeof Promise !== "undefined" && typeof (async () => {})().then === "function";
  }

  private detectPerformanceSupport(): boolean {
    return typeof performance !== "undefined" && typeof performance.now === "function";
  }

  private detectWeakRef(): boolean {
    return typeof (globalThis as { WeakRef?: unknown }).WeakRef !== "undefined";
  }

  private detectFinalizationRegistry(): boolean {
    return typeof (globalThis as { FinalizationRegistry?: unknown }).FinalizationRegistry !== "undefined";
  }

  private detectManualGC(): boolean {
    return typeof global !== "undefined" && typeof (global as { gc?: unknown }).gc === "function";
  }

  private enablePerformanceTiming(): void {
    // Performance timing optimization would be implemented here
  }

  private enableWeakReferences(): void {
    // WeakRef optimization would be implemented here
  }

  private enableCleanupTracking(): void {
    // FinalizationRegistry cleanup would be implemented here
  }
}

/**
 * Platform validation utilities
 */
export class PlatformValidator {
  private compat: PlatformCompat;

  constructor() {
    this.compat = new PlatformCompat();
  }

  public validatePlatform(): IPlatformValidation {
    const capabilities = this.compat.getPlatformCapabilities();
    const features: IFeatureDetection[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];

    // Test critical features
    features.push(this.testFeature("symbolSupport", capabilities.symbolSupport));
    features.push(this.testFeature("classSupport", capabilities.classSupport));
    features.push(this.testFeature("asyncSupport", capabilities.asyncSupport));
    features.push(this.testFeature("weakCollectionSupport", capabilities.weakCollectionSupport));

    // Test optional features
    features.push(this.testFeature("decoratorSupport", capabilities.decoratorSupport));
    features.push(this.testFeature("metadataSupport", capabilities.metadataSupport));
    features.push(this.testFeature("performanceSupport", capabilities.performanceSupport));

    // Check for critical failures
    if (!capabilities.symbolSupport) {
      criticalFailures.push("Symbol support required for metadata keys");
    }
    if (!capabilities.classSupport) {
      criticalFailures.push("ES6 class support required for constructors");
    }
    if (!capabilities.weakCollectionSupport) {
      criticalFailures.push("WeakMap support required for metadata storage");
    }

    // Generate warnings
    if (!capabilities.decoratorSupport) {
      warnings.push("Decorator support not detected - will use manual registration");
    }
    if (!capabilities.metadataSupport) {
      warnings.push("Metadata reflection not available - will use internal storage");
    }
    if (!capabilities.performanceSupport) {
      warnings.push("Performance API not available - timing metrics will be limited");
    }

    // Calculate compatibility score
    const totalFeatures = features.length;
    const supportedFeatures = features.filter((f) => f.supported).length;
    const compatibilityScore = totalFeatures > 0 ? supportedFeatures / totalFeatures : 0;

    return {
      platform: capabilities.platform,
      compatibilityScore,
      features,
      criticalFailures,
      warnings,
      recommendedConfig: this.compat.getPlatformConfig(),
    };
  }

  public runPerformanceBenchmark(): IPlatformPerformance {
    const capabilities = this.compat.getPlatformCapabilities();

    // Create test container for benchmarking
    const createContainer = () => {
      return {
        register: () => {},
        resolve: () => ({}),
      };
    };

    // Benchmark container creation
    const containerCreation = this.benchmarkOperation(() => createContainer(), 100);

    // Benchmark registration
    const registration = this.benchmarkOperation(() => {
      const container = createContainer();
      container.register();
    }, 1000);

    // Benchmark resolution
    const resolution = this.benchmarkOperation(() => {
      const container = createContainer();
      container.resolve();
    }, 1000);

    return {
      platform: capabilities.platform,
      containerCreation: {
        average: containerCreation.average,
        min: containerCreation.min,
        max: containerCreation.max,
        samples: containerCreation.samples,
      },
      registration: {
        average: registration.average,
        throughput: 1000 / registration.average,
      },
      resolution: {
        average: resolution.average,
        throughput: 1000 / resolution.average,
        cacheHitRatio: 0.95, // Placeholder
      },
      memory: {
        containerOverhead: 1024, // Estimated bytes
        perRegistration: 256, // Estimated bytes
        perResolution: 64, // Estimated bytes
      },
    };
  }

  private testFeature(name: string, supported: boolean): IFeatureDetection {
    return {
      feature: name,
      supported,
      method: "api-check",
      details: supported ? "Feature available" : "Feature not detected",
    };
  }

  private benchmarkOperation(operation: () => void, iterations: number) {
    const times: number[] = [];
    const _startPerf = typeof performance !== "undefined" ? performance.now() : Date.now();

    for (let i = 0; i < iterations; i++) {
      const start = typeof performance !== "undefined" ? performance.now() : Date.now();
      operation();
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      times.push(end - start);
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      samples: times.length,
    };
  }
}

/**
 * Platform-specific error implementation
 */
export class PlatformError extends Error implements IPlatformError {
  public readonly platform: PlatformType;
  public readonly feature?: string;
  public readonly workaround?: string;
  public readonly critical: boolean;

  constructor(
    message: string,
    platform: PlatformType,
    options: {
      feature?: string;
      workaround?: string;
      critical?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "PlatformError";
    this.platform = platform;
    if (options.feature) {
      (this as any).feature = options.feature;
    }
    if (options.workaround) {
      (this as any).workaround = options.workaround;
    }
    this.critical = options.critical ?? false;
  }
}

/**
 * Global platform compatibility instance
 */
export const platformCompat = new PlatformCompat();

/**
 * Global platform validator instance
 */
export const platformValidator = new PlatformValidator();

/**
 * Factory functions for platform utilities
 */

/**
 * Create platform compatibility manager
 */
export function createPlatformCompat(): PlatformCompat {
  return new PlatformCompat();
}

/**
 * Create platform validator
 */
export function createPlatformValidator(): PlatformValidator {
  return new PlatformValidator();
}

/**
 * Quick platform validation check
 */
export function validateCurrentPlatform(): IPlatformValidation {
  return platformValidator.validatePlatform();
}

/**
 * Get current platform capabilities
 */
export function getCurrentPlatformCapabilities(): IPlatformCapabilities {
  return platformCompat.getPlatformCapabilities();
}

/**
 * Check if DI container is supported on current platform
 */
export function isPlatformSupported(): boolean {
  const validation = validateCurrentPlatform();
  return validation.criticalFailures.length === 0;
}

/**
 * Performance timing implementation with cross-platform fallbacks
 */
export class PlatformTiming implements ITiming {
  private readonly capabilities: IPlatformCapabilities;
  private readonly useHighResTimer: boolean;

  constructor() {
    this.capabilities = platformCompat.getPlatformCapabilities();
    this.useHighResTimer = this.capabilities.performanceSupport;
  }

  /**
   * Get high-resolution timestamp in milliseconds
   * Falls back to Date.now() if performance.now() unavailable
   */
  public now(): number {
    if (this.useHighResTimer && typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Check if high-resolution timing is available
   */
  public isHighResolution(): boolean {
    return this.useHighResTimer;
  }

  /**
   * Get current timestamp (always uses Date.now() for consistency)
   */
  public getTimestamp(): number {
    return Date.now();
  }
}

/**
 * Global timing instance for dependency injection
 */
export const platformTiming = new PlatformTiming();

/**
 * Factory function to create timing instance
 */
export function createPlatformTiming(): PlatformTiming {
  return new PlatformTiming();
}

/**
 * Convenience function for getting current time
 */
export function now(): number {
  return platformTiming.now();
}

/**
 * Convenience function for checking high-resolution support
 */
export function isHighResolutionTimingAvailable(): boolean {
  return platformTiming.isHighResolution();
}
