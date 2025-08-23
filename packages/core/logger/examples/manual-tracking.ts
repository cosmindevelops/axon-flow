/**
 * Manual Performance Tracking Example
 *
 * This example demonstrates manual performance tracking without decorators
 * for scenarios where decorators cannot be used or are not preferred.
 */

import { EnhancedPerformanceTracker, IEnhancedPerformanceConfig } from "../src/performance/index.js";

// Configuration for the tracker
const config: IEnhancedPerformanceConfig = {
  enabled: true,
  sampleRate: 0.2, // Monitor 20% of operations
  thresholdMs: 100,
  enableMemoryTracking: true,
  enableGCTracking: true,
  maxLatencyHistory: 1000,
  maxGCEventHistory: 50,
  resourceMetricsInterval: 5000,
  enableMeasurementPooling: true,
  measurementPoolInitialSize: 50,
  measurementPoolMaxSize: 200,
  enableEnvironmentOptimization: true,
  enableAutoProfileSelection: false,
  enableParityValidation: false,
  parityValidationInterval: 0,
  enableWebWorkerSupport: false,
  enableBrowserFallbacks: true,
};

const tracker = new EnhancedPerformanceTracker(config);

// Example service with manual tracking
class OrderService {
  private orders: Map<string, Order> = new Map();

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    // Start performance tracking
    const measurement = tracker.startOperation("order-creation", {
      operation: "create",
      itemCount: orderData.items.length,
      customerType: orderData.customerType,
    });

    try {
      // Simulate order validation
      await this.validateOrder(orderData);

      // Simulate order processing
      const order: Order = {
        id: this.generateId(),
        customerId: orderData.customerId,
        items: orderData.items,
        total: this.calculateTotal(orderData.items),
        status: "pending",
        createdAt: new Date(),
      };

      // Simulate async database save
      await this.delay(Math.random() * 100 + 50);
      this.orders.set(order.id, order);

      // Complete tracking - success
      tracker.finishOperation(measurement);
      tracker.recordSuccess();

      return order;
    } catch (error) {
      // Complete tracking - failure
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const measurement = tracker.startOperation("order-retrieval", {
      operation: "get",
      orderId: orderId.substring(0, 8) + "...", // Don't log full ID
    });

    try {
      // Simulate database lookup
      await this.delay(Math.random() * 50);
      const order = this.orders.get(orderId) || null;

      tracker.finishOperation(measurement);
      tracker.recordSuccess();

      return order;
    } catch (error) {
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const measurement = tracker.startOperation("order-status-update", {
      operation: "update",
      newStatus: status,
      orderId: orderId.substring(0, 8) + "...",
    });

    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Simulate status validation
      await this.delay(25);

      order.status = status;
      order.updatedAt = new Date();

      tracker.finishOperation(measurement);
      tracker.recordSuccess();
    } catch (error) {
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }

  async processPayment(orderId: string, paymentMethod: string): Promise<PaymentResult> {
    const measurement = tracker.startOperation("payment-processing", {
      operation: "payment",
      method: paymentMethod,
      orderId: orderId.substring(0, 8) + "...",
    });

    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Simulate payment processing (can be slow)
      await this.delay(Math.random() * 500 + 200);

      const paymentResult: PaymentResult = {
        success: Math.random() > 0.1, // 90% success rate
        transactionId: this.generateId(),
        amount: order.total,
        processedAt: new Date(),
      };

      if (!paymentResult.success) {
        throw new Error("Payment processing failed");
      }

      order.status = "paid";
      order.updatedAt = new Date();

      tracker.finishOperation(measurement);
      tracker.recordSuccess();

      return paymentResult;
    } catch (error) {
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }

  // Batch processing with manual tracking
  async processBulkOrders(orders: CreateOrderRequest[]): Promise<BulkProcessResult> {
    const measurement = tracker.startOperation("bulk-order-processing", {
      operation: "bulk",
      orderCount: orders.length,
      estimatedProcessingTime: orders.length * 100, // estimate
    });

    try {
      const results: BulkProcessResult = {
        successful: 0,
        failed: 0,
        orders: [],
        errors: [],
      };

      for (const orderData of orders) {
        try {
          const order = await this.createOrder(orderData);
          results.orders.push(order);
          results.successful++;
        } catch (error) {
          results.errors.push({
            orderData,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          results.failed++;
        }
      }

      tracker.finishOperation(measurement);
      if (results.failed === 0) {
        tracker.recordSuccess();
      } else {
        tracker.recordFailure();
      }

      return results;
    } catch (error) {
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }

  // Helper methods
  private async validateOrder(orderData: CreateOrderRequest): Promise<void> {
    const measurement = tracker.startOperation("order-validation", {
      operation: "validate",
      itemCount: orderData.items.length,
    });

    try {
      // Simulate validation logic
      await this.delay(25);

      if (!orderData.customerId) {
        throw new Error("Customer ID is required");
      }

      if (!orderData.items || orderData.items.length === 0) {
        throw new Error("Order must contain at least one item");
      }

      tracker.finishOperation(measurement);
      tracker.recordSuccess();
    } catch (error) {
      tracker.finishOperation(measurement);
      tracker.recordFailure();
      throw error;
    }
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Performance monitoring setup
function setupPerformanceMonitoring(tracker: EnhancedPerformanceTracker): void {
  console.log("🚀 Setting up performance monitoring...");

  // Detailed monitoring every 30 seconds
  setInterval(() => {
    const metrics = tracker.getMetrics();
    const memoryAnalysis = tracker.getMemoryAnalysis();

    console.log("\n📊 Performance Dashboard:");

    // Operation metrics by category
    const categories = ["order-creation", "order-retrieval", "payment-processing", "bulk-order-processing"];
    categories.forEach((category) => {
      const categoryMetrics = tracker.getCategoryMetrics(category);
      if (categoryMetrics.count > 0) {
        console.log(`  ${category}:`);
        console.log(`    Operations: ${categoryMetrics.count}`);
        console.log(`    Avg Latency: ${categoryMetrics.averageLatency.toFixed(2)}ms`);
        console.log(`    P95 Latency: ${categoryMetrics.p95Latency.toFixed(2)}ms`);
        console.log(`    Throughput: ${categoryMetrics.throughput.toFixed(1)} ops/sec`);
      }
    });

    // Overall metrics
    console.log("\n  Overall Performance:");
    console.log(`    Total Operations: ${metrics.operation.count}`);
    console.log(`    Average Latency: ${metrics.operation.averageLatency.toFixed(2)}ms`);
    console.log(`    P95 Latency: ${metrics.operation.p95Latency.toFixed(2)}ms`);
    console.log(`    P99 Latency: ${metrics.operation.p99Latency.toFixed(2)}ms`);
    console.log(`    Throughput: ${metrics.operation.throughput.toFixed(1)} ops/sec`);

    // Memory health
    console.log("\n  Memory Health:");
    console.log(`    Status: ${memoryAnalysis.health}`);
    console.log(`    Pressure: ${memoryAnalysis.pressure}`);
    console.log(`    Trend: ${memoryAnalysis.trend}`);
    console.log(`    Heap Used: ${Math.round(metrics.resource.memory.heapUsed / 1024 / 1024)}MB`);
    console.log(`    Utilization: ${metrics.resource.memory.utilization.toFixed(1)}%`);

    // Pool efficiency
    console.log("\n  Pool Performance:");
    console.log(`    Pool Utilization: ${metrics.measurementPoolUtilization.toFixed(1)}%`);
    console.log(`    Pool Efficiency: ${tracker.getPoolEfficiency().toFixed(1)}%`);

    // GC events
    if (metrics.gcEvents.length > 0) {
      const recentGC = metrics.gcEvents.slice(-5);
      const avgGCTime = recentGC.reduce((sum, gc) => sum + gc.duration, 0) / recentGC.length;
      console.log("\n  Garbage Collection:");
      console.log(`    Recent Events: ${recentGC.length}`);
      console.log(`    Avg GC Time: ${avgGCTime.toFixed(2)}ms`);
    }

    // Alerts
    if (memoryAnalysis.leakDetected) {
      console.warn("\n🚨 ALERT: Memory leak detected!");
      console.warn("Recommendations:", memoryAnalysis.recommendations);
    }

    if (memoryAnalysis.pressure === "high" || memoryAnalysis.pressure === "critical") {
      console.warn(`\n⚠️ WARNING: ${memoryAnalysis.pressure.toUpperCase()} memory pressure`);
    }

    if (metrics.operation.p95Latency > 500) {
      console.warn("\n⚠️ WARNING: High P95 latency detected");
    }
  }, 30000);

  // Simple health check every 10 seconds
  setInterval(() => {
    const memoryAnalysis = tracker.getMemoryAnalysis();
    const metrics = tracker.getMetrics();

    if (memoryAnalysis.leakDetected || memoryAnalysis.pressure === "critical" || metrics.operation.p99Latency > 1000) {
      console.error("💥 CRITICAL: Performance issues detected!");
    }
  }, 10000);
}

// Usage example
async function runExample(): Promise<void> {
  console.log("Starting manual performance tracking example...\n");

  const orderService = new OrderService();
  setupPerformanceMonitoring(tracker);

  // Create sample orders
  const sampleOrders: CreateOrderRequest[] = [
    {
      customerId: "customer-1",
      customerType: "premium",
      items: [
        { id: "item-1", name: "Widget A", price: 29.99, quantity: 2 },
        { id: "item-2", name: "Widget B", price: 49.99, quantity: 1 },
      ],
    },
    {
      customerId: "customer-2",
      customerType: "standard",
      items: [{ id: "item-3", name: "Gadget X", price: 19.99, quantity: 3 }],
    },
    {
      customerId: "customer-3",
      customerType: "premium",
      items: [
        { id: "item-1", name: "Widget A", price: 29.99, quantity: 1 },
        { id: "item-4", name: "Premium Tool", price: 199.99, quantity: 1 },
      ],
    },
  ];

  try {
    // Individual order processing
    console.log("Processing individual orders...");
    const orders: Order[] = [];

    for (const orderData of sampleOrders) {
      const order = await orderService.createOrder(orderData);
      orders.push(order);
      console.log(`Created order ${order.id} for customer ${order.customerId}`);

      // Simulate some retrieval operations
      await orderService.getOrder(order.id);
    }

    // Update order statuses
    console.log("\nUpdating order statuses...");
    for (const order of orders) {
      await orderService.updateOrderStatus(order.id, "processing");
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
    }

    // Process payments
    console.log("\nProcessing payments...");
    for (const order of orders) {
      try {
        const paymentResult = await orderService.processPayment(order.id, "credit_card");
        console.log(`Payment processed for order ${order.id}: ${paymentResult.success ? "SUCCESS" : "FAILED"}`);
      } catch (error) {
        console.log(`Payment failed for order ${order.id}: ${error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 150)); // Delay between payments
    }

    // Bulk processing example
    console.log("\nTesting bulk processing...");
    const bulkOrders = Array.from({ length: 5 }, (_, i) => ({
      customerId: `bulk-customer-${i}`,
      customerType: "standard" as const,
      items: [{ id: `bulk-item-${i}`, name: `Bulk Item ${i}`, price: 10.99, quantity: 1 }],
    }));

    const bulkResult = await orderService.processBulkOrders(bulkOrders);
    console.log(`Bulk processing completed: ${bulkResult.successful} successful, ${bulkResult.failed} failed`);

    // Let monitoring run for a bit to show metrics
    console.log("\nWaiting for performance metrics...");
    await new Promise((resolve) => setTimeout(resolve, 35000));
  } catch (error) {
    console.error("Example failed:", error);
  }

  // Final performance report
  const finalMetrics = tracker.getMetrics();
  console.log("\n📈 Final Performance Summary:");
  console.log(`Total Operations: ${finalMetrics.operation.count}`);
  console.log(`Average Latency: ${finalMetrics.operation.averageLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${finalMetrics.operation.p95Latency.toFixed(2)}ms`);
  console.log(`Memory Health: ${tracker.getMemoryAnalysis().health}`);
  console.log(`Pool Efficiency: ${tracker.getPoolEfficiency().toFixed(1)}%`);
}

// Types
interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt?: Date;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CreateOrderRequest {
  customerId: string;
  customerType: "standard" | "premium";
  items: OrderItem[];
}

type OrderStatus = "pending" | "processing" | "paid" | "shipped" | "delivered" | "cancelled";

interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  processedAt: Date;
}

interface BulkProcessResult {
  successful: number;
  failed: number;
  orders: Order[];
  errors: Array<{
    orderData: CreateOrderRequest;
    error: string;
  }>;
}

// Run the example
if (require.main === module) {
  runExample().catch(console.error);
}

export { OrderService, setupPerformanceMonitoring, tracker };
