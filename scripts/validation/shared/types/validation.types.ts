/**
 * Validation Domain Types
 *
 * Mirrors the Variant 1 implementation guide and references:
 * - docs/main/003-validation_criteria.md (IU catalogue)
 * - AGENTS.md Section 9 (Testing & Validation Authority)
 */

/**
 * Validation Context passed to individual validators.
 */
export interface ValidationContext {
  /** Implementation Unit identifier (1-35). */
  readonly iu: number;
  /** Validation criteria number (1-20). */
  readonly criteria: number;
  /** Absolute path to the repository root. */
  readonly projectRoot: string;
  /** ISO timestamp for execution start. */
  readonly timestamp: string;
  /** Optional correlation identifier for tracing. */
  readonly correlationId?: string;
  /** Optional environment overrides for validator execution. */
  readonly env?: Record<string, string>;
}

/**
 * Enumeration of supported validation statuses.
 */
export type ValidationStatus = 'passed' | 'failed' | 'skipped' | 'blocked';

/**
 * Structured error data returned by validators when failures occur.
 */
export interface ValidationError {
  /** Human readable error message. */
  readonly message: string;
  /** Error classification for downstream reporting. */
  readonly type: 'assertion' | 'infrastructure' | 'timeout' | 'dependency' | 'unknown';
  /** Optional stack trace captured by the validator. */
  readonly stack?: string;
  /** Arbitrary metadata for debugging. */
  readonly details?: Record<string, unknown>;
}

/**
 * Result returned by each validation criterion.
 */
export interface ValidationResult {
  readonly iu: number;
  readonly criteria: number;
  readonly name: string;
  readonly status: ValidationStatus;
  readonly duration: number;
  readonly error?: ValidationError;
  readonly warnings?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly cached?: boolean;
}

/**
 * Aggregated summary values for a validation run.
 */
export interface ValidationSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly blocked: number;
}

/**
 * Batch level report containing all executed results.
 */
export interface ValidationReport {
  readonly timestamp: string;
  readonly summary: ValidationSummary;
  readonly results: readonly ValidationResult[];
  readonly duration: number;
  readonly coverage: number;
  readonly iusExecuted: readonly number[];
  readonly iusSkipped: readonly number[];
}

/**
 * CLI options accepted by the orchestrator.
 */
export interface ValidationOptions {
  readonly iu?: readonly number[];
  readonly from?: number;
  readonly to?: number;
  readonly all?: boolean;
  readonly parallel?: number;
  readonly bail?: boolean;
  readonly format?: ReportFormat;
  readonly output?: string;
  readonly verbose?: boolean;
}

/**
 * Supported report output formats.
 */
export type ReportFormat = 'json' | 'html' | 'markdown';

/**
 * Per-IU configuration loaded from iu-XXX.config.ts.
 */
export interface IUValidationConfig {
  readonly id: number;
  readonly name: string;
  readonly dependencies: readonly number[];
  readonly timeout: number;
  readonly retries: number;
  readonly parallel: boolean;
  readonly environment?: Record<string, string>;
  readonly fixtures?: FixtureConfig;
  readonly reporting?: ReportingConfig;
}

export interface FixtureConfig {
  readonly required: readonly string[];
  readonly cleanup: boolean;
}

export interface ReportingConfig {
  readonly captureScreenshots: boolean;
  readonly captureLogs: boolean;
  readonly verbose: boolean;
}

/**
 * Graph representation for IU dependencies.
 */
export interface IUDependencyGraph {
  readonly dependencies: Map<number, readonly number[]>;
  readonly dependents: Map<number, readonly number[]>;
  readonly executionOrder: readonly number[];
}

/**
 * Execution boundary for the orchestrator once dependencies are resolved.
 */
export interface ResolvedExecutionPlan {
  readonly orderedIUs: readonly number[];
  readonly skippedIUs: readonly number[];
}
