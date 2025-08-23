/**
 * Platform compatibility types
 *
 * Type definitions for cross-platform dependency injection container support
 */

/**
 * Supported platform types
 */
export type PlatformType = "node" | "browser" | "worker" | "deno" | "bun" | "unknown";

/**
 * Node.js version information
 */
export interface INodeVersionInfo {
  /** Major version number */
  major: number;

  /** Minor version number */
  minor: number;

  /** Patch version number */
  patch: number;

  /** Full version string */
  version: string;

  /** Whether ES modules are supported */
  esModulesSupported: boolean;

  /** Whether WeakRef is supported */
  weakRefSupported: boolean;

  /** Whether FinalizationRegistry is supported */
  finalizationRegistrySupported: boolean;
}

/**
 * Browser environment information
 */
export interface IBrowserInfo {
  /** Browser name */
  name: string;

  /** Browser version */
  version: string;

  /** User agent string */
  userAgent: string;

  /** Whether ES6 classes are supported */
  classSupported: boolean;

  /** Whether WeakMap is supported */
  weakMapSupported: boolean;

  /** Whether Symbols are supported */
  symbolSupported: boolean;

  /** Whether Reflect API is available */
  reflectSupported: boolean;

  /** Whether Proxy is supported */
  proxySupported: boolean;
}

/**
 * Platform capabilities detection
 */
export interface IPlatformCapabilities {
  /** Platform type */
  platform: PlatformType;

  /** Node.js version info (if running on Node.js) */
  nodeInfo?: INodeVersionInfo;

  /** Browser info (if running in browser) */
  browserInfo?: IBrowserInfo;

  /** Whether decorators are supported */
  decoratorSupport: boolean;

  /** Whether metadata reflection is available */
  metadataSupport: boolean;

  /** Whether WeakMap/WeakSet are available */
  weakCollectionSupport: boolean;

  /** Whether Symbols are supported */
  symbolSupport: boolean;

  /** Whether ES6 classes are supported */
  classSupport: boolean;

  /** Whether async/await is supported */
  asyncSupport: boolean;

  /** Performance API availability */
  performanceSupport: boolean;

  /** Memory management capabilities */
  memoryManagement: {
    /** WeakRef support */
    weakRef: boolean;

    /** FinalizationRegistry support */
    finalizationRegistry: boolean;

    /** Manual GC trigger */
    manualGC: boolean;
  };
}

/**
 * Platform-specific configuration
 */
export interface IPlatformConfig {
  /** Platform type */
  platform: PlatformType;

  /** Whether to enable metadata fallbacks */
  enableMetadataFallback?: boolean;

  /** Whether to use performance optimization */
  enablePerformanceOptimization?: boolean;

  /** Memory management strategy */
  memoryManagement?: {
    /** Enable weak references */
    useWeakReferences?: boolean;

    /** Enable memory cleanup */
    enableCleanup?: boolean;

    /** GC hint interval in milliseconds */
    gcHintInterval?: number;
  };

  /** Decorator configuration */
  decorators?: {
    /** Use legacy decorator syntax */
    useLegacySyntax?: boolean;

    /** Enable metadata polyfill */
    enableMetadataPolyfill?: boolean;
  };
}

/**
 * Cross-platform compatibility interface
 */
export interface IPlatformCompat {
  /** Get current platform capabilities */
  getPlatformCapabilities(): IPlatformCapabilities;

  /** Check if feature is supported */
  isFeatureSupported(feature: keyof IPlatformCapabilities): boolean;

  /** Get platform-specific configuration */
  getPlatformConfig(): IPlatformConfig;

  /** Apply platform-specific optimizations */
  applyOptimizations(): void;

  /** Cleanup platform-specific resources */
  cleanup(): void;
}

/**
 * Feature detection results
 */
export interface IFeatureDetection {
  /** Feature name */
  feature: string;

  /** Whether feature is supported */
  supported: boolean;

  /** Detection method used */
  method: "typeof" | "try-catch" | "api-check" | "user-agent";

  /** Additional details */
  details?: string;

  /** Error if detection failed */
  error?: string;
}

/**
 * Platform validation results
 */
export interface IPlatformValidation {
  /** Platform type detected */
  platform: PlatformType;

  /** Overall compatibility score (0-1) */
  compatibilityScore: number;

  /** Individual feature results */
  features: IFeatureDetection[];

  /** Critical features that failed */
  criticalFailures: string[];

  /** Warnings about compatibility */
  warnings: string[];

  /** Recommended configuration */
  recommendedConfig: IPlatformConfig;
}

/**
 * Performance metrics by platform
 */
export interface IPlatformPerformance {
  /** Platform type */
  platform: PlatformType;

  /** Container creation time */
  containerCreation: {
    /** Average time in ms */
    average: number;

    /** Minimum time in ms */
    min: number;

    /** Maximum time in ms */
    max: number;

    /** Sample count */
    samples: number;
  };

  /** Registration performance */
  registration: {
    /** Average time per registration in ms */
    average: number;

    /** Registrations per second */
    throughput: number;
  };

  /** Resolution performance */
  resolution: {
    /** Average resolution time in ms */
    average: number;

    /** Resolutions per second */
    throughput: number;

    /** Cache hit ratio */
    cacheHitRatio: number;
  };

  /** Memory usage */
  memory: {
    /** Estimated container overhead in bytes */
    containerOverhead: number;

    /** Memory per registration in bytes */
    perRegistration: number;

    /** Memory per resolution in bytes */
    perResolution: number;
  };
}

/**
 * Cross-platform timing interface
 */
export interface ITiming {
  now(): number;
  isHighResolution(): boolean;
  getTimestamp(): number;
}

/**
 * Environment-specific error types
 */
export interface IPlatformError extends Error {
  /** Platform where error occurred */
  platform: PlatformType;

  /** Feature that caused the error */
  feature?: string;

  /** Suggested workaround */
  workaround?: string;

  /** Whether error is critical */
  critical: boolean;
}
