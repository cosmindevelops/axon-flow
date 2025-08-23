/**
 * Error serialization type definitions
 */

import type { IBaseAxonError, ISerializedError } from "../base/base-error.types.js";

/**
 * Serialization format options
 */
export enum SerializationFormat {
  JSON = "json",
  COMPACT = "compact",
  VERBOSE = "verbose",
  BINARY = "binary",
}

/**
 * Serialization options
 */
export interface ISerializationOptions {
  format?: SerializationFormat;
  includeStack?: boolean;
  includeContext?: boolean;
  includeCause?: boolean;
  maxDepth?: number;
  compress?: boolean;
  sanitize?: boolean;
  prettify?: boolean;
}

/**
 * Deserialization options
 */
export interface IDeserializationOptions {
  validateSchema?: boolean;
  restoreStack?: boolean;
  restoreContext?: boolean;
  maxDepth?: number;
}

/**
 * Error serializer interface
 */
export interface IErrorSerializer {
  serialize(error: Error | IBaseAxonError, options?: ISerializationOptions): string | Buffer;

  serializeToObject(error: Error | IBaseAxonError, options?: ISerializationOptions): ISerializedError;
}

/**
 * Error deserializer interface
 */
export interface IErrorDeserializer {
  deserialize(data: string | Buffer | ISerializedError, options?: IDeserializationOptions): IBaseAxonError;

  canDeserialize(data: unknown): boolean;
}

/**
 * Bidirectional error serializer
 */
export interface IErrorSerializerBidirectional extends IErrorSerializer, IErrorDeserializer {
  readonly format: SerializationFormat;
}

/**
 * Compressed error format
 */
export interface ICompressedError {
  format: "compressed";
  algorithm: "gzip" | "deflate" | "brotli";
  data: string; // Base64 encoded compressed data
  originalSize: number;
  compressedSize: number;
}

/**
 * Compact error format for minimal overhead
 */
export interface ICompactError {
  n: string; // name
  m: string; // message
  c: string; // code
  s: string; // severity
  t: string; // timestamp
  k?: string; // stack (optional)
  x?: ICompactError; // cause (optional)
  e?: ICompactError[]; // errors (for aggregate, optional)
}

/**
 * Serialization statistics
 */
export interface ISerializationStats {
  totalSerialized: number;
  totalDeserialized: number;
  averageSerializationTime: number;
  averageDeserializationTime: number;
  averageSize: number;
  compressionRatio?: number;
  errors: number;
}

/**
 * Cross-environment compatibility flags
 */
export interface IEnvironmentCompatibility {
  supportsBinary?: boolean;
  supportsCompression?: boolean;
  supportsStreaming?: boolean;
  maxStringLength?: number;
  maxObjectDepth?: number;
}

/**
 * Serialization context for maintaining state
 */
export interface ISerializationContext {
  depth: number;
  visitedObjects: WeakSet<object>;
  options: ISerializationOptions;
  compatibility: IEnvironmentCompatibility;
}

/**
 * Error transformation pipeline
 */
export interface IErrorTransformer {
  transform(error: ISerializedError): ISerializedError;
  reverse(error: ISerializedError): ISerializedError;
}

/**
 * Serialization registry for custom error types
 */
export interface ISerializationRegistry {
  register(errorType: string, serializer: IErrorSerializerBidirectional): void;

  unregister(errorType: string): boolean;

  getSerializer(errorType: string): IErrorSerializerBidirectional | undefined;

  hasSerializer(errorType: string): boolean;
}

/**
 * Network-optimized error format
 */
export interface INetworkError {
  version: string;
  timestamp: number; // Unix timestamp for smaller size
  errors: Array<{
    code: string;
    severity: number; // Numeric for smaller size
    message?: string; // Optional for known codes
    context?: Record<string, unknown>;
  }>;
}
