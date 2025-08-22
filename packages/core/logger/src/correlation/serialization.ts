/**
 * Correlation context serialization utilities for cross-service boundary tracking
 */

import { z } from "zod";
import type { ICorrelationContext } from "./correlation.types.js";

/**
 * Serializable correlation context schema for validation
 */
export const SERIALIZABLE_CORRELATION_CONTEXT_SCHEMA = z.object({
  correlationId: z.string().uuid(),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime().optional(),
  version: z.string().default("1.0"),
});

export type SerializableCorrelationContext = z.infer<typeof SERIALIZABLE_CORRELATION_CONTEXT_SCHEMA>;

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
 * Default serialization options
 */
const DEFAULT_OPTIONS: Required<ISerializationOptions> = {
  compress: false,
  maxUncompressedSize: 1024, // 1KB
  includeMetadata: true,
  metadataFilter: () => true,
};

/**
 * Correlation context serializer for cross-service communication
 */
export class CorrelationContextSerializer {
  private options: Required<ISerializationOptions>;

  constructor(options: ISerializationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Serialize correlation context to JSON string
   */
  serialize(context: ICorrelationContext): string {
    try {
      // Filter metadata if needed
      let metadata = context.metadata;
      if (metadata && this.options.includeMetadata) {
        metadata = Object.entries(metadata).reduce(
          (filtered, [key, value]) => {
            if (this.options.metadataFilter(key, value)) {
              filtered[key] = this.sanitizeValue(value);
            }
            return filtered;
          },
          {} as Record<string, any>,
        );
      } else if (!this.options.includeMetadata) {
        metadata = undefined;
      }

      // Create serializable context
      const serializableContext: SerializableCorrelationContext = {
        correlationId: context.id,
        metadata,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      // Validate the context
      const validatedContext = SERIALIZABLE_CORRELATION_CONTEXT_SCHEMA.parse(serializableContext);

      // Serialize to JSON
      const jsonString = JSON.stringify(validatedContext);

      // Check if compression is needed
      if (this.shouldCompress(jsonString)) {
        return this.compress(jsonString);
      }

      return jsonString;
    } catch (error) {
      throw new Error(
        `Failed to serialize correlation context: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Deserialize correlation context from JSON string
   */
  deserialize(serializedContext: string): ICorrelationContext {
    try {
      // Check if data is compressed
      const jsonString = this.isCompressed(serializedContext) ? this.decompress(serializedContext) : serializedContext;

      // Parse JSON
      const parsed = JSON.parse(jsonString);

      // Validate the parsed context
      const validatedContext = SERIALIZABLE_CORRELATION_CONTEXT_SCHEMA.parse(parsed);

      // Convert back to ICorrelationContext
      const context: ICorrelationContext = {
        id: validatedContext.correlationId,
        createdAt: new Date(),
        ...(validatedContext.metadata !== undefined && { metadata: validatedContext.metadata }),
      };

      return context;
    } catch (error) {
      throw new Error(
        `Failed to deserialize correlation context: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Serialize context for HTTP headers (base64 encoded)
   */
  serializeForHeader(context: ICorrelationContext): string {
    const serialized = this.serialize(context);
    return Buffer.from(serialized, "utf8").toString("base64");
  }

  /**
   * Deserialize context from HTTP header (base64 encoded)
   */
  deserializeFromHeader(headerValue: string): ICorrelationContext {
    const serialized = Buffer.from(headerValue, "base64").toString("utf8");
    return this.deserialize(serialized);
  }

  /**
   * Create a minimal context with only correlation ID
   */
  serializeMinimal(correlationId: string): string {
    const minimalContext: SerializableCorrelationContext = {
      correlationId,
      version: "1.0",
    };

    return JSON.stringify(minimalContext);
  }

  /**
   * Extract just the correlation ID from serialized context
   */
  extractCorrelationId(serializedContext: string): string {
    try {
      const context = this.deserialize(serializedContext);
      return context.id;
    } catch {
      // Fallback: try to parse as minimal context
      try {
        const parsed = JSON.parse(serializedContext);
        if (parsed.correlationId && typeof parsed.correlationId === "string") {
          return parsed.correlationId;
        }
      } catch {
        // Silent fallback
      }
      throw new Error("Unable to extract correlation ID from serialized context");
    }
  }

  /**
   * Sanitize metadata values for serialization
   */
  private sanitizeValue(value: any): any {
    // Remove circular references and non-serializable objects
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "function") {
      return "[Function]";
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (typeof value === "object") {
      try {
        // Test if object is serializable
        JSON.stringify(value);
        return value;
      } catch {
        return "[Non-serializable Object]";
      }
    }

    return value;
  }

  /**
   * Check if compression should be applied
   */
  private shouldCompress(jsonString: string): boolean {
    return this.options.compress || jsonString.length > this.options.maxUncompressedSize;
  }

  /**
   * Simple compression using base64 encoding (can be enhanced with actual compression)
   */
  private compress(data: string): string {
    // For now, use base64 encoding as a simple "compression"
    // In production, you might want to use actual compression like gzip
    const compressed = Buffer.from(data, "utf8").toString("base64");
    return `compressed:${compressed}`;
  }

  /**
   * Check if data is compressed
   */
  private isCompressed(data: string): boolean {
    return data.startsWith("compressed:");
  }

  /**
   * Decompress data
   */
  private decompress(compressedData: string): string {
    if (!this.isCompressed(compressedData)) {
      return compressedData;
    }

    const compressed = compressedData.replace("compressed:", "");
    return Buffer.from(compressed, "base64").toString("utf8");
  }
}

/**
 * Singleton instance for convenience
 */
export const correlationSerializer = new CorrelationContextSerializer();

/**
 * Utility functions for common serialization tasks
 */
export const CORRELATION_SERIALIZATION_UTILS = {
  /**
   * Create a serializer with specific options
   */
  createSerializer: (options: ISerializationOptions = {}) => new CorrelationContextSerializer(options),

  /**
   * Quick serialize for HTTP transport
   */
  toHttpHeader: (context: ICorrelationContext) => correlationSerializer.serializeForHeader(context),

  /**
   * Quick deserialize from HTTP transport
   */
  fromHttpHeader: (headerValue: string) => correlationSerializer.deserializeFromHeader(headerValue),

  /**
   * Quick serialize for message queues
   */
  toMessageProperty: (context: ICorrelationContext) => correlationSerializer.serialize(context),

  /**
   * Quick deserialize from message queues
   */
  fromMessageProperty: (propertyValue: string) => correlationSerializer.deserialize(propertyValue),

  /**
   * Extract correlation ID only
   */
  extractId: (serializedContext: string) => correlationSerializer.extractCorrelationId(serializedContext),

  /**
   * Create minimal serialized context
   */
  minimal: (correlationId: string) => correlationSerializer.serializeMinimal(correlationId),
};
