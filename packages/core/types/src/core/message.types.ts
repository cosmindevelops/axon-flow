/**
 * Message pattern type definitions for event-driven architecture
 *
 * These types support CQRS and event sourcing patterns,
 * defining the structure of messages sent through RabbitMQ.
 */

import type { AgentId } from "./agent.types.js";
import type { CorrelationId, Timestamp, Version } from "./index.js";

/**
 * Unique identifier for a message
 */
export type MessageId = string & { __brand: "MessageId" };

/**
 * Message types following CQRS pattern
 */
export type MessageType = "command" | "query" | "event" | "reply" | "error";

/**
 * Base message interface for all message types
 *
 * All messages in the system extend this interface,
 * ensuring consistent structure for routing and tracing.
 */
export interface IMessage<TPayload = unknown> {
  /** Unique message identifier */
  readonly id: MessageId;

  /** Correlation ID for request tracing */
  readonly correlationId: CorrelationId;

  /** Message type for routing */
  readonly type: MessageType;

  /** Message payload */
  readonly payload: TPayload;

  /** Message metadata */
  readonly metadata: IMessageMetadata;

  /** Message creation timestamp */
  readonly timestamp: Timestamp;
}

/**
 * Message metadata for routing and processing
 */
export interface IMessageMetadata {
  /** Source agent that sent the message */
  readonly source: AgentId;

  /** Target agent(s) for the message */
  readonly target?: AgentId | readonly AgentId[];

  /** Message version for compatibility */
  readonly version: Version;

  /** Message priority */
  readonly priority?: number;

  /** Message expiration time */
  readonly expiresAt?: Timestamp;

  /** Custom headers for routing */
  readonly headers?: Record<string, string>;

  /** Retry attempt number */
  readonly retryCount?: number;

  /** Original message ID if this is a retry */
  readonly originalMessageId?: MessageId;
}

/**
 * Command message for requesting actions
 *
 * Commands represent intentions to change system state.
 */
export interface ICommand<TPayload = unknown> extends IMessage<TPayload> {
  readonly type: "command";
  readonly commandName: string;
  readonly expectsReply: boolean;
}

/**
 * Query message for requesting data
 *
 * Queries request information without changing state.
 */
export interface IQuery<TPayload = unknown> extends IMessage<TPayload> {
  readonly type: "query";
  readonly queryName: string;
  readonly resultType: string;
}

/**
 * Event message for notifying about state changes
 *
 * Events represent facts about what has happened.
 */
export interface IEvent<TPayload = unknown> extends IMessage<TPayload> {
  readonly type: "event";
  readonly eventName: string;
  readonly aggregateId?: string;
  readonly sequenceNumber?: number;
}

/**
 * Reply message for command/query responses
 */
export interface IReply<TPayload = unknown> extends IMessage<TPayload> {
  readonly type: "reply";
  readonly requestId: MessageId;
  readonly success: boolean;
  readonly error?: IMessageError;
}

/**
 * Error message for failure notifications
 */
export interface IErrorMessage extends IMessage<IMessageError> {
  readonly type: "error";
  readonly requestId?: MessageId;
  readonly severity: "warning" | "error" | "critical";
}

/**
 * Message error details
 */
export interface IMessageError {
  /** Error code */
  readonly code: string;

  /** Error message */
  readonly message: string;

  /** Error details */
  readonly details?: Record<string, unknown>;

  /** Stack trace for debugging */
  readonly stack?: string;

  /** Whether the operation can be retried */
  readonly retryable?: boolean;
}

/**
 * Message routing configuration
 */
export interface IMessageRoute {
  /** Pattern to match messages */
  readonly pattern: string;

  /** Exchange name in RabbitMQ */
  readonly exchange: string;

  /** Routing key */
  readonly routingKey: string;

  /** Queue name */
  readonly queue: string;

  /** Whether to use topic exchange */
  readonly useTopic: boolean;

  /** Dead letter configuration */
  readonly deadLetter?: IDeadLetterConfig;
}

/**
 * Dead letter queue configuration
 */
export interface IDeadLetterConfig {
  /** Dead letter exchange */
  readonly exchange: string;

  /** Dead letter routing key */
  readonly routingKey: string;

  /** Maximum retry attempts before dead lettering */
  readonly maxRetries: number;

  /** TTL for messages in milliseconds */
  readonly ttl: number;
}

/**
 * Message acknowledgment types
 */
export type AcknowledgmentType = "ack" | "nack" | "reject";

/**
 * Message acknowledgment
 */
export interface IMessageAcknowledgment {
  /** Message being acknowledged */
  readonly messageId: MessageId;

  /** Acknowledgment type */
  readonly type: AcknowledgmentType;

  /** Whether to requeue (for nack/reject) */
  readonly requeue?: boolean;

  /** Reason for nack/reject */
  readonly reason?: string;
}

/**
 * Message batch for bulk operations
 */
export interface IMessageBatch<TPayload = unknown> {
  /** Batch identifier */
  readonly batchId: string;

  /** Messages in the batch */
  readonly messages: readonly IMessage<TPayload>[];

  /** Total message count */
  readonly count: number;

  /** Batch metadata */
  readonly metadata: Record<string, unknown>;
}

/**
 * Message envelope for wire format
 */
export interface IMessageEnvelope {
  /** Serialized message content */
  readonly content: string;

  /** Content type (e.g., "application/json") */
  readonly contentType: string;

  /** Content encoding (e.g., "gzip") */
  readonly contentEncoding?: string;

  /** Message properties for RabbitMQ */
  readonly properties: IMessageProperties;
}

/**
 * RabbitMQ message properties
 */
export interface IMessageProperties {
  /** Delivery mode (1=non-persistent, 2=persistent) */
  readonly deliveryMode?: 1 | 2;

  /** Message priority (0-9) */
  readonly priority?: number;

  /** Correlation ID */
  readonly correlationId?: string;

  /** Reply-to queue */
  readonly replyTo?: string;

  /** Message expiration */
  readonly expiration?: string;

  /** Message ID */
  readonly messageId?: string;

  /** Timestamp */
  readonly timestamp?: number;

  /** Message type */
  readonly type?: string;

  /** Application ID */
  readonly appId?: string;

  /** Custom headers */
  readonly headers?: Record<string, unknown>;
}
