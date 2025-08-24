/**
 * Integration tests for complete end-to-end workflows across @axon packages
 * Uses real @axon package interfaces for authentic workflow testing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { ObjectPool } from "../../src/pool/pool.classes.js";
import { SimpleFactory } from "../../src/factory/factory.classes.js";
import type { DIToken } from "../../src/container/container.types.js";
import type { ILogger } from "@axon/logger";
import { HighPerformancePinoLogger } from "@axon/logger";
import type { ILoggerConfig } from "@axon/logger";
import { EnhancedErrorFactory } from "@axon/errors";
import { ErrorRecoveryManager } from "@axon/errors";
import type { IConfigRepository, IConfigFactory } from "@axon/config";
import { ConfigRepository, ConfigFactory } from "@axon/config";

describe("End-to-End Workflow Integration", () => {
  let container: DIContainer;
  let testLogOutput: any[];
  let workflowMetrics: Record<string, any>;

  beforeEach(async () => {
    testLogOutput = [];
    workflowMetrics = {};

    // Create test stream for comprehensive workflow logging
    const { Writable } = await import("stream");
    const testStream = new Writable({
      write(chunk, _encoding, callback) {
        const logStr = chunk.toString();
        try {
          const logEntry = JSON.parse(logStr);
          testLogOutput.push(logEntry);
        } catch {
          testLogOutput.push({ message: logStr });
        }
        callback();
      },
    });

    container = new DIContainer({
      name: "EndToEndWorkflowContainer",
      enableMetrics: true,
    });

    // Register core infrastructure services using real @axon interfaces
    container.registerFactory("ILogger", async () => {
      const loggerConfig: Partial<ILoggerConfig> = {
        environment: "integration-test",
        logLevel: "debug",
        transports: [],
        enableCorrelationIds: true,
        timestampFormat: "iso",
        testStream: testStream,
        performance: {
          enabled: true,
          sampleRate: 1.0,
          thresholdMs: 50,
        },
      };

      const logger = new HighPerformancePinoLogger(loggerConfig);
      await (logger as any).loggerInitPromise;
      return logger;
    });

    container.registerFactory("IConfigRepository", () => {
      return new ConfigRepository({
        storageProvider: {
          async get(key: string) {
            const configs: Record<string, string> = {
              "workflow.maxRetries": "3",
              "workflow.timeoutMs": "5000",
              "workflow.enableRecovery": "true",
              "database.connectionString": "postgresql://localhost:5432/workflow_db",
              "database.maxConnections": "25",
              "cache.enabled": "true",
              "cache.ttlSeconds": "300",
              "notifications.enabled": "true",
              "notifications.emailProvider": "smtp",
              "security.enableJWT": "true",
              "security.jwtSecret": "test-secret-key",
              "metrics.enabled": "true",
              "audit.enabled": "true",
            };
            return configs[key] || null;
          },
          async set(key: string, value: string) {
            return true;
          },
          async delete(key: string) {
            return true;
          },
        },
      });
    });

    container.registerFactory("IConfigFactory", () => {
      const configRepo = container.resolve("IConfigRepository") as IConfigRepository;
      return new ConfigFactory(configRepo);
    });

    container.registerFactory("EnhancedErrorFactory", () => {
      return new EnhancedErrorFactory({
        correlationId: "workflow-test-123",
        service: "end-to-end-workflow",
        version: "1.0.0",
        environment: "integration-test",
      });
    });

    container.registerFactory("ErrorRecoveryManager", () => {
      return new ErrorRecoveryManager({
        maxRetries: 3,
        retryDelayMs: 100,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
      });
    });
  });

  afterEach(() => {
    container.dispose();
    testLogOutput = [];
    workflowMetrics = {};
  });

  describe("User Registration Workflow", () => {
    it("should execute complete user registration workflow using real @axon interfaces", async () => {
      // Define workflow interfaces
      interface IUserValidator {
        validateUserData(userData: any): Promise<{ valid: boolean; errors: string[] }>;
      }

      interface IUserRepository {
        createUser(userData: any): Promise<{ userId: string; created: boolean }>;
        getUserByEmail(email: string): Promise<any | null>;
      }

      interface INotificationService {
        sendWelcomeEmail(userId: string, email: string): Promise<boolean>;
      }

      interface IAuditService {
        logUserAction(userId: string, action: string, metadata: any): Promise<void>;
      }

      interface IUserRegistrationWorkflow {
        registerUser(userData: any): Promise<{
          success: boolean;
          userId?: string;
          errors?: string[];
          metrics: any;
        }>;
      }

      // Implement workflow components
      class UserValidator implements IUserValidator {
        constructor(
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
          private configRepository: IConfigRepository,
        ) {}

        async validateUserData(userData: any): Promise<{ valid: boolean; errors: string[] }> {
          this.logger.info("Starting user data validation", {
            hasEmail: !!userData.email,
            hasPassword: !!userData.password,
          });

          const errors: string[] = [];

          if (!userData.email || !userData.email.includes("@")) {
            errors.push("Invalid email address");
          }

          if (!userData.password || userData.password.length < 8) {
            errors.push("Password must be at least 8 characters");
          }

          if (!userData.firstName || userData.firstName.trim().length === 0) {
            errors.push("First name is required");
          }

          const isValid = errors.length === 0;

          this.logger.info("User data validation completed", {
            valid: isValid,
            errorCount: errors.length,
          });

          return { valid: isValid, errors };
        }
      }

      class UserRepository implements IUserRepository {
        private users = new Map<string, any>();

        constructor(
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
          private configRepository: IConfigRepository,
        ) {}

        async getUserByEmail(email: string): Promise<any | null> {
          this.logger.debug("Checking for existing user by email", { email });

          const existingUser = Array.from(this.users.values()).find((u) => u.email === email);

          this.logger.debug("User lookup completed", {
            email,
            userExists: !!existingUser,
          });

          return existingUser || null;
        }

        async createUser(userData: any): Promise<{ userId: string; created: boolean }> {
          this.logger.info("Creating new user", {
            email: userData.email,
            firstName: userData.firstName,
          });

          const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newUser = {
            userId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            createdAt: new Date().toISOString(),
            status: "active",
          };

          this.users.set(userId, newUser);

          this.logger.info("User created successfully", {
            userId,
            email: userData.email,
          });

          return { userId, created: true };
        }
      }

      class NotificationService implements INotificationService {
        constructor(
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
          private configRepository: IConfigRepository,
        ) {}

        async sendWelcomeEmail(userId: string, email: string): Promise<boolean> {
          this.logger.info("Sending welcome email", { userId, email });

          const notificationsEnabled = await this.configRepository.get("notifications.enabled");

          if (notificationsEnabled !== "true") {
            this.logger.warn("Notifications disabled, skipping email", { userId });
            return false;
          }

          // Simulate email sending
          await new Promise((resolve) => setTimeout(resolve, 50));

          this.logger.info("Welcome email sent successfully", { userId, email });
          return true;
        }
      }

      class AuditService implements IAuditService {
        private auditLogs: any[] = [];

        constructor(
          private logger: ILogger,
          private configRepository: IConfigRepository,
        ) {}

        async logUserAction(userId: string, action: string, metadata: any): Promise<void> {
          const auditEnabled = await this.configRepository.get("audit.enabled");

          if (auditEnabled !== "true") {
            return;
          }

          const auditEntry = {
            userId,
            action,
            metadata,
            timestamp: new Date().toISOString(),
            auditId: `audit-${Date.now()}`,
          };

          this.auditLogs.push(auditEntry);

          this.logger.debug("User action audited", {
            userId,
            action,
            auditId: auditEntry.auditId,
          });
        }

        getAuditLogs(): any[] {
          return [...this.auditLogs];
        }
      }

      class UserRegistrationWorkflow implements IUserRegistrationWorkflow {
        constructor(
          private userValidator: IUserValidator,
          private userRepository: IUserRepository,
          private notificationService: INotificationService,
          private auditService: IAuditService,
          private recoveryManager: ErrorRecoveryManager,
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
        ) {}

        async registerUser(userData: any): Promise<{
          success: boolean;
          userId?: string;
          errors?: string[];
          metrics: any;
        }> {
          const workflowStartTime = Date.now();

          this.logger.info("Starting user registration workflow", {
            email: userData.email,
            correlationId: "workflow-test-123",
          });

          try {
            // Step 1: Validate user data
            const validation = await this.userValidator.validateUserData(userData);

            if (!validation.valid) {
              await this.auditService.logUserAction("anonymous", "registration_failed", {
                reason: "validation_failed",
                errors: validation.errors,
              });

              return {
                success: false,
                errors: validation.errors,
                metrics: {
                  duration: Date.now() - workflowStartTime,
                  step: "validation",
                  outcome: "failed",
                },
              };
            }

            // Step 2: Check for existing user
            const existingUser = await this.userRepository.getUserByEmail(userData.email);

            if (existingUser) {
              await this.auditService.logUserAction(existingUser.userId, "registration_attempted", {
                reason: "user_already_exists",
              });

              return {
                success: false,
                errors: ["User with this email already exists"],
                metrics: {
                  duration: Date.now() - workflowStartTime,
                  step: "duplicate_check",
                  outcome: "failed",
                },
              };
            }

            // Step 3: Create user with recovery mechanism
            const userCreation = await this.recoveryManager.executeWithRecovery(
              "createUser",
              () => this.userRepository.createUser(userData),
              {
                onRetry: (attempt: number, error: Error) => {
                  this.logger.warn("User creation retry", {
                    attempt,
                    error: error.message,
                    email: userData.email,
                  });
                },
                onSuccess: (result: any) => {
                  this.logger.info("User creation succeeded after recovery", {
                    userId: result.userId,
                  });
                },
              },
            );

            // Step 4: Send welcome notification (with fallback handling)
            let notificationSent = false;
            try {
              notificationSent = await this.notificationService.sendWelcomeEmail(userCreation.userId, userData.email);
            } catch (error) {
              this.logger.warn("Welcome email failed, continuing workflow", {
                userId: userCreation.userId,
                error: (error as Error).message,
              });
            }

            // Step 5: Audit successful registration
            await this.auditService.logUserAction(userCreation.userId, "registration_completed", {
              email: userData.email,
              notificationSent,
              workflowDuration: Date.now() - workflowStartTime,
            });

            const finalMetrics = {
              duration: Date.now() - workflowStartTime,
              step: "completed",
              outcome: "success",
              notificationSent,
              userId: userCreation.userId,
            };

            this.logger.info("User registration workflow completed successfully", {
              userId: userCreation.userId,
              email: userData.email,
              metrics: finalMetrics,
            });

            return {
              success: true,
              userId: userCreation.userId,
              metrics: finalMetrics,
            };
          } catch (error) {
            const errorObj = error as Error;

            this.logger.error("User registration workflow failed", {
              error: errorObj.message,
              errorCode: (error as any).code,
              email: userData.email,
              duration: Date.now() - workflowStartTime,
            });

            await this.auditService.logUserAction("anonymous", "registration_failed", {
              reason: "workflow_error",
              error: errorObj.message,
              step: "workflow_execution",
            });

            return {
              success: false,
              errors: [errorObj.message],
              metrics: {
                duration: Date.now() - workflowStartTime,
                step: "error",
                outcome: "failed",
              },
            };
          }
        }
      }

      // Register workflow components with DI container
      const components = [
        {
          token: "IUserValidator",
          implementation: UserValidator,
          deps: ["ILogger", "EnhancedErrorFactory", "IConfigRepository"],
        },
        {
          token: "IUserRepository",
          implementation: UserRepository,
          deps: ["ILogger", "EnhancedErrorFactory", "IConfigRepository"],
        },
        {
          token: "INotificationService",
          implementation: NotificationService,
          deps: ["ILogger", "EnhancedErrorFactory", "IConfigRepository"],
        },
        { token: "IAuditService", implementation: AuditService, deps: ["ILogger", "IConfigRepository"] },
      ];

      components.forEach(({ token, implementation, deps }) => {
        container.register(token, implementation, {
          lifecycle: "singleton",
          dependencies: deps,
        });
      });

      container.register("IUserRegistrationWorkflow", UserRegistrationWorkflow, {
        lifecycle: "singleton",
        dependencies: [
          "IUserValidator",
          "IUserRepository",
          "INotificationService",
          "IAuditService",
          "ErrorRecoveryManager",
          "ILogger",
          "EnhancedErrorFactory",
        ],
      });

      // Execute complete user registration workflow
      const workflow = (await container.resolveAsync("IUserRegistrationWorkflow")) as IUserRegistrationWorkflow;

      const testUser = {
        email: "test.user@example.com",
        password: "securepassword123",
        firstName: "Test",
        lastName: "User",
      };

      const registrationResult = await workflow.registerUser(testUser);

      // Verify successful registration
      expect(registrationResult.success).toBe(true);
      expect(registrationResult.userId).toBeDefined();
      expect(registrationResult.errors).toBeUndefined();
      expect(registrationResult.metrics.outcome).toBe("success");
      expect(registrationResult.metrics.duration).toBeGreaterThan(0);

      // Verify audit trail
      const auditService = container.resolve("IAuditService") as any;
      const auditLogs = auditService.getAuditLogs();
      expect(auditLogs.length).toBeGreaterThan(0);

      const registrationAudit = auditLogs.find((log: any) => log.action === "registration_completed");
      expect(registrationAudit).toBeDefined();
      expect(registrationAudit.userId).toBe(registrationResult.userId);

      // Verify comprehensive logging
      const workflowLogs = testLogOutput.filter((log) => log.msg?.includes("registration workflow"));
      expect(workflowLogs.length).toBeGreaterThan(0);

      const completionLog = workflowLogs.find((log) => log.msg?.includes("completed successfully"));
      expect(completionLog).toBeDefined();
      expect(completionLog.userId).toBe(registrationResult.userId);
    });

    it("should handle workflow failures gracefully with proper error recovery", async () => {
      // Test workflow failure scenarios
      interface IFailingService {
        performAction(): Promise<string>;
      }

      class FailingService implements IFailingService {
        private attemptCount = 0;

        constructor(
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
        ) {}

        async performAction(): Promise<string> {
          this.attemptCount++;

          this.logger.debug("Attempting failing service action", {
            attempt: this.attemptCount,
          });

          if (this.attemptCount <= 2) {
            const error = this.errorFactory.createSystemError(
              `Service failure attempt ${this.attemptCount}`,
              "FAILING_SERVICE_ERROR",
            );
            throw error;
          }

          this.logger.info("Failing service succeeded on attempt", {
            attempt: this.attemptCount,
          });

          return `success-after-${this.attemptCount}-attempts`;
        }
      }

      interface IWorkflowOrchestrator {
        executeFailureRecoveryWorkflow(): Promise<{
          success: boolean;
          result?: string;
          attempts: number;
          recoveryTime: number;
        }>;
      }

      class WorkflowOrchestrator implements IWorkflowOrchestrator {
        constructor(
          private failingService: IFailingService,
          private recoveryManager: ErrorRecoveryManager,
          private logger: ILogger,
        ) {}

        async executeFailureRecoveryWorkflow(): Promise<{
          success: boolean;
          result?: string;
          attempts: number;
          recoveryTime: number;
        }> {
          const workflowStart = Date.now();
          let attemptCount = 0;

          this.logger.info("Starting failure recovery workflow");

          try {
            const result = await this.recoveryManager.executeWithRecovery(
              "failingServiceAction",
              () => this.failingService.performAction(),
              {
                onRetry: (attempt: number, error: Error) => {
                  attemptCount = attempt;
                  this.logger.warn("Workflow recovery attempt", {
                    attempt,
                    error: error.message,
                    errorCode: (error as any).code,
                  });
                },
                onSuccess: (result: string, totalAttempts: number) => {
                  attemptCount = totalAttempts;
                  this.logger.info("Workflow recovered successfully", {
                    result,
                    totalAttempts,
                  });
                },
                onFailure: (error: Error, totalAttempts: number) => {
                  attemptCount = totalAttempts;
                  this.logger.error("Workflow recovery failed permanently", {
                    error: error.message,
                    totalAttempts,
                  });
                },
              },
            );

            const recoveryTime = Date.now() - workflowStart;

            this.logger.info("Failure recovery workflow completed", {
              success: true,
              attempts: attemptCount,
              recoveryTime,
            });

            return {
              success: true,
              result,
              attempts: attemptCount,
              recoveryTime,
            };
          } catch (error) {
            const recoveryTime = Date.now() - workflowStart;

            this.logger.error("Failure recovery workflow failed", {
              error: (error as Error).message,
              attempts: attemptCount,
              recoveryTime,
            });

            return {
              success: false,
              attempts: attemptCount,
              recoveryTime,
            };
          }
        }
      }

      // Register failure recovery workflow components
      container.register("IFailingService", FailingService, {
        lifecycle: "singleton",
        dependencies: ["ILogger", "EnhancedErrorFactory"],
      });

      container.register("IWorkflowOrchestrator", WorkflowOrchestrator, {
        lifecycle: "singleton",
        dependencies: ["IFailingService", "ErrorRecoveryManager", "ILogger"],
      });

      // Execute failure recovery workflow
      const orchestrator = (await container.resolveAsync("IWorkflowOrchestrator")) as IWorkflowOrchestrator;
      const recoveryResult = await orchestrator.executeFailureRecoveryWorkflow();

      // Verify recovery was successful
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.result).toContain("success-after-3-attempts");
      expect(recoveryResult.attempts).toBe(3);
      expect(recoveryResult.recoveryTime).toBeGreaterThan(0);

      // Verify recovery logging
      const recoveryLogs = testLogOutput.filter((log) => log.msg?.includes("recovery") || log.msg?.includes("attempt"));
      expect(recoveryLogs.length).toBeGreaterThan(0);

      const retryLogs = recoveryLogs.filter((log) => log.msg?.includes("recovery attempt"));
      expect(retryLogs.length).toBe(2); // Should have 2 retry attempts before success

      const successLog = testLogOutput.find((log) => log.msg?.includes("recovered successfully"));
      expect(successLog).toBeDefined();
    });
  });

  describe("Multi-Service Integration Workflows", () => {
    it("should coordinate complex multi-service workflows with real @axon system integration", async () => {
      // Define complex multi-service workflow
      interface IOrderProcessingWorkflow {
        processOrder(orderData: any): Promise<{
          success: boolean;
          orderId?: string;
          steps: string[];
          metrics: any;
        }>;
      }

      interface IInventoryService {
        checkInventory(productId: string, quantity: number): Promise<boolean>;
        reserveInventory(productId: string, quantity: number): Promise<string>;
      }

      interface IPaymentService {
        processPayment(amount: number, paymentMethod: string): Promise<string>;
      }

      interface IShippingService {
        calculateShipping(address: any): Promise<{ cost: number; estimatedDays: number }>;
        scheduleShipment(orderId: string, address: any): Promise<string>;
      }

      interface IOrderRepository {
        createOrder(orderData: any): Promise<string>;
        updateOrderStatus(orderId: string, status: string): Promise<void>;
      }

      // Implement multi-service workflow components
      class InventoryService implements IInventoryService {
        private inventory = new Map([
          ["product-123", 100],
          ["product-456", 50],
          ["product-789", 25],
        ]);

        constructor(private logger: ILogger) {}

        async checkInventory(productId: string, quantity: number): Promise<boolean> {
          this.logger.debug("Checking inventory", { productId, quantity });

          const available = this.inventory.get(productId) || 0;
          const hasInventory = available >= quantity;

          this.logger.info("Inventory check completed", {
            productId,
            requested: quantity,
            available,
            hasInventory,
          });

          return hasInventory;
        }

        async reserveInventory(productId: string, quantity: number): Promise<string> {
          this.logger.info("Reserving inventory", { productId, quantity });

          const available = this.inventory.get(productId) || 0;

          if (available < quantity) {
            throw new Error(`Insufficient inventory for ${productId}`);
          }

          this.inventory.set(productId, available - quantity);
          const reservationId = `res-${Date.now()}-${productId}`;

          this.logger.info("Inventory reserved", {
            productId,
            quantity,
            reservationId,
            remaining: this.inventory.get(productId),
          });

          return reservationId;
        }
      }

      class PaymentService implements IPaymentService {
        constructor(
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
        ) {}

        async processPayment(amount: number, paymentMethod: string): Promise<string> {
          this.logger.info("Processing payment", { amount, paymentMethod });

          // Simulate payment processing time
          await new Promise((resolve) => setTimeout(resolve, 100));

          if (paymentMethod === "invalid_card") {
            const error = this.errorFactory.createApplicationError(
              "Payment failed: Invalid payment method",
              "PAYMENT_FAILED",
            );
            throw error;
          }

          const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          this.logger.info("Payment processed successfully", {
            amount,
            paymentMethod,
            transactionId,
          });

          return transactionId;
        }
      }

      class ShippingService implements IShippingService {
        constructor(private logger: ILogger) {}

        async calculateShipping(address: any): Promise<{ cost: number; estimatedDays: number }> {
          this.logger.debug("Calculating shipping", {
            country: address.country,
            state: address.state,
          });

          let cost = 10.0;
          let estimatedDays = 5;

          if (address.country !== "US") {
            cost = 25.0;
            estimatedDays = 10;
          }

          if (address.expedited) {
            cost *= 2;
            estimatedDays = Math.ceil(estimatedDays / 2);
          }

          this.logger.info("Shipping calculated", {
            address: address.country,
            cost,
            estimatedDays,
            expedited: address.expedited,
          });

          return { cost, estimatedDays };
        }

        async scheduleShipment(orderId: string, address: any): Promise<string> {
          this.logger.info("Scheduling shipment", { orderId });

          const shipmentId = `ship-${Date.now()}-${orderId}`;

          this.logger.info("Shipment scheduled", {
            orderId,
            shipmentId,
            destination: address.country,
          });

          return shipmentId;
        }
      }

      class OrderRepository implements IOrderRepository {
        private orders = new Map<string, any>();

        constructor(private logger: ILogger) {}

        async createOrder(orderData: any): Promise<string> {
          const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const order = {
            orderId,
            ...orderData,
            status: "created",
            createdAt: new Date().toISOString(),
          };

          this.orders.set(orderId, order);

          this.logger.info("Order created", { orderId, customerId: orderData.customerId });

          return orderId;
        }

        async updateOrderStatus(orderId: string, status: string): Promise<void> {
          const order = this.orders.get(orderId);

          if (!order) {
            throw new Error(`Order not found: ${orderId}`);
          }

          order.status = status;
          order.updatedAt = new Date().toISOString();

          this.logger.info("Order status updated", { orderId, status });
        }

        getOrder(orderId: string): any {
          return this.orders.get(orderId);
        }
      }

      class OrderProcessingWorkflow implements IOrderProcessingWorkflow {
        constructor(
          private inventoryService: IInventoryService,
          private paymentService: IPaymentService,
          private shippingService: IShippingService,
          private orderRepository: IOrderRepository,
          private logger: ILogger,
          private errorFactory: EnhancedErrorFactory,
          private recoveryManager: ErrorRecoveryManager,
        ) {}

        async processOrder(orderData: any): Promise<{
          success: boolean;
          orderId?: string;
          steps: string[];
          metrics: any;
        }> {
          const workflowStart = Date.now();
          const steps: string[] = [];
          let orderId: string | undefined;

          this.logger.info("Starting order processing workflow", {
            customerId: orderData.customerId,
            productCount: orderData.items.length,
          });

          try {
            // Step 1: Validate inventory for all items
            steps.push("inventory_validation");
            this.logger.info("Validating inventory for all items");

            for (const item of orderData.items) {
              const hasInventory = await this.inventoryService.checkInventory(item.productId, item.quantity);

              if (!hasInventory) {
                throw this.errorFactory.createApplicationError(
                  `Insufficient inventory for product ${item.productId}`,
                  "INSUFFICIENT_INVENTORY",
                );
              }
            }

            // Step 2: Calculate shipping
            steps.push("shipping_calculation");
            const shippingInfo = await this.shippingService.calculateShipping(orderData.shippingAddress);
            const totalAmount = orderData.subtotal + shippingInfo.cost;

            // Step 3: Create order record
            steps.push("order_creation");
            orderId = await this.orderRepository.createOrder({
              ...orderData,
              shippingCost: shippingInfo.cost,
              totalAmount: totalAmount,
              estimatedDelivery: shippingInfo.estimatedDays,
            });

            // Step 4: Process payment with recovery
            steps.push("payment_processing");
            const transactionId = await this.recoveryManager.executeWithRecovery(
              "processPayment",
              () => this.paymentService.processPayment(totalAmount, orderData.paymentMethod),
              {
                onRetry: (attempt: number, error: Error) => {
                  this.logger.warn("Payment retry attempt", {
                    orderId,
                    attempt,
                    error: error.message,
                  });
                },
              },
            );

            // Step 5: Reserve inventory
            steps.push("inventory_reservation");
            const reservationIds = [];

            for (const item of orderData.items) {
              const reservationId = await this.inventoryService.reserveInventory(item.productId, item.quantity);
              reservationIds.push(reservationId);
            }

            // Step 6: Schedule shipment
            steps.push("shipment_scheduling");
            const shipmentId = await this.shippingService.scheduleShipment(orderId, orderData.shippingAddress);

            // Step 7: Update order status
            steps.push("order_completion");
            await this.orderRepository.updateOrderStatus(orderId, "confirmed");

            const workflowDuration = Date.now() - workflowStart;

            this.logger.info("Order processing workflow completed successfully", {
              orderId,
              transactionId,
              shipmentId,
              steps: steps.length,
              duration: workflowDuration,
            });

            return {
              success: true,
              orderId,
              steps,
              metrics: {
                duration: workflowDuration,
                steps: steps.length,
                transactionId,
                shipmentId,
                reservationIds,
              },
            };
          } catch (error) {
            const workflowDuration = Date.now() - workflowStart;

            this.logger.error("Order processing workflow failed", {
              orderId,
              error: (error as Error).message,
              errorCode: (error as any).code,
              completedSteps: steps,
              duration: workflowDuration,
            });

            // Update order status if order was created
            if (orderId) {
              try {
                await this.orderRepository.updateOrderStatus(orderId, "failed");
              } catch (updateError) {
                this.logger.error("Failed to update order status", {
                  orderId,
                  updateError: (updateError as Error).message,
                });
              }
            }

            return {
              success: false,
              orderId,
              steps,
              metrics: {
                duration: workflowDuration,
                steps: steps.length,
                failedAt: steps[steps.length - 1] || "initialization",
                error: (error as Error).message,
              },
            };
          }
        }
      }

      // Register all workflow services
      const services = [
        { token: "IInventoryService", implementation: InventoryService, deps: ["ILogger"] },
        { token: "IPaymentService", implementation: PaymentService, deps: ["ILogger", "EnhancedErrorFactory"] },
        { token: "IShippingService", implementation: ShippingService, deps: ["ILogger"] },
        { token: "IOrderRepository", implementation: OrderRepository, deps: ["ILogger"] },
      ];

      services.forEach(({ token, implementation, deps }) => {
        container.register(token, implementation, {
          lifecycle: "singleton",
          dependencies: deps,
        });
      });

      container.register("IOrderProcessingWorkflow", OrderProcessingWorkflow, {
        lifecycle: "singleton",
        dependencies: [
          "IInventoryService",
          "IPaymentService",
          "IShippingService",
          "IOrderRepository",
          "ILogger",
          "EnhancedErrorFactory",
          "ErrorRecoveryManager",
        ],
      });

      // Execute complex order processing workflow
      const orderWorkflow = (await container.resolveAsync("IOrderProcessingWorkflow")) as IOrderProcessingWorkflow;

      const testOrder = {
        customerId: "customer-123",
        items: [
          { productId: "product-123", quantity: 2, price: 25.0 },
          { productId: "product-456", quantity: 1, price: 50.0 },
        ],
        subtotal: 100.0,
        paymentMethod: "credit_card",
        shippingAddress: {
          country: "US",
          state: "CA",
          expedited: false,
        },
      };

      const processingResult = await orderWorkflow.processOrder(testOrder);

      // Verify successful multi-service workflow
      expect(processingResult.success).toBe(true);
      expect(processingResult.orderId).toBeDefined();
      expect(processingResult.steps).toHaveLength(7);
      expect(processingResult.steps).toEqual([
        "inventory_validation",
        "shipping_calculation",
        "order_creation",
        "payment_processing",
        "inventory_reservation",
        "shipment_scheduling",
        "order_completion",
      ]);

      expect(processingResult.metrics.duration).toBeGreaterThan(0);
      expect(processingResult.metrics.transactionId).toBeDefined();
      expect(processingResult.metrics.shipmentId).toBeDefined();
      expect(processingResult.metrics.reservationIds).toHaveLength(2);

      // Verify comprehensive workflow logging
      const workflowLogs = testLogOutput.filter(
        (log) => log.msg?.includes("workflow") || log.msg?.includes("completed successfully"),
      );
      expect(workflowLogs.length).toBeGreaterThan(0);

      const completionLog = testLogOutput.find((log) =>
        log.msg?.includes("Order processing workflow completed successfully"),
      );
      expect(completionLog).toBeDefined();
      expect(completionLog.orderId).toBe(processingResult.orderId);
      expect(completionLog.steps).toBe(7);

      // Verify individual service logs
      const inventoryLogs = testLogOutput.filter(
        (log) => log.msg?.includes("inventory") || log.msg?.includes("Inventory"),
      );
      const paymentLogs = testLogOutput.filter((log) => log.msg?.includes("payment") || log.msg?.includes("Payment"));
      const shippingLogs = testLogOutput.filter(
        (log) => log.msg?.includes("shipping") || log.msg?.includes("Shipping"),
      );

      expect(inventoryLogs.length).toBeGreaterThan(0);
      expect(paymentLogs.length).toBeGreaterThan(0);
      expect(shippingLogs.length).toBeGreaterThan(0);
    });
  });
});
