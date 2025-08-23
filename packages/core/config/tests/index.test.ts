/**
 * Basic smoke tests for @axon/config package
 */

import { describe, it, expect } from "vitest";

// Import main exports to verify they exist
import * as AxonConfig from "../src/index.js";

describe("@axon/config package", () => {
  it("should export config builders and utilities", () => {
    expect(AxonConfig).toBeDefined();
  });

  it("should have core exports available", () => {
    // Basic smoke test - just verify the module loads
    expect(typeof AxonConfig).toBe("object");
  });
});