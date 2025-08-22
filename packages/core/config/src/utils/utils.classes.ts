/**
 * Configuration Utility Classes and Platform Detection
 * Comprehensive utility classes and functions for cross-platform configuration management
 * @module @axon/config/utils
 */

import type { ConfigPlatform } from "../types/index.js";
import type { IPerformanceMeasurement, IUtilityOptions, IValidationResult } from "./utils.types.js";

// Global type declarations for cross-platform compatibility
declare const window: unknown;
declare const self: unknown;
declare const navigator: { product: unknown } | undefined;
declare const localStorage: unknown;
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const Worker: unknown;

/**
 * Platform feature detection results
 */
export interface IPlatformFeatures {
  readonly hasFileSystem: boolean;
  readonly hasFileWatching: boolean;
  readonly hasLocalStorage: boolean;
  readonly hasEnvironmentVariables: boolean;
  readonly hasProcessExit: boolean;
  readonly supportsWorkers: boolean;
}

// =============================================================================
// PLATFORM DETECTION UTILITIES
// =============================================================================

/**
 * Detect the current execution platform
 */
export function detectPlatform(): ConfigPlatform {
  // Check for Node.js environment
  try {
    if (typeof process === "object" && process !== null && "versions" in process) {
      return "node";
    }
  } catch {
    // Not Node.js
  }

  // Check for React Native
  try {
    if (typeof navigator === "object" && navigator !== null && "product" in navigator) {
      const nav = navigator as { product: unknown };
      if (nav.product === "ReactNative") {
        return "react-native";
      }
    }
  } catch {
    // Not React Native
  }

  // Default to browser if we have window or self
  if (typeof window !== "undefined" || typeof self !== "undefined") {
    return "browser";
  }

  // Fallback to node
  return "node";
}

/**
 * Get platform-specific feature availability
 */
export function getPlatformFeatures(platform?: ConfigPlatform): IPlatformFeatures {
  const detectedPlatform = platform ?? detectPlatform();

  switch (detectedPlatform) {
    case "node":
      return {
        hasFileSystem: true,
        hasFileWatching: true,
        hasLocalStorage: false,
        hasEnvironmentVariables: true,
        hasProcessExit: true,
        supportsWorkers: true,
      };

    case "browser":
      return {
        hasFileSystem: false,
        hasFileWatching: false,
        hasLocalStorage: typeof localStorage !== "undefined",
        hasEnvironmentVariables: false,
        hasProcessExit: false,
        supportsWorkers: typeof Worker !== "undefined",
      };

    case "react-native":
      return {
        hasFileSystem: false,
        hasFileWatching: false,
        hasLocalStorage: false, // AsyncStorage would be used instead
        hasEnvironmentVariables: false,
        hasProcessExit: false,
        supportsWorkers: false,
      };

    default:
      return {
        hasFileSystem: false,
        hasFileWatching: false,
        hasLocalStorage: false,
        hasEnvironmentVariables: false,
        hasProcessExit: false,
        supportsWorkers: false,
      };
  }
}

/**
 * Check if the platform supports a specific feature
 */
export function platformSupports(feature: keyof IPlatformFeatures, platform?: ConfigPlatform): boolean {
  const features = getPlatformFeatures(platform);
  return features[feature];
}

/**
 * Get recommended repository types for the current platform
 */
export function getRecommendedRepositories(platform?: ConfigPlatform): string[] {
  const detectedPlatform = platform ?? detectPlatform();
  const features = getPlatformFeatures(detectedPlatform);

  const repositories: string[] = [];

  // Always available
  repositories.push("memory");

  // Platform-specific repositories
  if (features.hasEnvironmentVariables) {
    repositories.push("environment");
  }

  if (features.hasFileSystem) {
    repositories.push("file");
  }

  if (features.hasLocalStorage) {
    repositories.push("localStorage");
  }

  // Always add composite and cached as they wrap other repositories
  repositories.push("composite", "cached");

  return repositories;
}

/**
 * Polyfill for performance.now() across environments
 */
export function performanceNow(): number {
  if (typeof performance !== "undefined" && performance?.now) {
    return performance.now();
  }

  if (typeof process !== "undefined" && process?.hrtime) {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }

  return Date.now();
}

/**
 * Platform-safe setTimeout implementation
 */
export function platformSetTimeout(callback: () => void, delay: number): () => void {
  if (typeof setTimeout !== "undefined") {
    const timeoutId = setTimeout(callback, delay);
    return () => {
      clearTimeout(timeoutId);
    };
  }

  // Fallback for environments without setTimeout
  const startTime = Date.now();
  const check = (): void => {
    if (Date.now() - startTime >= delay) {
      callback();
    } else {
      // Use setImmediate if available, otherwise recursive setTimeout simulation
      if (typeof setImmediate !== "undefined") {
        setImmediate(check);
      } else {
        if (typeof setTimeout !== "undefined") {
          setTimeout(check, 1);
        }
      }
    }
  };

  if (typeof setImmediate !== "undefined") {
    setImmediate(check);
  } else if (typeof setTimeout !== "undefined") {
    setTimeout(check, 1);
  }

  return () => {
    // No-op for fallback case
  };
}

// =============================================================================
// CONFIGURATION UTILITY CLASSES
// =============================================================================

/**
 * Configuration performance measurement utility
 */
export class ConfigurationPerformanceMeasurer {
  private measurements = new Map<string, IPerformanceMeasurement>();

  /**
   * Start measuring an operation
   */
  start(operation: string): void {
    const startTime = performanceNow(); // Use our polyfill
    this.measurements.set(operation, {
      startTime,
      endTime: 0,
      duration: 0,
      operation,
    });
  }

  /**
   * End measuring an operation and calculate duration
   */
  end(operation: string, metadata?: Record<string, unknown>): IPerformanceMeasurement | null {
    const measurement = this.measurements.get(operation);
    if (!measurement) {
      return null;
    }

    const endTime = performanceNow(); // Use our polyfill
    const completedMeasurement: IPerformanceMeasurement = {
      ...measurement,
      endTime,
      duration: endTime - measurement.startTime,
      ...(metadata && { metadata }),
    };

    this.measurements.set(operation, completedMeasurement);
    return completedMeasurement;
  }

  /**
   * Get measurement for an operation
   */
  getMeasurement(operation: string): IPerformanceMeasurement | null {
    return this.measurements.get(operation) || null;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }
}

/**
 * Configuration validation utility
 */
export class ConfigurationValidator {
  private readonly options: IUtilityOptions;

  constructor(options: IUtilityOptions = {}) {
    this.options = {
      enableCaching: true,
      enableValidation: true,
      enableLogging: false,
      timeout: 5000,
      ...options,
    };
  }

  /**
   * Validate configuration data
   */
  validate(data: unknown, rules?: Record<string, unknown>): IValidationResult {
    const timestamp = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (data === null || data === undefined) {
        errors.push("Configuration data is null or undefined");
      }

      if (typeof data !== "object") {
        errors.push("Configuration data must be an object");
      }

      // Additional rule-based validation if rules provided
      if (rules && typeof data === "object" && data !== null) {
        this.validateAgainstRules(data as Record<string, unknown>, rules, errors, warnings);
      }

      const result: IValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? data : undefined,
        timestamp,
      };

      if (this.options.enableLogging) {
        console.log("Configuration validation result:", result);
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
        timestamp,
      };
    }
  }

  /**
   * Validate configuration against custom rules
   */
  private validateAgainstRules(
    data: Record<string, unknown>,
    rules: Record<string, unknown>,
    errors: string[],
    warnings: string[],
  ): void {
    for (const [key, rule] of Object.entries(rules)) {
      if (!(key in data)) {
        if (rule === "required") {
          errors.push(`Required field '${key}' is missing`);
        } else {
          warnings.push(`Optional field '${key}' is not present`);
        }
      }
    }
  }
}

/**
 * Configuration cache utility
 */
export class ConfigurationCache {
  private readonly cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) {
    // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set cached value
   */
  set(key: string, data: unknown, ttl?: number): void {
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Get cached value
   */
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
