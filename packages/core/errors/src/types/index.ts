/**
 * Error type definitions and interfaces
 */

import type { CorrelationId, Timestamp } from "@axon/types";

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
