/**
 * Serialization types for correlation context cross-service boundary tracking
 */

import type { ICorrelationContext } from "../core/core.types.js";

/**
 * Serializable correlation context type for validation
 */
export type SerializableCorrelationContext = {
  correlationId: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  version: string;
};

/**
 * Compression options for context serialization
 */
export interface ISerializationOptions {
  /** Whether to compress the serialized context */
  compress?: boolean;
  /** Maximum size in bytes before compression is required */
  maxUncompressedSize?: number;
  /** Include metadata in serialization */
  includeMetadata?: boolean;
  /** Custom metadata filter function */
  metadataFilter?: (key: string, value: any) => boolean;
}

/**
 * Interface for correlation context serializer
 */
export interface ICorrelationContextSerializer {
  /**
   * Serialize correlation context to JSON string
   */
  serialize(context: ICorrelationContext): string;

  /**
   * Deserialize correlation context from JSON string
   */
  deserialize(serializedContext: string): ICorrelationContext;

  /**
   * Serialize context for HTTP headers (base64 encoded)
   */
  serializeForHeader(context: ICorrelationContext): string;

  /**
   * Deserialize context from HTTP header (base64 encoded)
   */
  deserializeFromHeader(headerValue: string): ICorrelationContext;

  /**
   * Create a minimal context with only correlation ID
   */
  serializeMinimal(correlationId: string): string;

  /**
   * Extract just the correlation ID from serialized context
   */
  extractCorrelationId(serializedContext: string): string;
}

/**
 * Utility functions interface for common serialization tasks
 */
export interface ICorrelationSerializationUtils {
  /**
   * Create a serializer with specific options
   */
  createSerializer: (options?: ISerializationOptions) => ICorrelationContextSerializer;

  /**
   * Quick serialize for HTTP transport
   */
  toHttpHeader: (context: ICorrelationContext) => string;

  /**
   * Quick deserialize from HTTP transport
   */
  fromHttpHeader: (headerValue: string) => ICorrelationContext;

  /**
   * Quick serialize for message queues
   */
  toMessageProperty: (context: ICorrelationContext) => string;

  /**
   * Quick deserialize from message queues
   */
  fromMessageProperty: (propertyValue: string) => ICorrelationContext;

  /**
   * Extract correlation ID only
   */
  extractId: (serializedContext: string) => string;

  /**
   * Create minimal serialized context
   */
  minimal: (correlationId: string) => string;
}
