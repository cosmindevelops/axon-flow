/**
 * Chain of responsibility pattern implementations for error handling
 */

import type {
  IEnhancedErrorHandler,
  IErrorHandlerChain,
  IHandlerResult,
  IContextEnrichmentConfig,
  IStackTraceConfig,
  ISanitizationConfig,
  ILoggingConfig,
  ILogger,
  IHandlerChainConfig,
} from "./chain.types.js";
import { HandlerPriority } from "./chain.types.js";
import type { IBaseAxonError } from "../base/base-error.types.js";
import { ErrorSeverity } from "../base/base-error.types.js";

/**
 * Base implementation of enhanced error handler
 */
export abstract class BaseEnhancedErrorHandler implements IEnhancedErrorHandler {
  public name: string;
  public priority: HandlerPriority;
  public next?: IEnhancedErrorHandler;

  constructor(name: string, priority = HandlerPriority.MEDIUM) {
    this.name = name;
    this.priority = priority;
  }

  /**
   * Set the next handler in the chain
   */
  public setNext(handler: IEnhancedErrorHandler): IEnhancedErrorHandler {
    this.next = handler;
    return handler;
  }

  /**
   * Handle the error with async support
   */
  public async handle(error: IBaseAxonError): Promise<IHandlerResult> {
    const result = await this.processError(error);

    // Continue chain if specified
    if (result.continueChain && this.next) {
      const nextError = result.modifiedError || error;
      await this.next.handle(nextError);
    }

    return result;
  }

  /**
   * Check if this handler can process the error
   */
  public abstract canHandle(error: IBaseAxonError): boolean;

  /**
   * Process the error (to be implemented by subclasses)
   */
  protected abstract processError(error: IBaseAxonError): Promise<IHandlerResult>;
}

/**
 * Context enrichment handler adds metadata to errors
 */
export class ContextEnrichmentHandler extends BaseEnhancedErrorHandler {
  private config: IContextEnrichmentConfig;
  private correlationIdGenerator?: () => string;

  constructor(config: IContextEnrichmentConfig = {}, priority = HandlerPriority.HIGH) {
    super("ContextEnrichmentHandler", priority);
    this.config = config;
  }

  /**
   * Set correlation ID generator
   */
  public setCorrelationIdGenerator(generator: () => string): void {
    this.correlationIdGenerator = generator;
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return true; // Can handle all errors
  }

  protected async processError(error: IBaseAxonError): Promise<IHandlerResult> {
    const enrichedContext = { ...error.context };

    // Add correlation ID if needed
    if (this.config.addCorrelationId && !enrichedContext.correlationId) {
      enrichedContext.correlationId = this.correlationIdGenerator ? this.correlationIdGenerator() : crypto.randomUUID();
    }

    // Add timestamp if needed
    if (this.config.addTimestamp) {
      enrichedContext.timestamp = new Date().toISOString();
    }

    // Add component/operation
    if (this.config.addComponent) {
      enrichedContext.component = this.config.addComponent;
    }
    if (this.config.addOperation) {
      enrichedContext.operation = this.config.addOperation;
    }

    // Add custom metadata
    if (this.config.customMetadata) {
      enrichedContext.metadata = {
        ...enrichedContext.metadata,
        ...this.config.customMetadata,
      };
    }

    // Create modified error with enriched context
    const modifiedError = error.withContext(enrichedContext);

    return {
      handled: true,
      continueChain: true,
      modifiedError,
    };
  }
}

/**
 * Stack trace handler for cleaning and enhancing stack traces
 */
export class StackTraceHandler extends BaseEnhancedErrorHandler {
  private config: IStackTraceConfig;

  constructor(config: IStackTraceConfig = {}, priority = HandlerPriority.MEDIUM) {
    super("StackTraceHandler", priority);
    this.config = {
      maxDepth: 10,
      includeCause: true,
      cleanPaths: true,
      ...config,
    };
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return true;
  }

  protected async processError(error: IBaseAxonError): Promise<IHandlerResult> {
    if (!error.stack) {
      return {
        handled: false,
        continueChain: true,
      };
    }

    let processedStack = error.stack;

    // Clean paths if requested
    if (this.config.cleanPaths) {
      processedStack = this.cleanStackPaths(processedStack);
    }

    // Limit stack depth
    if (this.config.maxDepth) {
      processedStack = this.limitStackDepth(processedStack, this.config.maxDepth);
    }

    // Apply filter patterns
    if (this.config.filterPatterns && this.config.filterPatterns.length > 0) {
      processedStack = this.filterStack(processedStack, this.config.filterPatterns);
    }

    // Update error context with processed stack
    const modifiedError = error.withContext({
      stackTrace: processedStack,
    });

    return {
      handled: true,
      continueChain: true,
      modifiedError,
    };
  }

  private cleanStackPaths(stack: string): string {
    // Remove absolute paths, keep only relative
    return stack.replace(/\/[^:]+\/node_modules\//g, "node_modules/").replace(/\/[^:]+\/src\//g, "src/");
  }

  private limitStackDepth(stack: string, maxDepth: number): string {
    const lines = stack.split("\n");
    return lines.slice(0, maxDepth + 1).join("\n"); // +1 for error message
  }

  private filterStack(stack: string, patterns: RegExp[]): string {
    const lines = stack.split("\n");
    return lines
      .filter((line) => {
        return !patterns.some((pattern) => pattern.test(line));
      })
      .join("\n");
  }
}

/**
 * Sanitization handler removes sensitive information
 */
export class SanitizationHandler extends BaseEnhancedErrorHandler {
  private config: ISanitizationConfig;
  private defaultSensitiveKeys = [
    "password",
    "secret",
    "token",
    "apiKey",
    "authorization",
    "cookie",
    "ssn",
    "creditCard",
  ];

  constructor(config: ISanitizationConfig = {}, priority = HandlerPriority.HIGH) {
    super("SanitizationHandler", priority);
    this.config = {
      redactValue: "[REDACTED]",
      deepScan: true,
      preserveLength: false,
      ...config,
    };
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return true;
  }

  protected async processError(error: IBaseAxonError): Promise<IHandlerResult> {
    const sensitiveKeys = [...this.defaultSensitiveKeys, ...(this.config.sensitiveKeys || [])];

    // Sanitize error message
    let sanitizedMessage = error.message;
    for (const key of sensitiveKeys) {
      const regex = new RegExp(`${key}[\\s]*[:=][\\s]*['"]?([^'",\\s]+)`, "gi");
      sanitizedMessage = sanitizedMessage.replace(regex, `${key}=${this.config.redactValue}`);
    }

    // Sanitize context metadata
    const sanitizedContext = { ...error.context };
    if (sanitizedContext.metadata && this.config.deepScan) {
      sanitizedContext.metadata = this.sanitizeObject(sanitizedContext.metadata, sensitiveKeys);
    }

    // Create new error with sanitized data
    const sanitizedError = Object.create(Object.getPrototypeOf(error));
    Object.assign(sanitizedError, error, {
      message: sanitizedMessage,
      context: sanitizedContext,
    });

    return {
      handled: true,
      continueChain: true,
      modifiedError: sanitizedError,
    };
  }

  private sanitizeObject(obj: Record<string, unknown>, sensitiveKeys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()));

      if (isSensitive) {
        result[key] =
          this.config.preserveLength && typeof value === "string"
            ? this.config.redactValue?.padEnd(value.length, "*")
            : this.config.redactValue;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>, sensitiveKeys);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

/**
 * Logging handler for error logging
 */
export class LoggingHandler extends BaseEnhancedErrorHandler {
  private config: ILoggingConfig;
  private defaultLogger: ILogger = {
    error: (msg, ctx) => console.error(msg, ctx),
    warn: (msg, ctx) => console.warn(msg, ctx),
    info: (msg, ctx) => console.info(msg, ctx),
    debug: (msg, ctx) => console.log(msg, ctx), // Use console.log instead of console.debug
  };

  constructor(config: ILoggingConfig = {}, priority = HandlerPriority.LOW) {
    super("LoggingHandler", priority);
    this.config = {
      logLevel: "error",
      includeStack: true,
      includeContext: true,
      logger: this.defaultLogger,
      ...config,
    };
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return true;
  }

  protected async processError(error: IBaseAxonError): Promise<IHandlerResult> {
    const logger = this.config.logger || this.defaultLogger;
    const logContext: Record<string, unknown> = {
      code: error.code,
      severity: error.severity,
      category: error.category,
    };

    if (this.config.includeContext) {
      logContext["context"] = error.context;
    }

    if (this.config.includeStack && error.stack) {
      logContext["stack"] = error.stack;
    }

    // Log based on severity
    const logMethod = this.getLogMethod(error.severity);
    logger[logMethod](error.toString(), logContext);

    return {
      handled: true,
      continueChain: true,
    };
  }

  private getLogMethod(severity: ErrorSeverity): keyof ILogger {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        return "error";
      case ErrorSeverity.WARNING:
        return "warn";
      case ErrorSeverity.INFO:
        return "info";
      default:
        return "error";
    }
  }
}

/**
 * Error handler chain manager
 */
export class ErrorHandlerChain implements IErrorHandlerChain {
  private handlers: IEnhancedErrorHandler[] = [];
  private config: IHandlerChainConfig;

  constructor(config: IHandlerChainConfig = {}) {
    this.config = {
      sortByPriority: true,
      stopOnFirstHandle: false,
      timeout: 5000,
      ...config,
    };

    if (config.handlers) {
      config.handlers.forEach((handler) => this.addHandler(handler));
    }
  }

  /**
   * Add handler to the chain
   */
  public addHandler(handler: IEnhancedErrorHandler): IErrorHandlerChain {
    this.handlers.push(handler);

    if (this.config.sortByPriority) {
      this.sortHandlers();
    }

    this.linkHandlers();
    return this;
  }

  /**
   * Remove handler from the chain
   */
  public removeHandler(name: string): boolean {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter((h) => h.name !== name);

    if (this.handlers.length < initialLength) {
      this.linkHandlers();
      return true;
    }

    return false;
  }

  /**
   * Process error through the chain
   */
  public async process(error: IBaseAxonError): Promise<void> {
    if (this.handlers.length === 0) {
      return;
    }

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Handler chain timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    const processPromise = this.processWithHandlers(error);

    try {
      await Promise.race([processPromise, timeoutPromise]);
    } catch (err) {
      console.error("Error processing handler chain:", err);
      throw err;
    }
  }

  /**
   * Clear all handlers
   */
  public clear(): void {
    this.handlers = [];
  }

  /**
   * Get readonly array of handlers
   */
  public getHandlers(): ReadonlyArray<IEnhancedErrorHandler> {
    return Object.freeze([...this.handlers]);
  }

  private async processWithHandlers(error: IBaseAxonError): Promise<void> {
    let currentError = error;

    for (const handler of this.handlers) {
      if (!handler.canHandle(currentError)) {
        continue;
      }

      const result = await handler.handle(currentError);

      if (result.modifiedError) {
        currentError = result.modifiedError;
      }

      if (this.config.stopOnFirstHandle && result.handled) {
        break;
      }

      if (!result.continueChain) {
        break;
      }
    }
  }

  private sortHandlers(): void {
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  private linkHandlers(): void {
    for (let i = 0; i < this.handlers.length - 1; i++) {
      this.handlers[i]?.setNext(this.handlers[i + 1]!);
    }
  }
}
