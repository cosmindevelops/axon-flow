/**
 * Platform detection utilities for cross-environment support
 * @module @axon/config/utils/platform-detector
 */

import type { ConfigPlatform } from "../types/index.js";

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

/**
 * Detect the current execution platform
 */
export function detectPlatform(): ConfigPlatform {
  // Check for Node.js environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof process === "object" && process !== null && "versions" in process) {
      return "node";
    }
  } catch {
    // Not Node.js
  }

  // Check for React Native
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
  if (typeof performance !== "undefined" && performance?.now) {
    return performance.now();
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
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
