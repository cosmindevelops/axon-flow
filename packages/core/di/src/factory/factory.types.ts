/**
 * Factory pattern type definitions
 *
 * Defines interfaces and types for factory-based object creation within the DI container.
 * Supports both simple factories and abstract factory patterns with full provider integration.
 */

import type { DIToken, ContainerLifecycle, IResolutionContext } from "../container/container.types.js";

// TODO: Fix @axon/types import - using interfaces for provider types
interface IAuthProvider {
  readonly name: string;
  authenticate(credentials: unknown): Promise<unknown>;
  validate(token: string): Promise<unknown>;
  refresh(refreshToken: string): Promise<unknown>;
  revoke(token: string): Promise<void>;
  getUserInfo(token: string): Promise<unknown>;
}

interface IBillingProvider {
  readonly name: string;
  createSubscription(plan: unknown): Promise<unknown>;
  processPayment(payment: unknown): Promise<unknown>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  updateSubscription(subscriptionId: string, plan: unknown): Promise<unknown>;
  getSubscription(subscriptionId: string): Promise<unknown>;
  listInvoices(customerId: string): Promise<readonly unknown[]>;
  processRefund(paymentId: string, amount?: number): Promise<unknown>;
}

interface IStorageProvider {
  readonly name: string;
  store(key: string, data: Buffer, options?: unknown): Promise<unknown>;
  retrieve(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string, options?: unknown): Promise<readonly string[]>;
  getPresignedUrl(key: string, operation: "get" | "put", expiresIn: number): Promise<string>;
  copy(sourceKey: string, destinationKey: string): Promise<void>;
  getMetadata(key: string): Promise<unknown>;
}

interface ILLMProvider {
  readonly name: string;
  generate(prompt: string, options?: unknown): Promise<unknown>;
  embed(text: string | readonly string[]): Promise<readonly number[][]>;
  tokenize(text: string): Promise<readonly string[]>;
  countTokens(text: string): Promise<number>;
  stream(prompt: string, options?: unknown): AsyncGenerator<unknown>;
  listModels(): Promise<readonly unknown[]>;
}

/**
 * Core factory interface for creating instances
 */
export interface IFactory<T> {
  /** Factory name for identification */
  readonly name: string;

  /** Create a new instance */
  create(...args: unknown[]): T | Promise<T>;

  /** Dispose factory and cleanup resources (optional) */
  dispose?(): void | Promise<void>;

  /** Check if factory can create instances (optional) */
  canCreate?(...args: unknown[]): boolean;

  /** Get factory metadata (optional) */
  getMetadata?(): IFactoryMetadata;
}

/**
 * Factory metadata for registration and introspection
 */
export interface IFactoryMetadata {
  /** Factory type identifier */
  readonly factoryType: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Performance statistics */
  readonly performance?: IFactoryPerformanceMetrics;

  /** Custom metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory performance metrics
 */
export interface IFactoryPerformanceMetrics {
  /** Total instances created */
  totalCreated: number;

  /** Average creation time in milliseconds */
  averageCreationTime: number;

  /** Peak creation time in milliseconds */
  peakCreationTime: number;

  /** Last creation time in milliseconds */
  lastCreationTime: number;

  /** Creation success rate (0-1) */
  successRate: number;

  /** Memory usage estimate in bytes */
  estimatedMemoryUsage: number;
}

/**
 * Abstract factory interface for creating families of related objects
 */
export interface IAbstractFactory {
  /** Factory name for identification */
  readonly name: string;

  /** Get factory for specific type */
  getFactory<T>(token: DIToken<T>): IFactory<T> | undefined;

  /** List all available factories */
  listFactories(): readonly DIToken[];

  /** Check if factory supports a type */
  supports<T>(token: DIToken<T>): boolean;

  /** Dispose all factories and cleanup resources */
  dispose?(): void | Promise<void>;
}

/**
 * Factory registry interface for managing factory registrations
 */
export interface IFactoryRegistry {
  /** Register a factory */
  register<T>(token: DIToken<T>, factory: IFactory<T>, options?: IFactoryRegistrationOptions): void;

  /** Register an abstract factory */
  registerAbstractFactory(name: string, abstractFactory: IAbstractFactory): void;

  /** Get a factory by token */
  get<T>(token: DIToken<T>): IFactory<T> | undefined;

  /** Get an abstract factory by name */
  getAbstractFactory(name: string): IAbstractFactory | undefined;

  /** Check if a factory is registered */
  has<T>(token: DIToken<T>): boolean;

  /** Unregister a factory */
  unregister<T>(token: DIToken<T>): boolean;

  /** Unregister an abstract factory */
  unregisterAbstractFactory(name: string): boolean;

  /** Get all registered factory tokens */
  getTokens(): readonly DIToken[];

  /** Get all registered abstract factory names */
  getAbstractFactoryNames(): readonly string[];

  /** Clear all registrations */
  clear(): void;

  /** Get registry metrics */
  getMetrics(): IFactoryRegistryMetrics;
}

/**
 * Factory registration options
 */
export interface IFactoryRegistrationOptions {
  /** Factory lifecycle management */
  lifecycle?: ContainerLifecycle;

  /** Enable performance tracking */
  enableMetrics?: boolean;

  /** Factory priority for resolution (higher = preferred) */
  priority?: number;

  /** Tags for factory categorization */
  tags?: readonly string[];

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Cache created instances */
  enableCaching?: boolean;

  /** Maximum cache size */
  maxCacheSize?: number;
}

/**
 * Factory registry metrics
 */
export interface IFactoryRegistryMetrics {
  /** Total registered factories */
  totalFactories: number;

  /** Total registered abstract factories */
  totalAbstractFactories: number;

  /** Total instances created */
  totalInstancesCreated: number;

  /** Average factory creation time */
  averageFactoryCreationTime: number;

  /** Cache hit ratio */
  cacheHitRatio: number;

  /** Memory usage by factories */
  factoryMemoryUsage: number;
}

/**
 * Factory resolver interface for container integration
 */
export interface IFactoryResolver {
  /** Resolve instance using factory */
  resolve<T>(token: DIToken<T>, context?: IResolutionContext): T | Promise<T>;

  /** Try to resolve using factory (returns undefined if not found) */
  tryResolve<T>(token: DIToken<T>, context?: IResolutionContext): T | Promise<T> | undefined;

  /** Check if token can be resolved by factory */
  canResolve<T>(token: DIToken<T>): boolean;

  /** Set factory registry */
  setRegistry(registry: IFactoryRegistry): void;

  /** Get performance metrics */
  getMetrics(): IFactoryResolverMetrics;
}

/**
 * Factory resolver metrics
 */
export interface IFactoryResolverMetrics {
  /** Total resolutions performed */
  totalResolutions: number;

  /** Successful resolutions */
  successfulResolutions: number;

  /** Average resolution time */
  averageResolutionTime: number;

  /** Factory hit ratio */
  factoryHitRatio: number;
}

/**
 * Factory configuration for container integration
 */
export interface IFactoryConfig {
  /** Enable factory caching globally */
  enableCaching?: boolean;

  /** Default cache size for factories */
  defaultCacheSize?: number;

  /** Enable performance metrics */
  enableMetrics?: boolean;

  /** Maximum factory creation time in milliseconds */
  maxCreationTime?: number;

  /** Enable automatic factory disposal */
  autoDispose?: boolean;

  /** Factory resolution timeout in milliseconds */
  resolutionTimeout?: number;
}

/**
 * Factory context for creation operations
 */
export interface IFactoryContext {
  /** Resolution context from container */
  resolutionContext?: IResolutionContext;

  /** Factory configuration */
  config: IFactoryConfig;

  /** Creation timestamp */
  createdAt: Date;

  /** Correlation ID for tracking */
  correlationId?: string;

  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Factory error interface
 */
export interface IFactoryError extends Error {
  /** Factory that caused the error */
  factory?: IFactory<unknown>;

  /** Factory context when error occurred */
  factoryContext?: IFactoryContext;

  /** Error correlation ID */
  correlationId?: string;
}

/**
 * Factory creation error
 */
export interface IFactoryCreationError extends IFactoryError {
  /** Arguments passed to factory */
  factoryArgs?: unknown[];

  /** Creation attempt timestamp */
  attemptedAt: Date;
}

/**
 * Factory registration error
 */
export interface IFactoryRegistrationError extends IFactoryError {
  /** Token that failed registration */
  token: DIToken;

  /** Registration options used */
  registrationOptions?: IFactoryRegistrationOptions;
}

// Provider Factory Types for Axon Provider Pattern Integration

/**
 * Auth provider factory interface
 */
export interface IAuthProviderFactory extends IFactory<IAuthProvider> {
  /** Create auth provider with specific configuration */
  create(config?: IAuthProviderConfig): IAuthProvider | Promise<IAuthProvider>;
}

/**
 * Auth provider configuration
 */
export interface IAuthProviderConfig {
  /** Provider type (auth0, firebase, custom, etc.) */
  provider: string;

  /** Provider-specific configuration */
  config: Record<string, unknown>;

  /** Enable caching */
  enableCaching?: boolean;

  /** Connection timeout */
  timeout?: number;
}

/**
 * Billing provider factory interface
 */
export interface IBillingProviderFactory extends IFactory<IBillingProvider> {
  /** Create billing provider with specific configuration */
  create(config?: IBillingProviderConfig): IBillingProvider | Promise<IBillingProvider>;
}

/**
 * Billing provider configuration
 */
export interface IBillingProviderConfig {
  /** Provider type (stripe, paypal, square, etc.) */
  provider: string;

  /** Provider-specific configuration */
  config: Record<string, unknown>;

  /** Enable webhooks */
  enableWebhooks?: boolean;

  /** Webhook endpoint URL */
  webhookUrl?: string;
}

/**
 * Storage provider factory interface
 */
export interface IStorageProviderFactory extends IFactory<IStorageProvider> {
  /** Create storage provider with specific configuration */
  create(config?: IStorageProviderConfig): IStorageProvider | Promise<IStorageProvider>;
}

/**
 * Storage provider configuration
 */
export interface IStorageProviderConfig {
  /** Provider type (s3, azure, gcs, local, etc.) */
  provider: string;

  /** Provider-specific configuration */
  config: Record<string, unknown>;

  /** Default bucket/container */
  defaultBucket?: string;

  /** Enable encryption */
  enableEncryption?: boolean;
}

/**
 * LLM provider factory interface
 */
export interface ILLMProviderFactory extends IFactory<ILLMProvider> {
  /** Create LLM provider with specific configuration */
  create(config?: ILLMProviderConfig): ILLMProvider | Promise<ILLMProvider>;
}

/**
 * LLM provider configuration
 */
export interface ILLMProviderConfig {
  /** Provider type (openai, anthropic, cohere, local, etc.) */
  provider: string;

  /** Provider-specific configuration */
  config: Record<string, unknown>;

  /** Default model */
  defaultModel?: string;

  /** Enable streaming */
  enableStreaming?: boolean;

  /** Rate limiting configuration */
  rateLimiting?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/**
 * Universal provider factory interface for creating any provider type
 */
export interface IProviderFactory extends IAbstractFactory {
  /** Create auth provider */
  createAuthProvider(config?: IAuthProviderConfig): IAuthProvider | Promise<IAuthProvider>;

  /** Create billing provider */
  createBillingProvider(config?: IBillingProviderConfig): IBillingProvider | Promise<IBillingProvider>;

  /** Create storage provider */
  createStorageProvider(config?: IStorageProviderConfig): IStorageProvider | Promise<IStorageProvider>;

  /** Create LLM provider */
  createLLMProvider(config?: ILLMProviderConfig): ILLMProvider | Promise<ILLMProvider>;
}
