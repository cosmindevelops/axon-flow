/**
 * Type definitions for configuration utilities
 * @module utils/types
 */

/**
 * Platform detection result
 */
export interface IPlatformInfo {
  /** Platform name */
  platform: "browser" | "node" | "electron" | "unknown";
  /** Platform version if available */
  version?: string;
  /** Additional platform features */
  features: {
    /** Environment variables support */
    hasEnvVars: boolean;
    /** File system access */
    hasFileSystem: boolean;
    /** Local storage support */
    hasLocalStorage: boolean;
  };
}

/**
 * Utility function signature for platform detection
 */
export interface IPlatformDetector {
  /** Detect current platform information */
  detect(): IPlatformInfo;
  /** Check if running in specific platform */
  isNode(): boolean;
  /** Check if running in browser */
  isBrowser(): boolean;
  /** Check if running in Electron */
  isElectron(): boolean;
}

/**
 * Performance measurement result
 */
export interface IPerformanceMeasurement {
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly operation: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Utility options for configuration utilities
 */
export interface IUtilityOptions {
  readonly enableCaching?: boolean;
  readonly enableValidation?: boolean;
  readonly enableLogging?: boolean;
  readonly timeout?: number;
}

/**
 * Configuration validation result
 */
export interface IValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly data?: unknown;
  readonly timestamp: number;
}
