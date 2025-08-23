/**
 * Recovery mechanism type definitions for error handling
 */

import type { IBaseAxonError, IEnhancedErrorContext } from "../base/base-error.types.js";
import type { IHandlerResult, HandlerPriority } from "../chain/chain.types.js";

/**
 * Backoff strategy types for retry mechanisms
 */
export enum BackoffStrategy {
  LINEAR = "linear", // Fixed delay between retries
  EXPONENTIAL = "exponential", // Exponentially increasing delay
  FIBONACCI = "fibonacci", // Fibonacci sequence delays
  CUSTOM = "custom", // Custom function-based delay
}

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  RETRY = "retry", // Retry the operation
  CIRCUIT_BREAKER = "circuit_breaker", // Open circuit after failures
  GRACEFUL_DEGRADATION = "graceful_degradation", // Provide fallback
  TIMEOUT = "timeout", // Apply timeout limits
  BULKHEAD = "bulkhead", // Resource isolation
}

/**
 * Recovery mechanism state
 */
export enum RecoveryState {
  IDLE = "idle", // Not currently recovering
  RECOVERING = "recovering", // Recovery in progress
  RECOVERED = "recovered", // Recovery successful
  FAILED = "failed", // Recovery failed
  EXHAUSTED = "exhausted", // All recovery attempts exhausted
}

/**
 * Retry configuration interface
 */
export interface IRetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay between retries in milliseconds */
  initialDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay?: number;
  /** Backoff strategy for retry delays */
  backoffStrategy: BackoffStrategy;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Jitter factor to randomize delays (0-1) */
  jitter?: number;
  /** Custom delay function for CUSTOM strategy */
  customDelayFunction?: (attempt: number, error: IBaseAxonError) => number;
  /** Function to determine if error should be retried */
  shouldRetry?: (error: IBaseAxonError, attempt: number) => boolean;
  /** Timeout for each individual retry attempt */
  attemptTimeout?: number;
  /** Include original error in retry attempts */
  includeOriginalError?: boolean;
}

/**
 * Circuit breaker configuration interface
 */
export interface ICircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time window for counting failures (ms) */
  failureWindow?: number;
  /** Time to wait before attempting to close circuit (ms) */
  resetTimeout: number;
  /** Minimum number of requests before evaluating success rate */
  minimumRequests?: number;
  /** Success rate threshold to close circuit (0-1) */
  successThreshold?: number;
  /** Function called when circuit opens */
  onOpen?: (error: IBaseAxonError) => void;
  /** Function called when circuit closes */
  onClose?: () => void;
  /** Function called when circuit is half-open */
  onHalfOpen?: () => void;
  /** Custom error to throw when circuit is open */
  openCircuitError?: () => IBaseAxonError;
  /** Monitor only specific error types */
  monitoredErrorTypes?: string[];
}

/**
 * Graceful degradation configuration interface
 */
export interface IGracefulDegradationConfig {
  /** Primary fallback function */
  fallbackFunction?: (error: IBaseAxonError, context?: IRecoveryContext) => Promise<unknown> | unknown;
  /** Cascade of fallback strategies */
  fallbackChain?: Array<{
    condition: (error: IBaseAxonError) => boolean;
    fallback: (error: IBaseAxonError, context?: IRecoveryContext) => Promise<unknown> | unknown;
    name?: string;
  }>;
  /** Default value to return if all fallbacks fail */
  defaultValue?: unknown;
  /** Whether to log fallback usage */
  logFallbackUsage?: boolean;
  /** Custom degradation strategies by error type */
  degradationStrategies?: Record<string, (error: IBaseAxonError) => Promise<unknown> | unknown>;
  /** Performance budget for fallback execution */
  fallbackTimeout?: number;
  /** Fallback quality indicators */
  qualityMetrics?: {
    accuracyThreshold?: number;
    performanceThreshold?: number;
    reliabilityThreshold?: number;
  };
}

/**
 * Timeout configuration interface
 */
export interface ITimeoutConfig {
  /** Operation timeout in milliseconds */
  timeout: number;
  /** Warning threshold (percentage of timeout) */
  warningThreshold?: number;
  /** Grace period for cleanup operations */
  gracePeriod?: number;
  /** Custom timeout error factory */
  timeoutErrorFactory?: (timeout: number, operation?: string) => IBaseAxonError;
  /** Function called when timeout warning is reached */
  onWarning?: (elapsed: number, timeout: number) => void;
  /** Function called when timeout occurs */
  onTimeout?: (elapsed: number, operation?: string) => void;
  /** Whether to allow operations to complete during grace period */
  allowGracefulCompletion?: boolean;
}

/**
 * Bulkhead configuration interface for resource isolation
 */
export interface IBulkheadConfig {
  /** Maximum concurrent operations allowed */
  maxConcurrent: number;
  /** Maximum queue size for waiting operations */
  maxQueue?: number;
  /** Timeout for operations waiting in queue */
  queueTimeout?: number;
  /** Resource isolation key function */
  isolationKey?: (context: IRecoveryContext) => string;
  /** Custom error for resource exhaustion */
  exhaustionError?: () => IBaseAxonError;
  /** Metrics collection for resource usage */
  enableMetrics?: boolean;
}

/**
 * Recovery context interface
 */
export interface IRecoveryContext extends IEnhancedErrorContext {
  /** Recovery attempt number (starts at 1) */
  attemptNumber: number;
  /** Total recovery attempts made so far */
  totalAttempts: number;
  /** Recovery strategies attempted */
  strategiesAttempted: RecoveryStrategy[];
  /** Current recovery state */
  recoveryState: RecoveryState;
  /** Recovery start timestamp */
  recoveryStartedAt: Date;
  /** Last recovery attempt timestamp */
  lastAttemptAt?: Date;
  /** Recovery success timestamp */
  recoveryCompletedAt?: Date;
  /** Recovery metrics */
  metrics?: IRecoveryMetrics;
  /** Custom recovery context data */
  recoveryData?: Record<string, unknown>;
  /** Original operation context */
  originalContext?: IEnhancedErrorContext;
}

/**
 * Recovery metrics interface
 */
export interface IRecoveryMetrics {
  /** Total recovery attempts across all strategies */
  totalAttempts: number;
  /** Successful recovery attempts */
  successfulAttempts: number;
  /** Failed recovery attempts */
  failedAttempts: number;
  /** Recovery attempts by strategy */
  attemptsByStrategy: Record<RecoveryStrategy, number>;
  /** Success rate by strategy */
  successRateByStrategy: Record<RecoveryStrategy, number>;
  /** Average recovery time (ms) */
  averageRecoveryTime: number;
  /** Total recovery time (ms) */
  totalRecoveryTime: number;
  /** Recovery time by strategy */
  recoveryTimeByStrategy: Record<RecoveryStrategy, number>;
  /** Circuit breaker states over time */
  circuitBreakerHistory?: Array<{
    state: "open" | "closed" | "half-open";
    timestamp: Date;
    triggerError?: string;
  }>;
  /** Resource utilization metrics */
  resourceUtilization?: {
    averageConcurrency: number;
    peakConcurrency: number;
    queueLength: number;
    rejectedRequests: number;
  };
}

/**
 * Recovery result interface
 */
export interface IRecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Recovery strategy used */
  strategy: RecoveryStrategy;
  /** Number of attempts made */
  attempts: number;
  /** Total time taken for recovery */
  duration: number;
  /** Recovered result value */
  result?: unknown;
  /** Recovery error if failed */
  error?: IBaseAxonError;
  /** Recovery context */
  context: IRecoveryContext;
  /** Recovery metrics */
  metrics: IRecoveryMetrics;
}

/**
 * Recovery handler interface
 */
export interface IRecoveryHandler {
  /** Handler name */
  name: string;
  /** Handler priority */
  priority: HandlerPriority;
  /** Recovery strategy */
  strategy: RecoveryStrategy;
  /** Next handler in chain */
  next?: IRecoveryHandler;

  /** Set next handler */
  setNext(handler: IRecoveryHandler): IRecoveryHandler;
  /** Check if handler can handle this type of error */
  canHandle(error: IBaseAxonError): boolean;
  /** Check if handler can recover from error */
  canRecover(error: IBaseAxonError, context?: IRecoveryContext): boolean;
  /** Attempt recovery */
  recover(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult>;
  /** Handle recovery result */
  handleRecoveryResult(result: IRecoveryResult): Promise<IHandlerResult>;
}

/**
 * Recoverable operation interface
 */
export interface IRecoverableOperation<T = unknown> {
  /** Operation identifier */
  id: string;
  /** Operation name */
  name: string;
  /** Operation function */
  operation: (context?: IRecoveryContext) => Promise<T> | T;
  /** Recovery configuration */
  recoveryConfig?: IOperationRecoveryConfig;
  /** Operation timeout */
  timeout?: number;
  /** Maximum total recovery time */
  maxRecoveryTime?: number;
  /** Operation metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Operation recovery configuration
 */
export interface IOperationRecoveryConfig {
  /** Retry configuration */
  retry?: IRetryConfig;
  /** Circuit breaker configuration */
  circuitBreaker?: ICircuitBreakerConfig;
  /** Graceful degradation configuration */
  gracefulDegradation?: IGracefulDegradationConfig;
  /** Timeout configuration */
  timeout?: ITimeoutConfig;
  /** Bulkhead configuration */
  bulkhead?: IBulkheadConfig;
  /** Recovery strategies to apply in order */
  strategies?: RecoveryStrategy[];
  /** Global recovery settings */
  global?: {
    /** Maximum total recovery time across all strategies */
    maxTotalRecoveryTime?: number;
    /** Stop on first successful recovery */
    stopOnFirstSuccess?: boolean;
    /** Enable recovery metrics collection */
    enableMetrics?: boolean;
  };
}

/**
 * Recovery manager interface
 */
export interface IRecoveryManager {
  /** Register a recovery handler */
  registerHandler(handler: IRecoveryHandler): void;
  /** Unregister a recovery handler */
  unregisterHandler(name: string): boolean;
  /** Execute operation with recovery */
  executeWithRecovery<T>(operation: IRecoverableOperation<T>): Promise<T>;
  /** Attempt recovery from error */
  attemptRecovery(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult>;
  /** Get recovery metrics */
  getMetrics(): IRecoveryMetrics;
  /** Clear recovery metrics */
  clearMetrics(): void;
  /** Get registered handlers */
  getHandlers(): ReadonlyArray<IRecoveryHandler>;
}

/**
 * Recovery manager configuration
 */
export interface IRecoveryManagerConfig {
  /** Retry configuration for the manager's retry handler */
  retryConfig?: IRetryConfig;
  /** Circuit breaker configuration for the manager's circuit breaker handler */
  circuitBreakerConfig?: ICircuitBreakerConfig;
  /** Graceful degradation configuration for the manager's degradation handler */
  gracefulDegradationConfig?: IGracefulDegradationConfig;
  /** Timeout configuration for the manager's timeout handler */
  timeoutConfig?: ITimeoutConfig;
  /** Bulkhead configuration for the manager's bulkhead handler */
  bulkheadConfig?: IBulkheadConfig;
}

/**
 * Recovery decorator configuration
 */
export interface IRecoveryDecoratorConfig {
  /** Target method recovery configuration */
  recovery: IOperationRecoveryConfig;
  /** Whether to preserve original method metadata */
  preserveMetadata?: boolean;
  /** Custom error transformation */
  errorTransformer?: (error: Error) => IBaseAxonError;
  /** Custom context provider */
  contextProvider?: () => Partial<IRecoveryContext>;
}
