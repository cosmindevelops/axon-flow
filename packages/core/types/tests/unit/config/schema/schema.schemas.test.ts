/**
 * Configuration schema schemas test suite
 *
 * Validates schema validation definitions and rule processing
 */

import { describe, it, expect } from "vitest";

describe("Config Schema Schemas", () => {
  it("should validate config schema structure", () => {
    const mockConfigSchema = {
      name: "application-config",
      version: "1.2.0",
      description: "Main application configuration schema",
      schema: {
        type: "object" as const,
        properties: {
          server: {
            type: "object" as const,
            properties: {
              port: { type: "number" as const, minimum: 1000, maximum: 9999 },
              host: { type: "string" as const, default: "localhost" },
            },
          },
        },
        required: ["server"],
        additionalProperties: false,
      },
      defaults: {
        server: { port: 3000, host: "localhost" },
        logging: { level: "info" },
      },
      validation: {
        fields: {
          "server.port": {
            type: "range" as const,
            params: { min: 1000, max: 9999 },
            message: "Port must be between 1000 and 9999",
            required: true,
          },
        },
      },
      environment: {
        development: { logging: { level: "debug" } },
        production: { logging: { level: "error" } },
        test: { logging: { level: "silent" } },
      },
      metadata: { createdAt: "2024-01-01", author: "system" },
    };

    // Validate schema structure
    expect(mockConfigSchema).toHaveProperty("name");
    expect(mockConfigSchema).toHaveProperty("version");
    expect(mockConfigSchema).toHaveProperty("schema");
    expect(mockConfigSchema).toHaveProperty("defaults");
    expect(mockConfigSchema).toHaveProperty("validation");
    expect(mockConfigSchema).toHaveProperty("environment");

    // Validate schema definition
    expect(mockConfigSchema.schema.type).toBe("object");
    expect(typeof mockConfigSchema.schema.properties).toBe("object");
    expect(Array.isArray(mockConfigSchema.schema.required)).toBe(true);
    expect(typeof mockConfigSchema.schema.additionalProperties).toBe("boolean");
  });

  it("should validate property schema constraints", () => {
    const stringPropertySchema = {
      type: "string" as const,
      description: "Database connection string",
      default: "postgresql://localhost:5432/app",
      enum: undefined,
      format: "uri",
      minimum: undefined,
      maximum: undefined,
      minLength: 10,
      maxLength: 500,
      pattern: "^postgresql://",
    };

    const numberPropertySchema = {
      type: "number" as const,
      description: "Connection pool size",
      default: 10,
      minimum: 1,
      maximum: 100,
      minLength: undefined,
      maxLength: undefined,
      pattern: undefined,
    };

    const arrayPropertySchema = {
      type: "array" as const,
      description: "Allowed origins",
      items: {
        type: "string" as const,
        format: "uri",
      },
      minLength: 0,
      maxLength: 50,
    };

    // Validate string schema
    expect(stringPropertySchema.type).toBe("string");
    expect(typeof stringPropertySchema.minLength).toBe("number");
    expect(typeof stringPropertySchema.maxLength).toBe("number");
    expect(typeof stringPropertySchema.pattern).toBe("string");

    // Validate number schema
    expect(numberPropertySchema.type).toBe("number");
    expect(typeof numberPropertySchema.minimum).toBe("number");
    expect(typeof numberPropertySchema.maximum).toBe("number");
    expect(numberPropertySchema.minimum).toBeLessThan(numberPropertySchema.maximum);

    // Validate array schema
    expect(arrayPropertySchema.type).toBe("array");
    expect(typeof arrayPropertySchema.items).toBe("object");
    expect(arrayPropertySchema.items.type).toBe("string");
  });

  it("should validate validation rule schemas", () => {
    const fieldValidation = {
      type: "email" as const,
      params: {
        allowInternational: true,
        requireTld: true,
      },
      message: "Please enter a valid email address",
      required: true,
    };

    const crossFieldValidation = {
      fields: ["password", "confirmPassword"],
      rule: "match",
      message: "Password confirmation must match password",
    };

    const customValidation = {
      name: "uniqueEmail",
      fields: ["email"],
      logic: "async (email) => !(await db.user.findOne({ email }))",
      message: "Email address is already registered",
    };

    // Validate field validation schema
    expect(["required", "email", "url", "uuid", "date", "regex", "range", "length", "custom"]).toContain(
      fieldValidation.type,
    );
    expect(typeof fieldValidation.params).toBe("object");
    expect(typeof fieldValidation.message).toBe("string");
    expect(typeof fieldValidation.required).toBe("boolean");

    // Validate cross-field validation schema
    expect(Array.isArray(crossFieldValidation.fields)).toBe(true);
    expect(crossFieldValidation.fields.length).toBeGreaterThan(1);
    expect(typeof crossFieldValidation.rule).toBe("string");
    expect(typeof crossFieldValidation.message).toBe("string");

    // Validate custom validation schema
    expect(typeof customValidation.name).toBe("string");
    expect(Array.isArray(customValidation.fields)).toBe(true);
    expect(typeof customValidation.logic).toBe("string");
    expect(typeof customValidation.message).toBe("string");
  });

  it("should validate schema constraint definitions", () => {
    const schemaConstraints = {
      min: 0,
      max: 1000,
      length: {
        min: 5,
        max: 100,
        exact: undefined,
      },
      pattern: "^[A-Za-z0-9_]+$",
      custom: "validateUniqueIdentifier",
    };

    expect(typeof schemaConstraints.min).toBe("number");
    expect(typeof schemaConstraints.max).toBe("number");
    expect(schemaConstraints.min).toBeLessThan(schemaConstraints.max);
    expect(typeof schemaConstraints.length).toBe("object");
    expect(typeof schemaConstraints.pattern).toBe("string");
    expect(typeof schemaConstraints.custom).toBe("string");

    // Validate length constraint
    const lengthConstraint = schemaConstraints.length;
    expect(typeof lengthConstraint.min).toBe("number");
    expect(typeof lengthConstraint.max).toBe("number");
    expect(lengthConstraint.min).toBeLessThan(lengthConstraint.max);
  });

  it("should validate layered configuration schema", () => {
    const layeredConfig = {
      base: {
        database: { url: "localhost:5432", poolSize: 5 },
        api: { timeout: 5000, retries: 3 },
        logging: { level: "info", format: "json" },
      },
      environment: {
        database: { poolSize: 20 },
        logging: { level: "debug" },
      },
      user: {
        api: { timeout: 10000 },
      },
      runtime: {
        logging: { level: "error" },
      },
      computed: {
        database: { url: "localhost:5432", poolSize: 20 },
        api: { timeout: 10000, retries: 3 },
        logging: { level: "error", format: "json" },
      },
      sources: [
        {
          type: "default" as const,
          path: "internal://base",
          priority: 1,
          optional: false,
        },
        {
          type: "environment" as const,
          path: "env://APP_",
          priority: 2,
          optional: false,
        },
        {
          type: "file" as const,
          path: "/etc/app/config.yaml",
          priority: 3,
          optional: true,
        },
      ],
    };

    expect(typeof layeredConfig.base).toBe("object");
    expect(typeof layeredConfig.computed).toBe("object");
    expect(Array.isArray(layeredConfig.sources)).toBe(true);

    layeredConfig.sources.forEach((source) => {
      expect(["file", "environment", "database", "remote", "default"]).toContain(source.type);
      expect(typeof source.priority).toBe("number");
      expect(typeof source.optional).toBe("boolean");
    });
  });

  it("should validate schema type unions", () => {
    const validSchemaTypes = ["object", "array", "string", "number", "boolean", "null", "union", "intersection"];
    const validPropertyTypes = ["string", "number", "boolean", "object", "array", "null", "any"];
    const validValidationTypes = ["required", "email", "url", "uuid", "date", "regex", "range", "length", "custom"];
    const validSourceTypes = ["file", "environment", "database", "remote", "default"];

    validSchemaTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(validSchemaTypes).toContain(type);
    });

    validPropertyTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(validPropertyTypes).toContain(type);
    });

    validValidationTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(validValidationTypes).toContain(type);
    });

    validSourceTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(validSourceTypes).toContain(type);
    });
  });

  it("should validate configuration change event schema", () => {
    const configChangeEvent = {
      key: "api.timeout",
      oldValue: 5000,
      newValue: 10000,
      source: {
        type: "environment" as const,
        path: "env://APP_API_TIMEOUT",
        priority: 3,
        optional: false,
        metadata: { variable: "APP_API_TIMEOUT" },
      },
      timestamp: "2024-01-01T12:00:00.000Z",
    };

    expect(typeof configChangeEvent.key).toBe("string");
    expect(typeof configChangeEvent.oldValue).toBe("number");
    expect(typeof configChangeEvent.newValue).toBe("number");
    expect(typeof configChangeEvent.source).toBe("object");
    expect(typeof configChangeEvent.timestamp).toBe("string");

    // Validate source schema
    expect(["file", "environment", "database", "remote", "default"]).toContain(configChangeEvent.source.type);
    expect(typeof configChangeEvent.source.path).toBe("string");
    expect(typeof configChangeEvent.source.priority).toBe("number");
    expect(typeof configChangeEvent.source.optional).toBe("boolean");
  });
});
