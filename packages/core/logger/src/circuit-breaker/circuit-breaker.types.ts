/**
 * Circuit breaker types and interfaces
 */

/**
 * Circuit breaker states
 */
export type CircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker interface
 */
export interface ICircuitBreaker {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  reset(): void;
  getMetrics(): ICircuitBreakerMetrics;
}

/**
 * Circuit breaker configuration
 */
export interface ICircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeoutMs: number;
  monitorTimeWindowMs: number;
}

/**
 * Circuit breaker metrics
 */
export interface ICircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  failures: number;
  successes: number;
  totalCalls: number;
  nextRetryTime: number | undefined;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}
