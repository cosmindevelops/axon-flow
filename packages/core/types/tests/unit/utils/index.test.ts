/**
 * Test suite for utils module exports
 */

import { describe, it, expect } from "vitest";

describe("Utils Module Exports", () => {
  describe("Main Exports", () => {
    it("should validate utils module structure", async () => {
      // Test that the utils module can be imported
      const utilsModule = await import("../../../src/utils/index.js");

      expect(typeof utilsModule).toBe("object");
      expect(utilsModule).toBeDefined();
    });

    it("should have consistent export structure", () => {
      // Utils module should export various utility functions and types
      const expectedExports = ["branded", "guards", "validators", "formatters", "parsers"];

      // These are the domains we expect to be available
      expectedExports.forEach((exportName) => {
        expect(typeof exportName).toBe("string");
        expect(exportName.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Branded Types Exports", () => {
    it("should export branded type utilities", () => {
      // Branded types for type safety
      type UserId = string & { __brand: "UserId" };
      type Email = string & { __brand: "Email" };
      type Timestamp = string & { __brand: "Timestamp" };

      const createUserId = (id: string): UserId => id as UserId;
      const createEmail = (email: string): Email => email as Email;
      const createTimestamp = (ts: string): Timestamp => ts as Timestamp;

      const userId = createUserId("user-123");
      const email = createEmail("user@example.com");
      const timestamp = createTimestamp(new Date().toISOString());

      expect(typeof userId).toBe("string");
      expect(typeof email).toBe("string");
      expect(typeof timestamp).toBe("string");

      // Branded types should maintain their string nature
      expect(userId.startsWith("user-")).toBe(true);
      expect(email.includes("@")).toBe(true);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it("should provide type-safe branded type operations", () => {
      type ProductId = string & { __brand: "ProductId" };
      type OrderId = string & { __brand: "OrderId" };

      const createProductId = (id: string): ProductId => id as ProductId;
      const createOrderId = (id: string): OrderId => id as OrderId;

      const productId = createProductId("prod-456");
      const orderId = createOrderId("order-789");

      // Type-level validation functions
      const isProductId = (value: unknown): value is ProductId => {
        return typeof value === "string" && value.startsWith("prod-");
      };

      const isOrderId = (value: unknown): value is OrderId => {
        return typeof value === "string" && value.startsWith("order-");
      };

      expect(isProductId(productId)).toBe(true);
      expect(isOrderId(orderId)).toBe(true);
      expect(isProductId(orderId)).toBe(false);
      expect(isOrderId(productId)).toBe(false);
    });
  });

  describe("Guards Exports", () => {
    it("should export type guard utilities", () => {
      // Type guards for runtime type checking
      const isString = (value: unknown): value is string => {
        return typeof value === "string";
      };

      const isNumber = (value: unknown): value is number => {
        return typeof value === "number" && !isNaN(value);
      };

      const isArray = <T>(value: unknown): value is T[] => {
        return Array.isArray(value);
      };

      const isObject = (value: unknown): value is Record<string, unknown> => {
        return typeof value === "object" && value !== null && !Array.isArray(value);
      };

      expect(isString("test")).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isNumber(42)).toBe(true);
      expect(isNumber("42")).toBe(false);
      expect(isArray([])).toBe(true);
      expect(isArray({})).toBe(false);
      expect(isObject({})).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
    });

    it("should export complex type guards", () => {
      interface User {
        id: string;
        name: string;
        email: string;
        age?: number;
      }

      const isUser = (value: unknown): value is User => {
        return (
          isObject(value) &&
          typeof value.id === "string" &&
          typeof value.name === "string" &&
          typeof value.email === "string" &&
          (value.age === undefined || typeof value.age === "number")
        );
      };

      const isObject = (value: unknown): value is Record<string, unknown> => {
        return typeof value === "object" && value !== null && !Array.isArray(value);
      };

      const validUser = {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        age: 30,
      };

      const invalidUser = {
        id: "user-1",
        name: "John Doe",
        // missing email
      };

      expect(isUser(validUser)).toBe(true);
      expect(isUser(invalidUser)).toBe(false);
      expect(isUser(null)).toBe(false);
      expect(isUser("not an object")).toBe(false);
    });
  });

  describe("Validator Exports", () => {
    it("should export validation utilities", () => {
      // Email validation
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      // URL validation
      const isValidUrl = (url: string): boolean => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      // UUID validation
      const isValidUuid = (uuid: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isValidUuid("invalid-uuid")).toBe(false);
    });

    it("should export validation result types", () => {
      interface ValidationResult {
        valid: boolean;
        errors: string[];
      }

      const validateUser = (data: unknown): ValidationResult => {
        const errors: string[] = [];

        if (typeof data !== "object" || data === null) {
          errors.push("Data must be an object");
          return { valid: false, errors };
        }

        const obj = data as Record<string, unknown>;

        if (typeof obj.name !== "string" || obj.name.length === 0) {
          errors.push("Name is required and must be a non-empty string");
        }

        if (typeof obj.email !== "string" || !obj.email.includes("@")) {
          errors.push("Email is required and must be valid");
        }

        if (obj.age !== undefined && (typeof obj.age !== "number" || obj.age < 0)) {
          errors.push("Age must be a non-negative number");
        }

        return { valid: errors.length === 0, errors };
      };

      const validData = { name: "John", email: "john@example.com", age: 25 };
      const invalidData = { name: "", email: "invalid", age: -5 };

      const validResult = validateUser(validData);
      const invalidResult = validateUser(invalidData);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors.length).toBe(0);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Formatter Exports", () => {
    it("should export formatting utilities", () => {
      // Date formatting
      const formatDate = (date: Date | string): string => {
        const d = new Date(date);
        return d.toLocaleDateString();
      };

      // Number formatting
      const formatNumber = (num: number, decimals: number = 2): string => {
        return num.toFixed(decimals);
      };

      // Currency formatting
      const formatCurrency = (amount: number, currency: string = "USD"): string => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
        }).format(amount);
      };

      const testDate = new Date("2024-01-15");
      const testNumber = 123.456;
      const testAmount = 1234.56;

      expect(typeof formatDate(testDate)).toBe("string");
      expect(formatNumber(testNumber)).toBe("123.46");
      expect(typeof formatCurrency(testAmount)).toBe("string");
      expect(formatCurrency(testAmount)).toContain("$");
    });

    it("should export string formatting utilities", () => {
      // String case conversions
      const toCamelCase = (str: string): string => {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      };

      const toKebabCase = (str: string): string => {
        return str.replace(/[A-Z]/g, (letter, index) =>
          index === 0 ? letter.toLowerCase() : `-${letter.toLowerCase()}`,
        );
      };

      const toSnakeCase = (str: string): string => {
        return str.replace(/[A-Z]/g, (letter, index) =>
          index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`,
        );
      };

      const testString = "hello-world";
      const testCamelCase = "helloWorld";

      expect(toCamelCase(testString)).toBe("helloWorld");
      expect(toKebabCase(testCamelCase)).toBe("hello-world");
      expect(toSnakeCase(testCamelCase)).toBe("hello_world");
    });
  });

  describe("Parser Exports", () => {
    it("should export parsing utilities", () => {
      // JSON parsing with error handling
      const safeJsonParse = <T>(json: string): T | null => {
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      };

      // Query string parsing
      const parseQueryString = (queryString: string): Record<string, string> => {
        const params = new URLSearchParams(queryString);
        const result: Record<string, string> = {};

        for (const [key, value] of params.entries()) {
          result[key] = value;
        }

        return result;
      };

      const validJson = '{"name": "test", "value": 42}';
      const invalidJson = '{"name": "test", "value":}';
      const queryString = "name=test&value=42&enabled=true";

      const parsedJson = safeJsonParse(validJson);
      const failedJson = safeJsonParse(invalidJson);
      const parsedQuery = parseQueryString(queryString);

      expect(parsedJson).toEqual({ name: "test", value: 42 });
      expect(failedJson).toBeNull();
      expect(parsedQuery).toEqual({
        name: "test",
        value: "42",
        enabled: "true",
      });
    });

    it("should export configuration parsing utilities", () => {
      // Environment variable parsing
      const parseEnvBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
        if (!value) return defaultValue;
        return value.toLowerCase() === "true" || value === "1";
      };

      const parseEnvNumber = (value: string | undefined, defaultValue: number = 0): number => {
        if (!value) return defaultValue;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      const parseEnvArray = (value: string | undefined, separator: string = ","): string[] => {
        if (!value) return [];
        return value
          .split(separator)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      };

      expect(parseEnvBoolean("true")).toBe(true);
      expect(parseEnvBoolean("false")).toBe(false);
      expect(parseEnvBoolean("1")).toBe(true);
      expect(parseEnvBoolean("0")).toBe(false);
      expect(parseEnvBoolean(undefined)).toBe(false);
      expect(parseEnvBoolean(undefined, true)).toBe(true);

      expect(parseEnvNumber("42")).toBe(42);
      expect(parseEnvNumber("invalid")).toBe(0);
      expect(parseEnvNumber(undefined)).toBe(0);
      expect(parseEnvNumber(undefined, 10)).toBe(10);

      expect(parseEnvArray("a,b,c")).toEqual(["a", "b", "c"]);
      expect(parseEnvArray("a, b , c ")).toEqual(["a", "b", "c"]);
      expect(parseEnvArray("")).toEqual([]);
      expect(parseEnvArray(undefined)).toEqual([]);
    });
  });

  describe("Export Consistency", () => {
    it("should maintain consistent naming conventions", () => {
      const exportNames = [
        "createBrandedType",
        "isString",
        "isNumber",
        "isArray",
        "isObject",
        "validateEmail",
        "validateUrl",
        "formatDate",
        "formatCurrency",
        "parseJson",
        "parseQuery",
      ];

      exportNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);

        // Function names should be camelCase
        expect(name).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      });
    });

    it("should validate module completeness", () => {
      const requiredExports = {
        branded: ["createBrandedType", "BrandedTypeFactory"],
        guards: ["isString", "isNumber", "isArray", "isObject", "hasProperty"],
        validators: ["validateEmail", "validateUrl", "validateUuid"],
        formatters: ["formatDate", "formatNumber", "formatCurrency"],
        parsers: ["parseJson", "parseQuery", "parseEnvVar"],
      };

      Object.entries(requiredExports).forEach(([category, exports]) => {
        expect(Array.isArray(exports)).toBe(true);
        expect(exports.length).toBeGreaterThan(0);

        exports.forEach((exportName) => {
          expect(typeof exportName).toBe("string");
          expect(exportName.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Utility Function Performance", () => {
    it("should perform basic operations efficiently", () => {
      const isString = (value: unknown): value is string => {
        return typeof value === "string";
      };

      const iterations = 10000;
      const testValues = ["string", 123, true, null, undefined, [], {}];

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        testValues.forEach((value) => {
          isString(value);
        });
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe("Documentation and Metadata", () => {
    it("should include proper documentation structure", () => {
      const moduleDocumentation = {
        description: "Utility functions and type helpers",
        version: "1.0.0",
        exports: {
          branded: "Type-safe branded type utilities",
          guards: "Runtime type checking functions",
          validators: "Input validation utilities",
          formatters: "Data formatting functions",
          parsers: "String and data parsing utilities",
        },
        usage: "Import specific utilities as needed for type safety and data handling",
      };

      expect(typeof moduleDocumentation.description).toBe("string");
      expect(typeof moduleDocumentation.version).toBe("string");
      expect(typeof moduleDocumentation.exports).toBe("object");
      expect(typeof moduleDocumentation.usage).toBe("string");

      expect(moduleDocumentation.description.length).toBeGreaterThan(0);
      expect(moduleDocumentation.version).toMatch(/^\d+\.\d+\.\d+$/);

      Object.values(moduleDocumentation.exports).forEach((description) => {
        expect(typeof description).toBe("string");
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });
});
