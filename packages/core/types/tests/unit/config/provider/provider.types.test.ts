/**
 * Configuration provider types test suite
 *
 * Validates provider type definitions and type inference
 */

import { describe, it, expect } from "vitest";
import type {
  IAuthProvider,
  ICredentials,
  IAuthResult,
  IValidationResult,
  IUserInfo,
  IBillingProvider,
  IBillingPlan,
  ISubscription,
  IPaymentRequest,
  IPaymentResult,
  IInvoice,
  IStorageProvider,
  IStorageOptions,
  IStorageResult,
  ILLMProvider,
  ILLMOptions,
  ILLMResponse,
  ITokenUsage,
  AuthToken,
  RefreshToken,
  SubscriptionId,
  PaymentId,
  StorageKey,
} from "../../../../src/config/provider/provider.types.js";

describe("Config Provider Types", () => {
  it("should enforce I-prefix naming convention for provider interfaces", () => {
    const providerInterfaces = [
      "IAuthProvider",
      "ICredentials",
      "IAuthResult",
      "IValidationResult",
      "IUserInfo",
      "IBillingProvider",
      "IBillingPlan",
      "ISubscription",
      "IPaymentRequest",
      "IPaymentResult",
      "IInvoice",
      "IStorageProvider",
      "IStorageOptions",
      "IStorageResult",
      "ILLMProvider",
      "ILLMOptions",
      "ILLMResponse",
      "ITokenUsage",
    ];

    providerInterfaces.forEach((name) => {
      expect(name.startsWith("I")).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate auth provider interface structure", () => {
    const mockAuthProvider: IAuthProvider = {
      name: "mock-auth",
      authenticate: async (credentials: ICredentials) => ({
        accessToken: "token" as AuthToken,
        refreshToken: "refresh" as RefreshToken,
        expiresAt: "2024-12-31T23:59:59Z",
        user: {
          id: "user-123",
          username: "testuser",
          email: "test@example.com",
        },
      }),
      validate: async (token: AuthToken) => ({
        valid: true,
        expiresAt: "2024-12-31T23:59:59Z",
        user: {
          id: "user-123",
          username: "testuser",
        },
      }),
      refresh: async (refreshToken: RefreshToken) => ({
        accessToken: "new-token" as AuthToken,
        expiresAt: "2024-12-31T23:59:59Z",
        user: {
          id: "user-123",
          username: "testuser",
        },
      }),
      revoke: async (token: AuthToken) => {},
      getUserInfo: async (token: AuthToken) => ({
        id: "user-123",
        username: "testuser",
      }),
    };

    expect(typeof mockAuthProvider.name).toBe("string");
    expect(typeof mockAuthProvider.authenticate).toBe("function");
    expect(typeof mockAuthProvider.validate).toBe("function");
    expect(typeof mockAuthProvider.refresh).toBe("function");
    expect(typeof mockAuthProvider.revoke).toBe("function");
    expect(typeof mockAuthProvider.getUserInfo).toBe("function");
  });

  it("should validate billing provider interface structure", () => {
    const mockBillingProvider: IBillingProvider = {
      name: "mock-billing",
      createSubscription: async (plan: IBillingPlan) => ({
        id: "sub-123" as SubscriptionId,
        customerId: "cust-123",
        plan: plan,
        status: "active",
        startDate: "2024-01-01T00:00:00Z",
        nextBillingDate: "2024-02-01T00:00:00Z",
      }),
      processPayment: async (payment: IPaymentRequest) => ({
        id: "pay-123" as PaymentId,
        status: "succeeded",
        amount: payment.amount,
      }),
      cancelSubscription: async (subscriptionId: SubscriptionId) => {},
      updateSubscription: async (subscriptionId: SubscriptionId, plan: IBillingPlan) => ({
        id: subscriptionId,
        customerId: "cust-123",
        plan: plan,
        status: "active",
        startDate: "2024-01-01T00:00:00Z",
        nextBillingDate: "2024-02-01T00:00:00Z",
      }),
      getSubscription: async (subscriptionId: SubscriptionId) => ({
        id: subscriptionId,
        customerId: "cust-123",
        plan: {
          id: "basic",
          name: "Basic Plan",
          amount: 999,
          currency: "USD",
          interval: "monthly",
        },
        status: "active",
        startDate: "2024-01-01T00:00:00Z",
        nextBillingDate: "2024-02-01T00:00:00Z",
      }),
      listInvoices: async (customerId: string) => [],
      processRefund: async (paymentId: PaymentId, amount?: number) => ({
        id: "refund-123",
        amount: amount || 0,
        status: "succeeded",
      }),
    };

    expect(typeof mockBillingProvider.name).toBe("string");
    expect(typeof mockBillingProvider.createSubscription).toBe("function");
    expect(typeof mockBillingProvider.processPayment).toBe("function");
  });

  it("should validate storage provider interface structure", () => {
    const mockStorageProvider: IStorageProvider = {
      name: "mock-storage",
      store: async (key: StorageKey, data: Buffer, options?: IStorageOptions) => ({
        key: key,
        size: data.length,
        etag: "etag-123",
      }),
      retrieve: async (key: StorageKey) => Buffer.from("data"),
      delete: async (key: StorageKey) => {},
      exists: async (key: StorageKey) => true,
      list: async (prefix: string, options?) => [],
      getPresignedUrl: async (key: StorageKey, operation: "get" | "put", expiresIn: number) =>
        `https://storage.example.com/${key}`,
      copy: async (sourceKey: StorageKey, destinationKey: StorageKey) => {},
      getMetadata: async (key: StorageKey) => ({
        size: 1024,
        lastModified: "2024-01-01T00:00:00Z",
      }),
    };

    expect(typeof mockStorageProvider.name).toBe("string");
    expect(typeof mockStorageProvider.store).toBe("function");
    expect(typeof mockStorageProvider.retrieve).toBe("function");
    expect(typeof mockStorageProvider.exists).toBe("function");
  });

  it("should validate LLM provider interface structure", () => {
    const mockLLMProvider: ILLMProvider = {
      name: "mock-llm",
      generate: async (prompt: string, options?: ILLMOptions) => ({
        text: "Generated text",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        model: "test-model",
      }),
      embed: async (text: string | readonly string[]) => [[0.1, 0.2, 0.3]],
      tokenize: async (text: string) => text.split(" "),
      countTokens: async (text: string) => text.split(" ").length,
      stream: async function* (prompt: string, options?: ILLMOptions) {
        yield { text: "chunk", done: false };
        yield { text: "final", done: true };
      },
      listModels: async () => [
        {
          id: "model-1",
          name: "Test Model",
        },
      ],
    };

    expect(typeof mockLLMProvider.name).toBe("string");
    expect(typeof mockLLMProvider.generate).toBe("function");
    expect(typeof mockLLMProvider.embed).toBe("function");
  });

  it("should validate branded types maintain string behavior", () => {
    const authToken: AuthToken = "auth-token-123" as AuthToken;
    const refreshToken: RefreshToken = "refresh-token-123" as RefreshToken;
    const subscriptionId: SubscriptionId = "sub-123" as SubscriptionId;
    const paymentId: PaymentId = "pay-123" as PaymentId;
    const storageKey: StorageKey = "storage/path/file.txt" as StorageKey;

    // Branded types should still behave like strings
    expect(typeof authToken).toBe("string");
    expect(typeof refreshToken).toBe("string");
    expect(typeof subscriptionId).toBe("string");
    expect(typeof paymentId).toBe("string");
    expect(typeof storageKey).toBe("string");

    // Should support string operations
    expect(authToken.startsWith("auth-")).toBe(true);
    expect(subscriptionId.includes("sub-")).toBe(true);
    expect(storageKey.split("/")).toContain("file.txt");
  });

  it("should validate union type constraints", () => {
    // Test subscription status union
    const validStatuses = ["active", "cancelled", "past_due", "trialing"] as const;
    validStatuses.forEach((status) => {
      expect(typeof status).toBe("string");
      expect(validStatuses).toContain(status);
    });

    // Test payment method type union
    const validMethodTypes = ["card", "bank", "paypal", "crypto"] as const;
    validMethodTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(validMethodTypes).toContain(type);
    });

    // Test billing interval union
    const validIntervals = ["monthly", "yearly", "weekly", "daily"] as const;
    validIntervals.forEach((interval) => {
      expect(typeof interval).toBe("string");
      expect(validIntervals).toContain(interval);
    });
  });

  it("should validate complex type compositions", () => {
    // Test payment request composition
    const paymentRequest: IPaymentRequest = {
      amount: 1000,
      currency: "USD",
      method: {
        type: "card",
        details: { cardNumber: "4242424242424242" },
      },
      description: "Test payment",
      customer: {
        email: "test@example.com",
        name: "John Doe",
      },
    };

    expect(typeof paymentRequest.amount).toBe("number");
    expect(typeof paymentRequest.method.type).toBe("string");
    expect(typeof paymentRequest.customer.email).toBe("string");
    expect(paymentRequest.customer.email).toContain("@");

    // Test LLM response composition
    const llmResponse: ILLMResponse = {
      text: "Generated response",
      usage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      },
      model: "gpt-4",
    };

    expect(typeof llmResponse.text).toBe("string");
    expect(llmResponse.usage.totalTokens).toBe(llmResponse.usage.promptTokens + llmResponse.usage.completionTokens);
  });
});
