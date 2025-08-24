/**
 * Agent and capability type definitions for the Axon Flow platform
 *
 * These types define the structure of agents in the hub-centric orchestration system,
 * including their metadata, capabilities, and registration information.
 */

import type { Timestamp, Version } from "../index.js";
import type { MessageType } from "../message/message.types.js";

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

// ============================================================================
// EXTENDED TYPE DEFINITIONS (Required by Test Suite)
// ============================================================================

/**
 * Capability name identifier
 */
export type CapabilityName = string & { __brand: "CapabilityName" };

/**
 * Priority levels for tasks and messages
 */
export type Priority = "low" | "normal" | "high" | "critical";

/**
 * Connection status for agent connections
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "error";

/**
 * Health status for agent health checks
 */
export type HealthStatus = "healthy" | "unhealthy" | "warning" | "unknown";

/**
 * Extended parameter definition with validation and examples
 */
export interface IParameterDefinition extends ICapabilityParameter {
  /** Validation constraints */
  readonly validation?: {
    readonly min?: number;
    readonly max?: number;
    readonly pattern?: string;
  };

  /** Usage examples */
  readonly examples?: readonly unknown[];
}

/**
 * Extended return definition with properties and examples
 */
export interface IReturnDefinition extends ICapabilityReturn {
  /** Return value properties */
  readonly properties?: Record<string, { type: string; description?: string }>;

  /** Usage examples */
  readonly examples?: readonly unknown[];
}

/**
 * Agent message structure for communication
 */
export interface IAgentMessage {
  /** Message identifier */
  readonly id: string;

  /** Message type */
  readonly type: MessageType;

  /** Sender agent ID */
  readonly from: AgentId;

  /** Recipient agent ID */
  readonly to: AgentId;

  /** Message timestamp */
  readonly timestamp: Timestamp;

  /** Correlation ID for tracking */
  readonly correlationId: string;

  /** Message priority */
  readonly priority: Priority;

  /** Message payload */
  readonly payload: {
    readonly action: string;
    readonly capabilityName?: string;
    readonly parameters?: Record<string, unknown>;
  };

  /** Additional metadata */
  readonly metadata?: {
    readonly timeout?: number;
    readonly retryable?: boolean;
    readonly maxRetries?: number;
  };
}

/**
 * Agent configuration structure
 */
export interface IAgentConfiguration {
  /** Connection configuration */
  readonly connection: {
    readonly host: string;
    readonly port: number;
    readonly secure: boolean;
    readonly timeout: number;
    readonly retryAttempts: number;
    readonly keepAlive: boolean;
  };

  /** Logging configuration */
  readonly logging: {
    readonly level: string;
    readonly format: string;
    readonly destination: string;
    readonly includeMetadata: boolean;
  };

  /** Performance configuration */
  readonly performance: {
    readonly maxConcurrentTasks: number;
    readonly heartbeatInterval: number;
    readonly healthCheckInterval: number;
    readonly taskTimeout: number;
    readonly enableMetrics: boolean;
  };

  /** Capabilities configuration */
  readonly capabilities: {
    readonly enabled: readonly string[];
    readonly disabled: readonly string[];
    readonly autoLoad: boolean;
  };

  /** Security configuration */
  readonly security?: {
    readonly enableAuth: boolean;
    readonly tokenExpiration: number;
    readonly allowedOrigins: readonly string[];
    readonly rateLimit: {
      readonly requests: number;
      readonly window: number;
    };
  };
}

/**
 * Agent connection information
 */
export interface IAgentConnection {
  /** Agent identifier */
  readonly agentId: AgentId;

  /** Connection status */
  readonly status: ConnectionStatus;

  /** Connection endpoint */
  readonly endpoint: string;

  /** Connection timestamp */
  readonly connectedAt: Timestamp;

  /** Last activity timestamp */
  readonly lastActivity: Timestamp;

  /** Connection protocol */
  readonly protocol: string;

  /** Protocol version */
  readonly version: string;

  /** Supported features */
  readonly features: readonly string[];

  /** Connection metrics */
  readonly metrics: {
    readonly bytesSent: number;
    readonly bytesReceived: number;
    readonly messagesSent: number;
    readonly messagesReceived: number;
    readonly averageLatency: number;
  };

  /** Security information */
  readonly security?: {
    readonly authenticated: boolean;
    readonly tokenExpiry: Timestamp;
    readonly permissions: readonly string[];
  };
}

/**
 * Agent task information
 */
export interface IAgentTask {
  /** Task identifier */
  readonly id: string;

  /** Agent identifier */
  readonly agentId: AgentId;

  /** Capability name */
  readonly capabilityName: CapabilityName;

  /** Task status */
  readonly status: string;

  /** Task priority */
  readonly priority: Priority;

  /** Task parameters */
  readonly parameters: Record<string, unknown>;

  /** Creation timestamp */
  readonly createdAt: Timestamp;

  /** Start timestamp */
  readonly startedAt?: Timestamp;

  /** Expected duration */
  readonly expectedDuration: number;

  /** Task timeout */
  readonly timeout: number;

  /** Retry count */
  readonly retryCount: number;

  /** Maximum retries */
  readonly maxRetries: number;

  /** Correlation ID */
  readonly correlationId: string;

  /** Task metadata */
  readonly metadata?: {
    readonly source?: string;
    readonly category?: string;
    readonly tags?: readonly string[];
  };
}

/**
 * Agent performance metrics
 */
export interface IAgentPerformanceMetrics {
  /** Agent identifier */
  readonly agentId: AgentId;

  /** Metrics timestamp */
  readonly timestamp: Timestamp;

  /** Agent uptime */
  readonly uptime: number;

  /** Task metrics */
  readonly tasks: {
    readonly completed: number;
    readonly failed: number;
    readonly inProgress: number;
    readonly queued: number;
    readonly totalDuration: number;
    readonly averageDuration: number;
    readonly successRate: number;
  };

  /** Resource metrics */
  readonly resources: {
    readonly cpuUsage: number;
    readonly memoryUsage: number;
    readonly networkBytesIn: number;
    readonly networkBytesOut: number;
    readonly diskReadBytes: number;
    readonly diskWriteBytes: number;
  };

  /** Capability metrics */
  readonly capabilities: {
    readonly active: number;
    readonly total: number;
    readonly utilizationRate: number;
  };

  /** Error metrics */
  readonly errors: {
    readonly total: number;
    readonly byType: Record<string, number>;
    readonly recent: readonly {
      readonly type: string;
      readonly message: string;
      readonly timestamp: Timestamp;
    }[];
  };
}

/**
 * Agent heartbeat information
 */
export interface IAgentHeartbeat {
  /** Agent identifier */
  readonly agentId: AgentId;

  /** Heartbeat timestamp */
  readonly timestamp: Timestamp;

  /** Agent status */
  readonly status: AgentStatus;

  /** Health status */
  readonly health: HealthStatus;

  /** System metrics */
  readonly metrics?: {
    readonly cpu: number;
    readonly memory: number;
    readonly activeTasks: number;
  };
}

/**
 * Enhanced agent health with detailed checks
 */
export interface IAgentHealthExtended extends IAgentHealth {
  /** Response time */
  readonly responseTime: number;

  /** Agent uptime */
  readonly uptime: number;

  /** Consecutive failures */
  readonly consecutiveFailures: number;

  /** Health checks */
  readonly checks: {
    readonly connectivity?: {
      readonly status: string;
      readonly responseTime: number;
      readonly timestamp: Timestamp;
    };
    readonly resources?: {
      readonly status: string;
      readonly cpu: number;
      readonly memory: number;
      readonly timestamp: Timestamp;
    };
    readonly capabilities?: {
      readonly status: string;
      readonly available: number;
      readonly active: number;
      readonly timestamp: Timestamp;
    };
  };

  /** Performance metrics */
  readonly metrics?: {
    readonly tasksCompleted: number;
    readonly tasksInProgress: number;
    readonly averageTaskDuration: number;
    readonly errorRate: number;
  };
}

/**
 * Extended agent capability with examples
 */
export interface IAgentCapabilityExtended extends IAgentCapability {
  /** Parameter definitions */
  readonly parameters: readonly IParameterDefinition[];

  /** Return definition */
  readonly returns: IReturnDefinition;

  /** Usage examples */
  readonly examples?: readonly {
    readonly name: string;
    readonly input: Record<string, unknown>;
    readonly output: unknown;
  }[];
}

/**
 * Extended agent registration with additional fields
 */
export interface IAgentRegistrationExtended extends IAgentRegistration {
  /** Agent description */
  readonly description: string;

  /** Agent tags */
  readonly tags?: readonly string[];

  /** Agent configuration */
  readonly configuration?: Record<string, unknown>;

  /** Agent dependencies */
  readonly dependencies?: Record<string, string>;
}
