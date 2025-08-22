/**
 * Enhanced error type definitions
 *
 * These types provide comprehensive error handling with context,
 * correlation tracking, and recovery strategies.
 */

import type { CorrelationId, Timestamp } from "../../core/index.js";
import type { AgentId } from "../../core/agent/agent.types.js";

/**
 * Error severity levels
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * Error categories
 */
export type ErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "network"
  | "database"
  | "filesystem"
  | "configuration"
  | "business"
  | "system"
  | "unknown";

/**
 * Enhanced error context
 *
 * Provides comprehensive context for debugging and tracing errors.
 */
export interface IErrorContext {
  /** Correlation ID for request tracing */
  readonly correlationId?: CorrelationId;

  /** Error occurrence timestamp */
  readonly timestamp: Timestamp;

  /** Component where error occurred */
  readonly component: string;

  /** Source module or service */
  readonly source?: string;

  /** Operation being performed */
  readonly operation?: string;

  /** Agent ID if error occurred in an agent */
  readonly agentId?: AgentId;

  /** User ID associated with the error */
  readonly userId?: string;

  /** Session ID */
  readonly sessionId?: string;

  /** Request details */
  readonly request?: IRequestContext;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request context for errors
 */
export interface IRequestContext {
  /** HTTP method */
  readonly method?: string;

  /** Request URL */
  readonly url?: string;

  /** Request headers */
  readonly headers?: Record<string, string>;

  /** Request body */
  readonly body?: unknown;

  /** Query parameters */
  readonly query?: Record<string, unknown>;

  /** Request ID */
  readonly id?: string;
}

/**
 * Enhanced error interface
 *
 * Base interface for all enhanced errors in the system.
 */
export interface IEnhancedError {
  /** Error name/type */
  readonly name: string;

  /** Error message */
  readonly message: string;

  /** Error code for programmatic handling */
  readonly code: string;

  /** Error context */
  readonly context: IErrorContext;

  /** Error severity */
  readonly severity: ErrorSeverity;

  /** Error category */
  readonly category: ErrorCategory;

  /** Whether error is recoverable */
  readonly recoverable: boolean;

  /** Whether operation can be retried */
  readonly retryable: boolean;

  /** Stack trace */
  readonly stack?: string;

  /** Caused by (for error chaining) */
  readonly causedBy?: IEnhancedError;

  /** Recovery strategy */
  readonly recovery?: IErrorRecovery;
}

/**
 * Error recovery strategy
 */
export interface IErrorRecovery {
  /** Recovery strategy type */
  readonly strategy: RecoveryStrategy;

  /** Retry configuration if retryable */
  readonly retry?: IRetryConfig;

  /** Fallback value or action */
  readonly fallback?: unknown;

  /** Compensation action */
  readonly compensation?: ICompensation;

  /** Recovery instructions for users */
  readonly instructions?: string;
}

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = "retry" | "fallback" | "compensate" | "circuit-break" | "manual" | "none";

/**
 * Retry configuration
 */
export interface IRetryConfig {
  /** Maximum retry attempts */
  readonly maxAttempts: number;

  /** Initial delay in milliseconds */
  readonly initialDelay: number;

  /** Maximum delay in milliseconds */
  readonly maxDelay: number;

  /** Backoff strategy */
  readonly backoffStrategy: BackoffStrategy;

  /** Jitter for randomization */
  readonly jitter?: boolean;
}

/**
 * Backoff strategies for retries
 */
export type BackoffStrategy = "linear" | "exponential" | "fibonacci" | "constant";

/**
 * Compensation action for error recovery
 */
export interface ICompensation {
  /** Compensation type */
  readonly type: string;

  /** Action to perform */
  readonly action: string;

  /** Parameters for compensation */
  readonly parameters?: Record<string, unknown>;

  /** Timeout for compensation */
  readonly timeout?: number;
}

/**
 * Circuit breaker state
 */
export type CircuitBreakerState = "closed" | "open" | "half-open";

/**
 * Circuit breaker configuration
 */
export interface ICircuitBreaker {
  /** Current state */
  readonly state: CircuitBreakerState;

  /** Failure threshold */
  readonly failureThreshold: number;

  /** Success threshold to close */
  readonly successThreshold: number;

  /** Timeout in open state (milliseconds) */
  readonly timeout: number;

  /** Current failure count */
  readonly failureCount: number;

  /** Current success count */
  readonly successCount: number;

  /** Last failure time */
  readonly lastFailure?: Timestamp;

  /** Next retry time */
  readonly nextRetry?: Timestamp;
}

/**
 * Error aggregation for monitoring
 */
export interface IErrorAggregation {
  /** Time window start */
  readonly startTime: Timestamp;

  /** Time window end */
  readonly endTime: Timestamp;

  /** Total error count */
  readonly totalCount: number;

  /** Count by severity */
  readonly bySeverity: Record<ErrorSeverity, number>;

  /** Count by category */
  readonly byCategory: Record<ErrorCategory, number>;

  /** Count by component */
  readonly byComponent?: Record<string, number>;

  /** Error rate */
  readonly errorRate: number;

  /** Most common errors */
  readonly topErrors?: readonly IErrorSummary[];
}

/**
 * Error summary for aggregation
 */
export interface IErrorSummary {
  /** Error code */
  readonly code: string;

  /** Error message */
  readonly message: string;

  /** Occurrence count */
  readonly count: number;

  /** First occurrence */
  readonly firstOccurrence: Timestamp;

  /** Last occurrence */
  readonly lastOccurrence: Timestamp;
}

/**
 * Error notification configuration
 */
export interface IErrorNotification {
  /** Whether notifications are enabled */
  readonly enabled: boolean;

  /** Severity threshold for notifications */
  readonly severityThreshold: ErrorSeverity;

  /** Notification channels */
  readonly channels: readonly INotificationChannel[];

  /** Rate limiting */
  readonly rateLimit?: IRateLimit;

  /** Aggregation window in seconds */
  readonly aggregationWindow?: number;
}

/**
 * Notification channel
 */
export interface INotificationChannel {
  /** Channel type */
  readonly type: NotificationChannelType;

  /** Channel configuration */
  readonly config: Record<string, unknown>;

  /** Whether channel is active */
  readonly active: boolean;
}

/**
 * Notification channel types
 */
export type NotificationChannelType = "email" | "slack" | "webhook" | "sms" | "pagerduty";

/**
 * Rate limiting configuration
 */
export interface IRateLimit {
  /** Maximum notifications per window */
  readonly maxNotifications: number;

  /** Time window in seconds */
  readonly windowSeconds: number;

  /** Current count */
  readonly currentCount?: number;

  /** Window start time */
  readonly windowStart?: Timestamp;
}
