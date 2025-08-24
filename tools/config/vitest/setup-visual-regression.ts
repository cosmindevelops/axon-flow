/**
 * Visual regression testing setup for Axon Flow
 *
 * This setup file provides utilities and configuration for visual regression
 * testing of error outputs and console formatting across the monorepo.
 */

import { beforeEach, afterEach } from "vitest";

// Global setup for visual regression testing
let originalConsole: Console;
let capturedOutput: string[];

beforeEach(() => {
  // Capture console output for visual regression testing
  originalConsole = globalThis.console;
  capturedOutput = [];

  // Mock console methods to capture output
  globalThis.console = {
    ...originalConsole,
    log: (...args: unknown[]) => {
      capturedOutput.push(`LOG: ${args.join(" ")}`);
      originalConsole.log(...args);
    },
    error: (...args: unknown[]) => {
      capturedOutput.push(`ERROR: ${args.join(" ")}`);
      originalConsole.error(...args);
    },
    warn: (...args: unknown[]) => {
      capturedOutput.push(`WARN: ${args.join(" ")}`);
      originalConsole.warn(...args);
    },
    info: (...args: unknown[]) => {
      capturedOutput.push(`INFO: ${args.join(" ")}`);
      originalConsole.info(...args);
    },
  };
});

afterEach(() => {
  // Restore original console
  globalThis.console = originalConsole;
  capturedOutput = [];
});

// Export utilities for visual regression tests
export function getCapturedOutput(): string[] {
  return [...capturedOutput];
}

export function clearCapturedOutput(): void {
  capturedOutput = [];
}

// Utility for normalizing error output for visual regression testing
export function normalizeErrorOutput(error: Error): string {
  return [
    `Error: ${error.message}`,
    `Name: ${error.name}`,
    `Stack: ${error.stack?.split("\n")[0] || "No stack trace"}`,
  ].join("\n");
}
