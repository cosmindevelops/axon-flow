/**
 * Task and workflow type definitions for orchestration
 *
 * These types define task execution, workflow management,
 * and the orchestration patterns used by the Hub.
 */

import type { AgentId } from "../agent/agent.types.js";
import type { CorrelationId, Timestamp, Version } from "../index.js";

/**
 * Unique identifier for a task
 */
export type TaskId = string & { __brand: "TaskId" };

/**
 * Unique identifier for a workflow
 */
export type WorkflowId = string & { __brand: "WorkflowId" };

/**
 * Task execution status
 */
export type TaskStatus =
  | "pending"
  | "queued"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying"
  | "compensating";

/**
 * Task priority levels
 */
export type TaskPriority = "low" | "normal" | "high" | "critical";

/**
 * Core task definition for execution
 *
 * Represents a single unit of work to be executed by an agent.
 */
export interface ITaskDefinition {
  /** Unique task identifier */
  readonly id: TaskId;

  /** Human-readable task name */
  readonly name: string;

  /** Task description */
  readonly description: string;

  /** Agent responsible for execution */
  readonly agentId: AgentId;

  /** Capability to invoke */
  readonly capability: string;

  /** Task input parameters */
  readonly parameters: Record<string, unknown>;

  /** Task dependencies that must complete first */
  readonly dependencies: readonly TaskId[];

  /** Execution timeout in milliseconds */
  readonly timeout: number;

  /** Task priority */
  readonly priority: TaskPriority;

  /** Retry policy for failures */
  readonly retryPolicy: IRetryPolicy;

  /** Compensation action if task fails */
  readonly compensationAction?: ICompensationAction;

  /** Task metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Task execution context
 */
export interface ITaskExecution {
  /** Task being executed */
  readonly task: ITaskDefinition;

  /** Execution status */
  readonly status: TaskStatus;

  /** Correlation ID for tracing */
  readonly correlationId: CorrelationId;

  /** When execution started */
  readonly startedAt?: Timestamp;

  /** When execution completed */
  readonly completedAt?: Timestamp;

  /** Execution result */
  readonly result?: unknown;

  /** Error if failed */
  readonly error?: ITaskError;

  /** Number of retry attempts */
  readonly retryCount: number;

  /** Execution metrics */
  readonly metrics?: ITaskMetrics;
}

/**
 * Task error information
 */
export interface ITaskError {
  /** Error code */
  readonly code: string;

  /** Error message */
  readonly message: string;

  /** Stack trace */
  readonly stack?: string;

  /** Whether the error is retryable */
  readonly retryable: boolean;

  /** Additional error context */
  readonly context?: Record<string, unknown>;
}

/**
 * Task execution metrics
 */
export interface ITaskMetrics {
  /** Execution duration in milliseconds */
  readonly duration: number;

  /** Queue wait time in milliseconds */
  readonly queueTime: number;

  /** CPU time used */
  readonly cpuTime?: number;

  /** Memory used in bytes */
  readonly memoryUsed?: number;
}

/**
 * Retry policy for task execution
 */
export interface IRetryPolicy {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;

  /** Initial delay between retries in milliseconds */
  readonly initialDelay: number;

  /** Maximum delay between retries in milliseconds */
  readonly maxDelay: number;

  /** Backoff multiplier for exponential backoff */
  readonly backoffMultiplier: number;

  /** Jitter to add randomness to retry delays */
  readonly jitter: boolean;

  /** Error codes that should trigger retry */
  readonly retryableErrors?: readonly string[];
}

/**
 * Compensation action for saga pattern
 */
export interface ICompensationAction {
  /** Agent to execute compensation */
  readonly agentId: AgentId;

  /** Capability to invoke for compensation */
  readonly capability: string;

  /** Parameters for compensation */
  readonly parameters: Record<string, unknown>;

  /** Timeout for compensation */
  readonly timeout: number;
}

/**
 * Workflow definition containing multiple tasks
 */
export interface IWorkflowDefinition {
  /** Unique workflow identifier */
  readonly id: WorkflowId;

  /** Workflow name */
  readonly name: string;

  /** Workflow version */
  readonly version: Version;

  /** Workflow description */
  readonly description: string;

  /** Tasks in this workflow */
  readonly tasks: readonly ITaskDefinition[];

  /** Workflow-level timeout */
  readonly timeout: number;

  /** Whether to use saga pattern */
  readonly useSaga: boolean;

  /** Workflow metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Workflow execution state
 */
export interface IWorkflowExecution {
  /** Workflow being executed */
  readonly workflow: IWorkflowDefinition;

  /** Current status */
  readonly status: TaskStatus;

  /** Correlation ID for the entire workflow */
  readonly correlationId: CorrelationId;

  /** Task execution states */
  readonly taskExecutions: readonly ITaskExecution[];

  /** Workflow start time */
  readonly startedAt: Timestamp;

  /** Workflow completion time */
  readonly completedAt?: Timestamp;

  /** Workflow result */
  readonly result?: unknown;

  /** Workflow error if failed */
  readonly error?: ITaskError;
}

/**
 * Task scheduling information
 */
export interface ITaskSchedule {
  /** Task to schedule */
  readonly taskId: TaskId;

  /** Schedule type */
  readonly type: "immediate" | "delayed" | "cron";

  /** Delay in milliseconds (for delayed type) */
  readonly delay?: number;

  /** Cron expression (for cron type) */
  readonly cronExpression?: string;

  /** Maximum number of executions */
  readonly maxExecutions?: number;

  /** Time zone for cron schedules */
  readonly timezone?: string;
}

/**
 * Task execution result
 */
export interface ITaskResult {
  /** Task execution ID */
  readonly executionId: string;

  /** Task ID */
  readonly taskId: TaskId;

  /** Execution status */
  readonly status: TaskStatus;

  /** Result data */
  readonly result?: unknown;

  /** Error information if failed */
  readonly error?: ITaskError;

  /** Execution start time */
  readonly startedAt: Timestamp;

  /** Execution completion time */
  readonly completedAt?: Timestamp;

  /** Agent that executed the task */
  readonly agentId: AgentId;
}

/**
 * Workflow execution result
 */
export interface IWorkflowResult {
  /** Workflow execution ID */
  readonly executionId: string;

  /** Workflow ID */
  readonly workflowId: WorkflowId;

  /** Execution status */
  readonly status: TaskStatus;

  /** Final result data */
  readonly result?: unknown;

  /** Error information if failed */
  readonly error?: ITaskError;

  /** Execution start time */
  readonly startedAt: Timestamp;

  /** Execution completion time */
  readonly completedAt?: Timestamp;

  /** Task results */
  readonly taskResults: readonly ITaskResult[];
}
