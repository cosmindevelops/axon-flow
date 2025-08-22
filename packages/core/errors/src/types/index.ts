/**
 * Error type definitions and interfaces
 */

// Local type definitions to avoid dependency issues
type CorrelationId = string;
type Timestamp = string;

/**
 * Enhanced error context for debugging and tracing
 */
export interface IErrorContext {
  correlationId?: CorrelationId;
  timestamp: Timestamp;
  component?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}
