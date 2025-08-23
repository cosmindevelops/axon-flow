/**
 * Testing utilities validation schemas
 *
 * Zod schemas for validating testing configurations and mock objects
 */

import { z } from "zod";

/**
 * Mock container configuration validation schema
 */
export const mockContainerConfigSchema = z.object({
  name: z.string().min(1).optional(),
  strictMode: z.boolean().optional(),
  enableMetrics: z.boolean().optional(),
  enableCache: z.boolean().optional(),
  autoDispose: z.boolean().optional(),
});

/**
 * Test service configuration validation schema
 */
export const testServiceConfigSchema = z.object({
  name: z.string().min(1),
  dependencies: z.array(z.string()).optional(),
  lifecycle: z.enum(["singleton", "transient", "scoped"]).optional(),
  shouldThrow: z.boolean().optional(),
  delay: z.number().nonnegative().optional(),
});

/**
 * Mock registration options validation schema
 */
export const mockRegistrationOptionsSchema = z.object({
  token: z.union([z.string(), z.symbol(), z.any().refine((val) => typeof val === "function", "Must be a function")]),
  implementation: z.unknown(),
  lifecycle: z.enum(["singleton", "transient", "scoped"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Test scenario configuration validation schema
 */
export const testScenarioConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  services: z.array(testServiceConfigSchema),
  expectedRegistrations: z.number().int().nonnegative(),
  expectedResolutions: z.number().int().nonnegative(),
  shouldSucceed: z.boolean(),
});

/**
 * Performance test configuration validation schema
 */
export const performanceTestConfigSchema = z.object({
  iterations: z.number().int().positive(),
  warmupIterations: z.number().int().nonnegative().optional(),
  maxExecutionTime: z.number().positive(),
  targetThroughput: z.number().positive().optional(),
  memoryThreshold: z.number().int().positive().optional(),
});

/**
 * Memory leak test configuration validation schema
 */
export const memoryLeakTestConfigSchema = z.object({
  iterations: z.number().int().positive(),
  gcInterval: z.number().int().positive(),
  maxMemoryGrowth: z.number().positive(),
  samplingInterval: z.number().int().positive(),
});

/**
 * Integration test configuration validation schema
 */
export const integrationTestConfigSchema = z.object({
  name: z.string().min(1),
  services: z.array(z.string()),
  testCases: z.array(
    z.object({
      name: z.string().min(1),
      action: z.enum(["register", "resolve", "dispose", "clear"]),
      target: z.string(),
      expectedResult: z.enum(["success", "error", "specific"]),
      expectedValue: z.unknown().optional(),
    }),
  ),
  cleanup: z.boolean().optional(),
});

/**
 * Default mock container configuration
 */
export const DEFAULT_MOCK_CONTAINER_CONFIG = mockContainerConfigSchema.parse({
  strictMode: false,
  enableMetrics: true,
  enableCache: false,
  autoDispose: true,
});

/**
 * Default test service configuration
 */
export const DEFAULT_TEST_SERVICE_CONFIG = testServiceConfigSchema.parse({
  name: "TestService",
  dependencies: [],
  lifecycle: "transient" as const,
  shouldThrow: false,
  delay: 0,
});

/**
 * Default performance test configuration
 */
export const DEFAULT_PERFORMANCE_TEST_CONFIG = performanceTestConfigSchema.parse({
  iterations: 1000,
  warmupIterations: 100,
  maxExecutionTime: 5000, // 5 seconds
  targetThroughput: 100,
  memoryThreshold: 100 * 1024 * 1024, // 100MB
});

/**
 * Default memory leak test configuration
 */
export const DEFAULT_MEMORY_LEAK_TEST_CONFIG = memoryLeakTestConfigSchema.parse({
  iterations: 1000,
  gcInterval: 100,
  maxMemoryGrowth: 0.1, // 10% growth
  samplingInterval: 50,
});

// Type guards and validation helpers

/**
 * Type guard to check if a value is mock container config
 */
export function isMockContainerConfig(value: unknown): value is z.infer<typeof mockContainerConfigSchema> {
  return mockContainerConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is test service config
 */
export function isTestServiceConfig(value: unknown): value is z.infer<typeof testServiceConfigSchema> {
  return testServiceConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is mock registration options
 */
export function isMockRegistrationOptions(value: unknown): value is z.infer<typeof mockRegistrationOptionsSchema> {
  return mockRegistrationOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is test scenario config
 */
export function isTestScenarioConfig(value: unknown): value is z.infer<typeof testScenarioConfigSchema> {
  return testScenarioConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is performance test config
 */
export function isPerformanceTestConfig(value: unknown): value is z.infer<typeof performanceTestConfigSchema> {
  return performanceTestConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is memory leak test config
 */
export function isMemoryLeakTestConfig(value: unknown): value is z.infer<typeof memoryLeakTestConfigSchema> {
  return memoryLeakTestConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is integration test config
 */
export function isIntegrationTestConfig(value: unknown): value is z.infer<typeof integrationTestConfigSchema> {
  return integrationTestConfigSchema.safeParse(value).success;
}

/**
 * Validate and normalize mock container configuration
 */
export function validateMockContainerConfig(config: unknown): z.infer<typeof mockContainerConfigSchema> {
  const result = mockContainerConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid mock container configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_MOCK_CONTAINER_CONFIG, ...result.data };
}

/**
 * Validate and normalize test service configuration
 */
export function validateTestServiceConfig(config: unknown): z.infer<typeof testServiceConfigSchema> {
  const result = testServiceConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid test service configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_TEST_SERVICE_CONFIG, ...result.data };
}

/**
 * Validate mock registration options
 */
export function validateMockRegistrationOptions(options: unknown): z.infer<typeof mockRegistrationOptionsSchema> {
  const result = mockRegistrationOptionsSchema.safeParse(options);
  if (!result.success) {
    throw new Error(`Invalid mock registration options: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate test scenario configuration
 */
export function validateTestScenarioConfig(config: unknown): z.infer<typeof testScenarioConfigSchema> {
  const result = testScenarioConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid test scenario configuration: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate and normalize performance test configuration
 */
export function validatePerformanceTestConfig(config: unknown): z.infer<typeof performanceTestConfigSchema> {
  const result = performanceTestConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid performance test configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_PERFORMANCE_TEST_CONFIG, ...result.data };
}

/**
 * Validate and normalize memory leak test configuration
 */
export function validateMemoryLeakTestConfig(config: unknown): z.infer<typeof memoryLeakTestConfigSchema> {
  const result = memoryLeakTestConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid memory leak test configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_MEMORY_LEAK_TEST_CONFIG, ...result.data };
}

/**
 * Validate integration test configuration
 */
export function validateIntegrationTestConfig(config: unknown): z.infer<typeof integrationTestConfigSchema> {
  const result = integrationTestConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid integration test configuration: ${result.error.message}`);
  }
  return result.data;
}
