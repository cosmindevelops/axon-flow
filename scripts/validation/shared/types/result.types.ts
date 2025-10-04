/**
 * Result aggregation types for IU execution batches.
 */

import type { ValidationResult, ValidationSummary } from './validation.types';

export interface IUExecutionResult {
  readonly iu: number;
  readonly name: string;
  readonly status: 'passed' | 'failed' | 'skipped' | 'blocked';
  readonly validations: readonly ValidationResult[];
  readonly duration: number;
  readonly summary: ValidationSummary;
  readonly error?: string;
}

export interface ValidationBatchResult {
  readonly timestamp: string;
  readonly ius: readonly number[];
  readonly results: readonly IUExecutionResult[];
  readonly summary: ValidationSummary;
  readonly duration: number;
  readonly passed: boolean;
}
