/**
 * Service registry and discovery type definitions
 *
 * These types support the registry-based discovery pattern,
 * enabling dynamic agent registration and capability lookup.
 */

import type { AgentId, IAgentMetadata, IAgentCapability } from "./agent.types.js";
import type { Timestamp } from "./index.js";

/**
 * Registry entry for a registered agent
 */
export interface IRegistryEntry {
  /** Agent metadata */
  readonly agent: IAgentMetadata;

  /** Registration timestamp */
  readonly registeredAt: Timestamp;

  /** Last update timestamp */
  readonly lastUpdated: Timestamp;

  /** Connection information */
  readonly connection: IConnectionInfo;

  /** Health status */
  readonly health: IHealthStatus;
}

/**
 * Connection information for an agent
 */
export interface IConnectionInfo {
  /** Protocol used for communication (e.g., "amqp", "http", "grpc") */
  readonly protocol: string;

  /** Host address */
  readonly host: string;

  /** Port number */
  readonly port: number;

  /** Queue or endpoint name */
  readonly endpoint: string;

  /** Additional connection metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Health status of a registered service
 */
export interface IHealthStatus {
  /** Whether the service is healthy */
  readonly healthy: boolean;

  /** Last successful health check */
  readonly lastCheck: Timestamp;

  /** Number of consecutive failures */
  readonly failureCount: number;

  /** Error message if unhealthy */
  readonly error?: string;
}

/**
 * Query for discovering agents and capabilities
 */
export interface IDiscoveryQuery {
  /** Filter by capability name */
  readonly capability?: string;

  /** Filter by tags */
  readonly tags?: readonly string[];

  /** Filter by agent status */
  readonly status?: string;

  /** Maximum number of results */
  readonly limit?: number;

  /** Include unhealthy agents */
  readonly includeUnhealthy?: boolean;
}

/**
 * Result of a discovery query
 */
export interface IDiscoveryResult {
  /** Matching agents */
  readonly agents: readonly IRegistryEntry[];

  /** Total count of matching agents */
  readonly totalCount: number;

  /** Query execution time in milliseconds */
  readonly queryTime: number;
}

/**
 * Registry statistics
 */
export interface IRegistryStats {
  /** Total number of registered agents */
  readonly totalAgents: number;

  /** Number of healthy agents */
  readonly healthyAgents: number;

  /** Number of unhealthy agents */
  readonly unhealthyAgents: number;

  /** Total number of unique capabilities */
  readonly totalCapabilities: number;

  /** Registry uptime in seconds */
  readonly uptime: number;

  /** Last registry update */
  readonly lastUpdate: Timestamp;
}

/**
 * Agent deregistration request
 */
export interface IDeregistrationRequest {
  /** Agent to deregister */
  readonly agentId: AgentId;

  /** Reason for deregistration */
  readonly reason: string;

  /** Whether to gracefully shutdown */
  readonly graceful: boolean;
}

/**
 * Capability match for routing decisions
 */
export interface ICapabilityMatch {
  /** Matched agent */
  readonly agent: IAgentMetadata;

  /** Matched capability */
  readonly capability: IAgentCapability;

  /** Match score (0-1) */
  readonly score: number;

  /** Connection info for this agent */
  readonly connection: IConnectionInfo;
}

/**
 * Registry event types
 */
export type RegistryEventType =
  | "agent.registered"
  | "agent.deregistered"
  | "agent.updated"
  | "capability.added"
  | "capability.removed"
  | "health.changed";

/**
 * Registry event payload
 */
export interface IRegistryEvent {
  /** Event type */
  readonly type: RegistryEventType;

  /** Agent involved in the event */
  readonly agentId: AgentId;

  /** Event timestamp */
  readonly timestamp: Timestamp;

  /** Event-specific data */
  readonly data: Record<string, unknown>;
}
