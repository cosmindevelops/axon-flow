/**
 * Basic smoke tests for @axon/types package
 */

import { describe, it, expect } from "vitest";

// Import main exports to verify they exist
import * as AxonTypes from "../src/index.js";

describe("@axon/types package", () => {
  it("should export types and schemas", () => {
    expect(AxonTypes).toBeDefined();
  });

  it("should have core exports available", () => {
    // Basic smoke test - just verify the module loads
    expect(typeof AxonTypes).toBe("object");
  });
});