/**
 * Base error classes and core error handling
 */

import type { IErrorContext } from "../types/index.js";

/**
 * Base enhanced error class with context preservation
 */
export class AxonError extends Error {
  public readonly context: IErrorContext;
  public readonly code: string;

  constructor(message: string, code = "UNKNOWN_ERROR", context: Partial<IErrorContext> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging and transmission
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}
