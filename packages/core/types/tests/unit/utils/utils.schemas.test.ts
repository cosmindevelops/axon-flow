/**
 * Test suite for utils schema validations
 */

import { describe, it, expect } from "vitest";

describe("Utils Schema Validations", () => {
  describe("Branded Type Schemas", () => {
    it("should validate branded type creation and usage", () => {
      type UserId = string & { __brand: "UserId" };
      type Email = string & { __brand: "Email" };

      const createUserId = (id: string): UserId => {
        if (!id || id.length === 0) {
          throw new Error("User ID cannot be empty");
        }
        if (!id.startsWith("user-")) {
          throw new Error("User ID must start with 'user-'");
        }
        return id as UserId;
      };

      const createEmail = (email: string): Email => {
        if (!email || !email.includes("@")) {
          throw new Error("Invalid email format");
        }
        return email as Email;
      };

      const validUserId = createUserId("user-123");
      const validEmail = createEmail("test@example.com");

      expect(typeof validUserId).toBe("string");
      expect(typeof validEmail).toBe("string");
      expect(validUserId).toBe("user-123");
      expect(validEmail).toBe("test@example.com");

      // Should throw for invalid inputs
      expect(() => createUserId("")).toThrow("User ID cannot be empty");
      expect(() => createUserId("invalid")).toThrow("User ID must start with 'user-'");
      expect(() => createEmail("invalid")).toThrow("Invalid email format");
      expect(() => createEmail("")).toThrow("Invalid email format");
    });

    it("should validate numeric branded types", () => {
      type Price = number & { __brand: "Price" };
      type Quantity = number & { __brand: "Quantity" };

      const createPrice = (value: number): Price => {
        if (value < 0) {
          throw new Error("Price cannot be negative");
        }
        if (!Number.isFinite(value)) {
          throw new Error("Price must be a finite number");
        }
        return value as Price;
      };

      const createQuantity = (value: number): Quantity => {
        if (value < 0) {
          throw new Error("Quantity cannot be negative");
        }
        if (!Number.isInteger(value)) {
          throw new Error("Quantity must be an integer");
        }
        return value as Quantity;
      };

      const validPrice = createPrice(29.99);
      const validQuantity = createQuantity(5);

      expect(typeof validPrice).toBe("number");
      expect(typeof validQuantity).toBe("number");
      expect(validPrice).toBe(29.99);
      expect(validQuantity).toBe(5);

      expect(() => createPrice(-10)).toThrow("Price cannot be negative");
      expect(() => createPrice(Infinity)).toThrow("Price must be a finite number");
      expect(() => createQuantity(-1)).toThrow("Quantity cannot be negative");
      expect(() => createQuantity(5.5)).toThrow("Quantity must be an integer");
    });
  });

  describe("Validation Schema Patterns", () => {
    it("should validate input schema structure", () => {
      interface ValidationSchema<T> {
        readonly required: boolean;
        readonly type: string;
        readonly validator: (value: unknown) => value is T;
        readonly errorMessage: string;
        readonly transform?: (value: T) => T;
      }

      const stringSchema: ValidationSchema<string> = {
        required: true,
        type: "string",
        validator: (value: unknown): value is string => typeof value === "string",
        errorMessage: "Value must be a string",
        transform: (value: string) => value.trim(),
      };

      const numberSchema: ValidationSchema<number> = {
        required: false,
        type: "number",
        validator: (value: unknown): value is number => typeof value === "number" && !isNaN(value),
        errorMessage: "Value must be a valid number",
      };

      expect(typeof stringSchema.required).toBe("boolean");
      expect(typeof stringSchema.type).toBe("string");
      expect(typeof stringSchema.validator).toBe("function");
      expect(typeof stringSchema.errorMessage).toBe("string");
      expect(typeof stringSchema.transform).toBe("function");

      expect(stringSchema.validator("test")).toBe(true);
      expect(stringSchema.validator(123)).toBe(false);
      expect(numberSchema.validator(42)).toBe(true);
      expect(numberSchema.validator("42")).toBe(false);

      if (stringSchema.transform) {
        expect(stringSchema.transform("  hello  ")).toBe("hello");
      }
    });

    it("should validate complex object schemas", () => {
      interface ObjectSchema {
        readonly fields: Record<
          string,
          {
            readonly type: string;
            readonly required: boolean;
            readonly validator: (value: unknown) => boolean;
            readonly nested?: ObjectSchema;
          }
        >;
      }

      const userSchema: ObjectSchema = {
        fields: {
          id: {
            type: "string",
            required: true,
            validator: (value: unknown) => typeof value === "string" && value.length > 0,
          },
          name: {
            type: "string",
            required: true,
            validator: (value: unknown) => typeof value === "string" && value.length > 0,
          },
          age: {
            type: "number",
            required: false,
            validator: (value: unknown) => typeof value === "number" && value >= 0,
          },
          address: {
            type: "object",
            required: false,
            validator: (value: unknown) => typeof value === "object" && value !== null,
            nested: {
              fields: {
                street: {
                  type: "string",
                  required: true,
                  validator: (value: unknown) => typeof value === "string",
                },
                city: {
                  type: "string",
                  required: true,
                  validator: (value: unknown) => typeof value === "string",
                },
              },
            },
          },
        },
      };

      expect(typeof userSchema.fields).toBe("object");
      expect(Object.keys(userSchema.fields)).toEqual(["id", "name", "age", "address"]);

      const idField = userSchema.fields.id;
      expect(idField.type).toBe("string");
      expect(idField.required).toBe(true);
      expect(idField.validator("user-123")).toBe(true);
      expect(idField.validator("")).toBe(false);

      const addressField = userSchema.fields.address;
      expect(addressField.nested).toBeDefined();
      expect(Object.keys(addressField.nested!.fields)).toEqual(["street", "city"]);
    });
  });

  describe("Validation Result Schemas", () => {
    it("should validate validation result structure", () => {
      interface ValidationResult<T = unknown> {
        readonly valid: boolean;
        readonly value?: T;
        readonly errors: readonly {
          readonly field: string;
          readonly message: string;
          readonly code: string;
        }[];
        readonly warnings: readonly {
          readonly field: string;
          readonly message: string;
        }[];
      }

      const successResult: ValidationResult<{ name: string }> = {
        valid: true,
        value: { name: "John Doe" },
        errors: [],
        warnings: [],
      };

      const failureResult: ValidationResult = {
        valid: false,
        errors: [
          {
            field: "email",
            message: "Email is required",
            code: "REQUIRED",
          },
          {
            field: "age",
            message: "Age must be a positive number",
            code: "INVALID_TYPE",
          },
        ],
        warnings: [
          {
            field: "phone",
            message: "Phone number format not recognized",
          },
        ],
      };

      expect(typeof successResult.valid).toBe("boolean");
      expect(successResult.valid).toBe(true);
      expect(typeof successResult.value).toBe("object");
      expect(Array.isArray(successResult.errors)).toBe(true);
      expect(Array.isArray(successResult.warnings)).toBe(true);
      expect(successResult.errors.length).toBe(0);

      expect(failureResult.valid).toBe(false);
      expect("value" in failureResult).toBe(false);
      expect(failureResult.errors.length).toBe(2);
      expect(failureResult.warnings.length).toBe(1);

      failureResult.errors.forEach((error) => {
        expect(typeof error.field).toBe("string");
        expect(typeof error.message).toBe("string");
        expect(typeof error.code).toBe("string");
      });

      failureResult.warnings.forEach((warning) => {
        expect(typeof warning.field).toBe("string");
        expect(typeof warning.message).toBe("string");
      });
    });
  });

  describe("Parser Schema Validations", () => {
    it("should validate parser configuration schemas", () => {
      interface ParserConfig<TInput, TOutput> {
        readonly name: string;
        readonly inputType: string;
        readonly outputType: string;
        readonly parser: (input: TInput) => TOutput;
        readonly validator?: (input: TInput) => boolean;
        readonly options?: Record<string, unknown>;
      }

      const jsonParserConfig: ParserConfig<string, unknown> = {
        name: "json",
        inputType: "string",
        outputType: "object",
        parser: (input: string) => JSON.parse(input),
        validator: (input: string) => {
          try {
            JSON.parse(input);
            return true;
          } catch {
            return false;
          }
        },
        options: {
          reviver: null,
          strict: true,
        },
      };

      const csvParserConfig: ParserConfig<string, string[][]> = {
        name: "csv",
        inputType: "string",
        outputType: "array",
        parser: (input: string) => input.split("\n").map((line) => line.split(",")),
        options: {
          delimiter: ",",
          skipEmptyLines: true,
        },
      };

      expect(typeof jsonParserConfig.name).toBe("string");
      expect(typeof jsonParserConfig.inputType).toBe("string");
      expect(typeof jsonParserConfig.outputType).toBe("string");
      expect(typeof jsonParserConfig.parser).toBe("function");
      expect(typeof jsonParserConfig.validator).toBe("function");
      expect(typeof jsonParserConfig.options).toBe("object");

      if (jsonParserConfig.validator) {
        expect(jsonParserConfig.validator('{"test": true}')).toBe(true);
        expect(jsonParserConfig.validator("invalid json")).toBe(false);
      }

      const csvResult = csvParserConfig.parser("a,b,c\n1,2,3");
      expect(Array.isArray(csvResult)).toBe(true);
      expect(csvResult).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]);
    });

    it("should validate parser result schemas", () => {
      interface ParserResult<T> {
        readonly success: boolean;
        readonly data?: T;
        readonly error?: {
          readonly message: string;
          readonly line?: number;
          readonly column?: number;
          readonly context?: string;
        };
        readonly metadata: {
          readonly parser: string;
          readonly inputLength: number;
          readonly parseTime: number;
        };
      }

      const successResult: ParserResult<{ name: string }> = {
        success: true,
        data: { name: "test" },
        metadata: {
          parser: "json",
          inputLength: 16,
          parseTime: 0.5,
        },
      };

      const errorResult: ParserResult<unknown> = {
        success: false,
        error: {
          message: "Unexpected token '}' in JSON at position 15",
          line: 1,
          column: 15,
          context: '{"name": "test"}',
        },
        metadata: {
          parser: "json",
          inputLength: 17,
          parseTime: 0.1,
        },
      };

      expect(successResult.success).toBe(true);
      expect(typeof successResult.data).toBe("object");
      expect("error" in successResult).toBe(false);

      expect(errorResult.success).toBe(false);
      expect("data" in errorResult).toBe(false);
      expect(typeof errorResult.error).toBe("object");
      expect(typeof errorResult.error!.message).toBe("string");
      expect(typeof errorResult.error!.line).toBe("number");
      expect(typeof errorResult.error!.column).toBe("number");

      [successResult, errorResult].forEach((result) => {
        expect(typeof result.metadata.parser).toBe("string");
        expect(typeof result.metadata.inputLength).toBe("number");
        expect(typeof result.metadata.parseTime).toBe("number");
        expect(result.metadata.inputLength).toBeGreaterThan(0);
        expect(result.metadata.parseTime).toBeGreaterThan(0);
      });
    });
  });

  describe("Formatter Schema Validations", () => {
    it("should validate formatter configuration", () => {
      interface FormatterConfig<T> {
        readonly name: string;
        readonly type: string;
        readonly formatter: (value: T, options?: Record<string, unknown>) => string;
        readonly defaultOptions?: Record<string, unknown>;
        readonly validator?: (value: unknown) => value is T;
      }

      const dateFormatterConfig: FormatterConfig<Date> = {
        name: "date",
        type: "Date",
        formatter: (date: Date, options = {}) => {
          const locale = (options.locale as string) || "en-US";
          const dateStyle = (options.dateStyle as "short" | "medium" | "long" | "full") || "short";
          return new Intl.DateTimeFormat(locale, { dateStyle }).format(date);
        },
        defaultOptions: {
          locale: "en-US",
          dateStyle: "short",
        },
        validator: (value: unknown): value is Date => value instanceof Date && !isNaN(value.getTime()),
      };

      const numberFormatterConfig: FormatterConfig<number> = {
        name: "number",
        type: "number",
        formatter: (num: number, options = {}) => {
          const decimals = (options.decimals as number) || 2;
          const prefix = (options.prefix as string) || "";
          const suffix = (options.suffix as string) || "";
          return `${prefix}${num.toFixed(decimals)}${suffix}`;
        },
        defaultOptions: {
          decimals: 2,
        },
        validator: (value: unknown): value is number => typeof value === "number" && !isNaN(value),
      };

      expect(typeof dateFormatterConfig.name).toBe("string");
      expect(typeof dateFormatterConfig.formatter).toBe("function");
      expect(typeof dateFormatterConfig.validator).toBe("function");

      const testDate = new Date("2024-01-15");
      if (dateFormatterConfig.validator && dateFormatterConfig.validator(testDate)) {
        const formatted = dateFormatterConfig.formatter(testDate);
        expect(typeof formatted).toBe("string");
      }

      if (numberFormatterConfig.validator && numberFormatterConfig.validator(123.456)) {
        const formatted1 = numberFormatterConfig.formatter(123.456);
        const formatted2 = numberFormatterConfig.formatter(123.456, { decimals: 4, prefix: "$" });
        expect(formatted1).toBe("123.46");
        expect(formatted2).toBe("$123.4560");
      }
    });
  });

  describe("Guard Schema Validations", () => {
    it("should validate type guard schemas", () => {
      interface TypeGuardSchema<T> {
        readonly name: string;
        readonly description: string;
        readonly guard: (value: unknown) => value is T;
        readonly examples: {
          readonly valid: unknown[];
          readonly invalid: unknown[];
        };
      }

      const stringGuardSchema: TypeGuardSchema<string> = {
        name: "isString",
        description: "Checks if value is a string",
        guard: (value: unknown): value is string => typeof value === "string",
        examples: {
          valid: ["hello", "", "123"],
          invalid: [123, true, null, undefined, {}, []],
        },
      };

      const arrayGuardSchema: TypeGuardSchema<unknown[]> = {
        name: "isArray",
        description: "Checks if value is an array",
        guard: (value: unknown): value is unknown[] => Array.isArray(value),
        examples: {
          valid: [[], [1, 2, 3], ["a", "b"]],
          invalid: ["not array", 123, {}, null],
        },
      };

      expect(typeof stringGuardSchema.name).toBe("string");
      expect(typeof stringGuardSchema.description).toBe("string");
      expect(typeof stringGuardSchema.guard).toBe("function");
      expect(typeof stringGuardSchema.examples).toBe("object");
      expect(Array.isArray(stringGuardSchema.examples.valid)).toBe(true);
      expect(Array.isArray(stringGuardSchema.examples.invalid)).toBe(true);

      // Test examples match guard behavior
      stringGuardSchema.examples.valid.forEach((example) => {
        expect(stringGuardSchema.guard(example)).toBe(true);
      });

      stringGuardSchema.examples.invalid.forEach((example) => {
        expect(stringGuardSchema.guard(example)).toBe(false);
      });

      arrayGuardSchema.examples.valid.forEach((example) => {
        expect(arrayGuardSchema.guard(example)).toBe(true);
      });

      arrayGuardSchema.examples.invalid.forEach((example) => {
        expect(arrayGuardSchema.guard(example)).toBe(false);
      });
    });
  });

  describe("Utility Configuration Schemas", () => {
    it("should validate utility service configuration", () => {
      interface UtilityServiceConfig {
        readonly caching: {
          readonly enabled: boolean;
          readonly maxSize: number;
          readonly ttl: number; // milliseconds
        };
        readonly validation: {
          readonly strict: boolean;
          readonly throwOnError: boolean;
          readonly collectWarnings: boolean;
        };
        readonly formatting: {
          readonly locale: string;
          readonly timezone: string;
          readonly currency: string;
        };
        readonly parsing: {
          readonly dateFormat: string;
          readonly numberFormat: string;
          readonly encoding: string;
        };
      }

      const defaultConfig: UtilityServiceConfig = {
        caching: {
          enabled: true,
          maxSize: 1000,
          ttl: 300000, // 5 minutes
        },
        validation: {
          strict: false,
          throwOnError: true,
          collectWarnings: true,
        },
        formatting: {
          locale: "en-US",
          timezone: "UTC",
          currency: "USD",
        },
        parsing: {
          dateFormat: "ISO8601",
          numberFormat: "US",
          encoding: "UTF-8",
        },
      };

      expect(typeof defaultConfig.caching.enabled).toBe("boolean");
      expect(typeof defaultConfig.caching.maxSize).toBe("number");
      expect(typeof defaultConfig.caching.ttl).toBe("number");
      expect(defaultConfig.caching.maxSize).toBeGreaterThan(0);
      expect(defaultConfig.caching.ttl).toBeGreaterThan(0);

      expect(typeof defaultConfig.validation.strict).toBe("boolean");
      expect(typeof defaultConfig.validation.throwOnError).toBe("boolean");
      expect(typeof defaultConfig.validation.collectWarnings).toBe("boolean");

      expect(typeof defaultConfig.formatting.locale).toBe("string");
      expect(typeof defaultConfig.formatting.timezone).toBe("string");
      expect(typeof defaultConfig.formatting.currency).toBe("string");
      expect(defaultConfig.formatting.locale.length).toBeGreaterThan(0);

      expect(typeof defaultConfig.parsing.dateFormat).toBe("string");
      expect(typeof defaultConfig.parsing.numberFormat).toBe("string");
      expect(typeof defaultConfig.parsing.encoding).toBe("string");
    });
  });

  describe("Schema Composition and Nesting", () => {
    it("should validate nested schema structures", () => {
      interface NestedSchema {
        readonly type: "object";
        readonly properties: Record<string, Schema>;
        readonly required: string[];
      }

      interface ArraySchema {
        readonly type: "array";
        readonly items: Schema;
        readonly minItems?: number;
        readonly maxItems?: number;
      }

      interface PrimitiveSchema {
        readonly type: "string" | "number" | "boolean";
        readonly validation?: (value: unknown) => boolean;
      }

      type Schema = NestedSchema | ArraySchema | PrimitiveSchema;

      const userSchema: NestedSchema = {
        type: "object",
        properties: {
          id: {
            type: "string",
            validation: (value: unknown) => typeof value === "string" && value.length > 0,
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 0,
            maxItems: 10,
          },
          profile: {
            type: "object",
            properties: {
              name: {
                type: "string",
              },
              age: {
                type: "number",
                validation: (value: unknown) => typeof value === "number" && value >= 0,
              },
            },
            required: ["name"],
          },
        },
        required: ["id"],
      };

      expect(userSchema.type).toBe("object");
      expect(typeof userSchema.properties).toBe("object");
      expect(Array.isArray(userSchema.required)).toBe(true);
      expect(userSchema.required).toContain("id");

      const tagsSchema = userSchema.properties.tags as ArraySchema;
      expect(tagsSchema.type).toBe("array");
      expect(typeof tagsSchema.items).toBe("object");
      expect(tagsSchema.minItems).toBe(0);
      expect(tagsSchema.maxItems).toBe(10);

      const profileSchema = userSchema.properties.profile as NestedSchema;
      expect(profileSchema.type).toBe("object");
      expect(typeof profileSchema.properties).toBe("object");
      expect(profileSchema.required).toContain("name");

      const idSchema = userSchema.properties.id as PrimitiveSchema;
      if (idSchema.validation) {
        expect(idSchema.validation("user-123")).toBe(true);
        expect(idSchema.validation("")).toBe(false);
      }
    });
  });

  describe("Error Handling Schemas", () => {
    it("should validate error schema structures", () => {
      interface UtilityError {
        readonly code: string;
        readonly message: string;
        readonly details?: Record<string, unknown>;
        readonly stack?: string;
        readonly context: {
          readonly utility: string;
          readonly operation: string;
          readonly timestamp: string;
        };
      }

      const validationError: UtilityError = {
        code: "VALIDATION_FAILED",
        message: "Input validation failed",
        details: {
          field: "email",
          expectedType: "string",
          actualType: "number",
        },
        context: {
          utility: "validator",
          operation: "validate",
          timestamp: new Date().toISOString(),
        },
      };

      const parseError: UtilityError = {
        code: "PARSE_ERROR",
        message: "Failed to parse JSON input",
        stack: "Error: Unexpected token...",
        context: {
          utility: "parser",
          operation: "parseJson",
          timestamp: new Date().toISOString(),
        },
      };

      [validationError, parseError].forEach((error) => {
        expect(typeof error.code).toBe("string");
        expect(typeof error.message).toBe("string");
        expect(typeof error.context).toBe("object");
        expect(typeof error.context.utility).toBe("string");
        expect(typeof error.context.operation).toBe("string");
        expect(typeof error.context.timestamp).toBe("string");

        // Validate timestamp format
        expect(new Date(error.context.timestamp).toISOString()).toBe(error.context.timestamp);
      });

      expect(typeof validationError.details).toBe("object");
      expect(typeof parseError.stack).toBe("string");
    });
  });
});
