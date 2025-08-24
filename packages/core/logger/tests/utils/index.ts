/**
 * Logger test utilities - Real transport implementations for testing
 *
 * This module provides real transport implementations that replace mocks in logger tests:
 * - InMemoryTransport: Stores logs in memory for inspection
 * - TestFileTransport: Uses real temp directories and filesystem operations
 * - TestHttpTransport: Creates real HTTP server for testing remote transports
 */

export { InMemoryTransport } from "./InMemoryTransport.js";
export { TestFileTransport } from "./TestFileTransport.js";
export { TestHttpTransport, type TestHttpTransportOptions } from "./TestHttpTransport.js";

import { InMemoryTransport } from "./InMemoryTransport.js";
import { TestFileTransport } from "./TestFileTransport.js";
import { TestHttpTransport, type TestHttpTransportOptions } from "./TestHttpTransport.js";
import type { ITransportProvider } from "../../src/transport/transport.types.js";

/**
 * Create an in-memory transport for testing
 */
export function createInMemoryTransport(): InMemoryTransport {
  return new InMemoryTransport();
}

/**
 * Create a file transport that uses real temporary directories
 */
export function createTestFileTransport(filename = "test.log"): TestFileTransport {
  return new TestFileTransport(filename);
}

/**
 * Create an HTTP transport with real server for testing
 */
export async function createTestHttpTransport(options?: TestHttpTransportOptions): Promise<TestHttpTransport> {
  return TestHttpTransport.create(options);
}

/**
 * Cleanup utility for test transports
 */
export async function cleanupTransport(transport: ITransportProvider): Promise<void> {
  if (transport instanceof TestFileTransport) {
    TestFileTransport.cleanup(transport);
  } else if (transport instanceof TestHttpTransport) {
    await TestHttpTransport.cleanup(transport);
  }

  if (transport.close) {
    await transport.close();
  }
}

/**
 * Cleanup multiple transports
 */
export async function cleanupTransports(transports: ITransportProvider[]): Promise<void> {
  await Promise.all(transports.map((transport) => cleanupTransport(transport)));
}

/**
 * Test helper to wait for async operations to complete
 */
export function waitForAsync(ms = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test helper to create multiple transports of different types
 */
export async function createTestTransportSuite(): Promise<{
  memory: InMemoryTransport;
  file: TestFileTransport;
  http: TestHttpTransport;
  cleanup: () => Promise<void>;
}> {
  const memory = createInMemoryTransport();
  const file = createTestFileTransport();
  const http = await createTestHttpTransport();

  const cleanup = async () => {
    await cleanupTransports([memory, file, http]);
  };

  return { memory, file, http, cleanup };
}

/**
 * Test helper to verify transport health
 */
export function assertTransportHealthy(transport: ITransportProvider): void {
  if (!transport.isHealthy()) {
    throw new Error(`Transport ${transport.type} is not healthy`);
  }

  const health = transport.getHealth();
  if (health.status !== "healthy") {
    throw new Error(
      `Transport ${transport.type} health status is ${health.status}: ${health.error || "Unknown error"}`,
    );
  }
}

/**
 * Test helper to verify transport metrics
 */
export function assertTransportMetrics(
  transport: ITransportProvider,
  expectedWrites: number,
  expectedFailures = 0,
): void {
  const metrics = transport.getMetrics();

  if (metrics.messagesWritten !== expectedWrites) {
    throw new Error(`Expected ${expectedWrites} messages written, got ${metrics.messagesWritten}`);
  }

  if (metrics.messagesFailed !== expectedFailures) {
    throw new Error(`Expected ${expectedFailures} messages failed, got ${metrics.messagesFailed}`);
  }
}

/**
 * Common test log entry factory
 */
export function createTestLogEntry(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    level: "info",
    message: "Test message",
    timestamp: Date.now(),
    correlationId: `test-${Math.random().toString(36).substring(7)}`,
    meta: { source: "test" },
    ...overrides,
  };
}

/**
 * Create multiple test log entries
 */
export function createTestLogEntries(
  count: number,
  baseEntry?: Partial<Record<string, unknown>>,
): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) =>
    createTestLogEntry({
      message: `Test message ${i}`,
      ...baseEntry,
    }),
  );
}

/**
 * Test helper to simulate transport failures
 */
export class TransportFailureSimulator {
  private originalWrite: (logEntry: Record<string, unknown>) => Promise<void> | void;

  constructor(private transport: ITransportProvider) {
    this.originalWrite = transport.write.bind(transport);
  }

  simulateFailure(errorMessage = "Simulated transport failure"): void {
    this.transport.write = async () => {
      throw new Error(errorMessage);
    };
  }

  simulateIntermittentFailure(failureRate = 0.5, errorMessage = "Intermittent failure"): void {
    this.transport.write = async (logEntry: Record<string, unknown>) => {
      if (Math.random() < failureRate) {
        throw new Error(errorMessage);
      }
      return this.originalWrite(logEntry);
    };
  }

  restore(): void {
    this.transport.write = this.originalWrite;
  }
}

/**
 * Test utilities for validating log content
 */
export class LogValidator {
  static hasLevel(logs: Record<string, unknown>[], level: string): boolean {
    return logs.some((log) => log.level === level);
  }

  static hasMessage(logs: Record<string, unknown>[], message: string): boolean {
    return logs.some((log) => log.message === message);
  }

  static hasCorrelationId(logs: Record<string, unknown>[], correlationId: string): boolean {
    return logs.some((log) => log.correlationId === correlationId);
  }

  static hasMetaProperty(logs: Record<string, unknown>[], property: string, value: unknown): boolean {
    return logs.some((log) => {
      const meta = log.meta as Record<string, unknown>;
      return meta && meta[property] === value;
    });
  }

  static countByLevel(logs: Record<string, unknown>[], level: string): number {
    return logs.filter((log) => log.level === level).length;
  }

  static getByLevel(logs: Record<string, unknown>[], level: string): Record<string, unknown>[] {
    return logs.filter((log) => log.level === level);
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  static async measureWritePerformance(
    transport: ITransportProvider,
    logCount: number,
    concurrent = false,
  ): Promise<{ totalTime: number; avgTime: number; throughput: number }> {
    const logs = createTestLogEntries(logCount);
    const startTime = Date.now();

    if (concurrent) {
      await Promise.all(logs.map((log) => transport.write(log)));
    } else {
      for (const log of logs) {
        await transport.write(log);
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / logCount;
    const throughput = (logCount * 1000) / totalTime; // logs per second

    return { totalTime, avgTime, throughput };
  }

  static async measureFlushPerformance(transport: ITransportProvider): Promise<number> {
    if (!transport.flush) {
      return 0;
    }

    const startTime = Date.now();
    await transport.flush();
    return Date.now() - startTime;
  }
}
