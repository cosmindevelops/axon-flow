/**
 * Circuit breaker implementation for resilient logging
 */

import type { ICircuitBreaker, ICircuitBreakerConfig, CircuitBreakerState } from "../types/index.js";
import type { CircuitState, ICircuitBreakerMetrics } from "./circuit-breaker.types.js";

/**
 * Enhanced circuit breaker implementation with transport integration
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
  private readonly name: string;
  private stateChangeCallbacks: Array<(state: CircuitBreakerState) => void> = [];

  constructor(config: ICircuitBreakerConfig, name: string = "default") {
    this.config = {
      enabled: config.enabled ?? true,
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeoutMs: config.resetTimeoutMs ?? 60000,
      monitorTimeWindowMs: config.monitorTimeWindowMs ?? 300000,
    };
    this.name = name;
  }

  get state(): CircuitBreakerState {
    return this._state;
  }

  getState(): CircuitState {
    return this._state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    this.totalCalls++;

    // Check if circuit is open
    if (this._state === "open") {
      if (this.nextAttempt && new Date() < this.nextAttempt) {
        throw new Error("Circuit breaker is open");
      }
      // Move to half-open state
      this._state = "half-open";
      this.notifyStateChange(this._state);
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
    const oldState = this._state;

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

    // Notify if state changed
    if (oldState !== this._state) {
      this.notifyStateChange(this._state);
    }
  }

  reset(): void {
    const oldState = this._state;
    this._state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = undefined;

    // Notify if state changed
    if (oldState !== this._state) {
      this.notifyStateChange(this._state);
    }
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

  // Keep the enhanced metrics for internal use
  getDetailedMetrics(): ICircuitBreakerMetrics {
    const metrics: ICircuitBreakerMetrics = {
      state: this._state,
      failureCount: this.failures,
      successCount: this.successes,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      nextRetryTime: this._state === "open" && this.nextAttempt ? this.nextAttempt.getTime() : undefined,
    };

    if (this.lastFailureTime) {
      metrics.lastFailureTime = this.lastFailureTime;
    }

    if (this.lastSuccessTime) {
      metrics.lastSuccessTime = this.lastSuccessTime;
    }

    return metrics;
  }

  /**
   * Get the circuit breaker name for identification
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the current failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Get the current success count
   */
  getSuccessCount(): number {
    return this.successes;
  }

  /**
   * Get the last failure time
   */
  getLastFailureTime(): Date | null {
    return this.lastFailureTime || null;
  }

  /**
   * Register a callback for state changes
   */
  onStateChange(callback: (state: CircuitState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Remove a state change callback
   */
  removeStateChangeListener(callback: (state: CircuitState) => void): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all registered callbacks of state changes
   */
  private notifyStateChange(newState: CircuitState): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(newState);
      } catch (error) {
        // Ignore callback errors to prevent circuit breaker disruption
        console.warn("Circuit breaker state change callback error:", error);
      }
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    // Use resetTimeoutMs as operation timeout fallback if needed
    const operationTimeout = this.config.resetTimeoutMs;
    if (operationTimeout <= 0) {
      return operation();
    }

    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          reject(new Error("Circuit breaker timeout"));
        }, operationTimeout),
      ),
    ]);
  }
}

/**
 * Transport-specific circuit breaker factory
 */
export class TransportCircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  static create(transportName: string, config: ICircuitBreakerConfig): CircuitBreaker {
    const key = `transport:${transportName}`;

    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(config, transportName));
    }

    return this.breakers.get(key)!;
  }

  static get(transportName: string): CircuitBreaker | undefined {
    const key = `transport:${transportName}`;
    return this.breakers.get(key);
  }

  static reset(transportName: string): void {
    const key = `transport:${transportName}`;
    const breaker = this.breakers.get(key);
    if (breaker) {
      breaker.reset();
    }
  }

  static resetAll(): void {
    for (const breaker of Array.from(this.breakers.values())) {
      breaker.reset();
    }
  }

  static getAllMetrics(): Record<string, ICircuitBreakerMetrics> {
    const metrics: Record<string, ICircuitBreakerMetrics> = {};

    for (const [key, breaker] of Array.from(this.breakers.entries())) {
      metrics[key] = breaker.getDetailedMetrics();
    }

    return metrics;
  }

  static clear(): void {
    this.breakers.clear();
  }
}

/**
 * Circuit breaker with retry logic for transport operations
 */
export class RetryableCircuitBreaker extends CircuitBreaker {
  constructor(
    config: ICircuitBreakerConfig,
    name: string = "retryable-default",
    private readonly maxRetries: number = 3,
    private readonly retryDelay: number = 1000,
  ) {
    super(config, name);
  }

  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.execute(operation);
      } catch (error) {
        lastError = error as Error;

        // Don't retry if circuit is open
        if (this.getState() === "open") {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          throw error;
        }

        // Wait before retrying
        await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    throw lastError || new Error("Operation failed after retries");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

// Transport-specific utility functions

/**
 * Create a circuit breaker configured for transport operations
 */
export function createTransportCircuitBreaker(config: Partial<ICircuitBreakerConfig>, name: string): CircuitBreaker {
  const transportConfig: ICircuitBreakerConfig = {
    enabled: true,
    failureThreshold: 3, // More sensitive for transport failures
    resetTimeoutMs: 30000, // 30 second cooldown
    monitorTimeWindowMs: 300000, // 5 minute monitoring window
    ...config,
  };

  return new CircuitBreaker(transportConfig, name);
}

/**
 * Check if a circuit breaker is in open state
 */
export function isCircuitBreakerOpen(circuitBreaker: CircuitBreaker): boolean {
  return circuitBreaker.getState() === "open";
}

/**
 * Get comprehensive circuit breaker metrics
 */
export function getCircuitBreakerMetrics(circuitBreaker: CircuitBreaker): ICircuitBreakerMetrics {
  return circuitBreaker.getDetailedMetrics();
}

/**
 * Reset a circuit breaker to its initial state
 */
export function resetCircuitBreaker(circuitBreaker: CircuitBreaker): void {
  circuitBreaker.reset();
}

/**
 * Create a retryable circuit breaker for transport operations with sensible defaults
 */
export function createRetryableTransportCircuitBreaker(
  config: Partial<ICircuitBreakerConfig>,
  name: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): RetryableCircuitBreaker {
  const transportConfig: ICircuitBreakerConfig = {
    enabled: true,
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    monitorTimeWindowMs: 300000,
    ...config,
  };

  return new RetryableCircuitBreaker(transportConfig, name, maxRetries, retryDelay);
}

/**
 * Check if a circuit breaker is healthy (closed or half-open)
 */
export function isCircuitBreakerHealthy(circuitBreaker: CircuitBreaker): boolean {
  const state = circuitBreaker.getState();
  return state === "closed" || state === "half-open";
}

/**
 * Get circuit breaker health status with additional context
 */
export function getCircuitBreakerHealth(circuitBreaker: CircuitBreaker): {
  isHealthy: boolean;
  state: CircuitState;
  failureRate: number;
  timeSinceLastFailure?: number;
} {
  const basicMetrics = circuitBreaker.getMetrics();
  const detailedMetrics = circuitBreaker.getDetailedMetrics();
  const totalCalls = basicMetrics.failureCount + basicMetrics.successCount;
  const failureRate = totalCalls > 0 ? (basicMetrics.failureCount / totalCalls) * 100 : 0;

  const result: {
    isHealthy: boolean;
    state: CircuitState;
    failureRate: number;
    timeSinceLastFailure?: number;
  } = {
    isHealthy: isCircuitBreakerHealthy(circuitBreaker),
    state: basicMetrics.state,
    failureRate,
  };

  if (detailedMetrics.lastFailureTime) {
    result.timeSinceLastFailure = Date.now() - detailedMetrics.lastFailureTime.getTime();
  }

  return result;
}
