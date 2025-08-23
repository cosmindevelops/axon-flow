/**
 * Error serialization implementations
 */

import type { ISerializedError } from "../base/base-error.types.js";
import type {
  IErrorSerializer as _IErrorSerializer,
  IErrorDeserializer as _IErrorDeserializer,
  IErrorSerializerBidirectional,
  ISerializationOptions,
  IDeserializationOptions,
  ICompactError,
  ICompressedError as _ICompressedError,
  ISerializationContext,
  IEnvironmentCompatibility,
  ISerializationRegistry,
} from "./serialization.types.js";
import { SerializationFormat } from "./serialization.types.js";
import type { IBaseAxonError } from "../base/base-error.types.js";
import { BaseAxonError } from "../base/base-error.classes.js";
import { ErrorSeverity, ErrorCategory } from "../base/base-error.types.js";
import { validateSerializedError } from "../base/base-error.schemas.js";

/**
 * Detect environment capabilities
 */
function detectEnvironment(): IEnvironmentCompatibility {
  const isNode = typeof process !== "undefined" && process.versions?.node;
  const _isBrowser = typeof window !== "undefined";

  return {
    supportsBinary: Boolean(isNode),
    supportsCompression: Boolean(isNode),
    supportsStreaming: Boolean(isNode),
    maxStringLength: isNode ? 1024 * 1024 * 100 : 1024 * 1024 * 10, // 100MB node, 10MB browser
    maxObjectDepth: 100,
  };
}

/**
 * Base error serializer implementation
 */
export abstract class BaseErrorSerializer implements IErrorSerializerBidirectional {
  public abstract readonly format: SerializationFormat;
  protected compatibility: IEnvironmentCompatibility;

  constructor() {
    this.compatibility = detectEnvironment();
  }

  public abstract serialize(error: Error | IBaseAxonError, options?: ISerializationOptions): string | Buffer;

  public abstract serializeToObject(error: Error | IBaseAxonError, options?: ISerializationOptions): ISerializedError;

  public abstract deserialize(
    data: string | Buffer | ISerializedError,
    options?: IDeserializationOptions,
  ): IBaseAxonError;

  public abstract canDeserialize(data: unknown): boolean;

  /**
   * Check if error is IBaseAxonError
   */
  protected isAxonError(error: Error | IBaseAxonError): error is IBaseAxonError {
    return "context" in error && "severity" in error && "category" in error;
  }

  /**
   * Create serialization context
   */
  protected createContext(options: ISerializationOptions = {}): ISerializationContext {
    return {
      depth: 0,
      visitedObjects: new WeakSet(),
      options: {
        includeStack: true,
        includeContext: true,
        includeCause: true,
        maxDepth: 10,
        ...options,
      },
      compatibility: this.compatibility,
    };
  }
}

/**
 * JSON error serializer
 */
export class JSONErrorSerializer extends BaseErrorSerializer {
  public readonly format = SerializationFormat.JSON;

  public serialize(error: Error | IBaseAxonError, options: ISerializationOptions = {}): string {
    const serialized = this.serializeToObject(error, options);
    return options.prettify ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
  }

  public serializeToObject(error: Error | IBaseAxonError, options: ISerializationOptions = {}): ISerializedError {
    const context = this.createContext(options);
    return this.serializeErrorObject(error, context);
  }

  private serializeErrorObject(error: Error | IBaseAxonError, context: ISerializationContext): ISerializedError {
    // Check depth limit
    if (context.depth >= (context.options.maxDepth ?? 10)) {
      return {
        name: "MaxDepthError",
        message: "Maximum serialization depth exceeded",
        code: "MAX_DEPTH",
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.SYSTEM,
        context: {
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.SYSTEM,
        },
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      };
    }

    // Check for circular references
    if (typeof error === "object" && error !== null) {
      if (context.visitedObjects.has(error)) {
        return {
          name: "CircularReferenceError",
          message: "Circular reference detected",
          code: "CIRCULAR_REF",
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.SYSTEM,
          context: {
            timestamp: new Date().toISOString(),
            severity: ErrorSeverity.WARNING,
            category: ErrorCategory.SYSTEM,
          },
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        };
      }
      context.visitedObjects.add(error);
    }

    context.depth++;

    try {
      if (this.isAxonError(error)) {
        const serialized: ISerializedError = {
          name: error.name,
          message: error.message,
          code: error.code,
          severity: error.severity,
          category: error.category,
          context: context.options.includeContext
            ? error.context
            : {
                timestamp: error.context.timestamp,
                severity: error.severity,
                category: error.category,
              },
          timestamp: error.createdAt.toISOString(),
          version: "1.0.0",
        };

        if (context.options.includeStack && error.stack) {
          serialized.stack = error.stack;
        }

        if (context.options.includeCause && error.cause) {
          serialized.cause = this.serializeErrorObject(error.cause, context);
        }

        return serialized;
      } else {
        // Regular Error object
        const regularSerialized: ISerializedError = {
          name: error.name,
          message: error.message,
          code: "UNKNOWN",
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.UNKNOWN,
          context: {
            timestamp: new Date().toISOString(),
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.UNKNOWN,
          },
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        };

        if (context.options.includeStack && error.stack) {
          regularSerialized.stack = error.stack;
        }

        return regularSerialized;
      }
    } finally {
      context.depth--;
    }
  }

  public deserialize(data: string | Buffer | ISerializedError, options: IDeserializationOptions = {}): IBaseAxonError {
    let serialized: ISerializedError;

    if (typeof data === "string") {
      try {
        serialized = JSON.parse(data);
      } catch (_err) {
        throw new BaseAxonError("Failed to parse JSON error data", "DESERIALIZATION_ERROR", {
          metadata: { parseError: (_err as Error).message },
        });
      }
    } else if (Buffer.isBuffer(data)) {
      try {
        serialized = JSON.parse(data.toString("utf-8"));
      } catch (_err) {
        throw new BaseAxonError("Failed to parse buffer error data", "DESERIALIZATION_ERROR", {
          metadata: { parseError: (_err as Error).message },
        });
      }
    } else {
      serialized = data;
    }

    // Validate schema if requested
    if (options.validateSchema) {
      const validation = validateSerializedError(serialized);
      if (!validation.success) {
        throw new BaseAxonError("Invalid serialized error format", "VALIDATION_ERROR", {
          metadata: { validationErrors: validation.error.issues },
        });
      }
    }

    return this.deserializeErrorObject(serialized, options);
  }

  private deserializeErrorObject(
    serialized: ISerializedError,
    options: IDeserializationOptions,
    depth = 0,
  ): IBaseAxonError {
    // Check depth limit
    if (depth >= (options.maxDepth ?? 10)) {
      return new BaseAxonError("Maximum deserialization depth exceeded", "MAX_DEPTH", {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.SYSTEM,
      });
    }

    const error = new BaseAxonError(serialized.message, serialized.code, {
      ...serialized.context,
      severity: serialized.severity,
      category: serialized.category,
    });

    // Restore stack if available and requested
    if (options.restoreStack && serialized.stack) {
      (error as any).stack = serialized.stack;
    }

    // Restore cause if available
    if (serialized.cause) {
      (error as any).cause = this.deserializeErrorObject(serialized.cause, options, depth + 1);
    }

    return error;
  }

  public canDeserialize(data: unknown): boolean {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return this.isSerializedError(parsed);
      } catch {
        return false;
      }
    }
    return this.isSerializedError(data);
  }

  private isSerializedError(data: unknown): data is ISerializedError {
    return (
      typeof data === "object" &&
      data !== null &&
      "name" in data &&
      "message" in data &&
      "code" in data &&
      "version" in data
    );
  }
}

/**
 * Compact error serializer for minimal size
 */
export class CompactErrorSerializer extends BaseErrorSerializer {
  public readonly format = SerializationFormat.COMPACT;

  public serialize(error: Error | IBaseAxonError, options: ISerializationOptions = {}): string {
    const compact = this.toCompact(error, options);
    return JSON.stringify(compact);
  }

  public serializeToObject(error: Error | IBaseAxonError, options: ISerializationOptions = {}): ISerializedError {
    // Convert to full format for compatibility
    const jsonSerializer = new JSONErrorSerializer();
    return jsonSerializer.serializeToObject(error, options);
  }

  private toCompact(error: Error | IBaseAxonError, options: ISerializationOptions = {}): ICompactError {
    const compact: ICompactError = {
      n: error.name,
      m: error.message,
      c: this.isAxonError(error) ? error.code : "UNKNOWN",
      s: this.isAxonError(error) ? error.severity[0]! : "e", // First letter of severity
      t: new Date().getTime().toString(36), // Compact timestamp
    };

    if (options.includeStack && error.stack) {
      compact.k = error.stack;
    }

    if (options.includeCause && this.isAxonError(error) && error.cause) {
      compact.x = this.toCompact(error.cause, options);
    }

    return compact;
  }

  public deserialize(data: string | Buffer | ISerializedError, options: IDeserializationOptions = {}): IBaseAxonError {
    let compact: ICompactError;

    if (typeof data === "string") {
      try {
        compact = JSON.parse(data);
      } catch (_err) {
        throw new BaseAxonError("Failed to parse compact error data", "DESERIALIZATION_ERROR");
      }
    } else if (Buffer.isBuffer(data)) {
      try {
        compact = JSON.parse(data.toString("utf-8"));
      } catch (_err) {
        throw new BaseAxonError("Failed to parse compact buffer data", "DESERIALIZATION_ERROR");
      }
    } else {
      // If it's already ISerializedError, use JSON deserializer
      const jsonSerializer = new JSONErrorSerializer();
      return jsonSerializer.deserialize(data, options);
    }

    return this.fromCompact(compact, options);
  }

  private fromCompact(compact: ICompactError, options: IDeserializationOptions): IBaseAxonError {
    const severityMap: Record<string, ErrorSeverity> = {
      c: ErrorSeverity.CRITICAL,
      e: ErrorSeverity.ERROR,
      w: ErrorSeverity.WARNING,
      i: ErrorSeverity.INFO,
    };

    const error = new BaseAxonError(compact.m, compact.c, {
      severity: severityMap[compact.s] ?? ErrorSeverity.ERROR,
      timestamp: new Date(parseInt(compact.t, 36)).toISOString(),
    });

    if (options.restoreStack && compact.k) {
      (error as any).stack = compact.k;
    }

    if (compact.x) {
      (error as any).cause = this.fromCompact(compact.x, options);
    }

    return error;
  }

  public canDeserialize(data: unknown): boolean {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return this.isCompactError(parsed);
      } catch {
        return false;
      }
    }
    return this.isCompactError(data);
  }

  private isCompactError(data: unknown): data is ICompactError {
    return (
      typeof data === "object" &&
      data !== null &&
      "n" in data &&
      "m" in data &&
      "c" in data &&
      "s" in data &&
      "t" in data
    );
  }
}

/**
 * Error serialization registry
 */
export class SerializationRegistry implements ISerializationRegistry {
  private serializers = new Map<string, IErrorSerializerBidirectional>();

  constructor() {
    // Register default serializers
    this.register("json", new JSONErrorSerializer());
    this.register("compact", new CompactErrorSerializer());
  }

  public register(errorType: string, serializer: IErrorSerializerBidirectional): void {
    this.serializers.set(errorType, serializer);
  }

  public unregister(errorType: string): boolean {
    return this.serializers.delete(errorType);
  }

  public getSerializer(errorType: string): IErrorSerializerBidirectional | undefined {
    return this.serializers.get(errorType);
  }

  public hasSerializer(errorType: string): boolean {
    return this.serializers.has(errorType);
  }

  /**
   * Auto-detect and deserialize
   */
  public autoDeserialize(data: unknown, options?: IDeserializationOptions): IBaseAxonError {
    for (const serializer of Array.from(this.serializers.values())) {
      if (serializer.canDeserialize(data)) {
        return serializer.deserialize(data as any, options);
      }
    }

    throw new BaseAxonError("No suitable deserializer found for data", "DESERIALIZATION_ERROR", {
      metadata: { dataType: typeof data },
    });
  }
}

// Global registry instance
export const errorSerializationRegistry = new SerializationRegistry();
