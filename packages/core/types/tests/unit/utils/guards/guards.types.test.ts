/**
 * Test suite for guard function type definitions
 */

import { describe, it, expect } from "vitest";

describe("Guard Type Definitions", () => {
  describe("Type Predicate Functions", () => {
    it("should define type predicates correctly", () => {
      // Type predicate functions should return boolean and narrow types
      const testTypePredicate = (value: unknown): value is string => {
        return typeof value === "string";
      };

      const unknownValue: unknown = "test";

      if (testTypePredicate(unknownValue)) {
        // TypeScript should know this is string here
        expect(unknownValue.length).toBe(4);
        expect(unknownValue.toUpperCase()).toBe("TEST");
      } else {
        expect.fail("Type predicate should have returned true");
      }
    });

    it("should work with union type predicates", () => {
      type StringOrNumber = string | number;

      const isStringOrNumber = (value: unknown): value is StringOrNumber => {
        return typeof value === "string" || typeof value === "number";
      };

      expect(isStringOrNumber("test")).toBe(true);
      expect(isStringOrNumber(42)).toBe(true);
      expect(isStringOrNumber(true)).toBe(false);
      expect(isStringOrNumber({})).toBe(false);
    });

    it("should handle complex object type predicates", () => {
      interface TestObject {
        id: string;
        value: number;
      }

      const isTestObject = (value: unknown): value is TestObject => {
        return (
          typeof value === "object" &&
          value !== null &&
          typeof (value as any).id === "string" &&
          typeof (value as any).value === "number"
        );
      };

      const validObject = { id: "test", value: 42 };
      const invalidObject = { id: "test" };

      expect(isTestObject(validObject)).toBe(true);
      expect(isTestObject(invalidObject)).toBe(false);
      expect(isTestObject(null)).toBe(false);
      expect(isTestObject("string")).toBe(false);
    });
  });

  describe("Generic Type Guards", () => {
    it("should work with generic type parameters", () => {
      const isArray = <T>(value: unknown): value is T[] => {
        return Array.isArray(value);
      };

      expect(isArray<string>(["a", "b", "c"])).toBe(true);
      expect(isArray<number>([1, 2, 3])).toBe(true);
      expect(isArray<string>("not array")).toBe(false);
    });

    it("should handle optional properties in type guards", () => {
      interface OptionalProps {
        required: string;
        optional?: number;
      }

      const hasOptionalProps = (value: unknown): value is OptionalProps => {
        return (
          typeof value === "object" &&
          value !== null &&
          typeof (value as any).required === "string" &&
          ((value as any).optional === undefined || typeof (value as any).optional === "number")
        );
      };

      expect(hasOptionalProps({ required: "test" })).toBe(true);
      expect(hasOptionalProps({ required: "test", optional: 42 })).toBe(true);
      expect(hasOptionalProps({ required: "test", optional: "invalid" })).toBe(false);
      expect(hasOptionalProps({ optional: 42 })).toBe(false);
    });
  });

  describe("Utility Type Predicates", () => {
    it("should validate property existence", () => {
      const hasProperty = <T extends object, K extends PropertyKey>(obj: T, prop: K): obj is T & Record<K, unknown> => {
        return prop in obj;
      };

      const testObj = { name: "test", value: 42 };

      if (hasProperty(testObj, "name")) {
        expect(testObj.name).toBe("test");
      }

      if (hasProperty(testObj, "missing")) {
        expect.fail("Should not have missing property");
      } else {
        expect(true).toBe(true);
      }
    });

    it("should validate enum values", () => {
      enum TestEnum {
        VALUE_A = "valueA",
        VALUE_B = "valueB",
        VALUE_C = "valueC",
      }

      const isTestEnum = (value: unknown): value is TestEnum => {
        return Object.values(TestEnum).includes(value as TestEnum);
      };

      expect(isTestEnum("valueA")).toBe(true);
      expect(isTestEnum("valueB")).toBe(true);
      expect(isTestEnum("invalid")).toBe(false);
      expect(isTestEnum(null)).toBe(false);
    });

    it("should validate literal types", () => {
      type Status = "active" | "inactive" | "pending";

      const isStatus = (value: unknown): value is Status => {
        return value === "active" || value === "inactive" || value === "pending";
      };

      expect(isStatus("active")).toBe(true);
      expect(isStatus("inactive")).toBe(true);
      expect(isStatus("pending")).toBe(true);
      expect(isStatus("invalid")).toBe(false);
      expect(isStatus("")).toBe(false);
    });
  });

  describe("Discriminated Union Type Guards", () => {
    it("should handle discriminated unions", () => {
      type Result<T> = { success: true; data: T } | { success: false; error: string };

      const isSuccessResult = <T>(result: Result<T>): result is { success: true; data: T } => {
        return result.success === true;
      };

      const isErrorResult = <T>(result: Result<T>): result is { success: false; error: string } => {
        return result.success === false;
      };

      const successResult: Result<number> = { success: true, data: 42 };
      const errorResult: Result<number> = { success: false, error: "Failed" };

      expect(isSuccessResult(successResult)).toBe(true);
      expect(isErrorResult(successResult)).toBe(false);

      expect(isSuccessResult(errorResult)).toBe(false);
      expect(isErrorResult(errorResult)).toBe(true);

      if (isSuccessResult(successResult)) {
        expect(successResult.data).toBe(42);
      }

      if (isErrorResult(errorResult)) {
        expect(errorResult.error).toBe("Failed");
      }
    });
  });

  describe("Performance of Type Guards", () => {
    it("should perform type checks efficiently", () => {
      const isString = (value: unknown): value is string => {
        return typeof value === "string";
      };

      const iterations = 100000;
      const testValue = "test string";

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = isString(testValue);
        expect(result).toBe(true);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Should be very fast
    });

    it("should handle complex object validation efficiently", () => {
      interface ComplexObject {
        id: string;
        metadata: {
          created: string;
          updated: string;
        };
        items: number[];
      }

      const isComplexObject = (value: unknown): value is ComplexObject => {
        return (
          typeof value === "object" &&
          value !== null &&
          typeof (value as any).id === "string" &&
          typeof (value as any).metadata === "object" &&
          (value as any).metadata !== null &&
          typeof (value as any).metadata.created === "string" &&
          typeof (value as any).metadata.updated === "string" &&
          Array.isArray((value as any).items) &&
          (value as any).items.every((item: any) => typeof item === "number")
        );
      };

      const testObject: ComplexObject = {
        id: "test-123",
        metadata: {
          created: "2024-01-01T00:00:00Z",
          updated: "2024-01-01T00:00:00Z",
        },
        items: [1, 2, 3, 4, 5],
      };

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = isComplexObject(testObject);
        expect(result).toBe(true);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Relaxed threshold for CI environments
    });
  });
});
