/**
 * Quick debug script to test correlation ID implementation
 */

import { CorrelationManagerFactory } from "./src/correlation/correlation.classes.js";
import { HighPerformancePinoLogger } from "./src/logger/logger.classes.js";
import { Writable } from "stream";

// Mock transport output
const mockTransportOutput = [];

// Create test stream
const testStream = new Writable({
  write(chunk, _encoding, callback) {
    try {
      const logStr = chunk.toString();
      const logEntry = JSON.parse(logStr);
      mockTransportOutput.push(logEntry);
      console.log("Captured log:", logEntry);
    } catch (error) {
      mockTransportOutput.push({ message: chunk.toString() });
      console.log("Captured raw:", chunk.toString());
    }
    callback();
  },
});

// Create correlation manager
const factory = new CorrelationManagerFactory();
const correlationManager = factory.create();

// Create logger with NO transports to use direct Pino
const logger = new HighPerformancePinoLogger({
  environment: "test",
  logLevel: "debug",
  transports: [], // Empty transports to force Pino direct logging
  enableCorrelationIds: true,
  testStream: testStream,
});

console.log("Starting correlation test...");

// Wait for async initialization
await new Promise((resolve) => setTimeout(resolve, 100));

// Test correlation
const testCorrelationId = correlationManager.create("test-prefix");
console.log("Created correlation ID:", testCorrelationId);

await correlationManager.withAsync(testCorrelationId, async () => {
  console.log("Current context:", correlationManager.currentContext());
  logger.info("Test message", { data: "test" });
  logger.error("Error message", { errorDetails: "test error" });
});

// Wait for logs to be processed
await new Promise((resolve) => setTimeout(resolve, 100));

console.log("Mock transport output length:", mockTransportOutput.length);
console.log("Mock transport output:", mockTransportOutput);
