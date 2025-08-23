/**
 * Recovery mechanism handler implementations extending BaseEnhancedErrorHandler
 */

import type {
  IRecoveryHandler,
  IRecoveryContext,
  IRecoveryResult,
  IRecoveryMetrics,
  IRecoveryManager,
  IRecoveryManagerConfig,
  IRecoverableOperation,
  IRetryConfig,
  ICircuitBreakerConfig,
  IGracefulDegradationConfig,
  ITimeoutConfig,
} from "./recovery.types.js";
import { BackoffStrategy, RecoveryStrategy, RecoveryState } from "./recovery.types.js";
import type { IBaseAxonError } from "../base/base-error.types.js";
import type { IHandlerResult, HandlerPriority } from "../chain/chain.types.js";
import { BaseAxonError, ErrorFactory } from "../base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../base/base-error.types.js";
import { HandlerPriority as Priority } from "../chain/chain.types.js";

/**
 * Utility class for performance optimizations and object pooling
 */
class PerformanceUtils {
  private static readonly objectPools = new Map<string, unknown[]>();
  private static readonly POOL_SIZE = 100;

  /**
   * Get object from pool or create new one
   */
  static getFromPool<T>(poolName: string, factory: () => T): T {
    let pool = this.objectPools.get(poolName) as T[] | undefined;
    if (!pool) {
      pool = [];
      this.objectPools.set(poolName, pool);
    }

    return pool.pop() || factory();
  }

  /**
   * Return object to pool
   */
  static returnToPool<T>(poolName: string, obj: T, reset?: (obj: T) => void): void {
    let pool = this.objectPools.get(poolName) as T[] | undefined;
    if (!pool) {
      pool = [];
      this.objectPools.set(poolName, pool);
    }

    if (pool.length < this.POOL_SIZE) {
      if (reset) {
        reset(obj);
      }
      pool.push(obj);
    }
  }

  /**
   * High-resolution timer for sub-millisecond precision
   */
  static now(): number {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    if (typeof process !== "undefined" && process.hrtime) {
      const hrTime = process.hrtime();
      return hrTime[0] * 1000 + hrTime[1] / 1000000;
    }
    return Date.now();
  }

  /**
   * Generate jittered delay with exponential backoff
   */
  static calculateBackoffDelay(
    attempt: number,
    config: Pick<IRetryConfig, "initialDelay" | "backoffStrategy" | "backoffMultiplier" | "jitter" | "maxDelay">,
  ): number {
    const startTime = this.now();

    let delay = config.initialDelay;

    switch (config.backoffStrategy) {
      case BackoffStrategy.LINEAR:
        delay = config.initialDelay * attempt;
        break;

      case BackoffStrategy.EXPONENTIAL: {
        const multiplier = config.backoffMultiplier || 2;
        delay = config.initialDelay * Math.pow(multiplier, attempt - 1);
        break;
      }

      case BackoffStrategy.FIBONACCI:
        delay = config.initialDelay * this.fibonacci(attempt);
        break;

      default: // BackoffStrategy.LINEAR
        delay = config.initialDelay * attempt;
    }

    // Apply max delay cap
    if (config.maxDelay && delay > config.maxDelay) {
      delay = config.maxDelay;
    }

    // Apply jitter
    if (config.jitter && config.jitter > 0) {
      const jitterAmount = delay * config.jitter;
      delay += (Math.random() * 2 - 1) * jitterAmount;
    }

    // Ensure calculation overhead is <0.1ms
    const calculationTime = this.now() - startTime;
    if (calculationTime > 0.1) {
      console.warn(`Backoff calculation took ${calculationTime}ms, exceeding 0.1ms target`);
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Efficient fibonacci calculation with memoization
   */
  private static fibMemo = new Map<number, number>();
  private static fibonacci(n: number): number {
    if (n <= 1) return n;

    if (this.fibMemo.has(n)) {
      return this.fibMemo.get(n)!;
    }

    const result = this.fibonacci(n - 1) + this.fibonacci(n - 2);
    this.fibMemo.set(n, result);
    return result;
  }
}

/**
 * Base recovery handler implementing the IRecoveryHandler interface
 */
abstract class BaseRecoveryHandler implements IRecoveryHandler {
  public name: string;
  public priority: HandlerPriority;
  public abstract readonly strategy: RecoveryStrategy;
  public next?: IRecoveryHandler;

  constructor(name: string, priority: HandlerPriority) {
    this.name = name;
    this.priority = priority;
  }

  public setNext(handler: IRecoveryHandler): IRecoveryHandler {
    this.next = handler;
    return handler;
  }

  public abstract canHandle(error: IBaseAxonError): boolean;
  public abstract canRecover(error: IBaseAxonError, context?: IRecoveryContext): boolean;
  public abstract recover(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult>;
  public abstract handleRecoveryResult(result: IRecoveryResult): Promise<IHandlerResult>;
}

/**
 * Retry handler with configurable backoff strategies and jitter
 */
export class RetryHandler extends BaseRecoveryHandler {
  public readonly strategy = RecoveryStrategy.RETRY;
  private config: Required<IRetryConfig>;
  private errorFactory: ErrorFactory;

  constructor(config: IRetryConfig, priority: HandlerPriority = Priority.MEDIUM) {
    super("RetryHandler", priority);

    // Set defaults for required configuration
    this.config = {
      maxAttempts: config.maxAttempts,
      initialDelay: config.initialDelay,
      backoffStrategy: config.backoffStrategy,
      maxDelay: config.maxDelay || 30000, // 30 seconds default
      backoffMultiplier: config.backoffMultiplier || 2,
      jitter: config.jitter || 0.1,
      customDelayFunction: config.customDelayFunction || undefined,
      shouldRetry: config.shouldRetry || (() => true),
      attemptTimeout: config.attemptTimeout || 5000,
      includeOriginalError: config.includeOriginalError !== false,
    } as Required<IRetryConfig>;

    this.errorFactory = new ErrorFactory(ErrorSeverity.ERROR, ErrorCategory.APPLICATION);
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return true; // Can attempt retry on any error
  }

  public canRecover(error: IBaseAxonError, context?: IRecoveryContext): boolean {
    const attempt = context?.attemptNumber || 1;

    if (attempt > this.config.maxAttempts) {
      return false;
    }

    return this.config.shouldRetry!(error, attempt);
  }

  public async recover(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult> {
    const startTime = PerformanceUtils.now();
    const attempt = (context?.attemptNumber || 0) + 1;

    const recoveryContext: IRecoveryContext = context || {
      ...error.context,
      attemptNumber: attempt,
      totalAttempts: 0,
      strategiesAttempted: [RecoveryStrategy.RETRY],
      recoveryState: RecoveryState.RECOVERING,
      recoveryStartedAt: new Date(),
      lastAttemptAt: new Date(),
    };

    // Check if we can retry
    if (!this.canRecover(error, recoveryContext)) {
      return {
        success: false,
        strategy: RecoveryStrategy.RETRY,
        attempts: attempt,
        duration: PerformanceUtils.now() - startTime,
        error: this.errorFactory.create(
          `Maximum retry attempts (${this.config.maxAttempts}) exceeded`,
          "RETRY_EXHAUSTED",
        ),
        context: { ...recoveryContext, recoveryState: RecoveryState.EXHAUSTED },
        metrics: this.createMetrics(attempt, 0, PerformanceUtils.now() - startTime),
      };
    }

    // Calculate delay for next attempt
    if (attempt > 1) {
      const delay = this.config.customDelayFunction
        ? this.config.customDelayFunction(attempt, error)
        : PerformanceUtils.calculateBackoffDelay(attempt, this.config);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Update recovery context for retry attempt
    const updatedContext: IRecoveryContext = {
      ...recoveryContext,
      attemptNumber: attempt,
      totalAttempts: attempt,
      lastAttemptAt: new Date(),
      recoveryState: RecoveryState.RECOVERING,
      recoveryData: {
        ...recoveryContext.recoveryData,
        retryAttempt: attempt,
        backoffStrategy: this.config.backoffStrategy,
        includeOriginalError: this.config.includeOriginalError,
      },
    };

    const duration = PerformanceUtils.now() - startTime;

    // For retry handler, we indicate readiness for retry rather than executing operation
    return {
      success: true, // Indicates retry preparation successful
      strategy: RecoveryStrategy.RETRY,
      attempts: attempt,
      duration,
      context: updatedContext,
      metrics: this.createMetrics(attempt, 1, duration),
    };
  }

  public async handleRecoveryResult(result: IRecoveryResult): Promise<IHandlerResult> {
    if (result.success) {
      return {
        handled: true,
        continueChain: false,
        ...(result.error && { modifiedError: result.error }),
      };
    }

    return {
      handled: false,
      continueChain: true,
    };
  }

  private createMetrics(attempts: number, successful: number, duration: number): IRecoveryMetrics {
    return PerformanceUtils.getFromPool("recoveryMetrics", () => ({
      totalAttempts: attempts,
      successfulAttempts: successful,
      failedAttempts: attempts - successful,
      attemptsByStrategy: { [RecoveryStrategy.RETRY]: attempts } as Record<RecoveryStrategy, number>,
      successRateByStrategy: { [RecoveryStrategy.RETRY]: successful / attempts } as Record<RecoveryStrategy, number>,
      averageRecoveryTime: duration,
      totalRecoveryTime: duration,
      recoveryTimeByStrategy: { [RecoveryStrategy.RETRY]: duration } as Record<RecoveryStrategy, number>,
    }));
  }
}

/**
 * Circuit breaker states and thread-safe state management
 */
type CircuitState = "closed" | "open" | "half-open";

interface ICircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
  requestCount: number;
  successCount: number;
}

/**
 * Circuit breaker handler with O(1) state checks and thread-safe operations
 */
export class CircuitBreakerHandler extends BaseRecoveryHandler {
  public readonly strategy = RecoveryStrategy.CIRCUIT_BREAKER;
  private config: Required<ICircuitBreakerConfig>;
  private state: ICircuitBreakerState;
  private stateHistory: Array<{ state: CircuitState; timestamp: Date; triggerError?: string }> = [];
  private errorFactory: ErrorFactory;

  // Thread-safety using atomic operations where possible
  private stateLock = false;

  constructor(config: ICircuitBreakerConfig, priority: HandlerPriority = Priority.HIGH) {
    super("CircuitBreakerHandler", priority);

    this.config = {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      failureWindow: config.failureWindow || 60000, // 1 minute default
      minimumRequests: config.minimumRequests || 10,
      successThreshold: config.successThreshold || 0.5,
      onOpen: config.onOpen,
      onClose: config.onClose,
      onHalfOpen: config.onHalfOpen,
      openCircuitError:
        config.openCircuitError || (() => this.errorFactory.create("Circuit breaker is open", "CIRCUIT_BREAKER_OPEN")),
      monitoredErrorTypes: config.monitoredErrorTypes || [],
    } as Required<ICircuitBreakerConfig>;

    this.state = {
      state: "closed",
      failureCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      nextAttemptTime: 0,
      requestCount: 0,
      successCount: 0,
    };

    this.errorFactory = new ErrorFactory(ErrorSeverity.WARNING, ErrorCategory.SYSTEM);
  }

  public canHandle(error: IBaseAxonError): boolean {
    if (this.config.monitoredErrorTypes.length === 0) {
      return true;
    }
    return this.config.monitoredErrorTypes.includes(error.code);
  }

  public canRecover(_error: IBaseAxonError, _context?: IRecoveryContext): boolean {
    const currentState = this.getCircuitState();
    return currentState !== "open";
  }

  public async recover(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult> {
    const startTime = PerformanceUtils.now();

    const recoveryContext: IRecoveryContext = context || {
      ...error.context,
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [RecoveryStrategy.CIRCUIT_BREAKER],
      recoveryState: RecoveryState.RECOVERING,
      recoveryStartedAt: new Date(),
    };

    // O(1) state check
    const currentState = this.getCircuitState();

    if (currentState === "open") {
      return {
        success: false,
        strategy: RecoveryStrategy.CIRCUIT_BREAKER,
        attempts: 1,
        duration: PerformanceUtils.now() - startTime,
        error: this.config.openCircuitError(),
        context: { ...recoveryContext, recoveryState: RecoveryState.FAILED },
        metrics: this.createMetrics(0, 1, PerformanceUtils.now() - startTime),
      };
    }

    // Record failure atomically
    this.recordFailure(error);

    const duration = PerformanceUtils.now() - startTime;
    const newState = this.getCircuitState();

    return {
      success: newState !== "open",
      strategy: RecoveryStrategy.CIRCUIT_BREAKER,
      attempts: 1,
      duration,
      context: {
        ...recoveryContext,
        recoveryState: newState === "open" ? RecoveryState.FAILED : RecoveryState.RECOVERED,
        recoveryData: {
          ...recoveryContext.recoveryData,
          circuitState: newState,
          failureCount: this.state.failureCount,
        },
      },
      metrics: this.createMetrics(newState === "open" ? 0 : 1, newState === "open" ? 1 : 0, duration),
    };
  }

  public async handleRecoveryResult(result: IRecoveryResult): Promise<IHandlerResult> {
    return {
      handled: true,
      continueChain: !result.success,
      ...(result.error && { modifiedError: result.error }),
    };
  }

  /**
   * Record a successful operation - thread-safe
   */
  public recordSuccess(): void {
    if (this.stateLock) return;

    const now = PerformanceUtils.now();
    this.state.lastSuccessTime = now;
    this.state.requestCount++;
    this.state.successCount++;

    if (this.state.state === "half-open") {
      const successRate = this.state.successCount / this.state.requestCount;
      if (successRate >= this.config.successThreshold) {
        this.transitionToState("closed");
      }
    }
  }

  /**
   * O(1) circuit state check with automatic transitions
   */
  private getCircuitState(): CircuitState {
    const now = PerformanceUtils.now();

    // Fast path: if already closed or no timeout needed
    if (this.state.state === "closed") {
      return "closed";
    }

    // Check if enough time has passed to attempt reset
    if (this.state.state === "open" && now >= this.state.nextAttemptTime) {
      this.transitionToState("half-open");
      return "half-open";
    }

    return this.state.state;
  }

  /**
   * Record failure atomically
   */
  private recordFailure(error: IBaseAxonError): void {
    if (this.stateLock) return;

    const now = PerformanceUtils.now();
    this.state.lastFailureTime = now;
    this.state.failureCount++;
    this.state.requestCount++;

    // Check if failure threshold exceeded
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.transitionToState("open", error.message);
    }
  }

  /**
   * Thread-safe state transition
   */
  private transitionToState(newState: CircuitState, triggerError?: string): void {
    if (this.stateLock) return;

    this.stateLock = true;

    try {
      this.state.state = newState;

      const now = PerformanceUtils.now();

      switch (newState) {
        case "open":
          this.state.nextAttemptTime = now + this.config.resetTimeout;
          this.config.onOpen?.(this.errorFactory.create(triggerError || "Circuit opened", "CIRCUIT_OPENED"));
          break;

        case "half-open":
          this.state.requestCount = 0;
          this.state.successCount = 0;
          this.config.onHalfOpen?.();
          break;

        case "closed":
          this.state.failureCount = 0;
          this.state.requestCount = 0;
          this.state.successCount = 0;
          this.config.onClose?.();
          break;
      }

      // Record state change in history
      this.stateHistory.push({
        state: newState,
        timestamp: new Date(),
        ...(triggerError && { triggerError }),
      });

      // Keep history bounded
      if (this.stateHistory.length > 100) {
        this.stateHistory.shift();
      }
    } finally {
      this.stateLock = false;
    }
  }

  private createMetrics(successful: number, failed: number, duration: number): IRecoveryMetrics {
    return PerformanceUtils.getFromPool("circuitBreakerMetrics", () => ({
      totalAttempts: successful + failed,
      successfulAttempts: successful,
      failedAttempts: failed,
      attemptsByStrategy: { [RecoveryStrategy.CIRCUIT_BREAKER]: successful + failed } as Record<
        RecoveryStrategy,
        number
      >,
      successRateByStrategy: { [RecoveryStrategy.CIRCUIT_BREAKER]: successful / (successful + failed || 1) } as Record<
        RecoveryStrategy,
        number
      >,
      averageRecoveryTime: duration,
      totalRecoveryTime: duration,
      recoveryTimeByStrategy: { [RecoveryStrategy.CIRCUIT_BREAKER]: duration } as Record<RecoveryStrategy, number>,
      circuitBreakerHistory: [...this.stateHistory],
    }));
  }
}

/**
 * Graceful degradation handler with fallback chain execution
 */
export class GracefulDegradationHandler extends BaseRecoveryHandler {
  public readonly strategy = RecoveryStrategy.GRACEFUL_DEGRADATION;
  private config: IGracefulDegradationConfig;
  private errorFactory: ErrorFactory;
  private qualityMetrics: { accuracy: number; performance: number; reliability: number } = {
    accuracy: 1.0,
    performance: 1.0,
    reliability: 1.0,
  };

  constructor(config: IGracefulDegradationConfig, priority: HandlerPriority = Priority.LOW) {
    super("GracefulDegradationHandler", priority);
    this.config = config;
    this.errorFactory = new ErrorFactory(ErrorSeverity.WARNING, ErrorCategory.APPLICATION);
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return Boolean(
      this.config.fallbackFunction ||
        (this.config.fallbackChain && this.config.fallbackChain.length > 0) ||
        this.config.degradationStrategies,
    );
  }

  public canRecover(error: IBaseAxonError, _context?: IRecoveryContext): boolean {
    // Check if any fallback strategy applies to this error
    if (this.config.degradationStrategies && this.config.degradationStrategies[error.code]) {
      return true;
    }

    if (this.config.fallbackChain) {
      return this.config.fallbackChain.some((fallback) => fallback.condition(error));
    }

    return Boolean(this.config.fallbackFunction || this.config.defaultValue !== undefined);
  }

  public async recover(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult> {
    const startTime = PerformanceUtils.now();

    const recoveryContext: IRecoveryContext = context || {
      ...error.context,
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [RecoveryStrategy.GRACEFUL_DEGRADATION],
      recoveryState: RecoveryState.RECOVERING,
      recoveryStartedAt: new Date(),
    };

    try {
      let result: unknown;
      let fallbackUsed: string | undefined;

      // Try specific degradation strategy first
      if (this.config.degradationStrategies && this.config.degradationStrategies[error.code]) {
        const strategy = this.config.degradationStrategies[error.code];
        if (strategy) {
          result = await this.executeFallback(strategy, error, recoveryContext);
          fallbackUsed = `degradation:${error.code}`;
        }
      }
      // Try fallback chain
      else if (this.config.fallbackChain) {
        const chain = this.config.fallbackChain.find((fallback) => fallback.condition(error));
        if (chain) {
          result = await this.executeFallback(chain.fallback, error, recoveryContext);
          fallbackUsed = chain.name || "fallback-chain";
        }
      }
      // Try primary fallback function
      else if (this.config.fallbackFunction) {
        result = await this.executeFallback(this.config.fallbackFunction, error, recoveryContext);
        fallbackUsed = "primary-fallback";
      }
      // Use default value
      else if (this.config.defaultValue !== undefined) {
        result = this.config.defaultValue;
        fallbackUsed = "default-value";
      }

      // Log fallback usage if enabled
      if (this.config.logFallbackUsage && fallbackUsed) {
        console.info(`Graceful degradation: Used ${fallbackUsed} for error ${error.code}`);
      }

      const duration = PerformanceUtils.now() - startTime;

      // Update quality metrics
      this.updateQualityMetrics(fallbackUsed || "unknown", duration);

      return {
        success: true,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        attempts: 1,
        duration,
        result,
        context: {
          ...recoveryContext,
          recoveryState: RecoveryState.RECOVERED,
          recoveryData: {
            ...recoveryContext.recoveryData,
            fallbackUsed,
            qualityMetrics: { ...this.qualityMetrics },
          },
        },
        metrics: this.createMetrics(1, 0, duration),
      };
    } catch (fallbackError) {
      const duration = PerformanceUtils.now() - startTime;

      return {
        success: false,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        attempts: 1,
        duration,
        error: this.errorFactory.createFromError(
          fallbackError as Error,
          "FALLBACK_FAILED",
          error.context.correlationId ? { correlationId: error.context.correlationId } : {},
        ),
        context: {
          ...recoveryContext,
          recoveryState: RecoveryState.FAILED,
        },
        metrics: this.createMetrics(0, 1, duration),
      };
    }
  }

  public async handleRecoveryResult(result: IRecoveryResult): Promise<IHandlerResult> {
    if (result.success) {
      return {
        handled: true,
        continueChain: false,
      };
    }

    return {
      handled: false,
      continueChain: true,
      ...(result.error && { modifiedError: result.error }),
    };
  }

  /**
   * Execute fallback function with timeout
   */
  private async executeFallback(
    fallback: (error: IBaseAxonError, context?: IRecoveryContext) => Promise<unknown> | unknown,
    error: IBaseAxonError,
    context: IRecoveryContext,
  ): Promise<unknown> {
    const timeout = this.config.fallbackTimeout || 5000;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Fallback execution timeout after ${timeout}ms`));
      }, timeout);
    });

    const fallbackPromise = Promise.resolve(fallback(error, context));

    return Promise.race([fallbackPromise, timeoutPromise]);
  }

  /**
   * Update quality metrics based on fallback usage
   */
  private updateQualityMetrics(fallbackType: string, duration: number): void {
    const thresholds = this.config.qualityMetrics;
    if (!thresholds) return;

    // Performance impact (higher duration = lower performance quality)
    if (thresholds.performanceThreshold) {
      this.qualityMetrics.performance = Math.max(0, 1 - duration / thresholds.performanceThreshold);
    }

    // Accuracy degradation based on fallback type
    if (thresholds.accuracyThreshold) {
      const accuracyDegradation = fallbackType.includes("default") ? 0.3 : 0.1;
      this.qualityMetrics.accuracy = Math.max(
        thresholds.accuracyThreshold,
        this.qualityMetrics.accuracy - accuracyDegradation,
      );
    }

    // Reliability impact
    if (thresholds.reliabilityThreshold) {
      this.qualityMetrics.reliability = Math.max(
        thresholds.reliabilityThreshold,
        0.95, // High reliability for successful fallback
      );
    }
  }

  private createMetrics(successful: number, failed: number, duration: number): IRecoveryMetrics {
    return PerformanceUtils.getFromPool("degradationMetrics", () => ({
      totalAttempts: successful + failed,
      successfulAttempts: successful,
      failedAttempts: failed,
      attemptsByStrategy: { [RecoveryStrategy.GRACEFUL_DEGRADATION]: successful + failed } as Record<
        RecoveryStrategy,
        number
      >,
      successRateByStrategy: {
        [RecoveryStrategy.GRACEFUL_DEGRADATION]: successful / (successful + failed || 1),
      } as Record<RecoveryStrategy, number>,
      averageRecoveryTime: duration,
      totalRecoveryTime: duration,
      recoveryTimeByStrategy: { [RecoveryStrategy.GRACEFUL_DEGRADATION]: duration } as Record<RecoveryStrategy, number>,
    }));
  }
}

/**
 * Timeout handler with non-blocking timeout management
 */
export class TimeoutHandler extends BaseRecoveryHandler {
  public readonly strategy = RecoveryStrategy.TIMEOUT;
  private config: Required<ITimeoutConfig>;
  private errorFactory: ErrorFactory;
  private activeTimeouts = new Map<string, { timer: NodeJS.Timeout; startTime: number }>();

  constructor(config: ITimeoutConfig, priority: HandlerPriority = Priority.HIGH) {
    super("TimeoutHandler", priority);

    this.config = {
      timeout: config.timeout,
      warningThreshold: config.warningThreshold || 0.8,
      gracePeriod: config.gracePeriod || 1000,
      timeoutErrorFactory:
        config.timeoutErrorFactory ||
        ((timeout, operation) =>
          this.errorFactory.create(
            `Operation ${operation || "unknown"} timed out after ${timeout}ms`,
            "OPERATION_TIMEOUT",
          )),
      onWarning:
        config.onWarning ||
        ((elapsed, timeout) => {
          console.warn(`Operation approaching timeout: ${elapsed}ms/${timeout}ms`);
        }),
      onTimeout:
        config.onTimeout ||
        ((elapsed, operation) => {
          console.error(`Operation timed out: ${elapsed}ms for ${operation || "unknown"}`);
        }),
      allowGracefulCompletion: config.allowGracefulCompletion !== false,
    } as Required<ITimeoutConfig>;

    this.errorFactory = new ErrorFactory(ErrorSeverity.WARNING, ErrorCategory.SYSTEM);
  }

  public canHandle(_error: IBaseAxonError): boolean {
    return true;
  }

  public canRecover(_error: IBaseAxonError, _context?: IRecoveryContext): boolean {
    return true; // Can always apply timeout
  }

  public async recover(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult> {
    const startTime = PerformanceUtils.now();
    const operationId = context?.correlationId || crypto.randomUUID();

    const recoveryContext: IRecoveryContext = context || {
      ...error.context,
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [RecoveryStrategy.TIMEOUT],
      recoveryState: RecoveryState.RECOVERING,
      recoveryStartedAt: new Date(),
      correlationId: operationId,
    };

    return new Promise((resolve) => {
      let resolved = false;
      let warningIssued = false;

      // Set up warning threshold timer
      const warningTime = this.config.timeout * this.config.warningThreshold;
      const warningTimer = setTimeout(() => {
        if (!resolved && !warningIssued) {
          warningIssued = true;
          const elapsed = PerformanceUtils.now() - startTime;
          this.config.onWarning(elapsed, this.config.timeout);
        }
      }, warningTime);

      // Set up main timeout timer
      const timeoutTimer = setTimeout(() => {
        if (resolved) return;

        const elapsed = PerformanceUtils.now() - startTime;
        this.config.onTimeout(elapsed, recoveryContext.operation);

        // Clean up timers
        clearTimeout(warningTimer);
        this.activeTimeouts.delete(operationId);

        resolved = true;
        resolve({
          success: false,
          strategy: RecoveryStrategy.TIMEOUT,
          attempts: 1,
          duration: elapsed,
          error: this.config.timeoutErrorFactory(this.config.timeout, recoveryContext.operation),
          context: {
            ...recoveryContext,
            recoveryState: RecoveryState.FAILED,
            recoveryData: {
              ...recoveryContext.recoveryData,
              timeoutMs: this.config.timeout,
              elapsedMs: elapsed,
            },
          },
          metrics: this.createMetrics(0, 1, elapsed),
        });
      }, this.config.timeout);

      // Track active timeout
      this.activeTimeouts.set(operationId, {
        timer: timeoutTimer,
        startTime,
      });

      // Grace period handling if enabled
      if (this.config.allowGracefulCompletion && this.config.gracePeriod > 0) {
        const graceTimer = setTimeout(() => {
          if (!resolved) {
            clearTimeout(timeoutTimer);
            clearTimeout(warningTimer);
            this.activeTimeouts.delete(operationId);

            const elapsed = PerformanceUtils.now() - startTime;
            resolved = true;
            resolve({
              success: true,
              strategy: RecoveryStrategy.TIMEOUT,
              attempts: 1,
              duration: elapsed,
              context: {
                ...recoveryContext,
                recoveryState: RecoveryState.RECOVERED,
                recoveryData: {
                  ...recoveryContext.recoveryData,
                  gracefulCompletion: true,
                  timeoutMs: this.config.timeout,
                  elapsedMs: elapsed,
                },
              },
              metrics: this.createMetrics(1, 0, elapsed),
            });
          }
        }, this.config.timeout + this.config.gracePeriod);

        // Update the timeout tracking to include grace timer
        const existingTimeout = this.activeTimeouts.get(operationId);
        if (existingTimeout) {
          // Store both timers for cleanup
          (existingTimeout as any).graceTimer = graceTimer;
        }
      }

      // For immediate resolution (timeout handler is ready)
      setTimeout(() => {
        if (!resolved) {
          const elapsed = PerformanceUtils.now() - startTime;
          resolved = true;
          resolve({
            success: true,
            strategy: RecoveryStrategy.TIMEOUT,
            attempts: 1,
            duration: elapsed,
            context: {
              ...recoveryContext,
              recoveryState: RecoveryState.RECOVERED,
              recoveryData: {
                ...recoveryContext.recoveryData,
                timeoutConfigured: true,
                timeoutMs: this.config.timeout,
              },
            },
            metrics: this.createMetrics(1, 0, elapsed),
          });
        }
      }, 0);
    });
  }

  public async handleRecoveryResult(result: IRecoveryResult): Promise<IHandlerResult> {
    // Clean up any remaining timeouts
    if (result.context.correlationId) {
      this.cancelTimeout(result.context.correlationId);
    }

    return {
      handled: true,
      continueChain: !result.success,
      ...(result.error && { modifiedError: result.error }),
    };
  }

  /**
   * Cancel an active timeout
   */
  public cancelTimeout(operationId: string): boolean {
    const timeoutInfo = this.activeTimeouts.get(operationId);
    if (timeoutInfo) {
      clearTimeout(timeoutInfo.timer);

      // Clean up grace timer if it exists
      const graceTimer = (timeoutInfo as any).graceTimer;
      if (graceTimer) {
        clearTimeout(graceTimer);
      }

      this.activeTimeouts.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Get active timeout count
   */
  public getActiveTimeoutCount(): number {
    return this.activeTimeouts.size;
  }

  private createMetrics(successful: number, failed: number, duration: number): IRecoveryMetrics {
    return PerformanceUtils.getFromPool("timeoutMetrics", () => ({
      totalAttempts: successful + failed,
      successfulAttempts: successful,
      failedAttempts: failed,
      attemptsByStrategy: { [RecoveryStrategy.TIMEOUT]: successful + failed } as Record<RecoveryStrategy, number>,
      successRateByStrategy: { [RecoveryStrategy.TIMEOUT]: successful / (successful + failed || 1) } as Record<
        RecoveryStrategy,
        number
      >,
      averageRecoveryTime: duration,
      totalRecoveryTime: duration,
      recoveryTimeByStrategy: { [RecoveryStrategy.TIMEOUT]: duration } as Record<RecoveryStrategy, number>,
    }));
  }
}

/**
 * Recovery manager orchestrating multiple recovery strategies
 */
export class RecoveryManager implements IRecoveryManager {
  private handlers = new Map<string, IRecoveryHandler>();
  private metrics: IRecoveryMetrics;
  private errorFactory: ErrorFactory;

  constructor(config?: IRecoveryManagerConfig) {
    this.errorFactory = new ErrorFactory(ErrorSeverity.ERROR, ErrorCategory.SYSTEM);
    this.metrics = this.createEmptyMetrics();

    // Auto-register handlers based on configuration
    if (config) {
      if (config.retryConfig) {
        this.registerHandler(new RetryHandler(config.retryConfig));
      }
      if (config.circuitBreakerConfig) {
        this.registerHandler(new CircuitBreakerHandler(config.circuitBreakerConfig));
      }
      if (config.gracefulDegradationConfig) {
        this.registerHandler(new GracefulDegradationHandler(config.gracefulDegradationConfig));
      }
      if (config.timeoutConfig) {
        this.registerHandler(new TimeoutHandler(config.timeoutConfig));
      }
    }
  }

  public registerHandler(handler: IRecoveryHandler): void {
    this.handlers.set(handler.name, handler);
  }

  public unregisterHandler(name: string): boolean {
    return this.handlers.delete(name);
  }

  public async executeWithRecovery<T>(operation: IRecoverableOperation<T>): Promise<T> {
    const startTime = PerformanceUtils.now();
    const context: IRecoveryContext = {
      correlationId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.INFO,
      category: ErrorCategory.APPLICATION,
      operation: operation.name,
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [],
      recoveryState: RecoveryState.IDLE,
      recoveryStartedAt: new Date(),
      ...(operation.metadata && { metadata: operation.metadata }),
    };

    try {
      // Try operation first
      const result = await Promise.resolve(operation.operation(context));

      // Update metrics for successful operation
      this.updateMetrics({
        totalAttempts: 1,
        successfulAttempts: 1,
        failedAttempts: 0,
        duration: PerformanceUtils.now() - startTime,
      });

      return result;
    } catch (error) {
      // Convert to BaseAxonError if needed
      const axonError = error instanceof BaseAxonError ? error : this.errorFactory.createFromError(error as Error);

      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(axonError, context);

      if (recoveryResult.success && recoveryResult.result !== undefined) {
        return recoveryResult.result as T;
      }

      throw recoveryResult.error || axonError;
    }
  }

  public async attemptRecovery(error: IBaseAxonError, context?: IRecoveryContext): Promise<IRecoveryResult> {
    const startTime = PerformanceUtils.now();
    const recoveryContext: IRecoveryContext = context || {
      ...error.context,
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [],
      recoveryState: RecoveryState.RECOVERING,
      recoveryStartedAt: new Date(),
    };

    const sortedHandlers = Array.from(this.handlers.values())
      .filter((handler) => handler.canHandle(error) && handler.canRecover(error, recoveryContext))
      .sort((a, b) => a.priority - b.priority);

    if (sortedHandlers.length === 0) {
      const duration = PerformanceUtils.now() - startTime;
      return {
        success: false,
        strategy: RecoveryStrategy.RETRY, // Default strategy for no handlers
        attempts: 0,
        duration,
        error: this.errorFactory.create("No recovery handlers available for error", "NO_RECOVERY_HANDLERS"),
        context: {
          ...recoveryContext,
          recoveryState: RecoveryState.FAILED,
        },
        metrics: this.createMetrics(0, 1, duration, RecoveryStrategy.RETRY),
      };
    }

    // Try each handler in priority order
    for (const handler of sortedHandlers) {
      try {
        const result = await handler.recover(error, recoveryContext);

        // Update context with strategy attempted
        result.context.strategiesAttempted.push(handler.strategy);
        result.context.totalAttempts++;

        // Update global metrics
        this.updateMetrics({
          totalAttempts: result.attempts,
          successfulAttempts: result.success ? 1 : 0,
          failedAttempts: result.success ? 0 : 1,
          duration: result.duration,
          strategy: handler.strategy,
        });

        if (result.success) {
          result.context.recoveryState = RecoveryState.RECOVERED;
          result.context.recoveryCompletedAt = new Date();
          return result;
        }

        // Continue to next handler if this one failed
        recoveryContext.attemptNumber++;
      } catch (handlerError) {
        console.error(`Recovery handler ${handler.name} failed:`, handlerError);

        // Continue to next handler
        recoveryContext.strategiesAttempted.push(handler.strategy);
        recoveryContext.attemptNumber++;
      }
    }

    // All handlers failed
    const duration = PerformanceUtils.now() - startTime;
    return {
      success: false,
      strategy: sortedHandlers[sortedHandlers.length - 1]?.strategy || RecoveryStrategy.RETRY,
      attempts: recoveryContext.attemptNumber,
      duration,
      error: this.errorFactory.create("All recovery strategies exhausted", "RECOVERY_EXHAUSTED"),
      context: {
        ...recoveryContext,
        recoveryState: RecoveryState.EXHAUSTED,
        recoveryCompletedAt: new Date(),
      },
      metrics: this.createMetrics(0, recoveryContext.attemptNumber, duration, RecoveryStrategy.RETRY),
    };
  }

  public getMetrics(): IRecoveryMetrics {
    return { ...this.metrics };
  }

  public clearMetrics(): void {
    this.metrics = this.createEmptyMetrics();
  }

  public getHandlers(): ReadonlyArray<IRecoveryHandler> {
    return Object.freeze(Array.from(this.handlers.values()));
  }

  private createEmptyMetrics(): IRecoveryMetrics {
    return PerformanceUtils.getFromPool("emptyMetrics", () => ({
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      attemptsByStrategy: {} as Record<RecoveryStrategy, number>,
      successRateByStrategy: {} as Record<RecoveryStrategy, number>,
      averageRecoveryTime: 0,
      totalRecoveryTime: 0,
      recoveryTimeByStrategy: {} as Record<RecoveryStrategy, number>,
    }));
  }

  private createMetrics(
    successful: number,
    failed: number,
    duration: number,
    strategy: RecoveryStrategy,
  ): IRecoveryMetrics {
    return PerformanceUtils.getFromPool("managerMetrics", () => ({
      totalAttempts: successful + failed,
      successfulAttempts: successful,
      failedAttempts: failed,
      attemptsByStrategy: { [strategy]: successful + failed } as Record<RecoveryStrategy, number>,
      successRateByStrategy: { [strategy]: successful / (successful + failed || 1) } as Record<
        RecoveryStrategy,
        number
      >,
      averageRecoveryTime: duration,
      totalRecoveryTime: duration,
      recoveryTimeByStrategy: { [strategy]: duration } as Record<RecoveryStrategy, number>,
    }));
  }

  private updateMetrics(update: {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    duration: number;
    strategy?: RecoveryStrategy;
  }): void {
    this.metrics.totalAttempts += update.totalAttempts;
    this.metrics.successfulAttempts += update.successfulAttempts;
    this.metrics.failedAttempts += update.failedAttempts;
    this.metrics.totalRecoveryTime += update.duration;

    // Update average
    if (this.metrics.totalAttempts > 0) {
      this.metrics.averageRecoveryTime = this.metrics.totalRecoveryTime / this.metrics.totalAttempts;
    }

    // Update strategy-specific metrics
    if (update.strategy) {
      this.metrics.attemptsByStrategy[update.strategy] =
        (this.metrics.attemptsByStrategy[update.strategy] || 0) + update.totalAttempts;

      this.metrics.recoveryTimeByStrategy[update.strategy] =
        (this.metrics.recoveryTimeByStrategy[update.strategy] || 0) + update.duration;

      const strategyAttempts = this.metrics.attemptsByStrategy[update.strategy];
      const strategySuccesses = update.successfulAttempts;
      this.metrics.successRateByStrategy[update.strategy] = strategySuccesses / strategyAttempts;
    }
  }
}
