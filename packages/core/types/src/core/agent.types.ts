/**
 * Agent and capability type definitions for the Axon Flow platform
 *
 * These types define the structure of agents in the hub-centric orchestration system,
 * including their metadata, capabilities, and registration information.
 */

import type { Timestamp, Version } from "./index.js";

/**
 * Unique identifier for an agent instance
 */
export type AgentId = string & { __brand: "AgentId" };

/**
 * Status of an agent in the system
 */
export type AgentStatus = "active" | "inactive" | "registering" | "error" | "disconnected";

/**
 * Metadata describing an agent's capabilities and state
 *
 * This interface defines the complete information about an agent
 * registered in the system's service registry.
 */
export interface IAgentMetadata {
  /** Unique identifier for this agent instance */
  readonly id: AgentId;

  /** Human-readable name of the agent */
  readonly name: string;

  /** Version of the agent implementation */
  readonly version: Version;

  /** List of capabilities this agent provides */
  readonly capabilities: readonly IAgentCapability[];

  /** Current operational status of the agent */
  readonly status: AgentStatus;

  /** Timestamp when the agent was registered */
  readonly registeredAt: Timestamp;

  /** Last heartbeat received from the agent */
  readonly lastHeartbeat: Timestamp;

  /** Additional metadata for agent-specific configuration */
  readonly metadata: Record<string, unknown>;
}

/**
 * Describes a single capability that an agent can perform
 *
 * Capabilities are the building blocks of agent functionality,
 * defining what operations an agent can execute.
 */
export interface IAgentCapability {
  /** Unique name of the capability */
  readonly name: string;

  /** Version of the capability implementation */
  readonly version: Version;

  /** Human-readable description of what this capability does */
  readonly description: string;

  /** Parameters required to execute this capability */
  readonly parameters: readonly ICapabilityParameter[];

  /** Return type information for this capability */
  readonly returns: ICapabilityReturn;

  /** Tags for capability categorization and discovery */
  readonly tags?: readonly string[];

  /** Timeout in milliseconds for capability execution */
  readonly timeout?: number;

  /** Whether this capability supports retries */
  readonly retryable?: boolean;
}

/**
 * Defines a parameter for an agent capability
 */
export interface ICapabilityParameter {
  /** Parameter name */
  readonly name: string;

  /** Parameter type (e.g., "string", "number", "object") */
  readonly type: string;

  /** Whether this parameter is required */
  readonly required: boolean;

  /** Description of the parameter's purpose */
  readonly description: string;

  /** Default value if not provided */
  readonly defaultValue?: unknown;

  /** Validation schema for the parameter */
  readonly validation?: unknown;
}

/**
 * Defines the return type of an agent capability
 */
export interface ICapabilityReturn {
  /** Return type (e.g., "string", "object", "void") */
  readonly type: string;

  /** Description of what is returned */
  readonly description: string;

  /** Schema for the return value */
  readonly schema?: unknown;
}

/**
 * Agent registration request payload
 */
export interface IAgentRegistration {
  /** Agent name */
  readonly name: string;

  /** Agent version */
  readonly version: Version;

  /** Capabilities provided by this agent */
  readonly capabilities: readonly IAgentCapability[];

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Agent health check information
 */
export interface IAgentHealth {
  /** Agent identifier */
  readonly agentId: AgentId;

  /** Current status */
  readonly status: AgentStatus;

  /** Last heartbeat timestamp */
  readonly lastHeartbeat: Timestamp;

  /** Health metrics */
  readonly metrics?: IAgentMetrics;
}

/**
 * Runtime metrics for an agent
 */
export interface IAgentMetrics {
  /** Requests processed per second */
  readonly requestsPerSecond?: number;

  /** Error rate (0-1) */
  readonly errorRate?: number;

  /** Average response time in milliseconds */
  readonly avgResponseTime?: number;

  /** CPU usage percentage */
  readonly cpuUsage?: number;

  /** Memory usage in bytes */
  readonly memoryUsage?: number;

  /** Number of active tasks */
  readonly activeTasks?: number;

  /** Number of completed tasks */
  readonly completedTasks?: number;

  /** Number of failed tasks */
  readonly failedTasks?: number;

  /** Average task execution time in milliseconds */
  readonly avgExecutionTime?: number;
}
