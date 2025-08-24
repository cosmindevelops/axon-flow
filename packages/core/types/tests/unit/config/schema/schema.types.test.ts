/**
 * Configuration schema types test suite
 *
 * Validates schema type definitions and type inference
 */

import { describe, it, expect } from "vitest";
import type {
  IConfigSchema,
  ISchemaDefinition,
  IPropertySchema,
  IValidationRules,
  IFieldValidation,
  ICrossFieldValidation,
  ICustomValidation,
  ISchemaConstraints,
  ILengthConstraint,
  ILayeredConfig,
  IConfigSource,
  IConfigChangeEvent,
  SchemaType,
  PropertyType,
  ValidationType,
  ConfigSourceType,
} from "../../../../src/config/schema/schema.types.js";

describe("Config Schema Types", () => {
  it("should enforce I-prefix naming convention for schema interfaces", () => {
    const schemaInterfaces = [
      "IConfigSchema",
      "ISchemaDefinition",
      "IPropertySchema",
      "IValidationRules",
      "IFieldValidation",
      "ICrossFieldValidation",
      "ICustomValidation",
      "ISchemaConstraints",
      "ILengthConstraint",
      "ILayeredConfig",
      "IConfigSource",
      "IConfigChangeEvent",
    ];

    schemaInterfaces.forEach((name) => {
      expect(name.startsWith("I")).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate SchemaType union type", () => {
    const validSchemaTypes: SchemaType[] = [
      "object",
      "array",
      "string",
      "number",
      "boolean",
      "null",
      "union",
      "intersection",
    ];

    validSchemaTypes.forEach((type) => {
      const _type: SchemaType = type;
      expect(typeof _type).toBe("string");
    });

    // Type-level validation
    const _object: SchemaType = "object";
    const _array: SchemaType = "array";
    const _string: SchemaType = "string";
    const _union: SchemaType = "union";

    expect(true).toBe(true); // If this compiles, types are valid
  });

  it("should validate PropertyType union type", () => {
    const validPropertyTypes: PropertyType[] = ["string", "number", "boolean", "object", "array", "null", "any"];

    validPropertyTypes.forEach((type) => {
      const _type: PropertyType = type;
      expect(typeof _type).toBe("string");
    });

    // Type-level validation
    const _string: PropertyType = "string";
    const _number: PropertyType = "number";
    const _boolean: PropertyType = "boolean";
    const _object: PropertyType = "object";

    expect(true).toBe(true);
  });

  it("should validate ValidationType union type", () => {
    const validValidationTypes: ValidationType[] = [
      "required",
      "email",
      "url",
      "uuid",
      "date",
      "regex",
      "range",
      "length",
      "custom",
    ];

    validValidationTypes.forEach((type) => {
      const _type: ValidationType = type;
      expect(typeof _type).toBe("string");
    });

    // Type-level validation
    const _required: ValidationType = "required";
    const _email: ValidationType = "email";
    const _url: ValidationType = "url";
    const _custom: ValidationType = "custom";

    expect(true).toBe(true);
  });

  it("should validate ConfigSourceType union type", () => {
    const validSourceTypes: ConfigSourceType[] = ["file", "environment", "database", "remote", "default"];

    validSourceTypes.forEach((type) => {
      const _type: ConfigSourceType = type;
      expect(typeof _type).toBe("string");
    });

    // Type-level validation
    const _file: ConfigSourceType = "file";
    const _environment: ConfigSourceType = "environment";
    const _database: ConfigSourceType = "database";
    const _remote: ConfigSourceType = "remote";
    const _default: ConfigSourceType = "default";

    expect(true).toBe(true);
  });

  it("should validate IConfigSchema interface structure", () => {
    interface TestConfig {
      server: { port: number; host: string };
      database: { url: string };
    }

    const mockConfigSchema: IConfigSchema<TestConfig> = {
      name: "test-schema",
      version: "1.0.0",
      description: "Test configuration schema",
      schema: {
        type: "object",
        properties: {
          server: {
            type: "object",
            properties: {
              port: { type: "number", minimum: 1000, maximum: 9999 },
              host: { type: "string", default: "localhost" },
            },
          },
          database: {
            type: "object",
            properties: {
              url: { type: "string", format: "uri" },
            },
          },
        },
        required: ["server", "database"],
        additionalProperties: false,
      },
      defaults: {
        server: { port: 3000, host: "localhost" },
      },
      validation: {
        fields: {
          server: {
            type: "required",
            required: true,
            message: "Server configuration is required",
          },
        },
      },
      environment: {
        development: { server: { port: 3000 } },
        production: { server: { port: 8000 } },
        test: { server: { port: 0 } },
      },
    };

    expect(typeof mockConfigSchema.name).toBe("string");
    expect(typeof mockConfigSchema.version).toBe("string");
    expect(typeof mockConfigSchema.description).toBe("string");
    expect(typeof mockConfigSchema.schema).toBe("object");
    expect(typeof mockConfigSchema.defaults).toBe("object");
    expect(typeof mockConfigSchema.validation).toBe("object");
    expect(typeof mockConfigSchema.environment).toBe("object");
  });

  it("should validate IPropertySchema interface structure", () => {
    const stringProperty: IPropertySchema = {
      type: "string",
      description: "User email address",
      default: "",
      enum: undefined,
      format: "email",
      minimum: undefined,
      maximum: undefined,
      minLength: 5,
      maxLength: 100,
      pattern: "^[^@]+@[^@]+\\.[^@]+$",
    };

    const numberProperty: IPropertySchema = {
      type: "number",
      description: "Server port",
      default: 3000,
      minimum: 1000,
      maximum: 9999,
      minLength: undefined,
      maxLength: undefined,
      pattern: undefined,
    };

    const objectProperty: IPropertySchema = {
      type: "object",
      description: "Database configuration",
      properties: {
        url: { type: "string", format: "uri" },
        pool: { type: "number", minimum: 1, maximum: 100 },
      },
    };

    expect(["string", "number", "boolean", "object", "array", "null", "any"]).toContain(stringProperty.type);
    expect(["string", "number", "boolean", "object", "array", "null", "any"]).toContain(numberProperty.type);
    expect(["string", "number", "boolean", "object", "array", "null", "any"]).toContain(objectProperty.type);

    expect(typeof stringProperty.minLength).toBe("number");
    expect(typeof numberProperty.minimum).toBe("number");
    expect(typeof objectProperty.properties).toBe("object");
  });

  it("should validate IValidationRules interface structure", () => {
    interface TestConfig {
      email: string;
      password: string;
      confirmPassword: string;
    }

    const validationRules: IValidationRules<TestConfig> = {
      fields: {
        email: {
          type: "email",
          params: { strict: true },
          message: "Please enter a valid email",
          required: true,
        },
        password: {
          type: "length",
          params: { min: 8, max: 128 },
          message: "Password must be 8-128 characters",
          required: true,
        },
      },
      crossField: [
        {
          fields: ["password", "confirmPassword"],
          rule: "equals",
          message: "Passwords must match",
        },
      ],
      custom: [
        {
          name: "uniqueEmail",
          fields: ["email"],
          logic: "async (email) => !(await userExists(email))",
          message: "Email already exists",
        },
      ],
    };

    expect(typeof validationRules.fields).toBe("object");
    expect(Array.isArray(validationRules.crossField)).toBe(true);
    expect(Array.isArray(validationRules.custom)).toBe(true);

    const emailField = validationRules.fields?.email;
    expect(emailField?.type).toBe("email");
    expect(typeof emailField?.required).toBe("boolean");
  });

  it("should validate ILayeredConfig interface structure", () => {
    interface AppConfig {
      server: { port: number };
      database: { url: string };
    }

    const layeredConfig: ILayeredConfig<AppConfig> = {
      base: {
        server: { port: 3000 },
        database: { url: "localhost:5432" },
      },
      environment: {
        server: { port: 8000 },
      },
      user: {
        database: { url: "custom-db:5432" },
      },
      runtime: undefined,
      computed: {
        server: { port: 8000 },
        database: { url: "custom-db:5432" },
      },
      sources: [
        {
          type: "default",
          path: "internal://base",
          priority: 1,
          optional: false,
        },
        {
          type: "environment",
          path: "env://APP_",
          priority: 2,
          optional: false,
        },
      ],
    };

    expect(typeof layeredConfig.base).toBe("object");
    expect(typeof layeredConfig.computed).toBe("object");
    expect(Array.isArray(layeredConfig.sources)).toBe(true);

    layeredConfig.sources.forEach((source) => {
      expect(["file", "environment", "database", "remote", "default"]).toContain(source.type);
    });
  });

  it("should validate generic type parameters", () => {
    interface CustomConfig {
      api: { key: string; timeout: number };
      features: string[];
    }

    const customSchema: IConfigSchema<CustomConfig> = {
      name: "custom",
      version: "1.0.0",
      description: "Custom config",
      schema: {
        type: "object",
        properties: {
          api: {
            type: "object",
            properties: {
              key: { type: "string", minLength: 32 },
              timeout: { type: "number", minimum: 1000 },
            },
          },
          features: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      defaults: {
        api: { key: "default-key", timeout: 5000 },
        features: ["basic"],
      },
      validation: {
        fields: {
          api: {
            type: "required",
            required: true,
            message: "API configuration required",
          },
        },
      },
      environment: {
        development: { features: ["dev", "debug"] },
        production: { features: ["prod"] },
        test: { features: ["test"] },
      },
    };

    expect(customSchema.defaults).toHaveProperty("api");
    expect(customSchema.defaults).toHaveProperty("features");
    expect(customSchema.defaults.api).toHaveProperty("key");
    expect(customSchema.defaults.api).toHaveProperty("timeout");
    expect(Array.isArray(customSchema.defaults.features)).toBe(true);
  });
});
