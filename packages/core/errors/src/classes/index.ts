/**
 * Specific error classes for different domains
 */

import { AxonError } from "../base/index.js";
import type { IErrorContext } from "../types/index.js";

/**
 * Configuration-related errors
 */
export class ConfigurationError extends AxonError {
  constructor(message: string, context: Partial<IErrorContext> = {}) {
    super(message, "CONFIGURATION_ERROR", context);
  }
}

/**
 * Validation errors for schema and input validation
 */
export class ValidationError extends AxonError {
  constructor(message: string, context: Partial<IErrorContext> = {}) {
    super(message, "VALIDATION_ERROR", context);
  }
}
