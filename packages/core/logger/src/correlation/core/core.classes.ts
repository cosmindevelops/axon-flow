import { randomUUID } from "crypto";
import type {
  CorrelationId,
  ICorrelationContext,
  ICorrelationIdGenerator,
  ICorrelationIdParts,
  ICorrelationManager,
  ICorrelationManagerConfig,
  ICorrelationManagerFactory,
  ICorrelationMiddleware,
  ICorrelationMiddlewareChain,
  ICorrelationMiddlewareConfig,
  IEnhancedCorrelationManager,
} from "./core.types.js";
import { CorrelationPlatform } from "./core.types.js";

/**
 * Platform detection utilities
 */
const platformDetection = {
  isNode(): boolean {
    return typeof process !== "undefined" && process.versions?.node !== undefined;
  },

  isBrowser(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
  },

  getPlatformType(): CorrelationPlatform {
    if (this.isBrowser()) return CorrelationPlatform.BROWSER;
    if (this.isNode()) return CorrelationPlatform.NODE;
    return CorrelationPlatform.BROWSER; // Default fallback
  },
} as const;

/**
 * UUID v4 validation regex pattern
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * CorrelationId generator with secure UUID generation and validation
 */
export class CorrelationIdGenerator implements ICorrelationIdGenerator {
  private readonly entropyCheck = new Set<string>();
  private readonly maxEntropyCache = 10000;

  /**
   * Generate a new correlation ID with optional prefix
   */
  generate(prefix?: string): CorrelationId {
    const uuid = randomUUID();

    // Entropy validation - prevent collisions in development
    if (this.entropyCheck.has(uuid)) {
      throw new Error("UUID collision detected");
    }

    // Maintain entropy cache size
    if (this.entropyCheck.size >= this.maxEntropyCache) {
      this.entropyCheck.clear();
    }
    this.entropyCheck.add(uuid);

    const id = prefix ? `${prefix}-${uuid}` : uuid;
    return id as CorrelationId;
  }

  /**
   * Validate correlation ID format
   */
  validate(id: CorrelationId): boolean {
    if (!id || typeof id !== "string") {
      return false;
    }

    // Check if it has a prefix
    const parts = id.split("-");
    if (parts.length < 5) {
      return false;
    }

    // Extract UUID part (last 5 segments for UUID v4)
    const uuidPart = parts.slice(-5).join("-");
    return UUID_V4_REGEX.test(uuidPart);
  }

  /**
   * Parse correlation ID into components
   */
  parse(id: CorrelationId): ICorrelationIdParts {
    if (!this.validate(id)) {
      throw new Error(`Invalid correlation ID format: ${id}`);
    }

    const parts = id.split("-");
    const uuidPart = parts.slice(-5).join("-");

    // Extract prefix if present
    const prefix = parts.length > 5 ? parts.slice(0, -5).join("-") : undefined;

    const result: ICorrelationIdParts = {
      uuid: uuidPart,
      timestamp: Date.now(),
    };

    if (prefix !== undefined) {
      result.prefix = prefix;
    }

    return result;
  }
}

/**
 * Correlation manager with context integration
 * Note: Full context implementation will be added in later tasks
 */
export class CorrelationManager implements ICorrelationManager {
  private readonly generator: ICorrelationIdGenerator;
  private contextStack: ICorrelationContext[] = [];

  constructor(generator?: ICorrelationIdGenerator) {
    this.generator = generator ?? new CorrelationIdGenerator();
  }

  /**
   * Get current correlation ID from context
   */
  current(): CorrelationId | undefined {
    const context = this.contextStack[this.contextStack.length - 1];
    return context?.id;
  }

  /**
   * Execute function with correlation ID context
   */
  with<T>(id: CorrelationId, fn: () => T): T {
    const context: ICorrelationContext = {
      id,
      createdAt: new Date(),
    };

    this.contextStack.push(context);

    try {
      return fn();
    } finally {
      this.contextStack.pop();
    }
  }

  /**
   * Execute async function with correlation ID context
   */
  async withAsync<T>(id: CorrelationId, fn: () => Promise<T>): Promise<T> {
    const context: ICorrelationContext = {
      id,
      createdAt: new Date(),
    };

    this.contextStack.push(context);

    try {
      return await fn();
    } finally {
      this.contextStack.pop();
    }
  }

  /**
   * Create new correlation ID
   */
  create(prefix?: string): CorrelationId {
    return this.generator.generate(prefix);
  }

  /**
   * Get context stack for debugging
   */
  getContextStack(): readonly ICorrelationContext[] {
    return [...this.contextStack];
  }

  /**
   * Clear context stack (for testing/cleanup)
   */
  clearContext(): void {
    this.contextStack.length = 0;
  }

  /**
   * Get current correlation context with metadata
   */
  currentContext(): ICorrelationContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }
}

/**
 * Node.js-specific correlation manager using AsyncLocalStorage
 */
export class AsyncLocalStorageCorrelationManager implements IEnhancedCorrelationManager {
  private readonly generator: ICorrelationIdGenerator;
  private asyncLocalStorage: any = null;
  private readonly config: ICorrelationManagerConfig;
  private readonly initializationPromise: Promise<void>;

  constructor(config: ICorrelationManagerConfig = {}) {
    this.generator = config.generator ?? new CorrelationIdGenerator();
    this.config = {
      maxStackSize: 100,
      enableAutoCleanup: true,
      contextTimeoutMs: 300000, // 5 minutes
      ...config,
    };

    // Initialize AsyncLocalStorage asynchronously but store the promise
    this.initializationPromise = this.initializeAsyncLocalStorage();
  }

  private async initializeAsyncLocalStorage(): Promise<void> {
    if (platformDetection.isNode()) {
      try {
        const { AsyncLocalStorage: asyncLocalStorageClass } = await import("async_hooks");
        this.asyncLocalStorage = new asyncLocalStorageClass<ICorrelationContext>();
      } catch (error) {
        console.warn("AsyncLocalStorage not available, falling back to manual context management:", error);
      }
    }
  }

  /**
   * Ensure AsyncLocalStorage is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    await this.initializationPromise;
  }

  current(): CorrelationId | undefined {
    return this.currentContext()?.id;
  }

  currentContext(): ICorrelationContext | undefined {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.getStore();
    }
    return undefined;
  }

  with<T>(id: CorrelationId, fn: () => T): T {
    const context: ICorrelationContext = {
      id,
      createdAt: new Date(),
    };

    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run(context, fn);
    }

    // Fallback to synchronous execution without context
    return fn();
  }

  async withAsync<T>(id: CorrelationId, fn: () => Promise<T>): Promise<T> {
    // Ensure AsyncLocalStorage is initialized before use
    await this.ensureInitialized();

    const context: ICorrelationContext = {
      id,
      createdAt: new Date(),
    };

    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run(context, fn);
    }

    // Fallback to direct execution without context
    return fn();
  }

  create(prefix?: string): CorrelationId {
    return this.generator.generate(prefix);
  }

  getContextStack(): readonly ICorrelationContext[] {
    const current = this.currentContext();
    return current ? [current] : [];
  }

  clearContext(): void {
    // AsyncLocalStorage contexts are automatically managed
    // This is mainly for compatibility with the interface
  }

  /**
   * Enhanced current() method that waits for initialization
   */
  async currentAsync(): Promise<CorrelationId | undefined> {
    await this.ensureInitialized();
    return this.current();
  }

  /**
   * Enhanced currentContext() method that waits for initialization
   */
  async currentContextAsync(): Promise<ICorrelationContext | undefined> {
    await this.ensureInitialized();
    return this.currentContext();
  }
}

/**
 * Browser-compatible correlation manager using WeakMap-based context tracking
 */
export class BrowserCorrelationManager implements IEnhancedCorrelationManager {
  private readonly generator: ICorrelationIdGenerator;
  private readonly contextStack: ICorrelationContext[] = [];
  private readonly promiseContextMap = new WeakMap<Promise<any>, ICorrelationContext>();
  private readonly config: ICorrelationManagerConfig;

  constructor(config: ICorrelationManagerConfig = {}) {
    this.generator = config.generator ?? new CorrelationIdGenerator();
    this.config = {
      maxStackSize: 50, // Lower for browser memory constraints
      enableAutoCleanup: true,
      contextTimeoutMs: 300000,
      ...config,
    };

    if (this.config.enableAutoCleanup) {
      this.setupAutoCleanup();
    }
  }

  private setupAutoCleanup(): void {
    // Cleanup timer to prevent memory leaks
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const cutoff = new Date(Date.now() - (this.config.contextTimeoutMs ?? 300000));
        this.contextStack.splice(
          0,
          this.contextStack.length,
          ...this.contextStack.filter((ctx) => ctx.createdAt > cutoff),
        );
      }, 60000); // Cleanup every minute
    }
  }

  current(): CorrelationId | undefined {
    return this.currentContext()?.id;
  }

  currentContext(): ICorrelationContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  with<T>(id: CorrelationId, fn: () => T): T {
    const context: ICorrelationContext = {
      id,
      createdAt: new Date(),
    };

    this.pushContext(context);

    try {
      return fn();
    } finally {
      this.popContext();
    }
  }

  async withAsync<T>(id: CorrelationId, fn: () => Promise<T>): Promise<T> {
    const context: ICorrelationContext = {
      id,
      createdAt: new Date(),
    };

    this.pushContext(context);

    try {
      const promise = fn();
      this.promiseContextMap.set(promise, context);

      const result = await promise;
      this.promiseContextMap.delete(promise);
      return result;
    } finally {
      this.popContext();
    }
  }

  create(prefix?: string): CorrelationId {
    return this.generator.generate(prefix);
  }

  getContextStack(): readonly ICorrelationContext[] {
    return [...this.contextStack];
  }

  clearContext(): void {
    this.contextStack.length = 0;
  }

  private pushContext(context: ICorrelationContext): void {
    if (this.contextStack.length >= (this.config.maxStackSize ?? 50)) {
      this.contextStack.shift(); // Remove oldest context
    }
    this.contextStack.push(context);
  }

  private popContext(): void {
    this.contextStack.pop();
  }
}

/**
 * Factory for creating platform-appropriate correlation managers
 */
export class CorrelationManagerFactory implements ICorrelationManagerFactory {
  private static instance: CorrelationManagerFactory = new CorrelationManagerFactory();
  private static currentManager: IEnhancedCorrelationManager | undefined;

  static getManager(): IEnhancedCorrelationManager {
    if (!this.currentManager) {
      this.currentManager = this.instance.create();
    }
    return this.currentManager;
  }

  create(config?: ICorrelationManagerConfig): IEnhancedCorrelationManager {
    const platform = platformDetection.getPlatformType();
    return this.createForPlatform(platform, config);
  }

  createForPlatform(platform: CorrelationPlatform, config?: ICorrelationManagerConfig): IEnhancedCorrelationManager {
    switch (platform) {
      case CorrelationPlatform.NODE:
      case CorrelationPlatform.ELECTRON_MAIN:
        return new AsyncLocalStorageCorrelationManager(config);

      case CorrelationPlatform.BROWSER:
      case CorrelationPlatform.WEB_WORKER:
      case CorrelationPlatform.ELECTRON_RENDERER:
      case CorrelationPlatform.REACT_NATIVE:
      default:
        return new BrowserCorrelationManager(config);
    }
  }
}

/**
 * Base class for correlation middleware implementing chain of responsibility pattern
 */
export abstract class CorrelationMiddlewareBase implements ICorrelationMiddleware {
  protected next?: ICorrelationMiddleware | undefined;
  protected readonly config: ICorrelationMiddlewareConfig;
  protected readonly generator: CorrelationIdGenerator;

  constructor(config: ICorrelationMiddlewareConfig = {}) {
    this.config = {
      enabled: true,
      ...config,
    };
    this.generator = new CorrelationIdGenerator();
  }

  setNext(middleware?: ICorrelationMiddleware): void {
    this.next = middleware ?? undefined;
  }

  async process(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext> {
    if (!this.config.enabled) {
      return this.next ? this.next.process(context, request) : context;
    }

    const processedContext = await this.processInternal(context, request);

    return this.next ? this.next.process(processedContext, request) : processedContext;
  }

  abstract getName(): string;

  protected abstract processInternal(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext>;
}

/**
 * HTTP-specific correlation middleware
 */
export class HttpCorrelationMiddleware extends CorrelationMiddlewareBase {
  private static readonly CORRELATION_HEADERS = [
    "x-correlation-id",
    "x-request-id",
    "correlation-id",
    "request-id",
  ] as const;

  constructor(config: ICorrelationMiddlewareConfig = {}) {
    super({
      name: "HttpCorrelationMiddleware",
      ...config,
    });
  }

  getName(): string {
    return this.config.name ?? "HttpCorrelationMiddleware";
  }

  /**
   * Extract correlation ID from HTTP headers
   */
  extractCorrelationId(headers: Record<string, string | string[] | undefined>): string | undefined {
    for (const headerName of HttpCorrelationMiddleware.CORRELATION_HEADERS) {
      const value = headers[headerName] || headers[headerName.toLowerCase()];
      if (value) {
        const correlationId = Array.isArray(value) ? value[0] : value;
        // Validate the correlation ID format
        if (correlationId && this.generator.validate(correlationId as CorrelationId)) {
          return correlationId;
        }
      }
    }
    return undefined;
  }

  /**
   * Inject correlation ID into HTTP headers
   */
  injectCorrelationId(headers: Record<string, string>, correlationId: string): Record<string, string> {
    return {
      ...headers,
      "x-correlation-id": correlationId,
    };
  }

  /**
   * Create Express middleware for automatic correlation propagation
   */
  createExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      // Extract correlation ID from request headers
      const extractedId = this.extractCorrelationId(req.headers);
      const correlationId = extractedId || this.generator.generate();

      // Add correlation ID to response headers
      res.setHeader("x-correlation-id", correlationId);

      // Set correlation context for the request
      const manager = CorrelationManagerFactory.getManager();
      manager.with(correlationId, () => {
        next();
      });
    };
  }

  protected async processInternal(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext> {
    const httpRequest = request as { headers?: Record<string, string | string[]>; method?: string; url?: string };

    // Try to extract correlation ID from headers if provided
    let correlationId = context.id;
    if (httpRequest?.headers) {
      const extractedId = this.extractCorrelationId(httpRequest.headers);
      if (extractedId) {
        correlationId = extractedId;
      }
    }

    // Add HTTP-specific metadata to correlation context
    const enrichedContext: ICorrelationContext = {
      ...context,
      id: correlationId,
      metadata: {
        ...context.metadata,
        httpRequest: true,
        method: httpRequest?.method,
        url: httpRequest?.url,
        requestPath: httpRequest?.url, // Add requestPath field expected by tests
        userAgent: httpRequest?.headers?.["user-agent"] as string,
        timestamp: new Date().toISOString(),
      },
    };

    return enrichedContext;
  }
}

/**
 * Message queue correlation middleware
 */
export class MessageQueueCorrelationMiddleware extends CorrelationMiddlewareBase {
  private static readonly CORRELATION_PROPERTY = "correlationId";
  private static readonly CUSTOM_HEADERS_PROPERTY = "headers";

  constructor(config: ICorrelationMiddlewareConfig = {}) {
    super({
      name: "MessageQueueCorrelationMiddleware",
      ...config,
    });
  }

  getName(): string {
    return this.config.name ?? "MessageQueueCorrelationMiddleware";
  }

  /**
   * Extract correlation ID from AMQP message properties
   */
  extractCorrelationId(message: IAMQPMessage): string | undefined {
    // Check standard AMQP correlationId property
    if (message.properties?.correlationId) {
      const correlationId = message.properties.correlationId;
      if (this.generator.validate(correlationId)) {
        return correlationId;
      }
    }

    // Check custom headers for correlation ID
    const headers = message.properties?.headers;
    if (headers) {
      const customCorrelationId = headers["x-correlation-id"] || headers["correlation-id"];
      if (customCorrelationId && this.generator.validate(customCorrelationId)) {
        return customCorrelationId;
      }
    }

    return undefined;
  }

  /**
   * Inject correlation ID into AMQP message properties
   */
  injectCorrelationId(properties: IAMQPProperties = {}, correlationId: string): IAMQPProperties {
    return {
      ...properties,
      correlationId,
      headers: {
        ...properties.headers,
        "x-correlation-id": correlationId,
      },
    };
  }

  /**
   * Create RabbitMQ channel wrapper for automatic correlation propagation
   */
  createChannelWrapper(channel: IAMQPChannel) {
    const originalPublish = channel.publish.bind(channel);
    const originalSendToQueue = channel.sendToQueue.bind(channel);
    const originalConsume = channel.consume.bind(channel);

    // Wrap publish method
    channel.publish = (exchange: string, routingKey: string, content: Buffer, options: any = {}) => {
      const manager = CorrelationManagerFactory.getManager();
      const currentContext = manager.currentContext();

      if (currentContext) {
        options = this.injectCorrelationId(options, currentContext.id);
      }

      return originalPublish(exchange, routingKey, content, options);
    };

    // Wrap sendToQueue method
    channel.sendToQueue = (queue: string, content: Buffer, options: any = {}) => {
      const manager = CorrelationManagerFactory.getManager();
      const currentContext = manager.currentContext();

      if (currentContext) {
        options = this.injectCorrelationId(options, currentContext.id);
      }

      return originalSendToQueue(queue, content, options);
    };

    // Wrap consume method
    channel.consume = (queue: string, onMessage: (msg: IAMQPMessage | null) => void, options?: unknown) => {
      const wrappedOnMessage = (msg: IAMQPMessage | null) => {
        if (!msg) {
          onMessage(msg);
          return;
        }

        const extractedId = this.extractCorrelationId(msg);
        const correlationId = extractedId || this.generator.generate();

        const manager = CorrelationManagerFactory.getManager();
        manager.with(correlationId, () => {
          onMessage(msg);
        });
      };

      return originalConsume(queue, wrappedOnMessage, options);
    };

    return channel;
  }

  protected async processInternal(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext> {
    const messageRequest = request as IAMQPMessage & { queueName?: string; messageId?: string };

    // Try to extract correlation ID from message properties if provided
    let correlationId = context.id;
    if (messageRequest) {
      const extractedId = this.extractCorrelationId(messageRequest);
      if (extractedId) {
        correlationId = extractedId;
      }
    }

    // Add message queue specific metadata
    const enrichedContext: ICorrelationContext = {
      ...context,
      id: correlationId,
      metadata: {
        ...context.metadata,
        messageQueue: true,
        queue: messageRequest?.fields?.routingKey,
        queueName: messageRequest?.queueName, // Add queueName field expected by tests
        messageId: messageRequest?.messageId || messageRequest?.properties?.messageId, // Handle both direct and AMQP structure
        exchange: messageRequest?.fields?.exchange,
        routingKey: messageRequest?.fields?.routingKey,
        redelivered: messageRequest?.fields?.redelivered,
        timestamp: new Date().toISOString(),
      },
    };

    return enrichedContext;
  }
}

// Type definitions for AMQP message structure
interface IAMQPMessage {
  content: Buffer;
  fields?: {
    exchange?: string;
    routingKey?: string;
    redelivered?: boolean;
  };
  properties?: IAMQPProperties;
}

interface IAMQPProperties {
  contentType?: string;
  contentEncoding?: string;
  headers?: Record<string, any>;
  deliveryMode?: number;
  priority?: number;
  correlationId?: string;
  replyTo?: string;
  expiration?: string;
  messageId?: string;
  timestamp?: number;
  type?: string;
  userId?: string;
  appId?: string;
  clusterId?: string;
}

interface IAMQPChannel {
  publish: (exchange: string, routingKey: string, content: Buffer, options?: unknown) => boolean;
  sendToQueue: (queue: string, content: Buffer, options?: unknown) => boolean;
  consume: (queue: string, onMessage: (msg: IAMQPMessage | null) => void, options?: unknown) => Promise<unknown>;
}

/**
 * Correlation middleware chain for processing correlation contexts
 */
export class CorrelationMiddlewareChain implements ICorrelationMiddlewareChain {
  private middlewares: ICorrelationMiddleware[] = [];

  add(middleware: ICorrelationMiddleware): this {
    if (this.middlewares.length > 0) {
      const lastMiddleware = this.middlewares[this.middlewares.length - 1];
      if (lastMiddleware) {
        lastMiddleware.setNext(middleware);
      }
    }
    this.middlewares.push(middleware);
    return this;
  }

  remove(middlewareName: string): boolean {
    const index = this.middlewares.findIndex((m) => m.getName() === middlewareName);
    if (index === -1) return false;

    this.middlewares.splice(index, 1);
    this.rebuildChain();
    return true;
  }

  async process(context: ICorrelationContext, request?: unknown): Promise<ICorrelationContext> {
    if (this.middlewares.length === 0) return context;
    const firstMiddleware = this.middlewares[0];
    if (firstMiddleware) {
      return firstMiddleware.process(context, request);
    }
    return context;
  }

  getMiddlewareNames(): string[] {
    return this.middlewares.map((m) => m.getName());
  }

  clear(): void {
    this.middlewares.length = 0;
  }

  private rebuildChain(): void {
    for (let i = 0; i < this.middlewares.length - 1; i++) {
      const currentMiddleware = this.middlewares[i];
      const nextMiddleware = this.middlewares[i + 1];
      if (currentMiddleware && nextMiddleware) {
        currentMiddleware.setNext(nextMiddleware);
      }
    }
    if (this.middlewares.length > 0) {
      const lastMiddleware = this.middlewares[this.middlewares.length - 1];
      if (lastMiddleware) {
        lastMiddleware.setNext(undefined);
      }
    }
  }
}
