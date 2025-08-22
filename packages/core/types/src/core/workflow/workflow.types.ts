/**
 * Workflow and saga pattern type definitions
 *
 * These types support distributed transaction management
 * and complex workflow orchestration with compensation.
 */

import type { AgentId } from "../agent/agent.types.js";
import type { CorrelationId, Timestamp, Version } from "../index.js";
import type { ITaskDefinition, TaskStatus, WorkflowId } from "../task/task.types.js";

/**
 * Unique identifier for a saga
 */
export type SagaId = string & { __brand: "SagaId" };

/**
 * Saga transaction state
 */
export type SagaState = "pending" | "executing" | "compensating" | "completed" | "failed" | "compensated";

/**
 * Saga definition for distributed transactions
 *
 * Implements the saga pattern for managing distributed
 * transactions across multiple agents.
 */
export interface ISagaDefinition {
  /** Unique saga identifier */
  readonly id: SagaId;

  /** Saga name */
  readonly name: string;

  /** Saga version */
  readonly version: Version;

  /** Saga description */
  readonly description: string;

  /** Steps in the saga */
  readonly steps: readonly ISagaStep[];

  /** Global timeout for the entire saga */
  readonly timeout: number;

  /** Isolation level for the saga */
  readonly isolationLevel: IsolationLevel;

  /** Saga metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Individual step in a saga
 */
export interface ISagaStep {
  /** Step identifier */
  readonly id: string;

  /** Step name */
  readonly name: string;

  /** Forward transaction */
  readonly transaction: ITransaction;

  /** Compensation transaction */
  readonly compensation: ITransaction;

  /** Dependencies on other steps */
  readonly dependencies: readonly string[];

  /** Whether this step can be retried */
  readonly retryable: boolean;

  /** Step-specific timeout */
  readonly timeout: number;
}

/**
 * Transaction definition for saga steps
 */
export interface ITransaction {
  /** Agent to execute the transaction */
  readonly agentId: AgentId;

  /** Capability to invoke */
  readonly capability: string;

  /** Transaction parameters */
  readonly parameters: Record<string, unknown>;

  /** Expected result type */
  readonly resultType?: string;

  /** Validation rules for the result */
  readonly validation?: IValidationRule[];
}

/**
 * Validation rule for transaction results
 */
export interface IValidationRule {
  /** Rule type */
  readonly type: "required" | "range" | "pattern" | "custom";

  /** Field to validate */
  readonly field?: string;

  /** Validation parameters */
  readonly params: Record<string, unknown>;

  /** Error message if validation fails */
  readonly errorMessage: string;
}

/**
 * Isolation levels for saga execution
 */
export type IsolationLevel = "read-uncommitted" | "read-committed" | "repeatable-read" | "serializable";

/**
 * Saga execution context
 */
export interface ISagaExecution {
  /** Saga being executed */
  readonly saga: ISagaDefinition;

  /** Current state */
  readonly state: SagaState;

  /** Correlation ID */
  readonly correlationId: CorrelationId;

  /** Step execution states */
  readonly stepExecutions: readonly IStepExecution[];

  /** Saga start time */
  readonly startedAt: Timestamp;

  /** Saga completion time */
  readonly completedAt?: Timestamp;

  /** Compensation start time */
  readonly compensationStartedAt?: Timestamp;

  /** Final result if successful */
  readonly result?: unknown;

  /** Error if failed */
  readonly error?: ISagaError;
}

/**
 * Step execution state
 */
export interface IStepExecution {
  /** Step being executed */
  readonly step: ISagaStep;

  /** Execution status */
  readonly status: TaskStatus;

  /** Transaction result */
  readonly transactionResult?: unknown;

  /** Compensation result */
  readonly compensationResult?: unknown;

  /** Execution metrics */
  readonly metrics: IStepMetrics;
}

/**
 * Step execution metrics
 */
export interface IStepMetrics {
  /** Transaction execution time */
  readonly transactionDuration?: number;

  /** Compensation execution time */
  readonly compensationDuration?: number;

  /** Number of retries */
  readonly retryCount: number;

  /** Total execution time including retries */
  readonly totalDuration: number;
}

/**
 * Saga error information
 */
export interface ISagaError {
  /** Error code */
  readonly code: string;

  /** Error message */
  readonly message: string;

  /** Step where the error occurred */
  readonly failedStep: string;

  /** Whether compensation was successful */
  readonly compensated: boolean;

  /** Additional error context */
  readonly context?: Record<string, unknown>;
}

/**
 * Workflow orchestration strategy
 */
export type OrchestrationStrategy = "sequential" | "parallel" | "conditional" | "loop" | "fork-join";

/**
 * Advanced workflow definition with orchestration patterns
 */
export interface IAdvancedWorkflow {
  /** Workflow identifier */
  readonly id: WorkflowId;

  /** Workflow name */
  readonly name: string;

  /** Orchestration strategy */
  readonly strategy: OrchestrationStrategy;

  /** Workflow branches for conditional/fork strategies */
  readonly branches?: readonly IWorkflowBranch[];

  /** Loop configuration */
  readonly loop?: ILoopConfig;

  /** Join configuration for fork-join */
  readonly join?: IJoinConfig;
}

/**
 * Workflow branch for conditional execution
 */
export interface IWorkflowBranch {
  /** Branch identifier */
  readonly id: string;

  /** Condition for this branch */
  readonly condition: ICondition;

  /** Tasks in this branch */
  readonly tasks: readonly ITaskDefinition[];
}

/**
 * Condition for branching
 */
export interface ICondition {
  /** Condition type */
  readonly type: "expression" | "rule" | "function";

  /** Condition expression or rule */
  readonly value: string;

  /** Parameters for evaluation */
  readonly params?: Record<string, unknown>;
}

/**
 * Loop configuration for iterative workflows
 */
export interface ILoopConfig {
  /** Loop type */
  readonly type: "count" | "condition" | "collection";

  /** Maximum iterations */
  readonly maxIterations: number;

  /** Loop condition */
  readonly condition?: ICondition;

  /** Collection to iterate over */
  readonly collection?: string;
}

/**
 * Join configuration for fork-join patterns
 */
export interface IJoinConfig {
  /** Join strategy */
  readonly strategy: "all" | "any" | "quorum";

  /** Minimum branches for quorum */
  readonly quorum?: number;

  /** Timeout for join */
  readonly timeout: number;
}
