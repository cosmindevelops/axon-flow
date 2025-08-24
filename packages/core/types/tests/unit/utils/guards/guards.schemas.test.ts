/**
 * Test suite for guard schema validations
 */

import { describe, it, expect } from "vitest";

describe("Guard Schema Validations", () => {
  describe("Type Narrowing Performance", () => {
    it("should narrow types efficiently", () => {
      const testValue: unknown = "test string";

      const iterations = 100000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        if (typeof testValue === "string") {
          const _length = testValue.length;
        }
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(100);
    });

    it("should handle discriminated union narrowing", () => {
      type Result<T> = { success: true; data: T } | { success: false; error: string };

      const processResult = <T>(result: Result<T>): T | string => {
        if (result.success) {
          return result.data;
        } else {
          return result.error;
        }
      };

      const successResult: Result<number> = { success: true, data: 42 };
      const errorResult: Result<number> = { success: false, error: "Failed" };

      expect(processResult(successResult)).toBe(42);
      expect(processResult(errorResult)).toBe("Failed");
    });

    it("should work with conditional type inference", () => {
      type ExtractArrayType<T> = T extends (infer U)[] ? U : never;

      type StringArray = ExtractArrayType<string[]>;
      type NumberArray = ExtractArrayType<number[]>;

      const stringValue: StringArray = "test";
      const numberValue: NumberArray = 42;

      expect(stringValue).toBe("test");
      expect(numberValue).toBe(42);
    });
  });

  describe("Validation Patterns", () => {
    it("should validate email patterns", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test("user@example.com")).toBe(true);
      expect(emailRegex.test("invalid-email")).toBe(false);
    });

    it("should validate UUID patterns", () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(uuidRegex.test("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(uuidRegex.test("invalid-uuid")).toBe(false);
    });

    it("should validate URL patterns", () => {
      const urlRegex = /^https?:\/\/[^\s]+$/;

      expect(urlRegex.test("https://example.com")).toBe(true);
      expect(urlRegex.test("example.com")).toBe(false);
    });

    it("should validate semantic version patterns", () => {
      const semverRegex = /^\d+\.\d+\.\d+(-[\w\d\-\.]+)?(\+[\w\d\-\.]+)?$/;

      expect(semverRegex.test("1.0.0")).toBe(true);
      expect(semverRegex.test("2.3.4-alpha.1")).toBe(true);
      expect(semverRegex.test("1.0")).toBe(false);
    });

    it("should validate ISO timestamp patterns", () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

      expect(isoRegex.test("2024-01-01T00:00:00.000Z")).toBe(true);
      expect(isoRegex.test("2024-01-01T00:00:00Z")).toBe(true);
      expect(isoRegex.test("2024-01-01")).toBe(false);
    });
  });

  describe("Schema Composition", () => {
    it("should compose validation functions", () => {
      const isStringOrNumber = (value: unknown): value is string | number => {
        return typeof value === "string" || typeof value === "number";
      };

      const isNonEmptyString = (value: unknown): value is string => {
        return typeof value === "string" && value.length > 0;
      };

      expect(isStringOrNumber("test")).toBe(true);
      expect(isStringOrNumber(42)).toBe(true);
      expect(isStringOrNumber(true)).toBe(false);

      expect(isNonEmptyString("test")).toBe(true);
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString(42)).toBe(false);
    });

    it("should validate complex nested structures", () => {
      interface NestedStructure {
        level1: {
          level2: {
            value: string;
            count: number;
          }[];
        };
      }

      const isNestedStructure = (value: unknown): value is NestedStructure => {
        return (
          typeof value === "object" &&
          value !== null &&
          typeof (value as any).level1 === "object" &&
          (value as any).level1 !== null &&
          Array.isArray((value as any).level1.level2) &&
          (value as any).level1.level2.every(
            (item: any) =>
              typeof item === "object" &&
              item !== null &&
              typeof item.value === "string" &&
              typeof item.count === "number",
          )
        );
      };

      const validStructure = {
        level1: {
          level2: [
            { value: "test1", count: 1 },
            { value: "test2", count: 2 },
          ],
        },
      };

      const invalidStructure = {
        level1: {
          level2: "not an array",
        },
      };

      expect(isNestedStructure(validStructure)).toBe(true);
      expect(isNestedStructure(invalidStructure)).toBe(false);
    });
  });

  describe("Error Handling Validation", () => {
    it("should handle validation errors gracefully", () => {
      const safeValidator = (value: unknown): boolean => {
        try {
          return typeof value === "object" && value !== null && "toString" in value;
        } catch {
          return false;
        }
      };

      expect(safeValidator({})).toBe(true);
      expect(safeValidator(null)).toBe(false);
      expect(safeValidator(undefined)).toBe(false);
    });

    it("should validate with fallback values", () => {
      const validateWithDefault = <T>(value: unknown, validator: (v: unknown) => v is T, defaultValue: T): T => {
        return validator(value) ? value : defaultValue;
      };

      const isString = (value: unknown): value is string => typeof value === "string";

      expect(validateWithDefault("test", isString, "default")).toBe("test");
      expect(validateWithDefault(123, isString, "default")).toBe("default");
    });
  });

  describe("Performance Edge Cases", () => {
    it("should handle large objects efficiently", () => {
      const largeObject = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`key${i}`, `value${i}`]));

      const isLargeObject = (value: unknown): boolean => {
        return typeof value === "object" && value !== null && Object.keys(value).length > 500;
      };

      const start = performance.now();
      const result = isLargeObject(largeObject);
      const end = performance.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(10);
    });

    it("should handle deeply nested validation", () => {
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { value: "leaf" };
        return { nested: createNestedObject(depth - 1) };
      };

      const validateNested = (value: unknown, maxDepth: number): boolean => {
        const validate = (obj: any, currentDepth: number): boolean => {
          if (currentDepth > maxDepth) return false;
          if (typeof obj !== "object" || obj === null) return false;

          if ("value" in obj && typeof obj.value === "string") return true;
          if ("nested" in obj) return validate(obj.nested, currentDepth + 1);

          return false;
        };

        return validate(value, 0);
      };

      const deepObject = createNestedObject(50);

      const start = performance.now();
      const result = validateNested(deepObject, 100);
      const end = performance.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(50);
    });
  });
});
