/**
 * Provider pattern type definitions
 *
 * These interfaces define contracts for external service providers,
 * enabling runtime swapping of implementations without code changes.
 */

import type { CorrelationId, Timestamp } from "../../core/index.js";

// Authentication Provider Types

/**
 * Authentication provider interface
 *
 * Abstracts authentication services (Auth0, Firebase, custom, etc.)
 */
export interface IAuthProvider {
  /** Provider name */
  readonly name: string;

  /** Authenticate user with credentials */
  authenticate(credentials: ICredentials): Promise<IAuthResult>;

  /** Validate an existing token */
  validate(token: AuthToken): Promise<IValidationResult>;

  /** Refresh an expired token */
  refresh(refreshToken: RefreshToken): Promise<IAuthResult>;

  /** Revoke a token */
  revoke(token: AuthToken): Promise<void>;

  /** Get user information from token */
  getUserInfo(token: AuthToken): Promise<IUserInfo>;
}

/**
 * User credentials for authentication
 */
export interface ICredentials {
  /** Username or email */
  readonly username?: string;

  /** Password */
  readonly password?: string;

  /** OAuth token */
  readonly oauthToken?: string;

  /** API key */
  readonly apiKey?: string;

  /** Two-factor authentication code */
  readonly mfaCode?: string;

  /** Additional credential data */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Authentication result
 */
export interface IAuthResult {
  /** Access token */
  readonly accessToken: AuthToken;

  /** Refresh token */
  readonly refreshToken?: RefreshToken;

  /** Token expiration time */
  readonly expiresAt: Timestamp;

  /** User information */
  readonly user: IUserInfo;

  /** Authentication metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Token validation result
 */
export interface IValidationResult {
  /** Whether token is valid */
  readonly valid: boolean;

  /** Token expiration time */
  readonly expiresAt?: Timestamp;

  /** User associated with token */
  readonly user?: IUserInfo;

  /** Validation errors */
  readonly errors?: readonly string[];
}

/**
 * User information
 */
export interface IUserInfo {
  /** User ID */
  readonly id: string;

  /** Username */
  readonly username: string;

  /** Email address */
  readonly email?: string;

  /** User roles */
  readonly roles?: readonly string[];

  /** User permissions */
  readonly permissions?: readonly string[];

  /** Additional user metadata */
  readonly metadata?: Record<string, unknown>;
}

/** Branded type for auth tokens */
export type AuthToken = string & { __brand: "AuthToken" };

/** Branded type for refresh tokens */
export type RefreshToken = string & { __brand: "RefreshToken" };

// Billing Provider Types

/**
 * Billing provider interface
 *
 * Abstracts payment services (Stripe, PayPal, Square, etc.)
 */
export interface IBillingProvider {
  /** Provider name */
  readonly name: string;

  /** Create a new subscription */
  createSubscription(plan: IBillingPlan): Promise<ISubscription>;

  /** Process a one-time payment */
  processPayment(payment: IPaymentRequest): Promise<IPaymentResult>;

  /** Cancel a subscription */
  cancelSubscription(subscriptionId: SubscriptionId): Promise<void>;

  /** Update subscription */
  updateSubscription(subscriptionId: SubscriptionId, plan: IBillingPlan): Promise<ISubscription>;

  /** Get subscription details */
  getSubscription(subscriptionId: SubscriptionId): Promise<ISubscription>;

  /** List invoices */
  listInvoices(customerId: string): Promise<readonly IInvoice[]>;

  /** Process refund */
  processRefund(paymentId: PaymentId, amount?: number): Promise<IRefundResult>;
}

/** Branded type for subscription IDs */
export type SubscriptionId = string & { __brand: "SubscriptionId" };

/** Branded type for payment IDs */
export type PaymentId = string & { __brand: "PaymentId" };

/**
 * Billing plan definition
 */
export interface IBillingPlan {
  /** Plan ID */
  readonly id: string;

  /** Plan name */
  readonly name: string;

  /** Billing amount */
  readonly amount: number;

  /** Currency code (ISO 4217) */
  readonly currency: string;

  /** Billing interval */
  readonly interval: "monthly" | "yearly" | "weekly" | "daily";

  /** Trial period in days */
  readonly trialDays?: number;

  /** Plan features */
  readonly features?: readonly string[];
}

/**
 * Subscription information
 */
export interface ISubscription {
  /** Subscription ID */
  readonly id: SubscriptionId;

  /** Customer ID */
  readonly customerId: string;

  /** Billing plan */
  readonly plan: IBillingPlan;

  /** Subscription status */
  readonly status: "active" | "cancelled" | "past_due" | "trialing";

  /** Start date */
  readonly startDate: Timestamp;

  /** Next billing date */
  readonly nextBillingDate: Timestamp;

  /** Cancellation date */
  readonly cancelledAt?: Timestamp;
}

/**
 * Payment request
 */
export interface IPaymentRequest {
  /** Amount to charge */
  readonly amount: number;

  /** Currency code */
  readonly currency: string;

  /** Payment method */
  readonly method: IPaymentMethod;

  /** Payment description */
  readonly description: string;

  /** Customer information */
  readonly customer: ICustomerInfo;

  /** Correlation ID for tracking */
  readonly correlationId?: CorrelationId;
}

/**
 * Payment method
 */
export interface IPaymentMethod {
  /** Method type */
  readonly type: "card" | "bank" | "paypal" | "crypto";

  /** Method details */
  readonly details: Record<string, unknown>;
}

/**
 * Customer information
 */
export interface ICustomerInfo {
  /** Customer ID */
  readonly id?: string;

  /** Customer email */
  readonly email: string;

  /** Customer name */
  readonly name?: string;

  /** Billing address */
  readonly address?: IAddress;
}

/**
 * Address information
 */
export interface IAddress {
  /** Street address */
  readonly street?: string;

  /** City */
  readonly city?: string;

  /** State/Province */
  readonly state?: string;

  /** Postal code */
  readonly postalCode?: string;

  /** Country code (ISO 3166) */
  readonly country: string;
}

/**
 * Payment result
 */
export interface IPaymentResult {
  /** Payment ID */
  readonly id: PaymentId;

  /** Payment status */
  readonly status: "succeeded" | "failed" | "pending";

  /** Amount charged */
  readonly amount: number;

  /** Transaction fee */
  readonly fee?: number;

  /** Error message if failed */
  readonly error?: string;

  /** Payment metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Invoice information
 */
export interface IInvoice {
  /** Invoice ID */
  readonly id: string;

  /** Invoice amount */
  readonly amount: number;

  /** Invoice date */
  readonly date: Timestamp;

  /** Payment status */
  readonly paid: boolean;

  /** Invoice URL */
  readonly url?: string;
}

/**
 * Refund result
 */
export interface IRefundResult {
  /** Refund ID */
  readonly id: string;

  /** Refund amount */
  readonly amount: number;

  /** Refund status */
  readonly status: "succeeded" | "failed" | "pending";

  /** Refund reason */
  readonly reason?: string;
}

// Storage Provider Types

/**
 * Storage provider interface
 *
 * Abstracts storage services (S3, Azure Blob, GCS, local, etc.)
 */
export interface IStorageProvider {
  /** Provider name */
  readonly name: string;

  /** Store data */
  store(key: StorageKey, data: Buffer, options?: IStorageOptions): Promise<IStorageResult>;

  /** Retrieve data */
  retrieve(key: StorageKey): Promise<Buffer>;

  /** Delete data */
  delete(key: StorageKey): Promise<void>;

  /** Check if key exists */
  exists(key: StorageKey): Promise<boolean>;

  /** List keys with prefix */
  list(prefix: string, options?: IListOptions): Promise<readonly StorageKey[]>;

  /** Get presigned URL */
  getPresignedUrl(key: StorageKey, operation: "get" | "put", expiresIn: number): Promise<string>;

  /** Copy object */
  copy(sourceKey: StorageKey, destinationKey: StorageKey): Promise<void>;

  /** Get object metadata */
  getMetadata(key: StorageKey): Promise<IStorageMetadata>;
}

/** Branded type for storage keys */
export type StorageKey = string & { __brand: "StorageKey" };

/**
 * Storage options
 */
export interface IStorageOptions {
  /** Content type */
  readonly contentType?: string;

  /** Content encoding */
  readonly contentEncoding?: string;

  /** Cache control header */
  readonly cacheControl?: string;

  /** Custom metadata */
  readonly metadata?: Record<string, string>;

  /** Storage class */
  readonly storageClass?: "standard" | "infrequent" | "archive";

  /** Server-side encryption */
  readonly encryption?: boolean;
}

/**
 * Storage result
 */
export interface IStorageResult {
  /** Storage key */
  readonly key: StorageKey;

  /** Object size in bytes */
  readonly size: number;

  /** ETag or version ID */
  readonly etag?: string;

  /** Storage location/URL */
  readonly location?: string;
}

/**
 * List options
 */
export interface IListOptions {
  /** Maximum keys to return */
  readonly maxKeys?: number;

  /** Continuation token */
  readonly continuationToken?: string;

  /** Delimiter for hierarchical listing */
  readonly delimiter?: string;
}

/**
 * Storage metadata
 */
export interface IStorageMetadata {
  /** Object size */
  readonly size: number;

  /** Last modified time */
  readonly lastModified: Timestamp;

  /** Content type */
  readonly contentType?: string;

  /** ETag */
  readonly etag?: string;

  /** Custom metadata */
  readonly metadata?: Record<string, string>;
}

// LLM Provider Types

/**
 * LLM (Large Language Model) provider interface
 *
 * Abstracts AI services (OpenAI, Anthropic, Cohere, local models, etc.)
 */
export interface ILLMProvider {
  /** Provider name */
  readonly name: string;

  /** Generate text completion */
  generate(prompt: string, options?: ILLMOptions): Promise<ILLMResponse>;

  /** Generate embeddings */
  embed(text: string | readonly string[]): Promise<readonly number[][]>;

  /** Tokenize text */
  tokenize(text: string): Promise<readonly string[]>;

  /** Count tokens */
  countTokens(text: string): Promise<number>;

  /** Stream generation */
  stream(prompt: string, options?: ILLMOptions): AsyncGenerator<IStreamChunk>;

  /** List available models */
  listModels(): Promise<readonly IModelInfo[]>;
}

/**
 * LLM generation options
 */
export interface ILLMOptions {
  /** Model to use */
  readonly model?: string;

  /** Maximum tokens to generate */
  readonly maxTokens?: number;

  /** Temperature (0-2) */
  readonly temperature?: number;

  /** Top-p sampling */
  readonly topP?: number;

  /** Frequency penalty */
  readonly frequencyPenalty?: number;

  /** Presence penalty */
  readonly presencePenalty?: number;

  /** Stop sequences */
  readonly stopSequences?: readonly string[];

  /** System prompt */
  readonly systemPrompt?: string;

  /** Response format */
  readonly format?: "text" | "json" | "markdown";

  /** Additional model-specific options */
  readonly metadata?: Record<string, unknown>;
}

/**
 * LLM response
 */
export interface ILLMResponse {
  /** Generated text */
  readonly text: string;

  /** Token usage */
  readonly usage: ITokenUsage;

  /** Model used */
  readonly model: string;

  /** Generation metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Token usage information
 */
export interface ITokenUsage {
  /** Prompt tokens */
  readonly promptTokens: number;

  /** Completion tokens */
  readonly completionTokens: number;

  /** Total tokens */
  readonly totalTokens: number;
}

/**
 * Stream chunk for streaming responses
 */
export interface IStreamChunk {
  /** Chunk text */
  readonly text: string;

  /** Whether this is the final chunk */
  readonly done: boolean;

  /** Chunk metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Model information
 */
export interface IModelInfo {
  /** Model ID */
  readonly id: string;

  /** Model name */
  readonly name: string;

  /** Model description */
  readonly description?: string;

  /** Maximum context length */
  readonly maxContextLength?: number;

  /** Supported features */
  readonly features?: readonly string[];
}
