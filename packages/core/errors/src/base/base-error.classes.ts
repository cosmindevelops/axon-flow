/**
 * Base error class implementations with chain of responsibility
 */

import type {
  IAggregateError,
  IBaseAxonError,
  IChainableError,
  IEnhancedErrorContext,
  IErrorCode,
  IErrorFactory,
  IErrorHandler,
  ISerializedError,
} from "./base-error.types.js";
import { ErrorCategory, ErrorSeverity } from "./base-error.types.js";

/**
 * Generate error code from components
 */
function generateErrorCode(code: string | IErrorCode): string {
  if (typeof code === "string") {
    return code;
  }
  return `${code.domain}_${code.category}_${code.specific}`;
}

/**
 * Base enhanced error class with comprehensive context preservation
 */
export class BaseAxonError extends Error implements IBaseAxonError {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context: IEnhancedErrorContext;
  public readonly createdAt: Date;
  public readonly originalCause?: Error | IBaseAxonError;

  // Override the native Error cause property to match our interface
  declare readonly cause?: Error | IBaseAxonError;

  override get name(): string {
    return this.constructor.name;
  }

  constructor(
    message: string,
    code: string | IErrorCode = "UNKNOWN_ERROR",
    options: Partial<IEnhancedErrorContext> = {},
  ) {
    super(message);
    this.code = generateErrorCode(code);
    this.createdAt = new Date();

    // Set severity and category with defaults
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.category = options.category ?? ErrorCategory.UNKNOWN;

    // Build context with platform detection - handle optional types carefully
    const baseContext: IEnhancedErrorContext = {
      timestamp: this.createdAt.toISOString(),
      severity: this.severity,
      category: this.category,
    };

    // Add optional properties only if they exist
    if (options.correlationId !== undefined) {
      baseContext.correlationId = options.correlationId;
    }
    if (options.component !== undefined) {
      baseContext.component = options.component;
    }
    if (options.operation !== undefined) {
      baseContext.operation = options.operation;
    }
    if (options.stackTrace !== undefined) {
      baseContext.stackTrace = options.stackTrace;
    }
    if (options.metadata !== undefined) {
      baseContext.metadata = options.metadata;
    }

    // Handle environment carefully
    if (options.environment !== undefined) {
      baseContext.environment = options.environment;
    } else {
      const detectedEnv = this.detectEnvironment();
      if (detectedEnv) {
        baseContext.environment = detectedEnv;
      }
    }

    this.context = baseContext;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Detect runtime environment
   */
  private detectEnvironment(): IEnhancedErrorContext["environment"] {
    if (typeof window !== "undefined") {
      return {
        platform: "browser",
        userAgent: window.navigator?.userAgent,
      };
    } else if (typeof process !== "undefined" && process.versions?.node) {
      return {
        platform: "node",
        version: process.version,
      };
    }
    return { platform: "unknown" };
  }

  /**
   * Create new error with additional context
   */
  public withContext(context: Partial<IEnhancedErrorContext>): IBaseAxonError {
    return new BaseAxonError(this.message, this.code, {
      ...this.context,
      ...context,
    });
  }

  /**
   * Create new error with cause
   */
  public withCause(cause: Error | IBaseAxonError): IBaseAxonError {
    const error = new BaseAxonError(this.message, this.code, this.context);
    (error as any).cause = cause;
    return error;
  }

  /**
   * Get full stack trace including cause chain
   */
  public getFullStack(): string {
    const stacks: string[] = [];

    const collectStacks = (error: Error | IBaseAxonError | undefined): void => {
      if (!error) return;

      if (error.stack) {
        stacks.push(error.stack);
      }

      const cause = (error as any).cause;
      if (cause) {
        collectStacks(cause);
      }
    };

    collectStacks(this);
    return stacks.join("\nCaused by: ");
  }

  /**
   * Serialize error for transmission
   */
  public toJSON(): ISerializedError {
    const result: ISerializedError = {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      context: this.context,
      timestamp: this.createdAt.toISOString(),
      version: "1.0.0",
    };

    // Only add stack if it exists
    if (this.stack !== undefined) {
      result.stack = this.stack;
    }

    // Handle cause serialization
    if (this.cause) {
      if ("toJSON" in this.cause) {
        result.cause = this.cause.toJSON();
      } else {
        const causeResult: ISerializedError = {
          name: this.cause.name,
          message: this.cause.message,
          code: "UNKNOWN",
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.UNKNOWN,
          context: {
            timestamp: new Date().toISOString(),
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.UNKNOWN,
          },
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        };

        // Only add stack if it exists
        if (this.cause.stack !== undefined) {
          causeResult.stack = this.cause.stack;
        }

        result.cause = causeResult;
      }
    }

    return result;
  }

  /**
   * Custom string representation
   */
  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message} (${this.severity}/${this.category})`;
  }
}

/**
 * Chainable error with handler chain support
 */
export class ChainableError extends BaseAxonError implements IChainableError {
  private handlers: IErrorHandler[] = [];

  /**
   * Add handler to the chain
   */
  public chain(handler: IErrorHandler): IChainableError {
    this.handlers.push(handler);

    // Link handlers in chain
    if (this.handlers.length > 1) {
      const previousHandler = this.handlers[this.handlers.length - 2];
      if (previousHandler) {
        previousHandler.setNext(handler);
      }
    }

    return this;
  }

  /**
   * Process error through handler chain
   */
  public process(): void {
    if (this.handlers.length > 0) {
      this.handlers[0]?.handle(this);
    }
  }
}

/**
 * Aggregate error for multiple error collection
 */
export class AggregateAxonError extends BaseAxonError implements IAggregateError {
  private _errors: Array<Error | IBaseAxonError> = [];

  constructor(
    message: string,
    errors: Array<Error | IBaseAxonError> = [],
    code: string | IErrorCode = "AGGREGATE_ERROR",
    options: Partial<IEnhancedErrorContext> = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: options.category ?? ErrorCategory.APPLICATION,
    });

    this._errors = [...errors];
  }

  /**
   * Get readonly array of errors
   */
  public get errors(): ReadonlyArray<Error | IBaseAxonError> {
    return Object.freeze([...this._errors]);
  }

  /**
   * Add error to the aggregate
   */
  public addError(error: Error | IBaseAxonError): void {
    this._errors.push(error);
  }

  /**
   * Check if aggregate has errors
   */
  public hasErrors(): boolean {
    return this._errors.length > 0;
  }

  /**
   * Get count of errors
   */
  public getErrorCount(): number {
    return this._errors.length;
  }

  /**
   * Override toJSON to include all errors
   */
  override toJSON(): ISerializedError {
    const base = super.toJSON();
    return {
      ...base,
      errors: this._errors.map((error) => {
        if ("toJSON" in error) {
          return error.toJSON();
        }

        const errorResult: ISerializedError = {
          name: error.name,
          message: error.message,
          code: "UNKNOWN",
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.UNKNOWN,
          context: {
            timestamp: new Date().toISOString(),
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.UNKNOWN,
          },
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        };

        // Only add stack if it exists
        if (error.stack !== undefined) {
          errorResult.stack = error.stack;
        }

        return errorResult;
      }),
    };
  }
}

/**
 * Error factory for creating errors with consistent interface
 */
export class ErrorFactory implements IErrorFactory {
  private defaultSeverity: ErrorSeverity;
  private defaultCategory: ErrorCategory;

  constructor(defaultSeverity = ErrorSeverity.ERROR, defaultCategory = ErrorCategory.UNKNOWN) {
    this.defaultSeverity = defaultSeverity;
    this.defaultCategory = defaultCategory;
  }

  /**
   * Create a new error
   */
  public create(message: string, code: string, options?: Partial<IEnhancedErrorContext>): IBaseAxonError {
    return new BaseAxonError(message, code, {
      severity: this.defaultSeverity,
      category: this.defaultCategory,
      ...options,
    });
  }

  /**
   * Create error from existing error
   */
  public createFromError(
    error: Error,
    code = "WRAPPED_ERROR",
    options?: Partial<IEnhancedErrorContext>,
  ): IBaseAxonError {
    const contextOptions: Partial<IEnhancedErrorContext> = {
      severity: this.defaultSeverity,
      category: this.defaultCategory,
      ...options,
    };

    // Only add stackTrace if it exists
    if (error.stack) {
      contextOptions.stackTrace = error.stack;
    }

    const axonError = new BaseAxonError(error.message, code, contextOptions);

    return axonError.withCause(error);
  }

  /**
   * Create aggregate error
   */
  public createAggregate(message: string, errors: Array<Error | IBaseAxonError>): IAggregateError {
    return new AggregateAxonError(message, errors, "AGGREGATE_ERROR", {
      severity: this.defaultSeverity,
      category: this.defaultCategory,
    });
  }
}

/**
 * Base error handler for chain of responsibility
 */
export abstract class BaseErrorHandler implements IErrorHandler {
  protected nextHandler?: IErrorHandler;

  /**
   * Set the next handler in the chain
   */
  public setNext(handler: IErrorHandler): IErrorHandler {
    this.nextHandler = handler;
    return handler;
  }

  /**
   * Handle the error and pass to next handler
   */
  public handle(error: IBaseAxonError): void {
    this.processError(error);

    if (this.nextHandler) {
      this.nextHandler.handle(error);
    }
  }

  /**
   * Process the error (to be implemented by subclasses)
   */
  protected abstract processError(error: IBaseAxonError): void;
}
