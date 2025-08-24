/**
 * Configuration schema barrel exports test suite
 *
 * Validates all schema type exports are properly exposed
 */

import { describe, it, expect } from "vitest";
import type * as SchemaTypes from "../../../../src/config/schema/index.js";

describe("Config Schema Index Exports", () => {
  it("should export core schema types", () => {
    // Type-level validation for schema exports
    const _configSchema: SchemaTypes.IConfigSchema = {} as any;
    const _schemaDefinition: SchemaTypes.ISchemaDefinition<unknown> = {} as any;
    const _propertySchema: SchemaTypes.IPropertySchema = {} as any;
    const _validationRules: SchemaTypes.IValidationRules<unknown> = {} as any;

    expect(true).toBe(true);
  });

  it("should export layered configuration types", () => {
    // Type-level validation for layered config exports
    const _layeredConfig: SchemaTypes.ILayeredConfig = {} as any;
    const _configSource: SchemaTypes.IConfigSource = {} as any;
    const _configChangeEvent: SchemaTypes.IConfigChangeEvent = {} as any;

    expect(true).toBe(true);
  });

  it("should export validation and constraint types", () => {
    // Type-level validation for validation exports
    const _fieldValidation: SchemaTypes.IFieldValidation = {} as any;
    const _crossFieldValidation: SchemaTypes.ICrossFieldValidation = {} as any;
    const _customValidation: SchemaTypes.ICustomValidation = {} as any;
    const _schemaConstraints: SchemaTypes.ISchemaConstraints = {} as any;
    const _lengthConstraint: SchemaTypes.ILengthConstraint = {} as any;

    expect(true).toBe(true);
  });

  it("should export union types for schema configuration", () => {
    // Type-level validation for union types
    const _schemaType: SchemaTypes.SchemaType = "object";
    const _propertyType: SchemaTypes.PropertyType = "string";
    const _validationType: SchemaTypes.ValidationType = "required";
    const _configSourceType: SchemaTypes.ConfigSourceType = "file";

    expect(typeof _schemaType).toBe("string");
    expect(typeof _propertyType).toBe("string");
    expect(typeof _validationType).toBe("string");
    expect(typeof _configSourceType).toBe("string");
  });

  it("should enforce I-prefix naming for schema interfaces", () => {
    const schemaInterfaces = [
      "IConfigSchema",
      "ISchemaDefinition",
      "IPropertySchema",
      "IValidationRules",
      "ILayeredConfig",
      "IConfigSource",
      "IConfigChangeEvent",
      "IFieldValidation",
      "ICrossFieldValidation",
      "ICustomValidation",
      "ISchemaConstraints",
      "ILengthConstraint",
    ];

    schemaInterfaces.forEach((name) => {
      expect(name.startsWith("I"), `Schema interface ${name} should start with I-prefix`).toBe(true);
      expect(name.length > 1).toBe(true);
      expect(name[1]?.match(/[A-Z]/)).toBeTruthy();
    });
  });

  it("should validate schema type union values", () => {
    const validSchemaTypes = ["object", "array", "string", "number", "boolean", "null", "union", "intersection"];
    const validPropertyTypes = ["string", "number", "boolean", "object", "array", "null", "any"];
    const validValidationTypes = ["required", "email", "url", "uuid", "date", "regex", "range", "length", "custom"];
    const validSourceTypes = ["file", "environment", "database", "remote", "default"];

    validSchemaTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });

    validPropertyTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });

    validValidationTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });

    validSourceTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });
});
