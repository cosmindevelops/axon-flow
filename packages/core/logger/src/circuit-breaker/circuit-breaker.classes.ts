/**
 * Circuit breaker implementation for resilient logging
 */

import type { ICircuitBreaker, ICircuitBreakerConfig, CircuitBreakerState } from "../types/index.js";

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker implements ICircuitBreaker {
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private lastFailureTime?: Date | undefined;
  private lastSuccessTime?: Date | undefined;
  private nextAttempt?: Date | undefined;
  private readonly config: ICircuitBreakerConfig;
  private _state: CircuitBreakerState = "closed";

  constructor(config: ICircuitBreakerConfig) {
    this.config = config;
  }

  get state(): CircuitBreakerState {
    return this._state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open
    if (this._state === "open") {
      if (this.nextAttempt && new Date() < this.nextAttempt) {
        throw new Error("Circuit breaker is open");
      }
      // Move to half-open state
      this._state = "half-open";
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this._state === "half-open") {
      // Reset after successful call in half-open state
      this.reset();
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this._state === "half-open") {
      // Move back to open state
      this._state = "open";
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeoutMs);
    } else if (this._state === "closed") {
      // Check if we should open the circuit
      if (this.failures >= this.config.failureThreshold) {
        this._state = "open";
        this.nextAttempt = new Date(Date.now() + this.config.resetTimeoutMs);
      }
    }
  }

  reset(): void {
    this._state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = undefined;
  }

  getMetrics(): {
    failureCount: number;
    successCount: number;
    state: CircuitBreakerState;
    nextRetryTime: number | undefined;
  } {
    return {
      failureCount: this.failures,
      successCount: this.successes,
      state: this._state,
      nextRetryTime: this.nextAttempt?.getTime(),
    };
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    // Use resetTimeoutMs as the operation timeout
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          reject(new Error("Circuit breaker timeout"));
        }, this.config.resetTimeoutMs),
      ),
    ]);
  }
}

// Global circuit breaker instance
let globalCircuitBreaker: CircuitBreaker | undefined;

/**
 * Initialize the global circuit breaker
 */
export function initializeCircuitBreaker(config: ICircuitBreakerConfig): void {
  globalCircuitBreaker = new CircuitBreaker(config);
}

/**
 * Execute a function with circuit breaker protection
 */
export async function executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  if (!globalCircuitBreaker) {
    // If no circuit breaker configured, execute directly
    return fn();
  }
  return globalCircuitBreaker.execute(fn);
}

/**
 * Get the global circuit breaker instance
 */
export function getCircuitBreaker(): CircuitBreaker | undefined {
  return globalCircuitBreaker;
}

/**
 * Clear the global circuit breaker instance (for testing)
 */
export function clearCircuitBreaker(): void {
  globalCircuitBreaker = undefined;
}
