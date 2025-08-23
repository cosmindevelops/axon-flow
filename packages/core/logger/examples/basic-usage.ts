/**
 * Basic Enhanced Performance Tracker Usage
 *
 * This example demonstrates basic setup and usage of the enhanced performance tracker
 * for simple monitoring scenarios.
 */

import { EnhancedPerformanceTracker, Timed, setGlobalPerformanceTracker } from "../src/performance/index.js";

// 1. Basic tracker setup
const tracker = new EnhancedPerformanceTracker({
  enabled: true,
  sampleRate: 0.1, // Monitor 10% of operations
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
});

// Set as global tracker for decorators
setGlobalPerformanceTracker(tracker);

// 2. Basic service with performance tracking
class UserService {
  private users: Map<string, User> = new Map();

  @Timed({ category: "user-operations" })
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Simulate async operation
    await this.delay(50);

    const user: User = {
      id: this.generateId(),
      name: userData.name,
      email: userData.email,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  @Timed({ category: "user-operations", threshold: 25 })
  getUserById(id: string): User | null {
    return this.users.get(id) || null;
  }

  @Timed({ category: "user-operations", threshold: 200 })
  async searchUsers(query: string): Promise<User[]> {
    // Simulate search operation
    await this.delay(100);

    return Array.from(this.users.values()).filter(
      (user) =>
        user.name.toLowerCase().includes(query.toLowerCase()) || user.email.toLowerCase().includes(query.toLowerCase()),
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// 3. Manual performance tracking example
async function processData(data: any[]): Promise<any[]> {
  const measurement = tracker.startOperation("data-processing", {
    inputSize: data.length,
    operation: "transform",
  });

  try {
    // Simulate data processing
    const processed = data.map((item) => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
    }));

    // Record successful operation
    tracker.finishOperation(measurement);
    tracker.recordSuccess();

    return processed;
  } catch (error) {
    // Record failed operation
    tracker.finishOperation(measurement);
    tracker.recordFailure();
    throw error;
  }
}

// 4. Performance monitoring and reporting
function setupMonitoring(): void {
  // Basic performance monitoring every 30 seconds
  setInterval(() => {
    const metrics = tracker.getMetrics();

    console.log("📊 Performance Metrics:", {
      operations: {
        total: metrics.operation.count,
        avgLatency: `${metrics.operation.averageLatency.toFixed(2)}ms`,
        p95Latency: `${metrics.operation.p95Latency.toFixed(2)}ms`,
        throughput: `${metrics.operation.throughput.toFixed(1)} ops/sec`,
      },
      memory: {
        heapUsed: `${Math.round(metrics.resource.memory.heapUsed / 1024 / 1024)}MB`,
        utilization: `${metrics.resource.memory.utilization.toFixed(1)}%`,
      },
      pool: {
        utilization: `${metrics.measurementPoolUtilization.toFixed(1)}%`,
      },
    });

    // Simple health check
    const memoryAnalysis = tracker.getMemoryAnalysis();
    if (memoryAnalysis.leakDetected) {
      console.warn("🚨 Memory leak detected!");
    }

    if (memoryAnalysis.pressure === "high" || memoryAnalysis.pressure === "critical") {
      console.warn(`⚠️ Memory pressure: ${memoryAnalysis.pressure}`);
    }
  }, 30000);
}

// 5. Usage example
async function main(): Promise<void> {
  console.log("Starting basic performance tracking example...");

  const userService = new UserService();
  setupMonitoring();

  // Create some test users
  const users = await Promise.all([
    userService.createUser({ name: "John Doe", email: "john@example.com" }),
    userService.createUser({ name: "Jane Smith", email: "jane@example.com" }),
    userService.createUser({ name: "Bob Wilson", email: "bob@example.com" }),
  ]);

  console.log(`Created ${users.length} users`);

  // Perform some operations
  for (let i = 0; i < 10; i++) {
    // Search operations
    await userService.searchUsers("john");
    await userService.searchUsers("smith");

    // Get operations
    userService.getUserById(users[0].id);
    userService.getUserById(users[1].id);

    // Data processing
    await processData([{ id: i, value: `test-${i}` }]);

    // Small delay between operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Get final metrics
  setTimeout(() => {
    const metrics = tracker.getMetrics();
    console.log("\n📈 Final Performance Report:");
    console.log("- Total operations:", metrics.operation.count);
    console.log("- Average latency:", `${metrics.operation.averageLatency.toFixed(2)}ms`);
    console.log("- P95 latency:", `${metrics.operation.p95Latency.toFixed(2)}ms`);
    console.log("- Memory health:", tracker.getMemoryAnalysis().health);
    console.log("- Pool efficiency:", `${tracker.getPoolEfficiency().toFixed(1)}%`);
  }, 1000);
}

// Types
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { UserService, processData, setupMonitoring };
