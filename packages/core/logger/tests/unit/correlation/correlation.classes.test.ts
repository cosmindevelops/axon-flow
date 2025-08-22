/**
 * Unit tests for correlation classes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

// No global mocking - let crypto work normally for most tests

import {
  CorrelationIdGenerator,
  CorrelationManager,
  AsyncLocalStorageCorrelationManager,
  BrowserCorrelationManager,
  CorrelationManagerFactory,
  CorrelationMiddlewareBase,
  HttpCorrelationMiddleware,
  MessageQueueCorrelationMiddleware,
  CorrelationMiddlewareChain,
} from "../../../src/correlation/correlation.classes.js";
import type {
  ICorrelationIdGenerator,
  IEnhancedCorrelationManager,
  CorrelationId,
  ICorrelationContext,
  ICorrelationManagerConfig,
  CorrelationPlatform,
} from "../../../src/correlation/correlation.types.js";
import { CorrelationPlatform } from "../../../src/correlation/correlation.types.js";

describe("CorrelationIdGenerator", () => {
  let generator: ICorrelationIdGenerator;

  beforeEach(() => {
    generator = new CorrelationIdGenerator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with default configuration", () => {
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(CorrelationIdGenerator);
    });
  });

  describe("generate", () => {
    it("should generate valid correlation ID", () => {
      const correlationId = generator.generate();
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe("string");
      expect(correlationId.length).toBeGreaterThan(0);
      expect(generator.validate(correlationId)).toBe(true);
    });

    it("should generate unique correlation IDs", () => {
      const id1 = generator.generate();
      const id2 = generator.generate();
      expect(id1).not.toBe(id2);
    });

    it("should include prefix when provided", () => {
      const correlationId = generator.generate("test");
      expect(correlationId).toMatch(/^test-/);
      expect(generator.validate(correlationId)).toBe(true);
    });

    it("should detect UUID collisions (extremely rare)", () => {
      // Create a new generator for this test to ensure clean state
      const testGenerator = new CorrelationIdGenerator();
      
      // Spy on crypto.randomUUID for this specific test
      const mockUUID = vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce("12345678-1234-4234-8234-123456789abc")
        .mockReturnValueOnce("12345678-1234-4234-8234-123456789abc");
      
      testGenerator.generate();
      expect(() => testGenerator.generate()).toThrow("UUID collision detected");
      
      // Restore the original function
      mockUUID.mockRestore();
    });
  });

  describe("validate", () => {
    it("should validate correct correlation ID format", () => {
      const correlationId = generator.generate();
      expect(generator.validate(correlationId)).toBe(true);
    });

    it("should validate correlation ID with prefix", () => {
      const correlationId = generator.generate("prefix");
      expect(generator.validate(correlationId)).toBe(true);
    });

    it("should reject invalid correlation ID formats", () => {
      expect(generator.validate("")).toBe(false);
      expect(generator.validate("invalid")).toBe(false);
      expect(generator.validate("123")).toBe(false);
      expect(generator.validate(null as any)).toBe(false);
      expect(generator.validate(undefined as any)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse valid correlation ID without prefix", () => {
      const correlationId = generator.generate();
      const parts = generator.parse(correlationId);
      expect(parts).toBeDefined();
      expect(parts.uuid).toBeDefined();
      expect(parts.timestamp).toBeTypeOf("number");
      expect(parts.prefix).toBeUndefined();
    });

    it("should parse valid correlation ID with prefix", () => {
      const correlationId = generator.generate("test");
      const parts = generator.parse(correlationId);
      expect(parts).toBeDefined();
      expect(parts.uuid).toBeDefined();
      expect(parts.timestamp).toBeTypeOf("number");
      expect(parts.prefix).toBe("test");
    });

    it("should throw error for invalid correlation ID", () => {
      expect(() => generator.parse("invalid")).toThrow("Invalid correlation ID format");
    });
  });
});

describe("CorrelationManager (Base)", () => {
  let manager: CorrelationManager;
  let generator: ICorrelationIdGenerator;

  beforeEach(() => {
    generator = new CorrelationIdGenerator();
    manager = new CorrelationManager(generator);
  });

  afterEach(() => {
    vi.clearAllMocks();
    manager.clearContext();
  });

  describe("constructor", () => {
    it("should create instance with generator", () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(CorrelationManager);
    });

    it("should create instance with default generator if none provided", () => {
      const defaultManager = new CorrelationManager();
      expect(defaultManager).toBeDefined();
    });
  });

  describe("current", () => {
    it("should return undefined when no context exists", () => {
      expect(manager.current()).toBeUndefined();
    });

    it("should return current correlation ID within context", () => {
      const correlationId = generator.generate("test");

      manager.with(correlationId, () => {
        expect(manager.current()).toBe(correlationId);
      });
    });
  });

  describe("currentContext", () => {
    it("should return undefined when no context exists", () => {
      expect(manager.currentContext()).toBeUndefined();
    });

    it("should return current correlation context within context", () => {
      const correlationId = generator.generate("test");

      manager.with(correlationId, () => {
        const context = manager.currentContext();
        expect(context).toBeDefined();
        expect(context!.id).toBe(correlationId);
        expect(context!.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe("with", () => {
    it("should execute function with correlation context", () => {
      const correlationId = generator.generate("test");
      let capturedId: CorrelationId | undefined;

      const result = manager.with(correlationId, () => {
        capturedId = manager.current();
        return "test-result";
      });

      expect(result).toBe("test-result");
      expect(capturedId).toBe(correlationId);
      expect(manager.current()).toBeUndefined();
    });

    it("should handle nested correlation contexts", () => {
      const outerCorrelationId = generator.generate("outer");
      const innerCorrelationId = generator.generate("inner");

      manager.with(outerCorrelationId, () => {
        expect(manager.current()).toBe(outerCorrelationId);

        manager.with(innerCorrelationId, () => {
          expect(manager.current()).toBe(innerCorrelationId);
        });

        expect(manager.current()).toBe(outerCorrelationId);
      });

      expect(manager.current()).toBeUndefined();
    });

    it("should clean up context even if function throws", () => {
      const correlationId = generator.generate("test");

      expect(() => {
        manager.with(correlationId, () => {
          expect(manager.current()).toBe(correlationId);
          throw new Error("Test error");
        });
      }).toThrow("Test error");

      expect(manager.current()).toBeUndefined();
    });
  });

  describe("withAsync", () => {
    it("should execute async function with correlation context", async () => {
      const correlationId = generator.generate("test");
      let capturedId: CorrelationId | undefined;

      const result = await manager.withAsync(correlationId, async () => {
        capturedId = manager.current();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      expect(result).toBe("async-result");
      expect(capturedId).toBe(correlationId);
      expect(manager.current()).toBeUndefined();
    });

    it("should handle async errors and clean up context", async () => {
      const correlationId = generator.generate("test");

      await expect(
        manager.withAsync(correlationId, async () => {
          expect(manager.current()).toBe(correlationId);
          throw new Error("Async error");
        }),
      ).rejects.toThrow("Async error");

      expect(manager.current()).toBeUndefined();
    });
  });

  describe("create", () => {
    it("should create new correlation ID", () => {
      const correlationId = manager.create();
      expect(correlationId).toBeDefined();
      expect(generator.validate(correlationId)).toBe(true);
    });

    it("should create correlation ID with prefix", () => {
      const correlationId = manager.create("test");
      expect(correlationId).toMatch(/^test-/);
      expect(generator.validate(correlationId)).toBe(true);
    });
  });

  describe("getContextStack", () => {
    it("should return empty array when no context", () => {
      expect(manager.getContextStack()).toEqual([]);
    });

    it("should return current context stack", () => {
      const correlationId = generator.generate("test");

      manager.with(correlationId, () => {
        const stack = manager.getContextStack();
        expect(stack).toHaveLength(1);
        expect(stack[0].id).toBe(correlationId);
      });
    });
  });

  describe("clearContext", () => {
    it("should clear all contexts", () => {
      const correlationId = generator.generate("test");

      manager.with(correlationId, () => {
        expect(manager.current()).toBe(correlationId);
        manager.clearContext();
        expect(manager.current()).toBeUndefined();
      });
    });
  });
});

describe("AsyncLocalStorageCorrelationManager", () => {
  let manager: AsyncLocalStorageCorrelationManager;
  let config: ICorrelationManagerConfig;

  beforeEach(() => {
    config = {
      maxStackSize: 10,
      enableAutoCleanup: true,
      contextTimeoutMs: 5000,
    };
    manager = new AsyncLocalStorageCorrelationManager(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
    manager.clearContext();
  });

  describe("constructor", () => {
    it("should create instance with configuration", () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(AsyncLocalStorageCorrelationManager);
    });

    it("should create instance with default configuration", () => {
      const defaultManager = new AsyncLocalStorageCorrelationManager();
      expect(defaultManager).toBeDefined();
    });
  });

  describe("Node.js AsyncLocalStorage integration", () => {
    it("should fall back gracefully when AsyncLocalStorage not available", () => {
      const correlationId = manager.create("test");

      // Should not throw even without AsyncLocalStorage
      const result = manager.with(correlationId, () => {
        return "test-result";
      });

      expect(result).toBe("test-result");
    });

    it("should handle async operations", async () => {
      const correlationId = manager.create("async-test");

      const result = await manager.withAsync(correlationId, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      expect(result).toBe("async-result");
    });
  });
});

describe("BrowserCorrelationManager", () => {
  let manager: BrowserCorrelationManager;
  let config: ICorrelationManagerConfig;

  beforeEach(() => {
    config = {
      maxStackSize: 5,
      enableAutoCleanup: true,
      contextTimeoutMs: 1000,
    };
    manager = new BrowserCorrelationManager(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
    manager.clearContext();
  });

  describe("constructor", () => {
    it("should create instance with configuration", () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(BrowserCorrelationManager);
    });

    it("should setup auto cleanup when enabled", () => {
      const spy = vi.spyOn(global, "setInterval");
      const cleanupManager = new BrowserCorrelationManager({ enableAutoCleanup: true });

      expect(spy).toHaveBeenCalledWith(expect.any(Function), 60000);
      spy.mockRestore();
    });
  });

  describe("context management", () => {
    it("should manage context stack properly", () => {
      const correlationId1 = manager.create("test1");
      const correlationId2 = manager.create("test2");

      manager.with(correlationId1, () => {
        expect(manager.current()).toBe(correlationId1);

        manager.with(correlationId2, () => {
          expect(manager.current()).toBe(correlationId2);
          expect(manager.getContextStack()).toHaveLength(2);
        });

        expect(manager.current()).toBe(correlationId1);
      });
    });

    it("should handle promise context mapping", async () => {
      const correlationId = manager.create("promise-test");

      await manager.withAsync(correlationId, async () => {
        expect(manager.current()).toBe(correlationId);
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(manager.current()).toBe(correlationId);
      });
    });

    it("should enforce max stack size", () => {
      const maxSize = 5;

      // Fill up the stack to max size
      for (let i = 0; i < maxSize + 2; i++) {
        const id = manager.create(`test${i}`);
        manager.with(id, () => {
          // Context is pushed inside 'with'
        });
      }

      // Stack should not exceed max size due to cleanup
      const stack = manager.getContextStack();
      expect(stack.length).toBeLessThanOrEqual(maxSize);
    });
  });
});

describe("CorrelationManagerFactory", () => {
  let factory: CorrelationManagerFactory;

  beforeEach(() => {
    factory = new CorrelationManagerFactory();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create appropriate manager for current platform", () => {
      const manager = factory.create();
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(Object);
    });

    it("should create manager with custom configuration", () => {
      const config: ICorrelationManagerConfig = {
        maxStackSize: 10,
        enableAutoCleanup: false,
      };

      const manager = factory.create(config);
      expect(manager).toBeDefined();
    });
  });

  describe("createForPlatform", () => {
    it("should create AsyncLocalStorageCorrelationManager for Node.js", () => {
      const manager = factory.createForPlatform(CorrelationPlatform.NODE);
      expect(manager).toBeInstanceOf(AsyncLocalStorageCorrelationManager);
    });

    it("should create BrowserCorrelationManager for browser", () => {
      const manager = factory.createForPlatform(CorrelationPlatform.BROWSER);
      expect(manager).toBeInstanceOf(BrowserCorrelationManager);
    });

    it("should create BrowserCorrelationManager for web worker", () => {
      const manager = factory.createForPlatform(CorrelationPlatform.WEB_WORKER);
      expect(manager).toBeInstanceOf(BrowserCorrelationManager);
    });

    it("should create AsyncLocalStorageCorrelationManager for Electron main", () => {
      const manager = factory.createForPlatform(CorrelationPlatform.ELECTRON_MAIN);
      expect(manager).toBeInstanceOf(AsyncLocalStorageCorrelationManager);
    });

    it("should create BrowserCorrelationManager for Electron renderer", () => {
      const manager = factory.createForPlatform(CorrelationPlatform.ELECTRON_RENDERER);
      expect(manager).toBeInstanceOf(BrowserCorrelationManager);
    });
  });
});

describe("HttpCorrelationMiddleware", () => {
  let middleware: HttpCorrelationMiddleware;
  let mockContext: ICorrelationContext;

  beforeEach(() => {
    middleware = new HttpCorrelationMiddleware();
    mockContext = {
      id: "test-correlation-id" as CorrelationId,
      createdAt: new Date(),
      metadata: {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with default configuration", () => {
      expect(middleware).toBeDefined();
      expect(middleware.getName()).toBe("HttpCorrelationMiddleware");
    });

    it("should create instance with custom configuration", () => {
      const customMiddleware = new HttpCorrelationMiddleware({
        name: "CustomHttpMiddleware",
        enabled: false,
      });

      expect(customMiddleware.getName()).toBe("CustomHttpMiddleware");
    });
  });

  describe("process", () => {
    it("should enrich context with HTTP metadata", async () => {
      const mockRequest = {
        headers: {
          "user-agent": "test-agent",
        },
        url: "/test-path",
      };

      const result = await middleware.process(mockContext, mockRequest);

      expect(result).toBeDefined();
      expect(result.metadata?.httpRequest).toBe(true);
      expect(result.metadata?.userAgent).toBe("test-agent");
      expect(result.metadata?.requestPath).toBe("/test-path");
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it("should skip processing when disabled", async () => {
      const disabledMiddleware = new HttpCorrelationMiddleware({ enabled: false });

      const result = await disabledMiddleware.process(mockContext);

      expect(result).toEqual(mockContext);
    });

    it("should call next middleware in chain", async () => {
      const nextMiddleware = new MessageQueueCorrelationMiddleware();
      const processSpy = vi.spyOn(nextMiddleware, "process").mockResolvedValue(mockContext);

      middleware.setNext(nextMiddleware);

      await middleware.process(mockContext);

      expect(processSpy).toHaveBeenCalled();
    });
  });
});

describe("MessageQueueCorrelationMiddleware", () => {
  let middleware: MessageQueueCorrelationMiddleware;
  let mockContext: ICorrelationContext;

  beforeEach(() => {
    middleware = new MessageQueueCorrelationMiddleware();
    mockContext = {
      id: "test-correlation-id" as CorrelationId,
      createdAt: new Date(),
      metadata: {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("process", () => {
    it("should enrich context with message queue metadata", async () => {
      const mockRequest = {
        queueName: "test-queue",
        messageId: "msg-123",
      };

      const result = await middleware.process(mockContext, mockRequest);

      expect(result).toBeDefined();
      expect(result.metadata?.messageQueue).toBe(true);
      expect(result.metadata?.queueName).toBe("test-queue");
      expect(result.metadata?.messageId).toBe("msg-123");
      expect(result.metadata?.timestamp).toBeDefined();
    });
  });
});

describe("CorrelationMiddlewareChain", () => {
  let chain: CorrelationMiddlewareChain;
  let mockContext: ICorrelationContext;

  beforeEach(() => {
    chain = new CorrelationMiddlewareChain();
    mockContext = {
      id: "test-correlation-id" as CorrelationId,
      createdAt: new Date(),
      metadata: {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("add", () => {
    it("should add middleware to chain", () => {
      const middleware = new HttpCorrelationMiddleware();

      const result = chain.add(middleware);

      expect(result).toBe(chain); // Should return itself for chaining
      expect(chain.getMiddlewareNames()).toContain("HttpCorrelationMiddleware");
    });

    it("should chain multiple middleware", () => {
      const httpMiddleware = new HttpCorrelationMiddleware();
      const mqMiddleware = new MessageQueueCorrelationMiddleware();

      chain.add(httpMiddleware).add(mqMiddleware);

      const names = chain.getMiddlewareNames();
      expect(names).toHaveLength(2);
      expect(names).toContain("HttpCorrelationMiddleware");
      expect(names).toContain("MessageQueueCorrelationMiddleware");
    });
  });

  describe("remove", () => {
    it("should remove middleware by name", () => {
      const middleware = new HttpCorrelationMiddleware();
      chain.add(middleware);

      const removed = chain.remove("HttpCorrelationMiddleware");

      expect(removed).toBe(true);
      expect(chain.getMiddlewareNames()).not.toContain("HttpCorrelationMiddleware");
    });

    it("should return false for non-existent middleware", () => {
      const removed = chain.remove("NonExistentMiddleware");
      expect(removed).toBe(false);
    });
  });

  describe("process", () => {
    it("should return original context when no middleware", async () => {
      const result = await chain.process(mockContext);
      expect(result).toEqual(mockContext);
    });

    it("should process context through middleware chain", async () => {
      const httpMiddleware = new HttpCorrelationMiddleware();
      const mqMiddleware = new MessageQueueCorrelationMiddleware();

      chain.add(httpMiddleware).add(mqMiddleware);

      const result = await chain.process(mockContext, {
        headers: { "user-agent": "test" },
        url: "/test",
        queueName: "test-queue",
      });

      expect(result.metadata?.httpRequest).toBe(true);
      expect(result.metadata?.messageQueue).toBe(true);
    });
  });

  describe("clear", () => {
    it("should remove all middleware", () => {
      chain.add(new HttpCorrelationMiddleware());
      chain.add(new MessageQueueCorrelationMiddleware());

      chain.clear();

      expect(chain.getMiddlewareNames()).toHaveLength(0);
    });
  });
});
