/**
 * Lightweight structured logger for validation runs.
 */

export type TestLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TestLogEntry {
  readonly level: TestLogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: Record<string, unknown>;
}

export class TestLogger {
  private readonly entries: TestLogEntry[] = [];

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  getEntries(): readonly TestLogEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries.length = 0;
  }

  private log(level: TestLogLevel, message: string, context?: Record<string, unknown>): void {
    this.entries.push({
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }
}

export function createTestLogger(): TestLogger {
  return new TestLogger();
}
