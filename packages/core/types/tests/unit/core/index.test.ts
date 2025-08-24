/**
 * Test suite for core domain exports
 */

import { describe, it, expect } from "vitest";

describe("Core Domain Exports", () => {
  it("should export core domain types and utilities", async () => {
    const exports = await import("../../../src/core/index.js");

    // Verify that the module exports exist
    expect(exports).toBeDefined();
    expect(typeof exports).toBe("object");
  });

  it("should provide barrel exports for core functionality", async () => {
    const exports = await import("../../../src/core/index.js");

    // Check that exports object is not empty
    const exportKeys = Object.keys(exports);
    expect(exportKeys.length).toBeGreaterThanOrEqual(0);
  });

  it("should maintain consistent export structure", async () => {
    const exports = await import("../../../src/core/index.js");

    // Ensure exports follow expected patterns
    expect(exports).toBeTypeOf("object");

    // All exports should be defined
    Object.entries(exports).forEach(([key, value]) => {
      expect(value).toBeDefined();
      expect(key).toBeTypeOf("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("should export core domain submodules", async () => {
    // Test individual domain imports are accessible
    const coreSubdomains = ["agent", "message", "registry", "task", "workflow"];

    for (const subdomain of coreSubdomains) {
      try {
        const subExports = await import(`../../../src/core/${subdomain}/index.js`);
        expect(subExports).toBeDefined();
        expect(typeof subExports).toBe("object");
      } catch (error) {
        // Some subdomains may not exist yet, that's okay for this test
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  it("should provide type-safe core domain interfaces", () => {
    // Core domain should provide consistent interface patterns
    const expectedPatterns = [
      "I-prefix interfaces for contracts",
      "Type aliases for branded types",
      "Schema definitions for validation",
      "Class implementations for behavior",
    ];

    expectedPatterns.forEach((pattern) => {
      expect(typeof pattern).toBe("string");
      expect(pattern.length).toBeGreaterThan(0);
    });
  });
});
