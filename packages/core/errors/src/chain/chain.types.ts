/**
 * Chain of responsibility pattern types for error handling
 */

import type {
  IBaseAxonError,
  IEnhancedErrorContext as _IEnhancedErrorContext,
  ErrorSeverity,
} from "../base/base-error.types.js";
import type { CorrelationId as _CorrelationId } from "@axon/types";

/**
 * Handler priority levels
 */
export enum HandlerPriority {
  CRITICAL = 0, // Highest priority, runs first
  HIGH = 10,
  MEDIUM = 20,
  LOW = 30,
  LOWEST = 40,
}

/**
 * Handler processing result
 */
export interface IHandlerResult {
  handled: boolean;
  continueChain: boolean;
  modifiedError?: IBaseAxonError;
}

/**
 * Enhanced error handler with priority and async support
 */
export interface IEnhancedErrorHandler {
  name: string;
  priority: HandlerPriority;
  next?: IEnhancedErrorHandler;

  setNext(handler: IEnhancedErrorHandler): IEnhancedErrorHandler;
  handle(error: IBaseAxonError): Promise<IHandlerResult>;
  canHandle(error: IBaseAxonError): boolean;
}

/**
 * Error handler chain manager
 */
export interface IErrorHandlerChain {
  addHandler(handler: IEnhancedErrorHandler): IErrorHandlerChain;
  removeHandler(name: string): boolean;
  process(error: IBaseAxonError): Promise<void>;
  clear(): void;
  getHandlers(): ReadonlyArray<IEnhancedErrorHandler>;
}

/**
 * Context enrichment handler configuration
 */
export interface IContextEnrichmentConfig {
  addCorrelationId?: boolean;
  addTimestamp?: boolean;
  addEnvironment?: boolean;
  addComponent?: string;
  addOperation?: string;
  customMetadata?: Record<string, unknown>;
}

/**
 * Stack trace handler configuration
 */
export interface IStackTraceConfig {
  maxDepth?: number;
  includeCause?: boolean;
  cleanPaths?: boolean;
  filterPatterns?: RegExp[];
}

/**
 * Sanitization handler configuration
 */
export interface ISanitizationConfig {
  sensitiveKeys?: string[];
  redactValue?: string;
  deepScan?: boolean;
  preserveLength?: boolean;
}

/**
 * Logging handler configuration
 */
export interface ILoggingConfig {
  logLevel?: "error" | "warn" | "info" | "debug";
  includeStack?: boolean;
  includeContext?: boolean;
  logger?: ILogger;
}

/**
 * Logger interface for logging handler
 */
export interface ILogger {
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/**
 * Circuit breaker handler configuration
 */
export interface ICircuitBreakerConfig {
  threshold?: number;
  timeout?: number;
  resetTimeout?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open",
}

/**
 * Retry handler configuration
 */
export interface IRetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoff?: "linear" | "exponential";
  shouldRetry?: (error: IBaseAxonError) => boolean;
}

/**
 * Notification handler configuration
 */
export interface INotificationConfig {
  channels?: NotificationChannel[];
  severityThreshold?: ErrorSeverity;
  throttle?: number;
  notifier?: INotifier;
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = "email",
  SLACK = "slack",
  WEBHOOK = "webhook",
  SMS = "sms",
  CONSOLE = "console",
}

/**
 * Notifier interface
 */
export interface INotifier {
  notify(channel: NotificationChannel, error: IBaseAxonError): Promise<void>;
}

/**
 * Metrics handler configuration
 */
export interface IMetricsConfig {
  collector?: IMetricsCollector;
  includeStackTrace?: boolean;
  sampleRate?: number;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  recordError(error: IBaseAxonError): void;
  incrementCounter(name: string, tags?: Record<string, string>): void;
  recordTiming(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Handler chain configuration
 */
export interface IHandlerChainConfig {
  handlers?: IEnhancedErrorHandler[];
  sortByPriority?: boolean;
  stopOnFirstHandle?: boolean;
  timeout?: number;
}

/**
 * Handler statistics
 */
export interface IHandlerStats {
  name: string;
  processedCount: number;
  errorCount: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
  lastError?: Error;
}
